# task.md — Phase 15: Course Management System

---

## ⚠️ MANDATORY LLM RULE

**Before writing a single line of application code for any chunk, the LLM MUST:**
1. Open this file
2. Mark the chunk `[IN PROGRESS]` with a timestamp
3. List every file it will create or modify
4. State its exit condition
5. After finishing, mark it `[DONE]` and list actual files touched

No exceptions. This enables safe, reviewable, incremental delivery.

---

## Chunk Map

| # | Name | Status | Depends On |
|---|------|--------|-----------|
| C1 | Data Models | `[ ]` | — |
| C2 | PlatformConfig Extension | `[ ]` | C1 |
| C3 | Core Course CRUD API | `[ ]` | C1, C2 |
| C4 | Section & Video Management API | `[ ]` | C3 |
| C5 | Enrollment & Access Gate API | `[ ]` | C3 |
| C6 | PAID Course Purchase Payment Flow | `[ ]` | C5 |
| C7 | Progress Tracking API | `[ ]` | C4, C5 |
| C8 | Live Session API + Notifications | `[ ]` | C4, C5 |
| C9 | Coupon System API | `[ ]` | C5 |
| C10 | Student UI — Browse, Enroll/Purchase, Watch | `[ ]` | C3–C7 |
| C11 | Teacher UI — Course Builder + Live Sessions | `[ ]` | C4, C8 |
| C12 | Admin UI — Dashboard, Analytics, Coupons | `[ ]` | C3–C9 |

---

## C1 — Data Models

**Status:** `[ ]`

**Goal:** Create all 9 Mongoose models. No API routes, no UI.

**Files to create:**
- `models/Course.ts`
- `models/CourseSection.ts`
- `models/CourseVideo.ts`
- `models/LiveSession.ts`
- `models/CourseEnrollment.ts`
- `models/VideoProgress.ts`
- `models/CourseCoupon.ts`
- `models/CourseCouponRedemption.ts`
- `models/CourseNotificationLog.ts`

**Files to modify:**
- `models/Transaction.ts` — add `"COURSE_PURCHASE"` and `"COURSE_SALE_CREDIT"` to the `type` enum, and add an optional `metadata: Record<string, any>` field (if not already present)

**Implementation rules:**
- All models use `mongoose.models.X || mongoose.model('X', schema)` (Next.js hot-reload safe).
- `Course.slug`: unique index, auto-generated in `pre('save')` hook from `title` using slugify logic (lowercase, replace spaces/special chars with `-`). Append a short random suffix if slug already exists.
- `Course.pricingModel`: enum `["FREE", "SUBSCRIPTION_INCLUDED", "PAID"]`. Required.
- `Course.price`: `Number | null`. Required if `pricingModel === "PAID"`, must be `null` otherwise — enforce in `pre('validate')` hook.
- `Course.liveSessionsEnabled`: `pre('save')` hook forces `false` whenever `pricingModel === "FREE"`.
- `Course.enrollmentCount`: default 0.
- `Course.totalDurationMinutes`: default 0.
- `CourseSection.totalVideos`, `totalDurationMinutes`: default 0.
- `CourseVideo.viewCount`: default 0.
- `CourseCoupon.usedCount`: default 0.
- `CourseEnrollment.accessType`: enum `["FREE", "SUBSCRIPTION", "COUPON", "PURCHASE"]`.
- `CourseEnrollment.pricePaid`: `Number | null` — price snapshot at purchase time.
- `CourseEnrollment.transactionId`: `ObjectId → Transaction | null`.
- **Indexes:**
  - `CourseEnrollment`: unique compound `{ courseId: 1, studentId: 1 }`
  - `VideoProgress`: unique compound `{ studentId: 1, videoId: 1 }`
  - `Course.slug`: unique
  - `CourseCoupon.code`: unique (use `collation: { locale: 'en', strength: 2 }` for case-insensitive)
  - `CourseSection`: index `{ courseId: 1, order: 1 }`
  - `CourseVideo`: index `{ sectionId: 1, order: 1 }`
  - `LiveSession`: index `{ courseId: 1, scheduledAt: -1 }`

**Exit condition:** All 9 new model files compile without TypeScript errors. `Transaction` model has new type values. All indexes defined.

---

## C2 — PlatformConfig Extension

**Status:** `[ ]`

**Depends on:** C1

**Goal:** Add 4 new course-related config fields to PlatformConfig without breaking existing admin routes.

**Files to modify:**
- `models/PlatformConfig.ts` — add 4 fields
- `lib/config.ts` — add seed defaults for 4 fields
- `app/api/admin/config/route.ts` — ensure new fields pass through GET/PUT

**New fields:**
```ts
courpZEAWYtiB6bJ16NuLbGCc6CZ6jJdKfb63: { type: Number, default: 60 }
courseProgressCompletionThreshold: { type: Number, default: 90 }
liveSessionNotificationLeadMinutes: { type: Number, default: 30 }
coursePurchaseCommissionPercent: { type: Number, default: 20 }
```

