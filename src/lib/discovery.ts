import dgram from "node:dgram";
import net from "node:net";
import os from "node:os";
import { randomUUID } from "node:crypto";

// Common ports exposed by IP cameras / NVRs / DVRs.
export const CAMERA_PORTS = [
  { port: 554, label: "RTSP" },
  { port: 80, label: "HTTP" },
  { port: 8080, label: "HTTP-alt" },
  { port: 8000, label: "Hikvision-SDK" },
  { port: 8899, label: "DVR" },
  { port: 34567, label: "Dahua/XM" },
  { port: 88, label: "Foscam" },
  { port: 443, label: "HTTPS" },
];

export interface DiscoveredDevice {
  ip: string;
  source: "onvif" | "scan" | "remote";
  host?: string; // original hostname/DDNS entered by the user, for remote checks
  subnet?: string; // which /24 this result came from, for multi-subnet scans
  name?: string;
  hardware?: string;
  manufacturer?: string;
  xaddrs?: string[];
  openPorts?: { port: number; label: string }[];
  guessedBrand?: string;
  serverHeader?: string;
  suggestedStreamType: "snapshot" | "mjpeg" | "hls";
  suggestedStreamUrl?: string;
  suggestedSnapshotUrl?: string;
}

// A handful of the most common private-network ranges. Used for the optional
// "also check other common home subnets" toggle so multi-router/VLAN setups
// (main LAN + IoT VLAN + guest network) can be discovered in one pass.
export const COMMON_PRIVATE_SUBNETS = [
  "192.168.0",
  "192.168.1",
  "192.168.2",
  "192.168.4",
  "192.168.50",
  "192.168.100",
  "10.0.0",
  "10.0.1",
  "10.1.1",
  "172.16.0",
];

// Brand-specific URL templates (mirror the setup guide).
const BRAND_TEMPLATES: Record<
  string,
  { rtsp: (ip: string) => string; snapshot: (ip: string) => string }
> = {
  Reolink: {
    rtsp: (ip) => `rtsp://admin:PASSWORD@${ip}:554/h264Preview_01_main`,
    snapshot: (ip) => `http://${ip}/cgi-bin/api.cgi?cmd=Snap&channel=0&user=admin&password=PASSWORD`,
  },
  Hikvision: {
    rtsp: (ip) => `rtsp://admin:PASSWORD@${ip}:554/Streaming/Channels/101`,
    snapshot: (ip) => `http://${ip}/ISAPI/Streaming/channels/101/picture`,
  },
  Dahua: {
    rtsp: (ip) => `rtsp://admin:PASSWORD@${ip}:554/cam/realmonitor?channel=1&subtype=0`,
    snapshot: (ip) => `http://${ip}/cgi-bin/snapshot.cgi`,
  },
  Amcrest: {
    rtsp: (ip) => `rtsp://admin:PASSWORD@${ip}:554/cam/realmonitor?channel=1&subtype=0`,
    snapshot: (ip) => `http://${ip}/cgi-bin/snapshot.cgi?channel=1&subtype=0`,
  },
  Axis: {
    rtsp: (ip) => `rtsp://root:PASSWORD@${ip}:554/axis-media/media.amp`,
    snapshot: (ip) => `http://${ip}/axis-cgi/jpg/image.cgi`,
  },
  Foscam: {
    rtsp: (ip) => `rtsp://admin:PASSWORD@${ip}:554/videoMain`,
    snapshot: (ip) => `http://${ip}/cgi-bin/CGIProxy.fcgi?cmd=snapPicture2&usr=admin&pwd=PASSWORD`,
  },
  "TP-Link": {
    rtsp: (ip) => `rtsp://admin:PASSWORD@${ip}:554/stream1`,
    snapshot: (ip) => `http://${ip}/cgi-bin/snapshot.cgi?channel=0`,
  },
  Ezviz: {
    rtsp: (ip) => `rtsp://admin:PASSWORD@${ip}:554/h264/ch0/main/av_stream`,
    snapshot: (ip) => `http://${ip}/cgi-bin/snapshot.cgi?channel=0`,
  },
  Generic: {
    rtsp: (ip) => `rtsp://admin:PASSWORD@${ip}:554/live/ch0`,
    snapshot: (ip) => `http://${ip}/snapshot.jpg`,
  },
};

