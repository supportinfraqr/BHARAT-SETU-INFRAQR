using BAL;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Data;
using System.Data.SqlClient;
using System.Linq;
using System.Reflection;
using System.Text;
using System.Threading.Tasks;


namespace DAL
{
    public partial class DLL
    {
        public async static Task<string> InsertUpdateDelEmployeeMaster(RetialEmployeeManager obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@Action", obj.ActionType),
                new SqlParameter("@Id",obj.Id),
                new SqlParameter("@PartyTypeId",obj.PartyTypeId),
                new SqlParameter("@PartyId",obj.PartyId),
                new SqlParameter("@UserId",obj.UserId),
                new SqlParameter("@SuperVisior1",obj.SuperVisior1),
                new SqlParameter("@SuperVisior2",obj.SuperVisior2),
                           new SqlParameter("@RefEmployeeCode",obj.RefEmployeeCode),
                      new SqlParameter("@EmployeeCode",obj.EmployeeCode),
                new SqlParameter("@EmployeeName",obj.EmployeeName),
                new SqlParameter("@EmployeeDesignation",obj.EmployeeDesignation),
                new SqlParameter("@EmployeeDepartment",obj.EmployeeDepartment),
                new SqlParameter("@Father_Husband_Name",obj.Father_Husband_Name),
                new SqlParameter("@Gendar",obj.Gendar),
                new SqlParameter("@MaritalStatus",obj.MaritalStatus),
                new SqlParameter("@DateOfBirth",obj.DateOfBirth),
                new SqlParameter("@PresentAddress",obj.PresentAddress),
                new SqlParameter("@PermanemtAddress",obj.PermanemtAddress),
                new SqlParameter("@AdharCardNumber",obj.AdharCardNumber),
                new SqlParameter("@PANNumber",obj.PANNumber),
                new SqlParameter("@MobileNumber",obj.MobileNumber),
                new SqlParameter("@AlternativeMobileNumber",obj.AlternativeMobileNumber),
                new SqlParameter("@EmployeeEmailID",obj.EmployeeEmailID),
                new SqlParameter("@BankAccountNumber",obj.BankAccountNumber),
                new SqlParameter("@BankIFSCCode",obj.BankIFSCCode),
                new SqlParameter("@PreviousUAN",obj.PreviousUAN),
                new SqlParameter("@PreviousESI",obj.PreviousESI),
                new SqlParameter("@GrossSalary",obj.GrossSalary),
                new SqlParameter("@DOJ",obj.DOJ),
                new SqlParameter("@NomineeName",obj.NomineeName),
                new SqlParameter("@NomineeAddress",obj.NomineeAddress),
                new SqlParameter("@NomineeRelation",obj.NomineeRelation),
                new SqlParameter("@NomineeDOB",obj.NomineeDOB),
                new SqlParameter("@StoreCode",obj.StoreCode),
                new SqlParameter("@Status",obj.Status),
                new SqlParameter("@PANCardFilePath",obj.PANCardFilePath),
                new SqlParameter("@Cheque_Passbook_FilePath", obj.Cheque_Passbook_FilePath),
                new SqlParameter("@EducationCertificateFilePath", obj.EducationCertificateFilePath),
                new SqlParameter("@ExperienceCertificateFilePath", obj.ExperienceCertificateFilePath),
                new SqlParameter("@AdhaarCard_FrontSide_FilePath", obj.AdhaarCard_FrontSide_FilePath),
                new SqlParameter("@AdhaarCard_BackSide_FilePath", obj.AdhaarCard_BackSide_FilePath),
                new SqlParameter("@RelievingLetterfFilePath", obj.RelievingLetterfFilePath),
                new SqlParameter("@PayslipsFilePath", obj.PayslipsFilePath),
                new SqlParameter("@Photos_1_FilePath", obj.Photos_1_FilePath),
                new SqlParameter("@Photos_2_FilePath", obj.Photos_2_FilePath),
                new SqlParameter("@Photos_3_FilePath", obj.Photos_3_FilePath),
                new SqlParameter("@Photos_4_FilePath", obj.Photos_4_FilePath),
                   new SqlParameter("@EmployeePhotos",obj.EmployeePhotos),
                new SqlParameter("@UserIds", obj.LoginId),
                 new SqlParameter("@PFAccount", obj.PFAccount),
                  new SqlParameter("@LeavingDate", obj.LeavingDate),
                  new SqlParameter("@SiteId",obj.SiteId),

                  new SqlParameter("@MinimumWageCategory", obj.MinimumWageCategory),
new SqlParameter("@WageType", obj.WageType),
new SqlParameter("@WageDisbursementMode", obj.WageDisbursementMode),

new SqlParameter("@PPE", obj.PPE),
new SqlParameter("@PPEType", obj.PPEType),
new SqlParameter("@SafetyTrainingStatus", obj.SafetyTrainingStatus),
new SqlParameter("@SiteInductionStatus", obj.SiteInductionStatus),
new SqlParameter("@PoliceVerificationStatus", obj.PoliceVerificationStatus),

new SqlParameter("@TempIDStatus", obj.TempIDStatus),
new SqlParameter("@TempIDNumber", obj.TempIDNumber),
new SqlParameter("@TempIDDate", obj.TempIDDate),

new SqlParameter("@PermanentIDStatus", obj.PermanentIDStatus),
new SqlParameter("@PermanentIDNumber", obj.PermanentIDNumber),
new SqlParameter("@PermanentIDDate", obj.PermanentIDDate),
new SqlParameter("@Transport", obj.Transport),
new SqlParameter("@RouteId", obj.RouteId) ,

new SqlParameter("@IssueDate", obj.IssueDate),
new SqlParameter("@ValidTill", obj.ValidTill),
new SqlParameter("@BloodGroup", obj.BloodGroup),

                new SqlParameter("@RESULT",""),
            };
            return await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteNonQueryReturnScalar("RTL.USP_EmployeeMaster", CommandType.StoredProcedure, param.ToArray()));
        }


        public async static Task<DataTable> GetEmployeeMaster(RetialEmployeeManager obj)
        {
            var param = new List<SqlParameter>
            {
                    new SqlParameter("@Action", obj.ActionType),
                    new SqlParameter("@Id",obj.Id),
                    new SqlParameter("@PartyId",obj.PartyId),
                    new SqlParameter("@UserId",obj.UserId),
                    new SqlParameter("@SuperVisior1",obj.SuperVisior1),
                    new SqlParameter("@SuperVisior2",obj.SuperVisior2),
            };
            DataTable dt = await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("RTL.USP_EmployeeMaster", CommandType.StoredProcedure, param.ToArray()));
            return dt;
        }
        public DataTable GetNewsletterForSearch(DocumentBAL obj) 
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@Action", obj.Action),
                new SqlParameter("@EmailId", obj.ClientId),
                new SqlParameter("@Id", obj.Id),
                new SqlParameter("@ClientId", obj.StoreCode),
                new SqlParameter("@UserId", obj.LicenseName),
                new SqlParameter("@Message", obj.Msg)
            };
         
            DataTable dt =  SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("[dbo].[USP_GetNewsletterForSearch]", CommandType.StoredProcedure, param.ToArray());
            return dt;   
        }
        public async static Task<DataTable> getaisearch(ChatbotBAL obj)
        {
            var param = new List<SqlParameter>
            {
                    new SqlParameter("@Action", obj.Action), 
                    new SqlParameter("@Question",obj.Question),
                    new SqlParameter("@Id",obj.Id)

            };
            DataTable dt = await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("USP_AiIntregation", CommandType.StoredProcedure, param.ToArray()));
            return dt;
        }



        public async static Task<string> UpdateDocumentForEmployee(string fieldName, string filePath, int Id, int LoginId)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@Action", 5),
                new SqlParameter("@Id",Id),
                new SqlParameter("@"+fieldName,filePath),
                new SqlParameter("@UserId", LoginId),
                new SqlParameter("@RESULT",""),
            };
            return await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteNonQueryReturnScalar("RTL.USP_EmployeeMaster", CommandType.StoredProcedure, param.ToArray()));
        }
        public async static Task<string> UpdateEmpStatus(RetialEmployeeManager obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@Action", 9),
                new SqlParameter("@Status",obj.Status),
               new SqlParameter("@Id",obj.Id),
                new SqlParameter("@RESULT",""),
            };
            return await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteNonQueryReturnScalar("RTL.USP_EmployeeMaster", CommandType.StoredProcedure, param.ToArray()));
        }


        public async static Task<string> UpdateStatus(RetialStoreManager obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@Action", obj.ActionType),
                new SqlParameter("@IsActive",obj.IsActive),
               new SqlParameter("@StoreCode",obj.StoreCode),
                new SqlParameter("@DocumentName",obj.DocumentName),
                new SqlParameter("@UFile",obj.AdditionalDoc),
                 new SqlParameter("@Createdby",obj.LoginId),
                new SqlParameter("@RESULT",""),
            };
            return await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteNonQueryReturnScalar("RTL.Usp_StoreMaster", CommandType.StoredProcedure, param.ToArray()));
        }
        

             public async static Task<string> IUDLicense(RetialStoreManager obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@Action", obj.Action),
                 new SqlParameter("@Id",obj.Id),
                new SqlParameter("@LicenseId",obj.LicenseId),
                 new SqlParameter("@LicenseName",obj.LicenseName),
                new SqlParameter("@UniqueId",obj.UniqueId), 
                 new SqlParameter("@Createdby",obj.LoginId),
                new SqlParameter("@RESULT",""),
            };
            return await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteNonQueryReturnScalar("Usp_IUDStoreCompliance", CommandType.StoredProcedure, param.ToArray()));
        }
        public async static Task<string> IUDCOMPLIANCESTORE(RetialStoreManager obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@Action", obj.Action),
                 new SqlParameter("@Id",obj.Id),
                new SqlParameter("@DocumentName",obj.DocumentName),
                 new SqlParameter("@Remark",obj.Remark),
                new SqlParameter("@LocationIds",obj.locationId),
                new SqlParameter("@AdditionalDoc",obj.AdditionalDoc),
                  new SqlParameter("@DiligenceFile",obj.DiligenceFile),
                  new SqlParameter("@validTo",obj.validTo),
                    new SqlParameter("@validFrom",obj.validFrom),
                  new SqlParameter("@status",obj.status),
                     new SqlParameter("@IsDefault",obj.IsDefault),
                 new SqlParameter("@Createdby",obj.LoginId),
                new SqlParameter("@RESULT",""),
            };
            return await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteNonQueryReturnScalar("Usp_IUDStoreCompliance", CommandType.StoredProcedure, param.ToArray()));
        }

        
        public async static Task<string> Savechatbot(ChatbotBAL obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@Action", obj.Action),
                new SqlParameter("@FileUpload",obj.FileUpload),
               new SqlParameter("@Detail",obj.Detail),
                new SqlParameter("@Rate",obj.Rate),
                new SqlParameter("@Suggestion",obj.Suggestion),
                 new SqlParameter("@Createdby",obj.LoginId),
                      new SqlParameter("@TicketNo",obj.TicketNo),
                new SqlParameter("@RESULT",""),
            };
            return await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteNonQueryReturnScalar("[RTL].[USP_Chatbot]", CommandType.StoredProcedure, param.ToArray()));
        }
        public async static Task<DataTable> GetStoreMaster(RetialStoreManager obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@Action", obj.ActionType),
                new SqlParameter("@Id",obj.Id),
                new SqlParameter("@StoreCode",obj.StoreCode),
                    new SqlParameter("@PageNumber",obj.PageNumber),
                        new SqlParameter("@PageSize",obj.PageSize),
                           new SqlParameter("@Searchby",obj.Searchby)
            };
            DataTable dt = await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("RTL.Usp_StoreMaster", CommandType.StoredProcedure, param.ToArray()));
            return dt;
        }
        public async static Task<DataTable> ReminderNotification(RetialStoreManager obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@Action", 24),
                new SqlParameter("@Id",obj.Id)
            };
            DataTable dt = await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("[dbo].[USP_EmailMaster]", CommandType.StoredProcedure, param.ToArray()));
            return dt;
        }

      
        public async static Task<DataTable> GetMasters(tblMasters obj)
        {

            var param = new List<SqlParameter>
            {
                new SqlParameter("@action",obj.Action),
                new SqlParameter("@parentId",obj.ParentId),
            };
            DataTable dt = await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("RTL.GetMasters", CommandType.StoredProcedure, param.ToArray()));
            return dt;

        }
        public async static Task<DataTable> SearchChatbot(ChatbotBAL obj)
        {

            var param = new List<SqlParameter>
            {
                new SqlParameter("@Action",obj.Action),
                new SqlParameter("@TicketNo",obj.TicketNo),
            };
            DataTable dt = await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("[RTL].[USP_Chatbot]", CommandType.StoredProcedure, param.ToArray()));
            return dt;

        }
        public async static Task<string> Approve(ChatbotBAL obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@TicketNo",obj.TicketNo),
                new SqlParameter("@Action", obj.Action),
                new SqlParameter("@Detail",obj.Detail), 
                new SqlParameter("@RESULT",""),
            };
            return await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteNonQueryReturnScalar("[RTL].[USP_Chatbot]", CommandType.StoredProcedure, param.ToArray()));
        }

        public async static Task<DataTable> GetStoreCodeNumber(tblMasters obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@PartyId",obj.PartyTypeId),
            };
            DataTable dt = await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("RTL.USP_GetStoreCodeNumber", CommandType.StoredProcedure, param.ToArray()));
            return dt;
        }

        //public async static Task<string> UpdateStoresStatus(StoreStatusList obj)
        //{
        //    var selectedStores = obj.selectedStores;
        //    var isActive = obj.isActive;
        //    var storeIdList = string.Join(",", selectedStores);


        //    string commandText = $"UPDATE [RTL].[StoreMaster] SET IsActive = @IsActive WHERE Id IN ({storeIdList})";

        //    SqlParameter[] parameters = new SqlParameter[]
        //    {
        //         new SqlParameter("@IsActive", isActive)
        //    };

        //    // Execute the command
        //    DataTable dt = await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand(commandText, CommandType.Text, parameters));
        //    if (dt.Rows.Count > 0)
        //    {
        //        return JsonConvert.SerializeObject(new { success = true, message = "Store status updated successfully." });
        //    }
        //    else
        //    {
        //        return JsonConvert.SerializeObject(new { success = false, message = "No stores were updated." });
        //    }

        //}


        public async static Task<string> UpdateStoresStatus(StoreStatusList obj)
        {
            var selectedStores = obj.selectedStores;
            var isActive = obj.isActive;

            // Validate if stores are provided
            if (selectedStores == null || !selectedStores.Any())
            {
                return JsonConvert.SerializeObject(new { success = false, message = "No stores were provided for update." });
            }
            SqlParameter[] parameters = new SqlParameter[]
            {
                new SqlParameter("@IsActive", isActive)
            };
            // Join the selected store IDs into a comma-separated string
            var storeIdList = string.Join(",", selectedStores);

            // Step 1: Check if stores are valid and have IsActive = 2
            string checkCommandText = $"SELECT Id FROM [RTL].[StoreMaster] WHERE Id IN ({storeIdList}) AND IsActive = 2";
            DataTable checkResult = await Task.Factory.StartNew(() =>
                SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand(checkCommandText, CommandType.Text, parameters));

            if (checkResult.Rows.Count > 0)
            {
                // Step 2: Mark stores with UTA = 1
                var idsToMark = string.Join(",", checkResult.AsEnumerable().Select(row => row["Id"]));
                string markCommandText = $"UPDATE [RTL].[StoreMaster] SET UTA = 1 WHERE Id IN ({idsToMark})";

                //await Task.Factory.StartNew(() =>
                //    SqlDBHelper.SqlHelper.ExecuteNonQuery(markCommandText, CommandType.Text));
                SqlParameter[] parameters1 = new SqlParameter[]
                {
                new SqlParameter("@IsActive", isActive),
                 new SqlParameter("@RESULT", "")
                };
                await Task.Factory.StartNew(() =>
                SqlDBHelper.SqlHelper.ExecuteNonQuery(markCommandText, CommandType.Text, parameters1));
            }

            // Step 3: Update the IsActive status for the provided store IDs
            string updateCommandText = $"UPDATE [RTL].[StoreMaster] SET IsActive = @IsActive WHERE Id IN ({storeIdList})";

            SqlParameter[] parameters2 = new SqlParameter[]
              {
                new SqlParameter("@IsActive", isActive),
                  new SqlParameter("@RESULT", "")

              };
            // Execute the update command
            bool rowsAffected = await Task.Factory.StartNew(() =>
                SqlDBHelper.SqlHelper.ExecuteNonQuery(updateCommandText, CommandType.Text, parameters2));

            // Return appropriate response
            if (rowsAffected == true)
            {
                return JsonConvert.SerializeObject(new { success = true, message = "Store status updated successfully." });
            }
            else
            {
                return JsonConvert.SerializeObject(new { success = false, message = "No stores were updated." });
            }
        }


        public async static Task<string> InsertUpdateDelStoreMaster(RetialStoreManager obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@Id",obj.Id),
                new SqlParameter("@Action", obj.ActionType),
                new SqlParameter("@PartyTypeId",0),
                new SqlParameter("@SequenceNumber",0),
                new SqlParameter("@StoreCode",""),
                new SqlParameter("@RefStoreCode",obj.RefStoreCode),
                new SqlParameter("@StoreName",obj.StoreName),
                new SqlParameter("@CompleteAddress",obj.CompleteAddress),
                new SqlParameter("@ProposedDate",obj.ProposedDate),
                new SqlParameter("@StoreLocation",obj.StoreLocation),
                new SqlParameter("@CityId",obj.CityId),
                 new SqlParameter("@CountryId",obj.CountryId),
                
                new SqlParameter("@CircleId",obj.CircleId),
                new SqlParameter("@RegionId",obj.RegionId),
                new SqlParameter("@zipCode",obj.ZipCode),
                new SqlParameter("@StoreManagerName",obj.StoreManagerName),
                new SqlParameter("@StoreManagerMobileNo",obj.StoreManagerMobileNo),
                new SqlParameter("@StoreManagerEmail",obj.StoreManagerEmail),
                new SqlParameter("@AreaManagerName",obj.AreaManagerName),
                new SqlParameter("@AreaManagerMobileNo",obj.AreaManagerMobileNo),
                new SqlParameter("@AreaManagerEmail",obj.AreaManagerEmail),
                new SqlParameter("@ZonalManagerName",obj.ZonalManagerName),
                new SqlParameter("@ZonalManagerMobileNo",obj.ZonalManagerMobileNo),
                new SqlParameter("@ZonalManagerEmail",obj.ZonalManagerEmail),
                new SqlParameter("@CircleHeadName",obj.CircleHeadName),
                new SqlParameter("@CircleHeadMobileNo",obj.CircleHeadMobileNo),
                new SqlParameter("@CircleHeadEmail",obj.CircleHeadEmail),
                new SqlParameter("@RegionalHeadName",obj.RegionalHeadName),
                new SqlParameter("@RegionalHeadMobileNo",obj.RegionalHeadMobileNo),
                new SqlParameter("@RegionalHeadEmail",obj.RegionalHeadEmail),
                new SqlParameter("@CorporateHeadName", obj.CorporateHeadName),
                new SqlParameter("@CorporateHeadMobileNo", obj.@CorporateHeadMobileNo),
                new SqlParameter("@CorporateHeadEmail", obj.CorporateHeadEmail),
                new SqlParameter("@SQFTStoreArea", obj.SQFTStoreArea),
                new SqlParameter("@IsActive", obj.IsActive),
                new SqlParameter("@ElectricityBill", obj.ElectricityBill),
                new SqlParameter("@RentAgreement", obj.RentAgreement),
                new SqlParameter("@PropertyTaxPaidReceipt", obj.PropertyTaxPaidReceipt),
                new SqlParameter("@BuildingPlan", obj.BuildingPlan),
                 new SqlParameter("@StabilityStructureCertificate", obj.StabilityStructureCertificate),
                new SqlParameter("@CompletionCertificate", obj.CompletionCertificate),
                new SqlParameter("UserId", obj.LoginId),
                  new SqlParameter("DaysOfExpire", obj.DaysOfExpire),
                   new SqlParameter("LED", obj.LED),
                 new SqlParameter("@Category",obj.Category),
                        new SqlParameter("@Operationmodel",obj.Operationmodel),
                               new SqlParameter("@ComplianceCategory",obj.ComplianceCategory),
                new SqlParameter("@ElectricityBillPeriodUpTo", obj.ElectricityBillPeriodUpTo),
                new SqlParameter("@LeasePaidReceiptPeriodUpTo", obj.LeasePaidReceiptPeriodUpTo),
                new SqlParameter("@PropertyTaxPeriodUpTo", obj.PropertyTaxPeriodUpTo),
                new SqlParameter("@FireNocPeriodUpTo", obj.FireNocPeriodUpTo),
                new SqlParameter("@PollutionPeriodUpTo", obj.PollutionPeriodUpTo),
                new SqlParameter("@OwnershipDocPeriodUpTo", obj.OwnershipDocPeriodUpTo),
                new SqlParameter("@AdditionalDocPeriodUpTo", obj.AdditionalDocPeriodUpTo),
                new SqlParameter("@LeaseFromDate", obj.LeaseFromDate),
                new SqlParameter("@ElectricityBillRemark", obj.ElectricityBillRemark),
                new SqlParameter("@LeasePaidReceiptRemark", obj.LeasePaidReceiptRemark),
                new SqlParameter("@PropertyTaxRemark", obj.PropertyTaxRemark),
                new SqlParameter("@FireNocRemark", obj.FireNocRemark),
                new SqlParameter("@PollutionRemark", obj.PollutionRemark),
                new SqlParameter("@OwnershipDocRemark", obj.OwnershipDocRemark),
                new SqlParameter("@AdditionalDocRemark", obj.AdditionalDocRemark),
                  new SqlParameter("@DocumentName", obj.DocumentName),
                      new SqlParameter("@ExecutionLevel1", obj.ExecutionLevel1),
                        new SqlParameter("@ExecutionLevel2", obj.ExecutionLevel2),
                        new SqlParameter("@ExecutionLevel3", obj.ExecutionLevel3),
                        new SqlParameter("@ExecutionLevel4", obj.ExecutionLevel4),
                        new SqlParameter("@ExecutionLevel5", obj.ExecutionLevel5),
                        new SqlParameter("@SelectDuedatefor", obj.SelectDuedatefor), 
                         new SqlParameter("@LicenseD", obj.LicenseD),
                        new SqlParameter("@LicenseDaysOfExpire", obj.LicenseDaysOfExpire),
                        new SqlParameter("@LicenseED", obj.LicenseED), 
                        new SqlParameter("@Labour", obj.Labour),
                        new SqlParameter("@LabourDaysOfExpire", obj.LabourDaysOfExpire),
                         new SqlParameter("@LabourED", obj.LabourED),

                        new SqlParameter("@FactoryD", obj.FactoryD),
                        new SqlParameter("@FactoryDaysOfExpire", obj.FactoryDaysOfExpire),
                        new SqlParameter("@FactoryED", obj.FactoryED),

                        new SqlParameter("@SecraterialD", obj.SecraterialD),
                         new SqlParameter("@SecraterialDaysOfExpire", obj.SecraterialDaysOfExpire),
                        new SqlParameter("@SecraterialED", obj.SecraterialED),

                        new SqlParameter("@FinanceD", obj.FinanceD),
                        new SqlParameter("@FinanceDaysOfExpire", obj.FinanceDaysOfExpire),
                        new SqlParameter("@FinanceED", obj.FinanceED),
                          new SqlParameter("@State", obj.State),

                              new SqlParameter("@InsuranceFromDate", obj.InsuranceFromDate),
                                  new SqlParameter("@InsurancePaidReceiptPeriodUpTo", obj.InsurancePaidReceiptPeriodUpTo),
                                      new SqlParameter("@InsurancePaidReceiptRemark", obj.InsurancePaidReceiptRemark),
 
                       new SqlParameter("@RESULT","") 
            };
            return await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteNonQueryReturnScalar("RTL.Usp_StoreMaster", CommandType.StoredProcedure, param.ToArray()));
        }


        public async static Task<DataTable> GenerateEmployeeCode(tblMasters obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@PartyId",obj.PartyTypeId),
            };
            DataTable dt = await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("RTL.USP_GetEmployeeCodeNumber", CommandType.StoredProcedure, param.ToArray()));
            return dt;
        }


        public async static Task<DataTable> GetLicenseMaster(RetailLicenseDocuementMaster obj)
        {
            var param = new List<SqlParameter>
            {
              new SqlParameter("@ActionType", obj.ActionType),
              new SqlParameter("@LoginId",obj.LoginId),
              new SqlParameter("@LicenseId",obj.LicenseId),
              new SqlParameter("@StoreId",obj.StoreId),
            };
            DataTable dt = await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("RTL.Usp_GetRetailLicenseDocuementMaster", CommandType.StoredProcedure, param.ToArray()));
            return dt;
        }



        public async static Task<string> UploadDoc(StoreLicesensDocument obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@Id",obj.Id),
                new SqlParameter("@Action", obj.ActionType),
                new SqlParameter("@StoreId",obj.StoreId),
                  new SqlParameter("@LicenseId",obj.LicenseId),
                new SqlParameter("@UFile",obj.UFile),
                new SqlParameter("@RESULT",""),
            };
            return await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteNonQueryReturnScalar("RTL.Usp_StoreLicences", CommandType.StoredProcedure, param.ToArray()));
        }
        public async static Task<string> UploadComplianceDoc(StoreLicesensDocument obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@DId",obj.Id),
                new SqlParameter("@Action", obj.ActionType),
                new SqlParameter("@DocumentPath",obj.UFile),
                new SqlParameter("@UserId",obj.LoginId),
                 new SqlParameter("@Verify",obj.Verify),
                new SqlParameter("@StoreId",obj.StoreId),
                new SqlParameter("@EmpCode",obj.EmpCode),
                new SqlParameter("@RESULT",""),
            };
            return await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteNonQueryReturnScalar("RTL.USP_ROLEMANAGE", CommandType.StoredProcedure, param.ToArray()));
        }



        public async static Task<string> InsertUpdateDelStoreDocumentMaster(StoreLicesensDocument obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@Id",obj.Id),
                new SqlParameter("@Action", obj.ActionType),
                new SqlParameter("@StoreId",obj.StoreId),
                new SqlParameter("@LicenseId",obj.LicenseId),
                new SqlParameter("@LoginId",obj.LoginId),
                new SqlParameter("@DName",obj.DName),
                new SqlParameter("@DFatherName",obj.DFatherName),
                new SqlParameter("@DAddress",obj.DAddress),
                new SqlParameter("@DAadhaarNo",obj.DAadhaarNo),
                new SqlParameter("@DPanNo",obj.DPanNo),
                new SqlParameter("@DDateOfBirth",obj.DDateOfBirth),
                new SqlParameter("@DEmailId",obj.DEmailId),
                new SqlParameter("@DMobileNo",obj.DMobileNo),
                new SqlParameter("@AName",obj.AName),
                new SqlParameter("@AFatherName",obj.AFatherName),
                new SqlParameter("@AAddress",obj.AAddress),
                new SqlParameter("@AAadhaarNo",obj.AAadhaarNo),
                new SqlParameter("@APanNo",obj.APanNo),
                new SqlParameter("@ADateOfBirth",obj.ADateOfBirth),
                new SqlParameter("@AEmailId",obj.AEmailId),
                new SqlParameter("@AMobileNo",obj.AMobileNo),
                new SqlParameter("@NatureofBusiness",obj.NatureofBusiness),
                new SqlParameter("@DateofCommencement",obj.DateofCommencement),
                new SqlParameter("@ProductCategory",obj.ProductCategory),
                new SqlParameter("@AadhaarRegisteredofficeAddressNo",obj.AadhaarRegisteredofficeAddressNo),
                new SqlParameter("@AadhaarCardofDirector",obj.AadhaarCardofDirector),
                new SqlParameter("@PANCardofDirector", obj.PANCardofDirector),
                new SqlParameter("@PassportSizePhoto1", obj.PassportSizePhoto1),
                new SqlParameter("@AuthorizationLetter", obj.AuthorizationLetter),
                new SqlParameter("@AadhaarCardofAuthorized", obj.AadhaarCardofAuthorized),
                new SqlParameter("@PANCard", obj.PANCard),
                new SqlParameter("@PassportSizePhoto2", obj.PassportSizePhoto2),
                new SqlParameter("@ElectricityBill", obj.ElectricityBill),
                new SqlParameter("@SaledeedRentAgreement", obj.SaledeedRentAgreement),
                new SqlParameter("@FSMSPlan", obj.FSMSPlan),
                new SqlParameter("@FormIX", obj.FormIX),
                new SqlParameter("@WaterTestReport", obj.WaterTestReport),
                new SqlParameter("@IsSaved", obj.IsActive),
                new SqlParameter("@RESULT",""),
            };
            return await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteNonQueryReturnScalar("RTL.Usp_StoreLicences", CommandType.StoredProcedure, param.ToArray()));
        }



        public async static Task<DataSet> GetStoreDocumentDetails(StoreLicesensDocument obj)
        {
            var param = new List<SqlParameter>
            {
              new SqlParameter("@Id", obj.Id),
              new SqlParameter("@Action",obj.ActionType),
              new SqlParameter("@StoreId",obj.StoreId),
              new SqlParameter("@LicenseId",obj.LicenseId),
              new SqlParameter("@LoginId",obj.LoginId),
            };
            DataSet dt = await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommandds("RTL.Usp_StoreLicences", CommandType.StoredProcedure, param.ToArray()));
            return dt;
        }


        public async static Task<string> ApproveLicense(StoreLicesensDocument obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@Id",obj.Id),
                new SqlParameter("@Action", obj.ActionType),
                new SqlParameter("@StoreId",obj.StoreId),
                new SqlParameter("@LicenseId",obj.LicenseId),
                new SqlParameter("@LoginId",obj.LoginId),

                new SqlParameter("@RESULT",""),
            };
            return await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteNonQueryReturnScalar("RTL.Usp_StoreLicences", CommandType.StoredProcedure, param.ToArray()));
        }


        public async static Task<DataTable> LicenseRequestData(LicenseRequest obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@userId",obj.UserId),
                new SqlParameter("@Action",obj.Action),
                 new SqlParameter("@PageNo",obj.PageNo),
                  new SqlParameter("@PageSize",obj.PageSize),
                          new SqlParameter("@Searchby",obj.Searchby),
                           new SqlParameter("@LicenceId",obj.LicenceRequestId)
            };
            DataTable dt = await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("RTL.USP_LicenceRequest", CommandType.StoredProcedure, param.ToArray()));
            return dt;
        }

        public async static Task<DataTable> ReportLicenseRequestData(LicenseRequest obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@userId",obj.UserId),
                new SqlParameter("@Action",obj.Action),
                  new SqlParameter("@StoreCode",obj.StoreCode),
                 new SqlParameter("@ApplicationStatus",obj.ApplicationStatus),
                  new SqlParameter("@LicenseStatus",obj.LicenseStatus),
                   new SqlParameter("@RenewalStatus",obj.RenewalStatus),
                    new SqlParameter("@PageNo",obj.PageNo),
                     new SqlParameter("@PageSize",obj.PageSize)

            };
            DataTable dt = await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("RTL.USP_LicenceRequest", CommandType.StoredProcedure, param.ToArray()));
            return dt;
        }


        public async static Task<DataTable> GetStatusMaster(tblMasters obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@keyName",obj.Name),
            };
            DataTable dt = await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("RTL.USP_GetStatusMaster", CommandType.StoredProcedure, param.ToArray()));
            return dt;
        }

        public async static Task<string> InsertUpdateDelLicenseRequest(LicenseRequest obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@userId",obj.UserId),
                new SqlParameter("@Action", obj.Action),
                new SqlParameter("@StoreCode", obj.StoreCode),
                new SqlParameter("@LicenceRequestId",obj.LicenceRequestId),
                new SqlParameter("@ApplicationStatus",obj.ApplicationStatus),
                new SqlParameter("@ApplicationDate",obj.ApplicationDate),
                new SqlParameter("@UploadApplicationCopy",obj.UploadApplicationCopy),
                new SqlParameter("@UploadChallanCopy",obj.UploadChallanCopy),
                new SqlParameter("@UploadFeesCopy",obj.UploadFeesCopy),
                new SqlParameter("@LicenseStatus",obj.LicenseStatus),
                new SqlParameter("@LicenseDate",obj.LicenseDate),
                new SqlParameter("@LicenseNumber",obj.LicenseNumber),
                  new SqlParameter("@MachineNumber",obj.MachineNumber),
                new SqlParameter("@ValidityStartDate",obj.ValidityStartDate),
                new SqlParameter("@ValidityEndDate",obj.ValidityEndDate),
                   new SqlParameter("@LicenseCategory",obj.LicenseCategory),
                new SqlParameter("@UploadLicenseCopy",obj.UploadLicenseCopy),
                 new SqlParameter("@UploadAmendmentCopy",obj.UploadAmendmentCopy),
                new SqlParameter("@RenewalStatus",obj.RenewalStatus),
                new SqlParameter("@RenewalStartDate",obj.RenewalStartDate),
                new SqlParameter("@RenewalEndDate",obj.RenewalEndDate),
                new SqlParameter("@UploadRenewedCopy",obj.UploadRenewedCopy),
                new SqlParameter("@UserName",obj.UserName),
                        new SqlParameter("@Remark",obj.Remark),
                new SqlParameter("@UserPassword",obj.UserPassword),
                new SqlParameter("@MobileNumber",obj.MobileNumber),
                new SqlParameter("@EmailId",obj.EmailId),
                new SqlParameter("@TentativeDateofComp",obj.TentativeDateofComp),
                new SqlParameter("@InvoiceStatus",obj.InvoiceStatus),
                new SqlParameter("@InvoiceDate",obj.InvoiceDate),
                new SqlParameter("@InvoiceNo",obj.InvoiceNo),
                new SqlParameter("@InvoiceAmount", obj.InvoiceAmount),
                new SqlParameter("@UploadInvoice", obj.UploadInvoice),
                new SqlParameter("@PaymentStatus", obj.PaymentStatus),
                new SqlParameter("@PaymentTAT", obj.PaymentTAT),
                new SqlParameter("@PaymentDueDate", obj.PaymentDueDate),
                new SqlParameter("@PaymentOverDueDate", obj.PaymentOverDueDate),
                    new SqlParameter("@ActualCost", obj.ActualCost),
                        new SqlParameter("@GovtFees", obj.GovtFees),
                new SqlParameter("@Result",""),
            };
            return await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteNonQueryReturnScalar("RTL.USP_LicenceRequest", CommandType.StoredProcedure, param.ToArray()));
        }

        #region GetStoreDataBySearch
        public async static Task<DataTable> GetStoreDataBySearch(TblPartyMaster obj)
        {
            var param = new List<SqlParameter>
            {
              new SqlParameter("@PartyType", obj.Id),
              new SqlParameter("@PartyId",obj.LoginType),
              new SqlParameter("@StoreCode",obj.Attribute1)
            };
            DataTable dt = await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("RTL.Usp_GetStoreDataBySearch", CommandType.StoredProcedure, param.ToArray()));
            return dt;
        }
        #endregion
        #region Newsletter
        public async static Task<DataTable> GetNewsletter()
        {
            DataTable data = new DataTable();
            data.Columns.Add("Subjectline", typeof(string));
            data.Columns.Add("Id", typeof(int));

            data.Rows.Add(new object[] { "Acts", 1 });
            data.Rows.Add(new object[] { "Forms", 2 });
            data.Rows.Add(new object[] { "Stores", 3 });
            data.Rows.Add(new object[] { "How India almost went", 4 });
            data.Rows.Add(new object[] { "Reincarnation in IIT", 5 });
            data.Rows.Add(new object[] { "Erstwhile royal family", 6 });
            data.Rows.Add(new object[] { "Can Twitter Predict", 7 });
            data.Rows.Add(new object[] { "Do Some Foods Explode", 8 });
            data.Rows.Add(new object[] { "Suicide of a Hacker.", 9 });
            data.Rows.Add(new object[] { "Is the Life of a Child ", 10 });
            data.Rows.Add(new object[] { "Land-for-jobs scandal", 11 });
            data.Rows.Add(new object[] { "Money laundering case", 12 });
            return data;
        }
        #endregion
        #region License & Registration
        public async static Task<DataTable> GetLicenseAndRegistrationBy(TblPartyMaster obj)
        {
            var param = new List<SqlParameter>
            {
              new SqlParameter("@PartyId", obj.PartyId),
              new SqlParameter("@StoreCode",obj.StoreCode)
            };
            DataTable dt = await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("RTL.Usp_GetLicenseDetailsById", CommandType.StoredProcedure, param.ToArray()));
            return dt;
        }
        #endregion
        public async static Task<string> ApprovalUpdate(LicenseRequest obj)
        {
            var param = new List<SqlParameter>
            {
              new SqlParameter("@Action", obj.Action),
              new SqlParameter("@LicenceRequestId",obj.LicenceRequestId),
               new SqlParameter("@Result",""),
            };
            return await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteNonQueryReturnScalar("[RTL].[USP_LicenceRequest]", CommandType.StoredProcedure, param.ToArray()));

        }
        public async static Task<DataTable> RetailRolePermisssion(TblPartyMaster obj)
        {
            var param = new List<SqlParameter>
            {
              new SqlParameter("@Id", obj.Id),
               new SqlParameter("@Action", obj.Action),
            };
            DataTable dt = await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("RTL.USP_ROLEMANAGE", CommandType.StoredProcedure, param.ToArray()));
            return dt;
        }
        public async static Task<DataTable> CrossCheck(StoreLicesensDocument obj)
        {
            var param = new List<SqlParameter>
            {
              new SqlParameter("@Id", obj.Id),
               new SqlParameter("@Action", obj.ActionType),
                new SqlParameter("@DocumentPATH", obj.UFile),
            };
            DataTable dt = await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("RTL.USP_ROLEMANAGE", CommandType.StoredProcedure, param.ToArray()));
            return dt;
        }
        public async static Task<DataTable> StoreComplianceStatusMaster(TblPartyMaster obj)
        {
            var param = new List<SqlParameter>
            {
              new SqlParameter("@Id", obj.Id),
               new SqlParameter("@Action", obj.Action),
            };
            DataTable dt = await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("[RTL].[Usp_StoreComplianceStatusMaster]", CommandType.StoredProcedure, param.ToArray()));
            return dt;
        }

        public async static Task<string> IUDRetailClientDocMapping(MenuPermission obj)
        {
            StringBuilder menulist = new StringBuilder();
            string seprator = ",";
            string bigseprator = "";
            if (obj.MenuList != null)
            {
                if (obj.MenuList.Count > 0) if (obj.MenuList != null)
                    {
                        for (int i = 0; i < obj.MenuList.Count; i++)
                        {
                            menulist.Append(bigseprator);
                            menulist.Append(obj.MenuList[i].MenuId);

                            menulist.Append(seprator);

                            bigseprator = "|";
                        }
                        bigseprator = "";
                    }
            }
            var param = new List<SqlParameter>
            {

                new SqlParameter("@DocumentList", menulist.ToString()),
                new SqlParameter("@Createdby", obj.CreatedBy),
                new SqlParameter("@ClientId", obj.ClientId),

                new SqlParameter("@Action",obj.Action),
                new SqlParameter("@Result","")
            };

            return await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteNonQueryReturnScalar("[RTL].[USP_ClientDocumentMapping]", CommandType.StoredProcedure, param.ToArray()));
        }

        public async static Task<DataTable> SearchRetailClientDocMapping(MenuPermission obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@Action", obj.Action),
                 new SqlParameter("@ClientId", obj.ClientId),
            };
            return await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("[RTL].[USP_ClientDocumentMapping]", CommandType.StoredProcedure, param.ToArray()));

        }
        public async static Task<DataTable> SearchRetailCreateExecuter(TblPartyMaster obj)
        {
            var param = new List<SqlParameter>
            {
                    new SqlParameter("@Action", obj.ActionType),
                    new SqlParameter("@Id",obj.Id)
            };
            DataTable dt = await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("[RTL].[USP_CreateExecuter]", CommandType.StoredProcedure, param.ToArray()));
            return dt;
        }

        public async static Task<string> IUDRetailCreateExecuter(TblPartyMaster obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@Action", obj.ActionType),
                new SqlParameter("@PartyId",obj.PartyId),
                new SqlParameter("@ExecuterId", obj.UserId),
                new SqlParameter("@Id", obj.Id),
                new SqlParameter("@IsExecuter", obj.IsActive),
                new SqlParameter("@RESULT",""),
            };
            return await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteNonQueryReturnScalar("[RTL].[USP_CreateExecuter]", CommandType.StoredProcedure, param.ToArray()));
        }
        public async static Task<DataTable> SearchRetailAssignExecuter(TblPartyMaster obj)
        {
            var param = new List<SqlParameter>
            {
                    new SqlParameter("@Action", obj.ActionType),
                    new SqlParameter("@Id",obj.Id)
            };
            DataTable dt = await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("[RTL].[USP_AssignExecuter]", CommandType.StoredProcedure, param.ToArray()));
            return dt;
        }

        public async static Task<string> IUDRetailAssignExecuter(TblPartyMaster obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@Action", obj.ActionType),
                new SqlParameter("@ExecuterId", obj.UserId),
                new SqlParameter("@PartyId",obj.PartyId),
                new SqlParameter("@ClientId",obj.ClientId),
                new SqlParameter("@Id", obj.Id),
                new SqlParameter("@RESULT",""),
            };
            return await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteNonQueryReturnScalar("[RTL].[USP_AssignExecuter]", CommandType.StoredProcedure, param.ToArray()));
        }



        public async static Task<DataTable> SearchCompliance(RetialStoreManager obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@Id", obj.Id),
                new SqlParameter("@Action", obj.ActionType),
                new SqlParameter("@StoreCode", obj.StoreCode)             

            };

            DataTable dt = await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("RTL.USP_Compliance", CommandType.StoredProcedure, param.ToArray()));
            return dt;
        }
        public async static Task<DataTable> SearchStoreCompliance(RetialStoreManager obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@Id", obj.Ids),
                new SqlParameter("@Action", obj.ActionType),
                new SqlParameter("@StoreCode", obj.StoreCode),
                new SqlParameter("@UserId", obj.UserId)

            };

            DataTable dt = await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("RTL.USP_Compliance", CommandType.StoredProcedure, param.ToArray()));
            return dt;
        }

        public async static Task<string> IUDRetailcompliance(RetailLicenseDocuementMaster obj)
        {
            var param = new List<SqlParameter>
            {
                    new SqlParameter("@Id", obj.Id),
                    new SqlParameter("@Action", obj.ActionType),
                    new SqlParameter("@Act", obj.Act),
                    new SqlParameter("@StoreId", obj.StoreId),
                    new SqlParameter("@FY", obj.FY),
                    new SqlParameter("@CMonth", obj.CMonth),
                    new SqlParameter("@ExecuterId", obj.LoginId),
                    new SqlParameter("@DocumentPath", obj.DocumentPath),
                    new SqlParameter("@DocumentName", obj.DocumentName),
                    new SqlParameter("@RESULT",""),

        };
            return await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteNonQueryReturnScalar("RTL.USP_Compliance", CommandType.StoredProcedure, param.ToArray()));

        }
        public static Task<string> getexcel(RetailLicenseDocuementMaster obj)
        {

            var param = new List<SqlParameter>
            {
                new SqlParameter("@Action", obj.Action),
                new SqlParameter("@StoreId", obj.StoreCode),
                new SqlParameter("@DocumentPath", obj.DocumentPath),
                new SqlParameter("@DocumentName", obj.DocumentName),
                new SqlParameter("@RESULT",""),
            };
            return Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteNonQueryReturnScalar("RTL.USP_Compliance", CommandType.StoredProcedure, param.ToArray()));

        }
        public async static Task<DataTable> SearchRETAILCompliance(RetailLicenseDocuementMaster obj)
        {
            StringBuilder ActList = new StringBuilder();
            string bigseprator = "";
            if (obj.ActList != null)
            {
                if (obj.ActList.Count > 0) if (obj.ActList != null)
                    {
                        for (int i = 0; i < obj.ActList.Count; i++)
                        {
                            ActList.Append(bigseprator);
                            ActList.Append(obj.ActList[i].Act);
                            bigseprator = ",";
                        }
                        bigseprator = "";
                    }
            }
            var param = new List<SqlParameter>
            {
                new SqlParameter("@Id", obj.Id),
                new SqlParameter("@Action", obj.ActionType),
                new SqlParameter("@StoreId", obj.StoreId),
                new SqlParameter("@ActList", ActList.ToString()),
                new SqlParameter("@FY", obj.FY),
                new SqlParameter("@CMonth", obj.CMonth),
                new SqlParameter("@ExecuterId", obj.LoginId),
            };
            DataTable dt = await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("RTL.USP_Compliance", CommandType.StoredProcedure, param.ToArray()));
            return dt;
        }

        public async static Task<DataTable> BulkActSave(RetailLicenseDocuementMaster obj)
        {

            StringBuilder ActList = new StringBuilder();
            string bigseprator = "";
            if (obj.ActList != null)
            {
                if (obj.ActList.Count > 0) if (obj.ActList != null)
                    {
                        for (int i = 0; i < obj.ActList.Count; i++)
                        {
                            ActList.Append(bigseprator);
                            ActList.Append(obj.ActList[i].Act);
                            bigseprator = ",";
                        }
                        bigseprator = "";
                    }
            }
            var param = new List<SqlParameter>
            {
                new SqlParameter("@Id", obj.Id),
                new SqlParameter("@Action", obj.ActionType),
                new SqlParameter("@StoreId", obj.StoreId),
                  new SqlParameter("@StateId", obj.StateId),
                new SqlParameter("@ActList", ActList.ToString()),
                new SqlParameter("@FY", obj.FY),
                new SqlParameter("@CMonth", obj.CMonth),
                new SqlParameter("@ExecuterId", obj.LoginId),
            };
            DataTable dt = await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("RTL.USP_Compliance", CommandType.StoredProcedure, param.ToArray()));
            return dt;
        }
        public async static Task<DataTable> GetContractorComlist(ContractorAttendance obj)
        {

            var param = new List<SqlParameter>
            {
                new SqlParameter("@Action", obj.Action),
                new SqlParameter("@State",obj.State),
                new SqlParameter("@Month",obj.Month),
                new SqlParameter("@Year",obj.Year),

            };
            DataTable dt = await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("RTL.USP_ContractorComplianceBulk", CommandType.StoredProcedure, param.ToArray()));
            return dt;
        }
        public async static Task<DataTable> AuditGetContractorComlist(ContractorAttendance obj)
        {

            var param = new List<SqlParameter>
            {
                new SqlParameter("@Action", obj.Action),
                new SqlParameter("@State",obj.State),
                new SqlParameter("@Month",obj.Month),
                new SqlParameter("@Year",obj.Year),

            };
            DataTable dt = await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("RTL.USP_AuditContractorComplianceBulk", CommandType.StoredProcedure, param.ToArray()));
            return dt;
        }
        public async static Task<string> IUDBulkContractorComplianceExcel(ContractorAttendance obj)
        {
            StringBuilder AttendanceCompliance = new StringBuilder();
            string separator = ",";
            string bigSeparator = "";

            foreach (var att in obj.ContractorAttendanceList)
            {
                AttendanceCompliance.Append(bigSeparator);
                AttendanceCompliance.Append(att.EmployeeId).Append(separator)
                                    .Append(att.Month).Append(separator)
                                    .Append(att.Year).Append(separator)
                                    .Append(att.State).Append(separator);

                for (int d = 1; d <= 31; d++)
                {
                    var prop = att.GetType().GetProperty($"Day{d}");
                    AttendanceCompliance.Append(prop?.GetValue(att, null)?.ToString() ?? "").Append(separator);
                }

                AttendanceCompliance.Append(att.Designation).Append(separator)
                                    .Append(att.BasicActGross).Append(separator)
                                    .Append(att.BasicEarned).Append(separator)
                                    .Append(att.DA_Earned).Append(separator)
                                    .Append(att.HRA_Earned).Append(separator)
                                    .Append(att.OtherAllowanceEarned);

                bigSeparator = "|";
            }



            string miscCsv = obj.MiscExcelList ?? "";

            var param = new List<SqlParameter>
    {
        new SqlParameter("@ContractorComplianceBulkList", AttendanceCompliance.ToString()),
        new SqlParameter("@MiscExcelList", miscCsv),
        new SqlParameter("@UserId", obj.LoginId),
        new SqlParameter("@Action", obj.Action),
        new SqlParameter("@Signature", obj.Signature ?? ""),
        new SqlParameter("@RESULT", "") { Direction = ParameterDirection.Output },
        new SqlParameter("@p4output", "") { Direction = ParameterDirection.Output }
    };

            return await Task.Factory.StartNew(() =>
                SqlDBHelper.SqlHelper.ExecuteNonQueryReturnScalar("RTL.USP_ContractorComplianceBulk", CommandType.StoredProcedure, param.ToArray()));
        }



        public async static Task<string> AuditIUDBulkContractorComplianceExcel(ContractorAttendance obj)
        {
            StringBuilder AttendanceCompliance = new StringBuilder();
            string separator = ",";
            string bigSeparator = "";

            foreach (var att in obj.ContractorAttendanceList)
            {
                AttendanceCompliance.Append(bigSeparator);
                AttendanceCompliance.Append(att.EmployeeId).Append(separator)
                                    .Append(att.Month).Append(separator)
                                    .Append(att.Year).Append(separator)
                                    .Append(att.State).Append(separator);

                for (int d = 1; d <= 31; d++)
                {
                    var prop = att.GetType().GetProperty($"Day{d}");
                    AttendanceCompliance.Append(prop?.GetValue(att, null)?.ToString() ?? "").Append(separator);
                }

                AttendanceCompliance.Append(att.Designation).Append(separator)
                                    .Append(att.BasicActGross).Append(separator)
                                    .Append(att.BasicEarned).Append(separator)
                                    .Append(att.DA_Earned).Append(separator)
                                    .Append(att.HRA_Earned).Append(separator)
                                    .Append(att.OtherAllowanceEarned);

                bigSeparator = "|";
            }



            string miscCsv = obj.MiscExcelList ?? "";

            var param = new List<SqlParameter>
    {
        new SqlParameter("@ContractorComplianceBulkList", AttendanceCompliance.ToString()),
        new SqlParameter("@MiscExcelList", miscCsv),
        new SqlParameter("@UserId", obj.LoginId),
        new SqlParameter("@Action", obj.Action),
        new SqlParameter("@Signature", obj.Signature ?? ""),
        new SqlParameter("@RESULT", "") { Direction = ParameterDirection.Output },
        new SqlParameter("@p4output", "") { Direction = ParameterDirection.Output }
    };

            return await Task.Factory.StartNew(() =>
                SqlDBHelper.SqlHelper.ExecuteNonQueryReturnScalar("RTL.USP_AuditContractorComplianceBulk", CommandType.StoredProcedure, param.ToArray()));
        }



        public async static Task<DataTable> GetReportlist(RetailLicenseDocuementMaster obj)
        {

           string ActList = obj.NewActList != null ? string.Join(",", obj.NewActList) : "";

            var param = new List<SqlParameter>
                {
                new SqlParameter("@Id", obj.Id),
                new SqlParameter("@Action", obj.Action),
                new SqlParameter("@StoreId", obj.StoreId),
                new SqlParameter("@StateId", obj.StateId),
                new SqlParameter("@ActList", ActList),
                new SqlParameter("@FY", obj.FY),
                new SqlParameter("@CMonth", obj.CMonth),
                new SqlParameter("@ExecuterId", obj.LoginId),
                new SqlParameter("@DocumentId", obj.DocumentId), 
                new SqlParameter("@ComplianceCategory", obj.ComplianceCategory)
                };
            DataTable dt = await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("RTL.USP_ComplianceBulk", CommandType.StoredProcedure, param.ToArray()));
            return dt;
        }

        public async static Task<string> IUDExcel(RetialStoreManager obj)
        {

            StringBuilder ComplianceMasterList = new StringBuilder();

            string seprator = ",";
            string bigseprator = "";
            for (int i = 0; i < obj.ComplianceList.Count; i++)
            {
                ComplianceMasterList.Append(bigseprator);
                ComplianceMasterList.Append(obj.ComplianceList[i].Act);
                ComplianceMasterList.Append(seprator);
                ComplianceMasterList.Append(obj.ComplianceList[i].DocumentNo);
                ComplianceMasterList.Append(seprator);
                ComplianceMasterList.Append(obj.ComplianceList[i].DocumentName);
                ComplianceMasterList.Append(seprator);
                ComplianceMasterList.Append(obj.ComplianceList[i].Type);
                ComplianceMasterList.Append(seprator);
                ComplianceMasterList.Append(obj.ComplianceList[i].Frequency);
                ComplianceMasterList.Append(seprator);
                ComplianceMasterList.Append(obj.ComplianceList[i].FilePath);
                bigseprator = "|";
            }

            var param = new List<SqlParameter>
            {
                new SqlParameter("@ComplianceMaster", ComplianceMasterList.ToString()),
                new SqlParameter("@UserId", obj.LoginId),
                new SqlParameter("@StoreCode", obj.StoreCode),
                new SqlParameter("@ExecuterId", obj.ExecuterId),
                new SqlParameter("@Act", obj.Act),
                new SqlParameter("@FY", obj.FY),
                new SqlParameter("@CMonth", obj.CMonth),
                new SqlParameter("@Action", obj.ActionType),
                   new SqlParameter("@Directory", obj.Directory),
                new SqlParameter("@RESULT",""),
            };
            return await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteNonQueryReturnScalar("RTL.USP_Compliance", CommandType.StoredProcedure, param.ToArray()));

        }

        public async static Task<DataTable> GetNoticeList(NoticeBAL obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@Id", obj.Id),
                new SqlParameter("@Action", obj.Action),
                new SqlParameter("@StoreId", obj.StoreId),
                new SqlParameter("@DepartmentId", obj.DepartmentId),
                 new SqlParameter("@LoginAs", obj.LoginAs)
            };
            DataTable dt = await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("[RTL].[USP_Notice]", CommandType.StoredProcedure, param.ToArray()));
            return dt;
        }
        public async static Task<string> InsertUpdateNotice(NoticeBAL obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@Id",obj.Id),
                new SqlParameter("@Action", obj.Action),
                  new SqlParameter("@LoginAs",obj.LoginAs),
                new SqlParameter("@UserId",obj.UserId),
                new SqlParameter("@StoreId",obj.StoreId),
                new SqlParameter("@DepartmentId",obj.DepartmentId),
                new SqlParameter("@NoticeUpload",obj.NoticeUpload),
                new SqlParameter("@ReceiptDate",obj.ReceiptDate),
                new SqlParameter("@ExecuterId",obj.ExecuterId),
                new SqlParameter("@ExecuterStoreId",obj.ExecuterStoreId),
                new SqlParameter("@ExecuterDepartmentId",obj.ExecuterDepartmentId),
                new SqlParameter("@ExecuterReceiptDate",obj.ExecuterReceiptDate),
                new SqlParameter("@FinalSubmittionbyExecuter",obj.FinalSubmittionbyExecuter),
                new SqlParameter("@NoticeDate",obj.NoticeDate),
                new SqlParameter("@NoticeMode",obj.NoticeMode),
                new SqlParameter("@HearingDate",obj.HearingDate),
                new SqlParameter("@OfficerName",obj.OfficerName),
                new SqlParameter("@Address",obj.Address),
                new SqlParameter("@RepresentativeName",obj.RepresentativeName),
                new SqlParameter("@RepresentativeEmail",obj.RepresentativeEmail),
                new SqlParameter("@Description",obj.Description),
                    new SqlParameter("@Probability",obj.Probability),


                      new SqlParameter("@Interest",obj.Interest),
                        new SqlParameter("@LateFee",obj.LateFee),
                          new SqlParameter("@Fines",obj.Fines),
                            new SqlParameter("@Penalities",obj.Penalities),
                              new SqlParameter("@Other",obj.Other),
                new SqlParameter("@Result",""),
            };
            return await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteNonQueryReturnScalar("[RTL].[USP_Notice]", CommandType.StoredProcedure, param.ToArray()));
        }
        public async static Task<string> IUDBulkStoreMaster(RetialStoreManager obj)
        {

            StringBuilder StoreMaster = new StringBuilder();

            string seprator = ",";
            string bigseprator = "";
            for (int i = 0; i < obj.StoreMaster.Count; i++)
            {
                StoreMaster.Append(bigseprator);
                StoreMaster.Append(obj.StoreMaster[i].RefStoreCode);
                StoreMaster.Append(seprator);
                StoreMaster.Append(obj.StoreMaster[i].StoreName);
                StoreMaster.Append(seprator);
                StoreMaster.Append(obj.StoreMaster[i].CompleteAddress);
                StoreMaster.Append(seprator);
                StoreMaster.Append(Convert.ToDateTime(obj.StoreMaster[i].ProposedDate).ToString("yyyy-MM-dd"));
                StoreMaster.Append(seprator);
                StoreMaster.Append(obj.StoreMaster[i].StoreLocation);
                StoreMaster.Append(seprator);
                StoreMaster.Append(obj.StoreMaster[i].ZipCode);
                StoreMaster.Append(seprator);
                StoreMaster.Append(obj.StoreMaster[i].StoreManagerName);
                StoreMaster.Append(seprator);
                StoreMaster.Append(obj.StoreMaster[i].StoreManagerMobileNo);
                StoreMaster.Append(seprator);
                StoreMaster.Append(obj.StoreMaster[i].StoreManagerEmail);
                StoreMaster.Append(seprator);
                StoreMaster.Append(obj.StoreMaster[i].AreaManagerMobileNo);
                StoreMaster.Append(seprator);
                StoreMaster.Append(obj.StoreMaster[i].AreaManagerName);
                StoreMaster.Append(seprator);
                StoreMaster.Append(obj.StoreMaster[i].AreaManagerEmail);
                StoreMaster.Append(seprator);
                StoreMaster.Append(obj.StoreMaster[i].ZonalManagerName);
                StoreMaster.Append(seprator);
                StoreMaster.Append(obj.StoreMaster[i].ZonalManagerMobileNo);
                StoreMaster.Append(seprator);
                StoreMaster.Append(obj.StoreMaster[i].ZonalManagerEmail);
                StoreMaster.Append(seprator);
                StoreMaster.Append(obj.StoreMaster[i].CircleHeadName);
                StoreMaster.Append(seprator);
                StoreMaster.Append(obj.StoreMaster[i].CircleHeadMobileNo);
                StoreMaster.Append(seprator);
                StoreMaster.Append(obj.StoreMaster[i].CircleHeadEmail);
                StoreMaster.Append(seprator);
                StoreMaster.Append(obj.StoreMaster[i].RegionalHeadName);
                StoreMaster.Append(seprator);
                StoreMaster.Append(obj.StoreMaster[i].RegionalHeadMobileNo);
                StoreMaster.Append(seprator);
                StoreMaster.Append(obj.StoreMaster[i].RegionalHeadEmail);
                StoreMaster.Append(seprator);
                StoreMaster.Append(obj.StoreMaster[i].CorporateHeadName);
                StoreMaster.Append(seprator);
                StoreMaster.Append(obj.StoreMaster[i].CorporateHeadMobileNo);
                StoreMaster.Append(seprator);
                StoreMaster.Append(obj.StoreMaster[i].CorporateHeadEmail);
                StoreMaster.Append(seprator);
                StoreMaster.Append(obj.StoreMaster[i].SQFTStoreArea);
                StoreMaster.Append(seprator);
                StoreMaster.Append(obj.StoreMaster[i].DaysOfExpire);
                StoreMaster.Append(seprator);
                StoreMaster.Append(obj.StoreMaster[i].IsActive);
                StoreMaster.Append(seprator);
                StoreMaster.Append(obj.StoreMaster[i].Category);
                StoreMaster.Append(seprator);
                StoreMaster.Append(obj.StoreMaster[i].RegionName);
                StoreMaster.Append(seprator);
                StoreMaster.Append(obj.StoreMaster[i].Country);
                StoreMaster.Append(seprator);
                StoreMaster.Append(obj.StoreMaster[i].State);
                StoreMaster.Append(seprator);
                StoreMaster.Append(obj.StoreMaster[i].City);
                StoreMaster.Append(seprator);
                StoreMaster.Append(obj.StoreMaster[i].LicenseExpiryDay);
                StoreMaster.Append(seprator);
                StoreMaster.Append(obj.StoreMaster[i].Operationmodel);
                StoreMaster.Append(seprator);
                StoreMaster.Append(obj.StoreMaster[i].ComplianceCategory);               

                bigseprator = "|";
            }

            var param = new List<SqlParameter>
            {
                new SqlParameter("@StoreMaster", StoreMaster.ToString()),
                  new SqlParameter("@UserId", obj.LoginId),
                new SqlParameter("@Action", obj.ActionType),
                new SqlParameter("@RESULT",""),
            };
            return await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteNonQueryReturnScalar("[RTL].[Usp_StoreMaster]", CommandType.StoredProcedure, param.ToArray()));

        }

        //public async static Task<string> IUDBulkEmployeee(RetialStoreManager obj)
        //{

        //    StringBuilder EmployeeMaster = new StringBuilder();

        //    string seprator = ",";
        //    string bigseprator = "";
        //    for (int i = 0; i < obj.EmployeeMaster.Count; i++)
        //    {
        //        EmployeeMaster.Append(bigseprator);
        //        EmployeeMaster.Append(obj.EmployeeMaster[i].RefEmployeeCode);
        //        EmployeeMaster.Append(seprator);
        //        EmployeeMaster.Append(obj.EmployeeMaster[i].EmployeeName);
        //        EmployeeMaster.Append(seprator);
        //        EmployeeMaster.Append(obj.EmployeeMaster[i].EmployeeDesignation);
        //        EmployeeMaster.Append(seprator);
        //        EmployeeMaster.Append(obj.EmployeeMaster[i].EmployeeDepartment);
        //        EmployeeMaster.Append(seprator);
        //        EmployeeMaster.Append(obj.EmployeeMaster[i].Father_Husband_Name);
        //        EmployeeMaster.Append(seprator);
        //        EmployeeMaster.Append(obj.EmployeeMaster[i].Gendar);
        //        EmployeeMaster.Append(seprator);
        //        EmployeeMaster.Append(obj.EmployeeMaster[i].MaritalStatus);
        //        EmployeeMaster.Append(seprator);
        //        //EmployeeMaster.Append(Convert.ToDateTime(obj.EmployeeMaster[i].DateOfBirth).ToString("yyyy-MM-dd"));
        //        EmployeeMaster.Append(obj.EmployeeMaster[i].DateOfBirth);

        //        EmployeeMaster.Append(seprator);
        //        EmployeeMaster.Append(obj.EmployeeMaster[i].PresentAddress);
        //        EmployeeMaster.Append(seprator);
        //        EmployeeMaster.Append(obj.EmployeeMaster[i].PermanemtAddress);
        //        EmployeeMaster.Append(seprator);
        //        EmployeeMaster.Append(obj.EmployeeMaster[i].AdharCardNumber);
        //        EmployeeMaster.Append(seprator);
        //        EmployeeMaster.Append(obj.EmployeeMaster[i].PANNumber);
        //        EmployeeMaster.Append(seprator);
        //        EmployeeMaster.Append(obj.EmployeeMaster[i].MobileNumber);
        //        EmployeeMaster.Append(seprator);
        //        EmployeeMaster.Append(obj.EmployeeMaster[i].AlternativeMobileNumber);
        //        EmployeeMaster.Append(seprator);
        //        EmployeeMaster.Append(obj.EmployeeMaster[i].EmployeeEmailID);
        //        EmployeeMaster.Append(seprator);
        //        EmployeeMaster.Append(obj.EmployeeMaster[i].BankAccountNumber);
        //        EmployeeMaster.Append(seprator);
        //        EmployeeMaster.Append(obj.EmployeeMaster[i].BankIFSCCode);
        //        EmployeeMaster.Append(seprator);
        //        EmployeeMaster.Append(obj.EmployeeMaster[i].PreviousUAN);
        //        EmployeeMaster.Append(seprator);
        //        EmployeeMaster.Append(obj.EmployeeMaster[i].PreviousESI);
        //        EmployeeMaster.Append(seprator);
        //        EmployeeMaster.Append(obj.EmployeeMaster[i].GrossSalary);
        //        EmployeeMaster.Append(seprator);

        //      // EmployeeMaster.Append(Convert.ToDateTime(obj.EmployeeMaster[i].DOJ).ToString("yyyy-MM-dd"));
        //        EmployeeMaster.Append(obj.EmployeeMaster[i].DOJ);

        //        EmployeeMaster.Append(seprator);
        //        EmployeeMaster.Append(obj.EmployeeMaster[i].NomineeName);
        //        EmployeeMaster.Append(seprator);
        //        EmployeeMaster.Append(obj.EmployeeMaster[i].NomineeAddress);
        //        EmployeeMaster.Append(seprator);
        //        EmployeeMaster.Append(obj.EmployeeMaster[i].NomineeRelation);
        //        EmployeeMaster.Append(seprator);
        //        EmployeeMaster.Append(obj.EmployeeMaster[i].NomineeDOB);
        //        //EmployeeMaster.Append(Convert.ToDateTime(obj.EmployeeMaster[i].NomineeDOB).ToString("yyyy-MM-dd"));
        //        EmployeeMaster.Append(seprator);
        //        EmployeeMaster.Append(obj.EmployeeMaster[i].StoreCode);
        //        EmployeeMaster.Append(seprator);
        //        EmployeeMaster.Append(obj.EmployeeMaster[i].IsActive);
        //        EmployeeMaster.Append(seprator);
        //        EmployeeMaster.Append(obj.EmployeeMaster[i].LeavingDate);
        //        EmployeeMaster.Append(seprator);
        //        EmployeeMaster.Append(obj.EmployeeMaster[i].PFAccount);
        //        bigseprator = "|";
        //    }

        //    var param = new List<SqlParameter>
        //    {
        //        new SqlParameter("@EmployeeMaster", EmployeeMaster.ToString()),
        //          new SqlParameter("@PartyId", obj.PartyId),
        //            new SqlParameter("@UserId", obj.UserId),
        //        new SqlParameter("@Action", obj.ActionType),
        //        new SqlParameter("@RESULT",""),
        //    };
        //    return await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteNonQueryReturnScalar("[RTL].[USP_EmployeeMaster]", CommandType.StoredProcedure, param.ToArray()));

        //}


        public async static Task<string> IUDBulkEmployeee(RetialStoreManager obj)
        {
            StringBuilder EmployeeMaster = new StringBuilder();

            string seprator = ",";
            string bigseprator = "";

            for (int i = 0; i < obj.EmployeeMaster.Count; i++)
            {
                var item = obj.EmployeeMaster[i];

                EmployeeMaster.Append(bigseprator);

                EmployeeMaster.Append(item.RefEmployeeCode); EmployeeMaster.Append(seprator);
                EmployeeMaster.Append(item.EmployeeName); EmployeeMaster.Append(seprator);
                EmployeeMaster.Append(item.EmployeeDesignation); EmployeeMaster.Append(seprator);
                EmployeeMaster.Append(item.EmployeeDepartment); EmployeeMaster.Append(seprator);
                EmployeeMaster.Append(item.Father_Husband_Name); EmployeeMaster.Append(seprator);
                EmployeeMaster.Append(item.Gendar); EmployeeMaster.Append(seprator);
                EmployeeMaster.Append(item.MaritalStatus); EmployeeMaster.Append(seprator);

                EmployeeMaster.Append(item.DateOfBirth); EmployeeMaster.Append(seprator);
                EmployeeMaster.Append(item.DOJ); EmployeeMaster.Append(seprator);

                EmployeeMaster.Append(item.PresentAddress); EmployeeMaster.Append(seprator);
                EmployeeMaster.Append(item.PermanemtAddress); EmployeeMaster.Append(seprator);

                EmployeeMaster.Append(item.MobileNumber); EmployeeMaster.Append(seprator);
                EmployeeMaster.Append(item.AlternativeMobileNumber); EmployeeMaster.Append(seprator);
                EmployeeMaster.Append(item.EmployeeEmailID); EmployeeMaster.Append(seprator);

                EmployeeMaster.Append(item.PANNumber); EmployeeMaster.Append(seprator);
                EmployeeMaster.Append(item.AdharCardNumber); EmployeeMaster.Append(seprator);

                EmployeeMaster.Append(item.PreviousUAN); EmployeeMaster.Append(seprator);
                EmployeeMaster.Append(item.PFAccount); EmployeeMaster.Append(seprator);

                EmployeeMaster.Append(item.BankAccountNumber); EmployeeMaster.Append(seprator);
                EmployeeMaster.Append(item.BankIFSCCode); EmployeeMaster.Append(seprator);

                EmployeeMaster.Append(item.PreviousESI); EmployeeMaster.Append(seprator);
                EmployeeMaster.Append(item.GrossSalary); EmployeeMaster.Append(seprator);

                EmployeeMaster.Append(item.NomineeName); EmployeeMaster.Append(seprator);
                EmployeeMaster.Append(item.NomineeRelation); EmployeeMaster.Append(seprator);
                EmployeeMaster.Append(item.NomineeDOB); EmployeeMaster.Append(seprator);
                EmployeeMaster.Append(item.NomineeAddress); EmployeeMaster.Append(seprator);

                EmployeeMaster.Append(item.MinimumWageCategory); EmployeeMaster.Append(seprator);
                EmployeeMaster.Append(item.WageType); EmployeeMaster.Append(seprator);
                EmployeeMaster.Append(item.WageDisbursementMode); EmployeeMaster.Append(seprator);

                EmployeeMaster.Append(item.PPE); EmployeeMaster.Append(seprator);
                EmployeeMaster.Append(item.PPEType); EmployeeMaster.Append(seprator);

                EmployeeMaster.Append(item.SafetyTrainingStatus); EmployeeMaster.Append(seprator);
                EmployeeMaster.Append(item.SiteInductionStatus); EmployeeMaster.Append(seprator);
                EmployeeMaster.Append(item.PoliceVerificationStatus); EmployeeMaster.Append(seprator);

                EmployeeMaster.Append(item.TempIDStatus); EmployeeMaster.Append(seprator);
                EmployeeMaster.Append(item.TempIDNumber); EmployeeMaster.Append(seprator);
                EmployeeMaster.Append(item.TempIDDate); EmployeeMaster.Append(seprator);

                EmployeeMaster.Append(item.PermanentIDStatus); EmployeeMaster.Append(seprator);
                EmployeeMaster.Append(item.PermanentIDNumber); EmployeeMaster.Append(seprator);
                EmployeeMaster.Append(item.PermanentIDDate); EmployeeMaster.Append(seprator);

                // existing extra fields
                EmployeeMaster.Append(item.StoreCode); EmployeeMaster.Append(seprator);
                EmployeeMaster.Append(item.IsActive); EmployeeMaster.Append(seprator);
                EmployeeMaster.Append(item.LeavingDate);

                bigseprator = "|";
            }

            var param = new List<SqlParameter>
    {
        new SqlParameter("@EmployeeMaster", EmployeeMaster.ToString()),
        new SqlParameter("@PartyId", obj.PartyId),
        new SqlParameter("@UserId", obj.UserId),
        new SqlParameter("@Action", obj.ActionType),
        new SqlParameter("@RESULT",""),
    };

            return await Task.Factory.StartNew(() =>
                SqlDBHelper.SqlHelper.ExecuteNonQueryReturnScalar(
                    "[RTL].[USP_EmployeeMaster]",
                    CommandType.StoredProcedure,
                    param.ToArray()
                )
            );
        }




        public async static Task<string> NewIUDBulkEmployeee(RetialStoreManager obj)
        {
            try
            {
                DataTable dt = new DataTable();

                dt.Columns.Add("RefEmployeeCode");
                dt.Columns.Add("EmployeeName");
                dt.Columns.Add("SiteName");
                dt.Columns.Add("EmployeeDesignation");

                dt.Columns.Add("EmployeeDepartment");
                dt.Columns.Add("Father_Husband_Name");
                dt.Columns.Add("Gendar");
                dt.Columns.Add("MaritalStatus");
                dt.Columns.Add("DateOfBirth");
                dt.Columns.Add("DOJ");
                dt.Columns.Add("PresentAddress");
                dt.Columns.Add("PermanemtAddress");
                dt.Columns.Add("MobileNumber");
                dt.Columns.Add("AlternativeMobileNumber");
                dt.Columns.Add("EmployeeEmailID");
                dt.Columns.Add("PANNumber");
                dt.Columns.Add("AdharCardNumber");
                dt.Columns.Add("UAN");
                dt.Columns.Add("PFAccount");
                dt.Columns.Add("BankAccountNumber");
                dt.Columns.Add("BankIFSCCode");
                dt.Columns.Add("PreviousESI");
                dt.Columns.Add("GrossSalary");
                dt.Columns.Add("NomineeName");
                dt.Columns.Add("NomineeRelation");
                dt.Columns.Add("NomineeDOB");
                dt.Columns.Add("NomineeAddress");
                dt.Columns.Add("MinimumWageCategory");
                dt.Columns.Add("WageType");
                dt.Columns.Add("WageDisbursementMode");
                dt.Columns.Add("PPE");
                dt.Columns.Add("PPEType");
                dt.Columns.Add("SafetyTrainingStatus");
                dt.Columns.Add("SiteInductionStatus");
                dt.Columns.Add("PoliceVerificationStatus");
                dt.Columns.Add("TempIDStatus");
                dt.Columns.Add("TempIDNumber");
                dt.Columns.Add("TempIDDate");
                dt.Columns.Add("PermanentIDStatus");
                dt.Columns.Add("PermanentIDNumber");
                dt.Columns.Add("PermanentIDDate");

                foreach (var item in obj.EmployeeMaster)
                {
                    dt.Rows.Add(
                        item.RefEmployeeCode,
                        item.EmployeeName,
                        item.SiteName,
                        item.EmployeeDesignation,

                        item.EmployeeDepartment,
                        item.Father_Husband_Name,
                        item.Gendar,
                        item.MaritalStatus,
                        item.DateOfBirth,
                        item.DOJ,
                        

                        item.PresentAddress,
                        item.PermanemtAddress,

                        item.MobileNumber,
                        item.AlternativeMobileNumber,
                        item.EmployeeEmailID,

                        item.PANNumber,
                        item.AdharCardNumber,

                        item.PreviousUAN,
                        item.PFAccount,

                        item.BankAccountNumber,
                        item.BankIFSCCode,

                        item.PreviousESI,
                       item.GrossSalary,

                        item.NomineeName,
                        item.NomineeRelation,
                        item.NomineeDOB,
                        item.NomineeAddress,

                        item.MinimumWageCategory,
                        item.WageType,
                        item.WageDisbursementMode,

                        item.PPE,
                        item.PPEType,

                        item.SafetyTrainingStatus,
                        item.SiteInductionStatus,
                        item.PoliceVerificationStatus,

                        item.TempIDStatus,
                        item.TempIDNumber,
                         item.TempIDDate,

                        item.PermanentIDStatus,
                        item.PermanentIDNumber,
                       item.PermanentIDDate
                    );
                }

                // 🔍 Debug check
                if (dt.Rows.Count == 0)
                {
                    return "No data found to insert";
                }

                var parameters = new List<SqlParameter>
        {
            new SqlParameter("@EmployeeTable", dt)
            {
                SqlDbType = SqlDbType.Structured,
                TypeName = "EmployeeType_V2" // 🔥 yaha check karo SQL me same naam ho
            },
            new SqlParameter("@PartyId", obj.PartyId),
            new SqlParameter("@UserId", obj.UserId),
            new SqlParameter("@Action", obj.ActionType),
            new SqlParameter("@RESULT", SqlDbType.NVarChar, 100)
            {
                Direction = ParameterDirection.Output
            }
        };

                var result = await Task.Run(() =>
                    SqlDBHelper.SqlHelper.ExecuteNonQueryReturnScalar(
                        "[RTL].[USP_EmployeeMaster]",
                        CommandType.StoredProcedure,
                        parameters.ToArray()
                    )
                );

                return result?.ToString() ?? "Success";
            }
            catch (Exception ex)
            {
                // 🔥 Full error return karega (debug ke liye best)
                return "ERROR: " + ex.Message + " | INNER: " + ex.InnerException;
            }
        }

        public async static Task<string> IUDBulkComplianceExcel(Attendance obj)
        {
            StringBuilder AttendanceCompliance = new StringBuilder();
            string separator = ",";
            string bigSeparator = "";

            foreach (var att in obj.AttendanceList)
            {
                AttendanceCompliance.Append(bigSeparator);
                AttendanceCompliance.Append(att.EmployeeId).Append(separator)
                                    .Append(att.Month).Append(separator)
                                    .Append(att.Year).Append(separator)
                                    .Append(att.State).Append(separator);

                for (int d = 1; d <= 31; d++)
                {
                    var prop = att.GetType().GetProperty($"Day{d}");
                    AttendanceCompliance.Append(prop?.GetValue(att, null)?.ToString() ?? "").Append(separator);
                }

                AttendanceCompliance.Append(att.Designation).Append(separator)
                                    .Append(att.BasicActGross).Append(separator)
                                    .Append(att.BasicEarned).Append(separator)
                                    .Append(att.DA_Earned).Append(separator)
                                    .Append(att.HRA_Earned).Append(separator)
                                    .Append(att.OtherAllowanceEarned);

                bigSeparator = "|";
            }

         

            string miscCsv = obj.MiscExcelList ?? "";

            var param = new List<SqlParameter>
    {
        new SqlParameter("@ComplianceBulkList", AttendanceCompliance.ToString()), 
        new SqlParameter("@MiscExcelList", miscCsv),
        new SqlParameter("@UserId", obj.LoginId),
        new SqlParameter("@Action", obj.Action),
        new SqlParameter("@Signature", obj.Signature ?? ""),
        new SqlParameter("@RESULT", "") { Direction = ParameterDirection.Output },
        new SqlParameter("@p4output", "") { Direction = ParameterDirection.Output }
    };

            return await Task.Factory.StartNew(() =>
                SqlDBHelper.SqlHelper.ExecuteNonQueryReturnScalar("RTL.USP_ComplianceBulk", CommandType.StoredProcedure, param.ToArray()));
        }


        public async static Task<DataTable> GetComlist(Attendance obj)
        {
          
            var param = new List<SqlParameter>
            {
                new SqlParameter("@Action", obj.Action),
                new SqlParameter("@State",obj.State),
                new SqlParameter("@Month",obj.Month),
                new SqlParameter("@Year",obj.Year),
                   new SqlParameter("@Id",obj.LoginId),

            };
            DataTable dt = await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("RTL.USP_ComplianceBulk", CommandType.StoredProcedure, param.ToArray()));
            return dt;
        }

        public async static Task<DataTable> SearchEscalation(RetialEmployeeManager obj)
        {
            var param = new List<SqlParameter>
            {
                    new SqlParameter("@Action", obj.ActionType),
                    new SqlParameter("@ClientId",obj.UserId)
            };
            DataTable dt = await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("RTL.Escalation", CommandType.StoredProcedure, param.ToArray()));
            return dt;
        }
        public async static Task<string> IUDEscalation(RetialEmployeeManager obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@Id",obj.Id),
                new SqlParameter("@Action", obj.ActionType),
                new SqlParameter("@ClientId",obj.ClientId),
                new SqlParameter("@Escalation1",obj.Escalation1),
                new SqlParameter("@Escalation2",obj.Escalation2),
                new SqlParameter("@StoreCode",obj.StoreCode),
                new SqlParameter("@LicenceId",obj.LicenceId),
                new SqlParameter("@Remark",obj.Remark),
                new SqlParameter("@Result",""),
            };
            return await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteNonQueryReturnScalar("RTL.Escalation", CommandType.StoredProcedure, param.ToArray()));
        }
        public async static Task<string> IUDPayment(PaymentBAL obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@Id",obj.Id),
                new SqlParameter("@LicenceReqId", obj.LicenceReqId),
                new SqlParameter("@Action", obj.Action),
                new SqlParameter("@LicenceId",obj.LicenceId),
                new SqlParameter("@StoreCode",obj.StoreCode),
                new SqlParameter("@Amount",obj.Amount),
                new SqlParameter("@TotalAmount",obj.TotalAmount),
                new SqlParameter("@Result",""),
            };
            return await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteNonQueryReturnScalar("[RTL].[USP_Payment]", CommandType.StoredProcedure, param.ToArray()));
        }
        public static Task<string> UpdateTransactions(PaymentBAL obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@Id",obj.Id),
                new SqlParameter("@PaymentMode", obj.PaymentMode),
                new SqlParameter("@Action", "6"),
                new SqlParameter("@PaymentStatus",obj.PaymentStatus),
                new SqlParameter("@TotalAmount",obj.TotalAmount),
                new SqlParameter("@OrderId",obj.OrderId),
                new SqlParameter("@TransId",obj.TransId),
                new SqlParameter("@Result",""),
            };
            return Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteNonQueryReturnScalar("[RTL].[USP_Payment]", CommandType.StoredProcedure, param.ToArray()));
        }
        public async static Task<DataTable> SearchPayment(PaymentBAL obj)
        {
            var param = new List<SqlParameter>
            {
                    new SqlParameter("@Action", obj.Action),
                    new SqlParameter("@Id",obj.Id)
            };
            DataTable dt = await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("[RTL].[USP_Payment]", CommandType.StoredProcedure, param.ToArray()));
            return dt;
        }
      


        
        public static Task<string> RetailONETIMEDOCUMENT(TblSiteManager obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@ClientId",obj.ClientId),
                new SqlParameter("@Name", obj.Name),
                new SqlParameter("@EmailId",obj.EmailId),
                new SqlParameter("@ContactNo",obj.ContactNo),
                new SqlParameter("@CIN",obj.CIN),
                new SqlParameter("@PAN",obj.Panitno),
                 new SqlParameter("@TAN",obj.TAN),
                new SqlParameter("@GSTN",obj.Gstinuin),
                new SqlParameter("@Pincode",obj.Pincode),
                new SqlParameter("@Country",obj.CountryId),
                new SqlParameter("@State",obj.StateId),
                new SqlParameter("@City",obj.CityId),
                new SqlParameter("@Address",obj.Address),
                new SqlParameter("@PF",obj.PF),
                new SqlParameter("@Labour",obj.Labour),
                new SqlParameter("@ProfessionalTaxReg",obj.ProfessionalTaxReg),
                 new SqlParameter("@FileName",obj.FileName),
                  new SqlParameter("@File",obj.File),
                  new SqlParameter("@Action", obj.ActionType),
                new SqlParameter("@Result",""),
            };
            return Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteNonQueryReturnScalar("USP_RetailOneTimeDocument", CommandType.StoredProcedure, param.ToArray()));
        }
        public async static Task<DataTable> SearchRetailONETIMEDOCUMENT(TblSiteManager obj)
        {
            var param = new List<SqlParameter>
            {
                    new SqlParameter("@Action", obj.ActionType),
                    new SqlParameter("@ClientId",obj.ClientId)
            };
            DataTable dt = await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("USP_RetailOneTimeDocument", CommandType.StoredProcedure, param.ToArray()));
            return dt;
        }
        public async static Task<DataTable> GetLSDashboard(LSDBAL obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@Action", obj.Action),
                new SqlParameter("@loginType",obj.loginType),
                new SqlParameter("@RegionId",obj.RegionId),
                new SqlParameter("@DocumentStatus",obj.DocStatus),
                new SqlParameter("@LicenceStatus",obj.LicenceStatus),
                new SqlParameter("@ExpiryStatus",obj.ExpiryStatus),
                new SqlParameter("@LicenceType",obj.LicenceType),
                new SqlParameter("@Client",obj.Client),
                new SqlParameter("@InvoiceStatus",obj.InvoiceStatus),
                new SqlParameter("@PaymentStatus",obj.PaymentStatus),
                new SqlParameter("@StoreId",obj.Store),
                new SqlParameter("@State",obj.State),
                new SqlParameter("@Address",obj.Address),
                new SqlParameter("@LicenceId",obj.License),
                 new SqlParameter("@LicenceApplicable",obj.LicenceApplicable),
                new SqlParameter("@PartyId",obj.UserId)
            };
            DataTable dt = await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("[RTL].[USP_LSDashboard]", CommandType.StoredProcedure, param.ToArray()));
            return dt;
        }

        public async static Task<DataTable> GetLDashboard(LSDBAL obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@Action", obj.Action),
                new SqlParameter("@loginType",obj.loginType),
                new SqlParameter("@RegionId",obj.RegionId),
                new SqlParameter("@DocumentStatus",obj.DocStatus),
                new SqlParameter("@LicenceStatus",obj.LicenceStatus),
                new SqlParameter("@ExpiryStatus",obj.ExpiryStatus),
                new SqlParameter("@LicenceType",obj.LicenceType),
                new SqlParameter("@Client",obj.Client),
                new SqlParameter("@InvoiceStatus",obj.InvoiceStatus),
                new SqlParameter("@PaymentStatus",obj.PaymentStatus),
                new SqlParameter("@StoreId",obj.Store),
                new SqlParameter("@State",obj.State),
                new SqlParameter("@Address",obj.Address),
                new SqlParameter("@LicenceId",obj.License),

                 new SqlParameter("@PageNumber",obj.PageNumber),
                  new SqlParameter("@PageSize",obj.PageSize),

                
                 new SqlParameter("@LicenceApplicable",obj.LicenceApplicable),
                new SqlParameter("@PartyId",obj.UserId)
            };
            DataTable dt = await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("[RTL].[USP_LicenseCommonCompliance]", CommandType.StoredProcedure, param.ToArray()));
            return dt;
        }
        public async static Task<string> IUDClientActMapping(MenuPermission obj)
        {
            StringBuilder menulist = new StringBuilder();
            string seprator = ",";
            string bigseprator = "";
            if (obj.MenuList != null)
            {
                if (obj.MenuList.Count > 0) if (obj.MenuList != null)
                    {
                        for (int i = 0; i < obj.MenuList.Count; i++)
                        {
                            menulist.Append(bigseprator);
                            menulist.Append(obj.MenuList[i].MenuId);

                            menulist.Append(seprator);

                            bigseprator = "|";
                        }
                        bigseprator = "";
                    }
            }
            var param = new List<SqlParameter>
            {

                new SqlParameter("@DocumentList", menulist.ToString()),
                new SqlParameter("@Createdby", obj.CreatedBy),
                new SqlParameter("@ClientId", obj.ClientId),

                new SqlParameter("@Action",obj.Action),
                new SqlParameter("@Result","")
            };

            return await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteNonQueryReturnScalar("[USP_ClientActMapping]", CommandType.StoredProcedure, param.ToArray()));
        }

        public async static Task<DataTable> SearchClientActMapping(MenuPermission obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@Action", obj.Action),
                 new SqlParameter("@ClientId", obj.ClientId),
                   new SqlParameter("@VendorId", obj.VendorId),
            };
            return await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("[USP_ClientActMapping]", CommandType.StoredProcedure, param.ToArray()));

        }



        public static Task<string> InsertClientOnboarding(DocumentBAL obj)
        {
            var param = new List<SqlParameter>
            {
                    new SqlParameter("@Id",obj.Id),
                    new SqlParameter("@Boardingtype", obj.Boardingtype),
                    new SqlParameter("@Action", obj.Action),
                    new SqlParameter("@DocumentName",obj.DocumentName),
                    new SqlParameter("@Frequency",obj.Frequency),
                    new SqlParameter("@Month",obj.Month),
                    new SqlParameter("@Year",obj.Year),
                    new SqlParameter("@State",obj.State),
                    new SqlParameter("@Description",obj.Description),
                    new SqlParameter("@DueDate",obj.DueDate),
                    new SqlParameter("@Remark",obj.Remark),
                    new SqlParameter("@UploadFile",obj.UploadFile),
                     new SqlParameter("@excelFile",obj.excelFile),
                    new SqlParameter("@Createdby",obj.Createdby),
                    new SqlParameter("@Result",""),
            };
            return Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteNonQueryReturnScalar("[RTL].[USP_ClientBoarding]", CommandType.StoredProcedure, param.ToArray()));
        }
        public async static Task<DataTable> SearchClientOnboarding(DocumentBAL obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@Action", obj.Action)
            };
            return await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("[RTL].[USP_ClientBoarding]", CommandType.StoredProcedure, param.ToArray()));

        }
        public async static Task<string> INUBoardingMapping(RetailBAL obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@Action", obj.Action),
                new SqlParameter("@Id", obj.Id),
                new SqlParameter("@UserId", obj.UserId),
                new SqlParameter("@PartyId", obj.ClientId),
                new SqlParameter("@Boardingtype", obj.Boardingtype),
                new SqlParameter("@Result",""),

             };
            return await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteNonQueryReturnScalar("[RTL].[USP_BoardingMapping]", CommandType.StoredProcedure, param.ToArray()));

        }
        public async static Task<DataTable> SearchBoardingMapping(RetailBAL obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@Action", obj.Action),
            };
            DataTable dt = await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("[RTL].[USP_BoardingMapping]", CommandType.StoredProcedure, param.ToArray()));
            return dt;
        }
        public async static Task<string> IUDStatutoryInternal(RetailBAL obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@Action", obj.Action),
                new SqlParameter("@Id", obj.Id),
                new SqlParameter("@UserId", obj.UserId),
                new SqlParameter("@PartyId", obj.ClientId),
                new SqlParameter("@Boardingtype", obj.Boardingtype),
                new SqlParameter("@Result",""),

             };
            return await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteNonQueryReturnScalar("[RTL].[USP_StatutoryInternal]", CommandType.StoredProcedure, param.ToArray()));

        }
        public async static Task<string> IUDSecretarialStatutoryInternal(RetailBAL obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@Action", obj.Action),
                new SqlParameter("@Id", obj.Id),
                new SqlParameter("@UserId", obj.UserId),
                new SqlParameter("@PartyId", obj.ClientId),
                new SqlParameter("@Boardingtype", obj.Boardingtype),
                new SqlParameter("@Result",""),

             };
            return await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteNonQueryReturnScalar("[RTL].[USP_SecretarialStatutoryInternal]", CommandType.StoredProcedure, param.ToArray()));

        }
        
        public async static Task<DataTable> SearchStatutoryInternal(RetailBAL obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@Action", obj.Action),
            };
            DataTable dt = await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("[RTL].[USP_StatutoryInternal]", CommandType.StoredProcedure, param.ToArray()));
            return dt;
        }
        public async static Task<DataTable> SearchSecretarialStatutoryInternal(RetailBAL obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@Action", obj.Action),
            };
            DataTable dt = await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("[RTL].[USP_SecretarialStatutoryInternal]", CommandType.StoredProcedure, param.ToArray()));
            return dt;
        }
        public async static Task<DataTable> SearchStatutory(RetailBAL obj)
        {
            var param = new List<SqlParameter>
            {
                    new SqlParameter("@Action", obj.Action),
                    new SqlParameter("@Year", obj.Year),
                    new SqlParameter("@Month", obj.Month),
                    new SqlParameter("@State", obj.State),
                    new SqlParameter("@Id", obj.Id),
            };
            DataTable dt = await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("[RTL].[USP_Statutory]", CommandType.StoredProcedure, param.ToArray()));
            return dt;
        }
        public async static Task<DataTable> SearchSecretarialStatutory(RetailBAL obj)
        {
            var param = new List<SqlParameter>
            {
                    new SqlParameter("@Action", obj.Action),
                    new SqlParameter("@Year", obj.Year),
                    new SqlParameter("@Month", obj.Month),
                    new SqlParameter("@State", obj.State),
                    new SqlParameter("@Id", obj.Id),
                       new SqlParameter("@PageNo", obj.PageNo),
                          new SqlParameter("@PageSz", obj.PageSz),
            };
            DataTable dt = await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("[RTL].[USP_SecretarialStatutory]", CommandType.StoredProcedure, param.ToArray()));
            return dt;
        }

        public async static Task<DataTable> SearchFinacialStatutory(RetailBAL obj)
        {
            var param = new List<SqlParameter>
            {
                    new SqlParameter("@Action", obj.Action),
                    new SqlParameter("@Year", obj.Year),
                    new SqlParameter("@Month", obj.Month),
                    new SqlParameter("@State", obj.State),
                    new SqlParameter("@Id", obj.Id),
            };
            DataTable dt = await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("[RTL].[USP_FinancialStatutory]", CommandType.StoredProcedure, param.ToArray()));
            return dt;
        }
        public async static Task<string> IUDStatutory(RetailBAL obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@Action", obj.Action),
                new SqlParameter("@UserId", obj.UserId),
                new SqlParameter("@ASD", obj.ASD),
                new SqlParameter("@CSD", obj.CSD),
                new SqlParameter("@RegNo", obj.RegNo),
                new SqlParameter("@UploadFile", obj.UploadFile),
                new SqlParameter("@Createdby", obj.Createdby),
                new SqlParameter("@CACId", obj.CACId),
                      new SqlParameter("@CSIID", obj.CSIID),
                  new SqlParameter("@Status", obj.Status),
                    new SqlParameter("@VRemark", obj.VRemark),
                      new SqlParameter("@CRemark", obj.CRemark),
                        new SqlParameter("@IsVerified", obj.IsVerified),

                new SqlParameter("@Id", obj.Id),
                new SqlParameter("@Result",""),

             };
            return await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteNonQueryReturnScalar("[RTL].[usp_ClientStatutoryInternal]", CommandType.StoredProcedure, param.ToArray()));

        }
        public async static Task<DataTable> CategoryStatutory(RetailBAL obj)
        {
            var param = new List<SqlParameter>
            {
                    new SqlParameter("@Action", obj.Action),
                    new SqlParameter("@Year", obj.Year),
                    new SqlParameter("@Month", obj.Month),
                    new SqlParameter("@State", obj.State),
                    new SqlParameter("@Id", obj.Id),
            };
            DataTable dt = await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("[RTL].[usp_ClientStatutoryInternal]", CommandType.StoredProcedure, param.ToArray()));
            return dt;
        }

        public async static Task<string> IUDSecretarialStatutory(RetailBAL obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@Action", obj.Action),
                new SqlParameter("@UserId", obj.UserId),
                new SqlParameter("@ASD", obj.ASD),
                new SqlParameter("@CSD", obj.CSD),
                new SqlParameter("@RegNo", obj.RegNo),
                new SqlParameter("@UploadFile", obj.UploadFile),
                new SqlParameter("@Createdby", obj.Createdby),
                new SqlParameter("@CACId", obj.CACId),
                  new SqlParameter("@CSIID", obj.CSIID),
                
                  new SqlParameter("@Status", obj.Status),
                    new SqlParameter("@VRemark", obj.VRemark),
                      new SqlParameter("@CRemark", obj.CRemark),
                        new SqlParameter("@IsVerified", obj.IsVerified),

                new SqlParameter("@Id", obj.Id),
                new SqlParameter("@Result",""),

             };
            return await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteNonQueryReturnScalar("[RTL].[usp_ClientSecretarialStatutoryInternal]", CommandType.StoredProcedure, param.ToArray()));

        }

        public async static Task<string> IUDClientOnBoardingDash(RetailBAL obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@Action", obj.Action),
                new SqlParameter("@UserId", obj.UserId),
                new SqlParameter("@UploadFile", obj.UploadFile),
                new SqlParameter("@Createdby", obj.Createdby),
                new SqlParameter("@CACId", obj.CACId),
                new SqlParameter("@Id", obj.Id),
                new SqlParameter("@Result",""),

             };
            return await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteNonQueryReturnScalar("[RTL].[usp_ClientBoardingDashboard]", CommandType.StoredProcedure, param.ToArray()));

        }

        public async static Task<DataTable> SearchClientDashboard(RetailBAL obj)
        {
            var param = new List<SqlParameter>
            {
                      new SqlParameter("@currentYear", obj.currentYear),
                   new SqlParameter("@currentMonth", obj.currentMonth),
                new SqlParameter("@Action", obj.Action),
                new SqlParameter("@UserId", obj.UserId),
                new SqlParameter("@Industry", obj.Industry),
                new SqlParameter("@Year", obj.Year),
                new SqlParameter("@Month", obj.Month),
                new SqlParameter("@State", obj.State),
                new SqlParameter("@DueDate", obj.DueDate),
                new SqlParameter("@ActId", obj.ActId),
                new SqlParameter("@Compliance", obj.Compliance),
                new SqlParameter("@Category", obj.Category),
                new SqlParameter("@SubCategory", obj.SubCategory),
                    new SqlParameter("@Status", obj.Status),
                new SqlParameter("@Id", obj.Id), 
        };
            return await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("[RTL].[USP_ComplianceDashboard]", CommandType.StoredProcedure, param.ToArray()));
        }





        public async static Task<DataSet> SearchActMaster(RetailBAL obj)
        {
            var param = new List<SqlParameter>
            {
              new SqlParameter("@Id", obj.Id),
              new SqlParameter("@Action",obj.Action)
            };
            DataSet dt = await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommandds("SaveRetailData", CommandType.StoredProcedure, param.ToArray()));
            return dt;
        }
       

        public async static Task<string> IUDActMaster(RetailBAL obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@Id",obj.Id),
                new SqlParameter("@Action", obj.Action),
                new SqlParameter("@StateIds",obj.State),
                new SqlParameter("@Act",obj.Act),
                new SqlParameter("@IndustryIds",obj.IndustryList) ,
                  new SqlParameter("@selectedCategory",obj.selectedCategory),
                    new SqlParameter("@selectedSubcategory",obj.selectedSubcategory),

                new SqlParameter("@Result",""),
            };
            return await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteNonQueryReturnScalar("SaveRetailData", CommandType.StoredProcedure, param.ToArray()));
        }

        public static Task<string> InsertOverView(RetailBAL obj)
        {
            var param = new List<SqlParameter>
            {
                    new SqlParameter("@ActId",obj.Id),
                    new SqlParameter("@StateId", obj.State),
                    new SqlParameter("@Action", obj.Action),
                    new SqlParameter("@ActFile",obj.ActFile),
                       new SqlParameter("@ActOverview",obj.ActOverview),
                    new SqlParameter("@RuleFile",obj.RuleFile),
                    new SqlParameter("@Createdby",obj.Createdby),
                    new SqlParameter("@Result",""),
            };
            return Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteNonQueryReturnScalar("SaveRetailData", CommandType.StoredProcedure, param.ToArray()));
        }


        public async static Task<DataSet> SearchLitigationMasterBYCaseCode(RetailBAL obj)
        {
            var param = new List<SqlParameter>
            {
              new SqlParameter("@Id", obj.Id),
              new SqlParameter("@Action",obj.Action),
              new SqlParameter("@CaseCode", obj.CaseCode),
            };
            DataSet dt = await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommandds("[RTL].[Usp_ManageLegalCaseData]", CommandType.StoredProcedure, param.ToArray()));
            return dt;
        }
        public async static Task<DataSet> SearchLitigationManagement(RetailBAL obj)
        {
            var param = new List<SqlParameter>
            {
              new SqlParameter("@Id", obj.Id),
              new SqlParameter("@Action",obj.Action),
              new SqlParameter("@CaseCode", obj.CaseCode),
              new SqlParameter("@State", obj.State),
            };
            DataSet dt = await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommandds("[RTL].[Usp_ManageLegalDashboard]", CommandType.StoredProcedure, param.ToArray()));
            return dt;
        }
        public async static Task<DataSet> SearchLitigationMaster(RetailBAL obj)
        {
            var param = new List<SqlParameter>
            {
              new SqlParameter("@Id", obj.Id),
              new SqlParameter("@Action",obj.Action),
              new SqlParameter("@CaseCode", obj.CaseCode),
              new SqlParameter("@State", obj.State),
            };
            DataSet dt = await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommandds("[RTL].[Usp_ManageLegalDashboard]", CommandType.StoredProcedure, param.ToArray()));
            return dt;
        }
        


        public static object IUDLitigationMaster3(List<HearingModel> hearings)
            {
            object lastResult = null;

            foreach (var obj in hearings)
            {
            var param = new List<SqlParameter>
            {
            new SqlParameter("@Action", obj.Action),
            new SqlParameter("@CaseID", obj.CaseId),
             new SqlParameter("@CreatedBy", obj.CreatedBy), 
            new SqlParameter("@CaseCode", obj.CaseCode),
            new SqlParameter("@DateOfHearing", obj.DateOfHearing),
            new SqlParameter("@PurposeOfHearing", obj.PurposeOfHearing),
            new SqlParameter("@OutcomeOfHearing", obj.OutcomeOfHearing),
            new SqlParameter("@CaseStatus", obj.CaseStatus),
            new SqlParameter("@DateOfUpload", obj.DateOfUpload),
            new SqlParameter("@HearingFileName", obj.HearingFileName ?? ""),
            new SqlParameter("@HearingFilePath", obj.HearingFilePath ?? ""),
                new SqlParameter("@Result",""),
            }; 
            lastResult = SqlDBHelper.SqlHelper.ExecuteNonQueryReturnScalar(
            "RTL.Usp_ManageLegalCaseData",
            CommandType.StoredProcedure,
            param.ToArray()
            );
            }

            return lastResult; // Optionally return all results as list if needed
            }



        public async static Task<string> IUDLitigationMaster(RetailBAL obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@Action", obj.Action), 
                new SqlParameter("@CaseID",obj.CaseID),
                new SqlParameter("@CaseCode",obj.CaseCode),
                new SqlParameter("@CaseTitle",obj.CaseTitle),
                new SqlParameter("@CaseType",obj.CaseType),
                new SqlParameter("@ForumCourtName",obj.ForumCourtName),
                new SqlParameter("@CaseNumber",obj.CaseNumber),
                new SqlParameter("@FilingDate",obj.FilingDate),
                new SqlParameter("@OppositionParty",obj.OppositionParty),
                new SqlParameter("@AdvocateOrLegalCounsel",obj.AdvocateOrLegalCounsel),
                new SqlParameter("@ExternalFirm",obj.ExternalFirm),
                new SqlParameter("@ExternalFirmName",obj.ExternalFirmName),
                new SqlParameter("@SeniorRepName",obj.SeniorRepName),
                new SqlParameter("@SeniorRepMobile",obj.SeniorRepMobile),
                new SqlParameter("@SeniorRepEmail",obj.SeniorRepEmail),
                new SqlParameter("@JuniorRepName",obj.JuniorRepName),
                new SqlParameter("@JuniorRepMobile",obj.JuniorRepMobile),
                new SqlParameter("@JuniorRepEmail",obj.JuniorRepEmail),
                new SqlParameter("@ExternalCounselInitialOpinion",obj.ExternalCounselInitialOpinion),

                new SqlParameter("@Interest",obj.Interest),
                new SqlParameter("@LateFee",obj.LateFee),
                new SqlParameter("@Fines",obj.Fines),
                new SqlParameter("@Penalities",obj.Penalities),
                new SqlParameter("@Other",obj.Other),
                new SqlParameter("@Probability",obj.Probability),

                

                new SqlParameter("@RepName",obj.RepName),
                new SqlParameter("@RepMobile",obj.RepMobile),
                new SqlParameter("@RepEmail",obj.RepEmail),
                new SqlParameter("@InHouseCounselInitialOpinion",obj.InHouseCounselInitialOpinion),
                new SqlParameter("@State",obj.State),
                new SqlParameter("@FileUploadPath",obj.FileUploadPath),
                new SqlParameter("@FileUploadDate",obj.FileUploadDate),
                new SqlParameter("@Createby",obj.Createdby),
                new SqlParameter("@CreatedOn",obj.CreatedOn),
                new SqlParameter("@AppealStatus",obj.AppealStatus),
                new SqlParameter("@Appealby",obj.Appealby),
                  new SqlParameter("@ACaseStatus",obj.ACaseStatus),
                new SqlParameter("@Note",obj.Note),
                new SqlParameter("@PleadingsType",obj.PleadingsType),
                new SqlParameter("@DateOfFilling",obj.DateOfFilling),
                 new SqlParameter("@DateOfUpload",obj.DateOfUpload), 
                new SqlParameter("@File1",obj.File1),
                new SqlParameter("@File2",obj.File2),
                new SqlParameter("@File3",obj.File3),
                    new SqlParameter("@Result",""),

            };
            return await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteNonQueryReturnScalar("RTL.Usp_ManageLegalCaseData", CommandType.StoredProcedure, param.ToArray()));
        }


        public async static Task<string> IUDLitigationMaster4(RetailBAL obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@Action", obj.Action),
                new SqlParameter("@CaseID",obj.CaseID),
                new SqlParameter("@CaseCode",obj.CaseCode),
                new SqlParameter("@JudgmentPassed",obj.JudgmentPassed),
                new SqlParameter("@JudgmentTime",obj.JudgmentTime),
                new SqlParameter("@JudiciaryName",obj.JudiciaryName),
                new SqlParameter("@JudgmentCopyPath",obj.JudgmentCopyPath),
                new SqlParameter("@SummaryOfJudgment",obj.SummaryOfJudgment),
                new SqlParameter("@ExecutionStatus",obj.ExecutionStatus),
                new SqlParameter("@CondonationFiled",obj.CondonationFiled),
                new SqlParameter("@CondonationStatus",obj.CondonationStatus),
                new SqlParameter("@Appealby",obj.Appealby),
                new SqlParameter("@AppealStatus",obj.AppealStatus),
                new SqlParameter("@Result",""),

            };
            return await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteNonQueryReturnScalar("RTL.Usp_ManageLegalCaseData", CommandType.StoredProcedure, param.ToArray()));
        }

        public async static Task<string> IUDLitigationMaster5(RetailBAL obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@Action", obj.Action), 
                new SqlParameter("@CaseCode",obj.CaseCode), 
                new SqlParameter("@Appealby",obj.Appealby),
                new SqlParameter("@AppealStatus",obj.AppealStatus),
              

                
                new SqlParameter("@Result",""),

            };
            return await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteNonQueryReturnScalar("RTL.Usp_ManageLegalCaseData", CommandType.StoredProcedure, param.ToArray()));
        }

        public DataTable GetStatutory(MappingBAL obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@Action", obj.Action),
            };
            return SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("USP_Mapping", CommandType.StoredProcedure, param.ToArray());

        }
        public async Task<string> IUDStatutorySetup(MappingBAL obj)
        {
            StringBuilder Map1ListSet = new StringBuilder();
            string seprator = ",";
            string bigseprator = "";

            for (int i = 0; i < obj.Map1ListSet.Count; i++)
            {
                var item = obj.Map1ListSet[i];
                Map1ListSet.Append(bigseprator);
                Map1ListSet.Append(item.Srno).Append(seprator);
                Map1ListSet.Append(item.Id).Append(seprator);
                Map1ListSet.Append(item.State).Append(seprator);
                Map1ListSet.Append(item.StoreId).Append(seprator);
                Map1ListSet.Append(item.Act).Append(seprator);
                Map1ListSet.Append(item.ComplianceName).Append(seprator); 
                Map1ListSet.Append(item.RegistrationNumber).Append(seprator);
                Map1ListSet.Append(item.ValidFrom).Append(seprator);
                Map1ListSet.Append(item.ValidTo).Append(seprator);
                Map1ListSet.Append(item.TypeCode).Append(seprator);
                Map1ListSet.Append(item.RegistrationType).Append(seprator); 
                Map1ListSet.Append(item.Upload); 
                bigseprator = "|";
            } 
            var param = new List<SqlParameter>
           {
                    new SqlParameter("@MapListSet", Map1ListSet.ToString()),
                    new SqlParameter("@Createdby", obj.Createdby),
                    new SqlParameter("@Action", obj.Action),
                    new SqlParameter("@RESULT", "") { Direction = ParameterDirection.Output }
             };

            return await Task.Factory.StartNew(() =>
                SqlDBHelper.SqlHelper.ExecuteNonQueryReturnScalar("[USP_StatutorySetup]", CommandType.StoredProcedure, param.ToArray())
            );
        }

        public DataTable SearchStatutorySetup(MappingBAL obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@Action", obj.Action),
                 new SqlParameter("@Id", obj.Id),
                    new SqlParameter("@state", obj.Createdby)  
            };
            return SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("[USP_StatutorySetup]", CommandType.StoredProcedure, param.ToArray());

        }

        public async Task<string> IUDSecretarialStatutorySetup(MappingBAL obj)
        {
            StringBuilder Map1ListSet = new StringBuilder();
            string seprator = ",";
            string bigseprator = "";

            for (int i = 0; i < obj.Map1ListSet.Count; i++)
            {
                var item = obj.Map1ListSet[i];
                Map1ListSet.Append(bigseprator);
                Map1ListSet.Append(item.Srno).Append(seprator);
                Map1ListSet.Append(item.Id).Append(seprator);
                Map1ListSet.Append(item.State).Append(seprator);
                Map1ListSet.Append(item.Act).Append(seprator);
                Map1ListSet.Append(item.ComplianceName).Append(seprator);
                Map1ListSet.Append(item.RegistrationNumber).Append(seprator);
                Map1ListSet.Append(item.ValidFrom).Append(seprator);
                Map1ListSet.Append(item.ValidTo).Append(seprator);
                Map1ListSet.Append(item.TypeCode).Append(seprator);
                Map1ListSet.Append(item.RegistrationType).Append(seprator);
                Map1ListSet.Append(item.Upload);
                bigseprator = "|";
            }
            var param = new List<SqlParameter>
           {
                    new SqlParameter("@MapListSet", Map1ListSet.ToString()),
                    new SqlParameter("@Createdby", obj.Createdby),
                    new SqlParameter("@Action", obj.Action),
                    new SqlParameter("@RESULT", "") { Direction = ParameterDirection.Output }
             };

            return await Task.Factory.StartNew(() =>
                SqlDBHelper.SqlHelper.ExecuteNonQueryReturnScalar("[USP_StatutorySecretarialSetup]", CommandType.StoredProcedure, param.ToArray())
            );
        }

        public DataTable SearchSecretarialStatutorySetup(MappingBAL obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@Action", obj.Action),
                 new SqlParameter("@Id", obj.Id),
                    new SqlParameter("@state", obj.Createdby)
            };
            return SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("[USP_StatutorySecretarialSetup]", CommandType.StoredProcedure, param.ToArray());

        }
        public async static Task<DataTable> SearchFinancialStatutory(RetailBAL obj)
        {
            var param = new List<SqlParameter>
            {
                    new SqlParameter("@Action", obj.Action),
                    new SqlParameter("@Year", obj.Year),
                    new SqlParameter("@Month", obj.Month),
                    new SqlParameter("@State", obj.State),
                    new SqlParameter("@Id", obj.Id),
            };
            DataTable dt = await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("[RTL].[USP_FinancialStatutory]", CommandType.StoredProcedure, param.ToArray()));
            return dt;
        }
        public async static Task<DataTable> SearchFinancialCreateActCalender(RetailBAL obj)
        {
            var param = new List<SqlParameter>
            {
                    new SqlParameter("@Action", obj.Action),
                    new SqlParameter("@Year", obj.Year),
                    new SqlParameter("@Month", obj.Month),
                    new SqlParameter("@State", obj.State),
                    new SqlParameter("@Id", obj.Id),
            };
            DataTable dt = await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("[RTL].[USP_FinacialCreateActCalender]", CommandType.StoredProcedure, param.ToArray()));
            return dt;
        }
        public async static Task<string> IUDFinancialStatutory(RetailBAL obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@Action", obj.Action),
                new SqlParameter("@UserId", obj.UserId),
                new SqlParameter("@ASD", obj.ASD),
                new SqlParameter("@CSD", obj.CSD),
                new SqlParameter("@RegNo", obj.RegNo),
                new SqlParameter("@UploadFile", obj.UploadFile),
                new SqlParameter("@Createdby", obj.Createdby),
                new SqlParameter("@CACId", obj.CACId),

                  new SqlParameter("@Status", obj.Status),
                    new SqlParameter("@VRemark", obj.VRemark),
                      new SqlParameter("@CRemark", obj.CRemark),
                        new SqlParameter("@IsVerified", obj.IsVerified),

                new SqlParameter("@Id", obj.Id),
                new SqlParameter("@Result",""),

             };
            return await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteNonQueryReturnScalar("[RTL].[usp_ClientFinancialStatutoryInternal]", CommandType.StoredProcedure, param.ToArray()));

        }



        public async Task<string> IUDFinancialStatutorySetup(MappingBAL obj)
        {
            StringBuilder Map1ListSet = new StringBuilder();
            string seprator = ",";
            string bigseprator = "";

            for (int i = 0; i < obj.Map1ListSet.Count; i++)
            {
                var item = obj.Map1ListSet[i];
                Map1ListSet.Append(bigseprator);
                Map1ListSet.Append(item.Srno).Append(seprator);
                Map1ListSet.Append(item.Id).Append(seprator);
                Map1ListSet.Append(item.State).Append(seprator);
                Map1ListSet.Append(item.Act).Append(seprator);
                Map1ListSet.Append(item.ComplianceName).Append(seprator);
                Map1ListSet.Append(item.RegistrationNumber).Append(seprator);
                Map1ListSet.Append(item.ValidFrom).Append(seprator);
                Map1ListSet.Append(item.ValidTo).Append(seprator);
                Map1ListSet.Append(item.TypeCode).Append(seprator);
                Map1ListSet.Append(item.RegistrationType).Append(seprator);
                Map1ListSet.Append(item.Upload);
                bigseprator = "|";
            }
            var param = new List<SqlParameter>
           {
                    new SqlParameter("@MapListSet", Map1ListSet.ToString()),
                    new SqlParameter("@Createdby", obj.Createdby),
                    new SqlParameter("@Action", obj.Action),
                    new SqlParameter("@RESULT", "") { Direction = ParameterDirection.Output }
             };

            return await Task.Factory.StartNew(() =>
                SqlDBHelper.SqlHelper.ExecuteNonQueryReturnScalar("[USP_FinancialSetup]", CommandType.StoredProcedure, param.ToArray())
            );
        }

        public DataTable SearchFinancialStatutorySetup(MappingBAL obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@Action", obj.Action),
                 new SqlParameter("@Id", obj.Id),
                    new SqlParameter("@state", obj.Createdby)
            };
            return SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("[USP_FinancialSetup]", CommandType.StoredProcedure, param.ToArray());

        }
        public DataTable SearchEntify(EnitfyBAL obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@Action", obj.Action),
                 new SqlParameter("@UserId", obj.UserId)
            };
            return SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("[RTL].[usp_Entify]", CommandType.StoredProcedure, param.ToArray());

        }
        
        public async static Task<string> IUDEntify(EnitfyBAL obj)
        {
            var param = new List<SqlParameter>
       {
        new SqlParameter("@Action", obj.Action),
        new SqlParameter("@UserId", obj.UserId ?? (object)DBNull.Value), 
        new SqlParameter("@EntityType", obj.EntityType ?? (object)DBNull.Value),
        new SqlParameter("@ListedCompany", obj.ListedCompany ?? (object)DBNull.Value),
        new SqlParameter("@ListedStatus", obj.ListedStatus ?? (object)DBNull.Value),
        new SqlParameter("@StockExchange", obj.StockExchange ?? (object)DBNull.Value),
        new SqlParameter("@FundingStatus", obj.FundingStatus ?? (object)DBNull.Value),
        new SqlParameter("@FundingType", obj.FundingType ?? (object)DBNull.Value),
        new SqlParameter("@Turnover", obj.Turnover),
        new SqlParameter("@NetProfit", obj.NetProfit),
        new SqlParameter("@Borrowing", obj.Borrowing),
        new SqlParameter("@AuthorizedShareCap", obj.AuthorizedShareCap),
        new SqlParameter("@IssuedShareCap", obj.IssuedShareCap),
        new SqlParameter("@PaidupCap", obj.PaidupCap),
        new SqlParameter("@AverageNetProfit", obj.AverageNetProfit),
        new SqlParameter("@HoldingSubsidiary", obj.HoldingSubsidiary ?? (object)DBNull.Value),
        new SqlParameter("@NBFCRegisterd", obj.NBFCRegisterd ?? (object)DBNull.Value),
        new SqlParameter("@RBIRegistered", obj.RBIRegistered ?? (object)DBNull.Value),
        new SqlParameter("@Startup", obj.Startup ?? (object)DBNull.Value),
        new SqlParameter("@MSMERegistered", obj.MSMERegistered ?? (object)DBNull.Value),
        new SqlParameter("@RegisteredunderGST", obj.RegisteredunderGST ?? (object)DBNull.Value), 
        new SqlParameter("@CIN", obj.CIN ?? (object)DBNull.Value),
        new SqlParameter("@PAN", obj.PAN ?? (object)DBNull.Value),
        new SqlParameter("@TAN", obj.TAN ?? (object)DBNull.Value),
        new SqlParameter("@IncorporationDate", obj.IncorporationDate ?? (object)DBNull.Value),
        new SqlParameter("@RegisteredState", obj.RegisteredState ?? (object)DBNull.Value),
        new SqlParameter("@NICCode", obj.NICCode ?? (object)DBNull.Value),
        new SqlParameter("@FinancialYearEnd", obj.FinancialYearEnd ?? (object)DBNull.Value), 
        new SqlParameter("@ResidentDirector", obj.ResidentDirector ?? (object)DBNull.Value),
        new SqlParameter("@IndependentDirectors", obj.IndependentDirectors),
        new SqlParameter("@WomenDirector", obj.WomenDirector ?? (object)DBNull.Value),
        new SqlParameter("@CSAppointed", obj.CSAppointed ?? (object)DBNull.Value),
        new SqlParameter("@KMPAppointed", obj.KMPAppointed ?? (object)DBNull.Value), 
        new SqlParameter("@Result", "") { Direction = ParameterDirection.Output }
    };

            return await Task.Factory.StartNew(() =>
                SqlDBHelper.SqlHelper.ExecuteNonQueryReturnScalar("[RTL].[usp_Entify]", CommandType.StoredProcedure, param.ToArray())
            );
        }

        public async static Task<string> IUDFactoryStatutory(RetailBAL obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@Action", obj.Action),
                new SqlParameter("@UserId", obj.UserId),
                new SqlParameter("@ASD", obj.ASD),
                new SqlParameter("@CSD", obj.CSD),
                new SqlParameter("@RegNo", obj.RegNo),
                new SqlParameter("@UploadFile", obj.UploadFile),
                new SqlParameter("@Createdby", obj.Createdby),
                new SqlParameter("@CACId", obj.CACId),

                  new SqlParameter("@Status", obj.Status),
                    new SqlParameter("@VRemark", obj.VRemark),
                      new SqlParameter("@CRemark", obj.CRemark),
                        new SqlParameter("@IsVerified", obj.IsVerified),

                new SqlParameter("@Id", obj.Id),
                new SqlParameter("@Result",""),

             };
            return await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteNonQueryReturnScalar("[RTL].[usp_ClientFactoryStatutoryInternal]", CommandType.StoredProcedure, param.ToArray()));

        }
        public async static Task<DataTable> SearchFactStatutory(RetailBAL obj)
        {
            var param = new List<SqlParameter>
            {
                    new SqlParameter("@Action", obj.Action),
                    new SqlParameter("@Year", obj.Year),
                    new SqlParameter("@Month", obj.Month),
                    new SqlParameter("@State", obj.State),
                    new SqlParameter("@Id", obj.Id),
            };
            DataTable dt = await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("[RTL].[USP_FactoryStatutory]", CommandType.StoredProcedure, param.ToArray()));
            return dt;
        }
        public async static Task<DataTable> SearchLc(RetailBAL obj)
        {
            var param = new List<SqlParameter>
            {
                    new SqlParameter("@Action", obj.Action),
                    new SqlParameter("@Year", obj.Year),
                    new SqlParameter("@Month", obj.Month),
                    new SqlParameter("@State", obj.State),
                    new SqlParameter("@Id", obj.Id),
            };
            DataTable dt = await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("[RTL].[USP_LabourCode]", CommandType.StoredProcedure, param.ToArray()));
            return dt;
        }
   


        public static DataTable ConvertToDataTable<T>(List<T> data)
        {
            DataTable table = new DataTable(typeof(T).Name);
            PropertyInfo[] props = typeof(T).GetProperties(BindingFlags.Public | BindingFlags.Instance);

            foreach (PropertyInfo prop in props)
            {
                Type propType = prop.PropertyType;

                // Handle Nullable types
                if (propType.IsGenericType && propType.GetGenericTypeDefinition() == typeof(Nullable<>))
                    propType = Nullable.GetUnderlyingType(propType);

                table.Columns.Add(prop.Name, propType ?? typeof(object));
            }

            foreach (T item in data)
            {
                var values = new object[props.Length];
                for (int i = 0; i < props.Length; i++)
                {
                    values[i] = props[i].GetValue(item, null) ?? DBNull.Value;
                }
                table.Rows.Add(values);
            }

            return table;
        }

        public string SaveExcelData(RetailUploadModelBAL obj)
        {
            // ✅ Handle JSON or List input from Angular
            DataTable dt1, dt2;

            try
            {
                // If ExcelData1 comes as JSON string
                if (obj.ExcelData1 is string)
                {
                    var dataList1 = JsonConvert.DeserializeObject<List<EmployeeSalaryExcel>>(obj.ExcelData1.ToString());
                    dt1 = ConvertToDataTable(dataList1);
                }
                else
                {
                    dt1 = ConvertToDataTable(obj.ExcelData1 ?? new List<EmployeeSalaryExcel>());
                }

                // If ExcelData2 comes as JSON string
                if (obj.ExcelData2 is string)
                {
                    var dataList2 = JsonConvert.DeserializeObject<List<UANMasterExcel>>(obj.ExcelData2.ToString());
                    dt2 = ConvertToDataTable(dataList2);
                }
                else
                {
                    dt2 = ConvertToDataTable(obj.ExcelData2 ?? new List<UANMasterExcel>());
                }
            }
            catch (Exception ex)
            {
                throw new Exception("Error converting Excel data to DataTable: " + ex.Message);
            }

            string CONNECTION_STRING = "Server=13.202.27.216;Initial Catalog=EZCMP_R;MultipleActiveResultSets=true;User ID=retail;Password=ezretail@123;Pooling=True;";

            using (SqlConnection con = new SqlConnection(CONNECTION_STRING))
            using (SqlCommand cmd = new SqlCommand("[RTL].[usp_PayRoll]", con))
            {
                cmd.CommandType = CommandType.StoredProcedure;

                cmd.Parameters.AddWithValue("@Action", obj.Action ?? "1");
                cmd.Parameters.AddWithValue("@StoreCode", obj.StoreCode ?? "");
                cmd.Parameters.AddWithValue("@PayRollType", obj.PayRollType ?? "");
                cmd.Parameters.AddWithValue("@Mode", obj.Mode ?? "");
                
                cmd.Parameters.AddWithValue("@Year", obj.Year ?? "");
                cmd.Parameters.AddWithValue("@Month", obj.Month ?? "");
                cmd.Parameters.AddWithValue("@LoginId", obj.LoginId ?? "");

                var tvp1 = cmd.Parameters.Add("@ExcelTable1", SqlDbType.Structured);
                tvp1.TypeName = "RTL.PayRollSalaryExcel";
                tvp1.Value = dt1 ?? new DataTable();

                var tvp2 = cmd.Parameters.Add("@ExcelTable2", SqlDbType.Structured);
                tvp2.TypeName = "RTL.PayRollUANMasterExcel";
                tvp2.Value = dt2 ?? new DataTable();

                con.Open();
                var result = cmd.ExecuteScalar();
                return result?.ToString() ?? "SUCCESS";
            }
        } 
         

        public async static Task<DataSet> GetPAYROLLDetail(RetailUploadModelBAL obj)
        {
            var param = new List<SqlParameter>
            {
           new SqlParameter("@Action", obj.Action),
                    new SqlParameter("@Year", obj.Year),
                    new SqlParameter("@Month", obj.Month),
                    new SqlParameter("@StoreCode", obj.StoreCode),
                    new SqlParameter("@Mode", obj.Mode),
                       new SqlParameter("@PayRollType", obj.PayRollType),
                           new SqlParameter("@LoginId", obj.LoginId),
            };
            DataSet dt = await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommandds("[RTL].[usp_PayRoll]", CommandType.StoredProcedure, param.ToArray()));
            return dt;
        }




        
        public async static Task<string> UpdateerrorList(RetailUploadModelBAL obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@Action", obj.Action),
                  new SqlParameter("@EmpId", obj.EmpId),
                new SqlParameter("@Newvalue",obj.Newvalue), 
                new SqlParameter("@columnname", obj.columnname),
                     new SqlParameter("@Year", obj.Year),
                    new SqlParameter("@Month", obj.Month),
                    new SqlParameter("@StoreCode", obj.StoreCode),
                new SqlParameter("@RESULT",""),
            };
            return await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteNonQueryReturnScalar("[RTL].[usp_PayRoll]", CommandType.StoredProcedure, param.ToArray()));
        }

        public async static Task<string> IUDDiligenceCheckList(RetailUploadModelBAL obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@Action", obj.Action),
                new SqlParameter("@DiligenceName", obj.DiligenceName),
                new SqlParameter("@DiligenceAssigned",obj.DiligenceAssigned),
                new SqlParameter("@Diligencedate", obj.Diligencedate), 
                new SqlParameter("@StoreCode", obj.StoreCode),
                new SqlParameter("@DocumentName", obj.DocumentName),
                 new SqlParameter("@Id", obj.Id), 
                new SqlParameter("@RESULT",""),
            };
            return await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteNonQueryReturnScalar("[RTL].[Usp_Diligence]", CommandType.StoredProcedure, param.ToArray()));
        }


     
        
        public async static Task<DataTable> DiligenceCheckList(RetailUploadModelBAL obj)
        {
            var param = new List<SqlParameter>
            {
                    new SqlParameter("@Action", obj.Action),  
                     new SqlParameter("@StoreCode", obj.StoreCode),
                          new SqlParameter("@Id", obj.Id)
            };
            DataTable dt = await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("[RTL].[Usp_Diligence]", CommandType.StoredProcedure, param.ToArray()));
            return dt;
        }

        public async static Task<DataSet> GetBulkReportlist(RetailLicenseDocuementMaster obj)
        {
            string ActList = obj.NewActList != null ? string.Join(",", obj.NewActList) : "";

            var param = new List<SqlParameter>
                {
                new SqlParameter("@Id", obj.Id),
                new SqlParameter("@Action", obj.Action),
                new SqlParameter("@StoreId", obj.StoreId),
                new SqlParameter("@StateId", obj.StateId),
                new SqlParameter("@ActList", ActList),
                new SqlParameter("@FY", obj.FY),
                new SqlParameter("@CMonth", obj.CMonth),
                new SqlParameter("@ExecuterId", obj.LoginId),
                new SqlParameter("@DocumentId", obj.DocumentId),
                new SqlParameter("@ComplianceCategory", obj.ComplianceCategory)
                }; 
            DataSet dt = await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommandds("RTL.USP_ComplianceBulk", CommandType.StoredProcedure, param.ToArray()));
            return dt; 
        }

        public async static Task<DataSet> bindingDashboard(RetailBAL obj)
        { 
            
            var param = new List<SqlParameter>
                {
                new SqlParameter("@Id", obj.Id),
                new SqlParameter("@Action", obj.Action),
                new SqlParameter("@UserId", obj.UserId),
                new SqlParameter("@PartyId", obj.PartyId) 
                };
            DataSet dt = await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommandds("RTL.USP_RetailDashboard", CommandType.StoredProcedure, param.ToArray()));
            return dt;
        }




        ///  Start Added by shipra ///
        


        public async static Task<DataSet> bindingReport(RetailBAL obj)
        {
            var param = new List<SqlParameter>
                {
                new SqlParameter("@Id", obj.Id),
                new SqlParameter("@Action", obj.Action),
                new SqlParameter("@UserId", obj.UserId),
                new SqlParameter("@PartyId", obj.PartyId),
                  new SqlParameter("@PageName", obj.PageName) 
                };
            DataSet dt = await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommandds("RTL.USP_ReportDashbaord", CommandType.StoredProcedure, param.ToArray()));
            return dt;
        }


       

        /// End Added by shipra ///


        public async static Task<DataSet> bindingcommmonTiles(RetailBAL obj)
        {
            var param = new List<SqlParameter>
                {
                new SqlParameter("@Id", obj.Id),
                new SqlParameter("@Action", obj.Action),
                new SqlParameter("@UserId", obj.UserId),
                new SqlParameter("@PartyId", obj.PartyId),
                new SqlParameter("@PageName", obj.PageName)
                };
            DataSet dt = await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommandds("RTl.USP_CommonDashboard ", CommandType.StoredProcedure, param.ToArray()));
            return dt;
        }



        public async static Task<DataSet> bindcommonreport(RetailBAL obj)
        {
            var param = new List<SqlParameter>
                {
                new SqlParameter("@Id", obj.Id),
                new SqlParameter("@Action", obj.Action),
                new SqlParameter("@UserId", obj.UserId),
                new SqlParameter("@PartyId", obj.PartyId)
                };
            DataSet dt = await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommandds("[RTL].[USP_RetailCommonReport]", CommandType.StoredProcedure, param.ToArray()));
            return dt;
        }


        ////////////////     Start Added by shipra Contractor Compliance /////////////


        public async static Task<DataTable> ContractorGetReportlist(RetailLicenseDocuementMaster obj)
        {

            string ActList = obj.NewActList != null ? string.Join(",", obj.NewActList) : "";

            var param = new List<SqlParameter>
                {
                new SqlParameter("@Id", obj.Id),
                new SqlParameter("@Action", obj.Action),
                new SqlParameter("@StoreId", obj.StoreId),
                new SqlParameter("@StateId", obj.StateId),
                new SqlParameter("@ActList", ActList),
                new SqlParameter("@FY", obj.FY),
                new SqlParameter("@CMonth", obj.CMonth),
                new SqlParameter("@ExecuterId", obj.LoginId),
                   new SqlParameter("@DocumentId", obj.DocumentId),
                new SqlParameter("@ComplianceCategory", obj.ComplianceCategory)
                };
            DataTable dt = await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("RTL.USP_ContractorComplianceBulk", CommandType.StoredProcedure, param.ToArray()));
            return dt;
        }

        public async static Task<DataSet> GetContractorBulkReportlist(RetailLicenseDocuementMaster obj)
        {
            string ActList = obj.NewActList != null ? string.Join(",", obj.NewActList) : "";

            var param = new List<SqlParameter>
                {
                new SqlParameter("@Id", obj.Id),
                new SqlParameter("@Action", obj.Action),
                new SqlParameter("@StoreId", obj.StoreId),
                new SqlParameter("@StateId", obj.StateId),
                new SqlParameter("@ActList", ActList),
                new SqlParameter("@FY", obj.FY),
                new SqlParameter("@CMonth", obj.CMonth),
                new SqlParameter("@ExecuterId", obj.LoginId),
                new SqlParameter("@DocumentId", obj.DocumentId),
                new SqlParameter("@ComplianceCategory", obj.ComplianceCategory)
                };
            DataSet dt = await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommandds("RTL.USP_ContractorComplianceBulk", CommandType.StoredProcedure, param.ToArray()));
            return dt;
        }


        public async static Task<string> IUDLabourCodeStatutory(RetailBAL obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@Action", obj.Action),
                new SqlParameter("@UserId", obj.UserId),
                new SqlParameter("@ASD", obj.ASD),
                new SqlParameter("@CSD", obj.CSD),
                new SqlParameter("@RegNo", obj.RegNo),
                new SqlParameter("@UploadFile", obj.UploadFile),
                new SqlParameter("@Createdby", obj.Createdby),
                new SqlParameter("@CACId", obj.CACId),

                  new SqlParameter("@Status", obj.Status),
                    new SqlParameter("@VRemark", obj.VRemark),
                      new SqlParameter("@CRemark", obj.CRemark),
                        new SqlParameter("@IsVerified", obj.IsVerified),

                new SqlParameter("@Id", obj.Id),
                new SqlParameter("@Result",""),

             };
            return await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteNonQueryReturnScalar("[RTL].[usp_ClientLabourCodeInternal]", CommandType.StoredProcedure, param.ToArray()));

        }



        public async static Task<string> iudMailing(RetailBAL obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@Action", obj.Action),
                new SqlParameter("@TemplateName", obj.TemplateName),
                new SqlParameter("@Subject",obj.Subject),
                new SqlParameter("@Detail", obj.Detail),
                 new SqlParameter("@Id", obj.Id),

                new SqlParameter("@PartyId", obj.PartyId),
                new SqlParameter("@MailFor", obj.MailFor),
                new SqlParameter("@TemplateId", obj.TemplateId),
                new SqlParameter("@To", obj.To),
                new SqlParameter("@CC", obj.CC),
                new SqlParameter("@BCC", obj.BCC), 

                new SqlParameter("@RESULT",""),
            };
            return await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteNonQueryReturnScalar("[RTL].[Usp_Mailing]", CommandType.StoredProcedure, param.ToArray()));
        }

        
      public async static Task<DataSet> MailingSearching(RetailBAL obj)
        {
            var param = new List<SqlParameter>
                {
                new SqlParameter("@Id", obj.Id),
                new SqlParameter("@Action", obj.Action) 
                };
            DataSet dt = await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommandds("[RTL].[Usp_Mailing]", CommandType.StoredProcedure, param.ToArray()));
            return dt;
        }
        public async static Task<DataTable> GetComDoc(RetailBAL obj)
        { 
            var param = new List<SqlParameter>
                {
                new SqlParameter("@Id", obj.Id),
                new SqlParameter("@Action", obj.Action),
                new SqlParameter("@StoreId", obj.StoreId) 
                };
            DataTable dt = await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("[dbo].[Usp_IUDStoreCompliance]", CommandType.StoredProcedure, param.ToArray()));
            return dt;
        }

        public async static Task<DataTable> SearchRegistration(RetailBAL obj)
        {
            var param = new List<SqlParameter>
                {
                new SqlParameter("@Id", obj.Id),
                new SqlParameter("@Action", obj.Action),
                new SqlParameter("@LoginId", obj.UserId)
                };
            DataTable dt = await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("USP_VendorRegistration", CommandType.StoredProcedure, param.ToArray()));
            return dt;
        }


        public async static Task<DataTable> SearchRoute(RetailBAL obj)
        {
            var param = new List<SqlParameter>
                {
                new SqlParameter("@Id", obj.Id),
                new SqlParameter("@Action", obj.Action),
                new SqlParameter("@LoginId", obj.UserId)
                };
            DataTable dt = await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("RTL.USP_RouteMaster", CommandType.StoredProcedure, param.ToArray()));
            return dt;
        }
        

        public async static Task<string> InsertRegister(RetailBAL obj)
        {
            var param = new List<SqlParameter>
           {
        new SqlParameter("@Action", obj.Action),

        // Step 1
        new SqlParameter("@AgencyName", obj.AgencyName ?? ""),
        new SqlParameter("@RegisteredAddress", obj.RegisteredAddress ?? ""),
        new SqlParameter("@CorporateAddress", obj.CorporateAddress ?? ""),
        new SqlParameter("@ContactPerson", obj.ContactPerson ?? ""),
        new SqlParameter("@Designation", obj.Designation ?? ""),
        new SqlParameter("@Mobile", obj.Mobile ?? ""),
        new SqlParameter("@Email", obj.Email ?? ""),
        new SqlParameter("@Website", obj.Website ?? ""),
        new SqlParameter("@YearEstablishment", obj.Year ?? ""),
        new SqlParameter("@Organization", obj.Organization ?? ""),

        // Step 2 (Statutory)
        new SqlParameter("@PanNo", obj.PanNo ?? ""),
        new SqlParameter("@Tan", obj.Tan ?? ""),
        new SqlParameter("@GSTIN", obj.GSTIN ?? ""),
        new SqlParameter("@CIN", obj.CIN ?? ""),
        new SqlParameter("@SHOPREGI", obj.SHOPREGI ?? ""),
        new SqlParameter("@MSME", obj.MSME ?? ""),
        new SqlParameter("@EPFREGNO", obj.EPFREGNO ?? ""),
        new SqlParameter("@ESICREGNO", obj.ESICREGNO ?? ""),
        new SqlParameter("@ProfessionalREGNO", obj.ProfessionalREGNO ?? ""),
        new SqlParameter("@LabourREGNO", obj.LabourREGNO ?? ""),
        new SqlParameter("@ContractREGNO", obj.ContractREGNO ?? ""),
        new SqlParameter("@LabourLicenseNO", obj.LabourLicenseNO ?? ""),
        new SqlParameter("@LicenseValidity", obj.LicenseValidity ?? ""),
        new SqlParameter("@LicenseEmployeeCount", obj.LicenseEmployeeCount ?? ""),

        // Step 4 (Bank)
        new SqlParameter("@BankName", obj.BankName ?? ""),
        new SqlParameter("@AccountNumber", obj.AccountNumber ?? ""),
        new SqlParameter("@IFSCCode", obj.IFSCCode ?? ""),
        new SqlParameter("@CancelledCheque", obj.CancelledCheque ?? ""),

        // Step 5
        new SqlParameter("@Service", obj.Service ?? ""),
        new SqlParameter("@Industries", obj.Industries ?? ""),
        new SqlParameter("@TotalEmployees", obj.TotalEmployees ?? ""),
        new SqlParameter("@OperationalLocations", obj.OperationalLocations ?? ""),

        // Step 6
        new SqlParameter("@YearsOfExperience", obj.YearsOfExperience ?? ""),
        new SqlParameter("@KeyClients", obj.KeyClients ?? ""),
        new SqlParameter("@SimilarContracts", obj.SimilarContracts ?? ""),

        // Files (1–21)
        new SqlParameter("@File1", obj.FileUploadPath ?? ""), 

        // Reference 1
        new SqlParameter("@NameOrganization1", obj.NameOrganization1 ?? ""),
        new SqlParameter("@ServiceType1", obj.ServiceType1 ?? ""),
        new SqlParameter("@ConcernPerson1", obj.ConcernPerson1 ?? ""),
        new SqlParameter("@Designation1", obj.Designation1 ?? ""),
        new SqlParameter("@MobileNo1", obj.MobileNo1 ?? ""),
        new SqlParameter("@EmailId1", obj.EmailId1 ?? ""),

        // Reference 2
        new SqlParameter("@NameOrganization2", obj.NameOrganization2 ?? ""),
        new SqlParameter("@ServiceType2", obj.ServiceType2 ?? ""),
        new SqlParameter("@ConcernPerson2", obj.ConcernPerson2 ?? ""),
        new SqlParameter("@Designation2", obj.Designation2 ?? ""),
        new SqlParameter("@MobileNo2", obj.MobileNo2 ?? ""),
        new SqlParameter("@EmailId2", obj.EmailId2 ?? ""),

        // Reference 3
        new SqlParameter("@NameOrganization3", obj.NameOrganization3 ?? ""),
        new SqlParameter("@ServiceType3", obj.ServiceType3 ?? ""),
        new SqlParameter("@ConcernPerson3", obj.ConcernPerson3 ?? ""),
        new SqlParameter("@Designation3", obj.Designation3 ?? ""),
        new SqlParameter("@MobileNo3", obj.MobileNo3 ?? ""),
        new SqlParameter("@EmailId3", obj.EmailId3 ?? ""),

        new SqlParameter("@SignatoryName", obj.SignatoryName ?? ""),
        new SqlParameter("@SignatoryDesignation", obj.SignatoryDesignation ?? ""),
            new SqlParameter("@GeneralDate", obj.GeneralDate ?? ""), 

        // Common
        new SqlParameter("@LoginId", obj.UserId),
        new SqlParameter("@Createdby", obj.UserId),

        new SqlParameter("@RESULT", SqlDbType.VarChar, 500)
        {
            Direction = ParameterDirection.Output
        }
    };

            return await Task.Factory.StartNew(() =>
                SqlDBHelper.SqlHelper.ExecuteNonQueryReturnScalar(
                    "USP_VendorRegistration",
                    CommandType.StoredProcedure,
                    param.ToArray()
                )
            );
        }



        public async static Task<string> InsertUpdateRouteMaster(RouteMasterModel obj)
        {
            var param = new List<SqlParameter>
    {
        new SqlParameter("@Action", obj.ActionType ?? (object)DBNull.Value),
        new SqlParameter("@Id", obj.Id ?? (object)DBNull.Value),
        new SqlParameter("@UserId", obj.UserId ?? (object)DBNull.Value),
        new SqlParameter("@PartyId", obj.PartyId ?? (object)DBNull.Value),

        // Route Details
       
        new SqlParameter("@RouteID", obj.RouteID ?? (object)DBNull.Value),

              new SqlParameter("@RouteName", obj.RouteName),
        new SqlParameter("@CompanyName", obj.CompanyName ?? (object)DBNull.Value),
        new SqlParameter("@Location", obj.Location ?? (object)DBNull.Value),
        new SqlParameter("@RouteStartLocation", obj.RouteStartLocation ?? (object)DBNull.Value),
        new SqlParameter("@RouteEndLocation", obj.RouteEndLocation ?? (object)DBNull.Value),
        new SqlParameter("@Status", obj.Status ?? (object)DBNull.Value),

        // Bus Details
        new SqlParameter("@BusNumber", obj.BusNumber ?? (object)DBNull.Value),
        new SqlParameter("@RCNO", obj.RCNO ?? (object)DBNull.Value),
        new SqlParameter("@SeatingCapacity", obj.SeatingCapacity ?? (object)DBNull.Value),
        new SqlParameter("@BusType", obj.BusType ?? (object)DBNull.Value),

        // Driver Details
        new SqlParameter("@DriverName", obj.DriverName ?? (object)DBNull.Value),
        new SqlParameter("@DriverContactNumber", obj.DriverContactNumber ?? (object)DBNull.Value),
        new SqlParameter("@DriverAddress", obj.DriverAddress ?? (object)DBNull.Value),
        new SqlParameter("@LicenseNumber", obj.LicenseNumber ?? (object)DBNull.Value),

        // Conductor Details
        new SqlParameter("@ConductorName", obj.ConductorName ?? (object)DBNull.Value),
        new SqlParameter("@ConductorContact", obj.ConductorContact ?? (object)DBNull.Value),
        new SqlParameter("@ConductorAddress", obj.ConductorAddress ?? (object)DBNull.Value),

        // FILES
        new SqlParameter("@LicenseCopy", obj.LicenseCopy ?? (object)DBNull.Value),
        new SqlParameter("@AadharCardCopy", obj.AadharCardCopy ?? (object)DBNull.Value),
        new SqlParameter("@ConductorAadhaarCard", obj.ConductorAadhaarCard ?? (object)DBNull.Value),

        new SqlParameter("@BusRC", obj.BusRC ?? (object)DBNull.Value),
        new SqlParameter("@PollutionCertificate", obj.PollutionCertificate ?? (object)DBNull.Value),
        new SqlParameter("@FitnessCertificate", obj.FitnessCertificate ?? (object)DBNull.Value),
        new SqlParameter("@InsuranceCopy", obj.InsuranceCopy ?? (object)DBNull.Value),

        new SqlParameter("@RESULT", "")
    };

            return await Task.Factory.StartNew(() =>
                SqlDBHelper.SqlHelper.ExecuteNonQueryReturnScalar(
                    "RTL.USP_RouteMaster",   
                    CommandType.StoredProcedure,
                    param.ToArray()
                )
            );
        }
 // here is define bind financial compliance events dated 18/4/2026
        public async static Task<DataTable> SearchFinacialStatutoryEvent(RetailBAL obj)
        {
            var param = new List<SqlParameter>
            {
                    new SqlParameter("@Action", obj.Action),
                     new SqlParameter("@Year", obj.Year),
                    new SqlParameter("@Month", obj.Month),
                    new SqlParameter("@State", obj.State),
                    new SqlParameter("@CACId", obj.CACId),
                    new SqlParameter("@Id", obj.Id),
            };
            DataTable dt = await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("[RTL].[USP_FinancialStatutoryEvent]", CommandType.StoredProcedure, param.ToArray()));
            return dt;
        }
    }
}