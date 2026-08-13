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
    public class ContractorController : Controller
    {
        // GET: Skill
        public ActionResult Index()
        {
            return View();
        }

        public async Task<string> SaveBillingOrder(BillingOrderBAL obj)
        {
            if (!string.IsNullOrEmpty(obj.OrderCopy))
            {
                obj.OrderCopy = SaveFile(obj.OrderCopy, "ContractorDoc");
            }
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.SaveBillingOrder(obj)));
            return result;
        }
        public async Task<string> SaveLicense(LicenseBAL obj)
        {
            if (!string.IsNullOrEmpty(obj.LicenseCopy))
            {
                obj.LicenseCopy = SaveFile(obj.LicenseCopy, "ContractorDoc");
            }
            if (!string.IsNullOrEmpty(obj.AmendentCopy))
            {
                obj.AmendentCopy = SaveFile(obj.AmendentCopy, "ContractorDoc");
            }
            if (!string.IsNullOrEmpty(obj.ApplicationCopy))
            {
                obj.ApplicationCopy = SaveFile(obj.ApplicationCopy, "ContractorDoc");
            }
            if (!string.IsNullOrEmpty(obj.ChallanCopy))
            {
                obj.ChallanCopy = SaveFile(obj.ChallanCopy, "ContractorDoc");
            }
            if (!string.IsNullOrEmpty(obj.FeesCopy))
            {
                obj.FeesCopy = SaveFile(obj.FeesCopy, "ContractorDoc");
            }
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.SaveLicense(obj)));
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

                if (For.Equals("ContractorDoc", StringComparison.OrdinalIgnoreCase))
                {
                    folderPath = Server.MapPath("../DownloadMat/ContractorDoc/");
                    uploadPath = "../DownloadMat/ContractorDoc/" + fileName;
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
        public async Task<string> GetSiteOverview(BillingOrderBAL obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.GetSiteOverview(obj)));
            return result;
        }


    }
}