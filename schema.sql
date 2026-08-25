CREATE SCHEMA IF NOT EXISTS jewellery;
SET search_path TO jewellery, public;

CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  metal TEXT NOT NULL DEFAULT '22K Gold',
  purity TEXT NOT NULL DEFAULT '22K',
  weight_grams NUMERIC(10,3) NOT NULL DEFAULT 0,
  price_inr INTEGER NOT NULL DEFAULT 0 CHECK (price_inr >= 0),
  compare_price_inr INTEGER CHECK (compare_price_inr IS NULL OR compare_price_inr >= price_inr),
  description TEXT NOT NULL DEFAULT '',
  image_url TEXT NOT NULL DEFAULT '/assets/jewellery-1.svg',
  badge TEXT,
  featured BOOLEAN NOT NULL DEFAULT FALSE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_featured ON products(featured);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(active);

CREATE TABLE IF NOT EXISTS orders (
  id BIGSERIAL PRIMARY KEY,
  order_number TEXT UNIQUE NOT NULL,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  address_line1 TEXT NOT NULL,
  address_line2 TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  pincode TEXT NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'COD',
  payment_status TEXT NOT NULL DEFAULT 'PENDING',
  order_status TEXT NOT NULL DEFAULT 'PLACED',
  subtotal_inr INTEGER NOT NULL DEFAULT 0,
  shipping_inr INTEGER NOT NULL DEFAULT 0,
  total_inr INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_items (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price_inr INTEGER NOT NULL CHECK (unit_price_inr >= 0),
  line_total_inr INTEGER NOT NULL CHECK (line_total_inr >= 0)
);

CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_phone ON orders(phone);
