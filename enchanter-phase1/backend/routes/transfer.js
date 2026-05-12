/**
 * routes/transfer.js
 *
 * POST /api/v1/transfer/generate  — generate a transfer token (QR payload)
 * GET  /api/v1/transfer/preview/:token — preview spell before accepting
 * POST /api/v1/transfer/accept    — accept a transfer, copy spell, record lineage
 *
 * Spec section 7.5 and Phase 5 build brief.
 * Phase 6 addition: transfer degradation.
 *
 * Transfer flow:
 *   1. Sender calls /generate with their spell_id.
 *      Server checks they own the spell, fetches current conditions and
 *      compares them against the original site's affinities to calculate a
 *      quality factor (0.50–0.90).  Degraded spell metrics are computed and
 *      stored on the token row.  The token + degraded preview are returned.
 *      App encodes token as a QR code.
 *
 *   2. Recipient scans QR, which gives them the token.
 *      App calls /accept with the token.
 *      Server validates token, creates a new spell row using the pre-computed
 *      degraded metrics (not the original's), records lineage, marks token used.
 *      Returns the new (degraded) spell.
 *
 * Degradation logic:
 *   At generation time the server fetches live conditions and compares each of
 *   the four affinity axes (lunar, geo, tod, season) against the spell's
 *   originating site affinities.  Each axis that matches awards a point.
 *
 *     quality = 0.50 + (matched_axes / 4) × 0.40
 *
 *   This gives 0.50 (no match) → 0.60 → 0.70 → 0.80 → 0.90 (full match).
 *
 *   degraded_power_score = clamp(original_power_score × quality, 1.0, 10.0)
 *   degraded_cost        = round(degraded_power_score)
 *   duration/range/concentration are re-derived via scoreTiers().
 *
 * Axis matching rules:
 *   Lunar  — lunar_slot at generation matches site's affinity_lunar slot
 *   Geo    — geo_slot at generation matches site's affinity_geo slot
 *   ToD    — tod_slot at generation matches site's affinity_tod slot
 *   Season — current season matches site's affinity_season
 */

const express = require('express');
const crypto  = require('crypto');
const pool    = require('../db/pool');
const { requireAuth }             = require('../middleware/auth');
const { scoreTiers }              = require('../lib/formula');
const { getLunarPhase }           = require('../lib/lunar');
const { getPressure }             = require('../lib/pressure');
const { getKpIndex }              = require('../lib/kp');
const { getTodSlot, getSeason }   = require('../lib/timeOfDay');

const router = express.Router();

const TOKEN_TTL_MS = 15 * 60 * 1000; // 15 minutes

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch the current celestial conditions relevant to degradation scoring.
 * Mirrors the logic in spells.js fetchConditions() but returns only what
 * the degradation calculation needs.
 *
 * @param {Object} site - Full site record (needs site_type, latitude, longitude)
 * @returns {Object} { lunar_slot, geo_slot, tod_slot, season }
 */
async function fetchTransferConditions(site) {
  const now = new Date();

  const { lunar_slot } = getLunarPhase(now);
  const tod_slot       = getTodSlot(now, site.latitude, site.longitude);
  const season         = getSeason(now);

  let geo_slot;
  if (site.site_type === 'coastal') {
    ({ geo_slot } = await getPressure(site.latitude, site.longitude));
  } else {
    ({ geo_slot } = await getKpIndex());
  }

  return { lunar_slot, geo_slot, tod_slot, season };
}

/**
 * Calculate the transfer quality factor by comparing current conditions
 * against the site's ideal affinities.
 *
 * Each of the four axes contributes equally.  A matching axis = 1 point.
 *
 *   quality = 0.50 + (matched / 4) × 0.40
 *
 * Returns a value in { 0.50, 0.60, 0.70, 0.80, 0.90 }.
 *
 * Axis matching:
 *   Lunar  — current lunar_slot === site.affinity_lunar
 *   Geo    — current geo_slot   === site.affinity_geo
 *   ToD    — current tod_slot   === site.affinity_tod
 *   Season — current season     === site.affinity_season
 *
 * @param {Object} site       - Site record with affinity_* fields
 * @param {Object} conditions - { lunar_slot, geo_slot, tod_slot, season }
 * @returns {{ quality: number, matched_axes: number, axis_detail: Object }}
 */
