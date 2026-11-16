# DuesNest agent operating rules

## Mission
Maintain a reliable, simple, self-service membership dues management SaaS. Prioritize correctness, security, and low operating cost over feature volume.

## Branch and release safety
- Work on feature branches from `develop`; open pull requests targeting `develop`.
- Do not merge into `main`, change production deployment configuration, or deploy without explicit owner approval.
- Do not assume `develop` is isolated from Cloudflare production until deployment triggers have been verified outside the repository.
- Do not enable automatic merging until branch protection, required checks, and the production deployment boundary are confirmed.
- Never run destructive D1/PostgreSQL migrations, reset databases, or manipulate production user records without explicit approval.
- Never commit API tokens, passwords, service-role credentials, or personal data.

## Before proposing changes
- Determine the actual deployed architecture and compare it to this branch. The current `main` source includes Supabase and may not represent the intended Cloudflare D1 version.
- Identify environmental dependencies and whether tests run without real credentials.
- Keep modifications small and explain their customer value.
- Run `npm ci`, `npm test`, `npm run build`, and `npm run test:browser` (install Playwright Chromium when needed). If anything cannot run, say so.
- Require review for auth, tenancy boundaries, billing, infrastructure, and migrations.

## Product boundaries
- Membership, organizations, member records, manual dues statuses, and exports are core.
- Do not silently add payment collection, paid integrations, new providers, or customer-visible features without owner approval.
- Favor low-maintenance and self-service workflows; avoid direct sales assumptions.

## Pull request format
Include: summary, files changed, tests/results, risks, migration/rollback notes, and any manual validation needed.

## Outstanding setup steps (not completed by this file)
1. Verify the actual Cloudflare production deployment source and branch trigger.
2. Establish production/development isolation in Cloudflare and separate credentials/databases.
3. Protect production release branch and require passing CI/review.
4. Decide whether the current Supabase main or the Cloudflare D1 migration branch is the correct development baseline.
