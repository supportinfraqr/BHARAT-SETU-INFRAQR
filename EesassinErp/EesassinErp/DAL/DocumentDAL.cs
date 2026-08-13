using BAL;
using Ionic.Zip;
using System;
using System.Collections.Generic;
using System.Data;
using System.Data.SqlClient;
using System.Text;
using System.Threading.Tasks;
using System.Web;

namespace DAL
{
    public partial class DLL
    {
        public DataTable GetMapping(MappingBAL obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@Action", obj.Action),
            };
            return SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("USP_Mapping", CommandType.StoredProcedure, param.ToArray());

        }
        public async Task<string> InsertUpdateDelMapping(MappingBAL obj)
        {

            StringBuilder MapListSet = new StringBuilder();

            string seprator = ",";
            string bigseprator = "";
            for (int i = 0; i < obj.MapListSet.Count; i++)
            {
                MapListSet.Append(bigseprator);
                MapListSet.Append(obj.MapListSet[i].Srno);

                MapListSet.Append(seprator);
                MapListSet.Append(obj.MapListSet[i].Id);
                MapListSet.Append(seprator);
                MapListSet.Append(obj.MapListSet[i].ClientId);
                MapListSet.Append(seprator);
                MapListSet.Append(obj.MapListSet[i].ClientSiteId);

                MapListSet.Append(seprator);
                MapListSet.Append(obj.MapListSet[i].VendorId);

                MapListSet.Append(seprator);
                MapListSet.Append(obj.MapListSet[i].AuditorId);


                bigseprator = "|";
            }

            var param = new List<SqlParameter>
            {
               new SqlParameter("@MapListSet", MapListSet.ToString()),
               new SqlParameter("@Createdby",obj.Createdby),
                new SqlParameter("@Action", obj.Action),
                new SqlParameter("@RESULT",""),
            };
            return await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteNonQueryReturnScalar("[USP_Mapping]", CommandType.StoredProcedure, param.ToArray()));


        }
        public async Task<string> VerifyMap(MappingBAL obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@Action", obj.Action),
                new SqlParameter("@ClientId", obj.ClientId),
                new SqlParameter("@ClientSiteId", obj.ClientSiteId),
                new SqlParameter("@VendorId", obj.VendorId),
                new SqlParameter("@AuditorId", obj.AuditorId),
                   new SqlParameter("@RESULT",""),
    };
            return await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteNonQueryReturnScalar("[USP_Mapping]", CommandType.StoredProcedure, param.ToArray()));

        }
        public DataTable GetDocumentMaster(DocumentBAL obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@Action", obj.Action),
                 new SqlParameter("@Id", obj.Id) 
            };
            return SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("USP_DocumentMaster", CommandType.StoredProcedure, param.ToArray());

        }
        public DataTable GetCommunication(DocumentBAL obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@Action", obj.Action),
                new SqlParameter("@Updatedby", obj.Updatedby),
                new SqlParameter("@AuditorId", obj.AuditorId),
                new SqlParameter("@VendorId", obj.VendorId),
               new SqlParameter("@ConversationId", obj.ConversationId),

                new SqlParameter("@Id", obj.Id),

            };
            return SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("USP_Conversation", CommandType.StoredProcedure, param.ToArray());

        }
        public async Task<string> IUDCommunication(DocumentBAL obj)
        {
            var param = new List<SqlParameter>
            {
                    new SqlParameter("@Action", obj.Action),
                    new SqlParameter("@Id", obj.Id),
                      new SqlParameter("@InvoiceNo", obj.InvoiceNo),
                    new SqlParameter("@ConversationId", obj.ConversationId),
                    new SqlParameter("@SNO", obj.SNO),
                    new SqlParameter("@Conversation", obj.Conversation),
                    new SqlParameter("@Sender", obj.Sender),
                    new SqlParameter("@Receiver", obj.Receiver),
                    new SqlParameter("@DocumentId", obj.DocumentId),
                    new SqlParameter("@DocumentName", obj.DocumentName),
                    new SqlParameter("@Document3", obj.Document3),
                    new SqlParameter("@Document4", obj.Document4),
                    new SqlParameter("@Document5", obj.Document5),

                    new SqlParameter("@Updatedby", obj.Updatedby),
                    new SqlParameter("@UpdatedON", obj.UpdatedON),
                    new SqlParameter("@Isdelete", obj.Isdelete),
                    new SqlParameter("@Result",""),
            };
            return await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteNonQueryReturnScalar("USP_Conversation", CommandType.StoredProcedure, param.ToArray()));
        }

        public async Task<string> IUDDocumentMaster(DocumentBAL obj)
        {
            var param = new List<SqlParameter>
            {
                    new SqlParameter("@Action", obj.Action),
                    new SqlParameter("@Id", obj.Id),
                    new SqlParameter("@DocumentName", obj.DocumentName),
                    new SqlParameter("@DocumentType", obj.DocumentType),
                    new SqlParameter("@Frequency", obj.Frequency),
                    new SqlParameter("@FormatType", obj.FormatType),
                    new SqlParameter("@Note", obj.Note),
                    new SqlParameter("@IsDefault", obj.IsDefault),
                    new SqlParameter("@Createdby", obj.Createdby),
                    new SqlParameter("@Act", obj.Act),
                    new SqlParameter("@FormNo", obj.FormNo),
                    new SqlParameter("@Criticality", obj.Criticality),
                    new SqlParameter("@StateId", obj.StateId),
                    new SqlParameter("@Updatedby", obj.Updatedby),
                    new SqlParameter("@UpdatedON", obj.UpdatedON),
                    new SqlParameter("@Isdelete", obj.Isdelete),
                    new SqlParameter("@Result",""),
            };
            return await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteNonQueryReturnScalar("USP_DocumentMaster", CommandType.StoredProcedure, param.ToArray()));
        }


        public async Task<string> SaveValidation(DocumentBAL obj)
        {

            var param = new List<SqlParameter>
                    {
                    new SqlParameter("@Action", 11),
                    new SqlParameter("@Id", obj.Id),
                    new SqlParameter("@DocumentName", Newtonsoft.Json.JsonConvert.SerializeObject(obj.ValidationList)),
                   new SqlParameter("@Result","")
                    };
                 return await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteNonQueryReturnScalar("USP_DocumentMaster", CommandType.StoredProcedure, param.ToArray()));
            
        }
        public async Task<string> IUDOneTimeDocumentMaster(DocumentBAL obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@Action", obj.Action),
                new SqlParameter("@Id", obj.Id),
                new SqlParameter("@FileDoc", obj.FileDoc),
                new SqlParameter("@Description", obj.Description),
                new SqlParameter("@VaildFrom", obj.VaildFrom),
                new SqlParameter("@VaildTo", obj.VaildTo),
                new SqlParameter("@Createdby", obj.Createdby),

                new SqlParameter("@Updatedby", obj.Updatedby),
                new SqlParameter("@UpdatedON", obj.UpdatedON),
                new SqlParameter("@Isdelete", obj.Isdelete),
                new SqlParameter("@Result",""),
            };
            return await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteNonQueryReturnScalar("[USP_OneTimeDocument]", CommandType.StoredProcedure, param.ToArray()));
        }
        public DataTable GetOneTimeDocumentMaster(DocumentBAL obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@Action", obj.Action),
                new SqlParameter("@Id", obj.Id),
            };
            return SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("[USP_OneTimeDocument]", CommandType.StoredProcedure, param.ToArray());

        }
        public DataTable GetAuditorCompliance(DocumentBAL obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@Action", obj.Action),
                new SqlParameter("@InvoiceNo", obj.InvoiceNo),
                  new SqlParameter("@VendorId", obj.VendorId),
                  new SqlParameter("@Id", obj.Id),

            };
            return SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("[USP_AuditorCompliance]", CommandType.StoredProcedure, param.ToArray());

        }
        public async Task<string> InsertUpdateDelAuditorCompliance(DocumentBAL obj)
        {

            StringBuilder ComplianceDetail = new StringBuilder();

            string seprator = ",";
            string bigseprator = "";
            for (int i = 0; i < obj.ComplianceDetail.Count; i++)
            {
                ComplianceDetail.Append(bigseprator);
                ComplianceDetail.Append(obj.ComplianceDetail[i].SrNo);

                ComplianceDetail.Append(seprator);
                ComplianceDetail.Append(obj.ComplianceDetail[i].DocId);

                ComplianceDetail.Append(seprator);
                ComplianceDetail.Append(obj.ComplianceDetail[i].ComplianceScore);

                ComplianceDetail.Append(seprator);
                ComplianceDetail.Append(obj.ComplianceDetail[i].ComplianceScoreAchieved);

                ComplianceDetail.Append(seprator);
                ComplianceDetail.Append(obj.ComplianceDetail[i].CompalianceStatus);

                ComplianceDetail.Append(seprator);
                ComplianceDetail.Append(obj.ComplianceDetail[i].Remark);

                ComplianceDetail.Append(seprator);
                ComplianceDetail.Append(obj.ComplianceDetail[i].VendorRemark);

                bigseprator = "|";
            }

            var param = new List<SqlParameter>
            {
               new SqlParameter("@ComplianceDetail", ComplianceDetail.ToString()),

                new SqlParameter("@Action", obj.Action),
                new SqlParameter("@InvoiceNo", obj.InvoiceNo),
                new SqlParameter("@ClientId", obj.ClientId),
                new SqlParameter("@ComplianceId", obj.ComplianceId),
                new SqlParameter("@CreatedOn", obj.CreatedOn),
                new SqlParameter("@RESULT","")
            };
            return await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteNonQueryReturnScalar("[USP_AuditorCompliance]", CommandType.StoredProcedure, param.ToArray()));


        }
        public async Task<string> updateAuditorCompliance(DocumentBAL obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@Action", obj.Action),
                new SqlParameter("@ComplianceId", obj.ComplianceId),
                new SqlParameter("@InvoiceNo", obj.InvoiceNo),
                new SqlParameter("@Result",""),
            };
            return await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteNonQueryReturnScalar("USP_AuditorCompliance", CommandType.StoredProcedure, param.ToArray()));
        }
        public async Task<string> IUDAuditorComplianceQUERY(DocumentBAL obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@Action", obj.Action),
                new SqlParameter("@ComplianceId", obj.ComplianceId),
                new SqlParameter("@InvoiceNo", obj.InvoiceNo),
                new SqlParameter("@VendorQuery", obj.VendorQuery),
                new SqlParameter("@AuditorQuery", obj.AuditorQuery),
                new SqlParameter("@Remark", obj.Remark),
                new SqlParameter("@Result",""),
            };
            return await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteNonQueryReturnScalar("USP_AuditorCompliance", CommandType.StoredProcedure, param.ToArray()));
        }

        public async Task<string> IUDComplianceMaster(DocumentBAL obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@Action", obj.Action),
                new SqlParameter("@Id", obj.Id),
                new SqlParameter("@Form", obj.Form),
                new SqlParameter("@Act", obj.Act),
                new SqlParameter("@Nature", obj.Nature),
                new SqlParameter("@Remark", obj.Remark),
                new SqlParameter("@Score", obj.Score),
                new SqlParameter("@Result",""),
            };
            return await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteNonQueryReturnScalar("USP_AuditorCompliance", CommandType.StoredProcedure, param.ToArray()));
        }

        public DataTable GetValues(DocumentBAL obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@Action", obj.Action),
                new SqlParameter("@InvoiceNo", obj.InvoiceNo),
            };
            return SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("[USP_AuditorCompliance]", CommandType.StoredProcedure, param.ToArray());

        }
        public string DownloadFiles(TblVendorInvoiceBAL obj)
        {
            string returnmsg = "0";
            //string path = "http://localhost:63292/";
            using (ZipFile zip = new ZipFile())
            {
                zip.AlternateEncodingUsage = ZipOption.AsNecessary;
                zip.AddDirectoryByName("Files");
                //for (int i = 0; i < obj.DocumentList.Count; i++)
                //{
                if (!string.IsNullOrEmpty(obj.DocumentList[0].DocumentFile))
                {
                    string filePath = obj.DocumentList[0].DocumentFile;
                    zip.AddFile(filePath, "Files");
                }
                //}
                HttpContext.Current.Response.Clear();
                //HttpContext.Current.Response.BufferOutput = false;
                string zipName = String.Format("Zip_{0}.zip", DateTime.Now.ToString("yyyy-MMM-dd-HHmmss"));
                HttpContext.Current.Response.ContentType = "application/zip";
                HttpContext.Current.Response.AddHeader("content-disposition", "attachment; filename=" + zipName);
                zip.Save(HttpContext.Current.Response.OutputStream);
                HttpContext.Current.Response.End();
                returnmsg = "1";
            }
            return returnmsg;
        }

    }
}