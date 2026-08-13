using BAL;
using DAL;
using Newtonsoft.Json;
using System.Threading.Tasks;
using System.Web.Mvc;

namespace EesassinErp.Controllers
{
    public class ReportController : Controller
    {
        // GET: Report
        public ActionResult VendorReport()
        {
            return View();
        }
        public async Task<string> SearchReport(TblPartyMaster obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DLL.dll.SearchReport(obj)));
            return result;
        }
        public async Task<string> SearchReminderReport(TblPartyMaster obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DLL.dll.SearchReminderReport(obj)));
            return result;
        }

        public ActionResult RegisteredPartyMaster()
        {
            return View();
        }

        public ActionResult ReminderReport()
        {
            return View();
        }
        public ActionResult LogOnReport()
        {
            return View();
        }
        public ActionResult ReportLicenseMaster()
        {
            return View();
        }
        public ActionResult NoticeInspection()
        {
            return View();
        }
        public ActionResult ExpectationReport()
        {
            return View();
        }
        public ActionResult WorkerReport()
        {
            return View();
        }


    }
}