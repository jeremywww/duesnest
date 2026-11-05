# Cloudflare D1 migration — implementation checklist

Status: **in progress, not deployed**. The current production application still uses Supabase. Do not remove Supabase or its data until a verified cutover.

## Target
React/Vite static assets hosted by Cloudflare Worker; same-origin /api endpoints in Worker; D1 binding `DB`. Never access D1 directly from browser. Keep the current interface.

## Authentication
D1 is a database, not an auth provider. Replace Supabase Auth with an independently implemented or managed identity provider, verified in the Worker on every request. Prefer a managed identity service with secure httpOnly session cookies and email verification/password recovery; never store raw passwords or auth tokens in D1. Define stable user IDs and account linking for existing Supabase users before import.

## Access controls
D1 does not implement Supabase row-level security. Every organization and member operation must scope by the authenticated user, e.g. `WHERE organization_id IN (SELECT id FROM organizations WHERE owner_id = ?)`. Test cross-tenant reads, writes, deletes, and ID guessing.

## Migration and rollout
1. Select and integrate replacement auth; verify email confirmation, password reset, sessions and sign-out.
2. Implement same-origin API endpoints for organization/member CRUD; validate all inputs and use parameterized SQL. Represent money as integer cents.
3. Create D1 via `npx wrangler d1 create duesnest-db`, then add `d1_databases` binding with the **actual** database_id to wrangler.jsonc.
4. Run `npx wrangler d1 migrations apply duesnest-db --remote` after testing locally.
5. Export organizations and members from Supabase securely, preserve IDs, reconcile users, convert numeric amounts to cents, and import with counts and checksums.
6. Test two distinct accounts, organization isolation, member CRUD, refresh, authentication, and production deployment.
7. Switch frontend to /api only after backend and data are verified. Retain Supabase backup and rollback path; remove old environment variables/dependencies only after cutover.

## Existing data
Do not assume the Supabase database is empty. No production data was migrated by this branch. A live D1 database was not created.
