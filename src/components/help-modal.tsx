"use client";

import { useState } from "react";

const steps = [
  {
    id: 1,
    title: "Find Your Camera's IP Address",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
      </svg>
    ),
    content: (
      <div className="space-y-3 text-sm text-gray-300">
        <p>Every IP camera has an address on your home network. Here's how to find it:</p>
        <div className="space-y-2 rounded-lg bg-gray-800/50 p-3">
          <p className="font-medium text-white">Method A — Check your router</p>
          <ol className="list-inside list-decimal space-y-1 text-gray-400">
            <li>Log into your router (usually <code className="rounded bg-gray-700 px-1.5 py-0.5 text-xs text-orange-300">192.168.1.1</code> or <code className="rounded bg-gray-700 px-1.5 py-0.5 text-xs text-orange-300">192.168.0.1</code>)</li>
            <li>Look for "Connected Devices" or "DHCP Clients"</li>
            <li>Find your camera in the list (check the brand name)</li>
            <li>Note its IP address (e.g., <code className="rounded bg-gray-700 px-1.5 py-0.5 text-xs text-orange-300">192.168.1.105</code>)</li>
          </ol>
        </div>
        <div className="space-y-2 rounded-lg bg-gray-800/50 p-3">
          <p className="font-medium text-white">Method B — Use a scanning app</p>
          <ol className="list-inside list-decimal space-y-1 text-gray-400">
            <li>Download <span className="text-white">Fing</span> or <span className="text-white">Advanced IP Scanner</span></li>
            <li>Scan your network</li>
            <li>Look for devices matching your camera brand</li>
          </ol>
        </div>
        <div className="space-y-2 rounded-lg bg-gray-800/50 p-3">
          <p className="font-medium text-white">Method C — Check the camera label</p>
          <p className="text-gray-400">Some cameras have a default IP printed on a sticker on the device itself.</p>
        </div>
        <div className="mt-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
          <p className="text-amber-400 text-xs">
            💡 <strong>Pro tip:</strong> Set a static IP for your camera in your router settings so the address never changes.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: 2,
    title: "Find Your Camera's Stream URL",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-2.57a4.5 4.5 0 00-1.242-7.244l-4.5-4.5a4.5 4.5 0 00-6.364 6.364L4.34 8.688" />
      </svg>
    ),
    content: (
      <div className="space-y-3 text-sm text-gray-300">
        <p>Each camera brand uses different URLs. Here are the most common formats:</p>

        <div className="space-y-3">
          <BrandSection
            brand="Reolink"
            snapshot="http://YOUR_IP/cgi-bin/api.cgi?cmd=Snap&channel=0&user=admin&password=PASSWORD"
            stream="rtsp://admin:PASSWORD@YOUR_IP:554/h264Preview_01_main"
            note="Most Reolink cameras use port 80 for HTTP and 554 for RTSP"
          />
          <BrandSection
            brand="Hikvision"
            snapshot="http://YOUR_IP/ISAPI/Streaming/channels/101/picture"
            stream="rtsp://admin:PASSWORD@YOUR_IP:554/Streaming/Channels/101"
            note="Hikvision also supports ONVIF — check the web interface"
          />
          <BrandSection
            brand="Dahua"
            snapshot="http://YOUR_IP/cgi-bin/snapshot.cgi"
            stream="rtsp://admin:PASSWORD@YOUR_IP:554/cam/realmonitor?channel=1&subtype=0"
            note="Subtype 0 = main stream, subtype 1 = sub stream (lower quality)"
          />
          <BrandSection
            brand="Amcrest"
            snapshot="http://YOUR_IP/cgi-bin/snapshot.cgi?channel=1&subtype=0"
            stream="rtsp://admin:PASSWORD@YOUR_IP:554/cam/realmonitor?channel=1&subtype=0"
            note="Same as Dahua format — they share firmware"
          />
          <BrandSection
            brand="TP-Link Tapo"
            snapshot="http://YOUR_IP/cgi-bin/snapshot.cgi?channel=0"
            stream="rtsp://admin:PASSWORD@YOUR_IP:554/stream1"
            note="Tapo also has a cloud API if you're using Tapo cloud"
          />
          <BrandSection
            brand="Ezviz"
            snapshot="http://YOUR_IP/cgi-bin/snapshot.cgi?channel=0"
            stream="rtsp://admin:PASSWORD@YOUR_IP:554/h264/ch0/main/av_stream"
            note="Ezviz may require ONVIF to be enabled in the app first"
          />
          <BrandSection
            brand="Generic / ONVIF"
            snapshot="http://YOUR_IP/snapshot.jpg"
            stream="rtsp://admin:PASSWORD@YOUR_IP:554/live/ch0"
            note="If your camera supports ONVIF, use an ONVIF device manager to discover endpoints"
          />
        </div>
      </div>
    ),
  },
  {
    id: 3,
    title: "Choose Your Stream Type",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 5.25h16.5m-16.5 4.5h16.5m-16.5 4.5h16.5m-16.5 4.5h16.5" />
      </svg>
    ),
    content: (
      <div className="space-y-3 text-sm text-gray-300">
        <p>The viewer supports several stream types. Here's when to use each:</p>

        <div className="space-y-3">
          <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-green-500/20 px-2 py-0.5 text-xs font-medium text-green-400">Recommended</span>
              <h4 className="font-semibold text-white">Snapshot (JPEG)</h4>
            </div>
            <p className="mt-2 text-gray-400">The app fetches a still image periodically (every 2–10 seconds). Works with almost every IP camera.</p>
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded bg-gray-800 p-2">
                <span className="text-gray-500">Refresh Rate:</span>
                <span className="ml-1 text-white">2–10 seconds</span>
              </div>
              <div className="rounded bg-gray-800 p-2">
                <span className="text-gray-500">Bandwidth:</span>
                <span className="ml-1 text-white">Low</span>
              </div>
            </div>
            <div className="mt-2 rounded bg-gray-800 p-2 text-xs text-gray-400">
              <strong className="text-gray-300">Use URL like:</strong> <code className="text-orange-300">http://192.168.1.100/cgi-bin/snapshot.cgi</code>
            </div>
          </div>

          <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
            <h4 className="font-semibold text-white">MJPEG Stream</h4>
            <p className="mt-2 text-gray-400">Continuous stream of JPEG frames. Provides smoother video than snapshots. Works with many cameras.</p>
            <div className="mt-2 rounded bg-gray-800 p-2 text-xs text-gray-400">
              <strong className="text-gray-300">Use URL like:</strong> <code className="text-orange-300">http://192.168.1.100:8080/video.mjpg</code>
            </div>
          </div>

          <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
            <h4 className="font-semibold text-white">HLS Stream (.m3u8)</h4>
            <p className="mt-2 text-gray-400">Requires your camera or a middleware (like MotionEye or go2rtc) to provide an HLS stream endpoint.</p>
            <div className="mt-2 rounded bg-gray-800 p-2 text-xs text-gray-400">
              <strong className="text-gray-300">Use URL like:</strong> <code className="text-orange-300">http://192.168.1.100:8888/stream.m3u8</code>
            </div>
          </div>
        </div>

        <div className="mt-2 rounded-lg border border-blue-500/30 bg-blue-500/10 p-3">
          <p className="text-blue-400 text-xs">
            📌 <strong>Start with Snapshot mode</strong> — it works with virtually every camera. You can always switch to MJPEG later.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: 4,
    title: "Add Your Camera to the Viewer",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
      </svg>
    ),
    content: (
      <div className="space-y-3 text-sm text-gray-300">
        <p>Now let's add your camera to the viewer:</p>
        <ol className="list-inside list-decimal space-y-3 text-gray-300">
          <li className="pl-1">
            <span className="font-medium text-white">Click "Add Camera"</span> in the top-right corner of the dashboard.
          </li>
          <li className="pl-1">
            <span className="font-medium text-white">Enter a name</span> — something you'll recognize (e.g., "Front Door", "Garage").
          </li>
          <li className="pl-1">
            <span className="font-medium text-white">Enter the location</span> (optional) — helps organize multiple cameras.
          </li>
          <li className="pl-1">
            <span className="font-medium text-white">Select stream type</span> — start with <span className="text-white">Snapshot (JPEG)</span>.
          </li>
          <li className="pl-1">
            <span className="font-medium text-white">Paste the stream URL</span> — use the format from Step 2, replacing YOUR_IP with your camera's actual IP.
          </li>
          <li className="pl-1">
            <span className="font-medium text-white">Enter credentials</span> — if your camera requires a username/password.
          </li>
          <li className="pl-1">
            <span className="font-medium text-white">Set refresh interval</span> — 3000ms = smooth, 5000ms = balanced, 10000ms = low bandwidth.
          </li>
          <li className="pl-1">
            <span className="font-medium text-white">Click "Add Camera"</span> and wait a few seconds for the first snapshot to appear.
          </li>
        </ol>

        <div className="mt-3 rounded-lg border border-green-500/30 bg-green-500/10 p-3">
          <p className="text-green-400 text-xs">
            ✅ <strong>Success:</strong> You should see a green dot and the live image. Double-click to view fullscreen.
          </p>
        </div>
        <div className="mt-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3">
          <p className="text-red-400 text-xs">
            ❌ <strong>Error?</strong> Check that your computer is on the same WiFi/LAN as the camera, and that the URL is correct.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: 5,
    title: "Troubleshooting",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.178-2.590c.78-.203 1.539-.48 2.252-.822m-8.178 5.63l2.496-3.03c.317-.384.74-.626 1.208-.766m-4.344 0l-4.655 5.653a2.548 2.548 0 003.586 3.586" />
      </svg>
    ),
    content: (
      <div className="space-y-3 text-sm text-gray-300">
        <p>Common issues and how to fix them:</p>

        <div className="space-y-3">
          <TroubleSection
            problem="Camera shows 'Connection error' or red dot"
            solutions={[
              "Make sure your computer is on the same network as the camera",
              "Verify the camera's IP address hasn't changed — check your router",
              "Try opening the snapshot URL directly in your browser (e.g., http://192.168.1.100/snapshot.jpg)",
              "Check that the username/password are correct — some cameras use 'admin' as default",
            ]}
          />
          <TroubleSection
            problem="Image is loading slowly or freezing"
            solutions={[
              "Increase the refresh interval to 10000ms or higher",
              "Some cameras have a 'sub stream' with lower resolution — try that URL instead",
              "Check your home network bandwidth — other devices may be competing",
            ]}
          />
          <TroubleSection
            problem="Can't connect from outside my home"
            solutions={[
              "Set up port forwarding on your router (not recommended for security)",
              "Use a VPN like Tailscale or ZeroTier for secure remote access",
              "Consider a home server with reverse proxy (Nginx + Cloudflare Tunnel)",
            ]}
          />
          <TroubleSection
            problem="RTSP stream doesn't work in browser"
            solutions={[
              "Browsers can't play RTSP directly — use the Snapshot mode instead",
              "Install go2rtc on a Raspberry Pi to convert RTSP → WebRTC for real-time viewing",
              "Use MotionEye as middleware to expose camera feeds as HTTP",
            ]}
          />
        </div>
      </div>
    ),
  },
];

