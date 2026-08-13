using BAL;
using DAL;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using System;
using System.Data; // ✅ Required for DataTable
using System.Linq; // ✅ Required for .AsEnumerable()
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Threading.Tasks;
using System.Web.Http;

namespace EesassinErp.Controllers
{
    public class EZAIAPIController : ApiController
    {
        [HttpPost]
        [Route("Api/EZAIAPI/getdetail")]
        public async Task<IHttpActionResult> GetDetail([FromBody] ChatbotBAL obj)
        {
            if (obj == null || string.IsNullOrEmpty(obj.Question))
            {
                return BadRequest("Invalid request. Question is required.");
            }

            try
            {
                // ✅ Detect language
                string detectedLang = DetectLanguage(obj.Question);

                // ✅ Agar Hindi hai to pehle English me convert karo
                if (detectedLang == "hi")
                {
                    obj.Question = await TranslateToEnglish(obj.Question);
                }

                // ✅ Ab DB search karo
                var dt = await Task.Run(() => DLL.getaisearch(obj));
                string dbJson = JsonConvert.SerializeObject(dt, Formatting.None);
                if (dt == null || dt.Rows.Count == 0 || dbJson == @"[{""ReturnApi"":""""}]")
                {
                    string msg = detectedLang == "hi"
                        ? "कोई डाटा नहीं मिला।"
                        : "No data found.";
            

                        // ====== Step 3: Combine message ======
                     
                    return Ok(new
                    {
                        success = true,
                        question = obj.Question,
                        answer = msg,
                    });
                }

                // ✅ Convert DataTable to HTML + Summary


                string finalAnswer = string.Empty;

                // ✅ Check if "tablenotrequired" column exists and is 1
                bool skipTable = dt.Columns.Contains("tablenotrequired") &&
                                 dt.Rows.Count > 0 &&
                                 dt.Rows[0]["tablenotrequired"]?.ToString() == "1";

                bool showSuggestion = dt.Columns.Contains("Suggestion");
                bool SuggestionFlag = dt.Columns.Contains("SuggestionFlag");

             

                if (!skipTable)
                {
                    // ✅ Convert DataTable to HTML
                    string htmlTable = ConvertToHtmlTable(dt);
                      
                    string summary = "";
                    if (!showSuggestion)
                    {
                          summary = GenerateSmartSummary(dt, detectedLang);
                    }                 
                    finalAnswer = $"{htmlTable}{summary}";
                }
                else
                {
                    // ✅ Only generate summary if table is skipped
                    string summary = GenerateSmartSummary(dt, detectedLang);
                    finalAnswer = summary;
                }


             
     


                return Ok(new
                {
                    success = true,
                    question = obj.Question,
                    //dbData = JsonConvert.DeserializeObject(dbJson),
                    answer = finalAnswer,
                    SuggestionFlag = SuggestionFlag,
                    language = detectedLang
                });
            }
            catch (Exception ex)
            {
                return InternalServerError(ex);
            }
        }

        private async Task<string> TranslateToEnglish(string hindiText)
        {
            using (var client = new HttpClient())
            {
                // Set Accept header to ensure JSON response
                client.DefaultRequestHeaders.Accept.Clear();
                client.DefaultRequestHeaders.Accept.Add(
                    new System.Net.Http.Headers.MediaTypeWithQualityHeaderValue("application/json"));

                // Prepare request data
                var requestData = new
                {
                    q = hindiText,
                    source = "hi",
                    target = "en",
                    format = "text"
                };

                string json = JsonConvert.SerializeObject(requestData);

                try
                {
                    var response = await client.PostAsync(
                        "https://libretranslate.de/translate",
                        new StringContent(json, Encoding.UTF8, "application/json"));

                    // If response failed, log and return original text
                    if (!response.IsSuccessStatusCode)
                    {
                        string errorHtml = await response.Content.ReadAsStringAsync();
                        Console.WriteLine("API error response: " + errorHtml);
                        return hindiText;
                    }

                    string result = await response.Content.ReadAsStringAsync();

                    // Check if response is HTML instead of JSON
                    if (result.TrimStart().StartsWith("<"))
                    {
                        Console.WriteLine("Received HTML instead of JSON: " + result);
                        return hindiText;
                    }

                    // Parse JSON safely
                    var obj = JsonConvert.DeserializeObject<Newtonsoft.Json.Linq.JObject>(result);
                    return obj?["translatedText"]?.ToString() ?? hindiText;
                }
                catch (Exception ex)
                {
                    // Log exception and return original text
                    Console.WriteLine("Exception during translation: " + ex.Message);
                    return hindiText;
                }
            }
        }




        // ✅ Detect Language from Question
        private string DetectLanguage(string text)
        {
            if (string.IsNullOrWhiteSpace(text))
                return "en";

            string lower = text.ToLower();

            // ✅ Check Unicode Hindi (Devanagari)
            if (text.Any(c => c >= '\u0900' && c <= '\u097F'))
                return "hi";

            // ✅ Keyword-based Hindi detection
            if (lower.Contains("hindi") || lower.Contains("hinglish") || lower.Contains("in hindi"))
                return "hi";

            // ✅ Keyword-based English detection
            if (lower.Contains("english") || lower.Contains("in english"))
                return "en";

            // Default → English
            return "en";
        }


        // ✅ DataTable → HTML Table
        private string ConvertToHtmlTable(DataTable dt)
        {
            var sb = new StringBuilder();

            // जिन कॉलम्स को नहीं दिखाना है
            string[] skipColumns = { "fromdatabase", "HindiSummary", "EnglishSummary", "AI_Response", "AddSuggetion" };


            var displayColumns = dt.Columns
            .Cast<DataColumn>()
            .Where(c => !skipColumns.Contains(c.ColumnName, StringComparer.OrdinalIgnoreCase))
            .ToList();

            // ✅ अगर कोई भी कॉलम दिखाने लायक नहीं है तो टेबल मत बनाओ
            if (displayColumns.Count == 0)
            return string.Empty;


            sb.Append("<table border='1' cellpadding='5' cellspacing='0' style='border-collapse:collapse;'>");

            // ===== Header =====
            sb.Append("<tr>");
            foreach (DataColumn col in dt.Columns)
            {
                if (!skipColumns.Contains(col.ColumnName, StringComparer.OrdinalIgnoreCase))
                {
                    sb.AppendFormat("<th>{0}</th>", col.ColumnName);
                }
            }
            sb.Append("</tr>");

            // ===== Rows =====
            foreach (DataRow row in dt.Rows)
            {
                sb.Append("<tr>");
                foreach (DataColumn col in dt.Columns)
                {
                    if (!skipColumns.Contains(col.ColumnName, StringComparer.OrdinalIgnoreCase))
                    {
                        sb.AppendFormat("<td>{0}</td>", row[col] ?? "");
                    }
                }
                sb.Append("</tr>");
            }

            sb.Append("</table></br></br>");
            return sb.ToString();
        }


        // ✅ Smart Summary with Language
        private string OLDGenerateSmartSummary(DataTable table, string language = "en")
        {
            var sb = new StringBuilder();

            // 👉 पहले चेक करें कि "fromdatabase" कॉलम मौजूद है और कोई भी row 1 है
            bool useDbSummary = table.Columns.Contains("fromdatabase") &&
                                table.AsEnumerable()
                                     .Any(r => r["fromdatabase"]?.ToString() == "1");

            bool useshowtable = table.Columns.Contains("showtable") &&
                             table.AsEnumerable()
                                  .Any(r => r["showtable"]?.ToString() == "1");


            if (useDbSummary )
            {
                // अगर HindiSummary/EnglishSummary कॉलम हैं तो उन्हीं का उपयोग करें
                string columnToUse = language == "hi" ? "HindiSummary" : "EnglishSummary";

                if (table.Columns.Contains(columnToUse))
                {
                    foreach (DataRow row in table.Rows)
                    {
                        if (!string.IsNullOrWhiteSpace(row[columnToUse]?.ToString()))
                        {
                            sb.AppendLine(row[columnToUse].ToString());
                        }
                    } 
                }
            }
            else
            {
                // ---- नीचे Default AI Summary Logic (अगर fromdatabase !=1) ----
                if (language == "hi")
                {
                    sb.AppendLine($"🤖 मैंने आपके द्वारा पूछे गए सवाल के लिए यह जानकारी प्राप्त की है।");
                    sb.AppendLine($"इसमें कुल {table.Rows.Count} रिकॉर्ड्स हैं।");
                    sb.AppendLine($"📂 ये जानकारी {table.Columns.Count} कॉलम्स में एक तालिका के रूप में दी गई है, और मैं इसे आपके लिए संक्षेप में नीचे प्रस्तुत कर रहा हूँ:");

                    foreach (DataColumn col in table.Columns)
                    {
                        var values = table.AsEnumerable()
                                          .Select(row => row[col]?.ToString())
                                          .Where(v => !string.IsNullOrEmpty(v))
                                          .Distinct()
                                          .Take(3)
                                          .ToList();

                        if (!values.Any()) continue;

                        string sample = string.Join(", ", values);

                        sb.AppendLine($"- **{col.ColumnName}** :  {sample}.");
                    }

                    sb.AppendLine("🔒 सारांश **EZIN AI** (TalentCompliance) द्वारा सुरक्षित रूप से बनाया गया।");
                }
                else
                {
                    sb.AppendLine($"🤖 I have retrieved the information for the question you asked.");
                    sb.AppendLine($"It contains a total of {table.Rows.Count} records.");
                    sb.AppendLine($"📂 This information is organized into {table.Columns.Count} columns in a table format is given below.");
    
                foreach (DataColumn col in table.Columns)
                    {
                        var values = table.AsEnumerable()
                                          .Select(row => row[col]?.ToString())
                                          .Where(v => !string.IsNullOrEmpty(v))
                                          .Distinct()
                                          .Take(3)
                                          .ToList();
                        if (!values.Any()) continue;
                        string sample = string.Join(", ", values);
                        sb.AppendLine($"- **{col.ColumnName}** :  {sample}.");
                    }
                    sb.AppendLine("🔒 Summary generated by **EZIN AI** (TalentCompliance) – secure and reliable.");
                }
               
            }
            return sb.ToString();
        }


            private string GenerateSmartSummary(DataTable table, string language = "en")
            {
                var sb = new StringBuilder();
                var rand = new Random();

                bool useDbSummary = table.Columns.Contains("fromdatabase") &&
                                    table.AsEnumerable()
                                         .Any(r => r["fromdatabase"]?.ToString() == "1");

           

                if (useDbSummary)
                {
                    // अगर HindiSummary/EnglishSummary कॉलम हैं तो उन्हीं का उपयोग करें
                    string columnToUse = language.Equals("hi", StringComparison.OrdinalIgnoreCase) ? "HindiSummary" : "EnglishSummary";

                    if (table.Columns.Contains(columnToUse))
                    {
                        foreach (DataRow row in table.Rows)
                        {
                            if (!string.IsNullOrWhiteSpace(row[columnToUse]?.ToString()))
                            {
                                sb.AppendLine(row[columnToUse].ToString());
                            }
                        }
                    }
                }
                else
                {
                    // Columns jo skip karne hain
                    string[] skipColumns = { "SrNo", "Sno", "S.No.", "SerialNo", "SlNo" };

                    // Random humorous openings
                    string[] hindiOpenings =
                    {
                "😅 उफ़! काफ़ी सारा डेटा मिला है, चलिए छोटा सा सारांश सुनिए:",
                "📊 डेटा तो पूरा पहाड़ निकला, मैंने आपके लिए छोटा करके बताया है:",
                "😉 आपको लंबी कहानी नहीं सुनाऊँगा, सीधा सारांश दे रहा हूँ:",
                "🤖 EZIN AI रिपोर्टिंग मोड चालू! ये रहा सारांश:"
            };

                    string[] englishOpenings =
                    {
                "😅 Uff! That’s a lot of data, here’s the short version:",
                "📊 Found quite a pile of data, here’s the digestible summary:",
                "😉 Don’t worry, I won’t bore you with details — here’s the gist:",
                "🤖 AI at your service! Here’s a smart summary for you:"
            };

                    // Random closings
                    string[] hindiClosings =
                    {
                "✅ उम्मीद है ये जानकारी आपके काम आएगी!",
                "📌 ये रहा आपके सवाल का छोटा और उपयोगी जवाब।",
                "✨ डेटा पढ़ते-पढ़ते EZIN AI को भी नींद आ गई, पर सारांश बढ़िया है!",
                "🔒 EZIN AI ने ये जानकारी आपके लिए तैयार की है।"
            };

                    string[] englishClosings =
                    {
                "✅ Hope this helps you!",
                "📌 Here’s a quick and useful summary of your query.",
                "✨ Even EZIN got tired of the data, but hey — the summary is ready!",
                "🔒 Summary crafted by EZIN AI just for you."
            };

                    if (language.Equals("hi", StringComparison.OrdinalIgnoreCase))
                    {
                        sb.AppendLine(hindiOpenings[rand.Next(hindiOpenings.Length)]);
                        sb.AppendLine($"📊 इसमें कुल **{table.Rows.Count}** रिकॉर्ड्स मिले हैं।");

                        foreach (DataColumn col in table.Columns)
                        {
                            if (skipColumns.Any(x => col.ColumnName.Equals(x, StringComparison.OrdinalIgnoreCase)))
                                continue;

                            var values = table.AsEnumerable()
                                              .Select(row => row[col]?.ToString())
                                              .Where(v => !string.IsNullOrEmpty(v))
                                              .Distinct()
                                              .Take(5)
                                              .ToList();

                            if (!values.Any()) continue;

                            string sample = string.Join(", ", values);
                            sb.AppendLine($"👉 **{col.ColumnName}**: {sample}");
                        }

                        sb.AppendLine(hindiClosings[rand.Next(hindiClosings.Length)]);
                    }
                    else
                    {
                        sb.AppendLine(englishOpenings[rand.Next(englishOpenings.Length)]);
                        sb.AppendLine($"📊 I found **{table.Rows.Count} records** in total.");

                        foreach (DataColumn col in table.Columns)
                        {
                            if (skipColumns.Any(x => col.ColumnName.Equals(x, StringComparison.OrdinalIgnoreCase)))
                                continue;

                            var values = table.AsEnumerable()
                                              .Select(row => row[col]?.ToString())
                                              .Where(v => !string.IsNullOrEmpty(v))
                                              .Distinct()
                                              .Take(5)
                                              .ToList();

                            if (!values.Any()) continue;

                            string sample = string.Join(", ", values);
                            sb.AppendLine($"👉 **{col.ColumnName}**: {sample}");
                        }

                        sb.AppendLine(englishClosings[rand.Next(englishClosings.Length)]);
                    }
                }

                return sb.ToString();
            }


    }
}
