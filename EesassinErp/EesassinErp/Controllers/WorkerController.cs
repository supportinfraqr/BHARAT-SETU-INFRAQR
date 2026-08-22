using System;
using System.Collections.Generic;
using System.Data;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using System.Web;
using System.Web.Mvc;
using System.Web.Configuration;
using BAL;
using DAL;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace EesassinErp.Controllers
{
    [ValidateSession]
    public class WorkerController : Controller
    {
        private static readonly string QrBaseUrl =
            (WebConfigurationManager.AppSettings["BssQrBaseUrl"] ?? "https://bharat-shramsetu.infraqr.com").TrimEnd('/');

        // ─── QR Integration Views ─────────────────────────────────────────────

        /// <summary>QR Gateway — routes users to role-based actions</summary>
        public ActionResult QrGateway()
        {
            ViewBag.LoginType = Session["loginType"]?.ToString() ?? Session["LoginType"]?.ToString() ?? "1";
            ViewBag.QrBaseUrl = QrBaseUrl;
            return View();
        }

        /// <summary>QR Dashboard — shows stats & worker list from Django QR backend</summary>
        public ActionResult QrDashboard()
        {
            ViewBag.QrBaseUrl = QrBaseUrl;
            return View();
        }

        /// <summary>QR Scan — camera scan page embedded in ERP</summary>
        public ActionResult QrScan()
        {
            ViewBag.QrBaseUrl = QrBaseUrl;
            return View();
        }

        /// <summary>QR Worker Card — view/download identity card for a worker</summary>
        public ActionResult QrWorkerCard(int id)
        {
            ViewBag.WorkerId = id;
            ViewBag.QrBaseUrl = QrBaseUrl;
            return View();
        }

        /// <summary>QR My Card — view/download identity card for the current logged-in user (Any Role)</summary>
        public ActionResult QrMyCard()
        {
            ViewBag.QrBaseUrl = QrBaseUrl;
            return View();
        }

        /// <summary>QR My Employers — list of employers associated with the contractor</summary>
        public ActionResult QrMyEmployers()
        {
            ViewBag.LoginType = Session["loginType"]?.ToString() ?? Session["LoginType"]?.ToString() ?? "1";
            ViewBag.LoginId = Session["LoginId"]?.ToString() ?? "0";
            ViewBag.QrBaseUrl = QrBaseUrl;
            return View();
        }

        /// <summary>
        /// POST /Worker/QrLogin — called by the ERP frontend to log into the Django QR backend
        /// and store the JWT token in ASP.NET session so QrBridgeController can use it.
        /// </summary>
        [HttpPost]
        public async Task<JsonResult> QrLogin(string username, string password)
        {
            try
            {
                System.Net.ServicePointManager.SecurityProtocol = System.Net.SecurityProtocolType.Tls12;
                using (var client = new HttpClient { Timeout = TimeSpan.FromSeconds(30) })
                {
                    var payload = JsonConvert.SerializeObject(new { username, password });
                    var resp = await client.PostAsync(
                        QrBaseUrl + "/api/auth/login/",
                        new StringContent(payload, Encoding.UTF8, "application/json"));

                    var body = await resp.Content.ReadAsStringAsync();

                    if (resp.IsSuccessStatusCode)
                    {
                        dynamic json = JsonConvert.DeserializeObject(body);
                        string token = json?.access?.ToString();
                        if (!string.IsNullOrEmpty(token))
                            Session["BssQrToken"] = token;

                        return Json(new { ok = true, body });
                    }

                    return Json(new { ok = false, body });
                }
            }
            catch (Exception ex)
            {
                return Json(new { ok = false, error = ex.Message });
            }
        }

        // ─── Existing Worker Actions ──────────────────────────────────────────

        // GET: Worker
        public ActionResult AutoFillDoc()
        {
            return View();
        }
        public ActionResult TestImage()
        {
            string path = Server.MapPath("~/DownloadMat/ProfilePhoto/61596038-a9d9-4b8d-a68e-9cce6122a88a.png");

            return Content(
                "Path = " + path +
                "<br/>Exists = " + System.IO.File.Exists(path)
            );
        }

        public ActionResult TestFolder()
        {
            string path = Server.MapPath("~/DownloadMat");
            return Content(path);
        }
        public ActionResult ShowImage()
        {
            string path = Server.MapPath("~/DownloadMat/ProfilePhoto/61596038-a9d9-4b8d-a68e-9cce6122a88a.png");

            return File(path, "image/png");
        }
        [HttpPost]
        public JsonResult SavePhoto(HttpPostedFileBase Photo)
        {
            RetialEmployeeManager obj = new RetialEmployeeManager();

            if (Photo != null && Photo.ContentLength > 0)
            {
                string fileName = Guid.NewGuid().ToString() + Path.GetExtension(Photo.FileName);
                string folder = Server.MapPath("~/Content/ProfilePhoto/");

                if (!Directory.Exists(folder))
                    Directory.CreateDirectory(folder);

                string filePath = Path.Combine(folder, fileName);
                Photo.SaveAs(filePath);

                obj.EmployeePhotos = "../Content/ProfilePhoto/" + fileName;
                obj.UserId = Convert.ToString(Session["LoginId"]);
                obj.ActionType = "51";
                string result = obj.SavePhoto(obj);

                return Json(new { Result = result, Message = "Upload successful" });
            }

            return Json(new
            {
                Status = false,
                Message = "Photo not found."
            });
        }
        private string GetAadhaar(string text)
        {
            Match m = Regex.Match(text, @"\b\d{4}\s\d{4}\s\d{4}\b");

            if (m.Success)
                return m.Value.Replace(" ", "");

            m = Regex.Match(text, @"\b\d{12}\b");

            return m.Success ? m.Value : "";
        }
        
        private string GetDOB(string text)
        {
            Match m = Regex.Match(text,
                @"\b\d{2}/\d{2}/\d{4}\b");

            return m.Success ? m.Value : "";
        }
        private string GetAddress(string text)
        {
            Match m = Regex.Match(text,
                @"Address[:\s]*(.*?)(?=\n\d{4}\s\d{4}\s\d{4}|VID|1947|help@)",
                RegexOptions.Singleline | RegexOptions.IgnoreCase);

            if (m.Success)
                return Regex.Replace(m.Groups[1].Value, @"\s+", " ").Trim();

            return "";
        }
        private string GetPAN(string text)
        {
            Match m = Regex.Match(text,
                @"\b[A-Z]{5}[0-9]{4}[A-Z]\b");

            return m.Success ? m.Value : "";
        }
        private string GetESICName(string text, string empName)
        {
            string[] lines = text
                .Split(new[] { '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries)
                .Select(x => x.Trim())
                .Where(x => !string.IsNullOrWhiteSpace(x))
                .ToArray();

            List<string> candidates = new List<string>();

            for (int i = 0; i < lines.Length; i++)
            {
                string line = lines[i];

                // DOB wali line mili
                if (Regex.IsMatch(line, @"DOB|Date of Birth", RegexOptions.IgnoreCase))
                {
                    // DOB se upar ki 5 lines check karo
                    for (int j = i - 1; j >= Math.Max(0, i - 5); j--)
                    {
                        string value = lines[j].Trim();

                        // Unwanted text skip
                        if (Regex.IsMatch(value,
                            @"ESIC|EMPLOYEES|INSURANCE|CORPORATION|GOVERNMENT|INDIA|CARD|IDENTITY|INSURED|MALE|FEMALE",
                            RegexOptions.IgnoreCase))
                            continue;

                        // Number wali line skip
                        if (Regex.IsMatch(value, @"\d"))
                            continue;

                        // Valid name
                        if (Regex.IsMatch(value, @"^[A-Za-z .&]+$"))
                            candidates.Add(value);
                    }

                    break;
                }
            }

            // Employee Name se best match
            if (!string.IsNullOrWhiteSpace(empName) && candidates.Count > 0)
            {
                string bestMatch = "";
                double bestScore = 0;

                foreach (var candidate in candidates)
                {
                    double score = CalculateSimilarity(empName, candidate);

                    if (score > bestScore)
                    {
                        bestScore = score;
                        bestMatch = candidate;
                    }
                }

                //if (bestScore >= 0.60)
                    return bestMatch;
            }

            // Fallback
            return candidates.FirstOrDefault() ?? "";
        }
        private string GetUANName(string text, string empName)
        {
            string[] lines = text
                .Split(new[] { '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries)
                .Select(x => x.Trim())
                .Where(x => !string.IsNullOrWhiteSpace(x))
                .ToArray();

            List<string> candidates = new List<string>();

            for (int i = 0; i < lines.Length; i++)
            {
                string line = lines[i];

                // DOB wali line mili
                if (Regex.IsMatch(line, @"DOB|Date of Birth", RegexOptions.IgnoreCase))
                {
                    // DOB se upar 5 lines check karo
                    for (int j = i - 1; j >= Math.Max(0, i - 5); j--)
                    {
                        string value = lines[j].Trim();

                        // Unwanted text skip
                        if (Regex.IsMatch(value,
                            @"UAN|UNIVERSAL|ACCOUNT|NUMBER|EPFO|EMPLOYEES|GOVERNMENT|INDIA|AUTHORITY|MALE|FEMALE",
                            RegexOptions.IgnoreCase))
                            continue;

                        // Numbers wali line skip
                        if (Regex.IsMatch(value, @"\d"))
                            continue;

                        // Valid name
                        if (Regex.IsMatch(value, @"^[A-Za-z .&]+$"))
                            candidates.Add(value);
                    }

                    break;
                }
            }

            // Agar Employee Name diya hai to best matching line return karo
            if (!string.IsNullOrWhiteSpace(empName) && candidates.Count > 0)
            {
                string bestMatch = "";
                double bestScore = 0;

                foreach (var candidate in candidates)
                {
                    double score = CalculateSimilarity(empName, candidate);

                    if (score > bestScore)
                    {
                        bestScore = score;
                        bestMatch = candidate;
                    }
                }

                //if (bestScore >= 0.60)
                    return bestMatch;
            }

            // Fallback
            return candidates.FirstOrDefault() ?? "";
        }
        private string GetUAN(string text)
        {
            Match m = Regex.Match(
                text,
                @"(?:UAN|Universal\s+Account\s+Number)[^\d]{0,30}(\d{12})",
                RegexOptions.IgnoreCase | RegexOptions.Singleline);

            if (m.Success)
                return m.Groups[1].Value;

            // Fallback
            m = Regex.Match(text, @"\b\d{12}\b");
            return m.Success ? m.Value : "";
        }
        private string GetESIC(string text)
        {
            Match m = Regex.Match(
                text,
                @"(?:Insurance\s*No|IP\s*Number|Insured\s*Person\s*No|ESIC)[^\d]{0,30}(\d{10,17})",
                RegexOptions.IgnoreCase | RegexOptions.Singleline);

            if (m.Success)
                return m.Groups[1].Value;

            // Fallback
            m = Regex.Match(text, @"\b\d{10,17}\b");

            return m.Success ? m.Value : "";
        }
        private async Task<string> Verification(string text, string docName)
        {
            string loginId = Convert.ToString(Session["LoginId"]);

            DataTable dtUser = await DLL.GetUserByMobile(loginId, "21");

            if (dtUser.Rows.Count == 0)
                return "User not found.";

            string userName = Convert.ToString(dtUser.Rows[0]["Name"]);
            string docNumber = "";
            string docDisplay = "";

            string ocrText = NormalizeName(text);

            switch ((docName ?? "").ToUpper())
            {
                case "AADHAR":
                case "AADHAAR":

                    if (!(ocrText.Contains("GOVERNMENT OF INDIA") ||
                          ocrText.Contains("UNIQUE IDENTIFICATION AUTHORITY OF INDIA") ||
                          ocrText.Contains("AADHAAR") ||
                          ocrText.Contains("MERI PEHCHAN") ||
                          ocrText.Contains("मेरी पहचान")))
                    {
                        return "Uploaded document is not a valid Aadhaar Card.";
                    }

                    docNumber = Convert.ToString(dtUser.Rows[0]["AdharCardNumber"]);
                    docDisplay = "Aadhaar";
                    break;

                case "PAN":

                    if (!(ocrText.Contains("INCOME TAX DEPARTMENT") ||
                          ocrText.Contains("PERMANENT ACCOUNT NUMBER")))
                    {
                        return "Uploaded document is not a valid PAN Card.";
                    }

                    docNumber = Convert.ToString(dtUser.Rows[0]["PANNumber"]);
                    docDisplay = "PAN";
                    break;

                case "UAN":

                    if (!(ocrText.Contains("UNIVERSAL ACCOUNT NUMBER") ||
                          ocrText.Contains("EMPLOYEES PROVIDENT FUND") ||
                          ocrText.Contains("EPFO")))
                    {
                        return "Uploaded document is not a valid UAN Document.";
                    }

                    docNumber = Convert.ToString(dtUser.Rows[0]["PreviousUAN"]);
                    docDisplay = "UAN";
                    break;

                case "ESIC":
                case "ESICNO":

                    if (!(ocrText.Contains("EMPLOYEES STATE INSURANCE") ||
                          ocrText.Contains("EMPLOYEES STATE INSURANCE CORPORATION") ||
                          ocrText.Contains("ESIC")))
                    {
                        return "Uploaded document is not a valid ESIC Card.";
                    }

                    docNumber = Convert.ToString(dtUser.Rows[0]["PreviousESI"]);
                    docDisplay = "ESIC";
                    break;

                default:
                    return "Invalid document type.";
            }

           
            string enteredName = NormalizeName(userName);
            string enteredDocNo = NormalizeName(docNumber);

            if (!string.IsNullOrWhiteSpace(userName) && !ocrText.Contains(enteredName))
                return $"Name not verified in {docDisplay} document.";

            if (!string.IsNullOrWhiteSpace(docNumber) && !ocrText.Contains(enteredDocNo))
                return $"{docDisplay} Number not verified.";

            return "SUCCESS";
        }
        private double CalculateSimilarity(string s1, string s2)
        {
            s1 = s1.ToLower().Trim();
            s2 = s2.ToLower().Trim();

            int distance = LevenshteinDistance(s1, s2);
            int maxLength = Math.Max(s1.Length, s2.Length);

            if (maxLength == 0)
                return 1.0;

            return 1.0 - (double)distance / maxLength;
        }
        private int LevenshteinDistance(string s, string t)
        {
            int[,] d = new int[s.Length + 1, t.Length + 1];

            for (int i = 0; i <= s.Length; i++)
                d[i, 0] = i;

            for (int j = 0; j <= t.Length; j++)
                d[0, j] = j;

            for (int i = 1; i <= s.Length; i++)
            {
                for (int j = 1; j <= t.Length; j++)
                {
                    int cost = s[i - 1] == t[j - 1] ? 0 : 1;

                    d[i, j] = Math.Min(
                        Math.Min(d[i - 1, j] + 1, d[i, j - 1] + 1),
                        d[i - 1, j - 1] + cost);
                }
            }

            return d[s.Length, t.Length];
        }
        private string GetPANName(string text, string empName)
        {
            string[] lines = text
                .Split(new[] { '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries)
                .Select(x => x.Trim())
                .Where(x => !string.IsNullOrWhiteSpace(x))
                .ToArray();

            List<string> candidates = new List<string>();

            foreach (string line in lines)
            {
                string value = line.Trim();

                // PAN Number skip
                if (Regex.IsMatch(value, @"^[A-Z]{5}[0-9]{4}[A-Z]$"))
                    continue;

                // Date skip
                if (Regex.IsMatch(value, @"\d{2}[/-]\d{2}[/-]\d{4}"))
                    continue;

                // Govt text skip
                if (Regex.IsMatch(value,
                    @"INCOME TAX|DEPARTMENT|GOVT|GOVERNMENT|INDIA|CARD|PERMANENT|ACCOUNT NUMBER|QR CODE",
                    RegexOptions.IgnoreCase))
                    continue;

                // Number wali line skip
                if (Regex.IsMatch(value, @"\d"))
                    continue;

                // Name candidate
                if (Regex.IsMatch(value, @"^[A-Za-z .&]+$"))
                    candidates.Add(value);
            }

            // Agar Employee Name diya hai to sabse similar line return karo
            if (!string.IsNullOrWhiteSpace(empName))
            {
                string bestMatch = "";
                double bestScore = 0;

                foreach (var candidate in candidates)
                {
                    double score = CalculateSimilarity(empName, candidate);

                    if (score > bestScore)
                    {
                        bestScore = score;
                        bestMatch = candidate;
                    }
                }

               // if (bestScore >= 0.60) // 60% match
                    return bestMatch;
            }

            // Company name preference
            var company = candidates.FirstOrDefault(x =>
                Regex.IsMatch(x,
                    @"PRIVATE|LIMITED|PVT|LTD|LLP|COMPANY",
                    RegexOptions.IgnoreCase));

            if (!string.IsNullOrEmpty(company))
                return company;

            // Fallback
            return candidates
                .OrderByDescending(x => x.Length)
                .FirstOrDefault() ?? "";
        }
        [HttpPost]
        public async Task<JsonResult> SaveDocument(HttpPostedFileBase Photo, string DocName, string FinalName, string EmpName)
        {
            try
            {
                RetialEmployeeManager obj = new RetialEmployeeManager();

                if (Photo == null || Photo.ContentLength <= 0)
                {
                    return Json(new
                    {
                        Status = false,
                        Message = "Photo not found."
                    });
                }

                string fileName = Guid.NewGuid().ToString() + Path.GetExtension(Photo.FileName);
                string folder = Server.MapPath("~/DownloadMat/DocumentOCR/");

                if (!Directory.Exists(folder))
                    Directory.CreateDirectory(folder);

                string filePath = Path.Combine(folder, fileName);
                Photo.SaveAs(filePath);

              

                // OCR Call
                string ocrResult = await DAL.OCRHelper.ExtractOCRFromFile(filePath);

                
                //dynamic ocr = JsonConvert.DeserializeObject(ocrResult);

                JObject ocr = JObject.Parse(ocrResult);
               

                string text = "";
                try
                { 
                      text = ocr["raw_text"]?.ToString();
                    
                }
                catch (Exception ex)
                {
                    await DLL.SaveWebhookLog(new RetailBAL
                    {
                        Action = "12",
                        Detail = "RAW_TEXT ERROR : " + ex.ToString()
                    });

                    throw;
                }

                 
                obj.UserId = Convert.ToString(Session["LoginId"]);
                





                obj.FilePath = "../DownloadMat/DocumentOCR/" + fileName;





                switch ((DocName ?? "").ToLower())
                {
                    case "aadhaar":
                    case "aadhar":
                        obj.Name = await Verification(text, "AADHAR");
                        obj.AadhaarNo = GetAadhaar(text);
                        obj.ActionType = "52";
                        break;

                    case "pan":
                        obj.Name = await Verification(text, "PAN");
                        obj.PANNumber = GetPAN(text);
                        obj.DOB = GetDOB(text);
                        obj.ActionType = "53";
                        break;

                    case "uan":
                        obj.Name = await Verification(text, "UAN");
                        obj.PreviousUAN = GetUAN(text);
                        obj.ActionType = "54";
                        break;

                    case "esic":
                        obj.Name = await Verification(text, "ESIC");
                        obj.PreviousESI = GetESIC(text);
                        obj.ActionType = "55";
                        break;
                }

                if (!string.Equals((FinalName ?? "").Trim(),
                                   (obj.Name ?? "").Trim(),
                                   StringComparison.OrdinalIgnoreCase))
                {
                    return Json(new
                    {
                        Status = false,
                        NameMismatch = true,
                        OCRName = obj.Name,
                        Message = "The name on the uploaded document does not match the entered name."
                    });
                }

                string result = obj.SavePhoto(obj);

                return Json(new
                {
                    Status = true,
                    Result = result,
                    OCR = ocr
                });
            }
            catch (Exception ex)
            {
                try
                {
                    await DLL.SaveWebhookLog(new RetailBAL
                    {
                        Action = "99",
                        Detail = "SaveDocument Error : " + ex.ToString()
                    });
                }
                catch
                {
                    // Logging fail ho jaye to original exception ko suppress mat karo
                }

                return Json(new
                {
                    Status = false,
                    Message = ex.Message
                });
            }
        }
        private string NormalizeName(string name)
        {
            if (string.IsNullOrWhiteSpace(name))
                return "";

            name = name.ToUpper().Trim();

            name = Regex.Replace(name, @"[.\-']", "");
            name = Regex.Replace(name, @"\s+", " ");

            return name;
        }
        [HttpPost]
        public async Task<JsonResult> AgainSaveDocument(HttpPostedFileBase Photo, string DocName, string EmpName)
        {
            RetialEmployeeManager obj = new RetialEmployeeManager();



            if (Photo != null && Photo.ContentLength > 0)
            {
                string fileName = Guid.NewGuid().ToString() + Path.GetExtension(Photo.FileName);
                string folder = Server.MapPath("~/DownloadMat/DocumentOCR/");

                if (!Directory.Exists(folder))
                    Directory.CreateDirectory(folder);

                string filePath = Path.Combine(folder, fileName);
                Photo.SaveAs(filePath);

                // OCR Call
                string ocrResult = await DAL.OCRHelper.ExtractOCRFromFile(filePath);

                //dynamic ocr = JsonConvert.DeserializeObject(ocrResult);
                JObject ocr = JObject.Parse(ocrResult);
                string text = ocr["raw_text"]?.ToString();
                obj.FilePath = "../DownloadMat/DocumentOCR/" + fileName;
                obj.UserId = Convert.ToString(Session["LoginId"]);

                switch ((DocName ?? "").ToLower())
                {
                    case "aadhaar":
                    case "aadhar":
                        obj.Name = await Verification(text, "AADHAR");
                        obj.AdharCardNumber = GetAadhaar(text);
                        obj.ActionType = "52";
                        break;

                    case "pan":
                        obj.Name = await Verification(text, "PAN");
                        obj.PANNumber = GetPAN(text);
                        obj.DOB = GetDOB(text);
                        obj.ActionType = "53";
                        break;

                    case "uan":
                        obj.Name = await Verification(text, "UAN");
                        obj.PreviousUAN = GetUAN(text);
                        obj.ActionType = "54";
                        break;

                    case "esic":
                        obj.Name = await Verification(text, "ESIC");
                        obj.PreviousESI = GetESIC(text);
                        obj.ActionType = "55";
                        break;
                }




                string result = obj.SavePhoto(obj);




                return Json(new
                {
                    Status = true,
                    Result = result,
                    OCR = ocr
                });
            }

            return Json(new
            {
                Status = false,
                Message = "Photo not found."
            });
        }
        [HttpPost]
        public async Task<string> getdetailocr(RetialEmployeeManager obj)
        {
            obj.Id = Convert.ToString(Session["LoginId"]);
            obj.ActionType = "56";
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.getdetailocr(obj)));
            return result;
        }
        [HttpPost]
        public JsonResult UploadName(string Name,string AdharCardNumber,string state,string PANNumber,string PreviousUAN,string PreviousESI)
        {
            RetialEmployeeManager obj = new RetialEmployeeManager();
            obj.UserId = Convert.ToString(Session["LoginId"]);
            obj.ActionType = "57";
            obj.Name = Name;
            obj.AdharCardNumber = AdharCardNumber;
            obj.state = state;
            obj.PANNumber = PANNumber;
            obj.PreviousUAN = PreviousUAN;
            obj.PreviousESI = PreviousESI;
            string result = obj.SavePhoto(obj);

            return Json(new { Result = result, Message = "Uploaded" });
        }
        

    }
    
  
}