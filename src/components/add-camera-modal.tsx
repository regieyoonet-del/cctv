"use client";

import { useState } from "react";
import type { Camera } from "@/lib/types";

interface AddCameraModalProps {
  onClose: () => void;
  onSubmit: (data: Partial<Camera>) => Promise<void>;
  initial?: Partial<Camera>;
}

export function AddCameraModal({ onClose, onSubmit, initial }: AddCameraModalProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [streamUrl, setStreamUrl] = useState(initial?.streamUrl ?? "");
  const [snapshotUrl, setSnapshotUrl] = useState(initial?.snapshotUrl ?? "");
  const [streamType, setStreamType] = useState<Camera["streamType"]>(initial?.streamType ?? "snapshot");
  const [username, setUsername] = useState(initial?.username ?? "");
  const [password, setPassword] = useState(initial?.password ?? "");
  const [location, setLocation] = useState(initial?.location ?? "");
  const [refreshInterval, setRefreshInterval] = useState(initial?.refreshInterval ?? 5000);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !streamUrl.trim()) {
      setError("Name and Stream URL are required.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        name: name.trim(),
        streamUrl: streamUrl.trim(),
        snapshotUrl: snapshotUrl.trim() || undefined,
        streamType,
        username: username.trim() || undefined,
        password: password.trim() || undefined,
        location: location.trim() || undefined,
        refreshInterval,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add camera");
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div
        className="w-full max-w-lg rounded-2xl border border-gray-800 bg-gray-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-800 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Add Camera</h2>
            <p className="mt-0.5 text-xs text-gray-500">
              Connect an IP camera to your CCTV viewer
            </p>
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-4">
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
              <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              {error}
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-400">Camera Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Front Door, Garage, Backyard..."
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 transition focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-400">Location</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g., Front Porch"
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 transition focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-400">Stream Type</label>
              <select
                value={streamType}
                onChange={(e) => setStreamType(e.target.value as Camera["streamType"])}
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white transition focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
              >
                <option value="snapshot">Snapshot (JPEG)</option>
                <option value="mjpeg">MJPEG</option>
                <option value="hls">HLS Stream</option>
                <option value="webrtc">WebRTC</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-400">
                Refresh (ms)
              </label>
              <input
                type="number"
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(Number(e.target.value))}
                min={500}
                max={60000}
                step={500}
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white transition focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-400">Stream URL *</label>
            <input
              type="text"
              value={streamUrl}
              onChange={(e) => setStreamUrl(e.target.value)}
              placeholder="http://192.168.1.100:8080/stream"
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 transition focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
            <p className="mt-1 text-[11px] text-gray-600">
              RTSP, HLS (.m3u8), or snapshot URL for your camera
            </p>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-400">
              Snapshot URL <span className="text-gray-600">(optional)</span>
            </label>
            <input
              type="text"
              value={snapshotUrl}
              onChange={(e) => setSnapshotUrl(e.target.value)}
              placeholder="http://192.168.1.100:8080/snapshot.jpg"
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 transition focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
            <p className="mt-1 text-[11px] text-gray-600">
              If different from stream URL. Used for thumbnail previews.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-400">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 transition focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-400">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 transition focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 border-t border-gray-800 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-gray-800 px-4 py-2 text-sm font-medium text-gray-300 transition hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-500 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Adding...
                </>
              ) : (
                "Add Camera"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
