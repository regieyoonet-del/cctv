import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { recordings, cameras } from "@/db/schema";
import { and, desc, eq, gte, lt } from "drizzle-orm";

export const dynamic = "force-dynamic";

// GET /api/recordings?cameraId=1&date=YYYY-MM-DD&limit=200
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const cameraId = searchParams.get("cameraId");
    const date = searchParams.get("date");
    const limitParam = searchParams.get("limit");
    const limit = Math.min(Math.max(parseInt(limitParam || "300", 10) || 300, 1), 1000);

    const conditions = [];
    if (cameraId) {
      conditions.push(eq(recordings.cameraId, parseInt(cameraId, 10)));
    }
    if (date) {
      const dayStart = new Date(`${date}T00:00:00.000Z`);
      const dayEnd = new Date(`${date}T23:59:59.999Z`);
      if (!Number.isNaN(dayStart.getTime())) {
        conditions.push(gte(recordings.recordedAt, dayStart));
        conditions.push(lt(recordings.recordedAt, dayEnd));
      }
    }

    const rows = await db
      .select({
        id: recordings.id,
        cameraId: recordings.cameraId,
        filename: recordings.filename,
        contentType: recordings.contentType,
        triggerType: recordings.triggerType,
        fileSize: recordings.fileSize,
        duration: recordings.duration,
        recordedAt: recordings.recordedAt,
        createdAt: recordings.createdAt,
        cameraName: cameras.name,
      })
      .from(recordings)
      .leftJoin(cameras, eq(recordings.cameraId, cameras.id))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(recordings.recordedAt))
      .limit(limit);

    return NextResponse.json(rows);
  } catch (error) {
    console.error("Failed to fetch recordings:", error);
    return NextResponse.json({ error: "Failed to fetch recordings" }, { status: 500 });
  }
}
