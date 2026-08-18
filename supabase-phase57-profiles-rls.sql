-- ============================================================================
-- phase57 — profiles RLS: öz profilini oxu + təşkilat daxilində digərlərini gör
--
-- PROBLEM: profiles üzərində yeganə siyasət `own_profile` idi:
--     FOR ALL USING (id = auth.uid())
--   Bu, iki ağrı yaradırdı:
--   1) Oxu bloklanan hallarda getCurrentProfile() sətri "yoxdur" sayır və
--      auth metadata-dan SAXTA 'employee' profil qurur — bazadakı əsl
--      super_admin sətri gizli qalır (hesabların qarışması).
--   2) Settings → İstifadəçilər yalnız 1 nəfər (özünü) göstərir; vəzifə
--      transferində seçiləcək adam olmur, cədvəllərdə adlar "—" görünür.
--
-- Yazma hüququ dəyişmir: rolu yalnız super_admin dəyişir
-- (trg_guard_role_change + one_super_admin_per_org qüvvədə qalır).
-- ============================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS own_profile           ON profiles;
DROP POLICY IF EXISTS profiles_org_select   ON profiles;
DROP POLICY IF EXISTS profiles_self_update  ON profiles;
DROP POLICY IF EXISTS profiles_self_insert  ON profiles;

-- Oxu: öz sətrin HƏMİŞƏ + eyni təşkilatdakılar
CREATE POLICY profiles_org_select ON profiles
  FOR SELECT USING (
    id = auth.uid()
    OR org_id = (SELECT org_id FROM profiles WHERE id = auth.uid())
  );

-- Yeniləmə: öz sətrin (rol dəyişikliyini trigger ayrıca qoruyur)
CREATE POLICY profiles_self_update ON profiles
  FOR UPDATE USING (id = auth.uid());

-- Insert: yalnız öz sətrin (qeydiyyat / ilk giriş)
CREATE POLICY profiles_self_insert ON profiles
  FOR INSERT WITH CHECK (id = auth.uid());

-- Super admin hamını idarə edə bilsin (rol təyini, deaktivasiya)
CREATE POLICY profiles_super_admin_all ON profiles
  FOR ALL USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'super_admin'
  );

-- ── Yoxlama ────────────────────────────────────────────────────────────────
-- SELECT policyname, cmd FROM pg_policies WHERE tablename = 'profiles';
