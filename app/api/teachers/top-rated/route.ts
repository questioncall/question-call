import { NextResponse } from "next/server";

import { connectToDatabase } from "@/lib/mongodb";
import { getUserHandle } from "@/lib/user-paths";
import User from "@/models/User";

export const dynamic = "force-dynamic";

type TopTeacherRecord = {
  _id: { toString(): string };
  name?: string;
  email?: string;
  username?: string | null;
  userImage?: string;
  overallScore?: number;
  totalAnswered?: number;
  teacherModeVerified?: boolean;
};

export async function GET() {
  try {
    await connectToDatabase();

    const teachers = (await User.find({
      role: "TEACHER",
      isSuspended: { $ne: true },
    })
      .select("name email username userImage overallScore totalAnswered teacherModeVerified")
      .sort({
        teacherModeVerified: -1,
        overallScore: -1,
        totalAnswered: -1,
      })
      .limit(6)
      .lean()) as TopTeacherRecord[];

    return NextResponse.json(
      teachers.map((teacher) => {
        const id = teacher._id.toString();

        return {
          id,
          name: teacher.name || "Teacher",
          username: getUserHandle({
            id,
            name: teacher.name,
            email: teacher.email,
            username: teacher.username,
          }),
          userImage: teacher.userImage || undefined,
          overallScore: teacher.overallScore ?? 0,
          totalAnswered: teacher.totalAnswered ?? 0,
          teacherModeVerified: teacher.teacherModeVerified ?? false,
        };
      }),
    );
  } catch (error) {
    console.error("[GET /api/teachers/top-rated]", error);
    return NextResponse.json(
      { error: "Failed to fetch top rated teachers" },
      { status: 500 },
    );
  }
}
