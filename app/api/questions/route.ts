import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/unified-auth";
import { connectToDatabase } from "@/lib/mongodb";
import { emitQuestionCreated } from "@/lib/pusher/pusherServer";
import { ANSWER_FORMATS } from "@/lib/question-types";
import Question from "@/models/Question";
import User from "@/models/User";
import type { CreateQuestionPayload, FeedQuestion } from "@/types/question";
import { getPlatformConfig, getHydratedPlans } from "@/models/PlatformConfig";

export async function GET(request: Request) {
  return NextResponse.redirect(new URL("/api/questions/feed", request.url));
}

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);

    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.role !== "STUDENT") {
      return NextResponse.json(
        { error: "Only students can post questions" },
        { status: 403 },
      );
    }

    const body = (await request.json()) as CreateQuestionPayload;

    if (
      typeof body.title !== "string" ||
      body.title.trim().length < 6 ||
      body.title.trim().length > 180
    ) {
      return NextResponse.json(
        { error: "Title must be between 6 and 180 characters" },
        { status: 400 },
      );
    }

    const questionBody = typeof body.body === "string" ? body.body.trim() : "";
    if (
      questionBody.length > 0 &&
      (questionBody.length < 12 || questionBody.length > 5000)
    ) {
      return NextResponse.json(
        { error: "Details must be empty or between 12 and 5000 characters" },
        { status: 400 },
      );
    }

    const requestedAnswerFormat =
      typeof body.answerFormat === "string" ? body.answerFormat : "ANY";

    if (
      !ANSWER_FORMATS.includes(
        requestedAnswerFormat as (typeof ANSWER_FORMATS)[number],
      )
    ) {
      return NextResponse.json(
        { error: "Please choose a valid answer format selection." },
        { status: 400 },
      );
    }

    await connectToDatabase();

    const dbUser = await User.findById(user.id);
    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const config = await getPlatformConfig();
    const plans = getHydratedPlans(config);
    const currentPlan = plans.find((p) => p.slug === dbUser.planSlug) || plans[0];
    const maxQuestions = currentPlan?.maxQuestions ?? 0;
    const bonusQuestions = dbUser.bonusQuestions ?? 0;
    const effectiveLimit =
      maxQuestions > 0 ? maxQuestions + bonusQuestions : maxQuestions;
    const questionsAsked = dbUser.questionsAsked ?? 0;

    // Subscription Check Logic
    const now = new Date();
    const subEnd = dbUser.subscriptionEnd ? new Date(dbUser.subscriptionEnd) : null;
    const isExpired = dbUser.trialUsed && (!subEnd || subEnd < now);

    if (isExpired) {
      if (dbUser.subscriptionStatus !== "EXPIRED") {
        await User.findByIdAndUpdate(dbUser._id, {
          subscriptionStatus: "EXPIRED",
        });
      }
      return NextResponse.json(
        { error: "Subscription expired. Please renew to ask questions." },
        { status: 403 },
      );
    }

    // Check question limit (not applicable for trial being activated)
    if (dbUser.trialUsed && effectiveLimit !== null && effectiveLimit > 0) {
      if (questionsAsked >= effectiveLimit) {
        const remaining = effectiveLimit - questionsAsked;
        return NextResponse.json(
          {
            error: "Question limit reached for your plan.",
            questionsRemaining: Math.max(0, remaining),
            maxQuestions: effectiveLimit,
            planSlug: dbUser.planSlug,
            bonusQuestions: bonusQuestions,
          },
          { status: 403 },
        );
      }
    }

    // Auto-start trial on first question if not used yet and no active sub
    if (!dbUser.trialUsed && dbUser.subscriptionStatus !== "ACTIVE") {
      const trialDays = config.trialDays;
      const trialEnd = new Date(
        now.getTime() + trialDays * 24 * 60 * 60 * 1000,
      );
      await User.findByIdAndUpdate(dbUser._id, {
        trialUsed: true,
        subscriptionStatus: "ACTIVE",
        subscriptionEnd: trialEnd,
        planSlug: "free",
        questionsAsked: 0,
      });
    }

    const question = await Question.create({
      askerId: user.id,
      title: body.title.trim(),
      body: questionBody,
      images: Array.isArray(body.images) ? body.images : [],
      answerFormat: requestedAnswerFormat,
      answerVisibility: body.answerVisibility || "PUBLIC",
      subject: body.subject?.trim() || undefined,
      stream: body.stream?.trim() || undefined,
      level: body.level?.trim() || undefined,
    });

    // Increment the user's totalAsked counter and questionsAsked
    await User.findByIdAndUpdate(user.id, {
      $inc: { totalAsked: 1, questionsAsked: 1 },
    });

    // Build the FeedQuestion shape to broadcast + return
    const feedQuestion: FeedQuestion = {
      id: question._id.toString(),
      askerId: user.id,
      askerName: user.name || "Anonymous",
      askerUsername: dbUser.username || undefined,
      title: question.title,
      body: question.body,
      images: question.images || [],
      answerFormat: question.answerFormat,
      answerVisibility: question.answerVisibility,
      status: question.status,
      subject: question.subject || undefined,
      stream: question.stream || undefined,
      level: question.level || undefined,
      resetCount: question.resetCount,
      reactions: [],
      answerCount: 0,
      reactionCount: 0,
      commentCount: 0,
      createdAt: question.createdAt.toISOString(),
      updatedAt: question.updatedAt.toISOString(),
    };

    // Broadcast to all connected clients via Pusher
    await emitQuestionCreated(feedQuestion).catch(() => {
      // Pusher broadcast failure is non-fatal
    });

    return NextResponse.json(feedQuestion, { status: 201 });
  } catch (error) {
    console.error("[POST /api/questions]", error);
    return NextResponse.json(
      { error: "Failed to create question" },
      { status: 500 },
    );
  }
}
