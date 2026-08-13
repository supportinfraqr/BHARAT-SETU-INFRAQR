using BAL;
using DAL;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using System.Web;
using System.Web.Http;
using System.Text;
using System.Data;
using Newtonsoft.Json.Linq;
using System.Collections.Concurrent;

namespace EesassinErp.Controllers
{
    public class RetailSectionApiController : ApiController
    {
        
        public class TemplateRequest
        {
            public string MobileNumber { get; set; }
            public string Name { get; set; }
            public string LicenseName { get; set; }
            public string LicenseDate { get; set; }
        }
        public class whatsdetail
        {
            public string one { get; set; }
            public string two { get; set; }
            public string three { get; set; }
            public string four { get; set; }
            public string five { get; set; }
            public string six { get; set; }
            public string seven { get; set; }
            public string templateId { get; set; }

            public string MobileNumber { get; set; }
        }

        [HttpPost]
        [Route("Api/RetailSectionApi/SendWhatsAppMessage")]
        public async Task<IHttpActionResult> SendWhatsAppMessage()
        {
            // TLS 1.2 सेट करें (Gupshup API के लिए जरूरी)
            System.Net.ServicePointManager.SecurityProtocol = SecurityProtocolType.Tls12;

            try
            {
                // 1️⃣ DB से WhatsApp details लाओ
                DataTable dt = await Task.Factory.StartNew(() => DLL.dll.bulkwhatsup()).ConfigureAwait(false);
                var result = JsonConvert.SerializeObject(dt);
                var whatsdetailList = JsonConvert.DeserializeObject<List<whatsdetail>>(result);

                if (whatsdetailList == null || whatsdetailList.Count == 0)
                    return BadRequest("No WhatsApp details found.");

                List<object> responses = new List<object>();

                using (var client = new HttpClient())
                {
                
                    if (client.DefaultRequestHeaders.Contains("apikey"))
                        client.DefaultRequestHeaders.Remove("apikey");

                    client.DefaultRequestHeaders.Add("apikey", "sk_358392a83353438f944d2a3a9c8d939b");  
                    client.Timeout = TimeSpan.FromSeconds(30);

               
                    foreach (var WhatsDetails in whatsdetailList)
                    {
                        var destination = WhatsDetails.MobileNumber.Replace(".0", "").Trim();

                    
                        if (destination.Length == 10)
                            destination = "91" + destination;

                        try
                        {
                            var values = new List<KeyValuePair<string, string>>
                    {
                        new KeyValuePair<string, string>("channel", "whatsapp"),
                        new KeyValuePair<string, string>("source", "919650887008"),
                        new KeyValuePair<string, string>("destination", destination),
                        new KeyValuePair<string, string>("src.name", "Bharat Shram Setu"),
                        new KeyValuePair<string, string>("template",
                            $"{{\"id\":\"{WhatsDetails.templateId}\",\"params\":[\"{WhatsDetails.one}\",\"{WhatsDetails.two}\"]}}")
                    };

                            var content = new FormUrlEncodedContent(values);
                            var response = await client.PostAsync("https://api.gupshup.io/wa/api/v1/template/msg", content);
                            var responseBody = await response.Content.ReadAsStringAsync();

                            responses.Add(new
                            {
                                MobileNumber = destination,
                                StatusCode = response.StatusCode,
                                ResponseBody = responseBody
                            });

                            await Task.Delay(3 * 60 * 1000);
                        }
                        catch (Exception ex)
                        {
                            responses.Add(new
                            {
                                MobileNumber = WhatsDetails.MobileNumber,
                                Error = ex.Message
                            });
                        }
                    }
                }

                return Ok(new
                {
                    Success = true,
                    Results = responses
                });
            }
            catch (Exception ex)
            {
                return InternalServerError(ex);
            }
        }


         
        public async Task<string> SendTextMessage(string mobile, string message)
        {
            try
            {
                System.Net.ServicePointManager.SecurityProtocol = SecurityProtocolType.Tls12;

                using (var client = new HttpClient())
                {
                    client.DefaultRequestHeaders.Clear();

                    client.DefaultRequestHeaders.Add(
                        "apikey",
                        "sk_358392a83353438f944d2a3a9c8d939b"
                    );

                    var values = new List<KeyValuePair<string, string>>
            {
                new KeyValuePair<string, string>("channel", "whatsapp"),
                new KeyValuePair<string, string>("source", "919650887008"),
                new KeyValuePair<string, string>("destination", mobile),
                new KeyValuePair<string, string>("src.name", "Bharat Shram Setu"),
                new KeyValuePair<string, string>("message", message.Replace("\"", "\\\""))
            };

                    var content = new FormUrlEncodedContent(values);

                    var response = await client.PostAsync(
                        "https://api.gupshup.io/wa/api/v1/msg",
                        content
                    );

                    return await response.Content.ReadAsStringAsync();
                }
            }
            catch (Exception ex)
            {
                return ex.Message;
            }
        }

        private bool IsValidType(string type)
        { 

            type = type.Trim();

            return type == "1" ||type == "2" || type == "3";
        }
        private bool IsValidName(string name)
        {
            return !string.IsNullOrWhiteSpace(name) &&
                   name.Trim().Length >= 3 &&
                   Regex.IsMatch(name.Trim(), @"^[A-Za-z .'-]+$");
        }

        private bool IsValidEmail(string email)
        {
            return Regex.IsMatch(email,
                @"^[^@\s]+@[^@\s]+\.[^@\s]+$");
        }

        private bool IsValidMPIN(string mpin)
        {
            return Regex.IsMatch(mpin, @"^\d{6}$");
        }

        private bool IsValidAadhaar(string aadhaar)
        {
            return Regex.IsMatch(aadhaar, @"^\d{12}$");
        }

        private bool IsValidPAN(string pan)
        {
            return Regex.IsMatch(pan.ToUpper(),
                @"^[A-Z]{5}[0-9]{4}[A-Z]{1}$");
        }

        private bool IsValidUAN(string uan)
        {
            return Regex.IsMatch(uan, @"^\d{12}$");
        }


        public async Task<string> ExtractAadhaarNumber(string filePath)
        {
            // OCR API call

            string text = "121211111111";

            Match m = Regex.Match(
                text.Replace(" ", ""),
                @"\d{12}"
            );

            return m.Success ? m.Value : "";
        }

        [AcceptVerbs("GET", "POST")]
        [Route("Api/Gupshup/oldWebhook")]
        public async Task<IHttpActionResult> oldWebhook()
        {
            try
            { 

                return Ok("Webhook Working");
            }
            catch (Exception ex)
            {
                await DLL.SaveWebhookLog(new RetailBAL
                {
                    Action = "12",
                    Detail = ex.ToString()
                });

                return Ok();
            }
        }

        //[AcceptVerbs("GET", "POST")]
        //[Route("Api/Gupshup/Webhook")]
        //public async Task<IHttpActionResult> Webhook()
        //{ 

        //    try
        //    { 

        //        var body = await Request.Content.ReadAsStringAsync();


        //        if (Request.Method == HttpMethod.Get)
        //        {
        //            return Ok();
        //        }
        //        if (string.IsNullOrWhiteSpace(body))
        //        {
        //            return Ok();
        //        }
        //        JObject json;
        //        try
        //        {
        //            json = JObject.Parse(body);
        //        }
        //        catch
        //        {
        //            return Ok();
        //        }


        //        string mobile = json["entry"][0]["changes"][0]["value"]["messages"][0]["from"].ToString();


        //        string messageType = json["entry"][0]["changes"][0]["value"]["messages"][0]["type"].ToString();

        //        string message = "";

        //        if (messageType == "text")
        //        {
        //            message = json["entry"][0]["changes"][0]["value"]["messages"][0]["text"]["body"] .ToString().Trim();
        //        }


        //        DataTable dt = await DLL.GetUserByMobile(mobile,"9");


        //        if (message.ToUpper() == "REGISTER" || dt.Rows.Count == 0)
        //        {


        //            RetailBAL obj = new RetailBAL();
        //            obj.Action = "1";
        //            obj.MobileNo = mobile;
        //            obj.CurrentStep = "NAME";

        //            await DLL.CreateUser(obj);

        //            await SendTextMessage(mobile, "Welcome to BHARAT SHRAM SETU\n\nPlease enter your Full Name.");

        //            return Ok();
        //        }

        //        if (dt.Rows.Count > 0)
        //        {
        //            string currentStep = dt.Rows[0]["CurrentStep"].ToString();

        //            if (currentStep == "NAME")
        //            {
        //                if (!IsValidName(message))
        //                {
        //                    await SendTextMessage(
        //                        mobile,
        //                        "Please enter a valid Full Name."
        //                    );
        //                    return Ok();
        //                }
        //                await DLL.updatedetail("10", mobile, message);

        //                await DLL.UpdateStep(mobile, "TYPE");

        //                await SendTextMessage(
        //                    mobile,
        //                     "👤 *Select Your Role*\n\n" +
        //                        "Reply with *1*, *2*, or *3*:\n\n" +
        //                        "1️⃣ Worker\n" +
        //                        "2️⃣ Contractor\n" +
        //                        "3️⃣ Principal Employer\n\n" +
        //                        "Example: *1*"
        //                );
        //            }
        //            if (currentStep == "TYPE")
        //            {
        //                if (!IsValidType(message))
        //                {
        //                    await SendTextMessage(
        //                        mobile,
        //                        "👤 *Select Your Role*\n\n" +
        //                        "Reply with *1*, *2*, or *3*:\n\n" +
        //                        "1️⃣ Worker\n" +
        //                        "2️⃣ Contractor\n" +
        //                        "3️⃣ Principal Employer\n\n" +
        //                        "Example: *1*"
        //                    );
        //                    return Ok();
        //                }

        //                await DLL.updatedetail("14", mobile, message);

        //                await DLL.UpdateStep(mobile, "MPIN");

        //                await SendTextMessage(
        //                    mobile,
        //                    "Please create your 6 digit MPIN."
        //                );
        //            }
        //            //else if (currentStep == "EMAIL")
        //            //{
        //            //    if (!IsValidEmail(message))
        //            //    {
        //            //        await SendTextMessage(
        //            //            mobile,
        //            //            "Invalid Email ID. Please enter a valid Email."
        //            //        );
        //            //        return Ok();
        //            //    }
        //            //    await DLL.updatedetail("2", mobile, message);

        //            //    await DLL.UpdateStep(mobile, "MPIN");

        //            //    await SendTextMessage(
        //            //        mobile,
        //            //        "Please create your 4 digit MPIN."
        //            //    );
        //            //}

        //            else if (currentStep == "MPIN")
        //            {
        //                if (!IsValidMPIN(message))
        //                {
        //                    await SendTextMessage(
        //                        mobile,
        //                        "MPIN must be exactly 6 digits."
        //                    );
        //                    return Ok();
        //                }
        //                await DLL.updatedetail("3", mobile, message);

        //                await DLL.UpdateStep(mobile, "AADHAR_NO");

        //                await SendTextMessage(
        //                    mobile,
        //                    "Please enter your Aadhaar Number."
        //                );
        //            }
        //            else if (currentStep == "AADHAR_NO")
        //            {
        //                if (!IsValidAadhaar(message))
        //                {
        //                    await SendTextMessage(
        //                        mobile,
        //                        "Invalid Aadhaar Number. Aadhaar must be 12 digits."
        //                    );
        //                    return Ok();
        //                }

        //                await DLL.updatedetail("4", mobile, message);

        //                await DLL.UpdateStep(mobile, "PAN_NO");

        //                await SendTextMessage(
        //                    mobile,
        //                    "Please enter your PAN Number."
        //                );
        //            }
        //            //else if (currentStep == "AADHAR_FILE")
        //            //{
        //            //    string mediaId = "";


        //            //    if (messageType == "document")
        //            //    {
        //            //        mediaId =
        //            //            json["entry"][0]["changes"][0]["value"]["messages"][0]["document"]["id"]
        //            //            .ToString();
        //            //    }
        //            //    else if (messageType == "image")
        //            //    {
        //            //        mediaId =
        //            //            json["entry"][0]["changes"][0]["value"]["messages"][0]["image"]["id"]
        //            //            .ToString();
        //            //    }

        //            //    byte[] fileBytes = await DownloadMedia(mediaId);

        //            //    string path = SaveWhatsAppFile(
        //            //        fileBytes,
        //            //        "aadhaar.pdf",
        //            //        "Aadhaar"
        //            //    );
        //            //    await DLL.updatedetail("7", mobile, path);
        //            //    await DLL.UpdateStep(
        //            //        mobile,
        //            //        "PAN_NO"
        //            //    );

        //            //    await SendTextMessage(
        //            //        mobile,
        //            //        "Please enter your PAN Number."
        //            //    );
        //            //}
        //            //else if (currentStep == "AADHAR_FILE")
        //            //{
        //            //    if (messageType != "document" && messageType != "image")
        //            //    {
        //            //        await SendTextMessage(mobile,
        //            //            "Please upload your Aadhaar card.");
        //            //        return Ok();
        //            //    }

        //            //    string mediaId = messageType == "document"
        //            //        ? json["entry"][0]["changes"][0]["value"]["messages"][0]["document"]["id"].ToString()
        //            //        : json["entry"][0]["changes"][0]["value"]["messages"][0]["image"]["id"].ToString();

        //            //    byte[] fileBytes = await DownloadMedia(mediaId);

        //            //    string path = SaveWhatsAppFile(fileBytes, "aadhaar.jpg", "Aadhaar");

        //            //    // OCR API
        //            //    string aadhaarNo = await ExtractAadhaarNumber(path);

        //            //    if (string.IsNullOrEmpty(aadhaarNo))
        //            //    {
        //            //        await SendTextMessage(mobile,
        //            //            "Unable to read Aadhaar Number. Please upload a clear image.");
        //            //        return Ok();
        //            //    }

        //            //    await DLL.updatedetail("7", mobile, path);       // File
        //            //    await DLL.updatedetail("4", mobile, aadhaarNo);  // Aadhaar No

        //            //    await DLL.UpdateStep(mobile, "PAN_NO");

        //            //    await SendTextMessage(mobile,
        //            //        "Please enter your PAN Number.");
        //            //}
        //            else if (currentStep == "PAN_NO")
        //            {
        //                if (!IsValidPAN(message))
        //                {
        //                    await SendTextMessage(
        //                        mobile,
        //                        "Invalid PAN Number. Example: ABCDE1234F"
        //                    );
        //                    return Ok();
        //                }

        //                await DLL.updatedetail("5", mobile, message);

        //                await DLL.UpdateStep(mobile, "UAN_NO");

        //                await SendTextMessage(
        //                    mobile,
        //                    "Please enter your UAN Number."
        //                );
        //            }
        //            //else if (currentStep == "PAN_FILE")
        //            //{
        //            //    string mediaId = "";

