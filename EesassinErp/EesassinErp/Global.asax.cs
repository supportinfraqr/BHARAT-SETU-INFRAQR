using System;
using System.Data;
using System.Web;
using System.Web.Http;
using System.Web.Mvc;
using System.Web.Routing;
using BAL;
using DAL;
using EesassinErp.App_Start;

namespace EesassinErp
{
    public class MvcApplication : HttpApplication
    {
        protected void Application_Start()
        {
            AreaRegistration.RegisterAllAreas();
            GlobalConfiguration.Configure(WebApiConfig.Register);
            FilterConfig.RegisterGlobalFilters(GlobalFilters.Filters);
            RouteConfig.RegisterRoutes(RouteTable.Routes);

        }
        //protected void Application_Error()
        //{
        //    Exception ex = Server.GetLastError();

        //    if (Request.Url.AbsolutePath.Contains("DownloadMat"))
        //    {
        //        return; 
        //    }
        //    Server.ClearError();
        //    Response.Redirect("~/Error/Error");
        //}
        protected void Application_Error()
        {
            Exception ex = Server.GetLastError();

            Server.ClearError();

            Response.ContentType = "text/plain";
            Response.Write(ex.ToString());
            Response.End();
        }
        protected void Application_PreSendRequestHeaders()
        {
            Response.Headers.Remove("X-AspNetMvc-Version");
            Response.Headers.Remove("X-AspNet-Version");
        }
    }
    public class ValidateSessionAttribute : ActionFilterAttribute
    {
        public override void OnActionExecuting(ActionExecutingContext filterContext)
        {
            string controller = filterContext.ActionDescriptor.ControllerDescriptor.ControllerName;
            string action = filterContext.ActionDescriptor.ActionName; 
            if (filterContext.HttpContext.Request.Url.AbsolutePath.Contains("DownloadMat"))
            {
                return;
            }
            
            if (controller.Equals("Login", StringComparison.OrdinalIgnoreCase) ||
             //   controller.Equals("Error", StringComparison.OrdinalIgnoreCase) ||
                controller.Equals("Return", StringComparison.OrdinalIgnoreCase))
            {
                return;
            }

            var loginId = filterContext.HttpContext.Session["LoginId"]?.ToString();
            var sessionId = filterContext.HttpContext.Session["SessionId"]?.ToString();

            if (loginId == null || sessionId == null)
            {
                filterContext.HttpContext.Response.StatusCode = 401;

                filterContext.Result = new JsonResult
                {
                    Data = new
                    {
                        Result = "SessionExpired",
                        Message = "Session Expire"
                    },
                    JsonRequestBehavior = JsonRequestBehavior.AllowGet
                };

                return;
            }

            var obj = new BCommon
            {
                Action = 19,
                LoginId = loginId
            };

            DataTable dt = DLL.dll.GetPermission(obj);
            string dbSession = "";

            if (dt.Rows.Count > 0)
                dbSession = dt.Rows[0]["SessionId"].ToString();

            if (dbSession != sessionId)
            {
                filterContext.HttpContext.Response.StatusCode = 401;

                filterContext.Result = new JsonResult
                {
                    Data = new
                    {
                        Result = "SessionExpired",
                        Message = "Your multiple login detected."
                    },
                    JsonRequestBehavior = JsonRequestBehavior.AllowGet
                };

                return; 
            }

            base.OnActionExecuting(filterContext);
        }
    }
 
}