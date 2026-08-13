using System;

namespace BAL
{
    public class tblMasters
    {
        public int Action { get; set; }
        public float ParentId { get; set; }
        public int Id { get; set; }
        public string Name { get; set; }
        public int PartyTypeId { get; set; }
    }
    public class StoreStatusList
    {
        public string isActive { get; set; }
        public string[] selectedStores { get; set; }


    }

    public class RetailBAL 
    {
        //--------------Mailing
        public string GatePassDays { get; set; }
        public string GatePassType { get; set; }
        public string MobileNo { get; set; }
        public string CurrentStep { get; set; }
        public string JsonData { get; set; }
        public string GId { get; set; }
        
        public string Reaction { get; set; }
        public string LoginId { get; set; }
        public string AiText { get; set; } 
        public string AudioFileName { get; set; }
        public string Documents { get; set; }
        public string GeneralDate { get; set; }
        public string SignatoryName { get; set; }
        public string SignatoryDesignation { get; set; }
        public string AgencyName { get; set; }
        public string RegisteredAddress { get; set; }
        public string CorporateAddress { get; set; }
        public string ContactPerson { get; set; }
        public string Designation { get; set; }
        public string Mobile { get; set; }
        public string Email { get; set; }
        public string Website { get; set; } 
        public string Organization { get; set; }

        // here is new
        public string LIN { get; set; }
        public string ReContactPerson { get; set; }
        public string ReDesignation { get; set; }
        public string ReMobile { get; set; }
        public string ReEmail { get; set; }
        public string nameofeshtablishment { get; set; }
        public string typeofeshtablishment { get; set; }
        public string validupto { get; set; }

        //---------------- Step 2 : Statutory ----------------
        public string PanNo { get; set; }
        public string Tan { get; set; }
        public string GSTIN { get; set; }
        public string CIN { get; set; }
        public string SHOPREGI { get; set; }
        public string MSME { get; set; }
        public string EPFREGNO { get; set; }
        public string ESICREGNO { get; set; }
        public string ProfessionalREGNO { get; set; }
        public string LabourREGNO { get; set; }
        public string ContractREGNO { get; set; }
        public string LabourLicenseNO { get; set; }
        public string LicenseValidity { get; set; }
        public string LicenseEmployeeCount { get; set; }

        //---------------- Step 4 : Bank ----------------
        public string BankName { get; set; }
        public string AccountNumber { get; set; }
        public string IFSCCode { get; set; }
        public string CancelledCheque { get; set; }

        //---------------- Step 5 : Business Info ----------------
        public string Service { get; set; }
        public string Industries { get; set; }
        public string TotalEmployees { get; set; }
        public string OperationalLocations { get; set; }

        //---------------- Step 6 : Experience ----------------
        public string YearsOfExperience { get; set; }
        public string KeyClients { get; set; }
        public string SimilarContracts { get; set; }

        //---------------- Files (1–21) ----------------
     
        public string File4 { get; set; }
        public string File5 { get; set; }
        public string File6 { get; set; }
        public string File7 { get; set; }
        public string File8 { get; set; }
        public string File9 { get; set; }
        public string File10 { get; set; }
        public string File11 { get; set; }
        public string File12 { get; set; }
        public string File13 { get; set; }
        public string File14 { get; set; }
        public string File15 { get; set; }
        public string File16 { get; set; }
        public string File17 { get; set; }
        public string File18 { get; set; }
        public string File19 { get; set; }
        public string File20 { get; set; }
        public string File21 { get; set; }
		public string file22 { get; set; }  // added new
        public string file23 { get; set; } // added new
        public string file24 { get; set; } // added new
        public string Country { get; set; } // added new
        public string City { get; set; } // added new
        public string Pincode { get; set; } // added new

        //---------------- Reference 1 ----------------
        public string NameOrganization1 { get; set; }
        public string ServiceType1 { get; set; }
        public string ConcernPerson1 { get; set; }
        public string Designation1 { get; set; }
        public string MobileNo1 { get; set; }
        public string EmailId1 { get; set; }

        //---------------- Reference 2 ----------------
        public string NameOrganization2 { get; set; }
        public string ServiceType2 { get; set; }
        public string ConcernPerson2 { get; set; }
        public string Designation2 { get; set; }
        public string MobileNo2 { get; set; }
        public string EmailId2 { get; set; }

