-- =============================================================================
-- Bharat Shram Setu (BSS) — FINAL Unified Authentication, Roles, Sites & RBAC
-- Schema (PostgreSQL 16)
--
-- Tables:
--   1.  app_role                      role lookup (the 9 auth roles)
--   2.  users                         unified auth (no fixed email/mobile columns)
--   3.  user_credentials              one row per identifier (mobile/email/aadhaar/login_id)
--
--   Role profile tables (1:1 with `users` via user_id, per the migration/role logic):
--   4.  contractor_profiles           contractor's own identity
--   5.  employer_profiles             employer's own identity
--   6.  government_profile            gov inspector / admin identity
--   7.  bss_staff_profile             BSS staff identity
--   8.  it_profile                    IT Task Force identity
--
--   Site & binding (ECSW hierarchy from the binding logic):
--   9.  site                          a site belongs to exactly ONE employer
--   10. worker_contractor_binding     worker<->contractor<->site link; drives binding_scope
--                                      (derives employer via site; contractor may bind to
--                                       many employers through many sites)
--
--   Worker profile resources (1:1 with `users` where role='worker' via user_id).
--   Field exposure is governed ONLY by rbac_permissions; data tables stay pure data.
--   11. worker_identity
--   12. worker_address_mobility
--   13. worker_family_dependants
--   14. worker_social_security
--   15. worker_welfare_safety
--   16. worker_banking
--   17. worker_classification
--   18. worker_employment             links to worker_contractor_binding (not inline contractor/employer)
--   19. worker_skills_employability
--   20. worker_other
--
--   21. rbac_permissions              SINGLE field-level permission table (role x resource x field)
--   22. qr_role_access                per-role QR access profile (QR Role Summary sheet)
--   23. worker_other.qr_opt_in         public QR display gated by worker opt-in
--
--   Reference data (mirrors the Dropdowns sheet — enumerable pick-list values):
--   24. lookup_value                   one row per (category, value) for every dropdown in the form
--   25. worker_category_master         coded taxonomy (W01-W20) from the Worker Categories sheet
--   26. skill_master                   coded skill taxonomy (S01-S45) from the Skill Master sheet
--
--   Rozgar & Request (job-request flow — 'Rozgar & Request' sheet):
--   27. contractor_job                 contractor-created job posting
--   28. rozgar_request                 per-worker job request lifecycle (PENDING/ACCEPTED/REJECTED/CANCELLED/EXPIRED)
--
--   Grievance (voice grievance flow — 'Grievance' sheet):
--   29. worker_grievance               language + voice recording -> submit -> shown on dashboard
--
--   Documents (worker document uploads — 'Documents' sheet):
--   30. worker_document_master         master list of 14 document types (DOC-01..14)
--   31. worker_documents               a worker's actual uploaded document files
--
-- Seed permissions: see seed_rbac.sql (regenerate via generate_seed_rbac.py).
-- Seed QR role profiles: seed_qr.sql (regenerate via generate_seed_rbac.py).
-- Seed reference/dropdown data: seed_lookup.sql (regenerate via generate_seed_rbac.py).
-- Seed worker-category master: seed_worker_category.sql (regenerate via generate_seed_rbac.py).
-- Seed skill master: seed_skill_master.sql (regenerate via generate_seed_rbac.py).
-- Seed document master: seed_document_master.sql (regenerate via generate_seed_rbac.py).
-- =============================================================================
-- Seed permissions: see seed_rbac.sql (regenerate via generate_seed_rbac.py).
-- Seed QR role profiles: seed_qr.sql (regenerate via generate_seed_rbac.py).
-- Seed reference/dropdown data: seed_lookup.sql (regenerate via generate_seed_rbac.py).
-- Seed worker-category master: seed_worker_category.sql (regenerate via generate_seed_rbac.py).
-- Seed skill master: seed_skill_master.sql (regenerate via generate_seed_rbac.py).
-- Seed document master: seed_document_master.sql (regenerate via generate_seed_rbac.py).
-- =============================================================================

BEGIN;

-- =============================================================================
-- 1) ROLE LOOKUP
-- =============================================================================
CREATE TABLE IF NOT EXISTS app_role (
    id            SMALLSERIAL PRIMARY KEY,
    code          VARCHAR(40)  NOT NULL UNIQUE,
    label         VARCHAR(60)  NOT NULL,
    is_login_role BOOLEAN      NOT NULL DEFAULT TRUE,
    sort_order    SMALLINT     NOT NULL DEFAULT 0
);

INSERT INTO app_role (code, label, is_login_role, sort_order) VALUES
    ('public',              'Public',                    FALSE, 0),
    ('worker',              'Worker',                    TRUE,  1),
    ('contractor',          'Contractor',                TRUE,  2),
    ('employer',            'Employer',                  TRUE,  3),
    ('government_inspector','Government – Inspector',    TRUE,  4),
    ('government_admin',    'Government – Admin',        TRUE,  5),
    ('bss_staff',           'BSS Staff',                 TRUE,  6),
    ('it_task_force',       'IT Task Force (Tech Team)', TRUE,  7),
    ('bss_super_admin',     'BSS Super Admin',           TRUE,  8)
ON CONFLICT ("code") DO NOTHING;

-- =============================================================================
-- 2) USERS (unified auth)
-- =============================================================================
CREATE TABLE IF NOT EXISTS users (
    id             BIGSERIAL PRIMARY KEY,
    role           VARCHAR(40)  NOT NULL REFERENCES app_role (code),
    password_hash  VARCHAR(255),
    account_active BOOLEAN      NOT NULL DEFAULT TRUE,
    is_verified    BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at     TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 3) USER_CREDENTIALS (one row per identifier per user)
