using BAL;
using DAL;
using Newtonsoft.Json;
using System;
using System.IO;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using System.Web.Mvc;

namespace EesassinErp.Controllers
{
    public class RatingController : Controller
    {
        // GET: Rating
        public ActionResult RATING()
        {
            return View();
        }
        public async Task<string> SearchRating(RatingBAL obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DLL.dll.SearchRating(obj)));
            return result;
        }
        public async Task<string> GetValues(DocumentBAL obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DLL.dll.GetValues(obj)));
            return result;
        }


        public async Task<string> IUDRating(RatingBAL obj)
        {
            if (!string.IsNullOrEmpty(obj.Certificate))
            {
                if (obj.Certificate.Contains("data:application/"))
                {
                    obj.Certificate = Regex.Replace(obj.Certificate, @"^data:application\/[a-zA-Z]+;base64,", string.Empty);

                    string NewFileName = "";
                    string strPassword = Guid.NewGuid().ToString("N").Substring(0, 4);
                    NewFileName += strPassword;
                    NewFileName += DateTime.Now.Year.ToString();
                    NewFileName += DateTime.Now.Month.ToString();
                    NewFileName += DateTime.Now.Day.ToString();
                    NewFileName += DateTime.Now.Hour.ToString();
                    NewFileName += DateTime.Now.Minute.ToString();
                    NewFileName += DateTime.Now.Second.ToString();
                    NewFileName += DateTime.Now.Millisecond.ToString();
                    byte[] data = Convert.FromBase64String(obj.Certificate);
                    var imageStream = new MemoryStream(data, false);
                    string extention = ".pdf";
                    string uploadpath = "../DownloadMat/Certificate/" + NewFileName + extention;
                    string filePath = System.Web.HttpContext.Current.Server.MapPath(uploadpath);
                    FileStream file = new FileStream(filePath, FileMode.Create, FileAccess.Write);
                    imageStream.WriteTo(file);
                    file.Close();
                    imageStream.Close();
                    obj.Certificate = uploadpath;
                }

            }
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DLL.dll.IUDRating(obj)));
            return result;
        }

    }
}