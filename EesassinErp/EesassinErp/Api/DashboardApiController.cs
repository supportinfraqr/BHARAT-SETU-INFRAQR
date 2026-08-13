using BAL;
using DAL;
using Newtonsoft.Json;
using System.Threading.Tasks;
using System.Web.Http;

namespace EesassinErp.Controllers
{
    public class DashboardApiController : ApiController
    {
        [HttpPost]
        public async Task<string> NavMenuList(Module obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DLL.dll.NavMenuList(obj)));
            return result;
        }
        [HttpPost]
        public async Task<string> ModuleList(Module obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DLL.dll.ModuleList(obj)));
            return result;
        }
        [HttpPost]
        public async Task<string> SubMenuList(Module obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DLL.dll.SubMenuList(obj)));
            return result;
        }
        [HttpPost]
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


        public async Task<string> GetUserRegistration(BCommon obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.dll.GetUserRegistration(obj)));
            return result;
        }


        public async Task<string> IUDUserRegistration(BCommon obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.dll.IUDUserRegistration(obj)));
            return result;
        }
    }
}