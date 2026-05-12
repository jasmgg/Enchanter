const express = require('express');
const pool = require('../db/pool');

const router = express.Router();

// GET /api/v1/health
router.get('/', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected' });
  } catch {
    res.status(503).json({ status: 'error', db: 'unreachable' });
  }
});

module.exports = router;