function guessBrandFromText(text: string): string | undefined {
  const lower = text.toLowerCase();
  if (lower.includes("reolink")) return "Reolink";
  if (lower.includes("hikvision") || lower.includes("dvrdvs") || lower.includes("web service")) return "Hikvision";
  if (lower.includes("dahua")) return "Dahua";
  if (lower.includes("amcrest")) return "Amcrest";
  if (lower.includes("axis")) return "Axis";
  if (lower.includes("foscam")) return "Foscam";
  if (lower.includes("tp-link") || lower.includes("tapo") || lower.includes("vigi")) return "TP-Link";
  if (lower.includes("ezviz")) return "Ezviz";
  return undefined;
}

function applyBrandSuggestions(device: DiscoveredDevice) {
  const brand = device.guessedBrand && BRAND_TEMPLATES[device.guessedBrand]
    ? device.guessedBrand
    : "Generic";
  const tpl = BRAND_TEMPLATES[brand];
  const addr = device.host || device.ip;
  device.suggestedStreamUrl = tpl.rtsp(addr);
  device.suggestedSnapshotUrl = tpl.snapshot(addr);
  device.suggestedStreamType = "snapshot";
}

/** Returns candidate /24 subnets derived from the host's network interfaces. */
export function suggestedSubnets(): string[] {
  const nets = os.networkInterfaces();
  const subnets = new Set<string>();
  for (const iface of Object.values(nets)) {
    if (!iface) continue;
    for (const addr of iface) {
      if (addr.family === "IPv4" && !addr.internal) {
        const parts = addr.address.split(".");
        subnets.add(`${parts[0]}.${parts[1]}.${parts[2]}`);
      }
    }
  }
  return Array.from(subnets);
}

// ---------------------------------------------------------------------------
// ONVIF WS-Discovery (UDP multicast to 239.255.255.250:3702)
// ---------------------------------------------------------------------------

