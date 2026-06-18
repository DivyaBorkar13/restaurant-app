const express  = require('express');
const router   = express.Router();
const { pool } = require('../database');

// GET /api/menu — all available items
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM menu_items WHERE available = 1 ORDER BY category, name'
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