-- =============================================================================
CREATE TABLE IF NOT EXISTS user_credentials (
    id             BIGSERIAL PRIMARY KEY,
    user_id        BIGINT       NOT NULL REFERENCES users (id),
    identity_type  VARCHAR(20)  NOT NULL CHECK (identity_type IN
                     ('mobile','email','aadhaar','login_id')),
    identity_value VARCHAR(255) NOT NULL,
    is_primary     BOOLEAN      NOT NULL DEFAULT FALSE,
    verified       BOOLEAN      NOT NULL DEFAULT FALSE,
    password_hash  VARCHAR(255),   -- NULL for OTP-only (phone) flows
    mpin_hash      VARCHAR(255),   -- optional MPIN
    created_at     TIMESTAMP    NOT NULL DEFAULT NOW(),
    UNIQUE (identity_type, identity_value)
);

-- =============================================================================
-- 4) CONTRACTOR PROFILES  (resource: contractor_profiles)
--    The contractor's own identity/registration. Linked to users (role='contractor').
-- =============================================================================
CREATE TABLE IF NOT EXISTS contractor_profiles (
    id                BIGSERIAL PRIMARY KEY,
    user_id           BIGINT       NOT NULL UNIQUE REFERENCES users (id),
    contractor_name   VARCHAR(120),
    contractor_code   VARCHAR(40),
    contact_person    VARCHAR(120),
    mobile            VARCHAR(20),
    email             VARCHAR(120),
    state             VARCHAR(60),
    district          VARCHAR(60),
    address           VARCHAR(255),
    gstin             VARCHAR(40),
    pan_no            VARCHAR(20),
    lin               VARCHAR(40),        -- labour licence number
    approval_status   VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    is_active         BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at        TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 5) EMPLOYER PROFILES  (resource: employer_profiles)
-- =============================================================================
CREATE TABLE IF NOT EXISTS employer_profiles (
    id                BIGSERIAL PRIMARY KEY,
    user_id           BIGINT       NOT NULL UNIQUE REFERENCES users (id),
    employer_name     VARCHAR(120),
    employer_code     VARCHAR(40),
    contact_person    VARCHAR(120),
    mobile            VARCHAR(20),
    email             VARCHAR(120),
    state             VARCHAR(60),
    district          VARCHAR(60),
    address           VARCHAR(255),
    industry          VARCHAR(80),
    gstin             VARCHAR(40),
    pan_no            VARCHAR(20),
    lin               VARCHAR(40),
    approval_status   VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    is_active         BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at        TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 6) GOVERNMENT PROFILE  (resource: government_profile)
--    One table for both government_inspector and government_admin, distinguished by gov_type.
-- =============================================================================
CREATE TABLE IF NOT EXISTS government_profile (
    id                BIGSERIAL PRIMARY KEY,
    user_id           BIGINT       NOT NULL UNIQUE REFERENCES users (id),
    gov_type          VARCHAR(20)  NOT NULL CHECK (gov_type IN ('inspector','admin')),
    officer_name      VARCHAR(120),
    department        VARCHAR(80),
    designation       VARCHAR(80),
    jurisdiction      VARCHAR(120),
    created_at        TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 7) BSS STAFF PROFILE  (resource: bss_staff_profile)
-- =============================================================================
CREATE TABLE IF NOT EXISTS bss_staff_profile (
    id                BIGSERIAL PRIMARY KEY,
    user_id           BIGINT       NOT NULL UNIQUE REFERENCES users (id),
    employee_code     VARCHAR(40),
    full_name         VARCHAR(120),
    department        VARCHAR(80),
    designation       VARCHAR(80),
    mobile            VARCHAR(20),
    email             VARCHAR(120),
    created_at        TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 8) IT PROFILE (IT Task Force)  (resource: it_profile)
-- =============================================================================
CREATE TABLE IF NOT EXISTS it_profile (
    id                BIGSERIAL PRIMARY KEY,
    user_id           BIGINT       NOT NULL UNIQUE REFERENCES users (id),
    employee_code     VARCHAR(40),
    full_name         VARCHAR(120),
    department        VARCHAR(80),
    designation       VARCHAR(80),
    mobile            VARCHAR(20),
    email             VARCHAR(120),
    created_at        TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 9) SITE  (resource: site)
--    Site data is stored as ONE row per physical site. A site belongs to exactly
--    ONE employer (Site -> Many-to-One -> Employer), so ONE EMPLOYER CAN OWN MANY
--    SITES (no unique constraint on employer_id; idx_site_employer is non-unique).
--    Each employer-generated site QR maps to a distinct site row.
--
--    The same employer can place DIFFERENT contractors on DIFFERENT sites, e.g.
--      E1 owns S1, S2, S3 ;  C1 manages S1 & S2 ;  C2 manages S3.
--    Contractor membership is expressed through worker_contractor_binding.site_id
--    (one row per contractor-site pair), NOT a column on this table.
--    A contractor may work on many sites; a worker is on exactly one site.
-- =============================================================================
CREATE TABLE IF NOT EXISTS site (
    id              BIGSERIAL PRIMARY KEY,
    site_name       VARCHAR(120),
    site_code       VARCHAR(40) NOT NULL UNIQUE,
    employer_id     BIGINT      NOT NULL REFERENCES users (id),   -- site owner (role='employer')
    latitude        NUMERIC(9,6),   -- GPS latitude  (geolocation / attendance geofencing)
    longitude       NUMERIC(9,6),   -- GPS longitude (geolocation / attendance geofencing)
    site_qr_token   UUID      NOT NULL DEFAULT gen_random_uuid(),  -- site-based QR code identity
    location        VARCHAR(255),
    city            VARCHAR(60),
    district        VARCHAR(60),
    state           VARCHAR(60),
    pincode         VARCHAR(10),
    created_at      TIMESTAMP   NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP   NOT NULL DEFAULT NOW(),
    UNIQUE (site_qr_token)
);
CREATE INDEX IF NOT EXISTS idx_site_employer ON site (employer_id);

