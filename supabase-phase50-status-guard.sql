-- ============================================================
-- GRCell — Phase 50: risk STATUS axını yalnız risk komandasında
-- Problem: employee öz riskinə "Done" verə bilirdi.
-- Qayda: status dəyişikliyi yalnız risk_manager / admin / super_admin;
--        adi əməkdaşın yaratdığı risk məcburi 'open' statusla başlayır.
-- guard_risk_approval funksiyası genişlənir (trigger yerindədir).
-- ============================================================

CREATE OR REPLACE FUNCTION public.guard_risk_approval()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE r text := COALESCE(public.auth_role(), '');
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF r <> 'super_admin' THEN
      NEW.approval_status := 'pending';
    END IF;
    -- Adi əməkdaş/auditor riski yalnız 'open' statusla yarada bilər
    IF r NOT IN ('super_admin','admin','risk_manager') THEN
      NEW.status := 'open';
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.approval_status = 'approved'
       AND OLD.approval_status = 'pending'
       AND r <> 'super_admin' THEN
      RAISE EXCEPTION 'Təsdiqi yalnız super_admin verə bilər';
    END IF;
    -- Status dəyişikliyi yalnız risk komandasına aiddir
    IF NEW.status IS DISTINCT FROM OLD.status
       AND r NOT IN ('super_admin','admin','risk_manager') THEN
      RAISE EXCEPTION 'Risk statusunu yalnız risk komandası dəyişə bilər';
    END IF;
  END IF;
  RETURN NEW;
END; $$;

-- Yoxlama: funksiya yeniləndi, trigger onsuz da bağlıdır
SELECT tgname, tgrelid::regclass FROM pg_trigger WHERE tgname = 'trg_guard_risk_approval';
