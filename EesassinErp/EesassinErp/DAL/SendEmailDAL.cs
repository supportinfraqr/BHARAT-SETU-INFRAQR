using BAL;
using System.Collections.Generic;
using System.Data;
using System.Data.SqlClient;
using System.Threading.Tasks;


namespace DAL
{
    public partial class DLL
    {
        public DataTable FireEmail(DocumentBAL obj)
        {
            var param = new List<SqlParameter>
            {
                    new SqlParameter("@Action", obj.Action),
                    new SqlParameter("@EmailId", obj.ClientId),
                    new SqlParameter("@Id", obj.Id),
                    new SqlParameter("@ClientId", obj.StoreCode),
                    new SqlParameter("@UserId", obj.LicenseName),
                      new SqlParameter("@Message", obj.Msg)
            };
            return SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("[dbo].[USP_EmailMaster]", CommandType.StoredProcedure, param.ToArray());

        }
        public DataTable bulkemail()
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@Action", "21"),
            };
            return SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("[dbo].[USP_EmailMaster]", CommandType.StoredProcedure, param.ToArray());
        }

        public DataTable bulkwhatsup()
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@Action", "23"),
            };
            return SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("[dbo].[USP_EmailMaster]", CommandType.StoredProcedure, param.ToArray());
        }
        public static Task<string> UpdateReminderEmail(DocumentBAL obj)
        {
            var param = new List<SqlParameter>
            {
                 new SqlParameter("@Action", obj.Action),
                new SqlParameter("@LicenseRequestId", obj.LicenseRequestId),
                new SqlParameter("@StoreCode", obj.StoreCode),
                new SqlParameter("@LicenseNumber", obj.LicenseNumber),
                new SqlParameter("@LicenseName", obj.LicenseName),
                new SqlParameter("@StartDate", obj.StartDate),
                new SqlParameter("@EndDate", obj.EndDate),
                new SqlParameter("@ReminderDate", obj.ReminderDate),
                new SqlParameter("@LED", obj.LED),
                new SqlParameter("@DaysOfExpire", obj.DaysOfExpire),
                new SqlParameter("@UserName", obj.UserName),
                new SqlParameter("@ToEmail", obj.ToEmail),
                new SqlParameter("@Status", obj.Status),
                  new SqlParameter("@Result",""),

            };
            return Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteNonQueryReturnScalar("USP_ReminderEmail", CommandType.StoredProcedure, param.ToArray()));
        }

    }
}