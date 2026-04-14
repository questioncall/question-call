import { NextRequest, NextResponse } from "next/server";
import { getSafeServerSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import mongoose from "mongoose";
import Question from "@/models/Question";
import Course from "@/models/Course";
import User from "@/models/User";

function createFlexibleRegex(query: string): RegExp {
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const words = query.split(/\s+/).filter(w => w.length > 0);
  if (words.length === 1) {
    return new RegExp(escaped, "i");
  }
  const pattern = words.map(w => `(?=.*${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`).join("");
  return new RegExp(pattern, "i");
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSafeServerSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q")?.trim() || "";

    if (query.length < 2) {
      return NextResponse.json({ questions: [], courses: [], users: [] });
    }

    await connectToDatabase();

    const queryRegex = createFlexibleRegex(query);
    const limit = 8;

    const questions = await Question.find(
      {
        $or: [
          { title: queryRegex },
          { body: queryRegex },
          { subject: queryRegex },
        ]
      },
      { title: 1, body: 1, status: 1, subject: 1, level: 1, createdAt: 1 }
    )
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const courses = await Course.find(
      {
        $or: [
          { title: queryRegex },
          { description: queryRegex },
          { subject: queryRegex },
          { tags: queryRegex },
        ]
      },
      { title: 1, slug: 1, subject: 1, thumbnailUrl: 1, pricingModel: 1, level: 1 }
    )
      .sort({ enrollmentCount: -1 })
      .limit(limit)
      .lean();

    const users = await User.find(
      {
        $or: [
          { name: queryRegex },
          { username: queryRegex },
        ]
      },
      { name: 1, username: 1, userImage: 1, role: 1 }
    )
      .sort({ points: -1 })
      .limit(limit)
      .lean();

    const formattedQuestions = questions.map((q) => ({
      id: q._id.toString(),
      title: q.title?.slice(0, 100) || "",
      body: q.body?.slice(0, 80) || "",
      subject: q.subject,
      level: q.level,
      createdAt: q.createdAt,
    }));

    const formattedCourses = courses.map((c) => ({
      id: c._id.toString(),
      title: c.title,
      slug: c.slug,
      subject: c.subject,
      thumbnailUrl: c.thumbnailUrl,
      pricingModel: c.pricingModel,
      level: c.level,
    }));

    const formattedUsers = users.map((u) => ({
      id: u._id.toString(),
      name: u.name,
      username: u.username,
      userImage: u.userImage,
      role: u.role,
    }));

    return NextResponse.json({
      questions: formattedQuestions,
      courses: formattedCourses,
      users: formattedUsers,
    });
  } catch (error) {
    console.error("Search API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}