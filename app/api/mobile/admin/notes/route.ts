import { NextResponse } from "next/server";

import { requireMobileAdmin } from "@/lib/mobile-admin-auth";
import { connectToDatabase } from "@/lib/mongodb";
import Note from "@/models/Note";

export const dynamic = "force-dynamic";

/**
 * GET /api/mobile/admin/notes?search=&subject=&grade=&fileType=&visibility=
 * Mobile mirror of `GET /api/admin/notes` (all notes, public + private).
 */
export async function GET(request: Request) {
  const gate = await requireMobileAdmin(request);
  if (!gate.ok) return gate.response;

  try {
    await connectToDatabase();

    const url = new URL(request.url);
    const search = url.searchParams.get("search") || "";
    const subject = url.searchParams.get("subject") || "";
    const grade = url.searchParams.get("grade") || "";
    const fileType = url.searchParams.get("fileType") || "";
    const visibility = url.searchParams.get("visibility") || "";
    const limit = Math.min(
      Math.max(1, parseInt(url.searchParams.get("limit") || "60", 10)),
      100,
    );

    const query: Record<string, unknown> = {};
    if (search) query.$text = { $search: search };
    if (subject) query.subject = { $regex: subject, $options: "i" };
    if (grade) query.grade = { $regex: grade, $options: "i" };
    if (fileType) query.fileType = fileType;
    if (visibility) query.visibility = visibility;

    const notes = await Note.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("uploaderId", "name username userImage role")
      .lean();

    const serialized = notes.map((note) => {
      const u = note.uploaderId as {
        _id?: { toString(): string };
        name?: string;
        username?: string;
        userImage?: string;
        role?: string;
      } | null;
      return {
        id: String(note._id),
        title: note.title,
        description: note.description || "",
        subject: note.subject,
        grade: note.grade,
        fileType: note.fileType,
        fileUrl: note.fileUrl || null,
        visibility: (note as { visibility?: string }).visibility || "public",
        price: (note as { price?: number }).price || 0,
        uploaderName: u?.name || "Unknown",
        uploaderUsername: u?.username || null,
        uploaderRole: u?.role || null,
        createdAt:
          (note as { createdAt?: Date }).createdAt?.toISOString?.() ||
          new Date().toISOString(),
      };
    });

    return NextResponse.json(serialized);
  } catch (error) {
    console.error("GET /api/mobile/admin/notes error:", error);
    return NextResponse.json({ error: "Failed to fetch notes" }, { status: 500 });
  }
}
