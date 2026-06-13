-- ============================================================
-- RiskShield IRM — Phase 5 Migration
-- (1) Risk category cleanup: 5-category model + legacy backfill
-- (2) Organizational structure table (org_units) + RLS + demo seed
-- ============================================================

-- ── 1. Risk category model: 5 categories ─────────────────────────────────────
-- IT Risk (cybersecurity), Financial, Operational, Legal & Compliance, Strategic
-- Drop the old CHECK, remap legacy rows, then add the new CHECK.

ALTER TABLE risks DROP CONSTRAINT IF EXISTS risks_category_check;

UPDATE risks SET category = 'legal_compliance' WHERE category IN ('legal', 'compliance');
UPDATE risks SET category = 'operational'      WHERE category = 'hr';

ALTER TABLE risks
  ADD CONSTRAINT risks_category_check
  CHECK (category IN ('cybersecurity','financial','operational','legal_compliance','strategic'));

-- ── 2. org_units table ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS org_units (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  type          TEXT NOT NULL DEFAULT 'department'
    CHECK (type IN ('executive','committee','department','division')),
  parent_id     UUID REFERENCES org_units(id) ON DELETE SET NULL,
  head_user_id  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  head_role     TEXT,
  order_index   INT DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_org_units_org    ON org_units(org_id);
CREATE INDEX IF NOT EXISTS idx_org_units_parent ON org_units(parent_id);

ALTER TABLE org_units ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_org_units" ON org_units;
CREATE POLICY "org_org_units" ON org_units
  FOR ALL USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));

-- ── 3. Seed demo structure (isb.az org chart) ────────────────────────────────
-- Heads are left NULL here (assign via Settings → Org Structure once profiles
-- exist). Parent links resolve by name within the org. Idempotent.

