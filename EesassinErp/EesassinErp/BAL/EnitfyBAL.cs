using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace BAL
{
    public class EnitfyBAL
    { 
            // Action Type
            public int Action { get; set; }

            // Entity Details
            public string EntityType { get; set; }
            public string ListedCompany { get; set; }
            public string ListedStatus { get; set; }
            public string StockExchange { get; set; }
            public string FundingStatus { get; set; }
            public string FundingType { get; set; }

            public string Turnover { get; set; }
            public string NetProfit { get; set; }
            public string Borrowing { get; set; }
            public string AuthorizedShareCap { get; set; }
            public string IssuedShareCap { get; set; }
            public string PaidupCap { get; set; }
            public string AverageNetProfit { get; set; }

            public string HoldingSubsidiary { get; set; }
            public string NBFCRegisterd { get; set; }
            public string RBIRegistered { get; set; }
            public string Startup { get; set; }
            public string MSMERegistered { get; set; }
            public string RegisteredunderGST { get; set; }

            // Company Structure & Identification
            public string CIN { get; set; }
            public string PAN { get; set; }
            public string TAN { get; set; }
            public DateTime? IncorporationDate { get; set; }
            public string RegisteredState { get; set; }
            public string NICCode { get; set; }
            public string FinancialYearEnd { get; set; }

            // Director / KMP Details
            public string ResidentDirector { get; set; }
            public int? IndependentDirectors { get; set; }
            public string WomenDirector { get; set; }
            public string CSAppointed { get; set; }
            public string KMPAppointed { get; set; }

            // Optional for system fields (if needed)
            public string Module_Name { get; set; }
            public string Description { get; set; }
            public DateTime? Start_Date { get; set; }
            public DateTime? End_Date { get; set; }
            public int? IsActive { get; set; }
            public int? IsApproval { get; set; }
            public int? IsDeleted { get; set; }
            public int? Id { get; set; }
            public int? UserId { get; set; }
        }

    }