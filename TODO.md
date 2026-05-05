# 📋 Web Backend — TODO

---

## 🔴 BLOCKING — Mobile App Backend Tasks (Must Complete FIRST)

> ⚠️ The mobile app developer CANNOT start until these are done.
> Reference: `MOBILE_APP_HANDOFF.md` and `MOBILE_APP_STEP_BY_STEP_PLAN.md`

### Task 1: Build JWT Mobile Login Endpoint ✅

**Route:** `POST /api/mobile/login`

- [x] Create `/app/api/mobile/login/route.ts`
- [x] Accept `{ email, password }` — validate credentials against User model
- [x] Handle Google OAuth token exchange (mobile sends Google ID token)
- [x] Generate JWT access token (15 min expiry), payload: `userId`, `role`, `email`, `name`
- [x] Generate JWT refresh token (30 day expiry), store in DB for revocation
- [x] Return response:
  ```json
  {
    "accessToken": "jwt...",
    "refreshToken": "jwt...",
    "user": {
      "id": "...",
      "name": "...",
      "email": "...",
      "role": "STUDENT|TEACHER|ADMIN",
      "isSuspended": false
    }
  }
  ```

### Task 2: Build JWT Refresh Endpoint ✅

**Route:** `POST /api/mobile/refresh`

- [x] Create `/app/api/mobile/refresh/route.ts`
- [x] Accept `{ refreshToken }` in body
- [x] Validate refresh token (not expired, not revoked, exists in DB)
- [x] Return `{ accessToken }` — new access token
- [x] If invalid/expired → return 401: `{ error: "Invalid or expired refresh token" }`

### Task 3: Add Bearer Token Auth to All API Routes ✅ (Core routes done)

- [x] Create shared helper `/lib/mobile-auth.ts` → `authenticateMobileRequest(req)`
  - Checks `Authorization: Bearer <token>` header → decodes JWT → returns user session
- [x] Create unified auth helper `/lib/unified-auth.ts` → `getAuthenticatedUser(req)`
  - Checks Bearer token first (mobile), falls back to session cookies (web)
  - Verifies user still exists and is not suspended
- [x] **Core mobile-facing routes migrated to unified auth:**
  - `POST /api/questions` (question creation)
  - `GET /api/channels` (channel list)
  - `GET /api/wallet` (wallet data)
  - `POST /api/wallet/withdraw` (withdrawal requests)
  - `POST /api/push/subscribe` (push subscription)
  - `POST /api/push/unsubscribe`
- [ ] **Routes still using `getServerSession` only (no Bearer support):**
  - All call routes (`/api/calls/*`) — see Task 7
  - `GET /api/questions/feed` — public endpoint, no auth needed ✓
  - `GET /api/platform/config` — public endpoint, no auth needed ✓
  - `GET /api/users/me` — does not exist yet, needs creation for mobile suspension checks
  - Various other routes (notifications, quiz, channel messages, etc.)

### Task 4: Add `platform` Field to PushSubscription Model ✅

- [x] Add field to schema: `platform: { type: String, enum: ["web", "ios", "android"], default: "web" }`
- [x] Default existing records to `"web"`
- [x] Update `POST /api/push/subscribe` to accept and store `platform` field (via `subscription.platform`)
- [ ] Update push notification sending logic to handle FCM tokens (Android) separately from web push — _see Task 6_

### Task 5: Provide Credentials to App Developer

- [ ] Pusher app key + cluster
- [ ] LiveKit server URL
- [ ] eSewa merchant ID
- [ ] Khalti public key
- [ ] Production API URL: `https://questioncall.com/api`

---

## 🟡 Needed Before Mobile Sprint 5 (Wallet & Push)

### Task 6: FCM Push Notification Support

- [ ] Install `firebase-admin` SDK
- [ ] Set up Firebase project + get service account key
- [ ] When sending push, check `platform` field:
  - `"web"` → existing web push
  - `"android"` → send via FCM
