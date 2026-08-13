using System;
using System.Collections.Generic;
using System.Text;
using System.Data;
using System.Data.SqlClient;
using System.Configuration;

/// <summary>
/// Summary description for SqlDBHelper
/// </summary>
public class SqlDBHelper
{
	public SqlDBHelper()
	{
        //
        // TODO: Add constructor logic here
        //
    }

    // public static string CONNECTION_STRING = "Data Source=103.86.176.182; DATABASE=dbdharikatourism; UID=dharikatourism;PASSWORD=Indus!@#123;Pooling=True;";
    public static string CONNECTION_STRING = "Data Source=103.191.208.88; DATABASE=dbdharikatourism; UID=dharikatourism;PASSWORD=Indus!@#123;Pooling=True;";
    
    
    
    


    internal static DataTable ExecuteSelectCommand(string CommandName, CommandType cmdType)
    {
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
                catch
                {
                    throw;
                }
            }
        }

        return table;
    }
    internal static DataTable ExecuteParamerizedSelectCommand(string CommandName, CommandType cmdType, SqlParameter[] param)
    {
        DataTable table = new DataTable();

        using (SqlConnection con = new SqlConnection(CONNECTION_STRING))
        {
            using (SqlCommand cmd = con.CreateCommand())
            {
                cmd.CommandType = cmdType;
                cmd.CommandText = CommandName;
                cmd.Parameters.AddRange(param);
                cmd.CommandTimeout = 60000;

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
                catch
                {
                    throw;
                }
            }
        }

        return table;
    }
    internal static DataSet ExecuteParamerizedSelectCommandds(string CommandName, CommandType cmdType, SqlParameter[] param)
    {
        DataSet ds = new DataSet();

        using (SqlConnection con = new SqlConnection(CONNECTION_STRING))
        {
            using (SqlCommand cmd = con.CreateCommand())
            {
                cmd.CommandType = cmdType;
                cmd.CommandText = CommandName;
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
                catch
                {
                    throw;
                }
            }
        }

        return ds;
    }

    // This function will be used to execute CUD(CRUD) operation of parameterized commands
    internal static string ExecuteNonQueryReturnScalar(string CommandName, CommandType cmdType, SqlParameter[] pars)
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
                pars[pars.Length - 1].Direction = ParameterDirection.Output;
                pars[pars.Length - 1].Size = 0x100;
                cmd.Parameters.AddRange(pars);
                try
                {
                    cmd.ExecuteNonQuery();
                    result = cmd.Parameters["@result"].Value.ToString();
                    trans.Commit();
                }
                catch (Exception ex)
                {
                    trans.Rollback();
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
    internal static int ExecuteNonQueryReturnInt(string CommandName, CommandType cmdType, SqlParameter[] param)
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
    internal static bool ExecuteNonQuery(string CommandName, CommandType cmdType, SqlParameter[] pars)
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
                cmd.Parameters.AddRange(pars);

                try
                {

                    result = cmd.ExecuteNonQuery();
                    trans.Commit();
                }
                catch
                {
                    trans.Rollback();
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
    internal static int ExecuteNonQueryParamIntTemp(string CommandName, CommandType cmdType, SqlParameter[] pars, int parano)
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
                pars[parano].Direction = ParameterDirection.Output;
                cmd.Parameters.AddRange(pars);
                try
                {
                    result = cmd.ExecuteNonQuery();
                    if (result > 0)
                    {
                        result = Convert.ToInt32(cmd.Parameters["@return"].Value.ToString());
                    }
                    trans.Commit();
                }
                catch
                {
                    trans.Rollback();
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

    public static void ExecuteNonQueryBulk1(DataTable dataTable)
    {

        using (SqlConnection con = new SqlConnection(CONNECTION_STRING))
        {
            if (con.State != ConnectionState.Open)
            {
                con.Open();

            }

            using (var bulkCopy = new SqlBulkCopy(CONNECTION_STRING, SqlBulkCopyOptions.KeepIdentity))
            {
                bulkCopy.ColumnMappings.Add("Pavillionid", "Pavillionid");
                bulkCopy.ColumnMappings.Add("Location", "Location");
                bulkCopy.ColumnMappings.Add("Sequence", "Sequence");

                bulkCopy.BulkCopyTimeout = 600;
                bulkCopy.DestinationTableName = "Master_Stalls";
                bulkCopy.WriteToServer(dataTable);
            }
        }


    }


}

