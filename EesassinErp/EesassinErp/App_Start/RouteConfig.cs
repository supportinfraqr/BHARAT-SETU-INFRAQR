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
                name: "QrWorker",
                url: "qr/worker",
                defaults: new { controller = "Worker", action = "QrDashboard" }
            );

            routes.MapRoute(
                name: "QrMyCard",
                url: "qr/idcard",
                defaults: new { controller = "Worker", action = "QrMyCard" }
            );

            routes.MapRoute(
                name: "QrScan",
                url: "qr/scan",
                defaults: new { controller = "Worker", action = "QrScan" }
            );

            routes.MapRoute(
                name: "QrWorkerCard",
                url: "qr/card/{id}",
                defaults: new { controller = "Worker", action = "QrWorkerCard", id = UrlParameter.Optional }
            );

            routes.MapRoute(
                name: "QrMyEmployers",
                url: "qr/myemployers",
                defaults: new { controller = "Worker", action = "QrMyEmployers" }
            );

            routes.MapRoute(
                name: "QrBindingRequests",
                url: "qr/bindingrequests",
                defaults: new { controller = "Worker", action = "QrBindingRequests" }
            );

            routes.MapRoute(
                name: "QrMyContractors",
                url: "qr/mycontractors",
                defaults: new { controller = "Worker", action = "QrMyContractors" }
            );

            routes.MapRoute(
                name: "QrWorkerEmployers",
                url: "qr/workemployers",
                defaults: new { controller = "Worker", action = "QrWorkerEmployers" }
            );

            routes.MapRoute(
                name: "QrMySites",
                url: "qr/mysites",
                defaults: new { controller = "Worker", action = "QrMySites" }
            );

            routes.MapRoute(
                name: "QrAdminEmployers",
                url: "qr/adminemployers",
                defaults: new { controller = "Worker", action = "QrAdminEmployers" }
            );

            routes.MapRoute(
                name: "QrAdminScans",
                url: "qr/adminscans",
                defaults: new { controller = "Worker", action = "QrAdminScans" }
            );

            routes.MapRoute(
                name: "QrAdminLookup",
                url: "qr/adminlookup",
                defaults: new { controller = "Worker", action = "QrAdminLookup" }
            );

            routes.MapRoute(
                name: "QrAdminUsers",
                url: "qr/adminusers",
                defaults: new { controller = "Worker", action = "QrAdminUsers" }
            );

            routes.MapRoute(
                name: "Default",
                url: "{controller}/{action}/{id}",
                defaults: new { controller = "Login", action = "Login", id = UrlParameter.Optional }
            );
        }

    }
}
