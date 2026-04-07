# Phase 2 — Question System + Feed Overhaul

Complete the question posting flow end-to-end: modal + dedicated page → API → MongoDB → Pusher broadcast → live feed with reactions & accept.

## User Review Required

> [!IMPORTANT]
> The inline composer (textarea) currently embedded in the home feed will be **removed**. Posting will only happen via:
> 1. **"Post Question" button in the header** → opens a modal
> 2. **`/ask/question` page** → full dedicated composer page
>
> The sidebar "Ask" link will point to `/ask/question` (the dedicated page).

> [!WARNING]
> The current feed is hydrated from **sample data** (`lib/questions/sample-feed.ts`). After this change, the feed will switch to fetching **real data from MongoDB** via `GET /api/questions/feed`. The sample data file will remain for fallback/dev but won't be used for initial hydration.

---

## Proposed Changes

### Types Directory — Centralize all shared types

Move question types out of `lib/question-types.ts` into `types/` and add new types needed across the app.

#### [NEW] [question.ts](file:///d:/siddhant-files/projects/LISTNERS/listeners/types/question.ts)
- Move `QuestionTier`, `AnswerVisibility`, `QuestionStatus`, `QuestionRecordShape`, `FeedQuestion` here
- Keep the `const` arrays (`QUESTION_TIERS`, etc.) in `lib/question-types.ts` since they're runtime values
- Add new types: `CreateQuestionPayload`, `QuestionReaction`, `AcceptQuestionPayload`
- Add `acceptedBy` optional fields to `FeedQuestion` (acceptor name, id, timestamp)

#### [MODIFY] [question-types.ts](file:///d:/siddhant-files/projects/LISTNERS/listeners/lib/question-types.ts)
- Remove type exports (move to `types/question.ts`), keep only the runtime `const` arrays
- Re-export types from `types/question.ts` for backward compatibility

---

### Question Model — Add `acceptedBy` field

#### [MODIFY] [Question.ts](file:///d:/siddhant-files/projects/LISTNERS/listeners/models/Question.ts)
- Add `acceptedById` (ObjectId ref to User, nullable)
- Add `acceptedAt` (Date, nullable)
- Add `reactions` field — array of `{ userId: ObjectId, type: "like" | "insightful" | "same_doubt" }`
- Import types from `types/question.ts`

---

### API Routes — Question CRUD

#### [NEW] [route.ts](file:///d:/siddhant-files/projects/LISTNERS/listeners/app/api/questions/route.ts)
- **POST** — create question: validate session (must be STUDENT), validate body (title, body, tier, visibility, optional subject/stream/level), save to MongoDB, increment user's `totalAsked`, broadcast via Pusher `emitQuestionCreated`, return the new question
- **GET** — alias to feed endpoint (optional, for simplicity)

#### [NEW] [route.ts](file:///d:/siddhant-files/projects/LISTNERS/listeners/app/api/questions/feed/route.ts)
- **GET** — fetch questions from MongoDB sorted by `resetCount desc, createdAt desc`, populate asker name/username, limit 50. Join reaction counts. Return as `FeedQuestion[]`

#### [NEW] [route.ts](file:///d:/siddhant-files/projects/LISTNERS/listeners/app/api/questions/[id]/accept/route.ts)
- **POST** — validate session (STUDENT or TEACHER), set question status to `ACCEPTED`, set `acceptedById` and `acceptedAt`, broadcast Pusher update. Only works if status is `OPEN` or `RESET`.

#### [NEW] [route.ts](file:///d:/siddhant-files/projects/LISTNERS/listeners/app/api/questions/[id]/react/route.ts)
- **POST** — toggle reaction (like/insightful/same_doubt) on a question. Add or remove userId from reactions array. Broadcast Pusher update.

---

### Post Question Modal Component

#### [NEW] [post-question-modal.tsx](file:///d:/siddhant-files/projects/LISTNERS/listeners/components/shared/post-question-modal.tsx)
- Full-featured modal with:
  - Title input (required, 6–180 chars)
  - Body textarea (required, 12–5000 chars)
  - Tier picker (radio group: Any / Tier I Text / Tier II Photo / Tier III Video)
  - Visibility toggle (Public / Private)
  - Optional subject, stream, level selects
  - Submit button with loading state
