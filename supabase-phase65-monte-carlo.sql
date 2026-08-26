-- ============================================================================
-- phase65 — Monte Carlo stoxastik modeli
--
-- Təqdim olunan sxem bu bazaya olduğu kimi uyğun gəlmirdi:
--   * `risk_assets` / `risk_register` mövcud `risks` və `financial_risks`
--     cədvəllərini təkrarlayırdı — reyestr ikiyə bölünürdü. Simulyasiya
--     birbaşa `financial_risks`-ə bağlanır, yeni reyestr yaradılmır.
--   * `org_id` və RLS yox idi. Bu bazada hər cədvəl org-əsaslıdır; onlarsız
--     cədvəl ya hamıya açıq olurdu, ya da heç kimə görünmürdü.
--   * `CREATE INDEX` `IF NOT EXISTS` olmadan yazılmışdı — skript ikinci dəfə
--     işlədiləndə xəta verirdi.
--   * `exposure_factor` üçün 0-1 aralığını qoruyan CHECK yox idi.
-- ============================================================================

-- 1) Monte Carlo girişləri mövcud maliyyə riskinin üzərinə
ALTER TABLE public.financial_risks
  ADD COLUMN IF NOT EXISTS asset_value     numeric(18,2),
  ADD COLUMN IF NOT EXISTS exposure_factor numeric(5,4),
  ADD COLUMN IF NOT EXISTS aro             numeric(8,3);

ALTER TABLE public.financial_risks DROP CONSTRAINT IF EXISTS financial_risks_ef_range;
ALTER TABLE public.financial_risks ADD CONSTRAINT financial_risks_ef_range
  CHECK (exposure_factor IS NULL OR (exposure_factor >= 0 AND exposure_factor <= 1));

ALTER TABLE public.financial_risks DROP CONSTRAINT IF EXISTS financial_risks_aro_nonneg;
ALTER TABLE public.financial_risks ADD CONSTRAINT financial_risks_aro_nonneg
  CHECK (aro IS NULL OR aro >= 0);

-- 2) Simulyasiya qeydləri
CREATE TABLE IF NOT EXISTS public.monte_carlo_runs (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  -- Boş ola bilər: sərbəst hesablama konkret riskə bağlanmır
  financial_risk_id     uuid REFERENCES public.financial_risks(id) ON DELETE SET NULL,
  label                 text NOT NULL,

  -- Girişlər (nəticəni yenidən yoxlamaq üçün olduğu kimi saxlanılır)
  asset_value           numeric(18,2) NOT NULL,
  exposure_factor       numeric(5,4)  NOT NULL,
  aro                   numeric(8,3)  NOT NULL,
  volatility            numeric(5,3)  NOT NULL DEFAULT 0.300,
  iterations            integer       NOT NULL DEFAULT 10000,
  -- Toxum olmadan nəticə təkrarlana bilmir, ona görə məcburidir
  seed                  bigint        NOT NULL,

  -- Nəticələr
  sle                   numeric(18,2) NOT NULL,
  ale                   numeric(18,2) NOT NULL,
  simulated_mean_ale    numeric(18,2) NOT NULL,
  median_loss           numeric(18,2) NOT NULL,
  var_95                numeric(18,2) NOT NULL,
  var_99                numeric(18,2) NOT NULL,
  tvar_95               numeric(18,2) NOT NULL,
  max_simulated_loss    numeric(18,2) NOT NULL,
  zero_loss_probability numeric(5,2)  NOT NULL,

  -- Histoqram səbətləri: qrafiki yenidən hesablamadan çəkmək üçün
  distribution_buckets  jsonb NOT NULL DEFAULT '[]'::jsonb,

  currency              text DEFAULT 'AZN',
  executed_by           text,
  executed_at           timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.monte_carlo_runs DROP CONSTRAINT IF EXISTS monte_carlo_runs_ef_range;
ALTER TABLE public.monte_carlo_runs ADD CONSTRAINT monte_carlo_runs_ef_range
  CHECK (exposure_factor >= 0 AND exposure_factor <= 1);

ALTER TABLE public.monte_carlo_runs DROP CONSTRAINT IF EXISTS monte_carlo_runs_iterations_range;
ALTER TABLE public.monte_carlo_runs ADD CONSTRAINT monte_carlo_runs_iterations_range
  CHECK (iterations BETWEEN 1 AND 200000);

CREATE INDEX IF NOT EXISTS idx_mc_runs_risk_id     ON public.monte_carlo_runs(financial_risk_id);
CREATE INDEX IF NOT EXISTS idx_mc_runs_executed_at ON public.monte_carlo_runs(executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_mc_runs_org         ON public.monte_carlo_runs(org_id);

-- 3) RLS — digər cədvəllərlə eyni model (phase58/60-dakı rekursiyasız üsul)
ALTER TABLE public.monte_carlo_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS monte_carlo_runs_select ON public.monte_carlo_runs;
CREATE POLICY monte_carlo_runs_select ON public.monte_carlo_runs
  FOR SELECT TO authenticated USING (org_id = public.current_org_id());

DROP POLICY IF EXISTS monte_carlo_runs_insert ON public.monte_carlo_runs;
CREATE POLICY monte_carlo_runs_insert ON public.monte_carlo_runs
  FOR INSERT TO authenticated WITH CHECK (org_id = public.current_org_id());

DROP POLICY IF EXISTS monte_carlo_runs_delete ON public.monte_carlo_runs;
CREATE POLICY monte_carlo_runs_delete ON public.monte_carlo_runs
  FOR DELETE TO authenticated USING (org_id = public.current_org_id());

-- Simulyasiya qeydi dəyişdirilmir: nəticəni sonradan redaktə etmək
-- audit izini mənasız edir. Səhv işəsalma silinir, düzəlişi yenidən işlədilir.

-- ── Yoxlama ────────────────────────────────────────────────────────────────
SELECT column_name, data_type
  FROM information_schema.columns
 WHERE table_schema = 'public' AND table_name = 'monte_carlo_runs'
 ORDER BY ordinal_position;
