using BAL;
using System.Collections.Generic;
using System.Data;
using System.Data.SqlClient;
using System.Threading.Tasks;

namespace DAL
{
    public partial class DLL
    {
        public async static Task<string> InsertUpdateRozgar(RozgarBAL obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@Action", obj.Action),
                new SqlParameter("@id", obj.id),
                new SqlParameter("@isflag", obj.isflag),
                new SqlParameter("@JobTitle", obj.JobTitle),
                new SqlParameter("@JobCategory", obj.JobCategory),
                //new SqlParameter("@WorkType", obj.WorkType),
                new SqlParameter("@Location", obj.Location),
                new SqlParameter("@Description", obj.Description),
                new SqlParameter("@RequiredSkills", obj.RequiredSkills),
                new SqlParameter("@MinSallery", obj.MinSallery),
                new SqlParameter("@MaxSallery", obj.MaxSallery),
                new SqlParameter("@State", obj.State),
                new SqlParameter("@City", obj.City),
                new SqlParameter("@Experience", obj.Experience),

                new SqlParameter("@Loginid", obj.Loginid),
                new SqlParameter("@Mapid", obj.Mapid),
                new SqlParameter("@CreatedBy", obj.Loginid),
                new SqlParameter("@saveflag", obj.saveflag),
                new SqlParameter("@RESULT", "")
            };

            return await Task.Factory.StartNew(() =>
                SqlDBHelper.SqlHelper.ExecuteNonQueryReturnScalar(
                    "RTL.USP_Rozgar",
                    CommandType.StoredProcedure,
                    param.ToArray()));
        }


        public async static Task<DataTable> GetRozgarDetail(RozgarBAL obj)
        {
            var param = new List<SqlParameter>
            {
               new SqlParameter("@Action", obj.Action),
               new SqlParameter("@Jobno", obj.id),
               new SqlParameter("@Loginid", obj.Loginid),
              
            };
            DataTable dt = await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("RTL.USP_Rozgar", CommandType.StoredProcedure, param.ToArray()));
            return dt;
        }

        public async static Task<string> ApplyForm(WorkerRozgarBAL obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@Action", obj.Action),
                new SqlParameter("@id", obj.id),
                new SqlParameter("@isflag", obj.isflag),
                new SqlParameter("@JobTitle", obj.JobTitle),
                new SqlParameter("@Fullname", obj.Fullname),
                new SqlParameter("@WorkType", obj.WorkType),
                new SqlParameter("@EmailID", obj.EmailID),
                new SqlParameter("@Mobileno", obj.Mobileno),
                new SqlParameter("@CurrentLocation", obj.CurrentLocation),
                new SqlParameter("@Jobno", obj.Jobno),
                new SqlParameter("@Loginid", obj.Loginid),
                new SqlParameter("@Mapid", obj.Mapid),
                new SqlParameter("@CreatedBy", obj.Loginid),
                new SqlParameter("@RESULT", "")
            };

            return await Task.Factory.StartNew(() =>
                SqlDBHelper.SqlHelper.ExecuteNonQueryReturnScalar(
                    "[RTL].[USP_ApplyJobPost]",
                    CommandType.StoredProcedure,
                    param.ToArray()));
        }

        public async static Task<DataTable> SearchApplyForm(WorkerRozgarBAL obj)
        {
            var param = new List<SqlParameter>
            {
               new SqlParameter("@Action", obj.Action),
               new SqlParameter("@Id", obj.id),
               new SqlParameter("@Loginid", obj.Loginid),
               new SqlParameter("@Jobno", obj.Jobno),

            };
            DataTable dt = await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("RTL.USP_ApplyJobPost", CommandType.StoredProcedure, param.ToArray()));
            return dt;
        }

    }
}