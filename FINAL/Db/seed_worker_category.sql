-- =============================================================================
-- Bharat Shram Setu (BSS) — Worker Category Master seed
-- Generated from 'Worker Categories' sheet of the source workbook: 20 categories
-- Coded taxonomy (W01-W20) for worker_classification.worker_category.
-- Regenerate with: python3 generate_seed_rbac.py
-- =============================================================================

BEGIN;

INSERT INTO worker_category_master (code, name, definition, typical_workplaces, primary_relationship, data_focus, sort_order) VALUES

    ('W01', 'Organised Worker', 'Worker employed by a registered/formal establishment with a defined employer-employee relationship.', 'Factory, company, office, institution, registered establishment', 'Employer', 'Payroll/HR, attendance, PF/ESIC where applicable', 0),
    ('W02', 'Contract Worker', 'Worker engaged through a contractor/sub-contractor and deployed at a principal employer/site.', 'Factories, plants, infrastructure, facilities', 'Contractor + Principal Employer', 'Contractor, site, gate pass, deployment, wage/compliance', 1),
    ('W03', 'Unorganised Worker', 'Worker generally outside the formal organised employment structure, including own-account and informal employment.', 'Small businesses, informal services, household enterprises', 'Worker / Informal Employer', 'Occupation, income pattern, social security and welfare', 2),
    ('W04', 'Migrant Worker', 'Worker who moves from native location to another location/state/country for employment or livelihood.', 'Inter-state, intra-state and seasonal work', 'Worker + Employer/Contractor', 'Native address, destination, migration period, portability', 3),
    ('W05', 'Construction Worker', 'Worker engaged in construction/building/infrastructure activities, whether directly or through contractor.', 'Construction sites, infrastructure projects', 'Employer/Contractor', 'BOCW registration, skill, safety, site deployment', 4),
    ('W06', 'Gig Worker', 'Person earning from work outside a traditional employer-employee relationship, generally on a task/assignment basis.', 'Delivery, transport, home services, digital marketplaces', 'Platform / Worker', 'Platform, tasks, earnings pattern, insurance/welfare', 5),
    ('W07', 'Platform Worker', 'Gig worker who accesses an organisation through an online platform and performs services under that platform arrangement.', 'Ride-hailing, delivery, home services, professional platforms', 'Aggregator/Platform', 'Platform ID, service area, vehicle, work activity', 6),
    ('W08', 'Self-Employed Worker', 'Person working for own account and generating livelihood without a conventional employer.', 'Shop, trade, professional service, artisan activity', 'Self', 'Business/occupation, skills, location, income band', 7),
    ('W09', 'Home-Based Worker', 'Worker carrying out paid work from home or own premises, often for an enterprise/intermediary or own account.', 'Garments, handicrafts, packaging, food processing', 'Worker / Enterprise', 'Work type, intermediary, home-work location', 8),
    ('W10', 'Domestic Worker', 'Worker providing household services such as cooking, cleaning, childcare, driving or care services.', 'Private households', 'Household Employer', 'Employer household, work type, hours, wages', 9),
    ('W11', 'Agricultural Worker', 'Worker engaged in crop, livestock, horticulture, plantation or allied agricultural activities.', 'Farms, plantations, dairy, fisheries and allied work', 'Farmer/Contractor/Worker', 'Occupation, seasonality, land/work type', 10),
    ('W12', 'Street Vendor', 'Worker selling goods/services in streets, markets, carts, kiosks or other public spaces.', 'Urban/rural markets and public places', 'Self / Local Authority', 'Vendor activity, location, certificate/registration', 11),
    ('W13', 'Apprentice / Trainee', 'Person undergoing structured practical training/apprenticeship with an establishment or training provider.', 'Factories, companies, workshops, institutions', 'Employer/Training Provider', 'Trade, training period, institute, certification', 12),
    ('W14', 'Fixed-Term Worker', 'Worker directly engaged for a specified period under a fixed-term arrangement.', 'Factories, services, projects', 'Employer', 'Contract dates, role, benefits, status', 13),
    ('W15', 'Casual / Daily Wage Worker', 'Worker engaged on a short-term, intermittent or day-to-day basis.', 'Construction, agriculture, logistics, local services', 'Employer/Contractor', 'Daily engagement, occupation, wage basis', 14),
    ('W16', 'Seasonal Worker', 'Worker whose employment is concentrated in a particular season or recurring period.', 'Agriculture, tourism, processing, construction', 'Employer/Contractor', 'Season, work location, engagement period', 15),
    ('W17', 'Part-Time Worker', 'Worker who works fewer hours than the normal full-time arrangement.', 'Retail, services, domestic work, education, gig work', 'Employer / Worker', 'Hours, days, role, wage basis', 16),
    ('W18', 'Casual Platform / Task Worker', 'Worker accepting individual assignments/tasks through a digital or non-digital intermediary without regular employment.', 'Task marketplaces, local aggregators', 'Platform/Intermediary', 'Task type, platform/intermediary, frequency', 17),
    ('W19', 'Family Enterprise Worker', 'Person contributing to a family-operated enterprise, farm, shop or business.', 'Family business, agriculture, trade', 'Family Enterprise', 'Role, enterprise type, hours, skills', 18),
    ('W20', 'Other / Emerging Worker', 'Worker category not adequately captured by existing categories; retained for future workforce models.', 'Emerging forms of work', 'As applicable', 'Requires classification review', 19);

COMMIT;
