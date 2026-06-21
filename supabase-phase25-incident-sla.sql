-- ============================================================
-- RiskShield IRM — Phase 25 Migration (Incident SLA & handover)
-- Adds SLA / acknowledgement / forwarding fields and the investigation team.
-- ============================================================

ALTER TABLE incidents
  ADD COLUMN IF NOT EXISTS investigation_members JSONB,
  ADD COLUMN IF NOT EXISTS acknowledged_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sla_due_date          TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS forwarded_at          TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS forwarded_to          TEXT;
