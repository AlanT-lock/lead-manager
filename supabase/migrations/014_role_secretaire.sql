-- Ajouter le rôle secrétaire au CHECK de profiles
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('admin', 'telepro', 'secretaire'));

-- Mettre à jour handle_new_user pour accepter secretaire
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    CASE
      WHEN NEW.raw_user_meta_data->>'role' IN ('admin', 'telepro', 'secretaire') THEN NEW.raw_user_meta_data->>'role'
      ELSE 'telepro'
    END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS : Secrétaires ont les mêmes accès qu'admin sur leads, documents, logs, import, storage
-- (sauf gestion des utilisateurs/profiles)

-- Leads : secrétaire = admin (toutes opérations)
CREATE POLICY "Secretaires can do everything on leads" ON leads
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'secretaire')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'secretaire')
  );

-- Lead logs : secrétaire peut voir les logs de tous les leads
CREATE POLICY "Secretaires can view all lead logs" ON lead_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'secretaire')
  );

-- Lead documents : secrétaire = admin
CREATE POLICY "Secretaires can manage documents" ON lead_documents
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'secretaire')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'secretaire')
  );

-- Import batches : secrétaire = admin
CREATE POLICY "Secretaires can view import batches" ON import_batches
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'secretaire')
  );

CREATE POLICY "Secretaires can insert import batches" ON import_batches
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'secretaire')
  );

-- Storage : secrétaire = admin (upload, read, delete documents)
CREATE POLICY "Secretaires can upload documents" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'documents' AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'secretaire')
  );

CREATE POLICY "Secretaires can read documents" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'documents' AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'secretaire')
  );

CREATE POLICY "Secretaires can delete documents" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'documents' AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'secretaire')
  );
