using System;
using System.Collections.Generic;
using System.Data;
using System.Data.SqlClient;


namespace DAL
{
    public class SqlDBHelper
    {

        public static readonly SqlDBHelper SqlHelper = new SqlDBHelper();

        public string msg;
            public string CONNECTION_STRING = "Server=localhost,1433;Initial Catalog=BharatSharamShetu;MultipleActiveResultSets=true;User ID=sa;Password=InfraQR2026!sql;Pooling=True;TrustServerCertificate=True;"; 




        internal DataTable ExecuteSelectCommand(string CommandName, CommandType cmdType)
        {
            //if(CONNECTION_STRING==) 
            DataTable table = null;
            using (SqlConnection con = new SqlConnection(CONNECTION_STRING))
            {
                using (SqlCommand cmd = con.CreateCommand())
                {
                    cmd.CommandType = cmdType;
                    cmd.CommandText = CommandName;

                    try
                    {
                        if (con.State != ConnectionState.Open)
                        {
                            con.Open();
                        }

                        using (SqlDataAdapter da = new SqlDataAdapter(cmd))
                        {
                            table = new DataTable();
                            da.Fill(table);
                        }
                    }
                    catch (Exception ex)
                    {
                        msg = ex.Message;
                    }
                }
            }

            return table;
        }
        internal DataTable ExecuteParamerizedSelectCommand(string CommandName, CommandType cmdType, SqlParameter[] param)
        {
            DataTable table = new DataTable();

            using (SqlConnection con = new SqlConnection(CONNECTION_STRING))
            {
                using (SqlCommand cmd = con.CreateCommand())
                {
                    cmd.CommandType = cmdType;
                    cmd.CommandText = CommandName;
                    cmd.Parameters.AddRange(param);
                    cmd.CommandTimeout = 600;

                    try
                    {
                        if (con.State != ConnectionState.Open)
                        {
                            con.Open();
                        }

                        using (SqlDataAdapter da = new SqlDataAdapter(cmd))
                        {
                            da.Fill(table);
                        }
                    }
                    catch (Exception ex)
                    {
                         msg = ex.Message;
                    }
                }
            }

            return table;     
        }
        internal DataSet ExecuteParamerizedSelectCommandds(string CommandName, CommandType cmdType, SqlParameter[] param)
        {
            DataSet ds = new DataSet();

            using (SqlConnection con = new SqlConnection(CONNECTION_STRING))
            {
                using (SqlCommand cmd = con.CreateCommand())
                {
                    cmd.CommandType = cmdType; 
                    cmd.CommandTimeout = 600;
                    cmd.CommandText = CommandName; 
                    param[param.Length - 1].Size = 0x100;
                    cmd.Parameters.AddRange(param);

                    try
                    {
                        if (con.State != ConnectionState.Open)
                        {
                            con.Open();
                        }

                        using (SqlDataAdapter da = new SqlDataAdapter(cmd))
                        {
                            da.Fill(ds);
                        }
                    }
                    catch (Exception ex)
                    {
                        msg = ex.Message;
                    }
                }
            }

            return ds;
        }
        // This function will be used to execute CUD(CRUD) operation of parameterized commands
        internal bool ExecuteNonQuery(string CommandName, CommandType cmdType, SqlParameter[] param)
        {
            int result = 0;
            SqlTransaction trans;
            using (SqlConnection con = new SqlConnection(CONNECTION_STRING))
            {
                if (con.State != ConnectionState.Open)
                {
                    con.Open();

                }
                trans = con.BeginTransaction();
                using (SqlCommand cmd = con.CreateCommand())
                {
                    cmd.Transaction = trans;
                    cmd.CommandType = cmdType;
                    cmd.CommandText = CommandName;
                    cmd.Parameters.AddRange(param);

                    try
                    {
                        result = cmd.ExecuteNonQuery();
                        trans.Commit();
                    }
                    catch (Exception ex)
                    {
                        trans.Rollback();
                        msg = ex.Message;
                    }
                    finally
                    {
                        trans.Dispose();
                        con.Close();
                    }
                }
            }

            return (result > 0);
        }
        internal string ExecuteNonQueryPassingOutPara(string CommandName, CommandType cmdType, SqlParameter[] param, string OutPara)
        {
            string result = "";
            SqlTransaction trans;
            using (SqlConnection con = new SqlConnection(CONNECTION_STRING))
            {
                if (con.State != ConnectionState.Open)
                {
                    con.Open();

                }
                trans = con.BeginTransaction();
                using (SqlCommand cmd = con.CreateCommand())
                {
                    cmd.Transaction = trans;
                    cmd.CommandType = cmdType;
                    cmd.CommandText = CommandName;
                    cmd.Parameters.AddRange(param);
                    cmd.Parameters[OutPara].Direction = ParameterDirection.Output;
                    cmd.Parameters[OutPara].Size = 0x10000;
                    try
                    {
                        cmd.ExecuteNonQuery();
                        result = cmd.Parameters[OutPara].Value.ToString();
                        trans.Commit();
                    }
                    catch (Exception ex)
                    {
                        trans.Rollback();
                        msg = ex.Message;
                    }
                    finally
                    {
                        trans.Dispose();
                        con.Close();
                    }
                }
            }

            return result;
        }

