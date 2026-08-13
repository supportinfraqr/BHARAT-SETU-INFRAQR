using BAL;
using DAL;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Net;
using System.Net.Mail;
using System.Threading.Tasks;
using System.Web.Http;

namespace EesassinErp.Controllers
{
    public class SendEmailApiController : ApiController
    {
        public class EmailRequest
        {
            public string Name { get; set; }
            public string Email { get; set; }
            public string Phone { get; set; }
            public string Message { get; set; }
        }
        //[HttpPost]
        //[Route("api/SendEmailApi/EmailApi")]
        //public async Task<IHttpActionResult> EmailApi([FromBody] EmailRequest request)
        //{
        //    var Name = request.Name;
        //    var Email = request.Email;
        //    var Phone = request.Phone;
        //    var Message = request.Message;

        //    // ✅ Basic server-side validation
        //    if (string.IsNullOrWhiteSpace(Name) ||
        //            string.IsNullOrWhiteSpace(Email) ||
        //            string.IsNullOrWhiteSpace(Phone) ||
        //            string.IsNullOrWhiteSpace(Message))
        //        {
        //            return Json(new { success = false, error = "All fields are required." });
        //        }

        //        try
        //        {
        //            // ✅ Create the email message
        //            var mail = new MailMessage
        //            {
        //                From = new MailAddress("contact@gpsupdatehub.com", "GPS Update Hub"),
        //                Subject = "GPS Update Hub Inquiry Form - " + Name,
        //                IsBodyHtml = true,
        //                    Body = $@"
        //                    <!DOCTYPE html>
        //                    <html>
        //                    <head>
        //                    <meta charset='UTF-8'>
        //                    <meta name='viewport' content='width=device-width, initial-scale=1'>
        //                    <title>Thank You for Your Query</title>
        //                    </head>
        //                    <body style='font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0;'>
        //                    <table width='100%' border='0' cellspacing='0' cellpadding='0'>
        //                    <tr>
        //                    <td align='center' style='padding: 20px 0;'>
        //                    <img src='https://www.gpsupdatehub.com/assets/images/logo/logo5.png' alt='Company Logo' style='max-width: 150px;'>
        //                    </td>
        //                    </tr>
        //                    <tr>
        //                    <td align='center'>
        //                    <table width='600px' bgcolor='#ffffff' border='0' cellspacing='0' cellpadding='20' style='border-radius: 8px; box-shadow: 0px 0px 10px #ddd;'>
        //                    <tr>
        //                    <td align='center'>
        //                    <h2 style='color: #333;'>Thank You for Your Query!</h2>
        //                    <p style='color: #555; font-size: 16px;'>
        //                    Our executive team will connect with you soon. Below are the details you provided:
        //                    </p>
        //                    </td>
        //                    </tr>
        //                    <tr>
        //                    <td>
        //                    <table width='100%' border='0' cellspacing='0' cellpadding='10'>
        //                    <tr><td><strong>Name:</strong></td><td>{Name}</td></tr>
        //                    <tr><td><strong>Email:</strong></td><td>{Email}</td></tr>
        //                    <tr><td><strong>Phone:</strong></td><td>{Phone}</td></tr>
        //                    <tr><td><strong>Message:</strong></td><td>{Message}</td></tr>
        //                    </table>
        //                    </td>
        //                    </tr>
        //                    <tr>
        //                    <td align='center' style='padding-top: 20px;'>
        //                    <p style='color: #777; font-size: 14px;'>If you need further assistance, feel free to contact us.</p>
        //                    <p style='font-size: 14px;'><strong>GPS Update Hub Team</strong></p>
        //                    </td>
        //                    </tr>
        //                    </table>
        //                    </td>
        //                    </tr>
        //                    </table>
        //                    </body>
        //                    </html>"
        //                    };

        //            // ✅ Recipient
        //            mail.To.Add("contact@gpsupdatehub.com");

        //            // ✅ SMTP Configuration
        //            using (var smtp = new SmtpClient("smtp.gmail.com", 587))
        //            {
        //                smtp.Credentials = new NetworkCredential("contact@gpsupdatehub.com", "hqdy lvul qkyg hixz"); // Ideally use from config
        //                smtp.EnableSsl = true;

        //                await smtp.SendMailAsync(mail);
        //            }

