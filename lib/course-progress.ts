import { connectToDatabase } from "@/lib/mongodb";
import CourseEnrollment from "@/models/CourseEnrollment";
import VideoProgress from "@/models/VideoProgress";

export function calculateOverallProgressPercent(
  completedVideoCount: number,
  totalVideoCount: number,
) {
  if (totalVideoCount <= 0 || completedVideoCount <= 0) {
    return 0;
  }

  return Math.max(
    0,
    Math.min(100, Math.round((completedVideoCount / totalVideoCount) * 100)),
  );
}

export async function incrementEnrollmentVideoTotals(
  courseId: string,
  totalVideoDelta: number,
) {
  await connectToDatabase();

  const enrollments = await CourseEnrollment.find({ courseId })
    .select("_id completedVideoCount totalVideoCount")
    .lean();

  if (enrollments.length === 0) {
    return;
  }

  await CourseEnrollment.bulkWrite(
    enrollments.map((enrollment) => {
      const totalVideoCount = Math.max(
        0,
        (enrollment.totalVideoCount ?? 0) + totalVideoDelta,
      );

      return {
        updateOne: {
          filter: { _id: enrollment._id },
          update: {
            $set: {
              totalVideoCount,
              overallProgressPercent: calculateOverallProgressPercent(
                enrollment.completedVideoCount ?? 0,
                totalVideoCount,
              ),
            },
          },
        },
      };
    }),
  );
}

export async function applyDeletedVideosToEnrollments(
  courseId: string,
  deletedVideoIds: string[],
) {
  await connectToDatabase();

  if (deletedVideoIds.length === 0) {
    return;
  }

  const [enrollments, completionGroups] = await Promise.all([
    CourseEnrollment.find({ courseId })
      .select("_id completedVideoCount totalVideoCount")
      .lean(),
    VideoProgress.aggregate<{
      _id: unknown;
      completedCount: number;
    }>([
      {
        $match: {
          courseId,
          videoId: { $in: deletedVideoIds },
          isCompleted: true,
        },
      },
      {
        $group: {
          _id: "$enrollmentId",
          completedCount: { $sum: 1 },
        },
      },
    ]),
  ]);

  if (enrollments.length === 0) {
    return;
  }

  const completedByEnrollmentId = new Map(
    completionGroups.map((group) => [String(group._id), group.completedCount]),
  );

  await CourseEnrollment.bulkWrite(
    enrollments.map((enrollment) => {
      const completedReduction =
        completedByEnrollmentId.get(enrollment._id.toString()) ?? 0;
      const completedVideoCount = Math.max(
        0,
        (enrollment.completedVideoCount ?? 0) - completedReduction,
      );
      const totalVideoCount = Math.max(
        0,
        (enrollment.totalVideoCount ?? 0) - deletedVideoIds.length,
      );

      return {
        updateOne: {
          filter: { _id: enrollment._id },
          update: {
            $set: {
              completedVideoCount,
              totalVideoCount,
              overallProgressPercent: calculateOverallProgressPercent(
                completedVideoCount,
                totalVideoCount,
              ),
            },
          },
        },
      };
    }),
  );
}
