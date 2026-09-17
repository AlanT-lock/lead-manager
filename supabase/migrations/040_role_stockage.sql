-- Rôle « stockage » : un espace qui ne gère que la page Stockage
-- (produits, types de produits, fournisseurs). Aucun accès aux leads,
-- aux utilisateurs ni aux statistiques.

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'telepro', 'secretaire', 'stockage'));

-- handle_new_user doit accepter le nouveau rôle, sinon tout compte créé
-- depuis /admin/users retombe silencieusement sur « telepro ».
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    CASE
      WHEN NEW.raw_user_meta_data->>'role' IN ('admin', 'telepro', 'secretaire', 'stockage')
        THEN NEW.raw_user_meta_data->>'role'
      ELSE 'telepro'
    END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS : sur les tables du stockage, le rôle « stockage » a les mêmes droits
-- que l'admin. Les routes API passent par la service role (RLS contournée),
-- ces politiques couvrent les accès directs depuis le client.
DROP POLICY IF EXISTS "Stockage can manage product_types" ON product_types;
CREATE POLICY "Stockage can manage product_types" ON product_types
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'stockage')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'stockage')
  );

DROP POLICY IF EXISTS "Stockage can manage products" ON products;
CREATE POLICY "Stockage can manage products" ON products
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'stockage')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'stockage')
  );