- On submit: POST to `/api/questions`, on success dispatch `prependFeedQuestion` to Redux, close modal, show toast
- Uses Sheet component (slides from right) for the modal experience

---

### Dedicated Ask Question Page — Rebuild

#### [MODIFY] [page.tsx](file:///d:/siddhant-files/projects/LISTNERS/listeners/app/(workspace)/ask/question/page.tsx)
- Convert from server component to client component
- Full premium question composer UI (not a placeholder)
- Same fields as modal but with more space: title, body (larger), tier, visibility, subject/stream/level
- Character counts, field validation feedback
- Preview card showing what the question will look like in the feed
- Submit → POST to `/api/questions` → redirect to feed with toast

---

### Header — Replace "Ask question" with "Post Question" (modal trigger)

#### [MODIFY] [authenticated-header.tsx](file:///d:/siddhant-files/projects/LISTNERS/listeners/components/shared/authenticated-header.tsx)
- Replace the `primaryHref` Link button with a button that opens the `PostQuestionModal`
- Keep for TEACHER role as "Open messages" link (unchanged)
- Import and render `PostQuestionModal`

#### [MODIFY] [workspace-shell.tsx](file:///d:/siddhant-files/projects/LISTNERS/listeners/components/shared/workspace-shell.tsx)
- Change `primaryLabel` from "Ask question" to "Post Question"
- `primaryHref` no longer needed for students (the button opens a modal, not a link)
- Pass a flag `useModalForPrimary` to the header

---

### Feed UI — Remove inline composer, add reactions + accept

#### [MODIFY] [workspace-home.tsx](file:///d:/siddhant-files/projects/LISTNERS/listeners/components/shared/workspace-home.tsx)
- **Remove** the inline "Start something new" composer block (lines 188–204)
- **Remove** the "Post question" / "Add image" / "Choose tier" buttons
- Switch initial hydration from `sampleFeedQuestions` to fetching `GET /api/questions/feed`
- Each feed card gets:
  - **Reaction buttons**: 👍 Like, 💡 Insightful, 🤔 Same doubt — POST to `/api/questions/[id]/react`
  - **Accept button**: prominent CTA below each OPEN question — POST to `/api/questions/[id]/accept`
  - **Accepted state**: when `status === "ACCEPTED"`, show "Question accepted — waiting for answer" banner with acceptor name, hide Accept button
- Feed cards show real reaction counts from the data

---

### Sidebar — Keep "Ask" link pointing to `/ask/question`

#### [MODIFY] [workspace-shell.tsx](file:///d:/siddhant-files/projects/LISTNERS/listeners/components/shared/workspace-shell.tsx)
- Sidebar "Ask" item stays, still links to `/ask/question` (the full page composer)
- No other sidebar changes needed

---

## Open Questions

> [!IMPORTANT]
> 1. **Reactions**: Should students be limited to one reaction type per question, or can they apply multiple (like + same_doubt)? I'll default to **one reaction per user per question** (toggle behavior).
> 2. **Accept eligibility**: Can the question asker accept their own question? I'll default to **no** — only other users can accept.
> 3. **Subject/Stream/Level options**: Keep the current hardcoded lists (`IT, Biology, Chemistry...`) or should these come from the DB? I'll keep them **hardcoded** for now.

---

## Verification Plan

### Automated Tests
- `npm run build` — verify no TypeScript or build errors after all changes
- Test the dev server with `npm run dev` and verify the UI in browser

### Manual Verification (Browser)
1. Open the app → home feed loads real questions from API (or empty state if DB is empty)
2. Click "Post Question" in header → modal opens with full form
3. Fill and submit → question appears at top of feed instantly
4. Navigate to `/ask/question` → full page composer, submit works the same
5. Click reaction buttons on a feed card → count updates
6. Click "Accept" on an OPEN question → status changes to "Accepted — waiting for answer"
7. Verify the inline composer is gone from the home feed
