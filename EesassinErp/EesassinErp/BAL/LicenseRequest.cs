namespace BAL
{
    public class LicenseRequest
    {
        public int UserId { get; set; }
    
        public int Action { get; set; }
        public long LicenceRequestId { get; set; }
        public string ApplicationStatus { get; set; }
        public string ApplicationDate { get; set; }
        public string UploadApplicationCopy { get; set; }
        public string UploadChallanCopy { get; set; }
        public string UploadFeesCopy { get; set; }
        public string LicenseStatus { get; set; }
        public string LicenseDate { get; set; }
        public string LicenseNumber { get; set; }

        public string LicenseCategory { get; set; }
        public string  UploadAcknowledgement { get; set; }
        public string UploadAmendmentCopy { get; set; }
        public string Remark { get; set; }

        public string MachineNumber { get; set; }
        
        public string ValidityStartDate { get; set; }
        public string ValidityEndDate { get; set; }
        public string UploadLicenseCopy { get; set; }
        public string RenewalStatus { get; set; }
        public string RenewalStartDate { get; set; }
        public string RenewalEndDate { get; set; }
        public string UploadRenewedCopy { get; set; }
        public string UserName { get; set; }
        public string UserPassword { get; set; }
        public string MobileNumber { get; set; }
        public string EmailId { get; set; }
        public string TentativeDateofComp { get; set; }
        public string InvoiceStatus { get; set; }
        public string InvoiceDate { get; set; }
        public string InvoiceNo { get; set; }
        public string InvoiceAmount { get; set; }
        public string UploadInvoice { get; set; }
        public string PaymentStatus { get; set; }
        public string PaymentTAT { get; set; }
        public string PaymentDueDate { get; set; }
        public string PaymentOverDueDate { get; set; }
        public string StoreCode { get; set; }
        public string PageSize { get; set; }
        public string PageNo { get; set; }
        public string Searchby { get; set; }
        public string ActualCost { get; set; }
        public string GovtFees { get; set; }

    }
    public class BillingOrderBAL
    {
        public int Id { get; set; }
        public int Action { get; set; }
        public int LoginId { get; set; }

        // Order Details
        public string OrderNumber { get; set; }
        public string Site { get; set; }
        public string OrderQty { get; set; }
        public decimal OrderValue { get; set; }
        public string OrderValidityFrom { get; set; }
        public string OrderValidityTo { get; set; }
        public string OrderCopy { get; set; }

    }
    public class LicenseBAL
    {
        public string Site { get; set; }
        public int Id { get; set; }
        public int Action { get; set; }
        public int LoginId { get; set; }

        // License Details
        public string LicenseName { get; set; }
        public string LicenseStatus { get; set; }
        public string LicenseDate { get; set; }
        public string LicenseCopy { get; set; }
        public string AmendentCopy { get; set; }
        public string LicenseNumber { get; set; }
        public string LicenseValidFrom { get; set; }
        public string LicenseValidTo { get; set; }
        public string LicenseCost { get; set; }
        public string SecurityDepositAmt { get; set; }

        // Application Details
        public string ApplicationStatus { get; set; }
        public string ApplicationDate { get; set; }
        public string ApplicationCopy { get; set; }
        public string ChallanCopy { get; set; }
        public string FeesCopy { get; set; }

        // User Details
        public string Username { get; set; }
        public string Password { get; set; }
        public string MobileNo { get; set; }
        public string Emailid { get; set; }
        public string Remarks { get; set; }
    }
}