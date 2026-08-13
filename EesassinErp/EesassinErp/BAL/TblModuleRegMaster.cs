using System;


namespace BAL
{
    public class TblModuleRegMaster
    {
        public string ActionType { get; set; }
        public long Id { get; set; }
        public string Module_Name { get; set; }
        public string Description { get; set; }
        public DateTime? Start_Date { get; set; }
        public DateTime? End_Date { get; set; }
        public int IsActive { get; set; }
        public int IsApproval { get; set; }
        public int IsDeleted { get; set; }
        public int? userid { get; set; }

    }
}