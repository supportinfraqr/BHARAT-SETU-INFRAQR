using BAL;
using Newtonsoft.Json;
using System;
using System.IO;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using System.Web.Http;

namespace EesassinErp.Controllers
{
    public class VenInvoiceApiController : ApiController
    {

        [HttpPost]
        public async Task<string> GetVenInvoiceListDT(TblVendorInvoiceBAL obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.dll.GetVenInvoiceListDT(obj)));
            return result;
        }
        [HttpPost]
        public async Task<string> GetInvoiceList(TblVendorInvoiceBAL obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.dll.GetInvoiceList(obj)));
            return result;
        }
        [HttpPost]
        public async Task<string> ApproveUploadDoc(TblVendorInvoiceBAL obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.dll.ApproveUploadDoc(obj)));
            return result;
        }
        [HttpPost]
        public async Task<string> SetINVOICEDATE(TblVendorInvoiceBAL obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.dll.SetINVOICEDATE(obj)));
            return result;
        }
        [HttpPost]
        public async Task<string> GetValidateInvoice(TblVendorInvoiceBAL obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.dll.ValidateInvoice(obj)));
            return result;
        }

        [HttpPost]

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
        [HttpPost]
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
    }
}