        //            //    if (messageType == "document")
        //            //    {
        //            //        mediaId =
        //            //            json["entry"][0]["changes"][0]["value"]["messages"][0]["document"]["id"]
        //            //            .ToString();
        //            //    }
        //            //    else if (messageType == "image")
        //            //    {
        //            //        mediaId =
        //            //            json["entry"][0]["changes"][0]["value"]["messages"][0]["image"]["id"]
        //            //            .ToString();
        //            //    }

        //            //    byte[] fileBytes = await DownloadMedia(mediaId);

        //            //    string path = SaveWhatsAppFile(
        //            //        fileBytes,
        //            //        "PAN_FILE.pdf",
        //            //        "PAN_FILE"
        //            //    );
        //            //    await DLL.updatedetail("8", mobile, path);
        //            //    await DLL.UpdateStep(
        //            //        mobile,
        //            //        "UAN_NO"
        //            //    );

        //            //    await SendTextMessage(
        //            //        mobile,
        //            //        "Please enter your PAN Number."
        //            //    );
        //            //}
        //            else if (currentStep == "UAN_NO")
        //            {
        //                if (!IsValidUAN(message))
        //                {
        //                    await SendTextMessage(
        //                        mobile,
        //                        "Invalid UAN Number. UAN must be 12 digits."
        //                    );
        //                    return Ok();
        //                }


        //                await DLL.updatedetail("6", mobile, message);

        //                await DLL.UpdateStep(mobile, "Completed");
        //                DataTable dt1 = await DLL.GetUserByMobile(mobile,"13");
        //                string Finalmsg = dt1.Rows[0]["Message"].ToString();
        //                await SendTextMessage(mobile, Finalmsg);

        //            }
        //            else if (currentStep == "Completed")
        //            { 
        //                DataTable dt1 = await DLL.GetUserByMobile(mobile, "13");
        //                string Finalmsg = dt1.Rows[0]["Message"].ToString();
        //                await SendTextMessage(mobile, Finalmsg);

        //            }



        //        }

        //        return Ok();
        //    }
        //    catch (Exception ex)
        //    {
        //        await DLL.SaveWebhookLog(new RetailBAL
        //        {
        //            Action = "12",
        //            Detail = ex.Message
        //        });
        //        return InternalServerError(ex);
        //    }
        //}
        private static readonly ConcurrentDictionary<string, bool> CompletedUsers = new ConcurrentDictionary<string, bool>();


        [AcceptVerbs("GET", "POST")]
        [Route("Api/Gupshup/Webhook11")]
        public async Task<IHttpActionResult> Webhook11()
        {
            try
            {

                var body = await Request.Content.ReadAsStringAsync();


                string path = HttpContext.Current.Server.MapPath("~/App_Data/WebhookLog.txt");
               
                if (Request.Method == HttpMethod.Get)
                    return Ok();

                if (string.IsNullOrWhiteSpace(body))
                    return Ok();

                JObject json;
                try
                {
                    json = JObject.Parse(body);
                }
                catch
                {
                    return Ok();
                }

                var msg = json["entry"]?[0]?["changes"]?[0]?["value"]?["messages"]?[0];

              

                if (msg == null)
                    return Ok();

                string mobile = msg["from"]?.ToString();
                string messageType = msg["type"]?.ToString();

                string message = "";

                if (messageType == "text")
                    message = msg["text"]?["body"]?.ToString().Trim();

                
                DataTable dt = await DLL.GetUserByMobile(mobile, "9");

                
                if (dt.Rows.Count == 0)
                {
                    RetailBAL obj = new RetailBAL();
                    obj.Action = "1";
                    obj.MobileNo = mobile;
                    obj.CurrentStep = "AADHAR";

                    await DLL.CreateUser(obj);

                    await SendTextMessage(
                        mobile,
                       "👋 Welcome to BHARAT SHRAM SETU \n\nPlease enter your 12-digit Aadhaar Number."
                    );


                    return Ok();
                }

                string currentStep = dt.Rows[0]["CurrentStep"].ToString();

               

                switch (currentStep)
                {
                    case "NAME":
                        await ProcessName(mobile, message);
                        break;

                    case "TYPE":
                        await ProcessType(mobile, message);
                        break;

                    case "MPIN":
                        await ProcessMPIN(mobile, message);
                        break;

                    case "AADHAR":
                        await ProcessAadhaarNumber(mobile, message);
                        break;
                    case "AADHAAR_OTP":
                        await ProcessAadhaarOtp(mobile, message);
                        break;
                        

                    case "STATE":
                        await ProcessState(mobile, message);
                        break;

                    case "UAN_CONFIRM":
                        await ProcessUANConfirm(mobile, message);
                        break;

                    case "UAN_NUMBER":
                        await ProcessUANNumber(mobile, message);
                        break;

                    case "ESIC_CONFIRM":
                        await ProcessESICConfirm(mobile, message);
                        break;

                    case "ESIC_NUMBER":
                        await ProcessESICNumber(mobile, message);
                        break;

                    case "PAN_CONFIRM":
                        await ProcessPANConfirm(mobile, message);
                        break;

                    case "PAN_NUMBER":
                        await ProcessPANNumber(mobile, message);
                        break;

                        
                    case "EST_MPIN":
                        await EST_ProcessMPIN(mobile, message);
                        break;

                    case "ESTABLISHMENT":
                        await ProcessEstablishment(mobile, message);
                        break;

                    case "EST_STATE":
                        await ProcessEstablishmentState(mobile, message);
                        break;


                    case "COMPLETED":
                        await SendCompletedMessage(mobile);
                        break;
                }
                return Ok();
            }
            catch (Exception ex)
            {
                await DLL.SaveWebhookLog(new RetailBAL
                {
                    Action = "12",
                    Detail = ex.ToString()
                });

                return InternalServerError(ex);
            }
        }


        [AcceptVerbs("GET", "POST")]
        [Route("Api/Gupshup/Webhook")]
        public async Task<IHttpActionResult> Webhook()
        {
            try
            {
                // WhatsApp Verification Request
                if (Request.Method == HttpMethod.Get)
                    return Ok();

                string body = await Request.Content.ReadAsStringAsync();

                if (string.IsNullOrWhiteSpace(body))
                    return Ok();

                JObject json;
                try
                {
                    json = JObject.Parse(body);
                }
                catch
                {
                    return Ok();
                }

                JToken msg = json["entry"]?[0]?["changes"]?[0]?["value"]?["messages"]?[0];

                if (msg == null)
                    return Ok();

                string mobile = msg["from"]?.ToString();
                string messageType = msg["type"]?.ToString();

                if (string.IsNullOrWhiteSpace(mobile))
                    return Ok();

                string message = "";

                if (messageType == "text")
                    message = msg["text"]?["body"]?.ToString()?.Trim();

                DataTable dt = await DLL.GetUserByMobile(mobile, "9");

                // New User
                if (dt.Rows.Count == 0)
                {
                    await DLL.CreateUser(new RetailBAL
                    {
                        Action = "1",
                        MobileNo = mobile,
                        CurrentStep = "AADHAR"
                    });

                    await SendTextMessage(
                        mobile,
                        "👋 Welcome to BHARAT SHRAM SETU.\n\nPlease enter your 12-digit Aadhaar Number."
                    );

                    return Ok();
                }

                string currentStep = dt.Rows[0]["CurrentStep"]?.ToString() ?? "AADHAR";

                switch (currentStep.ToUpper())
                {
                    case "AADHAR":
                        await ProcessAadhaarNumber(mobile, message);
                        break;

                    case "AADHAAR_OTP":
                        await ProcessAadhaarOtp(mobile, message);
                        break;

                    case "COMPLETED":
                        await SendCompletedMessage(mobile);
                        break;

                    default:
                        // Reset conversation
                        await DLL.UpdateStep(mobile, "AADHAR");

                        await SendTextMessage(
                            mobile,
                            "👋 Welcome to BHARAT SHRAM SETU.\n\nPlease enter your 12-digit Aadhaar Number."
                        );

                        await DLL.SaveWebhookLog(new RetailBAL
                        {
                            Action = "12",
                            Detail = "Unknown Step : " + currentStep
                        });

                        break;
                }

                return Ok();
            }
            catch (Exception ex)
            {
                await DLL.SaveWebhookLog(new RetailBAL
                {
                    Action = "12",
                    Detail = ex.ToString()
                });

                // WhatsApp ko hamesha 200 return karo
                return Ok();
            }
        }
        private async Task EST_ProcessMPIN(string mobile, string message)
        {
            if (string.IsNullOrWhiteSpace(message))
            {
                await SendTextMessage(
                    mobile,
                    "Please create your 6-digit MPIN."
                );
                return;
            }

            message = message.Trim();

            if (!IsValidMPIN(message))
            {
                await SendTextMessage(
                    mobile,
                    "❌ MPIN must be exactly 6 digits.\n\nPlease enter a valid 6-digit MPIN."
                );
                return;
            }
             
            await DLL.updatedetail(
                "3",
                mobile,
                message,
                "",
                "",
                "",
                "",
                "",
                "",
                "",
                ""
            );
             
            await DLL.UpdateStep(mobile, "ESTABLISHMENT");

            
            await SendTextMessage(
                    mobile,
                    "Please enter your Establishment Name."
                );
        }
        private async Task ProcessEstablishmentState(string mobile, string message)
        {
            List<string> states = new List<string>
    {
        "ANDHRA PRADESH","ARUNACHAL PRADESH","ASSAM","BIHAR","CHHATTISGARH",
        "GOA","GUJARAT","HARYANA","HIMACHAL PRADESH","JHARKHAND",
        "KARNATAKA","KERALA","MADHYA PRADESH","MAHARASHTRA","MANIPUR",
        "MEGHALAYA","MIZORAM","NAGALAND","ODISHA","PUNJAB",
        "RAJASTHAN","SIKKIM","TAMIL NADU","TELANGANA","TRIPURA",
        "UTTAR PRADESH","UTTARAKHAND","WEST BENGAL",
        "ANDAMAN AND NICOBAR ISLANDS","CHANDIGARH",
        "DADRA AND NAGAR HAVELI AND DAMAN AND DIU",
        "DELHI","JAMMU AND KASHMIR","LADAKH",
        "LAKSHADWEEP","PUDUCHERRY"
    };


            if (string.IsNullOrWhiteSpace(message))
            {
                await SendTextMessage(
                    mobile,
                    "❌ State is required.\n\nPlease enter your State name."
                );
                return;
            }


            string state = message.Trim().ToUpper();


            if (!Regex.IsMatch(state, @"^[A-Z\s]+$") ||
                !states.Contains(state))
            {
                await SendTextMessage(
                    mobile,
                    "❌ Invalid State.\n\nPlease enter a valid Indian State or Union Territory."
                );
                return;
            }


            // Save State
            await DLL.updatedetail(
                "24",
                mobile,
                state,
                "",
                "",
                "",
                "",
                "",
                "",
                "",
                ""
            );


            // Complete Registration
            await DLL.UpdateStep(mobile, "COMPLETED");


            await SendTextMessage(
                mobile,
                "✅ Registration completed successfully."
            );
            await SendCompletedMessage(mobile);
        }
        private async Task ProcessEstablishment(string mobile, string message)
        {
            if (string.IsNullOrWhiteSpace(message))
            {
                await SendTextMessage(
                    mobile,
                    "Please enter Establishment Name."
                );
                return;
            }

            await DLL.updatedetail(
                "23",
                mobile,
                message.Trim(),
                "",
                "",
                "",
                "",
                "",
                "",
                "",
                ""
            );

            await DLL.UpdateStep(mobile, "EST_STATE");

            await SendTextMessage(
                mobile,
                "Please enter your State name."
            );
        }
        private async Task ProcessPANNumber(string mobile, string message)
        {
            message = (message ?? "").Trim().ToUpper();

            // Remove spaces
            message = message.Replace(" ", "");

            
            if (!Regex.IsMatch(message, @"^[A-Z]{5}[0-9]{4}[A-Z]{1}$"))
            {
                await SendTextMessage(
                    mobile,
                    "❌ Invalid PAN Number.\n\nPlease enter a valid PAN Number (Example: ABCDE1234F)."
                );
                return;
            }
             
            await DLL.updatedetail(
                "5",
                mobile,
                  message,  
                "",
                "",
                "",
              
                "",
                "",
                "",
                "",
                ""
            );

            
            await DLL.UpdateStep(mobile, "COMPLETED");

            await SendCompletedMessage(mobile);
        }
        //        private async Task ProcessAadhaarNumber(string mobile, string message)
        //{
        //    message = (message ?? "").Trim().Replace(" ", "");


        //    if (!Regex.IsMatch(message, @"^\d{12}$"))
        //    {
        //        await SendTextMessage(
        //            mobile,
        //            "❌ Invalid Aadhaar Number.\n\nPlease enter a valid 12-digit Aadhaar Number."
        //        );
        //        return;
        //    }


        //            await DLL.updatedetail(
        //                "4",
        //                mobile,
        //                "",
        //                  "",
        //                message,
        //                "",
        //                "",
        //                  "", "", "", ""
        //            );

        //            await DLL.UpdateStep(mobile, "STATE");


        //    await SendTextMessage(
        //        mobile,
        //        "✅ Aadhaar Number saved.\n\nPlease enter your State."
        //    );
        //}
        private async Task ProcessAadhaarNumber(string mobile, string message)
        {
            message = (message ?? "").Trim().Replace(" ", "");

            if (!Regex.IsMatch(message, @"^\d{12}$"))
            {
                await SendTextMessage(
                    mobile,
                    "❌ Invalid Aadhaar Number.\n\nPlease enter a valid 12-digit Aadhaar Number."
                );
                return;
            }

            try
            {
                string otpResponse = await DLL.GenerateOtp(message);

                JObject result = JObject.Parse(otpResponse);

                await DLL.SaveWebhookLog(new RetailBAL
                {
                    Action = "12",
                    Detail = otpResponse
                });

                int code = result["code"] != null ? (int)result["code"] : 0;

                if (code == 200)
                {
                    string referenceId = result["data"]?["reference_id"]?.ToString();

                    await DLL.updatedetail(
                        "25",
                        mobile,
                        referenceId,
                        "",
                        message,
                        "",
                        "",
                        "",
                        "", "", ""
                    );

                    await DLL.UpdateStep(mobile, "AADHAAR_OTP");

                    await SendTextMessage(
                        mobile,
                     "📱 OTP has been sent to your Aadhaar-linked mobile number.\n\n" +
"Please enter the OTP to continue.\n\n" +
"Didn't receive the OTP? Type *RESEND*."
                    );
                }
                else
                {
                    await SendTextMessage(
                        mobile,
                     "⚠️ Aadhaar verification service is currently experiencing delays.\n\nPlease try again after some time or type *RESEND* to request a new OTP."
                    );
                }
            }
            catch (Exception ex)
            {
                await DLL.SaveWebhookLog(new RetailBAL
                {
                    Action = "12",
                    Detail = ex.Message
                });
                await SendTextMessage(
                    mobile,
                    "❌ Aadhaar verification service is currently unavailable."
                );
            }
        }

