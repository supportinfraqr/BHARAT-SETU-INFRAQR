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

        public async Task<string> IUDCDM(MenuPermission obj)
        {
            StringBuilder menulist = new StringBuilder();
            string seprator = ",";
            string bigseprator = "";
            //   if (obj.Action == 1 && obj.MenuList.Count == 0) return "0";
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

            return await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteNonQueryReturnScalar("USP_ClientDocumentMapping", CommandType.StoredProcedure, param.ToArray()));
        }

        public DataTable GetCDM(DocumentBAL obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@Action", obj.Action),
                 new SqlParameter("@ClientId", obj.ClientId),
            };
            return SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("USP_ClientDocumentMapping", CommandType.StoredProcedure, param.ToArray());

        }
    }
}