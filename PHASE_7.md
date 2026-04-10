# ✅ PHASE 7 — Teacher Points, Wallet & Manual Withdrawal

> **For the developer:** Read every section fully before writing any code. Do not guess field names, do not invent logic. Everything is specified here. Code snippets are provided as the exact pattern to follow.

---

## 📐 Overview of How This Works

Teachers do NOT earn cash directly. They earn **points** per answer. Points convert to NPR at a fixed rate set by admin. When a teacher has enough points, they request a withdrawal. Admin manually sends money via eSewa and then marks the request as completed in the admin panel.

> **Platform values in use:**
> - `1 point = 1 NPR`
> - `Minimum withdrawal = 50 points`
>
> ⚠️ These values are **never hardcoded** anywhere in the app. They are always read from `lib/config.ts` → `platformConfig()`. See Step 7.0b for this file.

```
Teacher answers question
        ↓
Points credited to teacher (based on tier + rating bonus)
        ↓
Teacher wallet shows: 80 pts = 80 NPR (at 1 NPR/pt)
        ↓
Teacher requests withdrawal (min 50 pts)
  → fills eSewa number + amount
        ↓
Admin sees notification → sends money manually via eSewa app
        ↓
Admin marks request as Completed:
  → enters eSewa Transaction ID + amount + date
        ↓
Teacher's points deducted
Transaction saved to DB
Teacher sees it in withdrawal history
```

---

## 🗄️ Step 7.0 — Update `PlatformConfig` Model

**File:** `models/PlatformConfig.ts`

Add these new fields to the existing PlatformConfig schema. Do not remove any existing fields.

```typescript
import mongoose, { Schema, Document } from "mongoose";

export interface IPlatformConfig extends Document {
  // --- Existing tier pricing/time fields (keep as-is) ---
  tier1Price: number;
  tier2Price: number;
  tier3Price: number;
  tier1TimeMinutes: number;
  tier2TimeMinutes: number;
  tier3TimeMinutes: number;
  commissionPercent: number;
  scoreDeductionAmount: number;
  qualificationThreshold: number;
  trialDays: number;

  // --- NEW: Points earning config ---
  pointsPerTier1Answer: number;       // default: 5
  pointsPerTier2Answer: number;       // default: 10
  pointsPerTier3Answer: number;       // default: 20
  bonusPointsFor4Star: number;        // default: 2
  bonusPointsFor5Star: number;        // default: 5
  penaltyPointsForLowRating: number;  // default: 2 (deducted for 1-2 star)

  // --- NEW: Withdrawal config ---
  pointToNprRate: number;             // default: 1 — always read via platformConfig()
  minWithdrawalPoints: number;        // default: 50
  updatedAt: Date;
}

const PlatformConfigSchema = new Schema<IPlatformConfig>({
  tier1Price: { type: Number, default: 0 },
  tier2Price: { type: Number, default: 0 },
  tier3Price: { type: Number, default: 0 },
  tier1TimeMinutes: { type: Number, default: 30 },
  tier2TimeMinutes: { type: Number, default: 60 },
  tier3TimeMinutes: { type: Number, default: 180 },
  commissionPercent: { type: Number, default: 10 },
  scoreDeductionAmount: { type: Number, default: 5 },
  qualificationThreshold: { type: Number, default: 10 },
  trialDays: { type: Number, default: 3 },

  // NEW
  pointsPerTier1Answer: { type: Number, default: 5 },
  pointsPerTier2Answer: { type: Number, default: 10 },
  pointsPerTier3Answer: { type: Number, default: 20 },
  bonusPointsFor4Star: { type: Number, default: 2 },
  bonusPointsFor5Star: { type: Number, default: 5 },
  penaltyPointsForLowRating: { type: Number, default: 2 },
  pointToNprRate: { type: Number, default: 1 },        // 1 point = 1 NPR
  minWithdrawalPoints: { type: Number, default: 50 },   // min 50 points to withdraw
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.models.PlatformConfig ||
  mongoose.model<IPlatformConfig>("PlatformConfig", PlatformConfigSchema);
```

---

## 🔧 Step 7.0b — Create `lib/config.ts` — Single Source of Truth for Platform Values

**File:** `lib/config.ts`

