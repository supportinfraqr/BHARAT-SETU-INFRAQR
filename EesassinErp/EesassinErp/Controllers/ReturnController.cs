using BAL;
using DAL;
using Newtonsoft.Json.Linq;
using System;
using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using System.Web;
using System.Web.Mvc;
namespace EesassinErp.Controllers
{
    [AllowAnonymous]
    public class ReturnController : Controller
    {
        [AllowAnonymous]
        public ActionResult DigiLockerComplete()
        {
            return View();
        }
        private string FormatDOB(string dob)
        {
            if (string.IsNullOrEmpty(dob))
                return "";

            if (dob.Length == 8)
            {
                return dob.Substring(0, 2) + "/" +
                       dob.Substring(2, 2) + "/" +
                       dob.Substring(4, 4);
            }

            return dob;
        }
       
        private async Task ProcessDigiLocker(string accessToken, string state, RetialEmployeeManager obj11)
        {
            try
            {
               
                await DownloadAndSaveDocuments(accessToken, state);

                DLL.dll.SaveDigiLockerEmployeeData(obj11);


                LoginBAL obj = new LoginBAL();

                obj.Action = "66";
                obj.Password = state;

                var dt = DLL.dll.LoginVerify(obj);


                if (dt.Rows.Count > 0)
                {
                    string RPath = Convert.ToString(dt.Rows[0]["RPath"]);
                    Session["LoginId"] = state;
                    Session["DigiLockerRedirectPath"] = RPath;
                    Session["DigiLockerCompleted"] = "1";
                }
            }
            catch (Exception ex)
            {
                System.IO.File.WriteAllText(
                    Server.MapPath("~/App_Data/digilocker_process_error.txt"),
                    ex.ToString()
                );

                Session["DigiLockerCompleted"] = "ERROR";
            }
        }
      

