-- ============================================================================
-- phase66 — GRC Intake iş axını sütunları + access_exceptions.entity_id
--
-- NƏ ÜÇÜN: `GRCIntakeItem` tipinə "Phase 1 additions — full compliance workflow
-- fields" şərhi ilə 23 sahə əlavə edilmişdi, LAKİN bazaya heç vaxt miqrasiya
-- olunmamışdı. Nəticədə `saveGRCIntakeItem()` 15 sütunluq hardcoded ağ siyahı
-- saxlayır və qalan hər şeyi upsert-dən ƏVVƏL sükutla silirdi:
--   istifadəçi RCSA qiymətləndirməsini (inherent → nəzarət effektivliyi →
--   residual → appetite qərarı → action plan → validasiya → komitə) doldurur,
--   "Saved" bildirişi görür, səhifəni yeniləyəndə hamısı itmiş olur.
-- Üstəlik addım marşrutu `appetite_decision` və `post_treatment_appetite`
-- əsasında hesablanır (WorkflowStepperClient → getRelevantSteps) — onlar
-- saxlanılmadığı üçün yüklənmədən sonra marşrut yanlış hesablanır və saxlanmış
-- `step` marşrutun içində olmaya bilər.
--
-- İKİNCİ PROBLEM: `access_exceptions` cədvəlində `entity_id` sütunu yoxdur,
-- amma `createAccessException()` onu HƏR DƏFƏ payload-a qoyur (UI null olanda
-- da açarı göndərir: entity_id = entityType === 'org_unit' ? unitId : null).
-- Yəni hər icazə verilişi 42703 ilə uğursuz olur, kod sükutla localStorage-a
-- düşür və UI "Access Granted" göstərir — icazə əslində bazada YOXDUR.
--
-- TİP SEÇİMLƏRİ (UI-nın real yazdığına uyğunlaşdırılıb, təsadüfi deyil):
--   * likelihood/impact → smallint 1-5 (RatingSlider input type="range" min=1 max=5)
--   * implementation_due → `date` DEYİL, TEXT: stepper onu adi mətn input-u ilə
--     yazır (placeholder 'YYYY-MM-DD'), yarımçıq yazılış `date` sütununu
--     22007 xətası ilə sındırardı.
--   * assigned_to / validated_by / committee_decision → text: UI etiketləri
--     "User ID or name", "Validator name or ID" — sərbəst mətndir.
--   * control_effectiveness CHECK-i NULL-a icazə verir, çünki select-də boş
--     variant var; boş sətir db.ts-də NULL-a çevrilir (eyni dəyişiklikdə).
-- ============================================================================

-- 1) GRC Intake — risk qiymətləndirmə sütunları
ALTER TABLE public.grc_intake_items
  ADD COLUMN IF NOT EXISTS inherent_likelihood         smallint,
  ADD COLUMN IF NOT EXISTS inherent_impact             smallint,
  ADD COLUMN IF NOT EXISTS inherent_risk_level         text,
  ADD COLUMN IF NOT EXISTS control_effectiveness       text,
  ADD COLUMN IF NOT EXISTS residual_likelihood         smallint,
  ADD COLUMN IF NOT EXISTS residual_impact             smallint,
  ADD COLUMN IF NOT EXISTS residual_risk_level         text;

-- 2) GRC Intake — nəzarət/təsdiq zənciri
ALTER TABLE public.grc_intake_items
  ADD COLUMN IF NOT EXISTS risk_owner_id               uuid,
  ADD COLUMN IF NOT EXISTS risk_owner_reviewed_at      timestamptz,
  ADD COLUMN IF NOT EXISTS mgt_reviewer_id             uuid,
  ADD COLUMN IF NOT EXISTS mgt_reviewed_at             timestamptz;

-- 3) GRC Intake — appetite qərarı və treatment axını
ALTER TABLE public.grc_intake_items
  ADD COLUMN IF NOT EXISTS appetite_decision           text,
  ADD COLUMN IF NOT EXISTS action_plan                 text,
  ADD COLUMN IF NOT EXISTS assigned_to                 text,
  ADD COLUMN IF NOT EXISTS implementation_due          text,
  ADD COLUMN IF NOT EXISTS implementation_evidence_url text,
  ADD COLUMN IF NOT EXISTS validation_note             text,
  ADD COLUMN IF NOT EXISTS validated_at                timestamptz,
  ADD COLUMN IF NOT EXISTS validated_by                text,
  ADD COLUMN IF NOT EXISTS post_treatment_appetite     text,
  ADD COLUMN IF NOT EXISTS escalated_at                timestamptz,
  ADD COLUMN IF NOT EXISTS committee_decision          text,
  ADD COLUMN IF NOT EXISTS closed_at                   timestamptz;

-- 4) CHECK-lər — hamısı NULL-a icazə verir (NULL = hələ qiymətləndirilməyib)
ALTER TABLE public.grc_intake_items DROP CONSTRAINT IF EXISTS gii_inherent_likelihood_range;
ALTER TABLE public.grc_intake_items ADD CONSTRAINT gii_inherent_likelihood_range
  CHECK (inherent_likelihood IS NULL OR inherent_likelihood BETWEEN 1 AND 5);

