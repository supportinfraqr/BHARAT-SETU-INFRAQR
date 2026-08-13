using System;

namespace WebApplication_API.ViewModels
{
    public class UserSubRegOTPViewModels
    {


        public int RowId { get; set; }
        public string MobileNo { get; set; }
        public string EmailId { get; set; }
        public string MobileOtp { get; set; }
        public string EmailOtp { get; set; }
        public bool IsChkMobileOtp { get; set; }
        public bool IsChkEmailOtp { get; set; }
        public int CompanyId { get; set; }
        public int OrganizationId { get; set; }
        public int LastLoginId { get; set; }
        public int LastUpdateBy { get; set; }
        public DateTime? LastUpdateDate { get; set; }
        public DateTime? CreationDate { get; set; }
        public DateTime? EndDate { get; set; }
        public DateTime? ActiveDate { get; set; }
        public string Attribute1 { get; set; }
        public string Attribute2 { get; set; }
        public string Attribute3 { get; set; }
        public string Attribute4 { get; set; }
        public string Attribute5 { get; set; }
        public string Attribute6 { get; set; }

        public int UserId { get; set; }
        public int Employeeid { get; set; }
        public string Name { get; set; }
        public string Username { get; set; }
        public string Password { get; set; }
        public int? Status { get; set; }
        public int? CreatedBy { get; set; }
        public int? LastUpdatedBy { get; set; }
        public int? LedgerId { get; set; }
        public int? Admin { get; set; }
        public string AdminRoleFlag { get; set; }
        public string AttributeContext { get; set; }
        public bool? IsActive { get; set; }
        public bool? IsDeleted { get; set; }
        public string Uaddress { get; set; }
        public int? CityId { get; set; }
        public int? StateId { get; set; }
        public int? CountryId { get; set; }
        public string Gstnno { get; set; }
        public string RegComName { get; set; }
        public int UserSubscriptionId { get; set; }
        public int SubscriptionId { get; set; }
        public string Description { get; set; }
        public int? OrgId { get; set; }
        public int? PinCode { get; set; }



    }
}
