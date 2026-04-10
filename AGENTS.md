# 📚 EduAsk — 2-Portal Q&A Platform

> A Next.js-based academic Q&A platform connecting students with teachers through a structured, tiered answering system with real-time communication, payments via Khalti/eSewa, and gamified engagement.

---

## 🚨 IMPORTANT ARCHITECTURE NOTE

> **CRITICAL RULE:** Everywhere in the application, configuration data MUST be fetched from the database using `getPlatformConfig()` (from `models/PlatformConfig.ts`).
> 
> Absolutely **NO direct imports** of values from `lib/config.ts` are allowed for app logic. The `lib/config.ts` file acts purely as the initial **seed data** for the database document on first boot. All tunables—pricing, format limits, trial days, point rates, and qualification thresholds—are dynamic and cached via the DB layer.

---

## 🗂️ Table of Contents

1. [Project Overview](#project-overview)
2. [Portals](#portals)
3. [Core Concepts](#core-concepts)
4. [User Flows](#user-flows)
5. [Feature Breakdown](#feature-breakdown)
6. [Payment & Monetization](#payment--monetization)
7. [Tech Stack](#tech-stack)
8. [Folder Structure](#folder-structure)
9. [Database Schema (MongoDB)](#database-schema-mongodb)
10. [API Routes Overview](#api-routes-overview)
11. [Admin Config](#admin-config)
12. [Step-by-Step Development Tasks](#step-by-step-development-tasks)

---

## Project Overview

EduAsk is a dual-portal web platform where **students** ask academic questions and **teachers** (or other students) solve them. Questions can be assigned a tier (Text / Photo / Video), and answers can be set as public or private by the asker. Teachers earn money per answer; students earn discount points by answering peers.

---

## Portals

### Portal 1 — Student
| # | Feature |
|---|---------|
| i | Login / Register as Student |
| ii | Ask questions (3-day trial or monthly subscription) |
| iii | Answer other students' questions (AI-checked → earn points) |
| iv | Choose tier for answer: Tier I / II / III (or leave unset) |
| v | Choose if the **answer** is public or private |
| vi | Rate teacher's solution (1–5 stars) before closing channel |
| vii | Close the channel (irreversible, only after time limit + rating done) |
| viii | Pay via Khalti or eSewa |
| ix | View inbox for private answers |
| x | Leaderboard / competition via question + answer counts |

### Portal 2 — Teacher
| # | Feature |
|---|---------|
| i | Login / Register as Teacher |
| ii | Browse open questions in UI feed |
| iii | Accept a question → communication channel opens |
| iv | Must solve within tier-based time limit |
| v | First 10 answers required before monetization unlocks |
| vi | Earn credits per answer (transferred to personal account) |
| vii | Receive rating notification from student (1–5) |
| viii | View channel history after it is closed (read-only) |
| ix | Score deduction if accepted question not solved in time |

---

## Core Concepts

### 🎚️ Answer Tiers

| Tier | Answer Format | Time Limit (Admin Set) | Earnings |
|------|--------------|------------------------|---------|
| Tier I | Text-based | e.g. 30 min | Base rate |
| Tier II | Photo-based | e.g. 1 hour | Medium rate |
| Tier III | Video-based | e.g. 3 hours | Highest rate |

- Time limits per tier are set by the **platform admin**.
- If the student selects a tier when asking, the acceptor **must** respond in that exact tier format.
- If no tier is selected, the acceptor can respond in **any tier**.
- Higher tier = more money for teacher.

---

### 🔒 Public vs Private (Answer Visibility)

> **The question is always visible to everyone. Only the answer visibility is controlled by the asker.**

| Setting | Behavior |
|---------|----------|
| **Public** | Answer posted below the question in the feed. All students/teachers can see it. Answer also goes to asker's inbox. |
| **Private** | Answer sent only to the asker's inbox. Not visible in public feed. |

---

### 📡 Communication Channel — Full Rules

- When someone **accepts** a question, a real-time private channel is automatically created between the **asker** and the **acceptor**.
- Both can chat, clarify, and share files inside this channel.
- The teacher submits their final answer through this channel.

#### ⏱️ Channel Closing Flow (Manual — by Asker)

```
Timer starts when question is accepted
          ↓
Time limit hits (based on tier)
          ↓
"Close Channel" button becomes ACTIVE for the ASKER only
          ↓
Asker MUST rate the teacher (1–5) ← mandatory before close button works
          ↓
Asker clicks "Close Channel" ← irreversible
          ↓
Channel permanently closed:
  - No new messages can be sent by either party
  - Teacher notified: "Student [name] rated your solution [X/5]"
  - Both parties retain full chat history (read-only forever)
  - Question marked as SOLVED
  - Teacher wallet credited (if monetized)
```

#### ⚠️ Channel Auto-Close (Timeout — System)

```
Time limit hits → Teacher has not submitted answer
          ↓
System automatically:
  - Marks channel as EXPIRED
  - Deducts score from acceptor
  - Resets question → pushed to TOP of feed
  - No rating, no earnings for acceptor
  - Notifies both parties
```

> **Key rules summary:**
> - Only the **asker** can manually close the channel — not the teacher, not the platform.
> - Close button is only enabled **after** time limit elapsed **AND** rating submitted.
> - Closing is **irreversible** — no messages can be sent after close.
> - Both parties keep **read-only history** forever after close.
> - Teacher is notified of rating **immediately** on channel close.

---

### 🤖 Student Answer Validation (AI)

- When a student answers another student's question, the answer is checked by AI.
- If valid → student earns **points**.
- Points used as **discount on next subscription renewal**.

---

## User Flows

### Student Asking a Question

```
Student asks question
        ↓
Choose Answer Tier (I / II / III) or skip
        ↓
Choose Answer Visibility: Public or Private
        ↓
Question appears in feed (always visible to all)
        ↓
Teacher or Student accepts → channel opens, timer starts
        ↓
Communication happens inside channel
       / \
  Solved   Not solved in time
    ↓             ↓
Time limit hits  System auto-closes channel
                 Score deducted from acceptor
                 Question reset → top of feed
    ↓
"Close Channel" button activates (asker only)
    ↓
Asker submits rating (1–5) ← mandatory
    ↓
Asker closes channel ← irreversible
    ↓
Teacher notified of rating
Channel becomes read-only for both
    ↓
If Public → answer visible below question in feed
If Private → answer only in asker's inbox
```

---

## Payment & Monetization

### Student Side
- **3-day free trial** on signup
- After trial → **monthly subscription** required to ask questions
- Payment via **Khalti** or **eSewa**
- Points earned by answering → **discount** on subscription renewal

### Teacher Side
- Earnings are **per question answered** (not monthly)
- Earnings based on: Tier level + Student rating (1–5)
- First **10 answers** = qualification period (no earnings)
- After 10 answers → monetization unlocks automatically
- Earnings credited to **platform wallet** when channel is closed by asker
- Teacher can **withdraw** wallet balance to personal bank account

### Merchant Flow
```
Student pays → Platform merchant account (Khalti/eSewa)
                        ↓
            Platform deducts commission
                        ↓
        Teacher wallet credited on channel close + rating
                        ↓
        Teacher requests withdrawal → personal bank account
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14+ (App Router) |
| Language | TypeScript |
| Auth | NextAuth.js (role-based: STUDENT / TEACHER / ADMIN) |
| Database | MongoDB (via Mongoose) |
| Real-time | Pusher |
| AI Validation | OpenAI API |
| Payments | Khalti SDK + eSewa SDK |
| File Uploads | Cloudinary (photo/video answers) |
| Styling | Tailwind CSS |
| Deployment | Vercel + MongoDB Atlas |

---

## Folder Structure

```
/
├── app/
│   ├── (student)/
│   │   ├── dashboard/
│   │   ├── ask/
│   │   ├── feed/
│   │   ├── inbox/
│   │   └── leaderboard/
│   ├── (teacher)/
│   │   ├── dashboard/
│   │   ├── questions/
│   │   ├── channel/[id]/
│   │   └── wallet/
│   ├── (admin)/
│   │   ├── pricing/
│   │   ├── tier-config/
│   │   └── users/
│   ├── api/
│   │   ├── questions/
│   │   ├── channels/
│   │   │   ├── [id]/
│   │   │   ├── [id]/rate/
│   │   │   ├── [id]/close/
│   │   │   └── [id]/messages/
│   │   ├── answers/
│   │   ├── ratings/
│   │   ├── payments/
│   │   │   ├── khalti/
│   │   │   └── esewa/
│   │   ├── notifications/
│   │   └── wallet/
│   └── layout.tsx
├── components/
│   ├── student/
│   ├── teacher/
│   └── shared/
├── lib/
│   ├── mongodb.ts
│   ├── pusher.ts
│   ├── ai-validator.ts
│   └── payment/
├── models/
│   ├── User.ts
│   ├── Question.ts
│   ├── Channel.ts
│   ├── Message.ts
│   ├── Answer.ts
│   ├── Transaction.ts
│   ├── Notification.ts
│   └── PlatformConfig.ts
└── middleware.ts
```

---

## Database Schema (MongoDB)

### User
```js
{
  _id, name, email, passwordHash,
  role: "STUDENT" | "TEACHER" | "ADMIN",
  createdAt,

  // Student fields
  points: Number,
  subscriptionStatus: "TRIAL" | "ACTIVE" | "EXPIRED",
  subscriptionEnd: Date,
  trialUsed: Boolean,

  // Teacher fields
  walletBalance: Number,
  totalAnswered: Number,
  isMonetized: Boolean,        // true after 10 answers
  overallScore: Number,         // running average of ratings received
}
```

### Question
```js
{
  _id, title, body,
  askerId: ObjectId → User,
  tier: "ONE" | "TWO" | "THREE" | "UNSET",
  answerVisibility: "PUBLIC" | "PRIVATE",
  status: "OPEN" | "ACCEPTED" | "SOLVED" | "RESET",
  resetCount: Number,
  createdAt, updatedAt
}
```

### Channel
```js
{
  _id,
  questionId: ObjectId → Question,
  askerId: ObjectId → User,
  acceptorId: ObjectId → User,
  openedAt: Date,
  timerDeadline: Date,           // openedAt + tier time limit
  closedAt: Date | null,
  status: "ACTIVE" | "CLOSED" | "EXPIRED",
  isClosedByAsker: Boolean,      // true = manually closed after rating
  ratingGiven: Number | null,    // 1–5, must be set before close is allowed
}
```

### Message
```js
{
  _id,
  channelId: ObjectId → Channel,
  senderId: ObjectId → User,
  content: String,
  mediaUrl: String | null,
  mediaType: "TEXT" | "IMAGE" | "VIDEO" | null,
  sentAt: Date
}
```

### Answer
```js
{
  _id,
  questionId: ObjectId → Question,
  channelId: ObjectId → Channel,
  acceptorId: ObjectId → User,
  tier: "ONE" | "TWO" | "THREE",
  content: String,
  mediaUrl: String | null,
  isPublic: Boolean,
  submittedAt: Date,
  rating: Number | null          // filled when channel is closed
}
```

### Notification
```js
{
  _id,
  userId: ObjectId → User,       // recipient
  type: "RATING_RECEIVED" | "QUESTION_ACCEPTED" | "QUESTION_RESET" | "CHANNEL_CLOSED" | "PAYMENT",
  message: String,
  isRead: Boolean,
  createdAt: Date
}
```

### Transaction
```js
{
  _id,
  userId: ObjectId → User,
  type: "CREDIT" | "DEBIT" | "WITHDRAWAL",
  amount: Number,
  status: "PENDING" | "COMPLETED" | "FAILED",
  createdAt: Date
}
```

### PlatformConfig
```js
{
  _id,
  tier1Price: Number,
  tier2Price: Number,
  tier3Price: Number,
  tier1TimeMinutes: Number,
  tier2TimeMinutes: Number,
  tier3TimeMinutes: Number,
  commissionPercent: Number,
  scoreDeductionAmount: Number,
  qualificationThreshold: Number,   // default: 10
  trialDays: Number,                // default: 3
  updatedAt: Date
}
```

---

## API Routes Overview

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/auth/register` | Register student or teacher |
| POST | `/api/questions` | Student posts a question |
| GET | `/api/questions/feed` | Get open question feed |
| POST | `/api/questions/[id]/accept` | Accept question → open channel |
| GET | `/api/channels/[id]` | Get channel + message history |
| POST | `/api/channels/[id]/messages` | Send a message in channel |
| POST | `/api/channels/[id]/rate` | Asker submits rating (unlocks close) |
| POST | `/api/channels/[id]/close` | Asker closes channel (irreversible) |
| POST | `/api/answers` | Submit final answer |
| GET | `/api/notifications` | Get user notifications |
| PATCH | `/api/notifications/[id]/read` | Mark notification as read |
| POST | `/api/payments/khalti/initiate` | Start Khalti payment |
| POST | `/api/payments/khalti/verify` | Verify Khalti callback |
| POST | `/api/payments/esewa/initiate` | Start eSewa payment |
| POST | `/api/payments/esewa/verify` | Verify eSewa callback |
| POST | `/api/wallet/withdraw` | Teacher withdrawal request |
| GET | `/api/leaderboard` | Student leaderboard |
| GET/PUT | `/api/admin/config` | Get or update platform config |

---

## Admin Config

| Config | Description |
|--------|-------------|
| Tier I / II / III price | Amount student pays per tier |
| Tier I / II / III time limit | Minutes allowed per tier |
| Platform commission % | Platform cut per answered question |
| Score deduction amount | Points lost on timeout |
| Qualification threshold | Questions before monetization (default: 10) |
| Trial duration | Days of free trial (default: 3) |

---

## Step-by-Step Development Tasks

### ✅ PHASE 1 — Project Setup & Auth

- [ ] 1.1 Init Next.js 14 project with TypeScript + Tailwind CSS
- [ ] 1.2 Connect MongoDB Atlas via Mongoose (`lib/mongodb.ts`)
- [ ] 1.3 Create `User` Mongoose model with all fields
- [ ] 1.4 Set up NextAuth.js with credentials provider (email + password)
- [ ] 1.5 Implement role-based middleware — protect student/teacher/admin routes
- [ ] 1.6 Build Student Register page
- [ ] 1.7 Build Teacher Register page
- [ ] 1.8 Build shared Login page (redirects to correct portal by role)
- [ ] 1.9 Build Student dashboard shell (layout + navbar)
- [ ] 1.10 Build Teacher dashboard shell (layout + navbar)

---

### ✅ PHASE 2 — Question System

- [ ] 2.1 Create `Question` Mongoose model
- [ ] 2.2 Build "Ask a Question" page — title, body, tier picker, visibility toggle
- [ ] 2.3 `POST /api/questions` — create question, validate subscription/trial status
- [ ] 2.4 `GET /api/questions/feed` — fetch open questions sorted by resetCount + createdAt
- [ ] 2.5 Build Question Feed page (student + teacher see same feed)
- [ ] 2.6 Show tier badge + visibility badge on question cards
- [ ] 2.7 Reset questions appear pinned at top (resetCount sort logic)

---

### ✅ PHASE 3 — Channel & Real-Time Messaging

- [ ] 3.1 Create `Channel` and `Message` Mongoose models
- [ ] 3.2 Set up Pusher + `lib/pusher.ts` (server client + browser client)
- [ ] 3.3 `POST /api/questions/[id]/accept` — create channel, compute timerDeadline from PlatformConfig, update question status to ACCEPTED
- [ ] 3.4 Build Channel/Chat UI page (shared layout for both roles)
- [ ] 3.5 `POST /api/channels/[id]/messages` — save message + trigger Pusher event
- [ ] 3.6 Subscribe to Pusher on client for real-time incoming messages
- [ ] 3.7 Show countdown timer in channel header (client-side, based on timerDeadline)
- [ ] 3.8 On timer hit: disable message input for teacher, activate rating + close flow for asker
- [ ] 3.9 Implement timeout enforcement via Vercel Cron (`/api/cron/expire-channels`):
  - Find ACTIVE channels where timerDeadline < now and no answer submitted
  - Mark as EXPIRED
  - Deduct acceptor score
  - Reset question, push to top of feed
  - Create notifications for both parties

---

### ✅ PHASE 4 — Answer Submission & Channel Closing

- [ ] 4.1 Create `Answer` Mongoose model
- [ ] 4.2 Build answer submission UI inside channel (text input / photo upload / video upload based on required tier)
- [ ] 4.3 `POST /api/answers` — save answer, handle Cloudinary upload for media answers
- [ ] 4.4 On answer submitted → trigger Pusher event to notify asker in real-time inside channel
- [ ] 4.5 After time limit hits, show star rating widget (1–5) to asker inside channel header
- [ ] 4.6 `POST /api/channels/[id]/rate` — save rating to channel.ratingGiven, enable close button
- [ ] 4.7 Show "Close Channel" button (asker only) — disabled until rating is given
- [ ] 4.8 `POST /api/channels/[id]/close`:
  - Validate: caller is asker, channel is ACTIVE, ratingGiven is not null
  - Set status = CLOSED, closedAt = now, isClosedByAsker = true
  - Mark question status = SOLVED
  - If answer isPublic → store answer reference on question for feed display
  - If answer isPrivate → add to asker inbox only
  - If teacher isMonetized → calculate earnings and credit walletBalance, create CREDIT Transaction
  - Create RATING_RECEIVED notification for teacher
- [ ] 4.9 After close: hide message input for both parties, show "Channel Closed" banner
- [ ] 4.10 Both parties can still scroll and read full message history (read-only)

---

### ✅ PHASE 5 — Notifications

- [ ] 5.1 Create `Notification` Mongoose model
- [ ] 5.2 `GET /api/notifications` — fetch notifications for logged-in user, sorted by newest
- [ ] 5.3 `PATCH /api/notifications/[id]/read` — mark as read
- [ ] 5.4 Build notification bell icon in navbar with unread count badge
- [ ] 5.5 Build notification dropdown/panel
- [ ] 5.6 Trigger notifications at the following events:
  - Question accepted → notify asker
  - Answer submitted in channel → notify asker
  - Time limit at 80% elapsed → notify acceptor ("Hurry, time is running out!")
  - Channel closed by asker → notify teacher with rating message
  - Question auto-expired/reset → notify original asker

---

### ✅ PHASE 6 — Payments (Khalti + eSewa)

- [ ] 6.1 Set up Khalti merchant account + sandbox credentials
- [ ] 6.2 Set up eSewa merchant account + sandbox credentials
- [ ] 6.3 Create `Transaction` Mongoose model
- [ ] 6.4 Build subscription/payment page for students (choose Khalti or eSewa)
- [ ] 6.5 `POST /api/payments/khalti/initiate` — initiate payment, save PENDING transaction
- [ ] 6.6 `POST /api/payments/khalti/verify` — verify Khalti callback, set subscription ACTIVE +30 days
- [ ] 6.7 `POST /api/payments/esewa/initiate` — initiate eSewa payment
- [ ] 6.8 `POST /api/payments/esewa/verify` — verify eSewa callback, activate subscription
- [ ] 6.9 On first login → set trialUsed = true, subscriptionEnd = now + trialDays
- [ ] 6.10 Middleware check: block question posting if subscriptionEnd < now and trialUsed = true
- [ ] 6.11 Show subscription status + expiry date on student dashboard

---

### ✅ PHASE 7 — Teacher Wallet & Monetization

- [ ] 7.1 On each answer submitted → increment teacher totalAnswered
- [ ] 7.2 When totalAnswered reaches qualificationThreshold → set isMonetized = true
- [ ] 7.3 Show monetization progress on teacher dashboard ("8/10 answers to unlock earnings")
- [ ] 7.4 On channel close → if isMonetized → calculate earnings:
  - Base = tier price × (1 - commissionPercent)
  - Multiply by rating factor (e.g. rating/5 × 1.5 bonus) — admin configurable
  - Credit walletBalance, save CREDIT Transaction
- [ ] 7.5 Build Teacher Wallet page — show balance, earnings history, withdrawal history
- [ ] 7.6 `POST /api/wallet/withdraw` — teacher submits withdrawal request, create PENDING withdrawal Transaction
- [ ] 7.7 Admin manually approves and processes withdrawals, marks Transaction as COMPLETED

---

### ✅ PHASE 8 — Student Points & AI Validation

- [ ] 8.1 Build "Answer a peer's question" flow for students on the feed
- [ ] 8.2 `POST /api/answers/student` — submit student-to-student answer
- [ ] 8.3 Call OpenAI API to validate answer quality against the question
- [ ] 8.4 If valid (above threshold) → add points to student profile
- [ ] 8.5 Show points balance on student dashboard
- [ ] 8.6 On subscription payment → allow points to reduce final payment amount
- [ ] 8.7 Deduct used points from student profile after successful payment

---

### ✅ PHASE 9 — Leaderboard & Gamification

- [ ] 9.1 `GET /api/leaderboard` — aggregate students by (questions asked + AI-valid answers given), sort descending
- [ ] 9.2 Build Leaderboard page with rank, avatar, name, question count, answer count
- [ ] 9.3 Show student's own rank prominently on their dashboard
- [ ] 9.4 Weekly reset option (admin config) for leaderboard competition cycles

---

### ✅ PHASE 10 — Admin Panel

- [x] 10.1 Build Admin dashboard (protected by ADMIN role middleware)
- [x] 10.2 Tier pricing config page — set Tier I / II / III prices and save to PlatformConfig
- [x] 10.3 Time limit config page — set minutes per tier
- [x] 10.4 Commission % and score deduction config
- [x] 10.5 User management — view all users, suspend accounts
- [x] 10.6 Transaction monitoring — all payments, credits, withdrawals
- [x] 10.7 `GET/PUT /api/admin/config` — fetch and update PlatformConfig document

---

### ✅ PHASE 11 — Polish & Production

- [ ] 11.1 Loading skeletons and empty states across all pages
- [ ] 11.2 Fully mobile responsive for both portals
- [ ] 11.3 Toast notifications for all actions (success, error)
- [ ] 11.4 API rate limiting to prevent abuse
- [ ] 11.5 Switch Khalti/eSewa to production credentials
- [ ] 11.6 Configure all environment variables on Vercel
- [ ] 11.7 End-to-end QA pass — test every user flow
- [ ] 11.8 Deploy to Vercel + MongoDB Atlas production cluster