        //---------------- Reference 3 ----------------
        public string NameOrganization3 { get; set; }
        public string ServiceType3 { get; set; }
        public string ConcernPerson3 { get; set; }
        public string Designation3 { get; set; }
        public string MobileNo3 { get; set; }
        public string EmailId3 { get; set; } 
    //------

    public string CSIID { get; set; }
        public string StoreId { get; set; }
        public string TemplateName { get; set; }
        public string Subject { get; set; } 
        public string Detail { get; set; }
        public string To { get; set; }
        public string BCC { get; set; }
      
        public string CC { get; set; }
        public string Mailformat { get; set; }
        public string MailFor { get; set; }
        public string TemplateId { get; set; }
        //--------------end Mailing


        public string Entity { get; set; }
        public string Unit { get; set; }
        public string Area { get; set; }
        public string ComplianceClassification { get; set; }
        public string SubClassification { get; set; }
        public string AdditionalInformation { get; set; }
        public string ProofOfCompliance { get; set; }
        public string Categorization { get; set; }
        public string ComplianceHeader { get; set; }
        public string PenaltyType { get; set; }
        public string PenaltyDescription { get; set; }
        public string StatutoryAuthority { get; set; }
        public string EventName { get; set; }
        public string EventApplicability { get; set; }
        public string PageName { get; set; }
        public string DetailedCompliance { get; set; }
        public string ImpactEmployer { get; set; }
        public string FundingType { get; set; }
        public string EntityType { get; set; }
        public string ListedStatus { get; set; }
        public string StockExchange { get; set; }
        public string FundingStatus { get; set; }
        public string CompanyCategory { get; set; }
        public string Applicability { get; set; }
        public string Forms { get; set; }
        public string currDate { get; set; }
        public string currentYear { get; set; }
        public string currentMonth { get; set; }
        public string PageSize { get; set; }
        public string PageNumber { get; set; }
        public string Searchby { get; set; }
        public string Boardingtype { get; set; }
        public string Action { get; set; }
        public string Id { get; set; }
        public string State { get; set; }
        public string Act { get; set; }
        public string Constitution { get; set; }
        public string Department { get; set; }
        public string Month { get; set; }
        public string Year { get; set; }
        public string Frequency { get; set; }
        public string Ministry { get; set; }
        public string ComplianceName { get; set; }
        public string Calendartype { get; set; }
        public string Risk { get; set; }
        public string ComplianceType { get; set; }
        public string Description { get; set; }
        public string DueDate { get; set; }
        public string UploadFile { get; set; }
        public string Industry { get; set; }
        public string ActOverview { get; set; }
        public string ClientId { get; set; }
        public string UserId { get; set; }

        public string ASD { get; set; }
        public string CSD { get; set; }
        public string DelayDay { get; set; } 
        public string CACId { get; set; }
        public string IndustryList { get; set; }
        public string excelFile { get; set; }

        public string Rule { get; set; }
        public string Section { get; set; }

        public string RegNo { get; set; }
        
        public string ActFile { get; set; }
        public string RuleFile { get; set; }
        public string selectedCategory { get; set; }
        public string selectedSubcategory { get; set; }
        public string DueDay { get; set; }
        public string Expire { get; set; }
        public string ComplianceLevel { get; set; }
        public string ActId { get; set; }
        public string Compliance { get; set; }
        public string Category { get; set; }
        public string SubCategory { get; set; }
        public string Status { get; set; }

        public string CaseID { get; set; }
        public string CaseCode { get; set; }
        public string CaseTitle { get; set; }
        public string CaseType { get; set; }
        public string ForumCourtName { get; set; }
        public string CaseNumber { get; set; }
        public string FilingDate { get; set; }
            public string OppositionParty { get; set; }
            public string AdvocateOrLegalCounsel { get; set; }
            public string ExternalFirm { get; set; }
            public string ExternalFirmName { get; set; }
            public string SeniorRepName { get; set; }
            public string SeniorRepMobile { get; set; }
            public string SeniorRepEmail { get; set; }
            public string JuniorRepName { get; set; }
            public string JuniorRepMobile { get; set; }
            public string JuniorRepEmail { get; set; }
            public string ExternalCounselInitialOpinion { get; set; }
            public string Penalities { get; set; }
        public string RepName { get; set; }
        public string Interest { get; set; }
        public string LateFee { get; set; }
        public string Fines { get; set; }
        public string Other { get; set; }
        public string Probability { get; set; }

