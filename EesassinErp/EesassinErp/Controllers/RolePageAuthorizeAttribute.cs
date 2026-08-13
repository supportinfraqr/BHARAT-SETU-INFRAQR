using BAL;
using DAL;
using Newtonsoft.Json;
using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Text;
using System.IO;
using System.Threading.Tasks;
using System.Web;
using System.Web.Mvc;  
using System.Collections.Generic;
using System.Data;
using System.Data.SqlClient;
using System.Linq;
using System.Reflection;
using System.Text; 

namespace EesassinErp.Controllers
{
    public class RolePageAuthorizeAttribute : AuthorizeAttribute
    {

      

        //protected override bool AuthorizeCore(HttpContextBase httpContext)
        //    {

        //    // ❌ Ajax call → skip
        //    if (httpContext.Request.IsAjaxRequest())
        //        return true;

        //    // ❌ POST / PUT / DELETE → skip
        //    if (httpContext.Request.HttpMethod != "GET")
        //        return true;

        //    // ❌ Non-page requests skip (API, JSON, etc.)
        //    var acceptTypes = httpContext.Request.AcceptTypes;
        //    if (acceptTypes == null || !acceptTypes.Any(x => x.Contains("text/html")))
        //        return true;

        //    var session = httpContext.Session;

               

        //        int userId = Convert.ToInt32(session["LoginId"]);

        //        string currentUrl =   httpContext.Request.Url.AbsolutePath;
             

        //        var obj = new StoreLicesensDocument
        //        {
        //            UFile = currentUrl,
        //            LoginId = userId,
        //            ActionType = 6
        //        };

        //        string result = UploadComplianceDocSync(obj);

        //        // Assume: "1" = authorized, "0" = not authorized
        //        return result == "1";
        //    }

        //    private static string UploadComplianceDocSync(StoreLicesensDocument obj)
        //    {
        //        var param = new List<SqlParameter>
        //{
        //    new SqlParameter("@DId", obj.Id),
        //    new SqlParameter("@Action", obj.ActionType),
        //    new SqlParameter("@DocumentPath", obj.UFile),
        //    new SqlParameter("@UserId", obj.LoginId),
        //    new SqlParameter("@Verify", obj.Verify),
        //    new SqlParameter("@StoreId", obj.StoreId),
        //    new SqlParameter("@RESULT", "")
        //};

        //        return Convert.ToString(
        //            SqlDBHelper.SqlHelper.ExecuteNonQueryReturnScalar(
        //                "RTL.USP_ROLEMANAGE",
        //                CommandType.StoredProcedure,
        //                param.ToArray()
        //            )
        //        );
        //    }

            //protected override void HandleUnauthorizedRequest(AuthorizationContext filterContext)
            //{
            //    filterContext.Result = new RedirectResult("~/Login/Login");
            //}
        } 
}