-- =============================================================================
-- 10) WORKER_CONTRACTOR_BINDING  (resource: worker_contractor_binding)
--     Links worker <-> contractor <-> site. Drives RBAC binding_scope:
--       ACCEPTED  -> contractor sees the 'bound' permission set
--       otherwise -> contractor sees the 'unbound' (supervisor) set
--     Employer is derived via the site (site.employer_id). Because a contractor can
--     be assigned to many sites (each belonging to a possibly different employer),
--     ONE contractor can bind to MANY employers. Enforces 1 worker = 1 ACTIVE site
--     via the partial unique index uq_binding_one_active_site_per_worker.
--
--     CONTRACTOR MANAGES MULTIPLE SITES: a contractor is not stored directly against
--     a site. Their site membership is implied by one binding row per site, e.g.
--       (W1, C1, S1) and (W2, C1, S2)  ->  contractor C1 manages BOTH S1 and S2.
--     Each site row can belong to the same or different employer, so one contractor
--     can span multiple sites/employers without violating the hierarchy.
-- =============================================================================
CREATE TABLE IF NOT EXISTS worker_contractor_binding (
    id                 BIGSERIAL PRIMARY KEY,
    worker_id          BIGINT       NOT NULL REFERENCES users (id),   -- W
    contractor_id      BIGINT       NOT NULL REFERENCES users (id),   -- C
    site_id            BIGINT       NOT NULL REFERENCES site (id),    -- S
    binding_status     VARCHAR(20)  NOT NULL DEFAULT 'PENDING' CHECK (binding_status IN
                         ('PENDING','ACCEPTED','REJECTED','CANCELLED','EXPIRED')),
    consent_worker     BOOLEAN      NOT NULL DEFAULT FALSE,
    consent_contractor BOOLEAN      NOT NULL DEFAULT FALSE,
    consent_method     VARCHAR(20)  CHECK (consent_method IN
                         ('app','ivr','sms_otp','voice')),
    accepted_at        TIMESTAMP,
    created_at         TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMP    NOT NULL DEFAULT NOW(),

    -- keep an index for the 1 worker = 1 site scan but NOT as a strict uniqueness here;
    -- strict "one active site per worker" is enforced by the PARTIAL UNIQUE INDEX below.
    UNIQUE (worker_id, contractor_id, site_id)   -- constant E-C-S-W tuple (E via site)
);
-- PARTIAL UNIQUE: a worker currently ACCEPTED can be bound to EXACTLY ONE site
-- (1 worker = 1 active site; rejects a 2nd ACCEPTED binding for the same worker,
--  even on a different site). PENDING/REJECTED/CANCELLED/EXPIRED are unaffected.
CREATE UNIQUE INDEX IF NOT EXISTS uq_binding_one_active_site_per_worker
    ON worker_contractor_binding (worker_id)
    WHERE binding_status = 'ACCEPTED';
CREATE INDEX IF NOT EXISTS idx_binding_contractor ON worker_contractor_binding (contractor_id);
CREATE INDEX IF NOT EXISTS idx_binding_worker    ON worker_contractor_binding (worker_id);

-- =============================================================================
-- 11) WORKER IDENTITY  (resource: worker_identity)  — 23 fields
-- =============================================================================
CREATE TABLE IF NOT EXISTS worker_identity (
    id                           BIGSERIAL PRIMARY KEY,
    user_id                      BIGINT       NOT NULL UNIQUE REFERENCES users (id),
    bss_worker_id                VARCHAR(20)  NOT NULL UNIQUE,   -- BSS + 12 digit
    name                         VARCHAR(120),                   -- as per Aadhaar
    gender                       VARCHAR(10),
    date_of_birth                DATE,
    age                          SMALLINT,                       -- derived
    mobile_number                VARCHAR(20),
    alternate_mobile             VARCHAR(20),
    email                        VARCHAR(120),
    marital_status               VARCHAR(20),
    father_name                  VARCHAR(120),
    mother_name                  VARCHAR(120),
    spouse_name                  VARCHAR(120),
    emergency_contact_name       VARCHAR(120),
    emergency_contact_number     VARCHAR(20),
    emergency_contact_relation   VARCHAR(60),
    disability_status            VARCHAR(40),    -- sensitive
    disability_type_pct          VARCHAR(80),    -- sensitive
    blood_group                  VARCHAR(10),
    religion                     VARCHAR(40),    -- sensitive
    caste                        VARCHAR(40),    -- sensitive
    photo                        VARCHAR(255),
    pan                          VARCHAR(20),    -- encrypted
    aadhaar                      VARCHAR(20),    -- encrypted; primary identifier
    created_at                   TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at                   TIMESTAMP NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 12) ADDRESS & MOBILITY  (resource: address_mobility)  — 12 fields
-- =============================================================================
CREATE TABLE IF NOT EXISTS worker_address_mobility (
    id                BIGSERIAL PRIMARY KEY,
    user_id           BIGINT       NOT NULL UNIQUE REFERENCES users (id),
    current_address   VARCHAR(255),
    current_state     VARCHAR(60),
    current_district  VARCHAR(60),
    current_city      VARCHAR(60),
    current_pincode   VARCHAR(10),
    permanent_address VARCHAR(255),
    permanent_state   VARCHAR(60),
    permanent_district VARCHAR(60),
    permanent_city    VARCHAR(60),
    permanent_pincode VARCHAR(10),
    migrant_worker    BOOLEAN,
    migration_type    VARCHAR(40),
    created_at        TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMP NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 13) FAMILY & DEPENDANTS  (resource: family_dependants)  — 13 fields (multi-row)
-- =============================================================================
CREATE TABLE IF NOT EXISTS worker_family_dependants (
    id                  BIGSERIAL PRIMARY KEY,
    user_id             BIGINT       NOT NULL REFERENCES users (id),
    family_members_count SMALLINT,
    dependants_count    SMALLINT,
    name                VARCHAR(120),
    dependant           VARCHAR(40),
    relation            VARCHAR(60),
    nominee_age         SMALLINT,
    nominee_dob         DATE,
    contact             VARCHAR(20),
    address             VARCHAR(255),
    nominee             BOOLEAN,
    nominee_type        VARCHAR(40),
    pan_copy_nominee    BOOLEAN,
    aadhaar_copy_nominee BOOLEAN,
    created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 14) SOCIAL SECURITY  (resource: social_security)  — 7 fields
