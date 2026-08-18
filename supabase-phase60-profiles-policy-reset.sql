-- ============================================================================
-- phase60 — profiles siyasətlərinin TAM sıfırlanması (phase57/58-i tamamlayır)
--
-- TAPILAN SƏHV: supabase/migration_full.sql (sətir 744-762) `public.profiles`
--   üzərində DÖRD siyasət qurur; üçü öz içindən yenə profiles-ə baxır:
--       USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()))
--   → 42P17 infinite recursion. Hamısı `TO authenticated` olduğu üçün anon
--   rolunda ÜMUMİYYƏTLƏ qiymətləndirilmir — ona görə anon sorğuları 200,
--   daxil olmuş istifadəçinin sorğuları isə 500 qaytarırdı.
--   Əlavə olaraq "profiles_insert ... WITH CHECK (true)" hər authenticated
--   istifadəçiyə İSTƏNİLƏN id üçün profil yazmağa icazə verirdi.
--
-- Ad-ad silmək riskli oldu (adlar müxtəlif fayllarda fərqlidir), ona görə
-- burada profiles üzərindəki BÜTÜN siyasətlər dövr ilə silinir və yalnız
-- dördü yenidən qurulur. phase58-dəki SECURITY DEFINER funksiyaları rekursiyanı
-- qırır (onlar cədvəl sahibi hüququ ilə işlədiyi üçün RLS yenidən işə düşmür).
-- ============================================================================

-- 0) Köməkçi funksiyalar (phase58 işlədilməyibsə də bura özü qurur)
CREATE OR REPLACE FUNCTION public.current_org_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT org_id FROM public.profiles WHERE id = auth.uid() $$;

CREATE OR REPLACE FUNCTION public.current_role_name()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT role::text FROM public.profiles WHERE id = auth.uid() $$;

GRANT EXECUTE ON FUNCTION public.current_org_id()    TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.current_role_name() TO authenticated, anon;

-- 1) profiles üzərindəki BÜTÜN siyasətləri sil (ad fərqi əhəmiyyətsizdir)
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies
            WHERE schemaname = 'public' AND tablename = 'profiles'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', r.policyname);
  END LOOP;
END $$;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2) Yalnız rekursiyasız siyasətlər
CREATE POLICY profiles_org_select ON public.profiles
  FOR SELECT USING (id = auth.uid() OR org_id = public.current_org_id());

CREATE POLICY profiles_self_update ON public.profiles
  FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- Yalnız ÖZ sətrini yarada bilər (əvvəlki `WITH CHECK (true)` boşluğu bağlanır)
CREATE POLICY profiles_self_insert ON public.profiles
  FOR INSERT WITH CHECK (id = auth.uid());

CREATE POLICY profiles_super_admin_all ON public.profiles
  FOR ALL
  USING      (public.current_role_name() = 'super_admin' AND org_id = public.current_org_id())
  WITH CHECK (public.current_role_name() = 'super_admin' AND org_id = public.current_org_id());

-- ── YOXLAMA: rekursiv qalıq varmı? ─────────────────────────────────────────
-- "recursive_qaliq" sütunu 0 olmalıdır.
SELECT count(*) AS recursive_qaliq
  FROM pg_policies
 WHERE schemaname = 'public' AND tablename = 'profiles'
   AND (COALESCE(qual,'') || COALESCE(with_check,'')) ILIKE '%from profiles%';

SELECT policyname, cmd, roles FROM pg_policies
 WHERE schemaname = 'public' AND tablename = 'profiles' ORDER BY policyname;
