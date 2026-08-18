-- ============================================================================
-- phase59 — profiles bərpası (email sütunu + çatışmayan sətirlər + super admin)
--
-- TAPILAN SƏHV: canlı bazada `profiles.email` sütunu YOXDUR, amma
--   getCurrentProfile() profil sətri tapılmayanda məhz `email` ilə INSERT edir.
--   INSERT 42703 ilə düşür, app isə səssizcə YADDAŞDA saxta 'employee' profil
--   qaytarır (bazaya yazılmır). Nəticə: hər girişdə boş dashboard, minimal
--   sidebar, "User" adı — və heç vaxt özü düzəlmir.
-- ============================================================================

-- 1) Çatışmayan sütun + auth.users-dən doldurma
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email     text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

UPDATE public.profiles p
   SET email = u.email
  FROM auth.users u
 WHERE u.id = p.id AND p.email IS DISTINCT FROM u.email;

-- 2) Default təşkilat mövcud olsun
INSERT INTO public.organizations (id, name)
VALUES ('00000000-0000-0000-0000-000000000001', 'GRCell')
ON CONFLICT (id) DO NOTHING;

-- 3) Profili olmayan HƏR auth istifadəçisi üçün sətir yarat
INSERT INTO public.profiles (id, org_id, full_name, role, email, is_active)
SELECT u.id,
       '00000000-0000-0000-0000-000000000001',
       COALESCE(NULLIF(u.raw_user_meta_data->>'full_name',''), split_part(u.email,'@',1)),
       'employee',
       u.email,
       true
  FROM auth.users u
 WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id);

-- 4) org_id boş qalanları default təşkilata bağla
UPDATE public.profiles
   SET org_id = '00000000-0000-0000-0000-000000000001'
 WHERE org_id IS NULL;

-- 5) Super admin: flowminds.tech@gmail.com
--    trg_guard_role_change SQL Editor-dan gələn UPDATE-i bloklayır
--    (auth.uid() burada NULL-dur), ona görə müvəqqəti söndürülür.
ALTER TABLE public.profiles DISABLE TRIGGER trg_guard_role_change;

-- one_super_admin_per_org unikal indeksi var: eyni təşkilatda başqa super admin
-- qalarsa promosyon düşər — onları admin-ə endiririk.
UPDATE public.profiles
   SET role = 'admin'
 WHERE role = 'super_admin'
   AND org_id = '00000000-0000-0000-0000-000000000001'
   AND lower(email) <> 'flowminds.tech@gmail.com';

UPDATE public.profiles
   SET role = 'super_admin', is_active = true,
       org_id = '00000000-0000-0000-0000-000000000001'
 WHERE lower(email) = 'flowminds.tech@gmail.com';

ALTER TABLE public.profiles ENABLE TRIGGER trg_guard_role_change;

-- ── NƏTİCƏ ─────────────────────────────────────────────────────────────────
SELECT p.email, p.full_name, p.role, p.is_active, p.org_id
  FROM public.profiles p
 ORDER BY p.role DESC, p.email;
