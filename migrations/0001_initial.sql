-- DuesNest Cloudflare D1 schema. Monetary amounts are integer cents.
-- All organization-scoped queries MUST verify owner_id server-side.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL COLLATE NOCASE UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 120),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS organizations_owner_name
  ON organizations(owner_id, lower(trim(name)));

CREATE TABLE IF NOT EXISTS members (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 120),
  email TEXT NOT NULL CHECK (length(email) <= 254),
  amount_cents INTEGER NOT NULL CHECK (amount_cents BETWEEN 0 AND 100000000),
  paid INTEGER NOT NULL DEFAULT 0 CHECK (paid IN (0,1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS members_organization_created
  ON members(organization_id, created_at);
