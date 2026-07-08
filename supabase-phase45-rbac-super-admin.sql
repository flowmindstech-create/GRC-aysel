-- ============================================================
-- GRCell — Phase 45: Super Admin + səviyyə-əsaslı silmə qıfılı (RLS)
--
-- Qərar (2026-07-08): Aysel Rajabli = YEGANƏ super_admin.
--   super_admin = hər şey + silmə + istifadəçi/rol idarəsi.
--   admin (bir səviyyə aşağı) və digərləri silə BİLMƏZ.
--
-- Bu fayl:
--   1) Aysel-i super_admin edir (başqa super_admin varsa admin-ə endirir)
--   2) auth_role() helperi
--   3) Hər org-da yalnız 1 super_admin (unique index)
--   4) Rol dəyişməyi yalnız super_admin-ə icazə verən trigger (manage_users qıfılı)
--   5) Bütün əsas cədvəllərdə DELETE yalnız super_admin (restrictive RLS)
--
-- ⚠️ SƏHV OLARSA bərpa: faylın sonundakı RECOVERY bölməsinə bax.
-- profiles.role TEXT sütunudur — enum dəyişikliyi lazım deyil.
-- ============================================================

-- ── 0) role CHECK constraint-inə 'super_admin' əlavə et ─────────────────────
-- profiles_role_check köhnə rolları saxlayır; super_admin-i icazə siyahısına qat.
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('super_admin','admin','risk_manager','auditor','employee'));

-- ── 1) Aysel Rajabli → super_admin (yeganə) ─────────────────────────────────
-- Əvvəlcə kimin uyğun gəldiyini gör (adı fərqli yazılıbsa, aşağıdakı UPDATE-i düzəlt):
-- Qeyd: profiles cədvəlində email sütunu yoxdur — yalnız full_name/role.
SELECT id, full_name, role FROM public.profiles
WHERE full_name ILIKE '%aysel%';

-- Mövcud super_admin(lar)ı — Aysel deyilsə — admin-ə endir (təklik qorunsun):
UPDATE public.profiles
SET role = 'admin'
WHERE role = 'super_admin'
  AND full_name NOT ILIKE '%aysel%';

-- Aysel-i super_admin et (ad yoxsa e-poçtla dəqiqləşdir):
UPDATE public.profiles
SET role = 'super_admin'
WHERE full_name ILIKE '%aysel%raj%'
   OR full_name ILIKE '%aysel%rəc%'
   OR full_name ILIKE '%aysel%rac%';

-- ── 2) Cari istifadəçinin rolunu qaytaran helper (SECURITY DEFINER) ──────────
CREATE OR REPLACE FUNCTION public.auth_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$;

-- ── 3) Hər org-da yalnız 1 super_admin ──────────────────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS one_super_admin_per_org
  ON public.profiles (org_id)
  WHERE role = 'super_admin';

-- ── 4) Rolu yalnız super_admin dəyişə bilər (manage_users qıfılı) ────────────
CREATE OR REPLACE FUNCTION public.guard_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role
     AND COALESCE(public.auth_role(), '') <> 'super_admin' THEN
    RAISE EXCEPTION 'Yalnız super_admin rol dəyişə bilər';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_role_change ON public.profiles;
CREATE TRIGGER trg_guard_role_change
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_role_change();

-- ── 5) DELETE yalnız super_admin — bütün əsas cədvəllərdə ────────────────────
-- Restrictive policy: mövcud permissive (org) policy-lərlə VƏ (AND) birləşir,
-- yəni silmək üçün həm org-a aid olmalı, HƏM də super_admin olmalısan.
-- Yalnız real mövcud cədvəllərə tətbiq olunur.
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'risks','incidents','controls','control_mappings',
    'compliance_obligations','compliance_risks','infosec_risks',
    'processes','vendors','audits','findings',
    'internal_documents','internal_policies','regulatory_changes',
    'obligation_control_links','obligation_policy_links'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
      EXECUTE format('DROP POLICY IF EXISTS super_admin_delete_only ON public.%I', t);
      EXECUTE format(
        'CREATE POLICY super_admin_delete_only ON public.%I '
        'AS RESTRICTIVE FOR DELETE '
        'USING (public.auth_role() = ''super_admin'')', t);
      RAISE NOTICE 'DELETE qıfılı tətbiq olundu: %', t;
    END IF;
  END LOOP;
END $$;

-- ── Yoxlama ──────────────────────────────────────────────────────────────────
SELECT full_name, role FROM public.profiles WHERE role = 'super_admin';

-- ============================================================
-- RECOVERY (yalnız giriş pozulsa işə sal):
--   -- Silmə qıfılını götür:
--   DO $$ DECLARE t text; tables text[] := ARRAY['risks','incidents','controls',
--     'control_mappings','compliance_obligations','compliance_risks','infosec_risks',
--     'processes','vendors','audits','findings','internal_documents',
--     'internal_policies','regulatory_changes','obligation_control_links',
--     'obligation_policy_links'];
--   BEGIN FOREACH t IN ARRAY tables LOOP
--     IF to_regclass('public.'||t) IS NOT NULL THEN
--       EXECUTE format('DROP POLICY IF EXISTS super_admin_delete_only ON public.%I', t);
--     END IF; END LOOP; END $$;
--   -- Rol qıfılını götür:
--   DROP TRIGGER IF EXISTS trg_guard_role_change ON public.profiles;
-- ============================================================
