using DAL;

namespace BAL
{
    public class LoginBAL
    {
        
        public string UserName { get; set; }
        public string Password { get; set; }
        public string OldPassword { get; set; }
        public string LoginId { get; set; }
        public string NewPassword { get; set; }
        public string Action { get; set; }

        public string Photo { get; set; }
        
        public string Captcha { get; set; }
        public string CaptchaToken { get; set; }
    }
}