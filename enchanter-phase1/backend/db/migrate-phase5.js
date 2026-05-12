/**
 * Enchanter — Phase 5 database migration
 * Adds: transfer_tokens table
 *
 * Run: node db/migrate-phase5.js
 */
require('dotenv').config();
const pool = require('./pool');

const SQL = `
-- ─────────────────────────────────────────────
-- SPELLS — add source_spell_id for transferred copies
-- NULL on crafted spells; set to original spell id on transfers.
-- ─────────────────────────────────────────────
ALTER TABLE spells
  ADD COLUMN IF NOT EXISTS source_spell_id UUID REFERENCES spells(id);

CREATE INDEX IF NOT EXISTS spells_source_spell_id_idx ON spells(source_spell_id);

-- ─────────────────────────────────────────────
-- TRANSFER TOKENS
-- Short-lived tokens for QR spell transfer.
-- Expire after 15 minutes; cleaned up on accept or expiry.
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transfer_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token       TEXT NOT NULL UNIQUE,       -- random hex token encoded in QR
  spell_id    UUID NOT NULL REFERENCES spells(id),
  from_user_id UUID NOT NULL REFERENCES users(id),
  expires_at  TIMESTAMPTZ NOT NULL,        -- created_at + 15 minutes
  used        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS transfer_tokens_token_idx ON transfer_tokens(token);
CREATE INDEX IF NOT EXISTS transfer_tokens_spell_id_idx ON transfer_tokens(spell_id);
`;

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Running Phase 5 migration…');
    await client.query(SQL);
    console.log('Migration complete — transfer_tokens table ready.');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