> ⚠️ **This is the most important rule in Phase 7.**
> Every route, helper, and UI component that needs platform values (point rate, min withdrawal, tier points, thresholds) **must** call `platformConfig()` from this file. Never hardcode `1`, `50`, `10`, or any platform number anywhere else in the codebase. If you find yourself writing a raw number for any platform setting, stop and use this function instead.

```typescript
import dbConnect from "@/lib/mongodb";
import PlatformConfig, { IPlatformConfig } from "@/models/PlatformConfig";

/**
 * Fetches the single PlatformConfig document from DB.
 * If none exists yet, creates one with all defaults.
 *
 * Always call this function to read any platform setting.
 * NEVER hardcode values like pointToNprRate or minWithdrawalPoints.
 */
export async function platformConfig(): Promise<IPlatformConfig> {
  await dbConnect();

  let config = await PlatformConfig.findOne();

  if (!config) {
    // First-time setup: create the config document with all defaults
    config = await PlatformConfig.create({});
  }

  return config;
}
```

**How to use it in any API route:**

```typescript
import { platformConfig } from "@/lib/config";

// Inside your route handler:
const config = await platformConfig();

// Now use config fields — never magic numbers:
const rate = config.pointToNprRate;          // 1
const minPoints = config.minWithdrawalPoints; // 50
const threshold = config.qualificationThreshold; // 10
const nprAmount = pointsRequested * config.pointToNprRate;
```

**How to use it in `lib/points.ts` helper:**

```typescript
import { platformConfig } from "@/lib/config";

// If you need config inside a helper (not an API route):
export async function calcTotalPointsEarned(tier: Tier, rating: number) {
  const config = await platformConfig();
  const base = calcBasePoints(tier, config);
  const adjustment = calcRatingAdjustment(rating, config);
  return Math.max(0, base + adjustment);
}
```

> Note: Most of the time you'll already have `config` from calling `platformConfig()` at the top of your route. Pass it into helper functions rather than fetching it again inside them (avoid double DB calls). See Step 7.3 for the correct pattern.

---

## 🗄️ Step 7.1 — Update `User` Model (Teacher Fields)

**File:** `models/User.ts`

Replace the teacher section of the User schema with these fields. The `walletBalance` (NPR) field is removed. Use `pointBalance` instead.

```typescript
// Inside your User schema, teacher-specific fields:
{
  // ... all existing fields (name, email, role, etc.) stay as-is

  // Teacher fields — REPLACE old walletBalance with these:
  pointBalance: { type: Number, default: 0 },       // current redeemable points
  totalAnswered: { type: Number, default: 0 },
  isMonetized: { type: Boolean, default: false },
  overallRatingSum: { type: Number, default: 0 },   // sum of all ratings received
  overallRatingCount: { type: Number, default: 0 }, // count of ratings received
  // overallScore is computed: overallRatingSum / overallRatingCount — do NOT store it separately
}
```

> ⚠️ **Do not store `overallScore` as a field.** Compute it on the fly when displaying:
> `const overallScore = user.overallRatingSum / user.overallRatingCount || 0`

---

## 🗄️ Step 7.2 — Create `WithdrawalRequest` Model

**File:** `models/WithdrawalRequest.ts`

This is a new model. Create this file fresh.

```typescript
import mongoose, { Schema, Document, Types } from "mongoose";

export interface IWithdrawalRequest extends Document {
  teacherId: Types.ObjectId;
  pointsRequested: number;       // how many points teacher wants to withdraw
  nprEquivalent: number;         // pointsRequested × pointToNprRate at time of request
  esewaNumber: string;           // teacher's eSewa phone number
  status: "PENDING" | "COMPLETED" | "REJECTED";

  // Admin fills these when completing:
  transactionId: string | null;  // eSewa transaction ID from admin's eSewa app
  amountSent: number | null;     // actual NPR sent (should match nprEquivalent)
  processedAt: Date | null;
  processedBy: Types.ObjectId | null;  // admin's user ID
  adminNote: string | null;      // e.g. "Sent via eSewa personal account"

  createdAt: Date;
}

const WithdrawalRequestSchema = new Schema<IWithdrawalRequest>(
  {
    teacherId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    pointsRequested: { type: Number, required: true },
    nprEquivalent: { type: Number, required: true },
    esewaNumber: { type: String, required: true },
    status: {
      type: String,
      enum: ["PENDING", "COMPLETED", "REJECTED"],
      default: "PENDING",
    },

    // Admin-filled fields — all nullable until admin processes:
    transactionId: { type: String, default: null },
    amountSent: { type: Number, default: null },
    processedAt: { type: Date, default: null },
    processedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    adminNote: { type: String, default: null },
  },
  { timestamps: true }
);

export default mongoose.models.WithdrawalRequest ||
  mongoose.model<IWithdrawalRequest>("WithdrawalRequest", WithdrawalRequestSchema);
```

