using DAL;
using System;

namespace BAL
{
    public class RetialEmployeeManager
    { 
		public string SavePhoto(RetialEmployeeManager obj)
        {
            DLL dal = new DLL();
            return dal.SavePhoto(obj);

        }

        public string AadhaarMessage { get; set; }
        public string YearOfBirth { get; set; }
        public string CareOf { get; set; }

        public string Landmark { get; set; }
        public string SubDistrict { get; set; }
        public string VTC { get; set; }

         public string TransactionId { get; set; }

        public string District   { get; set; }
         public string PostOffice   { get; set; }

        public string Street { get; set; }
        public string House { get; set; }
        public string ReferenceId { get; set; }
        public string AadhaarStatus { get; set; }
        public string AadhaarResponseJson { get; set; }
        public string PartyCode { get; set; }
         public string state { get; set; }
        public string Name { get; set; }
        public string AadhaarNo { get; set; }
         public string DOB { get; set; }
         public string Address { get; set; }
        //public string PANNo { get; set; }
        //public string UAN { get; set; }
        //public string ESICNo { get; set; }
        public string NomineeEmeail { get; set; }
        public string NomineeMobile { get; set; }
        public string NomineePan { get; set; }
        public string NomineeAdhar { get; set; }
        public string acholdername { get; set; }
        public string bankname { get; set; }
         public string LWF { get; set; }
        public string WCPolicy { get; set; }
        public string Country { get; set; }
        public string PANCopyFilePath { get; set; }
        public string AdharCopy_FilePath { get; set; }
        public string sitelocation { get; set; }
        public string Sitestate { get; set; }
        public string PFNomineeName { get; set; }
        public string PFNomineeRelation { get; set; }
        public DateTime? PFNomineeDOB { get; set; }
        public string PFNomineeAddress { get; set; }
        public string PFNomineeMobile { get; set; }
        public string PFNomineeEmail { get; set; }
        public string ESINomineeName { get; set; }
        public string ESINomineeRelation { get; set; }
        public DateTime? ESINomineeDOB { get; set; }
        public string ESINomineeAddress { get; set; }
        public string ESINomineeMobile { get; set; }
        public string ESINomineeEmail { get; set; }
        public string BonusNomineeName { get; set; }
        public string BonusNomineeRelation { get; set; }
        public DateTime? BonusNomineeDOB { get; set; }
        public string BonusNomineeAddress { get; set; }
        public string BonusNomineeMobile { get; set; }
        public string BonusNomineeEmail { get; set; }
        public string OtherNomineeName { get; set; }
        public string OtherNomineeRelation { get; set; }
        public DateTime? OtherNomineeDOB { get; set; }
        public string OtherNomineeAddress { get; set; }
        public string OtherNomineeMobile { get; set; } 
        public string OtherNomineeEmail { get; set; }

        public string WorkerGrade { get; set; }
        public string Religion { get; set; }
        public string Caste { get; set; }

        public string CName { get; set; }

        public string TypeWork { get; set; }
        public string Sdate { get; set; }
        public string endate { get; set; }
        public string SName { get; set; }
        public string NatureJob { get; set; }


        public string FitnessTypes { get; set; }

        public string MedicalStatus { get; set; }
        public string NextMedicalDue { get; set; }
        public string MedicalCertificate_FilePath { get; set; }


     
        public string City { get; set; }
        public string Pincode { get; set; }
		 // new code for permanent address
        public string PState { get; set; }
        public string PCity { get; set; }
        public string PPincode { get; set; }
        public DateTime? Trannerdate { get; set; }
        public string TrannerName { get; set; }
		// here is end
		
        public string EmployeePhotos { get; set; }
        public DateTime? IssueDate { get; set; }
        public DateTime? ValidTill { get; set; }
        public string CampNumber { get; set; }
        public string BloodGroup { get; set; }
        public string Transport { get; set; }
        public string RouteId { get; set; }
        public string MinimumWageCategory { get; set; }
        public string WageType { get; set; }
        public string WageDisbursementMode { get; set; }
        public string PPE { get; set; }
        public string PPEType { get; set; }
        public string SafetyTrainingStatus { get; set; }
        public string SiteInductionStatus { get; set; }
        public string PoliceVerificationStatus { get; set; }
        public string TempIDStatus { get; set; }
        public string TempIDNumber { get; set; }
        public DateTime? TempIDDate { get; set; }
        public string PermanentIDStatus { get; set; }
        public string PermanentIDNumber { get; set; }
        public DateTime?  PermanentIDDate { get; set; }

        //-----------------------------------------------
        public string ActionType { get; set; }
        public string UserId { get; set; }
        public string SiteId { get; set; }
        public DateTime? LeavingDate { get; set; }
        public string PFAccount { get; set; }
        public string SuperVisior1 { get; set; }
        public string SuperVisior2 { get; set; }
        public string Id { get; set; }
        public string PartyTypeId { get; set; }
        public string PartyId { get; set; }
        public string RefEmployeeCode { get; set; }
        public string EmployeeCode { get; set; }
        public string EmployeeName { get; set; }
        public string DigiLockerId { get; set; }
        public string EmployeeDesignation { get; set; }
        public string EmployeeDepartment { get; set; }
        public string Father_Husband_Name { get; set; }
        public string Gendar { get; set; }
        public string MaritalStatus { get; set; }
        public DateTime? DateOfBirth { get; set; }
        public string PresentAddress { get; set; }
        public string PermanemtAddress { get; set; }
        public string AdharCardNumber { get; set; }
        public string PANNumber { get; set; }
        public string MobileNumber { get; set; }
        public string AlternativeMobileNumber { get; set; }
        public string EmployeeEmailID { get; set; }
        public string BankAccountNumber { get; set; }
        public string BankIFSCCode { get; set; }
        public string PreviousUAN { get; set; }
        public string PreviousESI { get; set; }
        public string GrossSalary { get; set; }
        public DateTime? DOJ { get; set; }
        public string NomineeName { get; set; }
        public string NomineeAddress { get; set; }
        public string NomineeRelation { get; set; }
        public DateTime? NomineeDOB { get; set; }
        public string StoreCode { get; set; }
        public string Status { get; set; }
        public string PANCardFilePath { get; set; }
        public string Cheque_Passbook_FilePath { get; set; }
        public string EducationCertificateFilePath { get; set; }
        public string ExperienceCertificateFilePath { get; set; }
        public string AdhaarCard_FrontSide_FilePath { get; set; }
        public string AdhaarCard_BackSide_FilePath { get; set; }
        public string RelievingLetterfFilePath { get; set; }
        public string PayslipsFilePath { get; set; }
        public string Photos_1_FilePath { get; set; }
        public string Photos_2_FilePath { get; set; }
        public string Photos_3_FilePath { get; set; }
        public string Photos_4_FilePath { get; set; }
        public int LoginId { get; set; }
        public int IsDeleted { get; set; }
        public string DisplayDOJ { get; set; }
        public string Remark { get; set; }
        public string ClientId { get; set; }
        public string Escalation1 { get; set; }
        public string Escalation2 { get; set; }
        public string FieldName { get; set; }
        public string FilePath { get; set; }
        public string LicenceId { get; set; }

    }
}