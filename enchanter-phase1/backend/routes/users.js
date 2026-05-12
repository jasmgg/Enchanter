/**
 * routes/users.js
 *
 * GET  /api/v1/users/me             — current user profile + stats
 * GET  /api/v1/users/me/spellbook   — user's crafted spells (paginated)
 * GET  /api/v1/users/me/bookmarks   — user's bookmarked spells (paginated)
 *
 * All routes require auth.
 *
 * Register in server.js:
 *   const usersRouter = require('./routes/users');
 *   app.use('/api/v1/users', usersRouter);
 */
const express = require('express');
const pool = require('../db/pool');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/users/me
// ─────────────────────────────────────────────────────────────────────────────

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const { rows: userRows } = await pool.query(
      'SELECT id, username, email, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    if (userRows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userRows[0];

    // Stats
    const { rows: statsRows } = await pool.query(
      `SELECT
        (SELECT COUNT(*) FROM spells WHERE creator_id = $1)       AS spells_crafted,
        (SELECT COUNT(*) FROM bookmarks WHERE user_id = $1)       AS spells_bookmarked,
        (SELECT COUNT(*) FROM lineage WHERE to_user_id = $1)      AS spells_received`,
      [req.user.id]
    );

    const stats = statsRows[0];

    res.json({
      ...user,
      spells_crafted:    parseInt(stats.spells_crafted),
      spells_bookmarked: parseInt(stats.spells_bookmarked),
      spells_received:   parseInt(stats.spells_received),
    });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/users/me/spellbook
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the authenticated user's crafted spells, newest first.
 * Thin wrapper — the main spell data lives in GET /spells/mine but
 * the spec calls for this path too.
 */
router.get('/me/spellbook', requireAuth, async (req, res, next) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const countResult = await pool.query(
      'SELECT COUNT(*) FROM spells WHERE creator_id = $1',
      [req.user.id]
    );
    const total = parseInt(countResult.rows[0].count);

    const { rows } = await pool.query(
      `SELECT
        s.id, s.name, s.power_score, s.cost, s.duration_tier, s.range_tier,
        s.concentration, s.upvotes, s.downvotes, s.is_banned,
        s.lunar_slot, s.geo_slot, s.tod_slot, s.season, s.calendar_event,
        s.event_modifier, s.crafted_at,
        u.username AS creator_username,
        si.name AS site_name, si.spell_name AS site_spell_name,
        si.region, si.site_type, si.effect_description
       FROM spells s
       JOIN users u  ON u.id  = s.creator_id
       JOIN sites si ON si.id = s.site_id
       WHERE s.creator_id = $1
       ORDER BY s.crafted_at DESC
       LIMIT $2 OFFSET $3`,
      [req.user.id, limit, offset]
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

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/users/me/bookmarks
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns all spells the authenticated user has bookmarked, newest bookmark first.
 * Includes the same joined fields as the library so the same SpellCard component
 * can render them without adjustment.
 */
router.get('/me/bookmarks', requireAuth, async (req, res, next) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const countResult = await pool.query(
      'SELECT COUNT(*) FROM bookmarks WHERE user_id = $1',
      [req.user.id]
    );
    const total = parseInt(countResult.rows[0].count);

    const { rows } = await pool.query(
      `SELECT
        s.id, s.name, s.power_score, s.cost, s.duration_tier, s.range_tier,
        s.concentration, s.upvotes, s.downvotes, s.is_banned,
        s.lunar_slot, s.geo_slot, s.tod_slot, s.season, s.calendar_event,
        s.event_modifier, s.crafted_at,
        u.username AS creator_username,
        si.name AS site_name, si.spell_name AS site_spell_name,
        si.region, si.site_type,
        b.bookmarked_at
       FROM bookmarks b
       JOIN spells s ON s.id  = b.spell_id
       JOIN users u  ON u.id  = s.creator_id
       JOIN sites si ON si.id = s.site_id
       WHERE b.user_id = $1
       ORDER BY b.bookmarked_at DESC
       LIMIT $2 OFFSET $3`,
      [req.user.id, limit, offset]
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

module.exports = router;
