-- ============================================================================
-- phase58 — profiles RLS rekursiyasının düzəlişi  (phase57-ni ƏVƏZ EDİR)
--
-- PROBLEM: phase57-dəki siyasətlər `profiles` üzərində idi, amma öz içlərində
--   yenə `SELECT ... FROM profiles` çağırırdı. Postgres bu alt-sorğuya da eyni
--   siyasəti tətbiq edir → sonsuz döngə:
--       ERROR 42P17: infinite recursion detected in policy for relation "profiles"
--   Nəticə: profiles-ə hər SELECT 500 qaytarır. getCurrentProfile() null olur,
--   RBAC çökür, sidebar boşalır. `profiles`-ə baxan digər cədvəllərin
--   (risks, incidents, ...) siyasətləri də eyni səbəbdən 500 verir.
--
-- HƏLL: alt-sorğular SECURITY DEFINER funksiyalara köçürülür. Belə funksiya
--   cədvəl sahibi (postgres) hüququ ilə işləyir, ona görə RLS yenidən
--   qiymətləndirilmir və döngə qırılır. Supabase-in tövsiyə etdiyi üsuldur.
--   Hüquq modeli phase57 ilə eynidir — yalnız icra üsulu dəyişir.
-- ============================================================================

-- ── Köməkçi funksiyalar ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.current_org_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT org_id FROM public.profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.current_role_name()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role::text FROM public.profiles WHERE id = auth.uid()
$$;

GRANT EXECUTE ON FUNCTION public.current_org_id()   TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.current_role_name() TO authenticated, anon;

-- ── Siyasətlər yenidən qurulur ─────────────────────────────────────────────
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS own_profile              ON profiles;
DROP POLICY IF EXISTS profiles_org_select      ON profiles;
DROP POLICY IF EXISTS profiles_self_update     ON profiles;
DROP POLICY IF EXISTS profiles_self_insert     ON profiles;
DROP POLICY IF EXISTS profiles_super_admin_all ON profiles;

-- Oxu: öz sətrin HƏMİŞƏ + eyni təşkilatdakılar
CREATE POLICY profiles_org_select ON profiles
  FOR SELECT USING (
    id = auth.uid()
    OR org_id = public.current_org_id()
  );

-- Yeniləmə: öz sətrin (rol dəyişikliyini trg_guard_role_change ayrıca qoruyur)
CREATE POLICY profiles_self_update ON profiles
  FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- Insert: yalnız öz sətrin (qeydiyyat / ilk giriş)
CREATE POLICY profiles_self_insert ON profiles
  FOR INSERT WITH CHECK (id = auth.uid());

-- Super admin təşkilatındakı hamını idarə edir (rol təyini, deaktivasiya)
CREATE POLICY profiles_super_admin_all ON profiles
  FOR ALL
  USING      (public.current_role_name() = 'super_admin' AND org_id = public.current_org_id())
  WITH CHECK (public.current_role_name() = 'super_admin' AND org_id = public.current_org_id());

-- ── Yoxlama ────────────────────────────────────────────────────────────────
-- Rekursiya qalmadığını təsdiqləyir; xəta vermədən sətir qaytarmalıdır:
SELECT count(*) AS profiles_oxuna_bilir FROM profiles;
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'profiles' ORDER BY policyname;
