import { connectToDatabase } from "@/lib/mongodb";
import Chapter from "@/models/Chapter";
import ChapterContent from "@/models/ChapterContent";
import ChapterEnrollment from "@/models/ChapterEnrollment";
import User from "@/models/User";

async function getChapterAndUser(userId: string, chapterId: string) {
  await connectToDatabase();

  const [chapter, user] = await Promise.all([
    Chapter.findById(chapterId).select("instructorId").lean(),
    User.findById(userId).select("role").lean<{ role?: string } | null>(),
  ]);

  return { chapter, user };
}

export async function checkChapterAccess(
  userId: string,
  chapterId: string,
): Promise<boolean> {
  const { chapter, user } = await getChapterAndUser(userId, chapterId);

  if (!chapter || !user?.role) {
    return false;
  }

  if (user.role === "ADMIN") {
    return true;
  }

  if (chapter.instructorId.toString() === userId) {
    return true;
  }

  const enrollmentExists = await ChapterEnrollment.exists({
    chapterId,
    studentId: userId,
  });

  return Boolean(enrollmentExists);
}

export async function checkChapterManagementAccess(
  userId: string,
  chapterId: string,
): Promise<boolean> {
  const { chapter, user } = await getChapterAndUser(userId, chapterId);

  if (!chapter || !user?.role) {
    return false;
  }

  return user.role === "ADMIN" || chapter.instructorId.toString() === userId;
}

/**
 * Ids of the first N contents (in order) the chapter exposes as free preview.
 * Non-enrolled users may open/watch these. Empty set when no preview configured.
 */
export async function getChapterFreePreviewContentIds(
  chapterId: string,
): Promise<Set<string>> {
  await connectToDatabase();

  const chapter = await Chapter.findById(chapterId)
    .select("freePreviewCount")
    .lean<{ freePreviewCount?: number } | null>();

  const count = chapter?.freePreviewCount ?? 0;
  if (!count || count <= 0) {
    return new Set();
  }

  const contents = await ChapterContent.find({ chapterId })
    .select("_id")
    .sort({ order: 1 })
    .limit(count)
    .lean();

  return new Set(contents.map((content) => content._id.toString()));
}
