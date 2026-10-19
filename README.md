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

- Add members with name, email, and dues amount.
- Search your member directory.
- Mark dues paid or unpaid manually.
- View member counts, recorded dues, and outstanding dues.
- Remove members.
- Keep data between reloads using browser localStorage.

## Important limitations

This is a **single-browser prototype**, not a production service. Data stays on the same browser/device, is not backed up or shared, and can be lost if browser storage is cleared. There is no authentication, server/database, billing-cycle tracking, authorization, or member self-service yet. Do not enter real personal member information before a secured backend is built.

## Direction

Next milestone: authenticated organizations and a server-side database with isolated organization records, then membership periods and dues history. Payment collection is intentionally out of scope for the initial product.

## Build

```bash
npm run build
```
