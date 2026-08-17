-- ============================================================================
-- phase55 — kri_items sxem düzəlişi (RAS göstəriciləri yazıla bilmirdi)
--
-- PROBLEM: RAS seed-i Supabase-ə heç vaxt yazılmırdı, çünki:
--   1) kri_items-də "unit" sütunu YOXDUR — tətbiq onu göndərir, insert sınır
--   2) risk_category CHECK-i 'reputation' və 'information_security' qəbul etmir
--      (cədvəldə köhnə siyahı var: cybersecurity/legal/hr)
--   3) frequency CHECK-i 'annual' qəbul etmir (yalnız daily/weekly/monthly/quarterly)
--
-- Xəta udulduğu üçün ekranda heç nə görünmürdü.
-- Supabase → SQL Editor-də işə sal.
-- ============================================================================

-- 1) Çatışmayan sütun
ALTER TABLE kri_items ADD COLUMN IF NOT EXISTS unit text;

-- 2) risk_category CHECK-ini tətbiqin kateqoriyalarına uyğunlaşdır
DO $$
DECLARE c record;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'kri_items'::regclass AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%risk_category%'
  LOOP
    EXECUTE format('ALTER TABLE kri_items DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;

ALTER TABLE kri_items ADD CONSTRAINT kri_items_risk_category_check
  CHECK (risk_category IS NULL OR risk_category IN (
    -- tətbiqdə istifadə olunan kateqoriyalar
    'financial','operational','reputation','information_security','strategic','compliance',
    -- köhnə sətirlər pozulmasın deyə saxlanılır
    'cybersecurity','legal','hr'
  ));

-- 3) frequency CHECK-inə 'annual' əlavə et
DO $$
DECLARE c record;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'kri_items'::regclass AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%frequency%'
  LOOP
    EXECUTE format('ALTER TABLE kri_items DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;

ALTER TABLE kri_items ADD CONSTRAINT kri_items_frequency_check
  CHECK (frequency IN ('daily','weekly','monthly','quarterly','annual'));

-- 4) Yarımçıq qalmış RAS sətirlərini təmizlə ki, tətbiq hamısını yenidən yükləsin
DELETE FROM kri_items WHERE kri_id LIKE 'RAS-%';


-- ── Bundan sonra: tətbiqdə Monitoring səhifəsini aç (RAS tabı) ──────────────
-- 18 göstərici avtomatik yüklənəcək. Yoxlama:
--
-- SELECT kri_id, name, risk_owner, data_source, unit, frequency,
--        current_value, previous_value, trend
-- FROM kri_items WHERE kri_id LIKE 'RAS-%' ORDER BY kri_id;
--
-- 18 sətir gəlməlidir; RAS-012 üzrə current_value = 494.94
