/**
 * routes/spells.js
 *
 * POST   /api/v1/spells            — Craft a new spell (auth required)
 * GET    /api/v1/spells            — Browse the global library (public)
 * GET    /api/v1/spells/:id        — Single spell with lineage (public)
 * GET    /api/v1/spells/:id/lineage — Full lineage chain (public)
 *
 * Spec sections 3, 7, and the POST /spells endpoint in section 7.3.
 */
const express = require('express');
const crypto = require('crypto');
const pool = require('../db/pool');
const { requireAuth } = require('../middleware/auth');
const { calculatePower } = require('../lib/formula');
const { getLunarPhase } = require('../lib/lunar');
const { getPressure } = require('../lib/pressure');
const { getKpIndex } = require('../lib/kp');
const { getTodSlot, getSeason } = require('../lib/timeOfDay');
const { getCalendarEvent, getEventModifier } = require('../lib/calendar');

const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build the SHA-256 fingerprint hash from the spell's crafting inputs.
 * Spec: SHA256(site_id + lunar_slot + geo_slot + tod_slot + season + calendar_event)
 * calendar_event is 'none' when null so it's always a consistent string.
 */
function buildFingerprintHash(siteId, lunarSlot, geoSlot, todSlot, season, calendarEvent) {
  const input = [siteId, lunarSlot, geoSlot, todSlot, season, calendarEvent ?? 'none'].join('|');
  return crypto.createHash('sha256').update(input).digest('hex');
}

/**
 * Fetch celestial conditions for a site at the current moment.
 * Returns everything needed for formula + fingerprint.
 */
