# 🍽️ Spice Garden — Restaurant Order Management System

A full-stack, real-time restaurant order management system built for Indian restaurants. It features three dedicated interfaces — customer ordering, kitchen display, and admin dashboard — all connected live via Socket.io and backed by PostgreSQL.

---

## 🌐 Live Demo

| Interface | Link |
|-----------|------|
| 🛒 Customer Menu | [restaurant-app-production-d560.up.railway.app](https://restaurant-app-production-d560.up.railway.app) |
| 👨‍🍳 Kitchen Display | [/kitchen](https://restaurant-app-production-d560.up.railway.app/kitchen) |
| 🔐 Admin Dashboard | [/admin](https://restaurant-app-production-d560.up.railway.app/admin) |

> **Admin login:** username `admin` · password `admin123`

---

## 🖥️ Interfaces

| Interface | URL | Description |
|-----------|-----|-------------|
| 🛒 **Customer Menu** | `http://localhost:3000/` | Browse menu by category, add items to cart, place orders by table number |
| 👨‍🍳 **Kitchen Display** | `http://localhost:3000/kitchen` | Live Kanban board — view incoming orders and update status in real time |
| 🔐 **Admin Dashboard** | `http://localhost:3000/admin` | Manage menu items, view all orders, and track daily sales |

---

## ✨ Features

- 🔴 **Real-time updates** via Socket.io — new orders appear on the kitchen screen instantly, no refresh needed
- 🍛 **Category-based menu** — Starters, Main Course, Drinks, Desserts with veg/non-veg badges
- 🛒 **Smart cart** — slide-in drawer with quantity controls and table number input
- 👨‍🍳 **Kitchen Kanban board** — three-column layout (New → Preparing → Ready) with elapsed time
- 📊 **Admin dashboard** — full menu CRUD, order history, and daily sales summary with top items
- 🔐 **Admin authentication** — Bearer token auth protecting all admin routes
- 🐘 **PostgreSQL database** — relational schema with foreign key constraints and transactional inserts
- 🔒 **Parameterized queries** — all SQL uses `$1, $2…` placeholders to prevent SQL injection
- 🌱 **Auto-seeding** — 19 Indian menu items seeded on first run if the table is empty
- 📱 **Responsive UI** — works on desktop and mobile browsers

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | HTML5, CSS3, Vanilla JavaScript |
| **Backend** | Node.js, Express 4 |
| **Database** | PostgreSQL (`pg` driver) |
| **Real-time** | Socket.io 4 |
| **Config** | dotenv |
| **Fonts** | Google Fonts — Playfair Display, Inter |

---

## 📁 Folder Structure

```
restaurant-app/
│
├── backend/
│   ├── server.js              # Express app, Socket.io setup, route mounting
│   ├── database.js            # pg Pool, schema creation, seed data
│   └── routes/
│       ├── menu.js            # GET /api/menu
│       ├── orders.js          # POST /GET /api/orders, PUT status
│       └── admin.js           # All /api/admin/* routes
│
├── frontend/
│   ├── customer/
│   │   └── index.html         # Customer ordering UI
│   ├── kitchen/
│   │   └── index.html         # Kitchen Kanban display
│   └── admin/
│       └── index.html         # Admin dashboard
│
├── doc/
│   └── README.md              # Detailed API reference
│
├── .env                       # Environment variables (not committed)
├── .gitignore
├── package.json
└── README.md                  # This file
```

---

## 🚀 How to Run Locally

### Prerequisites

- [Node.js](https://nodejs.org/) v22 or later
- [PostgreSQL](https://www.postgresql.org/download/) v14 or later

---

### 1. PostgreSQL Setup

Open `psql` or pgAdmin and run:

```sql
-- Create the database
CREATE DATABASE restaurant_db;

-- Create a dedicated user
CREATE USER restaurant_user WITH PASSWORD 'Spice@Garden2026';

-- Grant access
GRANT ALL PRIVILEGES ON DATABASE restaurant_db TO restaurant_user;
```

---

### 2. Clone the Repository

```bash
git clone https://github.com/DivyaBorkar13/restaurant-app.git
cd restaurant-app
```

---

### 3. Install Dependencies

```bash
npm install
```

---

### 4. Configure Environment Variables

Create a `.env` file in the project root:

```env
PORT=3000
PGHOST=localhost
PGPORT=5432
PGDATABASE=restaurant_db
PGUSER=restaurant_user
PGPASSWORD=Spice@Garden2026
ADMIN_PASSWORD=admin123
```

---

### 5. Start the Server

```bash
npm start
```

On first run, the server automatically:
- Creates all three database tables
- Seeds 19 Indian menu items across 4 categories

```
╔════════════════════════════════════════╗
║   🍽️  Spice Garden  ·  Server ready    ║
╠════════════════════════════════════════╣
║  Customer  →  http://localhost:3000/       ║
║  Kitchen   →  http://localhost:3000/kitchen ║
║  Admin     →  http://localhost:3000/admin   ║
╚════════════════════════════════════════╝
```

> For development with auto-restart: `npm run dev` (requires `nodemon`)

**Admin login:** username `admin` · password `admin123`

---

## 📡 API Endpoints

All responses follow the shape:
```json
{ "success": true, "data": { } }
{ "success": false, "error": "message" }
```

Admin routes require the header:
```
Authorization: Bearer admin123
```

| # | Method | Endpoint | Auth | Description |
|---|--------|----------|------|-------------|
| 1 | `GET` | `/api/menu` | — | Get all available menu items |
| 2 | `POST` | `/api/orders` | — | Place a new order |
| 3 | `GET` | `/api/orders` | — | Get all orders with items |
| 4 | `PUT` | `/api/orders/:id/status` | — | Update order status |
| 5 | `POST` | `/api/admin/login` | — | Authenticate and get token |
| 6 | `GET` | `/api/admin/menu` | ✅ | Get all menu items (incl. hidden) |
| 7 | `POST` | `/api/admin/menu` | ✅ | Add a new menu item |
| 8 | `PUT` | `/api/admin/menu/:id` | ✅ | Edit a menu item |
| 9 | `DELETE` | `/api/admin/menu/:id` | ✅ | Delete a menu item |
| 10 | `GET` | `/api/admin/orders` | ✅ | Get all orders (admin view) |
| 11 | `GET` | `/api/admin/sales` | ✅ | Get today's sales summary |

### Example — Place an Order

**Request**
```http
POST /api/orders
Content-Type: application/json

{
  "table_number": 4,
  "items": [
    { "menu_item_id": 1, "quantity": 2 },
    { "menu_item_id": 6, "quantity": 1 }
  ]
}
```

**Response `201`**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "table_number": 4,
    "status": "new",
    "total_amount": 440,
    "created_at": "2026-06-18T10:00:00.000Z",
    "items": [
      { "item_name": "Samosa (2 pcs)", "quantity": 2, "price": 60 },
      { "item_name": "Butter Chicken", "quantity": 1, "price": 320 }
    ]
  }
}
```

### Order Status Flow

```
new  →  preparing  →  ready  →  served
```

---

## 🗄️ Database Schema

### `menu_items`

| Column | Type | Description |
|--------|------|-------------|
| `id` | `SERIAL PRIMARY KEY` | Auto-increment ID |
| `name` | `TEXT NOT NULL` | Item name |
| `category` | `TEXT NOT NULL` | Starters / Main Course / Drinks / Desserts |
| `price` | `REAL NOT NULL` | Price in ₹ |
| `description` | `TEXT` | Short description |
| `available` | `INTEGER` | `1` = on menu, `0` = hidden (default `1`) |

### `orders`

| Column | Type | Description |
|--------|------|-------------|
| `id` | `SERIAL PRIMARY KEY` | Auto-increment ID |
| `table_number` | `INTEGER NOT NULL` | Table the order belongs to |
| `status` | `TEXT` | `new` / `preparing` / `ready` / `served` |
| `total_amount` | `REAL NOT NULL` | Order total in ₹ |
| `created_at` | `TIMESTAMP` | Auto-set on insert |

### `order_items`

| Column | Type | Description |
|--------|------|-------------|
| `id` | `SERIAL PRIMARY KEY` | Auto-increment ID |
| `order_id` | `INTEGER` | FK → `orders(id)` ON DELETE CASCADE |
| `menu_item_id` | `INTEGER` | FK → `menu_items(id)` ON DELETE RESTRICT |
| `quantity` | `INTEGER NOT NULL` | Number of units ordered |
| `price` | `REAL NOT NULL` | Unit price at time of order |

---

## ⚙️ Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Port the Express server listens on |
| `PGHOST` | `localhost` | PostgreSQL host |
| `PGPORT` | `5432` | PostgreSQL port |
| `PGDATABASE` | `restaurant_db` | Database name |
| `PGUSER` | `restaurant_user` | Database user |
| `PGPASSWORD` | — | Database password |
| `ADMIN_PASSWORD` | `admin123` | Password for the admin dashboard |

---

## 👩‍💻 Author

**Divya Borkar**
GitHub: [@DivyaBorkar13](https://github.com/DivyaBorkar13)
