using BAL;
using System.Collections.Generic;
using System.Data;
using System.Data.SqlClient;
using System.Threading.Tasks;

namespace DAL
{
    public partial class DLL
    {

        public async static Task<DataTable> GetSearchLocation(TblPartyMaster obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@PartyId",obj.PartyId),
                new SqlParameter("@PartyType",obj.PartyType),
                new SqlParameter("@ActionType", obj.ActionType),
            };
            DataTable dt = await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("Usp_Location", CommandType.StoredProcedure, param.ToArray()));
            return dt;
        }
        public async static Task<string> InsertUpdateDelLocation(TblPartyMaster obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@ActionType", obj.ActionType),
                new SqlParameter("@Id", obj.Id),
                new SqlParameter("@CreatedBy", obj.CreatedBy),
                new SqlParameter("@Location", obj.Location),
                new SqlParameter("@SiteId", obj.ClientSiteId),
                new SqlParameter("@PartyId", obj.PartyId),
                new SqlParameter("@Result",""),
            };
            return await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteNonQueryReturnScalar("Usp_Location", CommandType.StoredProcedure, param.ToArray()));
        }
        public async static Task<DataTable> PartyMaster(TblPartyMaster obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@PartyId",obj.PartyId),
                new SqlParameter("@PartyType",obj.PartyType),
                new SqlParameter("@Sptype", obj.ActionType),
                 new SqlParameter("@CreatedBy", obj.CreatedBy),
            };
            DataTable dt = await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("EVM.USP_TBL_PartyMaster", CommandType.StoredProcedure, param.ToArray()));
            return dt;
        }
        public async static Task<string> InsertUpdateDelPartyMaster(TblPartyMaster obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@Sptype", obj.ActionType),
                new SqlParameter("@PartyId",obj.PartyId),
                new SqlParameter("@VendorId",obj.VendorId),
                new SqlParameter("@PartyType",obj.PartyType),
                new SqlParameter("@PartyName",obj.PartyName),
                new SqlParameter("@Address",obj.Address),
                new SqlParameter("@EmailId",obj.EmailId),
                new SqlParameter("@Pincode",obj.Pincode),
                new SqlParameter("@ContactNo",obj.ContactNo),
                new SqlParameter("@BankDetails",obj.BankDetails),
                new SqlParameter("@RegistrationType",obj.RegistrationType),
                new SqlParameter("@PANITNO",obj.Panitno),
                new SqlParameter("@GSTINUIN",obj.Gstinuin),
                new SqlParameter("@Descritpion",obj.Descritpion),
                new SqlParameter("@ContactMobile",obj.ContactMobile),
                new SqlParameter("@ContactPerson",obj.ContactPerson) ,
                new SqlParameter("@CREATED_BY", obj.CreatedBy),
                new SqlParameter("@ATTRIBUTE1", obj.Attribute1),
                new SqlParameter("@ATTRIBUTE2", obj.Attribute2),
                new SqlParameter("@ATTRIBUTE3", obj.Attribute3),
                new SqlParameter("@ATTRIBUTE4", obj.Attribute4),
                new SqlParameter("@ATTRIBUTE5", obj.Attribute5),
                new SqlParameter("@ATTRIBUTE6", obj.Attribute6),
                new SqlParameter("@IsActive", obj.IsActive),
                new SqlParameter("@IsDeleted", obj.IsDeleted),
                new SqlParameter("@StoreLimit", obj.StoreLimit),
                 new SqlParameter("@UserLimit", obj.UserLimit),
                    new SqlParameter("@State", obj.State),
                       new SqlParameter("@City", obj.City),
                new SqlParameter("@ValidTo", obj.ValidTo),
                   new SqlParameter("@PartyDate", obj.PartyDate),
                new SqlParameter("@Industry", obj.Industry),
                  new SqlParameter("@MonthExpired", obj.MonthExpired), ///Added by shipra
  new SqlParameter("@Contractorlimit", obj.Contractorlimit), ///Added by Aadarsh dated 29/04/2026 
                    new SqlParameter("@Sitelimit", obj.Sitelimit), //Added by Aadarsh dated 29/04/2026 
                     new SqlParameter("@Startdt", obj.Startdt), //Added by Aadarsh dated 29/04/2026 				  
                new SqlParameter("@RESULT",""),
            };
            return await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteNonQueryReturnScalar("EVM.USP_TBL_PartyMaster", CommandType.StoredProcedure, param.ToArray()));
        }
        //------------------------------------------Site Manager

        public async static Task<DataTable> SiteManager(TblSiteManager obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@SiteId",obj.SiteId),
                new SqlParameter("@PartyId",obj.PartyId),
                new SqlParameter("@PartyType",obj.PartyType),
                new SqlParameter("@Sptype", obj.ActionType),
            };
            DataTable dt = await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("EVM.USP_TBL_SiteManager", CommandType.StoredProcedure, param.ToArray()));
            return dt;
        }
        public async static Task<string> InsertUpdateDelSiteManager(TblSiteManager obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@Sptype", obj.ActionType),
                new SqlParameter("@SiteId",obj.SiteId),
                new SqlParameter("@PartyId",obj.PartyId),
                      new SqlParameter("@PartyIds",obj.PartyIds),
                new SqlParameter("@PartyType",obj.PartyType),
                new SqlParameter("@SiteName",obj.SiteName),
                new SqlParameter("@CityID",obj.CityId),
                new SqlParameter("@StateID",obj.StateId),
                new SqlParameter("@CountryID",obj.CountryId),
                new SqlParameter("@Address",obj.Address),
                new SqlParameter("@LocationCode",obj.LocationCode),
                new SqlParameter("@Description",obj.Description),
                new SqlParameter("@EmailId",obj.EmailId),
                new SqlParameter("@Pincode",obj.Pincode),
                new SqlParameter("@ContactNo",obj.ContactNo),
                new SqlParameter("@AccountNo",obj.AccountNo),
                new SqlParameter("@BankDetails",obj.BankDetails),
                new SqlParameter("@RegistrationType",obj.RegistrationType),
                new SqlParameter("@PANITNO",obj.Panitno),
               
                new SqlParameter("@CLRARC",obj.CLRARC),
                new SqlParameter("@CLRLIC",obj.CLRLIC),
                new SqlParameter("@ContactPerson",obj.ContactPerson),
                new SqlParameter("@ContactMobile",obj.ContactMobile),
                new SqlParameter("@Descritpion",obj.Descritpion),
                new SqlParameter("@ValidFrom",obj.ValidFrom),
                new SqlParameter("@ValidTo",obj.ValidTo),
                new SqlParameter("@Manpowertype",obj.Manpowertype),
                new SqlParameter("@ManPowerCount",obj.ManPowerCount),

                new SqlParameter("@AdminFileDoc",obj.AdminFileDoc),
                new SqlParameter("@VendorFileDoc",obj.VendorFileDoc),




                new SqlParameter("@NLabourOffice",obj.NLabourOffice),
                new SqlParameter("@Nature",obj.Nature),
                  new SqlParameter("@AssignColor",obj.AssignColor),
                new SqlParameter("@PrincipalRegistration",obj.PrincipalRegistration),
                new SqlParameter("@IssuingAuthority",obj.IssuingAuthority),
                new SqlParameter("@CLRA_MaxWorkers",obj.CLRA_MaxWorkers),
                new SqlParameter("@CLRA_Validity",obj.CLRA_Validity),
                   new SqlParameter("@RCCopy",obj.RCCopy),
                new SqlParameter("@RenewalRCCopy",obj.RenewalRCCopy),
                new SqlParameter("@BOCW_Reg",obj.BOCW_Reg),
                new SqlParameter("@BOCW_IssuingAuth",obj.BOCW_IssuingAuth),
                new SqlParameter("@BOCW_MaxWorkers",obj.BOCW_MaxWorkers),
                new SqlParameter("@BOCW_Validity",obj.BOCW_Validity),
                new SqlParameter("@BOCWRCCopy",obj.BOCWRCCopy),
                new SqlParameter("@RenewalBOCWRCCopy",obj.RenewalBOCWRCCopy),
                new SqlParameter("@VendorType",obj.VendorType),
                new SqlParameter("@MaxContractors",obj.MaxContractors),
                new SqlParameter("@MaxWorkersSite",obj.MaxWorkersSite),
                new SqlParameter("@PPEMandatory",obj.PPEMandatory),
                new SqlParameter("@PPEType",obj.PPEType),
                new SqlParameter("@SafetyTraining",obj.SafetyTraining),
                new SqlParameter("@SiteInduction",obj.SiteInduction),
                new SqlParameter("@PoliceVerification",obj.PoliceVerification),
                new SqlParameter("@IDCardRequired",obj.IDCardRequired), 

                 new SqlParameter("@GSTINUIN",obj.Gstinuin),
                new SqlParameter("@CREATED_BY", obj.CreatedBy),
                new SqlParameter("@ATTRIBUTE1", obj.Attribute1),
                new SqlParameter("@ATTRIBUTE2", obj.Attribute2),
                new SqlParameter("@ATTRIBUTE3", obj.Attribute3),
                new SqlParameter("@ATTRIBUTE4", obj.Attribute4),
                new SqlParameter("@ATTRIBUTE5", obj.Attribute5),
                new SqlParameter("@ATTRIBUTE6", obj.Attribute6),
                new SqlParameter("@IsActive", obj.IsActive),
                new SqlParameter("@IsDeleted", obj.IsDeleted),

                  new SqlParameter("@Drinkingwater", obj.Drinkingwater),
                    new SqlParameter("@Washroom", obj.Washroom),
                      new SqlParameter("@RestShelter", obj.RestShelter),
                        new SqlParameter("@FirstAid", obj.FirstAid),
                             new SqlParameter("@TrainerName", obj.TrainerName),


                              new SqlParameter("@ValidDay",obj.ValidDay),
                               new SqlParameter("@ReminderDay",obj.ReminderDay),
                                new SqlParameter("@Automation",obj.Automation),
                                 new SqlParameter("@SiteType",obj.SiteType),

                new SqlParameter("@RESULT",""),
            };
            return await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteNonQueryReturnScalar("EVM.USP_TBL_SiteManager", CommandType.StoredProcedure, param.ToArray()));
        }
        //------------------------------------------------TimePeriod


        public async static Task<DataTable> GetSearchTimePeriod(TblPartyMaster obj)
        {
            var param = new List<SqlParameter>
            {
              new SqlParameter("@Id", obj.Id),
                new SqlParameter("@Action", obj.ActionType),
            };
            DataTable dt = await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("Usp_TimePeriod", CommandType.StoredProcedure, param.ToArray()));
            return dt;
        }
        public async static Task<string> IUDTimePeriod(TblPartyMaster obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@Action", obj.ActionType),
                new SqlParameter("@Id", obj.Id),
                new SqlParameter("@ClientId", obj.ClientId),
                new SqlParameter("@VendorId", obj.VendorId),
                new SqlParameter("@Location", obj.Location),
                new SqlParameter("@ClientSiteId", obj.ClientSiteId),
                new SqlParameter("@Year", obj.Year),
                new SqlParameter("@Month", obj.Month),
                new SqlParameter("@EndDate", obj.EndDate),
                new SqlParameter("@Result",""),
            };
            return await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteNonQueryReturnScalar("Usp_TimePeriod", CommandType.StoredProcedure, param.ToArray()));
        }
        //--------------------------------------End

        // here is new code for compliances dated 07,08/082026
        public async static Task<string> InsertUpdateDelLWFCompliance(tblCompliances obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@Action", obj.Action),
                new SqlParameter("@Id", obj.Id),
                new SqlParameter("@Status", obj.Status),
                new SqlParameter("@State",obj.State),
                new SqlParameter("@DeductionCycle",obj.DeductionCycle),
                new SqlParameter("@PTNumber",obj.PTNumber),
                new SqlParameter("@Applicability",obj.Applicability),
                new SqlParameter("@Payment",obj.Payment),
                new SqlParameter("@ApplicationLink",obj.ApplicationLink),
                new SqlParameter("@LicenseName",obj.LicenseName),
                new SqlParameter("@ApplicabilityCount",obj.ApplicabilityCount),
                new SqlParameter("@GovtFees",obj.GovtFees),
                new SqlParameter("@DepositeAmt",obj.DepositeAmt),
                new SqlParameter("@MinAmount",obj.MinAmount),
                new SqlParameter("@MaxAmount",obj.MaxAmount) ,
                new SqlParameter("@EmployeeShare", obj.EmployeeShare),
                new SqlParameter("@EmployerShare", obj.EmployerShare),
                new SqlParameter("@Type", obj.Type),
                new SqlParameter("@Month", obj.Month),
                new SqlParameter("@DesignationType", obj.DesignationType),
                new SqlParameter("@Designation", obj.Designation),
                new SqlParameter("@EffectiveFrom", obj.EffectiveFrom),
                new SqlParameter("@Effectiveto", obj.Effectiveto),
                new SqlParameter("@CreatedBy", obj.CreatedBy),
                new SqlParameter("@RESULT",""),
            };
            return await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteNonQueryReturnScalar("USP_LWFCompliances", CommandType.StoredProcedure, param.ToArray()));
        }

        public async static Task<DataTable> GetNewCompliancesData(tblCompliances obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@Id",obj.Id),
                new SqlParameter("@State",obj.State),
                new SqlParameter("@Action", obj.Action),
                new SqlParameter("@CreatedBy", obj.CreatedBy),
            };

            DataTable dt = await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("USP_LWFCompliances", CommandType.StoredProcedure, param.ToArray()));
            return dt;
        }

        public async static Task<string> InsertUpdateDelMinimumWageCompliance(MinimumWages obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@Id", obj.Id),
                new SqlParameter("@State", obj.State),
                new SqlParameter("@Status", obj.Status),
                new SqlParameter("@Action", obj.Action),

                new SqlParameter("@Industry", obj.Industry),
                new SqlParameter("@PaymentFrequency", obj.PaymentFrequency),
                new SqlParameter("@PercentageBonus", obj.PercentageBonus),
                new SqlParameter("@PayoutMonth", obj.PayoutMonth),
                new SqlParameter("@Grade", obj.Grade),
                new SqlParameter("@EmploymentCategory", obj.EmploymentCategory),
                new SqlParameter("@Zone", obj.Zone),
                new SqlParameter("@BasicPerMonth", obj.BasicPerMonth),
                new SqlParameter("@VDAPerMonth", obj.VDAPerMonth),
                new SqlParameter("@TotalPerMonth", obj.TotalPerMonth),
                new SqlParameter("@MinimumWage", obj.MinimumWage),
                new SqlParameter("@FloorWage", obj.FloorWage),
                new SqlParameter("@EffectiveFrom", obj.EffectiveFrom),
                new SqlParameter("@Effectiveto", obj.Effectiveto),
                new SqlParameter("@CreatedBy", obj.CreatedBy),
                new SqlParameter("@RESULT", "")
            };
            return await Task.Factory.StartNew(() =>
                SqlDBHelper.SqlHelper.ExecuteNonQueryReturnScalar(
                    "USP_MinimumWagesCompliance",
                    CommandType.StoredProcedure,
                    param.ToArray()
                )
            );
        }

        public async static Task<DataTable> GetNewCMinmumWages(MinimumWages obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@Id",obj.Id),
                new SqlParameter("@State",obj.State),
                new SqlParameter("@Action", obj.Action),
                new SqlParameter("@CreatedBy", obj.CreatedBy),
            };

            DataTable dt = await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("USP_MinimumWagesCompliance", CommandType.StoredProcedure, param.ToArray()));
            return dt;
        }

        public async static Task<string> SaveDynamicRows(DynamicRowsModel obj)
        {
            string result = "0";

            foreach (var item in obj.DynamicRows)
            {
                var param = new List<SqlParameter>
                {
                    new SqlParameter("@Action", 1),
                    new SqlParameter("@PtId", item.PtId),
                    new SqlParameter("@Id", item.Id),
                    new SqlParameter("@Value1", item.Value1 ?? "0"),
                    new SqlParameter("@Value2", item.Value2 ?? "0"),
                    new SqlParameter("@Value3", item.Value3 ?? "0"),
                    new SqlParameter("@CreatedBy", item.CreatedBy ?? ""),
                    new SqlParameter("@RESULT", "")
                };
                result = await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteNonQueryReturnScalar("USP_ProfessionalTaxSlabs", CommandType.StoredProcedure, param.ToArray()));
            }
            return result;
        }

    }
}