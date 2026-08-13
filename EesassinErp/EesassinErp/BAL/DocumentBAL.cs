using System;
using System.Collections.Generic;

namespace BAL
{
    [Serializable]
    public class DocumentBAL
    {
        public string ClientId { get; set; }
        public string VendorId { get; set; }
        public string AuditorId { get; set; }
        public string Act { get; set; }
        public string Form { get; set; }
        public string Nature { get; set; }
        public string Remark { get; set; }

        public string UserId { get; set; }
        public string Score { get; set; }
        public string DocumentId { get; set; }
        public string FileDoc { get; set; }
        public string VaildFrom { get; set; }
        public string VaildTo { get; set; }
        public string Description { get; set; }
        public string DocumentName { get; set; }
        public string DocumentType { get; set; }
        public string Frequency { get; set; }

        public string FormatType { get; set; }
        public string Note { get; set; }
        public string IsDefault { get; set; }
        public string CreatedOn { get; set; }
        public string Createdby { get; set; }

        public string Updatedby { get; set; }
        public string UpdatedON { get; set; }
        public string Isdelete { get; set; }
        public string Id { get; set; }

        public string Action { get; set; }

        public string InvoiceNo { get; set; }

        public string ConversationId { get; set; }

        public string SNO { get; set; }
        public string Conversation { get; set; }
        public string Sender { get; set; }
        public string Receiver { get; set; }
        public string Document1 { get; set; }
        public string Document2 { get; set; }
        public string Document3 { get; set; }
        public string Document4 { get; set; }
        public string Document5 { get; set; }
        public string ComplianceId { get; set; }
        public string AuditorQuery { get; set; }
        public string VendorQuery { get; set; }
        public string extention { get; set; }

        public string ToEmail { get; set; }
        public string ReplyToList { get; set; }
        public string EmailName { get; set; }
        public string EmailId { get; set; }
        public string Password { get; set; }
        public int Port { get; set; }
        public string SmtpServer { get; set; }
        public string Subject { get; set; }
        public string Msg { get; set; }

        public string LicenseRequestId { get; set; }
        public string StoreCode { get; set; }
        public string LicenseNumber { get; set; }
        public string StartDate { get; set; }
        public string EndDate { get; set; }
        public string ReminderDate { get; set; }
        public string LED { get; set; }
        public string DaysOfExpire { get; set; }

        public string UserName { get; set; }
        public string Status { get; set; }
        public string LicenseName { get; set; }

        public string FormNo { get; set; }
        public string StateId { get; set; }
        public string Criticality { get; set; }


        public string Boardingtype { get; set; }
        public string Month { get; set; }
        public string Year { get; set; }
        public string State { get; set; }
        public string DueDate { get; set; }
        public string UploadFile { get; set; }

        public string excelFile { get; set; }
        public string ComplianceDetailStr { get; set; }
        public List<ComplianceDetailList> ComplianceDetail { get; set; }

        public List<ValidationModel> ValidationList { get; set; }
    }




    public class ValidationModel
    {
        public string Col1 { get; set; }
        public string Col2 { get; set; }
    }
    public class ComplianceDetailList
    {
        public string SrNo { get; set; }
        public string DocId { get; set; }
        public string ComplianceId { get; set; }
        public string InvoiceNo { get; set; }
        public string Form { get; set; }
        public string ComplianceScore { get; set; }
        public string ComplianceScoreAchieved { get; set; }
        public string CompalianceStatus { get; set; }
        public string Remark { get; set; }
        public string VendorRemark { get; set; }
    }

}