# TODO

## Status Key
- `Pending`: not implemented yet
- `In Progress`: partial implementation exists, but the request is not complete

## 1. Admin Social Media Management
- Status: `In Progress`
- Priority: High
- Request:
  Admin should have a dedicated social media management area where they can add or remove social links. The UI should offer at least 10 icon-backed social slots by default, and saved URLs should show up instantly in the header share hover panel.
- Current repo state:
  The admin settings page already saves social handles into `PlatformConfig`, and the workspace header already renders a social hover panel.
  The current implementation is still hard-coded to 7 fixed networks and is rendered as a simple settings form rather than a flexible add/remove social tab.
  Config updates are broadcast only on the admin updates channel, so the public/workspace header does not have a live refresh path yet.
- Main gaps:
  Need support for at least 10 social options with icons.
  Need add/remove behavior instead of fixed fields only.
  Need instant header/share-panel refresh after save.
- Likely files:
  `app/(admin)/admin/settings/settings-client.tsx`
  `app/api/admin/config/route.ts`
  `components/shared/social-handles-hover.tsx`
  `components/shared/authenticated-header.tsx`
  `components/shared/workspace-shell.tsx`
  `lib/constants.ts`
  `lib/pusher/events.ts`
  `models/PlatformConfig.ts`
- Acceptance criteria:
  Admin can manage at least 10 social links.
  Social rows can be added/removed cleanly.
  Saved social URLs appear in the header share hover without needing a manual refresh.

## 2. Channel Chat Media Layout + Multi-File Upload
- Status: `In Progress`
- Priority: High
- Request:
  In the chat area, images and videos should use a cleaner fixed ratio so they do not take too much height or width. The uploader should support multiple files, up to 10 at a time, for images and videos.
- Current repo state:
  Chat media already uploads and renders, but the component still uses a single `pendingFile` state and the file input only reads the first selected file.
  The current send flow uploads one file and sends one message.
  Rendered images and videos are capped by width but do not use a stronger, consistent visual ratio.
- Main gaps:
  Replace single-file state with multi-file state.
  Allow selecting up to 10 files in one action.
  Validate mixed image/video batches safely.
  Keep previews and sent media visually constrained.
  Preserve compatibility with the current message API.
- Recommended implementation note:
  The safest path with the current backend is to upload files one by one and create one message per attachment, instead of changing the message schema to support attachment arrays.
- Likely files:
  `components/shared/channel-chat.tsx`
  `app/api/channels/[id]/messages/route.ts`
  `models/Message.ts`
  `types/channel.ts`
- Acceptance criteria:
  User can select up to 10 image/video files at once.
  Preview area stays compact and readable.
  Sent chat media uses a stable aspect ratio / max-height treatment.
  Upload flow works without breaking the existing message model.

## 3. Rating Stars Visibility in Light Mode
- Status: `Pending`
- Priority: Medium
- Request:
  In white mode, the rating stars in the channel close/rating modal should remain clearly visible. Use dark/black outlined stars in light mode and light/white outlined stars in dark mode before selection.
- Current repo state:
  The rating modal still renders unselected stars with a very faint muted treatment, which makes them hard to see in light mode.
- Main gaps:
  Add explicit outline/stroke treatment for unselected stars.
  Keep selected stars filled and visually stronger than the unselected state.
  Ensure the dark theme outline remains visible too.
- Likely files:
  `components/shared/channel-chat.tsx`
- Acceptance criteria:
  Unselected stars are easy to see in both light and dark themes.
  Selected stars still look highlighted and distinct.

## 4. Teacher Wallet Earning History
- Status: `Pending`
- Priority: High
- Request:
  In the teacher wallet, show detailed earning history: what they earned, how much they earned, and when they earned it.
- Current repo state:
  The wallet already shows totals, balance math, and withdrawal history.
  The wallet API currently returns aggregate totals plus withdrawal requests only.
  Teacher points are updated directly on the `User` record in flows like channel close, expiration handling, and monthly rewards, but there is no dedicated wallet ledger for detailed earning events.
- Main gaps:
  Add a durable earning-history source for point credits and deductions.
  Include event reason, points delta, date/time, and related context.
  Show answer rewards, penalties, bonuses, and withdrawals in a detailed timeline/table.
- Likely files:
  `app/(workspace)/wallet/wallet-client.tsx`
  `app/api/wallet/route.ts`
  `app/api/channels/[id]/close/route.ts`
  `lib/channel-expiration.ts`
  `app/api/cron/monthly-rewards/route.ts`
  `models/User.ts`
  `models/WithdrawalRequest.ts`
- Acceptance criteria:
  Teacher wallet shows a detailed event history, not just summary totals.
  Each row explains what changed, by how many points, and when.
  Penalties and bonuses appear alongside positive earnings.

## Suggested Order
1. Fix the rating stars first because it is small and isolated.
2. Implement the chat media sizing and multi-file upload flow next.
3. Expand the admin social management model and connect it to instant header refresh.
4. Add a proper wallet earning ledger and render it in the teacher wallet.
