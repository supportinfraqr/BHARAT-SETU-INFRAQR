using System.IO;
using System.Net.Http;
using System.Threading.Tasks;

namespace DAL
{
    public static class OCRHelper
    {
        public static async Task<string> ExtractOCRFromFile(string filePath)
        {
            using (var client = new HttpClient())
            using (var content = new MultipartFormDataContent())
            {
                byte[] bytes = File.ReadAllBytes(filePath);

                var fileContent = new ByteArrayContent(bytes);

                content.Add(
                    fileContent,
                    "file",
                    Path.GetFileName(filePath));

                var response = await client.PostAsync(
                    "http://13.202.27.216:8080/ocr",
                    content);

                return await response.Content.ReadAsStringAsync();
            }
        }
    }
}