-- =============================================================================
CREATE TABLE IF NOT EXISTS worker_social_security (
    id                  BIGSERIAL PRIMARY KEY,
    user_id             BIGINT       NOT NULL UNIQUE REFERENCES users (id),
    epfo_uan            VARCHAR(40),
    esic_ip_number      VARCHAR(40),
    lwf_no              VARCHAR(40),
    wc_policy_no        VARCHAR(40),
    e_shram_no          VARCHAR(40),
    bocw_reg_number     VARCHAR(40),
    state_worker_id     VARCHAR(40),
    created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 15) WELFARE & SAFETY  (resource: welfare_safety)  — 21 fields
-- =============================================================================
CREATE TABLE IF NOT EXISTS worker_welfare_safety (
    id                         BIGSERIAL PRIMARY KEY,
    user_id                    BIGINT       NOT NULL UNIQUE REFERENCES users (id),
    ppe_required               BOOLEAN,
    types_of_ppe_given         VARCHAR(120),
    safety_training_completed  BOOLEAN,
    site_induction_status      VARCHAR(40),
    insurance_status           VARCHAR(40),
    accomodation_provided      VARCHAR(40),
    police_verification        VARCHAR(40),
    training_date              DATE,
    trainer_name               VARCHAR(120),
    temp_gatepass_status       VARCHAR(40),
    tgp_no                     VARCHAR(40),
    temp_gatepass_start_date   DATE,
    temp_gatepass_end_date     DATE,
    permanent_gatepass_status  VARCHAR(40),
    pgp_no                     VARCHAR(40),
    permanent_gatepass_start_date DATE,
    permanent_gatepass_end_date   DATE,
    medical_examination_status VARCHAR(40),
    last_medical_examination   DATE,
    medical_fitness_status     VARCHAR(40),
    next_medical_due           DATE,
    created_at                 TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at                 TIMESTAMP NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 16) BANKING  (resource: banking)  — 6 fields (sensitive)
-- =============================================================================
CREATE TABLE IF NOT EXISTS worker_banking (
    id                       BIGSERIAL PRIMARY KEY,
    user_id                  BIGINT       NOT NULL UNIQUE REFERENCES users (id),
    bank_name                VARCHAR(120),
    bank_account_holder_name VARCHAR(120),
    bank_account_number      VARCHAR(40),    -- encrypted
    ifsc_code                VARCHAR(20),
    bank_verification_status VARCHAR(40),
    upi_enabled              BOOLEAN,
    created_at               TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at               TIMESTAMP NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 17) WORKER CLASSIFICATION  (resource: worker_classification)  — 35 fields
-- =============================================================================
CREATE TABLE IF NOT EXISTS worker_classification (
    id                            BIGSERIAL PRIMARY KEY,
    user_id                       BIGINT       NOT NULL UNIQUE REFERENCES users (id),
    worker_category               VARCHAR(60),
    sector                        VARCHAR(80),
    industry                      VARCHAR(80),
    occupation                    VARCHAR(80),
    skill                         VARCHAR(80),
    current_employment_status     VARCHAR(40),
    total_worker_experience       VARCHAR(40),
    -- Gig
    gig_platform_worker_id        VARCHAR(60),
    gig_platform_name             VARCHAR(120),
    gig_platform_type             VARCHAR(60),
    gig_date_joined_platform      DATE,
    gig_avg_hours_per_day         VARCHAR(40),
    gig_avg_days_per_week         VARCHAR(40),
    gig_service_area              VARCHAR(120),
    gig_vehicle_type              VARCHAR(60),
    gig_vehicle_ownership         VARCHAR(40),
    gig_dl_number                 VARCHAR(40),
    gig_dl_expiry                 DATE,
    -- Self employment
    se_business_name              VARCHAR(120),
    se_business_type              VARCHAR(60),
    se_registration_status        VARCHAR(40),
    se_start_date                 DATE,
    se_business_location          VARCHAR(120),
    se_avg_hours_per_day          VARCHAR(40),
    se_avg_days_per_week          VARCHAR(40),
    se_num_employees              SMALLINT,
    se_employer_or_business_name  VARCHAR(120),
    -- Seasonal
    season_job_work_type          VARCHAR(80),
    season_start_date             DATE,
    season_end_date               DATE,
    season_avg_hours_per_day      VARCHAR(40),
    season_avg_days_per_week      VARCHAR(40),
    season_work_location          VARCHAR(120),
    season_expected_income        VARCHAR(40),
    season_payment_frequency      VARCHAR(40),
    created_at                    TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at                    TIMESTAMP NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 18) EMPLOYMENT / WORK  (resource: employment_work)
--     Stores per-worker employment facts. Contractor / employer / site details are
--     NOT stored inline — they are linked via assignment_id -> worker_contractor_binding
--     (site gives employer; worker_contractor_binding gives contractor). Multi-row for
--     history / future engagements.
-- =============================================================================
CREATE TABLE IF NOT EXISTS worker_employment (
    id                   BIGSERIAL PRIMARY KEY,
    user_id              BIGINT       NOT NULL REFERENCES users (id),
    assignment_id        BIGINT       REFERENCES worker_contractor_binding (id),
    camp_no              VARCHAR(40),
    shift                VARCHAR(40),
    ref_worker_id        VARCHAR(40),
    doj                  DATE,
    designation          VARCHAR(80),
    department           VARCHAR(80),
    id_card_issue_date   DATE,
    id_card_validity_till DATE,
    transport_facility   VARCHAR(40),
    route                VARCHAR(80),
    bus_no               VARCHAR(40),
    status               VARCHAR(40),
    pf_account           VARCHAR(40),    -- masked
    nature_of_job        VARCHAR(120),
    type_of_work         VARCHAR(120),
    created_at           TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_employment_assignment ON worker_employment (assignment_id);

-- =============================================================================
-- 19) SKILLS & EMPLOYABILITY  (resource: skills_employability)  — 11 fields
-- =============================================================================
CREATE TABLE IF NOT EXISTS worker_skills_employability (
    id                        BIGSERIAL PRIMARY KEY,
    user_id                   BIGINT       NOT NULL REFERENCES users (id),
    qualification_course      VARCHAR(120),
    board_university          VARCHAR(120),
    passing_year              VARCHAR(10),
    primary_skill             VARCHAR(80),   -- display text captured from the form
    primary_skill_code        VARCHAR(6),    -- canonical coded reference (S01-S45) -> skill_master.code
    secondary_skills          VARCHAR(255),  -- free multi-value comma list
    skill_experience_years    VARCHAR(20),
    certification_name        VARCHAR(120),
    certification_number      VARCHAR(60),   -- masked
    certification_authority   VARCHAR(120),
    certification_expiry      DATE,
    languages_known           VARCHAR(255)
);

