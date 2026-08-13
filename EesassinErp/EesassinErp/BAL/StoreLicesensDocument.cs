using System;

namespace BAL
{
    public class StoreLicesensDocument
    {
        public int Verify { get; set; }
        public long Id { get; set; }
        public int ActionType { get; set; }
        public int IsActive { get; set; }
        public int LicenseId { get; set; }
        public long StoreId { get; set; }
        public long LoginId { get; set; }
        public string DName { get; set; }
        public string DFatherName { get; set; }
        public string DAddress { get; set; }
        public string DAadhaarNo { get; set; }
        public string DPanNo { get; set; }
        public DateTime DDateOfBirth { get; set; }
        public string DEmailId { get; set; }
        public string DMobileNo { get; set; }
        public string AName { get; set; }
        public string AFatherName { get; set; }
        public string AAddress { get; set; }
        public string AAadhaarNo { get; set; }
        public string APanNo { get; set; }
        public DateTime ADateOfBirth { get; set; }
        public string AEmailId { get; set; }
        public string AMobileNo { get; set; }
        public string NatureofBusiness { get; set; }
        public DateTime DateofCommencement { get; set; }
        public string ProductCategory { get; set; }
        public string AadhaarRegisteredofficeAddressNo { get; set; }
        public string AadhaarCardofDirector { get; set; }
        public string PANCardofDirector { get; set; }
        public string PassportSizePhoto1 { get; set; }
        public string AuthorizationLetter { get; set; }
        public string AadhaarCardofAuthorized { get; set; }
        public string PANCard { get; set; }
        public string PassportSizePhoto2 { get; set; }
        public string ElectricityBill { get; set; }
        public string SaledeedRentAgreement { get; set; }
        public string FSMSPlan { get; set; }
        public string FormIX { get; set; }
        public string WaterTestReport { get; set; }
        public string UFile { get; set; }


        public string EmpCode { get; set; }
    }
}