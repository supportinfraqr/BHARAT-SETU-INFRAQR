using BAL;
using Newtonsoft.Json;
using System.Threading.Tasks;
using System.Web.Mvc;

namespace EesassinErp.Controllers
{
    public class PartyMasterController : Controller
    {
        public ActionResult PartyMast()
        {
            return View();
        }
        public async Task<string> GetPartyMasterDT(TblPartyMaster obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.PartyMaster(obj)));
            return result;
        }


        public async Task<string> InsertUpdateDelPartyMaster(TblPartyMaster obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.InsertUpdateDelPartyMaster(obj)));
            return result;
        }


        public ActionResult Location()
        {
            return View();
        }
        public async Task<string> GetSearchLocation(TblPartyMaster obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.GetSearchLocation(obj)));
            return result;
        }


        public async Task<string> InsertUpdateDelLocation(TblPartyMaster obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.InsertUpdateDelLocation(obj)));
            return result;
        }

        // her is new code for Compliances dated 07,08/08/2026
        public ActionResult minimumWages()
        {
            return View();
        }
        public ActionResult LWF()
        {
            return View();
        }
        public ActionResult licenseManagement()
        {
            return View();
        }
        public ActionResult professionalTax()
        {
            return View();
        }
        public async Task<string> InsertUpdateDelLWFCompliance(tblCompliances obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.InsertUpdateDelLWFCompliance(obj)));
            return result;
        }

        public async Task<string> GetNewCompliancesData(tblCompliances obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.GetNewCompliancesData(obj)));
            return result;
        }

        public async Task<string> InsertUpdateDelMinimumWageCompliance(MinimumWages obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.InsertUpdateDelMinimumWageCompliance(obj)));
            return result;
        }

        public async Task<string> GetNewCMinmumWages(MinimumWages obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.GetNewCMinmumWages(obj)));
            return result;
        }

        public async Task<string> SaveDynamicRows(DynamicRowsModel obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.SaveDynamicRows(obj)));

            return result;
        }
    }
}