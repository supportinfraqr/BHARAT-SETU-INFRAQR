using BAL;
using Newtonsoft.Json;
using System.Threading.Tasks;
using System.Web.Mvc;

namespace EesassinErp.Controllers
{
    public class CommunicationController : Controller
    {
        // GET: Communication
        public ActionResult Communication()
        {
            return View();
        }
        public ActionResult VCommunication()
        {
            return View();
        }
        public ActionResult CCommunication()
        {
            return View();
        }
        public async Task<string> GetCommunication(DocumentBAL obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.dll.GetCommunication(obj)));
            return result;
        }


        public async Task<string> IUDCommunication(DocumentBAL obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.dll.IUDCommunication(obj)));
            return result;
        }

        public async Task<string> DownloadFiles(TblVendorInvoiceBAL obj)
        {

            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.dll.DownloadFiles(obj)));
            return result;
        }
    }
}