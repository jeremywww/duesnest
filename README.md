# DuesNest

Membership management without the mess.

DuesNest uses **Supabase Auth and PostgreSQL** for accounts, organizations, members, and manually recorded dues. There is no browser-local data mode or fallback. Payment collection is outside the initial product scope.

## Implemented in this branch

- Email/password sign-in, account creation with email confirmation, password recovery, and sign-out.
- Create and switch between organizations owned by the signed-in account.
- Add, search, and remove members; manually mark dues paid or unpaid; view organization-specific totals.
- Database row-level security restricts reads and writes to the organization's owner, including requests made outside the UI.
- Writes update the UI only after the database confirms success. Failures remain visible and are not silently saved locally.
- Records are available after signing in on another device. Use **Refresh records** to fetch other devices' changes; realtime subscriptions are not implemented.

Each organization currently has **one owner account**. Staff invitations, shared administration, organization transfer/deletion, billing periods, dues history, automated reminders, and payment processing are not implemented.

## Deployment status

This code requires a Supabase project and frontend deployment before it can serve real users. Repository tests are not proof of a live deployment. Recommended hosting: Cloudflare Workers for this Vite frontend, Supabase for the database and authentication. See [deployment instructions](docs/deployment.md).

## Local development

Use Node.js 24 and npm.

```sh
npm ci
cp .env.example .env
# Fill in the Supabase project URL and public publishable key.
npm run dev
```

Apply `supabase/migrations/202610270001_organizations.sql` to the project's database before using the app. Enable email/password authentication and configure allowed redirect URLs. Only a **publishable** key belongs in `VITE_SUPABASE_PUBLISHABLE_KEY`; never put a secret or service-role key in frontend configuration.

Without configuration, the app displays a not-connected message. It does not create a local workspace.

## Sessions and old prototype data

Sessions stay in memory, with no localStorage or sessionStorage persistence. Reloading or closing the page requires signing in again. This does not remove server records.

The app no longer reads or writes either old prototype storage key. Old records are neither automatically uploaded nor erased. If a prototype browser contains real records, preserve/export them separately before clearing its storage. A reviewed import flow is separate work; the app must not silently assign old records to whichever account signs in first.

## Verification

```sh
npm test
npm run build
npx playwright install chromium
npm run test:browser
```

Database tests run the actual migration in PGlite PostgreSQL, with Supabase's auth identity/roles emulated. They cover owner operations, anonymous denial, cross-account reads/writes/deletes, ownership reassignment, and constraints. Browser tests mock the Supabase API and exercise sign-in, organization switching, member creation, dues updates, refresh, failed writes, sign-out, and absence of browser persistence. They do not replace two-account testing against a real Supabase project.

GitHub Actions runs these checks on pushes and pull requests.
