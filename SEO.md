# SEO Audit and Action Plan for Question Call

Last updated: 2026-04-22

This document is based on the current code in:

- `app/layout.tsx`
- `app/sitemap.ts`
- `app/robots.ts`
- `lib/site-url.ts`
- public and utility routes under `app/`

## Executive Summary

The project already has a solid SEO foundation:

- root metadata exists in `app/layout.tsx`
- `robots.txt` exists in `app/robots.ts`
- `sitemap.xml` exists in `app/sitemap.ts`
- metadata already exists for `/courses`, `/courses/[slug]`, `/courses/my`, `/studio`, and `/admin/notices`

The biggest problems right now are:

1. `SITE_URL` should use a dedicated SEO/public URL variable: `NEXT_PUBLIC_SITE_URL`.
2. The sitemap currently includes routes that are auth-only or missing.
3. Most public-facing pages still do not export page-level metadata.
4. Private, transactional, and search-result pages do not explicitly send `noindex`.
5. Structured data is still missing.

Fix those before submitting the sitemap to Google Search Console.

## What Is Already Implemented

| Area | Status | Notes |
| --- | --- | --- |
| Site URL resolution | Partial | `lib/site-url.ts` should use `NEXT_PUBLIC_SITE_URL`, then `VERCEL_URL`, then `http://localhost:3000` |
| Root metadata | Good baseline | `app/layout.tsx` sets title template, description, icons, Open Graph, Twitter, and robots |
| Sitemap | Partial | `app/sitemap.ts` exists and already includes dynamic course URLs |
| Robots | Partial | `app/robots.ts` exists, but some rules are not aligned with actual public URLs |
| Dynamic course metadata | Present | `app/(courses)/courses/[slug]/page.tsx` already uses `generateMetadata` |
| Page metadata coverage | Limited | Only a few routes currently export metadata |
| Structured data | Missing | No JSON-LD script is currently injected |
| Canonical strategy | Partial | `metadataBase` exists, but page-level canonicals are mostly missing |
| Noindex strategy | Missing | Auth, payment, search, and workspace pages should opt out explicitly |

## Critical Fixes

### 1. Set the production site URL with `NEXT_PUBLIC_SITE_URL`

This is the most important correction.

`lib/site-url.ts` reads:

- `NEXT_PUBLIC_SITE_URL`
- else `VERCEL_URL`
- else `http://localhost:3000`

This keeps SEO and canonical URL generation separate from auth callback behavior.

If the live domain is `https://questioncall.com`, set:

```env
NEXT_PUBLIC_SITE_URL=https://questioncall.com
```

Do this in Vercel for the Production environment, then redeploy.

Verify after deploy:

1. Open `https://questioncall.com/sitemap.xml`
2. Confirm every URL starts with `https://questioncall.com`
3. Confirm no URL points to `localhost`

### 2. Fix the sitemap before submitting it anywhere

The current sitemap includes routes that should not be there:

- `/leaderboard` because it redirects anonymous users to `/auth/signin`
- `/quiz` because it redirects anonymous users to `/auth/signin`
- `/legal/terms` because there is no matching route in `app/`
- `/legal/privacy` because there is no matching route in `app/`
- `/legal/refund` because there is no matching route in `app/`

Right now, `app/sitemap.ts` should only include routes that are:

- public
- crawlable without login
- stable
- useful as landing pages from search
- returning a real `200 OK`

Keep in the sitemap:

- `/`
- `/courses`
- `/legal`
- `/courses/[slug]` for active public courses
- optionally `/{username}` for public profiles
- optionally `/question/[id]` only for solved, public, high-quality question pages

Do not include in the sitemap:

- login-required routes
- routes that redirect anonymous users
- search result pages
- payment confirmation pages
- dashboard/workspace pages
- route ideas that do not have real files behind them

### 3. Do not submit Search Console until the sitemap is corrected

Submit the sitemap only after:

- `NEXT_PUBLIC_SITE_URL` is correct
- the sitemap contains only public `200` pages
- broken legal URLs are removed
- auth-only routes are removed

## Public Route Policy

Use this as the source of truth when deciding what should rank.

| Route | Index? | Why |
| --- | --- | --- |
| `/` | Yes | Main marketing and product landing page |
| `/courses` | Yes | Main browse page for discoverable content |
| `/courses/[slug]` | Yes | Strongest SEO target in the current product |
| `/legal` | Yes | Public trust page, low SEO value but valid |
| `/{username}` | Maybe | Worth indexing only if profiles are rich and public |
| `/question/[id]` | Maybe | Worth indexing only if questions have substantial public answers |
| `/search/results` | No | Query-based utility page |
| `/quiz` | No | Login-gated route |
| `/leaderboard` | No | Login-gated redirect |
| `/subscription` and children | No | Account state and payment flow |
| `/payment/...` | No | Transaction state pages |
| `/studio` | No | Internal workspace |
| `/courses/[slug]/buy` | No | Purchase flow |
| `/courses/[slug]/watch/[videoId]` | No | Personal lesson state |
| `/courses/[slug]/manage` | No | Instructor tool |
| `/courses/my` | No | Personal dashboard |
| `/auth/...` | No | Auth utility pages |
| `/wallet`, `/settings`, `/message`, `/ask/question`, `/channel/[id]`, `/calls/[callId]` | No | App workflows, not search landing pages |
| `/admin/...` | No | Backoffice only |

## Metadata Work Needed

### Public pages that should get metadata first

Add or improve metadata on:

- `app/page.tsx`
- `app/legal/page.tsx`
- `app/(courses)/courses/page.tsx`
- `app/(courses)/courses/[slug]/page.tsx`
- `app/[username]/page.tsx` with `generateMetadata`
- `app/(workspace)/question/[id]/page.tsx` with `generateMetadata` if question pages are intended to rank

For each indexable page, include:

- `title`
- `description`
- `alternates.canonical`
- `openGraph`
- `twitter`
- `robots`

### Important title cleanup

`app/layout.tsx` already defines:

```ts
title: {
  default: APP_NAME,
  template: `%s | ${APP_NAME}`,
}
```

So child pages should use leaf titles like:

- `"Courses"`
- `"Course Studio"`
- `course.title`

Avoid hardcoding the brand inside child titles such as:

- `"Courses - Question Call"`
- `"Notices | Admin | Question Call"`

Otherwise titles can end up duplicated in the final HTML title.

### Current page metadata coverage

Currently present:

- `app/(courses)/courses/page.tsx`
- `app/(courses)/courses/[slug]/page.tsx`
- `app/(courses)/courses/my/page.tsx`
- `app/studio/page.tsx`
- `app/(admin)/admin/notices/page.tsx`

Currently missing on public pages:

- `app/page.tsx`
- `app/legal/page.tsx`
- `app/[username]/page.tsx`
- `app/(workspace)/question/[id]/page.tsx`

## Noindex Policy

`robots.txt` alone is not enough for most utility pages. If a page is accessible but should not appear in Google, add page-level metadata such as:

```ts
export const metadata: Metadata = {
  title: "Sign in",
  robots: {
    index: false,
    follow: false,
  },
};
```

Add `noindex` to these routes:

- `app/(auth)/auth/signin/page.tsx`
- `app/(auth)/auth/signout/page.tsx`
- `app/(auth)/auth/signup/student/page.tsx`
- `app/(auth)/auth/signup/teacher/page.tsx`
- `app/quiz/page.tsx`
- `app/quiz/[sessionId]/page.tsx`
- `app/(workspace)/subscription/page.tsx`
- `app/subscription/payment/page.tsx`
- `app/subscription/payment/success/page.tsx`
- `app/payment/esewa/success/page.tsx`
- `app/payment/esewa/failure/page.tsx`
- `app/(courses)/courses/[slug]/buy/page.tsx`
- `app/(courses)/courses/[slug]/watch/[videoId]/page.tsx`
- `app/(courses)/courses/[slug]/manage/page.tsx`
- `app/(courses)/courses/my/page.tsx`
- `app/studio/page.tsx`
- `app/(workspace)/search/results/page.tsx`
- `app/(workspace)/wallet/page.tsx`
- `app/(workspace)/settings/page.tsx`
- `app/(workspace)/settings/profile/page.tsx`
- `app/(workspace)/message/page.tsx`
- `app/(workspace)/ask/question/page.tsx`
- `app/(workspace)/channel/[id]/page.tsx`
- `app/(workspace)/calls/[callId]/page.tsx`
- every route under `app/(admin)/admin/`

Recommended behavior:

- `index: false, follow: false` for auth, payment, admin, and personal dashboard pages
- `index: false, follow: true` can be acceptable on some utility pages if you still want bots to pass through links, but strict `follow: false` is simpler here

## Structured Data

### 1. Add site-wide organization schema

Add JSON-LD in `app/layout.tsx` for an `EducationalOrganization`.

Include:

- `name`
- `url`
- `description`
- `logo`
- `sameAs` with real social links when available

This should be rendered with `next/script`.

### 2. Add course schema on course detail pages

For `app/(courses)/courses/[slug]/page.tsx`, add a course-focused JSON-LD block.

Good candidates:

- `Course`
- `LearningResource`

Include:

- course title
- description
- canonical URL
- thumbnail
- provider
- instructor
- pricing model or offer data when available

### 3. Optional schema for profiles and question pages

If you decide to index these routes:

- use `ProfilePage` for `app/[username]/page.tsx`
- use `QAPage` for solved public question pages with public answers

If question pages are often thin, unsolved, or private, skip schema and keep them out of the sitemap.

## Canonical and Duplicate Control

### 1. Add canonicals to all indexable pages

Use `alternates.canonical` so every public page declares its preferred URL.

Important targets:

- `/`
- `/courses`
- `/courses/[slug]`
- `/legal`
- `/{username}` if indexed
- `/question/[id]` if indexed

### 2. Control query-based duplicates

The public profile page uses query tabs:

- `/{username}?tab=overview`
- `/{username}?tab=questions`
- `/{username}?tab=media`

That can create duplicate crawl paths. Best options:

1. Canonical all tabs to `/{username}`
2. Or keep only the overview indexable and noindex the other tab states

Also noindex query-driven search pages such as:

- `/search/results?q=...`

### 3. Be selective with question pages

If question pages are indexed, consider adding `noindex` when:

- the question is unsolved
- the accepted answer is private
- the content is too thin to stand alone

This keeps low-quality pages out of the index.

## Robots Notes

`app/robots.ts` is useful, but it should not be treated as the full SEO strategy.

Notes:

- `/admin/` is a real path and should stay blocked
- `/(admin)/` is a route-group path, not a public URL, so it has no SEO effect
- `robots.txt` does not replace page-level `noindex`

Use `robots.txt` for broad crawl control and page metadata for index control.

## Content and Metadata Quality Improvements

These are important after the technical fixes are done.

### Improve keyword targeting

Current root keywords in `app/layout.tsx` are very generic:

```ts
["education", "Q&A", "courses", "learning platform", "student help"]
```

Better keyword clusters:

- `Question Call`
- `Question Call Nepal`
- `online learning Nepal`
- `student help Nepal`
- `ask expert teachers online`
- `online courses Nepal`
- `quiz learning platform`
- `class 11 and 12 learning`
- `entrance preparation Nepal`
- `live doubt solving`

Do not overfocus on the `keywords` field. Strong titles, descriptions, body copy, internal links, and page quality matter more.

### Improve Open Graph assets

Current Open Graph images use `/logo.png`.

Recommended upgrade:

- create a dedicated `1200x630` social card image
- use it in root metadata
- override it on major public pages when better assets are available

### Improve public copy depth