function buildProbe(): string {
  const messageId = `uuid:${randomUUID()}`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<e:Envelope xmlns:e="http://www.w3.org/2003/05/soap-envelope" xmlns:w="http://schemas.xmlsoap.org/ws/2004/08/addressing" xmlns:d="http://schemas.xmlsoap.org/ws/2005/04/discovery" xmlns:dn="http://www.onvif.org/ver10/network/wsdl">
<e:Header><w:MessageID>${messageId}</w:MessageID><w:To e:mustUnderstand="true">urn:schemas-xmlsoap-org:ws:2005:04:discovery</w:To><w:Action e:mustUnderstand="true">http://schemas.xmlsoap.org/ws/2005/04/discovery/Probe</w:Action></e:Header>
<e:Body><d:Probe><d:Types>dn:NetworkVideoTransmitter</d:Types></d:Probe></e:Body>
</e:Envelope>`;
}

function parseProbeMatch(xml: string) {
  const xaddrsMatch = xml.match(/<[^>]*XAddrs[^>]*>([\s\S]*?)<\/[^>]*XAddrs>/i);
  const scopesMatch = xml.match(/<[^>]*Scopes[^>]*>([\s\S]*?)<\/[^>]*Scopes>/i);
  const xaddrs = xaddrsMatch ? xaddrsMatch[1].trim().split(/\s+/).filter(Boolean) : [];
  const scopes = scopesMatch ? scopesMatch[1].trim().split(/\s+/).filter(Boolean) : [];

  let name: string | undefined;
  let hardware: string | undefined;
  for (const scope of scopes) {
    const decoded = decodeURIComponent(scope);
    const nameM = decoded.match(/\/name\/(.+)$/);
    const hwM = decoded.match(/\/hardware\/(.+)$/);
    if (nameM) name = nameM[1];
    if (hwM) hardware = hwM[1];
  }
  return { xaddrs, name, hardware, scopesText: scopes.join(" ") };
}

export function onvifDiscover(timeoutMs = 5000): Promise<DiscoveredDevice[]> {
  return new Promise((resolve) => {
    const socket = dgram.createSocket({ type: "udp4", reuseAddr: true });
    const devices = new Map<string, DiscoveredDevice>();
    const probe = buildProbe();

    socket.on("error", () => {
      try { socket.close(); } catch {}
      resolve(Array.from(devices.values()));
    });

    socket.on("message", (msg, rinfo) => {
      const xml = msg.toString();
      if (!/ProbeMatch/i.test(xml)) return;
      const { xaddrs, name, hardware, scopesText } = parseProbeMatch(xml);
      const ip = xaddrs[0]?.match(/\/\/([^/:]+)/)?.[1] || rinfo.address;
      if (!ip) return;

      const device: DiscoveredDevice = {
        ip,
        source: "onvif",
        name: name || `ONVIF Camera (${ip})`,
        hardware,
        xaddrs,
        guessedBrand: guessBrandFromText(`${name || ""} ${hardware || ""} ${scopesText}`),
        suggestedStreamType: "snapshot",
      };
      applyBrandSuggestions(device);
      devices.set(ip, device);
    });

    socket.bind(() => {
      try {
        socket.setBroadcast(true);
        socket.setMulticastTTL(4);
      } catch {}
      // Send a couple of probes (UDP is lossy).
      socket.send(probe, 3702, "239.255.255.250");
      setTimeout(() => {
        try { socket.send(probe, 3702, "239.255.255.250"); } catch {}
      }, 500);
    });

    setTimeout(() => {
      try { socket.close(); } catch {}
      resolve(Array.from(devices.values()));
    }, timeoutMs);
  });
}

// ---------------------------------------------------------------------------
// TCP port scan fallback
// ---------------------------------------------------------------------------

function probePort(host: string, port: number, timeout = 700): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let settled = false;
    const finish = (open: boolean) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(open);
    };
    socket.setTimeout(timeout);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
    socket.connect(port, host);
  });
}

async function fingerprintHttp(ip: string): Promise<{ server?: string; brand?: string }> {
  for (const url of [`http://${ip}/`, `http://${ip}:8080/`]) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(1500), redirect: "manual" });
      const server = res.headers.get("server") || undefined;
      const wwwAuth = res.headers.get("www-authenticate") || "";
      let bodySample = "";
      try {
        bodySample = (await res.text()).slice(0, 2000);
      } catch {}
      const brand = guessBrandFromText(`${server || ""} ${wwwAuth} ${bodySample}`);
      if (server || brand) return { server, brand };
    } catch {
      // ignore and try next
    }
  }
  return {};
}

/** Simple concurrency-limited async pool. */
async function pool<T, R>(items: T[], limit: number, worker: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = [];
  let index = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (index < items.length) {
      const current = index++;
      results[current] = await worker(items[current]);
    }
  });
  await Promise.all(runners);
  return results;
}

