# Task Tracking

## Chunk
- Restrict leaderboard switch buttons by signed-in user role.
- Students can switch between `Student vs Student` and `All`.
- Teachers can switch between `Teacher vs Teacher` and `All`.

## Files To Touch
- [task.md](d:\siddhant-files\projects\LISTNERS\listeners\task.md)
- [app\(workspace)\leaderboard\[username]\page.tsx](d:\siddhant-files\projects\LISTNERS\listeners\app\(workspace)\leaderboard\[username]\page.tsx)
- [lib\auth.ts](d:\siddhant-files\projects\LISTNERS\listeners\lib\auth.ts)

## Exit Condition
- Students only see `Student vs Student` and `All` leaderboard switch options.
- Teachers only see `Teacher vs Teacher` and `All` leaderboard switch options.
- The active leaderboard view always resolves to an allowed option for the signed-in user.
