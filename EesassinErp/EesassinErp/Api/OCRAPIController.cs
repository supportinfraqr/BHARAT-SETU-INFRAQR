using Newtonsoft.Json.Linq;

using System.Net.Http;
using System.Web.Http;
using Newtonsoft.Json;
using System.IO; 
using System.Threading.Tasks;
using System.Web.Hosting;
using System;

namespace EesassinErp.Controllers
{
    [RoutePrefix("Api/OCRAPI")]
    public class OCRAPIController : ApiController
    {
        [HttpPost]
        [Route("ExtractOCRData")]
        public async Task<IHttpActionResult> ExtractOCRData()
        {
            string json = await Request.Content.ReadAsStringAsync();

            var obj = JObject.Parse(json);

            string relativePath = Convert.ToString(obj["FilePath"]);

            string filePath = HostingEnvironment.MapPath(
                "~/" + relativePath.Replace("../", "")
            );

            if (!System.IO.File.Exists(filePath))
            {
                return BadRequest("File not found : " + filePath);
            }

            string result = await ExtractOCRFromFile(filePath);

            return Ok(JsonConvert.DeserializeObject(result));
        }

        private async Task<string> ExtractOCRFromFile(string filePath)
        {
            using (var client = new HttpClient())
            using (var content = new MultipartFormDataContent())
            {
                byte[] bytes = File.ReadAllBytes(filePath);

                var fileContent = new ByteArrayContent(bytes);

                content.Add(
                    fileContent,
                    "file",
                    Path.GetFileName(filePath));

                var response = await client.PostAsync(
                    "http://13.202.27.216:8080/ocr",
                    content);

                string result = await response.Content.ReadAsStringAsync();

                return result;
            }
        }


    }
    public class OCRRequest
    {
        public string FilePath { get; set; }
    }



}




