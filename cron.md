# Cron Job Configuration Guide

To automate your scheduled tasks on your production server using a service like [cron-job.org](https://cron-job.org/), use the following configuration settings.

## Global Requirements

Every cron job needs to authenticate with your server using the secure `CRON_SECRET` defined in your `.env` file. 

You must add **one** of the following HTTP Headers to **ALL** your cron jobs:
- `Authorization: Bearer <YOUR_CRON_SECRET>` 
- `x-cron-secret: <YOUR_CRON_SECRET>`

*Note: Replace `<YOUR_CRON_SECRET>` with the actual value from your production environment variables (e.g. `CRON_SECRET`). Make sure the HTTP Method is set to **POST**.*

---

## 1. Expire Channels

This job checks for questions where the timer has run out. If a teacher submitted an answer but the student never rated it, it auto-closes the channel and gives the teacher an automatic 3-star rating. If the teacher never submitted an answer, it expires the channel, penalizes the teacher, and resets the question for other teachers to answer.

- **URL:** `https://your-production-url.com/api/cron/expire-channels`
- **Method:** `POST`
- **Recommended Schedule:** Every 5 to 10 minutes.
- **Headers:** 
  - `x-cron-secret: <YOUR_CRON_SECRET>`

## 2. Monthly Rewards

This job runs at the beginning of every month. It looks for monetized teachers who have maintained a high overall rating (≥ 4.0 stars) and awards them with the configured monthly bonus points directly to their wallet.

- **URL:** `https://your-production-url.com/api/cron/monthly-rewards`
- **Method:** `POST`
- **Recommended Schedule:** Once a month on the 1st day of the month at 00:00 (Midnight).
- **Headers:** 
  - `x-cron-secret: <YOUR_CRON_SECRET>`