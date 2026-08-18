-- ============================================================================
-- phase63 — RAS(RİB) sənədinə uyğunlaşdırma
--   Mənbə: CİB-RMU-FM(RIB)-01-2026, versiya 01, 31/07/2026 (RIB vərəqi)
--
-- 1) kri_items-ə `period_values` (jsonb) əlavə olunur — sənəddəki Q1/Q2 blokları
--    hər rüb üçün ÜÇ aylıq oxunuş saxlayır. Açar əsaslı olduğu üçün Q3/Q4
--    gələndə sxem dəyişmir. null = ay bildirilməyib (bildirilmiş 0-dan fərqlidir).
--
-- 2) Sənəddə "Bazar Riski" ayrıca risk sahəsidir (Ehtiyat Adekvatlığı + Qarantiya
--    Fondunun 4 göstəricisi) — əvvəl bunlar "Maliyyə" altında idi. Kodda
--    lib/risk-categories.ts-ə 'market' əlavə edildi; burada isə həmin dəyəri
--    rədd edən CHECK məhdudiyyətləri yenilənir.
-- ============================================================================

-- 1) Rüblük oxunuşlar üçün sütun
ALTER TABLE public.kri_items
  ADD COLUMN IF NOT EXISTS period_values jsonb NOT NULL DEFAULT '{}'::jsonb;

-- 2) Kateqoriya CHECK-lərini cari taksonomiyaya gətir.
--    Constraint adları fayldan-fayla fərqləndiyi üçün ad-ad silmirik.
DO $$
DECLARE
  t record;
  c text;
  allowed text := '''financial'',''operational'',''reputation'',''information_security'',''strategic'',''compliance'',''market''';
BEGIN
  FOR t IN
    SELECT * FROM (VALUES
      ('kri_items',                'risk_category', false),
      ('risks',                    'category',      false),
      ('incidents',                'risk_category', false),
      ('risk_appetite_statements', 'risk_category', true)   -- 'overall' da qəbul edir
    ) AS v(tbl, col, with_overall)
  LOOP
    -- Cədvəl və sütun həqiqətən varmı?
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = t.tbl AND column_name = t.col
    ) THEN CONTINUE; END IF;

    -- Həmin sütuna aid mövcud CHECK-i tap və sil
    FOR c IN
      SELECT conname FROM pg_constraint
       WHERE conrelid = format('public.%I', t.tbl)::regclass
         AND contype = 'c'
         AND pg_get_constraintdef(oid) ILIKE '%' || t.col || '%'
    LOOP
      EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I', t.tbl, c);
    END LOOP;

    -- Köhnə taksonomiyadan qalan dəyərləri çevir (lib/risk-categories.ts
    -- LEGACY_CATEGORY_MAP ilə eyni). Bu olmadan yeni CHECK 23514 verir:
    -- məsələn kri_items-də köhnə demo sətirləri hələ 'cybersecurity' saxlayır.
    EXECUTE format(
      'UPDATE public.%I SET %I = CASE %I
          WHEN ''cybersecurity''    THEN ''information_security''
          WHEN ''legal''            THEN ''compliance''
          WHEN ''legal_compliance'' THEN ''compliance''
          WHEN ''hr''               THEN ''operational''
          ELSE %I END
        WHERE %I IN (''cybersecurity'',''legal'',''legal_compliance'',''hr'')',
      t.tbl, t.col, t.col, t.col, t.col);

    EXECUTE format(
      'ALTER TABLE public.%I ADD CONSTRAINT %I CHECK (%I IN (%s))',
      t.tbl, t.tbl || '_' || t.col || '_check', t.col,
      CASE WHEN t.with_overall THEN allowed || ',''overall''' ELSE allowed END
    );
  END LOOP;
END $$;

-- ── Yoxlama ────────────────────────────────────────────────────────────────
SELECT conrelid::regclass AS cedvel, conname, pg_get_constraintdef(oid) AS terif
  FROM pg_constraint
 WHERE contype = 'c'
   AND conrelid::regclass::text IN ('risks','kri_items','incidents','risk_appetite_statements')
   AND pg_get_constraintdef(oid) ILIKE '%market%'
 ORDER BY 1;
