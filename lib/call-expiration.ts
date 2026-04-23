import { CALL_MISSED_EVENT } from "@/lib/pusher/events";
import {
  emitCallStatusToUser,
  emitChannelMessage,
} from "@/lib/pusher/pusherServer";
import {
  getCallParticipantIds,
  getCallSummaryText,
  getStaleRingingCutoff,
  normalizeIdLike,
} from "@/lib/call-utils";
import { logCallLifecycle } from "@/lib/call-logging";
import CallSession, {
  type CallSessionDocument,
  type CallStatus,
} from "@/models/CallSession";
import Message from "@/models/Message";
import User from "@/models/User";
import type { ChatMessage } from "@/types/channel";

type MissedReason = "caller_timeout" | "callee_timeout" | "server_timeout";

type MarkCallSessionAsMissedOptions = {
  callSession: CallSessionDocument;
  actorUserId?: string | null;
  callerName?: string;
  reason: MissedReason;
};

type MissedTransitionResult = {
  callSessionId: string;
  channelId: string;
  status: CallStatus;
  notifiedUserIds: string[];
  skipped: boolean;
};

async function resolveCallerSnapshot({
  callSession,
  actorUserId,
  callerName,
  reason,
}: Pick<
  MarkCallSessionAsMissedOptions,
  "callSession" | "actorUserId" | "callerName" | "reason"
>) {
  const { teacherId, studentId, callerId: storedCallerId } =
    getCallParticipantIds(callSession);

  let callerId = storedCallerId;

  if (!callerId && actorUserId) {
    if (reason === "callee_timeout") {
      callerId = actorUserId === teacherId ? studentId : teacherId;
    } else {
      callerId = actorUserId;
    }
  }

  let resolvedCallerName = callerName?.trim() || null;

  if (!resolvedCallerName && callerId) {
    const callerUser = await User.findById(callerId)
      .select("name")
      .lean<{ name?: string | null } | null>();
    resolvedCallerName = callerUser?.name?.trim() || null;
  }

  return {
    callerId: callerId || normalizeIdLike(callSession.callerId) || teacherId,
    callerName: resolvedCallerName || "Unknown",
  };
}

export async function markCallSessionAsMissed({
  callSession,
  actorUserId = null,
  callerName,
  reason,
}: MarkCallSessionAsMissedOptions): Promise<MissedTransitionResult> {
  const { participantIds } = getCallParticipantIds(callSession);
  const callSessionId = callSession._id.toString();
  const channelId = callSession.channelId.toString();

  if (callSession.status === "MISSED") {
    return {
      callSessionId,
      channelId,
      status: "MISSED",
      notifiedUserIds: [],
      skipped: true,
    };
  }

  if (callSession.status !== "RINGING") {
    return {
      callSessionId,
      channelId,
      status: callSession.status,
      notifiedUserIds: [],
      skipped: true,
    };
  }

  const callerSnapshot = await resolveCallerSnapshot({
    callSession,
    actorUserId,
    callerName,
    reason,
  });

  callSession.status = "MISSED";
  callSession.endedAt = new Date();
  await callSession.save();

  const notifiedUserIds = actorUserId
    ? participantIds.filter((participantId) => participantId !== actorUserId)
    : participantIds;

  const payload = {
    callSessionId,
    channelId,
    missedBy: actorUserId,
    reason,
  };

  await Promise.allSettled(
    notifiedUserIds.map((targetUserId) =>
      emitCallStatusToUser(targetUserId, CALL_MISSED_EVENT, payload),
    ),
  );

  const contentText = getCallSummaryText({
    mode: callSession.mode,
    status: "MISSED",
  });
  const messageSenderId = callerSnapshot.callerId || actorUserId || participantIds[0];

  const systemMsg = await Message.create({
    channelId,
    senderId: messageSenderId,
    content: contentText,
    isSystemMessage: true,
    callMetadata: {
      callSessionId,
      mode: callSession.mode,
      status: "MISSED",
      durationSeconds: null,
      callerName: callerSnapshot.callerName,
      callerId: callerSnapshot.callerId,
    },
    sentAt: new Date(),
  });

  const chatMessage: ChatMessage = {
    id: systemMsg._id.toString(),
    channelId,
    senderId: messageSenderId,
    senderName: callerSnapshot.callerName,
    content: contentText,
    mediaUrl: null,
    mediaType: null,
    isSystemMessage: true,
    isOwn: false,
    isSeen: false,
    isDelivered: true,
    sentAt: systemMsg.sentAt.toISOString(),
    callInfo: {
      callSessionId,
      mode: callSession.mode,
      status: "MISSED",
      durationSeconds: null,
      callerName: callerSnapshot.callerName,
      callerId: callerSnapshot.callerId,
    },
  };

  await emitChannelMessage(channelId, chatMessage).catch(console.error);

  logCallLifecycle("missed", {
    callSessionId,
    channelId,
    actorUserId,
    callerId: callerSnapshot.callerId,
    reason,
    notifiedUserIds,
  });

  return {
    callSessionId,
    channelId,
    status: "MISSED",
    notifiedUserIds,
    skipped: false,
  };
}

export async function processExpiredRingingCalls({
  staleMs,
  limit = 100,
}: {
  staleMs?: number;
  limit?: number;
} = {}) {
  const now = new Date();
  const cutoff = getStaleRingingCutoff(now, staleMs);
  const staleCalls = await CallSession.find({
    status: "RINGING",
    updatedAt: { $lte: cutoff },
  })
    .sort({ updatedAt: 1 })
    .limit(limit);

  let missedCount = 0;
  let skippedCount = 0;

  for (const callSession of staleCalls) {
    const result = await markCallSessionAsMissed({
      callSession,
      reason: "server_timeout",
    });

    if (result.skipped) {
      skippedCount += 1;
    } else {
      missedCount += 1;
    }
  }

  logCallLifecycle("cron_expire_ringing", {
    staleCount: staleCalls.length,
    missedCount,
    skippedCount,
    cutoff: cutoff.toISOString(),
  });

  return {
    cutoff: cutoff.toISOString(),
    staleCount: staleCalls.length,
    missedCount,
    skippedCount,
    processedCount: staleCalls.length,
  };
}
