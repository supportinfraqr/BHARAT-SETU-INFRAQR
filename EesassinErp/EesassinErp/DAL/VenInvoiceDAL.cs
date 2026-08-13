using BAL;
using System.Collections.Generic;
using System.Data;
using System.Data.SqlClient;
using System.Text;
using System.Threading.Tasks;

namespace DAL
{
    public partial class DLL
    {

        public DataTable GetVenInvoiceListDT(TblVendorInvoiceBAL obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@Sptype", obj.ActionType),
                new SqlParameter("@StateID", obj.StateID),
                new SqlParameter("@PartyID", obj.PartyID),
                  new SqlParameter("@CreatedBy", obj.CreatedBy),
            };

            return SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("EVM.USP_TBL_VENDOR_INVOICE", CommandType.StoredProcedure, param.ToArray());
        }
        public DataTable ValidateInvoice(TblVendorInvoiceBAL obj)
        {
            var param = new List<SqlParameter>
            {
                    new SqlParameter("@Action", obj.ActionType),
                    new SqlParameter("@InvDate", obj.InvDate),
                    new SqlParameter("@VendorInvNum", obj.VendorInvNum),
                    new SqlParameter("@VendorId", obj.VendorId),
            };

            return SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("USP_InvoiceRegister", CommandType.StoredProcedure, param.ToArray());
        }
        public DataTable SetINVOICEDATE(TblVendorInvoiceBAL obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@Action", obj.ActionType),
                  new SqlParameter("@StartDate", obj.StartDate),
                      new SqlParameter("@EndDate", obj.EndDate),
                       new SqlParameter("@Month", obj.Month),
                           new SqlParameter("@FYID", obj.FYID),
            };

