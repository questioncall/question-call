# PWA And Notification Handoff

This file is a clean handoff for another model or developer.

It lists:

- what was added for PWA + push
- where the code lives
- what is currently working
- what is currently broken
- what likely needs to be debugged next

## Short Status

The repo now has a **manual PWA setup** with:

- App Router manifest
- service worker registration
- install prompt UI
- Mongo-backed push subscriptions
- backend Web Push sender
- bell UI to enable/disable alerts
- notification deep-link support

But the notification system is **not stable yet**.

The biggest active issue reported by the user on **Android** is:

- after alerts are enabled, the bell can later fall back to `Enable alerts` again when a new notification arrives
- mobile push delivery is inconsistent
- notifications also feel slow, including normal Pusher-driven in-app notification updates

This means the architecture exists, but the notification state + delivery reliability are still not trustworthy.

## Main PWA Files Added

### Core PWA shell

- `app/manifest.ts`
- `public/sw.js`
- `components/providers/pwa-provider.tsx`
- `components/providers/pwa-install-prompt.tsx`
- `lib/pwa.ts`
- `app/layout.tsx`

### Push subscription + backend send

- `models/PushSubscription.ts`
- `lib/push/client.ts`
- `lib/push/web-push.ts`
- `app/api/push/public-key/route.ts`
- `app/api/push/subscribe/route.ts`
- `app/api/push/unsubscribe/route.ts`
- `scripts/generate-vapid-keys.ts`

### Notification model + client UI

- `models/Notification.ts`
- `lib/notifications/metadata.ts`
- `components/shared/notification-bell.tsx`
- `app/api/notifications/route.ts`

### Realtime bridge

- `lib/pusher/pusherServer.ts`
- `lib/pusher/pusherClient.ts`
- `lib/pusher/events.ts`

## Notification-Creation Paths Touched

These are the main places where app events create saved notifications and then call `emitNotification(...)`, which now also tries to send Web Push:

- `app/api/questions/[id]/accept/route.ts`
- `app/api/answers/route.ts`
- `lib/channel-deadline-warning.ts`
- `lib/channel-expiration.ts`
- `app/api/channels/[id]/close/route.ts`
- `app/api/auth/register/route.ts`
- `app/api/referral/invite/route.ts`
- `app/api/wallet/withdraw/route.ts`
- `app/api/admin/transactions/[id]/approve/route.ts`
- `app/api/admin/transactions/[id]/refund/route.ts`
- `app/api/admin/withdrawals/[id]/complete/route.ts`
- `app/api/admin/withdrawals/[id]/reject/route.ts`
- `app/api/cron/monthly-rewards/route.ts`

## What Is Implemented

### PWA

- `app/manifest.ts` defines app name, icons, standalone display, theme color
- `app/layout.tsx` mounts `PWAProvider`
- `components/providers/pwa-provider.tsx` registers `/sw.js`
- `public/sw.js` uses:
  - `self.skipWaiting()`
  - `clients.claim()`
  - app-shell asset caching
  - push event handling
  - notification click routing
  - attempted `pushsubscriptionchange` recovery

### Install prompt

- `components/providers/pwa-install-prompt.tsx` shows a mobile install recommendation
- Android/Chromium path uses `beforeinstallprompt`
- iOS path shows manual Add to Home Screen help
- prompt is hidden when already installed or recently dismissed

### Push infra

- `models/PushSubscription.ts` stores:
  - `userId`
  - `endpoint`
  - `expirationTime`
  - `keys.p256dh`
  - `keys.auth`
  - `userAgent`
- `/api/push/public-key` returns the VAPID public key
- `/api/push/subscribe` upserts browser subscriptions into Mongo
- `/api/push/unsubscribe` deletes a subscription by endpoint

### Send path

- `lib/push/web-push.ts` uses `web-push`
- `lib/pusher/pusherServer.ts` `emitNotification(...)` now does both:
  - Pusher trigger
  - Web Push send

### Bell UI

- `components/shared/notification-bell.tsx`:
  - asks for notification permission on button click
  - subscribes via `pushManager.subscribe(...)`
  - POSTs the subscription to `/api/push/subscribe`
  - shows `Enable alerts` / `Disable alerts`
  - listens for Pusher notification events
  - deep-links notification clicks

## Notification Types Currently In Use

Defined in `models/Notification.ts`:

- `RATING_RECEIVED`
- `QUESTION_ACCEPTED`
- `QUESTION_RESET`
- `CHANNEL_CLOSED`
- `CHANNEL_EXPIRED`
- `PAYMENT`
- `ANSWER_SUBMITTED`
- `DEADLINE_WARNING`
- `SYSTEM`

These are converted to titles in `lib/notifications/metadata.ts`.

## Current Known Errors / Failures

### 1. Android push toggle state is not reliable

User-reported actual behavior:

- tap `Enable alerts`
- it becomes `Disable alerts`
- refresh can still show `Disable alerts`
- but when a new notification arrives, it can fall back to `Enable alerts` again

This is the biggest active bug right now.

The current code in `components/shared/notification-bell.tsx` has already gone through multiple repair attempts:

- waiting for service worker readiness
- re-checking existing subscription
- re-syncing subscription back to backend
- recreating subscription if permission exists but subscription is missing
- background sync instead of forcing UI reset

Despite that, the user still reports the toggle regression.

### 2. Mobile push delivery is inconsistent

User-reported actual behavior:

- some pushes do not arrive on mobile reliably
- especially around the same moments where bell state falls back to `Enable alerts`

This suggests one of these is still happening:

- browser subscription exists briefly, then is lost
- Mongo subscription record is being deleted or replaced
- server send gets a non-404/non-410 error and silently fails except console log
- service worker update / registration timing still races with push state logic

### 3. Notification latency feels slow

User-reported actual behavior:

- normal Pusher notification UX is slow
- push/device notification UX is also slow

This has not been instrumented yet, so the exact bottleneck is still unproven.

## Most Likely Technical Causes Of The Current Problems

These are hypotheses from the current code, not confirmed facts.

### A. Push state is tied too closely to browser subscription reads

`components/shared/notification-bell.tsx` still decides button state from:

- `Notification.permission`
- `navigator.serviceWorker.getRegistration()`
- `registration.pushManager.getSubscription()`

If Android Chrome temporarily returns no subscription, the UI falls back to `Enable alerts`.

This may be accurate from the browser API point of view, but it creates a bad UX if the state is flapping or racing.

### B. Subscription sync is opportunistic, not durable

The bell UI silently re-syncs subscriptions by calling `/api/push/subscribe`.

But there is no separate durable server truth like:

- `users.pushEnabled = true/false`
- `users.lastPushSubscriptionVerifiedAt`
- `users.lastPushDeliveryError`

So the app has no stable source of truth beyond the live browser subscription check.

### C. `pushsubscriptionchange` is not a dependable fix path

`public/sw.js` now listens to `pushsubscriptionchange`, but browser support is not something I would trust as the only recovery path.

On Android/Chromium it may not be enough, and on some platforms it may never fire in the way we hope.

### D. Notification send path is inline, not queued

`lib/pusher/pusherServer.ts` currently sends Pusher and Web Push inside the request path:

- Pusher trigger
- Web Push send

This is done during the same app action that creates the notification.

That means latency can be affected by:

- DB write time
- Pusher network time
- Web Push network time
- endpoint retries/failures

There is no queue, worker, or async job layer.

### E. The send path may be deleting subscriptions on real devices

In `lib/push/web-push.ts`, the server deletes a subscription record when push send returns:

- `404`
- `410`

That is correct in principle.

But if Android/browser endpoint churn is happening more than expected, this can cause:

- subscription deleted on send
- next app open shows `Enable alerts`
- user has to re-enable

This needs production logging before changing behavior.

## Why Notifications Feel Slow

These are the most likely reasons based on architecture:

### Pusher / in-app notification slowness

- notification creation happens after DB updates and business logic, not at the very beginning of the flow
- many routes do extra work before calling `emitNotification(...)`
- mobile network + Pusher socket wake-up can add delay
- no instrumentation currently measures:
  - time to notification document create
  - time to Pusher trigger
  - time to client toast render

### Web Push / device notification slowness

- Web Push is not instant like an in-memory local event
- it depends on:
  - server send
  - browser push service
  - device OS delivery
  - service worker wake-up
- app currently sends push inline, not via background job
- no delivery metrics exist

## Current Files Most Likely To Need Immediate Debugging

If another model takes over, these files should be the first stop:

- `components/shared/notification-bell.tsx`
- `public/sw.js`
- `lib/push/web-push.ts`
- `app/api/push/subscribe/route.ts`
- `models/PushSubscription.ts`
- `lib/pusher/pusherServer.ts`
- `app/api/questions/[id]/accept/route.ts`

## Suggested Next Debug Plan

### 1. Add production logging around subscription lifecycle

Need logs for:

- when `/api/push/subscribe` is called
- endpoint prefix or hash
- user id
- whether endpoint changed from previous one
- when `/api/push/unsubscribe` is called
- when `webpush.sendNotification` fails
- exact `statusCode`
- whether DB subscription row is deleted

### 2. Stop using bell button state as pure live subscription truth

Consider separating:

- browser permission state
- browser subscription existence
- backend known subscription state

Possible better UI:

- `Permission granted`
- `Device subscribed`
- `Backend synced`

Or at minimum:

- do not revert to `Enable alerts` immediately just because one refresh check failed

### 3. Add a server-side diagnostic endpoint for current user push state

Example:

- `/api/push/debug`

Return:

- has permission on client
- has SW registration
- has browser subscription endpoint
- has DB subscription row count
- last known endpoint suffix

That would make debugging much faster.

### 4. Measure notification latency

Need timestamps for:

- notification created
- `emitNotification` called
- Pusher trigger completed
- Web Push send completed
- client receives Pusher event

Without timestamps, "slow" cannot be debugged properly.

### 5. Consider moving Web Push send off the request path

Better long-term approach:

- create notification row
- trigger Pusher immediately
- enqueue Web Push send in background job or fire-and-forget worker

That should reduce action-path latency.

## Verification Already Done

These checks were run successfully during the work:

- `eslint` on touched PWA / notification files
- `npx tsc --noEmit`
- `node --check public/sw.js`

But this is still true:

- the mobile notification flow is **not validated end-to-end as reliable**
- the Android toggle bug is **still user-reported as unresolved**

## Bottom Line

The PWA + Web Push foundation exists, but the notification system should still be treated as **debugging in progress**, not production-stable.

The most important unresolved issue is:

- **On Android, alerts can appear enabled, then flip back to `Enable alerts` when a new notification comes in.**

The second important issue is:

- **Notifications feel slow, and there is currently no instrumentation proving where that delay comes from.**
