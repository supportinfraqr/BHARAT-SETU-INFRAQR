using System;
using System.Collections.Generic;

namespace BAL
{
    public partial class TblPartyMaster : BCommon
    {
        public string Description { get; set; }
        public string machineName { get; set; }
        public string systemUserName { get; set; }
        public string UserLimit { get; set; }
        
        public string SetInColumn { get; set; }
        
              public string City { get; set; }
        public string State { get; set; }
        public string LicenseId { get; set; }

        public int StoreId { get; set; }
        public int Id { get; set; }
        public string Location { get; set; }
        public int VendorId { get; set; }
        public int ClientSiteId { get; set; }
        public int AuditorId { get; set; }
        public int EmployeeId { get; set; }
        public string ClientId { get; set; } 
        public int GradeId { get; set; }
        public int ActionType { get; set; }
        public string PartyId { get; set; }
        public string PartyType { get; set; }
        public string StoreCode { get; set; }
        public string PartyName { get; set; }
        public string UserId { get; set; }
        //public string EmailId { get; set; }
        public string Pincode { get; set; }
        //public string ContactNo { get; set; }
        //public string IsActive { get; set; }
        public string BankDetails { get; set; }
        public string RegistrationType { get; set; }
        public string Panitno { get; set; }
        public string Gstinuin { get; set; }
        public DateTime? CreatedOn { get; set; }
        public DateTime? UpdateOn { get; set; }
        public int? LastLoginId { get; set; }
        //public int? CreatedBy { get; set; }

        public string LastUpdateBy { get; set; }
        public string Descritpion { get; set; }
        public string ContactMobile { get; set; }

        public string ContactPerson { get; set; }
        public string Attribute1 { get; set; }
        public string Attribute2 { get; set; }
        public string Attribute3 { get; set; }
        public string Attribute4 { get; set; }
        public string Attribute5 { get; set; }
        public string Attribute6 { get; set; }
        public bool? IsDeleted { get; set; }
        public string Hours { get; set; }
        public string Minutes { get; set; }
        public string Year { get; set; }
        public string Month { get; set; }
        public string Activity { get; set; }
        public string RegionId { get; set; }
        public string StateId { get; set; }

        public string Status { get; set; }
        public string Category { get; set; }

        public string StoreLimit { get; set; }
        public string ValidTo { get; set; }

        public string PartyDate { get; set; }
        public string Industry { get; set; }
        public string MonthExpired { get; set; }    ///Added by shipra 
        public string LCID { get; set; }
        public string LSID { get; set; }
        public string DepartmentList { get; set; }
        public string DepartmentName { get; set; }


        public string SelectedColumn { get; set; }
        public string MatchingText { get; set; }
   public string Contractorlimit { get; set; } // Added by Aadarsh

        public string Sitelimit { get; set; }  // Added by Aadarsh

        public string Startdt { get; set; } // Added by Aadarsh
        
        //public DateTime? StartDate { get; set; }
        //public DateTime? EndDate { get; set; }
    }

    public partial class tblCompliances : BCommon
    {
        public int Id { get; set; }

        public string Action { get; set; }
        public string State { get; set; }
        public string DeductionCycle { get; set; }
        public string PTNumber { get; set; }
        public string Applicability { get; set; }
        public string Payment { get; set; }
        public string ApplicationLink { get; set; }
        public string LicenseName { get; set; }
        public string ApplicabilityCount { get; set; }
        public string GovtFees { get; set; }
        public string DepositeAmt { get; set; }
        public string Status { get; set; }
        public string MinAmount { get; set; }

        public string MaxAmount { get; set; }
        public string EmployeeShare { get; set; }
        public string EmployerShare { get; set; }
        public string Type { get; set; }
        public string Month { get; set; }
        public string DesignationType { get; set; }
        public string Designation { get; set; }
        public string EffectiveFrom { get; set; }
        public string Effectiveto { get; set; }
        public int CreatedBy { get; set; }

    }

    public partial class MinimumWages : BCommon
    {
        public int Id { get; set; }

        public string State { get; set; }
        public string Status { get; set; }

        public string Industry { get; set; }
        public string PaymentFrequency { get; set; }
        public string PercentageBonus { get; set; }
        public string PayoutMonth { get; set; }
        public string Grade { get; set; }
        public string EmploymentCategory { get; set; }
        public string Zone { get; set; }
        public string BasicPerMonth { get; set; }
        public string VDAPerMonth { get; set; }
        public string TotalPerMonth { get; set; }
        public string MinimumWage { get; set; }
        public string FloorWage { get; set; }
        public string EffectiveFrom { get; set; }
        public string Effectiveto { get; set; }
        public int CreatedBy { get; set; }
    }

    public class DynamicRowsModel
    {
        public List<DynamicRowModel> DynamicRows { get; set; }
    }

    public class DynamicRowModel
    {
        public int PtId { get; set; }
        public int Id { get; set; }
        public int Action { get; set; }
        public string Value1 { get; set; }
        public string Value2 { get; set; }
        public string Value3 { get; set; }

        public string CreatedBy { get; set; }
    }
}
