import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import mongoose from "mongoose";
import Question from "@/models/Question";
import Answer from "@/models/Answer";
import { getPublicUserByUsername } from "@/lib/user-directory";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get("username");
    const offset = parseInt(searchParams.get("offset") || "0");
    const limit = parseInt(searchParams.get("limit") || "10");

    if (!username) {
      return NextResponse.json(
        { error: "Username is required" },
        { status: 400 }
      );
    }

    const profile = await getPublicUserByUsername(username);
    if (!profile) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    await connectToDatabase();

    const isStudent = profile.role === "STUDENT";
    const userId = new mongoose.Types.ObjectId(profile.id);

    const questions = await Question.find({
      [isStudent ? "askerId" : "acceptedById"]: userId,
    })
      .populate({ path: "answerId", model: Answer })
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .lean();

    const formattedQuestions = questions.map((q: any) => ({
      _id: q._id.toString(),
      title: q.title,
      body: q.body,
      status: q.status,
      createdAt: q.createdAt.toString(),
      answerId: q.answerId
        ? {
            content: q.answerId.content,
            mediaUrls: q.answerId.mediaUrls,
          }
        : null,
    }));

    return NextResponse.json({
      questions: formattedQuestions,
      hasMore: questions.length === limit,
    });
  } catch (error) {
    console.error("[GET /api/profile-questions]", error);
    return NextResponse.json(
      { error: "Failed to fetch profile questions" },
      { status: 500 }
    );
  }
}