        private async Task ProcessAadhaarOtp(string mobile, string otp)
        {
            // User typed RESEND
            if (otp.Trim().ToUpper() == "RESEND")
            {
                DataTable dt = await DLL.GetUserByMobile(mobile, "26");

                if (dt.Rows.Count > 0)
                {
                    string aadhaarNo = dt.Rows[0]["AdharCardNumber"].ToString();

                    string otpResponse = await DLL.GenerateOtp(aadhaarNo);

                  
                    JObject result = JObject.Parse(otpResponse);

                    if ((int)result["code"] == 200)
                    {
                        string referenceId =
                            result["data"]?["reference_id"]?.ToString();

                        await DLL.updatedetail(
                            "25",
                            mobile,
                            referenceId,
                            "",
                            aadhaarNo,
                            "",
                            "",
                            "",
                            "", "", ""
                        );

                        await SendTextMessage(
                            mobile,
                            "🔄 A new OTP has been sent to your Aadhaar-linked mobile number.\n\n" +
                            "⏱️ OTP is valid for 10 minutes.\n\n" +
                            "Please enter the OTP."
                        );
                    }
                }

                return;
            }

            // Existing Verify Logic
            DataTable dtUser1 = await DLL.GetUserByMobile(mobile, "26");

            if (dtUser1.Rows.Count > 0)
            {
                string referenceId = dtUser1.Rows[0]["referenceid"].ToString();
                string aadhaarNo = dtUser1.Rows[0]["AdharCardNumber"].ToString();
                string loginId = dtUser1.Rows[0]["UserId"].ToString();

                string verifyResponse =
                    await DAL.DLL.VerifyOtp(referenceId, otp, aadhaarNo, loginId);

                

                if (verifyResponse == "1")
                {

                    await DLL.UpdateStep(mobile, "COMPLETED");
                    await SendTextMessage(
                        mobile,
                        "✅ Aadhaar verified successfully."
                    );
                  

                    await SendCompletedMessage(mobile);
                    
                }
                else
                {
                    await SendTextMessage(
                        mobile, verifyResponse );
                    await DLL.SaveWebhookLog(new RetailBAL
                    {
                        Action = "12",
                        Detail = verifyResponse
                    });
                }
            }
        }
        private async Task ProcessState(string mobile, string message)
        {
            message = (message ?? "").Trim();

            List<string> states = new List<string>
    {
        "ANDHRA PRADESH","ARUNACHAL PRADESH","ASSAM","BIHAR","CHHATTISGARH",
        "GOA","GUJARAT","HARYANA","HIMACHAL PRADESH","JHARKHAND",
        "KARNATAKA","KERALA","MADHYA PRADESH","MAHARASHTRA","MANIPUR",
        "MEGHALAYA","MIZORAM","NAGALAND","ODISHA","PUNJAB",
        "RAJASTHAN","SIKKIM","TAMIL NADU","TELANGANA","TRIPURA",
        "UTTAR PRADESH","UTTARAKHAND","WEST BENGAL",
        "ANDAMAN AND NICOBAR ISLANDS","CHANDIGARH",
        "DADRA AND NAGAR HAVELI AND DAMAN AND DIU",
        "DELHI","JAMMU AND KASHMIR","LADAKH",
        "LAKSHADWEEP","PUDUCHERRY"
    };

            if (string.IsNullOrWhiteSpace(message) ||
                !Regex.IsMatch(message, @"^[A-Za-z\s]+$") ||
                !states.Contains(message.ToUpper()))
            {
                await SendTextMessage(
                    mobile,
                    "❌ Invalid State.\n\nPlease enter a valid Indian State or Union Territory."
                );
                return;
            }

            await DLL.updatedetail(
                "18",
                mobile,
                "",
                "",
                "",
                "",
                "",
                "",
                "",
                message,
                ""
            );

            await DLL.UpdateStep(mobile, "UAN_CONFIRM");

            await SendTextMessage(
                mobile,
                "Do you have a UAN Number?\n\nReply with *YES* or *NO*."
            );
        }
        private async Task ProcessESICNumber(string mobile, string message)
        {
            message = (message ?? "").Trim().Replace(" ", "");

            // ESIC Validation (10-17 digits)
            if (!Regex.IsMatch(message, @"^\d{10,17}$"))
            {
                await SendTextMessage(
                    mobile,
                    "❌ Invalid ESIC Number.\n\nPlease enter a valid ESIC Number."
                );
                return;
            }

            // Save ESIC Number
            await DLL.updatedetail(
                "16",
                mobile,
                 message,
                "",
                "",
                "",
                "", 
                "",
                "",
                "",
                ""
            );

            // Move to PAN confirmation
            await DLL.UpdateStep(mobile, "PAN_CONFIRM");

            await SendTextMessage(
                mobile,
                "Do you have a PAN Number?\n\nReply with *YES* or *NO*."
            );
        }

        private async Task ProcessUANConfirm(string mobile, string message)
        {
            message = (message ?? "").Trim().ToUpper();

            if (message == "YES")
            {
                await DLL.UpdateStep(mobile, "UAN_NUMBER");

                await SendTextMessage(
                    mobile,
                    "Please enter your UAN Number."
                );
            }
            else if (message == "NO")
            {
                

                await DLL.UpdateStep(mobile, "ESIC_CONFIRM");

                await SendTextMessage(
                    mobile,
                    "Do you have an ESIC Number?\n\nReply with *YES* or *NO*."
                );
            }
            else
            {
                await SendTextMessage(
                    mobile,
                    "Invalid response.\n\nPlease reply with *YES* or *NO*."
                );
            }
        }

        private async Task ProcessUANNumber(string mobile, string message)
        {
            message = (message ?? "").Trim().Replace(" ", "");

            // UAN Validation
            if (!Regex.IsMatch(message, @"^\d{12}$"))
            {
                await SendTextMessage(
                    mobile,
                    "❌ Invalid UAN Number.\n\nPlease enter a valid 12-digit UAN Number."
                );
                return;
            }

            // Save UAN
            await DLL.updatedetail(
                "6",
                mobile,
                 message,   
                "",
                "",
                "",
                "",
                "",
               
                "",
                "",
                ""
            );

            // Move to next step
            await DLL.UpdateStep(mobile, "ESIC_CONFIRM");

            await SendTextMessage(
                mobile,
                "Do you have an ESIC Number?\n\nReply with *YES* or *NO*."
            );
        }

        private async Task ProcessESICConfirm(string mobile, string message)
        {
            message = (message ?? "").Trim().ToUpper();

            if (message == "YES")
            {
                await DLL.UpdateStep(mobile, "ESIC_NUMBER");

                await SendTextMessage(
                    mobile,
                    "Please enter your ESIC Number."
                );
            }
            else if (message == "NO")
            {
               

                await DLL.UpdateStep(mobile, "PAN_CONFIRM");

                await SendTextMessage(
                    mobile,
                    "Do you have a PAN Number?\n\nReply with *YES* or *NO*."
                );
            }
            else
            {
                await SendTextMessage(
                    mobile,
                    "❌ Invalid response.\n\nPlease reply with *YES* or *NO*."
                );
            }
        }
        private async Task ProcessPANConfirm(string mobile, string message)
        {
            message = (message ?? "").Trim().ToUpper();

            if (message == "YES")
            {
                await DLL.UpdateStep(mobile, "PAN_NUMBER");

                await SendTextMessage(
                    mobile,
                    "Please enter your PAN Number."
                );
            }
            else if (message == "NO")
            {
                 
                await DLL.UpdateStep(mobile, "COMPLETED");

                await SendCompletedMessage(mobile);
            }
            else
            {
                await SendTextMessage(
                    mobile,
                    "❌ Invalid response.\n\nPlease reply with *YES* or *NO*."
                );
            }
        }
        private async Task ProcessCity(string mobile, string message)
        {
            if (string.IsNullOrWhiteSpace(message))
            {
                await SendTextMessage(
                    mobile,
                    "Please enter your City."
                );
                return;
            }

            await DLL.updatedetail(
                "19",
                mobile,
                "",
                "",
                "",
                "",
                "",
                "",
                "",
                "",
                message
            );

            await DLL.UpdateStep(mobile, "PAN_FILE");

            await SendTextMessage(
                mobile,
                "🪪 Please upload your PAN Card."
            );
        }
        private async Task ProcessName(string mobile, string message)
        {
            if (!IsValidName(message))
            {
                await SendTextMessage(
                    mobile,
                    "Please enter a valid Full Name."
                );
                return;
            }

            // Save Name
            await DLL.updatedetail("10", mobile, message,"", "", "", "","", "", "", "");

            // Next Step
            await DLL.UpdateStep(mobile, "TYPE");

            // Send Next Message
            await SendTextMessage(
                mobile,
                "👤 *Select Your Role*\n\n" +
                "Reply with *1*, *2*, or *3*:\n\n" +
                "1️⃣ Worker\n" +
                "2️⃣ Contractor\n" +
                "3️⃣ Principal Employer\n\n" +
                "Example: *1*"
            );
        }
        private async Task ProcessType(string mobile, string message)
        {
            if (string.IsNullOrWhiteSpace(message))
            {
                await SendTextMessage(
                    mobile,
                    "👤 *Select Your Role*\n\n" +
                    "Reply with *1*, *2*, or *3*:\n\n" +
                    "1️⃣ Worker\n" +
                    "2️⃣ Contractor\n" +
                    "3️⃣ Principal Employer\n\n" +
                    "Example: *1*"
                );
                return;
            }

            message = message.Trim();

            if (!IsValidType(message))
            {
                await SendTextMessage(
                    mobile,
                    "❌ Invalid selection.\n\n" +
                    "Please reply with:\n\n" +
                    "1️⃣ Worker\n" +
                    "2️⃣ Contractor\n" +
                    "3️⃣ Principal Employer"
                );
                return;
            }

            if (message == "1")
            {
                // Type 7 => Normal registration flow
                await DLL.updatedetail("14", mobile, message, "", "", "", "", "", "", "", "");

                // Move to MPIN Step
                await DLL.UpdateStep(mobile, "MPIN");

                await SendTextMessage(
                mobile,
                "🔒 Please create your *6 digit MPIN*.\n\nExample: 123456"
            );
            }
            else 
            {
                await DLL.updatedetail("14", mobile, message, "", "", "", "", "", "", "", "");

                await DLL.UpdateStep(mobile, "EST_MPIN");
                await SendTextMessage(
               mobile,
               "🔒 Please create your *6 digit MPIN*.\n\nExample: 123456"
           );
                
            }

            
           
        }

     

