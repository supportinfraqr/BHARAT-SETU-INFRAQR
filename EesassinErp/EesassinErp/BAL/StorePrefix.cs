using System;

namespace BAL
{
    public class StorePrefix
    {
        public int Id { get; set; }
        public int PartyTypeId { get; set; }
        public string Prefix { get; set; }
        public string Suffix { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public int LoginId { get; set; }
        public int Action { get; set; }
    }
}