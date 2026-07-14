import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { cameras } from "@/db/schema";
import { eq } from "drizzle-orm";
import { captureSnapshot } from "@/lib/capture";

export const dynamic = "force-dynamic";

// POST /api/recordings/capture  { cameraId }
// Manually captures a single snapshot right now and stores it as a recording.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const cameraId = body.cameraId;

    if (!cameraId) {
      return NextResponse.json({ error: "cameraId is required" }, { status: 400 });
    }

    const [camera] = await db.select().from(cameras).where(eq(cameras.id, cameraId));
    if (!camera) {
      return NextResponse.json({ error: "Camera not found" }, { status: 404 });
    }

    const recording = await captureSnapshot(camera, "manual");
    return NextResponse.json(recording, { status: 201 });
  } catch (error) {
    console.error("Manual capture failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to capture snapshot" },
      { status: 500 }
    );
  }
}