export async function scanSubnet(
  subnet: string,
  opts: { start?: number; end?: number; concurrency?: number; portTimeout?: number; ports?: typeof CAMERA_PORTS } = {}
): Promise<DiscoveredDevice[]> {
  const start = opts.start ?? 1;
  const end = opts.end ?? 254;
  const concurrency = opts.concurrency ?? 64;
  const portTimeout = opts.portTimeout ?? 700;
  const ports = opts.ports ?? CAMERA_PORTS;

  const cleanSubnet = subnet.trim().replace(/\.$/, "");
  if (!/^\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(cleanSubnet)) {
    throw new Error("Invalid subnet. Use the first three octets, e.g. 192.168.1");
  }

  const hosts: string[] = [];
  for (let i = start; i <= end; i++) hosts.push(`${cleanSubnet}.${i}`);

  const found: DiscoveredDevice[] = [];

  await pool(hosts, concurrency, async (ip) => {
    // Quick check: is any camera port open?
    const portResults = await Promise.all(
      ports.map(async (p) => ({ ...p, open: await probePort(ip, p.port, portTimeout) }))
    );
    const openPorts = portResults.filter((p) => p.open).map((p) => ({ port: p.port, label: p.label }));
    if (openPorts.length === 0) return;

    const hasHttp = openPorts.some((p) => [80, 8080, 443].includes(p.port));
    let server: string | undefined;
    let brand: string | undefined;
    if (hasHttp) {
      const fp = await fingerprintHttp(ip);
      server = fp.server;
      brand = fp.brand;
    }

    const device: DiscoveredDevice = {
      ip,
      source: "scan",
      subnet: cleanSubnet,
      name: brand ? `${brand} Camera (${ip})` : `Camera / Device (${ip})`,
      openPorts,
      guessedBrand: brand,
      serverHeader: server,
      suggestedStreamType: "snapshot",
    };
    applyBrandSuggestions(device);
    found.push(device);
  });

  return found;
}

// ---------------------------------------------------------------------------
// Remote / known-host check — for cameras on a DIFFERENT physical network
// (a second property, a DDNS hostname, or a VPN-mesh address) that you
// already know the address of. This does NOT scan the open internet; it only
// probes a single host you explicitly provide.
// ---------------------------------------------------------------------------

export async function scanHost(hostInput: string): Promise<DiscoveredDevice | null> {
  const host = hostInput.trim().replace(/^https?:\/\//, "").replace(/\/.*$/, "").split(":")[0];
  if (!host) throw new Error("Enter a hostname or IP address");

  const portResults = await Promise.all(
    CAMERA_PORTS.map(async (p) => ({ ...p, open: await probePort(host, p.port, 2500) }))
  );
  const openPorts = portResults.filter((p) => p.open).map((p) => ({ port: p.port, label: p.label }));
  if (openPorts.length === 0) return null;

  const hasHttp = openPorts.some((p) => [80, 8080, 443].includes(p.port));
  let server: string | undefined;
  let brand: string | undefined;
  if (hasHttp) {
    const fp = await fingerprintHttp(host);
    server = fp.server;
    brand = fp.brand;
  }

  const device: DiscoveredDevice = {
    ip: host,
    host,
    source: "remote",
    name: brand ? `${brand} Camera (${host})` : `Camera / Device (${host})`,
    openPorts,
    guessedBrand: brand,
    serverHeader: server,
    suggestedStreamType: "snapshot",
  };
  applyBrandSuggestions(device);
  return device;
}

/** Merge devices from multiple sources, de-duplicating by IP. */
export function mergeDevices(...lists: DiscoveredDevice[][]): DiscoveredDevice[] {
  const map = new Map<string, DiscoveredDevice>();
  for (const list of lists) {
    for (const d of list) {
      const existing = map.get(d.ip);
      if (!existing) {
        map.set(d.ip, d);
      } else {
        // Prefer ONVIF metadata; merge open ports.
        map.set(d.ip, {
          ...existing,
          ...d,
          name: existing.source === "onvif" ? existing.name : d.name,
          guessedBrand: existing.guessedBrand || d.guessedBrand,
          openPorts: [...(existing.openPorts || []), ...(d.openPorts || [])],
          xaddrs: existing.xaddrs || d.xaddrs,
        });
      }
    }
  }
  return Array.from(map.values()).sort((a, b) => {
    const aLast = parseInt(a.ip.split(".").pop() || "0", 10);
    const bLast = parseInt(b.ip.split(".").pop() || "0", 10);
    return aLast - bLast;
  });
}
