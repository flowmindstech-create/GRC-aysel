-- ============================================================================
-- phase64 — Nəzarət effektivliyi: dizayn + tətbiq balları
--
-- Control Checklist-də effektivlik indiyədək tək ölçülü idi (pass/partial/fail).
-- RCSA metodologiyası isə nəzarəti İKİ ölçüdə qiymətləndirir:
--   Dizayn        → uyğunluq, güclülük, zamanlılıq
--   Tətbiq        → münasiblik, davamlılıq, izlənəbilənlik
-- Hər ölçü öz üç alt-meyarının ortalamasıdır; EFFEKTİVLİK isə həmin iki
-- ortalamanın ortalamasıdır (lib/rcsa.ts → evaluateControlEffectiveness).
-- Şkala 1-5: 1 = Güclü ... 5 = Zəif.
--
-- effectiveness_score Control Library-də "Last efficiency rate" sütununu qidalandırır.
-- ============================================================================

ALTER TABLE public.controls
  ADD COLUMN IF NOT EXISTS design_compliance         smallint,
  ADD COLUMN IF NOT EXISTS design_strength           smallint,
  ADD COLUMN IF NOT EXISTS design_timeliness         smallint,
  ADD COLUMN IF NOT EXISTS impl_relevance            smallint,
  ADD COLUMN IF NOT EXISTS impl_sustainability       smallint,
  ADD COLUMN IF NOT EXISTS impl_traceability         smallint,
  ADD COLUMN IF NOT EXISTS design_score              numeric(4,2),
  ADD COLUMN IF NOT EXISTS implementation_score      numeric(4,2),
  ADD COLUMN IF NOT EXISTS effectiveness_score       numeric(4,2),
  ADD COLUMN IF NOT EXISTS effectiveness_assessed_at timestamptz,
  ADD COLUMN IF NOT EXISTS effectiveness_assessed_by text;

-- Alt-meyarlar yalnız 1-5 aralığında ola bilər (NULL = hələ qiymətləndirilməyib)
DO $$
DECLARE c text;
BEGIN
  FOREACH c IN ARRAY ARRAY['design_compliance','design_strength','design_timeliness',
                           'impl_relevance','impl_sustainability','impl_traceability']
  LOOP
    EXECUTE format(
      'ALTER TABLE public.controls DROP CONSTRAINT IF EXISTS %I',
      'controls_' || c || '_range');
    EXECUTE format(
      'ALTER TABLE public.controls ADD CONSTRAINT %I CHECK (%I IS NULL OR (%I BETWEEN 1 AND 5))',
      'controls_' || c || '_range', c, c);
  END LOOP;
END $$;

-- ── Yoxlama ────────────────────────────────────────────────────────────────
SELECT column_name, data_type
  FROM information_schema.columns
 WHERE table_schema = 'public' AND table_name = 'controls'
   AND column_name LIKE '%score%' OR (table_name = 'controls' AND column_name LIKE 'design_%')
 ORDER BY column_name;