        private async Task ProcessMPIN(string mobile, string message)
        {
            if (string.IsNullOrWhiteSpace(message))
            {
                await SendTextMessage(
                    mobile,
                    "Please create your 6-digit MPIN."
                );
                return;
            }

            message = message.Trim();

            if (!IsValidMPIN(message))
            {
                await SendTextMessage(
                    mobile,
                    "❌ MPIN must be exactly 6 digits.\n\nPlease enter a valid 6-digit MPIN."
                );
                return;
            }

            // Save MPIN
            await DLL.updatedetail(
                "3",
                mobile,
                message,
                "",
                "",
                "",
                "",
                "",
                "",
                "",
                ""
            );

            // Move to Aadhaar Number Step
            await DLL.UpdateStep(mobile, "AADHAR");

            // Ask Aadhaar Number
            await SendTextMessage(
                mobile,
                "🆔 Please enter your 12-digit Aadhaar Number."
            );
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
        private string GetAadhaarName(string text)
        {
            string[] lines = text
                .Split(new[] { '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries);

            for (int i = 0; i < lines.Length; i++)
            {
                string line = lines[i].Trim();

                // DOB wali line mili
                if (Regex.IsMatch(line, @"DOB|Year of Birth", RegexOptions.IgnoreCase))
                {
                    // DOB se upar 1-5 lines check karo
                    for (int j = i - 1; j >= Math.Max(0, i - 5); j--)
                    {
                        string name = lines[j].Trim();

                        // Ignore unwanted words
                        if (Regex.IsMatch(name,
                            @"Issue|Download|Date|Government|India|Authority|Address|Male|Female|VID|Aadhaar",
                            RegexOptions.IgnoreCase))
                            continue;

                        // Proper name
                        if (Regex.IsMatch(name, @"^[A-Za-z ]{3,50}$"))
                            return name;
                    }
                }
            }

            return "";
        }

        private string GetPincode(string text)
        {
            if (string.IsNullOrWhiteSpace(text))
                return "";

            // Indian Pincode (6 digits)
            Match match = Regex.Match(text, @"(?<!\d)([1-9]\d{5})(?!\d)");

            if (match.Success)
                return match.Groups[1].Value;

            return "";
        }

        private static async Task<(string State, string City)> GetStateCityFromPincode(string pincode)
        {
            try
            {
                using (HttpClient client = new HttpClient())
                {
                    string url = $"https://api.postalpincode.in/pincode/{pincode}";

                    string response = await client.GetStringAsync(url);

                    JArray arr = JArray.Parse(response);

                    if (arr.Count > 0 &&
                        arr[0]["Status"]?.ToString() == "Success")
                    {
                        JArray offices = (JArray)arr[0]["PostOffice"];

                        if (offices != null && offices.Count > 0)
                        {
                            JObject office = (JObject)offices[0];

                            string state = office["State"]?.ToString() ?? "";
                            string city = office["District"]?.ToString() ?? "";

                            return (state, city);
                        }
                    }
                }
            }
            catch
            {
            }

            return ("", "");
        }
        private static readonly System.Collections.Concurrent.ConcurrentDictionary<string, bool> ProcessedMessages
    = new System.Collections.Concurrent.ConcurrentDictionary<string, bool>();
        private async Task ProcessAadhaarFile(JObject json, string mobile, string messageType)
        {
            if (messageType != "document" && messageType != "image")
            {
                await SendTextMessage(
                    mobile,
                    "📄 Please upload your Aadhaar Card."
                );
                return;
            }

            var msg = json["entry"]?[0]?["changes"]?[0]?["value"]?["messages"]?[0];

            string messageId = msg["id"]?.ToString();

            if (!ProcessedMessages.TryAdd(messageId, true))
            { 
                return;
            }
             
            await SendTextMessage(
                mobile,
                "⏳ Please wait...\n\nWe are verifying your Aadhaar Card.\nThis may take a few seconds."
            );

            string mediaUrl = messageType == "image"
                ? json["entry"][0]["changes"][0]["value"]["messages"][0]["image"]["url"]?.ToString()
                : json["entry"][0]["changes"][0]["value"]["messages"][0]["document"]["url"]?.ToString();

            if (string.IsNullOrWhiteSpace(mediaUrl))
            {
                await SendTextMessage(mobile, "Unable to download document.");
                return;
            }

            byte[] fileBytes = await DownloadMediaByUrl(mediaUrl);

            string extension = messageType == "document"
                ? Path.GetExtension(json["entry"][0]["changes"][0]["value"]["messages"][0]["document"]["filename"].ToString())
                : ".jpg";

            string fileName = Guid.NewGuid() + extension;

            string folder = HttpContext.Current.Server.MapPath("~/DownloadMat/DocumentOCR/");

            if (!Directory.Exists(folder))
                Directory.CreateDirectory(folder);

            string filePath = Path.Combine(folder, fileName);
             
            File.WriteAllBytes(filePath, fileBytes);

            

            string ocrResult = await DAL.OCRHelper.ExtractOCRFromFile(filePath); 


            if (string.IsNullOrWhiteSpace(ocrResult))
            {
                await DLL.UpdateStep(mobile, "AADHAR_FILE");

                await SendTextMessage(
                    mobile,
                    "Unable to process your Aadhaar document. Please upload again."
                );
                return;
            }



            JObject ocr = JObject.Parse(ocrResult);

            DataTable dtUser = await DLL.GetUserByMobile(mobile, "20");

            string userName = "";

            if (dtUser.Rows.Count > 0)
            {
                userName = dtUser.Rows[0]["Name"].ToString();
                string ocrText = NormalizeName(ocrResult);
                string enteredName = NormalizeName(userName);
                if (!ocrText.Contains(enteredName))
                {
                    await SendTextMessage(
                        mobile,
                        "❌ The name on the uploaded Aadhaar Card does not match the name you entered.\n\n" +
                        "Please upload the correct Aadhaar Card."
                    );

                    await DLL.UpdateStep(mobile, "AADHAR_FILE");
                    return;
                }
            }

            string text = "";

            if (ocr["raw_text"] != null)
                text = ocr["raw_text"].ToString();
            else if (ocr["data"]?["raw_text"] != null)
                text = ocr["data"]["raw_text"].ToString();
            else if (ocr["text"] != null)
                text = ocr["text"].ToString();

            if (string.IsNullOrWhiteSpace(text))
            {
                await DLL.UpdateStep(mobile, "AADHAR_FILE");

                await SendTextMessage(
                    mobile,
                    "Unable to read Aadhaar Card.\nPlease upload a clear image."
                );
                return;
            }

            string relativePath = "../DownloadMat/DocumentOCR/" + fileName;

            string aadhaarNo = GetAadhaar(text);
            string name = userName;
            string dob = GetDOB(text);
            string address = GetAddress(text);
            string pincode = GetPincode(text);
            string state = "";
            string city = "";
            if (!string.IsNullOrWhiteSpace(pincode))
            {
                var result = await GetStateCityFromPincode(pincode);

                state = result.State;
                city = result.City;
            }
        

            await DLL.updatedetail(
                "4",
                mobile,
                "",
                name,
                aadhaarNo,
                dob,
                address,
                relativePath, pincode, state, city
            );
            if (string.IsNullOrWhiteSpace(state))
            {
                await DLL.UpdateStep(mobile, "STATE");

                await SendTextMessage(
                    mobile,
                    "📍 We couldn't detect your State automatically.\n\nPlease enter your State."
                );

                return;
            }

            if (string.IsNullOrWhiteSpace(city))
            {
                await DLL.UpdateStep(mobile, "CITY");

                await SendTextMessage(
                    mobile,
                    "🏙 Please enter your City/District."
                );

                return;
            }

            await DLL.UpdateStep(mobile, "PAN_FILE");

            await SendTextMessage(
                mobile,
                "🪪 Aadhaar verified successfully.\n\nPlease upload your PAN Card."
            );
        }
        private string GetPAN(string text)
        {
            Match m = Regex.Match(text,
                @"\b[A-Z]{5}[0-9]{4}[A-Z]\b");

            return m.Success ? m.Value : "";
        }
        private async Task ProcessESICConfirmation(string mobile, string text)
        {
    text = text?.Trim();

    if (text == "1")
    {
        await DLL.UpdateStep(mobile, "ESIC_FILE");

        await SendTextMessage(
            mobile,
            "🏥 Please upload your ESIC Card.\n\n" +
            "Supported formats:\n" +
            "✅ JPG\n" +
            "✅ PNG\n" +
            "✅ PDF"
        );
    }
    else if (text == "2")
    {
      
        await DLL.updatedetail(
            "7",       
            mobile,
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            ""
        );

                await DLL.UpdateStep(
                      mobile,
                      "UAN_FILE"
                  );



                await SendTextMessage(
                    mobile,
                    "🆔 Please upload your UAN Card.\n\n" +
                    "Supported formats:\n" +
                    "✅ JPG\n" +
                    "✅ PNG\n" +
                    "✅ PDF"
                );
            }
    else
    {
        await SendTextMessage(
            mobile,
            "Invalid response.\n\nPlease reply with:\n1️⃣ Yes\n2️⃣ No"
        );
    }
}
        private async Task ProcessPANFile(JObject json, string mobile, string messageType)
        {
            if (messageType != "document" && messageType != "image")
            {
                await SendTextMessage(
                    mobile,
                    "🪪 Please upload your PAN Card.\n\n" +
                    "Supported formats:\n" +
                    "✅ JPG\n" +
                    "✅ PNG\n" +
                    "✅ PDF"
                );
                return;
            }
            var msg = json["entry"]?[0]?["changes"]?[0]?["value"]?["messages"]?[0];

            string messageId = msg["id"]?.ToString();

            if (!ProcessedMessages.TryAdd(messageId, true))
            {
                return;
            }

            string mediaUrl = "";

            if (messageType == "image")
            {
                mediaUrl = json["entry"][0]["changes"][0]["value"]["messages"][0]["image"]["url"]?.ToString();
            }
            else
            {
                mediaUrl = json["entry"][0]["changes"][0]["value"]["messages"][0]["document"]["url"]?.ToString();
            }


            if (string.IsNullOrWhiteSpace(mediaUrl))
            {
                await SendTextMessage(
                    mobile,
                    "Unable to download PAN Card. Please upload again."
                );
                return;
            }


            byte[] fileBytes = await DownloadMediaByUrl(mediaUrl);


            string extension = messageType == "document"
                ? Path.GetExtension(json["entry"][0]["changes"][0]["value"]["messages"][0]["document"]["filename"].ToString())
                : ".jpg";


            string fileName = Guid.NewGuid().ToString() + extension;


            string folder = HttpContext.Current.Server.MapPath("~/DownloadMat/DocumentOCR/");


            if (!Directory.Exists(folder))
                Directory.CreateDirectory(folder);


            string filePath = Path.Combine(folder, fileName);

             
            File.WriteAllBytes(filePath, fileBytes);


            string relativePath = "../DownloadMat/DocumentOCR/" + fileName;

             
            await SendTextMessage(
                mobile,
                "⏳ Please wait...\n\n" +
                "We are verifying your PAN Card.\n" +
                "This may take a few seconds."
            );


            string ocrResult = await DAL.OCRHelper.ExtractOCRFromFile(filePath);


           


            if (string.IsNullOrWhiteSpace(ocrResult))
            {
                await SendTextMessage(
                    mobile,
                    "Unable to process your PAN Card. Please upload again."
                );
                return;
            }


            JObject ocr = JObject.Parse(ocrResult);

           

            string text = "";

            if (ocr["raw_text"] != null)
                text = ocr["raw_text"].ToString();

            else if (ocr["data"]?["raw_text"] != null)
                text = ocr["data"]["raw_text"].ToString();

            else if (ocr["text"] != null)
                text = ocr["text"].ToString();



            if (string.IsNullOrWhiteSpace(text))
            {
                await SendTextMessage(
                    mobile,
                    "Unable to read PAN Card.\nPlease upload a clear image."
                );
                return;
            }


            string panNo = GetPAN(text);


            if (string.IsNullOrWhiteSpace(panNo))
            {
                await SendTextMessage(
                    mobile,
                    "❌ PAN Number could not be detected.\n\n" +
                    "Please upload a clear image or PDF of your PAN Card."
                );
                return;
            }
            DataTable dtUser = await DLL.GetUserByMobile(mobile, "20");

            string userName = "";

            if (dtUser.Rows.Count > 0)
            {
                userName = dtUser.Rows[0]["Name"].ToString();
                string ocrText = NormalizeName(ocrResult);
                string enteredName = NormalizeName(userName);
                if (!ocrText.Contains(enteredName))
                {
                    await SendTextMessage(
                        mobile,
                        "❌ The name on the uploaded Pan Card does not match the name you entered.\n\n" +
                        "Please upload the correct Pan Card."
                    );

                    await DLL.UpdateStep(mobile, "PAN_FILE");
                    return;
                }
            }


            await SendTextMessage(
              mobile,
              "✅ PAN Card verified successfully."
          );


            await DLL.updatedetail(
                "5",
                mobile,
                panNo,
                "",
                "",
                "",
                "",
                relativePath, "", "", ""
            );
             
            await DLL.UpdateStep(
                mobile,
                "ESIC_CONFIRM"
            );
            await SendTextMessage(
    mobile,
    "Do you have an ESIC Card?\n\n" +
    "Reply with:\n" +
    "1️⃣ Yes\n" +
    "2️⃣ No"
);
         
        }

       
        private async Task SendCompletedMessage(string mobile)
        {
            //if (!CompletedUsers.TryAdd(mobile, true))
            //    return;

            DataTable dt = await DLL.GetUserByMobile(mobile, "13");

            if (dt.Rows.Count > 0)
            {
                await SendTextMessage(
                    mobile,
                    dt.Rows[0]["Message"].ToString()
                );
            }
        }


        private string GetESIC(string text)
        {
            Match m = Regex.Match(text,
                @"\b\d{10,17}\b");

            return m.Success ? m.Value : "";
        }
        private async Task ProcessESICFile(JObject json, string mobile, string messageType)
        {
            if (messageType != "document" && messageType != "image")
            {
                await SendTextMessage(
                    mobile,
                    "🏥 Please upload your ESIC Card.\n\n" +
                    "Supported formats:\n" +
                    "✅ JPG\n" +
                    "✅ PNG\n" +
                    "✅ PDF"
                );
                return;
            }
            var msg = json["entry"]?[0]?["changes"]?[0]?["value"]?["messages"]?[0];

            string messageId = msg["id"]?.ToString();

            if (!ProcessedMessages.TryAdd(messageId, true))
            {
                return;
            }

            string mediaUrl = "";

            if (messageType == "image")
            {
                mediaUrl = json["entry"][0]["changes"][0]["value"]["messages"][0]["image"]["url"]?.ToString();
            }
            else
            {
                mediaUrl = json["entry"][0]["changes"][0]["value"]["messages"][0]["document"]["url"]?.ToString();
            }


            if (string.IsNullOrWhiteSpace(mediaUrl))
            {
                await SendTextMessage(
                    mobile,
                    "Unable to download ESIC Card. Please upload again."
                );
                return;
            }


            byte[] fileBytes = await DownloadMediaByUrl(mediaUrl);


            string extension = messageType == "document"
                ? Path.GetExtension(json["entry"][0]["changes"][0]["value"]["messages"][0]["document"]["filename"].ToString())
                : ".jpg";


            string fileName = Guid.NewGuid().ToString() + extension;


            string folder = HttpContext.Current.Server.MapPath("~/DownloadMat/DocumentOCR/");


            if (!Directory.Exists(folder))
                Directory.CreateDirectory(folder);


            string filePath = Path.Combine(folder, fileName);


            // Save File
            File.WriteAllBytes(filePath, fileBytes);


            string relativePath = "../DownloadMat/DocumentOCR/" + fileName;



            await SendTextMessage(
                mobile,
                "⏳ Please wait...\n\n" +
                "We are verifying your ESIC Card.\n" +
                "This may take a few seconds."
            );



            string ocrResult = await DAL.OCRHelper.ExtractOCRFromFile(filePath);



            


            if (string.IsNullOrWhiteSpace(ocrResult))
            {
                await SendTextMessage(
                    mobile,
                    "Unable to process your ESIC Card. Please upload again."
                );
                return;
            }



            JObject ocr = JObject.Parse(ocrResult);

           
            string text = "";


            if (ocr["raw_text"] != null)
                text = ocr["raw_text"].ToString();

            else if (ocr["data"]?["raw_text"] != null)
                text = ocr["data"]["raw_text"].ToString();

            else if (ocr["text"] != null)
                text = ocr["text"].ToString();



            if (string.IsNullOrWhiteSpace(text))
            {
                await SendTextMessage(
                    mobile,
                    "Unable to read ESIC Card.\nPlease upload a clear image."
                );
                return;
            }


            

            string esicNo = GetESIC(text);



            if (string.IsNullOrWhiteSpace(esicNo))
            {
                await SendTextMessage(
                    mobile,
                    "❌ ESIC Number could not be detected.\n\n" +
                    "Please upload a clear image or PDF of your ESIC Card."
                );
                return;
            }


            DataTable dtUser = await DLL.GetUserByMobile(mobile, "20");

            string userName = "";

            if (dtUser.Rows.Count > 0)
            {
                userName = dtUser.Rows[0]["Name"].ToString();
                string ocrText = NormalizeName(ocrResult);
                string enteredName = NormalizeName(userName);
                if (!ocrText.Contains(enteredName))
                {
                    await SendTextMessage(
                        mobile,
                        "❌ The name on the uploaded ESIC Card does not match the name you entered.\n\n" +
                        "Please upload the correct ESIC Card."
                    );

                    await DLL.UpdateStep(mobile, "ESIC_FILE");
                    return;
                }
            }


            await DLL.updatedetail(
                "16",
                mobile,
                esicNo,
                "",
                "",
                "",
                "",
                relativePath, "", "", ""
            );



            await SendTextMessage(
                mobile,
                "✅ ESIC Card verified successfully."
            );



            await DLL.UpdateStep(
                mobile,
                "UAN_FILE"
            );



            await SendTextMessage(
                mobile,
                "🆔 Please upload your UAN Card.\n\n" +
                "Supported formats:\n" +
                "✅ JPG\n" +
                "✅ PNG\n" +
                "✅ PDF"
            );
        }



        private string GetUAN(string text)
        {
            Match m = Regex.Match(text,
                @"\b\d{12}\b");

            return m.Success ? m.Value : "";
        }
        private async Task ProcessUANFile(JObject json, string mobile, string messageType)
        {
            if (messageType != "document" && messageType != "image")
            {
                await SendTextMessage(
                    mobile,
                    "🆔 Please upload your UAN Card.\n\n" +
                    "Supported formats:\n" +
                    "✅ JPG\n" +
                    "✅ PNG\n" +
                    "✅ PDF"
                );
                return;
            }
            var msg = json["entry"]?[0]?["changes"]?[0]?["value"]?["messages"]?[0];

            string messageId = msg["id"]?.ToString();

            if (!ProcessedMessages.TryAdd(messageId, true))
            {
                return;
            }

            string mediaUrl = "";

            if (messageType == "image")
            {
                mediaUrl = json["entry"][0]["changes"][0]["value"]["messages"][0]["image"]["url"]?.ToString();
            }
            else
            {
                mediaUrl = json["entry"][0]["changes"][0]["value"]["messages"][0]["document"]["url"]?.ToString();
            }


            if (string.IsNullOrWhiteSpace(mediaUrl))
            {
                await SendTextMessage(
                    mobile,
                    "Unable to download UAN Card. Please upload again."
                );
                return;
            }


            byte[] fileBytes = await DownloadMediaByUrl(mediaUrl);



            string extension = messageType == "document"
                ? Path.GetExtension(json["entry"][0]["changes"][0]["value"]["messages"][0]["document"]["filename"].ToString())
                : ".jpg";


            string fileName = Guid.NewGuid().ToString() + extension;


            string folder = HttpContext.Current.Server.MapPath("~/DownloadMat/DocumentOCR/");


            if (!Directory.Exists(folder))
                Directory.CreateDirectory(folder);



            string filePath = Path.Combine(folder, fileName);

             
            File.WriteAllBytes(filePath, fileBytes);



            string relativePath = "../DownloadMat/DocumentOCR/" + fileName;



            await SendTextMessage(
                mobile,
                "⏳ Please wait...\n\n" +
                "We are verifying your UAN Card.\n" +
                "This may take a few seconds."
            );



            string ocrResult = await DAL.OCRHelper.ExtractOCRFromFile(filePath);



            



            if (string.IsNullOrWhiteSpace(ocrResult))
            {
                await SendTextMessage(
                    mobile,
                    "Unable to process your UAN Card. Please upload again."
                );
                return;
            }



            JObject ocr = JObject.Parse(ocrResult);



            string text = "";

            if (ocr["raw_text"] != null)
                text = ocr["raw_text"].ToString();

            else if (ocr["data"]?["raw_text"] != null)
                text = ocr["data"]["raw_text"].ToString();

            else if (ocr["text"] != null)
                text = ocr["text"].ToString();



            if (string.IsNullOrWhiteSpace(text))
            {
                await SendTextMessage(
                    mobile,
                    "Unable to read UAN Card.\nPlease upload a clear image."
                );
                return;
            }


           
            string uanNo = GetUAN(text);



            if (string.IsNullOrWhiteSpace(uanNo))
            {
                await SendTextMessage(
                    mobile,
                    "❌ UAN Number could not be detected.\n\n" +
                    "Please upload a clear image or PDF of your UAN Card."
                );
                return;
            }

            DataTable dtUser = await DLL.GetUserByMobile(mobile, "20");

            string userName = "";

            if (dtUser.Rows.Count > 0)
            {
                userName = dtUser.Rows[0]["Name"].ToString();
                string ocrText = NormalizeName(ocrResult);
                string enteredName = NormalizeName(userName);
                if (!ocrText.Contains(enteredName))
                {
                    await SendTextMessage(
                        mobile,
                        "❌ The name on the uploaded UAN Card does not match the name you entered.\n\n" +
                        "Please upload the correct UAN Card."
                    );

                    await DLL.UpdateStep(mobile, "UAN_FILE");
                    return;
                }
            }


            await DLL.updatedetail(
                "6",
                mobile,
                uanNo,
                "",
                "",
                "",
                "",
                relativePath, "", "", ""
            );



            await DLL.UpdateStep(
                mobile,
                "SELFIE"
            );



            await SendTextMessage(
                mobile,
                "✅ UAN Card verified successfully."
            );


                await SendTextMessage(
                mobile,
                "📸 Final Step\n\nPlease take a clear selfie and send it here."
                );
            return;
             
        }

        private async Task ProcessSelfie(JObject json, string mobile, string messageType)
        {
            if (messageType != "image")
            {
                await SendTextMessage(
                    mobile,
                    "📸 Please send your live selfie."
                );
                return;
            }

            string mediaUrl = json["entry"][0]["changes"][0]["value"]["messages"][0]["image"]["url"]?.ToString();

            if (string.IsNullOrWhiteSpace(mediaUrl))
            {
                await SendTextMessage(
                    mobile,
                    "Unable to download image. Please try again."
                );
                return;
            }

            byte[] fileBytes = await DownloadMediaByUrl(mediaUrl);

            string fileName = Guid.NewGuid() + ".jpg";

            string folder = HttpContext.Current.Server.MapPath("~/DownloadMat/Selfie/");

            if (!Directory.Exists(folder))
                Directory.CreateDirectory(folder);

            string filePath = Path.Combine(folder, fileName);

            File.WriteAllBytes(filePath, fileBytes);

            string relativePath = "../DownloadMat/Selfie/" + fileName;
             
            await DLL.updatedetail(
                "17",     
                mobile,
                "",
                "",
                "",
                "",
                "",
                relativePath,
                "",
                "",
                ""
            );

            await DLL.UpdateStep(mobile, "Completed");

            await SendTextMessage(
                mobile,
                "🎉 Registration completed successfully.\n\nThank you!"
            );



            await SendCompletedMessage(mobile);
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
        public async Task<byte[]> DownloadMedia(string mediaId)
        {
            try
            {
                using (var client = new HttpClient())
                {
                    client.DefaultRequestHeaders.Clear();

                    client.DefaultRequestHeaders.Add(
                        "apikey",
                        "sk_358392a83353438f944d2a3a9c8d939b"
                    );

                    // Media URL प्राप्त करें
                    var response = await client.GetAsync(
                        "https://api.gupshup.io/wa/media/" + mediaId
                    );

                    response.EnsureSuccessStatusCode();

                    return await response.Content.ReadAsByteArrayAsync();
                }
            }
            catch (Exception ex)
            {
                throw new Exception(
                    "Media Download Error : " + ex.Message
                );
            }
        }

        public async Task<byte[]> DownloadMediaByUrl(string mediaUrl)
        {
            try
            {
                ServicePointManager.SecurityProtocol = SecurityProtocolType.Tls12;

                using (var client = new HttpClient())
                {
                    client.DefaultRequestHeaders.Clear();
                    client.DefaultRequestHeaders.Add("apikey", "sk_358392a83353438f944d2a3a9c8d939b");

                    var response = await client.GetAsync(mediaUrl);

                    if (!response.IsSuccessStatusCode)
                    {
                        string error = await response.Content.ReadAsStringAsync();

                        throw new Exception(
                            "Status : " + response.StatusCode +
                            Environment.NewLine +
                            error
                        );
                    }

                    return await response.Content.ReadAsByteArrayAsync();
                }
            }
            catch (Exception ex)
            {
                throw new Exception(ex.ToString());
            }
        }
        public string SaveWhatsAppFile(byte[] fileBytes, string fileName,  string folderName)
        {
            try
            {
                string rootPath = HttpContext.Current.Server.MapPath("~/DownloadMat/Employee/");

                if (!Directory.Exists(rootPath))
                    Directory.CreateDirectory(rootPath);

                string folderPath = Path.Combine(rootPath, folderName);

                if (!Directory.Exists(folderPath))
                    Directory.CreateDirectory(folderPath);

                string extension = Path.GetExtension(fileName);

                string uniqueFileName =
                    Guid.NewGuid().ToString() +
                    extension;

                string fullPath =
                    Path.Combine(folderPath, uniqueFileName);

                File.WriteAllBytes(fullPath, fileBytes);

                return "../DownloadMat/Employee/" +
                       folderName +
                       "/" +
                       uniqueFileName;
            }
            catch (Exception ex)
            {
                throw ex;
            }
        }


        [HttpPost]
        [Route("Api/RetailSectionApi/GetEmployeeMaster")]
        public async Task<string> GetEmployeeMaster(RetialEmployeeManager obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.GetEmployeeMaster(obj)));
            return result;
        }

        public async Task<string> UpdateEmpStatus(RetialEmployeeManager obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.UpdateEmpStatus(obj)));
            return result;
        }

        

 

