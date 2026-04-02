-- =============================================
-- TIRITA FLOW - Delivery Threads (Hilos de Entrega)
-- Versionado + Comentarios por Entregable
-- =============================================

-- 1. Add review fields to checklist_items
ALTER TABLE checklist_items
  ADD COLUMN IF NOT EXISTS review_status TEXT NOT NULL DEFAULT 'pending',
  -- Values: 'pending', 'in_review', 'changes_requested', 'approved'
  ADD COLUMN IF NOT EXISTS current_version INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS comment_count INTEGER NOT NULL DEFAULT 0;

-- 2. File versions table — tracks every upload per deliverable
CREATE TABLE IF NOT EXISTS file_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES checklist_items(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL DEFAULT 1,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size BIGINT DEFAULT 0,
  uploaded_by TEXT NOT NULL DEFAULT 'client', -- 'client' or 'agency'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Thread messages table — unified chat per deliverable
CREATE TABLE IF NOT EXISTS thread_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES checklist_items(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  message_type TEXT NOT NULL DEFAULT 'comment',
  -- Values: 'comment', 'system_upload', 'system_approved', 'system_changes_requested'
  sender_type TEXT NOT NULL DEFAULT 'client', -- 'client', 'agency', 'system'
  sender_name TEXT DEFAULT 'Cliente',
  message_text TEXT NOT NULL,
  file_version_id UUID REFERENCES file_versions(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_file_versions_item ON file_versions(item_id);
CREATE INDEX IF NOT EXISTS idx_thread_messages_item ON thread_messages(item_id);
CREATE INDEX IF NOT EXISTS idx_file_versions_project ON file_versions(project_id);
CREATE INDEX IF NOT EXISTS idx_thread_messages_project ON thread_messages(project_id);

-- 5. RLS
ALTER TABLE file_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE thread_messages ENABLE ROW LEVEL SECURITY;

-- File versions — public read, public insert
CREATE POLICY "Public read file_versions"
  ON file_versions FOR SELECT TO public USING (true);

CREATE POLICY "Public insert file_versions"
  ON file_versions FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Authenticated manage file_versions"
  ON file_versions FOR ALL TO authenticated
  USING (project_id IN (SELECT id FROM projects WHERE owner_uid = auth.uid()));

-- Thread messages — public read, public insert
CREATE POLICY "Public read thread_messages"
  ON thread_messages FOR SELECT TO public USING (true);

CREATE POLICY "Public insert thread_messages"
  ON thread_messages FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Authenticated manage thread_messages"
  ON thread_messages FOR ALL TO authenticated
  USING (project_id IN (SELECT id FROM projects WHERE owner_uid = auth.uid()));

-- Allow public update on checklist_items review fields
-- (Already has public update policy from original schema)
