-- =============================================================================
-- Bharat Shram Setu (BSS) — QR Role Summary seed
-- Generated from 'QR Role Summary' sheet of the source workbook: 5 roles
-- Only QR-scanner roles: public, worker, contractor (unbound+bound), employer.
-- Regenerate with: python3 generate_seed_rbac.py
-- =============================================================================

BEGIN;

INSERT INTO qr_role_access (role, binding_scope, grant_mechanism, default_access, sensitive_allowed, optional_identifiers, recommended_scope) VALUES

    ('public', NULL, 'Public QR or search; no login', 'Minimal verified profile', FALSE, TRUE, 'BSS ID, verified name, photo if consented, verification badge, broad work classification; no contact/address/ID numbers'),
    ('worker', NULL, 'Worker authenticated', 'Full self-access', FALSE, TRUE, 'Full profile subject to consent and security; audit all access'),
    ('contractor', 'unbound', 'Authenticated + worker QR; no active relationship', 'Limited work profile', FALSE, FALSE, 'Identity, skills, eligibility, relevant safety status; no bank, Aadhaar, family, nominee'),
    ('contractor', 'bound', 'Authenticated + worker QR + approved contractor-worker relationship', 'Operational access', FALSE, FALSE, 'Worker identity, employment, deployment, attendance/safety, relevant social security status; sensitive data restricted'),
    ('employer', NULL, 'Authenticated + worker QR + approved employment/site relationship', 'Operational + compliance access', FALSE, FALSE, 'Worker identity, current employment, site, safety, compliance, social-security status, relevant documents');

COMMIT;
