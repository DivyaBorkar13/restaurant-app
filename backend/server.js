require('dotenv').config();
const express  = require('express');
const http     = require('http');
const { Server } = require('socket.io');
const path     = require('path');

const { initializeDatabase } = require('./database');
const menuRoutes   = require('./routes/menu');
const ordersRoutes = require('./routes/orders');
const adminRoutes  = require('./routes/admin');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, { cors: { origin: '*' } });

app.set('io', io);

// ── middleware ────────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../frontend')));

// ── api routes ────────────────────────────────────────────────────────────────
app.use('/api/menu',   menuRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/admin',  adminRoutes);

// ── page routes ───────────────────────────────────────────────────────────────
app.get('/',        (_, res) => res.sendFile(path.join(__dirname, '../frontend/customer/index.html')));
app.get('/kitchen', (_, res) => res.sendFile(path.join(__dirname, '../frontend/kitchen/index.html')));
app.get('/admin',   (_, res) => res.sendFile(path.join(__dirname, '../frontend/admin/index.html')));

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

// ── global error handler ──────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error(err);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

// ── socket.io ─────────────────────────────────────────────────────────────────
io.on('connection', socket => {
  console.log(`  [socket] connected   ${socket.id}`);
  socket.on('disconnect', () => console.log(`  [socket] disconnected ${socket.id}`));
});

// ── start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;

initializeDatabase()
  .then(() => {
    server.listen(PORT, () => {
      console.log('\n╔════════════════════════════════════════╗');
      console.log('║   🍽️  Spice Garden  ·  Server ready    ║');
      console.log('╠════════════════════════════════════════╣');
      console.log(`║  Customer  →  http://localhost:${PORT}/       ║`);
      console.log(`║  Kitchen   →  http://localhost:${PORT}/kitchen ║`);
      console.log(`║  Admin     →  http://localhost:${PORT}/admin   ║`);
      console.log('╚════════════════════════════════════════╝\n');
    });
  })
  .catch(err => {
    console.error('Failed to initialise database:', err.message);
    process.exit(1);
  });
