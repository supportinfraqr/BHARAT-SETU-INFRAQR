using BAL;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using System.Web;
using System.Web.Mvc;

namespace EesassinErp.Controllers
{
    public class SkillController : Controller
    {
        // GET: Skill
        public ActionResult Index()
        {
            return View();
        }

        public ActionResult PrincipleSkillDashboard()
        {
            return View();
        }
        public ActionResult WorkerSkillDashboard()
        {
            return View();
        }
        public ActionResult WorkerAlbum()
        {
            return View();
        }
        public ActionResult WorkerSkillModule()
        {
            return View();
        }
        public ActionResult PrincipleSkillCourses()
        {
            return View();
        }
        public async Task<string> AddCourse(SkillBAL obj)
        {
            if (!string.IsNullOrEmpty(obj.CourseCoverPage_Preview))
            {
                obj.CourseCoverPage_Preview = SaveFile(obj.CourseCoverPage_Preview, "Skill");
            }
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.AddCourse(obj)));
            return result;
        }

        public async Task<string> UpdateFlags(SkillBAL obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.UpdateFlags(obj)));
            return result;
        }
        private string SaveFile(string dataURI, string For)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(dataURI))
                    return null;

                if (!dataURI.StartsWith("data:"))
                    return null;

                string mimeType = Regex.Match(dataURI, @"data:(.*?);base64").Groups[1].Value;
                string extension = mimeType.Split('/')[1];

                string fileName = Guid.NewGuid().ToString("N") + "." + extension;

                byte[] fileData = Convert.FromBase64String(dataURI.Substring(dataURI.IndexOf(',') + 1));

                string folderPath = "";
                string uploadPath = "";

                if (For.Equals("Skill", StringComparison.OrdinalIgnoreCase))
                {
                    folderPath = Server.MapPath("../Content/Skill/");
                    uploadPath = "../Content/Skill/" + fileName;
                }

                if (!Directory.Exists(folderPath))
                    Directory.CreateDirectory(folderPath);

                string filePath = Path.Combine(folderPath, fileName);

                System.IO.File.WriteAllBytes(filePath, fileData);

                return uploadPath;
            }
            catch (Exception ex)
            {
                throw new Exception(ex.ToString());
            }
        }

        public async Task<string> GetCourseDetail(SkillBAL obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.GetCourseDetail(obj)));
            return result;
        }

        //public async Task<string> SaveVideo(VideoBAL obj)
        //{
        //    if (!string.IsNullOrEmpty(obj.ThumbnailFile_Preview))
        //    {
        //        obj.ThumbnailFile_Preview = SaveFile(obj.ThumbnailFile_Preview, "Skill");
        //    }
        //    var file = Request.Files["VideoFile_Preview"];
        //    if (file != null && file.ContentLength > 0)
        //    {
        //        string fileName = Path.GetFileName(file.FileName);

        //        string path = Server.MapPath("../DownloadMat/Skill/" + fileName);

        //        file.SaveAs(path);
        //    }
        //    string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.SaveVideo(obj)));
        //    return result;
        //}

        [HttpPost]
        public async Task<ActionResult> SaveVideo()
        {
            try
            {
                var file = Request.Files["VideoFile"];

                VideoBAL obj = new VideoBAL();

                obj.Action = Request.Form["Action"];
                obj.CourseId =  Request.Form["CourseId"] ;
                obj.Moduleid =  Request.Form["moduleid"] ;
                obj.Loginid = Convert.ToInt32(Request.Form["Loginid"]);
                obj.id= Request.Form["id"];
                obj.Title = Request.Form["Title"];
                obj.Description = Request.Form["Description"];
                obj.ThumbnailFile_Preview = Request.Form["ThumbnailFile_Preview"];
                if (!string.IsNullOrEmpty(obj.ThumbnailFile_Preview))
                {
                    obj.ThumbnailFile_Preview = SaveFile(obj.ThumbnailFile_Preview, "Skill");
                }

                string VideoPath = "";

                if (file != null && file.ContentLength > 0)
                {
                    string fileName = Guid.NewGuid().ToString("N") + Path.GetExtension(file.FileName);

                    string folderPath = Server.MapPath("~/Content/Skill/");

                    if (!Directory.Exists(folderPath))
                    {
                        Directory.CreateDirectory(folderPath);
                    }

                    string fullPath = Path.Combine(folderPath, fileName);

                    file.SaveAs(fullPath);

                    VideoPath = "../Content/Skill/" + fileName;
                }

                obj.VideoFile_Preview = VideoPath;

                string result = await DAL.DLL.SaveVideo(obj);


                return Json(new
                {
                    Result = result
                });
            }
            catch (Exception ex)
            {
                return Json(new
                {
                    Result = "0",
                    Message = ex.Message
                });
            }
        }
    }
}