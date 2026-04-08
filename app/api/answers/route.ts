import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { pusherServer } from "@/lib/pusher/pusherServer";
import { ANSWER_SUBMITTED_EVENT, getChannelPusherName } from "@/lib/pusher/events";
import Answer from "@/models/Answer";
import Channel from "@/models/Channel";
import Message from "@/models/Message";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { channelId } = await req.json();

    if (!channelId) {
      return NextResponse.json({ error: "Missing channelId" }, { status: 400 });
    }

    await connectToDatabase();

    // Verify channel and access
    const channel = await Channel.findById(channelId).populate("questionId");
    if (!channel) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    }

    if (channel.status !== "ACTIVE") {
      return NextResponse.json({ error: "Channel is not active" }, { status: 400 });
    }

    if (channel.acceptorId.toString() !== session.user.id) {
      return NextResponse.json(
        { error: "Only the acceptor (teacher) can submit an answer" },
        { status: 403 }
      );
    }

    // Check if answer already submitted
    const existingAnswer = await Answer.findOne({ channelId });
    if (existingAnswer) {
      return NextResponse.json({ error: "Answer already submitted" }, { status: 400 });
    }

    // Collect ONLY marked messages to form the Answer content
    const messages = await Message.find({ 
      channelId, 
      senderId: session.user.id,
      isMarkedAsAnswer: true
    }).sort({ sentAt: 1 });
    
    if (messages.length === 0) {
      return NextResponse.json({ error: "Please mark at least one message as the answer before submitting." }, { status: 400 });
    }

    const question = channel.questionId as any;
    const requiredFormat = question.answerFormat; // TEXT | PHOTO | VIDEO | ANY

    // Analyze what the teacher actually marked
    const hasText = messages.some((m) => m.content && m.content.trim().length > 0);
    const hasImage = messages.some((m) => m.mediaType === "IMAGE");
    const hasVideo = messages.some((m) => m.mediaType === "VIDEO");

    // ─── Strict format validation ────────────────────────────
    if (requiredFormat === "TEXT") {
      if (!hasText) {
        return NextResponse.json(
          { error: "This question requires a text answer. Please mark at least one text message as the answer." },
          { status: 400 }
        );
      }
    } else if (requiredFormat === "PHOTO") {
      if (!hasImage) {
        return NextResponse.json(
          { error: "This question requires a photo answer. Please mark at least one image message as part of the answer." },
          { status: 400 }
        );
      }
    } else if (requiredFormat === "VIDEO") {
      if (!hasVideo) {
        return NextResponse.json(
          { error: "This question requires a video answer. Please mark at least one video message as part of the answer." },
          { status: 400 }
        );
      }
    }
    // ANY → no constraint, teacher can answer in any format

    // Determine the actual format used (stored on the Answer for display)
    let resolvedFormat = requiredFormat;
    if (requiredFormat === "ANY") {
      if (hasVideo) resolvedFormat = "VIDEO";
      else if (hasImage) resolvedFormat = "PHOTO";
      else resolvedFormat = "TEXT";
    }

    const content = messages.map((m) => m.content).filter(Boolean).join("\n\n");
    const mediaUrls = messages.map((m) => m.mediaUrl).filter(Boolean);

    // Based on the question, map the visibility
    const isPublic = channel.questionId.answerVisibility === "PUBLIC";

    // Create the Answer
    const answer = await Answer.create({
      questionId: channel.questionId._id,
      channelId,
      acceptorId: session.user.id,
      answerFormat: resolvedFormat,
      content,
      mediaUrls,
      isPublic,
      submittedAt: new Date(),
    });

    // Notify the asker perfectly in real-time
    if (pusherServer) {
      await pusherServer.trigger(
        getChannelPusherName(channelId),
        ANSWER_SUBMITTED_EVENT,
        {
          answerId: answer._id.toString(),
          submittedAt: answer.submittedAt,
        }
      );
    }

    return NextResponse.json(answer);
  } catch (error) {
    console.error("[POST /api/answers]", error);
    return NextResponse.json(
      { error: "Failed to submit answer" },
      { status: 500 }
    );
  }
}
