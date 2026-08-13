using System;
using System.Data.SqlClient;
using System.IO;
using System.Web.Mvc;

namespace EesassinErp.Controllers
{
    public class BackupServiceController : Controller
    {
        // GET: BackupService
        public void BackupDatabase()
        {
            string connectionString = "Server=13.202.27.216;Initial Catalog=eesassinuat_uat1;MultipleActiveResultSets=true;User ID=retail;Password=ezretail@123;Pooling=True;";
            string backupFolder = @"C:\Backup";
            string fileName = $"EzComplianceDB_{DateTime.Now:yyyyMMdd_HHmmss}.bak";
            string backupPath = Path.Combine(backupFolder, fileName);

            try
            {
                if (!Directory.Exists(backupFolder))
                    Directory.CreateDirectory(backupFolder);

                using (SqlConnection conn = new SqlConnection(connectionString))
                {
                    string sqlQuery = $"BACKUP DATABASE eesassinuat_uat1 TO DISK = '{backupPath}' WITH FORMAT, INIT, NAME = 'eesassinuat_uat1-Full Backup'";
                    SqlCommand cmd = new SqlCommand(sqlQuery, conn);
                    conn.Open();
                    cmd.ExecuteNonQuery();
                }

                Console.WriteLine("Database Backup Successful: " + backupPath);
            }
            catch (Exception ex)
            {
                Console.WriteLine("Error: " + ex.Message);
            }
        }
    }
}