-- =============================================================================
-- 20) OTHER  (resource: other)  — 6 fields (consent / registration audit)
-- =============================================================================
CREATE TABLE IF NOT EXISTS worker_other (
    id                        BIGSERIAL PRIMARY KEY,
    user_id                   BIGINT       NOT NULL UNIQUE REFERENCES users (id),
    consent_registration      BOOLEAN,
    consent_verification      BOOLEAN,
    consent_date              DATE,
    qr_opt_in                 BOOLEAN     NOT NULL DEFAULT FALSE,  -- public QR display only when opted in
    registration_source       VARCHAR(80),
    registered_by             VARCHAR(120),
    registration_date         DATE,
    created_at                TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at                TIMESTAMP NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 21) RBAC_PERMISSIONS  (SINGLE field-level permission table)
--     One row per (role x resource x field). Resolved at login / data access.
-- =============================================================================
CREATE TABLE IF NOT EXISTS rbac_permissions (
    id              BIGSERIAL PRIMARY KEY,
    role            VARCHAR(40) NOT NULL REFERENCES app_role (code),
    resource        VARCHAR(60) NOT NULL,   -- matches a data table / resource
    field           VARCHAR(60) NOT NULL,
    access          VARCHAR(20) NOT NULL CHECK (access IN
                      ('view','edit','masked','view_masked','restricted','full','no','conditional','optional')),
    reveal_type     VARCHAR(20) CHECK (reveal_type IN
                      ('full','verified_only','band_only','public')),
    binding_scope   VARCHAR(20) CHECK (binding_scope IN ('unbound','bound')),
    scope           VARCHAR(40),
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (role, resource, field, binding_scope)
);

CREATE INDEX IF NOT EXISTS idx_rbac_role_resource
    ON rbac_permissions (role, resource, field);

-- =============================================================================
-- 22) QR_ROLE_ACCESS  (QR Role Summary)
--     Per-role QR access profile: how QR access is granted, the default access a
--     QR-scanned viewer receives, and whether sensitive identifiers / opt-in display
--     are involved. Mirrors the 'QR Role Summary' sheet. A non-logged-in QR scanner
--     resolves through the `public` role, gated by worker_other.qr_opt_in.
--     binding_scope distinguishes the contractor's unbound (supervisor) and bound
--     profiles, mirroring rbac_permissions.
-- =============================================================================
CREATE TABLE IF NOT EXISTS qr_role_access (
    id                   BIGSERIAL PRIMARY KEY,
    role                 VARCHAR(40)  NOT NULL REFERENCES app_role (code),
    binding_scope        VARCHAR(20)  CHECK (binding_scope IN ('unbound','bound')),
    grant_mechanism      VARCHAR(120),
    default_access       VARCHAR(60),
    sensitive_allowed    BOOLEAN      NOT NULL DEFAULT FALSE,
    optional_identifiers BOOLEAN      NOT NULL DEFAULT FALSE,
    recommended_scope    VARCHAR(255),
    created_at           TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMP    NOT NULL DEFAULT NOW(),
    UNIQUE (role, binding_scope)
);

-- =============================================================================
-- 24) LOOKUP_VALUE  (reference data — mirrors the 'Dropdowns' sheet)
--     Holds the enumerable pick-list values for every dropdown field in the form.
--     One row per (category, value). category mirrors a Dropdowns sheet column /
--     sub-group; value is one allowed option. Data columns store values from these
--     lists (kept as VARCHAR in the worker tables; this is the authoritative seed).
-- =============================================================================
CREATE TABLE IF NOT EXISTS lookup_value (
    id             BIGSERIAL PRIMARY KEY,
    category       VARCHAR(60)  NOT NULL,
    value          VARCHAR(120) NOT NULL,
    sort_order     SMALLINT     NOT NULL DEFAULT 0,
    created_at     TIMESTAMP    NOT NULL DEFAULT NOW(),
    UNIQUE (category, value)
);

CREATE INDEX IF NOT EXISTS idx_lookup_category ON lookup_value (category);

-- =============================================================================
-- 25) WORKER_CATEGORY_MASTER  (coded taxonomy — mirrors the 'Worker Categories' sheet)
--     The authoritative, coded master (W01-W20) for the worker_category field, with
--     definitions, typical workplaces, primary relationship and data focus. Kept
--     separate from lookup_value.worker_category (the plain 19-value Dropdowns list)
--     because the two source sheets define these lists differently.
-- =============================================================================
CREATE TABLE IF NOT EXISTS worker_category_master (
    id                  BIGSERIAL PRIMARY KEY,
    code                VARCHAR(5)   NOT NULL UNIQUE,   -- W01 .. W20
    name                VARCHAR(120) NOT NULL,
    definition          VARCHAR(500),
    typical_workplaces  VARCHAR(300),
    primary_relationship VARCHAR(120),
    data_focus          VARCHAR(300),
    sort_order          SMALLINT     NOT NULL DEFAULT 0,
    created_at          TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 26) SKILL_MASTER  (coded skill taxonomy — mirrors the 'Skill Master' sheet)
