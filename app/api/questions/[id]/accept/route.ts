import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { emitQuestionUpdated, emitChannelMessage } from "@/lib/pusher/pusherServer";
import Channel from "@/models/Channel";
import Message from "@/models/Message";
import { getPlatformConfig, getTierDurationMinutes } from "@/models/PlatformConfig";
import Question from "@/models/Question";
import User from "@/models/User";
import type { FeedQuestion } from "@/types/question";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;

    await connectToDatabase();

    const question = await Question.findById(id).populate(
      "askerId",
      "name username userImage",
    );

    if (!question) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

    // Cannot accept own question
    if (question.askerId._id.toString() === session.user.id) {
      return NextResponse.json(
        { error: "You cannot accept your own question" },
        { status: 403 },
      );
    }

    // Only OPEN or RESET questions can be accepted
    if (question.status !== "OPEN" && question.status !== "RESET") {
      return NextResponse.json(
        { error: "This question is no longer open for acceptance" },
        { status: 409 },
      );
    }

    // Get platform config for tier time limits
    const config = await getPlatformConfig();
    const tierDurationMinutes = getTierDurationMinutes(config, question.tier);

    const now = new Date();
    const timerDeadline = new Date(now.getTime() + tierDurationMinutes * 60 * 1000);

    // Update question status
    question.status = "ACCEPTED";
    question.acceptedById = session.user.id;
    question.acceptedAt = now;
    await question.save();

    // Create the channel
    const channel = await Channel.create({
      questionId: question._id,
      askerId: question.askerId._id,
      acceptorId: session.user.id,
      openedAt: now,
      timerDeadline,
      status: "ACTIVE",
    });

    // Get acceptor's name for the auto-message
    const acceptor = await User.findById(session.user.id).select("name").lean();
    const acceptorName = (acceptor as { name?: string })?.name || session.user.name || "Someone";

    // Format duration for the message
    const durationText =
      tierDurationMinutes >= 60
        ? `${Math.floor(tierDurationMinutes / 60)} hour${Math.floor(tierDurationMinutes / 60) > 1 ? "s" : ""}`
        : `${tierDurationMinutes} minutes`;

    // Create the auto-message from acceptor
    const autoMessageContent = `Hey there! I accepted your question — the answer will be with you within ${durationText}. 🚀`;
    const autoMessage = await Message.create({
      channelId: channel._id,
      senderId: session.user.id,
      content: autoMessageContent,
      isSystemMessage: true,
      sentAt: now,
    });

    // Broadcast the auto-message via Pusher (non-fatal if fails)
    await emitChannelMessage(channel._id.toString(), {
      id: autoMessage._id.toString(),
      channelId: channel._id.toString(),
      senderId: session.user.id,
      senderName: acceptorName,
      content: autoMessageContent,
      isSystemMessage: true,
      isOwn: false,
      isSeen: false,
      isDelivered: true,
      sentAt: now.toISOString(),
    }).catch(() => {});

    // Build the FeedQuestion shape for broadcast
    const asker = question.askerId as unknown as {
      _id: { toString(): string };
      name?: string;
      username?: string;
      userImage?: string;
    };

    const reactions = Array.isArray(question.reactions) ? question.reactions : [];

    const feedQuestion: FeedQuestion = {
      id: question._id.toString(),
      askerId: asker._id.toString(),
      askerName: asker.name || "Anonymous",
      askerUsername: asker.username || undefined,
      askerImage: asker.userImage || undefined,
      title: question.title,
      body: question.body,
      tier: question.tier,
      answerVisibility: question.answerVisibility,
      status: question.status,
      subject: question.subject || undefined,
      stream: question.stream || undefined,
      level: question.level || undefined,
      resetCount: question.resetCount,
      reactions: reactions.map((r: { userId: { toString(): string }; type: string }) => ({
        userId: r.userId?.toString() || "",
        type: r.type as "like" | "insightful" | "same_doubt",
      })),
      acceptedById: session.user.id,
      acceptedAt: question.acceptedAt!.toISOString(),
      acceptedByName: acceptorName,
      answerCount: 0,
      reactionCount: reactions.length,
      createdAt: question.createdAt.toISOString(),
      updatedAt: question.updatedAt.toISOString(),
    };

    await emitQuestionUpdated(feedQuestion).catch(() => {});

    // Return channelId so the UI can redirect
    return NextResponse.json({
      ...feedQuestion,
      channelId: channel._id.toString(),
      timerDeadline: timerDeadline.toISOString(),
      tierDurationMinutes,
    });
  } catch (error) {
    console.error("[POST /api/questions/[id]/accept]", error);
    return NextResponse.json(
      { error: "Failed to accept question" },
      { status: 500 },
    );
  }
}