        //            return Json(new { success = true, message = "Email sent successfully." });
        //        }
        //        catch (Exception ex)
        //        {
        //            // Log error here if needed
        //            return Json(new { success = false, error = ex.Message });
        //        }
        //    } 
        [HttpPost]
        [Route("api/SendEmailApi/SendEmailBULK")]
        public async Task<string> SendEmailBULK()
        {

            DataTable dt = await Task.Factory.StartNew(() => DLL.dll.bulkemail()).ConfigureAwait(false);
            var result = JsonConvert.SerializeObject(dt);
            var emailDetailsList = JsonConvert.DeserializeObject<List<EmailDetails>>(result);
            {
                if (emailDetailsList == null || !emailDetailsList.Any())
                {
                    return "No email details provided.";
                }

                var successEmails = new List<string>();
                var failedEmails = new List<string>();

                foreach (var emailDetails in emailDetailsList)
                {
                    try
                    {
                        // Sending email for each emailDetails object
                        await SendEmailAsync(emailDetails);
                        successEmails.Add(emailDetails.ToEmail);
                        emailDetails.Status = "Success " + DateTime.Now.ToString("MM/dd/yyyy hh:mm tt");
                        UpdateReminderEmail(emailDetails);
                    }
                    catch (Exception ex)
                    {

                        failedEmails.Add($"{emailDetails.ToEmail} - Error: {ex.Message}");
                        emailDetails.Status = "Failed Error: " + ex.Message + DateTime.Now.ToString("MM/dd/yyyy hh:mm tt");
                        UpdateReminderEmail(emailDetails);
                    }
                }

                // Creating response summary
                var response = new
                {
                    SuccessEmails = successEmails,
                    FailedEmails = failedEmails
                };

                return JsonConvert.SerializeObject(response); // Return JSON result
            }
        }
        public void UpdateReminderEmail(EmailDetails EMA)
        {
            DocumentBAL obj = new DocumentBAL();
            {
                obj.LicenseRequestId = EMA.LicenseRequestId;
                obj.StoreCode = EMA.StoreCode;
                obj.LicenseNumber = EMA.LicenseNumber;
                obj.LicenseName = EMA.LicenseName;
                obj.StartDate = EMA.StartDate;
                obj.EndDate = EMA.EndDate;
                obj.ReminderDate = EMA.ReminderDate;
                obj.LED = EMA.LED;
                obj.DaysOfExpire = EMA.DaysOfExpire;
                obj.UserName = EMA.UserName;
                obj.ToEmail = EMA.ToEmail;
                obj.Status = EMA.Status;
                obj.Action = "1";
            }
            string result = DAL.DLL.UpdateReminderEmail(obj).ToString();
        }
        private async Task SendEmailAsync(EmailDetails emailDetails)
        {
            using (var smtpClient = new SmtpClient(emailDetails.SmtpServer, emailDetails.Port))
            {
                smtpClient.Credentials = new NetworkCredential(emailDetails.EmailId, emailDetails.Password);
                smtpClient.EnableSsl = true;
                System.Net.ServicePointManager.SecurityProtocol = System.Net.SecurityProtocolType.Tls12;
                var mailMessage = new MailMessage
                {
                    From = new MailAddress(emailDetails.EmailId, emailDetails.EmailName),
                    Subject = emailDetails.Subject,
                    Body = emailDetails.Msg,
                    IsBodyHtml = true
                };

                mailMessage.To.Add(emailDetails.ToEmail);

                if (!string.IsNullOrEmpty(emailDetails.ReplyToList) && emailDetails.ReplyToList != "-1")
                {
                    mailMessage.ReplyToList.Add(emailDetails.ReplyToList);
                }

                await smtpClient.SendMailAsync(mailMessage); // Asynchronous email sending
            }
        }

        [HttpPost]
        [Route("api/SendEmailApi/SendEmail")]
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
            public string LicenseRequestId { get; set; }
            public string StoreCode { get; set; }
            public string LicenseNumber { get; set; }
            public string LicenseName { get; set; }
            public string StartDate { get; set; }
            public string EndDate { get; set; }
            public string ReminderDate { get; set; }
            public string LED { get; set; }
            public string DaysOfExpire { get; set; }
            public string UserName { get; set; }
            public string Status { get; set; }


            public string Name { get; set; }
            public string Email { get; set; }
            public string Phone { get; set; }
            public string Message { get; set; }
            public string COMPANY { get; set; }
            public string LOGO { get; set; }
        }
    }

}