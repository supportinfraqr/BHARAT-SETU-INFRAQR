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
        public async Task<List<Module>> NavMenuList(Module obj)
        {
            List<Module> modulelist = new List<Module>();

            var param = new List<SqlParameter>
            {
                new SqlParameter("@LoginId", obj.LoginId),
                new SqlParameter("@LoginType", obj.LoginType)
            };

            DataTable dt1 = await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("USP_GetModule", CommandType.StoredProcedure, param.ToArray()));

            if (dt1.Rows.Count > 0)
            {
                for (int i = 0; i < dt1.Rows.Count; i++)
                {

                    Module module = new Module();
                    List<Menu> menulist = new List<Menu>();

                    module.ModuleId = dt1.Rows[i]["ModuleId"].ToString();
                    module.ModuleName = dt1.Rows[i]["ModuleName"].ToString();
                    module.ModuleIcon = dt1.Rows[i]["ModuleIcon"].ToString();

                    var param1 = new List<SqlParameter>
                    {
                        new SqlParameter("@LoginId", obj.LoginId),
                        new SqlParameter("@ModuleId", module.ModuleId),
                         new SqlParameter("@BranchCode",obj.BranchCode),
                    };

                    DataTable dt2 = await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("USP_GetMenu", CommandType.StoredProcedure, param1.ToArray()));

                    //module.menu = dt2;

                    for (int j = 0; j < dt2.Rows.Count; j++)
                    {
                        Menu menu = new Menu();
                        List<SubMenu> submenulist = new List<SubMenu>();

                        menu.MenuId = dt2.Rows[j]["MenuId"].ToString();
                        menu.MenuName = dt2.Rows[j]["MenuName"].ToString();
                        menu.MenuIcon = dt2.Rows[j]["MenuIcon"].ToString();

                        var param2 = new List<SqlParameter>
                        {
                            new SqlParameter("@LoginId", obj.LoginId),
                            new SqlParameter("@MenuId", menu.MenuId),
                            new SqlParameter("@BranchCode",obj.BranchCode),

                        };


                        DataTable dt3 = await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("USP_GetSubMenu", CommandType.StoredProcedure, param2.ToArray()));
                        for (int k = 0; k < dt3.Rows.Count; k++)
                        {
                            SubMenu submenu = new SubMenu();

                            submenu.SubMenuName = dt3.Rows[k]["SubMenuName"].ToString();
                            submenu.SubMenuUrl = dt3.Rows[k]["Url"].ToString();
                            submenu.SubMenuId = dt3.Rows[k]["SubMenuId"].ToString();
                            submenu.SubMenuIcon = dt3.Rows[k]["SubMenuIcon"].ToString();
                            submenulist.Add(submenu);

                        }
                        menu.submenu = submenulist;
                        menulist.Add(menu);
                        module.menu = menulist;

                    }

                    modulelist.Add(module);
                }
            }

            return modulelist;
        }
        public async Task<DataTable> ModuleList(Module obj)
        {
            var param = new List<SqlParameter>
            {
               new SqlParameter("@BranchCode",obj.BranchCode),
                new SqlParameter("@LoginId", obj.LoginId)
            };
            DataTable dt = await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("USP_GetModuleList", CommandType.StoredProcedure, param.ToArray()));
            return dt;
        }


        public async Task<DataTable> SubMenuList(Module obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@LoginId", obj.EmployeeCode),
                new SqlParameter("@ModuleId", obj.ModuleId),
                new SqlParameter("@BranchCode",obj.BranchCode),
            };
            DataTable dt = await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("USP_GetSubMenuList", CommandType.StoredProcedure, param.ToArray()));

            return dt;
        }

        public async Task<string> MenuPermission(MenuPermission obj)
        {
            StringBuilder menulist = new StringBuilder();
            string seprator = ",";
            string bigseprator = "";
            if (obj.Action == 1 && obj.MenuList.Count == 0) return "0";
            if (obj.Action == 1 && obj.MenuList.Count > 0)
            {
                if (obj.MenuList != null)
                {
                    for (int i = 0; i < obj.MenuList.Count; i++)
                    {
                        menulist.Append(bigseprator);
                        menulist.Append(obj.MenuList[i].MenuId);

                        menulist.Append(seprator);
                        menulist.Append(obj.MenuList[i].SubMenuId);

                        menulist.Append(seprator);
                        menulist.Append(obj.MenuList[i].Add == true ? "1" : "0");

                        menulist.Append(seprator);
                        menulist.Append(obj.MenuList[i].Edit == true ? "1" : "0");

                        menulist.Append(seprator);
                        menulist.Append(obj.MenuList[i].Delete == true ? "1" : "0");

                        menulist.Append(seprator);
                        menulist.Append(obj.MenuList[i].Print == true ? "1" : "0");
                        bigseprator = "|";
                    }
                    bigseprator = "";
                }
            }
            var param = new List<SqlParameter>
            {
                new SqlParameter("@ModuleId", obj.ModuleId),
                new SqlParameter("@MenuIds", menulist.ToString()),
                new SqlParameter("@LoginId", obj.EmployeeCode),
                new SqlParameter("@BranchCode",obj.BranchCode),

                new SqlParameter("@IsActive",1),
                new SqlParameter("@Action",obj.Action),
                new SqlParameter("@Result","")
            };

            return await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteNonQueryReturnScalar("USP_SetMenuPermission", CommandType.StoredProcedure, param.ToArray()));
        }
        public async Task<string> BranchMenuPermission(MenuPermission obj)
        {
            StringBuilder menulist = new StringBuilder();
            string seprator = ",";
            string bigseprator = "";
            if (obj.Action == 1 && obj.MenuList.Count == 0) return "0";
            if (obj.Action == 1 && obj.MenuList.Count > 0)
            {
                if (obj.MenuList != null)
                {
                    for (int i = 0; i < obj.MenuList.Count; i++)
                    {
                        menulist.Append(bigseprator);
                        menulist.Append(obj.MenuList[i].MenuId);

                        menulist.Append(seprator);
                        menulist.Append(obj.MenuList[i].SubMenuId);
                        bigseprator = "|";
                    }
                    bigseprator = "";
                }
            }
            var param = new List<SqlParameter>
            {
                new SqlParameter("@BranchModuleId", obj.ModuleId),
                new SqlParameter("@BranchMenuIds", menulist.ToString()),
                new SqlParameter("@BranchCode",obj.BranchCode),
                new SqlParameter("@IsActive",1),
                new SqlParameter("@CreatedBy",obj.CreatedBy),
                new SqlParameter("@Action",obj.Action),
                new SqlParameter("@Result","")
            };

            return await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteNonQueryReturnScalar("USP_SetBranchMenuPermission", CommandType.StoredProcedure, param.ToArray()));
        }

        public async Task<DataTable> SearchBranchMenuPermission(BranchAuthorization obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@Action", 4),
                new SqlParameter("@BranchCode",obj.BranchCode)

            };
            DataTable dt = await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("USP_SetBranchMenuPermission", CommandType.StoredProcedure, param.ToArray()));

            return dt;
        }
        public async Task<DataTable> GetCompanyAndBranchMaster(BCommon obj)
        {
            DataTable dt;
            var param = new List<SqlParameter>
            {
                new SqlParameter("@Action",obj.Action),
                new SqlParameter("@BranchCode",obj.BranchCode),

            };
            dt = await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("[USP_LoginTable]", CommandType.StoredProcedure, param.ToArray()));
            return dt;
        }

        public async Task<int> InsertUpdateDeleteCompanyBranchUserPermission(BCommon obj)
        {
            var param = new List<SqlParameter>
            {
              new SqlParameter("@Action",obj.Action),
              new SqlParameter("@TransID",obj.TransID),
              new SqlParameter("@PermitedData",obj.PermitedData),
              new SqlParameter("@BranchCode",obj.BranchCode),
              new SqlParameter("@CreatedBy",obj.CreatedBy),
              new SqlParameter("@result",""),
            };
            return await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteNonQueryReturnInt("[USP_LoginTable]", CommandType.StoredProcedure, param.ToArray()));
        }
        public async Task<DataTable> SearchMenuPermission(BranchAuthorization obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@Action", 4),
                new SqlParameter("@BranchCode",obj.BranchCode),
            };
            DataTable dt = await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("USP_SetMenuPermission", CommandType.StoredProcedure, param.ToArray()));

            return dt;
        }

        public async Task<DataTable> GetLoginMemberDetails(BranchAuthorization obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@Action", 4),
                new SqlParameter("@IsActive",obj.IsActive),
                new SqlParameter("@BranchCode",obj.BranchCode),
            };
            DataTable dt = await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("[USP_LoginAuthentication]", CommandType.StoredProcedure, param.ToArray()));

            return dt;
        }
        public async Task<DataTable> GetDetails(BranchAuthorization obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@Action", obj.Action),
                new SqlParameter("@IsActive",obj.IsActive),
                new SqlParameter("@BranchCode",obj.BranchCode),
            };
            DataTable dt = await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("[USP_LoginAuthentication]", CommandType.StoredProcedure, param.ToArray()));

            return dt;
        }
        public async Task<int> UpdateAllMembers(BCommon obj)
        {
            var param = new List<SqlParameter>
            {
              new SqlParameter("@Action",obj.Action),
              new SqlParameter("@BranchCode",obj.BranchCode),
              new SqlParameter("@IsActive",obj.IsActive),
              new SqlParameter("@result",""),
            };
            return await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteNonQueryReturnInt("[USP_LoginAuthentication]", CommandType.StoredProcedure, param.ToArray()));
        }
        public async Task<int> SeprateUpdateMembers(BCommon obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@Action",obj.Action),
                new SqlParameter("@BranchCode",obj.BranchCode),
                new SqlParameter("@IsActive",obj.IsActive),
                new SqlParameter("@LoginId",obj.LoginId),
              new SqlParameter("@result",""),
            };
            return await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteNonQueryReturnInt("[USP_LoginAuthentication]", CommandType.StoredProcedure, param.ToArray()));
        }
        public async Task<string> InsertUpdateDeleteReportHeader(BCommon obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@Action",obj.Action),
                new SqlParameter("@BranchCode",obj.BranchCode),
                new SqlParameter("@IsActive",obj.IsActive),

                new SqlParameter("@ReportHeaderId", obj.ReportHeaderId),
                new SqlParameter("@ReportCategoryName", obj.ReportCategoryName),
                new SqlParameter("@HeaderHtml", obj.HeaderHtml),
                new SqlParameter("@result",""),
            };
            return await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteNonQueryReturnScalar("[USP_ReportHeader]", CommandType.StoredProcedure, param.ToArray()));
        }

        public async Task<string> IUDManageReportHeader(BCommon obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@Action",obj.Action),
                new SqlParameter("@Id",obj.Id), 
                new SqlParameter("@StateId", obj.StateId),
                new SqlParameter("@DocumentId", obj.DocumentId),
                new SqlParameter("@HeaderHtml", obj.HeaderHtml),
                new SqlParameter("@Result",""),
            };
            return await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteNonQueryReturnScalar("[usp_ManageReportHeader]", CommandType.StoredProcedure, param.ToArray()));
        }
        
       public async Task<DataTable> GetManageReportHeader(BCommon obj)
        {
            DataTable dt; 
                var param = new List<SqlParameter>
                {  
                new SqlParameter("@Action", obj.Action),
                };
                dt = await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("usp_ManageReportHeader", CommandType.StoredProcedure, param.ToArray()));
                return dt; 
        }
        public async Task<DataTable> GetReportHeader(BCommon obj)
        {
            DataTable dt;
            if (obj.Action == 5 && (obj.ReportCategoryName == null || obj.ReportCategoryName == "")) return null;
            if (obj.Action == 4 || obj.Action == 5)
            {
                var param = new List<SqlParameter>
            {
                new SqlParameter("@ReportCategoryName", obj.ReportCategoryName),
                new SqlParameter("@BranchCode",obj.BranchCode) ,
                new SqlParameter("@Action", obj.Action),
            };
                dt = await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("USP_ReportHeader", CommandType.StoredProcedure, param.ToArray()));
                return dt;
            }
            else
            {
                return null;
            }
        }
        public async Task<string> IUDUserRegistration(BCommon obj)
        { 
           
            var param = new List<SqlParameter>
            {
                    new SqlParameter("@Action",obj.Action),
                    new SqlParameter("@LoginId",obj.LoginId),
                    new SqlParameter("@UserName",obj.UserName),
                    new SqlParameter("@Name",obj.Name),
                    new SqlParameter("@Password",obj.Password),
                    new SqlParameter("@MapId",obj.MapId),
                    new SqlParameter("@LoginType",obj.LoginType),
                    new SqlParameter("@ContactNo",obj.ContactNo),
                    new SqlParameter("@EmailId",obj.EmailId),
                    new SqlParameter("@IsActive",obj.IsActive),
                    new SqlParameter("@result",""),
            };
            return await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteNonQueryReturnScalar("USP_LoginTable", CommandType.StoredProcedure, param.ToArray()));
        }


        public async Task<string> IUDEmployeeDoc(BCommon obj)
        {
            //obj.UserName = CryptoHelper.Encrypt(obj.UserName);
            //obj.Password = CryptoHelper.Encrypt(obj.Password);


            var param = new List<SqlParameter>
            {
                    new SqlParameter("@Action",obj.Action),
                    new SqlParameter("@LoginId",obj.LoginId),
                   new SqlParameter("@Documents", string.IsNullOrEmpty(obj.Documents) ? "" : obj.Documents),
                    new SqlParameter("@VendorId", obj.VendorId),
                    new SqlParameter("@result",""),
            };
            return await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteNonQueryReturnScalar("USP_LoginTable", CommandType.StoredProcedure, param.ToArray()));
        }
        public DataTable GetUserByUserName(string userName)
        {
            var param = new List<SqlParameter>
           {
            new SqlParameter("@UserName", userName)
          };
            
            
            return SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("USP_GetUserByUserName", CommandType.StoredProcedure, param.ToArray());
        }
        public async Task<DataTable> GetUserRegistration(BCommon obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@Action", obj.Action),
                new SqlParameter("@LoginId",obj.LoginId)

            };
            DataTable dt = await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("USP_LoginTable", CommandType.StoredProcedure, param.ToArray()));
            return dt;
        }
        public async Task<DataTable> GetempRegistration(BCommon obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@Action", obj.Action),
                new SqlParameter("@LoginId",obj.LoginId),
                  new SqlParameter("@Id",obj.Id)

            };
            DataTable dt = await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("USP_LoginTable", CommandType.StoredProcedure, param.ToArray()));
            return dt;
        }
        public async Task<DataTable> checkPassCode(LoginBAL obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@Action", obj.Action),
                new SqlParameter("@LoginId",obj.LoginId),
                 new SqlParameter("@OldPassword",obj.OldPassword)

            };
            DataTable dt = await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("[Usp_ChangePassword]", CommandType.StoredProcedure, param.ToArray()));
            return dt;
        }
        public async Task<string> ModifyPassCode(LoginBAL obj)
        {
            var param = new List<SqlParameter>
            {
                    new SqlParameter("@Action",obj.Action),
                    new SqlParameter("@LoginId",obj.LoginId),
                    new SqlParameter("@NewPassword",obj.NewPassword),
                    new SqlParameter("@OldPassword",obj.OldPassword),
                    new SqlParameter("@result",""),
            };
            return await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteNonQueryReturnScalar("Usp_ChangePassword", CommandType.StoredProcedure, param.ToArray()));
        }
        public async Task<string> UploadPhoto(LoginBAL obj)
        {
            var param = new List<SqlParameter>
            {
                    new SqlParameter("@Action",obj.Action),
                    new SqlParameter("@LoginId",obj.LoginId),
                    new SqlParameter("@Photo",obj.Photo),
                    new SqlParameter("@result",""),
            };
            return await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteNonQueryReturnScalar("USP_LoginTable", CommandType.StoredProcedure, param.ToArray()));
        }


        public async Task<DataTable> RoleList(Module obj)
        {
            var param = new List<SqlParameter>
            {
               new SqlParameter("@BranchCode",obj.BranchCode),
                new SqlParameter("@LoginId", obj.LoginId),
                new SqlParameter("@PartyId", obj.PartyId)
            };
            DataTable dt = await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("USP_GetRoleList", CommandType.StoredProcedure, param.ToArray()));
            return dt;
        }

        public async Task<DataTable> PagesSectionMasterList(Module obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@PartyId",obj.PartyId),
                new SqlParameter("@PartyType", obj.PartyType),
                new SqlParameter("@UserId", obj.UserId),
                new SqlParameter("@RoleId", obj.RoleId),
                  new SqlParameter("@LoginId", obj.LoginId)
            };
            DataTable dt = await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("USP_GetPagesSectionList", CommandType.StoredProcedure, param.ToArray()));
            return dt;
        }

        public async Task<string> InsertSectionPermissionForRole(RolePermission obj)
        {
            StringBuilder menulist = new StringBuilder();
            string seprator = ",";
            string bigseprator = "";
            if (obj.Action == 1 && obj.SectionList.Count == 0) return "0";
            if (obj.Action == 1 && obj.SectionList.Count > 0)
            {
                if (obj.SectionList != null)
                {
                    for (int i = 0; i < obj.SectionList.Count; i++)
                    {
                        menulist.Append(bigseprator);
                        menulist.Append(obj.SectionList[i].SectionId);

                        menulist.Append(seprator);
                        menulist.Append(obj.SectionList[i].View == true ? "1" : "0");

                        menulist.Append(seprator);
                        menulist.Append(obj.SectionList[i].Edit == true ? "1" : "0");

                        menulist.Append(seprator);
                        menulist.Append(obj.SectionList[i].Delete == true ? "1" : "0");

                        menulist.Append(seprator);
                        menulist.Append(obj.SectionList[i].Upload == true ? "1" : "0");

                        menulist.Append(seprator);
                        menulist.Append(obj.SectionList[i].Download == true ? "1" : "0");

                        menulist.Append(seprator);
                        menulist.Append(obj.SectionList[i].NewStore == true ? "1" : "0");

                        menulist.Append(seprator);
                        menulist.Append(obj.SectionList[i].NewEmployee == true ? "1" : "0");



                        menulist.Append(seprator);
                        menulist.Append(obj.SectionList[i].Checkbox1 == true ? "1" : "0");

                        menulist.Append(seprator);
                        menulist.Append(obj.SectionList[i].Checkbox2 == true ? "1" : "0");

                        menulist.Append(seprator);
                        menulist.Append(obj.SectionList[i].Verify == true ? "1" : "0");
                        bigseprator = "|";
                    }
                    bigseprator = "";
                }
            }
            var param = new List<SqlParameter>
            {
                new SqlParameter("@ModuleId", obj.ModuleType),
                new SqlParameter("@SectionIds", menulist.ToString()),
                new SqlParameter("@LoginId", obj.LoginId),
                new SqlParameter("@UserId", obj.UserId),
                new SqlParameter("@BranchCode",obj.BranchCode),
                new SqlParameter("@IsActive",1),
                new SqlParameter("@Action",obj.Action),
                new SqlParameter("@Result","")
            };

            return await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteNonQueryReturnScalar("USP_SetSectionPermissionForRole", CommandType.StoredProcedure, param.ToArray()));
        }


        public async Task<DataTable> SearchSectionandRoleMenuPermission(BranchAuthorization obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@Action", 4),
                new SqlParameter("@BranchCode",obj.BranchCode),
                    new SqlParameter("@LoginId",obj.LoginId),
            };
            DataTable dt = await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("USP_SetSectionPermissionForRole", CommandType.StoredProcedure, param.ToArray()));

            return dt;
        }
        public async Task<string> IUDContractorGatePass(RetailBAL obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@Action",obj.Action),
                new SqlParameter("@Id",obj.Id),
                  new SqlParameter("@GatePassType",obj.GatePassType),
                     new SqlParameter("@GatePassDays",obj.GatePassDays),
                new SqlParameter("@Result",""),
            };
            return await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteNonQueryReturnScalar("[usp_ContractorGatePass]", CommandType.StoredProcedure, param.ToArray()));
        }

        public async Task<DataTable> GetContractorGatePass(RetailBAL obj)
        {
            DataTable dt;
            var param = new List<SqlParameter>
                {
                new SqlParameter("@Action", obj.Action),
                new SqlParameter("@LoginId", obj.LoginId),
                  new SqlParameter("@Id", obj.Id),
                };
            dt = await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("usp_ContractorGatePass", CommandType.StoredProcedure, param.ToArray()));
            return dt;
        }
		
		public async Task<DataTable> GetContractorDetail(BCommon obj)
        {
            DataTable dt;
            var param = new List<SqlParameter>
                {
                new SqlParameter("@Action",obj.Action),
                new SqlParameter("@LoginId",obj.LoginId),
                 new SqlParameter("@PartyCode", obj.PartyCode)
                };
            dt = await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("USP_LoginTable", CommandType.StoredProcedure, param.ToArray()));
            return dt;
        }
    }
}