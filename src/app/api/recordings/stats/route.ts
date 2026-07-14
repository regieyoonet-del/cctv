import { NextResponse } from "next/server";
import { db } from "@/db";
import { recordings, cameras } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

// GET /api/recordings/stats — storage usage summary per camera + overall
export async function GET() {
  try {
    const perCamera = await db
      .select({
        cameraId: recordings.cameraId,
        cameraName: cameras.name,
        count: sql<number>`count(${recordings.id})::int`,
        totalBytes: sql<number>`coalesce(sum(${recordings.fileSize}), 0)::bigint`,
        oldest: sql<string>`min(${recordings.recordedAt})`,
        newest: sql<string>`max(${recordings.recordedAt})`,
      })
      .from(recordings)
      .leftJoin(cameras, eq(recordings.cameraId, cameras.id))
      .groupBy(recordings.cameraId, cameras.name);

    const totalBytes = perCamera.reduce((sum, c) => sum + Number(c.totalBytes || 0), 0);
    const totalCount = perCamera.reduce((sum, c) => sum + Number(c.count || 0), 0);

    return NextResponse.json({
      totalBytes,
      totalCount,
      perCamera: perCamera.map((c) => ({
        ...c,
        totalBytes: Number(c.totalBytes || 0),
        count: Number(c.count || 0),
      })),
    });
  } catch (error) {
    console.error("Failed to compute recording stats:", error);
    return NextResponse.json({ error: "Failed to compute stats" }, { status: 500 });
  }
}