        [HttpPost]
        [Route("Api/RetailSectionApi/ReminderNotification")]
        public async Task<IHttpActionResult> ReminderNotification(RetialStoreManager obj)
        {
            var result = await Task.Factory.StartNew(() => DAL.DLL.ReminderNotification(obj));
            return Json(result); // This will return plain JSON. 
        }


        [HttpPost]
        [Route("Api/RetailSectionApi/IUDBulkComplianceExcel")]
        public async Task<IHttpActionResult> IUDBulkComplianceExcel()
        {
            if (!Request.Content.IsMimeMultipartContent())
                return BadRequest("Unsupported media type. Please use multipart/form-data.");

            var provider = await Request.Content.ReadAsMultipartAsync(new MultipartMemoryStreamProvider());

            Attendance data = null;
            byte[] fileBytes = null;
            string fileName = null;

            foreach (var content in provider.Contents)
            {
                var contentName = content.Headers.ContentDisposition.Name?.Trim('"');

                if (contentName == "obj")
                {
                    var jsonString = await content.ReadAsStringAsync();
                    try
                    {
                        data = JsonConvert.DeserializeObject<Attendance>(jsonString);
                    }
                    catch (Exception ex)
                    {
                        return BadRequest("Deserialization failed: " + ex.Message);
                    }
                }
                else if (contentName == "SignatureFile")
                {
                    fileBytes = await content.ReadAsByteArrayAsync();
                    fileName = content.Headers.ContentDisposition.FileName?.Trim('"');
                }
            }

            if (data == null)
                return BadRequest("Attendance data (obj) not found or invalid.");

            if (fileBytes != null && !string.IsNullOrEmpty(fileName))
            {
                var saveFolder = HttpContext.Current.Server.MapPath("~/DownloadMat/ComSignatures");
                if (!Directory.Exists(saveFolder))
                    Directory.CreateDirectory(saveFolder);

                var savePath = Path.Combine(saveFolder, fileName);
                File.WriteAllBytes(savePath, fileBytes);

                data.Signature = "/DownloadMat/ComSignatures/" + fileName;
            }

            string result = await DAL.DLL.IUDBulkComplianceExcel(data);
            return Ok(new { result });
        }






        [HttpPost]
        [Route("Api/RetailSectionApi/GetStoreMaster")]
        public async Task<IHttpActionResult> GetStoreMaster(RetialStoreManager obj)
        {
            var result = await Task.Factory.StartNew(() => DAL.DLL.GetStoreMaster(obj));
            return Json(result); // This will return plain JSON. 
        }


        [HttpPost]
        [Route("Api/RetailSectionApi/GetMasters")]
        public async Task<IHttpActionResult> GetMasters(tblMasters obj)
        {
            var result = await Task.Factory.StartNew(() => DAL.DLL.GetMasters(obj));
            return Json(result); // This will return plain JSON. 
        }

        [HttpPost]
        [Route("Api/RetailSectionApi/StoreComplianceStatusMaster")]
        public async Task<IHttpActionResult> StoreComplianceStatusMaster(TblPartyMaster obj)
        {
            var result = await Task.Factory.StartNew(() => DAL.DLL.StoreComplianceStatusMaster(obj));
            return Json(result); // This will return plain JSON.  
        }

        [HttpPost]
        [Route("Api/RetailSectionApi/GetLicenseMaster")]
        public async Task<IHttpActionResult> GetLicenseMaster(RetailLicenseDocuementMaster obj)
        {
            var result = await Task.Factory.StartNew(() => DAL.DLL.GetLicenseMaster(obj));
            return Json(result); // This will return plain JSON.   
        }
        [HttpPost]
        [Route("Api/RetailSectionApi/ApproveLicense")]
        public async Task<IHttpActionResult> ApproveLicense(StoreLicesensDocument obj)
        {
            var result = await Task.Factory.StartNew(() => DAL.DLL.ApproveLicense(obj));
            return Json(result); // This will return plain JSON.   
        }
        [HttpPost]
        [Route("Api/RetailSectionApi/GetStoreDocumentDetails")]
        public async Task<IHttpActionResult> GetStoreDocumentDetails(StoreLicesensDocument obj)
        {
            var result = await Task.Factory.StartNew(() => DAL.DLL.GetStoreDocumentDetails(obj));
            return Json(result); // This will return plain JSON.   
        }

        [HttpPost]
        [Route("Api/RetailSectionApi/UpdateStatus")]
        public async Task<IHttpActionResult> UpdateStatus()
        {
            // Check if the request contains multipart/form-data.
            if (!Request.Content.IsMimeMultipartContent())
            {
                return BadRequest("Unsupported media type.");
            }

            // Define the upload folder (map the virtual path to a physical path).
            string uploadFolder = System.Web.HttpContext.Current.Server.MapPath("~/DownloadMat/StoreLicDocument");
            if (!Directory.Exists(uploadFolder))
            {
                Directory.CreateDirectory(uploadFolder);
            }

            // Create a provider to read the multipart form data.
            var provider = new MultipartFormDataStreamProvider(uploadFolder);

            try
            {
                // Read the form data and file(s).
                await Request.Content.ReadAsMultipartAsync(provider);

                // Create your object and assign form values.
                RetialStoreManager obj = new RetialStoreManager();
                obj.IsActive = provider.FormData["IsActive"];
                obj.ActionType = Convert.ToInt32(provider.FormData["ActionType"]);
                obj.StoreCode = provider.FormData["StoreCode"];
                obj.DocumentName = provider.FormData["DocumentName"];
                obj.LoginId = Convert.ToInt32(provider.FormData["LoginId"]);

                // Process the file if one was uploaded.
                if (provider.FileData.Count > 0)
                {
                    // For example, process the first file.
                    var fileData = provider.FileData.First();

                    // Generate a new file name.
                    string newFileName = Guid.NewGuid().ToString("N").Substring(0, 4) +
                                         DateTime.Now.Year.ToString() +
                                         DateTime.Now.Month.ToString() +
                                         DateTime.Now.Day.ToString() + ".pdf";

                    // Build the destination path.
                    string destinationPath = Path.Combine(uploadFolder, newFileName);

                    // Move the file from the temporary location to your destination.
                    File.Move(fileData.LocalFileName, destinationPath);

                    // Save the relative path to your object.
                    string relativePath = "~/DownloadMat/StoreLicDocument/" + newFileName;
                    obj.AdditionalDoc = relativePath;
                }

                // Call your DAL method asynchronously and serialize the result.
                string result = await Task.Factory.StartNew(() =>
                    JsonConvert.SerializeObject(DAL.DLL.UpdateStatus(obj))
                );

                return Ok(result);
            }
            catch (Exception ex)
            {
                return InternalServerError(ex);
            }
        }

