using System.Web.Mvc;
using System.Web.Routing;

namespace EesassinErp
{
    public class RouteConfig
    {
        public static void RegisterRoutes(RouteCollection routes)
        {
            routes.IgnoreRoute("{resource}.axd/{*pathInfo}");
            routes.MapRoute(
                name: "ApiV1Grievances",
                url: "api/v1/grievances",
                defaults: new { controller = "Grievances", action = "CreateV1" }
            );
            routes.MapRoute(
                name: "ApiV1Login",
                url: "api/v1/auth/login",
                defaults: new { controller = "Login", action = "LoginV1" }
            );
            routes.MapRoute(
                name: "ApiV1Logout",
                url: "api/v1/auth/logout",
                defaults: new { controller = "Login", action = "LogoutV1" }
            );
            routes.MapRoute(
                name: "ApiV1Session",
                url: "api/v1/session",
                defaults: new { controller = "Login", action = "SessionV1" }
            );
            routes.MapRoute(
                name: "Default",
                url: "{controller}/{action}/{id}",
                defaults: new { controller = "Login", action = "Login", id = UrlParameter.Optional }
            );
        }

    }
}
