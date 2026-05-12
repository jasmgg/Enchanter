require('dotenv').config();
const express = require('express');
const cors = require('cors');

const sitesRouter      = require('./routes/sites');
const healthRouter     = require('./routes/health');
const celestialRouter  = require('./routes/celestial');
const locationRouter   = require('./routes/location');
const spellsRouter     = require('./routes/spells');
const usersRouter      = require('./routes/users');
const transferRouter   = require('./routes/transfer');
const conversionRouter = require('./routes/conversion');  // Phase 6

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Request logger (dev only)
if (process.env.NODE_ENV !== 'production') {
  app.use((req, _res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// Routes
app.use('/api/v1/health',            healthRouter);
app.use('/api/v1/sites',             sitesRouter);
app.use('/api/v1/celestial',         celestialRouter);
app.use('/api/v1/validate-location', locationRouter);
app.use('/api/v1/spells',            spellsRouter);
app.use('/api/v1/users',             usersRouter);
app.use('/api/v1/transfer',          transferRouter);
app.use('/api/v1/conversion',        conversionRouter);  // Phase 6

// 404
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Enchanter API running on port ${PORT}`);
});

module.exports = app;
