-- ============================================================
-- GRCell — Phase 51: Abunə (subscription) təməli — multi-tenant SaaS
-- Hər təşkilat (org) abunəlik daşıyır: plan + status + bitmə tarixi.
-- Abunə bitəndə/dayandırılanda o org-un istifadəçiləri app-a girə bilməz.
-- FAIL-OPEN: sahələr boşdursa VƏ YA is_active=true olan hər org işləyir —
-- yəni bu SQL heç kimi dərhal bloklamır, yalnız infrastruktur qurur.
-- ============================================================

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS subscription_status text NOT NULL DEFAULT 'active'
    CHECK (subscription_status IN ('trial','active','past_due','suspended','cancelled')),
  ADD COLUMN IF NOT EXISTS subscription_expires_at timestamptz,   -- NULL = müddətsiz (fail-open)
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true, -- manual açar/söndürücü
  ADD COLUMN IF NOT EXISTS contact_email text,
  ADD COLUMN IF NOT EXISTS seats int;                              -- icazə verilən istifadəçi sayı (NULL = limitsiz)

-- Cari istifadəçinin org-u aktivdirmi? (SECURITY DEFINER — RLS-də və app-da işlənir)
-- Aktiv = is_active AND status ok AND (müddət yoxdur VƏ YA hələ bitməyib)
CREATE OR REPLACE FUNCTION public.my_org_active()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT o.is_active
        AND o.subscription_status IN ('trial','active','past_due')
        AND (o.subscription_expires_at IS NULL OR o.subscription_expires_at > now())
     FROM public.organizations o
     JOIN public.profiles p ON p.org_id = o.id
     WHERE p.id = auth.uid()),
    true  -- org tapılmasa buraxır (fail-open — heç kim təsadüfən kilidlənməsin)
  )
$$;

-- Yoxlama: hazırda hansı org hansı statusda
SELECT id, name, plan, subscription_status, subscription_expires_at, is_active
FROM public.organizations;

-- ============================================================
-- ABUNƏ İDARƏETMƏ ƏMRLƏRİ (yalnız SƏN — platform sahibi — işlədirsən)
-- Diqqət: bunları büro görməməlidir. Abunə leverage-i sənin əlində qalmalıdır,
-- ona görə tenant-ın super_admin-i (Aysel) abunəni özü uzada BİLMƏMƏLİDİR.
-- Bu əmrlər Supabase SQL Editor-də sənin tərəfindən icra olunur.
-- ============================================================

-- Büronun org-unu 1 il aktiv et (adı öz org-unla əvəz et):
-- UPDATE public.organizations
-- SET is_active = true, subscription_status = 'active',
--     subscription_expires_at = now() + interval '1 year'
-- WHERE name ILIKE '%acme%';   -- və ya büro org-unun adı/id-si

-- Ödəmə gəlməyəndə dayandır (giriş dərhal kəsilir):
-- UPDATE public.organizations SET subscription_status = 'suspended'
-- WHERE name ILIKE '%acme%';

-- Trial (14 gün) ver:
-- UPDATE public.organizations
-- SET subscription_status = 'trial', is_active = true,
--     subscription_expires_at = now() + interval '14 days'
-- WHERE name ILIKE '%acme%';
