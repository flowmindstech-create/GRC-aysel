-- ============================================================================
-- GRCell — TEST/ZİBİL QEYDLƏRİN TƏMİZLƏNMƏSİ
--
-- ⚠️ DİQQƏT: GRC sistemində "test" sözü QANUNİ risklərdə də olur —
--    "Stress test", "Penetration test", "Control testing", "Test of design"...
--    Ona görə burada AVTOMATIK kütləvi silmə YOXDUR.
--    Qayda: ADDIM 1 siyahını göstərir → sən silinməli olanların id-lərini
--    seçirsən → ADDIM 2-də yalnız onlar silinir.
-- ============================================================================


-- ─────────────────────────────────────────────────────────────────────────────
-- ADDIM 1 — ÖNBAXIŞ (heç nə silinmir, sadəcə namizədləri göstərir)
-- Hər sətirdə "sebeb" sütunu niyə şübhəli sayıldığını yazır.
-- ─────────────────────────────────────────────────────────────────────────────

SELECT id, risk_code, title, left(coalesce(description,''), 60) AS tesvir,
       owner_name, created_at,
       CASE
         WHEN title ~* '^(test|tst|deneme|dene|debug|sample|yeni risk|new risk|asdf?|qwe|zxc|xxx|yyy|sdf|dsa|aaa+|bbb+|123)' THEN 'test adı'
         WHEN length(trim(title)) < 5 THEN 'çox qısa ad'
         WHEN length(trim(coalesce(description,''))) < 10 THEN 'boş/qısa təsvir'
         ELSE 'digər'
       END AS sebeb
FROM risks
WHERE title ~* '^(test|tst|deneme|dene|debug|sample|yeni risk|new risk|asdf?|qwe|zxc|xxx|yyy|sdf|dsa|aaa+|bbb+|123)'
   OR length(trim(title)) < 5
   OR length(trim(coalesce(description,''))) < 10
ORDER BY created_at DESC;

-- İnsidentlər
SELECT id, title, left(coalesce(description,''), 60) AS tesvir, severity, status, created_at
FROM incidents
WHERE title ~* '^(test|tst|deneme|dene|debug|sample|yeni|new|asdf?|qwe|zxc|xxx|aaa+|123)'
   OR length(trim(title)) < 5
   OR length(trim(coalesce(description,''))) < 10
ORDER BY created_at DESC;

-- Kontrollar
SELECT id, control_id, title, created_at FROM controls
WHERE title ~* '^(test|deneme|debug|sample|yeni|new|asdf?|qwe|aaa+|123)' OR length(trim(title)) < 5
ORDER BY created_at DESC;

-- Auditlər və tapıntılar
SELECT id, title, status, created_at FROM audits
WHERE title ~* '^(test|deneme|debug|sample|yeni|new|asdf?|qwe|aaa+|123)' OR length(trim(title)) < 5;

SELECT id, audit_id, title, severity, created_at FROM audit_findings
WHERE title ~* '^(test|deneme|debug|sample|yeni|new|asdf?|qwe|aaa+|123)' OR length(trim(title)) < 5;

-- Vendorlar
SELECT id, name, category, created_at FROM vendors
WHERE name ~* '^(test|deneme|debug|sample|yeni|new|asdf?|qwe|aaa+|123)' OR length(trim(name)) < 3;

-- Debug/test istifadəçiləri
SELECT id, full_name, email, role, is_active FROM profiles
WHERE email ~* '(debug|test|temp)' OR full_name ~* '(debug|test bot|test user)';


-- ─────────────────────────────────────────────────────────────────────────────
-- ADDIM 2 — SİLMƏ (yalnız sənin seçdiyin id-lər)
--
-- Yuxarıdakı siyahılardan silinməli sətirlərin id-lərini kopyala və
-- aşağıdakı mötərizələrə yaz. Lazım olmayan bloku olduğu kimi burax —
-- boş siyahı heç nə silmir.
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- Risklər (əvvəl bağlı map-lər, sonra riskin özü)
DELETE FROM risk_control_mappings WHERE risk_id IN (
  -- 'buraya-risk-id', 'daha-bir-id'
  NULL
);
DELETE FROM risks WHERE id IN (
  -- 'buraya-risk-id', 'daha-bir-id'
  NULL
);

DELETE FROM incidents WHERE id IN (
  NULL
);

DELETE FROM controls WHERE id IN (
  NULL
);

DELETE FROM audit_findings WHERE id IN (
  NULL
);

DELETE FROM audits WHERE id IN (
  NULL
);

DELETE FROM vendors WHERE id IN (
  NULL
);

-- Nəticəyə bax. Düzgündürsə:
COMMIT;
-- Səhv görsən bunun yerinə:  ROLLBACK;


-- ─────────────────────────────────────────────────────────────────────────────
-- ADDIM 3 (istəyə bağlı) — debug istifadəçisi
-- Silməzdən əvvəl onun məsuliyyətlərini başqasına köçür:
-- Settings → İstifadəçilər → "Transfer role"
-- ─────────────────────────────────────────────────────────────────────────────

-- Təhlükəsiz variant — sadəcə deaktiv et:
-- UPDATE profiles SET is_active = false WHERE email = 'grcell.debug.7f3@gmail.com';

-- Tam silmə (auth.users-dən də sil: Supabase → Authentication → Users):
-- DELETE FROM profiles WHERE email = 'grcell.debug.7f3@gmail.com';


-- ── Yoxlama: qalan sayı ─────────────────────────────────────────────────────
SELECT 'risks' AS cedvel, count(*) FROM risks
UNION ALL SELECT 'incidents', count(*) FROM incidents
UNION ALL SELECT 'controls', count(*) FROM controls
UNION ALL SELECT 'audits', count(*) FROM audits
UNION ALL SELECT 'audit_findings', count(*) FROM audit_findings
UNION ALL SELECT 'vendors', count(*) FROM vendors;
