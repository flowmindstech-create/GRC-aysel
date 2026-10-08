-- ============================================================================
-- phase67 — Super Admin tərəfindən istifadəçi provisioning (invite-only)
--
-- NƏ ÜÇÜN: açıq qeydiyyat bağlanır. Bundan sonra hesabları yalnız super_admin
-- yaradır (Settings → Users → Add user → /api/admin/users). Həmin route server
-- tərəfdə SUPABASE_SERVICE_ROLE_KEY ilə işləyir və çağıranın super_admin
-- olduğunu Supabase sessiyasından yoxlayır.
--
-- PROBLEM: `guard_role_change` trigger-i (phase45) rol dəyişikliyini yalnız
-- `auth_role() = 'super_admin'` olduqda buraxır. `auth_role()` isə
-- `auth.uid()`-ə baxır — service role sorğusunda `auth.uid()` NULL-dur, ona görə
-- server route profilin rolunu 'employee'-dən 'risk_manager'-ə qaldıra bilmir.
-- (Bu, `on_auth_user_created` trigger-i aktiv olduqda baş verir: trigger yeni
-- auth istifadəçisi üçün dərhal 'employee' profili yaradır, route-un yazısı isə
-- INSERT yox, UPDATE olur.)
--
-- HƏLL: trigger-ə service_role istisnası əlavə olunur. Bu təhlükəsizliyi
-- ZƏİFLƏTMİR — service role açarı onsuz da bütün RLS-i keçir və yalnız
-- serverdə (Vercel env) mövcuddur; brauzerə heç vaxt düşmür. Rol qıfılı
-- route-un öz super_admin yoxlamasındadır.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.guard_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_service_role boolean;
BEGIN
  -- service_role aşkarlanması — İKİ müstəqil yolla, çünki Supabase-in köhnə
  -- (JWT `service_role`) və yeni (`sb_secret_…`) açar formatları eyni siqnalı
  -- vermir:
  --   1) JWT iddiası — köhnə format üçün. Claims JSON pozuqdursa partlamasın
  --      deyə ayrıca blokda tutulur.
  --   2) Sessiya rolu — PostgREST hər sorğuda `SET LOCAL ROLE service_role`
  --      edir, ona görə bu hər iki formatda işləyir. SECURITY DEFINER
  --      `current_user`-i dəyişir, amma `role` GUC-unu DEYİL.
  BEGIN
    is_service_role := COALESCE(
      current_setting('request.jwt.claims', true)::json ->> 'role', ''
    ) = 'service_role';
  EXCEPTION WHEN others THEN
    is_service_role := false;
  END;

  IF NOT is_service_role THEN
    is_service_role := COALESCE(current_setting('role', true), '') = 'service_role';
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role
     AND COALESCE(public.auth_role(), '') <> 'super_admin'
     AND NOT is_service_role
  THEN
    RAISE EXCEPTION 'Yalnız super_admin rol dəyişə bilər';
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger-in özü dəyişmir, yalnız funksiya yenilənir. Yenə də idempotent olsun:
DROP TRIGGER IF EXISTS trg_guard_role_change ON public.profiles;
CREATE TRIGGER trg_guard_role_change
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_role_change();

-- ── Yoxlama ────────────────────────────────────────────────────────────────
-- 1) Funksiyada HƏR İKİ aşkarlama yolu var? (ikisi də true olmalıdır)
SELECT (pg_get_functiondef(oid) ILIKE '%request.jwt.claims%') AS jwt_yolu_var,
       (pg_get_functiondef(oid) ILIKE '%current_setting(''role''%') AS sessiya_rolu_yolu_var
  FROM pg_proc
 WHERE proname = 'guard_role_change'
   AND pronamespace = 'public'::regnamespace;

-- 2) Trigger yerindədir (1 sətir: trg_guard_role_change / profiles)
SELECT tgname AS trigger_adi, tgrelid::regclass AS cedvel, tgenabled AS vezyyet
  FROM pg_trigger
 WHERE tgname = 'trg_guard_role_change';

-- 3) auth.users-də profili olmayan "yetim" hesablar varmı?
--    (Admin route artıq yetim yaratmır — profil yazısı uğursuz olarsa auth
--     istifadəçisini geri silir. Bu sorğu köhnə qalıqları göstərir.)
SELECT u.email, u.created_at, u.last_sign_in_at
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
 WHERE p.id IS NULL
 ORDER BY u.created_at DESC;
