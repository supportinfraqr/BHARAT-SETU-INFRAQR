using BAL;
using System;
using System.Collections.Generic;
using System.Data;
using System.Data.SqlClient;
using System.Threading.Tasks;

namespace DAL
{
    public partial class DLL
    {

        public async static Task<DataTable> GetDepartments()
        {
            DataTable dt = await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteSelectCommand("[RTL].[USP_GetDepartment]", CommandType.StoredProcedure));
            return dt;
        }
        public async static Task<DataTable> Get_NewLetters(TblNewLetter obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@Id",obj.Id),
            };
            DataTable dt = await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("[dbo].[USP_GetNewsletter]", CommandType.StoredProcedure, param.ToArray()));
            return dt;
        }

        public async static Task<DataTable> Get_NewLettersForSearch()
        {

            DataTable dt = await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteSelectCommand("[dbo].[USP_GetNewsletterForSearch]", CommandType.StoredProcedure));
            return dt;
        }

        public async static Task<List<string>> GetClientEmails(int Id)
        {
            List<string> emails = new List<string>();
            var param = new List<SqlParameter>
            {
                new SqlParameter("@Id",Id),
            };
            DataTable dt = await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("[dbo].[USP_GetClientDetailsForNewsletter]", CommandType.StoredProcedure, param.ToArray()));

            if (dt != null && dt.Rows != null && dt.Rows.Count > 0)
            {
                foreach (DataRow row in dt.Rows)
                {
                    // emails = string.IsNullOrEmpty(emails) ? Convert.ToString(row["EmailId"]) : emails + ";" + Convert.ToString(row["EmailId"]);
                    emails.Add(Convert.ToString(row["EmailId"]));
                }
            }

            return emails;
        }

        public async static Task<string> GetClientNames(int Id)
        {
            string names = string.Empty;
            var param = new List<SqlParameter>
            {
                new SqlParameter("@Id",Id),
            };
            DataTable dt = await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("[dbo].[USP_GetClientDetailsForNewsletter]", CommandType.StoredProcedure, param.ToArray()));

            if (dt != null && dt.Rows != null && dt.Rows.Count > 0)
            {
                foreach (DataRow row in dt.Rows)
                {
                    names = string.IsNullOrEmpty(names) ? Convert.ToString(row["PartyName"]) : names + "," + Convert.ToString(row["PartyName"]);
                }
            }

            return names;
        }


        public async static Task<string> UpdateNewsletterSummary(TblNewLetter obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@Id", obj.Id),
                new SqlParameter("@Summary",obj.Summary),
                new SqlParameter("@DateOfNotification",obj.DateOfNotification),
                new SqlParameter("@EffectiveDateOfNotification",obj.EffectiveDateOfNotification),
                new SqlParameter("@RESULT",""),
            };
            return await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteNonQueryReturnScalar("[dbo].[USP_UpdateNewsLetterSummary]", CommandType.StoredProcedure, param.ToArray()));
        }

        public async static Task<string> InsertUpdateDelNewLetter(TblNewLetter obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@Id", obj.Id),
                new SqlParameter("@Sptype", obj.ActionType),
                new SqlParameter("@StateCentralActtitle",obj.StateCentralActtitle),
                new SqlParameter("@DateOfNotification",obj.DateOfNotification),
                new SqlParameter("@SATE_CODE",obj.SATE_CODE),
                new SqlParameter("@EffectiveDateOfNotification",obj.EffectiveDateOfNotification),
                new SqlParameter("@NotificationNumber",obj.NotificationNumber),
                new SqlParameter("@DepartmentId",obj.DepartmentId),
                 new SqlParameter("@UploadDocPath",obj.UploadDocPath),
                new SqlParameter("@SubjectLine",obj.SubjectLine),
                new SqlParameter("@NewsCategory",obj.NewsCategory),
                new SqlParameter("@PartyId",obj.PartyId),
                 new SqlParameter("@Summary",obj.Summary),
                new SqlParameter("@RESULT",""),
            };
            return await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteNonQueryReturnScalar("[dbo].[USP_InsertUpdateNewsLetter]", CommandType.StoredProcedure, param.ToArray()));
        }

        public async static Task<string> InsertNewsLetterClientMapping(int newsletterid, int partyId, int count)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@NewsLetterId", newsletterid),
                new SqlParameter("@PartyId",partyId),
                new SqlParameter("@Sptype", count),
                new SqlParameter("@RESULT",""),
            };
            return await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteNonQueryReturnScalar("[dbo].[USP_InsertNewsLetterClientMapping]", CommandType.StoredProcedure, param.ToArray()));
        }



        //--------------------------------------End
    }
}