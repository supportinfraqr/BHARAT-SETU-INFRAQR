using DAL;
using System;
using System.Collections.Generic;

namespace BAL
{
 
    public class RetailUploadModelBAL
    {
        public string SaveExcelData(RetailUploadModelBAL obj)
        {
            DLL dal = new DLL();
            return dal.SaveExcelData(obj);
        }


        public string Id { get; set; }
        public string DocumentName { get; set; }
        public string DiligenceName { get; set; }
        public string DiligenceAssigned { get; set; }
        public string Diligencedate { get; set; }

        public string EmpId { get; set; }
        public string Newvalue { get; set; }
        public string columnname { get; set; }
        public string Action { get; set; }
        public string StoreCode { get; set; }
        public string Year { get; set; }
        public string Month { get; set; }
        public string LoginId { get; set; }

        public string PayRollType { get; set; }
        public string Mode { get; set; }

        // Excel 1 → Salary Upload
        public List<EmployeeSalaryExcel> ExcelData1 { get; set; }

        // Excel 2 → UAN Upload
        public List<UANMasterExcel> ExcelData2 { get; set; }
    }

    #region Excel Model 1: UAN Master
    public class UANMasterExcel
    {
  
        public string UAN { get; set; }
        public string MemberID { get; set; }
        public string Name { get; set; }
        public string Gender { get; set; }
        public string DoB { get; set; }
        public string DoJ { get; set; }
        public string FatherHusbandName { get; set; }
        public string Relation { get; set; }
        public string MaritalStatus { get; set; }
        public string Mobile { get; set; }
        public string EmailID { get; set; }
        public string AADHAAR { get; set; }
        public string PAN { get; set; }
        public string BankAccountNo { get; set; }
        public string IFSCCode { get; set; }
        public string NominationFiled { get; set; }
        public string IsAadhaarVerified { get; set; }
        public string FaceAuthStatus { get; set; }
        public string PensionSchemeMember { get; set; }
        public string ContributingOnHigherWages { get; set; }
        public string DeferredPension { get; set; }
        public string InternationalWorker { get; set; }
    
    }
    #endregion

    #region Excel Model 2: Employee Salary
    public class EmployeeSalaryExcel
    {
         
            public string EmployeeCode{ get; set; } 
            public string EmployeeName{ get; set; }   
            public string DOJ { get; set; } 
            public string Designation { get; set; }
            public string InternationalWorker { get; set; }   
            public string POHW { get; set; }   
            public string BranchLocation{ get; set; }
            public string UANNumber { get; set; }
            public string PFType { get; set; }   
            public string ResignationDate { get; set; }  
            public string TotalWorkingDays { get; set; }
            public string EarnedGrossSalary { get; set; } 
            public string PFSalary { get; set; }  
            public string EmployeePFCont { get; set; }  
            public string VPF { get; set; }
            public string ArrearGrossSalary { get; set; } 
            public string ArrearPFSalary { get; set; }   
            public string EmployeeESICCont { get; set; }
            public string PTax { get; set; }  
            public string LWF { get; set; }  
            public string TotalDeduction { get; set; } 
            public string  NetPayableSalary { get; set; }
            public string PensionerEmployee { get; set; } 
          

    }
    #endregion
}
