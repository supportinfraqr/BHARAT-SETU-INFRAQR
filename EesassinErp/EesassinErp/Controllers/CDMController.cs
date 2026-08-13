using BAL;
using Newtonsoft.Json;
using System.Threading.Tasks;
using System.Web.Mvc;

namespace EesassinErp.Controllers
{
    public class CDMController : Controller
    {
        // GET: CDM
        public ActionResult CDM()
        {
            return View();
        }
        public async Task<string> GetCDM(DocumentBAL obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.dll.GetCDM(obj)));
            return result;
        }


        public async Task<string> IUDCDM(MenuPermission obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.dll.IUDCDM(obj)));
            return result;
        }
    }
}