        #region BulkStoreMaster
        [HttpPost]
        [Route("Api/RetailSectionApi/IUDBulkStoreMaster")]
        public async Task<IHttpActionResult> IUDBulkStoreMaster(RetialStoreManager obj)
        {
            var result = await Task.Factory.StartNew(() => DAL.DLL.IUDBulkStoreMaster(obj));
            return Json(result); // This will return plain JSON.   
        }
        #endregion
        [HttpPost]
        [Route("Api/RetailSectionApi/InsertUpdateDelStoreDocumentMaster")]
        public async Task<IHttpActionResult> InsertUpdateDelStoreDocumentMaster()
        {
            try
            {
                var httpRequest = HttpContext.Current.Request;

                // Parsing integers safely
                int.TryParse(httpRequest.Form["Id"], out int Id);
                int.TryParse(httpRequest.Form["IsActive"], out int IsActive);
                int.TryParse(httpRequest.Form["ActionType"], out int actiontype);
                long.TryParse(httpRequest.Form["StoreId"], out long storeid);
                int.TryParse(httpRequest.Form["LoginId"], out int loginId);
                int.TryParse(httpRequest.Form["LicenseId"], out int LicenseId);

                // String values with null check
                string DName = httpRequest.Form["DName"] ?? "";
                string DFatherName = httpRequest.Form["DFatherName"] ?? "";
                string DAddress = httpRequest.Form["DAddress"] ?? "";
                string DAadhaarNo = httpRequest.Form["DAadhaarNo"] ?? "";
                string DPanNo = httpRequest.Form["DPanNo"] ?? "";
                string DEmailId = httpRequest.Form["DEmailId"] ?? "";
                string DMobileNo = httpRequest.Form["DMobileNo"] ?? "";

                string AName = httpRequest.Form["AName"] ?? "";
                string AFatherName = httpRequest.Form["AFatherName"] ?? "";
                string AAddress = httpRequest.Form["AAddress"] ?? "";
                string AAadhaarNo = httpRequest.Form["AAadhaarNo"] ?? "";
                string APanNo = httpRequest.Form["APanNo"] ?? "";
                string AEmailId = httpRequest.Form["AEmailId"] ?? "";
                string AMobileNo = httpRequest.Form["AMobileNo"] ?? "";

                string NatureofBusiness = httpRequest.Form["NatureofBusiness"] ?? "";
                string ProductCategory = httpRequest.Form["ProductCategory"] ?? "";
                string AadhaarRegisteredofficeAddressNo = httpRequest.Form["AadhaarRegisteredofficeAddressNo"] ?? "";

                // Parsing DateTime safely
                DateTime.TryParse(httpRequest.Form["DDateOfBirth"], out DateTime DDateOfBirth);
                if (DDateOfBirth == DateTime.MinValue) DDateOfBirth = new DateTime(1900, 1, 1);

                DateTime.TryParse(httpRequest.Form["ADateOfBirth"], out DateTime ADateOfBirth);
                if (ADateOfBirth == DateTime.MinValue) ADateOfBirth = new DateTime(1900, 1, 1);

                DateTime.TryParse(httpRequest.Form["DateofCommencement"], out DateTime DateofCommencement);
                if (DateofCommencement == DateTime.MinValue) DateofCommencement = new DateTime(1900, 1, 1);

                // File paths
                string AadhaarCardofDirectorPath = await SaveFileAsync(httpRequest.Files["AadhaarCardofDirector"], "StoreLicense");

                string PANCardofDirectorPath = await SaveFileAsync(httpRequest.Files["PANCardofDirector"], "StoreLicense");
                string PassportSizePhotoPath1 = await SaveFileAsync(httpRequest.Files["PassportSizePhoto"], "StoreLicense");
                string AuthorizationLetterPath = await SaveFileAsync(httpRequest.Files["AuthorizationLetter"], "StoreLicense");
                string AadhaarCardofAuthorizedPath = await SaveFileAsync(httpRequest.Files["AadhaarCardofAuthorized"], "StoreLicense");
                string PANCardPath = await SaveFileAsync(httpRequest.Files["PANCardPath"], "StoreLicense");
                string PassportSizePhotoPath2 = await SaveFileAsync(httpRequest.Files["PassportSizePhotoPath2"], "StoreLicense");
                string ElectricityBillPath = await SaveFileAsync(httpRequest.Files["ElectricityBill"], "StoreLicense");
                string SaledeedRentAgreementPath = await SaveFileAsync(httpRequest.Files["SaledeedRentAgreement"], "StoreLicense");
                string FSMSPlanPath = await SaveFileAsync(httpRequest.Files["FSMSPlan"], "StoreLicense");
                string FormIXPath = await SaveFileAsync(httpRequest.Files["httpRequest.FormIX"], "StoreLicense");
                string WaterTestReportPath = await SaveFileAsync(httpRequest.Files["WaterTestReport"], "StoreLicense");

                var storeobj = new StoreLicesensDocument
                {
                    Id = Id,
                    ActionType = actiontype,
                    StoreId = storeid,
                    LoginId = loginId,
                    LicenseId = LicenseId,
                    DName = DName,
                    DFatherName = DFatherName,
                    DAddress = DAddress,
                    DAadhaarNo = DAadhaarNo,
                    DPanNo = DPanNo,
                    DDateOfBirth = DDateOfBirth,
                    DEmailId = DEmailId,
                    DMobileNo = DMobileNo,
                    AName = AName,
                    AFatherName = AFatherName,
                    AAddress = AAddress,
                    AAadhaarNo = AAadhaarNo,
                    APanNo = APanNo,
                    ADateOfBirth = ADateOfBirth,
                    AEmailId = AEmailId,
                    AMobileNo = AMobileNo,
                    NatureofBusiness = NatureofBusiness,
                    DateofCommencement = DateofCommencement,
                    ProductCategory = ProductCategory,
                    AadhaarRegisteredofficeAddressNo = AadhaarRegisteredofficeAddressNo,
                    AadhaarCardofDirector = AadhaarCardofDirectorPath,
                    PANCardofDirector = PANCardofDirectorPath,
                    PassportSizePhoto1 = PassportSizePhotoPath1,
                    AuthorizationLetter = AuthorizationLetterPath,
                    AadhaarCardofAuthorized = AadhaarCardofAuthorizedPath,
                    PANCard = PANCardPath,
                    PassportSizePhoto2 = PassportSizePhotoPath2,
                    ElectricityBill = ElectricityBillPath,
                    SaledeedRentAgreement = SaledeedRentAgreementPath,
                    FSMSPlan = FSMSPlanPath,
                    FormIX = FormIXPath,
                    WaterTestReport = WaterTestReportPath,
                    IsActive = IsActive
                };

                string result = await Task.Run(() => JsonConvert.SerializeObject(DAL.DLL.InsertUpdateDelStoreDocumentMaster(storeobj)));

                return Ok(result);

            }
            catch (Exception ex)
            {
                return Content(HttpStatusCode.InternalServerError, new { success = false, message = "Error processing request", error = ex.Message });
            }
        }
        private string SaveUploadedFile(MultipartFileData file)
        {
            var originalFileName = file.Headers.ContentDisposition.FileName?.Trim('\"');
            var uniqueFileName = Guid.NewGuid().ToString() + Path.GetExtension(originalFileName);

            // Resolve the physical path
            var relativePath = "~/DownloadMat/Retail/Store/";
            var folderPath = HttpContext.Current.Server.MapPath(relativePath);

            // Ensure the folder exists
            if (!Directory.Exists(folderPath))
            {
                Directory.CreateDirectory(folderPath);
            }

            var savePath = Path.Combine(folderPath, uniqueFileName);

            File.Move(file.LocalFileName, savePath);

            // Return the relative path for storage
            return VirtualPathUtility.ToAbsolute(Path.Combine(relativePath, uniqueFileName));
        }


        [HttpPost]
        [Route("Api/RetailSectionApi/InsertUpdateDelLicenseRequest")]
        public async Task<IHttpActionResult> InsertUpdateDelLicenseRequest()
        {
            try
            {
                if (!Request.Content.IsMimeMultipartContent())
                {
                    return BadRequest("Unsupported media type.");
                }

                var root = HttpContext.Current.Server.MapPath("~/App_Data/TempFileUploads");
                Directory.CreateDirectory(root);

                var provider = new MultipartFormDataStreamProvider(root);
                await Request.Content.ReadAsMultipartAsync(provider);

                var formData = provider.FormData;
                var files = provider.FileData;

                int.TryParse(formData["UserId"], out int userId);
                int.TryParse(formData["Action"], out int action);
                long.TryParse(formData["LicenceRequestId"], out long licenceRequestId);

                string GetUploadedFilePath(string key)
                {
                    var file = files.FirstOrDefault(f => f.Headers.ContentDisposition.Name.Trim('\"') == key);
                    return file != null ? SaveUploadedFile(file) : formData[$"A{key}"];
                }

                var licenseRequest = new LicenseRequest
                {
                    UserId = userId,
                    Action = action,
                    LicenceRequestId = licenceRequestId,
                    ApplicationStatus = formData["ApplicationStatus"],
                    ApplicationDate = GetValidDate(formData["ApplicationDate"]),
                    ActualCost = formData["ActualCost"],
                    GovtFees = formData["GovtFees"],
                    UploadApplicationCopy = GetUploadedFilePath("UploadApplicationCopy"),
                    UploadChallanCopy = GetUploadedFilePath("UploadChallanCopy"),
                    UploadFeesCopy = GetUploadedFilePath("UploadFeesCopy"),
                    LicenseStatus = formData["LicenseStatus"],
                    LicenseDate = GetValidDate(formData["IssuedDate"]),
                    LicenseNumber = formData["LicenseNumber"],
                    ValidityStartDate = GetValidDate(formData["ValidityStartDate"]),
                    ValidityEndDate = GetValidDate(formData["ValidityEndDate"]),
                    UploadLicenseCopy = GetUploadedFilePath("UploadLicenseCopy"),
                    UploadRenewedCopy = GetUploadedFilePath("UploadRenewedCopy"),
                    UserName = formData["UserName"],
                    UserPassword = formData["UserPassword"],
                    MobileNumber = formData["MobileNumber"],
                    EmailId = formData["EmailId"],
                    TentativeDateofComp = GetValidDate(formData["TentativeDateofComp"]),
                    InvoiceStatus = formData["InvoiceStatus"],
                    InvoiceDate = GetValidDate(formData["InvoiceDate"]),
                    InvoiceNo = formData["InvoiceNo"],
                    InvoiceAmount = formData["InvoiceAmount"],
                    UploadInvoice = GetUploadedFilePath("UploadInvoice"),
                    PaymentStatus = formData["PaymentStatus"],
                    PaymentTAT = string.IsNullOrEmpty(formData["PaymentTAT"]) ? "0" : formData["PaymentTAT"],
                    RenewalStatus = formData["RenewalStatus"],
                    RenewalStartDate = GetValidDate(formData["RenewalStartDate"]),
                    RenewalEndDate = GetValidDate(formData["RenewalEndDate"])
                };

                var result = await Task.Run(() => DAL.DLL.InsertUpdateDelLicenseRequest(licenseRequest));

                return Ok(JsonConvert.SerializeObject(result));
            }
            catch (Exception ex)
            {
                return Content(HttpStatusCode.InternalServerError, new
                {
                    success = false,
                    message = "Error processing request",
                    error = ex.Message
                });
            }
        }

        private string GetFilePath(string file, string isUpdated, string folder)
        {
            if (string.IsNullOrEmpty(file)) return null;
            return isUpdated == "1" ? file : SaveFile(file, folder);
        }
        private string SaveFile(string dataURI, string For)
        {
            try
            {
                if (!string.IsNullOrEmpty(dataURI) && dataURI.StartsWith("data:application/"))
                {
                    string extension = Regex.Match(dataURI, @"^data:application\/[a-zA-Z]+;base64,").Value;
                    extension = extension.Replace("data:application/", "").Replace(";base64,", "");
                    string fileName = Guid.NewGuid().ToString("N") + "." + extension;
                    byte[] fileData = Convert.FromBase64String(dataURI.Substring(dataURI.IndexOf(',') + 1));
                    string folderPath = "";
                    string uploadpath = "";
                    if (For == "Employee")
                    {
                        uploadpath = "../DownloadMat/Retail/Employee/" + fileName;
                        folderPath = System.Web.HttpContext.Current.Server.MapPath("~/DownloadMat/Retail/Employee/");
                    }
                    else if (For == "StoreLicense")
                    {
                        uploadpath = "../DownloadMat/Retail/StoreLicense/" + fileName;
                        folderPath = System.Web.HttpContext.Current.Server.MapPath("~/DownloadMat/Retail/StoreLicense/");
                    }
                    else
                    {
                        uploadpath = "../DownloadMat/Retail/Store/" + fileName;
                        folderPath = System.Web.HttpContext.Current.Server.MapPath("~/DownloadMat/Retail/Store/");
                    }

                    string filePath = Path.Combine(folderPath, fileName);
                    string directory = Path.GetDirectoryName(filePath);
                    if (!Directory.Exists(directory))
                    {
                        Directory.CreateDirectory(directory);
                    }
                    System.IO.File.WriteAllBytes(filePath, fileData);
                    return uploadpath;
                }
                if (!string.IsNullOrEmpty(dataURI) && dataURI.StartsWith("data:image/"))
                {
                    string extension = Regex.Match(dataURI, @"^data:image\/[a-zA-Z]+;base64,").Value;
                    extension = extension.Replace("data:image/", "").Replace(";base64,", "");
                    string fileName = Guid.NewGuid().ToString("N") + "." + extension;
                    byte[] fileData = Convert.FromBase64String(dataURI.Substring(dataURI.IndexOf(',') + 1));
                    string folderPath = "";
                    string uploadpath = "";
                    if (For == "Employee")
                    {
                        uploadpath = "../DownloadMat/Retail/Employee/" + fileName;
                        folderPath = System.Web.HttpContext.Current.Server.MapPath("~/DownloadMat/Retail/Employee/");
                    }
                    else if (For == "StoreLicense")
                    {
                        uploadpath = "../DownloadMat/Retail/StoreLicense/" + fileName;
                        folderPath = System.Web.HttpContext.Current.Server.MapPath("~/DownloadMat/Retail/StoreLicense/");
                    }
                    else
                    {
                        uploadpath = "../DownloadMat/Retail/Store/" + fileName;
                        folderPath = System.Web.HttpContext.Current.Server.MapPath("~/DownloadMat/Retail/Store/");
                    }

                    string filePath = Path.Combine(folderPath, fileName);
                    string directory = Path.GetDirectoryName(filePath);
                    if (!Directory.Exists(directory))
                    {
                        Directory.CreateDirectory(directory);
                    }
                    System.IO.File.WriteAllBytes(filePath, fileData);
                    return uploadpath;
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine(ex.Message);
                throw;
            }
            // Check if the data URI is valid


            // Return empty string if the data URI is not valid or empty
            return "";
        }
        private string GetValidDate(string date)
        {
            return date == "Invalid date" ? null : date;
        }


        [HttpPost]
        [Route("Api/RetailSectionApi/LicenseRequestData")]
        public async Task<IHttpActionResult> LicenseRequestData(LicenseRequest obj)
        {
            var result = await Task.Factory.StartNew(() => DAL.DLL.LicenseRequestData(obj));
            return Json(result); // This will return plain JSON.   
        }

        [HttpPost]
        [Route("Api/RetailSectionApi/GetStoreDashboard")]
        public async Task<IHttpActionResult> GetStoreDashboard(TblPartyMaster obj)
        {
            var result = await Task.Factory.StartNew(() => DAL.DLL.GetStoreDashboard(obj));
            return Json(result); // This will return plain JSON.  
        }
        public async Task<string> GetStoreCodeNumber(tblMasters obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.GetStoreCodeNumber(obj)));
            return result;
        }


