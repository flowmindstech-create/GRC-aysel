-- ============================================================
-- RiskShield IRM — Phase 41 Migration (Internal Document List + process enrichment)
-- 1) internal_documents: Policy Governance-də "Internal Document List" reyestri
-- 2) process_document_links: proses ↔ internal sənəd M:N (Mapping Matrix "Internal Policy" sütunu)
-- 3) processes: maturity (CMMI 1-5), alt proseslər, iştirakçı struktur/şəxslər
-- ============================================================

-- ── internal_documents ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS internal_documents (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id            UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  doc_uid           TEXT NOT NULL,            -- unikal ID (DOC-YYYY-NNN)
  name              TEXT NOT NULL,            -- sənədin adı
  doc_type          TEXT NOT NULL DEFAULT 'other'
    CHECK (doc_type IN ('policy','rule','procedure','instruction','charter','methodology','other')),
  doc_number        TEXT,                     -- sənəd nömrəsi
  version           TEXT NOT NULL DEFAULT '1.0',
  effective_date    DATE,                     -- qüvvəyə minmə tarixi
  approved_by       TEXT,                     -- təsdiqləyən rəhbər
  author_dept       TEXT,                     -- sənədi tərtib edən struktur
  participant_depts TEXT[] DEFAULT '{}',      -- iştirakçı strukturlar
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (org_id, doc_uid)
);
CREATE INDEX IF NOT EXISTS idx_internal_docs_org ON internal_documents(org_id);
ALTER TABLE internal_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org_internal_documents" ON internal_documents;
CREATE POLICY "org_internal_documents" ON internal_documents
  FOR ALL USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));

-- ── process_document_links ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS process_document_links (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  process_id  UUID NOT NULL REFERENCES processes(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES internal_documents(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (process_id, document_id)
);
CREATE INDEX IF NOT EXISTS idx_proc_doc_proc ON process_document_links(process_id);
ALTER TABLE process_document_links ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org_process_document_links" ON process_document_links;
CREATE POLICY "org_process_document_links" ON process_document_links
  FOR ALL USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));

-- ── processes enrichment ─────────────────────────────────────────────────────
ALTER TABLE processes
  ADD COLUMN IF NOT EXISTS maturity           INT CHECK (maturity BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS sub_processes      TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS participant_depts  TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS participant_people TEXT[] DEFAULT '{}';