async function fetchConditions(site, lat, lng) {
  const now = new Date();

  const { lunar_phase, lunar_slot } = getLunarPhase(now);
  const tod_slot = getTodSlot(now, lat ?? site.latitude, lng ?? site.longitude);
  const season = getSeason(now);
  const calendar_event = getCalendarEvent(now);
  const event_modifier = getEventModifier(calendar_event);

  let geo_value, geo_slot;

  if (site.site_type === 'coastal') {
    ({ geo_value, geo_slot } = await getPressure(site.latitude, site.longitude));
  } else {
    ({ geo_value, geo_slot } = await getKpIndex());
  }

  return {
    lunar_phase,
    lunar_slot,
    geo_value,
    geo_slot,
    tod_slot,
    season,
    calendar_event,
    event_modifier,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/spells — Craft a new spell
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Body:
 *   site_id               (required)
 *   name                  (required, max 60 chars)
 *   expression_incantation  (optional)
 *   expression_delivery     (optional: spoken|signed|hummed|silent)
 *   expression_colour       (optional)
 *   expression_sound        (optional)
 *   expression_notes        (optional, max 200 chars)
 *   lat, lng              (optional — device coords for precise ToD; site coords used if absent)
 *
 * The server fetches live celestial conditions, runs the formula, computes the
 * fingerprint hash, checks for duplicates, then inserts.
 */
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const {
      site_id,
      name,
      expression_incantation,
      expression_delivery,
      expression_colour,
      expression_sound,
      expression_notes,
      lat,
      lng,
    } = req.body;

    // ── Validation ──────────────────────────────────────────────────────────
    if (!site_id) return res.status(400).json({ error: 'site_id is required' });
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'name is required' });
    }
    if (name.length > 60) {
      return res.status(400).json({ error: 'name must be 60 characters or fewer' });
    }
    if (expression_notes && expression_notes.length > 200) {
      return res.status(400).json({ error: 'expression_notes must be 200 characters or fewer' });
    }
    const VALID_DELIVERIES = ['spoken', 'signed', 'hummed', 'silent'];
    if (expression_delivery && !VALID_DELIVERIES.includes(expression_delivery)) {
      return res.status(400).json({ error: `expression_delivery must be one of: ${VALID_DELIVERIES.join(', ')}` });
    }

    // ── Look up site ─────────────────────────────────────────────────────────
    const { rows: siteRows } = await pool.query('SELECT * FROM sites WHERE id = $1', [site_id]);
    if (siteRows.length === 0) return res.status(404).json({ error: 'Site not found' });
    const site = siteRows[0];

    // ── Look up user (ensure they exist in our users table) ──────────────────
    const { rows: userRows } = await pool.query('SELECT id FROM users WHERE id = $1', [req.user.id]);
    if (userRows.length === 0) {
      return res.status(403).json({ error: 'User profile not found. Please complete registration.' });
    }

    // ── Fetch live celestial conditions ──────────────────────────────────────
    const conditions = await fetchConditions(
      site,
      lat != null ? parseFloat(lat) : null,
      lng != null ? parseFloat(lng) : null
    );

    // ── Run formula ──────────────────────────────────────────────────────────
    const power = calculatePower(site, conditions);

    // ── Apply calendar event modifier to duration if needed ──────────────────
    let duration_tier = power.duration_tier;
    let range_tier = power.range_tier;
    let concentration = power.concentration;

    if (conditions.event_modifier === 'duration_extend') {
      const TIERS = ['instant', 'short', 'long', 'permanent'];
      const idx = TIERS.indexOf(duration_tier);
      if (idx < TIERS.length - 1) duration_tier = TIERS[idx + 1];
    }
    if (conditions.event_modifier === 'permanent') {
      duration_tier = 'permanent';
    }

    // ── Fingerprint + duplicate detection ────────────────────────────────────
    const fingerprint_hash = buildFingerprintHash(
      site_id,
      conditions.lunar_slot,
      conditions.geo_slot,
      conditions.tod_slot,
      conditions.season,
      conditions.calendar_event
    );

    const { rows: dupeRows } = await pool.query(
      `SELECT s.id, s.name, s.power_score, u.username AS creator_username
       FROM spells s
       JOIN users u ON u.id = s.creator_id
       WHERE s.fingerprint_hash = $1`,
      [fingerprint_hash]
    );

    if (dupeRows.length > 0) {
      // Duplicate conditions — return the existing entry.
      // Per spec: user sees the existing entry and may abandon or proceed with a
      // different name under the original fingerprint entry.
      return res.status(409).json({
        error: 'duplicate_fingerprint',
        message: 'A spell with identical crafting conditions already exists.',
        existing_spell: dupeRows[0],
        fingerprint_hash,
      });
    }

    // ── Insert spell ─────────────────────────────────────────────────────────
    const INSERT_SQL = `
      INSERT INTO spells (
        site_id, creator_id, name,
        expression_incantation, expression_delivery, expression_colour,
        expression_sound, expression_notes,
        crafted_at, lunar_phase, lunar_slot,
        geo_value, geo_slot, tod_slot, season, calendar_event,
        power_score, cost, duration_tier, range_tier, concentration,
        event_modifier, fingerprint_hash
      ) VALUES (
        $1,  $2,  $3,
        $4,  $5,  $6,
        $7,  $8,
        NOW(), $9, $10,
        $11, $12, $13, $14, $15,
        $16, $17, $18, $19, $20,
        $21, $22
      )
      RETURNING *
    `;

    const { rows: inserted } = await pool.query(INSERT_SQL, [
      site_id,
      req.user.id,
      name.trim(),
      expression_incantation ?? null,
      expression_delivery ?? null,
      expression_colour ?? null,
      expression_sound ?? null,
      expression_notes ?? null,
      conditions.lunar_phase,
      conditions.lunar_slot,
      conditions.geo_value,
      conditions.geo_slot,
      conditions.tod_slot,
      conditions.season,
      conditions.calendar_event,
      power.power_score,
      power.cost,
      duration_tier,
      range_tier,
      concentration,
      conditions.event_modifier,
      fingerprint_hash,
    ]);

    const spell = inserted[0];

    res.status(201).json({
      ...spell,
      site: {
        id: site.id,
        name: site.name,
        spell_name: site.spell_name,
        effect_description: site.effect_description,
        site_type: site.site_type,
        region: site.region,
      },
      coefficients: {
        lunar: power.lunar_coeff,
        geo: power.geo_coeff,
        tod: power.tod_coeff,
        season_bonus: power.season_bonus,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/spells — Global library (paginated, filterable, sortable)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Query params:
 *   page          (default 1)
 *   limit         (default 20, max 100)
 *   site_id       filter by site
 *   duration_tier filter by duration tier
 *   min_score     filter by minimum power score
 *   max_score     filter by maximum power score
 *   search        partial match on spell name or creator username
 *   sort          power_score_desc (default) | power_score_asc | date_desc | date_asc | upvotes_desc
 *   include_banned  'true' to include banned spells (hidden by default)
 */
router.get('/', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const {
      site_id,
      duration_tier,
      min_score,
      max_score,
      search,
      sort = 'power_score_desc',
      include_banned = 'false',
    } = req.query;

    const conditions = [];
    const params = [];

    if (include_banned !== 'true') {
      conditions.push('s.is_banned = FALSE');
    }
    if (site_id) {
      params.push(site_id);
      conditions.push(`s.site_id = $${params.length}`);
    }
    if (duration_tier) {
      params.push(duration_tier);
      conditions.push(`s.duration_tier = $${params.length}`);
    }
    if (min_score) {
      params.push(parseFloat(min_score));
      conditions.push(`s.power_score >= $${params.length}`);
    }
    if (max_score) {
      params.push(parseFloat(max_score));
      conditions.push(`s.power_score <= $${params.length}`);
    }
    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(s.name ILIKE $${params.length} OR u.username ILIKE $${params.length})`);
    }

    const WHERE = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const ORDER_MAP = {
      power_score_desc: 's.power_score DESC',
      power_score_asc:  's.power_score ASC',
      date_desc:        's.crafted_at DESC',
      date_asc:         's.crafted_at ASC',
      upvotes_desc:     's.upvotes DESC',
    };
    const ORDER = ORDER_MAP[sort] || ORDER_MAP.power_score_desc;

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM spells s JOIN users u ON u.id = s.creator_id ${WHERE}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    params.push(limit, offset);
    const { rows } = await pool.query(
      `SELECT
        s.id, s.name, s.power_score, s.cost, s.duration_tier, s.range_tier,
        s.concentration, s.upvotes, s.downvotes, s.is_banned,
        s.lunar_slot, s.geo_slot, s.tod_slot, s.season, s.calendar_event,
        s.event_modifier, s.crafted_at,
        u.username AS creator_username,
        si.name AS site_name, si.spell_name, si.region, si.site_type
       FROM spells s
       JOIN users u ON u.id = s.creator_id
       JOIN sites si ON si.id = s.site_id
       ${WHERE}
       ORDER BY ${ORDER}
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({
      data: rows,
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/spells/mine — current user's spells only
router.get('/mine', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT
        s.id, s.name, s.power_score, s.cost, s.duration_tier, s.range_tier,
        s.concentration, s.upvotes, s.downvotes,
        s.lunar_slot, s.geo_slot, s.tod_slot, s.season, s.calendar_event,
        s.event_modifier, s.crafted_at,
        u.username AS creator_username,
        si.name AS site_name, si.spell_name AS site_spell_name, si.region, si.site_type
       FROM spells s
       JOIN users u ON u.id = s.creator_id
       JOIN sites si ON si.id = s.site_id
       WHERE s.creator_id = $1
       ORDER BY s.crafted_at DESC`,
      [req.user.id]
    );
    res.json({ data: rows, pagination: { page: 1, limit: rows.length, total: rows.length, total_pages: 1 } });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/spells/:id — Single spell with lineage
// ─────────────────────────────────────────────────────────────────────────────

router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const { rows: spellRows } = await pool.query(
      `SELECT
        s.*,
        u.username AS creator_username,
        si.name AS site_name,
        si.spell_name AS site_spell_name,
        si.effect_description,
        si.region,
        si.site_type,
        si.lore_note
       FROM spells s
       JOIN users u ON u.id = s.creator_id
       JOIN sites si ON si.id = s.site_id
       WHERE s.id = $1`,
      [id]
    );

    if (spellRows.length === 0) return res.status(404).json({ error: 'Spell not found' });

    const spell = spellRows[0];

    // Fetch lineage
    const { rows: lineageRows } = await pool.query(
      `SELECT
        l.id, l.transferred_at,
        fu.username AS from_username,
        tu.username AS to_username
       FROM lineage l
       JOIN users fu ON fu.id = l.from_user_id
       JOIN users tu ON tu.id = l.to_user_id
       WHERE l.spell_id = $1
       ORDER BY l.transferred_at ASC`,
      [id]
    );

    res.json({ ...spell, lineage: lineageRows });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/spells/:id/lineage — Lineage chain only
// ─────────────────────────────────────────────────────────────────────────────

router.get('/:id/lineage', async (req, res, next) => {
  try {
    const { id } = req.params;

    // Verify spell exists
    const { rows: check } = await pool.query('SELECT id FROM spells WHERE id = $1', [id]);
    if (check.length === 0) return res.status(404).json({ error: 'Spell not found' });

    const { rows } = await pool.query(
      `SELECT
        l.id, l.transferred_at,
        fu.username AS from_username,
        tu.username AS to_username
       FROM lineage l
       JOIN users fu ON fu.id = l.from_user_id
       JOIN users tu ON tu.id = l.to_user_id
       WHERE l.spell_id = $1
       ORDER BY l.transferred_at ASC`,
      [id]
    );

    res.json({ spell_id: id, transfers: rows, transfer_count: rows.length });
  } catch (err) {
    next(err);
  }
});
/**
 * routes/spells.js — Phase 4 additions
 *
 * Paste these routes into spells.js immediately before the final
 * `module.exports = router;` line.
 *
 * New routes:
 *   POST   /api/v1/spells/:id/vote      — cast or change a vote
 *   DELETE /api/v1/spells/:id/vote      — remove a vote
 *   POST   /api/v1/spells/:id/bookmark  — bookmark a spell
 *   DELETE /api/v1/spells/:id/bookmark  — remove a bookmark
 */

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Recalculate upvotes / downvotes on the spells row from the votes table,
 * then update is_banned if downvotes >= 100.
 * Returns the updated { upvotes, downvotes, is_banned } values.
 */
async function recalculateVotes(client, spellId) {
  const { rows } = await client.query(
    `UPDATE spells
     SET
       upvotes   = (SELECT COUNT(*) FROM votes WHERE spell_id = $1 AND vote = 'up'),
       downvotes = (SELECT COUNT(*) FROM votes WHERE spell_id = $1 AND vote = 'down'),
       is_banned = (
         (SELECT COUNT(*) FROM votes WHERE spell_id = $1 AND vote = 'down') >= 100
       )
     WHERE id = $1
     RETURNING upvotes, downvotes, is_banned`,
    [spellId]
  );
  return rows[0];
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/spells/:id/vote — cast or change a vote
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Body: { vote: 'up' | 'down' }
 *
 * Upserts a vote row (one per user per spell).  If the user already voted
 * the same direction the request is a no-op.  Counts are always derived
 * fresh from the votes table — never incremented/decremented in place —
 * so they stay consistent even under concurrent requests.
 */
router.post('/:id/vote', requireAuth, async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { vote } = req.body;

    if (!['up', 'down'].includes(vote)) {
      return res.status(400).json({ error: "vote must be 'up' or 'down'" });
    }

    // Verify spell exists
    const { rows: check } = await client.query(
      'SELECT id FROM spells WHERE id = $1',
      [id]
    );
    if (check.length === 0) return res.status(404).json({ error: 'Spell not found' });

    await client.query('BEGIN');

    // Upsert — insert or update the vote direction
    await client.query(
      `INSERT INTO votes (user_id, spell_id, vote, voted_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (user_id, spell_id)
       DO UPDATE SET vote = EXCLUDED.vote, voted_at = NOW()`,
      [req.user.id, id, vote]
    );

    const counts = await recalculateVotes(client, id);

    await client.query('COMMIT');

    res.json({
      spell_id: id,
      user_vote: vote,
      ...counts,
    });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    next(err);
  } finally {
    client.release();
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/v1/spells/:id/vote — remove a vote
// ─────────────────────────────────────────────────────────────────────────────

router.delete('/:id/vote', requireAuth, async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;

    const { rows: check } = await client.query(
      'SELECT id FROM spells WHERE id = $1',
      [id]
    );
    if (check.length === 0) return res.status(404).json({ error: 'Spell not found' });

    await client.query('BEGIN');

    const { rowCount } = await client.query(
      'DELETE FROM votes WHERE user_id = $1 AND spell_id = $2',
      [req.user.id, id]
    );

    // If nothing was deleted the user had no vote — still return current counts
    const counts = await recalculateVotes(client, id);

    await client.query('COMMIT');

    res.json({
      spell_id: id,
      user_vote: null,
      removed: rowCount > 0,
      ...counts,
    });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    next(err);
  } finally {
    client.release();
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/spells/:id/bookmark — bookmark a spell
// ─────────────────────────────────────────────────────────────────────────────

router.post('/:id/bookmark', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;

    const { rows: check } = await pool.query(
      'SELECT id FROM spells WHERE id = $1',
      [id]
    );
    if (check.length === 0) return res.status(404).json({ error: 'Spell not found' });

    // INSERT … ON CONFLICT DO NOTHING — idempotent
    await pool.query(
      `INSERT INTO bookmarks (user_id, spell_id, bookmarked_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (user_id, spell_id) DO NOTHING`,
      [req.user.id, id]
    );

    res.json({ spell_id: id, bookmarked: true });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/v1/spells/:id/bookmark — remove a bookmark
// ─────────────────────────────────────────────────────────────────────────────

router.delete('/:id/bookmark', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;

    const { rowCount } = await pool.query(
      'DELETE FROM bookmarks WHERE user_id = $1 AND spell_id = $2',
      [req.user.id, id]
    );

    res.json({ spell_id: id, bookmarked: false, removed: rowCount > 0 });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
