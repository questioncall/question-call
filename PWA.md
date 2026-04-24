# PWA Strategy For LISTNERS

## Verdict

For this app, the best choice is **Option 2: manual PWA setup**, using:

- `app/manifest.ts` for official Next.js App Router metadata
- a custom `public/sw.js` service worker
- Web Push subscriptions for real background notifications
- explicit camera permission only inside the question-posting flow

`next-pwa` is still fine for a quick offline setup, but it is **not the best primary foundation** for LISTNERS because your main goal is not just installability. Your real goal is:

- real notifications when the app is not open in the foreground
- clean permission handling
- camera access only when the user chooses it
- tighter control over notification click behavior and future background flows

## Why This Fits LISTNERS

LISTNERS already has live in-app updates through Pusher in places like:

- `components/shared/notification-bell.tsx`
- `components/shared/workspace-shell.tsx`
- `lib/pusher/pusherServer.ts`

That is good for **foreground realtime**.

What it does **not** fully cover is **true background/system notifications** when the tab is closed, minimized, or the phone is locked. For that, you need:

- a service worker
- the Push API
- stored user push subscriptions
- notification click handling

So the right architecture is:

1. Keep **Pusher** for instant in-app updates while the app is open.
2. Add **Web Push** for real device notifications when the app is in the background.
3. Add **camera capture** only when the user taps to attach media to a question.

## Short Recommendation

Choose:

- **Manual PWA + Web Push** as the main approach

Use `next-pwa` only if:

- you want the fastest possible installable/offline shell first
- you are okay with less direct control
- you still plan to add your own push architecture afterward

## Option Comparison

### Option 1: `next-pwa`

Best for:

- fast setup
- precaching
- installability
- basic offline shell

Weak points for this project:

- it does not solve your real notification product flow by itself
- you still need subscription storage, push sending, and notification click routing
- it gives less clarity and control in a Next 16 App Router codebase
- its maintenance cadence is older than the official Next.js App Router metadata path

### Option 2: Manual setup

Best for:

- real notifications
- better permission UX
- explicit control over service worker behavior
- easier future expansion for message alerts, question updates, call reminders, and teacher activity

Tradeoff:

- more work up front

For LISTNERS, this extra control is worth it.

## Recommended Architecture

### 1. PWA shell

Use Next.js App Router's built-in manifest support:

- create `app/manifest.ts`
- keep using your existing app icons from `app/icon.png` and `app/apple-icon.png`
- add install-friendly values like `name`, `short_name`, `display`, `start_url`, `background_color`, `theme_color`

This fits your current `app/layout.tsx` setup better than introducing a plugin-first approach.

### 2. Service worker

Create:

- `public/sw.js`

Use it for:

- push event handling
- notification click handling
- light caching for the app shell

Do **not** start with aggressive offline caching for all dynamic pages. LISTNERS has auth, realtime state, calls, and user-specific data, so a small and safe cache strategy is better at first.

Recommended first cache scope:

- home page shell
- icons
- fonts
- static assets

Avoid caching first:

- authenticated API responses
- call routes
- question/channel live pages
- anything with fast-changing personalized state

### 3. Service worker registration

Register the service worker from a small client component, for example:

- `components/providers/pwa-provider.tsx`

Mount that provider in:

- `app/layout.tsx`

This keeps the registration logic separate from your page UI.

### 3.1 Auto-updates

PWA updates are real, but they are **not instant by default**.

Default browser behavior is usually:

1. user opens the app
2. browser detects that `sw.js` changed
3. new worker installs in the background
4. old worker keeps controlling the current page
5. new worker fully takes over after refresh or after old tabs close

For LISTNERS, the better setup is:

- `self.skipWaiting()` in `install`
- `clients.claim()` in `activate`
- an update toast in `pwa-provider.tsx`

That gives you:

- faster worker activation
- fresh caches and new logic sooner
- user-controlled refresh instead of a surprise reload

Best UX for this project:

- activate the new worker immediately
- show a toast like `Update available`
- let the user choose when to refresh

That is the smoothest manual-PWA update flow for LISTNERS.

### 3.2 Mobile install recommendation

The app should also recommend installation on **mobile or small screens**, but only when that recommendation makes sense.

Recommended behavior:

- show nothing if the app is already installed
- show nothing on desktop unless you later want a separate desktop install CTA
- on Android and Chromium-based mobile browsers, listen for `beforeinstallprompt` and show a small in-app install CTA
- on iPhone or iPad Safari, show a manual helper like `Share -> Add to Home Screen`
- remember dismissal for a few days so the prompt does not keep nagging
- hide the prompt on immersive routes like live calls or auth screens

