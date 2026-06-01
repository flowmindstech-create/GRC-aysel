-- =========================================================================
-- RiskShield IRM — Complete Check Constraints Update for 5-Level Risk System
-- Run this in your Supabase SQL Editor to align all constraints with the
-- new 'minimal' risk level tier.
-- =========================================================================

-- 1. Risks Table - Level Constraint
ALTER TABLE risks DROP CONSTRAINT IF EXISTS risks_level_check;
ALTER TABLE risks ADD CONSTRAINT risks_level_check CHECK (level IN ('minimal', 'low', 'medium', 'high', 'critical'));

-- 2. Incidents Table - Severity Constraint
ALTER TABLE incidents DROP CONSTRAINT IF EXISTS incidents_severity_check;
ALTER TABLE incidents ADD CONSTRAINT incidents_severity_check CHECK (severity IN ('minimal', 'low', 'medium', 'high', 'critical'));

-- 3. Incidents Table - Priority Constraint (Phase 2 workflows)
ALTER TABLE incidents DROP CONSTRAINT IF EXISTS incidents_priority_check;
ALTER TABLE incidents ADD CONSTRAINT incidents_priority_check CHECK (priority IN ('critical', 'high', 'medium', 'low', 'minimal'));

-- 4. Audit Findings Table - Severity Constraint
ALTER TABLE audit_findings DROP CONSTRAINT IF EXISTS audit_findings_severity_check;
ALTER TABLE audit_findings ADD CONSTRAINT audit_findings_severity_check CHECK (severity IN ('info', 'minimal', 'low', 'medium', 'high', 'critical'));

-- 5. Control Issues Table - Severity Constraint (Phase 1 foundation)
ALTER TABLE control_issues DROP CONSTRAINT IF EXISTS control_issues_severity_check;
ALTER TABLE control_issues ADD CONSTRAINT control_issues_severity_check CHECK (severity IN ('info', 'minimal', 'low', 'medium', 'high', 'critical'));

-- 6. Audit Finding Workflow Table - Priority Constraint
ALTER TABLE audit_finding_workflow DROP CONSTRAINT IF EXISTS audit_finding_workflow_priority_check;
ALTER TABLE audit_finding_workflow ADD CONSTRAINT audit_finding_workflow_priority_check CHECK (priority IN ('critical', 'high', 'medium', 'low', 'minimal'));

-- 7. NIRAP Items Table - Urgency Constraint (Phase 2 workflows)
ALTER TABLE nirap_items DROP CONSTRAINT IF EXISTS nirap_items_urgency_check;
ALTER TABLE nirap_items ADD CONSTRAINT nirap_items_urgency_check CHECK (urgency IN ('critical', 'high', 'medium', 'low', 'minimal'));
