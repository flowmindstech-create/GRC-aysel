-- Phase 46: incidents.assigned_name — təyin olunan şəxsin adı (denormalized)
-- Intake auto-assignment (Risk Manager) adı da saxlayır ki, cədvəldəki
-- "Təhkim olunub" sütunu reload-dan sonra boş qalmasın.
-- Konvensiya: resolution_assignee_name ilə eyni pattern.

ALTER TABLE incidents ADD COLUMN IF NOT EXISTS assigned_name text;

-- Mövcud insidentlər üçün backfill: assigned_to UUID-dən profil adı
UPDATE incidents i
SET assigned_name = p.full_name
FROM profiles p
WHERE i.assigned_to = p.id
  AND i.assigned_name IS NULL;