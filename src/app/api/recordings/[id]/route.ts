import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { recordings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { deleteRecordingFile } from "@/lib/capture";

export const dynamic = "force-dynamic";

// GET /api/recordings/[id] — metadata for one recording
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

    return NextResponse.json(recording);
  } catch (error) {
    console.error("Failed to fetch recording:", error);
    return NextResponse.json({ error: "Failed to fetch recording" }, { status: 500 });
  }
}

// DELETE /api/recordings/[id] — remove a recording and its file
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const [deleted] = await db
      .delete(recordings)
      .where(eq(recordings.id, parseInt(id, 10)))
      .returning();

    if (!deleted) {
      return NextResponse.json({ error: "Recording not found" }, { status: 404 });
    }

    await deleteRecordingFile(deleted.filePath);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete recording:", error);
    return NextResponse.json({ error: "Failed to delete recording" }, { status: 500 });
  }
}
