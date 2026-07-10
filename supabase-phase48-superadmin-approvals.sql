-- ============================================================
-- GRCell — Phase 48: BÜTÜN təsdiqlər YALNIZ super_admin
-- GRC qaydası (2026-07-10): yaradılan hər şey super_admin-ə təsdiqə düşür;
-- admin daxil heç kim özü təsdiq verə bilməz.
--   1) Risk trigger-i sərtləşir: yalnız super_admin approve edir;
--      super_admin-dən başqa HƏR KƏSİN yaratdığı risk məcburi 'pending'
--   2) Kontrollara eyni qoruma: yeni kontrol pending_review düşür,
--      pending_review→approved keçidini yalnız super_admin edir
-- ============================================================

-- ── 1) Risk təsdiqi — yalnız super_admin ────────────────────────────────────
CREATE OR REPLACE FUNCTION public.guard_risk_approval()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE r text := COALESCE(public.auth_role(), '');
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF r <> 'super_admin' THEN
      NEW.approval_status := 'pending';
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.approval_status = 'approved'
       AND OLD.approval_status = 'pending'
       AND r <> 'super_admin' THEN
      RAISE EXCEPTION 'Təsdiqi yalnız super_admin verə bilər';
    END IF;
  END IF;
  RETURN NEW;
END; $$;
-- trigger artıq mövcuddur (phase47) — funksiya yeniləndi, yenidən yaratmaq lazım deyil

-- ── 2) Kontrol təsdiqi — eyni qayda ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.guard_control_approval()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE r text := COALESCE(public.auth_role(), '');
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF r <> 'super_admin' AND COALESCE(NEW.approval_status, '') = 'approved' THEN
      NEW.approval_status := 'pending_review';
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.approval_status = 'approved'
       AND COALESCE(OLD.approval_status, '') = 'pending_review'
       AND r <> 'super_admin' THEN
      RAISE EXCEPTION 'Kontrol təsdiqini yalnız super_admin verə bilər';
    END IF;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_guard_control_approval ON public.controls;
CREATE TRIGGER trg_guard_control_approval
  BEFORE INSERT OR UPDATE ON public.controls
  FOR EACH ROW EXECUTE FUNCTION public.guard_control_approval();

-- ── Yoxlama ──────────────────────────────────────────────────────────────────
SELECT tgname, tgrelid::regclass AS cedvel
FROM pg_trigger
WHERE tgname IN ('trg_guard_risk_approval','trg_guard_control_approval');