        public JsonResult CheckDigiLockerStatus()
        {
            string status = Session["DigiLockerCompleted"]?.ToString();

            if (status == "1")
            {
                string path = Session["DigiLockerRedirectPath"]?.ToString();

                return Json(new
                {
                    status = "1",
                    path = path,
                    LoginId = Session["LoginId"]?.ToString()
                }, JsonRequestBehavior.AllowGet);
            }


            if (status == "ERROR")
            {
                return Json(new
                {
                    status = "ERROR"
                }, JsonRequestBehavior.AllowGet);
            }


            return Json(new
            {
                status = "0"
            }, JsonRequestBehavior.AllowGet);
        }
        public async Task<string> DownloadAndSaveDocuments(string accessToken,string state)
        {
            try
            {
                string folderPath =
                    @"C:\projects\login.bharatshramsetu.com\DownloadMat\DigiLockerDocs";

                if (!Directory.Exists(folderPath))
                    Directory.CreateDirectory(folderPath);

                using (var client = new HttpClient())
                {
                    client.DefaultRequestHeaders.Authorization =
                        new AuthenticationHeaderValue("Bearer", accessToken);

                    client.DefaultRequestHeaders.Accept.Add(
                        new MediaTypeWithQualityHeaderValue("application/json"));

                    // Issued Documents API
                    string documentApiUrl =
                        "https://digilocker.meripehchaan.gov.in/public/oauth2/2/files/issued";

                    var response = await client.GetAsync(documentApiUrl);

                    string json = await response.Content.ReadAsStringAsync();

                    // Raw JSON Save
                    System.IO.File.WriteAllText(
                        Path.Combine(folderPath, "documents_response.json"),
                        json);
 

                    if (!response.IsSuccessStatusCode)
                    {
                        return json;
                    }

                    JObject obj = JObject.Parse(json);

                    JArray docs = obj["items"] as JArray;

                    if (docs == null || docs.Count == 0)
                    {
                        return "No documents found.";
                    }

                    // =========================
                    // Document List Save
                    // =========================

                    string listFile =
                        Path.Combine(folderPath, "DocumentList.txt");

                    using (StreamWriter sw = new StreamWriter(listFile, false))
                    {
                        sw.WriteLine("Total Documents : " + docs.Count);
                        sw.WriteLine("===================================================");

                        foreach (var doc in docs)
                        {
                            sw.WriteLine("Name       : " + (doc["name"] ?? ""));
                            sw.WriteLine("URI        : " + (doc["uri"] ?? ""));
                            sw.WriteLine("Doc Type   : " + (doc["doctype"] ?? ""));
                            sw.WriteLine("Issuer     : " + (doc["issuer"] ?? ""));
                            sw.WriteLine("Date       : " + (doc["date"] ?? ""));
                            sw.WriteLine("===================================================");
                        System.IO.File.AppendAllText(
                        Path.Combine(folderPath, "doc_debug.txt"),
                        doc.ToString() + Environment.NewLine +
                        "------------------------------------" +
                        Environment.NewLine
                        );
                        }
                    }

                    // =========================
                    // Download Documents
                    // =========================

                    foreach (var doc in docs)
                    {
                        string uri = doc["uri"]?.ToString();

                        if (string.IsNullOrEmpty(uri))
                            continue;

                        string downloadUrl =
                            "https://digilocker.meripehchaan.gov.in/public/oauth2/1/file/" +
                            HttpUtility.UrlEncode(uri);

                        var fileResponse =
                            await client.GetAsync(downloadUrl);

                        if (!fileResponse.IsSuccessStatusCode)
                            continue;

                        byte[] fileBytes =
                            await fileResponse.Content.ReadAsByteArrayAsync();

                        string safeFileName = uri
                            .Replace("/", "_")
                            .Replace("\\", "_")
                            .Replace(":", "_");

                        string filePath =
                            Path.Combine(folderPath, safeFileName + ".pdf");
                        string panNumber = "";

                        Match panMatch = Regex.Match(uri, @"[A-Z]{5}[0-9]{4}[A-Z]{1}");

                        if (panMatch.Success)
                        {
                            panNumber = panMatch.Value;
                        }

                        RetialEmployeeManager obj11 = new RetialEmployeeManager();

                        obj11.ActionType = "65";
                        obj11.PANCardFilePath = filePath;
                        obj11.PartyCode = state;
                        obj11.PANNumber = panNumber;


                        var dt = DLL.dll.SaveDigiLockerEmployeeData(obj11);

                        System.IO.File.WriteAllBytes(filePath, fileBytes);
                    }

                    return "Documents Downloaded Successfully. Total Documents : " + docs.Count;
                }
            }
            catch (Exception ex)
            {
                return ex.ToString();
            }
        }
        [AllowAnonymous]