        public void Updateexcel(string fileName, string uploadpath, string StoreId)
        {
            RetailLicenseDocuementMaster obj = new RetailLicenseDocuementMaster()
            {

                DocumentName = fileName,
                DocumentPath = uploadpath,
                StoreCode = StoreId,
                Action = 13
            };
            string result = DAL.DLL.getexcel(obj).ToString();

        }
        [HttpPost]
        [Route("Api/RetailSectionApi/UploadDoc")]
        public async Task<IHttpActionResult> UploadDoc()
        {
            try
            {
                var httpRequest = HttpContext.Current.Request;

                // Create a new model to store values
                var model = new StoreLicesensDocument
                {
                    Id = int.TryParse(httpRequest.Form["Id"], out int id) ? id : 0,
                    StoreId = int.TryParse(httpRequest.Form["StoreId"], out int storeId) ? storeId : 0,
                    ActionType = int.TryParse(httpRequest.Form["ActionType"], out int actionType) ? actionType : 0,
                    //DisplayName = httpRequest.Form["DisplayName"],
                    //UploadedBy = httpRequest.Form["UploadedBy"]
                };

                // Get uploaded file
                if (httpRequest.Files.Count > 0)
                {
                    var file = httpRequest.Files[0];
                    if (file != null && file.ContentLength > 0)
                    {
                        string extension = Path.GetExtension(file.FileName).ToLower();
                        if (extension != ".pdf" && extension != ".jpg" && extension != ".jpeg" && extension != ".png")
                        {
                            return BadRequest("Only PDF or image files are allowed.");
                        }

                        string fileName = $"{Guid.NewGuid().ToString("N").Substring(0, 4)}_{DateTime.Now:yyyyMMddHHmmssfff}{extension}";
                        string relativePath = $"../DownloadMat/StoreLicDocument/{fileName}";
                        string physicalPath = HttpContext.Current.Server.MapPath(relativePath);

                        // Ensure directory exists
                        string dir = Path.GetDirectoryName(physicalPath);
                        if (!Directory.Exists(dir))
                            Directory.CreateDirectory(dir);

                        // Save file
                        file.SaveAs(physicalPath);

                        model.UFile = relativePath;
                    }
                }
                else
                {
                    return BadRequest("No file uploaded.");
                }

                // Save to DB
                var result = await Task.Factory.StartNew(() => DAL.DLL.UploadDoc(model));
                return Json(result);
            }
            catch (Exception ex)
            {
                return InternalServerError(ex);
            }
        }



  

