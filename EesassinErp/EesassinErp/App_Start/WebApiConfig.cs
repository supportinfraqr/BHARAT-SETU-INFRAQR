using System.Web.Http;

namespace EesassinErp.App_Start
{
    public static class WebApiConfig
    {
        //public static void Register(HttpConfiguration config)
        //{
        //    // TODO: Add any additional configuration code.

        //    // Web API routes
        //    config.MapHttpAttributeRoutes();

        //    config.Routes.MapHttpRoute(
        //        name: "DefaultApi",
        //        routeTemplate: "api/{controller}/{id}",
        //        defaults: new { id = RouteParameter.Optional }
        //    ); 
        //    var formatter = GlobalConfiguration.Configuration.Formatters.JsonFormatter;
        //    formatter.SerializerSettings.ContractResolver =
        //        new Newtonsoft.Json.Serialization.CamelCasePropertyNamesContractResolver();
        //}
        public static void Register(HttpConfiguration config)
        {
            // Enable attribute routing
            config.MapHttpAttributeRoutes();

            // Define default route
            config.Routes.MapHttpRoute(
                name: "DefaultApi",
                routeTemplate: "api/{controller}/{id}",
                defaults: new { id = RouteParameter.Optional }
            );

            // Use camelCase property names in JSON response
            var formatter = config.Formatters.JsonFormatter;
            formatter.SerializerSettings.ContractResolver =
                new Newtonsoft.Json.Serialization.CamelCasePropertyNamesContractResolver();
        }


    }
}