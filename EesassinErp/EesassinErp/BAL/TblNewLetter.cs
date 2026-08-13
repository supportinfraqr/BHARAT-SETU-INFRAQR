using System;
using System.Collections.Generic;
using System.Web.Mvc;

namespace BAL
{
    public class NewsletterResponse
    {
        public string Result { get; set; }
        public int Id { get; set; }
        public object Exception { get; set; }
        public int Status { get; set; }
        public bool IsCanceled { get; set; }
        public bool IsCompleted { get; set; }
        public int CreationOptions { get; set; }
        public object AsyncState { get; set; }
        public bool IsFaulted { get; set; }
    }

    public partial class TblNewLetter : BCommon
    {
        public int Id { get; set; } // Corresponds to [Id] [int] IDENTITY(1,1) NOT NULL
        public string StateCentralActtitle { get; set; } // Corresponds to  NULL
        public DateTime? DateOfNotification { get; set; } // Corresponds to [DateOfNotification] [datetime] NULL
        public double? SATE_CODE { get; set; } // Corresponds to [SATE_CODE] [float] NULL
        public DateTime? EffectiveDateOfNotification { get; set; } // Corresponds to [EffectiveDateOfNotification] [datetime] NULL
        public string NotificationNumber { get; set; } // Corresponds to  NULL
        public int? DepartmentId { get; set; } // Corresponds to [DepartmentId] [int] NULL
        public string UploadDocPath { get; set; } // Corresponds to [UploadDocs] [bit] NULL
        public string SubjectLine { get; set; } // Corresponds to   NULL
        public string PartyId { get; set; } // Corresponds to [PartyId] [int] NULL

        [AllowHtml]
        public string Summary { get; set; }

        public int ActionType { get; set; }

        public DateTime CreatedDate { get; set; }

        public List<string> SelectedClients { get; set; }

        public string NewsCategory { get; set; } // added by aadarsh
    }
}
