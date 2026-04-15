# Cron Jobs

Add these URLs to cron.job.org (or your preferred cron service):

## Active Cron Endpoints

| Endpoint | Frequency | Purpose |
|----------|------------|---------|
| `https://your-domain.com/api/cron/expire-channels` | Every 5 minutes | Auto-close expired channels, reset questions |
| `https://your-domain.com/api/cron/quiz-daily-reset` | Daily at midnight | Reset daily quiz limits |
| `https://your-domain.com/api/cron/monthly-rewards` | 1st of every month | Award bonus points to high-rated teachers |

## Cron Headers

All cron endpoints require:
- Header: `x-cron-secret` (set in your `.env.local` as `CRON_SECRET`)

## Example (cron.job.org)

```
# Expire channels every 5 minutes
*/5 * * * * https://your-domain.com/api/cron/expire-channels

# Reset quiz daily at midnight
0 0 * * * https://your-domain.com/api/cron/quiz-daily-reset

# Monthly teacher rewards (1st of every month at midnight)
0 0 1 * * https://your-domain.com/api/cron/monthly-rewards
```

## Environment Variables

Add to `.env.local`:
```
CRON_SECRET=your-secure-random-string
```