---

## 🔧 Step 7.3 — Points Calculation Helper

**File:** `lib/points.ts`

Create this helper file. Every place in the app that needs to award points MUST call these functions. Do not inline point math anywhere else.

```typescript
import { IPlatformConfig } from "@/models/PlatformConfig";

type Tier = "ONE" | "TWO" | "THREE";

/**
 * Calculate base points earned for submitting an answer.
 * Call this when a channel is closed by the asker.
 */
export function calcBasePoints(tier: Tier, config: IPlatformConfig): number {
  if (tier === "ONE") return config.pointsPerTier1Answer;
  if (tier === "TWO") return config.pointsPerTier2Answer;
  if (tier === "THREE") return config.pointsPerTier3Answer;
  return 0;
}

/**
 * Calculate bonus/penalty points based on rating given by student.
 * rating: 1–5
 * Returns a positive number (bonus) or negative number (penalty).
 */
export function calcRatingAdjustment(
  rating: number,
  config: IPlatformConfig
): number {
  if (rating === 5) return config.bonusPointsFor5Star;
  if (rating === 4) return config.bonusPointsFor4Star;
  if (rating <= 2) return -config.penaltyPointsForLowRating;
  return 0; // rating === 3, no adjustment
}

/**
 * Total points earned for one completed answer.
 * Use this as the single source of truth.
 */
export function calcTotalPointsEarned(
  tier: Tier,
  rating: number,
  config: IPlatformConfig
): number {
  const base = calcBasePoints(tier, config);
  const adjustment = calcRatingAdjustment(rating, config);
  // Never go below 0 for a single transaction
  return Math.max(0, base + adjustment);
}

/**
 * Convert points to NPR. Rate is always read from platformConfig() — never hardcoded.
 */
export function pointsToNpr(points: number, config: IPlatformConfig): number {
  return points * config.pointToNprRate;
}
```

---

## 🔧 Step 7.4 — Update Channel Close Logic to Credit Points

**File:** `app/api/channels/[id]/close/route.ts`

When the asker closes the channel, this is where points get credited. Find your existing close route and **add the points logic** inside it. The full route should look like this:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Channel from "@/models/Channel";
import Answer from "@/models/Answer";
import Question from "@/models/Question";
import User from "@/models/User";
import PlatformConfig from "@/models/PlatformConfig";
import Notification from "@/models/Notification";
import { calcTotalPointsEarned } from "@/lib/points";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  await dbConnect();
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const channel = await Channel.findById(params.id);

  if (!channel) {
    return NextResponse.json({ error: "Channel not found" }, { status: 404 });
  }

  // GUARD: Only the asker can close the channel
  if (channel.askerId.toString() !== session.user.id) {
    return NextResponse.json(
      { error: "Only the asker can close this channel" },
      { status: 403 }
    );
  }

  // GUARD: Channel must be ACTIVE
  if (channel.status !== "ACTIVE") {
    return NextResponse.json(
      { error: "Channel is not active" },
      { status: 400 }
    );
  }

  // GUARD: Rating must have been submitted before close is allowed
  if (channel.ratingGiven === null || channel.ratingGiven === undefined) {
    return NextResponse.json(
      { error: "You must rate the answer before closing the channel" },
      { status: 400 }
    );
  }

  // Close the channel
  channel.status = "CLOSED";
  channel.closedAt = new Date();
  channel.isClosedByAsker = true;
  await channel.save();

  // Mark question as SOLVED
  await Question.findByIdAndUpdate(channel.questionId, { status: "SOLVED" });

  // Get the final answer for this channel
  const answer = await Answer.findOne({ channelId: channel._id });

  if (answer) {
    // Save rating onto the answer record
    answer.rating = channel.ratingGiven;
    await answer.save();

    // Handle visibility — if public, mark answer as visible in feed
    if (answer.isPublic) {
      await Question.findByIdAndUpdate(channel.questionId, {
        publicAnswerId: answer._id, // add this field to Question schema if not present
      });
    }
    // If private, it stays in the channel only (asker sees it in their channel/inbox)
  }

  // Credit points to teacher if they are monetized
  const teacher = await User.findById(channel.acceptorId);

  if (teacher && teacher.isMonetized && answer) {
    const config = await PlatformConfig.findOne();

    if (config) {
      const pointsEarned = calcTotalPointsEarned(
        answer.tier,
        channel.ratingGiven,
        config
      );

      // Add points to teacher balance
      teacher.pointBalance = (teacher.pointBalance || 0) + pointsEarned;

      // Update rating stats
      teacher.overallRatingSum = (teacher.overallRatingSum || 0) + channel.ratingGiven;
      teacher.overallRatingCount = (teacher.overallRatingCount || 0) + 1;

      await teacher.save();
    }
  }

  // Notify teacher of channel close + rating
  await Notification.create({
    userId: channel.acceptorId,
    type: "RATING_RECEIVED",
    message: `Your answer was rated ${channel.ratingGiven}/5 and the channel has been closed.`,
    isRead: false,
  });

  return NextResponse.json({ success: true });
}
```

---

## 🔧 Step 7.5 — Track Answer Count & Unlock Monetization

**File:** `app/api/answers/route.ts`

When a teacher submits an answer (`POST /api/answers`), increment `totalAnswered` and check if they've hit the qualification threshold to unlock monetization.

Add this block inside your existing answer submission handler, **after saving the answer**:

```typescript
// After: const savedAnswer = await newAnswer.save();

