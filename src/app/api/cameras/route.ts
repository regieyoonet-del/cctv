import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { cameras } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

// GET /api/cameras — list all cameras
export async function GET() {
  try {
    const allCameras = await db
      .select()
      .from(cameras)
      .orderBy(desc(cameras.createdAt));
    return NextResponse.json(allCameras);
  } catch (error) {
    console.error("Failed to fetch cameras:", error);
    return NextResponse.json(
      { error: "Failed to fetch cameras" },
      { status: 500 }
    );
  }
}

// POST /api/cameras — add a new camera
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      streamUrl,
      snapshotUrl,
      streamType = "hls",
      username,
      password,
      location,
      refreshInterval = 5000,
    } = body;

    if (!name || !streamUrl) {
      return NextResponse.json(
        { error: "Name and stream URL are required" },
        { status: 400 }
      );
    }

    const [camera] = await db
      .insert(cameras)
      .values({
        name,
        streamUrl,
        snapshotUrl: snapshotUrl || null,
        streamType,
        username: username || null,
        password: password || null,
        location: location || null,
        refreshInterval,
      })
      .returning();

    return NextResponse.json(camera, { status: 201 });
  } catch (error) {
    console.error("Failed to add camera:", error);
    return NextResponse.json(
      { error: "Failed to add camera" },
      { status: 500 }
    );
  }
}
