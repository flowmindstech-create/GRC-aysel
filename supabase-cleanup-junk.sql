-- ============================================================================
-- GRCell — TEST/ZİBİL QEYDLƏRİN TƏMİZLƏNMƏSİ
-- Supabase → SQL Editor-də işə sal.
--
-- ⚠️ QAYDA: ƏVVƏLCƏ ADDIM 1-i işə sal və siyahıya BAX.
--    Yalnız siyahıda silinməli olanları görəndən sonra ADDIM 2-ni işə sal.
--    Silinən qeyd geri qayıtmır.
-- ============================================================================


-- ─────────────────────────────────────────────────────────────────────────────
-- ADDIM 1 — ÖNBAXIŞ: nə silinəcək? (heç nə silinmir, sadəcə göstərir)
-- ─────────────────────────────────────────────────────────────────────────────

-- 1a. Zibil RİSKLƏR (test adları, çox qısa başlıq, boş təsvir)
SELECT id, risk_code, title, description, owner_name, created_by_name, created_at
FROM risks
WHERE
     title ~* '^(test|tst|deneme|dene|debug|sample|nümunə|numune|yeni risk|new risk|risk|asdf?|qwe|zxc|xxx|yyy|sdf|dsa|aaa+|bbb+|123)'
  OR title ~* '(test|debug)'
  OR length(trim(title)) < 5
  OR description IS NULL
  OR length(trim(coalesce(description,''))) < 10
ORDER BY created_at DESC;

-- 1b. Zibil İNSİDENTLƏR
SELECT id, title, description, severity, status, created_at
FROM incidents
WHERE
     title ~* '^(test|tst|deneme|dene|debug|sample|yeni|new|asdf?|qwe|zxc|xxx|aaa+|123)'
  OR title ~* '(test|debug)'
  OR length(trim(title)) < 5
  OR length(trim(coalesce(description,''))) < 10
ORDER BY created_at DESC;

-- 1c. Zibil KONTROLLAR
SELECT id, control_id, title, description, created_at
FROM controls
WHERE title ~* '^(test|deneme|debug|sample|yeni|new|asdf?|qwe|aaa+|123)'
   OR title ~* '(test|debug)'
   OR length(trim(title)) < 5
ORDER BY created_at DESC;

-- 1d. Zibil AUDİTLƏR + TAPINTILAR
SELECT id, title, scope, status, created_at FROM audits
WHERE title ~* '^(test|deneme|debug|sample|yeni|new|asdf?|qwe|aaa+|123)' OR length(trim(title)) < 5;

SELECT id, audit_id, title, severity, status, created_at FROM audit_findings
WHERE title ~* '^(test|deneme|debug|sample|yeni|new|asdf?|qwe|aaa+|123)' OR length(trim(title)) < 5;

-- 1e. Zibil VENDORLAR
SELECT id, name, category, contact_email, created_at FROM vendors
WHERE name ~* '^(test|deneme|debug|sample|yeni|new|asdf?|qwe|aaa+|123)' OR length(trim(name)) < 3;

-- 1f. DEBUG/TEST İSTİFADƏÇİLƏRİ (profil)
SELECT id, full_name, email, role, is_active, created_at FROM profiles
WHERE email ~* '(debug|test|temp|noreply\+)' OR full_name ~* '(debug|test bot|test user)'
ORDER BY created_at DESC;


-- ─────────────────────────────────────────────────────────────────────────────
-- ADDIM 2 — SİLMƏ
-- Yuxarıdakı siyahıları YOXLADIQDAN sonra bu bloku işə sal.
-- Transaction-dadır: nəticə gözlədiyin kimi deyilsə COMMIT etmə, ROLLBACK yaz.
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- Riskə bağlı əlaqələr əvvəl (foreign key qorunması üçün)
DELETE FROM risk_control_mappings
WHERE risk_id IN (
  SELECT id FROM risks
  WHERE title ~* '^(test|tst|deneme|dene|debug|sample|nümunə|numune|yeni risk|new risk|risk|asdf?|qwe|zxc|xxx|yyy|sdf|dsa|aaa+|bbb+|123)'
     OR title ~* '(test|debug)'
     OR length(trim(title)) < 5
     OR length(trim(coalesce(description,''))) < 10
);

DELETE FROM risks
WHERE title ~* '^(test|tst|deneme|dene|debug|sample|nümunə|numune|yeni risk|new risk|risk|asdf?|qwe|zxc|xxx|yyy|sdf|dsa|aaa+|bbb+|123)'
   OR title ~* '(test|debug)'
   OR length(trim(title)) < 5
   OR length(trim(coalesce(description,''))) < 10;

DELETE FROM incidents
WHERE title ~* '^(test|tst|deneme|dene|debug|sample|yeni|new|asdf?|qwe|zxc|xxx|aaa+|123)'
   OR title ~* '(test|debug)'
   OR length(trim(title)) < 5
   OR length(trim(coalesce(description,''))) < 10;

DELETE FROM controls
WHERE title ~* '^(test|deneme|debug|sample|yeni|new|asdf?|qwe|aaa+|123)'
   OR title ~* '(test|debug)'
   OR length(trim(title)) < 5;

DELETE FROM audit_findings
WHERE title ~* '^(test|deneme|debug|sample|yeni|new|asdf?|qwe|aaa+|123)' OR length(trim(title)) < 5;

DELETE FROM audits
WHERE title ~* '^(test|deneme|debug|sample|yeni|new|asdf?|qwe|aaa+|123)' OR length(trim(title)) < 5;

DELETE FROM vendors
WHERE name ~* '^(test|deneme|debug|sample|yeni|new|asdf?|qwe|aaa+|123)' OR length(trim(name)) < 3;

-- Silinmiş obyektlərin log qeydləri (istəyə bağlı — audit izini saxlamaq istəsən bu sətri komment et)
DELETE FROM activities
WHERE entity_title ~* '^(test|deneme|debug|sample|asdf?|qwe|aaa+|123)'
   OR entity_title ~* '(test|debug)';

-- Nəticəyə bax, sonra:
COMMIT;
-- səhv görsən bunun yerinə:  ROLLBACK;


-- ─────────────────────────────────────────────────────────────────────────────
-- ADDIM 3 (istəyə bağlı) — DEBUG İSTİFADƏÇİSİNİN SİLİNMƏSİ
-- Profil silinməzdən əvvəl onun yaratdıqlarının başqasına keçdiyinə əmin ol
-- (Settings → İstifadəçilər → "Transfer role" ilə).
-- ─────────────────────────────────────────────────────────────────────────────

-- Əvvəl deaktiv et (təhlükəsiz variant):
-- UPDATE profiles SET is_active = false WHERE email = 'grcell.debug.7f3@gmail.com';

-- Tam silmə (auth.users-dən də silinməlidir — Supabase → Authentication → Users):
-- DELETE FROM profiles WHERE email = 'grcell.debug.7f3@gmail.com';


-- ─────────────────────────────────────────────────────────────────────────────
-- YOXLAMA — təmizlikdən sonra qalan sayı
-- ─────────────────────────────────────────────────────────────────────────────
SELECT 'risks' AS cedvel, count(*) FROM risks
UNION ALL SELECT 'incidents', count(*) FROM incidents
UNION ALL SELECT 'controls', count(*) FROM controls
UNION ALL SELECT 'audits', count(*) FROM audits
UNION ALL SELECT 'audit_findings', count(*) FROM audit_findings
UNION ALL SELECT 'vendors', count(*) FROM vendors
UNION ALL SELECT 'activities', count(*) FROM activities;
