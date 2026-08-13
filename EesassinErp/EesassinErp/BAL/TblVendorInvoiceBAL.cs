using System;
using System.Collections.Generic;

namespace BAL
{
    public class TblVendorInvoiceBAL
    {
        public string Detail { get; set; }
        public string Percentage { get; set; }
        public string ConversationId { get; set; }
        public string StateID { get; set; }
        public string PartyID { get; set; }
        public string EndDate { get; set; }
        public string StartDate { get; set; }
        public string InvoiceId { get; set; }
        public string SNO { get; set; }
        public string DocumentName { get; set; }
        public string FileDoc { get; set; }
        public long ActionType { get; set; }
        public long VendorInvId { get; set; }
        public string VendorInvNum { get; set; }
        public string Description { get; set; }
        public int? VendorId { get; set; }
        public int? VendorSiteId { get; set; }
        public int? VendorPartyTypeId { get; set; }
        public string InvDate { get; set; }
        public int? InvAmount { get; set; }
        public int? AuditId { get; set; }
        public int? AuditSiteId { get; set; }
        public int? AuditPartyTypeId { get; set; }
        public int? CustomerId { get; set; }
        public int? CustomerSiteId { get; set; }
        public int? CustomerPartyTypeId { get; set; }
        public string VendorRemarks { get; set; }
        public string CustomerRemarks { get; set; }
        public string AuditRemarks { get; set; }
        public int? Status { get; set; }
        public DateTime? AuditApproveDate { get; set; }
        public int? DocumentId { get; set; }

        public int? LastLoginId { get; set; }
        public int? CreatedBy { get; set; }
        public string LastUpdateBy { get; set; }
        public DateTime? LastUpdateDate { get; set; }
        public DateTime? CreationDate { get; set; }
        public DateTime? ActiveDate { get; set; }
        public string Attribute1 { get; set; }
        public string Attribute2 { get; set; }
        public string Attribute3 { get; set; }
        public string Attribute4 { get; set; }
        public string Attribute5 { get; set; }
        public string Attribute6 { get; set; }
        public string Attribute7 { get; set; }
        public string Attribute8 { get; set; }
        public bool? IsActive { get; set; }
        public bool? IsDeleted { get; set; }

        public string Month { get; set; }
        public string FYID { get; set; }

        public string ClientId { get; set; }
        public string ClientSiteId { get; set; }



        public string TypeInvoice { get; set; }
        public string Location { get; set; }

        public List<ListSet> DocumentList { get; set; }
        public List<InvoiceDetailList> InvoiceDetail { get; set; }
    }


    public class ListSet
    {
        public string SNO { get; set; }
        public string DocumentName { get; set; }
        public string DocumentFile { get; set; }
    }

    public class InvoiceDetailList
    {
        public string Srno { get; set; }

        public string InvDate { get; set; }
        public string VendorInvNum { get; set; }
        public string StateId { get; set; }
        public string Location { get; set; }
        public string ManpowerType { get; set; }
        public string ManpowerCount { get; set; }
        public string InvoiceType { get; set; }
        public string TaxableValue { get; set; }

        public string CGST { get; set; }
        public string SGST { get; set; }
        public string IGST { get; set; }
        public string GrossAmount { get; set; }
        public string VendorId { get; set; }
        public string VendorSiteId { get; set; }
        public string fileupload { get; set; }
        public string Status { get; set; }

    }
}