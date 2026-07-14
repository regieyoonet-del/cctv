import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { cameras } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

// GET /api/proxy/snapshot?cameraId=1
// Proxy camera snapshots through the server to handle auth and CORS
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const cameraId = searchParams.get("cameraId");

    if (!cameraId) {
      return NextResponse.json(
        { error: "cameraId query parameter is required" },
        { status: 400 }
      );
    }

    const [camera] = await db
      .select()
      .from(cameras)
      .where(eq(cameras.id, parseInt(cameraId)));

    if (!camera) {
      return NextResponse.json({ error: "Camera not found" }, { status: 404 });
    }

    const snapshotUrl = camera.snapshotUrl || camera.streamUrl;

    if (!snapshotUrl) {
      return NextResponse.json(
        { error: "No snapshot URL configured" },
        { status: 400 }
      );
    }

    const headers: Record<string, string> = {};
    if (camera.username && camera.password) {
      const auth = Buffer.from(
        `${camera.username}:${camera.password}`
      ).toString("base64");
      headers["Authorization"] = `Basic ${auth}`;
    }

    const response = await fetch(snapshotUrl, {
      headers,
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Upstream error: ${response.status}` },
        { status: 502 }
      );
    }

    const contentType =
      response.headers.get("content-type") || "image/jpeg";
    const buffer = await response.arrayBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("Proxy snapshot error:", error);
    return NextResponse.json(
      { error: "Failed to proxy snapshot" },
      { status: 500 }
    );
  }
}
