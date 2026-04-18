# Cron Job Configuration Guide

To automate your scheduled tasks using a service like [cron-job.org](https://cron-job.org/), you can simply pass your secret key directly in the URL!

**You DO NOT need to add any username or password in the Advanced tab.** The URLs below already include your `CRON_SECRET` using the `?key=` parameter, which our API supports.

Just copy and paste these exact URLs and make sure to change the HTTP method to **POST**.

---

## 1. Expire Channels

This job checks for questions where the timer has run out. If a teacher submitted an answer but the student never rated it, it auto-closes the channel and gives the teacher an automatic 3-star rating. If the teacher never submitted an answer, it expires the channel, penalizes the teacher, and resets the question for other teachers to answer.

- **URL:** `https://listeners-rnae.vercel.app/api/cron/expire-channels?key=jbciweb8128138dcsd76fs7f8s9fs7dfdscbcasd8cy7sdt6cdacsdc8s97dc`
- **Method:** `POST`
- **Recommended Schedule:** Every 5 to 10 minutes.

---

## 2. Monthly Rewards

This job runs at the beginning of every month. It looks for monetized teachers who have maintained a high overall rating (≥ 4.0 stars) and awards them with the configured monthly bonus points directly to their wallet.

- **URL:** `https://listeners-rnae.vercel.app/api/cron/monthly-rewards?key=jbciweb8128138dcsd76fs7f8s9fs7dfdscbcasd8cy7sdt6cdacsdc8s97dc`
- **Method:** `POST`
- **Recommended Schedule:** Once a month on the 1st day of the month at 00:00 (Midnight).