That gives users a gentle install recommendation without interrupting the product flow.

### 4. Real notifications

Use a real Web Push flow:

- browser asks for notification permission only after a user action
- browser creates a push subscription
- app sends that subscription to your backend
- backend stores subscriptions per user
- backend sends push notifications when important events happen
- `sw.js` shows the notification and routes clicks back into the right page

Suggested server pieces:

- `models/PushSubscription.ts`
- `lib/push/web-push.ts`
- `app/api/push/public-key/route.ts`
- `app/api/push/subscribe/route.ts`
- `app/api/push/unsubscribe/route.ts`

Suggested env vars:

- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT`

Helper script now available:

- `npm run generate:vapid`

Suggested npm package:

- `web-push`

### 5. How notifications should work in LISTNERS

Use **two layers**, not one:

#### Layer A: Foreground notifications

Keep Pusher for:

- instant bell updates
- live toasts while the app is open
- fast UI refresh for channels, questions, and calls

#### Layer B: Background notifications

Add Web Push for:

- new answer on my question
- teacher accepted my question
- incoming call reminder or missed-call follow-up
- channel about to expire
- payment/subscription status changes
- important admin or moderation events

This gives the closest web experience to "real notifications".

## Camera Access Recommendation

For posting questions, the best UX is:

1. **Default path:** file input with camera capture support
2. **Optional enhanced path:** live in-app camera preview with `getUserMedia`

### Best default for reliability

Use a file input such as:

- `accept="image/*"`
- `capture="environment"`

Why this is the best default:

- very reliable on mobile
- uses the device camera app
- simpler permissions
- easier retake flow
- fewer browser-specific camera bugs

This is the best starting point if the user mainly wants to attach a photo of a handwritten question.

### Enhanced camera mode

If you want a nicer in-app experience, add:

- an `Open camera` button in the question composer
- `navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })`

Important rules:

- never request camera access on page load
- request only after a clear user tap
- show preview before capture
- stop all media tracks when the modal closes
- handle denied permission gracefully
- keep file upload as fallback

## Permission Rules

For both notifications and camera:

- ask only after the user understands the value
- never ask on first page load
- always provide a fallback if permission is denied
- only run on HTTPS in production

Good moments to ask:

- notifications: after the user enables alerts from settings or after an action like "Notify me about answers"
- camera: after the user taps `Add photo` or `Open camera`

Bad moments to ask:

- app startup
- login screen load
- random modal on first visit

## Phased Rollout Plan

### Phase 1: PWA base

- add `app/manifest.ts`
- register `public/sw.js`
- add a minimal installable PWA shell

### Phase 2: Push infrastructure

- generate VAPID keys
- store push subscriptions in MongoDB
- subscribe/unsubscribe users
- send real push notifications from backend events

### Phase 3: Integrate with existing notification system

- keep Pusher for open-tab realtime
- trigger Web Push for important persisted notifications
- deep-link notification clicks into the correct channel/question/call page

### Phase 4: Camera in question posting

- add image capture/upload inside the question composer
- start with file-input capture
- optionally add live preview camera mode later

### Phase 5: Safe offline polish

- cache only stable assets first
- add smarter offline behavior later after testing auth and realtime flows

## What I Would Do In This Repo

If I were implementing this next, I would do it in this order:

1. `app/manifest.ts`
2. `public/sw.js`
3. `components/providers/pwa-provider.tsx`
4. push subscription model and API routes
5. Web Push sender utility
6. hook push sending into existing notification creation paths
7. camera upload flow in the question-post UI

## What I Would Not Do

- I would **not** rely only on `next-pwa` for "real notifications"
- I would **not** ask for notification permission on first visit
- I would **not** ask for camera permission before the user taps to attach media
- I would **not** aggressively cache authenticated dynamic pages in v1
- I would **not** replace Pusher with Web Push; they solve different moments

## Final Recommendation

For LISTNERS, the best setup is:

- **Manual App Router PWA setup**
- **Pusher for open-app realtime**
- **Web Push for real background notifications**
- **camera access only from a user-triggered question-post flow**

That gives you the best service quality without losing control of the product experience.

## References

- Next.js App Router manifest metadata: https://nextjs.org/docs/app/api-reference/file-conventions/metadata/manifest
- MDN Push API: https://developer.mozilla.org/en-US/docs/Web/API/Push_API
- MDN Service Worker: https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorker
- MDN `showNotification()`: https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerRegistration/showNotification
- MDN `Notification.requestPermission()`: https://developer.mozilla.org/en-US/docs/Web/API/Notification/requestPermission_static
- MDN `getUserMedia()`: https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
- `next-pwa` package: https://www.npmjs.com/package/next-pwa