--     The authoritative, coded skill master (S01-S45) for the skill field, with
--     sector, family, occupation, typical level, industry/use and description.
-- =============================================================================
CREATE TABLE IF NOT EXISTS skill_master (
    id                  BIGSERIAL PRIMARY KEY,
    code                VARCHAR(6)   NOT NULL UNIQUE,   -- S01 .. S45
    sector              VARCHAR(60)  NOT NULL,          -- Skill Sector (grouping)
    family              VARCHAR(80),                    -- Skill Family
    occupation          VARCHAR(120) NOT NULL,          -- Skill / Occupation
    typical_level       VARCHAR(40),                    -- Skilled / Semi-skilled / Entry-level / Variable
    industry_use        VARCHAR(200),                   -- Industry / Use
    description         VARCHAR(300),                   -- Skill Description
    sort_order          SMALLINT     NOT NULL DEFAULT 0,
    created_at          TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 27) CONTRACTOR_JOB  (Contractor Job Creation — 'Rozgar & Request' sheet)
--     The contractor creates a job posting with the required details. Each job
--     may generate one or more requests to workers.
-- =============================================================================
CREATE TABLE IF NOT EXISTS contractor_job (
    id                 BIGSERIAL PRIMARY KEY,
    contractor_id      BIGINT       NOT NULL REFERENCES users (id),   -- role='contractor'
    site_id            BIGINT       REFERENCES site (id),             -- optional deployment site
    job_title          VARCHAR(120) NOT NULL,
    job_description    VARCHAR(500),
    wage_offered       VARCHAR(60),
    start_date         DATE,
    validity_until     DATE,
    is_active          BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at         TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMP    NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_job_contractor ON contractor_job (contractor_id);
CREATE INDEX IF NOT EXISTS idx_job_site       ON contractor_job (site_id);

-- =============================================================================
-- 28) ROZGAR_REQUEST  (job request lifecycle — 'Rozgar & Request' sheet)
--     A request for a specific worker against a contractor job. Status drives the
--     flow: Pending (waiting for worker), Accepted (worker accepts -> establishes a
--     worker_contractor_binding), Rejected (worker declines), Cancelled (request
--     cancelled), Expired (request validity ended).
-- =============================================================================
CREATE TABLE IF NOT EXISTS rozgar_request (
    id                  BIGSERIAL PRIMARY KEY,
    job_id              BIGINT       NOT NULL REFERENCES contractor_job (id),
    contractor_id       BIGINT       NOT NULL REFERENCES users (id),   -- requestor
    worker_id           BIGINT       NOT NULL REFERENCES users (id),   -- recipient
    status              VARCHAR(20)  NOT NULL DEFAULT 'PENDING' CHECK (status IN
                           ('PENDING','ACCEPTED','REJECTED','CANCELLED','EXPIRED')),
    requested_at        TIMESTAMP    NOT NULL DEFAULT NOW(),
    responded_at        TIMESTAMP,
    expires_at          TIMESTAMP,
    notes               VARCHAR(500),
    created_at          TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP    NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rozgar_worker      ON rozgar_request (worker_id);
CREATE INDEX IF NOT EXISTS idx_rozgar_contractor  ON rozgar_request (contractor_id);
CREATE INDEX IF NOT EXISTS idx_rozgar_job         ON rozgar_request (job_id);
CREATE INDEX IF NOT EXISTS idx_rozgar_status      ON rozgar_request (status);

-- =============================================================================
-- 29) WORKER_GRIEVANCE  (voice grievance flow — 'Grievance' sheet)
--     Sheets' 3 steps: (1) select language and start voice recording,
--     (2) submit the grievance, (3) data shown on the dashboard after save.
-- =============================================================================
CREATE TABLE IF NOT EXISTS worker_grievance (
    id                     BIGSERIAL PRIMARY KEY,
    worker_id              BIGINT       NOT NULL REFERENCES users (id),
    language               VARCHAR(40),                -- Step 1: selected recording language
    recording_file         VARCHAR(255),               -- Step 1: voice recording file path
    recording_duration_secs INTEGER,
    body                   VARCHAR(1000),              -- transcribed text (where available)
    status                 VARCHAR(30)  NOT NULL DEFAULT 'RECORDED' CHECK (status IN
                              ('RECORDED','SUBMITTED','VIEWED_ON_DASHBOARD')),
    submitted_at           TIMESTAMP,                  -- Step 2: submitted
    created_at             TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at             TIMESTAMP    NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_grievance_worker ON worker_grievance (worker_id);
CREATE INDEX IF NOT EXISTS idx_grievance_status ON worker_grievance (status);

-- =============================================================================
-- 30) WORKER_DOCUMENT_MASTER  (document types — 'Documents' sheet)
--     The authorized list of worker document uploads (14 types). Each row defines
--     the document type, whether it is mandatory, and who uploads it (Worker or
--     system-generated — 'Auto From system' for gate passes).
-- =============================================================================
CREATE TABLE IF NOT EXISTS worker_document_master (
    id              BIGSERIAL PRIMARY KEY,
    code            VARCHAR(6)   NOT NULL UNIQUE,   -- DOC-01 .. DOC-14
    document_name   VARCHAR(120) NOT NULL,
    is_mandatory    BOOLEAN      NOT NULL DEFAULT FALSE,
    uploaded_by     VARCHAR(20)  NOT NULL DEFAULT 'worker' CHECK (uploaded_by IN ('worker','system')),
    sort_order      SMALLINT     NOT NULL DEFAULT 0,
    created_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 31) WORKER_DOCUMENTS  (a worker's actual uploaded document files)
--     One row per uploaded file, referencing worker_document_master for the type.
-- =============================================================================
CREATE TABLE IF NOT EXISTS worker_documents (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT       NOT NULL REFERENCES users (id),   -- worker
    document_id     BIGINT       NOT NULL REFERENCES worker_document_master (id),
    file_name       VARCHAR(255),
    file_path       VARCHAR(255),
    file_size       BIGINT,
    mime_type       VARCHAR(100),
    status          VARCHAR(20)  NOT NULL DEFAULT 'UPLOADED' CHECK (status IN
                        ('UPLOADED','VERIFIED','REJECTED')),
    uploaded_at     TIMESTAMP    NOT NULL DEFAULT NOW(),
    created_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, document_id, file_name)
);
CREATE INDEX IF NOT EXISTS idx_worker_docs_user ON worker_documents (user_id);
CREATE INDEX IF NOT EXISTS idx_worker_docs_doc  ON worker_documents (document_id);

