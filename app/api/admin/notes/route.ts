import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Note from "@/models/Note";
import { getAuthenticatedUser } from "@/lib/unified-auth";

/**
 * GET /api/admin/notes
 * Admin-only: lists all notes (public + private) with optional filters.
 * Query: ?search=&subject=&grade=&fileType=&visibility=&cursor=&limit=
 */
export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user?.id || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const search     = url.searchParams.get("search") || "";
  const subject    = url.searchParams.get("subject") || "";
  const grade      = url.searchParams.get("grade") || "";
  const fileType   = url.searchParams.get("fileType") || "";
  const visibility = url.searchParams.get("visibility") || "";
  const cursor     = url.searchParams.get("cursor") || "";
  const limit      = Math.min(Math.max(1, parseInt(url.searchParams.get("limit") || "50", 10)), 100);

  await connectToDatabase();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query: Record<string, any> = {};
  if (search)     query.$text      = { $search: search };
  if (subject)    query.subject    = { $regex: subject, $options: "i" };
  if (grade)      query.grade      = { $regex: grade, $options: "i" };
  if (fileType)   query.fileType   = fileType;
  if (visibility) query.visibility = visibility;
  if (cursor)     query._id        = { $lt: cursor };

  const notes = await Note.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate("uploaderId", "name username userImage role")
    .lean();

  const serialized = notes.map((note) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const u = note.uploaderId as any;
    return {
      id:              String(note._id),
      title:           note.title,
      description:     note.description || "",
      subject:         note.subject,
      grade:           note.grade,
      fileType:        note.fileType,
      fileUrl:         note.fileUrl || null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      visibility:      (note as any).visibility || "public",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      price:           (note as any).price || 0,
      uploaderId:      u?._id ? String(u._id) : null,
      uploaderName:    u?.name || "Unknown",
      uploaderUsername:u?.username || null,
      uploaderImage:   u?.userImage || null,
      uploaderRole:    u?.role || null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      createdAt:       (note as any).createdAt?.toISOString?.() || new Date().toISOString(),
    };
  });

  return NextResponse.json(serialized);
}
