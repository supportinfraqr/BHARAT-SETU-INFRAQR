using BAL;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using System;
using System.Collections.Generic;
using System.Data;
using System.Data.SqlClient;
using System.Diagnostics;
using System.Globalization;
using System.IO;
using System.IO.Compression;
using System.Linq;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using System.Web;
using System.Web.Mvc;


namespace EesassinErp.Controllers
{
    public class RozgarController : Controller
    {
        public ActionResult PostNewJob()
        {
            return View();
        }
        public ActionResult JobHistory()
        {
            return View();
        }
        public ActionResult ContractorRozgar()
        {
            return View();
        }
        public ActionResult WorkerRozgar()
        {
            return View();
        }
		
		 public ActionResult ExperienceLetter()
        {
            return View();
        }

        public ActionResult AppointmentLetter()
        {
            return View();
        }
		
        public ActionResult WorkerApplicationHistory()
        {
            return View();
        }
        public async Task<string> SavejobPost(RozgarBAL obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.InsertUpdateRozgar(obj)));
            return result;
        }

        public async Task<string> GetRozgarDetail(RozgarBAL obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.GetRozgarDetail(obj)));
            return result;
        }

        public async Task<string> ApplyForm(WorkerRozgarBAL obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.ApplyForm(obj)));
            return result;
        }
        public async Task<string> SearchApplyForm(WorkerRozgarBAL obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.SearchApplyForm(obj)));
            return result;
        }

        
    }
}
