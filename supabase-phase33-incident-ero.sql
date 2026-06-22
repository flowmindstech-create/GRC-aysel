-- ============================================================
-- RiskShield IRM — Phase 33 Migration (Incident ERO resolution routing)
-- Risk manager assigns the resolution to a department's ERO; that ERO sees
-- only their assigned incident, fills the resolution + a note, but cannot
-- change status or forward (status stays risk-owner only).
-- ============================================================

ALTER TABLE incidents
  ADD COLUMN IF NOT EXISTS assigned_dept             TEXT,
  ADD COLUMN IF NOT EXISTS resolution_assignee       UUID,
  ADD COLUMN IF NOT EXISTS resolution_assignee_name  TEXT,
  ADD COLUMN IF NOT EXISTS ero_note                  TEXT;

-- Extend incident RBAC so the ERO sees incidents routed to them for resolution.
DROP POLICY IF EXISTS "rbac_incidents" ON incidents;
CREATE POLICY "rbac_incidents" ON incidents
  FOR ALL
  USING (
    org_id = (SELECT org_id FROM profiles WHERE id = auth.uid())
    AND (
      (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','risk_manager')
      OR reported_by = auth.uid()
      OR assigned_to = auth.uid()
      OR resolution_assignee = auth.uid()
    )
  )
  WITH CHECK (
    org_id = (SELECT org_id FROM profiles WHERE id = auth.uid())
  );

-- ── RECOVERY ────────────────────────────────────────────────────────────────
-- DROP POLICY IF EXISTS "rbac_incidents" ON incidents;
-- CREATE POLICY "org_incidents" ON incidents FOR ALL
--   USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));
