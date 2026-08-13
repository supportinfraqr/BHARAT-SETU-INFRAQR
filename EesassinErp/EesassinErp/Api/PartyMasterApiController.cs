using BAL;
using Newtonsoft.Json;
using System.Threading.Tasks;
using System.Web.Http;
namespace EesassinErp.Controllers
{
    public class PartyMasterApiController : ApiController
    {
        [HttpPost]
        [Route("Api/PartyMasterApi/GetPartyMasterDT")]
        public async Task<IHttpActionResult> GetPartyMasterDT([FromBody] TblPartyMaster obj)
        {
            var result = await Task.Factory.StartNew(() => DAL.DLL.PartyMaster(obj));
            return Json(result);
        }


        [HttpPost]
        public async Task<string> InsertUpdateDelPartyMaster(TblPartyMaster obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.InsertUpdateDelPartyMaster(obj)));
            return result;
        }


        [HttpPost]
        public async Task<string> GetSearchLocation(TblPartyMaster obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.GetSearchLocation(obj)));
            return result;
        }

        [HttpPost]
        public async Task<string> InsertUpdateDelLocation(TblPartyMaster obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.InsertUpdateDelLocation(obj)));
            return result;
        }
    }
}