using BAL;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using System;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using System.Web;

namespace DAL
{
    public partial class DLL
    {
        private static readonly string BaseUrl = "https://api.sandbox.co.in";
        private static readonly string ApiKey = "key_live_5ec2d9262b084a2da9c7c5985962161a";
        private static readonly string ApiSecret = "secret_live_31dde4924f3a4e179e7bc210b93cb5c8";

        //private static readonly string BaseUrl = "https://test-api.sandbox.co.in";
        //private static readonly string ApiKey = "key_test_b8686910b8fe4bc79e0cae0ce391407d";
        //private static readonly string ApiSecret = "secret_test_d15e5643db904f50a27140d90d817d5d";
        private static readonly string ApiVersion = "1.0";

        public class AadhaarOtpRequest
        {
            [JsonProperty("@entity")]
            public string Entity { get; set; }

            [JsonProperty("aadhaar_number")]
            public string aadhaar_number { get; set; }

            [JsonProperty("consent")]
            public string Consent { get; set; }

            [JsonProperty("reason")]
            public string Reason { get; set; }

        }
        public class AadhaarOtpVerify
        {
            [JsonProperty("@entity")]
            public string Entity { get; set; }

            [JsonProperty("reference_id")]
            public string reference_id { get; set; }

            [JsonProperty("otp")]
            public string otp { get; set; }
        }
        public class AadhaarVerifyResponse
        {
            [JsonProperty("code")]
            public int Code { get; set; }

            [JsonProperty("data")]
            public AadhaarData Data { get; set; }

            [JsonProperty("transaction_id")]
            public string TransactionId { get; set; }
        }

        public class AadhaarData
        {
            [JsonProperty("reference_id")]
            public long ReferenceId { get; set; }

            [JsonProperty("status")]
            public string Status { get; set; }

            [JsonProperty("message")]
            public string Message { get; set; }

            [JsonProperty("care_of")]
            public string CareOf { get; set; }

            [JsonProperty("full_address")]
            public string FullAddress { get; set; }

            [JsonProperty("date_of_birth")]
            public string DateOfBirth { get; set; }

            [JsonProperty("email_hash")]
            public string EmailHash { get; set; }

            [JsonProperty("gender")]
            public string Gender { get; set; }

            [JsonProperty("name")]
            public string Name { get; set; }

            [JsonProperty("year_of_birth")]
            public string YearOfBirth { get; set; }

            [JsonProperty("mobile_hash")]
            public string MobileHash { get; set; }

            [JsonProperty("photo")]
            public string Photo { get; set; }

            [JsonProperty("share_code")]
            public string ShareCode { get; set; }

            [JsonProperty("address")]
            public AadhaarAddress Address { get; set; }
        }

        public class AadhaarAddress
        {
            [JsonProperty("country")]
            public string Country { get; set; }

            [JsonProperty("district")]
            public string District { get; set; }

            [JsonProperty("house")]
            public string House { get; set; }

            [JsonProperty("landmark")]
            public string Landmark { get; set; }

            [JsonProperty("pincode")]
            public string Pincode { get; set; }

            [JsonProperty("post_office")]
            public string PostOffice { get; set; }

            [JsonProperty("state")]
            public string State { get; set; }

            [JsonProperty("street")]
            public string Street { get; set; }

            [JsonProperty("subdistrict")]
            public string Subdistrict { get; set; }

            [JsonProperty("vtc")]
            public string VTC { get; set; }
        }

        public static async Task<string> GetToken1()
        {
            ServicePointManager.SecurityProtocol = SecurityProtocolType.Tls12;
            using (var client = new HttpClient())
            {
                client.DefaultRequestHeaders.Add("x-api-key", ApiKey);
                client.DefaultRequestHeaders.Add("x-api-secret", ApiSecret);
                
               

                var response = await client.PostAsync($"{BaseUrl}/authenticate", null);

                string json = await response.Content.ReadAsStringAsync();

                dynamic result = JsonConvert.DeserializeObject(json);

                return result.data.access_token.ToString();
            }
        }

        public static async Task<string> GetToken()
        {
            ServicePointManager.SecurityProtocol = SecurityProtocolType.Tls12;

            using (var client = new HttpClient())
            {
                client.DefaultRequestHeaders.Add("x-api-key", ApiKey);
                client.DefaultRequestHeaders.Add("x-api-secret", ApiSecret);

                var response = await client.PostAsync($"{BaseUrl}/authenticate", null);

                string json = await response.Content.ReadAsStringAsync();

                Console.WriteLine("AUTH STATUS : " + response.StatusCode);
                Console.WriteLine("AUTH RESPONSE : " + json);

                JObject obj = JObject.Parse(json);

                if (obj["data"] == null)
                {
                    throw new Exception("Authentication Failed: " + json);
                }

                return obj["data"]["access_token"].ToString();
            }
        }


