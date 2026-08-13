using EesassinErp.Controllers;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using static EesassinErp.Controllers.RolePageAuthorizeAttribute;

namespace EesassinErp.App_Start
{
    public class FilterConfig
    {
        public static void RegisterGlobalFilters(GlobalFilterCollection filters)
        {
            filters.Add(new HandleErrorAttribute());
            filters.Add(new ValidateSessionAttribute()); 
            //filters.Add(new RolePageAuthorizeAttribute());
        }
   } 
}