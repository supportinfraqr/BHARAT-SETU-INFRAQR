using BAL;
using Newtonsoft.Json;
using System.Threading.Tasks;
using System.Web.Mvc;

namespace EesassinErp.Controllers
{
    public class TimePeriodController : Controller
    {
        // GET: TimePeriod
        public ActionResult TimePeriod()
        {
            return View();
        }
        public ActionResult TimePeriodReset()
        {
            return View();
        }
        public async Task<string> IUDTimePeriod(TblPartyMaster obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.IUDTimePeriod(obj)));
            return result;
        }

        public async Task<string> GetSearchTimePeriod(TblPartyMaster obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.GetSearchTimePeriod(obj)));
            return result;
        }
    }
}