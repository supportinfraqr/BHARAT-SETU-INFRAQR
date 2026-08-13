using BAL;
using System;
using System.Collections.Generic;
using System.Data;
using System.Data.SqlClient;
using System.IO;
using System.Net;
using System.Text;

namespace DAL
{
    public partial class DLL
    {
        public string SendGeneralSMS(SMSBAL obj)
        {
            string returnmsg = "0";

            var param = new List<SqlParameter>
               {

                    new SqlParameter("@Mobile", obj.ContactNo),
                    new SqlParameter("@Message", obj.Msg),
                    new SqlParameter("@Action", obj.Action),
                    new SqlParameter("@Result", ""),
            };
            string Getvalue = SqlDBHelper.SqlHelper.ExecuteNonQueryPassingOutPara("USP_SendMessage", CommandType.StoredProcedure, param.ToArray(), "@Result");

            if (Getvalue != "")
            {
                WebRequest request = WebRequest.Create(Getvalue);
                request.Method = "POST";
                string postData = obj.Msg;
                byte[] byteArray = Encoding.UTF8.GetBytes(postData);
                request.ContentType = "application/x-www-form-urlencoded";
                // request.ContentType = "text/xml"
                request.ContentLength = byteArray.Length;
                Stream dataStream = request.GetRequestStream();
                dataStream.Write(byteArray, 0, byteArray.Length);
                dataStream.Close();
                HttpWebResponse response = (HttpWebResponse)request.GetResponse();
                Console.WriteLine(response.StatusDescription);
                dataStream = response.GetResponseStream();
                StreamReader reader = new StreamReader(dataStream);
                string responseFromServer = reader.ReadToEnd();
                Console.WriteLine(responseFromServer);
                reader.Close();
                dataStream.Close();
                response.Close();
                returnmsg = "1";
            }
            return returnmsg;
        }
        public string TrackMessage(SMSBAL obj)
        {
            string returnmsg = "0";
            var param = new List<SqlParameter>
               {
                new SqlParameter("@Action",obj.Action),
                new SqlParameter("@BranchId",obj.BranchId),
                new SqlParameter("@Result", "")
            };
            string Getvalue = SqlDBHelper.SqlHelper.ExecuteNonQueryPassingOutPara("USP_SendMessage", CommandType.StoredProcedure, param.ToArray(), "@Result");
            if (Getvalue != "")
            {
                WebRequest request = WebRequest.Create(Getvalue);
                request.Method = "POST";
                string postData = "";
                byte[] byteArray = Encoding.UTF8.GetBytes(postData);
                request.ContentType = "application/x-www-form-urlencoded";
                // request.ContentType = "text/xml"
                request.ContentLength = byteArray.Length;
                Stream dataStream = request.GetRequestStream();
                dataStream.Write(byteArray, 0, byteArray.Length);
                dataStream.Close();
                HttpWebResponse response = (HttpWebResponse)request.GetResponse();

                dataStream = response.GetResponseStream();
                StreamReader reader = new StreamReader(dataStream);
                string responseFromServer = reader.ReadToEnd();
                Console.WriteLine(responseFromServer);
                reader.Close();
                dataStream.Close();
                response.Close();
                returnmsg = responseFromServer;
            }
            return returnmsg;
        }
        //public async Task<DataTable> SearchSMS(BCommon obj)
        //{
        //    var param = new List<SqlParameter>
        //    {
        //        new SqlParameter("@Action", obj.Action),
        //        new SqlParameter("@BranchCode",obj.BranchCode),
        //        new SqlParameter("@FarmerId",obj.FarmerId),
        //        new SqlParameter("@FarmCode",obj.FarmCode),
        //    };
        //    DataTable dt = await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("USP_SendMessage", CommandType.StoredProcedure, param.ToArray()));
        //    return dt;
        //}
    }
}