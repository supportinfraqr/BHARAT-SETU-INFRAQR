using BAL;
using Newtonsoft.Json;
using System;
using System.IO;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using System.Web.Mvc;

namespace EesassinErp.Controllers
{
    public class DocumentMasterController : Controller
    {
        // GET: Get Auditor Compliance 

        public async Task<string> GetMapping(MappingBAL obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.dll.GetMapping(obj)));
            return result;
        }
        public async Task<string> InsertUpdateDelMapping(MappingBAL obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.dll.InsertUpdateDelMapping(obj)));
            return result;
        }
        public async Task<string> VerifyMap(MappingBAL obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.dll.VerifyMap(obj)));
            return result;
        }

        public async Task<string> GetAuditorCompliance(DocumentBAL obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.dll.GetAuditorCompliance(obj)));
            return result;
        }
        public async Task<string> IUDAuditorComplianceQUERY(DocumentBAL obj)
        {

            if (!string.IsNullOrEmpty(obj.AuditorQuery))
            {
                if (obj.extention == "pdf")
                {
                    if (obj.AuditorQuery.Contains("data:application/"))
                    {
                        obj.AuditorQuery = Regex.Replace(obj.AuditorQuery, @"^data:application\/[a-zA-Z]+;base64,", string.Empty);

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
                        byte[] data = Convert.FromBase64String(obj.AuditorQuery);
                        var imageStream = new MemoryStream(data, false);
                        string extention = ".pdf";
                        string uploadpath = "../DownloadMat/AVQuery/" + NewFileName + extention;
                        string filePath = System.Web.HttpContext.Current.Server.MapPath(uploadpath);
                        FileStream file = new FileStream(filePath, FileMode.Create, FileAccess.Write);
                        imageStream.WriteTo(file);
                        file.Close();
                        imageStream.Close();
                        obj.AuditorQuery = uploadpath;
                    }
                }
                if (obj.extention == "xls")
                {
                    if (obj.AuditorQuery.Contains("data:application/"))
                    {
                        obj.AuditorQuery = Regex.Replace(obj.AuditorQuery, @"data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,", string.Empty);
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
                        byte[] data = Convert.FromBase64String(obj.AuditorQuery);
                        var imageStream = new MemoryStream(data, false);
                        string extention = ".xls";
                        string uploadpath = "../DownloadMat/AVQuery/" + NewFileName + extention;
                        string filePath = System.Web.HttpContext.Current.Server.MapPath(uploadpath);
                        FileStream file = new FileStream(filePath, FileMode.Create, FileAccess.Write);
                        imageStream.WriteTo(file);
                        file.Close();
                        imageStream.Close();
                        obj.AuditorQuery = uploadpath;
                    }
                }
            }
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.dll.IUDAuditorComplianceQUERY(obj)));
            return result;
        }

        public async Task<string> InsertUpdateDelAuditorCompliance(DocumentBAL obj)
        {
            //for (int i = 0; i < obj.ComplianceDetail.Count; i++)
            //{
            //    if (!string.IsNullOrEmpty(obj.ComplianceDetail[i].Remark))
            //    { 
            //        if (obj.ComplianceDetail[i].Remark.Contains("data:application/"))
            //    {
            //        obj.FileDoc = Regex.Replace(obj.ComplianceDetail[i].Remark, @"data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,", string.Empty);
            //        string NewFileName = "";
            //        string strPassword = Guid.NewGuid().ToString("N").Substring(0, 4);
            //        NewFileName += strPassword;
            //        NewFileName += DateTime.Now.Year.ToString();
            //        NewFileName += DateTime.Now.Month.ToString();
            //        NewFileName += DateTime.Now.Day.ToString();
            //        NewFileName += DateTime.Now.Hour.ToString();
            //        NewFileName += DateTime.Now.Minute.ToString();
            //        NewFileName += DateTime.Now.Second.ToString();
            //        NewFileName += DateTime.Now.Millisecond.ToString();
            //        byte[] data = Convert.FromBase64String(obj.FileDoc);
            //        var imageStream = new MemoryStream(data, false);
            //        string extention = ".xls";
            //        string uploadpath = "../DownloadMat/compliancedoc/auditor/" + NewFileName + extention;
            //        string filePath = System.Web.HttpContext.Current.Server.MapPath(uploadpath);
            //        FileStream file = new FileStream(filePath, FileMode.Create, FileAccess.Write);
            //        imageStream.WriteTo(file);
            //        file.Close();
            //        imageStream.Close();
            //        obj.ComplianceDetail[i].Remark = uploadpath;

            //    }
            //    }
            //    if (!string.IsNullOrEmpty(obj.ComplianceDetail[i].VendorRemark))
            //    {
            //        if (obj.ComplianceDetail[i].VendorRemark.Contains("data:application/"))
            //    {
            //        obj.FileDoc = Regex.Replace(obj.ComplianceDetail[i].VendorRemark, @"data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,", string.Empty);
            //        string NewFileName = "";
            //        string strPassword = Guid.NewGuid().ToString("N").Substring(0, 4);
            //        NewFileName += strPassword;
            //        NewFileName += DateTime.Now.Year.ToString();
            //        NewFileName += DateTime.Now.Month.ToString();
            //        NewFileName += DateTime.Now.Day.ToString();
            //        NewFileName += DateTime.Now.Hour.ToString();
            //        NewFileName += DateTime.Now.Minute.ToString();
            //        NewFileName += DateTime.Now.Second.ToString();
            //        NewFileName += DateTime.Now.Millisecond.ToString();
            //        byte[] data = Convert.FromBase64String(obj.FileDoc);
            //        var imageStream = new MemoryStream(data, false);
            //        string extention = ".xls";
            //        string uploadpath = "../DownloadMat/compliancedoc/vendor/" + NewFileName + extention;
            //        string filePath = System.Web.HttpContext.Current.Server.MapPath(uploadpath);
            //        FileStream file = new FileStream(filePath, FileMode.Create, FileAccess.Write);
            //        imageStream.WriteTo(file);
            //        file.Close();
            //        imageStream.Close();
            //        obj.ComplianceDetail[i].VendorRemark = uploadpath;
            //        }
            //    }
            //}

            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.dll.InsertUpdateDelAuditorCompliance(obj)));
            return result;
        }

        public async Task<string> GetDocumentMaster(DocumentBAL obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.dll.GetDocumentMaster(obj)));
            return result;
        }
       
        public async Task<string> VIUDDocumentMaster(DocumentBAL obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.dll.SaveValidation(obj)));
            return result;
        }
        public async Task<string> IUDDocumentMaster(DocumentBAL obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.dll.IUDDocumentMaster(obj)));
            return result;
        }


        public ActionResult OneTimeDocument()
        {
            return View();
        }
        public async Task<string> GetOneTimeDocumentMaster(DocumentBAL obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.dll.GetOneTimeDocumentMaster(obj)));
            return result;
        }


        public async Task<string> IUDOneTimeDocumentMaster(DocumentBAL obj)
        {
            if (!string.IsNullOrEmpty(obj.FileDoc))
            {
                if (obj.FileDoc.Contains("data:image/"))
                {
                    obj.FileDoc = Regex.Replace(obj.FileDoc, @"^data:image\/[a-zA-Z]+;base64,", string.Empty);
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
                    byte[] data = Convert.FromBase64String(obj.FileDoc);
                    var imageStream = new MemoryStream(data, false);
                    string extention = ".jpeg";
                    string uploadpath = "../DownloadMat/ProfileDoc/" + NewFileName + extention;
                    string filePath = System.Web.HttpContext.Current.Server.MapPath(uploadpath);
                    FileStream file = new FileStream(filePath, FileMode.Create, FileAccess.Write);
                    imageStream.WriteTo(file);
                    file.Close();
                    imageStream.Close();
                    obj.FileDoc = uploadpath;
                }
                if (obj.FileDoc.Contains("data:application/"))
                {
                    obj.FileDoc = Regex.Replace(obj.FileDoc, @"^data:application\/[a-zA-Z]+;base64,", string.Empty);

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
                    byte[] data = Convert.FromBase64String(obj.FileDoc);
                    var imageStream = new MemoryStream(data, false);
                    string extention = ".pdf";
                    string uploadpath = "../DownloadMat/ProfileDoc/" + NewFileName + extention;
                    string filePath = System.Web.HttpContext.Current.Server.MapPath(uploadpath);
                    FileStream file = new FileStream(filePath, FileMode.Create, FileAccess.Write);
                    imageStream.WriteTo(file);
                    file.Close();
                    imageStream.Close();
                    obj.FileDoc = uploadpath;

                }

            }
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.dll.IUDOneTimeDocumentMaster(obj)));
            return result;
        }



        public async Task<string> IUDComplianceMaster(DocumentBAL obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.dll.IUDComplianceMaster(obj)));
            return result;
        }


        public ActionResult ComplianceMaster()
        {
            return View();
        }
        public async Task<string> updateAuditorCompliance(DocumentBAL obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.dll.updateAuditorCompliance(obj)));
            return result;
        }



    }
}