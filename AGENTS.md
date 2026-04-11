# 📚 EduAsk — 2-Portal Q&A Platform

> A Next.js-based academic Q&A platform connecting students with teachers through a structured, tiered answering system with real-time communication, payments via Khalti/eSewa, and gamified engagement.

---

## 🚨 IMPORTANT ARCHITECTURE NOTE

> **CRITICAL RULE:** Everywhere in the application, configuration data MUST be fetched from the database using `getPlatformConfig()` (from `models/PlatformConfig.ts`).
> 
> Absolutely **NO direct imports** of values from `lib/config.ts` are allowed for app logic. The `lib/config.ts` file acts purely as the initial **seed data** for the database document on first boot. All tunables—pricing, format limits, trial days, point rates, and qualification thresholds—are dynamic and cached via the DB layer.

> **AI CALLS RULE:** Every AI/LLM call in the codebase — whether for quiz question generation, student answer validation, or any future use — **MUST** go through the single shared utility `lib/llm.ts → llmGenerate()`. No component or API route may call an AI provider SDK directly. This ensures the key rotation, fallback chain, and exhaustion tracking all work from one place.

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
13. [Quiz Portal](#quiz-portal)
14. [Course Management System](#course-management-system)
15. [AI Key Rotation System](#ai-key-rotation-system)

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

| xi | Play quiz (subscription-gated) — topic + level selection, timed, AI-generated questions |
| xii | Earn quiz points (5 pts if ≥ 90% correct) — viewable on `/wallet` page |
| xiii | View past quiz history (score, date, topic) |
| xiv | Upload / browse course PDFs in the Course Library |

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
| x | Upload / browse course PDFs in the Course Library |

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
- Points earned by answering peers → **discount** on subscription renewal
- Points earned by quiz performance (≥ 90% score → **+5 points**) → viewable and usable from `/wallet`
- Both point sources accumulate in the same student `points` balance

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
| AI — Primary | Google Gemini (via `@google/generative-ai`) — free daily quota via AI Studio |
| AI — Secondary | Groq (via `groq-sdk`) — free daily token quota |
| AI — Tertiary | OpenRouter (REST API) — free-tier models (e.g. `mistralai/mistral-7b-instruct:free`) |
| AI — Quaternary | Mistral AI (via `@mistralai/mistralai`) — free La Plateforme tier |
| AI — Quinary | Cerebras Inference (REST API) — free daily quota on `llama3.1-8b` |
| AI Routing | `lib/llm.ts → llmGenerate()` — unified rotation + fallback + exhaustion tracking |
| Payments | Khalti SDK + eSewa SDK |
| File Uploads | Cloudinary (photo/video answers + course PDFs/thumbnails) |
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
│   │   ├── leaderboard/
│   │   ├── quiz/                     ← NEW: topic/level picker + quiz play page
│   │   │   ├── page.tsx              ←   topic & level selection screen
│   │   │   └── [sessionId]/          ←   active quiz session (timed, auto-submit)
│   │   └── courses/                  ← NEW: course library (browse + upload)
│   ├── (teacher)/
│   │   ├── dashboard/
│   │   ├── questions/
│   │   ├── channel/[id]/
│   │   ├── wallet/
│   │   └── courses/                  ← NEW: course library (browse + upload)
│   ├── (shared)/
│   │   └── wallet/                   ← UPDATED: unified /wallet for both roles
│   │       └── page.tsx              ←   teacher sees earnings+withdrawals; student sees points+history
│   ├── (admin)/
│   │   ├── pricing/
│   │   ├── tier-config/
│   │   ├── users/
│   │   ├── quiz-topics/              ← manage quiz topics/levels seeded in DB
│   │   ├── courses/                  ← manage all uploaded courses
│   │   └── ai-keys/                  ← NEW: admin page to add/view/remove AI provider keys
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
│   │   ├── wallet/
│   │   ├── quiz/                     ← NEW
│   │   │   ├── topics/               ←   GET available topics & levels
│   │   │   ├── start/                ←   POST: create QuizSession, fetch/generate questions
│   │   │   ├── [sessionId]/submit/   ←   POST: score answers, award points, save history
│   │   │   └── history/              ←   GET: student's past quiz results
│   │   └── courses/                  ← NEW
│   │       ├── route.ts              ←   GET (list) + POST (upload PDF + thumbnail)
│   │       └── [id]/route.ts         ←   GET single course, DELETE (owner/admin)
│   └── layout.tsx
├── components/
│   ├── student/
│   ├── teacher/
│   └── shared/
├── lib/
│   ├── mongodb.ts
│   ├── pusher.ts
│   ├── llm.ts                        ← NEW: unified llmGenerate() with rotation + fallback
│   └── payment/
├── models/
│   ├── User.ts
│   ├── Question.ts
│   ├── Channel.ts
│   ├── Message.ts
│   ├── Answer.ts
│   ├── Transaction.ts
│   ├── Notification.ts
│   ├── PlatformConfig.ts
│   ├── AIProviderConfig.ts           ← NEW: per-provider key arrays with rotation state
│   ├── QuizQuestion.ts               ← shared question bank (AI-generated, reusable)
│   ├── QuizSession.ts                ← per-student quiz attempt + asked-question tracking
│   ├── QuizTopic.ts                  ← topic + level catalogue stored in DB
│   └── Course.ts                     ← PDF course record with uploader identity
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
  quizTimeLimitSeconds: Number,     // NEW: total seconds allowed per quiz session
  quizPassPercent: Number,          // NEW: threshold to award points (default: 90)
  quizPointReward: Number,          // NEW: points awarded on passing (default: 5)
  quizQuestionCount: Number,        // NEW: questions per session (default: 50)
  quizRepeatResetDays: Number,      // NEW: days before seen questions re-enter pool (default: 15)
  updatedAt: Date
}
```

---

### AIProviderConfig *(NEW — singleton document, admin-managed)*
```js
{
  _id,

  // Each provider stores an array of key slot objects
  gemini: [
    {
      key: String,                   // the raw API key (write-only from UI)
      label: String | null,          // optional human label e.g. "key-1 (personal)"
      isExhausted: Boolean,          // true = quota hit, do not use
      exhaustedAt: Date | null,      // when it was marked exhausted
      resetAt: Date | null,          // when to automatically un-exhaust (daily reset)
      lastUsedAt: Date | null
    }
  ],

  groq: [ /* same shape as gemini[] */ ],

  openrouter: [ /* same shape */ ],

  mistral: [ /* same shape */ ],

  cerebras: [ /* same shape */ ],

  // Provider priority order (admin can reorder via UI)
  providerOrder: ["gemini", "groq", "openrouter", "mistral", "cerebras"],

  updatedAt: Date
}
```

> **Singleton pattern:** Only one `AIProviderConfig` document ever exists (upserted on first admin save). Retrieve it with `AIProviderConfig.findOne()` — no ID needed.

> **Key security:** API keys are stored server-side only. The admin UI **never returns the raw key string** on GET — it shows a masked value (`sk-...xxxx`) and a status badge. Keys can only be added or deleted, never read back in full.
```js
{
  _id,
  subject: String,       // e.g. "Mathematics"
  topic: String,         // e.g. "Algebra"
  level: String,         // e.g. "Grade 10" | "Beginner" | "Advanced"
  createdAt: Date
}
```

### QuizQuestion *(NEW — shared AI-generated question bank)*
```js
{
  _id,
  topicId: ObjectId → QuizTopic,
  questionText: String,
  options: [String],           // always 4 MCQ options
  correctOptionIndex: Number,  // 0–3
  explanation: String | null,  // optional AI explanation of correct answer
  generatedAt: Date,
  usageCount: Number           // how many times this Q has been served (analytics)
}
```

### QuizSession *(NEW — per-student quiz attempt)*
```js
{
  _id,
  studentId: ObjectId → User,
  topicId: ObjectId → QuizTopic,
  questionsAsked: [ObjectId → QuizQuestion],   // IDs of all 50 questions in this session
  answers: [
    {
      questionId: ObjectId → QuizQuestion,
      selectedOptionIndex: Number | null,  // null = unanswered (auto-submit)
      isCorrect: Boolean
    }
  ],
  score: Number,                // percentage correct, computed on submit
  pointsAwarded: Number,        // 0 or quizPointReward (from PlatformConfig)
  status: "IN_PROGRESS" | "SUBMITTED" | "EXPIRED",
  startedAt: Date,
  submittedAt: Date | null,
  timerDeadline: Date           // startedAt + quizTimeLimitSeconds
}
```

> **Repeat-prevention logic (per student):**
> When starting a new quiz session, the API aggregates all `questionsAsked` IDs from that student's sessions where `submittedAt > now - quizRepeatResetDays`. Only QuizQuestions **not** in that set are eligible for selection. If the eligible pool has fewer questions than `quizQuestionCount`, the remainder is filled from the DB (ignoring the filter), and if still short, new questions are generated via LLM and stored before the session begins.

---

### Course *(NEW)*
```js
{
  _id,
  title: String,
  description: String | null,
  subject: String,
  level: String,              // e.g. "Grade 10", "Beginner"
  pdfUrl: String,             // Cloudinary URL for the PDF
  thumbnailUrl: String | null,// Cloudinary URL for the cover thumbnail
  uploadedBy: ObjectId → User,
  uploaderName: String,       // denormalised display name (fullName or username)
  uploaderRole: "STUDENT" | "TEACHER" | "ADMIN",
  isSeeded: Boolean,          // true = client-provided seed data
  createdAt: Date,
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
| GET | `/api/admin/ai-keys` | Get all providers with masked keys + status (admin only) |
| POST | `/api/admin/ai-keys/[provider]` | Add a new key to a provider's array |
| DELETE | `/api/admin/ai-keys/[provider]/[keyIndex]` | Remove a key slot from a provider |
| PATCH | `/api/admin/ai-keys/[provider]/[keyIndex]/reset` | Manually un-exhaust a key before its auto-reset |
| PATCH | `/api/admin/ai-keys/order` | Reorder the provider fallback priority |
| GET | `/api/quiz/topics` | List all topics + levels from DB |
| POST | `/api/quiz/start` | Create QuizSession (subscription check → fetch/generate questions) |
| POST | `/api/quiz/[sessionId]/submit` | Score answers, award points, persist history |
| POST | `/api/quiz/[sessionId]/auto-submit` | Cron/client trigger on timer expiry — same scoring logic |
| GET | `/api/quiz/history` | Student's past quiz sessions with scores |
| GET | `/api/courses` | List all courses (filterable by subject/level) |
| POST | `/api/courses` | Upload new course PDF + thumbnail (student / teacher / admin) |
| GET | `/api/courses/[id]` | Single course detail |
| DELETE | `/api/courses/[id]` | Delete course (owner or admin only) |

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
| Quiz time limit (seconds) | Total seconds per quiz session (default: admin-set) |
| Quiz pass threshold % | Minimum % correct to award points (default: 90) |
| Quiz point reward | Points awarded on passing a quiz (default: 5) |
| Quiz question count | Questions served per session (default: 50) |
| Quiz repeat reset days | Days before seen questions re-enter pool (default: 15) |

---

## Current App Setup & Evolution 🚀

*(This section contrasts the initial architectural blueprint against the actual implemented reality, offering a side-by-side comparison of nomenclature, structure, and operational flow.)*

### 1. General & Configuration Architecture
| Aspect | Initial Expected Design (Blueprint) | Current Implemented App |
|--------|-------------------------------------|--------------------------|
| **Brand Identity** | EduAsk | **Question Hub** |
| **Response Categories** | "Tiers" (Tier I, II, III) | **"Formats"** (Text, Photo, Video, Any) |
| **App Configuration** | Static variables stored directly in `lib/config.ts` | **Dynamic Config Engine:** DB-backed `PlatformConfig` updated via admin real-time with an in-memory TTL Cache. `lib/config.ts` serves only as DB seed data. |

### 2. Directory Structure Evolution (Routing)
| Portal / Area | Initial Blueprint Routing | Current Route Structure |
|---------------|----------------------------|--------------------------|
| **Student Hub** | `app/(student)/dashboard`, `/ask`, `/feed` | Unified under **`app/(workspace)/...`**. Key routes: `/ask/question`, `/question/[id]`, `/channel/[id]`, `/subscription` |
| **Teacher Hub** | `app/(teacher)/dashboard`, `/questions`, `/wallet` | Unified under **`app/(workspace)/...`**. Key routes: `/[username]` (Profile), `/wallet` |
| **Admin Console** | `app/(admin)/pricing`, `/tier-config`, `/users` | Dedicated **`app/(admin)/admin/...`**. Routes: `/format-config`, `/pricing`, `/transactions`, `/users`, `/withdrawals`, `/settings` |
| **Payments Integration**| Only raw api routes (`/api/payments/*`) | Built front-end callbacks/status pages: `app/payment/esewa/success`, `app/subscription/payment/success`, etc. |

### 3. Application Flow Evolutions
| Mechanism | Expected Target Flow | Current Implemented Flow |
|-----------|----------------------|--------------------------|
| **Onboarding Trial** | Flat "3-day free trial" boolean stored in User object. | **Transaction-Driven:** Trial generated natively via system creation of an initial "+3 Days" ledger transaction on student sign-up. |
| **Chat Permissions** | Open standard channels between users. | **Secured Isolation:** Only the Original Question Asker can trigger the "Open Thread" action. Responsive Chat Sidebar truncates heavy names with ellipses. |
| **Teacher Profiles**| Linear standard chat history displays. | Dedicated **Media Answers Grid** on public profile pages natively isolates graphic image/video proofs from standard text, while masking direct media URIs. |
| **Thread Conclusion**| Manual "Close Channel" followed by a star rating. | Full **"Mark-as-Answer"** UI state machine natively implemented, encompassing robust auto-close hooks and direct Public Feed answer injection. |
| **Gamification** | Reward peer reviewers strictly through sub discounts based on standard values. | Upgraded to a scalable **Point-Based System** to reward logic and user leaderboards efficiently. |
| **System Settings** | Standard CRUD update for admin. | Real-time global update via **Pusher WebSockets** that instantly sync time limits and limits across all live user screens simultaneously. |

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
- [ ] 8.3 Call `llmGenerate()` (`lib/llm.ts`) to validate answer quality against the question — replaces direct OpenAI call
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

### ✅ PHASE 11 but last - now completes the pahse 12 and 13 then this phase. — Polish & Production

- [ ] 11.1 Loading skeletons and empty states across all pages
- [ ] 11.2 Fully mobile responsive for both portals
- [ ] 11.3 Toast notifications for all actions (success, error)
- [ ] 11.4 API rate limiting to prevent abuse
- [ ] 11.5 Switch Khalti/eSewa to production credentials
- [ ] 11.6 Configure all environment variables on Vercel
- [ ] 11.7 End-to-end QA pass — test every user flow
- [ ] 11.8 Deploy to Vercel + MongoDB Atlas production cluster

---

### ✅ PHASE 12 — Quiz Portal

- [ ] 12.1 Create `QuizTopic`, `QuizQuestion`, and `QuizSession` Mongoose models
- [ ] 12.2 Seed initial quiz topics/levels in DB (admin panel or seed script)
- [ ] 12.3 Build Quiz Topic/Level selection screen — student picks subject, topic, level before starting
- [ ] 12.4 Store selected topic in DB via `QuizTopic` model so it is reusable across sessions
- [ ] 12.5 `POST /api/quiz/start`:
  - Verify student has ACTIVE subscription (block if TRIAL or EXPIRED)
  - Compute the per-student "already-seen" set: aggregate `questionsAsked` from sessions where `submittedAt > now - quizRepeatResetDays`
  - Fetch eligible `QuizQuestion` documents for the chosen topic that are **not** in the seen set
  - If pool ≥ `quizQuestionCount` → randomly sample required count
  - If pool < `quizQuestionCount` → use all available + generate remainder via `llmGenerate()` (`lib/llm.ts`), save new questions to DB before creating session
  - Create `QuizSession` with `status: IN_PROGRESS`, set `timerDeadline = now + quizTimeLimitSeconds`
  - Return question list (text + 4 options only — **no correct index** sent to client)
- [ ] 12.6 Build timed quiz UI:
  - Countdown timer in header, synced to `timerDeadline`
  - One question at a time (or paginated) with 4 MCQ options
  - Student can navigate back/forward between questions before submit
  - Auto-submit fires when countdown hits zero (client-side trigger → `POST /api/quiz/[sessionId]/auto-submit`)
- [ ] 12.7 `POST /api/quiz/[sessionId]/submit` (and `/auto-submit` mirrors same logic):
  - Validate session belongs to requesting student and status is IN_PROGRESS
  - For unanswered questions (auto-submit path) → set `selectedOptionIndex: null, isCorrect: false`
  - Score: `(correct / total) * 100`
  - If score ≥ `quizPassPercent` → add `quizPointReward` to `user.points`, set `pointsAwarded`
  - Set `status: SUBMITTED`, `submittedAt: now`
  - Return score, correctCount, pointsAwarded to client
- [ ] 12.8 Build Quiz Results screen — show score, pass/fail, points earned, per-question breakdown with correct answer reveal
- [ ] 12.9 `GET /api/quiz/history` — fetch student's past `QuizSession` records (topic, score, points, date), paginated
- [ ] 12.10 Build Quiz History page on student dashboard
- [ ] 12.11 **Wallet / Points page routing update:**
  - **Old:** Teacher → `/wallet`, Student → `/plans` (subscription only)
  - **New:** Both roles share `/wallet` route
    - **Teacher view:** earnings balance, withdrawal history, withdraw button
    - **Student view:** current points balance, points history (quiz wins + peer-answer rewards), subscription plans section remains accessible from within the same page or a dedicated `/plans` sub-route
  - Update sidebar nav links for both roles accordingly
- [ ] 12.12 The quiz generation prompt lives inside `lib/llm.ts` as a pre-built prompt template. It takes `{ subject, topic, level, count }` and instructs `llmGenerate()` to return `count` MCQ objects `{ questionText, options[4], correctOptionIndex, explanation }`; the caller saves each to `QuizQuestion` before building the session.
- [ ] 12.13 Add quiz-related fields to `PlatformConfig` and expose them in the admin settings page
- [ ] 12.14 Create `AIProviderConfig` model and admin page `/admin/ai-keys` (see Phase 14)

---

### ✅ PHASE 13 — Course Management System

- [ ] 13.1 Create `Course` Mongoose model (fields: title, description, subject, level, pdfUrl, thumbnailUrl, uploadedBy, uploaderName, uploaderRole, isSeeded)
- [ ] 13.2 **Seed script** — admin/client provides initial PDF files + thumbnails; script uploads them to Cloudinary and inserts `Course` records with `isSeeded: true` and `uploaderRole: "ADMIN"`
- [ ] 13.3 `POST /api/courses`:
  - Accept multipart form-data: PDF file (required) + thumbnail image (optional) + metadata (title, description, subject, level)
  - Upload PDF to Cloudinary (`resource_type: raw`)
  - Upload thumbnail to Cloudinary (`resource_type: image`) if provided
  - Persist `Course` document — set `uploadedBy`, `uploaderName` (user's `name` or `username`), `uploaderRole` from session
  - Any authenticated role (STUDENT / TEACHER / ADMIN) may upload
- [ ] 13.4 `GET /api/courses` — list courses, filterable by `subject` / `level`; return `uploaderName` + `uploaderRole` for UI display; paginated
- [ ] 13.5 `GET /api/courses/[id]` — return full course detail including Cloudinary PDF URL for in-browser viewer
- [ ] 13.6 `DELETE /api/courses/[id]` — only original uploader or ADMIN may delete
- [ ] 13.7 Build **Course Library** page (accessible from both student and teacher sidebar under `/courses`):
  - Filter bar: subject, level
  - Course cards showing thumbnail, title, uploader name + role badge (e.g. "Uploaded by Aarav · Student")
  - Click → opens PDF viewer modal or new tab
- [ ] 13.8 Build **Upload Course** form/modal on the same page:
  - Fields: title, description, subject, level (dropdowns from `QuizTopic` subjects/levels), PDF file picker, thumbnail picker
  - On success → optimistic card added to list
- [ ] 13.9 Admin panel page (`/admin/courses`) — view all courses, delete any, mark as featured

---

## Quiz Portal

> Detailed rules and flows for the Quiz feature introduced in Phase 12.

### Access Control
- **Only students with an ACTIVE subscription** may start a quiz.
- TRIAL and EXPIRED students are blocked with a prompt to subscribe.
- Teachers do **not** have access to the quiz portal.

### Quiz Flow

```
Student opens /quiz
        ↓
Selects Subject → Topic → Level (from DB QuizTopic catalogue)
        ↓
POST /api/quiz/start
  → Subscription check (block if not ACTIVE)
  → Build eligible question pool (exclude seen within reset window)
  → Fill gaps via LLM if pool is short; save new Qs to DB
  → Create QuizSession (IN_PROGRESS), return 50 questions (no answers)
        ↓
Timed Quiz UI loads
  - Countdown timer visible at all times
  - 50 MCQ questions, 4 options each
  - Student can navigate freely between questions
        ↓
        ├─ Student submits manually (before timer ends)
        │         ↓
        │   POST /api/quiz/[sessionId]/submit
        │
        └─ Timer hits zero (auto-submit)
                  ↓
            POST /api/quiz/[sessionId]/auto-submit
            (unanswered Qs counted as wrong)
        ↓
Scoring: (correct / 50) × 100
  ≥ 90% → +5 points added to student.points, pointsAwarded = 5
  < 90% → pointsAwarded = 0
        ↓
Results screen:
  - Score %
  - Correct / Incorrect count
  - Points earned this session
  - Per-question breakdown with correct answer reveal
        ↓
Session stored in QuizSession for history + repeat-prevention
```

### Repeat-Prevention & 15-Day Reset

| Step | Logic |
|------|-------|
| On quiz start | Aggregate all `questionsAsked` from this student's sessions where `submittedAt ≥ now − quizRepeatResetDays` |
| Eligible pool | All `QuizQuestion` docs for chosen topic **not** in the above set |
| Pool too small | Use all eligible + fill remainder ignoring filter; if still short → generate via LLM |
| After 15 days | Old sessions fall outside the window → those question IDs re-enter the eligible pool automatically (no manual reset needed) |

### Points → Wallet

- Student points from **quiz** and from **peer-answer AI validation** both accumulate in `user.points`.
- `/wallet` for students shows: total points, points history (source: `QUIZ_WIN` or `PEER_ANSWER`), and subscription management.
- Points can be redeemed as a discount on subscription renewal (existing Phase 8 logic, unchanged).

---

## Course Management System

> Rules and flows for the Course Library introduced in Phase 13.

### Who Can Upload
| Role | Can Upload | Can Delete Own | Can Delete Any |
|------|-----------|----------------|----------------|
| STUDENT | ✅ | ✅ | ❌ |
| TEACHER | ✅ | ✅ | ❌ |
| ADMIN | ✅ | ✅ | ✅ |

### Uploader Identity Display
- `uploaderName` is denormalised at upload time from `user.name` (full name) or `user.username`.
- `uploaderRole` stored as `"STUDENT"` / `"TEACHER"` / `"ADMIN"`.
- UI displays: *"Uploaded by [uploaderName] · [Role Badge]"* on every course card.
- If the uploader deletes their account, the name string is retained for historical display (no cascade deletion of courses).

### Seeding Flow (Initial Client Content)
```
Client provides:
  - PDF files
  - Thumbnail images
        ↓
Admin runs seed script (scripts/seed-courses.ts)
  - Uploads each PDF to Cloudinary (resource_type: raw)
  - Uploads each thumbnail to Cloudinary (resource_type: image)
  - Inserts Course document:
      isSeeded: true
      uploaderRole: "ADMIN"
      uploaderName: "Platform Admin"
        ↓
Courses appear in library immediately
```

### Storage & Display
- PDFs hosted on **Cloudinary** (`resource_type: raw`); URL stored in `course.pdfUrl`.
- Thumbnails hosted on **Cloudinary** (`resource_type: image`); URL stored in `course.thumbnailUrl`.
- If no thumbnail uploaded → UI shows a generic subject-based placeholder.
- Course library is paginated, filterable by subject and level.
- PDF viewer opens in-browser (iframe / `react-pdf`) or falls back to new tab.
---

### ✅ PHASE 14 — AI Key Rotation System

- [ ] 14.1 Create `AIProviderConfig` Mongoose model (singleton document) — fields: `gemini[]`, `groq[]`, `openrouter[]`, `mistral[]`, `cerebras[]`, `providerOrder[]`
- [ ] 14.2 Each key slot object shape:
  ```ts
  {
    key: string           // raw API key
    label?: string        // optional admin label
    isExhausted: boolean  // quota hit flag
    exhaustedAt?: Date    // when it was marked exhausted
    resetAt?: Date        // auto-un-exhaust time (next day at midnight UTC)
    lastUsedAt?: Date
  }
  ```
- [ ] 14.3 Build `lib/llm.ts` — exports a single async `llmGenerate(prompt: string, opts?: LLMOptions): Promise<string>` function with the following internal logic:
  - Load `AIProviderConfig` from DB (with short in-memory TTL cache — refresh every 60 s)
  - Walk providers in `providerOrder` order
  - For each provider, walk its key array:
    - **Skip** keys where `isExhausted = true AND now < resetAt`
    - **Auto-un-exhaust** keys where `isExhausted = true AND now >= resetAt` (update DB flag inline)
    - Attempt the API call with the first eligible key
    - On **success** → update `lastUsedAt`, return response text
    - On **quota / rate-limit error (429 / 403)** → mark key `isExhausted = true`, `exhaustedAt = now`, `resetAt = next midnight UTC`, continue to next key
    - On **other error** → throw (do not exhaust the key)
  - If **all keys in all providers are exhausted** → throw `LLMExhaustedError` with a descriptive message so callers can return a graceful HTTP 503
- [ ] 14.4 Provider-specific API call implementations inside `lib/llm.ts`:
  - **Gemini** — `@google/generative-ai` SDK, model `gemini-1.5-flash` (highest free quota)
  - **Groq** — `groq-sdk`, model `llama3-8b-8192` (free tier)
  - **OpenRouter** — fetch to `https://openrouter.ai/api/v1/chat/completions`, model `mistralai/mistral-7b-instruct:free`
  - **Mistral** — `@mistralai/mistralai` SDK, model `mistral-small-latest` (free La Plateforme tier)
  - **Cerebras** — fetch to `https://api.cerebras.ai/v1/chat/completions`, model `llama3.1-8b`
- [ ] 14.5 Build admin API routes (all protected by ADMIN role middleware):
  - `GET /api/admin/ai-keys` — return all providers with **masked keys** (`sk-...xxxx`, last 4 chars), status badge per key (`ACTIVE` / `EXHAUSTED` / `RESETTING`), `lastUsedAt`, `resetAt`
  - `POST /api/admin/ai-keys/[provider]` — body `{ key, label? }`, push new slot, return updated masked list
  - `DELETE /api/admin/ai-keys/[provider]/[keyIndex]` — remove key slot by array index
  - `PATCH /api/admin/ai-keys/[provider]/[keyIndex]/reset` — manually set `isExhausted = false` (admin override before auto-reset time)
  - `PATCH /api/admin/ai-keys/order` — body `{ providerOrder: string[] }`, update priority order
- [ ] 14.6 Build admin UI page `app/(admin)/admin/ai-keys/page.tsx`:
  - Section per provider (Gemini / Groq / OpenRouter / Mistral / Cerebras) with provider logo/colour
  - Each key shown as a row: masked key, label, status badge, last used timestamp, reset time, Delete button, Manual Reset button (if exhausted)
  - "Add Key" button → inline form with key input + optional label → POST to add
  - Drag-to-reorder provider priority list (updates `providerOrder`)
  - Live status refresh every 30 s (SWR polling)
- [ ] 14.7 Replace all existing OpenAI calls (Phase 8 AI validation) with `llmGenerate()` — remove any `openai` SDK dependency
- [ ] 14.8 Replace quiz question generation logic (Phase 12) to use `llmGenerate()` — remove `lib/quiz-generator.ts` file entirely
- [ ] 14.9 Add `LLMExhaustedError` handling in every API route that calls `llmGenerate()` — return HTTP 503 with message: `"AI services are temporarily at capacity. Please try again later."`
- [ ] 14.10 (Optional) Vercel Cron `GET /api/cron/reset-ai-keys` — runs once daily at 00:05 UTC, sets `isExhausted = false` on all keys whose `resetAt <= now` as a safety net alongside the inline lazy reset

---

## AI Key Rotation System

> Architecture for the unified LLM provider rotation system used by `llmGenerate()`.

### Supported Providers & Free Quotas

| Priority | Provider | SDK / Method | Recommended Free Model | Daily Reset |
|----------|----------|-------------|----------------------|-------------|
| 1 | **Google Gemini** | `@google/generative-ai` | `gemini-1.5-flash` | Midnight Pacific |
| 2 | **Groq** | `groq-sdk` | `llama3-8b-8192` | Midnight UTC |
| 3 | **OpenRouter** | REST fetch | `mistralai/mistral-7b-instruct:free` | Rolling window |
| 4 | **Mistral AI** | `@mistralai/mistralai` | `mistral-small-latest` | Midnight UTC |
| 5 | **Cerebras** | REST fetch | `llama3.1-8b` | Midnight UTC |

> All five providers offer **free tiers with daily quota that auto-renew** — no credit card needed for the free limits. Multiple API keys per provider (from different accounts) multiply the effective daily quota.

### Key Rotation Flow

```
llmGenerate(prompt) called
        ↓
Load AIProviderConfig from DB (cached 60s in memory)
        ↓
Walk providerOrder: ["gemini", "groq", "openrouter", "mistral", "cerebras"]
        ↓
For each provider → walk key array
  ┌─ Key is EXHAUSTED and resetAt > now?
  │    └─ SKIP → next key
  ├─ Key is EXHAUSTED and resetAt ≤ now?
  │    └─ AUTO-UN-EXHAUST inline (DB update) → try this key
  └─ Key is ACTIVE?
       └─ TRY API call
            ├─ SUCCESS → update lastUsedAt, return response ✅
            └─ 429 / 403 quota error
                 └─ Mark isExhausted=true, exhaustedAt=now,
                    resetAt=next midnight UTC → next key ↩
        ↓ (all keys in all providers exhausted)
Throw LLMExhaustedError → caller returns HTTP 503
```

### Key Exhaustion & Reset

| Event | What happens |
|-------|-------------|
| Provider returns 429 / 403 | Key marked `isExhausted=true`, `resetAt` set to next midnight UTC |
| `now >= resetAt` (lazy check) | Key auto-un-exhausted inline during next `llmGenerate()` call |
| Admin clicks "Manual Reset" | `isExhausted` set `false` immediately via API |
| Daily cron at 00:05 UTC | Safety-net batch reset of all eligible keys |

### Adding Keys (Multiple Accounts Strategy)

To maximise free quota without paying, the admin adds API keys from **multiple free accounts** per provider. Example with 3 Gemini accounts:

```
gemini: [
  { key: "AIzaSy...acct1", label: "personal-1", isExhausted: false },
  { key: "AIzaSy...acct2", label: "personal-2", isExhausted: false },
  { key: "AIzaSy...acct3", label: "friend-1",   isExhausted: false }
]
```

When account-1 hits its daily limit → rotation moves to account-2 → account-3 → then falls through to the next provider (Groq) and repeats.

### Admin UI — `/admin/ai-keys`

- One collapsible card per provider, colour-coded by brand
- Each key row shows: `label`, masked key (`AIza...xkW3`), status badge (`ACTIVE 🟢` / `EXHAUSTED 🔴` / `RESETTING ⏳`), last used, reset time
- **Add Key** inline form per provider
- **Drag handles** to reorder provider priority (`providerOrder`)
- **Manual Reset** button appears only on exhausted keys
- **Delete** removes the key slot permanently
- Page auto-refreshes status every 30 seconds (SWR)

### `llmGenerate()` Interface

```ts
// lib/llm.ts

export interface LLMOptions {
  systemPrompt?: string   // optional system/instruction prefix
  maxTokens?: number      // default: 1024
  temperature?: number    // default: 0.7
  json?: boolean          // if true, appends "Respond ONLY in valid JSON." and parses output
}

export async function llmGenerate(
  prompt: string,
  opts?: LLMOptions
): Promise<string>
// Throws LLMExhaustedError if all providers are exhausted
// All other errors bubble up as-is

export class LLMExhaustedError extends Error {}
```

### Callers in This Codebase

| Caller | Purpose | `json` option |
|--------|---------|---------------|
| `POST /api/quiz/start` | Generate MCQ questions for quiz session | `true` |
| `POST /api/answers/student` | Validate student-to-student answer quality | `false` |
| *(future)* | Any new AI feature | depends |

> Both callers catch `LLMExhaustedError` and return HTTP 503 to the client. No other error handling is required from callers — `llmGenerate()` handles all retry/rotation internally.