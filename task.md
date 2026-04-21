# Task Tracking

## Chunk
- Fix the cron channel-expiration failure caused by Mongoose rejecting array-based update pipelines.
- Patch any matching rating/penalty/monthly-reward update calls that use the same pipeline style.
- Check the `url.parse()` deprecation warning source to confirm whether it is app code or a dependency/runtime warning.

## Files To Touch
- [task.md](d:\siddhant-files\projects\LISTNERS\listeners\task.md)
- [lib\channel-expiration.ts](d:\siddhant-files\projects\LISTNERS\listeners\lib\channel-expiration.ts)
- [app\api\channels\[id]\close\route.ts](d:\siddhant-files\projects\LISTNERS\listeners\app\api\channels\[id]\close\route.ts)
- [app\api\cron\monthly-rewards\route.ts](d:\siddhant-files\projects\LISTNERS\listeners\app\api\cron\monthly-rewards\route.ts)

## Exit Condition
- The cron expiration flow no longer throws `Cannot pass an array to query updates unless the updatePipeline option is set`.
- Matching array-based update calls use the correct Mongoose pipeline option.
- The `url.parse()` warning is documented as app-owned or dependency-owned based on repo inspection.
