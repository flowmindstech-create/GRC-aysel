-- ============================================================
-- RiskShield IRM — Phase 30 Migration (new dashboard modules)
-- Risk Appetite Statements · Financial Risks (portfolio/investment) · Stress Tests
-- All org-scoped via RLS, rule-based (no AI).
-- ============================================================

-- ── Risk Appetite Statements ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS risk_appetite_statements (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  code        TEXT UNIQUE,                 -- RA-YYYY-NNN
  category    TEXT,                         -- risk category
  statement   TEXT NOT NULL,
  tolerance   TEXT,                         -- threshold / limit
  measure     TEXT,                         -- KRI / metric
  status      TEXT DEFAULT 'within'
    CHECK (status IN ('within','warning','breached')),
  owner       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE risk_appetite_statements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org_risk_appetite" ON risk_appetite_statements;
CREATE POLICY "org_risk_appetite" ON risk_appetite_statements
  FOR ALL USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));

-- ── Financial Risks (portfolio / investment) ────────────────────────────────
CREATE TABLE IF NOT EXISTS financial_risks (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  code            TEXT UNIQUE,             -- FR-YYYY-NNN
  title           TEXT NOT NULL,
  kind            TEXT DEFAULT 'portfolio'
    CHECK (kind IN ('portfolio','investment')),
  exposure_amount NUMERIC,
  currency        TEXT DEFAULT 'AZN',
  likelihood      INT DEFAULT 3,
  impact          INT DEFAULT 3,
  level           TEXT,                     -- derived inherent level
  notes           TEXT,
  owner           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE financial_risks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org_financial_risks" ON financial_risks;
CREATE POLICY "org_financial_risks" ON financial_risks
  FOR ALL USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));

-- ── Stress Tests & Scenario Analysis ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS stress_tests (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  code          TEXT UNIQUE,               -- ST-YYYY-NNN
  scenario      TEXT NOT NULL,
  description   TEXT,
  assumption    TEXT,                       -- stress assumption
  result_impact TEXT,                       -- modelled impact
  outcome       TEXT DEFAULT 'attention'
    CHECK (outcome IN ('pass','attention','fail')),
  tested_at     DATE,
  owner         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE stress_tests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org_stress_tests" ON stress_tests;
CREATE POLICY "org_stress_tests" ON stress_tests
  FOR ALL USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));
