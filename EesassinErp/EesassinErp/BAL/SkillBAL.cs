using System;
using System.Collections.Generic;
using System.Web;

namespace BAL
{
    public class SkillBAL
    {
        public string Action { get; set; }
       
        public string LimitVideo { get; set; }
        public string StartDate { get; set; }
        public string EndDate { get; set; } 
        public string CourseReminder { get; set; }


        
        public int id { get; set; }
        public string isflag { get; set; }
        public string Title { get; set; }
        public string CourseDesc { get; set; }
        public int Loginid { get; set; }
        public string CourseCoverPage_Preview { get; set; }
         
        public int CourseId { get; set; }
        public string Modulename { get; set; }
        public string ModuleDesc { get; set; }
        public string Sequence { get; set; }
        public string Publish { get; set; }

        // for Program Requirements
        public string Lessonorder { get; set; }
        public string VideoOrder { get; set; }
        public string OnlyPublished { get; set; }
        public string AutoCertificate { get; set; }
        public string BroserVisibility { get; set; }
        public string MobileVisibility { get; set; }

        public List<VideoBAL> Videos { get; set; }
    }
    public class VideoBAL
    {
        public string Action { get; set; }
        public string id { get; set; }
        public string CourseId { get; set; }
        public string Moduleid { get; set; }
        public int Loginid { get; set; }
        public string Title { get; set; }
        public string Description { get; set; }
        public string ThumbnailFile_Preview { get; set; }
        public string VideoFile_Preview { get; set; }
        public HttpPostedFileBase VideoFile { get; set; }

    }

}