        public static async Task<string> GenerateOtp(string aadhaarNumber)
        {
            string token = await GetToken();
            Console.WriteLine(token);
            ServicePointManager.SecurityProtocol = SecurityProtocolType.Tls12;

            using (var client = new HttpClient())
            {
                client.DefaultRequestHeaders.Add("x-api-key", ApiKey);
                client.DefaultRequestHeaders.Add("Authorization", token);

                var body = new AadhaarOtpRequest
                {
                    Entity = "in.co.sandbox.kyc.aadhaar.okyc.otp.request",
                    aadhaar_number = aadhaarNumber,
                    Consent = "y",
                    Reason = "For KYC"
                };

                string jsonBody = JsonConvert.SerializeObject(body);
                Console.WriteLine(jsonBody);

                // ===== LOG START =====
                Console.WriteLine("URL : " + $"{BaseUrl}/kyc/aadhaar/okyc/otp");
                Console.WriteLine("TOKEN : " + token);
                Console.WriteLine("API KEY : " + ApiKey);
                Console.WriteLine("BODY : " + jsonBody);
                // ===== LOG END =====

                var content = new StringContent(
                    jsonBody,
                    Encoding.UTF8,
                    "application/json");

                var response = await client.PostAsync($"{BaseUrl}/kyc/aadhaar/okyc/otp",    content);

                string responseJson = await response.Content.ReadAsStringAsync();

                Console.WriteLine("STATUS : " + response.StatusCode);
                Console.WriteLine("RESPONSE : " + responseJson);
                Console.WriteLine("BaseUrl = " + BaseUrl);


                return responseJson;
            }
        }

        
    public static async Task<string> VerifyOtp(string referenceId, string otp, string aadhaarNo,string LoginId)
        {
            string token = await GetToken();

            ServicePointManager.SecurityProtocol = SecurityProtocolType.Tls12;

            using (var client = new HttpClient())
            {
                client.DefaultRequestHeaders.Add("x-api-key", ApiKey);
                client.DefaultRequestHeaders.Add("x-api-version", ApiVersion);
                client.DefaultRequestHeaders.Add("authorization", token);

                var body = new AadhaarOtpVerify
                {
                    Entity = "in.co.sandbox.kyc.aadhaar.okyc.request",
                    reference_id = referenceId,
                    otp = otp
                };

                string jsonBody = JsonConvert.SerializeObject(body);

                var content = new StringContent(
                    jsonBody,
                    Encoding.UTF8,
                    "application/json");

                var response = await client.PostAsync($"{BaseUrl}/kyc/aadhaar/okyc/otp/verify", content);

                string responseJson = await response.Content.ReadAsStringAsync(); 
                AadhaarVerifyResponse result =       JsonConvert.DeserializeObject<AadhaarVerifyResponse>(responseJson);

                if (result != null && result.Code == 200 && result.Data.Message == "Aadhaar Card Exists")
                {
                    RetialEmployeeManager emp = new RetialEmployeeManager();
                    emp.UserId = LoginId;
                    emp.AadhaarNo = aadhaarNo;
                    emp.ReferenceId = result.Data.ReferenceId.ToString();
                    emp.AadhaarStatus = result.Data.Status;
                    emp.AadhaarMessage = result.Data.Message;

                    emp.EmployeeName = result.Data.Name;
                    emp.Gendar = result.Data.Gender;
                    emp.DOB = result.Data.DateOfBirth;
                    emp.YearOfBirth = result.Data.YearOfBirth;
                    emp.CareOf = result.Data.CareOf;
                    emp.PresentAddress = result.Data.FullAddress; 
                    emp.YearOfBirth = result.Data.YearOfBirth; 
                    emp.AadhaarMessage = result.Data.Message;
                    emp.Country = result.Data.Address?.Country;
                    emp.state = result.Data.Address?.State;
                    emp.District = result.Data.Address?.District;
                    emp.PostOffice = result.Data.Address?.PostOffice;
                    emp.Pincode = result.Data.Address?.Pincode;
                    emp.Street = result.Data.Address?.Street;
                    emp.House = result.Data.Address?.House;
                    emp.Landmark = result.Data.Address?.Landmark;
                    emp.SubDistrict = result.Data.Address?.Subdistrict;
                    emp.VTC = result.Data.Address?.VTC;                    
                    emp.AadhaarResponseJson = responseJson;

                    if (!string.IsNullOrEmpty(result.Data.Photo))
                    {
                        string photoData = result.Data.Photo;

                        if (photoData.Contains(","))
                            photoData = photoData.Split(',')[1];

                        try
                        {
                            byte[] imageBytes = Convert.FromBase64String(photoData);

                            string folder = @"C:\projects\login.bharatshramsetu.com\DownloadMat\AadhaarPhoto";

                            if (!Directory.Exists(folder))
                                Directory.CreateDirectory(folder);

                            string photoPath = Path.Combine(folder, aadhaarNo + ".jpg");

                            File.WriteAllBytes(photoPath, imageBytes);

                            emp.Photos_1_FilePath = photoPath;
                        }
                        catch
                        {
                           
                            emp.Photos_1_FilePath = "";
                        }
                    }

                     
                    string saveResult = await DAL.DLL.SaveAadhaarData(emp);

                    if (saveResult == "SUCCESS")
                        return "1";

                    return result.Data.Message;
                }

                return result.Data.Message;
            }
        }


     
    }
}