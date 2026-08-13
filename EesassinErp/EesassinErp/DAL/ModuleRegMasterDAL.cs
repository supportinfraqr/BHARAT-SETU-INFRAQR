using BAL;
using System.Collections.Generic;
using System.Data;
using System.Data.SqlClient;
using System.Text;
using System.Threading.Tasks;

namespace DAL
{
    public partial class DLL
    {
        public async static Task<DataTable> GetSearchModuleReg(TblModuleRegMaster obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@Action", obj.ActionType),
            };
            DataTable dt = await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("RTL.Usp_Module_Reg_Master", CommandType.StoredProcedure, param.ToArray()));
            return dt;
        }
        public async static Task<string> InsertUpdateDelModuleRegMaster(TblModuleRegMaster obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@Action", obj.ActionType),
                new SqlParameter("@Id", obj.Id),
                new SqlParameter("@UserId", obj.userid),
                new SqlParameter("@Module_Name", obj.Module_Name),
                new SqlParameter("@Description", obj.Description),
                new SqlParameter("@Start_Date", obj.Start_Date),
                new SqlParameter("@End_Date",obj.End_Date),
                new SqlParameter("@IsActive",obj.IsActive),
                new SqlParameter("@IsApproval",obj.IsApproval),
                new SqlParameter("@IsDeleted",obj.IsDeleted),
                new SqlParameter("@RESULT",""),
            };
            return await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteNonQueryReturnScalar("RTL.Usp_Module_Reg_Master", CommandType.StoredProcedure, param.ToArray()));
        }

        public async static Task<DataTable> GetSearchModuleMappingMaster(TblModuleMappingMaster obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@Action", obj.ActionType),
            };
            DataTable dt = await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("RTL.Usp_Module_Mapping_Master", CommandType.StoredProcedure, param.ToArray()));
            return dt;
        }
        public async static Task<string> InsertUpdateDelModuleMappingMaster(TblModuleMappingMaster obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@Action", obj.ActionType),
                new SqlParameter("@Id", obj.Id),
                new SqlParameter("@UserId", obj.userid),
                new SqlParameter("@Module_Reg_Id", obj.Module_Reg_Id),
                new SqlParameter("@Party_Id", obj.Party_Id),
                new SqlParameter("@Party_Type_ID", obj.Party_Type_Id),
                new SqlParameter("@IsActive",obj.IsActive),
                new SqlParameter("@IsApproval",obj.IsApproval),
                new SqlParameter("@IsDeleted",obj.IsDeleted),
                new SqlParameter("@RESULT",""),
            };
            return await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteNonQueryReturnScalar("RTL.Usp_Module_Mapping_Master", CommandType.StoredProcedure, param.ToArray()));
        }
        public async static Task<string> InsertUpdateDelRoleMaster(TblPartyMaster obj)
        {
            var param = new List<SqlParameter>
            {
                    new SqlParameter("@Id", obj.Id),
                    new SqlParameter("@PartyType", obj.PartyType),
                    new SqlParameter("@PartyId", obj.PartyId),
                    new SqlParameter("@UserId", obj.UserId),
                    new SqlParameter("@RoleName", obj.PartyName),
                    new SqlParameter("@Description", obj.Description),
                    new SqlParameter("@CreatedBy", obj.CreatedBy),
                    new SqlParameter("@StartDate", obj.StartDate),
                    new SqlParameter("@EndDate", obj.EndDate),
                    new SqlParameter("@Action", obj.ActionType),
                    new SqlParameter("@GradeId", obj.GradeId),
                    new SqlParameter("@RESULT",""),
            };
            return await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteNonQueryReturnScalar("[RTL].[Usp_RoleMaster]", CommandType.StoredProcedure, param.ToArray()));
        }
        public async static Task<DataTable> SearchRoleMaster(TblPartyMaster obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@Action", obj.ActionType),
            };
            DataTable dt = await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("[RTL].[Usp_RoleMaster]", CommandType.StoredProcedure, param.ToArray()));
            return dt;
        }



        public async static Task<string> InsertUpdateDelGradeMaster(TblPartyMaster obj)
        {
            var param = new List<SqlParameter>
            {
                    new SqlParameter("@Id", obj.Id),
                    new SqlParameter("@PartyType", obj.PartyType),
                    new SqlParameter("@PartyId", obj.PartyId),
                    new SqlParameter("@GradeName", obj.PartyName),
                    new SqlParameter("@Sequence ", obj.Attribute1),
                    new SqlParameter("@Description", obj.Description),
                    new SqlParameter("@CreatedBy", obj.CreatedBy),
                    new SqlParameter("@StartDate", obj.StartDate),
                    new SqlParameter("@EndDate", obj.EndDate),
                    new SqlParameter("@Action", obj.ActionType),
                    new SqlParameter("@RESULT",""),
            };
            return await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteNonQueryReturnScalar("[RTL].[Usp_GradeMaster]", CommandType.StoredProcedure, param.ToArray()));
        }
        public async static Task<DataTable> SearchGradeMaster(TblPartyMaster obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@Action", obj.ActionType),
                new SqlParameter("@PartyId", obj.PartyId),
            };
            DataTable dt = await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("[RTL].[Usp_GradeMaster]", CommandType.StoredProcedure, param.ToArray()));
            return dt;
        }
        public async static Task<DataTable> GetLicenseMasterDocumentList()
        {

            DataTable dt = await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteSelectCommand("RTL.GetLicenseMasterDocumentList", CommandType.StoredProcedure));
            return dt;
        }

        public async static Task<string> InsertUpdateDelLicenseMasterDocumentList(RetailLicenseDocuementMaster obj)
        {
            var param = new List<SqlParameter>
            {
                    new SqlParameter("@LicenseId", obj.LicenseId),
                    new SqlParameter("@PermissionId", obj.PermissionId),
                    new SqlParameter("@ActionType", obj.ActionType),
                    new SqlParameter("@PartyTypeId", obj.PartyTypeId),
                     new SqlParameter("@Id", obj.Id),
                    new SqlParameter("@selectedUsersList", obj.selectedUsersList),
                    new SqlParameter("@LicenseName ", obj.LicenseName),
                    new SqlParameter("@selectedDocumentsList", obj.selectedDocumentsList),
                    new SqlParameter("@CreatedBy", obj.CreatedBy),
                    new SqlParameter("@StartDate", obj.StartDate),
                    new SqlParameter("@EndDate", obj.EndDate),
                    new SqlParameter("@LicenseMasterType", obj.LicenseMasterType),
                
                    new SqlParameter("@StateList", obj.StateList),
                    new SqlParameter("@Act", obj.Act),
                    //new SqlParameter("@Category", obj.Category),
                    new SqlParameter("@CategoryList", obj.CategoryList),
                    new SqlParameter("@LSID", obj.LSID),
                    new SqlParameter("@LCID", obj.LCID),
                    new SqlParameter("@Industry", obj.Industry),
                    new SqlParameter("@ApplicationLink", obj.ApplicationLink),
                    new SqlParameter("@Detail", obj.Detail),
                    new SqlParameter("@RESULT",""),
            };
            return await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteNonQueryReturnScalar("[RTL].[Usp_RetailLicenseDocuementMaster]", CommandType.StoredProcedure, param.ToArray()));
        }

        public async static Task<DataTable> SearchLicenseDocumentMaster(TblPartyMaster obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@ActionType", obj.ActionType),
                new SqlParameter("@LicenseId", obj.Id),
                new SqlParameter("@PageNumber", obj.PageNumber),
            new SqlParameter("@PageSize", obj.PageSize),
            new SqlParameter("@Search", obj.Search),
            new SqlParameter("@Id", obj.LicenseId),
            };
            DataTable dt = await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("[RTL].[Usp_RetailLicenseDocuementMaster]", CommandType.StoredProcedure, param.ToArray()));
            return dt;
        }
        public async static Task<DataSet> SearchLicenseDocumentMasterList(TblPartyMaster obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@ActionType", obj.ActionType),
                new SqlParameter("@LicenseId", obj.Id),
                 new SqlParameter("@LSID", obj.LSID),
                 new SqlParameter("@LCID", obj.LCID),

            };
            DataSet dt = await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommandds("RTL.Usp_RetailLicenseDocuementMaster", CommandType.StoredProcedure, param.ToArray()));
            return dt;
        }

        public async static Task<DataTable> GetStore(RetialStoreManager obj)
        {
            var param = new List<SqlParameter>
            {
              new SqlParameter("@Action", obj.ActionType),
              new SqlParameter("@UserId",obj.UserId),
                new SqlParameter("@Id",obj.Id),
            };
            DataTable dt = await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("RTL.Usp_StoreMaster", CommandType.StoredProcedure, param.ToArray()));
            return dt;
        }


        public async static Task<string> InsertUpdateDelStoreMapping(RetailLicenseDocuementMaster obj)
        {
            StringBuilder DocumentList = new StringBuilder();

            string bigseprator = "";
            for (int i = 0; i < obj.DocumentList.Count; i++)
            {
                DocumentList.Append(bigseprator);
                DocumentList.Append(obj.DocumentList[i].StoreId);
                bigseprator = "|";
            }

            var param = new List<SqlParameter>
            {
                new SqlParameter("@Action", obj.ActionType),
                new SqlParameter("@StoreList", DocumentList.ToString()),
                new SqlParameter("@PartyId", obj.PartyId),
                new SqlParameter("@UserId", obj.UserId),
                new SqlParameter("@PartyTypeId", obj.PartyTypeId),
                new SqlParameter("@CreatedBy", obj.CreatedBy),
                new SqlParameter("@StartDate", obj.StartDate),
                new SqlParameter("@EndDate", obj.EndDate),
                new SqlParameter("@RESULT",""),
            };
            return await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteNonQueryReturnScalar("[RTL].[Usp_StoreMapping]", CommandType.StoredProcedure, param.ToArray()));
        }
        public async static Task<string> InsertUpdateDelIndustryMapping(RetailLicenseDocuementMaster obj)
        {
            StringBuilder DocumentList = new StringBuilder();

            string bigseprator = "";
            for (int i = 0; i < obj.DocumentList.Count; i++)
            {
                DocumentList.Append(bigseprator);
                DocumentList.Append(
                    obj.DocumentList[i].StoreId + "," +
                    obj.DocumentList[i].CategoryId
                );
                bigseprator = "|";
            }

            var param = new List<SqlParameter>
            {
                new SqlParameter("@Action", obj.ActionType),
                new SqlParameter("@StoreList", DocumentList.ToString()),
                new SqlParameter("@PartyId", obj.PartyId),
                new SqlParameter("@UserId", obj.UserId),
                new SqlParameter("@PartyTypeId", obj.PartyTypeId),
                new SqlParameter("@CreatedBy", obj.CreatedBy),
                new SqlParameter("@StartDate", obj.StartDate),
                new SqlParameter("@EndDate", obj.EndDate),
                new SqlParameter("@RESULT",""),
            };
            return await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteNonQueryReturnScalar("[RTL].[Usp_StoreMapping]", CommandType.StoredProcedure, param.ToArray()));
        }

        public async static Task<DataTable> SearchStoreMapping(TblPartyMaster obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@Action", obj.ActionType),
                new SqlParameter("@UserId", obj.PartyId),
            };
            DataTable dt = await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("[RTL].[Usp_StoreMapping]", CommandType.StoredProcedure, param.ToArray()));
            return dt;
        }

        public async static Task<string> DelStorePrefix(StorePrefix obj)
        {
            var param = new List<SqlParameter>
            {
                    new SqlParameter("@Id", obj.Id),
                    new SqlParameter("@Action", obj.Action),
                    new SqlParameter("@RESULT",""),
            };
            return await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteNonQueryReturnScalar("[RTL].[USP_StorePrefix]", CommandType.StoredProcedure, param.ToArray()));
        }



        public async static Task<string> InsertUpdateDelStorePrefix(StorePrefix obj)
        {
            var param = new List<SqlParameter>
            {
                    new SqlParameter("@Id", obj.Id),
                    new SqlParameter("@PartyId", obj.PartyTypeId),
                    new SqlParameter("@Prefix", obj.Prefix),
                    new SqlParameter("@Suffix ", obj.Suffix),
                    new SqlParameter("@StartDate", obj.StartDate),
                    new SqlParameter("@EndDate", obj.EndDate),
                    new SqlParameter("@UserId", obj.LoginId),
                    new SqlParameter("@Action", obj.Action),
                    new SqlParameter("@RESULT",""),
            };
            return await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteNonQueryReturnScalar("[RTL].[USP_StorePrefix]", CommandType.StoredProcedure, param.ToArray()));
        }
        public async static Task<DataTable> SearchStorePrefix(StorePrefix obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@Action", obj.Action),
            };
            DataTable dt = await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("[RTL].[USP_StorePrefix]", CommandType.StoredProcedure, param.ToArray()));
            return dt;
        }
        #region Department Master
        public async static Task<string> InsertUpdateDelDepartmentMaster(TblPartyMaster obj)
        {
            var param = new List<SqlParameter>
            {
                    new SqlParameter("@DepartmentId", obj.Id),
                    new SqlParameter("@PartyType", obj.PartyType),
                    new SqlParameter("@PartyId", obj.PartyId),
                    new SqlParameter("@DepartmentName", obj.PartyName),
                 
                     new SqlParameter("@DepartmentList", obj.DepartmentList),
                    new SqlParameter("@Description", obj.Description),
                    new SqlParameter("@CreatedBy", obj.CreatedBy),
                    new SqlParameter("@StartDate", obj.StartDate),
                    new SqlParameter("@EndDate", obj.EndDate),
                    new SqlParameter("@Action", obj.ActionType),
                    new SqlParameter("@RESULT",""),
            };
            return await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteNonQueryReturnScalar("[RTL].[Usp_DepartmentMaster]", CommandType.StoredProcedure, param.ToArray()));
        }
    

        public async static Task<DataTable> SearchDepartmentMaster(TblPartyMaster obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@Action", obj.ActionType),
            };
            DataTable dt = await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("[RTL].[Usp_DepartmentMaster]", CommandType.StoredProcedure, param.ToArray()));
            return dt;
        }
        #endregion
        #region StoreComplianceStatus Master 
        public async static Task<string> InsertUpdateDelStoreComplianceStatusMaster(TblPartyMaster obj)
        {
            var param = new List<SqlParameter>
            {
                    new SqlParameter("@Id", obj.Id),
                    new SqlParameter("@StoreComplinaceStatusType", obj.PartyName),
                    new SqlParameter("@CreatedBy", obj.CreatedBy),
                    new SqlParameter("@Action", obj.ActionType),
                    new SqlParameter("@RESULT",""),
            };
            return await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteNonQueryReturnScalar("[RTL].[Usp_StoreComplianceStatusMaster]", CommandType.StoredProcedure, param.ToArray()));
        }

        public async static Task<DataTable> SearchStoreComplianceStatusMaster(TblPartyMaster obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@Action", obj.ActionType),
                 new SqlParameter("@Id", obj.Id),
                   new SqlParameter("@StoreId", obj.StoreId),
            };
            DataTable dt = await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("[RTL].[Usp_StoreComplianceStatusMaster]", CommandType.StoredProcedure, param.ToArray()));
            return dt;
        }
        #endregion
        #region Retail Department Master
        public async static Task<string> InsertUpdateDelRetailDocumentMaster(DocumentBAL obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@Action", obj.Action),
                new SqlParameter("@Id", obj.Id),
                new SqlParameter("@DocumentName", obj.DocumentName),
                new SqlParameter("@DocumentType", obj.DocumentType),
                new SqlParameter("@Frequency", obj.Frequency),
                new SqlParameter("@FormatType", obj.FormatType),
                new SqlParameter("@Note", obj.Note),
                new SqlParameter("@Act", obj.Act),
                new SqlParameter("@IsDefault", obj.IsDefault),
                new SqlParameter("@Createdby", obj.Createdby),
                new SqlParameter("@Updatedby", obj.Updatedby),
                new SqlParameter("@UpdatedON", obj.UpdatedON),
                new SqlParameter("@Isdelete", obj.Isdelete),
                  new SqlParameter("@FormNo", obj.FormNo),
                    new SqlParameter("@StateId", obj.StateId),
                      new SqlParameter("@Criticality", obj.Criticality),
                new SqlParameter("@Result",""),
            };
            return await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteNonQueryReturnScalar("[RTL].[USP_RetailDocumentMaster]", CommandType.StoredProcedure, param.ToArray()));

        }


        public async static Task<DataTable> SearchRetailDocumentMaster(DocumentBAL obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@Action", obj.Action),
            };
            DataTable dt = await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("[RTL].[USP_RetailDocumentMaster]", CommandType.StoredProcedure, param.ToArray()));
            return dt;
        }
        

              public async static Task<string> IUDRetailSecretarialCompliance(RetailBAL obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@Action", obj.Action),
                new SqlParameter("@Id", obj.Id),
                new SqlParameter("@State", obj.State),
                new SqlParameter("@Act", obj.Act),
                new SqlParameter("@Constitution", obj.Constitution),
                new SqlParameter("@Department", obj.Department),
                new SqlParameter("@Month", obj.Month),
                new SqlParameter("@Year", obj.Year),
                new SqlParameter("@Frequency", obj.Frequency),
                new SqlParameter("@Ministry", obj.Ministry),
                new SqlParameter("@ComplianceName", obj.ComplianceName),
                new SqlParameter("@Calendartype", obj.Calendartype),
                new SqlParameter("@Risk", obj.Risk),
                new SqlParameter("@ComplianceType", obj.ComplianceType),
                new SqlParameter("@Description", obj.Description),
                new SqlParameter("@ActOverview", obj.ActOverview),
                new SqlParameter("@DueDate", obj.DueDate),
                new SqlParameter("@UploadFile", obj.UploadFile),
                 new SqlParameter("@excelFile", obj.excelFile),
                new SqlParameter("@IndustryList", obj.IndustryList),
                new SqlParameter("@Industry", obj.Industry),
                new SqlParameter("@selectedCategory", obj.selectedCategory),
                new SqlParameter("@selectedSubcategory", obj.selectedSubcategory),
                new SqlParameter("@DueDay", obj.DueDay),
                new SqlParameter("@Expire", obj.Expire),
                new SqlParameter("@ComplianceLevel", obj.ComplianceLevel),
                new SqlParameter("@Section", obj.Section),
                new SqlParameter("@Rules", obj.Rule),
                  new SqlParameter("@Entity", obj.Entity),
                new SqlParameter("@Unit", obj.Unit),
                new SqlParameter("@Area", obj.Area),
                new SqlParameter("@ComplianceClassification", obj.ComplianceClassification),
                new SqlParameter("@SubClassification", obj.SubClassification),
                new SqlParameter("@AdditionalInformation", obj.AdditionalInformation),
                new SqlParameter("@ProofOfCompliance", obj.ProofOfCompliance),
                new SqlParameter("@Categorization", obj.Categorization),
                new SqlParameter("@ComplianceHeader", obj.ComplianceHeader),
                new SqlParameter("@PenaltyType", obj.PenaltyType),
                new SqlParameter("@PenaltyDescription", obj.PenaltyDescription),
                new SqlParameter("@StatutoryAuthority", obj.StatutoryAuthority),
                new SqlParameter("@EventName", obj.EventName),
                new SqlParameter("@EventApplicability", obj.EventApplicability),

                new SqlParameter("@currDate", obj.currDate),
                new SqlParameter("@CompanyCategory", obj.CompanyCategory),

                 new SqlParameter("@EntityType", obj.EntityType),
                  new SqlParameter("@ListedStatus", obj.ListedStatus),
                   new SqlParameter("@StockExchange", obj.StockExchange),
                    new SqlParameter("@FundingStatus", obj.FundingStatus),
                            new SqlParameter("@FundingType", obj.FundingType),
                    
                new SqlParameter("@Result",""),

    };
            return await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteNonQueryReturnScalar("[RTL].[USP_SecretarialCompliance]", CommandType.StoredProcedure, param.ToArray()));

        }

        public async static Task<DataTable> SearchSecretarialCompliance(RetailBAL obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@Action", obj.Action),
                 new SqlParameter("@UserId", obj.UserId),
            };
            DataTable dt = await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("[RTL].[USP_SecretarialCompliance]", CommandType.StoredProcedure, param.ToArray()));
            return dt;
        }

        public async static Task<string> IUDRetailCreateActCalender(RetailBAL obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@Action", obj.Action),
                new SqlParameter("@Id", obj.Id),
                new SqlParameter("@State", obj.State),
                new SqlParameter("@Act", obj.Act),
                new SqlParameter("@Constitution", obj.Constitution),
                new SqlParameter("@Department", obj.Department),
                new SqlParameter("@Month", obj.Month),
                new SqlParameter("@Year", obj.Year),
                new SqlParameter("@Frequency", obj.Frequency),
                new SqlParameter("@Ministry", obj.Ministry),
                new SqlParameter("@ComplianceName", obj.ComplianceName),
                new SqlParameter("@Calendartype", obj.Calendartype),
                new SqlParameter("@Risk", obj.Risk),
                new SqlParameter("@ComplianceType", obj.ComplianceType),
                new SqlParameter("@Description", obj.Description),
                new SqlParameter("@ActOverview", obj.ActOverview),
                new SqlParameter("@DueDate", obj.DueDate),
                new SqlParameter("@UploadFile", obj.UploadFile),
                 new SqlParameter("@excelFile", obj.excelFile),
                new SqlParameter("@IndustryList", obj.IndustryList),
                new SqlParameter("@Industry", obj.Industry),
                new SqlParameter("@selectedCategory", obj.selectedCategory),
                new SqlParameter("@selectedSubcategory", obj.selectedSubcategory),
                new SqlParameter("@DueDay", obj.DueDay),
                new SqlParameter("@Expire", obj.Expire),
                 new SqlParameter("@ComplianceLevel", obj.ComplianceLevel),
                     new SqlParameter("@Rule", obj.Rule),
                         new SqlParameter("@Section", obj.Section),
                             new SqlParameter("@FormNo", obj.FormNo),
                new SqlParameter("@Result",""),

    };
            return await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteNonQueryReturnScalar("[RTL].[USP_CreateActCalender]", CommandType.StoredProcedure, param.ToArray()));

        }

        public async static Task<DataTable> SearchRetailCreateActCalender(RetailBAL obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@Action", obj.Action),
                 new SqlParameter("@UserId", obj.UserId),
            };
            DataTable dt = await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("[RTL].[USP_CreateActCalender]", CommandType.StoredProcedure, param.ToArray()));
            return dt;
        }


        public async static Task<string> InsertRetailCreateIndustry(RetailBAL obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@Action", obj.Action),
                new SqlParameter("@Id", obj.Id),
                new SqlParameter("@Industry", obj.Industry),
                new SqlParameter("@Act", obj.Act),
                new SqlParameter("@Result",""),

             };
            return await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteNonQueryReturnScalar("[RTL].[USP_CreateActCalender]", CommandType.StoredProcedure, param.ToArray()));

        }
        public async static Task<string> InsertCreateOverview(RetailBAL obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@Action", obj.Action),
                new SqlParameter("@Id", obj.Id),
                new SqlParameter("@ActOverview", obj.ActOverview),
                new SqlParameter("@ClientId", obj.ClientId),
                new SqlParameter("@UserId", obj.UserId),
                new SqlParameter("@Industry", obj.Industry),
                new SqlParameter("@Result",""),

             };
            return await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteNonQueryReturnScalar("[RTL].[USP_CreateActCalender]", CommandType.StoredProcedure, param.ToArray()));

        }



        public async static Task<string> INUIndustryMapping(RetailBAL obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@Action", obj.Action),
                new SqlParameter("@Id", obj.Id),
                new SqlParameter("@UserId", obj.UserId),
                new SqlParameter("@PartyId", obj.ClientId),
                new SqlParameter("@Industry", obj.Industry),
                new SqlParameter("@Result",""),

             };
            return await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteNonQueryReturnScalar("[RTL].[USP_IndustryMapping]", CommandType.StoredProcedure, param.ToArray()));

        }
        public async static Task<DataTable> SearchMapping(RetailBAL obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@Action", obj.Action),
            };
            DataTable dt = await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("[RTL].[USP_IndustryMapping]", CommandType.StoredProcedure, param.ToArray()));
            return dt;
        }


        public async static Task<DataTable> SearchRetailCreateIndustry(RetailBAL obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@Action", obj.Action),
            };
            DataTable dt = await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("[RTL].[USP_CreateActCalender]", CommandType.StoredProcedure, param.ToArray()));
            return dt;
        }

        public async static Task<string> InsertMainRetailDashboard(MappingBAL obj)
        {

            StringBuilder MapListSet = new StringBuilder();

            string seprator = ",";
            string bigseprator = "";
            for (int i = 0; i < obj.SubcidiaryListSet.Count; i++)
            {
                MapListSet.Append(bigseprator);
                MapListSet.Append(obj.SubcidiaryListSet[i].Srno);
                MapListSet.Append(seprator);
                MapListSet.Append(obj.SubcidiaryListSet[i].GroupId);
                MapListSet.Append(seprator);
                MapListSet.Append(obj.SubcidiaryListSet[i].GroupUserId);

                MapListSet.Append(seprator);
                MapListSet.Append(obj.SubcidiaryListSet[i].SubcidiaryId);

                MapListSet.Append(seprator);
                MapListSet.Append(obj.SubcidiaryListSet[i].SubcidiaryUserId);


                bigseprator = "|";
            }

            var param = new List<SqlParameter>
            {
               new SqlParameter("@MapListSet", MapListSet.ToString()),
                new SqlParameter("@Action", obj.Action),
                new SqlParameter("@RESULT",""),
            };
            return await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteNonQueryReturnScalar("RTL.USP_Subcidiary", CommandType.StoredProcedure, param.ToArray()));


        }

        public async static Task<DataTable> SearchMainRetailDashboard(MappingBAL obj)
        {
            var param = new List<SqlParameter>
            {      new SqlParameter("@Id", obj.Id),
                new SqlParameter("@Action", obj.Action),
            };
            DataTable dt = await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("RTL.USP_Subcidiary", CommandType.StoredProcedure, param.ToArray()));
            return dt;
        }

        public async static Task<DataTable> verifyvalid(MappingBAL obj)
        {
            var param = new List<SqlParameter>
            {
                    new SqlParameter("@Action", obj.Action),
                    new SqlParameter("@GroupId", obj.GroupId),
                    new SqlParameter("@GroupUserId", obj.GroupUserId),
                    new SqlParameter("@SubcidiaryId", obj.SubcidiaryId),
                    new SqlParameter("@SubcidiaryUserId", obj.SubcidiaryUserId),
                        new SqlParameter("@Id", obj.Id)
            };
            return await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("RTL.USP_Subcidiary", CommandType.StoredProcedure, param.ToArray()));

        }
        public async static Task<string> IUDDepartmentMaster(TblPartyMaster obj)
        {
            var param = new List<SqlParameter>
            {
                    new SqlParameter("@DepartmentId", obj.Id), 
                    new SqlParameter("@DepartmentName", obj.DepartmentName), 
                    new SqlParameter("@Action", obj.ActionType),
                    new SqlParameter("@RESULT",""),
            };
            return await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteNonQueryReturnScalar("[RTL].[Usp_RetailDepartmentMaster]", CommandType.StoredProcedure, param.ToArray()));
        }
        public async static Task<DataTable> SearchDepMaster(TblPartyMaster obj)
        {
            var param = new List<SqlParameter>
            {      new SqlParameter("@Id", obj.Id),
                new SqlParameter("@Action", obj.Action),
            };
            DataTable dt = await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("RTL.Usp_RetailDepartmentMaster", CommandType.StoredProcedure, param.ToArray()));
            return dt;
        }
        public async static Task<string> IUDCourtMaster(TblPartyMaster obj)
        {
            var param = new List<SqlParameter>
            {
                    new SqlParameter("@Id", obj.Id),
                    new SqlParameter("@Name", obj.Name),
                    new SqlParameter("@Action", obj.Action),
                    new SqlParameter("@RESULT",""),
            };
            return await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteNonQueryReturnScalar("[RTL].[Usp_RetailCourtMaster]", CommandType.StoredProcedure, param.ToArray()));
        }
        public async static Task<DataTable> SearchCourtMaster(TblPartyMaster obj)
        {
            var param = new List<SqlParameter>
            {      new SqlParameter("@Id", obj.Id),
                new SqlParameter("@Action", obj.Action),
            };
            DataTable dt = await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("RTL.Usp_RetailCourtMaster", CommandType.StoredProcedure, param.ToArray()));
            return dt;
        }
        #endregion
     
        public async static Task<DataTable> SearchManagement(TblPartyMaster obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@Action", obj.Action), 
                new SqlParameter("@Id", obj.Id),
                   new SqlParameter("@PartyId", obj.PartyId)
            };
            DataTable dt = await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("[RTL].[USP_ProjectManagement]", CommandType.StoredProcedure, param.ToArray()));
            return dt;
        }
        public async static Task<string> IUDProjectManagement(RetailBAL obj)
        {
            var param = new List<SqlParameter>
          {
                            new SqlParameter("@Id", obj.Id), 
                            new SqlParameter("@Action", obj.Action),
                              new SqlParameter("@PartyId", obj.PartyId), 
                            // Step 2
                            new SqlParameter("@ProjectName", obj.ProjectName),
                            new SqlParameter("@SizeCapacity", obj.SizeCapacity),
                            new SqlParameter("@GovtPrivate", obj.GovtPrivate),
                            new SqlParameter("@EndUserParty", obj.EndUserParty),
                            new SqlParameter("@CommissioningDate", obj.CommissioningDate),
                            new SqlParameter("@ExecutionDate", obj.ExecutionDate),
                            new SqlParameter("@AggregatorFees", obj.AggregatorFees),
                            new SqlParameter("@LandConversion", obj.LandConversion),
                            new SqlParameter("@ActualCost", obj.ActualCost),
                            new SqlParameter("@RegistryValue", obj.RegistryValue),
                            new SqlParameter("@Variance", obj.Variance),
                            new SqlParameter("@MortgageProperty", obj.MortgageProperty),
                            new SqlParameter("@LoanAgreements", obj.LoanAgreements),
                            new SqlParameter("@MortgageAmount", obj.MortgageAmount),
                            new SqlParameter("@Miscellaenous", obj.Miscellaenous),
                             new SqlParameter("@AnyOtherDetail", obj.AnyOtherDetail), 

                            // Step 3
                            new SqlParameter("@TechFeasibilityStatus", obj.TechFeasibilityStatus),
                            new SqlParameter("@TechPersonName", obj.TechPersonName),
                            new SqlParameter("@GridDistance", obj.GridDistance),
                            new SqlParameter("@GridConnectivity", obj.GridConnectivity),
                            new SqlParameter("@RightOfWayDistance", obj.RightOfWayDistance),
                            new SqlParameter("@RightOfWayFeasibility", obj.RightOfWayFeasibility),
                            new SqlParameter("@ROWPersonName", obj.ROWPersonName),
                            new SqlParameter("@AccessRoad", obj.AccessRoad),
                            new SqlParameter("@VerifierName", obj.VerifierName),
                            new SqlParameter("@SupportingDocsAttached", obj.SupportingDocsAttached),
                            new SqlParameter("@RoadConstructionStatus", obj.RoadConstructionStatus),
                            new SqlParameter("@RoadCompletionDate", obj.RoadCompletionDate),
                            new SqlParameter("@AdditionalDetails", obj.AdditionalDetails),

                            // Step 4
                            new SqlParameter("@FarmerName", obj.FarmerName),
                            new SqlParameter("@KhatedarName", obj.KhatedarName),
                            new SqlParameter("@Village", obj.Village),
                            new SqlParameter("@KhasraNo", obj.KhasraNo),
                            new SqlParameter("@KhatauliNo", obj.KhatauliNo),
                            new SqlParameter("@AreaAcre", obj.AreaAcre),
                            new SqlParameter("@AreaBigah", obj.AreaBigah),
                            new SqlParameter("@LandCharge", obj.LandCharge),
                            new SqlParameter("@ChargeAmount", obj.ChargeAmount),
                            new SqlParameter("@ChargeTenure", obj.ChargeTenure),
                            new SqlParameter("@ChargeholderName", obj.ChargeholderName),
                            new SqlParameter("@LandStatus", obj.LandStatus),
                            new SqlParameter("@LandType", obj.LandType),

                            // Step 5
                            new SqlParameter("@RatePerAcre", obj.RatePerAcre),
                            new SqlParameter("@TotalLandCost", obj.TotalLandCost),
                            new SqlParameter("@AdvancePaid", obj.AdvancePaid),
                            new SqlParameter("@LeaseValue", obj.LeaseValue),
                            new SqlParameter("@LeaseDuration", obj.LeaseDuration),
                            new SqlParameter("@LeaseEscalation", obj.LeaseEscalation),
                            new SqlParameter("@ApplicableTDS", obj.ApplicableTDS),
                            new SqlParameter("@SecurityChequeNo", obj.SecurityChequeNo),
                            new SqlParameter("@SecurityChequeAmount", obj.SecurityChequeAmount),
                            new SqlParameter("@TotalAdvanceToFarmers", obj.TotalAdvanceToFarmers),
                            new SqlParameter("@TotalPaymentToFarmers", obj.TotalPaymentToFarmers),
                             new SqlParameter("@PaymentDateToFarmers", obj.PaymentDateToFarmers),
                             
                            new SqlParameter("@RegistrationCharges", obj.RegistrationCharges),
                            new SqlParameter("@StampDutyCharges", obj.StampDutyCharges),
                            new SqlParameter("@StampVendorPayment", obj.StampVendorPayment),
                            new SqlParameter("@MiscExpenses", obj.MiscExpenses),
                            new SqlParameter("@AdvocateFee", obj.AdvocateFee),
                             new SqlParameter("@AdvocateName5", obj.AdvocateName5),
                                 new SqlParameter("@AdvocateName", obj.AdvocateName),

                            // Step 6
                            new SqlParameter("@TSRStatus", obj.TSRStatus),
                            new SqlParameter("@TSRConductedBy", obj.TSRConductedBy),
                            new SqlParameter("@TSRValidatedByLocalAdvocate", obj.TSRValidatedByLocalAdvocate),
                            new SqlParameter("@LocalAdvocateByAggregator", obj.LocalAdvocateByAggregator),
                            new SqlParameter("@LocalAdvocateByCompany", obj.LocalAdvocateByCompany),
                            new SqlParameter("@TSRFeesAggregator", obj.TSRFeesAggregator),
                            new SqlParameter("@TSRFeesCompany", obj.TSRFeesCompany),
                            new SqlParameter("@TSRPaymentDateAggregator", obj.TSRPaymentDateAggregator),
                            new SqlParameter("@TSRPaymentDateCompany", obj.TSRPaymentDateCompany),
                            new SqlParameter("@TSRValidatedByInHouse", obj.TSRValidatedByInHouse),
                            new SqlParameter("@TSRValidatedInHousePerson", obj.TSRValidatedInHousePerson),
                            new SqlParameter("@DocumentsSubmittedToLegal", obj.DocumentsSubmittedToLegal),
                            new SqlParameter("@TermSheetDateAggregator", obj.TermSheetDateAggregator),
                            new SqlParameter("@TermSheetDateOfftaker", obj.TermSheetDateOfftaker),

                            // Step 7 (uploads)
                            new SqlParameter("@UploadedFilesPaths1", obj.UploadedFilesPaths1),
                            new SqlParameter("@UploadedFilesPaths2", obj.UploadedFilesPaths2),
                            new SqlParameter("@UploadedFilesPaths3", obj.UploadedFilesPaths3),
                            new SqlParameter("@UploadedFilesPaths4", obj.UploadedFilesPaths4),
                            new SqlParameter("@UploadedFilesPaths5", obj.UploadedFilesPaths5),
                            new SqlParameter("@UploadedFilesPaths6", obj.UploadedFilesPaths6),
                            new SqlParameter("@UploadedFilesPaths7", obj.UploadedFilesPaths7),
                            new SqlParameter("@UploadedFilesPaths8", obj.UploadedFilesPaths8),
                            new SqlParameter("@UploadedFilesPaths9", obj.UploadedFilesPaths9),
                            new SqlParameter("@UploadedFilesPaths10", obj.UploadedFilesPaths10),
                            new SqlParameter("@DocumentName", obj.DocumentName),
                            new SqlParameter("@DocumentSharingStatus", obj.DocumentSharingStatus),
                            new SqlParameter("@DocumentRemarks", obj.DocumentRemarks),
                            new SqlParameter("@DocumentSharingDate", obj.DocumentSharingDate),
                            new SqlParameter("@DocumentSharingMode", obj.DocumentSharingMode),

                            // Step 8
                            new SqlParameter("@TotalProjectCost", obj.TotalProjectCost),
                            new SqlParameter("@Debt", obj.Debt),
                            new SqlParameter("@EquityOPL", obj.EquityOPL),
                            new SqlParameter("@EquityOffTaker", obj.EquityOffTaker),
                            new SqlParameter("@LegalEntityName", obj.LegalEntityName),
                            new SqlParameter("@ExecutionDateSSHA", obj.ExecutionDateSSHA),
                            new SqlParameter("@ExecutionDatePPA", obj.ExecutionDatePPA),

                            new SqlParameter("@CreatedBy", obj.Createdby),
                            new SqlParameter("@RESULT", "")
    };

            return await Task.Factory.StartNew(() =>
                SqlDBHelper.SqlHelper.ExecuteNonQueryReturnScalar("[RTL].[USP_ProjectManagement]", CommandType.StoredProcedure, param.ToArray())
            );
        }


        public async static Task<string> IUDRetailFileMatching(TblPartyMaster obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@Id", obj.Id),                
                new SqlParameter("@SelectedColumn", obj.SelectedColumn),
                new SqlParameter("@MatchingText", obj.MatchingText), 
                new SqlParameter("@SetInColumn", obj.SetInColumn),
                new SqlParameter("@StateIds",obj.State),
                new SqlParameter("@Action", obj.Action),
                new SqlParameter("@RESULT",""),
            };
            return await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteNonQueryReturnScalar("[RTL].[Usp_RetailMatchingText]", CommandType.StoredProcedure, param.ToArray()));
        }
        public async static Task<DataTable> SearchRetailFileMatching(TblPartyMaster obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@Action", obj.Action),
                  new SqlParameter("@SelectedColumn", obj.SelectedColumn),
                    new SqlParameter("@StoreCode", obj.StoreCode),
            };
            DataTable dt = await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("[RTL].[Usp_RetailMatchingText]", CommandType.StoredProcedure, param.ToArray()));
            return dt;
        }
      

        public async static Task<string> IUDRetailFinacialCreateActCalender(RetailBAL obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@Action", obj.Action),
                new SqlParameter("@Id", obj.Id),
                new SqlParameter("@State", obj.State),
                new SqlParameter("@Act", obj.Act),
                new SqlParameter("@Constitution", obj.Constitution),
                new SqlParameter("@Department", obj.Department),
                new SqlParameter("@Month", obj.Month),
                new SqlParameter("@Year", obj.Year),
                new SqlParameter("@Frequency", obj.Frequency),
                new SqlParameter("@Ministry", obj.Ministry),
                new SqlParameter("@ComplianceName", obj.ComplianceName),
                new SqlParameter("@Calendartype", obj.Calendartype),
                new SqlParameter("@Risk", obj.Risk),
                new SqlParameter("@ComplianceType", obj.ComplianceType),
                new SqlParameter("@Description", obj.Description),
                new SqlParameter("@ActOverview", obj.ActOverview),
                new SqlParameter("@DueDate", obj.DueDate),
                new SqlParameter("@UploadFile", obj.UploadFile),
                 new SqlParameter("@excelFile", obj.excelFile),
                new SqlParameter("@IndustryList", obj.IndustryList),
                new SqlParameter("@Industry", obj.Industry),
                new SqlParameter("@selectedCategory", obj.selectedCategory),
                new SqlParameter("@selectedSubcategory", obj.selectedSubcategory),
                new SqlParameter("@DueDay", obj.DueDay),
                new SqlParameter("@Expire", obj.Expire),
                new SqlParameter("@ComplianceLevel", obj.ComplianceLevel),
                new SqlParameter("@Rules", obj.Rule),
                new SqlParameter("@Section", obj.Section),
                new SqlParameter("@currDate", obj.currDate),
                 new SqlParameter("@Applicability", obj.Applicability),
                  new SqlParameter("@Forms", obj.Forms),
                new SqlParameter("@Result",""),
              
    }; 
            return await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteNonQueryReturnScalar("[RTL].[USP_FinacialCreateActCalender]", CommandType.StoredProcedure, param.ToArray()));
            //USP_RetailCreateActCalender
        }


        public async static Task<string> IUDFactoryCompliance(RetailBAL obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@Action", obj.Action),
                new SqlParameter("@Id", obj.Id),
                new SqlParameter("@State", obj.State),
                new SqlParameter("@Act", obj.Act),
                new SqlParameter("@Constitution", obj.Constitution),
                new SqlParameter("@Department", obj.Department),
                new SqlParameter("@Month", obj.Month),
                new SqlParameter("@Year", obj.Year),
                new SqlParameter("@Frequency", obj.Frequency),
                new SqlParameter("@Ministry", obj.Ministry),
                new SqlParameter("@ComplianceName", obj.ComplianceName),
                new SqlParameter("@Calendartype", obj.Calendartype),
                new SqlParameter("@Risk", obj.Risk),
                new SqlParameter("@ComplianceType", obj.ComplianceType),
                new SqlParameter("@Description", obj.Description),
                new SqlParameter("@ActOverview", obj.ActOverview),
                new SqlParameter("@DueDate", obj.DueDate),
                new SqlParameter("@UploadFile", obj.UploadFile),
                 new SqlParameter("@excelFile", obj.excelFile),
                new SqlParameter("@IndustryList", obj.IndustryList),
                new SqlParameter("@Industry", obj.Industry),
                new SqlParameter("@selectedCategory", obj.selectedCategory),
                new SqlParameter("@selectedSubcategory", obj.selectedSubcategory),
                new SqlParameter("@DueDay", obj.DueDay),
                new SqlParameter("@Expire", obj.Expire),
                new SqlParameter("@ComplianceLevel", obj.ComplianceLevel),
                new SqlParameter("@Section", obj.Section),
                new SqlParameter("@Rules", obj.Rule),
                new SqlParameter("@currDate", obj.currDate),
                new SqlParameter("@CompanyCategory", obj.CompanyCategory),

                 new SqlParameter("@EntityType", obj.EntityType),
                  new SqlParameter("@ListedStatus", obj.ListedStatus),
                   new SqlParameter("@StockExchange", obj.StockExchange),
                    new SqlParameter("@FundingStatus", obj.FundingStatus),
                            new SqlParameter("@FundingType", obj.FundingType),
                               new SqlParameter("@FormNo", obj.FormNo),

                new SqlParameter("@Result",""),

    };
            return await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteNonQueryReturnScalar("[RTL].[USP_FactoryCompliance]", CommandType.StoredProcedure, param.ToArray()));

        }

        public async static Task<DataTable> SearchFactoryCompliance(RetailBAL obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@Action", obj.Action),
                 new SqlParameter("@UserId", obj.UserId),
            };
            DataTable dt = await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("[RTL].[USP_FactoryCompliance]", CommandType.StoredProcedure, param.ToArray()));
            return dt;
        }




        public async static Task<string> IUDLabourcodeCompliance(RetailBAL obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@Action", obj.Action),
                new SqlParameter("@Id", obj.Id),
                new SqlParameter("@State", obj.State),
                new SqlParameter("@Act", obj.Act),
                new SqlParameter("@Constitution", obj.Constitution),
                new SqlParameter("@Department", obj.Department),
                new SqlParameter("@Month", obj.Month),
                new SqlParameter("@Year", obj.Year),
                new SqlParameter("@Frequency", obj.Frequency),
                new SqlParameter("@Ministry", obj.Ministry),
                new SqlParameter("@ComplianceName", obj.ComplianceName),
                new SqlParameter("@Calendartype", obj.Calendartype),
                new SqlParameter("@Risk", obj.Risk),
                new SqlParameter("@ComplianceType", obj.ComplianceType),
                new SqlParameter("@Description", obj.Description),
                new SqlParameter("@ActOverview", obj.ActOverview),
                new SqlParameter("@DueDate", obj.DueDate),
                new SqlParameter("@UploadFile", obj.UploadFile),
                 new SqlParameter("@excelFile", obj.excelFile),
                new SqlParameter("@IndustryList", obj.IndustryList),
                new SqlParameter("@Industry", obj.Industry),
                new SqlParameter("@selectedCategory", obj.selectedCategory),
                new SqlParameter("@selectedSubcategory", obj.selectedSubcategory),
                new SqlParameter("@DueDay", obj.DueDay),
                new SqlParameter("@Expire", obj.Expire),
                new SqlParameter("@ComplianceLevel", obj.ComplianceLevel),
                new SqlParameter("@Section", obj.Section),
                new SqlParameter("@Rules", obj.Rule),
                new SqlParameter("@currDate", obj.currDate),
                new SqlParameter("@CompanyCategory", obj.CompanyCategory),

                 new SqlParameter("@EntityType", obj.EntityType),
                  new SqlParameter("@ListedStatus", obj.ListedStatus),
                   new SqlParameter("@StockExchange", obj.StockExchange),
                    new SqlParameter("@FundingStatus", obj.FundingStatus),
                            new SqlParameter("@FundingType", obj.FundingType),
                               new SqlParameter("@FormNo", obj.FormNo),
                                            new SqlParameter("@DetailedCompliance", obj.DetailedCompliance),
                                                         new SqlParameter("@ImpactEmployer", obj.ImpactEmployer),

                new SqlParameter("@Result",""),

    };
            return await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteNonQueryReturnScalar("[RTL].[USP_LabourCodeCompliance]", CommandType.StoredProcedure, param.ToArray()));

        }

        public async static Task<DataTable> SearchLabourcodeCompliance(RetailBAL obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@Action", obj.Action),
                 new SqlParameter("@UserId", obj.UserId),
            };
            DataTable dt = await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("[RTL].[USP_LabourCodeCompliance]", CommandType.StoredProcedure, param.ToArray()));
            return dt;
        }



        public async static Task<DataTable> ClientGetStore(RetialStoreManager obj)
        {
            var param = new List<SqlParameter>
            {
              new SqlParameter("@Action", obj.ActionType),
                new SqlParameter("@Id",obj.Id),
            };
            DataTable dt = await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("RTL.Usp_StoreMaster", CommandType.StoredProcedure, param.ToArray()));
            return dt;
        }


        public async static Task<string> ClientInsertUpdateDelStoreMapping(RetailLicenseDocuementMaster obj)
        {
            StringBuilder DocumentList = new StringBuilder();

            string bigseprator = "";
            for (int i = 0; i < obj.DocumentList.Count; i++)
            {
                DocumentList.Append(bigseprator);
                DocumentList.Append(obj.DocumentList[i].StoreId);
                bigseprator = "|";
            }

            var param = new List<SqlParameter>
            {
                new SqlParameter("@Action", obj.ActionType),
                new SqlParameter("@StoreList", DocumentList.ToString()),
                new SqlParameter("@PartyId", obj.PartyId),
                new SqlParameter("@UserId", obj.UserId),
                new SqlParameter("@PartyTypeId", obj.PartyTypeId),
                new SqlParameter("@CreatedBy", obj.CreatedBy),
                new SqlParameter("@StartDate", obj.StartDate),
                new SqlParameter("@EndDate", obj.EndDate),
                new SqlParameter("@RESULT",""),
            };
            return await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteNonQueryReturnScalar("[RTL].[Usp_CStoreMapping]", CommandType.StoredProcedure, param.ToArray()));
        }

        public async static Task<DataTable> ClientSearchStoreMapping(TblPartyMaster obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@Action", obj.ActionType),
                new SqlParameter("@UserId", obj.PartyId),
            };
            DataTable dt = await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("[RTL].[Usp_CStoreMapping]", CommandType.StoredProcedure, param.ToArray()));
            return dt;
        }

    }
}
