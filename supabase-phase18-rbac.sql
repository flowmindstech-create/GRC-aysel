-- ============================================================
-- RiskShield IRM — Phase 18 Migration (3-tier RBAC)
-- 1) New signups default to 'employee' (no longer auto-admin)
-- 2) Incident tier visibility via RLS
--    - admin / risk_manager  → see ALL org incidents (control tower)
--    - everyone else         → only incidents they reported or are assigned to
--    WITH CHECK stays org-scoped so creating/updating is never blocked by tier.
--
-- SAFETY: your account must be role='admin' to keep full access.
--         Recovery (if anything breaks): see the bottom of this file.
-- ============================================================

-- 1) Default role for new users = employee
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, org_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    'employee',
    '00000000-0000-0000-0000-000000000001'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2) Incident RBAC
DROP POLICY IF EXISTS "org_incidents" ON incidents;
DROP POLICY IF EXISTS "rbac_incidents" ON incidents;
CREATE POLICY "rbac_incidents" ON incidents
  FOR ALL
  USING (
    org_id = (SELECT org_id FROM profiles WHERE id = auth.uid())
    AND (
      (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','risk_manager')
      OR reported_by = auth.uid()
      OR assigned_to = auth.uid()
    )
  )
  WITH CHECK (
    org_id = (SELECT org_id FROM profiles WHERE id = auth.uid())
  );

-- ── RECOVERY (run ONLY if access breaks) ─────────────────────────────────────
-- DROP POLICY IF EXISTS "rbac_incidents" ON incidents;
-- CREATE POLICY "org_incidents" ON incidents FOR ALL
--   USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));