DO $$
DECLARE
  v_org UUID := '00000000-0000-0000-0000-000000000001';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM org_units WHERE org_id = v_org) THEN

    -- Tier 0: board
    INSERT INTO org_units (org_id, name, type, parent_id, head_role, order_index) VALUES
      (v_org, 'Himayəçilər Şurası', 'executive', NULL, NULL, 0);

    -- Tier 1: under board
    INSERT INTO org_units (org_id, name, type, parent_id, head_role, order_index)
    SELECT v_org, x.name, x.type, b.id, NULL, x.ord
    FROM (VALUES
      ('İcraçı direktor', 'executive', 1),
      ('Daxili audit xidməti', 'division', 2),
      ('Audit komitəsi', 'committee', 3),
      ('Strategiya komitəsi', 'committee', 4),
      ('Risk komitəsi', 'committee', 5)
    ) AS x(name, type, ord)
    CROSS JOIN (SELECT id FROM org_units WHERE org_id = v_org AND name = 'Himayəçilər Şurası') b;

    -- Tier 2: executive line under İcraçı direktor
    INSERT INTO org_units (org_id, name, type, parent_id, head_role, order_index)
    SELECT v_org, x.name, x.type, e.id, NULL, x.ord
    FROM (VALUES
      ('İcraçı direktorun müavini (Korporativ)', 'executive', 10),
      ('İcraçı direktorun müavini (Biznes)', 'executive', 11),
      ('Baş informasiya inzibatçısı', 'executive', 12),
      ('İnformasiya təhlükəsizliyi üzrə baş inzibatçı', 'executive', 13),
      ('Əməliyyatlar departamenti', 'department', 24),
      ('Risklərin idarəedilməsi şöbəsi', 'division', 90),
      ('Layihələrin idarə olunması şöbəsi', 'division', 91),
      ('Əməyin mühafizəsi üzrə mühəndis', 'division', 92),
      ('Satınalma üzrə menecer', 'division', 93),
      ('Daxili təhlükəsizlik üzrə menecer', 'division', 94),
      ('Strategiya üzrə menecer', 'division', 95)
    ) AS x(name, type, ord)
    CROSS JOIN (SELECT id FROM org_units WHERE org_id = v_org AND name = 'İcraçı direktor') e;

    -- Tier 3: departments under deputies / CIO
    INSERT INTO org_units (org_id, name, type, parent_id, head_role, order_index)
    SELECT v_org, 'Korporativ xidmətlər departamenti', 'department', p.id,
           'Korporativ xidmətlər departamentinin rəhbəri', 20
    FROM org_units p WHERE p.org_id = v_org AND p.name = 'İcraçı direktorun müavini (Korporativ)';

    INSERT INTO org_units (org_id, name, type, parent_id, head_role, order_index)
    SELECT v_org, 'Maliyyə şöbəsi', 'division', p.id, NULL, 35
    FROM org_units p WHERE p.org_id = v_org AND p.name = 'İcraçı direktorun müavini (Korporativ)';

    INSERT INTO org_units (org_id, name, type, parent_id, head_role, order_index)
    SELECT v_org, 'Biznesin inkişafı departamenti', 'department', p.id,
           'Biznesin inkişafı departamentinin rəhbəri', 21
    FROM org_units p WHERE p.org_id = v_org AND p.name = 'İcraçı direktorun müavini (Biznes)';

    INSERT INTO org_units (org_id, name, type, parent_id, head_role, order_index)
    SELECT v_org, x.name, 'division', p.id, NULL, x.ord
    FROM (VALUES
      ('Data və hesabatlılıq şöbəsi', 42),
      ('Yaşıl Kart və beynəlxalq əlaqələr şöbəsi', 43),
      ('Aktuari', 44)
    ) AS x(name, ord)
    CROSS JOIN (SELECT id FROM org_units WHERE org_id = v_org AND name = 'İcraçı direktorun müavini (Biznes)') p;

    INSERT INTO org_units (org_id, name, type, parent_id, head_role, order_index)
    SELECT v_org, x.name, x.type, p.id, x.role, x.ord
    FROM (VALUES
      ('Rəqəmsal həllərin inkişafı departamenti', 'department', 'Rəqəmsal həllərin inkişafı departamentinin rəhbəri', 22),
      ('İT infrastruktur və əməliyyatların idarəedilməsi departamenti', 'department', 'İT infrastruktur departamentinin rəhbəri', 23),
      ('Proqram təminatı üzrə arxitektor', 'division', NULL, 62),
      ('UX/UI dizayner', 'division', NULL, 63),
      ('Süni intellekt üzrə mühəndis', 'division', NULL, 64)
    ) AS x(name, type, role, ord)
    CROSS JOIN (SELECT id FROM org_units WHERE org_id = v_org AND name = 'Baş informasiya inzibatçısı') p;

    INSERT INTO org_units (org_id, name, type, parent_id, head_role, order_index)
    SELECT v_org, 'İnformasiya təhlükəsizliyi şöbəsi', 'division', p.id, NULL, 70
    FROM org_units p WHERE p.org_id = v_org AND p.name = 'İnformasiya təhlükəsizliyi üzrə baş inzibatçı';

    -- Tier 4: divisions under departments
    INSERT INTO org_units (org_id, name, type, parent_id, head_role, order_index)
    SELECT v_org, x.name, 'division', p.id, NULL, x.ord
    FROM (VALUES
      ('Hüquq şöbəsi', 30),
      ('İnsan resurslarının idarəedilməsi şöbəsi', 31),
      ('Ümumi şöbə', 32),
      ('Təsərrüfat şöbəsi', 33),
      ('İctimaiyyətlə əlaqələr və kommunikasiya şöbəsi', 34)
    ) AS x(name, ord)
    CROSS JOIN (SELECT id FROM org_units WHERE org_id = v_org AND name = 'Korporativ xidmətlər departamenti') p;

    INSERT INTO org_units (org_id, name, type, parent_id, head_role, order_index)
    SELECT v_org, x.name, 'division', p.id, NULL, x.ord
    FROM (VALUES ('Biznes analitika şöbəsi', 40), ('Metodologiya şöbəsi', 41)) AS x(name, ord)
    CROSS JOIN (SELECT id FROM org_units WHERE org_id = v_org AND name = 'Biznesin inkişafı departamenti') p;

    INSERT INTO org_units (org_id, name, type, parent_id, head_role, order_index)
    SELECT v_org, x.name, 'division', p.id, NULL, x.ord
    FROM (VALUES ('Tətbiqi proqramlaşdırma şöbəsi', 50), ('Rəqəmsal həllərin analizi və tətbiqi şöbəsi', 51)) AS x(name, ord)
    CROSS JOIN (SELECT id FROM org_units WHERE org_id = v_org AND name = 'Rəqəmsal həllərin inkişafı departamenti') p;

    INSERT INTO org_units (org_id, name, type, parent_id, head_role, order_index)
    SELECT v_org, x.name, 'division', p.id, NULL, x.ord
    FROM (VALUES
      ('Sistem və şəbəkə inzibatçılığı şöbəsi', 60),
      ('Əməliyyatların avtomatlaşdırılması və məlumat bazaları şöbəsi', 61)
    ) AS x(name, ord)
    CROSS JOIN (SELECT id FROM org_units WHERE org_id = v_org AND name = 'İT infrastruktur və əməliyyatların idarəedilməsi departamenti') p;

    INSERT INTO org_units (org_id, name, type, parent_id, head_role, order_index)
    SELECT v_org, x.name, 'division', p.id, NULL, x.ord
    FROM (VALUES
      ('Tələblərin idarə edilməsi şöbəsi', 80),
      ('Çağrı mərkəzi şöbəsi', 81),
      ('Müraciətlərin idarə edilməsi şöbəsi', 82)
    ) AS x(name, ord)
    CROSS JOIN (SELECT id FROM org_units WHERE org_id = v_org AND name = 'Əməliyyatlar departamenti') p;

  END IF;
END $$;
