"use server";

import { revalidatePath } from "next/cache";
import { connectToDatabase } from "@/lib/mongodb";
import Note from "@/models/Note";
import { getSafeServerSession } from "@/lib/auth";

async function requireAdmin() {
  const session = await getSafeServerSession();
  if (session?.user?.role !== "ADMIN") throw new Error("Unauthorized");
  return session;
}

export async function getAdminNotesAction(
  search = "",
  subject = "",
  grade = "",
  fileType = "",
  visibility = "",
) {
  await requireAdmin();
  await connectToDatabase();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query: Record<string, any> = {};
  if (search)     query.$text      = { $search: search };
  if (subject)    query.subject    = { $regex: subject, $options: "i" };
  if (grade)      query.grade      = { $regex: grade, $options: "i" };
  if (fileType)   query.fileType   = fileType;
  if (visibility) query.visibility = visibility;

  const notes = await Note.find(query)
    .sort({ createdAt: -1 })
    .limit(200)
    .populate("uploaderId", "name username userImage role")
    .lean();

  return JSON.parse(JSON.stringify(notes));
}

export async function deleteAdminNoteAction(noteId: string) {
  await requireAdmin();
  await connectToDatabase();
  await Note.findByIdAndDelete(noteId);
  revalidatePath("/admin/notes");
  return { success: true };
}