const config = await PlatformConfig.findOne();
const threshold = config?.qualificationThreshold ?? 10;

// Increment answer count and check monetization unlock
const updatedTeacher = await User.findByIdAndUpdate(
  session.user.id,
  { $inc: { totalAnswered: 1 } },
  { new: true } // return the updated document
);

// Unlock monetization if threshold just reached
if (
  updatedTeacher &&
  !updatedTeacher.isMonetized &&
  updatedTeacher.totalAnswered >= threshold
) {
  await User.findByIdAndUpdate(session.user.id, { isMonetized: true });

  // Notify teacher they are now monetized
  await Notification.create({
    userId: session.user.id,
    type: "CHANNEL_CLOSED", // reuse or add a MONETIZATION_UNLOCKED type
    message: `Congratulations! You've completed ${threshold} answers. You can now earn points for every answer.`,
    isRead: false,
  });
}
```

---

## 🔧 Step 7.6 — Withdrawal Request API

**File:** `app/api/wallet/withdraw/route.ts`

Teacher submits a withdrawal request. This saves the request and notifies the admin.

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import PlatformConfig from "@/models/PlatformConfig";
import WithdrawalRequest from "@/models/WithdrawalRequest";
import Notification from "@/models/Notification";

export async function POST(req: NextRequest) {
  await dbConnect();
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "TEACHER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { pointsRequested, esewaNumber } = await req.json();

  // Validate input
  if (!pointsRequested || !esewaNumber) {
    return NextResponse.json(
      { error: "pointsRequested and esewaNumber are required" },
      { status: 400 }
    );
  }

  const config = await PlatformConfig.findOne();
  const minPoints = config?.minWithdrawalPoints ?? 50;
  const rate = config?.pointToNprRate ?? 1;

  if (pointsRequested < minPoints) {
    return NextResponse.json(
      { error: `Minimum withdrawal is ${minPoints} points` },
      { status: 400 }
    );
  }

  const teacher = await User.findById(session.user.id);

  if (!teacher || teacher.pointBalance < pointsRequested) {
    return NextResponse.json(
      { error: "Insufficient point balance" },
      { status: 400 }
    );
  }

  // Check: no other PENDING request already exists for this teacher
  const existingPending = await WithdrawalRequest.findOne({
    teacherId: session.user.id,
    status: "PENDING",
  });

  if (existingPending) {
    return NextResponse.json(
      { error: "You already have a pending withdrawal request. Wait for it to be processed." },
      { status: 400 }
    );
  }

  const nprEquivalent = pointsRequested * rate;

  // Create the withdrawal request
  const request = await WithdrawalRequest.create({
    teacherId: session.user.id,
    pointsRequested,
    nprEquivalent,
    esewaNumber,
    status: "PENDING",
  });

  // Notify all admins (fetch all admin users and notify each)
  const admins = await User.find({ role: "ADMIN" });
  const adminNotifications = admins.map((admin) => ({
    userId: admin._id,
    type: "PAYMENT",
    message: `Teacher ${teacher.name} has requested a withdrawal of ${pointsRequested} pts (NPR ${nprEquivalent}). eSewa: ${esewaNumber}`,
    isRead: false,
  }));

  if (adminNotifications.length > 0) {
    await Notification.insertMany(adminNotifications);
  }

  return NextResponse.json({ success: true, requestId: request._id });
}
```

