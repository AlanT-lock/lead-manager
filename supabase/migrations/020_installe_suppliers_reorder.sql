-- Migration 020: installe status, status_changed_at, installateur, product colors/suppliers/reorder

-- 1. Add "installe" to lead_status enum
ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'installe';

-- 2. Add status_changed_at column to leads
ALTER TABLE leads ADD COLUMN IF NOT EXISTS status_changed_at timestamptz;
UPDATE leads SET status_changed_at = updated_at WHERE status_changed_at IS NULL;

-- 3. Add installateur field to leads
ALTER TABLE leads ADD COLUMN IF NOT EXISTS installateur text;

-- 4. Add color and display_order to products
ALTER TABLE products ADD COLUMN IF NOT EXISTS color text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS display_order integer DEFAULT 0;

WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY name ASC) - 1 as rn
  FROM products
)
UPDATE products p SET display_order = o.rn FROM ordered o WHERE p.id = o.id;

-- 5. Create suppliers table
CREATE TABLE IF NOT EXISTS suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read suppliers" ON suppliers
  FOR SELECT USING (true);
CREATE POLICY "Admin can insert suppliers" ON suppliers
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin can update suppliers" ON suppliers
  FOR UPDATE USING (true);
CREATE POLICY "Admin can delete suppliers" ON suppliers
  FOR DELETE USING (true);

-- 6. Add supplier_id to products
ALTER TABLE products ADD COLUMN IF NOT EXISTS supplier_id uuid REFERENCES suppliers(id) ON DELETE SET NULL;
