# Google Sheet sync

Every submission on the giving site is copied into a Google Sheet, one tab
per kind of record:

| Tab | One row per | Updates when |
| --- | --- | --- |
| **Pledges** | individual or group-member pledge | a payment is confirmed (Paid, Balance, Status) |
| **Payments** | payment a giver confirmed with "I've paid" | — |
| **Groups** | group created | — |
| **Group members** | person listed in a group seed (with their share) | — |

Rows are matched by the ID in the first column, so a record's row is updated
in place rather than duplicated. Tabs and column headers are created
automatically on the first submission.

## Setup (about 5 minutes)

1. Create a new Google Sheet (e.g. "Make Room giving").
2. In the sheet, open **Extensions → Apps Script**. Delete the sample code
   and paste in everything from [`apps-script.gs`](./apps-script.gs). Save.
3. Set a token so only the site can write to the sheet: in Apps Script, open
   **Project Settings → Script properties → Add script property**. Name it
   `SHEET_TOKEN` and give it a long random value (e.g. from a password
   generator). Save.
4. Click **Deploy → New deployment**. Choose type **Web app**, set
   **Execute as: Me** and **Who has access: Anyone**, then **Deploy**.
   Approve the permissions prompt. Copy the **Web app URL**
   (it ends in `/exec`).
5. In the site's `.env` (and your hosting provider's environment variables),
   set:

   ```
   VITE_GOOGLE_SHEET_WEBHOOK_URL=<the web app URL>
   VITE_GOOGLE_SHEET_TOKEN=<the same SHEET_TOKEN value>
   ```

6. Rebuild/redeploy the site. Make a test pledge and check the sheet.

If you change `apps-script.gs` later, use **Deploy → Manage deployments →
Edit → Version: New version** so the same URL picks up the change.

## Notes

- The token keeps casual traffic out, but because it ships in the website's
  code it isn't a true secret. Treat the sheet as a convenient copy for the
  team; the database (Supabase) stays the source of truth.
- Syncing runs in the background and never blocks a giver. If Google is
  briefly unavailable, that one update is skipped (it's logged in the
  browser console) — the record is still saved in the database.
- Only submissions made after setup are sent. Earlier records stay in the
  database.
