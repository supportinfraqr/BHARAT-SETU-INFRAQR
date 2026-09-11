from django.contrib import admin

from .models import (
    AppRole, User, UserCredential,
    ContractorProfile, EmployerProfile, GovernmentProfile, BssStaffProfile,
    Site, WorkerContractorBinding, ContractorJob, RozgarRequest,
    ConsentChallenge, SmsOtp,
    WorkerIdentity, WorkerAddressMobility, WorkerFamilyDependant,
    WorkerSocialSecurity, WorkerWelfareSafety, WorkerBanking,
    WorkerClassification, WorkerEmployment, SkillMaster,
    WorkerSkillsEmployability, WorkerOther, WorkerDocumentMaster, WorkerDocument,
    RbacPermission, QrRoleAccess, LookupValue, WorkerCategoryMaster,
    AttendanceDevice, Attendance, WorkerWages, WagePayment,
    WorkerGatePass, WorkerGrievance, DocumentAccessToken,
    DigiLockerProfile, DigiLockerDocument, DigiLockerSession,
)


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ("id", "username", "role", "account_active", "is_verified", "is_active")
    list_filter = ("role", "account_active", "is_verified")


for model in [
    AppRole, UserCredential, ContractorProfile, EmployerProfile,
    GovernmentProfile, BssStaffProfile,
    Site, WorkerContractorBinding, ContractorJob, RozgarRequest,
    ConsentChallenge, SmsOtp,
    WorkerIdentity, WorkerAddressMobility, WorkerFamilyDependant,
    WorkerSocialSecurity, WorkerWelfareSafety, WorkerBanking,
    WorkerClassification, WorkerEmployment, SkillMaster,
    WorkerSkillsEmployability, WorkerOther, WorkerDocumentMaster, WorkerDocument,
    RbacPermission, QrRoleAccess, LookupValue, WorkerCategoryMaster,
    AttendanceDevice, Attendance, WorkerWages, WagePayment,
    WorkerGatePass, WorkerGrievance, DocumentAccessToken,
    DigiLockerProfile, DigiLockerDocument, DigiLockerSession,
]:
    admin.site.register(model)
