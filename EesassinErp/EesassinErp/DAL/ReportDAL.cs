using BAL;
using Newtonsoft.Json.Linq;
using System;
using System.Collections.Generic;
using System.Data;
using System.Data.SqlClient;
using System.Net;
using System.Net.Http;
using System.Net.Sockets;
using System.Threading.Tasks;

namespace DAL
{
    public partial class DLL
    {
        public async Task<DataTable> SearchReport(TblPartyMaster obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@Sptype", obj.ActionType),
                new SqlParameter("@ClientId",obj.ClientId),
                new SqlParameter("@ClientSiteId",obj.ClientSiteId),
                new SqlParameter("@VendorId",obj.VendorId),
                new SqlParameter("@AuditorId",obj.AuditorId)
            };
            DataTable dt = await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("EVM.USP_TBL_PartyMaster", CommandType.StoredProcedure, param.ToArray()));
            return dt;
        }
        public async Task<DataTable> SearchReminderReport(TblPartyMaster obj)
        {
            var param = new List<SqlParameter>
            {
                    new SqlParameter("@Action", obj.Action),
               new SqlParameter("@StartDate", obj.StartDate),
            };
            DataTable dt = await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("USP_ReminderEmail", CommandType.StoredProcedure, param.ToArray()));
            return dt;
        }

        public async static Task<DataTable> GetMaintainLog(TblPartyMaster obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@StartDate", obj.CreatedOn),
                 new SqlParameter("@Id", obj.Id),
                new SqlParameter("@Action", obj.Action),
            };
            DataTable dt = await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("USP_ReminderEmail", CommandType.StoredProcedure, param.ToArray()));
            return dt;
        }



        public static async Task<string> GetPublicIPAddress()
        {
            string publicIP = string.Empty;

            try
            {
                using (HttpClient client = new HttpClient())
                {
                    // Hit the API to get the public IP address
                    string url = "https://api.myip.com";
                    var response = await client.GetStringAsync(url);
                    JObject json = JObject.Parse(response);

                    // Extract the IP address from the JSON
                    publicIP = json["ip"].ToString();

                }
            }
            catch (Exception ex)
            {
                Console.WriteLine("Error: " + ex.Message);
            }

            return publicIP;
        }

        public static async Task<string> GetLONGLATI()
        {
            string longi_lati = string.Empty;

            try
            {
                using (HttpClient client = new HttpClient())
                {
                    // Hit the API to get the public IP address
                    string url = " http://ip-api.com/json/";
                    var response = await client.GetStringAsync(url);
                    JObject json = JObject.Parse(response);

                    // Extract the IP address from the JSON
                    longi_lati = json["lat"].ToString() + '-' + json["lon"].ToString();

                }
            }
            catch (Exception ex)
            {
                Console.WriteLine("Error: " + ex.Message);
            }

            return longi_lati;
        }

        public static async Task MaintainLog(TblPartyMaster obj)
        {
            var machineName = Environment.MachineName;

            var systemUserName = Environment.UserName;
            string localIP = GetLocalIPAddress();
            string publicIP = await GetPublicIPAddress();

            string longi_lati = await GetLONGLATI();


            var param = new List<SqlParameter>
                {
                    new SqlParameter("@ClientId", obj.ClientId),
                    new SqlParameter("@Action", obj.Action),
                    new SqlParameter("@Activity", obj.Activity),
                    new SqlParameter("@MachineName", machineName),
                    new SqlParameter("@SystemUserName", systemUserName),
                    new SqlParameter("@localIP", localIP),
                    new SqlParameter("@publicIP",publicIP),
                     new SqlParameter("@longi_lati",longi_lati),
                    new SqlParameter("@Result", ""),
                };
            // Store the data in the database (this might need to be awaited too, depending on how ExecuteNonQuery works)
            await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteNonQueryReturnScalar("USP_ReminderEmail", CommandType.StoredProcedure, param.ToArray()));
        }


        public static async Task Exception(TblPartyMaster obj)
        {
           
            var param = new List<SqlParameter>
                {
                    new SqlParameter("@ClientId", obj.ClientId),
                    new SqlParameter("@Action", obj.Action),
                    new SqlParameter("@Activity", obj.Activity),
                    new SqlParameter("@MachineName", obj.machineName),
                    new SqlParameter("@SystemUserName", obj.systemUserName), 
                    new SqlParameter("@Result", ""),
                };
            // Store the data in the database (this might need to be awaited too, depending on how ExecuteNonQuery works)
            await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteNonQueryReturnScalar("USP_ReminderEmail", CommandType.StoredProcedure, param.ToArray()));
        }

        public static string GetLocalIPAddress()
        {
            string localIP = string.Empty;

            try
            {
                var host = Dns.GetHostEntry(Dns.GetHostName());
                foreach (var ip in host.AddressList)
                {
                    // Filter for IPv4 address only
                    if (ip.AddressFamily == AddressFamily.InterNetwork)
                    {
                        localIP = ip.ToString();
                        break;
                    }
                }

                if (string.IsNullOrEmpty(localIP))
                    throw new Exception("Local IP Address Not Found!");
            }
            catch (Exception ex)
            {
                Console.WriteLine("Error: " + ex.Message);
            }

            return localIP;
        }

        public async static Task<DataTable> GetStoreDashboard(TblPartyMaster obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@UserId",obj.UserId),
                new SqlParameter("@Action", obj.Action),
                new SqlParameter("@StartDate", obj.StartDate),
                new SqlParameter("@EndDate", obj.EndDate),
                new SqlParameter("@RegionId", obj.RegionId),
                new SqlParameter("@StateId", obj.StateId),
                new SqlParameter("@StoreCode", obj.StoreCode),
                 new SqlParameter("@Year", obj.Year),
                  new SqlParameter("@Month", obj.Month),
                   new SqlParameter("@Category", obj.Category),
                    new SqlParameter("@Status", obj.Status),

        };
            DataTable dt = await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("[RTL].[USP_StoreDashboard]", CommandType.StoredProcedure, param.ToArray()));
            return dt;
        }

        public async static Task<DataTable> GetRetailMainDashboard(TblPartyMaster obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@UserId",obj.UserId),
                new SqlParameter("@Action", obj.Action)

        };
            DataTable dt = await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("RTL.USP_Subcidiary", CommandType.StoredProcedure, param.ToArray()));
            return dt;
        }
    }
}