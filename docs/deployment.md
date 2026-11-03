# Supabase + Cloudflare Pages deployment

## 1. Database and authentication

Create a Supabase project in a US region under the owner's account. Plan/billing selection and project creation occur in that account; no paid plan is assumed by this repository.

Apply `supabase/migrations/202610270001_organizations.sql` with the Supabase SQL editor or `supabase db push` after linking the project. Apply once to a new database. It creates organizations and members, constraints, grants, and row-level security. It does not import the old browser prototype.

In Authentication:

- Enable email/password sign-in and email confirmation.
- Set a password minimum of at least 12 characters to match registration UI validation.
- Set Site URL to the intended frontend origin and add exact development/production redirect URLs. Avoid broad production redirect wildcards.
- Configure and verify a custom SMTP provider for public registration and password recovery before launch. Test real delivery and recovery links, not just the in-app success message.

From Project Settings, obtain the project URL and **publishable** API key. A legacy public anon key is also compatible. Do not use secret/service-role keys, which can bypass access controls.

## 2. Cloudflare Pages

Connect the `jeremywww/duesnest` GitHub repository. Select the reviewed server-backed branch for a private validation deployment, then the merged production branch for launch.

- Build command: `npm ci && npm run build`
- Output directory: `dist`
- Node.js: `24`
- Build environment: `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`

Vite embeds these public settings at build time, so changing them requires rebuilding. Use a separate Supabase development project for previews; do not point unreviewed preview branches at production data. Cloudflare Pages serves the static frontend; Supabase performs authentication and database authorization.

## 3. Release gate

Before entering real member information:

1. Confirm production points to the intended Supabase project and row-level security is enabled on both tables.
2. Register two separate test accounts, confirm both emails, and create one organization per account.
3. Add a member and record dues in account A. Sign in on another device and confirm the same records load.
4. In account B, verify account A's organizations and members cannot be listed, inserted into, updated, or deleted, including direct API requests with known row IDs.
5. Exercise account creation, sign-in/out, and password recovery through the deployed origin.
6. Verify failed/offline writes show an error and do not appear saved. Refresh after reconnecting to inspect server truth.
7. Configure a suitable backup/restore policy for the chosen Supabase plan and verify recovery before a production launch.

Current limitations: one owner per organization; no invitations, history, billing cycles, automatic reminders, offline mode, realtime subscription, or payment collection. No live project or production deployment is created simply by merging this branch.