**Exit condition:** `GET /api/admin/config` returns all 4 new fields. `PUT /api/admin/config` persists changes to them. Existing fields unaffected.

---

## C3 — Core Course CRUD API

**Status:** `[ ]`

**Depends on:** C1, C2

**Goal:** API for creating, listing, viewing, editing, and deleting the top-level Course entity. No enrollment, video, or section logic here.

**Files to create:**
- `app/api/courses/route.ts` — GET (list) + POST (create)
- `app/api/courses/[id]/route.ts` — GET (detail) + PATCH (edit) + DELETE

**GET `/api/courses` — list:**
- Public (any auth).
- Query params: `pricingModel`, `subject`, `level`, `featured` (bool), `page`, `limit` (default 20).
- Non-admin: only `status: ACTIVE` courses returned.
- Admin: all statuses returned.
- Response fields: `_id`, `slug`, `title`, `subject`, `level`, `pricingModel`, `price`, `currency`, `status`, `isFeatured`, `thumbnailUrl`, `totalDurationMinutes`, `enrollmentCount`, `instructorName`, `instructorRole`, `startDate`, `expectedEndDate`.
- If requesting user is a student with an enrollment for a returned course: include `overallProgressPercent` for that course.

**POST `/api/courses` — create:**
- Auth: TEACHER or ADMIN.
- Body: `title`, `description`, `subject`, `level`, `pricingModel`, `price?`, `startDate?`, `expectedEndDate?`, `tags?`.
- Validate: if `pricingModel === "PAID"` then `price` must be a positive number.
- Set `instructorId`, `instructorName`, `instructorRole` from session.
- `status` defaults to `"DRAFT"`.
- `liveSessionsEnabled` defaults to `false` for FREE, `true` for others (can be toggled later).
- `thumbnailUrl` not set on create — added via PATCH.
- Return: full created course document.

**GET `/api/courses/[id]` — detail:**
- Public.
- Returns full course + sections array with their videos (without Cloudinary video URLs — those require enrollment and are gated in C5/video GET).
- For video items in sections: return `_id`, `title`, `durationMinutes`, `order`, `thumbnailUrl` only (no `videoUrl`).
- If requesting student is enrolled: include their `overallProgressPercent`.

**PATCH `/api/courses/[id]` — edit:**
- Auth: `instructorId` matches session OR ADMIN.
- Editable: `title`, `description`, `subject`, `level`, `pricingModel`, `price`, `status`, `isFeatured`, `thumbnailUrl`, `startDate`, `expectedEndDate`, `tags`, `liveSessionsEnabled`.
- If `pricingModel` changed to `"FREE"`: force `liveSessionsEnabled = false`.
- If `pricingModel` changed away from `"PAID"`: set `price = null`.
- `slug` is NOT editable after creation.
- `instructorId` / `instructorName` / `instructorRole` NOT editable via this route (use admin reassign in future).

**DELETE `/api/courses/[id]`:**
- Auth: `instructorId` matches session OR ADMIN.
- Cascade delete (in order): `VideoProgress`, `CourseEnrollment`, `CourseNotificationLog`, `LiveSession`, `CourseVideo`, `CourseSection`, then `Course`.
- For each `CourseVideo` with a `cloudinaryPublicId`: call Cloudinary delete API (`resource_type: video`) before deleting the DB record.
- If `Course.thumbnailUrl` exists: delete from Cloudinary too.
- Return: `{ deleted: true, courseId }`.

**Exit condition:** All 5 HTTP methods work. TEACHER creates/edits/deletes own course. ADMIN does anything. Cascade delete verified (child counts = 0 after delete). Pricing validation enforced.

---

## C4 — Section & Video Management API

**Status:** `[ ]`

**Depends on:** C3

**Goal:** Full CRUD for sections and videos within a course, including Cloudinary video upload with duration enforcement.

**Files to create:**
- `app/api/courses/[id]/sections/route.ts` — GET + POST
- `app/api/courses/[id]/sections/[sectionId]/route.ts` — PATCH + DELETE
- `app/api/courses/[id]/sections/[sectionId]/reorder/route.ts` — PATCH (reorder videos)
- `app/api/courses/[id]/videos/route.ts` — POST (upload)
- `app/api/courses/[id]/videos/[videoId]/route.ts` — GET + PATCH + DELETE

**Section GET:** sections sorted by `order` asc, each populated with its videos sorted by `order` asc. Returns `title`, `description`, `order`, `totalVideos`, `totalDurationMinutes` + video stubs (no `videoUrl`).

**Section POST:** auth = creator/ADMIN. Auto-set `order = maxExistingOrder + 1`.

**Section PATCH:** editable = `title`, `description`, `order`. If `order` changes, reindex siblings.

