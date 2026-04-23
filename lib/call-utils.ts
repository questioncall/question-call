import type { CallMode, CallStatus } from "@/models/CallSession";

export const CALL_RING_TIMEOUT_MS = 30_000;
export const CALL_STALE_TIMEOUT_MS = 60_000;
export const CALL_PAYLOAD_WARN_BYTES = 8_000;

type IdLike = { toString(): string } | string | null | undefined;

export type CallParticipantIds = {
  teacherId: string;
  studentId: string;
  callerId: string | null;
  calleeId: string | null;
  participantIds: string[];
};

export function normalizeIdLike(value: IdLike) {
  if (!value) {
    return null;
  }

  return typeof value === "string" ? value : value.toString();
}

export function getCallParticipantIds(callSession: {
  teacherId: IdLike;
  studentId: IdLike;
  callerId?: IdLike;
}): CallParticipantIds {
  const teacherId = normalizeIdLike(callSession.teacherId) || "";
  const studentId = normalizeIdLike(callSession.studentId) || "";
  const callerId = normalizeIdLike(callSession.callerId);
  const calleeId =
    callerId === teacherId
      ? studentId
      : callerId === studentId
        ? teacherId
        : null;

  return {
    teacherId,
    studentId,
    callerId,
    calleeId,
    participantIds: [teacherId, studentId].filter(Boolean),
  };
}

export function canIssueCallToken(status: CallStatus) {
  return status === "ACTIVE";
}

export function formatCallDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes < 60) {
    return remainingSeconds > 0
      ? `${minutes}m ${remainingSeconds}s`
      : `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0
    ? `${hours}h ${remainingMinutes}m`
    : `${hours}h`;
}

export function getCallSummaryText({
  mode,
  status,
  durationSeconds,
}: {
  mode: CallMode;
  status: Extract<CallStatus, "ENDED" | "REJECTED" | "MISSED">;
  durationSeconds?: number | null;
}) {
  const modeLabel = mode === "VIDEO" ? "Video" : "Audio";

  if (status === "ENDED") {
    if (typeof durationSeconds === "number" && durationSeconds > 0) {
      return `${modeLabel} call · ${formatCallDuration(durationSeconds)}`;
    }

    return `${modeLabel} call`;
  }

  if (status === "REJECTED") {
    return `${modeLabel} call · Declined`;
  }

  return `${modeLabel} call · Missed`;
}

export function getStaleRingingCutoff(
  now = new Date(),
  staleMs = CALL_STALE_TIMEOUT_MS,
) {
  return new Date(now.getTime() - staleMs);
}
