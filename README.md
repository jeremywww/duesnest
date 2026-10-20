# Duesnest

**Membership management without the mess.**

Duesnest is an early, browser-based prototype for small clubs and organizations to maintain a member directory and track who has paid dues. **It does not process or collect payments.**

## Run locally

Requires Node.js 20.19+ or 22.12+ and npm.

```bash
npm install
npm run dev
```

Open the localhost URL printed by Vite.

## What works today

- Create and switch between independent browser-local organizations.
- Add members with name, email, and dues amount within the selected organization.
- Search your member directory.
- Mark dues paid or unpaid manually.
- View member counts, recorded dues, and outstanding dues.
- Remove members.
- Keep data between reloads using browser localStorage.

## Important limitations

This is a **single-browser prototype**, not a production service. Data stays on the same browser/device, is not backed up or shared, and can be lost if browser storage is cleared. Organization separation is a local data boundary, not a security boundary: anyone with access to this browser can switch organizations. There is no authentication, server/database, billing-cycle tracking, authorization, or member self-service yet. Do not enter real personal member information before a secured backend is built.

## Organizations and existing data

Each organization has its own member list, paid/unpaid statuses, search view, and totals. New organizations start empty. The selected organization persists across reloads. Names must be nonblank and unique (case-insensitive).

Existing `duesnest:members:v1` data is imported into “My organization” when no new-format data exists. The old key is retained as a fallback; subsequent loads use `duesnest:organizations:v2` and do not import members again. Unreadable data blocks loading rather than overwriting saved records. Storage write failures show an error; keep the page open until storage is available again.

## Tests

With Node.js 22.18+ (or Node.js 24):

```bash
npm test
npm run build
```

Tests cover organization boundaries, migration, persistence, validation, and corrupt storage.

## Direction

Next milestone: authenticated organizations and a server-side database with isolated organization records, then membership periods and dues history. Payment collection is intentionally out of scope for the initial product.

## Build

```bash
npm run build
```