function BrandSection({ brand, snapshot, stream, note }: { brand: string; snapshot: string; stream: string; note: string }) {
  const [copiedSnap, setCopiedSnap] = useState(false);
  const [copiedStream, setCopiedStream] = useState(false);

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-3">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-red-400">{brand}</h4>
      <div className="mt-2 space-y-2">
        <div>
          <p className="text-[10px] text-gray-500">Snapshot URL</p>
          <div className="mt-1 flex items-center gap-1">
            <code className="flex-1 rounded bg-gray-900 px-2 py-1.5 text-[11px] text-orange-300 overflow-x-auto block max-h-[60px]">{snapshot}</code>
            <button
              onClick={() => { navigator.clipboard.writeText(snapshot); setCopiedSnap(true); setTimeout(() => setCopiedSnap(false), 1500); }}
              className="flex-shrink-0 rounded bg-gray-700 px-2 py-1.5 text-[10px] text-gray-400 transition hover:text-white"
            >
              {copiedSnap ? "✓" : "Copy"}
            </button>
          </div>
        </div>
        <div>
          <p className="text-[10px] text-gray-500">RTSP Stream URL</p>
          <div className="mt-1 flex items-center gap-1">
            <code className="flex-1 rounded bg-gray-900 px-2 py-1.5 text-[11px] text-blue-300 overflow-x-auto block max-h-[60px]">{stream}</code>
            <button
              onClick={() => { navigator.clipboard.writeText(stream); setCopiedStream(true); setTimeout(() => setCopiedStream(false), 1500); }}
              className="flex-shrink-0 rounded bg-gray-700 px-2 py-1.5 text-[10px] text-gray-400 transition hover:text-white"
            >
              {copiedStream ? "✓" : "Copy"}
            </button>
          </div>
        </div>
        {note && <p className="text-[11px] text-gray-500 italic">ℹ️ {note}</p>}
      </div>
    </div>
  );
}

