using BAL;
using System.Collections.Generic;
using System.Data;
using System.Data.SqlClient;
using System.Threading.Tasks;

namespace DAL
{
    public partial class DLL
    {

        public DataTable SearchRating(RatingBAL obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@Action", obj.Action),
                 new SqlParameter("@UserId", obj.UserId),

            };
            return SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("USP_Rating", CommandType.StoredProcedure, param.ToArray());

        }
        public async Task<string> IUDRating(RatingBAL obj)
        {
            var param = new List<SqlParameter>
            {
                    new SqlParameter("@Action", obj.Action),
                    new SqlParameter("@UserId", obj.UserId),
                      new SqlParameter("@Rating", obj.Rating),
                    new SqlParameter("@Certificate", obj.Certificate),

                    new SqlParameter("@Result",""),
            };
            return await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteNonQueryReturnScalar("USP_Rating", CommandType.StoredProcedure, param.ToArray()));
        }

    }
}