        public async Task<ActionResult> Digilocker(string code, string state, string jti)
        {


            try
            {
                Session["LoginId"] = state;
                ServicePointManager.SecurityProtocol = SecurityProtocolType.Tls12;

                string codeVerifier = Session["CodeVerifier"]?.ToString();

                if (string.IsNullOrEmpty(code))
                {
                    return Content("Authorization code not received");
                }

                if (string.IsNullOrEmpty(codeVerifier))
                {
                    return Content("Code verifier missing from session");
                }

                using (var client = new HttpClient())
                {
                    client.DefaultRequestHeaders.Accept.Add(
                        new MediaTypeWithQualityHeaderValue("application/json"));
                     
                    var values = new Dictionary<string, string>
            {
                { "grant_type", "authorization_code" },
                { "code", code },
                { "client_id", "MS53AA158D" },
               { "client_secret", "727f64249a2d50ac2019" },
                { "redirect_uri", "https://login.bharatshramsetu.com/Return/Digilocker" },
                { "code_verifier", codeVerifier }
            };

                    

                    var tokenResponse = await client.PostAsync(
                        "https://digilocker.meripehchaan.gov.in/public/oauth2/2/token",
                        new FormUrlEncodedContent(values));

                    string tokenResult = await tokenResponse.Content.ReadAsStringAsync();



                    System.IO.File.WriteAllText(
                        Server.MapPath("~/App_Data/token_response.txt"),
                        tokenResult);

                    if (!tokenResponse.IsSuccessStatusCode)
                    {
                        return Content(tokenResult, "application/json");
                    }



               

                    JObject tokenObj = JObject.Parse(tokenResult);
                    string accessToken = tokenObj["access_token"]?.ToString();

                    if (string.IsNullOrEmpty(accessToken))
                    {
                        return Content("Access token not found.");
                    }
                     
                    var userClient = new HttpClient();

                    userClient.DefaultRequestHeaders.Authorization =
                        new AuthenticationHeaderValue("Bearer", accessToken);

                    userClient.DefaultRequestHeaders.Accept.Add(
                        new MediaTypeWithQualityHeaderValue("application/json"));

                    var userResponse = await userClient.GetAsync(
                        "https://digilocker.meripehchaan.gov.in/public/oauth2/1/user");


     

                    string userResult = await userResponse.Content.ReadAsStringAsync(); 


                    //string resultDoc = await DownloadAndSaveDocuments(accessToken,state);


                    JObject userObj = JObject.Parse(userResult);

                    string digilockerid = userObj["digilockerid"]?.ToString();
                    string name = userObj["name"]?.ToString();
                    string dob = userObj["dob"]?.ToString();
                    string gender = userObj["gender"]?.ToString();
                    string mobile = userObj["mobile"]?.ToString();
                    string email = userObj["email"]?.ToString();
                    string referenceKey = userObj["reference_key"]?.ToString();
                    string eaadhaar = userObj["eaadhaar"]?.ToString();
                    string pictureBase64 = userObj["picture"]?.ToString();

                    string msg = DLL.dll.CheckMobileExists(mobile);

                    if (!string.IsNullOrWhiteSpace(msg))
                    {
                        ViewBag.ErrorMessage = msg;
                        return View("Digilocker");
                    }

                    string photoRelativePath = "";

                    if (!string.IsNullOrEmpty(pictureBase64))
                    {
                        string photoFolder =
                            Server.MapPath("~/DownloadMat/ProfilePhoto");

                        if (!Directory.Exists(photoFolder))
                            Directory.CreateDirectory(photoFolder);

                        string fileName =
                            digilockerid + ".jpg";

                        string fullPath =
                            Path.Combine(photoFolder, fileName);

                        byte[] imageBytes =
                            Convert.FromBase64String(pictureBase64);

                        System.IO.File.WriteAllBytes(fullPath, imageBytes);

                        photoRelativePath =
                            "../DownloadMat/ProfilePhoto/" + fileName;
                    }

                    string photo = photoRelativePath;

                    RetialEmployeeManager obj11 = new RetialEmployeeManager();

                    obj11.ActionType = "64";
                    obj11.PartyCode = state;

                    obj11.DigiLockerId = digilockerid;
                    obj11.EmployeeName = name;
                    obj11.DOB = FormatDOB(dob);
                    obj11.Gendar = gender;
                    obj11.MobileNumber = mobile;
                    obj11.EmployeeEmailID = email;
                    obj11.EmployeePhotos = photo;
                    //obj11.EAadhaar = eaadhaar;

                    //var dt = DLL.dll.SaveDigiLockerEmployeeData(obj11);
                    System.IO.File.WriteAllText(
                     Server.MapPath("~/App_Data/user_response.txt"),
                     userResult);

                    _ = Task.Run(async () =>
                    {
                        await ProcessDigiLocker(accessToken, state, obj11);
                    });


                    return View("DigiLockerComplete");

                     
                 


                     
                    //return Content(userResult, "application/json");
                }
            }
            catch (Exception ex)
            {
                System.IO.File.WriteAllText(
                    Server.MapPath("~/App_Data/token_error.txt"),
                    ex.ToString());

                return Content(ex.ToString());
            }

            
        }




    }
}