        public async Task<string> GetStatusMaster(tblMasters obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.GetStatusMaster(obj)));
            return result;
        }




        #region GetStoreDataBySearch
        public async Task<string> GetStoreDataBySearch(TblPartyMaster obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.GetStoreDataBySearch(obj)));
            return result;
        }
        #endregion

        #region License & Registration
   
        [HttpPost]
        [Route("Api/RetailSectionApi/GetLicenseAndRegistrationBy")]
        public async Task<IHttpActionResult> GetLicenseAndRegistrationBy(TblPartyMaster obj)
        {
            var result = await Task.Factory.StartNew(() => DAL.DLL.GetLicenseAndRegistrationBy(obj));
            return Json(result); // This will return plain JSON.   
        }
        #endregion

        [Route("Api/RetailSectionApi/ApprovalUpdate")]
        public async Task<IHttpActionResult> ApprovalUpdate(LicenseRequest obj)
        {
            var result = await Task.Factory.StartNew(() => DAL.DLL.ApprovalUpdate(obj));
            return Json(result); // This will return plain JSON.   
        }
         

     
        [HttpPost]
        [Route("Api/RetailSectionApi/RetailRolePermisssion")]
        public async Task<IHttpActionResult> RetailRolePermisssion(TblPartyMaster obj)
        {
            var result = await Task.Run(() => DAL.DLL.RetailRolePermisssion(obj));
            return Json(result); // This will return plain JSON.

        }

        public async Task<string> UploadComplianceDoc(StoreLicesensDocument obj)
        {
            if (!string.IsNullOrEmpty(obj.UFile))
            {
                if (obj.UFile.Contains("data:application/"))
                {
                    obj.UFile = Regex.Replace(obj.UFile, @"^data:application\/[a-zA-Z]+;base64,", string.Empty);
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
                    byte[] data = Convert.FromBase64String(obj.UFile);
                    var imageStream = new MemoryStream(data, false);
                    string extention = ".pdf";
                    string uploadpath = "../DownloadMat/SCS/" + NewFileName + extention;
                    string filePath = System.Web.HttpContext.Current.Server.MapPath(uploadpath);
                    FileStream file = new FileStream(filePath, FileMode.Create, FileAccess.Write);
                    imageStream.WriteTo(file);
                    file.Close();
                    imageStream.Close();
                    obj.UFile = uploadpath;
                }
            }
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.UploadComplianceDoc(obj)));
            return result;
        }
        public async Task<string> SearchCompliance(RetialStoreManager obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.SearchCompliance(obj)));
            return result;
        }
        public async Task<string> IUDRetailUpdatecompliance(RetailLicenseDocuementMaster obj)
        {
            if (!string.IsNullOrEmpty(obj.DocumentPath))
            {
                if (obj.DocumentPath.Contains("data:image/"))
                {
                    obj.DocumentPath = Regex.Replace(obj.DocumentPath, @"^data:image\/[a-zA-Z]+;base64,", string.Empty);
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
                    byte[] data = Convert.FromBase64String(obj.DocumentPath);
                    var imageStream = new MemoryStream(data, false);
                    string extention = ".jpeg";
                    string uploadpath = "../DownloadMat/CDoc/" + NewFileName + extention;
                    string filePath = System.Web.HttpContext.Current.Server.MapPath(uploadpath);
                    FileStream file = new FileStream(filePath, FileMode.Create, FileAccess.Write);
                    imageStream.WriteTo(file);
                    file.Close();
                    imageStream.Close();
                    obj.DocumentPath = uploadpath;
                }
                if (obj.DocumentPath.Contains("data:application/"))
                {
                    obj.DocumentPath = Regex.Replace(obj.DocumentPath, @"^data:application\/[a-zA-Z]+;base64,", string.Empty);

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
                    byte[] data = Convert.FromBase64String(obj.DocumentPath);
                    var imageStream = new MemoryStream(data, false);
                    string extention = ".pdf";
                    string uploadpath = "../DownloadMat/CDoc/" + NewFileName + extention;
                    string filePath = System.Web.HttpContext.Current.Server.MapPath(uploadpath);
                    FileStream file = new FileStream(filePath, FileMode.Create, FileAccess.Write);
                    imageStream.WriteTo(file);
                    file.Close();
                    imageStream.Close();
                    obj.DocumentPath = uploadpath;
                }

            }
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.IUDRetailcompliance(obj)));
            return result;
        }
        #region compliance Search
        public async Task<string> IUDRetailcompliance(RetailLicenseDocuementMaster obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.IUDRetailcompliance(obj)));
            return result;
        }
        public async Task<string> SearchRETAILCompliance(RetailLicenseDocuementMaster obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.SearchRETAILCompliance(obj)));
            return result;
        }
        public async Task<string> BulkActSave(RetailLicenseDocuementMaster obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.BulkActSave(obj)));
            return result;
        }

        //public ActionResult Download(RetailLicenseDocuementMaster obj)
        //{

        //    string newFolder = "abcd1234";

        //    string path = System.IO.Path.Combine(
        //       Environment.GetFolderPath(Environment.SpecialFolder.Desktop),
        //       newFolder
        //    );


        //    if (Directory.Exists(path))
        //    {
        //        Directory.Delete(path, recursive: true);
        //        Directory.CreateDirectory(path);
        //    }
        //    if (!System.IO.Directory.Exists(path))
        //    {
        //        try
        //        {
        //            System.IO.Directory.CreateDirectory(path);
        //        }
        //        catch (IOException ie)
        //        {
        //            Response.Redirect("../RetailSection/thankyou?" + ie.Message);
        //            Console.WriteLine("IO Error: " + ie.Message);
        //        }
        //        catch (Exception e)
        //        {
        //            Response.Redirect("../RetailSection/thankyou?" + e.Message);
        //            Console.WriteLine("General Error: " + e.Message);
        //        }
        //    }
        //    return new EmptyResult();
        //}

      
        [HttpPost]
        [Route("Api/RetailSectionApi/SearchClientDashboard")]
        public async Task<IHttpActionResult> SearchClientDashboard(RetailBAL obj)
        {
            var result = await Task.Factory.StartNew(() => DAL.DLL.SearchClientDashboard(obj));
            return Json(result); // This will return plain JSON.   
        }


        [HttpPost]
        [Route("Api/RetailSectionApi/GetNewsletter")]
        public async Task<IHttpActionResult> GetNewsletter(TblNewLetter obj)
        {
            var result = await Task.Factory.StartNew(() => DAL.DLL.Get_NewLetters(obj));
            return Json(result); // This will return plain JSON.   
        }

        public async Task<string> IUDExcel(RetialStoreManager obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.IUDExcel(obj)));
            return result;
        }
        #endregion


        #region Notice

     
        [HttpPost]
        [Route("Api/RetailSectionApi/GetNoticeList")]
        public async Task<IHttpActionResult> GetNoticeList(NoticeBAL obj)
        {
            var result = await Task.Factory.StartNew(() => DAL.DLL.GetNoticeList(obj));
            return Json(result); // This will return plain JSON.   
        }
        public async Task<string> InsertUpdateNotice(NoticeBAL obj)
        {
            if (!string.IsNullOrEmpty(obj.NoticeUpload))
            {
                if (obj.NoticeUpload.Contains("data:image/"))
                {
                    obj.NoticeUpload = Regex.Replace(obj.NoticeUpload, @"^data:image\/[a-zA-Z]+;base64,", string.Empty);
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
                    byte[] data = Convert.FromBase64String(obj.NoticeUpload);
                    var imageStream = new MemoryStream(data, false);
                    string extention = ".jpeg";
                    string uploadpath = "../DownloadMat/NoticeDoc/" + NewFileName + extention;
                    string filePath = System.Web.HttpContext.Current.Server.MapPath(uploadpath);
                    FileStream file = new FileStream(filePath, FileMode.Create, FileAccess.Write);
                    imageStream.WriteTo(file);
                    file.Close();
                    imageStream.Close();
                    obj.NoticeUpload = uploadpath;
                }
                if (obj.NoticeUpload.Contains("data:application/"))
                {
                    obj.NoticeUpload = Regex.Replace(obj.NoticeUpload, @"^data:application\/[a-zA-Z]+;base64,", string.Empty);

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
                    byte[] data = Convert.FromBase64String(obj.NoticeUpload);
                    var imageStream = new MemoryStream(data, false);
                    string extention = ".pdf";
                    string uploadpath = "../DownloadMat/NoticeDoc/" + NewFileName + extention;
                    string filePath = System.Web.HttpContext.Current.Server.MapPath(uploadpath);
                    FileStream file = new FileStream(filePath, FileMode.Create, FileAccess.Write);
                    imageStream.WriteTo(file);
                    file.Close();
                    imageStream.Close();
                    obj.NoticeUpload = uploadpath;
                }

            }
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.InsertUpdateNotice(obj)));
            return result;
        }
        #endregion



        #region BulkEmployeeMaster

        public async Task<string> IUDBulkEmployeee(RetialStoreManager obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.IUDBulkEmployeee(obj)));
            return result;
        }
        #endregion

        public async Task<string> SearchEscalation(RetialEmployeeManager obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.SearchEscalation(obj)));
            return result;
        }
        public async Task<string> IUDEscalation(RetialEmployeeManager obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.IUDEscalation(obj)));
            return result;
        }
        #region Payment
        public async Task<string> SearchPayment(PaymentBAL obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.SearchPayment(obj)));
            return result;
        }
        public async Task<string> IUDPayment(PaymentBAL obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.IUDPayment(obj)));
            return result;
        }
        #endregion
        #region ManualPayment


        public async Task<string> IUDManualPayment(PaymentBAL obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.IUDPayment(obj)));
            return result;
        }
        #endregion

        public async Task<string> RetailONETIMEDOCUMENT(TblSiteManager obj)
        {
            if (!string.IsNullOrEmpty(obj.File))
            {
                if (obj.File.Contains("data:image/"))
                {
                    obj.File = Regex.Replace(obj.File, @"^data:image\/[a-zA-Z]+;base64,", string.Empty);
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
                    byte[] data = Convert.FromBase64String(obj.File);
                    var imageStream = new MemoryStream(data, false);
                    string extention = ".jpeg";
                    string uploadpath = "../DownloadMat/ProfileDoc/" + NewFileName + extention;
                    string filePath = System.Web.HttpContext.Current.Server.MapPath(uploadpath);
                    FileStream file = new FileStream(filePath, FileMode.Create, FileAccess.Write);
                    imageStream.WriteTo(file);
                    file.Close();
                    imageStream.Close();
                    obj.File = uploadpath;
                }
                if (obj.File.Contains("data:application/"))
                {
                    obj.File = Regex.Replace(obj.File, @"^data:application\/[a-zA-Z]+;base64,", string.Empty);

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
                    byte[] data = Convert.FromBase64String(obj.File);
                    var imageStream = new MemoryStream(data, false);
                    string extention = ".pdf";
                    string uploadpath = "../DownloadMat/ProfileDoc/" + NewFileName + extention;
                    string filePath = System.Web.HttpContext.Current.Server.MapPath(uploadpath);
                    FileStream file = new FileStream(filePath, FileMode.Create, FileAccess.Write);
                    imageStream.WriteTo(file);
                    file.Close();
                    imageStream.Close();
                    obj.File = uploadpath;
                }

            }
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.RetailONETIMEDOCUMENT(obj)));
            return result;
        }
        public async Task<string> SearchRetailONETIMEDOCUMENT(TblSiteManager obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.SearchRetailONETIMEDOCUMENT(obj)));
            return result;
        }

        [Route("Api/RetailSectionApi/GetLSDashboard")]
        [HttpPost]
        public async Task<IHttpActionResult> GetLSDashboard(LSDBAL obj)
        {
            var result = await Task.Factory.StartNew(() => DAL.DLL.GetLSDashboard(obj));
            return Json(result); // This will return plain JSON.
      
        }

        [Route("Api/RetailSectionApi/MaintainLog")]
        [HttpPost]
        public async Task<IHttpActionResult> MaintainLog(TblPartyMaster obj)
        {
            var result = await Task.Factory.StartNew(() => DAL.DLL.MaintainLog(obj));
            return Json(result); // This will return plain JSON.
        }
        public async Task<string> GetMaintainLog(TblPartyMaster obj)
        {

            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.GetMaintainLog(obj)));
            return result;
        }

         
        [Route("Api/RetailSectionApi/GetRetailMainDashboard")]
        [HttpPost]
        public async Task<IHttpActionResult> GetRetailMainDashboard(TblPartyMaster obj)
        {
            //string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.GetRetailMainDashboard(obj)));
            //return result;
            var result = await Task.Factory.StartNew(() => DAL.DLL.GetRetailMainDashboard(obj));
            return Json(result); // This will return plain JSON.
        }
        [Route("Api/RetailSectionApi/getredirect")]
        [HttpPost]
        public async Task<IHttpActionResult> getredirect(LoginBAL obj)
        {

            //string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.dll.LoginVerify(obj)));
            //return result;
            var result = await Task.Run(() => DLL.dll.LoginVerify(obj));
            return Json(result); // This will return plain JSON.
        }
        [HttpPost]
        [Route("Api/RetailSectionApi/InsertUpdateDelStoreMaster")]
        public async Task<IHttpActionResult> InsertUpdateDelStoreMaster()
        {
            try
            {
                var httpRequest = HttpContext.Current.Request;

                // Parse all form data from the request
                var request = new RetialStoreManager
                {
                    Id = int.TryParse(httpRequest.Form["Id"], out int id) ? id : 0,
                    ActionType = int.TryParse(httpRequest.Form["ActionType"], out int actionType) ? actionType : 0,
                    RefStoreCode = httpRequest.Form["RefStoreCode"],
                    StoreName = httpRequest.Form["StoreName"],
                    Category = httpRequest.Form["Category"],
                    CompleteAddress = httpRequest.Form["CompleteAddress"],
                    ProposedDate = DateTime.TryParse(httpRequest.Form["ProposedDate"], out var proposedDate) ? proposedDate : (DateTime?)null,
                    StoreLocation = httpRequest.Form["StoreLocation"],
                    CityId = httpRequest.Form["CityId"],
                    //CityId = float.TryParse(httpRequest.Form["CityId"], out var cityId) ? cityId : 0,
                    CircleId = float.TryParse(httpRequest.Form["CircleId"], out var circleId) ? circleId : 0,
                    RegionId = float.TryParse(httpRequest.Form["RegionId"], out var regionId) ? regionId : 0,
                    ZipCode = httpRequest.Form["ZipCode"],
                    StoreManagerName = httpRequest.Form["StoreManagerName"],
                    StoreManagerMobileNo = httpRequest.Form["StoreManagerMobileNo"],
                    StoreManagerEmail = httpRequest.Form["StoreManagerEmail"],
                    AreaManagerName = httpRequest.Form["AreaManagerName"],
                    AreaManagerMobileNo = httpRequest.Form["AreaManagerMobileNo"],
                    AreaManagerEmail = httpRequest.Form["AreaManagerEmail"],
                    ZonalManagerName = httpRequest.Form["ZonalManagerName"],
                    ZonalManagerMobileNo = httpRequest.Form["ZonalManagerMobileNo"],
                    ZonalManagerEmail = httpRequest.Form["ZonalManagerEmail"],
                    CircleHeadName = httpRequest.Form["CircleHeadName"],
                    CircleHeadMobileNo = httpRequest.Form["CircleHeadMobileNo"],
                    CircleHeadEmail = httpRequest.Form["CircleHeadEmail"],
                    RegionalHeadName = httpRequest.Form["RegionalHeadName"],
                    RegionalHeadMobileNo = httpRequest.Form["RegionalHeadMobileNo"],
                    RegionalHeadEmail = httpRequest.Form["RegionalHeadEmail"],
                    CorporateHeadName = httpRequest.Form["CorporateHeadName"],
                    CorporateHeadMobileNo = httpRequest.Form["CorporateHeadMobileNo"],
                    CorporateHeadEmail = httpRequest.Form["CorporateHeadEmail"],
                    SQFTStoreArea = httpRequest.Form["SQFTStoreArea"],
                    IsActive = httpRequest.Form["IsActive"],
                    LoginId = int.TryParse(httpRequest.Form["LoginId"], out var loginId) ? loginId : 0,
                    DaysOfExpire = int.TryParse(httpRequest.Form["DaysOfExpire"], out var daysOfExpire) ? daysOfExpire : 0,
                    LED = int.TryParse(httpRequest.Form["LED"], out var led) ? led : 0,
                    ElectricityBillRemark = httpRequest.Form["ElectricityBillRemark"],
                    LeasePaidReceiptRemark = httpRequest.Form["LeasePaidReceiptRemark"],
                    PropertyTaxRemark = httpRequest.Form["PropertyTaxRemark"],
                    FireNocRemark = httpRequest.Form["FireNocRemark"],
                    PollutionRemark = httpRequest.Form["PollutionRemark"],
                    OwnershipDocRemark = httpRequest.Form["OwnershipDocRemark"],
                    AdditionalDocRemark = httpRequest.Form["AdditionalDocRemark"],
                    ElectricityBillPeriodUpTo = DateTime.TryParse(httpRequest.Form["ElectricityBillPeriodUpTo"], out var ebUpTo) ? ebUpTo : (DateTime?)null,
                    PropertyTaxPeriodUpTo = DateTime.TryParse(httpRequest.Form["PropertyTaxPeriodUpTo"], out var ptUpTo) ? ptUpTo : (DateTime?)null,
                    LeasePaidReceiptPeriodUpTo = DateTime.TryParse(httpRequest.Form["LeasePaidReceiptPeriodUpTo"], out var leaseUpTo) ? leaseUpTo : (DateTime?)null,
                    FireNocPeriodUpTo = DateTime.TryParse(httpRequest.Form["FireNocPeriodUpTo"], out var fireNocUpTo) ? fireNocUpTo : (DateTime?)null,
                    PollutionPeriodUpTo = DateTime.TryParse(httpRequest.Form["PollutionPeriodUpTo"], out var pollutionUpTo) ? pollutionUpTo : (DateTime?)null,
                    AdditionalDocPeriodUpTo = DateTime.TryParse(httpRequest.Form["AdditionalDocPeriodUpTo"], out var additionalDocUpTo) ? additionalDocUpTo : (DateTime?)null,
                    LeaseFromDate = DateTime.TryParse(httpRequest.Form["LeaseFromDate"], out var leaseFrom) ? leaseFrom : (DateTime?)null,
                    OwnershipDocPeriodUpTo = DateTime.TryParse(httpRequest.Form["OwnershipDocPeriodUpTo"], out var ownershipUpTo) ? ownershipUpTo : (DateTime?)null
                };

                // Handle file uploads
                request.ElectricityBill = await SaveFileAsync(httpRequest.Files["ElectricityBill"], "Store");
                request.RentAgreement = await SaveFileAsync(httpRequest.Files["RentAgreement"], "Store");
                request.PropertyTaxPaidReceipt = await SaveFileAsync(httpRequest.Files["PropertyTaxPaidReceipt"], "Store");
                request.BuildingPlan = await SaveFileAsync(httpRequest.Files["BuildingPlan"], "Store");
                request.StabilityStructureCertificate = await SaveFileAsync(httpRequest.Files["StabilityStructureCertificate"], "Store");
                request.CompletionCertificate = await SaveFileAsync(httpRequest.Files["CompletionCertificate"], "Store");

                // Call DAL function
                var result = await Task.Run(() => JsonConvert.SerializeObject(DAL.DLL.InsertUpdateDelStoreMaster(request)));

                return Ok(new { success = true, data = result });
            }
            catch (Exception ex)
            {
                return Content(HttpStatusCode.InternalServerError, new
                {
                    success = false,
                    message = "Error processing request",
                    error = ex.Message
                });
            }
        }

        private async Task<string> SaveFileAsync(HttpPostedFile file, string folderName)
        {
            if (file != null && file.ContentLength > 0)
            {
                string uploadPath = HttpContext.Current.Server.MapPath($"~/Uploads/{folderName}/");
                string fileName = Path.GetFileName(file.FileName);
                string filePath = Path.Combine(uploadPath, fileName);

                Directory.CreateDirectory(uploadPath);
                file.SaveAs(filePath);

                // Return relative path
                return $"../Uploads/{folderName}/{fileName}";
            }
            return null;
        }





        /// Added by shipra  for contractor  ///
        /// 

        [HttpPost]
        [Route("Api/RetailSectionApi/IUDBulkContractorComplianceExcel")]
        public async Task<IHttpActionResult> IUDBulkContractorComplianceExcel()
        {
            if (!Request.Content.IsMimeMultipartContent())
            {
                return BadRequest("Unsupported media type. Please use multipart/form-data.");
            }

            var provider = await Request.Content.ReadAsMultipartAsync(new MultipartMemoryStreamProvider());

            ContractorAttendance data = null;
            byte[] fileBytes = null;
            string fileName = null;

            foreach (var content in provider.Contents)
            {
                var contentName = content.Headers.ContentDisposition.Name?.Trim('\"');

                if (contentName == "obj")
                {
                    var jsonString = await content.ReadAsStringAsync();
                    data = JsonConvert.DeserializeObject<ContractorAttendance>(jsonString);
                }
                else if (contentName == "SignatureFile")
                {
                    fileBytes = await content.ReadAsByteArrayAsync();
                    fileName = content.Headers.ContentDisposition.FileName?.Trim('\"');
                }
            }

            if (data == null)
            {
                return BadRequest("Attendance data (obj) not found or invalid.");
            }

            if (fileBytes != null && !string.IsNullOrEmpty(fileName))
            {
                var saveFolder = HttpContext.Current.Server.MapPath("~/DownloadMat/ComSignatures");
                if (!Directory.Exists(saveFolder))
                {
                    Directory.CreateDirectory(saveFolder);
                }

                var savePath = Path.Combine(saveFolder, fileName);
                File.WriteAllBytes(savePath, fileBytes);

                data.Signature = "/DownloadMat/ComSignatures/" + fileName;
            }

            var dalResult = await Task.Factory.StartNew(() =>
                DAL.DLL.IUDBulkContractorComplianceExcel(data)
            );

            return Ok(dalResult);
        }


        [HttpPost]
        [Route("Api/RetailSectionApi/AuditIUDBulkContractorComplianceExcel")]
        public async Task<IHttpActionResult> AuditIUDBulkContractorComplianceExcel()
        {
            if (!Request.Content.IsMimeMultipartContent())
            {
                return BadRequest("Unsupported media type. Please use multipart/form-data.");
            }

            var provider = await Request.Content.ReadAsMultipartAsync(new MultipartMemoryStreamProvider());

            ContractorAttendance data = null;
            byte[] fileBytes = null;
            string fileName = null;


            byte[] excelBytes = null;
            string excelFileName = null;

            foreach (var content in provider.Contents)
            {
                var contentName = content.Headers.ContentDisposition.Name?.Trim('\"');

                if (contentName == "obj")
                {
                    var jsonString = await content.ReadAsStringAsync();
                    data = JsonConvert.DeserializeObject<ContractorAttendance>(jsonString);
                }
                // ✅ Excel File (MANDATORY)
                else if (contentName == "excelfile")
                {
                    excelBytes = await content.ReadAsByteArrayAsync();
                    excelFileName = content.Headers.ContentDisposition.FileName?.Trim('\"');
                }
                else if (contentName == "SignatureFile")
                {
                    fileBytes = await content.ReadAsByteArrayAsync();
                    fileName = content.Headers.ContentDisposition.FileName?.Trim('\"');
                }
            }


            //if (!excelFileName.EndsWith(".xlsx") && !excelFileName.EndsWith(".xls"))
            //{
            //    return BadRequest("Only Excel files allowed.");
            //}

            // =========================
            // ✅ SAVE EXCEL FILE
            // =========================
            var excelFolder = HttpContext.Current.Server.MapPath("~/DownloadMat/ExcelFiles");

            if (!Directory.Exists(excelFolder))
            {
                Directory.CreateDirectory(excelFolder);
            }

            var uniqueExcelName =  Guid.NewGuid() + "_" + excelFileName;
            var excelPath = Path.Combine(excelFolder, uniqueExcelName);

            File.WriteAllBytes(excelPath, excelBytes);

            data.ExcelFilePath = "/DownloadMat/ExcelFiles/" + uniqueExcelName;

            if (data == null)
            {
                return BadRequest("Attendance data (obj) not found or invalid.");
            }
            if (excelBytes == null || string.IsNullOrEmpty(excelFileName))
            {
                return BadRequest("Excel file is required.");
            }


            if (fileBytes != null && !string.IsNullOrEmpty(fileName))
            {
                var saveFolder = HttpContext.Current.Server.MapPath("~/DownloadMat/ComSignatures");
                if (!Directory.Exists(saveFolder))
                {
                    Directory.CreateDirectory(saveFolder);
                }

                var savePath = Path.Combine(saveFolder, fileName);
                File.WriteAllBytes(savePath, fileBytes);

                data.Signature = "/DownloadMat/ComSignatures/" + fileName;
            }

            var dalResult = await Task.Factory.StartNew(() =>
                DAL.DLL.AuditIUDBulkContractorComplianceExcel(data)
            );

            return Ok(dalResult);
        }

    }
}