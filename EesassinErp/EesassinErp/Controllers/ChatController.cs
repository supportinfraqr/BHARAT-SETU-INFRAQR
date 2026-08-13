using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using System.Web;
using System.Web.Mvc;
using BAL;
using DAL;

namespace EesassinErp.Controllers
{
    public class ChatController : Controller
    {
        [HttpPost]
        public async Task<JsonResult> SaveChatMessage()
        {
            try
            {
                System.Diagnostics.Debugger.Break();
                var message = Request.Form["message"];
                var LoginId = Request.Form["LoginId"];
                
                var Action = Request.Form["Action"];
                HttpPostedFileBase file = Request.Files["file"];

                string savedFileName = string.Empty;

                if (file != null && file.ContentLength > 0)
                {
                    string uploadsDir = Server.MapPath("../DownloadMat/Chatbot/Uploads/");
                    if (!Directory.Exists(uploadsDir))
                        Directory.CreateDirectory(uploadsDir);

                    string originalFileName = Path.GetFileNameWithoutExtension(file.FileName);
                    string extension = Path.GetExtension(file.FileName);

                    string uniqueFileName = $"{originalFileName}_{DateTime.Now:yyyyMMdd_HHmmssfff}_{Guid.NewGuid().ToString().Substring(0, 8)}{extension}";
                    savedFileName = Path.Combine(uploadsDir, uniqueFileName);
                    file.SaveAs(savedFileName);

                    savedFileName = "../DownloadMat/Chatbot/Uploads/" + uniqueFileName;

                    //string fileName = Path.GetFileName(file.FileName);
                    //savedFileName = Path.Combine(uploadsDir, fileName);
                    //file.SaveAs(savedFileName);

                    //// For storing or returning path to front-end
                    //savedFileName = "../DownloadMat/Chatbot/Uploads/" + fileName;
                }

                var obj = new ChatbotBAL()
                {
                    Detail = message,
                    FileUpload = savedFileName,
                    Action= Action,
                    LoginId= LoginId
                };

                var saveResult = await Task.Factory.StartNew(() => DAL.DLL.Savechatbot(obj)); 

                return Json(new { success = true, data = saveResult });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, error = ex.Message });
            }
        }



        [HttpPost]
        public async Task<JsonResult> updatechatbot()
        {
            try
            {
                System.Diagnostics.Debugger.Break();
                var Rate = Request.Form["Rate"]; 
                var Action = Request.Form["Action"];
                var suggestion = Request.Form["suggestion"];
                var TicketNo = Request.Form["TicketNo"];

                var obj = new ChatbotBAL()
                {
                    TicketNo = TicketNo,
                    Suggestion = suggestion,
                    Action = Action,
                    Rate = Rate,
                };

                var saveResult = await Task.Factory.StartNew(() => DAL.DLL.Savechatbot(obj));
                return Json(new { success = true, data = saveResult });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, error = ex.Message });
            }
        }

        public ActionResult ChatbotSupport()
        {
            return View();
        }
        public async Task<string> SearchChatbot(ChatbotBAL obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.SearchChatbot(obj)));
            return result;
        }
        public async Task<string> Approve(ChatbotBAL obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.Approve(obj)));
            return result;
        }
    }
}