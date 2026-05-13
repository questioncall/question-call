import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Note, { NOTE_FILE_TYPES } from "@/models/Note";
import User from "@/models/User";
import { getAuthenticatedUser } from "@/lib/unified-auth";

/**
 * GET /api/notes — list notes with optional filters
 * Query params: ?subject=Physics&grade=Grade+11&limit=20&cursor=<id>&uploaderOnly=true
 */
export async function GET(request: Request) {
  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const subject = url.searchParams.get("subject");
    const grade = url.searchParams.get("grade");
    const cursor = url.searchParams.get("cursor");
    const uploaderOnly = url.searchParams.get("uploaderOnly") === "true";
    const limit = Math.min(
      Math.max(1, parseInt(url.searchParams.get("limit") || "20", 10)),
      50
    );

    await connectToDatabase();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: Record<string, any> = {};

    if (subject) {
      query.subject = subject;
    }

    if (grade) {
      query.grade = grade;
    }

    if (uploaderOnly) {
      query.uploaderId = authUser.id;
    }

    if (cursor) {
      query._id = { $lt: cursor };
    }

    const notes = await Note.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("uploaderId", "name username userImage")
      .lean();

    const serialized = notes.map((note) => {
      const uploader = note.uploaderId as unknown as {
        _id: string;
        name?: string;
        username?: string;
        userImage?: string;
      } | null;

      return {
        id: String(note._id),
        title: note.title,
        description: note.description || "",
        subject: note.subject,
        grade: note.grade,
        fileType: note.fileType,
        fileUrl: note.fileUrl || null,
        uploaderId: uploader?._id ? String(uploader._id) : null,
        uploaderName: uploader?.name || "Unknown",
        uploaderUsername: uploader?.username || null,
        uploaderImage: uploader?.userImage || null,
        createdAt: (note as any).createdAt?.toISOString?.() || new Date().toISOString(),
        updatedAt: (note as any).updatedAt?.toISOString?.() || new Date().toISOString(),
      };
    });

    return NextResponse.json(serialized);
  } catch (error) {
    console.error("[GET /api/notes]", error);
    return NextResponse.json(
      { error: "Failed to fetch notes." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/notes — create a new note
 * Body: { title, description?, subject, grade, fileType, fileUrl? }
 */
export async function POST(request: Request) {
  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { title, description, subject, grade, fileType, fileUrl } = body;

    if (!title?.trim()) {
      return NextResponse.json({ error: "Title is required." }, { status: 400 });
    }

    if (!subject?.trim()) {
      return NextResponse.json({ error: "Subject is required." }, { status: 400 });
    }

    if (!grade?.trim()) {
      return NextResponse.json({ error: "Grade is required." }, { status: 400 });
    }

    if (!fileType || !NOTE_FILE_TYPES.includes(fileType)) {
      return NextResponse.json(
        { error: `Invalid file type. Must be one of: ${NOTE_FILE_TYPES.join(", ")}` },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const user = await User.findById(authUser.id).select("name username userImage");
    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const note = await Note.create({
      title: title.trim(),
      description: description?.trim() || "",
      subject: subject.trim(),
      grade: grade.trim(),
      fileType,
      fileUrl: fileUrl || null,
      uploaderId: authUser.id,
    });

    return NextResponse.json(
      {
        id: String(note._id),
        title: note.title,
        description: note.description || "",
        subject: note.subject,
        grade: note.grade,
        fileType: note.fileType,
        fileUrl: note.fileUrl || null,
        uploaderId: authUser.id,
        uploaderName: user.name || "Unknown",
        uploaderUsername: user.username || null,
        uploaderImage: user.userImage || null,
        createdAt: note.createdAt?.toISOString?.() || new Date().toISOString(),
        updatedAt: note.updatedAt?.toISOString?.() || new Date().toISOString(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/notes]", error);
    return NextResponse.json(
      { error: "Failed to create note." },
      { status: 500 }
    );
  }
}