**Section DELETE:**
- Delete all `CourseVideo` docs in this section (and their Cloudinary assets).
- Delete `VideoProgress` docs for those videos.
- Subtract removed `totalDurationMinutes` from `Course.totalDurationMinutes`.
- Update all `CourseEnrollment.totalVideoCount -= removedVideoCount`.
- Delete the `CourseSection` doc.
- Reindex remaining sections (order becomes 1..N).

**Section reorder PATCH:** body `{ videoIds: string[] }`. Re-assign `order` 1..N per position.

**Video upload POST (`/api/courses/[id]/videos`):**
- Auth: course creator or ADMIN.
- Multipart form-data: `file` (video), `title`, `description?`, `sectionId`, `order?`.
- Upload to Cloudinary `resource_type: video`. Store `cloudinaryPublicId`.
- Extract `durationMinutes` from Cloudinary response (`duration` field in seconds → divide by 60).
- Fetch `config.courpZEAWYtiB6bJ16NuLbGCc6CZ6jJdKfb63` via `getPlatformConfig()`.
- If `durationMinutes > max`:
  - `await cloudinary.uploader.destroy(publicId, { resource_type: 'video' })` — delete immediately.
  - Return 400: `{ error: "Video exceeds maximum duration of X minutes" }`.
- Create `CourseVideo` doc.
- `CourseSection.totalVideos += 1`, `totalDurationMinutes += durationMinutes`.
- `Course.totalDurationMinutes += durationMinutes`.
- `CourseEnrollment` — update all enrollments for this course: `totalVideoCount += 1` (bulk update).

**Video GET (`/api/courses/[id]/videos/[videoId]`):**
- Auth: enrolled student, course creator, or ADMIN. Use `checkCourseAccess()` from C5.
- Returns full video including `videoUrl`.
- Fire-and-forget: `CourseVideo.viewCount += 1` (no await, background update).

**Video PATCH:** editable = `title`, `description`, `order`, `sectionId` (move to different section — update old and new section counters).

**Video DELETE:**
- Delete Cloudinary asset.
- Delete `VideoProgress` docs for this video.
- `CourseSection.totalVideos -= 1`, `totalDurationMinutes -= durationMinutes`.
- `Course.totalDurationMinutes -= durationMinutes`.
- `CourseEnrollment` bulk update: `totalVideoCount -= 1`.

**Exit condition:** Creator can CRUD sections, upload videos (duration enforced), reorder. All denormalised counters (section totals, course total, enrollment totalVideoCount) stay accurate.

---

## C5 — Enrollment & Access Gate API

**Status:** `[ ]`

**Depends on:** C3

**Goal:** Enrollment for FREE and SUBSCRIPTION_INCLUDED courses, coupon validation, and a shared access check utility.

**Files to create:**
- `app/api/courses/[id]/enroll/route.ts` — POST
- `app/api/courses/coupons/validate/route.ts` — POST
- `lib/course-access.ts` — `checkCourseAccess(userId, courseId): Promise<boolean>`

**`lib/course-access.ts`:**
```ts
export async function checkCourseAccess(userId: string, courseId: string): Promise<boolean>
// Returns true if:
//   - User is the course instructor
//   - User is ADMIN
//   - A CourseEnrollment exists for { studentId: userId, courseId }
// Returns false otherwise
```
This is used by video GET (C4), progress routes (C7), and live session detail.

**Enroll POST (`/api/courses/[id]/enroll`):**
- Auth: STUDENT only.
- Check idempotency: if `CourseEnrollment` already exists for `{ courseId, studentId }` → return existing enrollment (200, not 201).
- If `course.pricingModel === "PAID"`: return 400 `{ error: "PAID_COURSE_USE_PURCHASE_FLOW" }`. PAID enrollment happens via the payment verify handler (C6), not here.
- Body: `{ couponCode?: string }`.
- If `couponCode` provided:
  - Validate via coupon logic (see below).
  - If valid → create enrollment `accessType: "COUPON"`.
  - Increment `coupon.usedCount`. Create `CourseCouponRedemption`.
- Else if `course.pricingModel === "FREE"`:
  - Create enrollment `accessType: "FREE"`.
- Else if `course.pricingModel === "SUBSCRIPTION_INCLUDED"` and `user.subscriptionStatus === "ACTIVE"`:
  - Create enrollment `accessType: "SUBSCRIPTION"`.
- Else:
  - Return 403 `{ reason: "SUBSCRIPTION_REQUIRED" }`.
- On enrollment creation: set `totalVideoCount` = current `CourseVideo` count for this course. Increment `Course.enrollmentCount`.
- Return `{ enrolled: true, accessType, enrollmentId }`.