---

## 🔧 Step 7.7 — Admin: Get All Withdrawal Requests

**File:** `app/api/admin/withdrawals/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import WithdrawalRequest from "@/models/WithdrawalRequest";

export async function GET(req: NextRequest) {
  await dbConnect();
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status"); // optional filter: PENDING, COMPLETED, REJECTED

  const filter = status ? { status } : {};

  const requests = await WithdrawalRequest.find(filter)
    .populate("teacherId", "name email") // get teacher name + email
    .sort({ createdAt: -1 });

  return NextResponse.json({ requests });
}
```

---

## 🔧 Step 7.8 — Admin: Complete a Withdrawal Request

**File:** `app/api/admin/withdrawals/[id]/complete/route.ts`

Admin calls this AFTER they have physically sent the money via eSewa. This deducts teacher points and saves transaction details.

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import WithdrawalRequest from "@/models/WithdrawalRequest";
import User from "@/models/User";
import Notification from "@/models/Notification";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  await dbConnect();
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { transactionId, amountSent, adminNote } = await req.json();

  if (!transactionId || !amountSent) {
    return NextResponse.json(
      { error: "transactionId and amountSent are required" },
      { status: 400 }
    );
  }

  const withdrawalRequest = await WithdrawalRequest.findById(params.id);

  if (!withdrawalRequest) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }

  if (withdrawalRequest.status !== "PENDING") {
    return NextResponse.json(
      { error: "This request is not in PENDING status" },
      { status: 400 }
    );
  }

  // Deduct points from teacher
  const teacher = await User.findById(withdrawalRequest.teacherId);

  if (!teacher) {
    return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
  }

  if (teacher.pointBalance < withdrawalRequest.pointsRequested) {
    return NextResponse.json(
      { error: "Teacher no longer has enough points (balance may have changed)" },
      { status: 400 }
    );
  }

  teacher.pointBalance -= withdrawalRequest.pointsRequested;
  await teacher.save();

  // Mark request as COMPLETED with admin-filled details
  withdrawalRequest.status = "COMPLETED";
  withdrawalRequest.transactionId = transactionId;
  withdrawalRequest.amountSent = amountSent;
  withdrawalRequest.processedAt = new Date();
  withdrawalRequest.processedBy = session.user.id;
  withdrawalRequest.adminNote = adminNote || null;
  await withdrawalRequest.save();

  // Notify teacher
  await Notification.create({
    userId: withdrawalRequest.teacherId,
    type: "PAYMENT",
    message: `Your withdrawal of NPR ${amountSent} has been processed. eSewa Txn ID: ${transactionId}`,
    isRead: false,
  });

  return NextResponse.json({ success: true });
}
```

---

## 🔧 Step 7.9 — Admin: Reject a Withdrawal Request

**File:** `app/api/admin/withdrawals/[id]/reject/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import WithdrawalRequest from "@/models/WithdrawalRequest";
import Notification from "@/models/Notification";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  await dbConnect();
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { adminNote } = await req.json();

  const withdrawalRequest = await WithdrawalRequest.findById(params.id);

  if (!withdrawalRequest || withdrawalRequest.status !== "PENDING") {
    return NextResponse.json(
      { error: "Request not found or not pending" },
      { status: 404 }
    );
  }

  withdrawalRequest.status = "REJECTED";
  withdrawalRequest.processedAt = new Date();
  withdrawalRequest.processedBy = session.user.id;
  withdrawalRequest.adminNote = adminNote || null;
  await withdrawalRequest.save();

  // Notify teacher — points are NOT deducted on rejection
  await Notification.create({
    userId: withdrawalRequest.teacherId,
    type: "PAYMENT",
    message: `Your withdrawal request of ${withdrawalRequest.pointsRequested} pts was rejected. Reason: ${adminNote || "No reason given."}`,
    isRead: false,
  });

  return NextResponse.json({ success: true });
}
```

---

## 🔧 Step 7.10 — Teacher: View Wallet & Withdrawal History

**File:** `app/api/wallet/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import WithdrawalRequest from "@/models/WithdrawalRequest";
import PlatformConfig from "@/models/PlatformConfig";

