import path from "node:path";
import fs from "node:fs/promises";

// Recordings are stored outside of `public/` so access is always mediated
// by an authenticated API route rather than being served as static files.
export const RECORDINGS_ROOT = path.join(
  /* turbopackIgnore: true */ process.cwd(),
  "storage",
  "recordings"
);

export function cameraRecordingDir(cameraId: number) {
  return path.join(RECORDINGS_ROOT, String(cameraId));
}

export async function ensureCameraRecordingDir(cameraId: number) {
  const dir = cameraRecordingDir(cameraId);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

export async function fileSizeOf(filePath: string): Promise<number | null> {
  try {
    const stat = await fs.stat(filePath);
    return stat.size;
  } catch {
    return null;
  }
}
