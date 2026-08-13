using System;
using System.IO;
using System.Web.Mvc;

namespace EesassinErp.Controllers
{
    public class EmailNewsLetter
    {
        public string Id { get; set; } // Corresponds to [Id] [int] IDENTITY(1,1) NOT NULL
        public string StateCentralActtitle { get; set; } // Corresponds to  NULL
        public DateTime? DateOfNotification { get; set; } // Corresponds to [DateOfNotification] [datetime] NULL
        public double? SATE_CODE { get; set; } // Corresponds to [SATE_CODE] [float] NULL
        public DateTime? EffectiveDateOfNotification { get; set; } // Corresponds to [EffectiveDateOfNotification] [datetime] NULL
        public string NotificationNumber { get; set; } // Corresponds to  NULL
        public int? DepartmentId { get; set; } // Corresponds to [DepartmentId] [int] NULL
        public string UploadDocPath { get; set; } // Corresponds to [UploadDocs] [bit] NULL
        public string SubjectLine { get; set; } // Corresponds to   NULL
        public int? PartyId { get; set; } // Corresponds to [PartyId] [int] NULL
        public string PartyName { get; set; } // Corresponds to [UploadDocs] [bit] NULL
        public string Summary { get; set; }
        public string STATE_NM { get; set; } // Corresponds to   NULL
        public string DepartmentName { get; set; } // Corresponds to   NULL

        public string ClientId { get; set; }
        public string Action { get; set; } // Corresponds to   NULL

        //  public HtmlString sum { get; set; }
    }

    public class RazorViewToStringRenderer
    {
        public string RenderViewToString(ControllerContext context, string viewName, object model)
        {
            context.Controller.ViewData.Model = model;

            using (var sw = new StringWriter())
            {
                var viewResult = ViewEngines.Engines.FindPartialView(context, viewName);
                var viewContext = new ViewContext(context, viewResult.View, context.Controller.ViewData, context.Controller.TempData, sw);
                viewResult.View.Render(viewContext, sw);
                return sw.GetStringBuilder().ToString();
            }
        }
    }
}