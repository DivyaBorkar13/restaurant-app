require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host:     process.env.PGHOST     || 'localhost',
  port:     parseInt(process.env.PGPORT) || 5432,
  database: process.env.PGDATABASE || 'restaurant_db',
  user:     process.env.PGUSER     || 'postgres',
  password: process.env.PGPASSWORD,
});

async function initializeDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS menu_items (
      id          SERIAL  PRIMARY KEY,
      name        TEXT    NOT NULL,
      category    TEXT    NOT NULL,
      price       REAL    NOT NULL,
      description TEXT    DEFAULT '',
      available   INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS orders (
      id           SERIAL    PRIMARY KEY,
      table_number INTEGER   NOT NULL,
      status       TEXT      DEFAULT 'new',
      total_amount REAL      NOT NULL,
      created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id           SERIAL  PRIMARY KEY,
      order_id     INTEGER NOT NULL REFERENCES orders(id)     ON DELETE CASCADE,
      menu_item_id INTEGER NOT NULL REFERENCES menu_items(id) ON DELETE RESTRICT,
      quantity     INTEGER NOT NULL,
      price        REAL    NOT NULL
    );
  `);

  const { rows } = await pool.query('SELECT COUNT(*) AS count FROM menu_items');
  if (parseInt(rows[0].count) === 0) await seedMenu();
}

async function seedMenu() {
  const items = [
    // Starters
    ['Samosa (2 pcs)',           'Starters',    60,  'Crispy golden pastry stuffed with spiced potatoes and peas'],
    ['Paneer Tikka',             'Starters',   220,  'Marinated cottage cheese cubes grilled in tandoor with aromatic spices'],
    ['Chicken Tikka',            'Starters',   280,  'Tender chicken marinated in yogurt and spices, chargrilled to perfection'],
    ['Veg Spring Rolls (4 pcs)', 'Starters',   130,  'Crispy rolls stuffed with stir-fried mixed vegetables and glass noodles'],
    ['Hara Bhara Kebab',         'Starters',   160,  'Soft patties made with spinach, green peas and paneer, shallow fried'],
    // Main Course
    ['Butter Chicken',           'Main Course', 320,  'Tender chicken in silky-smooth tomato-cream gravy with aromatic spices'],
    ['Palak Paneer',             'Main Course', 260,  'Fresh cottage cheese cubes in velvety spinach and spice gravy'],
    ['Dal Makhani',              'Main Course', 220,  'Slow-cooked black lentils simmered overnight with butter and cream'],
    ['Chicken Biryani',          'Main Course', 360,  'Fragrant basmati rice layered with spiced chicken and saffron'],
    ['Veg Biryani',              'Main Course', 280,  'Aromatic basmati rice cooked with seasonal vegetables and whole spices'],
    ['Shahi Paneer',             'Main Course', 290,  'Cottage cheese in rich royal gravy made with cashews and cream'],
    // Drinks
    ['Sweet Lassi',              'Drinks',       80,  'Chilled yogurt drink blended smooth with sugar and a hint of cardamom'],
    ['Masala Chai',              'Drinks',       40,  'Classic spiced Indian tea brewed with ginger, cardamom and cinnamon'],
    ['Fresh Mango Juice',        'Drinks',      120,  'Freshly pressed Alphonso mango juice, chilled to perfection'],
    ['Soft Drink',               'Drinks',       50,  'Choice of Coca-Cola, Pepsi, Sprite, or Limca'],
    // Desserts
    ['Gulab Jamun (2 pcs)',      'Desserts',     80,  'Soft milk-solid dumplings soaked in rose-flavored sugar syrup'],
    ['Kulfi (Malai)',            'Desserts',     90,  'Traditional Indian ice cream with cardamom, saffron and pistachios'],
    ['Kheer',                    'Desserts',    100,  'Creamy slow-cooked rice pudding with saffron, almonds and cardamom'],
    ['Gajar Halwa',              'Desserts',    110,  'Slow-cooked grated carrot dessert with ghee, sugar, milk and dry fruits'],
  ];

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const [name, category, price, description] of items) {
      await client.query(
        'INSERT INTO menu_items (name, category, price, description) VALUES ($1, $2, $3, $4)',
        [name, category, price, description]
      );
    }
    await client.query('COMMIT');
    console.log(`Seeded ${items.length} menu items.`);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { pool, initializeDatabase };
