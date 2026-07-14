import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { cameras } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

// GET /api/cameras/[id] — get a single camera
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const [camera] = await db
      .select()
      .from(cameras)
      .where(eq(cameras.id, parseInt(id)));

    if (!camera) {
      return NextResponse.json({ error: "Camera not found" }, { status: 404 });
    }

    return NextResponse.json(camera);
  } catch (error) {
    console.error("Failed to fetch camera:", error);
    return NextResponse.json(
      { error: "Failed to fetch camera" },
      { status: 500 }
    );
  }
}

// PATCH /api/cameras/[id] — update a camera
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const [updated] = await db
      .update(cameras)
      .set({
        ...body,
        updatedAt: new Date(),
      })
      .where(eq(cameras.id, parseInt(id)))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Camera not found" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update camera:", error);
    return NextResponse.json(
      { error: "Failed to update camera" },
      { status: 500 }
    );
  }
}

// DELETE /api/cameras/[id] — delete a camera
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const [deleted] = await db
      .delete(cameras)
      .where(eq(cameras.id, parseInt(id)))
      .returning();

    if (!deleted) {
      return NextResponse.json({ error: "Camera not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete camera:", error);
    return NextResponse.json(
      { error: "Failed to delete camera" },
      { status: 500 }
    );
  }
}