        internal List<string> ExecuteNonQueryPassingOutMultiPara(string CommandName, CommandType cmdType, SqlParameter[] param, List<string> OutPara)
        {
            List<string> result = null;
            SqlTransaction trans;
            using (SqlConnection con = new SqlConnection(CONNECTION_STRING))
            {
                if (con.State != ConnectionState.Open)
                {
                    con.Open();

                }
                trans = con.BeginTransaction();
                using (SqlCommand cmd = con.CreateCommand())
                {
                    cmd.Transaction = trans;
                    cmd.CommandType = cmdType;
                    cmd.CommandText = CommandName;
                    cmd.Parameters.AddRange(param);
                    cmd.Parameters[OutPara[0]].Direction = ParameterDirection.Output;
                    cmd.Parameters[OutPara[0]].Size = 0x100;
                    cmd.Parameters[OutPara[1]].Direction = ParameterDirection.Output;
                    cmd.Parameters[OutPara[1]].Size = 0x100;
                    try
                    {
                        cmd.ExecuteNonQuery();
                        result = new List<string>() { cmd.Parameters[OutPara[0]].Value.ToString(), cmd.Parameters[OutPara[1]].Value.ToString() };
                        trans.Commit();
                    }
                    catch (Exception ex)
                    {
                        trans.Rollback();
                        msg = ex.Message;
                        result = new List<string>() { msg, "" };
                    }
                    finally
                    {
                        trans.Dispose();
                        con.Close();
                    }
                }
            }

            return result;
        }
        internal int ExecuteNonQueryReturnInt(string CommandName, CommandType cmdType, SqlParameter[] param)
        {
            int result = 0;
            SqlTransaction trans;
            using (SqlConnection con = new SqlConnection(CONNECTION_STRING))
            {
                if (con.State != ConnectionState.Open)
                {
                    con.Open();

                }
                trans = con.BeginTransaction();
                using (SqlCommand cmd = con.CreateCommand())
                {
                    cmd.Transaction = trans;
                    cmd.CommandType = cmdType;
                    cmd.CommandText = CommandName;
                    param[param.Length - 1].Direction = ParameterDirection.Output;
                    param[param.Length - 1].Size = 0x100;
                    cmd.Parameters.AddRange(param);

                    try
                    {
                        cmd.ExecuteNonQuery();
                        result = Convert.ToInt32(cmd.Parameters["@result"].Value.ToString());
                        trans.Commit();
                    }
                    catch (Exception ex)
                    {
                        trans.Rollback();
                        msg = ex.Message;
                    }
                    finally
                    {
                        trans.Dispose();
                        con.Close();
                    }
                }
            }

            return result;
        }
        public void UpdateUserPasswordHash(int loginId, string newHash)
        {
            using (var conn = new SqlConnection(CONNECTION_STRING))
            {
                conn.Open();
                var cmd = new SqlCommand("UPDATE LoginTable SET Password = @hash WHERE LoginId = @id", conn);
                cmd.Parameters.AddWithValue("@hash", newHash);
                cmd.Parameters.AddWithValue("@id", loginId);
                cmd.ExecuteNonQuery();
            }
        }
        internal int ExecuteNonQueryReturnInt_UsingTimeOut(string CommandName, CommandType cmdType, SqlParameter[] param)
        {
            int result = 0;
            SqlTransaction trans;
            using (SqlConnection con = new SqlConnection(CONNECTION_STRING))
            {
                if (con.State != ConnectionState.Open)
                {
                    con.Open();

                }
                trans = con.BeginTransaction();
                using (SqlCommand cmd = con.CreateCommand())
                {
                    cmd.Transaction = trans;
                    cmd.CommandType = cmdType;
                    cmd.CommandTimeout = 600;
                    cmd.CommandText = CommandName;
                    param[param.Length - 1].Direction = ParameterDirection.Output;
                    param[param.Length - 1].Size = 0x100;
                    cmd.Parameters.AddRange(param);

                    try
                    {
                        cmd.ExecuteNonQuery();
                        result = Convert.ToInt32(cmd.Parameters["@result"].Value.ToString());
                        trans.Commit();
                    }
                    catch (Exception ex)
                    {
                        trans.Rollback();
                        msg = ex.Message;
                    }
                    finally
                    {
                        trans.Dispose();
                        con.Close();
                    }
                }
            }

            return result;
        }
        internal int ExecuteNonQueryParamIntTemp(string CommandName, CommandType cmdType, SqlParameter[] param, int parano)
        {
            int result = 0;
            SqlTransaction trans;
            using (SqlConnection con = new SqlConnection(CONNECTION_STRING))
            {
                if (con.State != ConnectionState.Open)
                {
                    con.Open();

                }
                trans = con.BeginTransaction();
                using (SqlCommand cmd = con.CreateCommand())
                {
                    cmd.Transaction = trans;
                    cmd.CommandType = cmdType;
                    cmd.CommandText = CommandName;
                    param[parano].Direction = ParameterDirection.Output;
                    param[parano].Size = 0x100;
                    cmd.Parameters.AddRange(param);
                    try
                    {
                        result = cmd.ExecuteNonQuery();
                        if (result == 1)
                        {
                            result = Convert.ToInt32(cmd.Parameters["@result"].Value.ToString());
                        }
                        trans.Commit();
                    }
                    catch (Exception ex)
                    {
                        trans.Rollback();
                        msg = ex.Message;
                    }
                    finally
                    {
                        trans.Dispose();
                        con.Close();
                    }
                }
            }

            return result;
        }
        internal int ExecuteScalar(string CommandName, CommandType cmdType, SqlParameter[] param)
        {
            int result = 0;
            SqlTransaction trans;
            using (SqlConnection con = new SqlConnection(CONNECTION_STRING))
            {
                if (con.State != ConnectionState.Open)
                {
                    con.Open();

                }
                trans = con.BeginTransaction();
                using (SqlCommand cmd = con.CreateCommand())
                {
                    cmd.Transaction = trans;
                    cmd.CommandType = cmdType;
                    cmd.CommandText = CommandName;
                    cmd.Parameters.AddRange(param);

                    try
                    {
                        result = Convert.ToInt32(cmd.ExecuteScalar());
                        trans.Commit();
                    }
                    catch (Exception ex)
                    {
                        trans.Rollback();
                        msg = ex.Message;
                    }
                    finally
                    {
                        trans.Dispose();
                        con.Close();
                    }
                }
            }

            return result;//(Convert.ToInt32(result) > 0);
        }
        //internal string ExecuteNonQueryReturnScalar(string CommandName, CommandType cmdType, SqlParameter[] param)
        //{
        //    string result = "";
        //    SqlTransaction trans;
        //    using (SqlConnection con = new SqlConnection(CONNECTION_STRING))
        //    {
        //        if (con.State != ConnectionState.Open)
        //        {
        //            con.Open();

