-- ============================================================================
-- phase54 — RAS göstəriciləri: Risk Owner + Qeyd sütunları və datanın bərpası
--
-- SƏBƏB: RAS_updated_reviewed_redesigned 04.08.2026.xlsx faylının RIB vərəqində
--   • "Risk Sahibi"    sütunu sistemə heç köçürülməmişdi
--   • "Məlumat mənbəyi" əvəzinə hamıya 'Excel RAS (04.08.2026)' yazılmışdı
--   • "Qeyd"           sütunu köçürülməmişdi
--   • cari/əvvəlki dəyər Q1-in 2-ci ayından götürülmüşdü (Q1-in 3-cü ayı və
--     bütün Q2 nəzərə alınmamışdı) — yəni köhnə rəqəm "cari" kimi görünürdü
--
-- Supabase → SQL Editor-də işə sal.
-- ============================================================================

-- 1) Yeni sütunlar
ALTER TABLE kri_items ADD COLUMN IF NOT EXISTS risk_owner text;
ALTER TABLE kri_items ADD COLUMN IF NOT EXISTS note       text;


-- 2) Mövcud RAS sətirlərini sil ki, tətbiq onları Excel-ə uyğun YENİDƏN yükləsin.
--    (Bu sətirlər Excel-dən gələn seed datasıdır — istifadəçi əl ilə yaratmayıb.)
--    Silmədən əvvəl nə silindiyini görmək üçün əvvəlcə SELECT-i işə sal:

-- SELECT kri_id, name, current_value, previous_value, data_source
-- FROM kri_items WHERE kri_id LIKE 'RAS-%' ORDER BY kri_id;

DELETE FROM kri_items WHERE kri_id LIKE 'RAS-%';


-- 3) Bundan sonra: tətbiqdə Monitoring səhifəsini aç.
--    Cədvəl boş olduğu üçün 18 RAS göstəricisi düzəldilmiş data ilə avtomatik yüklənəcək:
--      • hər göstəricinin ÖZ məlumat mənbəyi (JIRA, 1C ERP, ITSM, Database, ...)
--      • Risk Sahibi (Aktuar, Maliyyə Şöbəsi, CIO, CISO, ...)
--      • ən son hesabat ayının dəyəri (Q2-yə qədər)
--      • RAS-007 və RAS-011 üzrə Excel-dəki qeydlər


-- ── Yoxlama ────────────────────────────────────────────────────────────────
-- SELECT kri_id, name, risk_owner, data_source, current_value, previous_value, trend
-- FROM kri_items WHERE kri_id LIKE 'RAS-%' ORDER BY kri_id;
