-- ============================================================
-- RiskShield IRM — Phase 26 Migration (Incident residual risk)
-- Stores the residual risk level computed from the incident's current control
-- (inherent level × control effectiveness), mirroring the risk register.
-- ============================================================

ALTER TABLE incidents
  ADD COLUMN IF NOT EXISTS incident_residual_level TEXT;
