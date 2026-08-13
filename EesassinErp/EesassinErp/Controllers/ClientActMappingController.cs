using BAL;
using Newtonsoft.Json;
using System.Threading.Tasks;
using System.Web.Mvc;

namespace EesassinErp.Controllers
{
    public class ClientActMappingController : Controller
    {
        // GET: ClientActMapping
        public ActionResult ClientActMapping()
        {
            return View();
        }
        public async Task<string> IUDClientActMapping(MenuPermission obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.IUDClientActMapping(obj)));
            return result;
        }

        public async Task<string> SearchClientActMapping(MenuPermission obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.SearchClientActMapping(obj)));
            return result;
        }
    }
}