const express  = require('express');
const router   = express.Router();
const { pool } = require('../database');

// GET /api/orders — all orders with items
router.get('/', async (req, res) => {
  try {
    const { rows: orders } = await pool.query(
      'SELECT * FROM orders ORDER BY created_at DESC'
    );
    const result = await Promise.all(
      orders.map(async order => ({ ...order, items: await getOrderItems(order.id) }))
    );
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/orders — place new order
router.post('/', async (req, res) => {
  const { table_number, items } = req.body;

  if (!table_number || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, error: 'table_number and items array are required' });
  }

  try {
    // Validate all items and compute total before opening a transaction
    let total = 0;
    const validated = [];

    for (const item of items) {
      const { rows } = await pool.query(
        'SELECT * FROM menu_items WHERE id = $1 AND available = 1',
        [item.menu_item_id]
      );
      if (!rows.length) {
        return res.status(400).json({
          success: false,
          error: `Menu item #${item.menu_item_id} not found or unavailable`,
        });
      }
      if (!item.quantity || item.quantity < 1) {
        return res.status(400).json({ success: false, error: 'Each item must have quantity >= 1' });
      }
      total += rows[0].price * item.quantity;
      validated.push({ menuItem: rows[0], quantity: item.quantity });
    }

    // Insert order + line items atomically
    const client = await pool.connect();
    let orderId;
    try {
      await client.query('BEGIN');

      const { rows: [newOrder] } = await client.query(
        'INSERT INTO orders (table_number, status, total_amount) VALUES ($1, $2, $3) RETURNING id',
        [table_number, 'new', total]
      );
      orderId = newOrder.id;

      for (const { menuItem, quantity } of validated) {
        await client.query(
          'INSERT INTO order_items (order_id, menu_item_id, quantity, price) VALUES ($1, $2, $3, $4)',
          [orderId, menuItem.id, quantity, menuItem.price]
        );
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    const order = await getFullOrder(orderId);
    req.app.get('io').emit('new-order', order);
    res.status(201).json({ success: true, data: order });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/orders/:id/status — update order status
router.put('/:id/status', async (req, res) => {
  const { id }     = req.params;
  const { status } = req.body;
  const VALID      = ['new', 'preparing', 'ready', 'served'];

  if (!VALID.includes(status)) {
    return res.status(400).json({
      success: false,
      error: `status must be one of: ${VALID.join(', ')}`,
    });
  }

  try {
    const { rowCount } = await pool.query(
      'UPDATE orders SET status = $1 WHERE id = $2',
      [status, id]
    );
    if (rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    const order = await getFullOrder(id);
    req.app.get('io').emit('order-status-update', { id: Number(id), status, order });
    res.json({ success: true, data: order });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── helpers ───────────────────────────────────────────────────────────────────

async function getOrderItems(orderId) {
  const { rows } = await pool.query(
    `SELECT oi.id, oi.quantity, oi.price, mi.name AS item_name, mi.category
     FROM   order_items oi
     JOIN   menu_items  mi ON oi.menu_item_id = mi.id
     WHERE  oi.order_id = $1`,
    [orderId]
  );
  return rows;
}

async function getFullOrder(orderId) {
  const { rows } = await pool.query('SELECT * FROM orders WHERE id = $1', [orderId]);
  if (!rows.length) return null;
  return { ...rows[0], items: await getOrderItems(orderId) };
}

module.exports = router;
