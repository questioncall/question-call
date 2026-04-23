# QuestionCall — TODO

> **Last audited**: 2026-04-23  
> Priority: 🔴 Critical · 🟠 High · 🟡 Medium · 🟢 Low

---

## 🔴 Feature 1 — Global Incoming Calls

Incoming call events are currently emitted on the **channel** Pusher stream (`channel-{channelId}`) and only listened to inside `channel-chat.tsx` (line ~304). That means a user only sees an incoming call if they already have that specific chat open. The fix is to move call signaling to the global user-scoped stream (`user-{userId}`) that `workspace-shell.tsx` already subscribes to.

### 1.1 Backend — Call Lifecycle

- [x] 🔴 Add `RINGING` status to `CallSession.status` enum in [`models/CallSession.ts`](file:///d:/siddhant-files/projects/LISTNERS/listeners/models/CallSession.ts)
  - New enum: `CREATED → RINGING → ACTIVE → ENDED | REJECTED | MISSED`
- [x] 🔴 Change `emitIncomingCall()` in [`lib/pusher/pusherServer.ts`](file:///d:/siddhant-files/projects/LISTNERS/listeners/lib/pusher/pusherServer.ts#L133-L149) to publish on `user-{targetUserId}` instead of `channel-{channelId}`
- [x] 🔴 Create **`POST /api/calls/[id]/accept`** endpoint
  - Validate participant, transition status `RINGING → ACTIVE`
  - Emit `CALL_ACCEPTED_EVENT` on `user-{callerId}` so caller sees the accept
- [x] 🔴 Create **`POST /api/calls/[id]/reject`** endpoint
  - Transition status `RINGING → REJECTED`
  - Emit `CALL_REJECTED_EVENT` on `user-{callerId}`
  - Insert a "Missed call" or "Rejected call" system message into the channel
- [x] 🟠 Add **dismiss/timeout** logic (~30 s)
  - If neither accepted nor rejected within timeout, transition `RINGING → MISSED`
  - Insert a "Missed call" system message
  - Can be client-driven with a server fallback cron or webhook

### 1.2 Frontend — Global Incoming Call Modal

- [x] 🔴 Create `<IncomingCallOverlay />` component
  - Full-screen or top-layer modal with: caller name, caller avatar, audio/video badge, ringtone audio, accept & reject buttons
  - Mounted inside `workspace-shell.tsx`, not inside `channel-chat.tsx`
  - Auto-dismiss after ~30 s timeout
- [x] 🔴 Subscribe to `CALL_INCOMING_EVENT` on the **user Pusher channel** inside `workspace-shell.tsx` (currently line ~208)
- [x] 🔴 On **accept**: `POST /api/calls/[id]/accept` → `router.push(/calls/{id})`
- [x] 🔴 On **reject**: `POST /api/calls/[id]/reject` → dismiss overlay
- [x] 🟠 Deduplicate active incoming calls — do not stack multiple overlays for the same channel
- [x] 🟠 Remove the current `CALL_INCOMING_EVENT` listener from `channel-chat.tsx` (line ~304-322) since it will be handled globally

### 1.3 Frontend — Caller-Side Ringing State

- [x] 🟠 After `POST /api/calls/create`, show a "Ringing…" state before navigating to `/calls/{id}`
  - Listen for `CALL_ACCEPTED_EVENT` / `CALL_REJECTED_EVENT` on the user channel
  - On accept: proceed to LiveKit room page
  - On reject: toast notification, dismiss ringing UI
  - On timeout (~30 s): cancel call, show "No answer" toast
- [x] 🟡 Add a cancel button so the caller can abort before the callee picks up

### 1.4 System Messages

- [x] 🟠 On reject/missed/ended, insert a system message into the channel's message history with `callMetadata` so both users have call context
  - Already done for `ENDED` status in [`/api/calls/[id]/end`](file:///d:/siddhant-files/projects/LISTNERS/listeners/app/api/calls/%5Bid%5D/end/route.ts) — extend for `REJECTED` and `MISSED`

---

## 🔴 Feature 2 — Sender Message Delete

Currently there is no way to delete a sent message. The approach is **soft delete** so the timeline, moderation trace, and realtime consistency stay intact.

### 2.1 Schema Changes

- [x] 🔴 Add deletion fields to `Message` schema in [`models/Message.ts`](file:///d:/siddhant-files/projects/LISTNERS/listeners/models/Message.ts):
  ```
  isDeleted: Boolean (default false)
  deletedAt: Date (default null)
  deletedBy: ObjectId ref User (default null)
  ```
- [x] 🔴 Add `mediaPublicId` field to `Message` schema:
  ```
  mediaPublicId: String (default null)
  ```
  - The upload API already returns `public_id` (see [`/api/upload/route.ts:78`](file:///d:/siddhant-files/projects/LISTNERS/listeners/app/api/upload/route.ts#L74-L79)) but chat message creation currently only stores `mediaUrl`

### 2.2 Backend — Delete Endpoint

- [x] 🔴 Create **`DELETE /api/channels/[id]/messages/[messageId]`** endpoint
  - Authorize: only the original sender can delete
  - Soft-delete: set `isDeleted = true`, `deletedAt = now`, `deletedBy = userId`
  - If `mediaPublicId` exists, destroy the Cloudinary asset via `cloudinary.uploader.destroy()`
  - Clear `content` and `mediaUrl` to `""` / `null` in DB (defense in depth)
  - Emit `message:deleted` Pusher event on `channel-{channelId}` so both participants update in real-time
- [x] 🟠 Add `MESSAGE_DELETED_EVENT = "message:deleted"` to [`lib/pusher/events.ts`](file:///d:/siddhant-files/projects/LISTNERS/listeners/lib/pusher/events.ts)
- [x] 🟠 Add `emitMessageDeleted(channelId, messageId)` to [`lib/pusher/pusherServer.ts`](file:///d:/siddhant-files/projects/LISTNERS/listeners/lib/pusher/pusherServer.ts)

### 2.3 Backend — Persist `mediaPublicId` During Send

- [x] 🔴 Update **`POST /api/channels/[id]/messages`** in [`route.ts`](file:///d:/siddhant-files/projects/LISTNERS/listeners/app/api/channels/%5Bid%5D/messages/route.ts) to accept and persist `mediaPublicId` alongside `mediaUrl`
- [x] 🟠 Update **client upload flow** in [`channel-chat.tsx`](file:///d:/siddhant-files/projects/LISTNERS/listeners/components/shared/channel-chat.tsx) to read `public_id` from the upload response and include it in the message POST body

### 2.4 Frontend — Delete UI

- [x] 🔴 Add `ChatMessage` type fields: `isDeleted?: boolean` in [`types/channel.ts`](file:///d:/siddhant-files/projects/LISTNERS/listeners/types/channel.ts)
- [x] 🔴 Add delete action to message bubble (long-press / right-click / "…" menu) — sender only
- [x] 🔴 Render deleted messages as a greyed-out "This message was deleted" placeholder
  - Hide media preview, remove any download/open link
- [x] 🔴 Listen for `message:deleted` on the channel Pusher subscription in `channel-chat.tsx` and dispatch a Redux action to update the local message
- [x] 🟠 Add `deleteMessage` and `setMessageDeleted` actions to the `channel-slice` Redux store in [`store/features/channel/`](file:///d:/siddhant-files/projects/LISTNERS/listeners/store/features/channel)
- [x] 🟡 Ensure deleting the **latest message** does not break sidebar preview/unread behavior in `channels-slice`

### 2.5 Edge Cases

- [x] 🟡 Non-senders must not see a delete option in the UI
- [x] 🟡 Non-senders hitting the API directly should get `403 Forbidden`
- [x] 🟡 System messages and call-info messages should not be deletable

---

## 🟠 Infrastructure & DevOps

- [x] 🟠 Add rate-limiting to call create / accept / reject endpoints to prevent spam
- [x] 🟠 Add a server-side cron or background job to transition stale `RINGING` calls to `MISSED` after timeout (e.g. 60 s) — safety net for client timeout failures
- [x] 🟡 Add structured logging / monitoring for call lifecycle transitions
- [x] 🟡 Audit Pusher event payload sizes — incoming call payloads should include avatar URLs for the modal

---

## 🟡 Testing Checklist

> Automated smoke checks now run via `npm run test:calls` for token gating, caller/callee identity, incoming-call queue dedupe, and message-deletion policy.  
> Multi-user browser verification is still a live/manual pass.

### Global Incoming Calls
- [ ] User receives an incoming call while on Home, Profile, Messages, or any workspace page — not just inside the open channel
- [ ] Incoming call modal rings in real-time; can accept/reject without opening the chat first
- [ ] Caller sees ringing → accepted / rejected / missed / cancelled state correctly
- [ ] Joining a call still activates the existing LiveKit flow on `/calls/[id]`
- [ ] Concurrent incoming calls from different channels do not stack/conflict
- [ ] Timeout triggers missed-call handling cleanly

### Message Deletion
- [ ] Sender can delete text, image, video, and audio messages
- [ ] Recipient sees deletion instantly and can no longer open deleted media
- [ ] Non-senders cannot delete someone else's message (UI + API)
- [ ] Deleting the latest message does not break sidebar preview/unread behavior
- [ ] Cloudinary assets are destroyed when the message had a `mediaPublicId`
- [ ] System messages and call-info messages cannot be deleted

---

## 🟢 Future Considerations (Post-v1)

- [ ] 🟢 "Delete for me" vs "Delete for everyone" — current design is delete-for-both
- [ ] 🟢 Read receipts on the incoming call modal (e.g., "Ringing on 2 devices")
- [ ] 🟢 Push notifications for incoming calls (mobile PWA / FCM)
- [ ] 🟢 Call recording with consent banner
- [ ] 🟢 Group call support (> 2 participants)
- [ ] 🟢 Message edit (soft versioning with edit history)
- [ ] 🟢 Bulk message delete / clear chat history
- [ ] 🟢 Typing indicators on the global user channel
