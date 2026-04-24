type QuizSnapshotStatus = "ACTIVE" | "EXPIRED" | "NONE";
export type StudentSubscriptionStatus = "TRIAL" | "ACTIVE" | "EXPIRED" | "NONE";

type ResolveStudentSubscriptionStateInput = {
  userPlanSlug?: string | null;
  userSubscriptionEnd?: Date | string | null;
  snapshotPlanSlug?: string | null;
  snapshotStatus?: QuizSnapshotStatus | null;
  snapshotEnd?: string | null;
};

function toIsoString(value: Date | string | null | undefined) {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function resolveStudentSubscriptionState(
  input: ResolveStudentSubscriptionStateInput,
) {
  const planSlug = input.userPlanSlug ?? input.snapshotPlanSlug ?? "free";
  const subscriptionEnd = toIsoString(
    input.userSubscriptionEnd ?? input.snapshotEnd,
  );
  const endTime = subscriptionEnd ? new Date(subscriptionEnd).getTime() : null;
  const isActive = endTime !== null && endTime > Date.now();

  if (planSlug === "free") {
    if (input.snapshotStatus === "NONE" && !subscriptionEnd) {
      return {
        planSlug,
        subscriptionEnd: null,
        subscriptionStatus: "NONE" as StudentSubscriptionStatus,
      };
    }

    return {
      planSlug,
      subscriptionEnd,
      subscriptionStatus: (isActive ? "TRIAL" : "EXPIRED") as StudentSubscriptionStatus,
    };
  }

  if (isActive) {
    return {
      planSlug,
      subscriptionEnd,
      subscriptionStatus: "ACTIVE" as StudentSubscriptionStatus,
    };
  }

  if (
    input.snapshotStatus === "NONE" &&
    !input.userPlanSlug &&
    !subscriptionEnd
  ) {
    return {
      planSlug,
      subscriptionEnd: null,
      subscriptionStatus: "NONE" as StudentSubscriptionStatus,
    };
  }

  return {
    planSlug,
    subscriptionEnd,
    subscriptionStatus: "EXPIRED" as StudentSubscriptionStatus,
  };
}
