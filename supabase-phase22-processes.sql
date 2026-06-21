-- ============================================================
-- RiskShield IRM — Phase 22 Migration (Business Processes)
-- Introduces a business process entity in the Control Map. Processes group
-- the controls that operate within them; incidents (phase 24) attach to a
-- process so related risks/incidents/controls can be surfaced automatically.
-- ============================================================

-- ── processes ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS processes (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  code        TEXT UNIQUE,            -- PRC-YYYY-NNN
  name        TEXT NOT NULL,
  owner_dept  TEXT,
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_processes_org ON processes(org_id);

ALTER TABLE processes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org_processes" ON processes;
CREATE POLICY "org_processes" ON processes
  FOR ALL USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));

-- ── process_control_links (process ↔ control) ───────────────────────────────
CREATE TABLE IF NOT EXISTS process_control_links (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  process_id UUID NOT NULL REFERENCES processes(id) ON DELETE CASCADE,
  control_id UUID NOT NULL REFERENCES controls(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (process_id, control_id)
);

CREATE INDEX IF NOT EXISTS idx_proc_ctrl_proc ON process_control_links(process_id);
CREATE INDEX IF NOT EXISTS idx_proc_ctrl_org  ON process_control_links(org_id);

ALTER TABLE process_control_links ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org_process_control_links" ON process_control_links;
CREATE POLICY "org_process_control_links" ON process_control_links
  FOR ALL USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));
