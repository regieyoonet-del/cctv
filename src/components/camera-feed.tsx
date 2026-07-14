"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { Camera } from "@/lib/types";

interface CameraFeedProps {
  camera: Camera;
  fullscreen?: boolean;
  layout?: "grid" | "list";
  onSelect?: () => void;
  onFullscreen?: () => void;
  onExitFullscreen?: () => void;
  onToggleActive?: () => void;
}

async function captureNow(cameraId: number) {
  await fetch("/api/recordings/capture", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cameraId }),
  });
}

export function CameraFeed({
  camera,
  fullscreen = false,
  layout = "grid",
  onSelect,
  onFullscreen,
  onExitFullscreen,
  onToggleActive,
}: CameraFeedProps) {
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [capturing, setCapturing] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const proxyUrl = `/api/proxy/snapshot?cameraId=${camera.id}`;

  const fetchSnapshot = useCallback(async () => {
    if (!camera.isActive) return;
    try {
      // Use a cache-busting query param
      const url = `${proxyUrl}&_t=${Date.now()}`;
      const res = await fetch(url);
      if (!res.ok) {
        setError(true);
        return;
      }
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      setImgSrc((prev) => {
        if (prev && prev.startsWith("blob:")) {
          URL.revokeObjectURL(prev);
        }
        return objectUrl;
      });
      setError(false);
      setLastUpdated(new Date());
    } catch {
      setError(true);
    }
  }, [proxyUrl, camera.isActive]);

  useEffect(() => {
    if (camera.streamType === "snapshot" || camera.streamType === "mjpeg") {
      fetchSnapshot();
      const interval = camera.refreshInterval || 5000;
      intervalRef.current = setInterval(fetchSnapshot, interval);
      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    }
  }, [camera.streamType, camera.refreshInterval, fetchSnapshot]);

  // For HLS streams, we'd use a video element with hls.js — for now show snapshot fallback
  useEffect(() => {
    if (camera.streamType === "hls" || camera.streamType === "webrtc") {
      fetchSnapshot();
      const interval = 10000;
      intervalRef.current = setInterval(fetchSnapshot, interval);
      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    }
  }, [camera.streamType, fetchSnapshot]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (imgSrc && imgSrc.startsWith("blob:")) {
        URL.revokeObjectURL(imgSrc);
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (layout === "list") {
    return (
      <div className="group relative overflow-hidden rounded-xl border border-gray-800 bg-gray-900 transition hover:border-gray-700">
        <div className="flex items-center gap-4 p-3">
          {/* Thumbnail */}
          <div className="relative h-20 w-32 flex-shrink-0 overflow-hidden rounded-lg bg-gray-800">
            {camera.isActive && imgSrc && !error ? (
              <img
                ref={imgRef}
                src={imgSrc}
                alt={camera.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                {!camera.isActive ? (
                  <svg className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                ) : error ? (
                  <svg className="h-6 w-6 text-red-500/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                ) : (
                  <div className="h-5 w-5 animate-pulse rounded-full bg-gray-700" />
                )}
              </div>
            )}
            {/* Status dot */}
            <div className="absolute right-1.5 top-1.5">
              <span
                className={`flex h-2.5 w-2.5 rounded-full ring-1 ring-gray-900 ${
                  camera.isActive && !error
                    ? "bg-green-500"
                    : camera.isActive && error
                    ? "bg-red-500"
                    : "bg-gray-600"
                }`}
              />
            </div>
          </div>

          {/* Info */}
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-semibold text-white">{camera.name}</h3>
            {camera.location && (
              <p className="truncate text-xs text-gray-500">{camera.location}</p>
            )}
            <div className="mt-1 flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded bg-gray-800 px-1.5 py-0.5 text-[10px] uppercase text-gray-400">
                {camera.streamType}
              </span>
              {lastUpdated && (
                <span className="text-[10px] text-gray-600">
                  Updated {lastUpdated.toLocaleTimeString()}
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => { e.stopPropagation(); onFullscreen?.(); }}
              className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-800 hover:text-white"
              title="Fullscreen"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 8.25M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15.75M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 8.25m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15.75" />
              </svg>
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onSelect?.(); }}
              className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-800 hover:text-white"
              title="Settings"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM12.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM18.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Grid layout
  return (
    <div
      className={`group relative overflow-hidden rounded-xl border border-gray-800 bg-gray-900 transition hover:border-gray-700 ${
        fullscreen ? "h-full w-full rounded-none border-none" : ""
      }`}
    >
      {/* Video area */}
      <div
        className={`relative cursor-pointer bg-gray-800 ${
          fullscreen ? "h-full w-full" : "aspect-video"
        }`}
        onClick={() => onFullscreen?.()}
        onDoubleClick={() => onFullscreen?.()}
      >
        {camera.isActive && imgSrc && !error ? (
          <img
            ref={imgRef}
            src={imgSrc}
            alt={camera.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2">
            {!camera.isActive ? (
              <>
                <svg className="h-10 w-10 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
                <span className="text-xs text-gray-600">Camera offline</span>
              </>
            ) : error ? (
              <>
                <svg className="h-10 w-10 text-red-500/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
                <span className="text-xs text-red-400">Connection error</span>
              </>
            ) : (
              <>
                <div className="h-8 w-8 animate-spin rounded-full border-3 border-gray-600 border-t-gray-400" />
                <span className="text-xs text-gray-500">Connecting...</span>
              </>
            )}
          </div>
        )}

        {/* Overlay controls */}
        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-2 opacity-0 transition group-hover:opacity-100">
          <div className="flex items-center gap-1.5">
            <span
              className={`flex h-2.5 w-2.5 items-center justify-center rounded-full ${
                camera.isActive && !error
                  ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"
                  : camera.isActive && error
                  ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"
                  : "bg-gray-600"
              }`}
            >
              {camera.isActive && !error && (
                <span className="inline-flex h-1.5 w-1.5 animate-ping rounded-full bg-green-400" />
              )}
            </span>
            <span className="text-[10px] font-medium uppercase tracking-wider text-white/80">
              {camera.isActive && !error ? "Live" : camera.isActive && error ? "Error" : "Offline"}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {camera.isActive && (
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  setCapturing(true);
                  await captureNow(camera.id);
                  setTimeout(() => setCapturing(false), 1200);
                }}
                className="rounded-lg bg-black/50 p-1.5 text-white/80 backdrop-blur transition hover:bg-black/70"
                title="Save a snapshot to Recordings"
              >
                {capturing ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.174C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.174 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
                  </svg>
                )}
              </button>
            )}
            {fullscreen && onExitFullscreen && (
              <button
                onClick={(e) => { e.stopPropagation(); onExitFullscreen(); }}
                className="rounded-lg bg-black/50 p-1.5 text-white/80 backdrop-blur transition hover:bg-black/70"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
            {!fullscreen && (
              <button
                onClick={(e) => { e.stopPropagation(); onFullscreen?.(); }}
                className="rounded-lg bg-black/50 p-1.5 text-white/80 backdrop-blur transition hover:bg-black/70"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 8.25M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15.75M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 8.25m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15.75" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Bottom overlay with timestamp */}
        {camera.isActive && !error && lastUpdated && (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 transition group-hover:opacity-100">
            <span className="text-[10px] text-white/70">
              {lastUpdated.toLocaleTimeString()}
            </span>
          </div>
        )}
      </div>

      {/* Card footer */}
      {!fullscreen && (
        <div className="flex items-center justify-between px-3 py-2.5">
          <div className="min-w-0 flex-1 cursor-pointer" onClick={() => onSelect?.()}>
            <h3 className="truncate text-sm font-semibold text-white">{camera.name}</h3>
            {camera.location && (
              <p className="truncate text-xs text-gray-500">{camera.location}</p>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => { e.stopPropagation(); onToggleActive?.(); }}
              className={`rounded-lg p-1.5 transition ${
                camera.isActive
                  ? "text-green-500 hover:bg-green-500/10"
                  : "text-gray-600 hover:bg-gray-800 hover:text-gray-400"
              }`}
              title={camera.isActive ? "Active — click to disable" : "Disabled — click to enable"}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                {camera.isActive ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5.636 5.636a9 9 0 1012.728 0M12 3v6" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5.636 5.636a9 9 0 1012.728 0M12 3v6M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                )}
              </svg>
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onSelect?.(); }}
              className="rounded-lg p-1.5 text-gray-500 transition hover:bg-gray-800 hover:text-white"
              title="Camera settings"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
