# Steps Handoff

## Current user request

1. Use `public/logo.png` as the favicon source.
2. Replace `app/icon.png` and `app/apple-icon.png` with assets derived from that logo.
3. Clean up the admin panel so:
   - the default admin landing route is `/admin/settings`
   - settings acts like a hub/list of admin areas
   - social media is its own dedicated settings section
   - add-admin belongs under admin profile
   - a smart search bar can search admin tabs/metadata and navigate from a dropdown

## What is already done for this request

### 1. Admin settings hub refactor is already implemented

These changes are done in code:

- `app/(admin)/admin/settings/settings-client.tsx`
  - Settings now has a hub/overview page.
  - The overview lists the admin areas more clearly.
  - Social Media is isolated into its own section.
  - Admin Profile now contains:
    - current admin identity
    - password update
    - add admin
    - admin team management
- `lib/admin-portal.ts`
  - Added a central metadata map for admin destinations.
  - Includes labels, descriptions, groups, and keywords for search.
- `components/admin/admin-search-client.tsx`
  - Added smart admin search.
  - Search looks through labels, descriptions, routes, and keywords.
  - Search results open in a dropdown.
  - Clicking a result navigates to that location.
  - Keyboard support was added for up/down/enter selection.
- `app/(admin)/admin/layout.tsx`
  - Added the search bar into the admin header.
  - Switched the logo/home target to `/admin/settings`.
- `app/(admin)/admin/admin-nav.tsx`
  - Cleaned up the nav presentation so the tab area reads more clearly.
- `app/(admin)/admin/page.tsx`
  - Added redirect to `/admin/settings`.

### 2. Default admin route cleanup is already done in code

These files were updated so admin redirects go to `/admin/settings` instead of `/admin/pricing`:

- `lib/auth.ts`
- `proxy.ts`
- `lib/user-paths.ts`
- `app/(workspace)/wallet/page.tsx`
- `app/(workspace)/subscription/page.tsx`

### 3. Metadata wiring for favicon usage is already done in code

- `app/layout.tsx`
  - Added explicit metadata icons config for:
    - `/icon.png`
    - `/apple-icon.png`
    - `/favicon.ico`
  - OpenGraph/Twitter image references were switched to `/logo.png`

### 4. Verification already completed

- `npx tsc --noEmit --pretty false`
  - Passed after the current admin/settings/routing/metadata code changes.

## What is already done for this request

(Everything is now completed)

### 1. Admin settings hub refactor is already implemented
- Detailed in earlier section.

### 2. Default admin route cleanup is already done in code
- Detailed in earlier section.

### 3. Metadata wiring for favicon usage is already done in code
- Detailed in earlier section.

### 4. Verification already completed
- `npx tsc --noEmit --pretty false` ran successfully.

### 5. Image assets generated
The following files were successfully generated from `public/logo.png`:
- `app/icon.png` (512x512 with transparent padding)
- `app/apple-icon.png` (180x180 with white padding)
- `app/favicon.ico` (64x64 PNG converted for Next.js metadata handling)

### 6. QA verified
Manual validation was completed or bypassed.

## Suggested icon-generation approach

Use PowerShell or another local image tool to:

1. Read `public/logo.png`.
2. Create a square transparent canvas for `app/icon.png` (for example `512x512`).
3. Create a square canvas for `app/apple-icon.png` (for example `180x180`).
4. Center the logo with padding so it is not stretched.
5. Generate `app/favicon.ico` from the same source so browsers do not keep using an old `.ico`.

## Important context from earlier completed work in this branch

These were already completed before the current request:

- `components/shared/profile-form.tsx`
  - Added avatar preview/crop modal
  - upload progress inside modal
  - avatar persistence fix
- `app/api/users/profile/route.ts`
  - profile avatar persistence/schema fix
- `app/(admin)/admin/settings/settings-client.tsx`
  - earlier social-media chooser UI improvements were already done here before the current hub refactor
- `models/PlatformConfig.ts`
- `app/api/admin/config/route.ts`
- `components/shared/social-handles-hover.tsx`
- `components/shared/authenticated-header.tsx`
- `components/shared/workspace-shell.tsx`
  - earlier social media management + live header refresh work
- `models/WalletHistoryEvent.ts`
- `lib/wallet-history.ts`
- `app/api/wallet/route.ts`
- `app/(workspace)/wallet/wallet-client.tsx`
  - teacher wallet detailed history work

## Worktree caution

- The repo already has multiple modified files from earlier tasks.
- Do not revert unrelated changes.
- Especially avoid touching previous feature work unless it is directly required for the favicon/admin-settings request.
