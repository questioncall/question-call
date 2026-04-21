# Task Tracking

## Chunk
- Prevent the auth submit button from becoming clickable again after a successful sign-in starts.
- Keep the auth button in a loading/disabled state until navigation completes or an error is returned.
- Change question posting so students can choose multiple allowed answer formats instead of only one.
- Update teacher answer submission so the selected answer must satisfy all required chosen formats.

## Files To Touch
- [task.md](d:\siddhant-files\projects\LISTNERS\listeners\task.md)
- [components\shared\auth-form.tsx](d:\siddhant-files\projects\LISTNERS\listeners\components\shared\auth-form.tsx)
- [app\(workspace)\ask\question\page.tsx](d:\siddhant-files\projects\LISTNERS\listeners\app\(workspace)\ask\question\page.tsx)
- [components\shared\post-question-modal.tsx](d:\siddhant-files\projects\LISTNERS\listeners\components\shared\post-question-modal.tsx)
- [types\question.ts](d:\siddhant-files\projects\LISTNERS\listeners\types\question.ts)
- [models\Question.ts](d:\siddhant-files\projects\LISTNERS\listeners\models\Question.ts)
- [models\Answer.ts](d:\siddhant-files\projects\LISTNERS\listeners\models\Answer.ts)
- [models\PlatformConfig.ts](d:\siddhant-files\projects\LISTNERS\listeners\models\PlatformConfig.ts)
- [app\api\questions\route.ts](d:\siddhant-files\projects\LISTNERS\listeners\app\api\questions\route.ts)
- [app\api\questions\feed\route.ts](d:\siddhant-files\projects\LISTNERS\listeners\app\api\questions\feed\route.ts)
- [app\api\questions\[id]\accept\route.ts](d:\siddhant-files\projects\LISTNERS\listeners\app\api\questions\[id]\accept\route.ts)
- [app\api\answers\route.ts](d:\siddhant-files\projects\LISTNERS\listeners\app\api\answers\route.ts)
- [app\api\channels\[id]\route.ts](d:\siddhant-files\projects\LISTNERS\listeners\app\api\channels\[id]\route.ts)
- [components\shared\channel-chat.tsx](d:\siddhant-files\projects\LISTNERS\listeners\components\shared\channel-chat.tsx)
- [components\shared\workspace-home.tsx](d:\siddhant-files\projects\LISTNERS\listeners\components\shared\workspace-home.tsx)
- [lib\question-types.ts](d:\siddhant-files\projects\LISTNERS\listeners\lib\question-types.ts)

## Exit Condition
- After submit is triggered on auth, the primary button stays disabled/loading until redirect finishes or a visible error occurs.
- Question creation supports selecting multiple required answer formats.
- Saved questions expose the selected formats consistently in API and UI.
- Teacher answer submission validates the selected messages against all required formats instead of a single enum only.
