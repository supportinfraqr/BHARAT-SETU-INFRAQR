using System;
using System.Collections.Generic;
using System.Data;
using System.IO;
using System.Reflection;

namespace BAL
{

    public class BCommon
    {
        public string StartDate { get; set; }
        public string PageNumber { get; set; }
        public string PageSize { get; set; }
        public string Search { get; set; }
        public string PartyCode { get; set; }
        public string Id { get; set; }
        public string StateId { get; set; }
        public string DocumentId { get; set; }
        public string EndDate { get; set; }
        public string ModuleId { get; set; }
        public string MenuId { get; set; }
        public string InvoiceNo { get; set; }
        public string Date { get; set; }
        public string MapId { get; set; }
        public string UserName { get; set; }
        public string Password { get; set; }
        public string Name { get; set; }
        public string FatherName { get; set; }
        public string Gender { get; set; }
        public string Designation { get; set; }

        public string EmailId { get; set; }

        public string Address { get; set; }

        public string ContactNo { get; set; }

        public string HeaderHtml { get; set; }
        public string ReportCategoryName { get; set; }
        public string ReportHeaderId { get; set; }
        public string PermitedData { get; set; }
        public int? Action { get; set; }

        public string IsActive { get; set; }

        public int? CreatedBy { get; set; }


        public string TransID { get; set; }

        public string BranchCode { get; set; }



        public string LoginId { get; set; }
        public string LoginType { get; set; }
        public string Documents { get; set; }
        public string VendorId { get; set; }


        public string ConvertDataTableToXml(DataTable dt)
        {
            MemoryStream str = new MemoryStream();
            dt.TableName = "XMLData";
            dt.WriteXml(str, true);
            str.Seek(0, SeekOrigin.Begin);
            StreamReader sr = new StreamReader(str);
            return sr.ReadToEnd();
        }

        public DataTable ToDataTable<T>(List<T> items)
        {
            DataTable dataTable = new DataTable(typeof(T).Name);

            //Get all the properties
            PropertyInfo[] Props = typeof(T).GetProperties(BindingFlags.Public | BindingFlags.Instance);
            foreach (PropertyInfo prop in Props)
            {
                //Defining type of data column gives proper data table 
                var type = (prop.PropertyType.IsGenericType && prop.PropertyType.GetGenericTypeDefinition() == typeof(Nullable<>) ? Nullable.GetUnderlyingType(prop.PropertyType) : prop.PropertyType);
                //Setting column names as Property names
                dataTable.Columns.Add(prop.Name, type);
            }
            foreach (T item in items)
            {
                var values = new object[Props.Length];
                for (int i = 0; i < Props.Length; i++)
                {
                    //inserting property values to datatable rows
                    values[i] = Props[i].GetValue(item, null);
                }
                dataTable.Rows.Add(values);
            }
            //put a breakpoint here and check datatable
            return dataTable;
        }
    }
    public class LoginCredential : BCommon
    {

        public string GSMID { get; set; }

        public string AccessMode { get; set; }
    }

    public class ForgotPassword : BCommon
    {

        //public string UserName { get; set; }

    }

    public class LoginPanelModels
    {

        public string UserName { get; set; }

        public string Password { get; set; }

        public string GSMID { get; set; }

        public string AccessMode { get; set; }
    }

    public class UserDetails : BCommon
    {


        //public string Designation { get; set; }

        //public string Address { get; set; }

        //public string ContactNo { get; set; }

        public string Email { get; set; }

        //public string UserName { get; set; }

        //public string PassCode { get; set; }

        //public string Password { get; set; }

    }

    public class User : BCommon
    {

        //public string Designation { get; set; }

        //public string Address { get; set; }

        //public string ContactNo { get; set; }

        public string Email { get; set; }

        //public string UserName { get; set; }

        //public string Password { get; set; }


        public string PhotoPath { get; set; }
    }

    public class CountryMaster : BCommon
    {

        public string CountryName { get; set; }
    }

    public class StateMaster : BCommon
    {

        public string StateName { get; set; }
    }

    public class CityMaster : BCommon
    {

        public string CityName { get; set; }
    }

    public class BranchAuthorization : BCommon
    {


        public string notificationids { get; set; }
    }

    public class ItemCategoryMaster : BCommon
    {

        public string ItemGroupCode { get; set; }
    }
    public class Module
    {

        public string EmployeeCode { get; set; }

        public string ModuleName { get; set; }
        public string LoginType { get; set; }
        public string LoginId { get; set; }
        public string UserId { get; set; }

        public string BranchCode { get; set; }
        public string ModuleIcon { get; set; }


        public string ModuleId { get; set; }
        public int PartyId { get; set; }
        public int PartyType { get; set; }
        public int RoleId { get; set; }

        public List<Menu> menu { get; set; }

    }

    public class Menu
    {

        public string MenuName { get; set; }

        public string MenuIcon { get; set; }

        public string MenuId { get; set; }

        public List<SubMenu> submenu { get; set; }
    }

    public class SubMenu
    {

        public string SubMenuName { get; set; }


        public string SubMenuIcon { get; set; }
        public string SubMenuId { get; set; }



        public string SubMenuUrl { get; set; }
    }

    public class MenuPermission : BCommon
    {

        //public string ModuleId { get; set; }

        public List<MenuList> MenuList { get; set; }

        public string EmployeeCode { get; set; }


        public string ModuleIcon { get; set; }

        public string ClientId { get; set; }
        public string VendorId { get; set; }


    }

    public class MenuList
    {

        public string MenuId { get; set; }

        public string SubMenuId { get; set; }

        public string MenuIcon { get; set; }

        public string SubMenuIcon { get; set; }


        public bool Add { get; set; }

        public bool Edit { get; set; }

        public bool Delete { get; set; }

        public bool Print { get; set; }
    }









    public class RolePermission : BCommon
    {
        public string ModuleType { get; set; }
        public string PartyId { get; set; }
        public string RoleId { get; set; }
        public string UserId { get; set; }

        public List<SectionList> SectionList { get; set; }

    }

    public class SectionList
    {
        public string SectionId { get; set; }
        public bool View { get; set; }
        public bool Edit { get; set; }
        public bool Delete { get; set; }
        public bool Upload { get; set; }
        public bool Download { get; set; }
        public bool NewStore { get; set; }
        public bool NewEmployee { get; set; }

        public bool Checkbox1 { get; set; }
        public bool Checkbox2 { get; set; }
        public bool Verify { get; set; }
    }
}

