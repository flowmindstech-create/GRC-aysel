-- Phase 44 — Control Library backfill
-- Köhnə seed kontrollarda control_type / execution_frequency boş qalıb ("—" görünür).
-- Bu default-ları doldurur; istifadəçi sonra hər kontrolu formada dəqiqləşdirir.
-- Idempotent: yalnız NULL / boş sahələrə toxunur, mövcud dəyərləri saxlayır.

UPDATE public.controls
SET control_type = 'preventive'
WHERE control_type IS NULL OR control_type = '';

UPDATE public.controls
SET execution_frequency = 'monthly'
WHERE execution_frequency IS NULL OR execution_frequency = '';

-- Effektivlik reytinqi heç vaxt test edilməyibsə boş qalsın (Checklist Pass/Fail dolduracaq).
-- Status boşdursa 'not_tested' kimi qəbul olunur — schema-da default varsa toxunmuruq.

-- Yoxlama:
SELECT
  count(*) FILTER (WHERE control_type IS NULL OR control_type = '')        AS bos_tip,
  count(*) FILTER (WHERE execution_frequency IS NULL OR execution_frequency = '') AS bos_tezlik,
  count(*)                                                                  AS umumi
FROM public.controls;
