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

    public class RetailSectionController : Controller
    {
        public ActionResult VendorRegistration()
        {
            return View();
        }
        public ActionResult VendorRegistrationReport()
        {
            return View();
        }
		
		 public ActionResult Compliance()
        {
            return View();
        }
        public ActionResult Skill()
        {
            return View();
        }
		
		public ActionResult CPWorkerProfile()
        {
            return View();
        }
		
        public ActionResult Icard()
        {
            return View();
        }
        public ActionResult Index()
        {
            return View();
        }
        public ActionResult EmployeeMaster()
        {
            return View();
        }
        public ActionResult testing()
        {
            return View();
        }
         //    public async Task<string> InsertUpdateDelEmployeeMaster()
        //    {
        //        string result = "";
        //        var form = Request.Form;
        //        string Id = form["Id"];
        //        string actiontype = form["ActionType"];
        //        string PartyTypeId = form["PartyTypeId"];
        //        string UserId = form["UserId"];
        //        //DateTime LeavingDate = Convert.ToDateTime(form["LeavingDate"]);
        //        DateTime? LeavingDate = null;
        //        if (!string.IsNullOrWhiteSpace(form["LeavingDate"]))
        //        {
        //            LeavingDate = Convert.ToDateTime(form["LeavingDate"]);
        //        }
        //        string PFAccount = form["PFAccount"];
        //        string SuperVisior1 = form["SuperVisior1"];
        //        string SuperVisior2 = form["SuperVisior2"];
        //        string PartyId = form["PartyId"];
        //        string employeeCode = form["EmployeeCode"];
        //        string RefEmployeeCode = form["RefEmployeeCode"];
        //        string employeeName = form["EmployeeName"];
        //        string employeeDesignation = form["EmployeeDesignation"];
        //        string employeeDepartment = form["EmployeeDepartment"];
        //        string fatherHusbandName = form["FatherHusbandName"];
        //        string gender = form["Gender"];
        //        string maritalStatus = form["MaritalStatus"];

        //        DateTime? dateOfBirth = null;
        //        if (!string.IsNullOrWhiteSpace(form["DateofBirth"]))
        //        {
        //            dateOfBirth = Convert.ToDateTime(form["DateofBirth"]);
        //        }


        //        string presentAddress = form["PresentAddress"];
        //        string permanentAddress = form["PermanentAddress"];
        //        string adharCardNumber = form["AdharCardNumber"];
        //        string panNumber = form["PANNumber"];
        //        string mobileNumber = form["MobileNumber"];
        //        string alternativeMobileNumber = form["AlternativeMobileNumber"];
        //        string employeeEmailID = form["EmployeeEmailID"];
        //        string bankAccountNumber = form["BankAccountNumber"];
        //        string bankIFSCCode = form["BankIFSCCode"];
        //        string previousUAN = form["PreviousUAN"];
        //        string previousESI = form["PreviousESI"];
        //        string grossSalary = form["GrossSalary"];

        //        DateTime? doj = null;
        //        if (!string.IsNullOrWhiteSpace(form["DOJ"]))
        //        {
        //            doj = Convert.ToDateTime(form["DOJ"]);
        //        }

        //        string nameofNominee = form["NameofNominee"];
        //        string addressofNominee = form["AddressofNominee"];
        //        string relationofNominee = form["RelationofNominee"];




        //        DateTime? dobofNominee = null;

        //        if (!string.IsNullOrWhiteSpace(form["DOBofNominee"]))
        //        {
        //            DateTime parsedDate;
        //            if (DateTime.TryParse(form["DOBofNominee"], out parsedDate))
        //            {
        //                dobofNominee = parsedDate;
        //            }
        //        }

        //        string storeCode = form["StoreCode"];
        //        string Status = form["Status"];
        //        string SiteId = form["SiteId"];



        //        DateTime? IssueDate = null;
        //        if (!string.IsNullOrWhiteSpace(form["IssueDate"]))
        //        {
        //            IssueDate = Convert.ToDateTime(form["IssueDate"]);
        //        }

        //        DateTime? ValidTill = null;
        //        if (!string.IsNullOrWhiteSpace(form["ValidTill"]))
        //        {
        //            ValidTill = Convert.ToDateTime(form["ValidTill"]);
        //        }

        //        string BloodGroup = form["BloodGroup"];
        //        string CampNumber = form["CampNumber"];

        //        string State = form["State"];
        //        string City = form["City"];
        //        string Pincode = form["Pincode"];


        //        string Transport = form["Transport"];
        //        string RouteId = form["RouteId"];


        //        // Wage & Compliance
        //        string MinimumWageCategory = form["MinimumWageCategory"];
        //        string WageType = form["WageType"];
        //        string WageDisbursementMode = form["WageDisbursementMode"];

        //        // Safety & Security
        //        string PPE = form["PPE"];
        //        string PPEType = form["PPEType"];
        //        string SafetyTrainingStatus = form["SafetyTrainingStatus"];
        //        string SiteInductionStatus = form["SiteInductionStatus"];
        //        string PoliceVerificationStatus = form["PoliceVerificationStatus"];

        //        // Temporary Gate Pass
        //        string TempIDStatus = form["TempIDStatus"];
        //        string TempIDNumber = form["TempIDNumber"];


        //        string FitnessTypes = form["FitnessTypes"];
        //        string NextMedicalDue = form["NextMedicalDue"];
        //        string MedicalStatus = form["MedicalStatus"];





        //        DateTime? TempIDDate = null;
        //        if (!string.IsNullOrWhiteSpace(form["TempIDDate"]))
        //        {
        //            TempIDDate = Convert.ToDateTime(form["TempIDDate"]);
        //        }

        //        // Permanent Gate Pass
        //        string PermanentIDStatus = form["PermanentIDStatus"];
        //        string PermanentIDNumber = form["PermanentIDNumber"];



        //        DateTime? PermanentIDDate = null;
        //        if (!string.IsNullOrWhiteSpace(form["PermanentIDDate"]))
        //        {
        //            PermanentIDDate = Convert.ToDateTime(form["PermanentIDDate"]);
        //        }



        //        string panCardFilePath = null;
        //        string chequePassbookFilePath = null;
        //        string educationCertificateFilePath = null;
        //        string experienceCertificateFilePath = null;
        //        string adhaarCardFrontSideFilePath = null;
        //        string adhaarCardBackSideFilePath = null;
        //        string relievingLetterFilePath = null;
        //        string payslipsFilePath = null;
        //        string photos1FilePath = null;
        //        string photos2FilePath = null;
        //        string photos3FilePath = null;
        //        string photos4FilePath = null;
        //        string MedicalCertificate_FilePath = null;



        //        string EmployeePhotos = null;
        //        //if (Convert.ToInt32(Id) == 0)
        //        //{
        //        if (!string.IsNullOrEmpty(form["EmployeePhotos"]))
        //        {
        //            EmployeePhotos = SaveFile(form["EmployeePhotos"], "EmployeePhotos");
        //        }
        //        if (!string.IsNullOrEmpty(form["PANCardFilePath"]))
        //        {
        //            panCardFilePath = SaveFile(form["PANCardFilePath"], "Employee");
        //        }
        //        if (!string.IsNullOrEmpty(form["Cheque_Passbook_FilePath"]))
        //        {
        //            chequePassbookFilePath = SaveFile(form["Cheque_Passbook_FilePath"], "Employee");
        //        }

        //        if (!string.IsNullOrEmpty(form["EducationCertificateFilePath"]))
        //        {
        //            educationCertificateFilePath = SaveFile(form["EducationCertificateFilePath"], "Employee");
        //        }
        //        if (!string.IsNullOrEmpty(form["ExperienceCertificateFilePath"]))
        //        {
        //            experienceCertificateFilePath = SaveFile(form["ExperienceCertificateFilePath"], "Employee");
        //        }
        //        if (!string.IsNullOrEmpty(form["AdhaarCard_FrontSide_FilePath"]))
        //        {
        //            adhaarCardFrontSideFilePath = SaveFile(form["AdhaarCard_FrontSide_FilePath"], "Employee");
        //        }
        //        if (!string.IsNullOrEmpty(form["AdhaarCard_BackSide_FilePath"]))
        //        {
        //            adhaarCardBackSideFilePath = SaveFile(form["AdhaarCard_BackSide_FilePath"], "Employee");
        //        }
        //        if (!string.IsNullOrEmpty(form["RelievingLetterfFilePath"]))
        //        {
        //            relievingLetterFilePath = SaveFile(form["RelievingLetterfFilePath"], "Employee");
        //        }
        //        if (!string.IsNullOrEmpty(form["PayslipsFilePath"]))
        //        {
        //            payslipsFilePath = SaveFile(form["PayslipsFilePath"], "Employee");
        //        }
        //        if (!string.IsNullOrEmpty(form["Photos_1_FilePath"]))
        //        {
        //            photos1FilePath = SaveFile(form["Photos_1_FilePath"], "Employee");
        //        }
        //        if (!string.IsNullOrEmpty(form["Photos_2_FilePath"]))
        //        {
        //            photos2FilePath = SaveFile(form["Photos_2_FilePath"], "Employee");
        //        }
        //        if (!string.IsNullOrEmpty(form["Photos_3_FilePath"]))
        //        {
        //            photos3FilePath = SaveFile(form["Photos_3_FilePath"], "Employee");
        //        }
        //        if (!string.IsNullOrEmpty(form["Photos_4_FilePath"]))
        //        {
        //            photos4FilePath = SaveFile(form["Photos_4_FilePath"], "Employee");
        //        }
        //        if (!string.IsNullOrEmpty(form["MedicalCertificate_FilePath"]))
        //        {
        //            MedicalCertificate_FilePath = SaveFile(form["MedicalCertificate_FilePath"], "Employee");
        //        } 
        //        try
        //        {
        //            var employeeData = new RetialEmployeeManager
        //            {
        //                Id = Id,
        //                ActionType = actiontype,
        //                PartyTypeId = PartyTypeId,
        //                PartyId = PartyId,
        //                UserId = UserId,
        //                Status = Status,
        //                EmployeePhotos = EmployeePhotos,
        //                SuperVisior1 = SuperVisior1,
        //                SuperVisior2 = SuperVisior2,
        //                EmployeeCode = employeeCode,
        //                RefEmployeeCode = RefEmployeeCode,
        //                EmployeeName = employeeName,
        //                EmployeeDesignation = employeeDesignation,
        //                EmployeeDepartment = employeeDepartment,
        //                Father_Husband_Name = fatherHusbandName,
        //                Gendar = gender,
        //                MaritalStatus = maritalStatus,
        //                DateOfBirth = dateOfBirth,
        //                PresentAddress = presentAddress,
        //                PermanemtAddress = permanentAddress,
        //                AdharCardNumber = adharCardNumber,
        //                PANNumber = panNumber,
        //                MobileNumber = mobileNumber,
        //                AlternativeMobileNumber = alternativeMobileNumber,
        //                EmployeeEmailID = employeeEmailID,
        //                BankAccountNumber = bankAccountNumber,
        //                BankIFSCCode = bankIFSCCode,
        //                PreviousUAN = previousUAN,
        //                PreviousESI = previousESI,
        //                GrossSalary = grossSalary,
        //                DOJ = doj,
        //                IssueDate = IssueDate,
        //                ValidTill = ValidTill,
        //                BloodGroup = BloodGroup,
        //                CampNumber = CampNumber,
        //                NomineeName = nameofNominee,
        //                NomineeAddress = addressofNominee,
        //                NomineeRelation = relationofNominee,
        //                NomineeDOB = dobofNominee,
        //                StoreCode = storeCode,
        //                PANCardFilePath = panCardFilePath,
        //                Cheque_Passbook_FilePath = chequePassbookFilePath,
        //                EducationCertificateFilePath = educationCertificateFilePath,
        //                ExperienceCertificateFilePath = experienceCertificateFilePath,
        //                AdhaarCard_FrontSide_FilePath = adhaarCardFrontSideFilePath,
        //                AdhaarCard_BackSide_FilePath = adhaarCardBackSideFilePath,
        //                RelievingLetterfFilePath = relievingLetterFilePath,
        //                PayslipsFilePath = payslipsFilePath,
        //                Photos_1_FilePath = photos1FilePath,
        //                Photos_2_FilePath = photos2FilePath,
        //                Photos_3_FilePath = photos3FilePath,
        //                Photos_4_FilePath = photos4FilePath,
        //                LeavingDate = LeavingDate,
        //                PFAccount = PFAccount,
        //                SiteId = SiteId,
        //                MinimumWageCategory = MinimumWageCategory,
        //                WageType = WageType,
        //                WageDisbursementMode = WageDisbursementMode,

        //                // Safety & Security
        //                PPE = PPE,
        //                PPEType = PPEType,
        //                SafetyTrainingStatus = SafetyTrainingStatus,
        //                SiteInductionStatus = SiteInductionStatus,
        //                PoliceVerificationStatus = PoliceVerificationStatus,

        //                TempIDStatus = TempIDStatus,
        //                TempIDNumber = TempIDNumber,
        //                TempIDDate = TempIDDate,
        //                PermanentIDStatus = PermanentIDStatus,
        //                PermanentIDNumber = PermanentIDNumber,
        //                PermanentIDDate = PermanentIDDate,

        //                Transport = Transport,
        //                RouteId = RouteId, 
        //                State = State,
        //                City = City,
        //                Pincode = Pincode,
        //                MedicalCertificate_FilePath = MedicalCertificate_FilePath,
        //                FitnessTypes = FitnessTypes,
        //                MedicalStatus = MedicalStatus,
        //                NextMedicalDue = NextMedicalDue


        //};
        //            result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.InsertUpdateDelEmployeeMaster(employeeData)));
        //        }
        //        catch (Exception ex)
        //        {
        //            Console.WriteLine(ex.Message);
        //            throw;
        //        }
        //        return result;
        //    }

        public async Task<string> InsertUpdateDelEmployeeMaster()
        {
            string result = "";
            var form = Request.Form;
            string Id = form["Id"];
            string actiontype = form["ActionType"];
            string PartyTypeId = form["PartyTypeId"];
            string UserId = form["UserId"];
            //DateTime LeavingDate = Convert.ToDateTime(form["LeavingDate"]);
            DateTime? LeavingDate = null;
            if (!string.IsNullOrWhiteSpace(form["LeavingDate"]))
            {
                LeavingDate = Convert.ToDateTime(form["LeavingDate"]);
            }
            string PFAccount = form["PFAccount"];
            string SuperVisior1 = form["SuperVisior1"];
            string SuperVisior2 = form["SuperVisior2"];
            string PartyId = form["PartyId"];
            string employeeCode = form["EmployeeCode"];
            string RefEmployeeCode = form["RefEmployeeCode"];
            string employeeName = form["EmployeeName"];
            string employeeDesignation = form["EmployeeDesignation"];
            string employeeDepartment = form["EmployeeDepartment"];
            string fatherHusbandName = form["FatherHusbandName"];
            string gender = form["Gender"];
            string maritalStatus = form["MaritalStatus"];

            DateTime? dateOfBirth = null;
            if (!string.IsNullOrWhiteSpace(form["DateofBirth"]))
            {
                dateOfBirth = Convert.ToDateTime(form["DateofBirth"]);
            }


            string presentAddress = form["PresentAddress"];
            string permanentAddress = form["PermanentAddress"];
            string adharCardNumber = form["AdharCardNumber"];
            string panNumber = form["PANNumber"];
            string mobileNumber = form["MobileNumber"];
            string alternativeMobileNumber = form["AlternativeMobileNumber"];
            string employeeEmailID = form["EmployeeEmailID"];
            string bankAccountNumber = form["BankAccountNumber"];
            string bankIFSCCode = form["BankIFSCCode"];
            string previousUAN = form["PreviousUAN"];
            string previousESI = form["PreviousESI"];
            string grossSalary = form["GrossSalary"];

            DateTime? doj = null;
            if (!string.IsNullOrWhiteSpace(form["DOJ"]))
            {
                doj = Convert.ToDateTime(form["DOJ"]);
            }

            string nameofNominee = form["NameofNominee"];
            string addressofNominee = form["AddressofNominee"];
            string relationofNominee = form["RelationofNominee"];


            DateTime? dobofNominee = null;

            if (!string.IsNullOrWhiteSpace(form["DOBofNominee"]))
            {
                DateTime parsedDate;
                if (DateTime.TryParse(form["DOBofNominee"], out parsedDate))
                {
                    dobofNominee = parsedDate;
                }
            }

            string storeCode = form["StoreCode"];
            string Status = form["Status"];
            string SiteId = form["SiteId"];



            DateTime? IssueDate = null;
            if (!string.IsNullOrWhiteSpace(form["IssueDate"]))
            {
                IssueDate = Convert.ToDateTime(form["IssueDate"]);
            }

            DateTime? ValidTill = null;
            if (!string.IsNullOrWhiteSpace(form["ValidTill"]))
            {
                ValidTill = Convert.ToDateTime(form["ValidTill"]);
            }

            string BloodGroup = form["BloodGroup"];
            string CampNumber = form["CampNumber"];

            string State = form["State"];
            string City = form["City"];
            string Pincode = form["Pincode"];

            // here is new code for permanent address

            string PState = form["PState"];
            string PCity = form["PCity"];
            string PPincode = form["PPincode"];


            DateTime? Trannerdate = null;
            if (!string.IsNullOrWhiteSpace(form["Trannerdate"]))
            {
                Trannerdate = Convert.ToDateTime(form["Trannerdate"]);
            }
            string TrannerName = form["TrannerName"];

            string Transport = form["Transport"];
            string RouteId = form["RouteId"];


            // Wage & Compliance
            string MinimumWageCategory = form["MinimumWageCategory"];
            string WageType = form["WageType"];
            string WageDisbursementMode = form["WageDisbursementMode"];

            // Safety & Security
            string PPE = form["PPE"];
            string PPEType = form["PPEType"];
            string SafetyTrainingStatus = form["SafetyTrainingStatus"];
            string SiteInductionStatus = form["SiteInductionStatus"];
            string PoliceVerificationStatus = form["PoliceVerificationStatus"];

            // Temporary Gate Pass
            string TempIDStatus = form["TempIDStatus"];
            string TempIDNumber = form["TempIDNumber"];


            string FitnessTypes = form["FitnessTypes"];
            string NextMedicalDue = form["NextMedicalDue"];
            string MedicalStatus = form["MedicalStatus"];

            DateTime? TempIDDate = null;
            if (!string.IsNullOrWhiteSpace(form["TempIDDate"]))
            {
                TempIDDate = Convert.ToDateTime(form["TempIDDate"]);
            }

            // Permanent Gate Pass
            string PermanentIDStatus = form["PermanentIDStatus"];
            string PermanentIDNumber = form["PermanentIDNumber"];


            DateTime? PermanentIDDate = null;
            if (!string.IsNullOrWhiteSpace(form["PermanentIDDate"]))
            {
                PermanentIDDate = Convert.ToDateTime(form["PermanentIDDate"]);
            }

            string NomineeEmeail = form["NomineeEmeail"]; // new
            string NomineeMobile = form["NomineeMobile"]; // new
            string NomineePan = form["NomineePan"];  // new
            string NomineeAdhar = form["NomineeAdhar"]; // new
            string acholdername = form["acholdername"]; // new
            string bankname = form["bankname"]; // new
            string LWF = form["LWF"]; // new
            string WCPolicy = form["WCPolicy"]; // new
            string Country = form["Country"];  // new

            string sitelocation = form["sitelocation"]; // new
            string Sitestate = form["Sitestate"]; // new
            string TypeWork = form["TypeWork"]; // new
            string NatureJob = form["NatureJob"]; // new
            string Sdate = form["Sdate"]; // new
            string endate = form["endate"]; // new

            string PFNomineeName = form["PFNomineeName"]; // new
            string PFNomineeRelation = form["PFNomineeRelation"]; // new
            DateTime? PFNomineeDOB = null;
            if (!string.IsNullOrWhiteSpace(form["PFNomineeDOB"]))
            {
                PFNomineeDOB = Convert.ToDateTime(form["PFNomineeDOB"]);
            }
            string PFNomineeAddress = form["PFNomineeAddress"]; // new
            string PFNomineeMobile = form["PFNomineeMobile"]; // new
            string PFNomineeEmail = form["PFNomineeEmail"]; // new
            string ESINomineeName = form["ESINomineeName"]; // new
            string ESINomineeRelation = form["ESINomineeRelation"]; // new
          
            DateTime? ESINomineeDOB = null;
            if (!string.IsNullOrWhiteSpace(form["ESINomineeDOB"]))
            {
                ESINomineeDOB = Convert.ToDateTime(form["ESINomineeDOB"]);
            }
            string ESINomineeAddress = form["ESINomineeAddress"]; // new
            string ESINomineeMobile = form["ESINomineeMobile"]; // new
            string ESINomineeEmail = form["ESINomineeEmail"]; // new

            string BonusNomineeName = form["BonusNomineeName"]; // new
            string BonusNomineeRelation = form["BonusNomineeRelation"]; // new
            DateTime? BonusNomineeDOB = null;
            if (!string.IsNullOrWhiteSpace(form["BonusNomineeDOB"]))
            {
                BonusNomineeDOB = Convert.ToDateTime(form["BonusNomineeDOB"]);
            }
            string BonusNomineeAddress = form["BonusNomineeAddress"]; // new
            string BonusNomineeMobile = form["BonusNomineeMobile"]; // new
            string BonusNomineeEmail = form["BonusNomineeEmail"]; // new

            string OtherNomineeName = form["OtherNomineeName"]; // new
            string OtherNomineeRelation = form["OtherNomineeRelation"]; // new
            DateTime? OtherNomineeDOB = null;
            if (!string.IsNullOrWhiteSpace(form["OtherNomineeDOB"]))
            {
                OtherNomineeDOB = Convert.ToDateTime(form["OtherNomineeDOB"]);
            }
            string OtherNomineeAddress = form["OtherNomineeAddress"]; // new
            string OtherNomineeMobile = form["OtherNomineeMobile"]; // new
            string OtherNomineeEmail = form["OtherNomineeEmail"]; // new


            string WorkerGrade = form["WorkerGrade"]; // new
            string Religion = form["Religion"]; // new
            string Caste = form["Caste"]; // new

            string panCardFilePath = null;
            string chequePassbookFilePath = null;
            string educationCertificateFilePath = null;
            string experienceCertificateFilePath = null;
            string adhaarCardFrontSideFilePath = null;
            string adhaarCardBackSideFilePath = null;
            string relievingLetterFilePath = null;
            string payslipsFilePath = null;
            string photos1FilePath = null;
            string photos2FilePath = null;
            string photos3FilePath = null;
            string photos4FilePath = null;
            string MedicalCertificate_FilePath = null;
            string PANCopyFilePath = null;
            string AdharCopy_FilePath = null;


            string EmployeePhotos = null;
            //if (Convert.ToInt32(Id) == 0)
            //{
            if (!string.IsNullOrEmpty(form["EmployeePhotos"]))
            {
                EmployeePhotos = SaveFile(form["EmployeePhotos"], "EmployeePhotos");
            }
            if (!string.IsNullOrEmpty(form["PANCardFilePath"]))
            {
                panCardFilePath = SaveFile(form["PANCardFilePath"], "Employee");
            }
            if (!string.IsNullOrEmpty(form["Cheque_Passbook_FilePath"]))
            {
                chequePassbookFilePath = SaveFile(form["Cheque_Passbook_FilePath"], "Employee");
            }

            if (!string.IsNullOrEmpty(form["EducationCertificateFilePath"]))
            {
                educationCertificateFilePath = SaveFile(form["EducationCertificateFilePath"], "Employee");
            }
            if (!string.IsNullOrEmpty(form["ExperienceCertificateFilePath"]))
            {
                experienceCertificateFilePath = SaveFile(form["ExperienceCertificateFilePath"], "Employee");
            }
            if (!string.IsNullOrEmpty(form["AdhaarCard_FrontSide_FilePath"]))
            {
                adhaarCardFrontSideFilePath = SaveFile(form["AdhaarCard_FrontSide_FilePath"], "Employee");
            }
            if (!string.IsNullOrEmpty(form["AdhaarCard_BackSide_FilePath"]))
            {
                adhaarCardBackSideFilePath = SaveFile(form["AdhaarCard_BackSide_FilePath"], "Employee");
            }
            if (!string.IsNullOrEmpty(form["RelievingLetterfFilePath"]))
            {
                relievingLetterFilePath = SaveFile(form["RelievingLetterfFilePath"], "Employee");
            }
            if (!string.IsNullOrEmpty(form["PayslipsFilePath"]))
            {
                payslipsFilePath = SaveFile(form["PayslipsFilePath"], "Employee");
            }
            if (!string.IsNullOrEmpty(form["Photos_1_FilePath"]))
            {
                photos1FilePath = SaveFile(form["Photos_1_FilePath"], "Employee");
            }
            if (!string.IsNullOrEmpty(form["Photos_2_FilePath"]))
            {
                photos2FilePath = SaveFile(form["Photos_2_FilePath"], "Employee");
            }
            if (!string.IsNullOrEmpty(form["Photos_3_FilePath"]))
            {
                photos3FilePath = SaveFile(form["Photos_3_FilePath"], "Employee");
            }
            if (!string.IsNullOrEmpty(form["Photos_4_FilePath"]))
            {
                photos4FilePath = SaveFile(form["Photos_4_FilePath"], "Employee");
            }
            if (!string.IsNullOrEmpty(form["MedicalCertificate_FilePath"]))
            {
                MedicalCertificate_FilePath = SaveFile(form["MedicalCertificate_FilePath"], "Employee");
            }
            if (!string.IsNullOrEmpty(form["PANCopyFilePath"]))
            {
                PANCopyFilePath = SaveFile(form["PANCopyFilePath"], "Employee");
            }
            if (!string.IsNullOrEmpty(form["AdharCopy_FilePath"]))
            {
                AdharCopy_FilePath = SaveFile(form["AdharCopy_FilePath"], "Employee");
            }

            try
            {
                var employeeData = new RetialEmployeeManager
                {
                    Id = Id,
                    ActionType = actiontype,
                    PartyTypeId = PartyTypeId,
                    PartyId = PartyId,
                    UserId = UserId,
                    Status = Status,
                    EmployeePhotos = EmployeePhotos,
                    SuperVisior1 = SuperVisior1,
                    SuperVisior2 = SuperVisior2,
                    EmployeeCode = employeeCode,
                    RefEmployeeCode = RefEmployeeCode,
                    EmployeeName = employeeName,
                    EmployeeDesignation = employeeDesignation,
                    EmployeeDepartment = employeeDepartment,
                    Father_Husband_Name = fatherHusbandName,
                    Gendar = gender,
                    MaritalStatus = maritalStatus,
                    DateOfBirth = dateOfBirth,
                    PresentAddress = presentAddress,
                    PermanemtAddress = permanentAddress,
                    AdharCardNumber = adharCardNumber,
                    PANNumber = panNumber,
                    MobileNumber = mobileNumber,
                    AlternativeMobileNumber = alternativeMobileNumber,
                    EmployeeEmailID = employeeEmailID,
                    BankAccountNumber = bankAccountNumber,
                    BankIFSCCode = bankIFSCCode,
                    PreviousUAN = previousUAN,
                    PreviousESI = previousESI,
                    GrossSalary = grossSalary,
                    DOJ = doj,
                    IssueDate = IssueDate,
                    ValidTill = ValidTill,
                    BloodGroup = BloodGroup,
                    CampNumber = CampNumber,
                    NomineeName = nameofNominee,
                    NomineeAddress = addressofNominee,
                    NomineeRelation = relationofNominee,
                    NomineeDOB = dobofNominee,
                    StoreCode = storeCode,
                    PANCardFilePath = panCardFilePath,
                    Cheque_Passbook_FilePath = chequePassbookFilePath,
                    EducationCertificateFilePath = educationCertificateFilePath,
                    ExperienceCertificateFilePath = experienceCertificateFilePath,
                    AdhaarCard_FrontSide_FilePath = adhaarCardFrontSideFilePath,
                    AdhaarCard_BackSide_FilePath = adhaarCardBackSideFilePath,
                    RelievingLetterfFilePath = relievingLetterFilePath,
                    PayslipsFilePath = payslipsFilePath,
                    Photos_1_FilePath = photos1FilePath,
                    Photos_2_FilePath = photos2FilePath,
                    Photos_3_FilePath = photos3FilePath,
                    Photos_4_FilePath = photos4FilePath,
                    LeavingDate = LeavingDate,
                    PFAccount = PFAccount,
                    SiteId = SiteId,
                    MinimumWageCategory = MinimumWageCategory,
                    WageType = WageType,
                    WageDisbursementMode = WageDisbursementMode,

                    // Safety & Security
                    PPE = PPE,
                    PPEType = PPEType,
                    SafetyTrainingStatus = SafetyTrainingStatus,
                    SiteInductionStatus = SiteInductionStatus,
                    PoliceVerificationStatus = PoliceVerificationStatus,

                    TempIDStatus = TempIDStatus,
                    TempIDNumber = TempIDNumber,
                    TempIDDate = TempIDDate,
                    PermanentIDStatus = PermanentIDStatus,
                    PermanentIDNumber = PermanentIDNumber,
                    PermanentIDDate = PermanentIDDate,

                    Transport = Transport,
                    RouteId = RouteId,
                    state = State,
                    City = City,
                    Pincode = Pincode,

                    PState = PState, // added by aadarsh dated 06/06/2026
                    PCity = PCity, // added by aadarsh dated 06/06/2026
                    PPincode = PPincode, // added by aadarsh dated 06/06/2026
                    Trannerdate = Trannerdate, // added by aadarsh dated 06/06/2026
                    TrannerName = TrannerName, // added by aadarsh dated 06/06/2026

                    NomineeEmeail = NomineeEmeail, // added by aadarsh dated 18/06/2026
                    NomineeMobile = NomineeMobile, // added by aadarsh dated 18/06/2026
                    NomineePan = NomineePan, // added by aadarsh dated 18/06/2026
                    NomineeAdhar = NomineeAdhar, // added by aadarsh dated 18/06/2026
                    acholdername = acholdername, // added by aadarsh dated 18/06/2026
                    bankname = bankname, // added by aadarsh dated 18/06/2026
                    LWF = LWF, // added by aadarsh dated18/06/2026
                    WCPolicy = WCPolicy, // added by aadarsh dated 18/06/2026
                    Country = Country, // added by aadarsh dated 18/06/2026
                    PANCopyFilePath = PANCopyFilePath, // added by aadarsh dated 18/06/2026 
                    AdharCopy_FilePath = AdharCopy_FilePath, // added by aadarsh dated 18/06/2026

                    sitelocation = sitelocation, // added by aadarsh dated18/06/2026
                    Sitestate = Sitestate, // added by aadarsh dated 18/06/2026
                    TypeWork = TypeWork, // added by aadarsh dated 18/06/2026
                    NatureJob = NatureJob, // added by aadarsh dated 18/06/2026 
                    Sdate = Sdate, // added by aadarsh dated 18/06/2026
                    endate = endate, // added by aadarsh dated 18/06/2026
                    PFNomineeName = PFNomineeName, // new
                    PFNomineeRelation = PFNomineeRelation,// new
                    PFNomineeDOB = PFNomineeDOB,
                    PFNomineeAddress = PFNomineeAddress, // new
                    PFNomineeMobile = PFNomineeMobile, // new
                    PFNomineeEmail = PFNomineeEmail, // new
                    ESINomineeName = ESINomineeName, // new
                    ESINomineeRelation = ESINomineeRelation, // new
                    ESINomineeDOB = ESINomineeDOB, // new
                    ESINomineeAddress = ESINomineeAddress, // new
                    ESINomineeMobile = ESINomineeMobile, // new
                    ESINomineeEmail = ESINomineeEmail, // new
                    BonusNomineeName = BonusNomineeName, // new
                    BonusNomineeRelation = BonusNomineeRelation, // new
                    BonusNomineeDOB = BonusNomineeDOB, // new
                    BonusNomineeAddress = BonusNomineeAddress, // new
                    BonusNomineeMobile = BonusNomineeMobile, // new
                    BonusNomineeEmail = BonusNomineeEmail, // new
                    OtherNomineeName = OtherNomineeName, // new
                    OtherNomineeRelation = OtherNomineeRelation, // new
                    OtherNomineeDOB = OtherNomineeDOB,// new
                    OtherNomineeAddress = OtherNomineeAddress, // new
                    OtherNomineeMobile = OtherNomineeMobile, // new
                    OtherNomineeEmail = OtherNomineeEmail, // new

                    WorkerGrade = WorkerGrade, // new
                    Religion = Religion, // new
                    Caste = Caste, // new

                    MedicalCertificate_FilePath = MedicalCertificate_FilePath,
                    FitnessTypes = FitnessTypes,
                    MedicalStatus = MedicalStatus,
                    NextMedicalDue = NextMedicalDue
                };
                result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.InsertUpdateDelEmployeeMaster(employeeData)));
            }
            catch (Exception ex)
            {
                Console.WriteLine(ex.Message);
                throw;
            }
            return result;
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
                        folderPath = Server.MapPath("../DownloadMat/Retail/Employee/");
                    }
                    else if (For == "StoreLicense")
                    {
                        uploadpath = "../DownloadMat/Retail/StoreLicense/" + fileName;
                        folderPath = Server.MapPath("../DownloadMat/Retail/StoreLicense/");
                    }
                    else
                    {
                        uploadpath = "../DownloadMat/Retail/Store/" + fileName;
                        folderPath = Server.MapPath("../DownloadMat/Retail/Store/");
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
                        folderPath = Server.MapPath("../DownloadMat/Retail/Employee/");
                    }
                    else if (For == "StoreLicense")
                    {
                        uploadpath = "../DownloadMat/Retail/StoreLicense/" + fileName;
                        folderPath = Server.MapPath("../DownloadMat/Retail/StoreLicense/");
                    }
                    else
                    {
                        uploadpath = "../DownloadMat/Retail/Store/" + fileName;
                        folderPath = Server.MapPath("../DownloadMat/Retail/Store/");
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



        public async Task<string> UpdateDocumentForEmployee()
        {
            var form = Request.Form;
            string Id = form["Id"];
            //int actiontype = 5;
            string FieldName = form["FieldName"];
            string FilePath = form["FilePath"];
            int Loginid = 0;
            string panCardFilePath = null;
            if (!string.IsNullOrEmpty(form["FilePath"]))
            {
                panCardFilePath = SaveFile(form["FilePath"], "Employee");
            }

            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject
            (DAL.DLL.UpdateDocumentForEmployee(FieldName, panCardFilePath, Convert.ToInt32(Id), Loginid)));

            JObject jsonObject = JObject.Parse(result); // Parse JSON string into JObject

            int resultValue = jsonObject["Result"].Value<int>();

            if (resultValue == 2)
            {
                result = panCardFilePath;
            }
            return result;
        }



        /// <summary>
        /// Store Master
        /// </summary>
        /// <returns></returns>
        public ActionResult StoreMaster()
        {
            return View();
        }
        public async Task<string> GetStoreMaster(RetialStoreManager obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.GetStoreMaster(obj)));
            return result;
        }

        [HttpPost]
        public async Task<string> GetMasters(tblMasters obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.GetMasters(obj)));
            return result;
        }

        public async Task<string> GetStoreCodeNumber(tblMasters obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.GetStoreCodeNumber(obj)));
            return result;
        }

        public async Task<string> UpdateStoresStatus(StoreStatusList obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.UpdateStoresStatus(obj)));
            return result;
        }

        public async Task<string> GenerateEmployeeCode(tblMasters obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.GenerateEmployeeCode(obj)));
            return result;
        }
        public async Task<string> UpdateStatus()
        {
            RetialStoreManager obj = new RetialStoreManager();
            if (Request.Files.Count > 0)
            {

                var file = Request.Files[0]; // Get the uploaded file
                                             // Process the file (e.g., save it)
                string dir = "../DownloadMat/StoreLicDocument/";
                string dirPath = System.Web.HttpContext.Current.Server.MapPath(dir);
                if (!Directory.Exists(dirPath))
                {
                    Directory.CreateDirectory(dirPath);
                }
                string NewFileName = "";
                string strPassword = Guid.NewGuid().ToString("N").Substring(0, 4);
                NewFileName += strPassword;
                NewFileName += DateTime.Now.Year.ToString();
                NewFileName += DateTime.Now.Month.ToString();
                NewFileName += DateTime.Now.Day.ToString();
                string extention = ".pdf";
                string uploadpath = dir + NewFileName + extention;
                string filePath = System.Web.HttpContext.Current.Server.MapPath(uploadpath);
                //var filePath = Path.Combine(Server.MapPath("../Uploads"), file.FileName);
                file.SaveAs(filePath);
                obj.AdditionalDoc = uploadpath;
                obj.IsActive = Request.Form["IsActive"];
                obj.ActionType = Convert.ToInt32(Request.Form["ActionType"]);
                obj.StoreCode = Request.Form["StoreCode"];
                obj.DocumentName = Request.Form["DocumentName"];
                obj.LoginId = Convert.ToInt32(Request.Form["LoginId"]);
            }

            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.UpdateStatus(obj)));
            return result;
        }



        public async Task<string> InsertUpdateDelStoreMaster()
        {
            var form = Request.Form;
            string actiontype = Request.Form["ActionType"];
            int id = int.Parse(Request.Form["Id"]);
            //int partyTypeId = int.Parse(Request.Form["PartyTypeId"]);
            // string storeCode = Request.Form["StoreCode"];
            string RefStoreCode = Request.Form["RefStoreCode"];
            string storeName = Request.Form["StoreName"];
            string category = Request.Form["Category"];
            string Operationmodel = Request.Form["Operationmodel"];
            string ComplianceCategory = Request.Form["ComplianceCategory"];
            string completeAddress = Request.Form["CompleteAddress"];
            DateTime proposedDate = DateTime.Parse(Request.Form["ProposedDate"]);
            string storeLocation = Request.Form["StoreLocation"];
            string cityId = Request.Form["CityId"];
            string Country = Request.Form["Country"];
            //  float cityId = float.Parse(Request.Form["CityId"]);
            float circleId = float.Parse(Request.Form["CircleId"]);
            float regionId = float.Parse(Request.Form["RegionId"]);
            string zipCode = Request.Form["ZipCode"];
            string storeManagerName = Request.Form["StoreManagerName"];
            string storeManagerMobileNo = Request.Form["StoreManagerMobileNo"];
            string storeManagerEmail = Request.Form["StoreManagerEmail"];
            string areaManagerName = Request.Form["AreaManagerName"];
            string areaManagerMobileNo = Request.Form["AreaManagerMobileNo"];
            string areaManagerEmail = Request.Form["AreaManagerEmail"];
            string zonalManagerName = Request.Form["ZonalManagerName"];
            string zonalManagerMobileNo = Request.Form["ZonalManagerMobileNo"];
            string zonalManagerEmail = Request.Form["ZonalManagerEmail"];
            string circleHeadName = Request.Form["CircleHeadName"];
            string circleHeadMobileNo = Request.Form["CircleHeadMobileNo"];
            string circleHeadEmail = Request.Form["CircleHeadEmail"];
            string regionalHeadName = Request.Form["RegionalHeadName"];
            string regionalHeadMobileNo = Request.Form["RegionalHeadMobileNo"];
            string regionalHeadEmail = Request.Form["RegionalHeadEmail"];
            string corporateHeadName = Request.Form["CorporateHeadName"];
            string corporateHeadMobileNo = Request.Form["CorporateHeadMobileNo"];
            string corporateHeadEmail = Request.Form["CorporateHeadEmail"];


            string ExecutionLevel1 = Request.Form["ExecutionLevel1"];
            string ExecutionLevel2 = Request.Form["ExecutionLevel2"];
            string ExecutionLevel3 = Request.Form["ExecutionLevel3"];
            string ExecutionLevel4 = Request.Form["ExecutionLevel4"];
            string ExecutionLevel5 = Request.Form["ExecutionLevel5"];
            string SelectDuedatefor = Request.Form["SelectDuedatefor"];


            string LicenseD = Request.Form["LicenseD"];
            string LicenseDaysOfExpire = Request.Form["LicenseDaysOfExpire"];
            string LicenseED = Request.Form["LicenseED"];

            string Labour = Request.Form["Labour"];
            string LabourDaysOfExpire = Request.Form["LabourDaysOfExpire"];
            string LabourED = Request.Form["LabourED"];

            string FactoryD = Request.Form["FactoryD"];
            string FactoryDaysOfExpire = Request.Form["FactoryDaysOfExpire"];
            string FactoryED = Request.Form["FactoryED"];

            string FinanceD = Request.Form["FinanceD"];
            string FinanceDaysOfExpire = Request.Form["FinanceDaysOfExpire"];
            string FinanceED = Request.Form["FinanceED"];

            string SecraterialD = Request.Form["SecraterialD"];
            string SecraterialDaysOfExpire = Request.Form["SecraterialDaysOfExpire"];
            string SecraterialED = Request.Form["SecraterialED"];

            string State = Request.Form["State"];







            string sqftStoreArea = Request.Form["SQFTStoreArea"];
            string isActive = Request.Form["IsActive"];
            int loginId = int.Parse(Request.Form["LoginId"]);
            int DaysOfExpire = 0;
            var value = Request.Form["DaysOfExpire"];

            if (!string.IsNullOrWhiteSpace(value))
            {
                int.TryParse(value, out DaysOfExpire);
            }
            //int DaysOfExpire = int.Parse(Request.Form["DaysOfExpire"]);
            int LED = int.TryParse(Request.Form["LED"], out var val) ? val : 0;

            string ElectricityBillFilePath = null;
            string RentAgreementFilePath = null;

            string propertyTaxPaidReceiptFilePath = null;
            string buildingPlanFilePath = null;
            string stabilityStructureCertificateFilePath = null;
            string completionCertificateFilePath = null;

            DateTime? ElectricityBillPeriodUpTo = null;

            var chk = Request.Form["ElectricityBillPeriodUpTo"];
            if (Request.Form["ElectricityBillPeriodUpTo"] != null && Request.Form["ElectricityBillPeriodUpTo"] != "")
            {
                ElectricityBillPeriodUpTo = DateTime.Parse(Request.Form["ElectricityBillPeriodUpTo"]);
            }

            DateTime? LeasePaidReceiptPeriodUpTo = null;
            if (Request.Form["LeasePaidReceiptPeriodUpTo"] != null && Request.Form["LeasePaidReceiptPeriodUpTo"] != "")
            {
                LeasePaidReceiptPeriodUpTo = DateTime.Parse(Request.Form["LeasePaidReceiptPeriodUpTo"]);
            }

            DateTime? PropertyTaxPeriodUpTo = null;
            if (Request.Form["PropertyTaxPeriodUpTo"] != null && Request.Form["PropertyTaxPeriodUpTo"] != "")
            {
                PropertyTaxPeriodUpTo = DateTime.Parse(Request.Form["PropertyTaxPeriodUpTo"]);
            }

            DateTime? FireNocPeriodUpTo = null;
            if (Request.Form["FireNocPeriodUpTo"] != null && Request.Form["FireNocPeriodUpTo"] != "")
            {
                FireNocPeriodUpTo = DateTime.Parse(Request.Form["FireNocPeriodUpTo"]);
            }

            DateTime? PollutionPeriodUpTo = null;
            if (Request.Form["PollutionPeriodUpTo"] != null && Request.Form["PollutionPeriodUpTo"] != "")
            {
                PollutionPeriodUpTo = DateTime.Parse(Request.Form["PollutionPeriodUpTo"]);
            }

            DateTime? OwnershipDocPeriodUpTo = null;
            if (Request.Form["OwnershipDocPeriodUpTo"] != null && Request.Form["OwnershipDocPeriodUpTo"] != "")
            {
                OwnershipDocPeriodUpTo = DateTime.Parse(Request.Form["OwnershipDocPeriodUpTo"]);
            }

            DateTime? AdditionalDocPeriodUpTo = null;
            if (Request.Form["AdditionalDocPeriodUpTo"] != null && Request.Form["AdditionalDocPeriodUpTo"] != "")
            {
                AdditionalDocPeriodUpTo = DateTime.Parse(Request.Form["AdditionalDocPeriodUpTo"]);
            }

            DateTime? LeaseFromDate = null;
            if (Request.Form["LeaseFromDate"] != null && Request.Form["LeaseFromDate"] != "")
            {
                LeaseFromDate = DateTime.Parse(Request.Form["LeaseFromDate"]);
            }

            //Start insurance

            DateTime? InsuranceFromDate = null;
            if (Request.Form["InsuranceFromDate"] != null && Request.Form["InsuranceFromDate"] != "")
            {
                InsuranceFromDate = DateTime.Parse(Request.Form["InsuranceFromDate"]);
            }

            DateTime? InsurancePaidReceiptPeriodUpTo = null;
            if (Request.Form["InsurancePaidReceiptPeriodUpTo"] != null && Request.Form["InsurancePaidReceiptPeriodUpTo"] != "")
            {
                InsurancePaidReceiptPeriodUpTo = DateTime.Parse(Request.Form["InsurancePaidReceiptPeriodUpTo"]);
            }
            string InsurancePaidReceiptRemark = Request.Form["InsurancePaidReceiptRemark"];
            //end
            string ElectricityBillRemark = Request.Form["ElectricityBillRemark"];
            string LeasePaidReceiptRemark = Request.Form["LeasePaidReceiptRemark"];
            string PropertyTaxRemark = Request.Form["PropertyTaxRemark"];
            string FireNocRemark = Request.Form["FireNocRemark"];
            string PollutionRemark = Request.Form["PollutionRemark"];
            string OwnershipDocRemark = Request.Form["OwnershipDocRemark"];
            string AdditionalDocRemark = Request.Form["AdditionalDocRemark"];


            if (!string.IsNullOrEmpty(form["ElectricityBill"]))
            {
                if (form["ElectricityBill"].Contains("../DownloadMat/"))
                {
                    ElectricityBillFilePath = form["ElectricityBill"];
                }
                else
                {
                    ElectricityBillFilePath = SaveFile(form["ElectricityBill"], "Store");
                }

            }
            if (!string.IsNullOrEmpty(form["RentAgreement"]))
            {
                if (form["RentAgreement"].Contains("../DownloadMat/"))
                {
                    RentAgreementFilePath = form["RentAgreement"];
                }
                else
                {
                    RentAgreementFilePath = SaveFile(form["RentAgreement"], "Store");
                }
            }
            if (!string.IsNullOrEmpty(form["PropertyTaxPaidReceipt"]))
            {
                if (form["PropertyTaxPaidReceipt"].Contains("../DownloadMat/"))
                {
                    propertyTaxPaidReceiptFilePath = form["PropertyTaxPaidReceipt"];
                }
                else
                {
                    propertyTaxPaidReceiptFilePath = SaveFile(form["PropertyTaxPaidReceipt"], "Store");
                }
            }
            if (!string.IsNullOrEmpty(form["BuildingPlan"]))
            {
                if (form["BuildingPlan"].Contains("../DownloadMat/"))
                {
                    buildingPlanFilePath = form["BuildingPlan"];
                }
                else
                {
                    buildingPlanFilePath = SaveFile(form["BuildingPlan"], "Store");
                }
            }
            if (!string.IsNullOrEmpty(form["StabilityStructureCertificate"]))
            {
                if (form["StabilityStructureCertificate"].Contains("../DownloadMat/"))
                {
                    stabilityStructureCertificateFilePath = form["StabilityStructureCertificate"];
                }
                else
                {
                    stabilityStructureCertificateFilePath = SaveFile(form["StabilityStructureCertificate"], "Store");
                }
            }
            if (!string.IsNullOrEmpty(form["CompletionCertificate"]))
            {
                if (form["CompletionCertificate"].Contains("../DownloadMat/"))
                {
                    completionCertificateFilePath = form["CompletionCertificate"];
                }
                else
                {
                    completionCertificateFilePath = SaveFile(form["CompletionCertificate"], "Store");
                }
            }


            var storeobj = new RetialStoreManager
            {
                Id = Convert.ToInt32(id),
                ActionType = Convert.ToInt32(actiontype),
                //PartyTypeId = Convert.ToInt32(partyTypeId),
                RefStoreCode = RefStoreCode,
                StoreName = storeName,
                Category = category,
                ComplianceCategory = ComplianceCategory,
                Operationmodel = Operationmodel,
                CompleteAddress = completeAddress,
                ProposedDate = proposedDate,
                StoreLocation = storeLocation,
                CityId = cityId,
                CountryId = Country,

                CircleId = circleId,
                RegionId = regionId,
                ZipCode = zipCode,
                StoreManagerName = storeManagerName,
                StoreManagerMobileNo = storeManagerMobileNo,
                StoreManagerEmail = storeManagerEmail,
                AreaManagerName = areaManagerName,
                AreaManagerMobileNo = areaManagerMobileNo,
                AreaManagerEmail = areaManagerEmail,
                ZonalManagerName = zonalManagerName,
                ZonalManagerMobileNo = zonalManagerMobileNo,
                ZonalManagerEmail = zonalManagerEmail,
                CircleHeadName = circleHeadName,
                CircleHeadMobileNo = circleHeadMobileNo,
                CircleHeadEmail = circleHeadEmail,
                RegionalHeadName = regionalHeadName,
                RegionalHeadMobileNo = regionalHeadMobileNo,
                RegionalHeadEmail = regionalHeadEmail,
                CorporateHeadName = corporateHeadName,
                CorporateHeadMobileNo = corporateHeadMobileNo,
                CorporateHeadEmail = corporateHeadEmail,
                SQFTStoreArea = sqftStoreArea,
                IsActive = isActive,
                ElectricityBill = ElectricityBillFilePath,
                RentAgreement = RentAgreementFilePath,
                PropertyTaxPaidReceipt = propertyTaxPaidReceiptFilePath,
                BuildingPlan = buildingPlanFilePath,
                StabilityStructureCertificate = stabilityStructureCertificateFilePath,
                CompletionCertificate = completionCertificateFilePath,
                LoginId = loginId,
                DaysOfExpire = DaysOfExpire,
                LED = LED,
                ElectricityBillPeriodUpTo = ElectricityBillPeriodUpTo,
                LeasePaidReceiptPeriodUpTo = LeasePaidReceiptPeriodUpTo,
                PropertyTaxPeriodUpTo = PropertyTaxPeriodUpTo,
                FireNocPeriodUpTo = FireNocPeriodUpTo,
                PollutionPeriodUpTo = PollutionPeriodUpTo,
                OwnershipDocPeriodUpTo = OwnershipDocPeriodUpTo,
                AdditionalDocPeriodUpTo = AdditionalDocPeriodUpTo,
                LeaseFromDate = LeaseFromDate,
                ElectricityBillRemark = ElectricityBillRemark,
                LeasePaidReceiptRemark = LeasePaidReceiptRemark,
                PropertyTaxRemark = PropertyTaxRemark,
                FireNocRemark = FireNocRemark,
                PollutionRemark = PollutionRemark,
                OwnershipDocRemark = OwnershipDocRemark,
                AdditionalDocRemark = AdditionalDocRemark,
                ExecutionLevel1 = ExecutionLevel1,
                ExecutionLevel2 = ExecutionLevel2,
                ExecutionLevel3 = ExecutionLevel3,
                ExecutionLevel4 = ExecutionLevel4,
                ExecutionLevel5 = ExecutionLevel5,
                SelectDuedatefor = SelectDuedatefor,



                LicenseD = LicenseD,
                LicenseDaysOfExpire = LicenseDaysOfExpire,
                LicenseED = LicenseED,

                Labour = Labour,
                LabourDaysOfExpire = LabourDaysOfExpire,
                LabourED = LabourED,

                FactoryD = FactoryD,
                FactoryDaysOfExpire = FactoryDaysOfExpire,
                FactoryED = FactoryED,
                FinanceD = FinanceD,
                FinanceDaysOfExpire = FinanceDaysOfExpire,
                FinanceED = FinanceED,
                SecraterialD = SecraterialD,
                SecraterialDaysOfExpire = SecraterialDaysOfExpire,
                SecraterialED = SecraterialED,
                State = State,
                InsuranceFromDate = InsuranceFromDate,
                InsurancePaidReceiptPeriodUpTo = InsurancePaidReceiptPeriodUpTo,
                InsurancePaidReceiptRemark = InsurancePaidReceiptRemark

            };


            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.InsertUpdateDelStoreMaster(storeobj)));
            return result;
        }


        /// <summary>
        /// Dashboard
        /// </summary>
        /// <returns></returns>
        /// 
        public ActionResult Dashboard()
        {
            return View();
        }

        /// <summary>
        /// NewsLetterDetail
        /// </summary>
        /// <returns></returns>
        /// 
        public ActionResult NewsLetterDetail(int id)
        {
            ViewBag.Id = id;
            return View();
        }

        public ActionResult NewsLetterDetailAll()
        {
            return View();
        }


        /// <summary>
        /// Dashboard
        /// </summary>
        /// <returns></returns>
        /// 
        public ActionResult ComplianceDoc()
        {
            return View();
        }



        [HttpPost]
        public virtual string UploadFilesBulk()
        {
            try
            {
                // Check if any files are received
                if (Request.Files.Count == 0)
                {
                    return "No files received.";
                }

                // Log the number of files received
                System.Diagnostics.Debug.WriteLine($"Received {Request.Files.Count} files.");

                string storeId = Request.Form["StoreId"];
                string uniqueDirName = Request.Form["Directory"];
                string baseUploadPath = System.Web.HttpContext.Current.Server.MapPath($"~/DownloadMat/ComplianceBulk/{uniqueDirName}/");

                // Create a new directory for the batch upload if it doesn't exist
                if (!Directory.Exists(baseUploadPath))
                {
                    System.Diagnostics.Debug.WriteLine("Directory doesn't exist, creating now...");
                    Directory.CreateDirectory(baseUploadPath);
                }

                // Iterate through the Request.Files collection to save all files
                foreach (string fileKey in Request.Files)
                {
                    var file = Request.Files[fileKey];
                    if (file != null && file.ContentLength > 0)
                    {
                        string savePath;
                        string uploadPath;

                        // Log file details
                        System.Diagnostics.Debug.WriteLine($"Processing file: {file.FileName}, Type: {file.ContentType}, Size: {file.ContentLength} bytes.");

                        // Check for Excel file or CSV
                        if (file.ContentType == "application/vnd.ms-excel" || file.FileName.EndsWith(".csv"))
                        {
                            // Generate a new unique name for the file
                            string newFileName = $"{Guid.NewGuid().ToString("N").Substring(0, 4)}_{DateTime.Now:yyyyMMdd_HHmmssfff}.csv";
                            uploadPath = $"~/DownloadMat/ComplianceBulk/{uniqueDirName}/{newFileName}";
                            savePath = System.Web.HttpContext.Current.Server.MapPath(uploadPath);

                            // Log the upload path
                            System.Diagnostics.Debug.WriteLine($"Saving Excel/CSV file with new name: {newFileName}");

                            // Process the Excel file (call your custom method to process it)
                            Updateexcel(file.FileName, uploadPath, storeId);
                        }
                        else
                        {
                            // For other file types, use the original name
                            uploadPath = $"~/DownloadMat/ComplianceBulk/{uniqueDirName}/{file.FileName}";
                            savePath = System.Web.HttpContext.Current.Server.MapPath(uploadPath);

                            // Log the upload path for non-Excel files
                            System.Diagnostics.Debug.WriteLine($"Saving non-Excel file with original name: {file.FileName}");
                        }

                        // Save the file
                        file.SaveAs(savePath);

                        // Log successful file save
                        System.Diagnostics.Debug.WriteLine($"File saved to: {savePath}");
                    }
                    else
                    {
                        // Log if the file is invalid
                        System.Diagnostics.Debug.WriteLine($"Invalid file or file length is 0 for: {fileKey}");
                    }
                }

                return $"Files uploaded successfully to {uniqueDirName} folder.";
            }
            catch (Exception ex)
            {
                // Catch any exception that occurs and log it
                System.Diagnostics.Debug.WriteLine($"Error occurred: {ex.Message}");
                return $"An error occurred while uploading files: {ex.Message}";
            }
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
        public ActionResult ComplianceHistory()
        {
            return View();
        }
        /// <summary>
        /// Dashboard
        /// </summary>
        /// <returns></returns>
        /// 
        public ActionResult LicenseMaster()
        {
            return View();
        }

        public ActionResult LicenseMaster1()
        {
            return View();
        }

        public ActionResult LicenseExpireMaster()
        {
            return View();
        }
        public ActionResult profile()
        {
            return View();
        }

        public ActionResult documents()
        {
            return View();
        }

        public ActionResult licenseMasterBulkP()
        {
            return View();
        }

        public ActionResult checkout()
        {
            return View();
        }

        public ActionResult paymentOption()
        {
            return View();
        }

        public ActionResult thankyou()
        {

            return View();
        }

        public async Task<string> GetLicenseMaster(RetailLicenseDocuementMaster obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.GetLicenseMaster(obj)));
            return result;
        }
        public async Task<string> oldUploadDoc(StoreLicesensDocument obj)
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
                    string uploadpath = "../DownloadMat/StoreLicDocument/" + NewFileName + extention;
                    string filePath = System.Web.HttpContext.Current.Server.MapPath(uploadpath);
                    FileStream file = new FileStream(filePath, FileMode.Create, FileAccess.Write);
                    imageStream.WriteTo(file);
                    file.Close();
                    imageStream.Close();
                    obj.UFile = uploadpath;
                }
            }
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.UploadDoc(obj)));
            return result;
        }


        public async Task<string> UploadDoc()
        {
            try
            {
                Debug.WriteLine("UploadDoc method called!");

                if (Request.Files.Count == 0)
                {
                    Debug.WriteLine("No file uploaded! Request.Files.Count = " + Request.Files.Count);
                    return JsonConvert.SerializeObject(new { success = false, message = "No file uploaded!" });
                }

                var file = Request.Files[0];

                if (file == null || file.ContentLength <= 0)
                {
                    Debug.WriteLine("Invalid file: " + (file == null ? "null" : "Empty File"));
                    return JsonConvert.SerializeObject(new { success = false, message = "Invalid file!" });
                }

                Debug.WriteLine("File received: " + file.FileName + " | Size: " + file.ContentLength);

                // ✅ Get File Extension
                string fileExtension = Path.GetExtension(file.FileName);
                string allowedExtensions = ".pdf,.jpg,.png,.docx";

                if (!allowedExtensions.Contains(fileExtension.ToLower()))
                {
                    Debug.WriteLine("Invalid file type: " + fileExtension);
                    return JsonConvert.SerializeObject(new { success = false, message = "Invalid file type!" });
                }

                // ✅ Define Upload Directory
                string dir = "../DownloadMat/StoreLicDocument/";
                string dirPath = System.Web.HttpContext.Current.Server.MapPath(dir);

                if (!Directory.Exists(dirPath))
                    Directory.CreateDirectory(dirPath);

                // ✅ Generate Unique File Name
                string uniqueName = $"{Guid.NewGuid().ToString("N").Substring(0, 6)}_{DateTime.Now:yyyyMMddHHmmss}{fileExtension}";
                string uploadPath = Path.Combine(dirPath, uniqueName);
                string fileUrl = $"{dir}{uniqueName}";

                Debug.WriteLine("Saving file at: " + uploadPath);

                // ✅ Save File
                file.SaveAs(uploadPath);

                // ✅ Store Data in Object
                StoreLicesensDocument obj = new StoreLicesensDocument
                {
                    UFile = fileUrl,
                    ActionType = Convert.ToInt32(Request.Form["ActionType"]),
                    StoreId = Convert.ToInt32(Request.Form["StoreId"]),
                    LicenseId = Convert.ToInt32(Request.Form["LicenseId"]),
                    Id = Convert.ToInt32(Request.Form["Id"])
                };

                Debug.WriteLine("Saving to database...");
                string result = await Task.Run(() => JsonConvert.SerializeObject(DAL.DLL.UploadDoc(obj)));

                Debug.WriteLine("Upload successful!");
                return result;
            }
            catch (Exception ex)
            {
                Debug.WriteLine("Error: " + ex.Message);
                return JsonConvert.SerializeObject(new { success = false, message = ex.Message });
            }
        }

        public async Task<string> InsertUpdateDelStoreDocumentMaster()
        {
            var form = Request.Form;
            int Id = Convert.ToInt32(Request.Form["Id"] ?? "0");
            int IsActive = int.Parse(Request.Form["IsActive"]);
            int actiontype = int.Parse(Request.Form["ActionType"]);
            long storeid = long.Parse(Request.Form["StoreId"]);
            int loginId = int.Parse(Request.Form["LoginId"]);
            int LicenseId = int.Parse(Request.Form["LicenseId"]);

            string DName = Request.Form["DName"].ToString();
            if (Request.Form["DName"].ToString() == "null") { DName = ""; } else { DName = Request.Form["DName"].ToString(); }

            string DFatherName = "";
            if (Request.Form["DFatherName"].ToString() == "null") { DFatherName = ""; } else { DFatherName = Request.Form["DFatherName"].ToString(); }

            string DAddress = "";
            if (Request.Form["DAddress"].ToString() == "null") { DAddress = ""; } else { DAddress = Request.Form["DAddress"].ToString(); }

            string DAadhaarNo = "";
            if (Request.Form["DAadhaarNo"].ToString() == "null") { DAadhaarNo = ""; } else { DAadhaarNo = Request.Form["DAadhaarNo"].ToString(); }

            string DPanNo = "";
            if (Request.Form["DPanNo"].ToString() == "null") { DPanNo = ""; } else { DPanNo = Request.Form["DPanNo"].ToString(); }

            //DateTime DDateOfBirth = DateTime.Parse(Request.Form["DDateOfBirth"]);
            DateTime DDateOfBirth;

            if (string.IsNullOrEmpty(Request.Form["DDateOfBirth"].ToString())) { DDateOfBirth = DateTime.Parse("1900-01-01"); } else { DDateOfBirth = DateTime.Parse(Request.Form["DDateOfBirth"]); }


            string DEmailId = "";
            if (Request.Form["DEmailId"].ToString() == "null") { DEmailId = ""; } else { DEmailId = Request.Form["DEmailId"].ToString(); }

            string DMobileNo = "";
            if (Request.Form["DMobileNo"].ToString() == "null") { DMobileNo = ""; } else { DMobileNo = Request.Form["DMobileNo"].ToString(); }

            string AName = "";
            if (Request.Form["AName"].ToString() == "null") { AName = ""; } else { AName = Request.Form["AName"].ToString(); }

            string AFatherName = "";
            if (Request.Form["AFatherName"].ToString() == "null") { AFatherName = ""; } else { AFatherName = Request.Form["AFatherName"].ToString(); }

            string AAddress = "";
            if (Request.Form["AAddress"].ToString() == "null") { AAddress = ""; } else { AAddress = Request.Form["AAddress"].ToString(); }

            string AAadhaarNo = "";
            if (Request.Form["AAadhaarNo"].ToString() == "null") { AAadhaarNo = ""; } else { AAadhaarNo = Request.Form["AAadhaarNo"].ToString(); }

            string APanNo = "";
            if (Request.Form["APanNo"].ToString() == "null") { APanNo = ""; } else { APanNo = Request.Form["APanNo"].ToString(); }

            //DateTime ADateOfBirth = DateTime.Parse(Request.Form["ADateOfBirth"]);

            DateTime ADateOfBirth;

            if (string.IsNullOrEmpty(Request.Form["ADateOfBirth"].ToString())) { ADateOfBirth = DateTime.Parse("1900-01-01"); } else { ADateOfBirth = DateTime.Parse(Request.Form["ADateOfBirth"]); }



            string AEmailId = "";
            if (Request.Form["AEmailId"].ToString() == "null") { AEmailId = ""; } else { AEmailId = Request.Form["AEmailId"].ToString(); }

            string AMobileNo = "";
            if (Request.Form["AMobileNo"].ToString() == "null") { AMobileNo = ""; } else { AMobileNo = Request.Form["AMobileNo"].ToString(); }

            string NatureofBusiness = "";
            if (Request.Form["NatureofBusiness"].ToString() == "null") { NatureofBusiness = ""; } else { NatureofBusiness = Request.Form["NatureofBusiness"].ToString(); }

            //DateTime DateofCommencement = DateTime.Parse(Request.Form["DateofCommencement"]);

            DateTime DateofCommencement;

            if (string.IsNullOrEmpty(Request.Form["DateofCommencement"].ToString())) { DateofCommencement = DateTime.Parse("1900-01-01"); } else { DateofCommencement = DateTime.Parse(Request.Form["DateofCommencement"]); }


            string ProductCategory = "";
            if (Request.Form["ProductCategory"].ToString() == "null") { ProductCategory = ""; } else { ProductCategory = Request.Form["ProductCategory"].ToString(); }

            string AadhaarRegisteredofficeAddressNo = "";
            if (Request.Form["AadhaarRegisteredofficeAddressNo"].ToString() == "null") { AadhaarRegisteredofficeAddressNo = ""; } else { AadhaarRegisteredofficeAddressNo = Request.Form["AadhaarRegisteredofficeAddressNo"].ToString(); }

            string AadhaarCardofDirectorPath = null;
            string PANCardofDirectorPath = null;
            string PassportSizePhotoPath1 = null;
            string AuthorizationLetterPath = null;
            string AadhaarCardofAuthorizedPath = null;
            string PANCardPath = null;
            string PassportSizePhotoPath2 = null;
            string ElectricityBillPath = null;
            string SaledeedRentAgreementPath = null;
            string FSMSPlanPath = null;
            string FormIXPath = null;
            string WaterTestReportPath = null;

            //if (Convert.ToInt32(Id) == 0)
            //{

            if (!string.IsNullOrEmpty(form["AadhaarCardofDirector"]))
            {
                AadhaarCardofDirectorPath = SaveFile(form["AadhaarCardofDirector"], "StoreLicense");
            }
            if (!string.IsNullOrEmpty(form["PANCardofDirector"]))
            {
                PANCardofDirectorPath = SaveFile(form["PANCardofDirector"], "StoreLicense");
            }
            if (!string.IsNullOrEmpty(form["PassportSizePhoto"]))
            {
                PassportSizePhotoPath1 = SaveFile(form["PassportSizePhoto"], "StoreLicense");
            }

            if (!string.IsNullOrEmpty(form["AuthorizationLetter"]))
            {
                AuthorizationLetterPath = SaveFile(form["AuthorizationLetter"], "StoreLicense");
            }

            if (!string.IsNullOrEmpty(form["AadhaarCardofAuthorized"]))
            {
                AadhaarCardofAuthorizedPath = SaveFile(form["AadhaarCardofAuthorized"], "StoreLicense");
            }
            if (!string.IsNullOrEmpty(form["PANCardPath"]))
            {
                PANCardPath = SaveFile(form["PANCardPath"], "StoreLicense");
            }
            if (!string.IsNullOrEmpty(form["PassportSizePhotoPath2"]))
            {
                PassportSizePhotoPath2 = SaveFile(form["PassportSizePhotoPath2"], "StoreLicense");
            }
            if (!string.IsNullOrEmpty(form["ElectricityBill"]))
            {
                ElectricityBillPath = SaveFile(form["ElectricityBill"], "StoreLicense");
            }

            if (!string.IsNullOrEmpty(form["SaledeedRentAgreement"]))
            {
                SaledeedRentAgreementPath = SaveFile(form["SaledeedRentAgreement"], "StoreLicense");
            }

            if (!string.IsNullOrEmpty(form["FSMSPlan"]))
            {
                FSMSPlanPath = SaveFile(form["FSMSPlan"], "StoreLicense");
            }


            if (!string.IsNullOrEmpty(form["FormIX"]))
            {
                FormIXPath = SaveFile(form["FormIX"], "StoreLicense");
            }

            if (!string.IsNullOrEmpty(form["WaterTestReport"]))
            {
                WaterTestReportPath = SaveFile(form["WaterTestReport"], "StoreLicense");
            }
            //}
            var storeobj = new StoreLicesensDocument
            {
                Id = Convert.ToInt32(Id),
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
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.InsertUpdateDelStoreDocumentMaster(storeobj)));
            return result;
        }


        public async Task<string> GetStoreDocumentDetails(StoreLicesensDocument obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.GetStoreDocumentDetails(obj)));
            return result;
        }

        public async Task<string> ApproveLicense(StoreLicesensDocument obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.ApproveLicense(obj)));
            return result;
        }


        public async Task<string> ReportLicenseRequestData(LicenseRequest obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.ReportLicenseRequestData(obj)));
            return result;
        }
        public async Task<string> LicenseRequestData(LicenseRequest obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.LicenseRequestData(obj)));
            return result;
        }
        public async Task<string> GetStatusMaster(tblMasters obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.GetStatusMaster(obj)));
            return result;
        }
        public async Task<string> StoreComplianceStatusMaster(TblPartyMaster obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.StoreComplianceStatusMaster(obj)));
            return result;
        }

        public async Task<string> InsertUpdateDelLicenseRequest()
        {
            try
            {
                var form = Request.Form;

                // **Parsing Form Data Safely**
                int.TryParse(form["UserId"], out int userId);
                int.TryParse(form["Action"], out int action);
                long.TryParse(form["LicenceRequestId"], out long licenceRequestId);

                string applicationStatus = form["ApplicationStatus"];
                string applicationDate = GetValidDate(form["ApplicationDate"]);
                string actualCost = form["ActualCost"];
                string govtFees = form["GovtFees"];

                string uploadApplicationCopy = form["UploadApplicationCopy"];
                string uploadChallanCopy = form["UploadChallanCopy"];
                string uploadFeesCopy = form["UploadFeesCopy"];
                string licenseStatus = form["LicenseStatus"];
                string licenseDate = GetValidDate(form["IssuedDate"]);
                string licenseNumber = form["LicenseNumber"];
                string MachineNumber = form["MachineNumber"];
                string validityStartDate = form["ValidityStartDate"];
                string validityEndDate = form["ValidityEndDate"];
                string uploadLicenseCopy = form["UploadLicenseCopy"];
                string Remark = form["Remark"];
                string userName = form["UserName"];
                string userPassword = form["UserPassword"];
                string mobileNumber = form["MobileNumber"];
                string emailId = form["EmailId"];
                string tentativeDateOfComp = GetValidDate(form["TentativeDateofComp"]);
                string natureOfBusiness = form["NatureofBusiness"];
                string invoiceStatus = form["InvoiceStatus"];
                string invoiceDate = GetValidDate(form["InvoiceDate"]);
                string invoiceNo = form["InvoiceNo"];
                string invoiceAmount = form["InvoiceAmount"];
                string uploadInvoice = form["UploadInvoice"];
                string paymentStatus = form["PaymentStatus"];
                string LicenseCategory = form["LicenseCategory"];
                string paymentTAT = string.IsNullOrEmpty(form["PaymentTAT"]) ? "0" : form["PaymentTAT"];
                string renewalStatus = form["RenewalStatus"];
                string uploadRenewedCopy = form["UploadRenewedCopy"];
                string renewalStartDate = GetValidDate(form["RenewalStartDate"]);
                string renewalEndDate = GetValidDate(form["RenewalEndDate"]);

                // **Handling File Uploads More Efficiently**
                string uploadApplicationCopyPath = GetFilePath(form["UploadApplicationCopy"], form["AUploadApplicationCopy"], "LicenseRequest");
                string uploadChallanCopyPath = GetFilePath(form["UploadChallanCopy"], form["AUploadChallanCopy"], "LicenseRequest");
                string uploadFeesCopyPath = GetFilePath(form["UploadFeesCopy"], form["AUploadFeesCopy"], "LicenseRequest");
                string uploadLicenseCopyPath = GetFilePath(form["UploadLicenseCopy"], form["AUploadLicenseCopy"], "LicenseRequest");
                string uploadAcknowledgementPath = GetFilePath(form["UploadAcknowledgement"], form["AUploadAcknowledgement"], "LicenseRequest");
                string UploadAmendmentCopyPath = GetFilePath(form["UploadAmendmentCopy"], form["AUploadAmendmentCopy"], "LicenseRequest");
                string uploadRenewedCopyPath = GetFilePath(form["UploadRenewedCopy"], form["AUploadRenewedCopy"], "LicenseRequest");
                string uploadInvoicePath = GetFilePath(form["UploadInvoice"], form["AUploadInvoice"], "LicenseRequest");

                // **Creating License Request Object**
                LicenseRequest obj = new LicenseRequest
                {
                    UserId = userId,
                    Action = action,
                    LicenceRequestId = licenceRequestId,
                    ApplicationStatus = applicationStatus,
                    ApplicationDate = applicationDate,
                    UploadApplicationCopy = uploadApplicationCopyPath,
                    UploadChallanCopy = uploadChallanCopyPath,
                    UploadFeesCopy = uploadFeesCopyPath,
                    LicenseStatus = licenseStatus,
                    LicenseDate = licenseDate,
                    LicenseNumber = licenseNumber,
                    MachineNumber = MachineNumber,
                    ValidityStartDate = validityStartDate,
                    ValidityEndDate = validityEndDate,
                    LicenseCategory = LicenseCategory,
                    UploadLicenseCopy = uploadLicenseCopyPath,
                    UploadAmendmentCopy = UploadAmendmentCopyPath,
                    UploadRenewedCopy = uploadRenewedCopyPath,
                    UploadAcknowledgement = uploadAcknowledgementPath,
                    UserName = userName,
                    Remark = Remark,
                    UserPassword = userPassword,
                    MobileNumber = mobileNumber,
                    EmailId = emailId,
                    TentativeDateofComp = tentativeDateOfComp,
                    InvoiceStatus = invoiceStatus,
                    InvoiceDate = invoiceDate,
                    InvoiceNo = invoiceNo,
                    InvoiceAmount = invoiceAmount,
                    UploadInvoice = uploadInvoicePath,
                    PaymentStatus = paymentStatus,
                    PaymentTAT = paymentTAT,
                    RenewalStatus = renewalStatus,
                    RenewalStartDate = renewalStartDate,
                    RenewalEndDate = renewalEndDate,
                    ActualCost = actualCost,
                    GovtFees = govtFees
                };

                // **Calling Database Method**
                string result = await Task.Factory.StartNew(() =>
                    JsonConvert.SerializeObject(DAL.DLL.InsertUpdateDelLicenseRequest(obj))
                );

                return result;
            }
            catch (Exception ex)
            {
                return ex.Message;
            }
        }

        // **Helper Methods**
        private string GetValidDate(string date)
        {
            return date == "Invalid date" ? null : date;
        }

        private string GetFilePath(string file, string isUpdated, string folder)
        {
            if (string.IsNullOrEmpty(file)) return null;
            return isUpdated == "1" ? file : SaveFile(file, folder);
        }

        #region GetStoreDataBySearch
        public async Task<string> GetStoreDataBySearch(TblPartyMaster obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.GetStoreDataBySearch(obj)));
            return result;
        }
        #endregion
        #region Newsletter
        public async Task<string> GetNewsletter(TblNewLetter obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.Get_NewLetters(obj)));
            return result;
        }
        #endregion
        #region License & Registration
        public async Task<string> GetLicenseAndRegistrationBy(TblPartyMaster obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.GetLicenseAndRegistrationBy(obj)));
            return result;
        }


        #endregion
        public async Task<string> ApprovalUpdate(LicenseRequest obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.ApprovalUpdate(obj)));
            return result;
        }
        public async Task<string> RetailRolePermisssion(TblPartyMaster obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.RetailRolePermisssion(obj)));
            return result;
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
                if (obj.UFile.Contains("data:image/"))
                {
                    obj.UFile = Regex.Replace(obj.UFile, @"^data:image\/[a-zA-Z]+;base64,", string.Empty);
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
                    string extention = ".jpeg";
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
        public async Task<string> CrossCheck(StoreLicesensDocument obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.CrossCheck(obj)));
            return result;
        }
        public async Task<string> SearchStoreCompliance(RetialStoreManager obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.SearchStoreCompliance(obj)));
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

        public ActionResult Download(RetailLicenseDocuementMaster obj)
        {

            string newFolder = "abcd1234";

            string path = System.IO.Path.Combine(
               Environment.GetFolderPath(Environment.SpecialFolder.Desktop),
               newFolder
            );


            if (Directory.Exists(path))
            {
                Directory.Delete(path, recursive: true);
                Directory.CreateDirectory(path);
            }
            if (!System.IO.Directory.Exists(path))
            {
                try
                {
                    System.IO.Directory.CreateDirectory(path);
                }
                catch (IOException ie)
                {
                    Response.Redirect("../RetailSection/thankyou?" + ie.Message);
                    Console.WriteLine("IO Error: " + ie.Message);
                }
                catch (Exception e)
                {
                    Response.Redirect("../RetailSection/thankyou?" + e.Message);
                    Console.WriteLine("General Error: " + e.Message);
                }
            }
            return new EmptyResult();
        }

        public async Task<string> IUDExcel(RetialStoreManager obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.IUDExcel(obj)));
            return result;
        }
        #endregion


        #region Notice

        public async Task<string> GetNoticeList(NoticeBAL obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.GetNoticeList(obj)));
            return result;
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


        #region BulkStoreMaster
        public async Task<string> IUDBulkStoreMaster(RetialStoreManager obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.IUDBulkStoreMaster(obj)));
            return result;
        }
        #endregion
        #region BulkEmployeeMaster

        public async Task<string> IUDBulkEmployeee(RetialStoreManager obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.IUDBulkEmployeee(obj)));
            return result;
        }

        public async Task<string> NewIUDBulkEmployeee(RetialStoreManager obj)
        {
            return await DAL.DLL.NewIUDBulkEmployeee(obj);
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
        public ActionResult ManualPayment()
        {
            return View();
        }


        public async Task<string> IUDManualPayment(PaymentBAL obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.IUDPayment(obj)));
            return result;
        }
        #endregion
        public ActionResult AdditionalDocument()
        {
            return View();
        }

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
        public ActionResult LicenceStatusDashboard()
        {
            return View();
        }
        public ActionResult LicenceStatusDashboard1()
        {
            return View();
        }
        public async Task<string> GetLSDashboard(LSDBAL obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.GetLSDashboard(obj)));
            return result;
        }
        public async Task<string> GetLDashboard(LSDBAL obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.GetLDashboard(obj)));
            return result;
        }
        public ActionResult LicenceStatusDashboardReport()
        {
            return View();
        }
        public ActionResult LicenceExpireReport()
        {
            return View();
        }
        public async Task<string> MaintainLog(TblPartyMaster obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.MaintainLog(obj)));
            return result;
        }
        public async Task<string> Exception(TblPartyMaster obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.Exception(obj)));
            return result;
        }


        public async Task<string> GetMaintainLog(TblPartyMaster obj)
        {

            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.GetMaintainLog(obj)));
            return result;
        }
        public ActionResult StoreDashboard()
        {
            return View();
        }
        public async Task<string> GetStoreDashboard(TblPartyMaster obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.GetStoreDashboard(obj)));
            return result;
        }
        public ActionResult MainDashboard()
        {
            return View();
        }
        public async Task<string> GetRetailMainDashboard(TblPartyMaster obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.GetRetailMainDashboard(obj)));
            return result;
        }
        public async Task<string> getredirect(LoginBAL obj)
        {

            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.dll.LoginVerify(obj)));
            return result;
        }
        public ActionResult LRDashboard()
        {
            return View();
        }
        public ActionResult ReportLayout()
        {
            return View();
        }


        public ActionResult ActMaster()
        {
            return View();
        }

        public async Task<string> SearchActMaster(RetailBAL obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.SearchActMaster(obj)));
            return result;
        }
        public async Task<string> IUDActMaster(RetailBAL obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.IUDActMaster(obj)));
            return result;
        }

        public ActionResult OverViewMaster()
        {
            return View();
        }
        public async Task<JsonResult> InsertOverView()
        {
            try
            {
                var obj = new RetailBAL
                {
                    Id = Request.Form["ActId"],
                    State = Request.Form["State"],
                    ActOverview = Request.Form["ActOverview"],
                    Action = Request.Form["Action"],
                };
                Debug.WriteLine("Action ");
                string uploadDir = Server.MapPath("../DownloadMat/ActOverview/");
                if (!Directory.Exists(uploadDir))
                {
                    Directory.CreateDirectory(uploadDir);
                }
                Debug.WriteLine("RuleFile ");

                obj.RuleFile = SaveFile(Request.Files["RuleFile"], uploadDir, obj.RuleFile);
                obj.ActFile = SaveFile(Request.Files["ActFile"], uploadDir, obj.ActFile);
                Debug.WriteLine("save ");
                string result = await Task.Run(() => JsonConvert.SerializeObject(DAL.DLL.InsertOverView(obj)));

                return Json(new { status = true, Result = result });
            }
            catch (Exception ex)
            {
                return Json(new { status = false, message = ex.Message });
            }
        }


        public ActionResult Declaration()
        {
            return View();
        }

        private string SaveFile(HttpPostedFileBase file, string uploadDir, string existingFilePath)
        {
            Debug.WriteLine("SaveFile");
            if (file == null || file.ContentLength <= 0 || file.FileName.Contains("DownloadMat"))
            {
                Debug.WriteLine("Keeping existing file");
                return existingFilePath; // Retain old file if no new file is uploaded
            }
            else
            {
                Debug.WriteLine(file.FileName);
                string fileExtension = Path.GetExtension(file.FileName);
                string newFileName = $"{Guid.NewGuid():N}_{DateTime.Now:yyyyMMddHHmmssfff}{fileExtension}";
                string filePath = Path.Combine(uploadDir, newFileName);

                file.SaveAs(filePath);
                return "../DownloadMat/ActOverview/" + newFileName;
            }
        }
        public async Task<string> SearchLitigationMaster(RetailBAL obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.SearchLitigationMaster(obj)));
            return result;
        }
        public async Task<string> SearchLitigationMasterBYCaseCode(RetailBAL obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.SearchLitigationMasterBYCaseCode(obj)));
            return result;
        }
        private string Sanitize(string input)
        {
            return string.IsNullOrEmpty(input) || input == "undefined" ? "" : input;
        }

        public async Task<JsonResult> IUDLitigationMaster5()
        {
            try
            {

                var obj = new RetailBAL
                {
                    Appealby = Sanitize(Request.Form["Appealby"]),
                    AppealStatus = Sanitize(Request.Form["AppealStatus"]),
                    CaseCode = Sanitize(Request.Form["CaseCode"]),
                    Action = Sanitize(Request.Form["Action"]),

                };
                string result = await Task.Run(() => JsonConvert.SerializeObject(DAL.DLL.IUDLitigationMaster5(obj)));

                return Json(new { status = true, Result = result });

            }
            catch (Exception ex)
            {
                return Json(new { status = true, Result = ex.Message });
            }
        }

        public async Task<JsonResult> IUDLitigationMaster4()
        {
            try
            {
                string judgementexistfile = Request["judgementexistfile"];
                var file = Request.Files["JudgmentCopyPath"];
                string uniqueFileNameJ = null;
                if (file != null && file.ContentLength > 0)
                {
                    string extension = Path.GetExtension(file.FileName);
                    uniqueFileNameJ = Guid.NewGuid().ToString() + extension;
                    string uploadPath = Server.MapPath("~/DowloadMat/UploadedFiles/");
                    if (!Directory.Exists(uploadPath))
                    {
                        Directory.CreateDirectory(uploadPath);
                    }
                    string fullPath = Path.Combine(uploadPath, uniqueFileNameJ);
                    file.SaveAs(fullPath);
                }
                var obj = new RetailBAL
                {
                    Createdby = Sanitize(Request.Form["CreatedBy"]),
                    CaseCode = Sanitize(Request.Form["CaseCode"]),
                    JudgmentPassed = Sanitize(Request.Form["JudgmentPassed"]),
                    SummaryOfJudgment = Sanitize(Request.Form["SummaryOfJudgment"]),
                    JudgmentTime = Sanitize(Request.Form["JudgmentTime"]),
                    JudiciaryName = Sanitize(Request.Form["JudiciaryName"]),


                    ExecutionStatus = Sanitize(Request.Form["ExecutionStatus"]),
                    CondonationStatus = Sanitize(Request.Form["CondonationStatus"]),
                    CondonationFiled = Sanitize(Request.Form["CondonationFiled"]),
                    FileUploadDate = Sanitize(Request.Form["FileUploadDate"]),

                    Action = Sanitize(Request.Form["Action"])
                };
                if (file != null && file.ContentLength > 0)
                {

                    obj.JudgmentCopyPath = Sanitize(uniqueFileNameJ != null ? "../DowloadMat/UploadedFiles/" + uniqueFileNameJ : null);
                }
                else
                {
                    // No new file – keep existing one
                    obj.JudgmentCopyPath = judgementexistfile;
                }
                string result = await Task.Run(() => JsonConvert.SerializeObject(DAL.DLL.IUDLitigationMaster4(obj)));

                return Json(new { status = true, Result = result });

            }
            catch (Exception ex)
            {
                return Json(new { status = true, Result = ex.Message });
            }
        }

        public async Task<JsonResult> IUDLitigationMaster()
        {
            try
            {
                string existingFilePath = Request["ExistingFilePath"];
                var file = Request.Files["FileUpload"];
                string uniqueFileName = null;
                if (file != null && file.ContentLength > 0)
                {
                    string extension = Path.GetExtension(file.FileName);
                    uniqueFileName = Guid.NewGuid().ToString() + extension;
                    string uploadPath = Server.MapPath("../DowloadMat/UploadedFiles/");
                    if (!Directory.Exists(uploadPath))
                    {
                        Directory.CreateDirectory(uploadPath);
                    }
                    string fullPath = Path.Combine(uploadPath, uniqueFileName);
                    file.SaveAs(fullPath);
                }

                var obj = new RetailBAL
                {
                    Createdby = Sanitize(Request.Form["CreatedBy"]),
                    CaseCode = Sanitize(Request.Form["CaseCode"]),
                    CaseTitle = Sanitize(Request.Form["CaseTitle"]),
                    CaseType = Sanitize(Request.Form["CaseType"]),
                    ForumCourtName = Sanitize(Request.Form["ForumCourtName"]),
                    CaseNumber = Sanitize(Request.Form["CaseNumber"]),
                    FilingDate = Sanitize(Request.Form["FilingDate"]),
                    OppositionParty = Sanitize(Request.Form["OppositionParty"]),
                    AdvocateOrLegalCounsel = Sanitize(Request.Form["AdvocateOrLegalCounsel"]),
                    ExternalFirm = Sanitize(Request.Form["ExternalFirm"]),
                    ExternalFirmName = Sanitize(Request.Form["ExternalFirmName"]),
                    SeniorRepName = Sanitize(Request.Form["SeniorRepName"]),
                    SeniorRepMobile = Sanitize(Request.Form["SeniorRepMobile"]),
                    SeniorRepEmail = Sanitize(Request.Form["SeniorRepEmail"]),
                    JuniorRepName = Sanitize(Request.Form["JuniorRepName"]),
                    JuniorRepMobile = Sanitize(Request.Form["JuniorRepMobile"]),
                    JuniorRepEmail = Sanitize(Request.Form["JuniorRepEmail"]),
                    ExternalCounselInitialOpinion = Sanitize(Request.Form["ExternalCounselInitialOpinion"]),
                    RepName = Sanitize(Request.Form["RepName"]),
                    RepMobile = Sanitize(Request.Form["RepMobile"]),
                    RepEmail = Sanitize(Request.Form["RepEmail"]),
                    InHouseCounselInitialOpinion = Sanitize(Request.Form["InHouseCounselInitialOpinion"]),
                    State = Sanitize(Request.Form["State"]),
                    ACaseStatus = Sanitize(Request.Form["ACaseStatus"]),
                    FileUploadDate = Sanitize(Request.Form["FileUploadDate"]),

                    Interest = Sanitize(Request.Form["Interest"]),
                    LateFee = Sanitize(Request.Form["LateFee"]),
                    Fines = Sanitize(Request.Form["Fines"]),
                    Penalities = Sanitize(Request.Form["Penalities"]),
                    Other = Sanitize(Request.Form["Other"]),
                    Probability = Sanitize(Request.Form["Probability"]),

                    Action = Sanitize(Request.Form["Action"])
                };
                if (file != null && file.ContentLength > 0)
                {

                    obj.FileUploadPath = Sanitize(uniqueFileName != null ? "../DowloadMat/UploadedFiles/" + uniqueFileName : null);
                }
                else
                {
                    // No new file – keep existing one
                    obj.FileUploadPath = existingFilePath;
                }

                string result = await Task.Run(() => JsonConvert.SerializeObject(DAL.DLL.IUDLitigationMaster(obj)));

                return Json(new { status = true, Result = result });

            }
            catch (Exception ex)
            {
                return Json(new { status = true, Result = ex.Message });
            }
        }

        public async Task<JsonResult> IUDLitigationMasterStage2()
        {
            try
            {
                string ExistingFile1 = Request["ExistingFile1"];
                string ExistingFile2 = Request["ExistingFile2"];
                string ExistingFile3 = Request["ExistingFile3"];
                var file1 = Request.Files["File1"];
                var file2 = Request.Files["File2"];
                var file3 = Request.Files["File3"];
                string uniqueFileNamefile1 = null;
                string uniqueFileNamefile2 = null;
                string uniqueFileNamefile3 = null;
                if (file1 != null && file1.ContentLength > 0)
                {
                    string extension = Path.GetExtension(file1.FileName);
                    uniqueFileNamefile1 = Guid.NewGuid().ToString() + extension;
                    string uploadPath = Server.MapPath("../DowloadMat/UploadedFiles/");
                    if (!Directory.Exists(uploadPath))
                    {
                        Directory.CreateDirectory(uploadPath);
                    }
                    string fullPath = Path.Combine(uploadPath, uniqueFileNamefile1);
                    file1.SaveAs(fullPath);
                }
                if (file2 != null && file2.ContentLength > 0)
                {
                    string extension = Path.GetExtension(file2.FileName);
                    uniqueFileNamefile2 = Guid.NewGuid().ToString() + extension;
                    string uploadPath = Server.MapPath("../DowloadMat/UploadedFiles/");
                    if (!Directory.Exists(uploadPath))
                    {
                        Directory.CreateDirectory(uploadPath);
                    }
                    string fullPath = Path.Combine(uploadPath, uniqueFileNamefile2);
                    file2.SaveAs(fullPath);
                }
                if (file3 != null && file3.ContentLength > 0)
                {
                    string extension = Path.GetExtension(file3.FileName);
                    uniqueFileNamefile3 = Guid.NewGuid().ToString() + extension;
                    string uploadPath = Server.MapPath("../DowloadMat/UploadedFiles/");
                    if (!Directory.Exists(uploadPath))
                    {
                        Directory.CreateDirectory(uploadPath);
                    }
                    string fullPath = Path.Combine(uploadPath, uniqueFileNamefile3);
                    file3.SaveAs(fullPath);
                }
                var obj = new RetailBAL
                {
                    Createdby = Sanitize(Request.Form["CreatedBy"]),
                    CaseCode = Sanitize(Request.Form["CaseCode"]),
                    PleadingsType = Sanitize(Request.Form["PleadingsType"]),
                    Note = Sanitize(Request.Form["Note"]),
                    DateOfFilling = Sanitize(Request.Form["DateOfFilling"]),
                    DateOfUpload = Sanitize(Request.Form["DateOfUpload"]),
                    //File1 = Sanitize(uniqueFileNamefile1 != null ? "../UploadedFiles/" + uniqueFileNamefile1 : null),
                    //File2 = Sanitize(uniqueFileNamefile2 != null ? "../UploadedFiles/" + uniqueFileNamefile2 : null),
                    //File3 = Sanitize(uniqueFileNamefile3 != null ? "../UploadedFiles/" + uniqueFileNamefile3 : null),
                    FileUploadDate = Sanitize(Request.Form["FileUploadDate"]),
                    Action = Sanitize(Request.Form["Action"])
                };
                if (file1 != null && file1.ContentLength > 0)
                {

                    obj.File1 = Sanitize(uniqueFileNamefile1 != null ? "../DowloadMat/UploadedFiles/" + uniqueFileNamefile1 : null);
                }
                else
                {
                    obj.File1 = ExistingFile1;
                }
                if (file2 != null && file2.ContentLength > 0)
                {

                    obj.File2 = Sanitize(uniqueFileNamefile2 != null ? "../DowloadMat/UploadedFiles/" + uniqueFileNamefile2 : null);
                }
                else
                {
                    obj.File2 = ExistingFile2;
                }
                if (file3 != null && file3.ContentLength > 0)
                {

                    obj.File3 = Sanitize(uniqueFileNamefile3 != null ? "../DowloadMat/UploadedFiles/" + uniqueFileNamefile3 : null);
                }
                else
                {
                    obj.File3 = ExistingFile3;
                }


                string result = await Task.Run(() => JsonConvert.SerializeObject(DAL.DLL.IUDLitigationMaster(obj)));

                return Json(new { status = true, Result = result });

            }
            catch (Exception ex)
            {
                return Json(new { status = true, Result = ex.Message });
            }
        }

        public static string ConvertToDateOnly(string inputDate)
        {
            try
            {
                // Example input: "Wed May 14 2025 00:00:00 GMT+0530 (India Standard Time)"
                string trimmed = inputDate.Substring(0, 24); // "Wed May 14 2025 00:00:00"

                DateTime date = DateTime.ParseExact(
                    trimmed,
                    "ddd MMM dd yyyy HH:mm:ss",
                    CultureInfo.InvariantCulture
                );

                return date.ToString("yyyy-MM-dd");
            }
            catch (Exception ex)
            {
                // Handle parsing error
                return $"Error: {ex.Message}";
            }
        }
        public async Task<JsonResult> IUDLitigationMasterStage3()
        {
            try
            {
                var hearings = new List<HearingModel>();
                var form = Request.Form;
                var files = Request.Files;

                int index = 0;
                while (true)
                {
                    string prefix = $"hearings[{index}]";

                    if (!form.AllKeys.Any(k => k.StartsWith(prefix)))
                        break;

                    var hearing = new HearingModel
                    {
                        DateOfHearing = ConvertToDateOnly(form[$"{prefix}.DateOfHearing"]),
                        PurposeOfHearing = form[$"{prefix}.PurposeOfHearing"],
                        OutcomeOfHearing = form[$"{prefix}.OutcomeOfHearing"],
                        CaseStatus = form[$"{prefix}.CaseStatus"],
                        DateOfUpload = ConvertToDateOnly(form[$"{prefix}.DateOfUpload"]),
                        CaseCode = Sanitize(form["CaseCode"]),
                        Action = Sanitize(form["Action"]),
                        CreatedBy = Sanitize(form["Action"])
                    };

                    // File handling per row
                    string fileKey = $"{prefix}.HearingFilePath";
                    string existingHearingFileKey = $"{prefix}.ExistingFile"; // Expect different hidden inputs per row
                    string existingHearingFile = form[existingHearingFileKey];

                    if (files.AllKeys.Contains(fileKey))
                    {
                        var file = files[fileKey];
                        if (file != null && file.ContentLength > 0)
                        {
                            string extension = Path.GetExtension(file.FileName);
                            string uniqueFileNamefile4 = Guid.NewGuid().ToString() + extension;
                            string uploadPath = Server.MapPath("../DowloadMat/UploadedHearingFiles/");
                            if (!Directory.Exists(uploadPath))
                            {
                                Directory.CreateDirectory(uploadPath);
                            }
                            string fullPath = Path.Combine(uploadPath, uniqueFileNamefile4);
                            file.SaveAs(fullPath);
                            hearing.HearingFilePath = Sanitize(uniqueFileNamefile4 != null ? "../DowloadMat/UploadedHearingFiles/" + uniqueFileNamefile4 : null);
                            hearing.HearingFileName = file.FileName;
                        }
                        else
                        {
                            hearing.HearingFilePath = existingHearingFile;
                        }
                    }
                    else
                    {
                        hearing.HearingFilePath = existingHearingFile;
                    }

                    hearings.Add(hearing);
                    index++;
                }

                // Call DAL method with the full list
                string result = await Task.Run(() => JsonConvert.SerializeObject(DAL.DLL.IUDLitigationMaster3(hearings)));

                return Json(new { status = true, Result = result }, JsonRequestBehavior.AllowGet);
            }
            catch (Exception ex)
            {
                return Json(new { status = false, Result = ex.Message }, JsonRequestBehavior.AllowGet);
            }
        }


        public ActionResult LitigationMaster()
        {
            return View();
        }
        public ActionResult LitigationManagement()
        {
            return View();
        }
        public async Task<string> SearchLitigationManagement(RetailBAL obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.SearchLitigationManagement(obj)));
            return result;
        }
        public async Task<JsonResult> ProjectDetailsStep2()
        {
            try
            {

                var obj = new RetailBAL
                {
                    ProjectName = Sanitize(Request.Form["ProjectName"]),
                    SizeCapacity = Sanitize(Request.Form["SizeCapacity"]),
                    GovtPrivate = Sanitize(Request.Form["GovtPrivate"]),
                    EndUserParty = Sanitize(Request.Form["EndUserParty"]),
                    CommissioningDate = Sanitize(Request.Form["CommissioningDate"]),
                    ExecutionDate = Sanitize(Request.Form["ExecutionDate"]),
                    AggregatorFees = Sanitize(Request.Form["AggregatorFees"]),
                    LandConversion = Sanitize(Request.Form["LandConversion"]),
                    ActualCost = Sanitize(Request.Form["ActualCost"]),
                    RegistryValue = Sanitize(Request.Form["RegistryValue"]),
                    Variance = Sanitize(Request.Form["Variance"]),
                    MortgageProperty = Sanitize(Request.Form["MortgageProperty"]),
                    LoanAgreements = Sanitize(Request.Form["LoanAgreements"]),
                    MortgageAmount = Sanitize(Request.Form["MortgageAmount"]),
                    Miscellaenous = Sanitize(Request.Form["Miscellaenous"]),
                    AnyOtherDetail = Sanitize(Request.Form["AnyOtherDetail"]),
                    Createdby = Sanitize(Request.Form["CreatedBy"]),
                    PartyId = Sanitize(Request.Form["PartyId"]),
                    Id = Sanitize(Request.Form["Id"]),
                    Action = Sanitize(Request.Form["Action"])
                };
                string result = await Task.Run(() => JsonConvert.SerializeObject(DAL.DLL.IUDProjectManagement(obj)));

                return Json(new { status = true, Result = result });

            }
            catch (Exception ex)
            {
                return Json(new
                {
                    status = true,
                    Result = ex.Message
                });
            }
        }


        public async Task<string> SearchPManagement(TblPartyMaster obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.SearchManagement(obj)));
            return result;
        }

        public async Task<JsonResult> ProjectDetailsStep3()
        {

            try
            {
                var obj = new RetailBAL
                {
                    TechFeasibilityStatus = Sanitize(Request.Form["TechFeasibilityStatus"]),
                    TechPersonName = Sanitize(Request.Form["TechPersonName"]),
                    GridDistance = Sanitize(Request.Form["GridDistance"]),
                    GridConnectivity = Sanitize(Request.Form["GridConnectivity"]),
                    RightOfWayDistance = Sanitize(Request.Form["RightOfWayDistance"]),
                    RightOfWayFeasibility = Sanitize(Request.Form["RightOfWayFeasibility"]),
                    ROWPersonName = Sanitize(Request.Form["ROWPersonName"]),
                    AccessRoad = Sanitize(Request.Form["AccessRoad"]),
                    VerifierName = Sanitize(Request.Form["VerifierName"]),
                    SupportingDocsAttached = Sanitize(Request.Form["SupportingDocsAttached"]),
                    RoadConstructionStatus = Sanitize(Request.Form["RoadConstructionStatus"]),
                    RoadCompletionDate = Sanitize(Request.Form["RoadCompletionDate"]),
                    AdditionalDetails = Sanitize(Request.Form["AdditionalDetails"]),
                    Createdby = Sanitize(Request.Form["CreatedBy"]),
                    PartyId = Sanitize(Request.Form["PartyId"]),
                    Id = Sanitize(Request.Form["Id"]),

                    Action = Sanitize(Request.Form["Action"])
                };
                string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.IUDProjectManagement(obj)));
                return Json(new { status = true, Result = result });
            }
            catch (Exception ex)
            {
                return Json(new
                {
                    status = true,
                    Result = ex.Message
                });
            }
        }


        public async Task<JsonResult> ProjectDetailsStep4()
        {
            try
            {

                var obj = new RetailBAL
                {
                    FarmerName = Sanitize(Request.Form["FarmerName"]),
                    KhatedarName = Sanitize(Request.Form["KhatedarName"]),
                    Village = Sanitize(Request.Form["Village"]),
                    KhasraNo = Sanitize(Request.Form["KhasraNo"]),
                    KhatauliNo = Sanitize(Request.Form["KhatauliNo"]),
                    AreaAcre = Sanitize(Request.Form["AreaAcre"]),
                    AreaBigah = Sanitize(Request.Form["AreaBigah"]),
                    LandCharge = Sanitize(Request.Form["LandCharge"]),
                    ChargeAmount = Sanitize(Request.Form["ChargeAmount"]),
                    ChargeTenure = Sanitize(Request.Form["ChargeTenure"]),
                    ChargeholderName = Sanitize(Request.Form["ChargeholderName"]),
                    LandStatus = Sanitize(Request.Form["LandStatus"]),
                    LandType = Sanitize(Request.Form["LandType"]),
                    Createdby = Sanitize(Request.Form["CreatedBy"]),
                    PartyId = Sanitize(Request.Form["PartyId"]),
                    Id = Sanitize(Request.Form["Id"]),
                    Action = Sanitize(Request.Form["Action"])
                };
                string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.IUDProjectManagement(obj)));
                return Json(new { status = true, Result = result });
            }
            catch (Exception ex)
            {
                return Json(new
                {
                    status = true,
                    Result = ex.Message
                });
            }
        }


        public async Task<JsonResult> ProjectDetailsStep5()
        {
            try
            {

                var obj = new RetailBAL
                {
                    RatePerAcre = Sanitize(Request.Form["RatePerAcre"]),
                    TotalLandCost = Sanitize(Request.Form["TotalLandCost"]),
                    AdvancePaid = Sanitize(Request.Form["AdvancePaid"]),
                    LeaseValue = Sanitize(Request.Form["LeaseValue"]),
                    LeaseDuration = Sanitize(Request.Form["LeaseDuration"]),
                    LeaseEscalation = Sanitize(Request.Form["LeaseEscalation"]),
                    ApplicableTDS = Sanitize(Request.Form["ApplicableTDS"]),
                    SecurityChequeNo = Sanitize(Request.Form["SecurityChequeNo"]),
                    SecurityChequeAmount = Sanitize(Request.Form["SecurityChequeAmount"]),
                    TotalAdvanceToFarmers = Sanitize(Request.Form["TotalAdvanceToFarmers"]),
                    TotalPaymentToFarmers = Sanitize(Request.Form["TotalPaymentToFarmers"]),
                    PaymentDateToFarmers = Sanitize(Request.Form["PaymentDateToFarmers"]),

                    RegistrationCharges = Sanitize(Request.Form["RegistrationCharges"]),
                    StampDutyCharges = Sanitize(Request.Form["StampDutyCharges"]),
                    StampVendorPayment = Sanitize(Request.Form["StampVendorPayment"]),
                    MiscExpenses = Sanitize(Request.Form["MiscExpenses"]),
                    AdvocateFee = Sanitize(Request.Form["AdvocateFee"]),
                    AdvocateName5 = Sanitize(Request.Form["AdvocateName5"]),
                    Createdby = Sanitize(Request.Form["CreatedBy"]),
                    PartyId = Sanitize(Request.Form["PartyId"]),
                    Id = Sanitize(Request.Form["Id"]),
                    Action = Sanitize(Request.Form["Action"])
                };
                string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.IUDProjectManagement(obj)));
                return Json(new { status = true, Result = result });
            }
            catch (Exception ex)
            {
                return Json(new
                {
                    status = true,
                    Result = ex.Message
                });
            }
        }


        public async Task<JsonResult> ProjectDetailsStep6()
        {
            try
            {

                var obj = new RetailBAL
                {
                    TSRStatus = Sanitize(Request.Form["TSRStatus"]),
                    TSRConductedBy = Sanitize(Request.Form["TSRConductedBy"]),
                    TSRValidatedByLocalAdvocate = Sanitize(Request.Form["TSRValidatedByLocalAdvocate"]),
                    AdvocateName = Sanitize(Request.Form["AdvocateName"]),
                    LocalAdvocateByAggregator = Sanitize(Request.Form["LocalAdvocateByAggregator"]),
                    LocalAdvocateByCompany = Sanitize(Request.Form["LocalAdvocateByCompany"]),
                    TSRFeesAggregator = Sanitize(Request.Form["TSRFeesAggregator"]),
                    TSRFeesCompany = Sanitize(Request.Form["TSRFeesCompany"]),
                    TSRPaymentDateAggregator = Sanitize(Request.Form["TSRPaymentDateAggregator"]),
                    TSRPaymentDateCompany = Sanitize(Request.Form["TSRPaymentDateCompany"]),
                    TSRValidatedByInHouse = Sanitize(Request.Form["TSRValidatedByInHouse"]),
                    TSRValidatedInHousePerson = Sanitize(Request.Form["TSRValidatedInHousePerson"]),
                    DocumentsSubmittedToLegal = Sanitize(Request.Form["DocumentsSubmittedToLegal"]),
                    TermSheetDateAggregator = Sanitize(Request.Form["TermSheetDateAggregator"]),
                    TermSheetDateOfftaker = Sanitize(Request.Form["TermSheetDateOfftaker"]),
                    PartyId = Sanitize(Request.Form["PartyId"]),
                    Id = Sanitize(Request.Form["Id"]),
                    Action = Sanitize(Request.Form["Action"])
                };
                string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.IUDProjectManagement(obj)));
                return Json(new { status = true, Result = result });
            }
            catch (Exception ex)
            {
                return Json(new
                {
                    status = true,
                    Result = ex.Message
                });
            }
        }

        public async Task<JsonResult> ProjectDetailsStep7()
        {
            try
            {
                var obj = new RetailBAL();

                // Save uploaded files
                string baseDir = "~/DownloadMat/SiteManagerStep7";
                string dirPath = System.Web.HttpContext.Current.Server.MapPath(baseDir);
                if (!Directory.Exists(dirPath))
                    Directory.CreateDirectory(dirPath);

                for (int i = 1; i <= 10; i++)
                {
                    var file = Request.Files["Upload" + i];
                    if (file != null && file.ContentLength > 0)
                    {
                        string extension = Path.GetExtension(file.FileName);
                        string uniqueName = $"{Guid.NewGuid():N}_{DateTime.Now:yyyyMMddHHmmss}{extension}";
                        string relativePath = VirtualPathUtility.ToAbsolute($"{baseDir}/{uniqueName}");
                        string fullPath = Path.Combine(dirPath, uniqueName);

                        file.SaveAs(fullPath);

                        // Assign file path to UploadedFilesPaths1 to UploadedFilesPaths10
                        typeof(RetailBAL).GetProperty($"UploadedFilesPaths{i}")?.SetValue(obj, relativePath);
                    }
                }

                // Assign form fields
                obj.DocumentName = Sanitize(Request.Form["DocumentName"]);
                obj.DocumentSharingStatus = Sanitize(Request.Form["DocumentSharingStatus"]);
                obj.DocumentRemarks = Sanitize(Request.Form["DocumentRemarks"]);
                obj.DocumentSharingDate = Sanitize(Request.Form["DocumentSharingDate"]);
                obj.DocumentSharingMode = Sanitize(Request.Form["DocumentSharingMode"]);
                obj.Createdby = Sanitize(Request.Form["CreatedBy"]);
                obj.PartyId = Sanitize(Request.Form["PartyId"]);
                obj.Id = Sanitize(Request.Form["Id"]);
                obj.Action = Sanitize(Request.Form["Action"]);

                // Save to DB via DAL
                string result = await Task.Run(() => JsonConvert.SerializeObject(DAL.DLL.IUDProjectManagement(obj)));

                return Json(new { status = true, Result = result });
            }
            catch (Exception ex)
            {
                return Json(new
                {
                    status = false,
                    Result = ex.Message
                });
            }
        }



        public async Task<JsonResult> ProjectDetailsStep8()
        {
            try
            {

                var obj = new RetailBAL
                {
                    TotalProjectCost = Sanitize(Request.Form["TotalProjectCost"]),
                    Debt = Sanitize(Request.Form["Debt"]),
                    EquityOPL = Sanitize(Request.Form["EquityOPL"]),
                    EquityOffTaker = Sanitize(Request.Form["EquityOffTaker"]),
                    LegalEntityName = Sanitize(Request.Form["LegalEntityName"]),
                    ExecutionDateSSHA = Sanitize(Request.Form["ExecutionDateSSHA"]),
                    ExecutionDatePPA = Sanitize(Request.Form["ExecutionDatePPA"]),
                    Createdby = Sanitize(Request.Form["CreatedBy"]),
                    PartyId = Sanitize(Request.Form["PartyId"]),
                    Id = Sanitize(Request.Form["Id"]),
                    Action = Sanitize(Request.Form["Action"])
                };
                string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.IUDProjectManagement(obj)));
                return Json(new { status = true, Result = result });
            }
            catch (Exception ex)
            {
                return Json(new
                {
                    status = true,
                    Result = ex.Message
                });
            }
        }

        #region BulkComplianceExcel
        public async Task<string> IUDBulkComplianceExcel(Attendance obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.IUDBulkComplianceExcel(obj)));
            return result;
        }
        public async Task<string> GetComlist(Attendance obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.GetComlist(obj)));
            return result;
        }
        public async Task<string> GetReportlist(RetailLicenseDocuementMaster obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.GetReportlist(obj)));
            return result;
        }


        public ActionResult Payrollcompliance()
        {
            return View();
        }
        #endregion



        [HttpPost]
        public JsonResult SaveExcelData(RetailUploadModelBAL obj)
        {
            try
            {
                //System.IO.File.WriteAllText(@"C:\Temp\debug_excel.json", JsonConvert.SerializeObject(obj));
                RetailUploadModelBAL bal = new RetailUploadModelBAL();
                var result = bal.SaveExcelData(obj);
                return Json(new { Result = result, Message = "Upload successful" });
            }
            catch (Exception ex)
            {
                return Json(new { Message = "Error: " + ex.Message });
            }
        }

        public async Task<string> GetPAYROLLDetail(RetailUploadModelBAL obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.GetPAYROLLDetail(obj)));
            return result;
        }

        public async Task<string> UpdateerrorList(RetailUploadModelBAL obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.UpdateerrorList(obj)));
            return result;
        }

        public async Task<string> GetBulkReportlist(RetailLicenseDocuementMaster obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.GetBulkReportlist(obj)));
            return result;
        }

        
        public async Task<string> IUDBulkContractorComplianceExcel(ContractorAttendance obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.IUDBulkContractorComplianceExcel(obj)));
            return result;
        }
        public async Task<string> GetContractorComlist(ContractorAttendance obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.GetContractorComlist(obj)));
            return result;
        }


        public async Task<string> AuditGetContractorComlist(ContractorAttendance obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.AuditGetContractorComlist(obj)));
            return result;
        }



        public async Task<string> ContractorGetReportlist(RetailLicenseDocuementMaster obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.ContractorGetReportlist(obj)));
            return result;
        }

        public async Task<string> GetContractorBulkReportlist(RetailLicenseDocuementMaster obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.GetContractorBulkReportlist(obj)));
            return result;
        }

        public async Task<string> AuditGetContractorBulkReportlist(RetailLicenseDocuementMaster obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.AuditGetContractorBulkReportlist(obj)));
            return result;
        }
        

        public async Task<string> bindcommonreport(RetailBAL obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.bindcommonreport(obj)));
            return result;
        }

        [Route("location")]
        public ActionResult LocationMaster()
        {
            return View();
        }
        public async Task<string> IUDDiligenceCheckList(RetailUploadModelBAL obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.IUDDiligenceCheckList(obj)));
            return result;
        }
        public async Task<string> DiligenceCheckList(RetailUploadModelBAL obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.DiligenceCheckList(obj)));
            return result;
        }


        [HttpPost]
        public ActionResult IUDDiligenceDocCheckList()
        {
            try
            {
                int Action = Convert.ToInt32(Request["Action"]);
                int Id = Convert.ToInt32(Request["Id"]);
                string StoreCode = Request["StoreCode"];
                string LoginId = Request["LoginId"];

                if (Action == 6)  // FILE UPLOAD ACTION
                {
                    // ---- Get the file ----
                    HttpPostedFileBase file = Request.Files["FileUpload"];
                    if (file == null || file.ContentLength == 0)
                    {
                        return Json(new
                        {
                            Result = "No file received"
                        }, JsonRequestBehavior.AllowGet);
                    }

                    // ---- Create Folder ----
                    string folderPath = Server.MapPath("~/UploadedDocs/Diligence/");
                    if (!Directory.Exists(folderPath))
                        Directory.CreateDirectory(folderPath);

                    // ---- File Name ----
                    string originalFileName = Path.GetFileName(file.FileName);
                    string newFileName = $"{Id}_{StoreCode}_{originalFileName}";

                    string fullPath = Path.Combine(folderPath, newFileName);

                    // ---- Save file to folder ----
                    file.SaveAs(fullPath);

                    // DB Path
                    string dbFilePath = "/UploadedDocs/Diligence/" + newFileName;
                    string CONNECTION_STRING = "Server=13.202.27.216;Initial Catalog=EZCMP_R;MultipleActiveResultSets=true;User ID=retail;Password=ezretail@123;Pooling=True;";
                    // ---- DB Save ----
                    using (SqlConnection con = new SqlConnection(CONNECTION_STRING))
                    {
                        con.Open();

                        SqlCommand cmd = new SqlCommand("[RTL].[Usp_Diligence]", con);
                        cmd.CommandType = CommandType.StoredProcedure;

                        cmd.Parameters.AddWithValue("@Action", 6);
                        cmd.Parameters.AddWithValue("@Id", Id);
                        cmd.Parameters.AddWithValue("@StoreCode", StoreCode);
                        cmd.Parameters.AddWithValue("@FilePath", dbFilePath);
                        cmd.Parameters.AddWithValue("@LoginId", LoginId);

                        cmd.ExecuteNonQuery();
                    }
                    // ---- Return JSON ----
                    return Json(new
                    {
                        Result = "File uploaded successfully",
                        FilePath = dbFilePath,
                        UploadOn = DateTime.Now.ToString("yyyy-MM-dd HH:mm"),
                        UploadedBy = User.Identity.Name
                    }, JsonRequestBehavior.AllowGet);
                }

                return Json(new { Result = "Invalid Action" }, JsonRequestBehavior.AllowGet);
            }
            catch (Exception ex)
            {
                return Json(new
                {
                    Result = "Error",
                    Message = ex.Message
                }, JsonRequestBehavior.AllowGet);
            }
        }
        public class ZipDownloadRequest
        {
            public string StoreCode { get; set; }
            public List<ZipFileItem> Files { get; set; }
        }

        public class ZipFileItem
        {
            public string FilePath { get; set; }
            public string DocumentName { get; set; }
        }

        [HttpPost]
        public ActionResult DownloadZip(ZipDownloadRequest request)
        {
            using (var ms = new MemoryStream())
            {
                using (var archive = new ZipArchive(ms, ZipArchiveMode.Create, true))
                {
                    foreach (var file in request.Files)
                    {
                        var fullPath = Server.MapPath(file.FilePath);
                        if (!System.IO.File.Exists(fullPath)) continue;

                        var ext = Path.GetExtension(fullPath);
                        var safeDocName = file.DocumentName.Replace(" ", "_");
                        var zipFileName = $"{request.StoreCode}_{safeDocName}{ext}";

                        var entry = archive.CreateEntry(zipFileName);

                        using (var entryStream = entry.Open())
                        using (var fs = new FileStream(fullPath, FileMode.Open, FileAccess.Read))
                        {
                            fs.CopyTo(entryStream);
                        }
                    }
                }

                return File(ms.ToArray(), "application/zip", "DiligenceDocuments.zip");
            }
        }

        public ActionResult MailMapping()
        {
            return View();
        }
        public async Task<string> iudMailing(RetailBAL obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.iudMailing(obj)));
            return result;
        }
        public async Task<string> MailingSearching(RetailBAL obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.MailingSearching(obj)));
            return result;
        }
        public async Task<string> GetComDoc(RetailBAL obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.GetComDoc(obj)));
            return result;
        }


        public ActionResult NewLicenseMaster()
        {
            return View();
        }
        public ActionResult LicenseCommonCompliance()
        {
            return View();
        }
        public ActionResult NewLocationDashboard()
        {
            return View();
        }
        private string SaveFile(HttpPostedFileBase file, string dir)
        {
            string ext = Path.GetExtension(file.FileName);

            string newFileName =
                Guid.NewGuid().ToString("N").Substring(0, 6) +
                DateTime.Now.ToString("yyyyMMddHHmmss");

            string uploadpath = dir + newFileName + ext;
            string filePath = Server.MapPath(uploadpath);

            file.SaveAs(filePath);

            return uploadpath;
        }

        public async Task<string> IUDLicense(RetialStoreManager obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.IUDLicense(obj)));
            return result;
        }
        public async Task<string> IUDCOMPLIANCESTORE()
        {
            RetialStoreManager obj = new RetialStoreManager();

            try
            {
                string dir = "../DownloadMat/STORECOMPLIANCE/";
                string dirPath = Server.MapPath(dir);

                if (!Directory.Exists(dirPath))
                    Directory.CreateDirectory(dirPath);

                // ================= FILE HANDLING (BY KEY) =================
                HttpPostedFileBase globalFile = Request.Files["DiligenceFile"];
                HttpPostedFileBase rowFile = Request.Files["file"];

                // -------- GLOBAL FILE --------
                if (globalFile != null && globalFile.ContentLength > 0)
                {
                    string globalPath = SaveFile(globalFile, dir);
                    obj.DiligenceFile = globalPath;   // ✅ GLOBAL FILE PATH
                }

                // -------- ROW FILE (OPTIONAL) --------
                if (rowFile != null && rowFile.ContentLength > 0)
                {
                    string rowPath = SaveFile(rowFile, dir);
                    obj.AdditionalDoc = rowPath;  // IF YOU HAVE SUCH FIELD
                }

                // ================= FORM DATA =================

                obj.DocumentName = Request.Form["DocumentName"] ?? "";
                obj.Action = Request.Form["Action"] ?? "";
                obj.locationId = Request.Form["locationId"] ?? "";
                obj.Remark = Request.Form["Remark"] ?? "";
                obj.validFrom = Request.Form["validFrom"] ?? "";
                obj.validTo = Request.Form["validTo"] ?? "";
                obj.IsDefault = Request.Form["IsDefault"] ?? "";
                obj.status = Request.Form["status"] ?? "";

                if (int.TryParse(Request.Form["Id"], out int loginId))
                    obj.LoginId = loginId;

                // ================= DB CALL =================
                string result = await Task.Run(() =>
                    JsonConvert.SerializeObject(DAL.DLL.IUDCOMPLIANCESTORE(obj))
                );

                return result;
            }
            catch (Exception ex)
            {
                return JsonConvert.SerializeObject(new
                {
                    IsSuccess = false,
                    Message = ex.Message
                });
            }
        }



        public async Task<string> IUDCOMPLIANCESTORE_SAVEALL()
        {
            try
            {
                List<RetialStoreManager> list = new List<RetialStoreManager>();

                if (Request.Files.Count > 0)
                {
                    // ---------- FormData + file upload ----------
                    int i = 0;
                    while (Request.Form.AllKeys.Length > i)
                    {
                        var obj = new RetialStoreManager();
                        obj.DocumentName = Request.Form["rows[" + i + "].DocumentName"];
                        obj.Remark = Request.Form["rows[" + i + "].Remark"];
                        obj.validFrom = Request.Form["rows[" + i + "].validFrom"];
                        obj.validTo = Request.Form["rows[" + i + "].validTo"];
                        obj.status = Request.Form["rows[" + i + "].status"];
                        obj.locationId = Request.Form["rows[" + i + "].locationId"];

                        if (Request.Files.Count > i)
                        {
                            var file = Request.Files[i];
                            string dir = "~/DownloadMat/STORECOMPLIANCE/";
                            string dirPath = Server.MapPath(dir);
                            if (!Directory.Exists(dirPath))
                                Directory.CreateDirectory(dirPath);

                            string ext = Path.GetExtension(file.FileName);
                            string newFileName = Guid.NewGuid().ToString("N").Substring(0, 6) +
                                                 DateTime.Now.ToString("yyyyMMddHHmmss");

                            string uploadPath = dir + newFileName + ext;
                            file.SaveAs(Server.MapPath(uploadPath));
                            obj.AdditionalDoc = uploadPath;
                        }

                        list.Add(obj);
                        i++;
                    }
                }
                else
                {
                    // ---------- JSON only ----------
                    var jsonData = new StreamReader(Request.InputStream).ReadToEnd();
                    list = JsonConvert.DeserializeObject<List<RetialStoreManager>>(jsonData);
                }

                if (list == null || list.Count == 0)
                {
                    return JsonConvert.SerializeObject(new
                    {
                        IsSuccess = false,
                        Message = "No records received for Save All!"
                    });
                }

                foreach (var obj in list)
                {
                    obj.Action = "1";
                    await Task.Run(() =>
                        DAL.DLL.IUDCOMPLIANCESTORE(obj)
                    );
                }

                return JsonConvert.SerializeObject(new
                {
                    IsSuccess = true,
                    Message = "All compliance records saved successfully!"
                });
            }
            catch (Exception ex)
            {
                return JsonConvert.SerializeObject(new
                {
                    IsSuccess = false,
                    Message = ex.Message
                });
            }
        }

        public ActionResult userProfile()
        {
            return View();
        }
        public ActionResult NewEmployeeMaster()
        {
            return View();
        }


        public ActionResult DownloadFile(string filePath, string fileName)
        {
            if (string.IsNullOrEmpty(filePath))
                return HttpNotFound();

            var fullPath = Server.MapPath(filePath);

            if (!System.IO.File.Exists(fullPath))
                return HttpNotFound();

            string originalName = Path.GetFileName(fullPath);

            // Agar filename blank ho to original use karo
            string finalFileName = string.IsNullOrEmpty(fileName) ? originalName : fileName;

            // Extension ensure karo
            string extension = Path.GetExtension(fullPath);
            if (!finalFileName.EndsWith(extension))
            {
                finalFileName += extension;
            }

            // Special char safe encoding
            string headerFileName = Uri.EscapeDataString(finalFileName);

            Response.Clear();
            Response.ContentType = MimeMapping.GetMimeMapping(fullPath);
            Response.AppendHeader("Content-Disposition", "attachment; filename*=UTF-8''" + headerFileName);

            Response.TransmitFile(fullPath);
            Response.End();

            return null;
        }
        public ActionResult ViewFile(string filePath)
        {
            var fullPath = Server.MapPath(filePath);

            if (!System.IO.File.Exists(fullPath))
                return HttpNotFound();

            string contentType = MimeMapping.GetMimeMapping(fullPath);

            Response.AppendHeader("Content-Disposition", "inline");

            return File(fullPath, contentType);
        }
        public async Task<string> InsertRegister(RetailBAL obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.InsertRegister(obj)));
            return result;
        }

        [HttpPost]
        public async Task<string> UploadVfile(RetailBAL obj, HttpPostedFileBase File1)
        {


            if (File1 != null && File1.ContentLength > 0)
            {
                string folder = "../DownloadMat/VendorRegister/";
                string dirPath = System.Web.HttpContext.Current.Server.MapPath(folder);
                if (!Directory.Exists(dirPath))
                {
                    Directory.CreateDirectory(dirPath);
                }

                string NewFileName = "";
                string strPassword = Guid.NewGuid().ToString("N").Substring(0, 4);
                NewFileName += strPassword;
                NewFileName += DateTime.Now.Year.ToString();
                NewFileName += DateTime.Now.Month.ToString();
                NewFileName += DateTime.Now.Day.ToString();
                string extention = ".pdf";
                string uploadpath = folder + NewFileName + extention;
                string filePath = System.Web.HttpContext.Current.Server.MapPath(uploadpath);
                obj.FileUploadPath = uploadpath;
                File1.SaveAs(filePath);
            }


            string result = await Task.Factory.StartNew(() =>
                JsonConvert.SerializeObject(DAL.DLL.InsertRegister(obj))
            );

            return result;
        }
        public async Task<string> SearchRegistration(RetailBAL obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.SearchRegistration(obj)));
            return result;
        }

        public ActionResult TransportMaster()
        {
            return View();
        }



        public async Task<string> SearchRoute(RetailBAL obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.SearchRoute(obj)));
            return result;
        }
        public string SavePostedFile(HttpPostedFileBase file, string folderName)
        {
            try
            {
                if (file != null && file.ContentLength > 0)
                {

                    string folderPath = System.Web.HttpContext.Current.Server.MapPath("~/DownloadMat/" + folderName);

                    // Folder create if not exists
                    if (!Directory.Exists(folderPath))
                    {
                        Directory.CreateDirectory(folderPath);
                    }

                    // ✅ Unique file name
                    string fileName = Guid.NewGuid().ToString() + Path.GetExtension(file.FileName);

                    string fullPath = Path.Combine(folderPath, fileName);

                    // ✅ Save file
                    file.SaveAs(fullPath);

                    // ✅ Return relative path (DB me store karne ke liye)
                    return "../DownloadMat/" + folderName + "/" + fileName;
                }
            }
            catch (Exception ex)
            {
                throw ex;
            }

            return null;
        }
        public async Task<string> InsertUpdateRouteMaster()
        {
            string result = "";
            var form = Request.Form;


            string ActionType = form["ActionType"];
            string UserId = form["UserId"];
            string PartyId = form["PartyId"];

            // Route Details
            string RouteID = form["RouteID"];

            string RouteName = form["RouteName"];
            string CompanyName = form["CompanyName"];
            string Location = form["Location"];
            string RouteStartLocation = form["RouteStartLocation"];
            string RouteEndLocation = form["RouteEndLocation"];
            string Status = form["Status"];

            // Bus Details
            string BusNumber = form["BusNumber"];
            string RCNO = form["RCNO"];
            string SeatingCapacity = form["SeatingCapacity"];
            string BusType = form["BusType"];

            // Driver Details
            string DriverName = form["DriverName"];
            string DriverContactNumber = form["DriverContactNumber"];
            string DriverAddress = form["DriverAddress"];
            string LicenseNumber = form["LicenseNumber"];

            // Conductor Details
            string ConductorName = form["ConductorName"];
            string ConductorContact = form["ConductorContact"];
            string ConductorAddress = form["ConductorAddress"];

            // FILE PATH VARIABLES
            string LicenseCopyPath = null;
            string AadharCardCopyPath = null;
            string ConductorAadhaarCardPath = null;
            string BusRCPath = null;
            string PollutionCertificatePath = null;
            string FitnessCertificatePath = null;
            string InsuranceCopyPath = null;




            var file = Request.Files["LicenseCopy"];

            if (file != null && file.ContentLength > 0)
            {
                LicenseCopyPath = SavePostedFile(file, "Transport");
            }

            var fileAadharCardCopy = Request.Files["AadharCardCopy"];

            if (fileAadharCardCopy != null && fileAadharCardCopy.ContentLength > 0)
            {
                AadharCardCopyPath = SavePostedFile(fileAadharCardCopy, "Transport");
            }

            var FileConductorAadhaarCard = Request.Files["ConductorAadhaarCard"];

            if (FileConductorAadhaarCard != null && FileConductorAadhaarCard.ContentLength > 0)
            {
                ConductorAadhaarCardPath = SavePostedFile(FileConductorAadhaarCard, "Transport");
            }

            var FileBusRC = Request.Files["BusRC"];

            if (FileBusRC != null && FileBusRC.ContentLength > 0)
            {
                BusRCPath = SavePostedFile(FileBusRC, "Transport");
            }
            var filePollutionCertificate = Request.Files["PollutionCertificate"];

            if (filePollutionCertificate != null && filePollutionCertificate.ContentLength > 0)
            {
                PollutionCertificatePath = SavePostedFile(filePollutionCertificate, "Transport");
            }
            var fileFitnessCertificate = Request.Files["FitnessCertificate"];

            if (fileFitnessCertificate != null && fileFitnessCertificate.ContentLength > 0)
            {
                FitnessCertificatePath = SavePostedFile(fileFitnessCertificate, "Transport");
            }


            var fileInsurance = Request.Files["FitnessCertificate"];

            if (fileInsurance != null && fileInsurance.ContentLength > 0)
            {
                InsuranceCopyPath = SavePostedFile(fileInsurance, "Transport");
            }



            try
            {
                var routeData = new RouteMasterModel
                {

                    ActionType = ActionType,
                    UserId = UserId,
                    PartyId = PartyId,
                    RouteName = RouteName,
                    RouteID = RouteID,
                    CompanyName = CompanyName,
                    Location = Location,
                    RouteStartLocation = RouteStartLocation,
                    RouteEndLocation = RouteEndLocation,
                    Status = Status,

                    // Bus
                    BusNumber = BusNumber,
                    RCNO = RCNO,
                    SeatingCapacity = SeatingCapacity,
                    BusType = BusType,

                    // Driver
                    DriverName = DriverName,
                    DriverContactNumber = DriverContactNumber,
                    DriverAddress = DriverAddress,
                    LicenseNumber = LicenseNumber,

                    // Conductor
                    ConductorName = ConductorName,
                    ConductorContact = ConductorContact,
                    ConductorAddress = ConductorAddress,

                    // Files
                    LicenseCopy = LicenseCopyPath,
                    AadharCardCopy = AadharCardCopyPath,
                    ConductorAadhaarCard = ConductorAadhaarCardPath,
                    BusRC = BusRCPath,
                    PollutionCertificate = PollutionCertificatePath,
                    FitnessCertificate = FitnessCertificatePath,
                    InsuranceCopy = InsuranceCopyPath
                };

                result = await Task.Factory.StartNew(() =>
                    JsonConvert.SerializeObject(
                        DAL.DLL.InsertUpdateRouteMaster(routeData)
                    )
                );
            }
            catch (Exception ex)
            {
                Console.WriteLine(ex.Message);
                throw;
            }

            return result;
        }



        public ActionResult ContractorCompliance()
        {
            return View();
        }
        public ActionResult ContractorComplianceVendor()
        {
            return View();
        }
        public ActionResult ContractorReport()
        {
            return View();
        }
        public ActionResult ContractorReportVendor()
        {
            return View();
        }
		
		  // here is define new code for check roll permission dated 23/04/2026
        public async Task<string> GetUserPermissionSectionRoll(TblPartyMaster obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.GetUserPermissionSectionRoll(obj)));
            return result;
        }

        public async Task<string> SearchPrincipleEmploye(TblPartyMaster obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.SearchPrincipleEmploye(obj)));
            return result;
        }
        public ActionResult AutoFillDoc()
        {
            return View();
        }
        
		// added  by aadarsh dated 12/06/2026
		public async Task<string> bindworkerdetail(RetialEmployeeManager obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.BindWorkerDashboard(obj)));
            return result;
        }
        public ActionResult WorkerRegistration()
        {
            return View();
        }
        public ActionResult WorkerLodgeGrievance()
        {
            return View();
        }
        public ActionResult ContractorGrievances()
        {
            return View();
        }

        public ActionResult ContractorGrievancesDetails()
        {
            return View();
        }

        public ActionResult WorkerGrievances()
        {
            return View();
        }
        public ActionResult WorkerGrievancesDetails()
        {
            return View();
        }
        public ActionResult GrievancesDetails()
        {
            return View();
        }
        public ActionResult supportGrievances()
        {
            return View();
        }

        // added by aadarsh
        public ActionResult NewWorkerRegistraton()
        {
            return View();
        }

        public ActionResult ContractorWorker()
        {
            return View();
        }

        public ActionResult WorkerProfile()
        {
            return View();
        }

        public ActionResult ContractorProfile()
        {
            return View();
        }
        public ActionResult PrincipleProfile()
        {
            return View();
        }
        public ActionResult ContractorRegistration()
        {
            return View();
        }

        public ActionResult PrincipleEmployerRegistration()
        {
            return View();
        }

        public ActionResult ContractorRozgar()
        {
            return View();
        }


        public ActionResult JobHistory()
        {
            return View();
        }


        public ActionResult WorkerApplicationHistory()
        {
            return View();
        }


        // here is add new  by aadarsh 19/06/2026
        public async Task<string> SendReqToWorker(RetialEmployeeManager obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.SendReqToWorker(obj)));
            return result;
        }

        public async Task<string> ContractorDashboard(TblPartyMaster obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.ContractorDashboard(obj)));
            return result;
        }

        // here is for contractor Registration
        public async Task<string> ContractorRegister(RetailBAL obj)
        {
            if (!string.IsNullOrEmpty(obj.File4))
            {
                obj.File4 = SaveContDoc(obj.File4, "Contractor");
            }
            if (!string.IsNullOrEmpty(obj.File5))
            {
                obj.File5 = SaveContDoc(obj.File5, "Contractor");
            }
            if (!string.IsNullOrEmpty(obj.File6))
            {
                obj.File6 = SaveContDoc(obj.File6, "Contractor");
            }
            if (!string.IsNullOrEmpty(obj.File7))
            {
                obj.File7 = SaveContDoc(obj.File7, "Contractor");
            }
            if (!string.IsNullOrEmpty(obj.File8))
            {
                obj.File8 = SaveContDoc(obj.File8, "Contractor");
            }
            if (!string.IsNullOrEmpty(obj.File9))
            {
                obj.File9 = SaveContDoc(obj.File9, "Contractor");
            }
            if (!string.IsNullOrEmpty(obj.File16))
            {
                obj.File16 = SaveContDoc(obj.File16, "Contractor");
            }
            if (!string.IsNullOrEmpty(obj.File19))
            {
                obj.File19 = SaveContDoc(obj.File19, "Contractor");
            }
            if (!string.IsNullOrEmpty(obj.file22))
            {
                obj.file22 = SaveContDoc(obj.file22, "Contractor");
            }
            if (!string.IsNullOrEmpty(obj.file23))
            {
                obj.file23 = SaveContDoc(obj.file23, "Contractor");
            }
            if (!string.IsNullOrEmpty(obj.file24))
            {
                obj.file24 = SaveContDoc(obj.file24, "Contractor");
            }
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.ContractorRegister(obj)));
            return result;
            
        }
        // here is new method for save contractor document
        private string SaveContDoc(string dataURI, string For)
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

                    if (For == "Contractor")
                    {
                        uploadpath = "../DownloadMat/VendorRegister/" + fileName;
                        folderPath = Server.MapPath("../DownloadMat/VendorRegister/");
                    }
                    if (!Directory.Exists(folderPath))
                    {
                        Directory.CreateDirectory(folderPath);
                    }

                    string filePath = Path.Combine(folderPath, fileName);
                    System.IO.File.WriteAllBytes(filePath, fileData);

                    return uploadpath;
                }

                return null; 
            }
            catch (Exception ex)
            {
                throw;
            }
        }

        public async Task<string> SavePrincipleEmployer(RetailBAL obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.SavePrincipleEmployer(obj)));
            return result;
        }

        public async Task<string> SaveJobHistory(JobHistory obj)
        {
            if (!string.IsNullOrEmpty(obj.Appointmentletter))
            {
                obj.Appointmentletter = SaveJobFile(obj.Appointmentletter, "JobHistory");
            }
            if (!string.IsNullOrEmpty(obj.Experienceletter))
            {
                obj.Experienceletter = SaveJobFile(obj.Experienceletter, "JobHistory");
            }

            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.SaveJobHistory(obj)));
            return result;
        }
        private string SaveJobFile(string dataURI, string For)
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

                    if (For == "JobHistory")
                    {
                        uploadpath = "../DownloadMat/JobHistory/" + fileName;
                        folderPath = Server.MapPath("../DownloadMat/JobHistory/");
                    }
                    if (!Directory.Exists(folderPath))
                    {
                        Directory.CreateDirectory(folderPath);
                    }

                    string filePath = Path.Combine(folderPath, fileName);
                    System.IO.File.WriteAllBytes(filePath, fileData);

                    return uploadpath;
                }

                return null;
            }
            catch (Exception ex)
            {
                throw;
            }
        }
		
		 public async Task<string> GetWorkerJobHistory(JobHistory obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.GetWorkerJobHistory(obj)));
            return result;
        }
		
		 public async Task<string> ReleaseWorkerByContractor(ReleaseWorker obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.ReleaseWorkerByContractor(obj)));
            return result;

        }
		
		  public async Task<string> ApproveorRejectRequest(RetailBAL obj)
        {
            string result = await Task.Factory.StartNew(() => JsonConvert.SerializeObject(DAL.DLL.ApproveorRejectRequest(obj)));
            return result;

        }

    }
}