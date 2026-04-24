import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { emitQuestionCreated } from "@/lib/pusher/pusherServer";
import { ANSWER_FORMATS } from "@/lib/question-types";
import Question from "@/models/Question";
import User from "@/models/User";
import type { CreateQuestionPayload, FeedQuestion } from "@/types/question";
import { getPlatformConfig, getHydratedPlans } from "@/models/PlatformConfig";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "STUDENT") {
      return NextResponse.json(
        { error: "Only students can post questions" },
        { status: 403 },
      );
    }

    const body = (await request.json()) as CreateQuestionPayload;

    if (typeof body.title !== "string" || body.title.trim().length < 6 || body.title.trim().length > 180) {
      return NextResponse.json(
        { error: "Title must be between 6 and 180 characters" },
        { status: 400 },
      );
    }

    const questionBody = typeof body.body === "string" ? body.body.trim() : "";
    if (questionBody.length > 0 && (questionBody.length < 12 || questionBody.length > 5000)) {
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

    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const config = await getPlatformConfig();
    const plans = getHydratedPlans(config);
    const currentPlan = plans.find(p => p.slug === user.planSlug) || plans[0];
    const maxQuestions = currentPlan?.maxQuestions ?? 0;
    const bonusQuestions = user.bonusQuestions ?? 0;
    const effectiveLimit = maxQuestions > 0 ? maxQuestions + bonusQuestions : maxQuestions;
    const questionsAsked = user.questionsAsked ?? 0;

    // Subscription Check Logic
    const now = new Date();
    const subEnd = user.subscriptionEnd ? new Date(user.subscriptionEnd) : null;
    const isExpired = user.trialUsed && (!subEnd || subEnd < now);
    
    if (isExpired) {
      if (user.subscriptionStatus !== "EXPIRED") {
        await User.findByIdAndUpdate(user._id, { subscriptionStatus: "EXPIRED" });
      }
      return NextResponse.json(
        { error: "Subscription expired. Please renew to ask questions." },
        { status: 403 },
      );
    }
    
    // Check question limit (not applicable for trial being activated)
    if (user.trialUsed && effectiveLimit !== null && effectiveLimit > 0) {
      if (questionsAsked >= effectiveLimit) {
        const remaining = effectiveLimit - questionsAsked;
        return NextResponse.json(
          { 
            error: "Question limit reached for your plan.",
            questionsRemaining: Math.max(0, remaining),
            maxQuestions: effectiveLimit,
            planSlug: user.planSlug,
            bonusQuestions: bonusQuestions,
          },
          { status: 403 },
        );
      }
    }
    
    // Auto-start trial on first question if not used yet and no active sub
    if (!user.trialUsed && user.subscriptionStatus !== "ACTIVE") {
      const trialDays = config.trialDays;
      const trialEnd = new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000);
      await User.findByIdAndUpdate(user._id, {
        trialUsed: true,
        subscriptionStatus: "ACTIVE",
        subscriptionEnd: trialEnd,
        planSlug: "free",
        questionsAsked: 0,
      });
    }

    const question = await Question.create({
      askerId: session.user.id,
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
    await User.findByIdAndUpdate(session.user.id, { 
      $inc: { totalAsked: 1, questionsAsked: 1 } 
    });

    // Build the FeedQuestion shape to broadcast + return
    const feedQuestion: FeedQuestion = {
      id: question._id.toString(),
      askerId: session.user.id,
      askerName: session.user.name || "Anonymous",
      askerUsername: session.user.username || undefined,
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
