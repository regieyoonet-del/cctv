"use client";

import { useState } from "react";
import type { Camera } from "@/lib/types";

interface CameraDetailModalProps {
  camera: Camera;
  onClose: () => void;
  onUpdate: (data: Partial<Camera>) => Promise<void>;
  onDelete: () => Promise<void>;
}

export function CameraDetailModal({
  camera,
  onClose,
  onUpdate,
  onDelete,
}: CameraDetailModalProps) {
  const [name, setName] = useState(camera.name);
  const [streamUrl, setStreamUrl] = useState(camera.streamUrl);
  const [snapshotUrl, setSnapshotUrl] = useState(camera.snapshotUrl || "");
  const [streamType, setStreamType] = useState<Camera["streamType"]>(camera.streamType);
  const [username, setUsername] = useState(camera.username || "");
  const [password, setPassword] = useState(camera.password || "");
  const [location, setLocation] = useState(camera.location || "");
  const [refreshInterval, setRefreshInterval] = useState(camera.refreshInterval);
  const [recordingEnabled, setRecordingEnabled] = useState(camera.recordingEnabled);
  const [recordingInterval, setRecordingInterval] = useState(camera.recordingInterval);
  const [retentionDays, setRetentionDays] = useState(camera.retentionDays);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !streamUrl.trim()) {
      setError("Name and Stream URL are required.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onUpdate({
        name: name.trim(),
        streamUrl: streamUrl.trim(),
        snapshotUrl: snapshotUrl.trim() || null,
        streamType,
        username: username.trim() || null,
        password: password.trim() || null,
        location: location.trim() || null,
        refreshInterval,
        recordingEnabled,
        recordingInterval,
        retentionDays,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update camera");
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setDeleting(true);
    try {
      await onDelete();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete camera");
      setDeleting(false);
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
            <h2 className="text-lg font-semibold text-white">Camera Settings</h2>
            <p className="mt-0.5 text-xs text-gray-500">ID: {camera.id}</p>
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
        <form onSubmit={handleSave} className="space-y-4 px-6 py-4">
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
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white transition focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-400">Location</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white transition focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
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
              <label className="mb-1 block text-xs font-medium text-gray-400">Refresh (ms)</label>
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
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white transition focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-400">Snapshot URL</label>
            <input
              type="text"
              value={snapshotUrl}
              onChange={(e) => setSnapshotUrl(e.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white transition focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-400">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white transition focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-400">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white transition focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
              />
            </div>
          </div>

          {/* Recording settings */}
          <div className="rounded-lg border border-gray-800 bg-gray-800/30 p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white">Continuous Recording</p>
                <p className="text-xs text-gray-500">Automatically capture and store footage on the server</p>
              </div>
              <button
                type="button"
                onClick={() => setRecordingEnabled((v) => !v)}
                className={`relative h-6 w-11 flex-shrink-0 rounded-full transition ${
                  recordingEnabled ? "bg-blue-600" : "bg-gray-700"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${
                    recordingEnabled ? "left-5" : "left-0.5"
                  }`}
                />
              </button>
            </div>

            {recordingEnabled && (
              <div className="mt-3 grid grid-cols-2 gap-3 border-t border-gray-700 pt-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-400">Capture every (sec)</label>
                  <input
                    type="number"
                    value={recordingInterval}
                    onChange={(e) => setRecordingInterval(Number(e.target.value))}
                    min={5}
                    max={3600}
                    className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white transition focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-400">Keep for (days)</label>
                  <input
                    type="number"
                    value={retentionDays}
                    onChange={(e) => setRetentionDays(Number(e.target.value))}
                    min={1}
                    max={90}
                    className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white transition focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <p className="col-span-2 text-[11px] text-gray-600">
                  Footage older than the retention window is deleted automatically. Files are saved to the
                  server's disk under <code className="rounded bg-gray-900 px-1 py-0.5">storage/recordings/</code>.
                </p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between border-t border-gray-800 pt-4">
            <div>
              {confirmDelete ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-red-400">Are you sure?</span>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={deleting}
                    className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-500 disabled:opacity-50"
                  >
                    {deleting ? "Deleting..." : "Yes, delete"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="rounded-lg bg-gray-800 px-3 py-1.5 text-xs font-medium text-gray-300 transition hover:bg-gray-700"
                  >
                    No
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400 transition hover:bg-red-500/20"
                >
                  Delete Camera
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
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
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
