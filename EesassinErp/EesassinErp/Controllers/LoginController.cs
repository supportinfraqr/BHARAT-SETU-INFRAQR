using BAL;
using DAL;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Text;
using System.IO;
using System.Text;
using System.Threading.Tasks;
using System.Web;
using System.Web.Mvc;
using System.Web.Security;
using System.Net.Mail;
using System.Collections.Generic;
 
using System.Security.Cryptography;


namespace EesassinErp.Controllers
{

    public class LoginController : Controller
    {
        private const string V1SessionKey = "ApiV1Session";

        public class LoginV1Request
        {
            public string Username { get; set; }
            public string Password { get; set; }
            public string Method { get; set; }
        }
        //public string CaptchaImage()
        //{
        //    bool noisy = true;
        //    string base64;
        //    var rand = new Random((int)DateTime.Now.Ticks);
        //    //generate new question 
        //    int a = rand.Next(10, 99);
        //    int b = rand.Next(0, 9);
        //    var captcha = string.Format("{0} + {1} = ?", a, b);

        //    //store answer 
        //    var captcha = $"{a} + {b} = ?";
        //    Session["Captcha"] = a + b;

        //    //image stream 
        //    FileContentResult img = null;

        //    using (var mem = new MemoryStream())
        //    using (var bmp = new Bitmap(130, 30))
        //    using (var gfx = Graphics.FromImage((Image)bmp))
        //    {
        //        gfx.TextRenderingHint = TextRenderingHint.ClearTypeGridFit;
        //        gfx.SmoothingMode = SmoothingMode.AntiAlias;
        //        gfx.FillRectangle(Brushes.White, new Rectangle(0, 0, bmp.Width, bmp.Height));

        //        //add noise 
        //        if (noisy)
        //        {
        //            int i, r, x, y;
        //            var pen = new Pen(Color.Yellow);
        //            for (i = 1; i < 10; i++)
        //            {
        //                pen.Color = Color.FromArgb(
        //                (rand.Next(0, 255)),
        //                (rand.Next(0, 255)),
        //                (rand.Next(0, 255)));

        //                r = rand.Next(0, (130 / 3));
        //                x = rand.Next(0, 130);
        //                y = rand.Next(0, 30);

        //                gfx.DrawEllipse(pen, x - r, y - r, r, r);
        //            }
        //        }

        //        //add question 
        //        gfx.DrawString(captcha, new Font("Tahoma", 15), Brushes.Gray, 2, 3);

        //        //render as Jpeg 
        //        bmp.Save(mem, System.Drawing.Imaging.ImageFormat.Jpeg);
        //        img = this.File(mem.GetBuffer(), "image/Jpeg");
        //        base64 = Convert.ToBase64String(mem.ToArray());
        //    }
        //    return "data:image/jpeg;base64," + base64;
        //}
        //// GET: Login

        public string CaptchaImage()
        {
            bool noisy = true;
            string base64;
            var rand = new Random((int)DateTime.Now.Ticks);

            int a = rand.Next(10, 99);
            int b = rand.Next(0, 9);
            var captcha = $"{a} + {b} = ?";

            string key = Guid.NewGuid().ToString();
            HttpRuntime.Cache.Insert("CAPTCHA_" + key, (a + b).ToString(),
                null, DateTime.Now.AddMinutes(3), System.Web.Caching.Cache.NoSlidingExpiration);

            using (var mem = new MemoryStream())
            using (var bmp = new Bitmap(130, 30))
            using (var gfx = Graphics.FromImage((Image)bmp))
            {
                gfx.Clear(Color.White);
                gfx.DrawString(captcha, new Font("Tahoma", 15), Brushes.Gray, 2, 3);
                bmp.Save(mem, System.Drawing.Imaging.ImageFormat.Jpeg);
                base64 = Convert.ToBase64String(mem.ToArray());
            }

            return JsonConvert.SerializeObject(new
            {
                image = "data:image/jpeg;base64," + base64,
                token = key
            });
        }

        public ActionResult Login()
        {
            return View();
        }
        public ActionResult Login1()
        {
            return View();
        }

        public ActionResult forget()
        {
            return View();
        }
        public ActionResult Welcome()
        {
            return View();
        }
        public ActionResult ClearCookies()
        {
            if (Request.Cookies != null)
            {
                foreach (var cookieKey in Request.Cookies.AllKeys)
                {
                    HttpCookie cookie = new HttpCookie(cookieKey)
                    {
                        Expires = DateTime.Now.AddDays(-1), // Expire the cookie
                        Value = null
                    };
                    Response.Cookies.Add(cookie);
                }
            }

            return Json(new { success = true, message = "All cookies cleared!" });
        }

