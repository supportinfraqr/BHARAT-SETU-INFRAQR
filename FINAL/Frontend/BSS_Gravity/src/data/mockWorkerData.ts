export const mockWorker = {
  identity: {
    name: "Ravi Kumar",
    bssId: "BSS234567890124",
    category: "Construction Worker",
    aadhaarVerified: true,
    panVerified: false,
    photoUrl: "/worker-profile.png",
    dob: "15/08/1990",
    gender: "Male",
    placeOfBirth: "Rampur Village, Patna, Bihar"
  },
  employment: {
    status: "Active",
    employer: "Larsen & Toubro",
    contractor: "RK Buildcon Pvt. Ltd.",
    site: "Mumbai Metro Line 3",
    department: "Civil",
    designation: "Sr. Bar Bender",
    doj: "2024-08-12",
    shift: "General"
  },
  compliance: {
    siteInduction: true,
    ppeIssued: ["Helmet", "Boots"],
    policeVerification: "Under Process",
    permanentGatePass: "Pending Approval",
    medicalFitnessDaysLeft: 5
  },
  skills: {
    primary: { name: "Bar Bending (Rebar)", level: "Expert", experienceYears: 8 },
    secondary: ["Basic Masonry"],
    certification: { name: "NSDC Level 4", verified: true }
  },
  socialSecurity: {
    epfoUan: "10092837465",
    esicIp: "5400928172",
    eShramLinked: false,
    bocwRegistered: false
  },
  documents: {
    required: 12,
    uploaded: 4,
    missing: ["PAN Card", "Medical Certificate"]
  },
  rozgarRequests: [
    {
      id: "REQ-001",
      employer: "Shapoorji Pallonji",
      site: "Navi Mumbai Airport",
      status: "Pending Binding Request"
    }
  ],
  grievances: {
    openCount: 1,
    recent: {
      id: "GRV-2024-9123",
      status: "Under Review",
      date: "14 Aug 2024"
    }
  }
};
