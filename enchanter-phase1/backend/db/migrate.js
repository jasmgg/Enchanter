/**
 * Enchanter — Phase 1 database migration
 * Creates: users, sites, spells, lineage, votes, bookmarks
 *
 * Run: node db/migrate.js
 */
require('dotenv').config();
const pool = require('./pool');

const SQL = `
-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─────────────────────────────────────────────
-- USERS (managed by Supabase Auth; mirrored here
--         for foreign key references and display)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username    TEXT UNIQUE NOT NULL,
  email       TEXT UNIQUE NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- SITES
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sites (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT NOT NULL,
  latitude            FLOAT NOT NULL,
  longitude           FLOAT NOT NULL,
  radius_metres       INTEGER NOT NULL DEFAULT 200,
  site_type           TEXT NOT NULL CHECK (site_type IN ('coastal', 'landlocked')),
  effect_description  TEXT NOT NULL,
  spell_name          TEXT NOT NULL,
  lore_note           TEXT,
  region              TEXT,
  affinity_lunar      TEXT NOT NULL CHECK (affinity_lunar IN ('light', 'dark')),
  affinity_geo        TEXT NOT NULL CHECK (affinity_geo IN ('high_pressure', 'low_pressure', 'calm_solar', 'charged_solar')),
  affinity_tod        TEXT NOT NULL CHECK (affinity_tod IN ('light', 'dark')),
  affinity_season     TEXT NOT NULL CHECK (affinity_season IN ('spring', 'summer', 'autumn', 'winter'))
);

-- ─────────────────────────────────────────────
-- SPELLS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS spells (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id               UUID NOT NULL REFERENCES sites(id),
  creator_id            UUID NOT NULL REFERENCES users(id),
  name                  TEXT NOT NULL CHECK (char_length(name) <= 60),

  -- Expression fields (all optional except name)
  expression_incantation  TEXT,
  expression_delivery     TEXT CHECK (expression_delivery IN ('spoken', 'signed', 'hummed', 'silent')),
  expression_colour       TEXT,
  expression_sound        TEXT,
  expression_notes        TEXT CHECK (char_length(expression_notes) <= 200),

  -- Crafting fingerprint
  crafted_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  lunar_phase       FLOAT NOT NULL,
  lunar_slot        TEXT NOT NULL CHECK (lunar_slot IN ('new', 'crescent', 'quarter', 'gibbous', 'full')),
  geo_value         FLOAT,
  geo_slot          TEXT NOT NULL,   -- pressure or Kp slots — validated in app logic
  tod_slot          TEXT NOT NULL CHECK (tod_slot IN ('midnight', 'dawn', 'morning', 'noon', 'afternoon', 'dusk')),
  season            TEXT NOT NULL CHECK (season IN ('spring', 'summer', 'autumn', 'winter')),
  calendar_event    TEXT,

  -- Computed outputs
  power_score       FLOAT NOT NULL CHECK (power_score >= 1.0 AND power_score <= 10.0),
  cost              INTEGER NOT NULL,
  duration_tier     TEXT NOT NULL CHECK (duration_tier IN ('instant', 'short', 'long', 'permanent')),
  range_tier        TEXT NOT NULL CHECK (range_tier IN ('self', 'touch', 'near', 'far')),
  concentration     BOOLEAN NOT NULL DEFAULT FALSE,
  event_modifier    TEXT,

  -- Deduplication
  fingerprint_hash  TEXT NOT NULL UNIQUE,

  -- Social
  upvotes    INTEGER NOT NULL DEFAULT 0,
  downvotes  INTEGER NOT NULL DEFAULT 0,
  is_banned  BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS spells_site_id_idx ON spells(site_id);
CREATE INDEX IF NOT EXISTS spells_creator_id_idx ON spells(creator_id);
CREATE INDEX IF NOT EXISTS spells_power_score_idx ON spells(power_score DESC);

-- ─────────────────────────────────────────────
-- LINEAGE  (append-only)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lineage (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spell_id        UUID NOT NULL REFERENCES spells(id),
  from_user_id    UUID NOT NULL REFERENCES users(id),
  to_user_id      UUID NOT NULL REFERENCES users(id),
  transferred_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS lineage_spell_id_idx ON lineage(spell_id);

-- ─────────────────────────────────────────────
-- VOTES
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS votes (
  user_id   UUID NOT NULL REFERENCES users(id),
  spell_id  UUID NOT NULL REFERENCES spells(id),
  vote      TEXT NOT NULL CHECK (vote IN ('up', 'down')),
  voted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, spell_id)
);

-- ─────────────────────────────────────────────
-- BOOKMARKS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bookmarks (
  user_id        UUID NOT NULL REFERENCES users(id),
  spell_id       UUID NOT NULL REFERENCES spells(id),
  bookmarked_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, spell_id)
);
`;

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Running Phase 1 migration…');
    await client.query(SQL);
    console.log('Migration complete.');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