ALTER TABLE public.grc_intake_items DROP CONSTRAINT IF EXISTS gii_inherent_impact_range;
ALTER TABLE public.grc_intake_items ADD CONSTRAINT gii_inherent_impact_range
  CHECK (inherent_impact IS NULL OR inherent_impact BETWEEN 1 AND 5);

ALTER TABLE public.grc_intake_items DROP CONSTRAINT IF EXISTS gii_residual_likelihood_range;
ALTER TABLE public.grc_intake_items ADD CONSTRAINT gii_residual_likelihood_range
  CHECK (residual_likelihood IS NULL OR residual_likelihood BETWEEN 1 AND 5);

ALTER TABLE public.grc_intake_items DROP CONSTRAINT IF EXISTS gii_residual_impact_range;
ALTER TABLE public.grc_intake_items ADD CONSTRAINT gii_residual_impact_range
  CHECK (residual_impact IS NULL OR residual_impact BETWEEN 1 AND 5);

ALTER TABLE public.grc_intake_items DROP CONSTRAINT IF EXISTS gii_inherent_risk_level_check;
ALTER TABLE public.grc_intake_items ADD CONSTRAINT gii_inherent_risk_level_check
  CHECK (inherent_risk_level IS NULL
         OR inherent_risk_level IN ('minimal','low','medium','high','critical'));

ALTER TABLE public.grc_intake_items DROP CONSTRAINT IF EXISTS gii_residual_risk_level_check;
ALTER TABLE public.grc_intake_items ADD CONSTRAINT gii_residual_risk_level_check
  CHECK (residual_risk_level IS NULL
         OR residual_risk_level IN ('minimal','low','medium','high','critical'));

ALTER TABLE public.grc_intake_items DROP CONSTRAINT IF EXISTS gii_control_effectiveness_check;
ALTER TABLE public.grc_intake_items ADD CONSTRAINT gii_control_effectiveness_check
  CHECK (control_effectiveness IS NULL
         OR control_effectiveness IN ('effective','partially_effective','ineffective','na'));

ALTER TABLE public.grc_intake_items DROP CONSTRAINT IF EXISTS gii_appetite_decision_check;
ALTER TABLE public.grc_intake_items ADD CONSTRAINT gii_appetite_decision_check
  CHECK (appetite_decision IS NULL OR appetite_decision IN ('accept','treat'));

ALTER TABLE public.grc_intake_items DROP CONSTRAINT IF EXISTS gii_post_treatment_appetite_check;
ALTER TABLE public.grc_intake_items ADD CONSTRAINT gii_post_treatment_appetite_check
  CHECK (post_treatment_appetite IS NULL OR post_treatment_appetite IN ('within','outside'));

-- 5) FK-lər — profil silinəndə qiymətləndirmə itməsin, yalnız istinad boşalsın
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'gii_risk_owner_id_fkey') THEN
    ALTER TABLE public.grc_intake_items
      ADD CONSTRAINT gii_risk_owner_id_fkey FOREIGN KEY (risk_owner_id)
      REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'gii_mgt_reviewer_id_fkey') THEN
    ALTER TABLE public.grc_intake_items
      ADD CONSTRAINT gii_mgt_reviewer_id_fkey FOREIGN KEY (mgt_reviewer_id)
      REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 6) Reyestr sıralaması/filtri üçün indekslər
CREATE INDEX IF NOT EXISTS idx_gii_appetite_decision
  ON public.grc_intake_items (org_id, appetite_decision);
CREATE INDEX IF NOT EXISTS idx_gii_assigned_to
  ON public.grc_intake_items (org_id, assigned_to);

-- 7) access_exceptions.entity_id — polimorf istinaddır (risk/incident/audit/
--    org_unit), ona görə FK QOYULMUR; NULL = həmin növün hamısı
ALTER TABLE public.access_exceptions
  ADD COLUMN IF NOT EXISTS entity_id uuid;

CREATE INDEX IF NOT EXISTS idx_access_exceptions_entity
  ON public.access_exceptions (org_id, entity_type, entity_id);

-- ── Yoxlama ────────────────────────────────────────────────────────────────
-- 24 sətir qaytarmalıdır (23 intake sütunu + access_exceptions.entity_id)
SELECT table_name, column_name, data_type, is_nullable
  FROM information_schema.columns
 WHERE table_schema = 'public'
   AND ( (table_name = 'grc_intake_items' AND column_name IN (
            'inherent_likelihood','inherent_impact','inherent_risk_level',
            'control_effectiveness','residual_likelihood','residual_impact',
            'residual_risk_level','risk_owner_id','risk_owner_reviewed_at',
            'mgt_reviewer_id','mgt_reviewed_at','appetite_decision','action_plan',
            'assigned_to','implementation_due','implementation_evidence_url',
            'validation_note','validated_at','validated_by',
            'post_treatment_appetite','escalated_at','committee_decision','closed_at'))
      OR (table_name = 'access_exceptions' AND column_name = 'entity_id') )
 ORDER BY table_name, column_name;
