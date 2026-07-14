import fs from "node:fs/promises";
import path from "node:path";
import { db } from "@/db";
import { cameras, recordings } from "@/db/schema";
import { eq, lt, and } from "drizzle-orm";
import { ensureCameraRecordingDir, cameraRecordingDir, fileSizeOf } from "./storage";

export type Camera = typeof cameras.$inferSelect;

/**
 * Fetches a single snapshot from a camera (using its snapshot/stream URL and
 * optional basic auth credentials) and saves it to disk plus a DB row.
 */
export async function captureSnapshot(
  camera: Camera,
  triggerType: "scheduled" | "manual" | "motion" = "scheduled"
) {
  const sourceUrl = camera.snapshotUrl || camera.streamUrl;
  if (!sourceUrl) {
    throw new Error("Camera has no snapshot or stream URL configured");
  }

  const headers: Record<string, string> = {};
  if (camera.username && camera.password) {
    const auth = Buffer.from(`${camera.username}:${camera.password}`).toString("base64");
    headers["Authorization"] = `Basic ${auth}`;
  }

  const response = await fetch(sourceUrl, {
    headers,
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    throw new Error(`Camera responded with ${response.status}`);
  }

  const contentType = response.headers.get("content-type") || "image/jpeg";
  const ext = contentType.includes("png") ? "png" : "jpg";
  const buffer = Buffer.from(await response.arrayBuffer());

  await ensureCameraRecordingDir(camera.id);
  const timestamp = Date.now();
  const filename = `${timestamp}.${ext}`;
  const filePath = path.join(cameraRecordingDir(camera.id), filename);

  await fs.writeFile(filePath, buffer);

  const [record] = await db
    .insert(recordings)
    .values({
      cameraId: camera.id,
      filename,
      filePath,
      contentType,
      triggerType,
      fileSize: buffer.byteLength,
    })
    .returning();

  return record;
}

/**
 * Deletes recordings (and their files) older than the camera's retention
 * window. Called opportunistically after each capture.
 */
export async function cleanupOldRecordings(camera: Camera) {
  const retentionDays = camera.retentionDays || 7;
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

  const stale = await db
    .select()
    .from(recordings)
    .where(and(eq(recordings.cameraId, camera.id), lt(recordings.recordedAt, cutoff)));

  for (const rec of stale) {
    try {
      await fs.unlink(rec.filePath);
    } catch {
      // File may already be gone — ignore.
    }
  }

  if (stale.length > 0) {
    await db
      .delete(recordings)
      .where(and(eq(recordings.cameraId, camera.id), lt(recordings.recordedAt, cutoff)));
  }
}

export async function deleteRecordingFile(filePath: string) {
  try {
    await fs.unlink(filePath);
  } catch {
    // Ignore missing files.
  }
}

export async function recomputeFileSize(filePath: string) {
  return fileSizeOf(filePath);
}
