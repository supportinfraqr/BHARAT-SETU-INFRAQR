using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace  BAL
{
    public class RouteMasterModel
    {
        public string Id { get; set; }
        public string ActionType { get; set; }
        public string UserId { get; set; }
        public string PartyId { get; set; }

        // Route

        public string RouteName { get; set; }
        public string RouteID { get; set; }
        public string CompanyName { get; set; }
        public string Location { get; set; }
        public string RouteStartLocation { get; set; }
        public string RouteEndLocation { get; set; }
        public string Status { get; set; }

        // Bus
        public string BusNumber { get; set; }
        public string RCNO { get; set; }
        public string SeatingCapacity { get; set; }
        public string BusType { get; set; }

        // Driver
        public string DriverName { get; set; }
        public string DriverContactNumber { get; set; }
        public string DriverAddress { get; set; }
        public string LicenseNumber { get; set; }

        // Conductor
        public string ConductorName { get; set; }
        public string ConductorContact { get; set; }
        public string ConductorAddress { get; set; }

        // Files
        public string LicenseCopy { get; set; }
        public string AadharCardCopy { get; set; }
        public string ConductorAadhaarCard { get; set; }
        public string BusRC { get; set; }
        public string PollutionCertificate { get; set; }
        public string FitnessCertificate { get; set; }
        public string InsuranceCopy { get; set; }
    }
}