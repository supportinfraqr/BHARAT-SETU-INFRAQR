// models/employeeModel.js
const { string } = require('mathjs');
const mongoose = require('mongoose');
const { Schema } = mongoose;

const employeeSchema = new Schema({
    firstName: { type: String, required: true },
    lastName: { type: String },
    salutation: { type: String },
    fatherSpouse: { type: String },
    relation: { type: String },
    displayName: { type: String },
    email: { type: String, required: true },
    uniqueId: { type: String, required: true },
    customId: { type: String },
    dateOfJoining: { type: Date, default: null },
    categoryId: { type: Schema.Types.ObjectId, ref: 'Category' },
    systemUserId: { type: Schema.Types.ObjectId, ref: 'SystemUser' },
    categoryName: { type: String, default: '' },
    employeeType: { type: String, default: '' },
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization' },
    reportingManagerId: { type: Schema.Types.ObjectId, ref: 'Employee' },
    attendancePolicyId: { type: Schema.Types.ObjectId, ref: 'AttendancePolicy' },
    reportingMethodId: { type: Schema.Types.ObjectId, ref: 'ReportingMethod' },
    rehireStatus: { type: String, enum: ['Rehire', 'Bared'] },
    isremote: { type: Boolean, default: false },
    demographics: {
        dob: { type: Date },
        gender: { type: String },
        nationality: { type: String, default: '' },
        religion: { type: String, default: '' },
        qualification: { type: String, default: '' },
        countryOfOrigin: { type: String, default: '' },
        bloodGroup: { type: String, default: '' },
        location: { type: String, default: '' },
    },
    handicappedInfo: {
        handicapped: { type: String, default: '' },
        from: { type: Date, default: '' },
        certificate: { type: String, default: '' },
        disabilityType: { type: String, default: '' },
    },
    nationalID: {
        pan: { type: String, default: '' },
        aadhar: { type: String, default: '' },
        passport: { type: String, default: '' },
        passportValid: { type: Date, default: '' },
        nameInPan: { type: String, default: '' },
        nameInAadhaar: { type: String, default: '' },
        nameInPassport: { type: String, default: '' }
    },
    phone: {
        mobile: { type: String, default: '' },
        home: { type: String, default: '' }
    },
    photoUrl: { type: String, default: '' },
    presentAddress: {
        address: { type: String, default: '' },
        street: { type: String, default: '' },
        city: { type: String, default: '' },
        state: { type: String, default: '' },
        pin: { type: String, default: '' },
        country: { type: String, default: '' }
    },
    permanentAddress: {
        address: { type: String, default: '' },
        street: { type: String, default: '' },
        city: { type: String, default: '' },
        state: { type: String, default: '' },
        pin: { type: String, default: '' },
        country: { type: String, default: '' }
    },
    maritalInfo: {
        status: { type: String, default: '' },
        spouseName: { type: String, default: '' },
        anniversary: { type: String, default: '' },
        numberOfChildren: { type: String, default: '' },
    },
    emergencyContact: {
        name: { type: String, default: '' },
        mobilePhone: { type: String, default: '' },
        homePhone: { type: String, default: '' },
        informToAddress: { type: String, default: '' },
        bloodGroup: { type: String, default: '' },
        informToRelation: { type: String, default: '' },

    },
    identificationDocument: [
        {
            name: { type: String },
            url: { type: String },
        }
    ],
    // onboarding: {
    //     grade: { type: String },
    //     BGV: { type: String },
    //     BGVtype: [],
    //     jobPortalName: { type: String },
    //     internalReferenceName: { type: String },
    //     recruitmentConsultant: { type: String },
    //     adCost: { type: String },
    //     adAgencyName: { type: String },
    //     costOfMedia: { type: String },
    //     nameOfMedia: { type: String },
    //     costOfOther: { type: String },
    //     nameOfOther: { type: String },
    // },


    onboarding: {
        grade: { type: String },
        BGVtype: [String],
        BGVagency: { type: String },

        // 🔹 HIRING SOURCE DETAILS
        hiringSource: {
            jobPortal: {
                isSelected: { type: Boolean, default: false },
                portalName: { type: String, default: '' },
                portalCost: { type: Number, default: 0 }
            },
            internalReference: {
                isSelected: { type: Boolean, default: false },
                referenceName: { type: String, default: '' },
                referenceCost: { type: Number, default: 0 }
            },
            recruitmentConsultant: {
                isSelected: { type: Boolean, default: false },
                consultantName: { type: String, default: '' },
                consultantCost: { type: Number, default: 0 }
            },
            advertisement: {
                isSelected: { type: Boolean, default: false },
                adName: { type: String, default: '' },
                adCost: { type: Number, default: 0 }
            },
            media: {
                isSelected: { type: Boolean, default: false },
                mediaName: { type: String, default: '' },
                mediaCost: { type: Number, default: 0 }
            }
        }
    },


    jobTitle: { type: String, default: '' },
    loginLocked: { type: Boolean, default: false },
    status: { type: String, enum: ['Active', 'Inactive', 'Probation'], default: 'Active' },
    exitData: {
        exitStatus: {
            type: String,
            enum: [
                'Absconding',
                'AWOL',
                'Contract Expiry',
                'Deported',
                'Expired (Death)',
                'Resigned',
                'Retired',
                'Permanent Disability',
                'Termination',
                'Superannuation',
                'Cessation',
                'Abandonment',
                'Misconduct',
                'Poor Performance',
                'Others',
                ''
            ],
            default: ''
        },
        date: { type: Date, default: null },
        reason: { type: String, default: '' },
        authorizedBy: { type: Schema.Types.ObjectId, ref: 'Employee', default: null },
        // ✅ NEW FIELD ADDED
        lastWorkingDay: {
            type: Date,
            default: null
        },
    },
    probationTime: {
        startDate: { type: Date, default: null },
        endDate: { type: Date, default: null },
        completed: { type: Boolean, default: null },
    },
    activationString: { type: String, default: '' },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', default: null },
    positionsId: { type: Schema.Types.ObjectId, ref: 'Position', default: null },
    shiftId: { type: Schema.Types.ObjectId, ref: 'Shift', default: null },
    reportingMethodId: { type: Schema.Types.ObjectId, ref: 'ReportingMethod', default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: 'SystemUser', default: null },

    // ⚠️ OPTIONAL: Old salary structure system (not actively used in new payroll)
    // salaryStructureId: { type: Schema.Types.ObjectId, ref: 'SalaryStructure' },

    /* -------------------------------------------
      🔻 PAYROLL INFORMATION (Primary salary data)
      ------------------------------------------- */
    payrollInfo: {
        baseSalary: { type: Number, default: 0 },           // Base/Basic salary
        grossSalary: { type: Number, default: 0 },          // Gross salary (before deductions)
        ctc: { type: Number, default: 0 }, paymentFrequency: {
            type: String,
            enum: ['Monthly', 'Bi-Weekly', 'Weekly'],
            default: 'Monthly'
        },
        currency: { type: String, default: 'INR' },         // INR, USD, EUR
        taxRegime: {
            type: String,
            enum: ['Old', 'New'],
            default: 'New'
        },
        variablePay: { type: Number, default: 0 },
        incentives: { type: Number, default: 0 },
        salaryEffectiveFrom: { type: Date, default: null },
        componentOverrides: [
            {
                category: {
                    type: String,
                    enum: ['earnings', 'deductions', 'benefits', 'reimbursements'],
                },
                code: { type: String, trim: true, default: '' },
                name: { type: String, trim: true, default: '' },
                overrideAmount: { type: Number, default: null },
                disabled: { type: Boolean, default: false },
            },
        ],
        // Components whose Excel column was missing — saved with org default amounts
        defaultComponents: [
            {
                category: {
                    type: String,
                    enum: ['earnings', 'deductions', 'benefits', 'reimbursements'],
                },
                code: { type: String, trim: true, default: '' },
                name: { type: String, trim: true, default: '' },
                componentName: { type: String, trim: true, default: '' },
                amount: { type: Number, default: 0 },
            },
        ],
    },

    payrollPreferences: {
        holdSalary: { type: Boolean, default: false },
        holdReason: { type: String, default: '' },
        loanDeduction: { type: Number, default: 0 },
        advanceDeduction: { type: Number, default: 0 },
        vpf: {
            enabled: { type: Boolean, default: false },
            contributionType: {
                type: String,
                enum: ['percentage', 'fixed'],
                default: 'percentage',
            },
            percentage: { type: Number, default: 0 },
            fixedAmount: { type: Number, default: 0 },
            status: {
                type: String,
                enum: ['none', 'pending', 'active', 'stopped'],
                default: 'none',
            },
            acknowledged: { type: Boolean, default: false },
            requestedAt: { type: Date, default: null },
            effectiveFrom: { type: Date, default: null },
        },
        paymentMode: {
            type: String,
            enum: ['Bank Transfer', 'Cheque', 'Cash'],
            default: 'Bank Transfer'
        },
    },

    taxInfo: {
        taxDeclarationSubmitted: { type: Boolean, default: false },
        taxDeclarationYear: { type: String, default: '' },
        investmentProofSubmitted: { type: Boolean, default: false },
        investmentProofYear: { type: String, default: '' },
        estimatedTaxLiability: { type: Number, default: 0 },
        tdsDeducted: { type: Number, default: 0 },
    },

    /* -------------------------------------------
      🔻 NEW FIELDS FOR JOINING FORM (ADDED LAST)
      ------------------------------------------- */

    // Personal Info – International Employee toggle
    isInternationalEmployee: { type: Boolean, default: false },

    // Previous Employment (tab)
    previousEmployment: [
        {
            companyName: { type: String, default: '' },
            designation: { type: String, default: '' },
            fromDate: { type: Date, default: null },
            toDate: { type: Date, default: null },
            companyAddress: { type: String, default: '' },
            rolesAndResponsibilities: { type: String, default: '' },
            lastDrawnSalary: { type: Number, default: 0 },
            reasonForLeaving: { type: String, default: '' },
        }
    ],

    // Accounts & Statutory (tab)
    bankInfo: {
        bankCountry: { type: String, default: '' },
        bankCode: { type: String, default: '' },
        bankName: { type: String, default: '' },             // "HDFC Bank", "SBI"
        branchName: { type: String, default: '' },
        ifscCode: { type: String, default: '' },             // HDFC0001234
        swiftCode: { type: String, default: '' },            // For international employees
        bankAccountNumber: { type: String, default: '' },
        confirmBankAccountNumber: { type: String, default: '' }, // mainly UI support
        accountHolderName: { type: String, default: '' },    // Name as per bank account
        accountType: { type: String, default: '' },          // Savings, Current
        isVerified: { type: Boolean, default: false },       // Bank account verification status
        verifiedOn: { type: Date, default: null }
    },

    statutoryInfo: {
        pfAccountNumber: { type: String, default: '' },
        uan: { type: String, default: '' },
        esiNumber: { type: String, default: '' },            // ESI number
        esiApplicable: { type: Boolean, default: true },     // Follow org ESI unless opted out
        esiOptedOut: { type: Boolean, default: false },      // Explicit per-employee ESI opt-out
        ptApplicable: { type: Boolean, default: false },     // Professional Tax applicable
        ptState: { type: String, default: '' },              // State for PT calculation
        gratuityApplicable: { type: Boolean, default: false },
        lwfApplicable: { type: Boolean, default: true },     // Labour Welfare Fund
        lwfState: { type: String, default: '' },             // State for LWF calc; falls back to ptState
        employmentCategory: {
            type: String,
            enum: ['', 'skilled', 'semiSkilled', 'unskilled'],
            default: '',
        },                                                   // Skilled / Semi Skilled / Unskilled for statutory bonus min wage

        // Per-employee EPF override (honored only when org allowEmployeeLevelOverride=true)
        epfOverride: {
            enabled: { type: Boolean, default: false },
            employeeContributionRate: { type: Number, default: null },   // null = use org default
            employerContributionRate: { type: Number, default: null },
            restrictedPfWage: { type: Number, default: null },           // null = use org default
            applyCeiling: { type: Boolean, default: true },              // false = no ceiling for this employee
        },
        // Per-employee EPF applicability toggle
        epfApplicable: { type: Boolean, default: true },
    },

    //Qualification Details (tab) – multiple qualifications
    qualificationInfo: [
        {
            fromYear: { type: String },
            toYear: { type: String },
            institute: { type: String }
        }
    ],

    // Family Details (tab) – multiple family members
    familyDetails: [
        {
            name: { type: String, default: '' },
            gender: { type: String, default: '' },
            relationship: { type: String, default: '' },
            dob: { type: Date, default: null },
            bloodGroup: { type: String, default: '' },
            nationality: { type: String, default: '' },
            isMinor: { type: Boolean, default: false },
            backgroundVerificationConsent: { type: Boolean, default: false },
            mentalIllness: { type: Boolean, default: false },
        }
    ],

    // Nomination Details (tab)
    nominationInfo: {
        epfNominees: [
            {
                nomineeName: { type: String, default: '' },
                nominationPercentage: { type: Number, default: 0 },
            }
        ],
        epsNominees: [
            {
                nomineeName: { type: String, default: '' },
                nominationPercentage: { type: Number, default: 0 },
            }
        ],
        esiNominees: [
            {
                nomineeName: { type: String, default: '' },
                nominationPercentage: { type: Number, default: 0 },
            }
        ],
        gratuityNominees: [
            {
                nomineeName: { type: String, default: '' },
                nominationPercentage: { type: Number, default: 0 },
            }
        ],
    },

    //Joining Form Documents
    // -------------------------
    // Joining form documents
    // -------------------------
    joiningDocuments: [
        {
            fieldName: { type: String },            // category: permanentAddressProof, aadhaar, passport, salarySlip...
            url: { type: String },                  // Cloud upload URL
            fileName: { type: String, default: '' },
            mimeType: { type: String, default: '' },
            size: { type: Number, default: 0 },
            uploadedAt: { type: Date, default: Date.now },
        }
    ],
    reportingMethodId: {
        type: Schema.Types.ObjectId,
        ref: 'ReportingMethod'
    },

    // 🎯 CANDIDATE JOINING STATUS
    candidateJoiningStatus: {
        type: String,
        enum: ['Pending', 'Approved', 'Rejected', 'Joined', 'OnHold', 'Withdrawn'],
        default: 'Approved'
    }

},


    {
        timestamps: true,
    });

// Export the model
module.exports = employeeSchema;