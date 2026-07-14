"use client";

import { useState, useEffect, useCallback } from "react";
import type { Camera, DiscoveredDevice, DiscoveryResponse } from "@/lib/types";

interface DiscoveryModalProps {
  onClose: () => void;
  onConnect: (prefill: Partial<Camera>) => void;
}

type Tab = "local" | "remote";

export function DiscoveryModal({ onClose, onConnect }: DiscoveryModalProps) {
  const [tab, setTab] = useState<Tab>("local");

  // Local scan state
  const [subnets, setSubnets] = useState<string[]>([]);
  const [subnet, setSubnet] = useState("");
  const [extraSubnets, setExtraSubnets] = useState("");
  const [includeCommonRanges, setIncludeCommonRanges] = useState(false);
  const [method, setMethod] = useState<"both" | "onvif" | "scan">("both");

  // Remote scan state
  const [hostsInput, setHostsInput] = useState("");

  const [scanning, setScanning] = useState(false);
  const [devices, setDevices] = useState<DiscoveredDevice[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [hasScanned, setHasScanned] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [scannedSubnets, setScannedSubnets] = useState<string[]>([]);

  // Load suggested subnets from the server's own interfaces.
  useEffect(() => {
    fetch("/api/discovery")
      .then((r) => r.json())
      .then((data) => {
        setSubnets(data.subnets || []);
        if (data.subnets?.[0]) setSubnet(data.subnets[0]);
      })
      .catch(() => {});
  }, []);

  // Elapsed timer while scanning.
  useEffect(() => {
    if (!scanning) return;
    setElapsed(0);
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [scanning]);

  const runLocalScan = useCallback(async () => {
    setScanning(true);
    setError(null);
    setDevices([]);
    try {
      const extras = extraSubnets
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const subnetList = Array.from(new Set([subnet, ...extras].filter(Boolean)));

      const res = await fetch("/api/discovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method,
          subnets: method === "onvif" ? undefined : subnetList,
          includeCommonRanges,
          timeoutMs: 6000,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Scan failed");
      }
      const data: DiscoveryResponse = await res.json();
      setDevices(data.devices);
      setScannedSubnets(data.scannedSubnets);
      setHasScanned(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scan failed");
    } finally {
      setScanning(false);
    }
  }, [method, subnet, extraSubnets, includeCommonRanges]);

  const runRemoteScan = useCallback(async () => {
    const hosts = hostsInput
      .split(/[\n,]/)
      .map((h) => h.trim())
      .filter(Boolean);

    if (hosts.length === 0) {
      setError("Enter at least one hostname, DDNS address, or IP");
      return;
    }

    setScanning(true);
    setError(null);
    setDevices([]);
    try {
      const res = await fetch("/api/discovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method: "remote", hosts }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Scan failed");
      }
      const data: DiscoveryResponse = await res.json();
      setDevices(data.devices);
      setScannedSubnets([]);
      setHasScanned(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scan failed");
    } finally {
      setScanning(false);
    }
  }, [hostsInput]);

  const handleConnect = (device: DiscoveredDevice) => {
    onConnect({
      name: device.name || `Camera ${device.host || device.ip}`,
      streamUrl:
        device.suggestedStreamUrl ||
        `rtsp://admin:PASSWORD@${device.host || device.ip}:554/live/ch0`,
      snapshotUrl: device.suggestedSnapshotUrl || null,
      streamType: device.suggestedStreamType,
      location: device.guessedBrand || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="flex w-full max-w-2xl max-h-[88vh] flex-col rounded-2xl border border-gray-800 bg-gray-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-800 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-600">
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 011.06 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Discover Cameras</h2>
              <p className="mt-0.5 text-xs text-gray-500">Find cameras on your networks</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-500 transition hover:bg-gray-800 hover:text-white"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-gray-800 px-6 pt-3">
          <button
            onClick={() => { setTab("local"); setHasScanned(false); setDevices([]); setError(null); }}
            className={`rounded-t-lg px-4 py-2 text-sm font-medium transition ${
              tab === "local"
                ? "border-b-2 border-purple-500 text-white"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            Local Network
          </button>
          <button
            onClick={() => { setTab("remote"); setHasScanned(false); setDevices([]); setError(null); }}
            className={`rounded-t-lg px-4 py-2 text-sm font-medium transition ${
              tab === "remote"
                ? "border-b-2 border-purple-500 text-white"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            Remote / Other Network
          </button>
        </div>

        {/* Controls */}
        <div className="border-b border-gray-800 px-6 py-4">
          {tab === "local" ? (
            <>
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-400">Method</label>
                  <select
                    value={method}
                    onChange={(e) => setMethod(e.target.value as typeof method)}
                    disabled={scanning}
                    className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 disabled:opacity-50"
                  >
                    <option value="both">ONVIF + Port Scan</option>
                    <option value="onvif">ONVIF Discovery</option>
                    <option value="scan">Port Scan Only</option>
                  </select>
                </div>

                {method !== "onvif" && (
                  <div className="flex-1 min-w-[160px]">
                    <label className="mb-1 block text-xs font-medium text-gray-400">Primary subnet</label>
                    {subnets.length > 0 ? (
                      <select
                        value={subnet}
                        onChange={(e) => setSubnet(e.target.value)}
                        disabled={scanning}
                        className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 disabled:opacity-50"
                      >
                        {subnets.map((s) => (
                          <option key={s} value={s}>
                            {s}.0/24
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={subnet}
                        onChange={(e) => setSubnet(e.target.value)}
                        placeholder="192.168.1"
                        disabled={scanning}
                        className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 disabled:opacity-50"
                      />
                    )}
                  </div>
                )}

                <button
                  onClick={runLocalScan}
                  disabled={scanning}
                  className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-500 disabled:opacity-50"
                >
                  {scanning ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Scanning… {elapsed}s
                    </>
                  ) : (
                    <>
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                      </svg>
                      Start Scan
                    </>
                  )}
                </button>
              </div>

              {method !== "onvif" && (
                <div className="mt-3 space-y-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-400">
                      Additional subnets <span className="text-gray-600">(comma-separated, e.g. other VLANs)</span>
                    </label>
                    <input
                      type="text"
                      value={extraSubnets}
                      onChange={(e) => setExtraSubnets(e.target.value)}
                      placeholder="192.168.2, 10.0.0"
                      disabled={scanning}
                      className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 disabled:opacity-50"
                    />
                  </div>
                  <label className="flex items-center gap-2 text-xs text-gray-400">
                    <input
                      type="checkbox"
                      checked={includeCommonRanges}
                      onChange={(e) => setIncludeCommonRanges(e.target.checked)}
                      disabled={scanning}
                      className="h-3.5 w-3.5 rounded border-gray-600 bg-gray-800 text-purple-600 focus:ring-purple-500"
                    />
                    Also check common home router ranges (192.168.0/1/2/4/50/100, 10.0.0/1, 172.16.0)
                  </label>
                </div>
              )}

              <div className="mt-3 rounded-lg border border-blue-500/30 bg-blue-500/10 p-2.5 text-[11px] text-blue-300/90">
                💡 If your cameras live on a <strong>separate physical network</strong> (a second home, garage,
                or different building), local scanning can't reach them over the internet. Set up a mesh VPN
                like <strong>Tailscale</strong> or <strong>ZeroTier</strong> on both networks — once connected,
                treat that VPN's subnet as an "additional subnet" above and it will scan just like local devices.
              </div>
            </>
          ) : (
            <>
              <label className="mb-1 block text-xs font-medium text-gray-400">
                Hostnames, DDNS addresses, or IPs you own
              </label>
              <textarea
                value={hostsInput}
                onChange={(e) => setHostsInput(e.target.value)}
                disabled={scanning}
                rows={3}
                placeholder={"myhome.ddns.net\nvacation-cam.tailnet-1234.ts.net\n203.0.113.42"}
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 disabled:opacity-50"
              />
              <p className="mt-1 text-[11px] text-gray-600">
                One per line or comma-separated. This checks only the specific addresses you provide — up to
                10 at a time — never an internet-wide sweep.
              </p>

              <button
                onClick={runRemoteScan}
                disabled={scanning}
                className="mt-3 inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-500 disabled:opacity-50"
              >
                {scanning ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Checking… {elapsed}s
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                    </svg>
                    Check Addresses
                  </>
                )}
              </button>

              <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-[11px] text-amber-400/90">
                <strong>Only check devices you own or manage.</strong> This tool won't search the open internet
                for other people's cameras — that would mean accessing devices without authorization. For a
                remote property, use your router's DDNS hostname (with port forwarding configured deliberately)
                or a VPN mesh address instead of a random public IP.
              </div>
            </>
          )}
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
              {error}
            </div>
          )}

          {scanning && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="relative flex h-16 w-16 items-center justify-center">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-purple-500/30" />
                <span className="relative inline-flex h-10 w-10 items-center justify-center rounded-full bg-purple-600">
                  <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0" />
                  </svg>
                </span>
              </div>
              <p className="mt-4 text-sm text-gray-400">
                {tab === "local" ? "Probing network for cameras…" : "Checking provided addresses…"}
              </p>
              {tab === "local" && (
                <p className="mt-1 text-xs text-gray-600">ONVIF multicast + TCP port scan in progress</p>
              )}
            </div>
          )}

          {!scanning && hasScanned && devices.length === 0 && !error && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="rounded-full bg-gray-800 p-4">
                <svg className="h-8 w-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.348 14.652a3.75 3.75 0 010-5.304m5.304 0a3.75 3.75 0 010 5.304m-7.425 2.121a6.75 6.75 0 010-9.546m9.546 0a6.75 6.75 0 010 9.546M5.106 18.894c-3.808-3.807-3.808-9.98 0-13.788m13.788 0c3.808 3.807 3.808 9.98 0 13.788M12 12h.008v.008H12V12z" />
                </svg>
              </div>
              <h3 className="mt-4 text-base font-semibold text-white">No cameras found</h3>
              <p className="mt-1 max-w-sm text-sm text-gray-500">
                {tab === "local"
                  ? scannedSubnets.length
                    ? `No devices responded on ${scannedSubnets.map((s) => `${s}.0/24`).join(", ")}. Try additional subnets or common ranges above.`
                    : "No devices responded. Try a different subnet."
                  : "None of the addresses you entered had an open camera port, or they're unreachable from this server."}
              </p>
            </div>
          )}

          {!scanning && !hasScanned && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="rounded-full bg-purple-500/10 p-4">
                <svg className="h-8 w-8 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
                </svg>
              </div>
              <h3 className="mt-4 text-base font-semibold text-white">Ready to scan</h3>
              <p className="mt-1 max-w-sm text-sm text-gray-500">
                {tab === "local"
                  ? "Click Start Scan to search your local network(s) for IP cameras using ONVIF discovery and a port scan."
                  : "Enter one or more addresses you own, then click Check Addresses."}
              </p>
            </div>
          )}

          {!scanning && devices.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-gray-500">
                Found <span className="font-medium text-white">{devices.length}</span> device
                {devices.length !== 1 ? "s" : ""}
              </p>
              {devices.map((device) => (
                <div
                  key={device.host || device.ip}
                  className="flex items-center gap-3 rounded-xl border border-gray-800 bg-gray-800/40 p-3 transition hover:border-gray-700"
                >
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gray-800">
                    <svg className="h-5 w-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.174C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.174 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
                    </svg>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="truncate text-sm font-semibold text-white">{device.name}</h4>
                      <span
                        className={`flex-shrink-0 rounded px-1.5 py-0.5 text-[9px] font-medium uppercase ${
                          device.source === "onvif"
                            ? "bg-green-500/20 text-green-400"
                            : device.source === "remote"
                            ? "bg-amber-500/20 text-amber-400"
                            : "bg-blue-500/20 text-blue-400"
                        }`}
                      >
                        {device.source === "onvif" ? "ONVIF" : device.source === "remote" ? "Remote" : "Port Scan"}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      {device.host || device.ip}
                      {device.subnet ? ` · ${device.subnet}.0/24` : ""}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-1">
                      {device.guessedBrand && (
                        <span className="rounded bg-gray-700 px-1.5 py-0.5 text-[10px] text-gray-300">
                          {device.guessedBrand}
                        </span>
                      )}
                      {device.openPorts?.map((p) => (
                        <span key={p.port} className="rounded bg-gray-800 px-1.5 py-0.5 text-[10px] text-gray-500">
                          {p.port} {p.label}
                        </span>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => handleConnect(device)}
                    className="flex-shrink-0 rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-purple-500"
                  >
                    Connect
                  </button>
                </div>
              ))}

              <p className="pt-2 text-[11px] text-gray-600">
                💡 "Connect" pre-fills the Add Camera form with best-guess URLs. Replace{" "}
                <code className="rounded bg-gray-800 px-1 py-0.5">PASSWORD</code> and the username with your
                camera's real credentials.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
