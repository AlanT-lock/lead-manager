-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (extends auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL CHECK (role IN ('admin', 'telepro')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can insert profiles" ON profiles
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can update profiles" ON profiles
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Leads table
CREATE TYPE lead_status AS ENUM (
  'nouveau', 'nrp', 'a_rappeler', 'en_attente_doc', 
  'documents_recus', 'annule'
);

CREATE TYPE lead_color AS ENUM ('bleu', 'jaune', 'violet', 'rose');

CREATE TYPE installation_type AS ENUM ('pac', 'pac_ballon', 'pac_ssc');

CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  
  -- Basic info (from CSV)
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  is_duplicate BOOLEAN DEFAULT FALSE,
  meta_lead_id TEXT,
  
  -- Status
  status lead_status NOT NULL DEFAULT 'nouveau',
  callback_at TIMESTAMPTZ,
  nrp_count INTEGER DEFAULT 0,
  
  -- Additional info (from telepro)
  department TEXT,
  address TEXT,
  postal_code TEXT,
  city TEXT,
  heating_mode TEXT,
  color lead_color,
  is_owner BOOLEAN,
  installation_type installation_type,
  
  -- Admin-only fields (Documents reçus)
  doc_status TEXT DEFAULT 'en_cours',
  is_installe BOOLEAN DEFAULT FALSE,
  is_depot_mpr BOOLEAN DEFAULT FALSE,
  is_cee_paye BOOLEAN DEFAULT FALSE,
  is_mpe_paye BOOLEAN DEFAULT FALSE,
  
  -- Financial (admin only)
  installation_cost DECIMAL(12,2),
  material_cost DECIMAL(12,2),
  material_cost_comment TEXT,
  regie_cost DECIMAL(12,2) DEFAULT 0,
  benefit_cee DECIMAL(12,2),
  benefit_mpr DECIMAL(12,2),
  profitability DECIMAL(12,2),
  chantier_comment TEXT,
  delegataire_group TEXT CHECK (delegataire_group IN ('Dépôt Drapo', 'Omega', 'Dast', 'Ynergie', 'Synerciel')),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  imported_at TIMESTAMPTZ,
  import_batch_id UUID
);

-- Lead logs table
CREATE TABLE lead_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  old_status lead_status,
  new_status lead_status,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Import batches
CREATE TABLE import_batches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  imported_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  file_name TEXT,
  total_rows INTEGER,
  imported_count INTEGER,
  error_count INTEGER,
  errors JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Documents table (metadata for PDFs)
CREATE TYPE document_type AS ENUM ('devis', 'facture', 'facture_materiel', 'facture_sous_traitant');

CREATE TABLE lead_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  type document_type NOT NULL,
  file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_size INTEGER,
  uploaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT,
  type TEXT,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_leads_assigned_to ON leads(assigned_to);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_callback_at ON leads(callback_at);
CREATE INDEX idx_leads_created_at ON leads(created_at);
CREATE INDEX idx_leads_imported_at ON leads(imported_at);
CREATE INDEX idx_lead_logs_lead_id ON lead_logs(lead_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(user_id, read);

-- RLS for leads
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Telepros can view their leads" ON leads
  FOR SELECT USING (
    assigned_to = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Telepros can update their leads (except financial)" ON leads
  FOR UPDATE USING (assigned_to = auth.uid())
  WITH CHECK (assigned_to = auth.uid());

CREATE POLICY "Admins can do everything on leads" ON leads
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can insert leads" ON leads
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- RLS for lead_logs
ALTER TABLE lead_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view logs of their leads" ON lead_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM leads WHERE leads.id = lead_logs.lead_id AND (leads.assigned_to = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')))
  );

CREATE POLICY "Users can insert logs" ON lead_logs
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- RLS for lead_documents
ALTER TABLE lead_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage documents" ON lead_documents
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- RLS for notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (user_id = auth.uid());

-- RLS for import_batches
ALTER TABLE import_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view import batches" ON import_batches
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can insert import batches" ON import_batches
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Function to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'telepro')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user (admin creates users via dashboard, so we need to handle role from metadata)
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Storage bucket for documents
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false);

CREATE POLICY "Admins can upload documents" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'documents' AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can read documents" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'documents' AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can delete documents" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'documents' AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
