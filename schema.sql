-- =============================================
-- TIRITA FLOW - Backend Schema (Supabase)
-- =============================================

-- 1. Create table `projects`
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_uid UUID NOT NULL REFERENCES auth.users(id) on delete cascade,
  name TEXT NOT NULL,
  target_url TEXT NOT NULL,
  magic_link_hash TEXT NOT NULL UNIQUE,
  gdrive_folder_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create table `checklist_items`
CREATE TABLE checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) on delete cascade,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' or 'completed'
  review_status TEXT NOT NULL DEFAULT 'pending', -- 'pending','in_review','changes_requested','approved'
  current_version INTEGER NOT NULL DEFAULT 0,
  comment_count INTEGER NOT NULL DEFAULT 0,
  file_url TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create table `feedback_notes`
CREATE TABLE feedback_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) on delete cascade,
  x_coordinate NUMERIC NOT NULL,
  y_coordinate NUMERIC NOT NULL,
  comment_text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open', -- 'open' or 'resolved'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_notes ENABLE ROW LEVEL SECURITY;

-- ==========================
-- POLÍTICAS (RLS Policies)
-- ==========================

-- PROJECTS
-- Agencias pueden crear, ver y eliminar sus proyectos
CREATE POLICY "Users can fully manage their own projects"
  ON projects FOR ALL
  TO authenticated
  USING (auth.uid() = owner_uid);

-- Clientes pueden leer proyectos si tienen el magic link (acceso público)
CREATE POLICY "Public read access for projects via magic link"
  ON projects FOR SELECT
  TO public
  USING (true); -- La seguridad se asume por el magic_link_hash en la query

-- CHECKLIST ITEMS
-- Agencias pueden gestionar checklist de sus proyectos
CREATE POLICY "Users manage checklist of their projects"
  ON checklist_items FOR ALL
  TO authenticated
  USING (project_id IN (SELECT id FROM projects WHERE owner_uid = auth.uid()));

-- Clientes pueden leer checklist (público)
CREATE POLICY "Public read access for checklist"
  ON checklist_items FOR SELECT
  TO public
  USING (true);

-- Clientes y Edge Function pueden actualizar checklist (completar item / file_url)
CREATE POLICY "Public update access for checklist"
  ON checklist_items FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

-- FEEDBACK NOTES
-- Agencias pueden gestionar feedback de sus proyectos
CREATE POLICY "Users manage feedback of their projects"
  ON feedback_notes FOR ALL
  TO authenticated
  USING (project_id IN (SELECT id FROM projects WHERE owner_uid = auth.uid()));

-- Clientes pueden leer el feedback
CREATE POLICY "Public read access for feedback"
  ON feedback_notes FOR SELECT
  TO public
  USING (true);

-- Clientes pueden crear feedback
CREATE POLICY "Public insert access for feedback"
  ON feedback_notes FOR INSERT
  TO public
  WITH CHECK (true);
