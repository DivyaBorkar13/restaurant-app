require('dotenv').config();
const express  = require('express');
const router   = express.Router();
const { pool } = require('../database');

// ── auth middleware ────────────────────────────────────────────────────────────

function auth(req, res, next) {
  const token     = (req.headers.authorization || '').replace('Bearer ', '').trim();
  const adminPass = process.env.ADMIN_PASSWORD || 'admin123';
  if (token !== adminPass) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  next();
}

// ── auth ──────────────────────────────────────────────────────────────────────

// POST /api/admin/login
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  const adminPass = process.env.ADMIN_PASSWORD || 'admin123';
  if (username === 'admin' && password === adminPass) {
    res.json({ success: true, token: adminPass });
  } else {
    res.status(401).json({ success: false, error: 'Invalid username or password' });
  }
});

// ── menu management ───────────────────────────────────────────────────────────

// GET /api/admin/menu — all items (including unavailable)
router.get('/menu', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM menu_items ORDER BY category, name'
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/admin/menu — add item
router.post('/menu', auth, async (req, res) => {
  const { name, category, price, description, available } = req.body;
  const CATEGORIES = ['Starters', 'Main Course', 'Drinks', 'Desserts'];

  if (!name || !category || price === undefined) {
    return res.status(400).json({ success: false, error: 'name, category, and price are required' });
  }
  if (!CATEGORIES.includes(category)) {
    return res.status(400).json({ success: false, error: `category must be one of: ${CATEGORIES.join(', ')}` });
  }
  if (isNaN(price) || Number(price) < 0) {
    return res.status(400).json({ success: false, error: 'price must be a non-negative number' });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO menu_items (name, category, price, description, available)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [
        name.trim(),
        category,
        Number(price),
        description?.trim() || '',
        available !== undefined ? Number(available) : 1,
      ]
    );
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/admin/menu/:id — edit item (partial update supported)
router.put('/menu/:id', auth, async (req, res) => {
  const { id } = req.params;

  try {
    const { rows: existing } = await pool.query(
      'SELECT * FROM menu_items WHERE id = $1', [id]
    );
    if (!existing.length) {
      return res.status(404).json({ success: false, error: 'Menu item not found' });
    }

    const cur = existing[0];
    const { name, category, price, description, available } = req.body;

    const { rows } = await pool.query(
      `UPDATE menu_items
       SET name=$1, category=$2, price=$3, description=$4, available=$5
       WHERE id=$6
       RETURNING *`,
      [
        name        !== undefined ? name.trim()        : cur.name,
        category    !== undefined ? category           : cur.category,
        price       !== undefined ? Number(price)      : cur.price,
        description !== undefined ? description.trim() : cur.description,
        available   !== undefined ? Number(available)  : cur.available,
        id,
      ]
    );
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/admin/menu/:id — remove item
router.delete('/menu/:id', auth, async (req, res) => {
  try {
    const { rowCount } = await pool.query(
      'DELETE FROM menu_items WHERE id = $1', [req.params.id]
    );
    if (rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Menu item not found' });
    }
    res.json({ success: true, message: 'Menu item deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── orders ────────────────────────────────────────────────────────────────────

// GET /api/admin/orders — all orders with items
router.get('/orders', auth, async (req, res) => {
  try {
    const { rows: orders } = await pool.query(
      'SELECT * FROM orders ORDER BY created_at DESC'
    );
    const result = await Promise.all(
      orders.map(async order => ({
        ...order,
        items: await getOrderItems(order.id),
      }))
    );
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── sales ─────────────────────────────────────────────────────────────────────

// GET /api/admin/sales — daily sales summary for today
router.get('/sales', auth, async (req, res) => {
  try {
    const summaryRes = await pool.query(`
      SELECT
        COUNT(*)                                          AS total_orders,
        COALESCE(SUM(total_amount), 0)                   AS total_revenue,
        COUNT(CASE WHEN status = 'served'    THEN 1 END) AS served_orders,
        COUNT(CASE WHEN status = 'new'       THEN 1 END) AS new_orders,
        COUNT(CASE WHEN status = 'preparing' THEN 1 END) AS preparing_orders,
        COUNT(CASE WHEN status = 'ready'     THEN 1 END) AS ready_orders
      FROM orders
      WHERE DATE(created_at) = CURRENT_DATE
    `);

    const topItemsRes = await pool.query(`
      SELECT mi.name,
             SUM(oi.quantity)            AS total_qty,
             SUM(oi.quantity * oi.price) AS revenue
      FROM   order_items oi
      JOIN   menu_items  mi ON oi.menu_item_id = mi.id
      JOIN   orders       o ON oi.order_id     = o.id
      WHERE  DATE(o.created_at) = CURRENT_DATE
      GROUP  BY mi.id, mi.name
      ORDER  BY total_qty DESC
      LIMIT  5
    `);

    // pg returns COUNT/SUM as strings — normalise to numbers
    const raw     = summaryRes.rows[0];
    const summary = {
      total_orders:     parseInt(raw.total_orders),
      total_revenue:    parseFloat(raw.total_revenue),
      served_orders:    parseInt(raw.served_orders),
      new_orders:       parseInt(raw.new_orders),
      preparing_orders: parseInt(raw.preparing_orders),
      ready_orders:     parseInt(raw.ready_orders),
    };

    const topItems = topItemsRes.rows.map(r => ({
      name:      r.name,
      total_qty: parseInt(r.total_qty),
      revenue:   parseFloat(r.revenue),
    }));

    const today = new Date().toISOString().split('T')[0];
    res.json({ success: true, data: { summary, topItems, date: today } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── helpers ───────────────────────────────────────────────────────────────────

async function getOrderItems(orderId) {
  const { rows } = await pool.query(
    `SELECT oi.quantity, oi.price, mi.name AS item_name
     FROM   order_items oi
     JOIN   menu_items  mi ON oi.menu_item_id = mi.id
     WHERE  oi.order_id = $1`,
    [orderId]
  );
  return rows;
}

module.exports = router;
