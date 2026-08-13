using BAL;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;
using System.Web.Mvc;

namespace EesassinErp.Controllers
{
    [ValidateSession]
    public class NewsletterController : Controller
    {
        public ActionResult Newsletter()
        {
            return View();// Assign Executer Retail/RetailAssignExecuter
        }

        public async Task<string> GetNewsletterDT(TblNewLetter obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.Get_NewLetters(obj)));
            return result;
        }

        public async Task<string> GetNewsletterForSearchDT()
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.Get_NewLettersForSearch()));
            return result;
        }

        public async Task<string> GetDepartments()
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.GetDepartments()));
            return result;
        }

        //[ValidateInput(false)]
        public async Task<string> InsertUpdateNewsletter()
        {
            //if (!string.IsNullOrEmpty(obj.UploadDocPath))
            //{
            //    if (obj.UploadDocPath.Contains("data:application/"))
            //    {
            //        obj.UploadDocPath = Regex.Replace(obj.UploadDocPath, @"^data:application\/[a-zA-Z]+;base64,", string.Empty);
            //        string NewFileName = "";
            //        string strPassword = Guid.NewGuid().ToString("N").Substring(0, 4);
            //        NewFileName += strPassword;
            //        NewFileName += DateTime.Now.Year.ToString();
            //        NewFileName += DateTime.Now.Month.ToString();
            //        NewFileName += DateTime.Now.Day.ToString();
            //        byte[] data = Convert.FromBase64String(obj.UploadDocPath);
            //        var imageStream = new MemoryStream(data, false);
            //        string extention = ".pdf";
            //        string dir = "../DownloadMat/Doc/NewsLetter";
            //        string dirPath = System.Web.HttpContext.Current.Server.MapPath(dir);
            //        if (!Directory.Exists(dirPath))
            //        {
            //            Directory.CreateDirectory(dirPath);
            //        }
            //        string uploadpath = dir +"/" +obj.SubjectLine + "_" + NewFileName + extention;
            //        string filePath = System.Web.HttpContext.Current.Server.MapPath(uploadpath);
            //        FileStream file = new FileStream(filePath, FileMode.Create, FileAccess.Write);
            //        imageStream.WriteTo(file);
            //        file.Close();
            //        imageStream.Close();
            //        obj.UploadDocPath = uploadpath;
            //    }
            //}
            TblNewLetter obj = new TblNewLetter();
            obj.SubjectLine = Request.Form["SubjectLine"];
            if (Request.Files.Count > 0)
            {
                var file = Request.Files[0]; // Get the uploaded file
                                             // Process the file (e.g., save it)
                string dir = "../DownloadMat/Doc/NewsLetter";
                string dirPath = System.Web.HttpContext.Current.Server.MapPath(dir);
                if (!Directory.Exists(dirPath))
                {
                    Directory.CreateDirectory(dirPath);
                }
                string NewFileName = "";
                string strPassword = Guid.NewGuid().ToString("N").Substring(0, 4);
                NewFileName += strPassword;
                NewFileName += DateTime.Now.Year.ToString();
                NewFileName += DateTime.Now.Month.ToString();
                NewFileName += DateTime.Now.Day.ToString();
                string extention = ".pdf";
                string uploadpath = dir + "/" + obj.SubjectLine + "_" + NewFileName + extention;
                string filePath = System.Web.HttpContext.Current.Server.MapPath(uploadpath);
                //var filePath = Path.Combine(Server.MapPath("~/Uploads"), file.FileName);
                file.SaveAs(filePath);
                obj.UploadDocPath = uploadpath;
            }

            obj.StateCentralActtitle = Request.Form["StateCentralActtitle"]; // Get additional form data
                                                                             // obj.DateOfNotification = Convert.ToDateTime(Request.Form["DateOfNotification"]);
            obj.SATE_CODE = Convert.ToDouble(Request.Form["SATE_CODE"]);
            obj.SelectedClients = new List<string>(Request.Form["SelectedClients"]?.Split(new[] { ',' }, StringSplitOptions.RemoveEmptyEntries)); ;
            // obj.EffectiveDateOfNotification = Convert.ToDateTime(Request.Form["EffectiveDateOfNotification"]);
            obj.NotificationNumber = Request.Form["NotificationNumber"];
            obj.NewsCategory = Request.Form["NewsCategory"];
            obj.DepartmentId = Convert.ToInt32(Request.Form["DepartmentId"]);


            // string summ = Request.Form["Summary"];

            obj.ActionType = Convert.ToInt32(Request.Form["ActionType"]);
            obj.Id = Convert.ToInt32(Request.Form["Id"]);

            obj.PartyId = string.Join(",", obj.SelectedClients);
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.InsertUpdateDelNewLetter(obj)));
            int count = 0;
            NewsletterResponse response = JsonConvert.DeserializeObject<NewsletterResponse>(result);
            foreach (var client in obj.SelectedClients)
            {
                string mappingresult = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.InsertNewsLetterClientMapping(Convert.ToInt32(response.Result), Convert.ToInt32(client), count)));
                count++;
            }

            return result;
        }

        public async Task<string> UpdateNewsletterSummary(TblNewLetter obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.UpdateNewsletterSummary(obj)));
            return result;
        }

        public async Task<string> GetNewsletterClientNames(TblNewLetter obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.GetClientNames(obj.Id)));
            return result;
        }
    }
}