function calculateTransferQuality(site, conditions) {
  const { lunar_slot, geo_slot, tod_slot, season } = conditions;

  const axisDetail = {
    lunar:  lunar_slot === site.affinity_lunar,
    geo:    geo_slot   === site.affinity_geo,
    tod:    tod_slot   === site.affinity_tod,
    season: season     === site.affinity_season,
  };

  const matched = Object.values(axisDetail).filter(Boolean).length;
  const quality = parseFloat((0.50 + (matched / 4) * 0.40).toFixed(3));

  return { quality, matched_axes: matched, axis_detail: axisDetail };
}

/**
 * Apply quality factor to a spell's power metrics.
 * Re-derives tiers from the degraded score so all values stay consistent.
 *
 * @param {number} originalScore - The original spell's power_score
 * @param {number} quality       - 0.50–0.90
 * @returns {{ degraded_power_score, degraded_cost, degraded_duration_tier,
 *             degraded_range_tier, degraded_concentration }}
 */
function applyDegradation(originalScore, quality) {
  const raw = parseFloat((originalScore * quality).toFixed(2));
  const degraded_power_score = parseFloat(Math.max(1.0, Math.min(10.0, raw)).toFixed(2));
  const degraded_cost = Math.round(degraded_power_score);
  const tiers = scoreTiers(degraded_power_score);

  return {
    degraded_power_score,
    degraded_cost,
    degraded_duration_tier: tiers.duration_tier,
    degraded_range_tier:    tiers.range_tier,
    degraded_concentration: tiers.concentration,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/transfer/generate
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Body: { spell_id }
 *
 * Caller must own the spell.  Calculates transfer degradation at this moment
 * and stores the result on the token so /accept can use it without recalculating.
 *
 * Returns:
 *   {
 *     token, spell_id, expires_at,
 *     spell: { name, site_spell_name, power_score },
 *     transfer: {
 *       quality,          — 0.50–0.90
 *       matched_axes,     — 0–4
 *       axis_detail,      — { lunar, geo, tod, season } booleans
 *       degraded_power_score,
 *       degraded_cost,
 *       degraded_duration_tier,
 *       degraded_range_tier,
 *       degraded_concentration,
 *     }
 *   }
 */
router.post('/generate', requireAuth, async (req, res, next) => {
  try {
    const { spell_id } = req.body;
    if (!spell_id) return res.status(400).json({ error: 'spell_id is required' });

    // ── Fetch spell + site ───────────────────────────────────────────────────
    const { rows: spellRows } = await pool.query(
      `SELECT
         s.id, s.name, s.creator_id, s.power_score,
         si.spell_name AS site_spell_name,
         si.site_type,
         si.latitude,
         si.longitude,
         si.affinity_lunar,
         si.affinity_geo,
         si.affinity_tod,
         si.affinity_season
       FROM spells s
       JOIN sites si ON si.id = s.site_id
       WHERE s.id = $1`,
      [spell_id]
    );
    if (spellRows.length === 0) return res.status(404).json({ error: 'Spell not found' });

    const spell = spellRows[0];

    if (spell.creator_id !== req.user.id) {
      return res.status(403).json({ error: 'You do not own this spell' });
    }

    // ── Calculate degradation ────────────────────────────────────────────────
    const conditions = await fetchTransferConditions(spell);
    const { quality, matched_axes, axis_detail } = calculateTransferQuality(spell, conditions);
    const degraded = applyDegradation(spell.power_score, quality);

    // ── Create token ─────────────────────────────────────────────────────────
    const token      = crypto.randomBytes(32).toString('hex');
    const expires_at = new Date(Date.now() + TOKEN_TTL_MS);

    await pool.query(
      `INSERT INTO transfer_tokens (
         token, spell_id, from_user_id, expires_at,
         transfer_quality,
         degraded_power_score, degraded_cost,
         degraded_duration_tier, degraded_range_tier, degraded_concentration
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        token, spell_id, req.user.id, expires_at,
        quality,
        degraded.degraded_power_score,
        degraded.degraded_cost,
        degraded.degraded_duration_tier,
        degraded.degraded_range_tier,
        degraded.degraded_concentration,
      ]
    );

    res.status(201).json({
      token,
      spell_id,
      expires_at: expires_at.toISOString(),
      spell: {
        name:            spell.name,
        site_spell_name: spell.site_spell_name,
        power_score:     spell.power_score,
      },
      transfer: {
        quality,
        matched_axes,
        axis_detail,
        ...degraded,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/transfer/preview/:token
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Preview the spell behind a token before the recipient commits to accepting.
 * Returns spell details + lineage + degraded values so the receive screen can
 * show both original and what the recipient will actually get.
 * Does NOT consume the token.
 */
router.get('/preview/:token', requireAuth, async (req, res, next) => {
  try {
    const { token } = req.params;

    const { rows: tokenRows } = await pool.query(
      `SELECT t.*, u.username AS from_username
       FROM transfer_tokens t
       JOIN users u ON u.id = t.from_user_id
       WHERE t.token = $1`,
      [token]
    );

    if (tokenRows.length === 0) return res.status(404).json({ error: 'Invalid transfer token' });
    const tr = tokenRows[0];

    if (tr.used)                              return res.status(410).json({ error: 'token_used',         message: 'This transfer has already been completed.' });
    if (new Date(tr.expires_at) < new Date()) return res.status(410).json({ error: 'token_expired',      message: 'This transfer token has expired.' });
    if (tr.from_user_id === req.user.id)      return res.status(400).json({ error: 'cannot_self_transfer', message: 'You cannot transfer a spell to yourself.' });

    // Fetch the spell with lineage
    const { rows: spellRows } = await pool.query(
      `SELECT
        s.*,
        u.username AS creator_username,
        si.name AS site_name,
        si.spell_name AS site_spell_name,
        si.effect_description,
        si.region,
        si.site_type
       FROM spells s
       JOIN users u ON u.id = s.creator_id
       JOIN sites si ON si.id = s.site_id
       WHERE s.id = $1`,
      [tr.spell_id]
    );
    if (spellRows.length === 0) return res.status(404).json({ error: 'Spell not found' });

    const spell = spellRows[0];

    const { rows: lineageRows } = await pool.query(
      `SELECT l.id, l.transferred_at,
              fu.username AS from_username,
              tu.username AS to_username
       FROM lineage l
       JOIN users fu ON fu.id = l.from_user_id
       JOIN users tu ON tu.id = l.to_user_id
       WHERE l.spell_id = $1
       ORDER BY l.transferred_at ASC`,
      [tr.spell_id]
    );

    res.json({
      token,
      from_username: tr.from_username,
      expires_at:    tr.expires_at,
      spell: { ...spell, lineage: lineageRows },
      // Degraded values pre-calculated at generation time
      transfer: {
        quality:                  tr.transfer_quality,
        degraded_power_score:     tr.degraded_power_score,
        degraded_cost:            tr.degraded_cost,
        degraded_duration_tier:   tr.degraded_duration_tier,
        degraded_range_tier:      tr.degraded_range_tier,
        degraded_concentration:   tr.degraded_concentration,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/transfer/accept
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Body: { token }
 *
 * Validates the token, then:
 *   1. Creates a copy of the spell using the pre-computed degraded metrics
 *      (power_score, cost, duration_tier, range_tier, concentration) rather
 *      than the original's values.  All other fields (site, fingerprint data,
 *      expressions, name) are copied from the original unchanged.
 *   2. Inserts a lineage row: from_user_id → to_user_id.
 *   3. Marks the token as used.
 *
 * Returns the new (degraded) spell.
 *
 * Error codes:
 *   token_expired        — token is past its 15 min window
 *   token_used           — token has already been consumed
 *   cannot_self_transfer — sender and recipient are the same user
 *   already_owned        — recipient already has a copy of this spell
 *   spell_banned         — spell is on the community ban list
 */
router.post('/accept', requireAuth, async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'token is required' });

    // ── Validate token ───────────────────────────────────────────────────────
    const { rows: tokenRows } = await client.query(
      `SELECT t.*, u.username AS from_username
       FROM transfer_tokens t
       JOIN users u ON u.id = t.from_user_id
       WHERE t.token = $1`,
      [token]
    );

    if (tokenRows.length === 0) return res.status(404).json({ error: 'Invalid transfer token' });
    const tr = tokenRows[0];

    if (tr.used)                              return res.status(410).json({ error: 'token_used',          message: 'This transfer has already been completed.' });
    if (new Date(tr.expires_at) < new Date()) return res.status(410).json({ error: 'token_expired',       message: 'This transfer token has expired.' });
    if (tr.from_user_id === req.user.id)      return res.status(400).json({ error: 'cannot_self_transfer', message: 'You cannot transfer a spell to yourself.' });

    // ── Check recipient exists ───────────────────────────────────────────────
    const { rows: recipientRows } = await client.query(
      'SELECT id FROM users WHERE id = $1',
      [req.user.id]
    );
    if (recipientRows.length === 0) {
      return res.status(403).json({ error: 'User profile not found. Please complete registration.' });
    }

    // ── Fetch original spell ─────────────────────────────────────────────────
    const { rows: spellRows } = await client.query(
      'SELECT * FROM spells WHERE id = $1',
      [tr.spell_id]
    );
    if (spellRows.length === 0) return res.status(404).json({ error: 'Spell not found' });
    const original = spellRows[0];

    if (original.is_banned) {
      return res.status(403).json({ error: 'spell_banned', message: 'This spell has been banned by the community.' });
    }

    // ── Check recipient doesn't already own a copy ───────────────────────────
    const { rows: alreadyOwned } = await client.query(
      `SELECT id FROM spells
       WHERE creator_id = $1
         AND (id = $2 OR source_spell_id = $2)`,
      [req.user.id, tr.spell_id]
    );
    if (alreadyOwned.length > 0) {
      return res.status(409).json({ error: 'already_owned', message: 'You already have a copy of this spell.' });
    }

    await client.query('BEGIN');

    // ── Create degraded spell copy ───────────────────────────────────────────
    // All crafting fingerprint data and expressions are copied from the original.
    // power_score, cost, duration_tier, range_tier, concentration are replaced
    // with the pre-computed degraded values from the token row.
    const transferHash = `transfer:${tr.spell_id}:${req.user.id}:${Date.now()}`;

    const COPY_SQL = `
      INSERT INTO spells (
        site_id, creator_id, name,
        expression_incantation, expression_delivery, expression_colour,
        expression_sound, expression_notes,
        crafted_at, lunar_phase, lunar_slot,
        geo_value, geo_slot, tod_slot, season, calendar_event,
        power_score, cost, duration_tier, range_tier, concentration,
        event_modifier, fingerprint_hash, source_spell_id
      )
      SELECT
        site_id, $1, name,
        expression_incantation, expression_delivery, expression_colour,
        expression_sound, expression_notes,
        crafted_at, lunar_phase, lunar_slot,
        geo_value, geo_slot, tod_slot, season, calendar_event,
        $3, $4, $5, $6, $7,
        event_modifier, $2, $8
      FROM spells WHERE id = $8
      RETURNING *
    `;

    const { rows: newSpellRows } = await client.query(COPY_SQL, [
      req.user.id,                          // $1 creator_id
      transferHash,                          // $2 fingerprint_hash
      tr.degraded_power_score,               // $3 power_score
      tr.degraded_cost,                      // $4 cost
      tr.degraded_duration_tier,             // $5 duration_tier
      tr.degraded_range_tier,                // $6 range_tier
      tr.degraded_concentration,             // $7 concentration
      tr.spell_id,                           // $8 source_spell_id (also used in SELECT FROM)
    ]);
    const newSpell = newSpellRows[0];

    // ── Record lineage ───────────────────────────────────────────────────────
    await client.query(
      `INSERT INTO lineage (spell_id, from_user_id, to_user_id)
       VALUES ($1, $2, $3)`,
      [tr.spell_id, tr.from_user_id, req.user.id]
    );

    // ── Mark token used ──────────────────────────────────────────────────────
    await client.query(
      'UPDATE transfer_tokens SET used = TRUE WHERE token = $1',
      [token]
    );

    await client.query('COMMIT');

    // ── Return enriched new spell ────────────────────────────────────────────
    const { rows: enriched } = await client.query(
      `SELECT
        s.*,
        u.username AS creator_username,
        si.name AS site_name,
        si.spell_name AS site_spell_name,
        si.effect_description,
        si.region,
        si.site_type
       FROM spells s
       JOIN users u ON u.id = s.creator_id
       JOIN sites si ON si.id = s.site_id
       WHERE s.id = $1`,
      [newSpell.id]
    );

    res.status(201).json({
      ...enriched[0],
      transferred_from:   tr.from_username,
      transfer_quality:   tr.transfer_quality,
    });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    next(err);
  } finally {
    client.release();
  }
});

module.exports = router;
