using BAL;
using DAL;
using MimeKit;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using System.Web.Mvc;

namespace EesassinErp.Controllers
{
    public class NotificationReminderController : Controller
    {
        [System.Web.Services.WebMethod]
        public async Task<string> SendRemainder(DocumentBAL obj)
        {
            try
            {
                // Step 1: Fetch email details (simulate DLL call)
                string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DLL.dll.FireEmail(obj)));
                var emailDetailsList = JsonConvert.DeserializeObject<List<EmailDetails>>(result);

                // Extract the SMTP and sender details from the first email configuration
                string smtpUser = emailDetailsList[0].EmailId;
                string smtpPassword = emailDetailsList[0].Password;
                int smtpPort = emailDetailsList[0].Port;
                string smtpServer = emailDetailsList[0].SmtpServer;
                string emailName = emailDetailsList[0].EmailName;

                // Step 2: Iterate through emails and send them
                foreach (var emailDetails in emailDetailsList)
                {
                    var message = new MimeMessage();
                    message.From.Add(new MailboxAddress(emailName, smtpUser)); // Sender
                    message.To.Add(new MailboxAddress("", emailDetails.ToEmail)); // Recipient

                    // Add CC if specified
                    if (emailDetails.ReplyToList != "-1")
                    {
                        message.Cc.Add(new MailboxAddress("", emailDetails.ReplyToList));
                    }

                    message.Subject = emailDetails.Subject; // Subject
                    message.Body = new TextPart("html") { Text = emailDetails.Msg }; // Email body

                    // Step 3: Send the email using MailKit
                    using (var client = new MailKit.Net.Smtp.SmtpClient())
                    {
                        try
                        {
                            await client.ConnectAsync(smtpServer, smtpPort, MailKit.Security.SecureSocketOptions.StartTls);
                            await client.AuthenticateAsync(smtpUser, smtpPassword);
                            await client.SendAsync(message);
                            await client.DisconnectAsync(true);
                        }
                        catch (Exception ex)
                        {
                            // Log/send the error for individual emails
                            System.Diagnostics.Debug.WriteLine($"Failed to send email to {emailDetails.ToEmail}: {ex.Message}");
                        }
                    }
                }

                return "Emails sent successfully!";
            }
            catch (Exception ex)
            {
                // Log/send the error for the entire process
                return $"Error occurred: {ex.Message}";
            }
        }
        public class EmailDetails
        {
            public string EmailId { get; set; } // SMTP User
            public string Password { get; set; } // SMTP Password
            public int Port { get; set; } // SMTP Port
            public string SmtpServer { get; set; } // SMTP Server
            public string EmailName { get; set; } // Sender's Name
            public string ToEmail { get; set; } // Recipient's Email
            public string Subject { get; set; } // Email Subject
            public string Msg { get; set; } // Email Body
            public string ReplyToList { get; set; } // CC List (if any)
        }
    }
}