        public async Task<string> SendGeneralSMS(SMSBAL obj)
        {

            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DLL.dll.SendGeneralSMS(obj)));
            return result;
        }


        public async Task<string> VLoginVerify(LoginBAL obj)
        {

            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DLL.dll.LoginVerify(obj)));
            return result;
        }


        public string NGetUserId(LoginBAL obj)
{
    var dt = DLL.dll.LoginVerify(obj);

    if (dt == null || dt.Rows.Count == 0)
    {
        return JsonConvert.SerializeObject(new object[0]);
    }

            System.Data.DataRow row = dt.Rows[0];

    HttpContext.Session["LoginId"] = Convert.ToString(row["LoginId"]);
    HttpContext.Session["SessionId"] = Convert.ToString(row["SessionId"]);

    var user = new
    {
        LoginId = Convert.ToString(row["LoginId"]),
        LastLogin = Convert.ToString(row["LastLogin"]),
        CurrentLogin = Convert.ToString(row["CurrentLogin"]),
        LoginType = Convert.ToString(row["LoginType"]),
        BranchCode = Convert.ToString(row["BranchCode"]),
        Name = Convert.ToString(row["Name"]),
        BranchName = Convert.ToString(row["BranchName"]),
        ContactNo = Convert.ToString(row["ContactNo"]),
        Desig = Convert.ToString(row["Desig"]),
        CreatedOn = Convert.ToString(row["CreatedOn"]),
        BranchAddress = Convert.ToString(row["BranchAddress"]),
        MapId = Convert.ToString(row["MapId"]),
        MapUser = Convert.ToString(row["MapUser"]),
        Photo = Convert.ToString(row["Photo"]),
        UserName = Convert.ToString(row["UserName"]),
        SessionId = Convert.ToString(row["SessionId"]),
        EmailId = Convert.ToString(row["EmailId"]),
        PartyEMail = Convert.ToString(row["PartyEMail"]),
         RPath = Convert.ToString(row["RPath"])
    };

    return JsonConvert.SerializeObject(new[] { user });
}

        [HttpPost]
        public ActionResult LoginV1(LoginV1Request request)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Password))
            {
                return V1AuthError(400, "VALIDATION_ERROR", "Username and password are required.");
            }

            string action;
            switch ((request.Method ?? string.Empty).Trim().ToLowerInvariant())
            {
                case "otp":
                    action = "43";
                    break;
                case "mpin":
                    action = "44";
                    break;
                case "password":
                    action = "45";
                    break;
                default:
                    return V1AuthError(400, "UNSUPPORTED_LOGIN_METHOD", "Use password, MPIN, or OTP authentication.");
            }

            string legacyResponse = NGetUserId(new LoginBAL
            {
                UserName = request.Username,
                Password = request.Password,
                Action = action
            });

            JArray users;
            try
            {
                users = JArray.Parse(legacyResponse);
            }
            catch (JsonException)
            {
                if (legacyResponse == "-11")
                {
                    return V1AuthError(409, "SESSION_CONFLICT", "Another session is already active.");
                }
                return V1AuthError(401, "INVALID_CREDENTIALS", "The supplied credentials are not valid.");
            }

            if (users.Count == 0)
            {
                return V1AuthError(401, "INVALID_CREDENTIALS", "The supplied credentials are not valid.");
            }

            JToken legacyUser = users[0];
            string loginId = Convert.ToString(legacyUser["LoginId"]);
            if (loginId == "-11")
            {
                return V1AuthError(409, "SESSION_CONFLICT", "Another session is already active.");
            }
            if (string.IsNullOrWhiteSpace(loginId) || loginId == "-1")
            {
                return V1AuthError(401, "INVALID_CREDENTIALS", "The supplied credentials are not valid.");
            }

            var response = new
            {
                data = new
                {
                    user = new
                    {
                        id = loginId,
                        name = Convert.ToString(legacyUser["Name"]),
                        role = Convert.ToString(legacyUser["LoginType"]),
                        email = EmptyToNull(legacyUser["EmailId"]),
                        branchId = EmptyToNull(legacyUser["BranchCode"]),
                        branchName = EmptyToNull(legacyUser["BranchName"]),
                        designation = EmptyToNull(legacyUser["Desig"]),
                        contactNumber = EmptyToNull(legacyUser["ContactNo"]),
                        photo = EmptyToNull(legacyUser["Photo"]),
                        username = EmptyToNull(legacyUser["UserName"]),
                        mapId = EmptyToNull(legacyUser["MapId"]),
                        mapUser = EmptyToNull(legacyUser["MapUser"])
                    },
                    permissions = new string[0],
                    redirectPath = EmptyToNull(legacyUser["RPath"])
                }
            };

            Session[V1SessionKey] = JsonConvert.SerializeObject(response);
            return Json(response);
        }

        [HttpGet]
        public ActionResult SessionV1()
        {
            string sessionJson = Convert.ToString(Session[V1SessionKey]);
            if (string.IsNullOrWhiteSpace(sessionJson))
            {
                return V1AuthError(401, "AUTH_REQUIRED", "Authentication is missing or expired.");
            }

            return Content(sessionJson, "application/json");
        }

        [HttpPost]
        public ActionResult LogoutV1()
        {
            Session.Clear();
            Response.StatusCode = 204;
            return new EmptyResult();
        }

        private static string EmptyToNull(JToken value)
        {
            string text = Convert.ToString(value);
            return string.IsNullOrWhiteSpace(text) ? null : text;
        }

        private JsonResult V1AuthError(int statusCode, string code, string message)
        {
            Response.StatusCode = statusCode;
            Response.TrySkipIisCustomErrors = true;
            return Json(new
            {
                error = new
                {
                    code = code,
                    message = message,
                    fieldErrors = (object)null,
                    requestId = Response.Headers["X-Request-ID"]
                }
            }, JsonRequestBehavior.AllowGet);
        }
           
            

        public async Task<string> GetUserId(LoginBAL obj)
        {
            // Step 1: Captcha check
            //if (Session["Captcha"] == null)
            //    return "0";

            //if (obj.Captcha != Session["Captcha"].ToString())
            //    return "89";

            var expected = HttpRuntime.Cache["CAPTCHA_" + obj.CaptchaToken]?.ToString();
            if (expected == null) return "0";
            if (obj.Captcha != expected) return "89";

            HttpRuntime.Cache.Remove("CAPTCHA_" + obj.CaptchaToken);

            // Step 3: Fetch user by username
            var dt = DLL.dll.GetUserByUserName(obj.UserName);
            if (dt == null || dt.Rows.Count == 0)
                return JsonConvert.SerializeObject(new object[0]); // no user

            string storedHash = dt.Rows[0]["PasswordHash"]?.ToString() ?? "";

            bool isHashed = storedHash.StartsWith("$2a$") || storedHash.StartsWith("$2b$") || storedHash.StartsWith("$2y$");

            if (isHashed)
            {
                // Case 1: Hashed password in DB
                if (!PasswordHelper.VerifyPassword(obj.Password, storedHash))
                    return "-1";// JsonConvert.SerializeObject(new object[0]); // invalid password
            }
            else
            {
                // Case 2: Plain password in DB
                if (storedHash != obj.Password)
                    return "-1";//   return JsonConvert.SerializeObject(new object[0]); // invalid password

                // Update DB with hashed password
                string newHash = PasswordHelper.HashPassword(obj.Password);
                SqlDBHelper.SqlHelper.UpdateUserPasswordHash(Convert.ToInt32(dt.Rows[0]["LoginId"]), newHash);

                storedHash = newHash;
            }
            // Step 2: Call LoginVerify
            obj.Password = storedHash;
            var dt1 = DLL.dll.LoginVerify(obj);
            if (dt1 == null || dt1.Rows.Count == 0)
                return JsonConvert.SerializeObject(new object[0]); // no user

            string loginVerifyCode = dt1.Rows[0][0].ToString(); // Assuming first col has code
            if (loginVerifyCode == "-11" || loginVerifyCode == "-1")
                return loginVerifyCode; // directly return error code


            // Step 4: Prepare safe response
            var user = new
            {
                LoginId = dt.Rows[0]["LoginId"],
                LastLogin = dt.Rows[0]["LastLogin"],
                CurrentLogin = dt.Rows[0]["CurrentLogin"],
                LoginType = dt.Rows[0]["LoginType"],
                BranchCode = dt.Rows[0]["BranchCode"],
                Name = dt.Rows[0]["Name"],
                BranchName = dt.Rows[0]["BranchName"],
                ContactNo = dt.Rows[0]["ContactNo"],
                Desig = dt.Rows[0]["Desig"],
                CreatedOn = dt.Rows[0]["CreatedOn"],
                BranchAddress = dt.Rows[0]["BranchAddress"],
                MapId = dt.Rows[0]["MapId"],
                MapUser = dt.Rows[0]["MapUser"],
                Photo = dt.Rows[0]["Photo"],
                UserName = dt.Rows[0]["UserName"],
                SessionId = dt1.Rows[0]["SessionId"],
                EmailId = dt.Rows[0]["EmailId"],
                PartyEMail = dt.Rows[0]["PartyEMail"]
            };

            HttpContext.Session["LoginId"] = dt.Rows[0]["LoginId"].ToString();
            HttpContext.Session["SessionId"] = dt1.Rows[0]["SessionId"].ToString();
            return JsonConvert.SerializeObject(new[] { user });
        }



        public async Task<string> chkUserId(LoginBAL obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DLL.dll.LoginVerify(obj)));
            return result;

        }

        public class EmailDetails
        {
            public string ToEmail { get; set; }
            public string ReplyToList { get; set; }
            public string EmailName { get; set; }
            public string EmailId { get; set; }
            public string Password { get; set; }
            public int Port { get; set; }
            public string SmtpServer { get; set; }
            public string Subject { get; set; }
            public string Msg { get; set; }
        }
        [System.Web.Services.WebMethod]
        public async Task<string> SendEmail(DocumentBAL obj)
        {

            try
            {
                string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DLL.dll.FireEmail(obj)));

                //dynamic jsonDe = JsonConvert.DeserializeObject(result); 
                var jsonDe = JsonConvert.DeserializeObject<List<EmailDetails>>(result);
                string SMTPUser = jsonDe[0].EmailId;
                string SMTPPassword = jsonDe[0].Password;
                int SmtpPort = jsonDe[0].Port;
                string SmtpServer = jsonDe[0].SmtpServer;
                string EmailName = jsonDe[0].EmailName;
                string ToEmail = jsonDe[0].ToEmail;

                string Subject = jsonDe[0].Subject;
                string Msg = jsonDe[0].Msg;


                MailMessage EmailMsg = new MailMessage();
                EmailMsg.From = new MailAddress(SMTPUser, EmailName);
                EmailMsg.To.Add(new MailAddress(ToEmail));

                if (jsonDe[0].ReplyToList != "-1")
                {
                    string ReplyToList = jsonDe[0].ReplyToList;
                    EmailMsg.CC.Add(ReplyToList);
                }



                EmailMsg.Subject = Subject;

                EmailMsg.Body = Msg;

                EmailMsg.IsBodyHtml = true;
                EmailMsg.Priority = MailPriority.Normal;

                System.Net.Mail.SmtpClient SMTP = new System.Net.Mail.SmtpClient();
                SMTP.Host = SmtpServer;
                SMTP.Port = SmtpPort;
                SMTP.EnableSsl = true;
                System.Net.ServicePointManager.SecurityProtocol = System.Net.SecurityProtocolType.Tls12;

                SMTP.DeliveryMethod = System.Net.Mail.SmtpDeliveryMethod.Network;
                SMTP.UseDefaultCredentials = false;
                SMTP.Credentials = new System.Net.NetworkCredential(SMTPUser, SMTPPassword);

                SMTP.Send(EmailMsg);

                return result;

            }

            catch (Exception ex)
            {
                return ex.ToString();
            }

        }






        public async Task<string> UrlAccessPermission(BCommon obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DLL.dll.GetUrlAccessPermission(obj)));
            return result;
        }
        public async Task<string> GetModulePermission(BCommon obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DLL.dll.GetModulePermission(obj)));
            return result;
        }
        public ActionResult DigiLockerLogin(string LType)
        {
            LoginBAL obj = new LoginBAL();

            obj.Action = "62";
            obj.Password = LType;

            var dt = DLL.dll.LoginVerify(obj);

            

            System.Data.DataRow row = dt.Rows[0];

            string state = Convert.ToString(row["LoginId"]);



            string codeVerifier = GenerateCodeVerifier();
            string codeChallenge = GenerateCodeChallenge(codeVerifier);

            Session["CodeVerifier"] = codeVerifier;

            string url =
                "https://digilocker.meripehchaan.gov.in/public/oauth2/2/authorize" +
                "?response_type=code" +
                "&client_id=MS53AA158D" +
                "&state=" + HttpUtility.UrlEncode(state) +  
                "&redirect_uri=https://login.bharatshramsetu.com/Return/Digilocker" +
                "&code_challenge=" + codeChallenge +
                "&code_challenge_method=S256" +
                "&dl_flow=signin" +
                "&acr=pan+aadhaar+mobile+user_alias" +
                "&amr=aadhaar+pan" +
                "&scope=files.issueddocs+userdetails+address+picture+avs";

            return Redirect(url);
        }


public static string GenerateCodeVerifier()
    {
        byte[] bytes = new byte[32];

        using (var rng = RandomNumberGenerator.Create())
        {
            rng.GetBytes(bytes);
        }

        return Base64UrlEncode(bytes);
    }

    private static string Base64UrlEncode(byte[] input)
    {
        return Convert.ToBase64String(input)
            .Replace("+", "-")
            .Replace("/", "_")
            .Replace("=", "");
    }
        public static string GenerateCodeChallenge(string codeVerifier)
        {
            using (var sha256 = SHA256.Create())
            {
                var bytes = sha256.ComputeHash(
                    Encoding.ASCII.GetBytes(codeVerifier));

                return Convert.ToBase64String(bytes)
                    .Replace("+", "-")
                    .Replace("/", "_")
                    .Replace("=", "");
            }
        }

    }
}
