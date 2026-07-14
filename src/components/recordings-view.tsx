"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import type { Camera, Recording, RecordingStats } from "@/lib/types";

interface RecordingsViewProps {
  cameras: Camera[];
  onClose: () => void;
}

function formatBytes(bytes: number) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function RecordingsView({ cameras, onClose }: RecordingsViewProps) {
  const [selectedCameraId, setSelectedCameraId] = useState<number | "all">("all");
  const [selectedDate, setSelectedDate] = useState<string>(todayISO());
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<RecordingStats | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState(800); // ms between frames
  const playTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchRecordings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (selectedCameraId !== "all") params.set("cameraId", String(selectedCameraId));
      if (selectedDate) params.set("date", selectedDate);
      const res = await fetch(`/api/recordings?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch recordings");
      const data = await res.json();
      setRecordings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load recordings");
    } finally {
      setLoading(false);
    }
  }, [selectedCameraId, selectedDate]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/recordings/stats");
      if (res.ok) setStats(await res.json());
    } catch {
      // Non-critical — ignore.
    }
  }, []);

  useEffect(() => {
    fetchRecordings();
  }, [fetchRecordings]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Chronological order (oldest first) for scrubbing/playback purposes
  const orderedRecordings = useMemo(
    () => [...recordings].slice().reverse(),
    [recordings]
  );

  const handleDelete = async (id: number) => {
    await fetch(`/api/recordings/${id}`, { method: "DELETE" });
    await fetchRecordings();
    await fetchStats();
    setLightboxIndex(null);
  };

  const handleManualCapture = async () => {
    if (selectedCameraId === "all") return;
    try {
      const res = await fetch("/api/recordings/capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cameraId: selectedCameraId }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Capture failed");
      }
      await fetchRecordings();
      await fetchStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to capture snapshot");
    }
  };

  // Playback (timelapse) controls
  useEffect(() => {
    if (isPlaying && lightboxIndex !== null) {
      playTimerRef.current = setInterval(() => {
        setLightboxIndex((prev) => {
          if (prev === null) return prev;
          const next = prev + 1;
          if (next >= orderedRecordings.length) {
            setIsPlaying(false);
            return prev;
          }
          return next;
        });
      }, playSpeed);
      return () => {
        if (playTimerRef.current) clearInterval(playTimerRef.current);
      };
    }
  }, [isPlaying, playSpeed, lightboxIndex, orderedRecordings.length]);

  const cameraOptions = cameras;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-950">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-gray-800 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600">
            <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.174C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.174 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Recordings</h1>
            <p className="text-xs text-gray-500">Review stored footage from your cameras</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-800 hover:text-white"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </header>

      {/* Storage stats bar */}
      {stats && (
        <div className="flex flex-wrap items-center gap-4 border-b border-gray-800 bg-gray-900/50 px-4 py-2 sm:px-6">
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375" />
            </svg>
            <span className="text-white font-medium">{formatBytes(stats.totalBytes)}</span> used ·{" "}
            <span className="text-white font-medium">{stats.totalCount}</span> clips stored
          </div>
          <div className="text-[11px] text-gray-600">
            Files are stored on the server disk under <code className="rounded bg-gray-800 px-1 py-0.5 text-gray-400">storage/recordings/</code>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 border-b border-gray-800 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500">Camera</label>
          <select
            value={selectedCameraId}
            onChange={(e) => setSelectedCameraId(e.target.value === "all" ? "all" : Number(e.target.value))}
            className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">All cameras</option>
            {cameraOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500">Date</label>
          <input
            type="date"
            value={selectedDate}
            max={todayISO()}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <button
          onClick={() => setSelectedDate(todayISO())}
          className="rounded-lg bg-gray-800 px-3 py-1.5 text-xs font-medium text-gray-300 transition hover:bg-gray-700"
        >
          Today
        </button>

        <div className="flex-1" />

        <button
          onClick={handleManualCapture}
          disabled={selectedCameraId === "all"}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
          title={selectedCameraId === "all" ? "Select a specific camera first" : "Capture a snapshot now"}
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.174C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.174 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
          </svg>
          Record Now
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
        {loading && (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-700 border-t-blue-500" />
            <p className="mt-3 text-sm text-gray-500">Loading recordings...</p>
          </div>
        )}

        {error && (
          <div className="mx-auto max-w-md rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {!loading && !error && recordings.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="rounded-full bg-gray-800 p-4">
              <svg className="h-8 w-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.306a11.95 11.95 0 015.814-5.518l2.74-1.22m0 0l-5.94-2.281m5.94 2.28l-2.28 5.941" />
              </svg>
            </div>
            <h3 className="mt-4 text-base font-semibold text-white">No footage found</h3>
            <p className="mt-1 max-w-sm text-sm text-gray-500">
              No recordings for this camera/date. Enable "Recording" in a camera's settings for automatic
              capture, or hit "Record Now" to save a snapshot immediately.
            </p>
          </div>
        )}

        {!loading && !error && recordings.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {recordings.map((rec, displayIdx) => {
              const orderedIdx = orderedRecordings.findIndex((r) => r.id === rec.id);
              return (
                <button
                  key={rec.id}
                  onClick={() => setLightboxIndex(orderedIdx)}
                  className="group relative overflow-hidden rounded-lg border border-gray-800 bg-gray-900 text-left transition hover:border-gray-600"
                >
                  <div className="aspect-video overflow-hidden bg-gray-800">
                    <img
                      src={`/api/recordings/${rec.id}/file`}
                      alt={rec.filename}
                      loading="lazy"
                      className="h-full w-full object-cover transition group-hover:scale-105"
                    />
                  </div>
                  <div className="absolute left-1.5 top-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white backdrop-blur">
                    {rec.triggerType === "manual" ? "📸" : rec.triggerType === "motion" ? "🚨" : "⏱"}
                  </div>
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-1.5">
                    <p className="truncate text-[10px] font-medium text-white">
                      {selectedCameraId === "all" ? rec.cameraName : ""}
                    </p>
                    <p className="text-[10px] text-gray-300">
                      {new Date(rec.recordedAt).toLocaleTimeString()}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Lightbox / Playback */}
      {lightboxIndex !== null && orderedRecordings[lightboxIndex] && (
        <div
          className="fixed inset-0 z-[60] flex flex-col bg-black/95 backdrop-blur-sm"
          onClick={() => { setLightboxIndex(null); setIsPlaying(false); }}
        >
          <div className="flex items-center justify-between px-4 py-3 sm:px-6" onClick={(e) => e.stopPropagation()}>
            <div>
              <p className="text-sm font-semibold text-white">
                {orderedRecordings[lightboxIndex].cameraName || `Camera #${orderedRecordings[lightboxIndex].cameraId}`}
              </p>
              <p className="text-xs text-gray-400">
                {new Date(orderedRecordings[lightboxIndex].recordedAt).toLocaleString()} · Frame{" "}
                {lightboxIndex + 1} of {orderedRecordings.length}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleDelete(orderedRecordings[lightboxIndex].id)}
                className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400 transition hover:bg-red-500/20"
              >
                Delete
              </button>
              <button
                onClick={() => { setLightboxIndex(null); setIsPlaying(false); }}
                className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-800 hover:text-white"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div
            className="relative flex flex-1 items-center justify-center overflow-hidden px-4 pb-4"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={`/api/recordings/${orderedRecordings[lightboxIndex].id}/file`}
              alt="Recording frame"
              className="max-h-full max-w-full rounded-lg object-contain"
            />

            {/* Prev / Next arrows */}
            <button
              onClick={() => setLightboxIndex((i) => (i !== null ? Math.max(0, i - 1) : i))}
              disabled={lightboxIndex === 0}
              className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white backdrop-blur transition hover:bg-black/70 disabled:opacity-30"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
            <button
              onClick={() =>
                setLightboxIndex((i) => (i !== null ? Math.min(orderedRecordings.length - 1, i + 1) : i))
              }
              disabled={lightboxIndex === orderedRecordings.length - 1}
              className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white backdrop-blur transition hover:bg-black/70 disabled:opacity-30"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </div>

          {/* Playback controls (timelapse through frames) */}
          <div
            className="flex items-center justify-center gap-4 border-t border-gray-800 px-4 py-3"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setIsPlaying((p) => !p)}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500"
            >
              {isPlaying ? (
                <>
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6.75 5.25a.75.75 0 01.75-.75H9a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75V5.25zm7.5 0A.75.75 0 0115 4.5h1.5a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H15a.75.75 0 01-.75-.75V5.25z" />
                  </svg>
                  Pause
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" />
                  </svg>
                  Play
                </>
              )}
            </button>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Speed</span>
              <select
                value={playSpeed}
                onChange={(e) => setPlaySpeed(Number(e.target.value))}
                className="rounded-lg border border-gray-700 bg-gray-800 px-2 py-1.5 text-xs text-white focus:border-blue-500 focus:outline-none"
              >
                <option value={1500}>0.5x</option>
                <option value={800}>1x</option>
                <option value={400}>2x</option>
                <option value={150}>4x</option>
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
