# Spice Garden — Restaurant Order Management System

A full-stack, real-time restaurant order management system with three separate interfaces: a customer ordering page, a live kitchen display, and an admin dashboard.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Tech Stack](#tech-stack)
3. [Folder Structure](#folder-structure)
4. [How to Run Locally](#how-to-run-locally)
5. [API Endpoints](#api-endpoints)
   - [Menu](#menu)
   - [Orders](#orders)
   - [Admin — Auth](#admin--auth)
   - [Admin — Menu Management](#admin--menu-management)
   - [Admin — Orders](#admin--orders)
   - [Admin — Sales](#admin--sales)

---

## Project Overview

Spice Garden is built around three user roles:

| Interface | URL | Description |
|-----------|-----|-------------|
| **Customer** | `http://localhost:3000/` | Browse menu, add items to cart, place orders by table number |
| **Kitchen** | `http://localhost:3000/kitchen` | Live Kanban board showing incoming orders; staff mark them Preparing → Ready → Served |
| **Admin** | `http://localhost:3000/admin` | Login-protected dashboard for menu CRUD, order history, and daily sales summary |

Orders placed by customers appear on the kitchen display **instantly** via Socket.io — no polling or page refresh required. Status changes made in the kitchen are also broadcast in real time to any connected client.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime | Node.js 22+ |
| Web framework | Express 4 |
| Database | SQLite via `node:sqlite` (Node.js built-in, no native compilation) |
| Real-time | Socket.io 4 |
| Config | dotenv |
| Frontend | Vanilla HTML / CSS / JavaScript (no build step) |
| Fonts | Google Fonts — Playfair Display, Inter |

> `node:sqlite` is the built-in SQLite module shipped with Node.js 22+. It requires no native compilation and no extra dependencies.

---

## Folder Structure

```
restaurant-app/
│
├── backend/
│   ├── server.js          # Express app + Socket.io setup + route mounting
│   ├── database.js        # DB initialisation, schema creation, seed data
│   └── routes/
│       ├── menu.js        # GET /api/menu
│       ├── orders.js      # POST/GET /api/orders, PUT /api/orders/:id/status
│       └── admin.js       # All /api/admin/* routes (auth-protected)
│
├── frontend/
│   ├── customer/
│   │   └── index.html     # Customer ordering UI
│   ├── kitchen/
│   │   └── index.html     # Kitchen Kanban display
│   └── admin/
│       └── index.html     # Admin dashboard (login + tabs)
│
├── doc/
│   └── README.md          # This file
│
├── .env                   # Environment variables (not committed)
├── .gitignore
├── package.json
└── restaurant.db          # SQLite database file (auto-created on first run)
```

### Database Schema

```
menu_items
  id, name, category, price, description, available

orders
  id, table_number, status, total_amount, created_at

order_items
  id, order_id, menu_item_id, quantity, price
```

`status` is one of: `new` → `preparing` → `ready` → `served`

---

## How to Run Locally

### Prerequisites

- Node.js **22 or later** (uses the built-in `node:sqlite` module)
- npm

### Steps

```bash
# 1. Clone / download the project
cd restaurant-app

# 2. Install dependencies
npm install

# 3. (Optional) Review or edit environment config
#    Default values work out of the box
cat .env

# 4. Start the server
npm start
```

The server seeds the database with 19 Indian menu items on the first run.

Open the three interfaces in separate browser tabs:

```
Customer  →  http://localhost:3000/
Kitchen   →  http://localhost:3000/kitchen
Admin     →  http://localhost:3000/admin
```

**Admin credentials** (hardcoded for demo):

| Field | Value |
|-------|-------|
| Username | `admin` |
| Password | `admin123` |

### Environment Variables (`.env`)

```env
PORT=3000
DB_PATH=./restaurant.db
ADMIN_PASSWORD=admin123
```

### Development (auto-restart on file changes)

```bash
npm run dev
```

This uses `nodemon`. Install dev dependencies first with `npm install`.

---

## API Endpoints

All endpoints return JSON in the shape:

```json
{ "success": true,  "data": { ... } }
{ "success": false, "error": "message" }
```

Admin endpoints require an `Authorization` header:

```
Authorization: Bearer admin123
```

---

### Menu

#### `GET /api/menu`

Returns all **available** menu items (available = 1).

**Response**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Samosa (2 pcs)",
      "category": "Starters",
      "price": 60,
      "description": "Crispy golden pastry stuffed with spiced potatoes and peas",
      "available": 1
    },
    ...
  ]
}
```

---

### Orders

#### `POST /api/orders`

Place a new order. Emits a `new-order` Socket.io event to all connected clients.

**Request body**

```json
{
  "table_number": 5,
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
    "table_number": 5,
    "status": "new",
    "total_amount": 380,
    "created_at": "2026-06-17T08:00:00.000Z",
    "items": [
      { "id": 1, "quantity": 2, "price": 60, "item_name": "Samosa (2 pcs)", "category": "Starters" },
      { "id": 2, "quantity": 1, "price": 320, "item_name": "Butter Chicken", "category": "Main Course" }
    ]
  }
}
```

**Validation errors `400`**

- `table_number` or `items` missing / empty
- A referenced `menu_item_id` does not exist or is marked unavailable
- Any item has `quantity < 1`

---

#### `GET /api/orders`

Returns all orders (newest first), each with its items.

**Response**

```json
{
  "success": true,
  "data": [
    {
      "id": 3,
      "table_number": 2,
      "status": "preparing",
      "total_amount": 600,
      "created_at": "2026-06-17T09:15:00.000Z",
      "items": [ ... ]
    }
  ]
}
```

---

#### `PUT /api/orders/:id/status`

Update an order's status. Emits an `order-status-update` Socket.io event.

**URL parameter** — `id`: order ID

**Request body**

```json
{ "status": "preparing" }
```

Valid values: `new` | `preparing` | `ready` | `served`

**Response `200`**

```json
{
  "success": true,
  "data": {
    "id": 3,
    "status": "preparing",
    ...
  }
}
```

**Error `404`** — order ID not found  
**Error `400`** — invalid status value

---

### Admin — Auth

#### `POST /api/admin/login`

Exchange credentials for a token. The token is the admin password itself and is used as a Bearer token on subsequent requests.

**Request body**

```json
{ "username": "admin", "password": "admin123" }
```

**Response `200`**

```json
{ "success": true, "token": "admin123" }
```

**Error `401`** — wrong username or password

---

### Admin — Menu Management

All routes below require `Authorization: Bearer admin123`.

---

#### `GET /api/admin/menu`

Returns **all** menu items including unavailable ones.

**Response**

```json
{
  "success": true,
  "data": [
    {
      "id": 4,
      "name": "Veg Spring Rolls (4 pcs)",
      "category": "Starters",
      "price": 130,
      "description": "...",
      "available": 0
    },
    ...
  ]
}
```

---

#### `POST /api/admin/menu`

Add a new menu item.

**Request body**

```json
{
  "name": "Chole Bhature",
  "category": "Main Course",
  "price": 180,
  "description": "Fluffy fried bread served with spiced chickpea curry",
  "available": 1
}
```

`name`, `category`, and `price` are required. `available` defaults to `1`.

Valid categories: `Starters` | `Main Course` | `Drinks` | `Desserts`

**Response `201`**

```json
{
  "success": true,
  "data": { "id": 20, "name": "Chole Bhature", ... }
}
```

---

#### `PUT /api/admin/menu/:id`

Edit an existing menu item. All fields are optional — only the ones provided are updated.

**URL parameter** — `id`: menu item ID

**Request body** (partial update example — toggle availability)

```json
{ "available": 0 }
```

**Full update example**

```json
{
  "name": "Chole Bhature",
  "category": "Main Course",
  "price": 200,
  "description": "Updated description",
  "available": 1
}
```

**Response `200`**

```json
{
  "success": true,
  "data": { "id": 20, "name": "Chole Bhature", "price": 200, ... }
}
```

**Error `404`** — item not found

---

#### `DELETE /api/admin/menu/:id`

Permanently delete a menu item.

**URL parameter** — `id`: menu item ID

**Response `200`**

```json
{ "success": true, "message": "Menu item deleted successfully" }
```

**Error `404`** — item not found

---

### Admin — Orders

#### `GET /api/admin/orders`

Returns all orders with full item details (same shape as `GET /api/orders` but auth-protected and returns every historical order).

---

### Admin — Sales

#### `GET /api/admin/sales`

Returns a sales summary for **today** (based on server date).

**Response**

```json
{
  "success": true,
  "data": {
    "date": "2026-06-17",
    "summary": {
      "total_orders": 12,
      "total_revenue": 4820,
      "served_orders": 8,
      "new_orders": 1,
      "preparing_orders": 2,
      "ready_orders": 1
    },
    "topItems": [
      { "name": "Butter Chicken",   "total_qty": 9, "revenue": 2880 },
      { "name": "Chicken Biryani",  "total_qty": 6, "revenue": 2160 },
      { "name": "Sweet Lassi",      "total_qty": 5, "revenue": 400  },
      { "name": "Gulab Jamun (2 pcs)", "total_qty": 4, "revenue": 320 },
      { "name": "Dal Makhani",      "total_qty": 3, "revenue": 660  }
    ]
  }
}
```

---

## Socket.io Events

The server emits these events to **all** connected clients:

| Event | Emitted when | Payload |
|-------|-------------|---------|
| `new-order` | A customer places an order | Full order object (with items) |
| `order-status-update` | Kitchen updates an order's status | `{ id, status, order }` |

**Client-side example**

```javascript
const socket = io();

socket.on('new-order', (order) => {
  console.log('New order:', order.id, 'Table:', order.table_number);
});

socket.on('order-status-update', ({ id, status }) => {
  console.log(`Order #${id} is now: ${status}`);
});
```
