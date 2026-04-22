import type { Types } from "mongoose";

import WalletHistoryEvent, {
  type WalletHistoryEventType,
} from "@/models/WalletHistoryEvent";

type RecordWalletHistoryEventInput = {
  userId: Types.ObjectId | string;
  type: WalletHistoryEventType;
  title: string;
  description?: string | null;
  pointsDelta: number;
  occurredAt?: Date;
  metadata?: Record<string, unknown>;
};

export async function recordWalletHistoryEvent(
  input: RecordWalletHistoryEventInput,
) {
  return WalletHistoryEvent.create({
    userId: input.userId,
    type: input.type,
    title: input.title,
    description: input.description?.trim() || null,
    pointsDelta: input.pointsDelta,
    occurredAt: input.occurredAt ?? new Date(),
    metadata: input.metadata,
  });
}
