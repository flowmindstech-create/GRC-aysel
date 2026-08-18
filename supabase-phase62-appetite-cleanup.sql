-- ============================================================================
-- phase62 — risk_appetite_statements: təkrarların silinməsi + kateqoriya miqrasiyası
--
-- 1) Seed 3 dəfə işlədilib: 5 bəyanat × 3 = 15 sətir. Təkrarlar silinir.
-- 2) Cədvəlin risk_category CHECK-i hələ köhnə taksonomiyanı saxlayır
--    ('cybersecurity','legal','hr'). App-ın tək mənbəyi lib/risk-categories.ts-dir
--    ('information_security','compliance','operational'...). Uyğunsuzluq
--    səbəbindən UI-dan redaktə edilən bəyanat CHECK-i pozub yazılmırdı.
-- ============================================================================

-- 1) Təkrarları sil (ən köhnəsi qalır)
DELETE FROM public.risk_appetite_statements
 WHERE id IN (
   SELECT id FROM (
     SELECT id, row_number() OVER (PARTITION BY org_id, title, risk_category
                                   ORDER BY created_at) AS rn
       FROM public.risk_appetite_statements
   ) t WHERE t.rn > 1
 );

-- 2) Köhnə CHECK-i tap və sil (adı fayldan-fayla fərqlənə bilər)
DO $$
DECLARE c text;
BEGIN
  SELECT conname INTO c FROM pg_constraint
   WHERE conrelid = 'public.risk_appetite_statements'::regclass
     AND contype = 'c'
     AND pg_get_constraintdef(oid) ILIKE '%risk_category%';
  IF c IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.risk_appetite_statements DROP CONSTRAINT %I', c);
  END IF;
END $$;

-- 3) Dəyərləri cari taksonomiyaya gətir (lib/risk-categories.ts LEGACY_CATEGORY_MAP ilə eyni)
UPDATE public.risk_appetite_statements
   SET risk_category = CASE risk_category
     WHEN 'cybersecurity'    THEN 'information_security'
     WHEN 'legal'            THEN 'compliance'
     WHEN 'legal_compliance' THEN 'compliance'
     WHEN 'hr'               THEN 'operational'
     ELSE risk_category END;

-- 4) Yeni CHECK
ALTER TABLE public.risk_appetite_statements
  ADD CONSTRAINT risk_appetite_statements_risk_category_check
  CHECK (risk_category IN ('financial','operational','reputation',
                           'information_security','strategic','compliance','overall'));

-- ── Nəticə ─────────────────────────────────────────────────────────────────
SELECT risk_category, appetite_level, tolerance_level, status, title
  FROM public.risk_appetite_statements ORDER BY risk_category;
