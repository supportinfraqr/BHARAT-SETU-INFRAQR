/**
 * BSS Central Taxonomy Reference
 * Extracted and normalized from BSS_Final_worker_form_and_permission.xlsx
 * This serves as the single source of truth for all form dropdowns and UI classifications.
 */

export const BssTaxonomies = {
  // --- IDENTIFICATION & DEMOGRAPHICS ---
  Gender: [
    "Male",
    "Female",
    "Transgender",
    "Other",
    "Prefer not to say"
  ],
  MaritalStatus: [
    "Single",
    "Married",
    "Widowed",
    "Divorced",
    "Separated",
    "Other"
  ],
  Religion: [
    "Hindu",
    "Muslim",
    "Christian",
    "Sikh",
    "Buddhist",
    "Jain",
    "Other",
    "Prefer not to say"
  ],
  SocialCategory: [
    "General",
    "OBC",
    "SC",
    "ST",
    "Other"
  ],
  BloodGroup: [
    "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Unknown"
  ],
  HighestQualification: [
    "No formal education",
    "Primary",
    "Secondary",
    "Higher Secondary",
    "ITI",
    "Diploma",
    "Graduate",
    "Post Graduate",
    "Professional",
    "Other"
  ],

  // --- EMPLOYMENT & CATEGORIZATION ---
  Sector: [
    "Construction",
    "Manufacturing",
    "Agriculture",
    "Logistics",
    "Healthcare",
    "Hospitality",
    "Domestic Work",
    "Retail",
    "Other"
  ],
  Industry: [
    "Infrastructure",
    "Real Estate",
    "Automotive",
    "Textiles",
    "FMCG",
    "Other"
  ],
  WorkerCategory: [
    "Organised Worker",
    "Unorganised Worker",
    "Contract Worker",
    "Migrant Worker",
    "Construction Worker",
    "Gig Worker",
    "Platform Worker",
    "Self-Employed",
    "Home-Based Worker",
    "Domestic Worker",
    "Agricultural Worker",
    "Street Vendor",
    "Apprentice/Trainee",
    "Fixed-Term Worker",
    "Casual Worker",
    "Daily Wage Worker",
    "Seasonal Worker",
    "Part-Time Worker",
    "Other"
  ],
  EmploymentStatus: [
    "Employed",
    "Self-employed",
    "Gig active",
    "Temporarily unemployed",
    "Seeking employment",
    "Seasonal",
    "Retired",
    "Not currently working"
  ],
  EmploymentRelationship: [
    "Employee",
    "Contractor-employed",
    "Sub-contractor-employed",
    "Self-employed",
    "Directly engaged",
    "Platform-mediated",
    "Family enterprise",
    "Apprenticeship",
    "Other"
  ],
  MigrationType: [
    "Inter-state",
    "Intra-state",
    "International"
  ],
  Shift: [
    "General",
    "A",
    "B",
    "C",
    "Rotational",
    "Night",
    "Other"
  ],

  // --- GIG & PLATFORM ---
  PlatformType: [
    "Delivery",
    "Transportation",
    "E-commerce",
    "Home Services",
    "Professional Services",
    "Other"
  ],
  VehicleType: [
    "Two-wheeler",
    "Three-wheeler",
    "Four-wheeler",
    "Other"
  ],
  VehicleOwnership: [
    "Owned",
    "Rented",
    "Leased",
    "Employer/Platform provided",
    "Family Owned",
    "No Vehicle",
    "Other"
  ],

  // --- SKILLS & ASSESSMENT ---
  SkillLevel: [
    "Beginner",
    "Intermediate",
    "Advanced",
    "Expert"
  ],
  DigitalLiteracy: [
    "Basic",
    "Intermediate",
    "Advanced"
  ],
  AssessmentSource: [
    "Not Assessed",
    "Self-Declared",
    "Employer Assessed",
    "Third-Party Assessed",
    "Government/Institution Assessed"
  ],

  // --- VERIFICATION & COMPLIANCE STATUSES ---
  IdentityVerificationStatus: [
    "Not Started",
    "Submitted",
    "API Verified",
    "Manually Verified",
    "Rejected",
    "Expired"
  ],
  BankVerificationStatus: [
    "Not Started",
    "Pending",
    "Verified",
    "Failed"
  ],
  MedicalExaminationStatus: [
    "Not Required",
    "Pending",
    "Completed",
    "Expired"
  ],
  MedicalFitnessStatus: [
    "Fit",
    "Fit with Restrictions",
    "Unfit",
    "Pending"
  ],
  InsuranceStatus: [
    "Not Covered",
    "Covered",
    "Pending",
    "Expired"
  ],
  GatePassStatus: [
    "Not Applied",
    "Applied",
    "Under Verification",
    "Approved",
    "Rejected",
    "Cancelled",
    "Expired"
  ],
  SiteInductionStatus: [
    "Not Started",
    "Scheduled",
    "In Progress",
    "Completed",
    "Not Required",
    "Expired"
  ],

  // --- MISC ---
  NomineeRelationship: [
    "Spouse",
    "Father",
    "Mother",
    "Son",
    "Daughter",
    "Other"
  ],
  PreferredLanguage: [
    "Hindi",
    "English",
    "Bengali",
    "Marathi",
    "Telugu",
    "Tamil",
    "Gujarati",
    "Kannada",
    "Malayalam",
    "Punjabi",
    "Odia",
    "Urdu",
    "Other"
  ],
  PreferredCommunicationChannel: [
    "SMS",
    "WhatsApp",
    "Mobile App",
    "IVR",
    "Email"
  ],
  RegistrationSource: [
    "Worker Self-Service",
    "Contractor",
    "Employer",
    "Government Camp",
    "CSC",
    "Field Officer",
    "QR Registration",
    "API",
    "Other"
  ]
};

export type TaxonomyType = keyof typeof BssTaxonomies;
