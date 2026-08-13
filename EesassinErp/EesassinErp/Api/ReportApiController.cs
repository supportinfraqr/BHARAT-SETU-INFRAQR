using BAL;
using DAL;
using Newtonsoft.Json;
using System.Threading.Tasks;
using System.Web.Http;

namespace EesassinErp.Controllers
{
    public class ReportApiController : ApiController
    {
        [HttpPost]
        public async Task<string> SearchReport(TblPartyMaster obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DLL.dll.SearchReport(obj)));
            return result;
        }
    }
}