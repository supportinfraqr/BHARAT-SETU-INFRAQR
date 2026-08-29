-- =============================================================================
-- Bharat Shram Setu (BSS) — Worker Document Master seed
-- Generated from 'Documents' sheet of the source workbook: 14 document types
-- Master list of worker document uploads (DOC-01 ...).
-- Regenerate with: python3 generate_seed_rbac.py
-- =============================================================================

BEGIN;

INSERT INTO worker_document_master (code, document_name, is_mandatory, uploaded_by, sort_order) VALUES

    ('DOC-01', 'Aadhaar Card', TRUE, 'worker', 0),
    ('DOC-02', 'PAN Card', TRUE, 'worker', 1),
    ('DOC-03', 'UAN Card', TRUE, 'worker', 2),
    ('DOC-04', 'ESIC Copy', TRUE, 'worker', 3),
    ('DOC-05', 'Cheque/Passbook Copy', TRUE, 'worker', 4),
    ('DOC-06', 'Educational certificate', TRUE, 'worker', 5),
    ('DOC-07', 'Medical Certificate', TRUE, 'worker', 6),
    ('DOC-08', 'BOCW Card', FALSE, 'worker', 7),
    ('DOC-09', 'ESIC Card', FALSE, 'worker', 8),
    ('DOC-10', 'Photo', FALSE, 'worker', 9),
    ('DOC-11', 'TIC Card', TRUE, 'worker', 10),
    ('DOC-12', 'Signature', FALSE, 'worker', 11),
    ('DOC-13', 'Temporary Gate Pass', TRUE, 'system', 12),
    ('DOC-14', 'Permanent Gate Pass', TRUE, 'system', 13);

COMMIT;
