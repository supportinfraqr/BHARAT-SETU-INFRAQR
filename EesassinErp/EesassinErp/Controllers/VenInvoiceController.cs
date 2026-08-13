using BAL;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.IO;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using System.Web.Mvc;

namespace EesassinErp.Controllers
{
    public class VenInvoiceController : Controller
    {
        public ActionResult VendorInvoice()
        {
            return View();
        }

        public ActionResult VendorIn()
        {
            return View();
        }
        public ActionResult AuditInvoice()
        {
            return View();
        }
        public ActionResult CustomerInvoice()
        {
            return View();
        }
        public ActionResult WithoutInvoice()
        {
            return View();
        }
        public async Task<string> GetVenInvoiceListDT(TblVendorInvoiceBAL obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.dll.GetVenInvoiceListDT(obj)));
            return result;
        }
        public async Task<string> GetInvoiceList(TblVendorInvoiceBAL obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.dll.GetInvoiceList(obj)));
            return result;
        }
        public async Task<string> ApproveUploadDoc(TblVendorInvoiceBAL obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.dll.ApproveUploadDoc(obj)));
            return result;
        }
        public async Task<string> SetINVOICEDATE(TblVendorInvoiceBAL obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.dll.SetINVOICEDATE(obj)));
            return result;
        }
        public async Task<string> GetValidateInvoice(TblVendorInvoiceBAL obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.dll.ValidateInvoice(obj)));
            return result;
        }



        public async Task<string> UploadDoc(TblVendorInvoiceBAL obj)
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
                    string uploadpath = "../DownloadMat/Doc/" + NewFileName + extention;
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
                    string uploadpath = "../DownloadMat/Doc/" + NewFileName + extention;
                    string filePath = System.Web.HttpContext.Current.Server.MapPath(uploadpath);
                    FileStream file = new FileStream(filePath, FileMode.Create, FileAccess.Write);
                    imageStream.WriteTo(file);
                    file.Close();
                    imageStream.Close();
                    obj.FileDoc = uploadpath;

                }

            }
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.dll.UploadDoc(obj)));
            return result;
        }

        public async Task<string> InsertUpdateDelVenInvoice(TblVendorInvoiceBAL obj)
        {

            for (int i = 0; i < obj.InvoiceDetail.Count; i++)
            {
                if (!string.IsNullOrEmpty(obj.InvoiceDetail[i].fileupload))
                {
                    if (obj.InvoiceDetail[i].fileupload.Contains("data:image/"))
                    {
                        obj.InvoiceDetail[i].fileupload = Regex.Replace(obj.InvoiceDetail[i].fileupload, @"^data:image\/[a-zA-Z]+;base64,", string.Empty);
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
                        byte[] data = Convert.FromBase64String(obj.InvoiceDetail[i].fileupload);
                        var imageStream = new MemoryStream(data, false);
                        string extention = ".jpeg";
                        string uploadpath = "../DownloadMat/Doc/" + NewFileName + extention;
                        string filePath = System.Web.HttpContext.Current.Server.MapPath(uploadpath);
                        FileStream file = new FileStream(filePath, FileMode.Create, FileAccess.Write);
                        imageStream.WriteTo(file);
                        file.Close();
                        imageStream.Close();
                        obj.InvoiceDetail[i].fileupload = uploadpath;
                    }
                    if (obj.InvoiceDetail[i].fileupload.Contains("data:application/"))
                    {
                        obj.InvoiceDetail[i].fileupload = Regex.Replace(obj.InvoiceDetail[i].fileupload, @"^data:application\/[a-zA-Z]+;base64,", string.Empty);

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
                        byte[] data = Convert.FromBase64String(obj.InvoiceDetail[i].fileupload);
                        var imageStream = new MemoryStream(data, false);
                        string extention = ".pdf";
                        string uploadpath = "../DownloadMat/Doc/" + NewFileName + extention;
                        string filePath = System.Web.HttpContext.Current.Server.MapPath(uploadpath);
                        FileStream file = new FileStream(filePath, FileMode.Create, FileAccess.Write);
                        imageStream.WriteTo(file);
                        file.Close();
                        imageStream.Close();
                        obj.InvoiceDetail[i].fileupload = uploadpath;

                    }


                }

            }
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.dll.InsertUpdateDelVenInvoice(obj)));
            return result;
        }

        [HttpPost]
        public async Task<JsonResult> NewInsertUpdateDelVenInvoice()
        {
            var request = HttpContext.Request;

            // 🔥 FORM DATA
            string ClientId = request.Form["ClientId"];
            string ClientSiteId = request.Form["ClientSiteId"];
            string VendorSiteId = request.Form["VendorSiteId"];
            string FYID = request.Form["FYID"];
            string Month = request.Form["Month"];
            string InvDate = request.Form["InvDate"];
            string CreatedBy = request.Form["CreatedBy"];
            string InvoiceId = request.Form["InvoiceId"];

            int VendorId = int.TryParse(request.Form["VendorId"], out int vId) ? vId : 0;
            int ActionType = int.TryParse(request.Form["ActionType"], out int aType) ? aType : 0;

            // 🔥 LIST
            List<InvoiceDetailList> invoiceList = new List<InvoiceDetailList>();

            foreach (string key in request.Form.AllKeys)
            {
                if (key.StartsWith("InvoiceDetail"))
                {
                    var json = request.Form[key];

                    if (!string.IsNullOrEmpty(json))
                    {
                        var obj = JsonConvert.DeserializeObject<InvoiceDetailList>(json);
                        invoiceList.Add(obj);
                    }
                }
            }

            // 🔥 FILE SAVE + INDEX MAP
            foreach (string fileKey in request.Files)
            {
                var file = request.Files[fileKey];

                if (file != null && file.ContentLength > 0)
                {
                    string fileName = Guid.NewGuid() + Path.GetExtension(file.FileName);
                    string relativePath = "/DownloadMat/Doc/" + fileName;
                    string fullPath = Server.MapPath("~/DownloadMat/Doc/" + fileName);

                    file.SaveAs(fullPath);

                    int index = Convert.ToInt32(fileKey.Replace("files[", "").Replace("]", ""));

                    if (index < invoiceList.Count)
                    {
                        invoiceList[index].fileupload = relativePath;
                    }
                }
            }

            // 🔥 FINAL OBJECT
            TblVendorInvoiceBAL objBAL = new TblVendorInvoiceBAL
            {
                ClientId = ClientId,
                ClientSiteId = ClientSiteId,
                VendorSiteId = Convert.ToInt32(VendorSiteId),
                FYID = FYID,
                Month = Month,
                CreatedBy = Convert.ToInt32(CreatedBy),
                InvoiceId = InvoiceId,

                VendorId = VendorId,
                ActionType = ActionType,
                InvoiceDetail = invoiceList
            };

            var result = await Task.Run(() => DAL.DLL.dll.InsertUpdateDelVenInvoice(objBAL));

            return Json(new { Result = result }, JsonRequestBehavior.AllowGet);
        }

        public async Task<string> InsertUpdateDelWithoutVenInvoice(TblVendorInvoiceBAL obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.dll.InsertUpdateDelWithoutVenInvoice(obj)));
            return result;
        }
    }
}