        public string RepEmail { get; set; }
        public string RepMobile { get; set; }
            public string InHouseCounselInitialOpinion { get; set; }
            public string FileUploadPath { get; set; }
            public string FileUploadDate { get; set; }
            public string AppealStatus { get; set; }
            public string CreatedOn { get; set; }
            public string Appealby { get; set; }
        public string ACaseStatus { get; set; }

        public string FormNo { get; set; } 

        public string JudgmentCopyPath { get; set; }

        public string JudgmentPassed { get; set; }
        public string JudiciaryName { get; set; }
        public string SummaryOfJudgment { get; set; }
        public string JudgmentTime { get; set; }

        public string ExecutionStatus { get; set; }
        public string PageNo { get; set; }
        public string PageSz { get; set; }
        public string CondonationFiled { get; set; }
        public string CondonationStatus { get; set; }
       
        public string PleadingsType { get; set; }
        public string Note { get; set; }
        public string DateOfFilling { get; set; }
        public string File1 { get; set; }
        public string File2 { get; set; }
        public string File3 { get; set; }
        public string DateOfUpload { get; set; }


        public string Name { get; set; }
        public string ProjectName { get; set; }
        public string SizeCapacity { get; set; }
        public string GovtPrivate { get; set; }
        public string EndUserParty { get; set; }
        public string CommissioningDate { get; set; }
        public string ExecutionDate { get; set; }
        public string AggregatorFees { get; set; }
        public string ActualCost { get; set; }
        public string LandConversion { get; set; }
        public string RegistryValue { get; set; }
        public string Variance { get; set; }
        public string MortgageProperty { get; set; }
        public string Miscellaenous { get; set; }
        public string Createdby { get; set; }
        public string LoanAgreements { get; set; }
        public string MortgageAmount { get; set; }
        public string AnyOtherDetail { get; set; }

        

         public string TechFeasibilityStatus { get; set; }
        public string TechPersonName { get; set; }
        public string GridDistance { get; set; }
        public string GridConnectivity { get; set; }
        public string RightOfWayDistance { get; set; }
        public string RightOfWayFeasibility { get; set; }
        public string ROWPersonName { get; set; }
        public string AccessRoad { get; set; }
        public string VerifierName { get; set; }
        public string SupportingDocsAttached { get; set; }
        public string RoadConstructionStatus { get; set; }
        public string RoadCompletionDate { get; set; }
        public string AdditionalDetails { get; set; }



        public string FarmerName { get; set; }
        public string KhatedarName { get; set; }
        public string Village { get; set; }
        public string KhasraNo { get; set; }
        public string KhatauliNo { get; set; }
        public string AreaAcre { get; set; }
        public string AreaBigah { get; set; }
        public string LandCharge { get; set; }
        public string ChargeAmount { get; set; }
        public string ChargeTenure { get; set; }
        public string ChargeholderName { get; set; }
        public string LandStatus { get; set; }
        public string LandType { get; set; }


        public string RatePerAcre { get; set; }
        public string TotalLandCost { get; set; }
        public string AdvancePaid { get; set; }
        public string LeaseValue { get; set; }
        public string LeaseDuration { get; set; }
        public string LeaseEscalation { get; set; }
        public string ApplicableTDS { get; set; }
        public string SecurityChequeNo { get; set; }
        public string SecurityChequeAmount { get; set; }
        public string TotalAdvanceToFarmers { get; set; }
        public string TotalPaymentToFarmers { get; set; }
        public string PaymentDateToFarmers { get; set; }
        public string RegistrationCharges { get; set; }
        public string StampDutyCharges { get; set; }
        public string StampVendorPayment { get; set; }
        public string MiscExpenses { get; set; }
        public string AdvocateFee { get; set; }
        public string AdvocateName { get; set; }
        public string AdvocateName5 { get; set; }

        

