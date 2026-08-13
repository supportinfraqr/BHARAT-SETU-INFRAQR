using BAL;
using Newtonsoft.Json;
using System.Threading.Tasks;
using System.Web.Http;

namespace EesassinErp.Controllers
{
    public class CDMApiController : ApiController
    {
        [HttpPost]
        public async Task<string> GetCDM(DocumentBAL obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.dll.GetCDM(obj)));
            return result;
        }

        [HttpPost]
        public async Task<string> IUDCDM(MenuPermission obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.dll.IUDCDM(obj)));
            return result;
        }
    }
}