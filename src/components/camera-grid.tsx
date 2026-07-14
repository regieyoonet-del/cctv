"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { CameraFeed } from "./camera-feed";
import { AddCameraModal } from "./add-camera-modal";
import { CameraDetailModal } from "./camera-detail-modal";
import { HelpModal } from "./help-modal";
import { RecordingsView } from "./recordings-view";
import { DiscoveryModal } from "./discovery-modal";
import type { Camera } from "@/lib/types";

export function CameraGrid() {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCamera, setSelectedCamera] = useState<Camera | null>(null);
  const [fullscreenCamera, setFullscreenCamera] = useState<Camera | null>(null);
  const [layout, setLayout] = useState<"grid" | "list">("grid");
  const [showHelp, setShowHelp] = useState(false);
  const [showRecordings, setShowRecordings] = useState(false);
  const [showDiscovery, setShowDiscovery] = useState(false);
  const [addPrefill, setAddPrefill] = useState<Partial<Camera> | undefined>(undefined);

  const fetchCameras = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch("/api/cameras");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setCameras(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load cameras");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCameras();
  }, [fetchCameras]);

  const handleAddCamera = async (data: Partial<Camera>) => {
    const res = await fetch("/api/cameras", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to add camera");
    }
    await fetchCameras();
    setShowAddModal(false);
  };

  const handleUpdateCamera = async (id: number, data: Partial<Camera>) => {
    const res = await fetch(`/api/cameras/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to update camera");
    }
    await fetchCameras();
    setSelectedCamera(null);
  };

  const handleDeleteCamera = async (id: number) => {
    const res = await fetch(`/api/cameras/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to delete camera");
    }
    await fetchCameras();
    setSelectedCamera(null);
  };

  const handleToggleActive = async (id: number, isActive: boolean) => {
    await fetch(`/api/cameras/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
    await fetchCameras();
  };

  if (fullscreenCamera) {
    return (
      <div className="fixed inset-0 z-50 bg-black">
        <CameraFeed
          camera={fullscreenCamera}
          fullscreen
          onExitFullscreen={() => setFullscreenCamera(null)}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-gray-800 bg-gray-950/95 backdrop-blur supports-[backdrop-filter]:bg-gray-950/80">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-600">
              <svg
                className="h-5 w-5 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">CCTV Viewer</h1>
              <p className="text-xs text-gray-500">
                {cameras.length} camera{cameras.length !== 1 ? "s" : ""} connected
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Layout toggle */}
            <div className="mr-2 flex rounded-lg border border-gray-700 bg-gray-900 p-0.5">
              <button
                onClick={() => setLayout("grid")}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  layout === "grid"
                    ? "bg-gray-700 text-white"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                </svg>
              </button>
              <button
                onClick={() => setLayout("list")}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  layout === "list"
                    ? "bg-gray-700 text-white"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                </svg>
              </button>
            </div>

            <button
              onClick={() => setShowDiscovery(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-purple-600/40 bg-purple-600/10 px-3 py-2 text-sm font-medium text-purple-300 transition hover:border-purple-500 hover:bg-purple-600/20 hover:text-purple-200"
              title="Discover cameras on your network"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 011.06 0z" />
              </svg>
              <span className="hidden sm:inline">Discover</span>
            </button>
            <button
              onClick={() => setShowRecordings(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm font-medium text-gray-400 transition hover:border-gray-600 hover:text-white"
              title="Review Recordings"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.174C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.174 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
              </svg>
              <span className="hidden sm:inline">Recordings</span>
            </button>
            <button
              onClick={() => setShowHelp(true)}
              className="inline-flex items-center rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm font-medium text-gray-400 transition hover:border-gray-600 hover:text-white"
              title="Setup Guide"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
              </svg>
              <span className="hidden sm:inline">Guide</span>
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-red-600/25 transition hover:bg-red-500 active:scale-95"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Add Camera
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6">
        {loading && (
          <div className="flex flex-col items-center justify-center py-32">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-700 border-t-red-500" />
            <p className="mt-4 text-sm text-gray-500">Loading cameras...</p>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center py-32">
            <div className="rounded-full bg-red-500/10 p-3">
              <svg className="h-8 w-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            </div>
            <p className="mt-4 text-sm text-red-400">{error}</p>
            <button
              onClick={fetchCameras}
              className="mt-4 rounded-lg bg-gray-800 px-4 py-2 text-sm font-medium text-gray-300 transition hover:bg-gray-700"
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && cameras.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 sm:py-32">
            <div className="rounded-full bg-gray-800 p-4">
              <svg className="h-10 w-10 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
              </svg>
            </div>
            <h2 className="mt-6 text-xl font-semibold text-white">No cameras connected</h2>
            <p className="mt-2 max-w-sm text-center text-sm text-gray-500">
              Connect your IP cameras to start monitoring your home from one dashboard.
            </p>

            {/* Quick guide cards */}
            <div className="mt-8 grid w-full max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4">
              <div
                onClick={() => setShowDiscovery(true)}
                className="col-span-2 cursor-pointer rounded-xl border border-purple-600/40 bg-purple-600/10 p-4 text-center transition hover:border-purple-500 hover:bg-purple-600/20 sm:col-span-1"
              >
                <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/20">
                  <svg className="h-5 w-5 text-purple-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 011.06 0z" />
                  </svg>
                </div>
                <h3 className="text-sm font-semibold text-white">Auto-Discover</h3>
                <p className="mt-1 text-xs text-purple-300/70">Scan network for cameras</p>
              </div>

              <div
                onClick={() => setShowHelp(true)}
                className="cursor-pointer rounded-xl border border-gray-800 bg-gray-900/50 p-4 text-center transition hover:border-gray-700 hover:bg-gray-900"
              >
                <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                  <svg className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.178-2.590c.78-.203 1.539-.48 2.252-.822m-8.178 5.63l2.496-3.03c.317-.384.74-.626 1.208-.766m-4.344 0l-4.655 5.653a2.548 2.548 0 003.586 3.586" />
                  </svg>
                </div>
                <h3 className="text-sm font-semibold text-white">Setup Guide</h3>
                <p className="mt-1 text-xs text-gray-500">Step-by-step</p>
              </div>

              <div
                onClick={() => setShowAddModal(true)}
                className="cursor-pointer rounded-xl border border-gray-800 bg-gray-900/50 p-4 text-center transition hover:border-gray-700 hover:bg-gray-900"
              >
                <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10">
                  <svg className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                </div>
                <h3 className="text-sm font-semibold text-white">Quick Add</h3>
                <p className="mt-1 text-xs text-gray-500">Add manually</p>
              </div>

              <div
                onClick={() => setShowHelp(true)}
                className="cursor-pointer rounded-xl border border-gray-800 bg-gray-900/50 p-4 text-center transition hover:border-gray-700 hover:bg-gray-900"
              >
                <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
                  <svg className="h-5 w-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                  </svg>
                </div>
                <h3 className="text-sm font-semibold text-white">Brands</h3>
                <p className="mt-1 text-xs text-gray-500">URL reference</p>
              </div>
            </div>
          </div>
        )}

        {!loading && !error && cameras.length > 0 && (
          <div
            className={
              layout === "grid"
                ? "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                : "flex flex-col gap-4"
            }
          >
            {cameras.map((camera) => (
              <CameraFeed
                key={camera.id}
                camera={camera}
                layout={layout}
                onSelect={() => setSelectedCamera(camera)}
                onFullscreen={() => setFullscreenCamera(camera)}
                onToggleActive={() => handleToggleActive(camera.id, camera.isActive)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Modals */}
      {showAddModal && (
        <AddCameraModal
          onClose={() => {
            setShowAddModal(false);
            setAddPrefill(undefined);
          }}
          onSubmit={handleAddCamera}
          initial={addPrefill}
        />
      )}

      {selectedCamera && (
        <CameraDetailModal
          camera={selectedCamera}
          onClose={() => setSelectedCamera(null)}
          onUpdate={(data) => handleUpdateCamera(selectedCamera.id, data)}
          onDelete={() => handleDeleteCamera(selectedCamera.id)}
        />
      )}

      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}

      {showRecordings && (
        <RecordingsView cameras={cameras} onClose={() => setShowRecordings(false)} />
      )}

      {showDiscovery && (
        <DiscoveryModal
          onClose={() => setShowDiscovery(false)}
          onConnect={(prefill) => {
            setAddPrefill(prefill);
            setShowDiscovery(false);
            setShowAddModal(true);
          }}
        />
      )}
    </div>
  );
}
