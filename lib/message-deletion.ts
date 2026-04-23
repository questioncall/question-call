import type { ChatMessage } from "@/types/channel";

type StoredMessageLike = {
  senderId: { toString(): string } | string;
  isSystemMessage?: boolean | null;
  callMetadata?: unknown;
  isDeleted?: boolean | null;
};

export function canDeleteStoredMessage(
  message: StoredMessageLike,
  userId: string,
) {
  const senderId =
    typeof message.senderId === "string"
      ? message.senderId
      : message.senderId.toString();

  return (
    senderId === userId &&
    !message.isSystemMessage &&
    !message.callMetadata &&
    !message.isDeleted
  );
}

export function canDeleteChatMessage(message: ChatMessage) {
  return (
    message.isOwn &&
    !message.isSystemMessage &&
    !message.callInfo &&
    !message.isSending &&
    !message.isDeleted
  );
}
