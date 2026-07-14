import { NextRequest, NextResponse } from "next/server";
import {
  onvifDiscover,
  scanSubnet,
  scanHost,
  mergeDevices,
  suggestedSubnets,
  COMMON_PRIVATE_SUBNETS,
  type DiscoveredDevice,
} from "@/lib/discovery";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// GET /api/discovery — returns suggested subnets to scan (from server interfaces)
export async function GET() {
  return NextResponse.json({
    subnets: suggestedSubnets(),
    commonSubnets: COMMON_PRIVATE_SUBNETS,
  });
}

// POST /api/discovery
// Local scan:  { method: "onvif" | "scan" | "both", subnet?, subnets?, includeCommonRanges?, timeoutMs? }
// Remote scan: { method: "remote", hosts: string[] }  — checks specific hosts/DDNS names you provide
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const method: "onvif" | "scan" | "both" | "remote" = body.method || "both";
    const timeoutMs = Math.min(Math.max(Number(body.timeoutMs) || 5000, 1000), 20000);

    // ---- Remote / known-host mode: only probes hosts the user explicitly typed in ----
    if (method === "remote") {
      const hosts: string[] = Array.isArray(body.hosts)
        ? body.hosts.filter((h: unknown) => typeof h === "string" && h.trim())
        : [];
      if (hosts.length === 0) {
        return NextResponse.json(
          { error: "Provide at least one hostname, DDNS address, or IP you own" },
          { status: 400 }
        );
      }
      if (hosts.length > 10) {
        return NextResponse.json({ error: "Limit to 10 hosts per scan" }, { status: 400 });
      }

      const results = await Promise.all(
        hosts.map(async (h) => {
          try {
            return await scanHost(h);
          } catch {
            return null;
          }
        })
      );
      const devices = results.filter((d): d is DiscoveredDevice => d !== null);

      return NextResponse.json({ devices, scannedSubnets: [], method });
    }

    // ---- Local network mode: ONVIF multicast + subnet port scan ----
    const explicitSubnets: string[] = Array.isArray(body.subnets)
      ? body.subnets.filter((s: unknown) => typeof s === "string" && s.trim())
      : body.subnet
      ? [body.subnet]
      : [];

    const localSubnets = explicitSubnets.length > 0 ? explicitSubnets : suggestedSubnets();
    const commonSubnets: string[] = body.includeCommonRanges
      ? COMMON_PRIVATE_SUBNETS.filter((s) => !localSubnets.includes(s))
      : [];

    const tasks: Promise<DiscoveredDevice[]>[] = [];

    if (method === "onvif" || method === "both") {
      tasks.push(onvifDiscover(timeoutMs));
    }

    if (method === "scan" || method === "both") {
      for (const s of localSubnets) {
        tasks.push(scanSubnet(s, { concurrency: 80 }).catch(() => [] as DiscoveredDevice[]));
      }
      // Common ranges use a faster/lighter scan (fewer ports, shorter timeout)
      // so checking several extra /24s doesn't blow past the time budget.
      for (const s of commonSubnets) {
        tasks.push(
          scanSubnet(s, {
            concurrency: 120,
            portTimeout: 350,
            ports: [
              { port: 554, label: "RTSP" },
              { port: 80, label: "HTTP" },
              { port: 8080, label: "HTTP-alt" },
            ],
          }).catch(() => [] as DiscoveredDevice[])
        );
      }
    }

    const results = await Promise.all(tasks);
    const devices = mergeDevices(...results);

    return NextResponse.json({
      devices,
      scannedSubnets: [...localSubnets, ...commonSubnets],
      method,
    });
  } catch (error) {
    console.error("Discovery failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Discovery failed" },
      { status: 500 }
    );
  }
}
