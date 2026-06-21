-- ============================================================
-- RiskShield IRM — Phase 29 Migration (User vs Risk-team split)
-- Risk-team roles (admin / risk_manager) see ALL org risks.
-- Everyone else (employee/…) sees only risks they own (owner_id = self).
-- WITH CHECK stays org-scoped so creating a risk is never blocked.
--
-- SAFETY: your account must be role='admin' or 'risk_manager' to keep full
-- access. Recovery (revert to org-only) is at the bottom of this file.
-- ============================================================

DROP POLICY IF EXISTS "org_risks" ON risks;
DROP POLICY IF EXISTS "rbac_risks" ON risks;
CREATE POLICY "rbac_risks" ON risks
  FOR ALL
  USING (
    org_id = (SELECT org_id FROM profiles WHERE id = auth.uid())
    AND (
      (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','risk_manager')
      OR owner_id = auth.uid()
    )
  )
  WITH CHECK (
    org_id = (SELECT org_id FROM profiles WHERE id = auth.uid())
  );

-- ── RECOVERY (run ONLY if access breaks) ─────────────────────────────────────
-- DROP POLICY IF EXISTS "rbac_risks" ON risks;
-- CREATE POLICY "org_risks" ON risks FOR ALL
--   USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));
