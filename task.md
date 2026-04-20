# Task Tracking

## Chunk
- Fix the production build type error in the leaderboard profile page.
- Ensure `searchParams.view` is typed safely for Next.js App Router pages.
- Keep invalid or unsupported leaderboard views falling back to the allowed default.

## Files To Touch
- [task.md](d:\siddhant-files\projects\LISTNERS\listeners\task.md)
- [app\(workspace)\leaderboard\[username]\page.tsx](d:\siddhant-files\projects\LISTNERS\listeners\app\(workspace)\leaderboard\[username]\page.tsx)

## Exit Condition
- `next build` no longer fails on `resolvedSearchParams.view` in the leaderboard user page.
- The page only accepts a string `view` query when resolving the active leaderboard section.
- Unsupported or missing `view` values still fall back to the signed-in user's default section.
