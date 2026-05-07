"use server";

import { revalidatePath } from "next/cache";
import { connectToDatabase } from "@/lib/mongodb";
import Question from "@/models/Question";
import User from "@/models/User";
import { getSafeServerSession } from "@/lib/auth";

export async function getQuestionsAction(searchQuery: string = "", usernameQuery: string = "") {
  await connectToDatabase();
  const session = await getSafeServerSession();
  
  if (session?.user?.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }

  const filter: any = {};
  
  if (searchQuery) {
    filter.title = { $regex: searchQuery, $options: "i" };
  }

  if (usernameQuery) {
    const users = await User.find({ username: { $regex: usernameQuery, $options: "i" } }).select("_id");
    if (users.length > 0) {
      filter.askerId = { $in: users.map(u => u._id) };
    } else {
      return []; // Return empty if user filter doesn't match any user
    }
  }

  const questions = await Question.find(filter)
    .populate("askerId", "name username image")
    .sort({ createdAt: -1 })
    .lean();

  return JSON.parse(JSON.stringify(questions));
}

export async function deleteQuestionAction(questionId: string) {
  await connectToDatabase();
  const session = await getSafeServerSession();
  
  if (session?.user?.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }

  await Question.findByIdAndDelete(questionId);
  revalidatePath("/admin/questions");
  
  return { success: true };
}
