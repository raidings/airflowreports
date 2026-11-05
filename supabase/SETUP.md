# Enable cloud report storage

1. Create a Supabase project for Airflow Reports, either directly at Supabase or through Vercel's Supabase integration. Keep the database password private.
2. In the Supabase SQL editor, run `supabase/schema.sql`. It creates the workspace table, enables row-level security, and limits each authenticated user to their own workspace. Browser visitors cannot read or write report data.
3. For a private single-user app, disable new-user signups in Supabase Authentication settings. In Authentication > Users, use Add user / Create user to create your own email/password login. Do not send the password through chat.
4. In Vercel's **airflowreports** project settings, add production environment variables `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` from the Supabase project's API settings. A legacy anon key may instead use `SUPABASE_ANON_KEY`. Do not use a service-role key or an `sb_secret_` key. Redeploy after changing variables.
5. Open the deployed app. Sign in under **Report storage**. Create a synthetic test report, wait for **All changes saved to cloud**, then sign in on another device and verify it appears. Do this before entering real customer records.
6. To move old reports, export a JSON backup from the old app/domain. In the new app, sign in and use **Restore backup**. Alternatively use **Import browser reports** for reports saved on the current domain. Migration is explicit; signing in never uploads guest reports automatically.

## Saving and conflicts

Reports and reusable cabinet profiles are stored as JSON in an owner-scoped workspace row. This preserves all existing report fields; it is not a separately normalized client/cabinet registry yet.

Saves use revision matching. If another device changes the workspace, automatic upload stops rather than overwriting newer data. Export your local backup, load the cloud copy, then restore/merge the edits you want to keep. **Load cloud copy** also stores a browser-local recovery snapshot.

Offline/failed saves remain in a per-account browser cache. Sign back in on the same browser and choose **Sync now** if the cloud revision still matches. A stale cached version triggers conflict handling. Closing the page with pending cloud edits prompts a browser warning where supported.

## Validation boundary

Unit tests cover public configuration safeguards and simulated cloud behaviors. A live Supabase project, SQL setup, two-user isolation checks, and two-device saving checks must pass before cloud storage is considered operational. No database has been provisioned by this code alone.
