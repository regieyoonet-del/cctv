import { db } from "@/db";
import { cameras } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { captureSnapshot, cleanupOldRecordings } from "./capture";

type TimerHandle = ReturnType<typeof setInterval>;

const globalForRecorder = globalThis as typeof globalThis & {
  __cctvRecorderTimers?: Map<number, { timer: TimerHandle; interval: number }>;
  __cctvRecorderWatcher?: TimerHandle;
};

const timers = (globalForRecorder.__cctvRecorderTimers ??= new Map());

async function tick(cameraId: number) {
  try {
    const [camera] = await db.select().from(cameras).where(eq(cameras.id, cameraId));
    if (!camera || !camera.isActive || !camera.recordingEnabled) return;
    await captureSnapshot(camera, "scheduled");
    await cleanupOldRecordings(camera);
  } catch (err) {
    console.error(`[recorder] capture failed for camera ${cameraId}:`, err instanceof Error ? err.message : err);
  }
}

function scheduleCamera(cameraId: number, intervalSeconds: number) {
  const existing = timers.get(cameraId);
  const intervalMs = Math.max(5, intervalSeconds) * 1000;
  if (existing && existing.interval === intervalMs) return; // already correct
  if (existing) clearInterval(existing.timer);

  const timer = setInterval(() => tick(cameraId), intervalMs);
  timers.set(cameraId, { timer, interval: intervalMs });
}

function unscheduleCamera(cameraId: number) {
  const existing = timers.get(cameraId);
  if (existing) {
    clearInterval(existing.timer);
    timers.delete(cameraId);
  }
}

/** Reconciles active timers against the cameras table. */
async function reconcile() {
  try {
    const activeCameras = await db
      .select()
      .from(cameras)
      .where(and(eq(cameras.isActive, true), eq(cameras.recordingEnabled, true)));

    const activeIds = new Set(activeCameras.map((c) => c.id));

    for (const id of Array.from(timers.keys())) {
      if (!activeIds.has(id)) unscheduleCamera(id);
    }

    for (const camera of activeCameras) {
      scheduleCamera(camera.id, camera.recordingInterval);
    }
  } catch (err) {
    console.error("[recorder] reconcile failed:", err instanceof Error ? err.message : err);
  }
}

/**
 * Starts the background recording scheduler. Safe to call multiple times —
 * it only sets up the watcher once per server process.
 */
export function startRecorderScheduler() {
  if (globalForRecorder.__cctvRecorderWatcher) return;

  reconcile();
  globalForRecorder.__cctvRecorderWatcher = setInterval(reconcile, 15000);
  console.log("[recorder] background recording scheduler started");
}

/** Call after any camera create/update/delete to pick up changes quickly. */
export function requestReconcile() {
  reconcile();
}
