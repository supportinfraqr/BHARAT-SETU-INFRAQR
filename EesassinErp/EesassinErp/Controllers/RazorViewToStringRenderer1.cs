using RazorEngine;
using System.IO;
using System.Threading.Tasks;

namespace EesassinErp.Controllers
{
    public class RazorViewToStringRenderer1
    {
        public async Task<string> RenderViewToStringAsync(string viewName, object model)
        {
            string templatesPath = "";
            string templatePath = Path.Combine(templatesPath, string.Format("{0}.cshtml", "name"));
            string content = ""; // templatePath.ReadTemplateContent();
            string result = Razor.Parse(content, new { ConfirmLink = "http://.../" });
            return result;
        }
    }
}