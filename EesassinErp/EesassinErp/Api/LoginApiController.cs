using Newtonsoft.Json.Linq;

using System.Net.Http;
using System.Web.Http;
using Newtonsoft.Json;
using System.IO;
using System.Threading.Tasks;
using System.Web.Hosting;
using System;
using System.Web;
using BAL;
using DAL;
using System.Collections.Generic;
using System.Net.Mail;

namespace EesassinErp.Controllers
{
    [RoutePrefix("Api/OCRAPI")]
    public class LoginApiController : ApiController
    {
         
        


       
        [Route("SendGeneralSMS")]
        public async Task<string> SendGeneralSMS(SMSBAL obj)
        {

            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DLL.dll.SendGeneralSMS(obj)));
            return result;
        }

        [Route("VLoginVerify")]
        public async Task<string> VLoginVerify(LoginBAL obj)
        {

            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DLL.dll.LoginVerify(obj)));
            return result;
        }

        [Route("NGetUserId")]
        public string NGetUserId(LoginBAL obj)
        {
            var dt = DLL.dll.LoginVerify(obj);

            if (dt == null || dt.Rows.Count == 0)
            {
                return JsonConvert.SerializeObject(new object[0]);
            }

            System.Data.DataRow row = dt.Rows[0];

            //HttpContext.Session["LoginId"] = Convert.ToString(row["LoginId"]);
            //HttpContext.Session["SessionId"] = Convert.ToString(row["SessionId"]);

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


        [Route("GetUserId")]
        public async Task<string> GetUserId(LoginBAL obj)
        {
            
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

          
            return JsonConvert.SerializeObject(new[] { user });
        }


        [Route("GetUserId")]
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
        [Route("SendEmail")]
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



 
    

    }
}