        //        }
        //        trans = con.BeginTransaction();
        //        using (SqlCommand cmd = con.CreateCommand())
        //        {
        //            cmd.Transaction = trans;
        //            cmd.CommandType = cmdType;
        //            cmd.CommandText = CommandName;
        //            param[param.Length - 1].Direction = ParameterDirection.Output;
        //            param[param.Length - 1].Size = 0x5000000;
        //            cmd.Parameters.AddRange(param);
        //            try
        //            {
        //                cmd.ExecuteNonQuery();
        //                result = cmd.Parameters["@result"].Value.ToString();
        //                trans.Commit();
        //            }
        //            catch (Exception ex)
        //            {
        //                trans.Rollback();
        //                msg = ex.Message;
        //            }
        //            finally
        //            {
        //                trans.Dispose();
        //                con.Close();
        //            }
        //        }
        //    }
        //    return result;
        //}

        internal string ExecuteNonQueryReturnScalar(string CommandName, CommandType cmdType, SqlParameter[] param)
        {
            string result = "";
            SqlTransaction trans;
            using (SqlConnection con = new SqlConnection(CONNECTION_STRING))
            {
                if (con.State != ConnectionState.Open)
                {
                    con.Open();
                }
                trans = con.BeginTransaction();
                using (SqlCommand cmd = con.CreateCommand())
                {
                    cmd.Transaction = trans;
                    cmd.CommandType = cmdType;
                    cmd.CommandText = CommandName;

                    // ✅ Timeout set karo (e.g. 300 sec)
                    cmd.CommandTimeout = 600;

                    param[param.Length - 1].Direction = ParameterDirection.Output;
                    param[param.Length - 1].Size = 0x5000000;
                    cmd.Parameters.AddRange(param);

                    try
                    {
                        cmd.ExecuteNonQuery();
                        result = cmd.Parameters["@result"].Value.ToString();
                        trans.Commit();
                    }
                    catch (Exception ex)
                    {
                        trans.Rollback();
                        msg = ex.Message;
                    } 
                    finally
                    {
                        trans.Dispose();
                        con.Close();
                    }
                }
            }
            return result;
        }

    }
}