**Coupon validation logic (shared, used by enroll and C9 purchase):**
```
Find CourseCoupon by { code: caseInsensitive }
Validate in order:
  1. coupon.isActive === true
  2. coupon.expiryDate === null OR coupon.expiryDate > now
  3. coupon.usageLimit === null OR coupon.usedCount < coupon.usageLimit
  4. coupon.scope === "GLOBAL" OR (scope === "COURSE" AND coupon.courseId === targetCourseId)
  5. No existing CourseCouponRedemption for { studentId, couponId, courseId }
Return { valid: true, couponId } or { valid: false, reason: string }
```

**`POST /api/courses/coupons/validate`:**
- Auth: STUDENT.
- Body: `{ code: string, courseId: string }`.
- Runs the validation logic above, returns result without enrolling.

**Exit condition:** Free auto-enroll works. Subscription-included enroll works. PAID enroll returns the correct error. Coupon validation catches all invalid cases. `checkCourseAccess` returns correct boolean for all user types.

---

## C6 — PAID Course Purchase Payment Flow

**Status:** `[ ]`

**Depends on:** C5

**Goal:** Initiate and verify Khalti/eSewa payments for PAID courses. On verify: enroll student + credit teacher wallet atomically.

**Files to create:**
- `app/api/courses/[id]/purchase/initiate/route.ts` — POST
- `app/api/payments/khalti/course-verify/route.ts` — POST
- `app/api/payments/esewa/course-verify/route.ts` — POST

**Initiate (`POST /api/courses/[id]/purchase/initiate`):**
- Auth: STUDENT.
- Validate: `course.pricingModel === "PAID"` and `course.price > 0`.
- Check no existing `CourseEnrollment` (idempotent guard).
- Fetch `config = getPlatformConfig()`.
- Create `Transaction`:
  ```ts
  {
    userId: studentId,
    type: "COURSE_PURCHASE",
    amount: course.price,
    status: "PENDING",
    metadata: {
      courseId: course._id.toString(),
      courseName: course.title,
      instructorId: course.instructorId.toString(),
      pricingModel: "PAID",
      grossAmount: course.price,
      commissionPercent: config.coursePurchaseCommissionPercent,  // snapshot NOW
      netAmount: course.price * (1 - config.coursePurchaseCommissionPercent / 100),
    }
  }
  ```
- Call Khalti or eSewa initiation (same pattern as Phase 6 subscription flow).
- Store `transactionId` in payment metadata/return_url so verify handler can retrieve it.
- Return payment URL/payload.

**Verify — Khalti (`POST /api/payments/khalti/course-verify`):**
- Auth: STUDENT.
- Verify payment with Khalti SDK (same as Phase 6).
- On SUCCESS — run atomically (use a session/transaction if possible, or sequential with rollback logging):
  1. `Transaction.status = "COMPLETED"`.
  2. Check again no existing `CourseEnrollment` (race condition guard).
  3. Create `CourseEnrollment`:
     ```ts
     { accessType: "PURCHASE", transactionId, pricePaid: course.price,
       totalVideoCount: currentVideoCount }
     ```
  4. `Course.enrollmentCount += 1`.
  5. Read `commissionPercent` from `transaction.metadata.commissionPercent` (the snapshot, NOT a fresh `getPlatformConfig()` call — this ensures the teacher is paid based on what was shown at purchase time).
  6. `teacherEarnings = course.price × (1 - commissionPercent / 100)`.
  7. `User.walletBalance += teacherEarnings` (instructor).
  8. Create `Transaction`:
     ```ts
     { userId: instructorId, type: "COURSE_SALE_CREDIT",
       amount: teacherEarnings, status: "COMPLETED",
       metadata: { courseId, studentId, grossAmount, commissionPercent, netAmount: teacherEarnings } }
     ```
- On FAILURE: `Transaction.status = "FAILED"`.
- Return redirect URL or JSON result (match Phase 6 pattern).

**eSewa verify:** same logic, eSewa SDK.

**Important:** The commission % used for the teacher payment comes from `transaction.metadata.commissionPercent` (frozen at initiation time), NOT a fresh config read. This prevents a scenario where admin changes the commission % between initiation and verification, causing a discrepancy between what the student was shown and what the teacher receives.

**Exit condition:** Student clicks Buy → redirected to Khalti/eSewa → pays → redirected back → enrolled → teacher wallet credited → both Transactions exist with COMPLETED status. Commission calculation uses the snapshot, not live config.

---

## C7 — Progress Tracking API

**Status:** `[ ]`

**Depends on:** C4, C5

**Goal:** Record per-video watch progress and return aggregated section + overall progress.

**Files to create:**
- `app/api/courses/[id]/videos/[videoId]/progress/route.ts` — PATCH + GET
- `app/api/courses/[id]/progress/route.ts` — GET

