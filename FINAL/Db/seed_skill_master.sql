-- =============================================================================
-- Bharat Shram Setu (BSS) — Skill Master seed
-- Generated from 'Skill Master' sheet of the source workbook: 45 skills
-- Coded taxonomy (S01-S45) for skill reference data.
-- Regenerate with: python3 generate_seed_rbac.py
-- =============================================================================

BEGIN;

INSERT INTO skill_master (code, sector, family, occupation, typical_level, industry_use, description, sort_order) VALUES

    ('S01', 'Construction', 'Masonry', 'Brick Mason', 'Skilled', 'Building construction', 'Masonry, brickwork, blockwork', 0),
    ('S02', 'Construction', 'Carpentry', 'Carpenter', 'Skilled', 'Building/industrial construction', 'Shuttering, furniture, structural carpentry', 1),
    ('S03', 'Construction', 'Rebar', 'Bar Bender / Steel Fixer', 'Skilled', 'Construction', 'Rebar cutting, bending and fixing', 2),
    ('S04', 'Construction', 'Scaffolding', 'Scaffolder', 'Skilled', 'Construction', 'Scaffold erection and dismantling', 3),
    ('S05', 'Construction', 'Painting', 'Painter', 'Semi-skilled', 'Construction/facilities', 'Surface preparation, painting', 4),
    ('S06', 'Construction', 'Plumbing', 'Plumber', 'Skilled', 'Construction/facilities', 'Piping, fixtures, maintenance', 5),
    ('S07', 'Electrical', 'Electrical', 'Electrician', 'Skilled', 'Industrial/building', 'Wiring, panels, maintenance', 6),
    ('S08', 'Electrical', 'Electrical', 'Electrical Helper', 'Semi-skilled', 'Industrial/building', 'Electrical assistance', 7),
    ('S09', 'Mechanical', 'Fitting', 'Fitter', 'Skilled', 'Manufacturing/maintenance', 'Assembly, fitting, maintenance', 8),
    ('S10', 'Mechanical', 'Welding', 'Welder', 'Skilled', 'Manufacturing/construction', 'Arc, MIG, TIG, gas welding', 9),
    ('S11', 'Mechanical', 'Machining', 'Machinist', 'Skilled', 'Manufacturing', 'Machine operation and precision work', 10),
    ('S12', 'Mechanical', 'Fabrication', 'Fabricator', 'Skilled', 'Manufacturing/construction', 'Metal fabrication', 11),
    ('S13', 'Manufacturing', 'Machine Operation', 'Machine Operator', 'Semi-skilled', 'Factory/production', 'Machine setup and operation', 12),
    ('S14', 'Manufacturing', 'Production', 'Production Operator', 'Semi-skilled', 'Manufacturing', 'Assembly/production operations', 13),
    ('S15', 'Manufacturing', 'Quality', 'Quality Inspector', 'Skilled', 'Manufacturing', 'Inspection, measurement, quality checks', 14),
    ('S16', 'Logistics', 'Driving', 'Light Motor Vehicle Driver', 'Skilled', 'Transport/logistics', 'LMV driving', 15),
    ('S17', 'Logistics', 'Driving', 'Heavy Motor Vehicle Driver', 'Skilled', 'Transport/logistics', 'HMV/truck/bus driving', 16),
    ('S18', 'Logistics', 'Warehouse', 'Warehouse Operator', 'Semi-skilled', 'Logistics', 'Picking, packing, inventory handling', 17),
    ('S19', 'Logistics', 'Material Handling', 'Forklift Operator', 'Skilled', 'Warehouse/factory', 'Forklift operation', 18),
    ('S20', 'Services', 'Housekeeping', 'Housekeeping Worker', 'Semi-skilled', 'Facilities/hospitality', 'Cleaning and housekeeping', 19),
    ('S21', 'Services', 'Food Services', 'Cook / Chef', 'Skilled', 'Hospitality/household', 'Food preparation', 20),
    ('S22', 'Services', 'Care', 'Care Worker', 'Semi-skilled', 'Household/healthcare', 'Elderly/child/patient support', 21),
    ('S23', 'Services', 'Security', 'Security Guard', 'Semi-skilled', 'Security/facilities', 'Security, access control', 22),
    ('S24', 'Retail', 'Sales', 'Sales Worker', 'Semi-skilled', 'Retail/services', 'Customer service and sales', 23),
    ('S25', 'Retail', 'Cashier', 'Cashier', 'Semi-skilled', 'Retail/services', 'Billing and cash handling', 24),
    ('S26', 'Agriculture', 'Crop Production', 'Farm Worker', 'Semi-skilled', 'Agriculture', 'Sowing, harvesting, farm work', 25),
    ('S27', 'Agriculture', 'Horticulture', 'Gardener / Horticulture Worker', 'Semi-skilled', 'Agriculture/landscaping', 'Plant care, landscaping', 26),
    ('S28', 'Agriculture', 'Livestock', 'Livestock Worker', 'Semi-skilled', 'Agriculture', 'Animal care and husbandry', 27),
    ('S29', 'Digital', 'IT Support', 'Computer / IT Support', 'Skilled', 'IT/services', 'Hardware/software support', 28),
    ('S30', 'Digital', 'Data', 'Data Entry Operator', 'Semi-skilled', 'Offices/services', 'Data entry and digital records', 29),
    ('S31', 'Digital', 'Platform Services', 'Gig/Platform Service Worker', 'Variable', 'Platform economy', 'Digital task/service delivery', 30),
    ('S32', 'Artisan', 'Handicraft', 'Handicraft Artisan', 'Skilled', 'Handicraft/cottage industry', 'Traditional/artisan production', 31),
    ('S33', 'Artisan', 'Tailoring', 'Tailor', 'Skilled', 'Garment/home-based', 'Cutting, stitching, alterations', 32),
    ('S34', 'Artisan', 'Footwear', 'Cobbler / Footwear Worker', 'Skilled', 'Artisan/retail', 'Footwear making/repair', 33),
    ('S35', 'Beauty & Wellness', 'Beauty', 'Beautician', 'Skilled', 'Salon/wellness', 'Beauty services', 34),
    ('S36', 'Beauty & Wellness', 'Hair', 'Barber / Hairdresser', 'Skilled', 'Salon/services', 'Hair and grooming services', 35),
    ('S37', 'Repair', 'Automotive', 'Mechanic', 'Skilled', 'Automotive/workshop', 'Vehicle repair and maintenance', 36),
    ('S38', 'Repair', 'Electronics', 'Electronics Repair Technician', 'Skilled', 'Repair/services', 'Electronic equipment repair', 37),
    ('S39', 'Safety', 'Fire & Safety', 'Fire & Safety Worker', 'Skilled', 'Industrial/facilities', 'Fire prevention, emergency response', 38),
    ('S40', 'Healthcare', 'Healthcare Support', 'Healthcare Assistant', 'Semi-skilled', 'Healthcare', 'Patient support', 39),
    ('S41', 'Green Jobs', 'Waste Management', 'Waste Collection Worker', 'Semi-skilled', 'Municipal/waste management', 'Collection, segregation', 40),
    ('S42', 'Green Jobs', 'Recycling', 'Recycling Worker', 'Semi-skilled', 'Waste/recycling', 'Sorting and recycling', 41),
    ('S43', 'Transport', 'Delivery', 'Delivery Worker', 'Semi-skilled', 'Gig/platform/logistics', 'Last-mile delivery', 42),
    ('S44', 'Transport', 'Ride Services', 'Driver Partner', 'Skilled', 'Gig/platform', 'Passenger transport', 43),
    ('S45', 'Other', 'General Labour', 'General Worker / Helper', 'Entry-level', 'Multiple sectors', 'General assistance/manual work', 44);

COMMIT;
