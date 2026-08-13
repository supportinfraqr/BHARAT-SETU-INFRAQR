using DAL;
using System.Linq;
using System.Threading.Tasks;
using System.Web.Http;
using Newtonsoft.Json.Linq;
using System;

namespace EesassinErp.Api
{
    [RoutePrefix("Api/ApiVerification")]
    public class ApiVerificationController : ApiController
    {
        public class VerificationRequest
        {
            public string AadhaarNumber { get; set; }
            public string DocType { get; set; }
            public string otp { get; set; }
            public string referenceId { get; set; }
            public string LoginId { get; set; }
        }
        [HttpPost]
        [Route("Generate")]
        public async Task<IHttpActionResult> Generate([FromBody] VerificationRequest request)
        {
          
            try
            {
                var response = await DLL.GenerateOtp(request.AadhaarNumber);
                return Ok(JObject.Parse(response));

                
            }
            catch (Exception ex)
            {
                return Json(new
                {
                    Status = false,
                    Error = ex.ToString()
                });
            }
        }
        [HttpPost]
        [Route("Verify")]
        public async Task<IHttpActionResult> Verify([FromBody] VerificationRequest request )
        {
            var response = await DLL.VerifyOtp(request.referenceId, request.otp, request.AadhaarNumber,request.LoginId);
            return Ok(response);
        }
    }
}