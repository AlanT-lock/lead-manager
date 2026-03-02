-- Types de produits (configurables par l'admin)
CREATE TABLE product_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Produits (matériel)
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  price DECIMAL(12,2) NOT NULL DEFAULT 0,
  product_type_id UUID NOT NULL REFERENCES product_types(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Liaison lead <-> produits (plusieurs matériaux par lead)
CREATE TABLE lead_materials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(lead_id, product_id)
);

-- Index
CREATE INDEX idx_products_product_type_id ON products(product_type_id);
CREATE INDEX idx_lead_materials_lead_id ON lead_materials(lead_id);
CREATE INDEX idx_lead_materials_product_id ON lead_materials(product_id);

-- RLS product_types (admin uniquement pour CRUD)
ALTER TABLE product_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage product_types" ON product_types
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Lecture pour admin et secrétaire (pour sélection sur leads)
CREATE POLICY "Admins and secretaries can view product_types" ON product_types
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'secretaire'))
  );

-- RLS products (admin CRUD, admin+secretaire lecture)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage products" ON products
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins and secretaries can view products" ON products
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'secretaire'))
  );

-- RLS lead_materials (admin et secrétaire)
ALTER TABLE lead_materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and secretaries can manage lead_materials" ON lead_materials
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'secretaire'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'secretaire'))
  );
