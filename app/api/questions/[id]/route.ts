import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import mongoose from "mongoose";

import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import Question from "@/models/Question";
import Answer from "@/models/Answer";
import User from "@/models/User";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid question ID" }, { status: 400 });
    }

    await connectToDatabase();

    const question = await Question.findById(id);

    if (!question) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

    if (question.askerId.toString() !== session.user.id) {
      return NextResponse.json(
        { error: "You can only delete your own questions" },
        { status: 403 }
      );
    }

    if (question.answerId) {
      await Answer.findByIdAndDelete(question.answerId);
    }

    await Question.findByIdAndDelete(id);

    await User.findByIdAndUpdate(session.user.id, {
      $inc: { totalAsked: -1, questionsAsked: -1 },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/questions/[id]]", error);
    return NextResponse.json(
      { error: "Failed to delete question" },
      { status: 500 }
    );
  }
}