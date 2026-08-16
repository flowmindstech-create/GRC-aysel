-- ============================================================
-- GRCell — Phase 53: Vəzifə transferi + Xüsusi icazələr (super_admin)
-- Kod localStorage fallback ilə də işləyir; bu SQL Supabase-də tam funksiya üçündür.
-- ============================================================

-- 1) Vəzifə transferi üçün profil deaktivasiyası (is_active)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- 2) Xüsusi icazələr cədvəli (Access Exceptions)
CREATE TABLE IF NOT EXISTS public.access_exceptions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id      uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  entity_type  text NOT NULL,                       -- risk | incident | audit | org_unit | all
  entity_id    uuid,                                -- konkret obyekt/bölmə; NULL = bütün növ
  permission   text NOT NULL DEFAULT 'view'
    CHECK (permission IN ('view','edit','approve')),
  reason       text NOT NULL,
  starts_at    timestamptz,
  expires_at   timestamptz,
  revoked      boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_access_exceptions_user ON public.access_exceptions (user_id);
CREATE INDEX IF NOT EXISTS idx_access_exceptions_org  ON public.access_exceptions (org_id);

-- 3) RLS — org-daxili oxu; yaratma/dəyişmə yalnız super_admin (auth_role phase45-dən)
ALTER TABLE public.access_exceptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ae_org_select ON public.access_exceptions;
CREATE POLICY ae_org_select ON public.access_exceptions FOR SELECT
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS ae_super_admin_write ON public.access_exceptions;
CREATE POLICY ae_super_admin_write ON public.access_exceptions FOR ALL
  USING (public.auth_role() = 'super_admin')
  WITH CHECK (public.auth_role() = 'super_admin');

-- Yoxlama
SELECT column_name FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'is_active';
SELECT to_regclass('public.access_exceptions') AS access_exceptions_table;
