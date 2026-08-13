using BAL;
using DAL;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Net.Mail;
using System.Threading.Tasks;
using System.Web.Mvc;



namespace EesassinErp.Controllers
{
    public class SendEmailController : Controller
    {
        // GET: SendEmail
        public ActionResult Index()
        {
            return View();
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
                return ex.Message;
            }

        }

        public async Task<string> SendEmailForNewsletter(EmailNewsLetter obj)
        {
            try
            {
                var emailDAL = new DocumentBAL
                {
                    Action = obj.Action,
                    ClientId = obj.ClientId
                };

                DataTable dt = await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteSelectCommand("[dbo].[USP_GetNewsletterForSearch]", CommandType.StoredProcedure));

                var results = (from myRow in dt.AsEnumerable()
                               where myRow.Field<int>("Id") == Convert.ToInt32(obj.Id)
                               select myRow).FirstOrDefault();

                if (results != null)
                {
                    // obj = new EmailNewsLetter();
                    obj.DepartmentName = results["DepartmentName"].ToString();
                    obj.PartyName = results["PartyName"].ToString();
                    obj.STATE_NM = results["STATE_NM"].ToString();
                    obj.UploadDocPath = results["UploadDocPath"].ToString();
                    // obj.Summary = results["Summary"].ToString();

                }
                //var baseUrl = Request.Url.Scheme + "://" + Request.Url.Authority;


                //obj.sum = new HtmlString(obj.Summary);
                var emailBody = new RazorViewToStringRenderer().RenderViewToString(ControllerContext, "EmailTemplate", obj);

                string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DLL.dll.FireEmail(emailDAL)));
                //dynamic jsonDe = JsonConvert.DeserializeObject(result);
                //string SMTPUser = jsonDe[0].EmailId;
                //string SMTPPassword = jsonDe[0].Password;
                //int SmtpPort = jsonDe[0].Port;
                //string SmtpServer = jsonDe[0].SmtpServer;
                //string EmailName = jsonDe[0].EmailName;
                var jsonDe = JsonConvert.DeserializeObject<List<EmailDetails>>(result);
                string SMTPUser = jsonDe[0].EmailId;
                string SMTPPassword = jsonDe[0].Password;
                int SmtpPort = jsonDe[0].Port;
                string SmtpServer = jsonDe[0].SmtpServer;
                string EmailName = jsonDe[0].EmailName;
                List<string> recipients = await DAL.DLL.GetClientEmails(Convert.ToInt32(obj.Id)); //jsonDe[0].ToEmail; //"pradeep78541236@gmail.com"; 
                //obj.PartyName = await DAL.DLL.GetClientNames(Convert.ToInt32(obj.Id));
                string Subject = "Notification, " + obj.SubjectLine.ToUpper();

                string Msg = emailBody;// jsonDe[0].Msg;


                MailMessage EmailMsg = new MailMessage();
                EmailMsg.From = new MailAddress(SMTPUser, EmailName);
                //  EmailMsg.To.Add(new MailAddress(ToEmail));

                // Add each recipient individually
                foreach (var recipient in recipients)
                {
                    EmailMsg.To.Add(recipient);
                    //message.To.Add(new MailAddress(recipient));
                }

                if (jsonDe[0].ReplyToList != "-1")
                {
                    string ReplyToList = jsonDe[0].ReplyToList;
                    EmailMsg.CC.Add(ReplyToList);
                }



                EmailMsg.Subject = Subject;

                EmailMsg.Body = Msg;

                EmailMsg.IsBodyHtml = true;
                EmailMsg.Priority = MailPriority.Normal;

                string filePath = System.Web.HttpContext.Current.Server.MapPath(obj.UploadDocPath);
                if (System.IO.File.Exists(filePath))
                {
                    Attachment attachment = new Attachment(filePath);
                    EmailMsg.Attachments.Add(attachment);
                }

                System.Net.Mail.SmtpClient SMTP = new System.Net.Mail.SmtpClient();
                SMTP.Host = SmtpServer;
                SMTP.Port = SmtpPort;
                SMTP.EnableSsl = true;
                System.Net.ServicePointManager.SecurityProtocol = System.Net.SecurityProtocolType.Tls12;

                SMTP.DeliveryMethod = System.Net.Mail.SmtpDeliveryMethod.Network;
                SMTP.UseDefaultCredentials = true;
                SMTP.Credentials = new System.Net.NetworkCredential(SMTPUser, SMTPPassword);

                SMTP.Send(EmailMsg);

                return result;

            }

            catch (Exception ex)
            {
                return ex.Message;
            }

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
    }

}