- [ ] Wire FCM for these events:
  - `withdrawal:processed`, `subscription:activated`, `monthly:bonus`, `daily:target`
  - `call:incoming` (high priority), `question:new`, `question:accepted`
  - Admin broadcast notices

---

## 🟡 Needed Before Mobile Sprint 7 (Calls)

### Task 7: Verify Call Routes Accept Bearer Auth

> All call routes currently use `getServerSession(authOptions)` only.
> They need to be migrated to `getAuthenticatedUser(request)` from `@/lib/unified-auth`.

- [ ] `POST /api/calls/create`
- [ ] `POST /api/calls/[id]/accept`
- [ ] `POST /api/calls/[id]/reject`
- [ ] `POST /api/calls/[id]/cancel`
- [ ] `POST /api/calls/[id]/end`
- [ ] `POST /api/calls/[id]/missed`
- [ ] `GET /api/calls/[id]/token`

---

## ✅ Completed Mobile Backend Tasks

### Task 1: Build JWT Mobile Login Endpoint ✅

- **Implementation:**
  - Created `/lib/mobile-auth.ts` with JWT token generation and verification utilities
  - Created `/models/RefreshToken.ts` for storing and tracking refresh tokens in DB
  - Created `/app/api/mobile/login/route.ts` with email/password and Google OAuth support
  - Installed `jsonwebtoken` and `google-auth-library` packages
  - Supports Bearer token validation through `authenticateMobileRequest()` helper
  - Properly handles user suspension checks and role assignment

### Task 2: Build JWT Refresh Endpoint ✅

- **Implementation:**
  - Created `/app/api/mobile/refresh/route.ts`
  - Accepts `{ refreshToken }`, validates against DB (revocation + expiry check)
  - Returns new `{ accessToken }` on success
  - Returns 401 with correct error message on failure
  - Also checks user suspension before issuing new access token

### Task 3: Bearer Token Auth — Unified Auth Helper ✅

- **Implementation:**
  - Created `/lib/unified-auth.ts` with `getAuthenticatedUser()`, `getAuthenticatedUserId()`, `getAuthenticatedUserRole()`
  - Tries Bearer token first (mobile), falls back to NextAuth session cookies (web)
  - Verifies user existence and suspension status on every request
  - Migrated core routes: questions, channels, wallet, wallet/withdraw, push/subscribe, push/unsubscribe

### Task 4: PushSubscription `platform` Field ✅

- **Implementation:**
  - Added `platform` enum field (`web`, `ios`, `android`) to PushSubscription model with `"web"` default
  - Push subscribe endpoint accepts `subscription.platform` and stores it

---

## 🐛 Bugs Fixed (2026-05-05)

### 🔴 CRITICAL: `POST /api/questions` — Crash on question creation

- **Problem:** The route was partially migrated from `getServerSession` to `getAuthenticatedUser` (unified auth), but the body still referenced an undefined `session` variable and illegally redeclared `const user` in the same scope. This caused a compile/runtime crash making question creation completely non-functional.
- **Fix:** Renamed DB user lookup to `dbUser`, replaced all `session.user.*` references with `user.*` (auth) or `dbUser.*` (DB fields).
- **File:** `/app/api/questions/route.ts`

### 🟡 MINOR: `GET /api/wallet` — `savedEsewaNumber` always returned `null`

- **Problem:** `user.esewaNumber` accessed the unified auth user object (which only has `{id, role, email, name, isSuspended}`), so `esewaNumber` was always `undefined → null`. The actual value was available on `dbUser`.
- **Fix:** Changed `user.esewaNumber` → `dbUser.esewaNumber` on the response.
- **File:** `/app/api/wallet/route.ts`

### 🟡 MINOR: `GET /api/wallet` — `totalPointsEarned` always used derived value

- **Problem:** `user.totalPointsEarned` was `undefined` (not on auth user), so `Math.max(0, derived)` always used the derived calculation, bypassing the stored DB value.
- **Fix:** Changed `user.totalPointsEarned` → `dbUser.totalPointsEarned`.
- **File:** `/app/api/wallet/route.ts`
