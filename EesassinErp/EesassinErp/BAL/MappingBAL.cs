using System.Collections.Generic;

namespace BAL
{
    public class MappingBAL
    {
            
           
        public string Createdby { get; set; }
        public string ClientId { get; set; }
        public string ClientSiteId { get; set; }
        public string VendorId { get; set; }
        public string AuditorId { get; set; }
        public string Action { get; set; }
        public string Id { get; set; }
        public string GroupId { get; set; }
        public string GroupUserId { get; set; }
        public string SubcidiaryId { get; set; }
        public string SubcidiaryUserId { get; set; }
        public List<MapListSet> MapListSet { get; set; }
        public List<Map1ListSet> Map1ListSet { get; set; }
        public List<SubcidiaryListSet> SubcidiaryListSet { get; set; }
    }
    public class MapListSet
    {
        public string Srno { get; set; }
        public string Id { get; set; }
        public string ClientId { get; set; }
        public string ClientSiteId { get; set; }
        public string VendorId { get; set; }
        public string AuditorId { get; set; }
        public string Createdby { get; set; }
    }

    public class Map1ListSet
    {
        public string Srno { get; set; }
        public string Id { get; set; }
        public string State { get; set; }
        public string StoreId { get; set; }
        public string Act { get; set; }
        public string RegistrationNumber { get; set; }
        public string  ComplianceName { get; set; }
        public string ValidFrom { get; set; }
        public string ValidTo { get; set; }
        public string TypeCode { get; set; }
        public string RegistrationType { get; set; }
        public string Upload { get; set; }
    }
    public class SubcidiaryListSet
    {
        public string Srno { get; set; }
        public string Id { get; set; }
        public string GroupId { get; set; }
        public string GroupUserId { get; set; }
        public string SubcidiaryId { get; set; }
        public string SubcidiaryUserId { get; set; }
    }
}