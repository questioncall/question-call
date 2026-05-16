import { NextResponse } from "next/server";
import mongoose from "mongoose";

import { getAuthenticatedUser } from "@/lib/unified-auth";
import { connectToDatabase } from "@/lib/mongodb";
import Question from "@/models/Question";
import Answer from "@/models/Answer";
import User from "@/models/User";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authenticatedUser = await getAuthenticatedUser(request);

    if (!authenticatedUser?.id) {
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

    if (question.askerId.toString() !== authenticatedUser.id) {
      return NextResponse.json(
        { error: "You can only delete your own questions" },
        { status: 403 }
      );
    }

    await Question.findByIdAndDelete(id);

    const userToUpdate = await User.findById(authenticatedUser.id);
    if (userToUpdate) {
      userToUpdate.totalAsked = Math.max(0, (userToUpdate.totalAsked ?? 0) - 1);
      userToUpdate.questionsAsked = Math.max(0, (userToUpdate.questionsAsked ?? 0) - 1);
      await userToUpdate.save();
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/questions/[id]]", error);
    return NextResponse.json(
      { error: "Failed to delete question" },
      { status: 500 }
    );
  }
}