export async function GET(req: NextRequest) {
  await dbConnect();
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "TEACHER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const teacher = await User.findById(session.user.id).select(
    "pointBalance totalAnswered isMonetized overallRatingSum overallRatingCount"
  );

  const config = await PlatformConfig.findOne().select(
    "pointToNprRate minWithdrawalPoints qualificationThreshold"
  );

  const withdrawalHistory = await WithdrawalRequest.find({
    teacherId: session.user.id,
  }).sort({ createdAt: -1 });

  const overallScore =
    teacher.overallRatingCount > 0
      ? (teacher.overallRatingSum / teacher.overallRatingCount).toFixed(1)
      : null;

  return NextResponse.json({
    pointBalance: teacher.pointBalance,
    nprEquivalent: teacher.pointBalance * (config?.pointToNprRate ?? 1),
    totalAnswered: teacher.totalAnswered,
    isMonetized: teacher.isMonetized,
    overallScore,
    pointToNprRate: config?.pointToNprRate ?? 1,
    minWithdrawalPoints: config?.minWithdrawalPoints ?? 50,
    qualificationThreshold: config?.qualificationThreshold ?? 10,
    withdrawalHistory,
  });
}
```

---

## 🖥️ Step 7.11 — UI: Teacher Wallet Page

**File:** `app/(teacher)/wallet/page.tsx`

This page should display:

1. **Top summary cards** — point balance, NPR equivalent, overall rating, total answers
2. **Monetization progress bar** — if not yet monetized (e.g. "8/10 answers to unlock earnings")
3. **Withdraw button + form** — only shown if `isMonetized && pointBalance >= minWithdrawalPoints`
4. **Withdrawal history table**

```
┌─────────────────────────────────────────────┐
│  💰 Your Wallet                              │
│                                             │
│  ┌──────────┐ ┌──────────┐ ┌────────────┐  │
│  │ 80 pts   │ │ NPR 80   │ │ ⭐ 4.3/5   │  │
│  │ Balance  │ │ Worth    │ │ Avg Rating │  │
│  └──────────┘ └──────────┘ └────────────┘  │
│                                             │
│  [🔓 You are monetized. Earnings active.]   │
│                                             │
│  ── Withdraw ────────────────────────────   │
│  Points to withdraw: [____]                 │
│  Your eSewa number:  [____]                 │
│  NPR you will receive: 80                   │
│  [Request Withdrawal]                       │
│                                             │
│  ── Withdrawal History ──────────────────   │
│  Date       | Pts | NPR | TxnID  | Status  │
│  2024-01-10 | 50  | 100 | ESW123 | ✅ Done │
│  2024-01-20 | 30  |  60 | -      | ⏳ Pend │
└─────────────────────────────────────────────┘
```

Key UI rules for the developer:
- NPR equivalent shown next to the points field updates live as teacher types the point amount: `nprPreview = pointsTyped * pointToNprRate`
- If teacher has a PENDING withdrawal request already, **hide the withdrawal form** and show: *"You have a pending request. Wait for admin to process it before requesting again."*
- Withdrawal history rows: COMPLETED rows show the eSewa transaction ID. PENDING rows show "Awaiting admin". REJECTED rows show "Rejected" in red.

---

## 🖥️ Step 7.12 — UI: Admin Withdrawal Panel

**File:** `app/(admin)/withdrawals/page.tsx`

This page lists all withdrawal requests. Admin can click a PENDING request to complete or reject it.

```
┌─────────────────────────────────────────────────────────┐
│  💸 Withdrawal Requests                                  │
│  Filter: [All ▼]  [Pending ▼]  [Completed ▼]           │
│                                                         │
│  Teacher     | Pts | NPR  | eSewa       | Status        │
│  ─────────────────────────────────────────────────────  │
│  Ramesh K.   | 50  | 50   | 9801234567  | ⏳ PENDING   │
│    → [✅ Mark Complete] [❌ Reject]                      │
│                                                         │
│  Sunita T.   | 80  | 80   | 9812345678  | ✅ COMPLETED  │
│    TxnID: ESW-123 | Sent: NPR 80 | 2024-01-10          │
└─────────────────────────────────────────────────────────┘
```

When admin clicks **Mark Complete**, show a modal with:
- eSewa Transaction ID (text input, required)
- Amount Sent in NPR (number input, required, pre-filled with nprEquivalent)
- Note (optional)
- [Confirm] button → calls `POST /api/admin/withdrawals/[id]/complete`

When admin clicks **Reject**, show a modal with:
- Reason / Note (text input)
- [Confirm Reject] button → calls `POST /api/admin/withdrawals/[id]/reject`

---

## 📋 New API Routes Summary for Phase 7

| Method | Route | Who calls it | Description |
|--------|-------|-------------|-------------|
| GET | `/api/wallet` | Teacher | Get balance, history, config |
| POST | `/api/wallet/withdraw` | Teacher | Submit withdrawal request |
| GET | `/api/admin/withdrawals` | Admin | List all withdrawal requests |
| POST | `/api/admin/withdrawals/[id]/complete` | Admin | Mark paid, deduct points |
| POST | `/api/admin/withdrawals/[id]/reject` | Admin | Reject request |

---

## ✅ Phase 7 Task Checklist

```
MODELS
[ ] 7.0  Add new point/withdrawal fields to PlatformConfig model
[ ] 7.1  Update User model — replace walletBalance with pointBalance, add rating stats fields
[ ] 7.2  Create WithdrawalRequest model (new file)

