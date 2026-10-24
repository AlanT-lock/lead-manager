-- Tâches : n'importe quel utilisateur peut se créer une tâche ou en envoyer
-- une à un autre profil. Un rappel optionnel (remind_at) déclenche une
-- notification persistante chez le destinataire tant que la tâche n'est pas
-- validée (completed_at).

CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL DEFAULT 'important' CHECK (priority IN ('urgent', 'important')),
  remind_at TIMESTAMPTZ,
  assigned_to UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS tasks_assigned_pending_idx
  ON tasks (assigned_to, remind_at)
  WHERE completed_at IS NULL;
CREATE INDEX IF NOT EXISTS tasks_created_by_idx ON tasks (created_by);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Les routes API passent par la service role (RLS contournée) ; ces politiques
-- couvrent les accès directs depuis le client.
DROP POLICY IF EXISTS "Users see their own tasks" ON tasks;
CREATE POLICY "Users see their own tasks" ON tasks
  FOR SELECT USING (assigned_to = auth.uid() OR created_by = auth.uid());

DROP POLICY IF EXISTS "Admins and secretaires see all tasks" ON tasks;
CREATE POLICY "Admins and secretaires see all tasks" ON tasks
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'secretaire'))
  );