**PATCH progress (`/api/courses/[id]/videos/[videoId]/progress`):**
- Auth: enrolled student only — call `checkCourseAccess()`.
- Body: `{ watchedPercent: number }` (0–100, clamp if out of range).
- Upsert `VideoProgress` by `{ studentId, videoId }`. Set `watchedPercent`, `lastWatchedAt`.
- Set `firstWatchedAt` only on insert (not update).
- Fetch `config.courseProgressCompletionThreshold`.
- If new `watchedPercent >= threshold` AND previous `isCompleted === false`:
  - Set `isCompleted = true`, `completedAt = now`.
  - `CourseEnrollment.completedVideoCount += 1`.
  - Recompute: `overallProgressPercent = Math.round(completedVideoCount / totalVideoCount * 100)`.
- Return: `{ watchedPercent, isCompleted, overallProgressPercent, sectionProgressPercent }`.
- `sectionProgressPercent`: count completed videos in this section / total videos in section × 100.

**GET full progress (`/api/courses/[id]/progress`):**
- Auth: enrolled student only.
- Returns:
  ```ts
  {
    overallProgressPercent: number,
    completedVideoCount: number,
    totalVideoCount: number,
    sections: [
      {
        sectionId: string,
        sectionTitle: string,
        order: number,
        sectionProgressPercent: number,
        videos: [
          {
            videoId: string,
            title: string,
            durationMinutes: number,
            order: number,
            watchedPercent: number,    // 0 if no VideoProgress record
            isCompleted: boolean,
            lastWatchedAt: Date | null
          }
        ]
      }
    ]
  }
  ```
- Fetch all sections + videos for course. Fetch all `VideoProgress` for `{ studentId, courseId }`. Merge.

**Exit condition:** Client PATCH every 30s updates progress. On threshold, `isCompleted` flips and `overallProgressPercent` updates. Full GET returns merged section/video breakdown with zeroes for unwatched.

---

## C8 — Live Session API + Notifications

**Status:** `[ ]`

**Depends on:** C4, C5

**Goal:** Schedule live sessions, send Email + WhatsApp invites to enrolled students, manage status, add recordings post-session.

**Files to create:**
- `app/api/courses/[id]/live-sessions/route.ts` — GET + POST
- `app/api/courses/[id]/live-sessions/[sessionId]/route.ts` — GET + PATCH + DELETE
- `app/api/courses/[id]/live-sessions/[sessionId]/notify/route.ts` — POST
- `app/api/courses/[id]/live-sessions/[sessionId]/recording/route.ts` — POST
- `lib/notifications/email.ts` — `sendLiveSessionEmail(student, session, course)`
- `lib/notifications/whatsapp.ts` — `sendLiveSessionWhatsApp(student, session, course)`

**Session create (`POST /api/courses/[id]/live-sessions`):**
- Auth: creator/ADMIN.
- Gate: `course.pricingModel !== "FREE"` AND `course.liveSessionsEnabled === true`. Return 400 otherwise.
- Body: `title`, `scheduledAt`, `durationMinutes?`, `sectionId?`.
- Status defaults to `"SCHEDULED"`.

**Session update PATCH:**
- Editable: `title`, `scheduledAt`, `durationMinutes`, `sectionId`, `zoomLink`, `status`.
- Status transitions enforced: SCHEDULED → LIVE → ENDED only. CANCELLED from any state. No backwards transitions.

**Notify POST (`/api/courses/[id]/live-sessions/[sessionId]/notify`):**
- Auth: creator/ADMIN.
- Fetch all `CourseEnrollment` for `courseId`. Populate `studentId` (name, email, phone).
- For each student: call `sendLiveSessionEmail()` + `sendLiveSessionWhatsApp()`.
- Create one `CourseNotificationLog` per student (SENT or FAILED).
- Set `liveSession.notificationsSent = true`, `notificationSentAt = now`.
- Return `{ sent: number, failed: number, total: number }`.

**`lib/notifications/email.ts`:**
- Use Nodemailer. Env: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`.
- HTML email using template from README Section 15.10.
- `try/catch` — never throws. Returns `{ success: boolean, error?: string }`.

**`lib/notifications/whatsapp.ts`:**
- Use Twilio. Env: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM`.
- Skip silently (return `{ success: false, reason: "NO_PHONE" }`) if `user.phone` is missing.
- `try/catch` — never throws.

**Recording POST (`/api/courses/[id]/live-sessions/[sessionId]/recording`):**
- Auth: creator/ADMIN.
- Session must have `status === "ENDED"`.
- Body: `{ method: "UPLOAD" | "ZOOM_LINK" | "ZOOM_API", ... }`.
- **UPLOAD:** multipart file → Cloudinary video upload → same duration enforcement as C4.
- **ZOOM_LINK:** body `{ recordingUrl: string }` → store directly. No Cloudinary upload.
- **ZOOM_API:** call `GET https://api.zoom.us/v2/meetings/{meetingId}/recordings` with instructor OAuth token from env. Extract download URL. Store directly.
- After resolving `recordingUrl`:
  - Set `liveSession.recordingMethod`, `recordingUrl`, `recordingAddedAt`.
  - If `session.sectionId` is set:
    - Create `CourseVideo` `{ isLiveRecording: true, liveSessionId, videoUrl: recordingUrl, ... }`.
    - Update section + course `totalDurationMinutes`.
    - Bulk update `CourseEnrollment.totalVideoCount += 1`.
    - Set `liveSession.courseVideoId = newVideo._id`.
