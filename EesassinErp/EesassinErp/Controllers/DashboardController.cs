using BAL;
using DAL;
using Newtonsoft.Json;
using System.Threading.Tasks;
using System.Web.Mvc;

namespace EesassinErp.Controllers
{
    [ValidateSession]
    public class DashboardController : Controller
    {
        #region Akhand

        public ActionResult unit()
        {
            return View();
        }
        public ActionResult employee()
        {
            return View();
        }
        public ActionResult communication()
        {
            return View();
        }
        public ActionResult documentsMaster()
        {
            return View();
        }
        public ActionResult unitdocuments()
        {
            return View();
        }
        public ActionResult unitdocumentsDetails()
        {
            return View();
        }
        public ActionResult viewunitdocuments()
        {
            return View();
        }
        #endregion
        // GET: Dashboard
        public ActionResult Dashboard()
        {
            return View();
        }
        public ActionResult AuditorComplianceReport()
        {
            return View();
        }
        public ActionResult PrintComplianceReport()
        {
            return View();
        }


        public ActionResult AdminDashBoard()
        {
            return View();
        }
        public ActionResult VendorDashBoard()
        {

            return View();
        }
        public ActionResult AuditorDashBoard()
        {

            return View();
        }
        public ActionResult ClientDashBoard()
        {

            return View();
        }
        public ActionResult CommonDashboardCompliance()
        {

            return View();
        }
        public ActionResult LabourCommonCompliance()
        {

            return View();
        }
        public ActionResult factoryCommonCompliance()
        {

            return View();
        }
        public ActionResult payrollCommonCompliance()
        {

            return View();
        }
        public ActionResult EstablishmentCommonCompliance()
        {

            return View();
        }
        public ActionResult licenseCommonCompliance()
        {

            return View();
        }
        public ActionResult locationCommonCompliance()
        {

            return View();
        }
        public ActionResult SecretarialCommonCompliance()
        {

            return View();
        }
        public ActionResult FinanceCommonCompliance()
        {

            return View();
        }
        public ActionResult NoticeCommonCompliance()
        {

            return View();
        }
        public ActionResult LitigationCommonCompliance()
        {

            return View();
        }
        public async Task<string> NavMenuList(Module obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DLL.dll.NavMenuList(obj)));
            return result;
        }

        public ActionResult BranchMenuPermission()
        {
            return View();
        }

        public async Task<string> ModuleList(Module obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DLL.dll.ModuleList(obj)));
            return result;
        }

        public async Task<string> SubMenuList(Module obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DLL.dll.SubMenuList(obj)));
            return result;
        }

        public async Task<string> InsertMenuPermission(MenuPermission obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DLL.dll.MenuPermission(obj)));
            return result;
        }



        public async Task<string> InsertBranchMenuPermission(MenuPermission obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DLL.dll.BranchMenuPermission(obj)));
            return result;
        }

        public async Task<string> SearchBranchMenuPermission(BranchAuthorization obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DLL.dll.SearchBranchMenuPermission(obj)));
            return result;
        }



        public async Task<string> InsertSectionPermissionForRole(RolePermission obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DLL.dll.InsertSectionPermissionForRole(obj)));
            return result;
        }





        public ActionResult CompanyBranchUserAssignment()
        {
            return View();
        }

        public ActionResult NavMenuPermission()
        {
            return View();
        }
        public ActionResult LoginPermission()
        {
            return View();
        }
        public async Task<string> GetCompanyAndBranchMaster(BCommon obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DLL.dll.GetCompanyAndBranchMaster(obj)));
            return result;
        }

        public async Task<string> InsertUpdateDeleteCompanyBranchUserPermission(BCommon obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DLL.dll.InsertUpdateDeleteCompanyBranchUserPermission(obj)));
            return result;
        }
        public async Task<string> SearchMenuPermission(BranchAuthorization obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DLL.dll.SearchMenuPermission(obj)));
            return result;
        }
        public async Task<string> UpdateAllMembers(BranchAuthorization obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DLL.dll.UpdateAllMembers(obj)));
            return result;
        }
        public async Task<string> SeprateUpdateMembers(BranchAuthorization obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DLL.dll.SeprateUpdateMembers(obj)));
            return result;
        }
        public async Task<string> GetLoginMemberDetails(BranchAuthorization obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DLL.dll.GetLoginMemberDetails(obj)));
            return result;
        }
        public async Task<string> GetDetails(BranchAuthorization obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DLL.dll.GetDetails(obj)));
            return result;
        }

        public ActionResult ReportHeader()
        {
            return View();
        }
        public async Task<string> InsertUpdateDeleteReportHeader(BranchAuthorization obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DLL.dll.InsertUpdateDeleteReportHeader(obj)));
            return result;
        }
        public async Task<string> GetReportHeader(BCommon obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DLL.dll.GetReportHeader(obj)));
            return result;
        }

        #region  
        public ActionResult UserRegistration()
        {
            return View();
        }

        public async Task<string> GetUserRegistration(BCommon obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.dll.GetUserRegistration(obj)));
            return result;
        }

        public async Task<string> GetempRegistration(BCommon obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.dll.GetempRegistration(obj)));
            return result;
        }

        public async Task<string> IUDUserRegistration(BCommon obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.dll.IUDUserRegistration(obj)));
            return result;
        }

        public async Task<string> IUDEmployeeDoc(BCommon obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.dll.IUDEmployeeDoc(obj)));
            return result;
        }

        #endregion


        #region  RoleMenu Permission
        public ActionResult RoleMenuPermission()
        {
            return View();
        }


        public async Task<string> RoleList(Module obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DLL.dll.RoleList(obj)));
            return result;
        }

        public async Task<string> PagesSectionMasterList(Module obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DLL.dll.PagesSectionMasterList(obj)));
            return result;
        }

        public async Task<string> SearchSectionandRoleMenuPermission(BranchAuthorization obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DLL.dll.SearchSectionandRoleMenuPermission(obj)));
            return result;
        }
        #endregion


        public async Task<string> IUDManageReportHeader(BranchAuthorization obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DLL.dll.IUDManageReportHeader(obj)));
            return result;
        }
        public async Task<string> GetManageReportHeader(BCommon obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DLL.dll.GetManageReportHeader(obj)));
            return result;
        }



        ///Commondashbaord////
        ///

        public ActionResult CommonDashboard()
        {
            return View();
        }

        public ActionResult ReportDashboard()
        {
            return View();
        }

        public ActionResult ReportLicenseApplicable()
        {
            return View();
        }
        public ActionResult Dash()
        {
            return View();
        }

        public ActionResult Board()
        {
            return View();
        }
        //----------------------------

        public ActionResult VBoard()
        {
            return View();
        }
        public ActionResult VBoard1()
        {
            return View();
        }
        public ActionResult NewVendorDashboard()
        {
            return View();
        }
        public ActionResult CommunicationVendor()
        {
            return View();
        }
        public ActionResult CommunicationClient()
        {
            return View();
        }
        public ActionResult OneTimeDocVendor()
        {
            return View();
        }
        public ActionResult oneTimeDocClient()
        {
            return View();
        }
        public ActionResult ComplianceAuditReport()
        {
            return View();
        }
        public ActionResult ComplianceReport()
        {
            return View();
        }
		
		public ActionResult Notifications()
        {
            return View();
        }
        public ActionResult NotificationDetails()
        {
            return View();
        }
        public ActionResult PrincipleEmployerDashboard()
        {
            return View();
        }
        public ActionResult PrinciplesitesOverview()
        {
            return View();
        }
            
        
        public ActionResult ContractorDashboard()
        {
            return View();
        }
		
		// added by aadarsh
		public ActionResult WorkerDashboard()
        {
            return View();
        }
        public ActionResult ContractorGatePass()
        {
            return View();
        }
        public ActionResult ContractorGatePassDetail()
        {
            return View();
        }


        public async Task<string> IUDContractorGatePass(RetailBAL obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DLL.dll.IUDContractorGatePass(obj)));
            return result;
        }
        public async Task<string> GetContractorGatePass(RetailBAL obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DLL.dll.GetContractorGatePass(obj)));
            return result;
        }

        public ActionResult PrincipleEmployerGatePass()
        {
            return View();
        }
        public ActionResult TemporaryGatePass()
        {
            return View();
        }

        public ActionResult ContractorSitesOverview()
        {
            return View();
        }

        public async Task<string> GetContractorDetail(BCommon obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.dll.GetContractorDetail(obj)));
            return result;
        }
    }
}