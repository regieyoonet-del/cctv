import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import { db } from "@/db";
import { recordings } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

// GET /api/recordings/[id]/file — stream the stored recording image from disk
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const [recording] = await db
      .select()
      .from(recordings)
      .where(eq(recordings.id, parseInt(id, 10)));

    if (!recording) {
      return NextResponse.json({ error: "Recording not found" }, { status: 404 });
    }

    const buffer = await fs.readFile(recording.filePath);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": recording.contentType || "image/jpeg",
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Disposition": `inline; filename="${recording.filename}"`,
      },
    });
  } catch (error) {
    console.error("Failed to read recording file:", error);
    return NextResponse.json({ error: "Recording file not found" }, { status: 404 });
  }
}
