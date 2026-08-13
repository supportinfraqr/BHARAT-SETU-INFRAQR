using BAL;
using System.Collections.Generic;
using System.Data;
using System.Data.SqlClient;
using System.Threading.Tasks;

namespace DAL
{
    public partial class DLL
    {
        public async static Task<string> AddCourse(SkillBAL obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@Action", obj.Action),
                new SqlParameter("@id", obj.id),
                new SqlParameter("@Title", obj.Title),
                new SqlParameter("@CourseDesc", obj.CourseDesc),
                new SqlParameter("@CourseCoverPage", obj.CourseCoverPage_Preview),
                new SqlParameter("@Loginid", obj.Loginid),

                // Module Details
                new SqlParameter("@CourseId", obj.CourseId),
                new SqlParameter("@Modulename", obj.Modulename),
                new SqlParameter("@ModuleDesc", obj.ModuleDesc),
                new SqlParameter("@Sequence", obj.Sequence),
                new SqlParameter("@Publish", obj.Publish),

                new SqlParameter("@RESULT", "")
                
            };

            return await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteNonQueryReturnScalar("USP_SkillTrainingProgram", CommandType.StoredProcedure,
                    param.ToArray()));
        }

        public async static Task<string> UpdateFlags(SkillBAL obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@Action", obj.Action),
                new SqlParameter("@id", obj.id),
                new SqlParameter("@Loginid", obj.Loginid), 
                new SqlParameter("@Lessonorder", obj.Lessonorder),
                new SqlParameter("@VideoOrder", obj.VideoOrder),
                new SqlParameter("@OnlyPublished", obj.OnlyPublished),
                new SqlParameter("@AutoCertificate", obj.AutoCertificate),
                new SqlParameter("@BroserVisibility", obj.BroserVisibility),
                new SqlParameter("@MobileVisibility", obj.MobileVisibility),

                  new SqlParameter("@LimitVideo", obj.LimitVideo),
                    new SqlParameter("@StartDate", obj.StartDate),
                      new SqlParameter("@EndDate", obj.EndDate),
                        new SqlParameter("@CourseReminder", obj.CourseReminder),
                          new SqlParameter("@MobileVisibility", obj.MobileVisibility),
               
        new SqlParameter("@RESULT", "")

            };

            return await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteNonQueryReturnScalar("USP_SkillTrainingProgram", CommandType.StoredProcedure,
                    param.ToArray()));
        }

        public async static Task<DataTable> GetCourseDetail(SkillBAL obj)
        {
            var param = new List<SqlParameter>
            {
              new SqlParameter("@Action", obj.Action),
              new SqlParameter("@id", obj.id),
              new SqlParameter("@CourseId", obj.CourseId),
              new SqlParameter("@Loginid", obj.Loginid),

            };
            DataTable dt = await Task.Factory.StartNew(() => SqlDBHelper.SqlHelper.ExecuteParamerizedSelectCommand("USP_SkillTrainingProgram", CommandType.StoredProcedure, param.ToArray()));
            return dt;
        }

        public async static Task<string> SaveVideo(VideoBAL obj)
        {
            var param = new List<SqlParameter>
            {
                new SqlParameter("@Action", obj.Action),
                new SqlParameter("@id", obj.id),
                    new SqlParameter("@Moduleid", obj.Moduleid),
                new SqlParameter("@Title", obj.Title),
                new SqlParameter("@CourseId", obj.CourseId),
                new SqlParameter("@CourseDesc", obj.Description),
                new SqlParameter("@Thumbnail", obj.ThumbnailFile_Preview),
                new SqlParameter("@Video", obj.VideoFile_Preview),
                new SqlParameter("@Loginid", obj.Loginid),
                new SqlParameter("@RESULT", "")
            };

            return await Task.Factory.StartNew(() =>
                SqlDBHelper.SqlHelper.ExecuteNonQueryReturnScalar(
                    "USP_SkillTrainingProgram",
                    CommandType.StoredProcedure,
                    param.ToArray()
                ));
        }
    }
}