            return SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("USP_InvoiceRegister", CommandType.StoredProcedure, param.ToArray());
        }
        //public async Task<string> InsertUpdateDelVenInvoice(TblVendorInvoiceBAL obj) 
        //{

        //    StringBuilder DocumentList = new StringBuilder();

        //    string seprator = ",";
        //    string bigseprator = "";
        //    for (int i = 0; i < obj.DocumentList.Count; i++)
        //    {
        //        DocumentList.Append(bigseprator);
        //        DocumentList.Append(obj.DocumentList[i].SNO);


        //        DocumentList.Append(seprator);
        //        DocumentList.Append(obj.DocumentList[i].DocumentName);

        //        DocumentList.Append(seprator);
        //        DocumentList.Append(obj.DocumentList[i].DocumentFile); 

        //        bigseprator = "|";
        //    }

        //    var param = new List<SqlParameter>
        //    {
        //       new SqlParameter("@DocSetList", DocumentList.ToString()),
        //        new SqlParameter("@Sptype", obj.ActionType),
        //        new SqlParameter("@VENDOR_INV_ID", obj.VendorInvId),
        //        new SqlParameter("@VENDOR_INV_NUM", obj.VendorInvNum),
        //        new SqlParameter("@VENDOR_ID", obj.VendorId),
        //        new SqlParameter("@VENDOR_SITE_ID", obj.VendorSiteId),
        //        new SqlParameter("@VENDOR_PARTY_TYPE_ID", obj.VendorPartyTypeId),
        //        new SqlParameter("@INV_DATE", obj.InvDate),
        //        new SqlParameter("@INV_AMOUNT", obj.InvAmount),
        //        new SqlParameter("@AUDIT_ID", obj.AuditId),
        //        new SqlParameter("@AUDIT_SITE_ID", obj.AuditSiteId),
        //        new SqlParameter("@AUDIT_PARTY_TYPE_ID", obj.AuditPartyTypeId),
        //        new SqlParameter("@CUSTOMER_ID", obj.CustomerId),
        //        new SqlParameter("@CUSTOMER_SITE_ID", obj.CustomerSiteId),
        //        new SqlParameter("@CUSTOMER_PARTY_TYPE_ID", obj.CustomerPartyTypeId),
        //        new SqlParameter("@VENDOR_REMARKS", obj.VendorRemarks),
        //        new SqlParameter("@CUSTOMER_REMARKS", obj.CustomerRemarks),
        //        new SqlParameter("@AUDIT_REMARKS", obj.AuditRemarks),
        //        new SqlParameter("@STATUS", obj.Status),
        //        new SqlParameter("@AUDIT_APPROVE_DATE", obj.AuditApproveDate),
        //        new SqlParameter("@END_DATE", obj.EndDate),
        //        new SqlParameter("@DOCUMENT_ID", obj.DocumentId),
        //        new SqlParameter("@DESCRIPTION", obj.Description),
        //        new SqlParameter("@CREATED_BY", obj.CreatedBy),
        //        new SqlParameter("@ATTRIBUTE1", obj.Attribute1),
        //        new SqlParameter("@ATTRIBUTE2", obj.Attribute2),
        //        new SqlParameter("@ATTRIBUTE3", obj.Attribute3),
        //        new SqlParameter("@ATTRIBUTE4", obj.Attribute4),
        //        new SqlParameter("@ATTRIBUTE5", obj.Attribute5),
        //        new SqlParameter("@ATTRIBUTE6", obj.Attribute6),
        //        new SqlParameter("@ATTRIBUTE7", obj.Attribute7),
        //        new SqlParameter("@ATTRIBUTE8", obj.Attribute8),
        //        new SqlParameter("@IsActive", obj.IsActive),
        //        new SqlParameter("@IsDeleted", obj.IsDeleted),
        //        new SqlParameter("@RESULT",""),
        //    };
        //    return await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteNonQueryReturnScalar("EVM.USP_TBL_VENDOR_INVOICE", CommandType.StoredProcedure, param.ToArray()));
        public DataTable GetInvoiceList(TblVendorInvoiceBAL obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@Action", obj.ActionType),
                 new SqlParameter("@InvoiceId", obj.InvoiceId),
                  new SqlParameter("@CreatedBy", obj.CreatedBy),
            };

            return SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("USP_InvoiceRegister", CommandType.StoredProcedure, param.ToArray());
        }
        public async Task<string> ApproveUploadDoc(TblVendorInvoiceBAL obj)
        {
            var param = new List<SqlParameter>
            {

                new SqlParameter("@Action", obj.ActionType),
                new SqlParameter("@InvoiceNo", obj.InvoiceId),
                 new SqlParameter("@ConversationId", obj.ConversationId),
                                  new SqlParameter("@ClientId", obj.ClientId),
                new SqlParameter("@Updatedby", obj.CreatedBy),
                new SqlParameter("@RESULT",""),
            };
            return await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteNonQueryReturnScalar("Usp_Conversation", CommandType.StoredProcedure, param.ToArray()));



        }
        public async Task<string> UploadDoc(TblVendorInvoiceBAL obj)

        {
            var param = new List<SqlParameter>
            {

                new SqlParameter("@Sptype", obj.ActionType),
                new SqlParameter("@InvoiceId", obj.InvoiceId),
                new SqlParameter("@SNO", obj.SNO),
                 new SqlParameter("@ConversationId", obj.ConversationId),
                new SqlParameter("@DocumentName", obj.DocumentName),
                new SqlParameter("@DocumentId", obj.DocumentId),
                new SqlParameter("@DocumentFile", obj.FileDoc),
                new SqlParameter("@Updatedby", obj.CreatedBy),
                 new SqlParameter("@Detail", obj.Detail),
                   new SqlParameter("@Percentage", obj.Percentage),
                new SqlParameter("@RESULT",""),
            };
            return await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteNonQueryReturnScalar("EVM.USP_TBL_VENDOR_INVOICE", CommandType.StoredProcedure, param.ToArray()));



        }
        public async Task<string> InsertUpdateDelVenInvoice(TblVendorInvoiceBAL obj)
        {

            StringBuilder InvoiceDetail = new StringBuilder();

            string seprator = ",";
            string bigseprator = "";
            for (int i = 0; i < obj.InvoiceDetail.Count; i++)
            {
                InvoiceDetail.Append(bigseprator);
                InvoiceDetail.Append(obj.InvoiceDetail[i].Srno);

                InvoiceDetail.Append(seprator);
                InvoiceDetail.Append(obj.InvoiceDetail[i].InvDate);
                InvoiceDetail.Append(seprator);
                InvoiceDetail.Append(obj.InvoiceDetail[i].VendorInvNum);
                InvoiceDetail.Append(seprator);
                InvoiceDetail.Append(obj.InvoiceDetail[i].StateId);

                InvoiceDetail.Append(seprator);
                InvoiceDetail.Append(obj.InvoiceDetail[i].Location);

                InvoiceDetail.Append(seprator);
                InvoiceDetail.Append(obj.InvoiceDetail[i].TaxableValue);


                InvoiceDetail.Append(seprator);
                InvoiceDetail.Append(obj.InvoiceDetail[i].ManpowerType);

                InvoiceDetail.Append(seprator);
                InvoiceDetail.Append(obj.InvoiceDetail[i].ManpowerCount);
                InvoiceDetail.Append(seprator);
                InvoiceDetail.Append(obj.InvoiceDetail[i].InvoiceType);
                InvoiceDetail.Append(seprator);

                InvoiceDetail.Append(obj.InvoiceDetail[i].CGST);
                InvoiceDetail.Append(seprator);
                InvoiceDetail.Append(obj.InvoiceDetail[i].SGST);
                InvoiceDetail.Append(seprator);
                InvoiceDetail.Append(obj.InvoiceDetail[i].IGST);
                InvoiceDetail.Append(seprator);
                InvoiceDetail.Append(obj.InvoiceDetail[i].GrossAmount);

                InvoiceDetail.Append(seprator);
                InvoiceDetail.Append(obj.InvoiceDetail[i].VendorId);

                InvoiceDetail.Append(seprator);
                InvoiceDetail.Append(obj.InvoiceDetail[i].VendorSiteId);

                InvoiceDetail.Append(seprator);
                InvoiceDetail.Append(obj.InvoiceDetail[i].fileupload);

                InvoiceDetail.Append(seprator);
                InvoiceDetail.Append(obj.InvoiceDetail[i].Status);

                bigseprator = "|";
            }

            var param = new List<SqlParameter>
            {
               new SqlParameter("@InvoiceDetail", InvoiceDetail.ToString()),

                new SqlParameter("@Action", obj.ActionType),
                new SqlParameter("@InvoiceId", obj.InvoiceId),
                new SqlParameter("@ClientId", obj.ClientId),
                new SqlParameter("@ClientSiteId", obj.ClientSiteId),
                //new SqlParameter("@VendorSite", obj.VendorSiteId),
                new SqlParameter("@Vendor", obj.VendorId),


                new SqlParameter("@FYID", obj.FYID),
                new SqlParameter("@Month", obj.Month),
                new SqlParameter("@CreatedBy", obj.CreatedBy),
                new SqlParameter("@IsActive", obj.IsActive),
                new SqlParameter("@IsDeleted", obj.IsDeleted),
                new SqlParameter("@RESULT",""),
            };
            return await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteNonQueryReturnScalar("[USP_InvoiceRegister]", CommandType.StoredProcedure, param.ToArray()));


        }

        public async Task<string> InsertUpdateDelWithoutVenInvoice(TblVendorInvoiceBAL obj)
        {

            var param = new List<SqlParameter>
            {
                new SqlParameter("@Action", obj.ActionType),
                new SqlParameter("@ClientId", obj.ClientId),
                new SqlParameter("@StateId", obj.StateID),
                new SqlParameter("@FYID", obj.FYID),
                new SqlParameter("@Month", obj.Month),
                new SqlParameter("@CreatedBy", obj.CreatedBy),
                new SqlParameter("@TypeInvoice", obj.TypeInvoice),
                new SqlParameter("@ClientSiteId", obj.ClientSiteId),
                 new SqlParameter("@Location", obj.Location),
                new SqlParameter("@RESULT",""),
            };
            return await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteNonQueryReturnScalar("[USP_InvoiceRegister]", CommandType.StoredProcedure, param.ToArray()));


        }
    }
}