- Return `{ courseVideo? }` or `{ recordingUrl }`.

**Exit condition:** Teacher can schedule, add Zoom link, notify all enrolled students (email + WhatsApp logs created), update status through transitions, add recording via any of 3 methods. Recording becomes a watchable `CourseVideo` in the course.

---

## C9 — Coupon System API

**Status:** `[ ]`

**Depends on:** C5

**Goal:** Admin CRUD for coupons. Validation endpoint is already in C5 — this chunk is admin management only.

**Files to create:**
- `app/api/courses/coupons/route.ts` — GET (list) + POST (create), ADMIN only
- `app/api/courses/coupons/[id]/route.ts` — PATCH + DELETE, ADMIN only

**GET list:**
- Auth: ADMIN.
- Returns all coupons + `redemptionCount` (from `CourseCouponRedemption` count per coupon).
- Filter params: `isActive`, `scope`, `courseId`.

**POST create:**
- Auth: ADMIN.
- Body: `code`, `scope`, `courseId?` (required if scope=COURSE), `usageLimit?`, `expiryDate?`.
- `type` is hardcoded to `"FULL_ACCESS"` — never taken from body.
- `isActive` defaults to `true`.
- Normalise `code` to UPPERCASE before saving.
- Unique check on `code` (case-insensitive): return 409 if duplicate.
- `createdBy` = admin's session userId.

**PATCH edit:**
- Editable: `isActive`, `usageLimit`, `expiryDate`, `code`.
- `scope`, `courseId`, `type` NOT editable after creation.

**DELETE:**
- Auth: ADMIN.
- Delete `CourseCouponRedemption` records for this coupon, then delete `CourseCoupon`.
- Return `{ deleted: true }`.

**Exit condition:** Admin can create coupons, list them with redemption counts, toggle active, edit limits/expiry, and delete. Duplicate codes rejected. Coupon works end-to-end: validate → enroll route in C5 uses it and increments usedCount.

---

## C10 — Student UI: Browse, Enroll/Purchase, Watch, Progress

**Status:** `[ ]`

**Depends on:** C3–C7

**Goal:** All student-facing pages for the course system.

**Files to create:**
- `app/(workspace)/courses/page.tsx`
- `app/(workspace)/courses/[slug]/page.tsx`
- `app/(workspace)/courses/[slug]/watch/[videoId]/page.tsx`
- `app/(workspace)/courses/my/page.tsx`
- `components/course/CourseCard.tsx`
- `components/course/PricingGate.tsx`
- `components/course/VideoPlayer.tsx`
- `components/course/SectionAccordion.tsx`
- `components/course/ProgressRing.tsx`

**Course Library (`/courses`):**
- Filter bar: `pricingModel` (All / Free / Subscription / Paid), subject, level.
- Grid of `CourseCard`:
  - Thumbnail, title, instructor name + role badge.
  - Price badge: `FREE` tag / `SUBSCRIPTION` tag / `NPR [price]` (for PAID).
  - Total duration, enrollment count.
  - If enrolled: progress bar showing `overallProgressPercent`.
- Featured courses in a pinned row at top.

**Course Detail (`/courses/[slug]`):**
- Header: thumbnail, title, instructor, subject/level, duration, enrollment count.
- Price display: `Free` / `Included in Subscription` / `NPR [price]`.
- Tab: Overview (description, dates, tags).
- Tab: Content — `SectionAccordion` with all videos listed (title, duration, completion check). Video playback gated by enrollment.
- Tab: Live Sessions — upcoming sessions with date, time, Zoom link if enrolled.
- Enroll / Access CTA (bottom of header, always visible):
  - `FREE` → "Start Learning" → POST `/enroll` → redirect to first video.
  - `SUBSCRIPTION_INCLUDED` + active subscriber → "Start Learning" → POST `/enroll`.
  - `SUBSCRIPTION_INCLUDED` + no subscription → `PricingGate` (subscribe CTA + coupon input).
  - `PAID` + already purchased → "Continue Learning" → last watched video.
  - `PAID` + not purchased → `PricingGate` (price display + "Buy Now" + coupon input).

**`PricingGate` component:**
- Receives `pricingModel`, `price`, `courseId`.
- For SUBSCRIPTION_INCLUDED: shows "Subscribe to access" CTA linking to `/subscription`. Below it: coupon input.
- For PAID: shows `NPR [price]` prominently. "Buy Now" button → triggers Khalti or eSewa payment initiation (payment method picker, same UI as subscription). Below it: coupon input.
- Coupon input: text field + "Apply" button → calls `POST /api/courses/coupons/validate` → if valid, calls `POST /api/courses/[id]/enroll` with couponCode → redirect to first video.