-- Link worker_skills_employability.primary_skill_code -> skill_master.code
-- (defined after skill_master so the referenced table exists; covers section 19).
ALTER TABLE worker_skills_employability
    ADD CONSTRAINT fk_ws_primary_skill_code
    FOREIGN KEY (primary_skill_code) REFERENCES skill_master (code)
    ON UPDATE CASCADE ON DELETE RESTRICT;

-- =============================================================================
-- 32) ATTENDANCE_DEVICE  (capture hardware / scan point master)
--     Registers the physical devices that capture attendance. A device is bound to
--     a site (and optionally a contractor). capture_type selects the method:
--       QR     -> QR-scanner device / mobile scanner
--       NFC    -> NFC-tap terminal (worker taps an NFC card/tag)
--       CAMERA -> image-based recognition (face / badge) terminal
-- =============================================================================
CREATE TABLE IF NOT EXISTS attendance_device (
    id             BIGSERIAL PRIMARY KEY,
    site_id        BIGINT       NOT NULL REFERENCES site (id),
    contractor_id  BIGINT       REFERENCES users (id),
    device_code    VARCHAR(40)  NOT NULL UNIQUE,
    device_name    VARCHAR(120),
    capture_type   VARCHAR(20)  NOT NULL CHECK (capture_type IN ('QR','NFC','CAMERA')),
    device_serial  VARCHAR(80),
    is_active      BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at     TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMP    NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_att_device_site ON attendance_device (site_id);

-- =============================================================================
-- 33) ATTENDANCE  (worker attendance punches / logs)
--     Records every attendance event captured by one of three methods:
--       QR     -> worker presents a QR (worker QR / site QR) scanned by a device
--       NFC    -> worker taps a registered NFC card/tag at the terminal
--       CAMERA -> image-based (face/badge) recognition captured & matched
--     Linked to the constant E-C-S-W hierarchy: worker at site under contractor
--     (employer derived via site.employer_id). geofence/confidence columns support
--     verification for GPS and image-based matching.
-- =============================================================================
CREATE TABLE IF NOT EXISTS attendance (
    id                BIGSERIAL PRIMARY KEY,
    worker_id         BIGINT       NOT NULL REFERENCES users (id),   -- W
    site_id           BIGINT       NOT NULL REFERENCES site (id),    -- S
    contractor_id     BIGINT       REFERENCES users (id),            -- C (optional)
    device_id         BIGINT       REFERENCES attendance_device (id),
    attendance_date   DATE         NOT NULL DEFAULT CURRENT_DATE,
    check_in_time     TIMESTAMP,
    check_out_time    TIMESTAMP,
    status            VARCHAR(20)  NOT NULL DEFAULT 'PRESENT' CHECK (status IN
                          ('PRESENT','ABSENT','LEAVE','HOLIDAY','EXPECTED','LATE','HALF_DAY')),
    capture_method    VARCHAR(20)  NOT NULL CHECK (capture_method IN ('QR','NFC','CAMERA')),
    verification_type VARCHAR(30)  CHECK (verification_type IN
                          ('qr_worker','qr_site','nfc_card','face_image','badge_image')),
    image_file        VARCHAR(255),    -- captured image path (CAMERA method)
    confidence_pct    NUMERIC(5,2),    -- face/badge match confidence (CAMERA method)
    gps_lat           NUMERIC(9,6),    -- geofence lat read at punch
    gps_long          NUMERIC(9,6),    -- geofence long read at punch
    is_geofence_ok    BOOLEAN,         -- punch inside site radius?
    is_verified       BOOLEAN     NOT NULL DEFAULT FALSE,
    verified_by       BIGINT       REFERENCES users (id),
    verified_at       TIMESTAMP,
    remarks           VARCHAR(255),
    created_at        TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMP    NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_attendance_worker_date ON attendance (worker_id, attendance_date);
CREATE INDEX IF NOT EXISTS idx_attendance_site_date   ON attendance (site_id, attendance_date);
CREATE INDEX IF NOT EXISTS idx_attendance_contractor  ON attendance (contractor_id);

-- =============================================================================
-- 34) WORKER_WAGES  (earned wages per worker per pay period)
--     Wages can be auto-computed from attendance (daily_wage x days present +/-
--     overtime) or entered manually. One row per worker per pay cycle. Gross/net
--     breakdown with deductions (PF, ESIC, TDS, loan advance, etc.).
--     Links to the constant E-C-S-W hierarchy via worker/site/contractor.
-- =============================================================================
CREATE TABLE IF NOT EXISTS worker_wages (
    id                   BIGSERIAL PRIMARY KEY,
    worker_id            BIGINT       NOT NULL REFERENCES users (id),      -- W
    site_id              BIGINT       REFERENCES site (id),                -- S
    contractor_id        BIGINT       REFERENCES users (id),               -- C
    period_start         DATE         NOT NULL,
    period_end           DATE         NOT NULL,
    wage_frequency       VARCHAR(20)  NOT NULL DEFAULT 'MONTHLY' CHECK (wage_frequency IN
                             ('DAILY','WEEKLY','MONTHLY','PIECE_RATE')),
    days_present         NUMERIC(5,1) NOT NULL DEFAULT 0,
    days_absent          NUMERIC(5,1) NOT NULL DEFAULT 0,
    daily_wage           NUMERIC(12,2),
    units_done           NUMERIC(12,2),     -- piece-rate units (PIECE_RATE)
    piece_rate           NUMERIC(12,2),     -- per-unit amount (PIECE_RATE)
    base_wage            NUMERIC(12,2),     -- computed/entered gross before OT
    overtime_hours       NUMERIC(8,2) NOT NULL DEFAULT 0,
    overtime_amount      NUMERIC(12,2) NOT NULL DEFAULT 0,
    gross_wage           NUMERIC(12,2) NOT NULL DEFAULT 0,     -- base + overtime
    deductions_amount    NUMERIC(12,2) NOT NULL DEFAULT 0,     -- total deductions
    net_wage             NUMERIC(12,2) NOT NULL DEFAULT 0,     -- gross - deductions
    status               VARCHAR(20)  NOT NULL DEFAULT 'DRAFT' CHECK (status IN
                             ('DRAFT','APPROVED','PAID','CANCELLED')),
    computed_from_attendance BOOLEAN NOT NULL DEFAULT FALSE,   -- auto vs manual
    approved_by          BIGINT       REFERENCES users (id),
    approved_at          TIMESTAMP,
    created_at           TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMP    NOT NULL DEFAULT NOW(),
    UNIQUE (worker_id, period_start, period_end)              -- one wage row per pay cycle
);
CREATE INDEX IF NOT EXISTS idx_wages_worker ON worker_wages (worker_id);
CREATE INDEX IF NOT EXISTS idx_wages_site   ON worker_wages (site_id);

