-- ============================================================
-- GRCell — Phase 49: risklərə "yaradan" sahəsi
-- Problem: employee risk yaradanda owner kimi şöbə rəhbəri yazılır,
-- yaradan heç yerdə qeyd olunmur → öz yaratdığını reyestrdə görmürdü.
-- Həll: created_by (profil id) + created_by_name; "mənimki" filtri
-- artıq owner VƏ YA yaradan üzrə işləyir (bütün istifadəçilər üçün).
-- ============================================================

ALTER TABLE public.risks
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_by_name text;

-- Sürətli axtarış üçün (employee öz risklərini çəkəndə)
CREATE INDEX IF NOT EXISTS idx_risks_created_by ON public.risks (created_by);

-- Yoxlama
SELECT column_name FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'risks'
  AND column_name IN ('created_by','created_by_name');
