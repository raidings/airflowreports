# Airflow Reports

Standalone BSC report builder prepared for `raidings/airflowreports` and a separate Vercel project.

## Current features

- Cabinet profiles and customer/location details
- Airflow averages, opening areas, and CFM/FPM calculations
- Calculated aerosol challenge: `(13500 * nozzles) / Q`
- Supply and exhaust HEPA method limits, patch limits, and aerosol minimums
- Black-and-white PDF download with intact rows and automatic pagination
- Browser-local report saving and JSON backup/restore

## Vercel

Import this repository as a new Vercel project. Use the repository root and the included `vercel.json`. No build command or dependency installation is required. Static output lives in `public/`.

This project is separate from the business website.

## Local testing

Run `python -m http.server 8000 --directory public` from the repository root, then open http://localhost:8000.

## Storage behavior

The current app saves in browser local storage only. Hosting on Vercel does not create a shared database or enable cross-device synchronization. Supabase login, owner-scoped database policies, and synchronization are included but require the setup below before relying on shared storage. Export a JSON backup from the old app before migrating; browser storage does not move across domains.

Never commit customer reports, credentials, database service keys, or `.env` files.

## Cloud setup prepared

The app now includes optional email/password sign-in and Supabase workspace saving. Follow [supabase/SETUP.md](supabase/SETUP.md) and run [supabase/schema.sql](supabase/schema.sql). Set the environment variables listed in `.env.example` directly in Vercel. No secrets belong in this repository.

Until configuration is present, the app continues to operate in browser-only mode. Live database setup and cross-device verification are still required.

Run configuration tests with `node --test tests/config.test.cjs`.