-- =============================================================================
-- 35) WAGE_PAYMENT  (disbursement of an approved wage record)
--     Tracks the actual money transfer/payment of a worker's wage: mode, amount,
--     timestamp, transaction reference and who processed it. Multiple partial
--     payments are possible; the SUM of payments vs net_wage indicates settling.
-- =============================================================================
CREATE TABLE IF NOT EXISTS wage_payment (
    id               BIGSERIAL PRIMARY KEY,
    worker_wages_id  BIGINT       NOT NULL REFERENCES worker_wages (id),
    pay_mode         VARCHAR(20)  NOT NULL CHECK (pay_mode IN ('BANK','UPI','CASH')),
    amount           NUMERIC(12,2) NOT NULL,
    paid_at          TIMESTAMP    NOT NULL DEFAULT NOW(),
    transaction_ref  VARCHAR(80),
    bank_account_last4 VARCHAR(10),
    upi_id           VARCHAR(80),
    paid_by          BIGINT       REFERENCES users (id),       -- processor (contractor/employer)
    remarks          VARCHAR(255),
    created_at       TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMP    NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_wage_payment_wages ON wage_payment (worker_wages_id);

-- =============================================================================
-- 36) DOCUMENT_ACCESS_TOKEN  (time-bound / timed tokens for document access)
--     Issues short-lived, expiring tokens for securely sharing or verifying a
--     worker document (or other secured resource). Each token:
--       - is bound to a requester and optionally to a specific document
--       - expires at expires_at (time-bound), optionally after max_uses
--       - can be single-use/timed; consumed/revoked explicitly
--     A one-time random token string (e.g. UUID) is stored hashed as token_hash.
-- =============================================================================
CREATE TABLE IF NOT EXISTS document_access_token (
    id            BIGSERIAL PRIMARY KEY,
    token_type    VARCHAR(30)  NOT NULL CHECK (token_type IN (
                      'DOCUMENT_VIEW','DOCUMENT_VERIFY','DOCUMENT_DOWNLOAD','ONBOARDING','OFFER_LETTER')),
    document_id   BIGINT       REFERENCES worker_documents (id),     -- optional target document
    subject_id    BIGINT       REFERENCES users (id),              -- entity the token is about (worker)
    requester_id  BIGINT       REFERENCES users (id),              -- who requested/issued
    token_hash    VARCHAR(128) NOT NULL UNIQUE,                    -- hashed token value (never raw)
    status        VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE' CHECK (status IN
                      ('ACTIVE','USED','EXPIRED','REVOKED')),
    issued_at     TIMESTAMP    NOT NULL DEFAULT NOW(),
    expires_at    TIMESTAMP    NOT NULL,                           -- time-bound expiry
    used_at       TIMESTAMP,
    max_uses      SMALLINT     NOT NULL DEFAULT 1,
    use_count     SMALLINT     NOT NULL DEFAULT 0,
    redirect_url  VARCHAR(255),
    ip_address    VARCHAR(45),
    created_at    TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMP    NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_doc_token_hash    ON document_access_token (token_hash);
CREATE INDEX IF NOT EXISTS idx_doc_token_expiry  ON document_access_token (expires_at);
CREATE INDEX IF NOT EXISTS idx_doc_token_doc     ON document_access_token (document_id);

-- =============================================================================
-- 37) WORKER_GATE_PASS  (Temporary TGP / Permanent PGP site access permits)
--     Security access permits issued so a worker can enter a site. Two types:
--       TGP -> Temporary Gate Pass
--       PGP -> Permanent Gate Pass
--     From the workbook ('workplace compliance' 10-17) these are
--     'Auto From Contractor Gate Pass' - populated from the contractor's gate
--     pass records rather than manual entry. Each gate pass is time-bound
--     (start/end date) with its own status and number. One worker may hold
--     multiple gate passes over time -> modeled as a child table (not flat
--     columns in worker_welfare_safety).
-- =============================================================================
CREATE TABLE IF NOT EXISTS worker_gate_pass (
    id                BIGSERIAL PRIMARY KEY,
    worker_id         BIGINT       NOT NULL REFERENCES users (id),
    site_id           BIGINT       REFERENCES site (id),          -- site the pass grants access to
    gate_pass_type    VARCHAR(20)  NOT NULL CHECK (gate_pass_type IN ('TGP','PGP')),
    gate_pass_no      VARCHAR(40)  NOT NULL,
    status            VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE' CHECK (status IN
                          ('ACTIVE','EXPIRED','REVOKED','PENDING')),
    start_date        DATE,
    end_date          DATE,                                       -- time-bound validity
    issued_by         BIGINT       REFERENCES users (id),         -- contractor who issued
    source            VARCHAR(20)  NOT NULL DEFAULT 'CONTRACTOR_GATE_PASS' CHECK (source IN
                          ('CONTRACTOR_GATE_PASS','MANUAL','SYSTEM')),
    created_at        TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMP    NOT NULL DEFAULT NOW(),
    UNIQUE (worker_id, gate_pass_type, gate_pass_no)
);
CREATE INDEX IF NOT EXISTS idx_gate_pass_worker ON worker_gate_pass (worker_id);
CREATE INDEX IF NOT EXISTS idx_gate_pass_type   ON worker_gate_pass (worker_id, gate_pass_type);

COMMIT;