        public string TSRStatus { get; set; }
        public string TSRConductedBy { get; set; }
        public string TSRValidatedByLocalAdvocate { get; set; } 
        public string LocalAdvocateByAggregator { get; set; }
        public string LocalAdvocateByCompany { get; set; }
        public string TSRFeesAggregator { get; set; }
        public string TSRFeesCompany { get; set; }
        public string TSRPaymentDateAggregator { get; set; }
        public string TSRPaymentDateCompany { get; set; }
        public string TSRValidatedByInHouse { get; set; }
        public string TSRValidatedInHousePerson { get; set; }
        public string DocumentsSubmittedToLegal { get; set; }
        public string TermSheetDateAggregator { get; set; }
        public string TermSheetDateOfftaker { get; set; }

        public string DocumentName { get; set; }
        public string DocumentSharingStatus { get; set; }
        public string DocumentRemarks { get; set; }
        public string DocumentSharingDate { get; set; }
        public string DocumentSharingMode { get; set; }


        public string UploadedFilesPaths1 { get; set; }
        public string UploadedFilesPaths2 { get; set; }
        public string UploadedFilesPaths3 { get; set; }
        public string UploadedFilesPaths4 { get; set; }
        public string UploadedFilesPaths5 { get; set; }
        public string UploadedFilesPaths6 { get; set; }
        public string UploadedFilesPaths7 { get; set; }
        public string UploadedFilesPaths8 { get; set; }
        public string UploadedFilesPaths9 { get; set; }
        public string UploadedFilesPaths10 { get; set; }

        public string TotalProjectCost { get; set; }
        public string Debt { get; set; }
        public string ExecutionDateSSHA { get; set; }
        public string LegalEntityName { get; set; }
        public string EquityOffTaker { get; set; }
        public string EquityOPL { get; set; }
        public string ExecutionDatePPA { get; set; }
        public string PartyId { get; set; }


        public string VRemark { get; set; }
        public string CRemark { get; set; }
        public string IsVerified { get; set; }




    }


    public class HearingModel
    {
        public string DateOfHearing { get; set; }
        public string PurposeOfHearing { get; set; }
        public string OutcomeOfHearing { get; set; }
        public string CaseStatus { get; set; }
        public string DateOfUpload { get; set; }
        public string HearingFilePath { get; set; }
        public string HearingFileName { get; set; }
        
      public string CreatedBy { get; set; }
        public string CaseCode { get; set; }
        public string CaseId { get; set; }
        public string Action { get; set; }
    }
    public class JobHistory
    {
        public int id { get; set; }
        public int Action { get; set; }
        public string JobDesignation { get; set; }
        public string JobDepartment { get; set; }
        public string JobIndustry { get; set; }
        public string JobConID { get; set; }
        public string JobConName { get; set; }
        public string JobConEmail { get; set; }
        public string JobEmployerId { get; set; }
        public string JobEmployerName { get; set; }
        public string JobEmployerEmail { get; set; }
        public string JobSiteName { get; set; }
        public string JobSitecode { get; set; }
        public string JobSiteLocation { get; set; }
        public string JobSiteState { get; set; }
        public string JobSdate { get; set; }
        public string Jobendate { get; set; }
        public string JobNatureJob { get; set; }
        public string JobTypeWork { get; set; }
        public string Appointmentletter { get; set; }
        public string Experienceletter { get; set; }
        public string WorkerCode { get; set; }
        public string WorkerName { get; set; }
        public string WorkerMobile { get; set; }
        public string WorkerEmail { get; set; }
        public int Loginid { get; set; }
        public int CreatedBy { get; set; }
        public string JobPFAccount { get; set; }
    }
	
	 public class ReleaseWorker
    {
        public int id { get; set; }
        public int Action { get; set; }
        public string completionProject { get; set; }
        public string completionContract { get; set; }
        public string OtherReason { get; set; }
        public string fixedTerm { get; set; }
        public string resignation { get; set; }
        public string transfer { get; set; }
        public string retirement { get; set; }
        public string LastDate { get; set; }
        public string Settlement { get; set; }
        public string DuesClear { get; set; }
        public string Disciplinary { get; set; }
        public string Rehiring { get; set; }
        public string Remarks { get; set; }
        public string WorkerCode { get; set; }
        public string Partyid { get; set; }
        public int Loginid { get; set; }
        public int CreatedBy { get; set; }

    }
}