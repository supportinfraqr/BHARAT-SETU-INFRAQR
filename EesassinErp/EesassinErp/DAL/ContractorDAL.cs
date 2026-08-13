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
        public async static Task<string> SaveBillingOrder(BillingOrderBAL obj)
        {
           var param = new List<SqlParameter>
            {
                new SqlParameter("@Action", obj.Action),
                new SqlParameter("@Id", obj.Id),
                new SqlParameter("@LoginId", obj.LoginId),
                new SqlParameter("@Site", obj.Site),
                new SqlParameter("@OrderNumber", obj.OrderNumber),
                new SqlParameter("@OrderQty", obj.OrderQty),
                new SqlParameter("@OrderValue", obj.OrderValue),
                new SqlParameter("@OrderValidityFrom", obj.OrderValidityFrom),
                new SqlParameter("@OrderValidityTo", obj.OrderValidityTo),
                new SqlParameter("@OrderCopy", obj.OrderCopy),
                new SqlParameter("@RESULT", "")
            };

            return await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteNonQueryReturnScalar("USP_ContractorBillingOrder", CommandType.StoredProcedure,param.ToArray()));
        }

        public async static Task<string> SaveLicense(LicenseBAL obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@Action", obj.Action),
                new SqlParameter("@Id", obj.Id),
                new SqlParameter("@LoginId", obj.LoginId),
                 new SqlParameter("@Site", obj.Site),

                // License Details
                new SqlParameter("@LicenseName", (object)obj.LicenseName ?? DBNull.Value),
                new SqlParameter("@LicenseStatus", (object)obj.LicenseStatus ?? DBNull.Value),
                new SqlParameter("@LicenseDate", (object)obj.LicenseDate ?? DBNull.Value),
                new SqlParameter("@LicenseCopy", (object)obj.LicenseCopy ?? DBNull.Value),
                new SqlParameter("@AmendentCopy", (object)obj.AmendentCopy ?? DBNull.Value),
                new SqlParameter("@LicenseNumber", (object)obj.LicenseNumber ?? DBNull.Value),
                new SqlParameter("@LicenseValidFrom", (object)obj.LicenseValidFrom ?? DBNull.Value),
                new SqlParameter("@LicenseValidTo", (object)obj.LicenseValidTo ?? DBNull.Value),
                new SqlParameter("@LicenseCost", (object)obj.LicenseCost ?? DBNull.Value),
                new SqlParameter("@SecurityDepositAmt", (object)obj.SecurityDepositAmt ?? DBNull.Value),

                // Application Details
                new SqlParameter("@ApplicationStatus", (object)obj.ApplicationStatus ?? DBNull.Value),
                new SqlParameter("@ApplicationDate", (object)obj.ApplicationDate ?? DBNull.Value),
                new SqlParameter("@ApplicationCopy", (object)obj.ApplicationCopy ?? DBNull.Value),
                new SqlParameter("@ChallanCopy", (object)obj.ChallanCopy ?? DBNull.Value),
                new SqlParameter("@FeesCopy", (object)obj.FeesCopy ?? DBNull.Value),

                // User Details
                new SqlParameter("@Username", (object)obj.Username ?? DBNull.Value),
                new SqlParameter("@Password", (object)obj.Password ?? DBNull.Value),
                new SqlParameter("@MobileNo", (object)obj.MobileNo ?? DBNull.Value),
                new SqlParameter("@Emailid", (object)obj.Emailid ?? DBNull.Value),
                new SqlParameter("@Remarks", (object)obj.Remarks ?? DBNull.Value),

                new SqlParameter("@RESULT", "")
            };

            return await Task.Factory.StartNew(() =>SqlDBHelper.SqlHelper.ExecuteNonQueryReturnScalar("USP_ContractorLicense",CommandType.StoredProcedure,param.ToArray()));
        }

        public async static Task<DataTable> GetSiteOverview(BillingOrderBAL obj)
        {
            var param = new List<SqlParameter>
            {
              new SqlParameter("@Id", obj.Id),
               new SqlParameter("@Action", obj.Action),
                new SqlParameter("@LoginId", obj.LoginId),
            };
            DataTable dt = await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("USP_ContractorBillingOrder", CommandType.StoredProcedure, param.ToArray()));
            return dt;
        }
    }
}