HELPERS
[ ] 7.3  Create lib/points.ts with calcBasePoints, calcRatingAdjustment, calcTotalPointsEarned, pointsToNpr

APIS
[ ] 7.4  Update /api/channels/[id]/close — add points credit logic after channel close
[ ] 7.5  Update /api/answers — increment totalAnswered + unlock isMonetized at threshold
[ ] 7.6  Create POST /api/wallet/withdraw
[ ] 7.7  Create GET /api/admin/withdrawals
[ ] 7.8  Create POST /api/admin/withdrawals/[id]/complete
[ ] 7.9  Create POST /api/admin/withdrawals/[id]/reject
[ ] 7.10 Create GET /api/wallet

UI
[ ] 7.11 Build Teacher Wallet page (balance, NPR equivalent, withdraw form, history table)
[ ] 7.12 Build Admin Withdrawals panel (list, complete modal, reject modal)

NOTIFICATIONS
[ ] 7.13 Verify notifications fire at: withdrawal requested (→ admin), completed (→ teacher), rejected (→ teacher), monetization unlocked (→ teacher)
```

---

## ⚠️ Important Rules for the Developer

1. **Never touch point balance directly in a route.** Always use `$inc: { pointBalance: N }` in MongoDB or the helper functions in `lib/points.ts`. Do not do `teacher.pointBalance = teacher.pointBalance + 5` — this causes race conditions.

2. **Never deduct points until admin marks the request as COMPLETED.** On withdrawal *request*, points are only reserved in intent — they stay in the teacher's balance until the admin confirms. The deduction happens in the `/complete` route.

3. **The `pointToNprRate` used in a withdrawal is locked at the time of the request** (`nprEquivalent` field). If admin later changes the rate, it should not affect old pending requests.

4. **Always check for an existing PENDING request** before allowing a new withdrawal request. One pending request per teacher at a time.

5. **Admin panel withdrawal page is protected by ADMIN role middleware.** Do not show it to any other role.

6. **All platform values (`pointToNprRate`, `minWithdrawalPoints`, `qualificationThreshold`, tier point values) must be read from `platformConfig()` in `lib/config.ts`.** The current configured values are `1 point = 1 NPR` and `minimum withdrawal = 50 points`. These are defaults in the DB — not magic numbers in code. If you see a raw number like `1`, `50`, or `10` for any platform setting anywhere in the codebase, that is a bug. Replace it with the appropriate `config.*` field.