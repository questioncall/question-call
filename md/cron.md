# Cron Setup Guide

This project uses the `CRON_SECRET` environment variable to authorize cron requests.
No real cron secret should be hardcoded in route files, docs, or committed config.

Both cron endpoints accept any one of these auth formats:

- Query param: `?key=YOUR_CRON_SECRET`
- Header: `x-cron-secret: YOUR_CRON_SECRET`
- Header: `Authorization: Bearer YOUR_CRON_SECRET`

For `cron-job.org`, the easiest setup is usually the query param version.

## Required Environment Variable

Set this in the environment for the app you are calling:

```env
CRON_SECRET=replace-with-a-long-random-secret
```

Keep the real secret out of committed docs and source control.

## Cron Endpoints

### 1. Expire Channels

`POST /api/cron/expire-channels`

What it does:

- Expires channels whose timer is over and no answer was submitted.
- Deducts the configured teacher penalty.
- Resets the question back to the feed when allowed.
- Auto-closes answered but unrated channels after the grace window.
- Applies the automatic `3/5` fallback rating on those auto-closed channels.

Recommended schedule:

- Every 5 minutes

Example URL:

```text
https://your-domain.com/api/cron/expire-channels?key=YOUR_CRON_SECRET
```

### 2. Monthly Rewards

`POST /api/cron/monthly-rewards`

What it does:

- Awards the configured monthly bonus to eligible high-rated teachers.

Recommended schedule:

- Once per month on day 1 at 00:00

Example URL:

```text
https://your-domain.com/api/cron/monthly-rewards?key=YOUR_CRON_SECRET
```

## cron-job.org Settings

Use these settings for each job:

- Method: `POST`
- URL: the full cron endpoint URL including `?key=YOUR_CRON_SECRET`
- No username/password needed
- No request body needed

## Why You Might See `Unauthorized`

If cron-job.org returns `Unauthorized`, check these first:

1. The deployed app has `CRON_SECRET` set in its environment.
2. The secret in cron-job.org exactly matches the deployed `CRON_SECRET`.
3. You are calling the correct deployed domain.
4. You are using `POST`, not `GET`.
5. You updated old saved jobs that still use an outdated hardcoded secret.

## Fallback Behavior

Cron is still the primary mechanism for cleanup.

As a safety net, participant-facing channel APIs now also re-check overdue channels when a user opens the channel, sends a message, starts a call, or submits an answer. That means:

- unanswered expired channels are forced into the expire/reset path
- answered but unrated channels are auto-closed and auto-rated once the grace period has passed

This fallback is there to prevent channels from staying incorrectly active if a cron run is delayed or missed.


#### Next Steps After Deployment
Once these changes are pushed and live on production, you should submit your site to search engines to kickstart the indexing process:

1. Google Search Console (GSC)

Go to Google Search Console.
Add your property using the Domain method (you'll need to add a DNS TXT record to verify ownership of questioncall.com).
Once verified, go to Sitemaps in the left menu.
Submit your new sitemap URL: https://questioncall.com/sitemap.xml.
(Optional) Enter https://questioncall.com/ into the URL Inspection tool at the top and click "Request Indexing" to speed things up.
2. Bing Webmaster Tools

Go to Bing Webmaster Tools.
You can easily import your verified site directly from Google Search Console (saves you from verifying DNS again).
Go to Sitemaps and submit https://questioncall.com/sitemap.xml if it didn't import automatically.