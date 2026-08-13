using BAL;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Configuration;
using System.Data.SqlClient;
using System.IO;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using System.Web;
using System.Linq;

using System.Web.Mvc;

namespace EesassinErp.Controllers
{
    [ValidateSession]
    public class RetailController : Controller
    {
        public ActionResult Retail()
        {
            return View();
        }
        public ActionResult Registration()
        {
            return View();
        }

        public ActionResult ModuleRegMaster()
        {
            return View();
        }
        public ActionResult ModuleMappingMaster()
        {
            return View();
        }
        public async Task<string> GetSearchModuleReg(TblModuleRegMaster obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.GetSearchModuleReg(obj)));
            return result;
        }
        public async Task<string> SearchRetailAssignExecuter(TblPartyMaster obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.SearchRetailAssignExecuter(obj)));
            return result;
        }
        public async Task<string> IUDRetailAssignExecuter(TblPartyMaster obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.IUDRetailAssignExecuter(obj)));
            return result;
        }


        public async Task<string> InsertUpdateDelModuleReg(TblModuleRegMaster obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.InsertUpdateDelModuleRegMaster(obj)));

            return result;
        }

        public async Task<string> GetSearchModuleMappingMaster(TblModuleMappingMaster obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.GetSearchModuleMappingMaster(obj)));
            return result;
        }


        public async Task<string> InsertUpdateDelMappingMaster(TblModuleMappingMaster obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.InsertUpdateDelModuleMappingMaster(obj)));
            return result;
        }


        public ActionResult RoleMaster()
        {
            return View();
        }
        public async Task<string> SearchRoleMaster(TblPartyMaster obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.SearchRoleMaster(obj)));
            return result;
        }


        public async Task<string> InsertUpdateDelRoleMaster(TblPartyMaster obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.InsertUpdateDelRoleMaster(obj)));
            return result;
        }


        public ActionResult GradeMaster()
        {
            return View();
        }

        public async Task<string> SearchGradeMaster(TblPartyMaster obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.SearchGradeMaster(obj)));
            return result;
        }
        public async Task<string> InsertUpdateDelGradeMaster(TblPartyMaster obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.InsertUpdateDelGradeMaster(obj)));
            return result;
        }

        public ActionResult LicenseMaster()
        {
            return View();
        }


        public async Task<string> GetLicenseMasterDocumentList()
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.GetLicenseMasterDocumentList()));
            return result;
        }

        public async Task<string> InsertUpdateDelLicenseDocumentMaster(RetailLicenseDocuementMaster obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.InsertUpdateDelLicenseMasterDocumentList(obj)));
            return result;
        }

        public async Task<string> SearchLicenseDocumentMaster(TblPartyMaster obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.SearchLicenseDocumentMaster(obj)));
            return result;
        }
        public async Task<string> SearchLicenseDocumentMasterList(TblPartyMaster obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.SearchLicenseDocumentMasterList(obj)));
            return result;
        }


        public ActionResult StoreMapping()
        {
            return View();
        }

        public async Task<string> GetStore(RetialStoreManager obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.GetStore(obj)));
            return result;
        }

        public async Task<string> InsertUpdateDelStoreMapping(RetailLicenseDocuementMaster obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.InsertUpdateDelStoreMapping(obj)));
            return result;
        }
        public async Task<string> InsertUpdateDelIndustryMapping(RetailLicenseDocuementMaster obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.InsertUpdateDelIndustryMapping(obj)));
            return result;
        }


        public async Task<string> SearchStoreMapping(TblPartyMaster obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.SearchStoreMapping(obj)));
            return result;
        }




        public ActionResult StorePrefix()
        {
            return View();
        }

        public async Task<string> InsertUpdateDelStorePrefix(StorePrefix obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.InsertUpdateDelStorePrefix(obj)));
            return result;
        }
        public async Task<string> DelStorePrefix(StorePrefix obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.DelStorePrefix(obj)));
            return result;
        }

        public async Task<string> SearchStorePrefix(StorePrefix obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.SearchStorePrefix(obj)));
            return result;
        }
        #region Store compliance Department Master 
        public ActionResult DepartmentMaster()
        {
            return View();
        }
        public async Task<string> InsertUpdateDelDepartmentMaster(TblPartyMaster obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.InsertUpdateDelDepartmentMaster(obj)));
            return result;
        }
        public async Task<string> SearchDepartmentMaster(TblPartyMaster obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.SearchDepartmentMaster(obj)));
            return result;
        }

        #endregion
        #region StoreComplianceStatus Master 
        public ActionResult StoreComplianceStatusMaster()
        {
            return View();
        }
        public async Task<string> InsertUpdateDelStoreComplianceStatusMaster(TblPartyMaster obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.InsertUpdateDelStoreComplianceStatusMaster(obj)));
            return result;
        }
        public async Task<string> SearchStoreComplianceStatusMaster(TblPartyMaster obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.SearchStoreComplianceStatusMaster(obj)));
            return result;
        }

        #endregion
        #region Retail Department Master 
        public ActionResult RetailDocumentMaster()
        {
            return View();
        }
        public async Task<string> InsertUpdateDelRetailDocumentMaster(DocumentBAL obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.InsertUpdateDelRetailDocumentMaster(obj)));
            return result;
        }
        public async Task<string> SearchRetailDocumentMaster(DocumentBAL obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.SearchRetailDocumentMaster(obj)));
            return result;
        }

        #endregion

        #region Retail Department Master 
        public ActionResult RetailClientDocMapping()
        {
            return View();
        }
        public async Task<string> IUDRetailClientDocMapping(MenuPermission obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.IUDRetailClientDocMapping(obj)));
            return result;
        }

        public async Task<string> SearchRetailClientDocMapping(MenuPermission obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.SearchRetailClientDocMapping(obj)));
            return result;
        }

        #endregion
        #region Retail Create Executer 
        public ActionResult RetailCreateExecuter()
        {
            return View();
        }
        public async Task<string> IUDRetailCreateExecuter(TblPartyMaster obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.IUDRetailCreateExecuter(obj)));
            return result;
        }

        public async Task<string> SearchRetailCreateExecuter(TblPartyMaster obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.SearchRetailCreateExecuter(obj)));
            return result;
        }

        #endregion
        #region Retail Assign Executer 
        public ActionResult RetailAssignExecuter()
        {
            return View();
        }
        public async Task<string> IUDClientActMapping(MenuPermission obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.IUDClientActMapping(obj)));
            return result;
        }

        public async Task<string> SearchClientActMapping(MenuPermission obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.SearchClientActMapping(obj)));
            return result;
        }

        #endregion
        #region Retail Licence MASTER
        public ActionResult RetailLicenceMaster()
        {
            return View();
        }

        public async Task<string> IUDRetailLicenceMaster(RetailLicenseDocuementMaster obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.InsertUpdateDelLicenseMasterDocumentList(obj)));
            return result;
        }

        public async Task<string> SearchRetailLicenceMaster(TblPartyMaster obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.SearchLicenseDocumentMaster(obj)));
            return result;
        }
        #endregion
        #region Retail Licence MASTER
        public ActionResult RetailCreateActCalenderMaster()
        {
            return View();
        }
        [HttpPost]
        public async Task<JsonResult> IUDRetailCreateActCalender()
        {
            try
            {
                var obj = new RetailBAL
                {
                    Id = Request.Form["Id"],
                    Industry = Request.Form["Industry"],
                    State = Request.Form["State"],
                    Act = Request.Form["Act"],
                    Constitution = Request.Form["Constitution"],
                    Department = Request.Form["Department"],
                    Month = Request.Form["Month"],
                    Year = Request.Form["Year"],
                    Frequency = Request.Form["Frequency"],
                    Ministry = Request.Form["Ministry"],
                    ComplianceName = Request.Form["ComplianceName"],
                    Calendartype = Request.Form["Calendartype"],
                    Risk = Request.Form["Risk"],
                    ComplianceType = Request.Form["ComplianceType"],
                    Description = Request.Form["Description"],
                    DueDate = Request.Form["DueDate"],
                    IndustryList = Request.Form["IndustryList"],
                    UploadFile = Request.Form["UploadFile"],
                    excelFile = Request.Form["ExcelFile"],
                    Action = Request.Form["Action"],
                    selectedCategory = Request.Form["selectedCategory"],
                    selectedSubcategory = Request.Form["selectedSubcategory"],
                    DueDay = Request.Form["DueDay"],
                    Expire = Request.Form["Expire"],
                    ComplianceLevel = Request.Form["ComplianceLevel"],
                    FormNo = Request.Form["FormNo"],
                    Section = Request.Form["Section"],
                    Rule = Request.Form["Rule"]
                };
                obj.ActOverview = HttpUtility.UrlDecode(Request.Form["ActOverview"]);
                // Handle Excel File Upload

                HttpPostedFileBase excelFile = Request.Files["ExcelFile"];
                string uploadDir = Server.MapPath("~/DownloadMat/ActFile/");
                if (excelFile != null && excelFile.ContentLength > 0)
                {
                    string NewFileName = "";
                    string strPassword = Guid.NewGuid().ToString("N").Substring(0, 4);
                    NewFileName += strPassword;
                    NewFileName += DateTime.Now.Year.ToString();
                    NewFileName += DateTime.Now.Month.ToString("D2"); // Ensure two digits for month
                    NewFileName += DateTime.Now.Day.ToString("D2"); // Ensure two digits for day
                    NewFileName += DateTime.Now.Hour.ToString("D2"); // Ensure two digits for hour
                    NewFileName += DateTime.Now.Minute.ToString("D2"); // Ensure two digits for minute
                    NewFileName += DateTime.Now.Second.ToString("D2"); // Ensure two digits for second
                    NewFileName += DateTime.Now.Millisecond.ToString("D3"); // Ensure three digits for milliseconds
                    string fileExtension = Path.GetExtension(excelFile.FileName);
                    NewFileName += fileExtension;
                    string filePath = Path.Combine(uploadDir, NewFileName);
                    excelFile.SaveAs(filePath);
                    obj.UploadFile = "../DownloadMat/ActFile/" + NewFileName; // Store path in DB
                }

                //HttpPostedFileBase UploadFile = Request.Files["UploadFile"];
                //if (UploadFile != null && UploadFile.ContentLength > 0)
                //{
                //    string UNewFileName = "";
                //    string UstrPassword = Guid.NewGuid().ToString("N").Substring(0, 4);
                //    UNewFileName += UstrPassword;
                //    UNewFileName += DateTime.Now.Year.ToString();
                //    UNewFileName += DateTime.Now.Month.ToString("D2"); // Ensure two digits for month
                //    UNewFileName += DateTime.Now.Day.ToString("D2"); // Ensure two digits for day
                //    UNewFileName += DateTime.Now.Hour.ToString("D2"); // Ensure two digits for hour
                //    UNewFileName += DateTime.Now.Minute.ToString("D2"); // Ensure two digits for minute
                //    UNewFileName += DateTime.Now.Second.ToString("D2"); // Ensure two digits for second
                //    UNewFileName += DateTime.Now.Millisecond.ToString("D3"); // Ensure three digits for milliseconds

                //    string UfileExtension = Path.GetExtension(UploadFile.FileName);
                //    UNewFileName += UfileExtension; 
                //    string UfilePath = Path.Combine(uploadDir, UNewFileName);
                //    UploadFile.SaveAs(UfilePath); 
                //    obj.UploadFile = "../DownloadMat/ActFile/" + UNewFileName;
                //}

                // Save data in DB
                string result = await Task.Factory.StartNew(() =>
                    JsonConvert.SerializeObject(DAL.DLL.IUDRetailCreateActCalender(obj))
                );

                return Json(new { status = true, Result = result });
            }
            catch (Exception ex)
            {
                return Json(new { status = false, message = ex.Message });
            }
        }


        public async Task<string> IUDActoverview(RetailBAL obj)
        {

            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.IUDRetailCreateActCalender(obj)));
            return result;
        }
        public async Task<string> SearchRetailCreateActCalender(RetailBAL obj)
        {

            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.SearchRetailCreateActCalender(obj)));
            return result;
        }
        public ActionResult RetailCreateIndustry()
        {
            return View();
        }
        public async Task<string> InsertRetailCreateIndustry(RetailBAL obj)
        {

            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.InsertRetailCreateIndustry(obj)));
            return result;
        }
        public async Task<string> SearchRetailCreateIndustry(RetailBAL obj)
        {

            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.SearchRetailCreateIndustry(obj)));
            return result;
        }
        public ActionResult RetailCreateOverview()
        {
            return View();
        }
        public ActionResult IndustryMapping()
        {
            return View();
        }
        public async Task<string> InsertCreateOverview(RetailBAL obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.InsertCreateOverview(obj)));
            return result;
        }

        public async Task<string> INUIndustryMapping(RetailBAL obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.INUIndustryMapping(obj)));
            return result;
        }

        public async Task<string> SearchMapping(RetailBAL obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.SearchMapping(obj)));
            return result;
        }
        #endregion


        #region Retail Dashboard  
        public ActionResult MainRetailDashboard()
        {
            return View();
        }
        public async Task<string> InsertMainRetailDashboard(MappingBAL obj)
        {

            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.InsertMainRetailDashboard(obj)));
            return result;
        }
        public async Task<string> SearchMainRetailDashboard(MappingBAL obj)
        {

            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.SearchMainRetailDashboard(obj)));
            return result;
        }
        public async Task<string> verifyvalid(MappingBAL obj)
        {

            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.verifyvalid(obj)));
            return result;
        }

        #endregion


        public ActionResult ClientOnboarding()
        {
            return View();
        }


        [HttpPost]
        public async Task<JsonResult> InsertClientOnboarding()
        {
            try
            {
                var obj = new DocumentBAL
                {
                    Boardingtype = Request.Form["Boardingtype"],
                    DocumentName = Request.Form["DocumentName"],
                    Frequency = Request.Form["Frequency"],
                    Year = Request.Form["Year"],
                    State = Request.Form["State"],
                    Month = Request.Form["Month"],
                    Description = Request.Form["Description"],
                    DueDate = Request.Form["DueDate"],
                    Remark = Request.Form["Remark"],
                    Createdby = Request.Form["Createdby"],
                    Action = Request.Form["Action"],
                    Id = Request.Form["Id"]


                };

                HttpPostedFileBase excelFile = Request.Files["ExcelFile"];
                string uploadDir = Server.MapPath("~/DownloadMat/Boarding/");
                if (excelFile != null && excelFile.ContentLength > 0)
                {

                    string NewFileName = "";
                    string strPassword = Guid.NewGuid().ToString("N").Substring(0, 4);
                    NewFileName += strPassword;
                    NewFileName += DateTime.Now.Year.ToString();
                    NewFileName += DateTime.Now.Month.ToString("D2"); // Ensure two digits for month
                    NewFileName += DateTime.Now.Day.ToString("D2"); // Ensure two digits for day
                    NewFileName += DateTime.Now.Hour.ToString("D2"); // Ensure two digits for hour
                    NewFileName += DateTime.Now.Minute.ToString("D2"); // Ensure two digits for minute
                    NewFileName += DateTime.Now.Second.ToString("D2"); // Ensure two digits for second
                    NewFileName += DateTime.Now.Millisecond.ToString("D3"); // Ensure three digits for milliseconds
                    string fileExtension = Path.GetExtension(excelFile.FileName);
                    NewFileName += fileExtension;
                    string filePath = Path.Combine(uploadDir, NewFileName);
                    excelFile.SaveAs(filePath);
                    obj.UploadFile = "../DownloadMat/Boarding/" + NewFileName; // Store path in DB
                }

                //HttpPostedFileBase UploadFile = Request.Files["UploadFile"];
                //if (UploadFile != null && UploadFile.ContentLength > 0)
                //{
                //    string UNewFileName = "";
                //    string UstrPassword = Guid.NewGuid().ToString("N").Substring(0, 4);
                //    UNewFileName += UstrPassword;
                //    UNewFileName += DateTime.Now.Year.ToString();
                //    UNewFileName += DateTime.Now.Month.ToString("D2"); // Ensure two digits for month
                //    UNewFileName += DateTime.Now.Day.ToString("D2"); // Ensure two digits for day
                //    UNewFileName += DateTime.Now.Hour.ToString("D2"); // Ensure two digits for hour
                //    UNewFileName += DateTime.Now.Minute.ToString("D2"); // Ensure two digits for minute
                //    UNewFileName += DateTime.Now.Second.ToString("D2"); // Ensure two digits for second
                //    UNewFileName += DateTime.Now.Millisecond.ToString("D3"); // Ensure three digits for milliseconds

                //    string UfileExtension = Path.GetExtension(UploadFile.FileName);
                //    UNewFileName += UfileExtension;
                //    string UfilePath = Path.Combine(uploadDir, UNewFileName);
                //    UploadFile.SaveAs(UfilePath);
                //    obj.UploadFile = "../DownloadMat/Boarding/" + UNewFileName;
                //} 
                string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.InsertClientOnboarding(obj))
                );

                return Json(new { status = true, Result = result });
            }
            catch (Exception ex)
            {
                return Json(new { status = false, message = ex.Message });
            }
        }
        public async Task<string> DeleteClientOnboarding(DocumentBAL obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.InsertClientOnboarding(obj)));
            return result;
        }
        public async Task<string> SearchClientOnboarding(DocumentBAL obj)
        {

            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.SearchClientOnboarding(obj)));
            return result;
        }

        public ActionResult BoardingMapping()
        {
            return View();
        }
        public async Task<string> InsertBoardingMapping(RetailBAL obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.InsertCreateOverview(obj)));
            return result;
        }

        public async Task<string> SearchBoardingMapping(RetailBAL obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.SearchBoardingMapping(obj)));
            return result;
        }


        //-----------------------------ComplianceDashboard

        public ActionResult ComplianceDashboard()
        {
            return View();
        }
        public ActionResult CalenderDashboard()
        {
            return View();
        }
        public ActionResult NCalenderDashboard()
        {
            return View();
        }
        public async Task<string> INUBoardingMapping(RetailBAL obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.INUBoardingMapping(obj)));
            return result;
        }
        public async Task<string> SearchComplianceDashboard(RetailBAL obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.SearchBoardingMapping(obj)));
            return result;
        }
        //-----------------------------ClientDashboard
        //-----------------------------ClientDashboard

        public ActionResult ClientDashboard()
        {
            return View();
        }

        public async Task<string> SearchClientDashboard(RetailBAL obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.SearchClientDashboard(obj)));
            return result;
        }
        //-----------------------------ClientDashboard
        //-----------------------------ComplianceDashboard

        public ActionResult StatutoryInternal()
        {
            return View();
        }
        public ActionResult SecretarialStatutoryInternal()
        {
            return View();
        }

        public async Task<string> IUDStatutoryInternal(RetailBAL obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.IUDStatutoryInternal(obj)));
            return result;
        }
        public async Task<string> SearchStatutoryInternal(RetailBAL obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.SearchStatutoryInternal(obj)));
            return result;
        }
        public async Task<string> SearchStatutory(RetailBAL obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.SearchStatutory(obj)));
            return result;
        }
        public async Task<string> SearchSecretarialStatutory(RetailBAL obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.SearchSecretarialStatutory(obj)));
            return result;
        }
        public async Task<string> CategoryStatutory(RetailBAL obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.CategoryStatutory(obj)));
            return result;
        }

        public async Task<string> IUDStatutory()
        {
            RetailBAL obj = new RetailBAL();
            if (Request.Files.Count > 0)
            {

                var file = Request.Files[0];
                string dir = "../DownloadMat/StatutoryDoc";
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
                string uploadpath = dir + "/" + obj.ComplianceName + "_" + NewFileName + extention;
                string filePath = System.Web.HttpContext.Current.Server.MapPath(uploadpath);
                //var filePath = Path.Combine(Server.MapPath("~/Uploads"), file.FileName);
                file.SaveAs(filePath);
                obj.UploadFile = uploadpath;
            }
            else
            {
                obj.UploadFile = (Request.Form["UploadFile"].Replace(",", "")).Replace("undefined", "");
            }

            obj.ASD = Request.Form["ASD"]; // Get additional form data
            obj.CSD = Request.Form["CSD"]; // Get additional form data
            obj.DelayDay = Request.Form["DelayDay"]; // Get additional form data
            obj.CACId = Request.Form["CACId"]; // Get additional form data
            obj.Action = Request.Form["Action"]; // Get additional form data
            obj.Createdby = Request.Form["Createdby"];
            obj.RegNo = Request.Form["RegNo"];
            obj.CSIID = Request.Form["CSIID"];
            obj.Status = Request.Form["Status"];
            obj.VRemark = Request.Unvalidated["VRemark"];
            obj.CRemark = Request.Form["CRemark"];
            obj.IsVerified = Request.Form["IsVerified"];

            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.IUDStatutory(obj)));
            return result;
        }

        //-----------------------------ClientDashboard


        public async Task<string> IUDSecretarialStatutory()
        {
            RetailBAL obj = new RetailBAL();
            if (Request.Files.Count > 0)
            {

                var file = Request.Files[0];
                string dir = "../DownloadMat/StatutoryDoc";
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
                string uploadpath = dir + "/" + obj.ComplianceName + "_" + NewFileName + extention;
                string filePath = System.Web.HttpContext.Current.Server.MapPath(uploadpath);
                //var filePath = Path.Combine(Server.MapPath("~/Uploads"), file.FileName);
                file.SaveAs(filePath);
                obj.UploadFile = uploadpath;
            }
            else
            {
                obj.UploadFile = (Request.Form["UploadFile"].Replace(",", "")).Replace("undefined", "");
            }

            obj.ASD = Request.Form["ASD"]; // Get additional form data
            obj.CSD = Request.Form["CSD"]; // Get additional form data
            obj.DelayDay = Request.Form["DelayDay"]; // Get additional form data
            obj.CACId = Request.Form["CACId"]; // Get additional form data
            obj.Action = Request.Form["Action"]; // Get additional form data
            obj.Createdby = Request.Form["Createdby"];
            obj.CSIID = Request.Form["CSIID"];
            obj.RegNo = Request.Form["RegNo"];
            obj.Status = Request.Form["Status"];
            obj.VRemark = Request.Unvalidated["VRemark"];
            obj.CRemark = Request.Unvalidated["CRemark"];
            obj.IsVerified = Request.Form["IsVerified"];

            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.IUDSecretarialStatutory(obj)));
            return result;
        }

        public async Task<string> IUDClientOnBoardingDash()
        {
            RetailBAL obj = new RetailBAL();
            if (Request.Files.Count > 0)
            {

                var file = Request.Files[0];
                string dir = "../DownloadMat/StatutoryDoc";
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
                //string extention = ".pdf"; here is comment old code by aadarsh dated 04/05/2026
                // here is start new code 
                string extention = Path.GetExtension(file.FileName).ToLower();

                // sirf pdf, xlsx, xls allow
                if (extention != ".pdf" && extention != ".xlsx" && extention != ".xls" && extention != ".csv")
                {
                    throw new Exception("Only .pdf,.csv, .xlsx and .xls files are allowed");
                }
                // here is end new code 
                string[] validExtensions = { ".csv", ".xls", ".xlsx" };

                if (validExtensions.Contains(extention.ToLower()))
                {
                    extention = ".csv";
                }
                string uploadpath = dir + "/" + obj.ComplianceName + "_" + NewFileName + extention;
                string filePath = System.Web.HttpContext.Current.Server.MapPath(uploadpath);
                //var filePath = Path.Combine(Server.MapPath("~/Uploads"), file.FileName);
                file.SaveAs(filePath);
                obj.UploadFile = uploadpath;
            }

            obj.ASD = Request.Form["ASD"]; // Get additional form data
            obj.CSD = Request.Form["CSD"]; // Get additional form data
            obj.DelayDay = Request.Form["DelayDay"]; // Get additional form data
            obj.CACId = Request.Form["CACId"]; // Get additional form data
            obj.Action = Request.Form["Action"]; // Get additional form data
            obj.Createdby = Request.Form["Createdby"];
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.IUDClientOnBoardingDash(obj)));
            return result;
        }

        public ActionResult RetailDepartmentMaster()
        {
            return View();
        }


        public async Task<string> IUDDepartmentMaster(TblPartyMaster obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.IUDDepartmentMaster(obj)));
            return result;
        }

        public async Task<string> SearchDepMaster(TblPartyMaster obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.SearchDepMaster(obj)));
            return result;
        }

        public ActionResult RetailCourtMaster()
        {
            return View();
        }


        public async Task<string> IUDCourtMaster(TblPartyMaster obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.IUDCourtMaster(obj)));
            return result;
        }

        public async Task<string> SearchCourtMaster(TblPartyMaster obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.SearchCourtMaster(obj)));
            return result;
        }
        public ActionResult RetailProjectMaster()
        {
            return View();
        }


        public async Task<string> IUDProjectMaster(TblPartyMaster obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.IUDCourtMaster(obj)));
            return result;
        }

        public async Task<string> SearchProjectMaster(TblPartyMaster obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.SearchCourtMaster(obj)));
            return result;
        }

        private string GenerateFileName(string prefix)
        {
            var strPassword = Guid.NewGuid().ToString("N").Substring(0, 4);
            var now = DateTime.Now;
            return $"{prefix}_{strPassword}{now:yyyyMMddHHmmss}";
        }


        #region Matching Text
        public ActionResult RetailFileMatching()
        {
            return View();
        }
        public async Task<string> IUDRetailFileMatching(TblPartyMaster obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.IUDRetailFileMatching(obj)));
            return result;
        }
        public async Task<string> SearchRetailFileMatching(TblPartyMaster obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.SearchRetailFileMatching(obj)));
            return result;
        }

        #endregion



        #region SearchStatutory Setup 
        public ActionResult StatutorySetup()
        {
            return View();
        }



        public async Task<string> IUDStatutorySetup(MappingBAL obj)
        {

            for (int i = 0; i < obj.Map1ListSet.Count; i++)
            {
                if (!string.IsNullOrEmpty(obj.Map1ListSet[i].Upload))
                {

                    if (obj.Map1ListSet[i].Upload.Contains("data:application/"))
                    {
                        obj.Map1ListSet[i].Upload = Regex.Replace(obj.Map1ListSet[i].Upload, @"^data:application\/[a-zA-Z]+;base64,", string.Empty);

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
                        byte[] data = Convert.FromBase64String(obj.Map1ListSet[i].Upload);
                        var imageStream = new MemoryStream(data, false);
                        string extention = ".pdf";

                        string relativeDir = "~/DownloadMat/StatutoryDoc";
                        string dirPath = Server.MapPath(relativeDir);

                        if (!Directory.Exists(dirPath))
                            Directory.CreateDirectory(dirPath);


                        string uploadpath = "../DownloadMat/StatutoryDoc" + NewFileName + extention;
                        string filePath = System.Web.HttpContext.Current.Server.MapPath(uploadpath);
                        FileStream file = new FileStream(filePath, FileMode.Create, FileAccess.Write);
                        imageStream.WriteTo(file);
                        file.Close();
                        imageStream.Close();
                        obj.Map1ListSet[i].Upload = uploadpath;

                    }


                }

            }
            string result = await Task.Run(() =>
               JsonConvert.SerializeObject(DAL.DLL.dll.IUDStatutorySetup(obj))
           );
            return result;
        }





        public async Task<string> SearchStatutorySetup(MappingBAL obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.dll.SearchStatutorySetup(obj)));
            return result;
        }

        #endregion

        public ActionResult Addcompliancefile()
        {
            return View();
        }

        public ActionResult ReportCompliance()
        {
            return View();
        }
        public ActionResult RetailSecretarialCompliance()
        {
            return View();
        }

        public async Task<string> SearchSecretarialCompliance(RetailBAL obj)
        {

            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.SearchSecretarialCompliance(obj)));
            return result;
        }



        [HttpPost]
        public async Task<JsonResult> IUDRetailSecretarialCompliance()
        {
            try
            {
                var obj = new RetailBAL
                {
                    Id = Request.Form["Id"],
                    Industry = Request.Form["Industry"],
                    State = Request.Form["State"],
                    Act = Request.Form["Act"],
                    Constitution = Request.Form["Constitution"],
                    Department = Request.Form["Department"],
                    Month = Request.Form["Month"],
                    Year = Request.Form["Year"],
                    Frequency = Request.Form["Frequency"],
                    Ministry = Request.Form["Ministry"],
                    ComplianceName = Request.Form["ComplianceName"],
                    Calendartype = Request.Form["Calendartype"],
                    Risk = Request.Form["Risk"],
                    ComplianceType = Request.Form["ComplianceType"],
                    Description = Request.Form["Description"],
                    DueDate = Request.Form["DueDate"],
                    IndustryList = Request.Form["IndustryList"],
                    UploadFile = Request.Form["UploadFile"],
                    excelFile = Request.Form["ExcelFile"],
                    Action = Request.Form["Action"],
                    selectedCategory = Request.Form["selectedCategory"],
                    selectedSubcategory = Request.Form["selectedSubcategory"],
                    DueDay = Request.Form["DueDay"],
                    Expire = Request.Form["Expire"],
                    ComplianceLevel = Request.Form["ComplianceLevel"],
                    Rule = Request.Form["Rule"],


                    Entity = Request.Form["Entity"],
                    Unit = Request.Form["Unit"],
                    Area = Request.Form["Area"],
                    ComplianceClassification = Request.Form["ComplianceClassification"],
                    SubClassification = Request.Form["SubClassification"],
                    AdditionalInformation = Request.Form["AdditionalInformation"],
                    ProofOfCompliance = Request.Form["ProofOfCompliance"],
                    Categorization = Request.Form["Categorization"],
                    ComplianceHeader = Request.Form["ComplianceHeader"],
                    PenaltyType = Request.Form["PenaltyType"],
                    PenaltyDescription = Request.Form["PenaltyDescription"],
                    StatutoryAuthority = Request.Form["StatutoryAuthority"],
                    EventName = Request.Form["EventName"],
                    EventApplicability = Request.Form["EventApplicability"],

                    Section = Request.Form["Section"],
                    currDate = Request.Form["currDate"],
                    CompanyCategory = Request.Form["CompanyCategory"],

                    EntityType = Request.Form["EntityType"],
                    ListedStatus = Request.Form["ListedStatus"],
                    StockExchange = Request.Form["StockExchange"],
                    FundingStatus = Request.Form["FundingStatus"],
                    FundingType = Request.Form["FundingType"]


                };
                obj.ActOverview = HttpUtility.UrlDecode(Request.Form["ActOverview"]);
                // Handle Excel File Upload

                HttpPostedFileBase excelFile = Request.Files["ExcelFile"];
                string uploadDir = Server.MapPath("~/DownloadMat/ActFile/");
                if (excelFile != null && excelFile.ContentLength > 0)
                {
                    string NewFileName = "";
                    string strPassword = Guid.NewGuid().ToString("N").Substring(0, 4);
                    NewFileName += strPassword;
                    NewFileName += DateTime.Now.Year.ToString();
                    NewFileName += DateTime.Now.Month.ToString("D2"); // Ensure two digits for month
                    NewFileName += DateTime.Now.Day.ToString("D2"); // Ensure two digits for day
                    NewFileName += DateTime.Now.Hour.ToString("D2"); // Ensure two digits for hour
                    NewFileName += DateTime.Now.Minute.ToString("D2"); // Ensure two digits for minute
                    NewFileName += DateTime.Now.Second.ToString("D2"); // Ensure two digits for second
                    NewFileName += DateTime.Now.Millisecond.ToString("D3"); // Ensure three digits for milliseconds
                    string fileExtension = Path.GetExtension(excelFile.FileName);
                    NewFileName += fileExtension;
                    string filePath = Path.Combine(uploadDir, NewFileName);
                    excelFile.SaveAs(filePath);
                    obj.UploadFile = "../DownloadMat/ActFile/" + NewFileName; // Store path in DB
                }


                string result = await Task.Factory.StartNew(() =>
                    JsonConvert.SerializeObject(DAL.DLL.IUDRetailSecretarialCompliance(obj))
                );

                return Json(new { status = true, Result = result });
            }
            catch (Exception ex)
            {
                return Json(new { status = false, message = ex.Message });
            }
        }




        #region SearchStatutory Setup 
        public ActionResult SecretarialStatutorySetup()
        {
            return View();
        }



        public async Task<string> IUDSecretarialStatutorySetup(MappingBAL obj)
        {

            for (int i = 0; i < obj.Map1ListSet.Count; i++)
            {
                if (!string.IsNullOrEmpty(obj.Map1ListSet[i].Upload))
                {

                    if (obj.Map1ListSet[i].Upload.Contains("data:application/"))
                    {
                        obj.Map1ListSet[i].Upload = Regex.Replace(obj.Map1ListSet[i].Upload, @"^data:application\/[a-zA-Z]+;base64,", string.Empty);

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
                        byte[] data = Convert.FromBase64String(obj.Map1ListSet[i].Upload);
                        var imageStream = new MemoryStream(data, false);
                        string extention = ".pdf";

                        string relativeDir = "~/DownloadMat/StatutoryDoc";
                        string dirPath = Server.MapPath(relativeDir);

                        if (!Directory.Exists(dirPath))
                            Directory.CreateDirectory(dirPath);


                        string uploadpath = "../DownloadMat/StatutoryDoc" + NewFileName + extention;
                        string filePath = System.Web.HttpContext.Current.Server.MapPath(uploadpath);
                        FileStream file = new FileStream(filePath, FileMode.Create, FileAccess.Write);
                        imageStream.WriteTo(file);
                        file.Close();
                        imageStream.Close();
                        obj.Map1ListSet[i].Upload = uploadpath;

                    }


                }

            }
            string result = await Task.Run(() =>
               JsonConvert.SerializeObject(DAL.DLL.dll.IUDSecretarialStatutorySetup(obj))
           );
            return result;
        }





        public async Task<string> SearchSecretarialStatutorySetup(MappingBAL obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.dll.SearchSecretarialStatutorySetup(obj)));
            return result;
        }

        #endregion


        #region Finacial Statutory
        public ActionResult RetailFinacialCalenderMaster()
        {
            return View();
        }
        [HttpPost]
        public async Task<JsonResult> IUDRetailFinacialCreateActCalender()
        {
            try
            {
                var obj = new RetailBAL
                {
                    Id = Request.Form["Id"],
                    Industry = Request.Form["Industry"],
                    State = Request.Form["State"],
                    Act = Request.Form["Act"],
                    Constitution = Request.Form["Constitution"],
                    Department = Request.Form["Department"],
                    Month = Request.Form["Month"],
                    Year = Request.Form["Year"],
                    Frequency = Request.Form["Frequency"],
                    Ministry = Request.Form["Ministry"],
                    ComplianceName = Request.Form["ComplianceName"],
                    Calendartype = Request.Form["Calendartype"],
                    Risk = Request.Form["Risk"],
                    ComplianceType = Request.Form["ComplianceType"],
                    Description = Request.Form["Description"],
                    DueDate = Request.Form["DueDate"],
                    IndustryList = Request.Form["IndustryList"],
                    UploadFile = Request.Form["UploadFile"],
                    excelFile = Request.Form["ExcelFile"],
                    Action = Request.Form["Action"],
                    selectedCategory = Request.Form["selectedCategory"],
                    selectedSubcategory = Request.Form["selectedSubcategory"],
                    DueDay = Request.Form["DueDay"],
                    Expire = Request.Form["Expire"],
                    ComplianceLevel = Request.Form["ComplianceLevel"],
                    Rule = Request.Form["Rule"],
                    Section = Request.Form["Section"],
                    currDate = Request.Form["currDate"],
                    Applicability = Request.Form["Applicability"],
                    Forms = Request.Form["Forms"]
                };
                obj.ActOverview = HttpUtility.UrlDecode(Request.Form["ActOverview"]);
                // Handle Excel File Upload

                HttpPostedFileBase excelFile = Request.Files["ExcelFile"];
                string uploadDir = Server.MapPath("~/DownloadMat/ActFile/");
                if (excelFile != null && excelFile.ContentLength > 0)
                {
                    string NewFileName = "";
                    string strPassword = Guid.NewGuid().ToString("N").Substring(0, 4);
                    NewFileName += strPassword;
                    NewFileName += DateTime.Now.Year.ToString();
                    NewFileName += DateTime.Now.Month.ToString("D2"); // Ensure two digits for month
                    NewFileName += DateTime.Now.Day.ToString("D2"); // Ensure two digits for day
                    NewFileName += DateTime.Now.Hour.ToString("D2"); // Ensure two digits for hour
                    NewFileName += DateTime.Now.Minute.ToString("D2"); // Ensure two digits for minute
                    NewFileName += DateTime.Now.Second.ToString("D2"); // Ensure two digits for second
                    NewFileName += DateTime.Now.Millisecond.ToString("D3"); // Ensure three digits for milliseconds
                    string fileExtension = Path.GetExtension(excelFile.FileName);
                    NewFileName += fileExtension;
                    string filePath = Path.Combine(uploadDir, NewFileName);
                    excelFile.SaveAs(filePath);
                    obj.UploadFile = "../DownloadMat/ActFile/" + NewFileName; // Store path in DB
                }

                string result = await Task.Factory.StartNew(() =>
                    JsonConvert.SerializeObject(DAL.DLL.IUDRetailFinacialCreateActCalender(obj))
                );

                return Json(new { status = true, Result = result });
            }
            catch (Exception ex)
            {
                return Json(new { status = false, message = ex.Message });
            }
        }
        public async Task<string> SearchRetailFinacialCreateActCalender(RetailBAL obj)
        {

            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.SearchFinancialStatutory(obj)));
            return result;
        }

        public async Task<string> SearchFinancialCreateActCalender(RetailBAL obj)
        {

            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.SearchFinancialCreateActCalender(obj)));
            return result;
        }

        public async Task<string> SearchFinacialStatutory(RetailBAL obj)
        {

            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.SearchFinacialStatutory(obj)));
            return result;
        }
        public ActionResult FinacialStatutoryInternal()
        {
            return View();
        }
        public async Task<string> IUDFinancialStatutory()
        {
            RetailBAL obj = new RetailBAL();
            if (Request.Files.Count > 0)
            {

                var file = Request.Files[0];
                string dir = "../DownloadMat/StatutoryDoc";
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
                string uploadpath = dir + "/" + obj.ComplianceName + "_" + NewFileName + extention;
                string filePath = System.Web.HttpContext.Current.Server.MapPath(uploadpath);
                //var filePath = Path.Combine(Server.MapPath("~/Uploads"), file.FileName);
                file.SaveAs(filePath);
                obj.UploadFile = uploadpath;
            }
            else
            {
                obj.UploadFile = (Request.Form["UploadFile"].Replace(",", "")).Replace("undefined", "");
            }

            obj.ASD = Request.Form["ASD"]; // Get additional form data
            obj.CSD = Request.Form["CSD"]; // Get additional form data
            obj.DelayDay = Request.Form["DelayDay"]; // Get additional form data
            obj.CACId = Request.Form["CACId"]; // Get additional form data
            obj.Action = Request.Form["Action"]; // Get additional form data
            obj.Createdby = Request.Form["Createdby"];
            obj.RegNo = Request.Form["RegNo"];
            obj.Id = Request.Form["Id"];

            obj.Status = Request.Form["Status"];
            obj.VRemark = Request.Form["VRemark"];
            obj.CRemark = Request.Form["CRemark"];
            obj.IsVerified = Request.Form["IsVerified"];

            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.IUDFinancialStatutory(obj)));
            return result;
        }

        #endregion


        #region SearchStatutory Setup 
        public ActionResult FinancialStatutorySetup()
        {
            return View();
        }



        public async Task<string> IUDFinancialStatutorySetup(MappingBAL obj)
        {

            for (int i = 0; i < obj.Map1ListSet.Count; i++)
            {
                if (!string.IsNullOrEmpty(obj.Map1ListSet[i].Upload))
                {

                    if (obj.Map1ListSet[i].Upload.Contains("data:application/"))
                    {
                        obj.Map1ListSet[i].Upload = Regex.Replace(obj.Map1ListSet[i].Upload, @"^data:application\/[a-zA-Z]+;base64,", string.Empty);

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
                        byte[] data = Convert.FromBase64String(obj.Map1ListSet[i].Upload);
                        var imageStream = new MemoryStream(data, false);
                        string extention = ".pdf";

                        string relativeDir = "~/DownloadMat/StatutoryDoc";
                        string dirPath = Server.MapPath(relativeDir);

                        if (!Directory.Exists(dirPath))
                            Directory.CreateDirectory(dirPath);


                        string uploadpath = "../DownloadMat/StatutoryDoc" + NewFileName + extention;
                        string filePath = System.Web.HttpContext.Current.Server.MapPath(uploadpath);
                        FileStream file = new FileStream(filePath, FileMode.Create, FileAccess.Write);
                        imageStream.WriteTo(file);
                        file.Close();
                        imageStream.Close();
                        obj.Map1ListSet[i].Upload = uploadpath;

                    }


                }

            }
            string result = await Task.Run(() =>
               JsonConvert.SerializeObject(DAL.DLL.dll.IUDFinancialStatutorySetup(obj))
           );
            return result;
        }





        public async Task<string> SearchFinancialStatutorySetup(MappingBAL obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.dll.SearchFinancialStatutorySetup(obj)));
            return result;
        }

        #endregion

        public ActionResult HeaderTemplate()
        {
            return View();
        }

        public ActionResult Enitfy()
        {
            return View();
        }

        public async Task<string> InsertUpdateDelEntify(EnitfyBAL obj)
        {
            try
            {
                string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.IUDEntify(obj)));
                return result;
            }
            catch (Exception ex)
            {
                // log ex.Message
                return ex.Message;
            }

        }


        public async Task<string> SearchEntify(EnitfyBAL obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.dll.SearchEntify(obj)));
            return result;
        }

        // Added by Shipra 15072025///////////////////////////////////////////////
        public ActionResult CaseStatusMaster()
        {
            return View();
        }



        public async Task<string> InsertUpdateDelCaseStatusMaster(EnitfyBAL obj)
        {
            try
            {
                string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.IUDEntify(obj)));
                return result;
            }
            catch (Exception ex)
            {
                // log ex.Message
                return ex.Message;
            }

        }


        public async Task<string> SearchCaseStatusMaster(EnitfyBAL obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.dll.SearchEntify(obj)));
            return result;
        }

        #region FactoryCompliance


        public ActionResult FactoryCompliance()
        {
            return View();
        }



        [HttpPost]
        public async Task<JsonResult> IUDFactoryCompliance()
        {
            try
            {
                var obj = new RetailBAL
                {
                    Id = Request.Form["Id"],
                    Industry = Request.Form["Industry"],
                    State = Request.Form["State"],
                    Act = Request.Form["Act"],
                    Constitution = Request.Form["Constitution"],
                    Department = Request.Form["Department"],
                    Month = Request.Form["Month"],
                    Year = Request.Form["Year"],
                    Frequency = Request.Form["Frequency"],
                    Ministry = Request.Form["Ministry"],
                    ComplianceName = Request.Form["ComplianceName"],
                    Calendartype = Request.Form["Calendartype"],
                    Risk = Request.Form["Risk"],
                    ComplianceType = Request.Form["ComplianceType"],
                    Description = Request.Form["Description"],
                    DueDate = Request.Form["DueDate"],
                    IndustryList = Request.Form["IndustryList"],
                    UploadFile = Request.Form["UploadFile"],
                    excelFile = Request.Form["ExcelFile"],
                    Action = Request.Form["Action"],
                    selectedCategory = Request.Form["selectedCategory"],
                    selectedSubcategory = Request.Form["selectedSubcategory"],
                    DueDay = Request.Form["DueDay"],
                    Expire = Request.Form["Expire"],
                    ComplianceLevel = Request.Form["ComplianceLevel"],
                    Rule = Request.Form["Rule"],
                    Section = Request.Form["Section"],
                    currDate = Request.Form["currDate"],
                    CompanyCategory = Request.Form["CompanyCategory"],

                    EntityType = Request.Form["EntityType"],
                    ListedStatus = Request.Form["ListedStatus"],
                    StockExchange = Request.Form["StockExchange"],
                    FundingStatus = Request.Form["FundingStatus"],
                    FundingType = Request.Form["FundingType"],
                    FormNo = Request.Form["FormNo"],


                };
                obj.ActOverview = HttpUtility.UrlDecode(Request.Form["ActOverview"]);
                // Handle Excel File Upload

                HttpPostedFileBase excelFile = Request.Files["ExcelFile"];
                string uploadDir = Server.MapPath("~/DownloadMat/ActFile/");
                if (excelFile != null && excelFile.ContentLength > 0)
                {
                    string NewFileName = "";
                    string strPassword = Guid.NewGuid().ToString("N").Substring(0, 4);
                    NewFileName += strPassword;
                    NewFileName += DateTime.Now.Year.ToString();
                    NewFileName += DateTime.Now.Month.ToString("D2"); // Ensure two digits for month
                    NewFileName += DateTime.Now.Day.ToString("D2"); // Ensure two digits for day
                    NewFileName += DateTime.Now.Hour.ToString("D2"); // Ensure two digits for hour
                    NewFileName += DateTime.Now.Minute.ToString("D2"); // Ensure two digits for minute
                    NewFileName += DateTime.Now.Second.ToString("D2"); // Ensure two digits for second
                    NewFileName += DateTime.Now.Millisecond.ToString("D3"); // Ensure three digits for milliseconds
                    string fileExtension = Path.GetExtension(excelFile.FileName);
                    NewFileName += fileExtension;
                    string filePath = Path.Combine(uploadDir, NewFileName);
                    excelFile.SaveAs(filePath);
                    obj.UploadFile = "../DownloadMat/ActFile/" + NewFileName; // Store path in DB
                }


                string result = await Task.Factory.StartNew(() =>
                    JsonConvert.SerializeObject(DAL.DLL.IUDFactoryCompliance(obj))
                );

                return Json(new { status = true, Result = result });
            }
            catch (Exception ex)
            {
                return Json(new { status = false, message = ex.Message });
            }
        }
        public async Task<string> SearchFactoryCompliance(RetailBAL obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.SearchFactoryCompliance(obj)));
            return result;
        }



        [HttpPost]
        public async Task<JsonResult> IUDLabourcodeCompliance()
        {
            try
            {
                var obj = new RetailBAL
                {
                    Id = Request.Form["Id"],
                    Industry = Request.Form["Industry"],
                    State = Request.Form["State"],
                    Act = Request.Form["Act"],
                    Constitution = Request.Form["Constitution"],
                    Department = Request.Form["Department"],
                    Month = Request.Form["Month"],
                    Year = Request.Form["Year"],
                    Frequency = Request.Form["Frequency"],
                    Ministry = Request.Form["Ministry"],
                    ComplianceName = Request.Form["ComplianceName"],
                    Calendartype = Request.Form["Calendartype"],
                    Risk = Request.Form["Risk"],
                    ComplianceType = Request.Form["ComplianceType"],
                    Description = Request.Form["Description"],
                    DueDate = Request.Form["DueDate"],
                    IndustryList = Request.Form["IndustryList"],
                    UploadFile = Request.Form["UploadFile"],
                    excelFile = Request.Form["ExcelFile"],
                    Action = Request.Form["Action"],
                    selectedCategory = Request.Form["selectedCategory"],
                    selectedSubcategory = Request.Form["selectedSubcategory"],
                    DueDay = Request.Form["DueDay"],
                    Expire = Request.Form["Expire"],
                    ComplianceLevel = Request.Form["ComplianceLevel"],
                    Rule = Request.Form["Rule"],
                    Section = Request.Form["Section"],
                    currDate = Request.Form["currDate"],
                    CompanyCategory = Request.Form["CompanyCategory"],

                    EntityType = Request.Form["EntityType"],
                    ListedStatus = Request.Form["ListedStatus"],
                    StockExchange = Request.Form["StockExchange"],
                    FundingStatus = Request.Form["FundingStatus"],
                    FundingType = Request.Form["FundingType"],
                    FormNo = Request.Form["FormNo"],
                    DetailedCompliance = Request.Form["DetailedCompliance"],
                    ImpactEmployer = Request.Form["ImpactEmployer"],

                };
                obj.ActOverview = HttpUtility.UrlDecode(Request.Form["ActOverview"]);
                // Handle Excel File Upload

                HttpPostedFileBase excelFile = Request.Files["ExcelFile"];
                string uploadDir = Server.MapPath("~/DownloadMat/ActFile/");
                if (excelFile != null && excelFile.ContentLength > 0)
                {
                    string NewFileName = "";
                    string strPassword = Guid.NewGuid().ToString("N").Substring(0, 4);
                    NewFileName += strPassword;
                    NewFileName += DateTime.Now.Year.ToString();
                    NewFileName += DateTime.Now.Month.ToString("D2"); // Ensure two digits for month
                    NewFileName += DateTime.Now.Day.ToString("D2"); // Ensure two digits for day
                    NewFileName += DateTime.Now.Hour.ToString("D2"); // Ensure two digits for hour
                    NewFileName += DateTime.Now.Minute.ToString("D2"); // Ensure two digits for minute
                    NewFileName += DateTime.Now.Second.ToString("D2"); // Ensure two digits for second
                    NewFileName += DateTime.Now.Millisecond.ToString("D3"); // Ensure three digits for milliseconds
                    string fileExtension = Path.GetExtension(excelFile.FileName);
                    NewFileName += fileExtension;
                    string filePath = Path.Combine(uploadDir, NewFileName);
                    excelFile.SaveAs(filePath);
                    obj.UploadFile = "../DownloadMat/ActFile/" + NewFileName; // Store path in DB
                }


                string result = await Task.Factory.StartNew(() =>
                    JsonConvert.SerializeObject(DAL.DLL.IUDLabourcodeCompliance(obj))
                );

                return Json(new { status = true, Result = result });
            }
            catch (Exception ex)
            {
                return Json(new { status = false, message = ex.Message });
            }
        }
        public async Task<string> SearchLabourcodeCompliance(RetailBAL obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.SearchLabourcodeCompliance(obj)));
            return result;
        }
        public async Task<string> SearchFactStatutory(RetailBAL obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.SearchFactStatutory(obj)));
            return result;
        }
        public async Task<string> SearchLc(RetailBAL obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.SearchLc(obj)));
            return result;
        }
        public async Task<string> bindingDashboard(RetailBAL obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.bindingDashboard(obj)));
            return result;
        }
        /// Start  Added by shipra ////
        public async Task<string> bindingReport(RetailBAL obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.bindingReport(obj)));
            return result;
        }



        /// End by shipra ////

        public async Task<string> bindingcommmonTiles(RetailBAL obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.bindingcommmonTiles(obj)));
            return result;
        }

        #endregion

        public ActionResult RetailFactoryCompliance()
        {
            return View();
        }
        [HttpPost]
        public async Task<string> IUDFactoryStatutory()
        {
            RetailBAL obj = new RetailBAL();
            if (Request.Files.Count > 0)
            {

                var file = Request.Files[0];
                string dir = "../DownloadMat/StatutoryDoc";
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
                string uploadpath = dir + "/" + obj.ComplianceName + "_" + NewFileName + extention;
                string filePath = System.Web.HttpContext.Current.Server.MapPath(uploadpath);
                //var filePath = Path.Combine(Server.MapPath("~/Uploads"), file.FileName);
                file.SaveAs(filePath);
                obj.UploadFile = uploadpath;
            }
            else
            {
                obj.UploadFile = (Request.Form["UploadFile"].Replace(",", "")).Replace("undefined", "");
            }

            obj.ASD = Request.Form["ASD"]; // Get additional form data
            obj.CSD = Request.Form["CSD"]; // Get additional form data
            obj.DelayDay = Request.Form["DelayDay"]; // Get additional form data
            obj.CACId = Request.Form["CACId"]; // Get additional form data
            obj.Action = Request.Form["Action"]; // Get additional form data
            obj.Createdby = Request.Form["Createdby"];
            obj.RegNo = Request.Form["RegNo"];

            obj.Status = Request.Form["Status"];
            obj.VRemark = Request.Form["VRemark"];
            obj.CRemark = Request.Form["CRemark"];
            obj.IsVerified = Request.Form["IsVerified"];

            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.IUDFactoryStatutory(obj)));
            return result;
        }


        // Added by Shipra 15072025///////////////////////////////////////////////

        public ActionResult AddContractorCompliance()
        {
            return View();
        }

        public ActionResult ContractorReportCompliance()
        {
            return View();
        }



        public ActionResult RetailLabourCode()
        {
            return View();
        }
        public ActionResult RetailLabourCodeCompliance()
        {
            return View();
        }
        public ActionResult LabourCodeCompliance()
        {
            return View();
        }

        [HttpPost]
        public async Task<string> IUDLabourCodeStatutory()
        {
            RetailBAL obj = new RetailBAL();
            if (Request.Files.Count > 0)
            {

                var file = Request.Files[0];
                string dir = "../DownloadMat/StatutoryDoc";
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
                string uploadpath = dir + "/" + obj.ComplianceName + "_" + NewFileName + extention;
                string filePath = System.Web.HttpContext.Current.Server.MapPath(uploadpath);
                //var filePath = Path.Combine(Server.MapPath("~/Uploads"), file.FileName);
                file.SaveAs(filePath);
                obj.UploadFile = uploadpath;
            }
            else
            {
                obj.UploadFile = (Request.Form["UploadFile"].Replace(",", "")).Replace("undefined", "");
            }

            obj.ASD = Request.Form["ASD"]; // Get additional form data
            obj.CSD = Request.Form["CSD"]; // Get additional form data
            obj.DelayDay = Request.Form["DelayDay"]; // Get additional form data
            obj.CACId = Request.Form["CACId"]; // Get additional form data
            obj.Action = Request.Form["Action"]; // Get additional form data
            obj.Createdby = Request.Form["Createdby"];
            obj.RegNo = Request.Form["RegNo"];

            obj.Status = Request.Form["Status"];
            obj.VRemark = Request.Form["VRemark"];
            obj.CRemark = Request.Form["CRemark"];
            obj.IsVerified = Request.Form["IsVerified"];

            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.IUDLabourCodeStatutory(obj)));
            return result;
        }

        public ActionResult ClientStoreMapping()
        {
            return View();
        }

        public ActionResult IndustryLicenseMapping()
        {
            return View();
        }


        public async Task<string> InsertUpdateDelIndustryLicenseMapping(RetailLicenseDocuementMaster obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.ClientInsertUpdateDelStoreMapping(obj)));
            return result;
        }


        public async Task<string> SearchIndustryLicenseMapping(TblPartyMaster obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.ClientSearchStoreMapping(obj)));
            return result;
        }

        public ActionResult SecretarialCompliance()
        {
            return View();
        }
        public ActionResult labourcompliance1()
        {
            return View();
        }
        public ActionResult labourcompliance()
        {
            return View();
        }

        public ActionResult NSecretarialCompliance()
        {
            return View();
        }
        public ActionResult LabourSetup()
        {
            return View();
        }
        public ActionResult SecretarialSetup()
        {
            return View();
        }
        public ActionResult Secreterialsetup()
        {
            return View();
        }
        public ActionResult FinanceCompliance()
        {
            return View();
        }


        public ActionResult EntitySetup()
        {
            return View();
        }

        public async Task<string> SearchFinacialStatutoryEvent(RetailBAL obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.SearchFinacialStatutoryEvent(obj)));
            return result;
        }
		
 // here is add new code for Factory Event Compliance dated 13/05/2026 by Aadarsh
        [HttpPost]
        public async Task<string> AddFactoryEventcompliance()
        {
            RetailBAL obj = new RetailBAL();
            if (Request.Files.Count > 0)
            {

                var file = Request.Files[0];
                string dir = "../DownloadMat/StatutoryDoc";
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
                string uploadpath = dir + "/" + obj.ComplianceName + "_" + NewFileName + extention;
                string filePath = System.Web.HttpContext.Current.Server.MapPath(uploadpath);
                //var filePath = Path.Combine(Server.MapPath("~/Uploads"), file.FileName);
                file.SaveAs(filePath);
                obj.UploadFile = uploadpath;
            }
            else
            {
                obj.UploadFile = (Request.Form["UploadFile"].Replace(",", "")).Replace("undefined", "");
            }

            obj.ASD = Request.Form["ASD"]; // Get additional form data
            obj.CSD = Request.Form["CSD"]; // Get additional form data
            obj.DelayDay = Request.Form["DelayDay"]; // Get additional form data
            obj.CACId = Request.Form["CACId"]; // Get additional form data
            obj.Action = Request.Form["Action"]; // Get additional form data
            obj.Createdby = Request.Form["Createdby"];
            obj.RegNo = Request.Form["RegNo"];

            obj.Status = Request.Form["Status"];
            obj.VRemark = Request.Form["VRemark"];
            obj.CRemark = Request.Form["CRemark"];
            obj.IsVerified = Request.Form["IsVerified"];
            obj.Id = Request.Form["Id"];

            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.AddFactoryEventcompliance(obj)));
            return result;
        }

        public async Task<string> SearchFactoryEventcompliance(RetailBAL obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.SearchFactoryEventcompliance(obj)));
            return result;
        }


        // here is add new code for Secretarial Event Compliance dated 14/05/2026 by Aadarsh
        [HttpPost]
        public async Task<string> AddSecretarialEventcompliance()
        {
            RetailBAL obj = new RetailBAL();
            if (Request.Files.Count > 0)
            {

                var file = Request.Files[0];
                string dir = "../DownloadMat/StatutoryDoc";
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
                string uploadpath = dir + "/" + obj.ComplianceName + "_" + NewFileName + extention;
                string filePath = System.Web.HttpContext.Current.Server.MapPath(uploadpath);
                //var filePath = Path.Combine(Server.MapPath("~/Uploads"), file.FileName);
                file.SaveAs(filePath);
                obj.UploadFile = uploadpath;
            }
            else
            {
                obj.UploadFile = (Request.Form["UploadFile"].Replace(",", "")).Replace("undefined", "");
            }

            obj.ASD = Request.Form["ASD"]; // Get additional form data
            obj.CSD = Request.Form["CSD"]; // Get additional form data
            obj.DelayDay = Request.Form["DelayDay"]; // Get additional form data
            obj.CACId = Request.Form["CACId"]; // Get additional form data
            obj.Action = Request.Form["Action"]; // Get additional form data
            obj.Createdby = Request.Form["Createdby"];
            obj.RegNo = Request.Form["RegNo"];

            obj.Status = Request.Form["Status"];
            obj.VRemark = Request.Form["VRemark"];
            obj.CRemark = Request.Form["CRemark"];
            obj.IsVerified = Request.Form["IsVerified"];
            obj.Id = Request.Form["Id"];

            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.AddSecretarialEventcompliance(obj)));
            return result;
        }

        public async Task<string> SearchSecretarialEvent(RetailBAL obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.SearchSecretarialEvent(obj)));
            return result;
        }

        public ActionResult FactoryComp()
        {
            return View();
        }
		
		
		
		
         // here is add new code for Secretarial Event Compliance dated 18/05/2026 by Aadarsh
        [HttpPost]
        public async Task<string> AddLabourEventcompliance()
        {
            RetailBAL obj = new RetailBAL();
            if (Request.Files.Count > 0)
            {

                var file = Request.Files[0];
                string dir = "../DownloadMat/StatutoryDoc";
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
                string uploadpath = dir + "/" + obj.ComplianceName + "_" + NewFileName + extention;
                string filePath = System.Web.HttpContext.Current.Server.MapPath(uploadpath);
                //var filePath = Path.Combine(Server.MapPath("~/Uploads"), file.FileName);
                file.SaveAs(filePath);
                obj.UploadFile = uploadpath;
            }
            else
            {
                obj.UploadFile = (Request.Form["UploadFile"].Replace(",", "")).Replace("undefined", "");
            }

            obj.ASD = Request.Form["ASD"]; // Get additional form data
            obj.CSD = Request.Form["CSD"]; // Get additional form data
            obj.DelayDay = Request.Form["DelayDay"]; // Get additional form data
            obj.CACId = Request.Form["CACId"]; // Get additional form data
            obj.Action = Request.Form["Action"]; // Get additional form data
            obj.Createdby = Request.Form["Createdby"];
            obj.RegNo = Request.Form["RegNo"];

            obj.Status = Request.Form["Status"];
            obj.VRemark = Request.Form["VRemark"];
            obj.CRemark = Request.Form["CRemark"];
            obj.IsVerified = Request.Form["IsVerified"];
            obj.Id = Request.Form["Id"];

            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.AddLabourEventcompliance(obj)));
            return result;
        }

        public async Task<string> SearchLabourEvent(RetailBAL obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.SearchLabourEvent(obj)));
            return result;
        }

    }
} 