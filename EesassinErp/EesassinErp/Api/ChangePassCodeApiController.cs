using BAL;
using DAL;
using Newtonsoft.Json;
using System;
using System.Collections.Specialized;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using System.Web;
using System.Web.Configuration;
using System.Web.Http;

namespace EesassinErp.Controllers
{
    public class ChangePassCodeApiController : ApiController
    {

        private static string GetValidFileName(string fileName)
        {
            String ret = Regex.Replace(fileName.Trim(), "[^A-Za-z0-9_. ]+", "");
            ret = Regex.Replace(ret, "[^0-9]", "");
            return ret.Replace(" ", String.Empty);
        }
        [HttpPost]
        [Route("api/ChangePasscode/UploadPhoto")]
        public async Task<IHttpActionResult> UploadPhoto()
        {
            string LoginId = "";
            if (!Request.Content.IsMimeMultipartContent())
            {
                throw new HttpResponseException(HttpStatusCode.UnsupportedMediaType);
            }

            var provider = await Request.Content.ReadAsMultipartAsync(new MultipartMemoryStreamProvider());
            // Read the content as a multipart request

            // Initialize a dictionary or NameValueCollection to store form data
            NameValueCollection formData = new NameValueCollection();

            // Iterate over each content part in the provider
            foreach (var content in provider.Contents)
            {
                // Check if the content part has a Content-Disposition header
                var contentDisposition = content.Headers.ContentDisposition;
                if (contentDisposition != null)
                {
                    // If there's no FileName, this part is a form field (not a file)
                    if (string.IsNullOrEmpty(contentDisposition.FileName))
                    {
                        // Read the form field name and value
                        var fieldName = contentDisposition.Name?.Trim('\"');
                        var fieldValue = await content.ReadAsStringAsync();
                        LoginId = fieldValue;
                        if (!string.IsNullOrEmpty(fieldName))
                        {
                            formData.Add(fieldName, fieldValue);
                        }
                    }
                    else
                    {
                        // This part is a file, process the file as needed
                    }
                }
            }

            // Identify file content by checking for FileName in the ContentDisposition header
            var fileContent = provider.Contents.FirstOrDefault(c =>
                c.Headers.ContentDisposition != null &&
                !string.IsNullOrEmpty(c.Headers.ContentDisposition.FileName));

            if (fileContent == null)
            {
                throw new HttpResponseException(HttpStatusCode.BadRequest);
            }

            var originalFileName = fileContent.Headers.ContentDisposition.FileName.Trim('\"');
            string fileExtension = Path.GetExtension(originalFileName).ToLower();

            // Allow only PDF and Image files
            string[] allowedExtensions = { ".jpeg", ".jpg", ".png", ".pdf" };
            if (!allowedExtensions.Contains(fileExtension))
            {
                throw new HttpResponseException(HttpStatusCode.UnsupportedMediaType);
            }

            // Generate new filename using DateTime and GUID

            string newFileName = "";
            string strPassword = Guid.NewGuid().ToString("N").Substring(0, 4);
            newFileName += strPassword;
            newFileName += DateTime.Now.Year.ToString();
            newFileName += DateTime.Now.Month.ToString("D2"); // Ensure two digits for month
            newFileName += DateTime.Now.Day.ToString("D2"); // Ensure two digits for day
            newFileName += DateTime.Now.Hour.ToString("D2"); // Ensure two digits for hour
            newFileName += DateTime.Now.Minute.ToString("D2"); // Ensure two digits for minute
            newFileName += DateTime.Now.Second.ToString("D2"); // Ensure two digits for second
            newFileName += DateTime.Now.Millisecond.ToString("D3");
            newFileName += fileExtension;
            string directoryName = Path.Combine(HttpRuntime.AppDomainAppPath, "DownloadMat\\ProfilePhoto");
            Directory.CreateDirectory(directoryName);

            string filename = Path.Combine(directoryName, newFileName);

            using (Stream input = await fileContent.ReadAsStreamAsync())
            using (Stream file = File.OpenWrite(filename))
            {
                await input.CopyToAsync(file);
            }

            // Construct the URL based on your configuration
            string tempDocUrl = WebConfigurationManager.AppSettings["DocsUrl"];
            string Savingpath = "../DownloadMat/ProfilePhoto";
            string URL = $"{Savingpath}/{newFileName}";

            LoginBAL obj = new LoginBAL();
            {
                obj.Photo = URL;
                obj.Action = "12";
                obj.LoginId = LoginId;

            }
            var result = await Task.Run(() => DLL.dll.UploadPhoto(obj));
            return Json(result); // This will return plain JSON. 
        }


        [HttpPost]
        [Route("api/ChangePasscode/checkPassCode")]
        public async Task<string> checkPassCode(LoginBAL obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.dll.checkPassCode(obj)));
            return result;
        }
        [HttpPost]
        [Route("api/ChangePasscode/ModifyPassCode")]
        public async Task<IHttpActionResult> ModifyPassCode(LoginBAL obj)
        {
            string result = await Task.Run(() => DAL.DLL.dll.ModifyPassCode(obj));
            return Json(result);
        }

    }
}