using BAL;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Data;
using System.Data.SqlClient;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using System.Web;
using System.Web.Mvc;
using System.Web.UI.WebControls;

namespace ezcompliance.Controllers
{
    public class GrievancesController : Controller
    {
        // GET: Grievances
        public ActionResult WorkerRegistration()
        {
            return View();
        }
        public ActionResult WorkerLodgeGrievance()
        {
            return View();
        }
        public ActionResult WorkerGrievances()
        {
            return View();
        }
        public ActionResult WorkerGrievancesDetails()
        {
            return View();
        }

        public ActionResult ContractorGrievances()
        {
            return View();
        }
        public ActionResult ContractorGrievancesDetails()
        {
            return View();
        }


        public ActionResult GrievancesDetails()
        {
            return View();
        }
        public ActionResult supportGrievances()
        {
            return View();
        }
        // added by aadarsh
        public ActionResult NewWorkerRegistraton()
        {
            return View();
        }



        public class GrievanceSaveModel
        {
            public string AiText { get; set; }
            public string AudioFileName { get; set; }
            public string DocumentsJson { get; set; }
            public string LoginId { get; set; }
        }
      
        [HttpPost]
        public async Task<JsonResult> UploadDocuments(string AiText, string LoginId, string Subject) 
        {
            try
            {
                List<string> uploadedFiles = new List<string>();

                string audioFileName = "";

                string documentFolder =
                    Server.MapPath("~/DownloadMat/Uploads/GrevancesDocuments/");

                string audioFolder =
                    Server.MapPath("~/DownloadMat/Uploads/Audio/");

                if (!Directory.Exists(documentFolder))
                    Directory.CreateDirectory(documentFolder);

                if (!Directory.Exists(audioFolder))
                    Directory.CreateDirectory(audioFolder);

                // Save All Files
                for (int i = 0; i < Request.Files.Count; i++)
                {
                    HttpPostedFileBase file =
                        Request.Files[i];

                    if (file == null ||
                        file.ContentLength <= 0)
                        continue;

                    string extension =
                        Path.GetExtension(file.FileName)
                        .ToLower();

                    // Audio File
                    if (extension == ".webm" ||
                        extension == ".mp3" ||
                        extension == ".wav")
                    {
                        audioFileName =
                            Guid.NewGuid().ToString() +
                            extension;

                        file.SaveAs(
                            Path.Combine(
                                audioFolder,
                                audioFileName));
                    }
                    else
                    {
                        string documentName =
                            Guid.NewGuid().ToString() +
                            "_" +
                            Path.GetFileName(file.FileName);

                        file.SaveAs(
                            Path.Combine(
                                documentFolder,
                                documentName));

                        uploadedFiles.Add(
                            documentName);
                    }
                }
                
                   string documents = string.Join(",", uploadedFiles);

                var obj = new RetailBAL
                {
                    LoginId = LoginId,
                    AiText = AiText,
                    Subject  = Subject,
                    Documents = documents,
                    AudioFileName = audioFileName,
                    Action = "1",
                };

                string result = await Task.Run(() => JsonConvert.SerializeObject(DAL.DLL.InsertGrivances(obj)));
                return Json(new { status = true, Result = result });


            } 
            catch (Exception ex)
            {
                return Json(new { status = false, message = ex.Message });
            }
        }




        public async Task<string> getGrivances(RetailBAL obj)
        {
            if (!string.IsNullOrEmpty(obj.Documents))
            {
                obj.Documents = SaveLetter(obj.Documents, "Grievance");
            }
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.getGrivances(obj)));
            return result;
        }

        private string SaveLetter(string dataURI, string For)
        {
            try
            {
                if (!string.IsNullOrEmpty(dataURI) && dataURI.StartsWith("data:application/"))
                {
                    string extension = Regex.Match(dataURI, @"^data:application\/[a-zA-Z]+;base64,").Value;
                    extension = extension.Replace("data:application/", "").Replace(";base64,", "");

                    string fileName = Guid.NewGuid().ToString("N") + "." + extension;
                    byte[] fileData = Convert.FromBase64String(dataURI.Substring(dataURI.IndexOf(',') + 1));

                    string folderPath = "";
                    string uploadpath = "";

                    if (For == "Grievance")
                    {
                        uploadpath = "../DownloadMat/Grievance/" + fileName;
                        folderPath = Server.MapPath("../DownloadMat/Grievance/");
                    }
                    if (!Directory.Exists(folderPath))
                    {
                        Directory.CreateDirectory(folderPath);
                    }

                    string filePath = Path.Combine(folderPath, fileName);
                    System.IO.File.WriteAllBytes(filePath, fileData);

                    return uploadpath;
                }

                return null;
            }
            catch (Exception ex)
            {
                throw;
            }
        }

        public async Task<string> ApproveLetter(RetailBAL obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.ApproveLetter(obj)));
            return result;

        }
    }
}