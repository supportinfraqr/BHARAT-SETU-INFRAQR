namespace BAL
{
    public class TblModuleMappingMaster
    {
        public string ActionType { get; set; }
        public long Id { get; set; }
        public long Module_Reg_Id { get; set; }
        public int Party_Id { get; set; }
        public int Party_Type_Id { get; set; }
        public int IsActive { get; set; }
        public int IsApproval { get; set; }
        public int IsDeleted { get; set; }
        public int? userid { get; set; }
    }
}