function TroubleSection({ problem, solutions }: { problem: string; solutions: string[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-800/30">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between p-3 text-left"
      >
        <span className="text-sm font-medium text-white">{problem}</span>
        <svg
          className={`h-4 w-4 flex-shrink-0 text-gray-500 transition ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>
      {open && (
        <div className="border-t border-gray-800 px-3 pb-3 pt-2">
          <ul className="list-inside list-disc space-y-1 text-xs text-gray-400">
            {solutions.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

interface HelpModalProps {
  onClose: () => void;
}

export function HelpModal({ onClose }: HelpModalProps) {
  const [activeStep, setActiveStep] = useState(0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="flex w-full max-w-3xl max-h-[85vh] rounded-2xl border border-gray-800 bg-gray-900 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sidebar */}
        <div className="w-56 flex-shrink-0 border-r border-gray-800 bg-gray-900/50 hidden sm:block">
          <div className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-600">
                <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.178-2.590c.78-.203 1.539-.48 2.252-.822m-8.178 5.63l2.496-3.03c.317-.384.74-.626 1.208-.766m-4.344 0l-4.655 5.653a2.548 2.548 0 003.586 3.586" />
                </svg>
              </div>
              <span className="text-sm font-bold text-white">Setup Guide</span>
            </div>
            <nav className="space-y-1">
              {steps.map((step, i) => (
                <button
                  key={step.id}
                  onClick={() => setActiveStep(i)}
                  className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition ${
                    activeStep === i
                      ? "bg-red-600/20 text-red-400"
                      : "text-gray-400 hover:bg-gray-800 hover:text-white"
                  }`}
                >
                  <span className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                    activeStep === i ? "bg-red-600 text-white" : "bg-gray-800 text-gray-500"
                  }`}>
                    {step.id}
                  </span>
                  <span className="truncate">{step.title}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Mobile step selector */}
          <div className="flex items-center gap-1 border-b border-gray-800 p-3 sm:hidden overflow-x-auto">
            {steps.map((step, i) => (
              <button
                key={step.id}
                onClick={() => setActiveStep(i)}
                className={`flex-shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  activeStep === i
                    ? "bg-red-600 text-white"
                    : "bg-gray-800 text-gray-400"
                }`}
              >
                {step.id}
              </button>
            ))}
          </div>

          <div className="p-6">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-600/10 text-red-400">
                {steps[activeStep].icon}
              </div>
              <div>
                <div className="text-xs text-gray-500">Step {steps[activeStep].id} of {steps.length}</div>
                <h2 className="text-xl font-bold text-white">{steps[activeStep].title}</h2>
              </div>
            </div>

            {/* Step content */}
            <div>{steps[activeStep].content}</div>

            {/* Navigation */}
            <div className="mt-8 flex items-center justify-between border-t border-gray-800 pt-4">
              <button
                onClick={() => setActiveStep(Math.max(0, activeStep - 1))}
                disabled={activeStep === 0}
                className="rounded-lg bg-gray-800 px-4 py-2 text-sm font-medium text-gray-300 transition hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                ← Previous
              </button>

              {/* Progress dots */}
              <div className="flex items-center gap-1.5">
                {steps.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveStep(i)}
                    className={`h-2 w-2 rounded-full transition ${
                      activeStep === i ? "bg-red-500 w-5" : "bg-gray-700"
                    }`}
                  />
                ))}
              </div>

              {activeStep < steps.length - 1 ? (
                <button
                  onClick={() => setActiveStep(activeStep + 1)}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-500"
                >
                  Next →
                </button>
              ) : (
                <button
                  onClick={onClose}
                  className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-500"
                >
                  Done ✓
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
