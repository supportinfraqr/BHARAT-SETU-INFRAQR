using System.Collections.Generic;

namespace BAL
{
    public class SMSBAL
    {
        public string Action { get; set; }
        public string ClassId { get; set; }
        public string SectionId { get; set; }
        public string BranchId { get; set; }
        public string HouseId { get; set; }
        public string DesignationId { get; set; }
        public string MessageFor { get; set; }
        public string ContactNo { get; set; }
        public string Msg { get; set; }
        public List<contactList> MessageList { get; set; }
    }
    public struct contactList
    {
        public string ContactNo { get; set; }
        public string Msg { get; set; }

    }



}
