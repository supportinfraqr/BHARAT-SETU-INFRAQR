using BAL;
using System.Collections.Generic;
using System.Data;
using System.Data.SqlClient;
using System.Threading.Tasks;

namespace DAL
{
    public partial class DLL
    {
        public static readonly DLL dll = new DLL();
        public DataTable LoginVerify(LoginBAL obj)
        {
 
            List<SqlParameter> param = new List<SqlParameter>()
            {
                new SqlParameter("@UserName",obj.UserName),
                new SqlParameter("@Password",obj.Password),
                new SqlParameter("@Action",obj.Action)
            };
            return SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("USP_LoginTable", CommandType.StoredProcedure, param.ToArray());
        }

        //public DataTable LoginVerify(LoginBAL obj)
        //{
        //    // Step 1: Fetch user by plain username (don't encrypt username)
        //        List<SqlParameter> param = new List<SqlParameter>()
        //        {
        //        new SqlParameter("@UserName", obj.UserName),
        //        new SqlParameter("@Action", obj.Action) // You should write logic in SP for this
        //        };

        //    DataTable dt = SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("USP_LoginTable", CommandType.StoredProcedure, param.ToArray());

        //    if (dt.Rows.Count == 0)
        //        return null; // User not found

        //    string storedPassword = dt.Rows[0]["Password"].ToString();
        //    string inputPassword = obj.Password;
        //    bool isMatch = false;

        //    try
        //    { 
        //        string decryptedPassword = CryptoHelper.Decrypt(storedPassword);
        //        if (inputPassword == decryptedPassword)
        //            isMatch = true;
        //    }
        //    catch
        //    { 
        //        if (inputPassword == storedPassword)
        //            isMatch = true;
        //    } 
        //    if (isMatch)
        //    { 
        //        string encryptedPassword = CryptoHelper.Encrypt(inputPassword);
        //        var updateParam = new List<SqlParameter>
        //        {
        //        new SqlParameter("@UserName", obj.UserName),
        //        new SqlParameter("@Password", encryptedPassword),
        //        new SqlParameter("@Action", obj.Action)
        //        };
        //        return SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("USP_LoginTable", CommandType.StoredProcedure, param.ToArray()); 
        //    }
        //    else
        //    {
        //        List<SqlParameter> param1 = new List<SqlParameter>()
        //     {
        //        new SqlParameter("@UserName",obj.UserName),
        //        new SqlParameter("@Password",obj.Password),
        //        new SqlParameter("@Action",obj.Action)
        //     };
        //        return SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("USP_LoginTable", CommandType.StoredProcedure, param.ToArray()); 
        //    }
        //}







        public async Task<DataTable> GetUrlAccessPermission(BCommon obj)
        {
            var param = new List<SqlParameter>
            {
                    new SqlParameter("@LoginId", obj.LoginId),
                    new SqlParameter("@BranchCode",obj.BranchCode),
                    new SqlParameter("@MenuId",obj.MenuId),
                    new SqlParameter("@Action", 4)
            };
            DataTable dt = await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("USP_UrlAccessPermission", CommandType.StoredProcedure, param.ToArray()));

            return dt;
        }
        public async Task<DataTable> GetModulePermission(BCommon obj)
        {
            var param = new List<SqlParameter>
            {
                    new SqlParameter("@LoginId", obj.LoginId),
                    new SqlParameter("@UserName",obj.UserName),
                    new SqlParameter("@Action", obj.Action)
            };
        DataTable dt = await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("[dbo].[USP_LoginTable]", CommandType.StoredProcedure, param.ToArray()));

            return dt;
        }
   
        public DataTable GetPermission(BCommon obj)
        {
            var param = new List<SqlParameter>
    {
        new SqlParameter("@LoginId", obj.LoginId),
        new SqlParameter("@UserName", obj.UserName),
        new SqlParameter("@Action", obj.Action)
    };

            DataTable dt = SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand(
                "[dbo].[USP_LoginTable]",
                CommandType.StoredProcedure,
                param.ToArray()
            );

            return dt;
        }
    }
}