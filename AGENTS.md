# 📚 Question Hub — Platform Documentation

---

## 🚨 MANDATORY RULES — READ BEFORE TOUCHING ANY CODE

> **RULE 1 — CONFIG:** All configuration values MUST be fetched from the database via `getPlatformConfig()` from `models/PlatformConfig.ts`. The file `lib/config.ts` is seed-only. No direct imports of config values anywhere in app logic.

> **RULE 2 — AI CALLS:** Every single AI/LLM call — quiz generation, answer validation, any future use — MUST go through `lib/llm.ts → llmGenerate()`. No component or API route may call an AI provider SDK directly.

> **RULE 3 — TASK TRACKING:** Whenever an LLM assistant begins implementing any task in this project, it MUST first create or update `task.md` in the project root, logging which chunk it is working on, what files it will touch, and what its exit condition is — before writing a single line of application code.

> **RULE 4 — PAYMENTS:** All payment flows (subscription and course purchase) use the same Khalti/eSewa integration. Course purchases use `type: "COURSE_PURCHASE"` and must atomically credit the teacher wallet minus `getPlatformConfig().coursePurchaseCommissionPercent` inside the payment verify handler. Commission percent is always snapshotted into the Transaction metadata at the moment of the transaction so historical records are immutable.

---

## 🗂️ Table of Contents