**Video Player (`/courses/[slug]/watch/[videoId]`):**
- Auth guard: calls `checkCourseAccess` — redirect to course detail if not enrolled.
- Cloudinary video player (use `cloudinary-video-player` or simple `<video>` tag with HLS).
- Every 30 seconds: `PATCH /api/courses/[id]/videos/[videoId]/progress` with `{ watchedPercent }` (get from player `currentTime / duration × 100`).
- On video `ended` event: send `{ watchedPercent: 100 }`.
- Left sidebar: `SectionAccordion` showing all sections + videos. Current video highlighted. Completed videos show a checkmark. Clicking any video navigates to its watch page.
- Top header: course title + overall progress bar (`overallProgressPercent`).
- "Next Video" button: navigates to the next video in section order (or first of next section).

**My Courses (`/courses/my`):**
- Lists all `CourseEnrollment` for the logged-in student.
- Two sections: "In Progress" (overallProgressPercent < 100) and "Completed" (= 100).
- Each course: thumbnail, title, pricingModel badge, progress bar, "Resume" button → last unwatched video or first video.

**Exit condition:** Student can browse, see correct price/access badge, gate works for all 3 pricing models, coupon unlocks access, video player sends progress, My Courses page shows accurate progress.

---

## C11 — Teacher UI: Course Builder + Live Session Manager

**Status:** `[ ]`

**Depends on:** C4, C8

**Goal:** Teacher pages for creating courses, managing sections/videos, and running live sessions.

**Files to create:**
- `app/(workspace)/upload-course/page.tsx`
- `app/(workspace)/courses/[slug]/manage/page.tsx`
- `components/course/SectionEditor.tsx`
- `components/course/VideoUploadCard.tsx`
- `components/course/LiveSessionManager.tsx`
- `components/course/PricingModelForm.tsx`

**Course Creator Wizard (`/upload-course`):**
- Step 1: Basic Info — title, description, subject, level, tags, startDate, expectedEndDate.
- Step 2: Pricing — `PricingModelForm`:
  - Radio: Free / Subscription / Paid.
  - If Paid: price input (NPR). Live preview:
    - "Platform commission (X%): NPR Y"
    - "You receive per sale: NPR Z"
    - X = fetched from `GET /api/admin/config` (`coursePurchaseCommissionPercent`).
    - Y and Z computed client-side from entered price.
- Step 3: Thumbnail — image upload to Cloudinary (via presigned URL or API route).
- Step 4: Review + Publish — confirm all details, choose status (DRAFT or ACTIVE).
- On submit: POST `/api/courses` → redirect to `/courses/[slug]/manage`.

**`PricingModelForm` component:**
- Reusable in both wizard (C11) and admin course edit (C12).
- Props: current values, commission percent, onChange handler.
- Validates price > 0 when PAID selected.

**Course Management Dashboard (`/courses/[slug]/manage`):**
- Accessible only to `instructorId` or ADMIN.
- Tab: Details — inline edit of all course metadata including `PricingModelForm`.
- Tab: Content:
  - `SectionEditor`: drag-to-reorder sections (react-dnd or @dnd-kit). Add section inline.
  - Expand section: show videos with drag handles for reorder. `VideoUploadCard` per video.
  - `VideoUploadCard`: shows upload progress bar, duration after upload, title edit, delete.
  - "Add Video" triggers file picker → POST `/api/courses/[id]/videos` with progress indicator.
- Tab: Live Sessions — `LiveSessionManager`:
  - List sessions with status badges (SCHEDULED / LIVE / ENDED / CANCELLED).
  - "Schedule Session" → modal (title, date/time, duration, section link).
  - Edit session: add Zoom link input, status change dropdown.
  - "Send Invite" button → confirmation showing enrolled count → POST `/notify` → toast with sent/failed count.
  - "Add Recording" button (only on ENDED sessions) → 3-option modal:
    - Upload File: file picker + upload progress.
    - Zoom Link: URL text input.
    - Fetch from Zoom: one-click button (shows spinner, requires `ZOOM_CLIENT_ID` configured).
- Tab: Analytics — enrolled count, completion rate, most-watched video title + view count.

**Exit condition:** Teacher can complete the full wizard (all 4 steps), manage sections/videos (upload, reorder, delete), schedule and manage live sessions end-to-end (notify → add recording → video appears in course).

---

## C12 — Admin UI: Dashboard, Analytics, Coupons

**Status:** `[ ]`

**Depends on:** C3–C9

**Goal:** Admin-facing pages for platform-wide course oversight, revenue analytics, and coupon management.

