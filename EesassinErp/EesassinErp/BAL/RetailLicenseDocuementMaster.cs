using System;
using System.Collections.Generic;

namespace BAL
{
    public class RetailLicenseDocuementMaster : BCommon
    {
        public int PartyId { get; set; }
        public int PermissionId { get; set; }
        public int LicenseId { get; set; }
        public int ActionType { get; set; }
        public long StoreId { get; set; }
        public int PartyTypeId { get; set; }
        public string selectedUsersList { get; set; }
        public string LicenseMasterType { get; set; }
        public string LicenseName { get; set; }
        public string selectedDocumentsList { get; set; }
        public string selectedStoresList { get; set; }
        public string employeecode { get; set; }

        public string ComplianceCategory { get; set; }
        
        public DateTime CreatedOn { get; set; }
        public DateTime UpdateOn { get; set; }
        public int? LastLoginId { get; set; }
        public string LastUpdateBy { get; set; }

        public bool? IsDeleted { get; set; }
        public string StoreCode { get; set; }
        public string Act { get; set; }
        public string FY { get; set; }
        public string CMonth { get; set; }
        public string Id { get; set; }
        public string DocumentPath { get; set; }
        public string UserId { get; set; }
        public string DocumentName { get; set; }
        public string StateId { get; set; }
        public string ApplicationLink { get; set; }
        public string FolderLocation { get; set; }
        public string Detail { get; set; }
        public string Category { get; set; }
        public string Industry { get; set; }
        public string StateList { get; set; }
        public string CategoryList { get; set; }
        public string LCID { get; set; }
        public string LSID { get; set; }


        public List<string> NewActList { get; set; }


        public List<ListStoreSet> DocumentList { get; set; }
        public List<MulipleAct> ActList { get; set; }
    }


    public class ListStoreSet
    {
        public string StoreId { get; set; }
        public string UserId { get; set; }
        public string PartyId { get; set; }
        public string PartyTypeId { get; set; }

        public string CategoryId { get; set; }
    }
    public class MulipleAct
    {
        public string Act { get; set; }

    }

}