1. [Project Overview](#project-overview)
2. [Tech Stack](#tech-stack)
3. [Completed Phases Summary](#completed-phases-summary)
4. [Course Management System — Phase 15](#course-management-system--phase-15)
5. [Database Schema](#database-schema)
6. [API Routes](#api-routes)
7. [Admin Config Reference](#admin-config-reference)

---

## Project Overview

**Question Hub** is a dual-portal academic platform where students ask questions and teachers solve them via tiered, timed communication channels. It includes a quiz portal, leaderboard, subscription/payments (Khalti + eSewa), and an AI key rotation engine.

The **Course Management System (Phase 15)** is the final major feature: a full-featured video course platform with three pricing models (Free / Subscription-Included / Paid), recorded sessions, live Zoom-integrated classes, progress tracking, coupon access, and platform-commission-based teacher earnings — all administrable by the admin.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14+ (App Router) |
| Language | TypeScript |
| Auth | NextAuth.js (STUDENT / TEACHER / ADMIN) |
| Database | MongoDB via Mongoose |
| Real-time | Pusher |
| AI Primary–Quinary | Gemini, Groq, OpenRouter, Mistral, Cerebras |
| AI Routing | `lib/llm.ts → llmGenerate()` |
| Payments | Khalti SDK + eSewa SDK (subscriptions + course purchases) |
| File/Video Storage | Cloudinary |
| Email | Nodemailer / Resend (SMTP) |
| WhatsApp | Twilio WhatsApp Business API |
| Zoom | Zoom OAuth + REST API (optional, for auto-fetch recording) |
| Styling | Tailwind CSS |
| Deployment | Vercel + MongoDB Atlas |

---

## Completed Phases Summary

| Phase | Name | Status |
|-------|------|--------|
| 1 | Project Setup & Auth | ✅ Done |
| 2 | Question System | ✅ Done |
| 3 | Channel & Real-Time Messaging | ✅ Done |
| 4 | Answer Submission & Channel Closing | ✅ Done |
| 5 | Notifications | ✅ Done |
| 6 | Payments — Khalti + eSewa | ✅ Done |
| 7 | Teacher Wallet & Monetization | ✅ Done |
| 8 | Student Points & AI Validation | ✅ Done |
| 9 | Leaderboard & Gamification | ✅ Done |
| 10 | Admin Panel | ✅ Done |
| 12 | Quiz Portal | ✅ Done |
| 14 | AI Key Rotation System | ✅ Done |

App is branded **"Question Hub"**. Tiers = **Formats**. Routes under `app/(workspace)/`. Admin at `app/(admin)/admin/`.

---

## Course Management System — Phase 15

---

### 15.0 — Overview & Design Philosophy

Courses have three pricing models. The model is set per-course by the creator (teacher or admin):

| `pricingModel` | Who Can Watch | Payment |
|----------------|--------------|---------|
| `FREE` | Any authenticated user | None |
| `SUBSCRIPTION_INCLUDED` | Active monthly subscriber OR coupon holder | Existing subscription fee |
| `PAID` | Anyone who buys this specific course | Course price via Khalti/eSewa |

**Critical rules enforced everywhere:**
- `PAID` courses are completely independent of subscription. An active subscriber still pays full price. The subscription never discounts or unlocks a PAID course.
- Teacher sets the `price` (in NPR). Platform deducts `coursePurchaseCommissionPercent` (from `PlatformConfig`, admin-managed). Teacher receives the remainder in their wallet on each sale.
- `commissionPercent` snapshot is stored in every `Transaction` at purchase time so historical records are never retroactively changed by admin config updates.
- `FREE` courses never have live sessions. `SUBSCRIPTION_INCLUDED` and `PAID` courses can.
- A `FULL_ACCESS` coupon can unlock any course regardless of `pricingModel` — including PAID — without any payment. The teacher earns nothing from coupon-based enrollments (no money changes hands).

---

### 15.1 — Access Matrix

| Action | FREE | SUBSCRIPTION_INCLUDED | PAID |
|--------|------|-----------------------|------|
| Browse listing | ✅ Any auth | ✅ Any auth | ✅ Any auth |
| Enroll & watch | ✅ Auto | ✅ Subscriber OR coupon | ✅ Purchased OR coupon |
| Live sessions | ❌ | ✅ Subscriber OR coupon | ✅ Purchased OR coupon |
| Active subscriber = free? | ✅ | ✅ | ❌ Must still pay |
| Create course | TEACHER / ADMIN | TEACHER / ADMIN | TEACHER / ADMIN |
| Delete own | Creator | Creator | Creator |
| Delete any | ADMIN | ADMIN | ADMIN |

---

### 15.2 — Data Models

#### Course
```ts
{
  _id: ObjectId,
  title: String,
  slug: String,                     // unique, auto-generated pre-save from title
  description: String,
  subject: String,
  level: String,

  // Pricing
  pricingModel: "FREE" | "SUBSCRIPTION_INCLUDED" | "PAID",
  price: Number | null,             // NPR. Required when pricingModel = "PAID", null otherwise
  currency: "NPR",

  status: "DRAFT" | "ACTIVE" | "COMPLETED" | "ARCHIVED",
  isFeatured: Boolean,
  thumbnailUrl: String | null,
  totalDurationMinutes: Number,     // recomputed on video add/delete
  instructorId: ObjectId → User,
  instructorName: String,           // denormalised at creation time
  instructorRole: "TEACHER" | "ADMIN",
  enrollmentCount: Number,          // incremented on each CourseEnrollment creation
  liveSessionsEnabled: Boolean,     // forced false for FREE; toggleable for SUBSCRIPTION_INCLUDED / PAID
  startDate: Date | null,
  expectedEndDate: Date | null,
  tags: [String],
  createdAt: Date,
  updatedAt: Date
}
```

#### CourseSection
```ts
{
  _id: ObjectId,
  courseId: ObjectId → Course,
  title: String,
  description: String | null,
  order: Number,                    // 1-indexed, controls display order
  totalVideos: Number,              // denormalised
  totalDurationMinutes: Number,     // denormalised
  createdAt: Date,
  updatedAt: Date
}
```

#### CourseVideo
```ts
{
  _id: ObjectId,
  courseId: ObjectId → Course,
  sectionId: ObjectId → CourseSection,
  title: String,
  description: String | null,
  order: Number,                    // within section
  videoUrl: String,                 // Cloudinary URL (resource_type: video)
  cloudinaryPublicId: String,
  durationMinutes: Number,          // enforced ≤ getPlatformConfig().courpZEAWYtiB6bJ16NuLbGCc6CZ6jJdKfb63
  thumbnailUrl: String | null,
  isLiveRecording: Boolean,
  liveSessionId: ObjectId → LiveSession | null,
  viewCount: Number,
  uploadedAt: Date,
  updatedAt: Date
}
```

#### LiveSession
```ts
{
  _id: ObjectId,
  courseId: ObjectId → Course,      // course.pricingModel must NOT be "FREE"
  sectionId: ObjectId → CourseSection | null,
  title: String,
  scheduledAt: Date,
  durationMinutes: Number | null,
  instructorId: ObjectId → User,
  zoomLink: String | null,
  status: "SCHEDULED" | "LIVE" | "ENDED" | "CANCELLED",

  notificationsSent: Boolean,
  notificationSentAt: Date | null,
  notificationChannels: ["EMAIL", "WHATSAPP"],

  recordingMethod: "UPLOAD" | "ZOOM_LINK" | "ZOOM_API" | null,
  recordingUrl: String | null,
  recordingCloudinaryId: String | null,
  recordingAddedAt: Date | null,
  courseVideoId: ObjectId → CourseVideo | null,

  createdAt: Date,
  updatedAt: Date
}
```

#### CourseEnrollment
```ts
{
  _id: ObjectId,
  courseId: ObjectId → Course,
  studentId: ObjectId → User,

  accessType: "FREE" | "SUBSCRIPTION" | "COUPON" | "PURCHASE",
  couponId: ObjectId → CourseCoupon | null,     // set if COUPON
  transactionId: ObjectId → Transaction | null, // set if PURCHASE
  pricePaid: Number | null,                     // snapshot of course.price at purchase time

  enrolledAt: Date,
  lastAccessedAt: Date | null,

  overallProgressPercent: Number,
  completedVideoCount: Number,
  totalVideoCount: Number,                      // snapshot, updated when videos are added/deleted
}
// Unique compound index: { courseId, studentId }
```

#### VideoProgress
```ts
{
  _id: ObjectId,
  enrollmentId: ObjectId → CourseEnrollment,
  studentId: ObjectId → User,
  courseId: ObjectId → Course,
  sectionId: ObjectId → CourseSection,
  videoId: ObjectId → CourseVideo,
  watchedPercent: Number,           // 0–100
  isCompleted: Boolean,             // true when watchedPercent >= courseProgressCompletionThreshold
  completedAt: Date | null,
  lastWatchedAt: Date,
  firstWatchedAt: Date
}
// Unique compound index: { studentId, videoId }
```

#### CourseCoupon
```ts
{
  _id: ObjectId,
  code: String,                     // unique, case-insensitive
  type: "FULL_ACCESS",              // unlocks regardless of pricingModel; no payment
  scope: "COURSE" | "GLOBAL",
  courseId: ObjectId → Course | null,
  usageLimit: Number | null,        // null = unlimited
  usedCount: Number,
  expiryDate: Date | null,
  isActive: Boolean,
  createdBy: ObjectId → User,       // ADMIN only
  createdAt: Date,
  updatedAt: Date
}
```

#### CourseCouponRedemption
```ts
{
  _id: ObjectId,
  couponId: ObjectId → CourseCoupon,
  studentId: ObjectId → User,
  courseId: ObjectId → Course | null,
  redeemedAt: Date
}
```

#### CourseNotificationLog
```ts
{
  _id: ObjectId,
  liveSessionId: ObjectId → LiveSession,
  courseId: ObjectId → Course,
  recipientId: ObjectId → User,
  channels: ["EMAIL", "WHATSAPP"],
  status: "SENT" | "FAILED",
  failureReason: String | null,
  sentAt: Date
}
```

**Transaction model additions** (two new `type` values):
```ts
// Existing Transaction model gets two new type values:
type: "COURSE_PURCHASE"      // student debit — course purchase
type: "COURSE_SALE_CREDIT"   // teacher credit — net of commission

// Both include a metadata field:
metadata: {
  courseId: string,
  courseName: string,
  pricingModel: string,
  grossAmount: number,           // full course.price
  commissionPercent: number,     // snapshot of PlatformConfig value at transaction time
  netAmount: number,             // grossAmount * (1 - commissionPercent/100)
  studentId?: string,            // on COURSE_SALE_CREDIT
  instructorId?: string,         // on COURSE_PURCHASE
}
```

---

### 15.3 — Enrollment & Access Logic

```
Student opens a course
        ↓
pricingModel = "FREE"
  └─ Auto-create CourseEnrollment (accessType: "FREE"). Done.

pricingModel = "SUBSCRIPTION_INCLUDED"
  ├─ Student enters a coupon code?
  │    └─ Validate → enroll (accessType: "COUPON") → done
  ├─ user.subscriptionStatus === "ACTIVE"?
  │    └─ Enroll (accessType: "SUBSCRIPTION") → done
  └─ Neither → show gate:
       • "Subscribe" → existing subscription payment flow (Phase 6)
       • "Enter Coupon" → coupon input

pricingModel = "PAID"
  ├─ Student enters a coupon code?
  │    └─ Validate → enroll (accessType: "COUPON") → done (no payment)
  ├─ Existing CourseEnrollment (accessType: "PURCHASE") already exists?
  │    └─ Serve content directly
  └─ Otherwise (subscription is IRRELEVANT):
       Show gate: course price (NPR) + "Buy Now"
         → POST /api/courses/[id]/purchase/initiate
         → Khalti/eSewa payment
         → On verify: enroll + credit teacher wallet
```

**Re-enrollment:** One `CourseEnrollment` per student per course, enforced by compound unique index. Enroll calls are idempotent. `accessType` can be upgraded (COUPON → SUBSCRIPTION, COUPON → PURCHASE) but never downgraded.

---

### 15.4 — PAID Course Purchase Payment Flow

Reuses the existing Khalti/eSewa integration. New transaction type only.

```
POST /api/courses/[id]/purchase/initiate
  → Validate: pricingModel = "PAID", price set, student not already enrolled
  → Create Transaction { type: "COURSE_PURCHASE", status: "PENDING",
      amount: course.price, metadata: { courseId, instructorId,
      commissionPercent: config.coursePurchaseCommissionPercent, ... } }
  → Initiate Khalti or eSewa payment (amount = course.price)
  → Return payment URL/payload
        ↓
Student completes payment externally
        ↓
POST /api/payments/khalti/course-verify (or /esewa/course-verify)
  → Verify with SDK
  → On SUCCESS (atomic):
      1. Transaction.status = "COMPLETED"
      2. Create CourseEnrollment { accessType: "PURCHASE",
           transactionId, pricePaid: course.price,
           totalVideoCount: current video count }
      3. Course.enrollmentCount += 1
      4. commissionPercent = config.coursePurchaseCommissionPercent  ← from getPlatformConfig()
         teacherEarnings = course.price × (1 - commissionPercent/100)
      5. instructor.walletBalance += teacherEarnings
      6. Create Transaction { type: "COURSE_SALE_CREDIT", userId: instructorId,
           amount: teacherEarnings, status: "COMPLETED", metadata: { ... } }
  → On FAILURE: Transaction.status = "FAILED", redirect with error
```

Teacher commission preview shown live in the course creation UI:
```
Price you set:        NPR 1,000
Platform commission:  NPR 200  (20%)
You receive:          NPR 800  per sale
```
Values are fetched from `getPlatformConfig()` when the teacher opens the create/edit form.

---

### 15.5 — Course Creator: Pricing UI

When creating or editing a course, the pricing section:

```
Pricing Model
  ○ Free              → pricingModel: "FREE",  price: null, liveSessionsEnabled: false (forced)
  ○ Subscription      → pricingModel: "SUBSCRIPTION_INCLUDED", price: null
  ○ Paid              → pricingModel: "PAID",  price: required (NPR input)

If "Paid" selected:
  [ Course Price  NPR _______ ]
  Live preview:
    Platform commission (20%): NPR X
    You receive per sale:      NPR Y
```

Validation:
- `pricingModel = "PAID"` requires `price > 0`.
- `pricingModel ≠ "PAID"` → `price` is set to `null` on save.
- Changing to `"FREE"` forces `liveSessionsEnabled = false`.
- Admin can change `pricingModel`/`price` on any course anytime. Existing enrollments are never revoked.

---

### 15.6 — Live Session Flow

Only available for `SUBSCRIPTION_INCLUDED` and `PAID` courses.

```
Teacher schedules LiveSession (title, scheduledAt, durationMinutes, sectionId)
        ↓
Teacher pastes Zoom link → stored on LiveSession
        ↓
"Send Invite" → fetch all CourseEnrollment for this course
  → Email (Nodemailer) + WhatsApp (Twilio) per student
  → Log to CourseNotificationLog
        ↓
Session ends → teacher sets status = "ENDED"
        ↓
Teacher adds recording — chooses one:
  A. Upload file (Cloudinary, max 1hr)
  B. Paste Zoom recording URL
  C. Auto-fetch via Zoom API (OAuth)
        ↓
Recording → creates CourseVideo (isLiveRecording: true)
  → Section + course totalDurationMinutes recomputed
  → All CourseEnrollment.totalVideoCount + 1
```

---

### 15.7 — Progress Tracking

- Client sends `PATCH /api/courses/[id]/videos/[videoId]/progress` every 30s with `{ watchedPercent }`.
- When `watchedPercent >= courseProgressCompletionThreshold` (PlatformConfig, default 90):
  - `VideoProgress.isCompleted = true`
  - `CourseEnrollment.completedVideoCount += 1`
  - `overallProgressPercent = completedVideoCount / totalVideoCount × 100`
- Section progress computed on-demand: `completedInSection / totalInSection × 100`.
- `totalVideoCount` on each enrollment is updated whenever videos are added or deleted.

---

### 15.8 — Coupon System

Admin-only creation. Works on all `pricingModel` values including `PAID`.

| Field | Notes |
|-------|-------|
| `type` | Always `FULL_ACCESS` — grants access, zero payment |
| `scope` | `COURSE` (specific course) or `GLOBAL` (all courses) |
| `usageLimit` | Number or null (unlimited) |
| `expiryDate` | Date or null (never expires) |
| Teacher earns? | **No** — coupon bypasses payment; no Transaction created |

---

### 15.9 — Admin Analytics

| Metric | Source |
|--------|--------|
| Courses by pricingModel / status | `Course` aggregate |
| Enrollments by accessType | `CourseEnrollment` group |
| Total course revenue | `Transaction` sum (type: `COURSE_PURCHASE`) |
| Platform commission earned | `metadata.grossAmount - metadata.netAmount` sum |
| Teacher earnings per course | `Transaction` sum (type: `COURSE_SALE_CREDIT`) per instructorId |
| Avg completion rate | avg `overallProgressPercent` across enrollments |
| Most-watched videos | `CourseVideo.viewCount` desc |
| Coupon redemption counts | `CourseCoupon.usedCount` |
| Live session notification rate | `CourseNotificationLog` SENT/FAILED |

---

### 15.10 — Notification Templates

**Email:**
```
Subject: 🎓 Live Class: [Session Title] — [Date] at [Time]
Body: Class title, instructor, date/time, duration, Zoom CTA button
```

**WhatsApp:**
```
🎓 *[Course Title]* — Live Class Alert!
Hi [Name], class *[Session Title]* starts on *[date]* at *[time]*.
👉 Join: [zoomLink]
```

---

### 15.11 — PlatformConfig Additions

```ts
courpZEAWYtiB6bJ16NuLbGCc6CZ6jJdKfb63: Number,         // default: 60
courseProgressCompletionThreshold: Number,     // default: 90
liveSessionNotificationLeadMinutes: Number,    // default: 30
coursePurchaseCommissionPercent: Number,       // default: 20
```

Changing `coursePurchaseCommissionPercent` is forward-only. Historical transactions store the snapshot used at purchase time in `metadata.commissionPercent`.

---

### 15.12 — Folder Structure

```
app/
├── (workspace)/
│   ├── courses/
│   │   ├── page.tsx                      ← browse (shows price badge or "Free" / "Subscription")
│   │   ├── [slug]/
│   │   │   ├── page.tsx                  ← detail + enroll/purchase gate
│   │   │   ├── watch/[videoId]/page.tsx  ← video player + progress
│   │   │   └── live/[sessionId]/page.tsx ← live session + Zoom link
│   │   └── my/page.tsx                   ← enrolled courses + progress bars
│   └── upload-course/page.tsx            ← course creator wizard (teacher/admin)
│
├── (admin)/admin/
│   ├── courses/
│   │   ├── page.tsx                      ← all courses + revenue analytics
│   │   ├── [id]/page.tsx                 ← edit any course
│   │   └── coupons/page.tsx
│   └── live-sessions/page.tsx
│
api/
├── courses/
│   ├── route.ts
│   ├── [id]/
│   │   ├── route.ts
│   │   ├── enroll/route.ts               ← FREE + SUBSCRIPTION_INCLUDED paths
│   │   ├── purchase/initiate/route.ts    ← PAID path: start Khalti/eSewa
│   │   ├── progress/route.ts
│   │   ├── sections/...
│   │   ├── videos/...
│   │   └── live-sessions/...
│   └── coupons/
│       ├── route.ts
│       ├── validate/route.ts
│       └── [id]/route.ts
├── payments/
│   ├── khalti/
│   │   ├── initiate/route.ts             ← existing subscription
│   │   ├── verify/route.ts               ← existing subscription
│   │   └── course-verify/route.ts        ← NEW: PAID course purchase
│   └── esewa/
│       ├── initiate/route.ts
│       ├── verify/route.ts
│       └── course-verify/route.ts        ← NEW: PAID course purchase
```

---

## API Routes — Phase 15

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/courses` | Any auth | List (filter: pricingModel, subject, level, featured) |
| POST | `/api/courses` | TEACHER/ADMIN | Create (with pricingModel + price) |
| GET | `/api/courses/[id]` | Any auth | Detail (includes price, pricingModel) |
| PATCH | `/api/courses/[id]` | Creator/ADMIN | Edit (pricingModel/price changeable) |
| DELETE | `/api/courses/[id]` | Creator/ADMIN | Delete + cascade |
| POST | `/api/courses/[id]/enroll` | STUDENT | Enroll (FREE or SUBSCRIPTION_INCLUDED) |
| POST | `/api/courses/[id]/purchase/initiate` | STUDENT | Start payment for PAID course |
| POST | `/api/payments/khalti/course-verify` | STUDENT | Verify → enroll + credit teacher |
| POST | `/api/payments/esewa/course-verify` | STUDENT | Verify → enroll + credit teacher |
| GET | `/api/courses/[id]/progress` | Enrolled STUDENT | Full progress |
| GET | `/api/courses/[id]/sections` | Enrolled user | Sections + videos |
| POST | `/api/courses/[id]/sections` | Creator/ADMIN | Create section |
| PATCH | `/api/courses/[id]/sections/[sectionId]` | Creator/ADMIN | Edit |
| DELETE | `/api/courses/[id]/sections/[sectionId]` | Creator/ADMIN | Delete |
| POST | `/api/courses/[id]/videos` | Creator/ADMIN | Upload video |
| GET | `/api/courses/[id]/videos/[videoId]` | Enrolled user | Stream |
| PATCH | `/api/courses/[id]/videos/[videoId]` | Creator/ADMIN | Edit metadata |
| DELETE | `/api/courses/[id]/videos/[videoId]` | Creator/ADMIN | Delete |
| PATCH | `/api/courses/[id]/videos/[videoId]/progress` | Enrolled STUDENT | Update watch % |
| GET | `/api/courses/[id]/live-sessions` | Enrolled user | List sessions |
| POST | `/api/courses/[id]/live-sessions` | Creator/ADMIN | Schedule |
| PATCH | `/api/courses/[id]/live-sessions/[sessionId]` | Creator/ADMIN | Edit (Zoom link, status) |
| DELETE | `/api/courses/[id]/live-sessions/[sessionId]` | Creator/ADMIN | Cancel |
| POST | `/api/courses/[id]/live-sessions/[sessionId]/notify` | Creator/ADMIN | Send invites |
| POST | `/api/courses/[id]/live-sessions/[sessionId]/recording` | Creator/ADMIN | Add recording |
| POST | `/api/courses/coupons/validate` | STUDENT | Validate a code |
| GET | `/api/courses/coupons` | ADMIN | List all |
| POST | `/api/courses/coupons` | ADMIN | Create |
| PATCH | `/api/courses/coupons/[id]` | ADMIN | Toggle / edit |
| DELETE | `/api/courses/coupons/[id]` | ADMIN | Delete |

---

## Admin Config Reference

| Key | Description | Default |
|-----|-------------|---------|
| `coursePurchaseCommissionPercent` | Platform cut on PAID course sales | 20 |
| `courpZEAWYtiB6bJ16NuLbGCc6CZ6jJdKfb63` | Max video duration per upload | 60 |
| `courseProgressCompletionThreshold` | % watched to mark video complete | 90 |
| `liveSessionNotificationLeadMinutes` | Reminder lead time before session | 30 |
| `quizTimeLimitSeconds` | Per-quiz session timer | admin-set |
| `quizPassPercent` | Min % correct for quiz points | 90 |
| `quizPointReward` | Points on quiz pass | 5 |
| `quizQuestionCount` | Questions per session | 50 |
| `trialDays` | Free trial duration | 3 |
| `commissionPercent` | Platform cut on Q&A teacher earnings | admin-set |
| `qualificationThreshold` | Q&A answers before teacher monetizes | 10 |