**Files to create:**
- `app/(admin)/admin/courses/page.tsx`
- `app/(admin)/admin/courses/[id]/page.tsx`
- `app/(admin)/admin/courses/coupons/page.tsx`
- `app/(admin)/admin/live-sessions/page.tsx`
- `components/admin/CourseAnalyticsCard.tsx`
- `components/admin/CouponTable.tsx`
- `components/admin/CoursesTable.tsx`

**All Courses page (`/admin/courses`):**
- Summary cards (top row):
  - Total Active Courses (FREE / SUBSCRIPTION_INCLUDED / PAID breakdown)
  - Total Enrolled Students
  - Total Course Revenue (sum of COURSE_PURCHASE transactions)
  - Platform Commission Earned (sum of grossAmount - netAmount from metadata)
- `CoursesTable`: all courses including DRAFT/ARCHIVED.
  - Columns: Title, pricingModel (with price if PAID), Status, Instructor, Enrolled, Avg Completion %, isFeatured, Created.
  - Actions per row: Edit (→ `/admin/courses/[id]`), Feature/Unfeature toggle, Archive, Delete.
- "Create Course" button → `/upload-course` (admin session).

**Course Edit (`/admin/courses/[id]`):**
- Full edit form for any course — same fields as teacher manage page but admin can change `instructorId` (reassign) and override `status` to any value.
- Uses `PricingModelForm` for pricing (C11 component, reused here).

**Admin Analytics (per course, expandable in table or on edit page):**
- Enrollment over time — recharts `LineChart` of `enrolledAt` by day.
- Enrollment by `accessType` — bar or pie (FREE / SUBSCRIPTION / COUPON / PURCHASE).
- Revenue from PURCHASE enrollments for this course.
- Top 5 most-watched videos (by `viewCount`).
- Live session notification delivery rate.
- Active coupons for this course + redemption counts.

**Coupon Management (`/admin/courses/coupons`):**
- `CouponTable`: Code, Type, Scope, Course (link if COURSE scope), Usage (usedCount / usageLimit or "∞"), Expiry, Status badge, Redemptions, Actions (Toggle Active, Delete).
- "Create Coupon" modal:
  - Code input + "Auto-generate" button (generates a random 8-char uppercase code).
  - Scope picker (Course / Global).
  - If Course: course search/select dropdown.
  - Usage limit (number input or "Unlimited" toggle).
  - Expiry date picker (or "Never expires" toggle).
- Toggle active/inactive inline (PATCH `/api/courses/coupons/[id]`).
- Delete with confirmation dialog.

**Live Sessions (`/admin/live-sessions`):**
- Table: all sessions across all courses.
  - Columns: Course, Session Title, Instructor, Scheduled, Status, Notified, Notification Rate, Recording Added.
- Filter: status, date range, courseId.
- Each row links to the course manage page.

**Exit condition:** Admin sees all courses with revenue metrics, can edit any course (including pricing), manage coupons (full CRUD), and monitor all live sessions across the platform.

---

## Environment Variables Required

```env
# Email (Nodemailer / Resend)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM="Question Hub <noreply@yourdomain.com>"

# WhatsApp — Twilio
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886

# Zoom API (optional — only needed for Method C recording)
ZOOM_CLIENT_ID=
ZOOM_CLIENT_SECRET=
ZOOM_ACCOUNT_ID=

# Cloudinary (confirm these already exist from Phase 4)
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

---

## Definition of Done — Phase 15

- [ ] All 9 Mongoose models created with correct indexes (C1)
- [ ] Transaction model has 2 new type values + metadata field (C1)
- [ ] PlatformConfig has 4 new fields including `coursePurchaseCommissionPercent` (C2)
- [ ] Course CRUD API with pricing validation (C3)
- [ ] Section + video management with duration enforcement and counter sync (C4)
- [ ] Enrollment works for FREE, SUBSCRIPTION_INCLUDED (sub + coupon), PAID returns correct error (C5)
- [ ] `checkCourseAccess` utility works correctly (C5)
- [ ] PAID course purchase flow: initiate → pay → verify → enroll + teacher credit (C6)
- [ ] Commission uses frozen snapshot from Transaction metadata on verify (C6)
- [ ] Progress: per-video PATCH, threshold flip, section + overall % accurate (C7)
- [ ] Live sessions: create, Zoom link, notify (email + WhatsApp), status transitions, recording (all 3 methods) (C8)
- [ ] Coupon CRUD (admin), used by enroll route, with redemption tracking (C9)
- [ ] Student UI: browse with price badges, gate for all 3 models, coupon unlock, video player with progress, My Courses (C10)
- [ ] Teacher UI: 4-step wizard with pricing preview, section/video manager, live session manager (C11)
- [ ] Admin UI: all-courses table with revenue, per-course analytics, coupon table, live sessions monitor (C12)
- [ ] All new env variables in `.env.example`
- [ ] Phase 11 polish applied to all new pages: loading skeletons, empty states, mobile responsive, toasts