For pages you want to rank, add more crawlable text:

- stronger homepage copy in the public landing view
- richer course descriptions
- clear instructor names, subjects, and levels
- useful FAQs or structured explanatory sections
- internal links between homepage, courses, profiles, and public questions

## Suggested Implementation Order

### Phase 1

- set `NEXT_PUBLIC_SITE_URL` correctly in production
- redeploy
- fix `app/sitemap.ts` so it lists only valid public URLs
- verify `sitemap.xml`

### Phase 2

- add metadata to `app/page.tsx`
- add metadata to `app/legal/page.tsx`
- add canonical, Open Graph, and Twitter fields to `/courses` and `/courses/[slug]`
- standardize titles so the root title template does not duplicate the brand

### Phase 3

- add `noindex` to auth, payment, workspace, and admin pages
- add site-wide `EducationalOrganization` JSON-LD

### Phase 4

- decide whether public profiles should be indexed
- decide whether public question pages should be indexed
- if yes, add metadata, canonical rules, schema, and sitemap coverage

## Quick File Checklist

Core files:

- `lib/site-url.ts`
- `app/layout.tsx`
- `app/sitemap.ts`
- `app/robots.ts`

Public SEO targets:

- `app/page.tsx`
- `app/legal/page.tsx`
- `app/(courses)/courses/page.tsx`
- `app/(courses)/courses/[slug]/page.tsx`
- `app/[username]/page.tsx`
- `app/(workspace)/question/[id]/page.tsx`

Noindex candidates:

- `app/(auth)/auth/signin/page.tsx`
- `app/(auth)/auth/signout/page.tsx`
- `app/(auth)/auth/signup/student/page.tsx`
- `app/(auth)/auth/signup/teacher/page.tsx`
- `app/quiz/page.tsx`
- `app/quiz/[sessionId]/page.tsx`
- `app/subscription/payment/page.tsx`
- `app/subscription/payment/success/page.tsx`
- `app/payment/esewa/success/page.tsx`
- `app/payment/esewa/failure/page.tsx`
- `app/(workspace)/search/results/page.tsx`
- `app/studio/page.tsx`
- `app/(courses)/courses/my/page.tsx`
- `app/(courses)/courses/[slug]/buy/page.tsx`
- `app/(courses)/courses/[slug]/watch/[videoId]/page.tsx`
- `app/(courses)/courses/[slug]/manage/page.tsx`
- workspace and admin pages under `app/(workspace)/` and `app/(admin)/admin/`

## Google Search Console Checklist

1. Set the production `NEXT_PUBLIC_SITE_URL`
2. Redeploy
3. Verify `sitemap.xml` uses the correct domain
4. Verify the sitemap contains only public `200` pages
5. Submit the sitemap in Google Search Console
6. Request indexing for the homepage and `/courses`
7. Request indexing for selected course pages after metadata is improved

Do not request indexing for login, payment, dashboard, or utility pages.

## Definition Of Done

- [ ] `NEXT_PUBLIC_SITE_URL` is set correctly in production
- [ ] `sitemap.xml` contains only valid public URLs
- [ ] broken legal sitemap URLs are removed
- [ ] auth-only routes are removed from the sitemap
- [ ] every indexable page has a unique title and description
- [ ] every indexable page has a canonical URL
- [ ] major public pages have Open Graph and Twitter metadata
- [ ] private and transactional pages explicitly return `noindex`
- [ ] organization structured data validates
- [ ] course structured data validates
- [ ] sitemap is submitted only after the above is complete

## Bottom Line

The repo is not starting from zero. The base metadata system is already there. The real work now is to make the indexing surface intentional:

- correct the production URL source
- stop sending Google to gated or missing pages
- strengthen metadata on true public pages
- explicitly noindex everything else

If you do only three things first, do these:

1. set `NEXT_PUBLIC_SITE_URL`
2. fix `app/sitemap.ts`
3. add metadata plus canonical URLs to the homepage, legal page, and course pages
