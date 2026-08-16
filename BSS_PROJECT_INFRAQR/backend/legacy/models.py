"""Legacy reference tables, now managed in PostgreSQL.

The data was originally copied from the BharatSharamShetu SQL Server database.
These are managed Django models so Postgres owns them fully (no external DB).
"""
from django.db import models


class LoginTable(models.Model):
    LoginId = models.IntegerField(primary_key=True, db_column="LoginId")
    UserName = models.CharField(max_length=100, db_column="UserName", blank=True, null=True)
    Password = models.CharField(max_length=200, db_column="Password", blank=True, null=True)
    MapId = models.IntegerField(db_column="MapId", null=True, blank=True)
    Name = models.CharField(max_length=200, db_column="Name", blank=True, null=True)
    FatherName = models.CharField(max_length=200, db_column="FatherName", blank=True, null=True)
    Gender = models.CharField(max_length=20, db_column="Gender", blank=True, null=True)
    Designation = models.CharField(max_length=100, db_column="Designation", blank=True, null=True)
    Address = models.CharField(max_length=500, db_column="Address", blank=True, null=True)
    ContactNo = models.CharField(max_length=20, db_column="ContactNo", blank=True, null=True)
    EmailId = models.CharField(max_length=200, db_column="EmailId", blank=True, null=True)
    Photo = models.CharField(max_length=500, db_column="Photo", blank=True, null=True)
    LoginType = models.CharField(max_length=50, db_column="LoginType", blank=True, null=True)
    CreatedOn = models.CharField(max_length=50, db_column="CreatedOn", blank=True, null=True)
    LastLogin = models.CharField(max_length=50, db_column="LastLogin", blank=True, null=True)
    BranchCode = models.CharField(max_length=50, db_column="BranchCode", blank=True, null=True)
    IsActive = models.CharField(db_column="IsActive", max_length=10, blank=True, null=True)
    Session = models.CharField(db_column="Session", max_length=100, blank=True, null=True)
    SessionId = models.CharField(max_length=100, db_column="SessionId", blank=True, null=True)
    UpdatedOn = models.CharField(max_length=50, db_column="UpdatedOn", blank=True, null=True)
    OldPass = models.CharField(max_length=200, db_column="OldPass", blank=True, null=True)
    Otp = models.CharField(max_length=20, db_column="Otp", blank=True, null=True)
    MPIN = models.CharField(max_length=100, db_column="MPIN", blank=True, null=True)
    CurrentStep = models.CharField(max_length=50, db_column="CurrentStep", blank=True, null=True)
    DigiLockerId = models.CharField(max_length=100, db_column="DigiLockerId", blank=True, null=True)

    class Meta:
        db_table = "bss_legacy_dbo_logintable"


class EmployeeMaster(models.Model):
    Id = models.BigAutoField(primary_key=True, db_column="Id")
    EmployeeCode = models.CharField(max_length=100, db_column="EmployeeCode", blank=True, null=True)
    RefEmployeeCode = models.CharField(max_length=100, db_column="RefEmployeeCode", blank=True, null=True)
    EmployeeName = models.CharField(max_length=200, db_column="EmployeeName", blank=True, null=True)
    EmployeeDesignation = models.CharField(max_length=200, db_column="EmployeeDesignation", blank=True, null=True)
    EmployeeDepartment = models.CharField(max_length=200, db_column="EmployeeDepartment", blank=True, null=True)
    Father_Husband_Name = models.CharField(max_length=200, db_column="Father_Husband_Name", blank=True, null=True)
    Gendar = models.CharField(max_length=20, db_column="Gendar", blank=True, null=True)
    MaritalStatus = models.CharField(max_length=50, db_column="MaritalStatus", blank=True, null=True)
    DateOfBirth = models.CharField(max_length=50, db_column="DateOfBirth", blank=True, null=True)
    DOJ = models.CharField(max_length=50, db_column="DOJ", blank=True, null=True)
    PresentAddress = models.TextField(db_column="PresentAddress", blank=True, null=True)
    MobileNumber = models.CharField(max_length=20, db_column="MobileNumber", blank=True, null=True)
    PANNumber = models.CharField(max_length=50, db_column="PANNumber", blank=True, null=True)
    AdharCardNumber = models.CharField(max_length=50, db_column="AdharCardNumber", blank=True, null=True)
    PreviousUAN = models.CharField(max_length=50, db_column="PreviousUAN", blank=True, null=True)
    PreviousESI = models.CharField(max_length=100, db_column="PreviousESI", blank=True, null=True)
    EmployeePhotos = models.CharField(max_length=500, db_column="EmployeePhotos", blank=True, null=True)
    PanCardName = models.CharField(max_length=200, db_column="PanCardName", blank=True, null=True)
    AadharName = models.CharField(max_length=200, db_column="AadharName", blank=True, null=True)
    UanName = models.CharField(max_length=200, db_column="UanName", blank=True, null=True)
    ESICName = models.CharField(max_length=200, db_column="ESICName", blank=True, null=True)
    Status = models.CharField(max_length=50, db_column="Status", blank=True, null=True)
    Flag = models.CharField(max_length=50, db_column="Flag", blank=True, null=True)
    State = models.CharField(max_length=200, db_column="State", blank=True, null=True)
    Site = models.CharField(max_length=200, db_column="Site", blank=True, null=True)
    PFAccount = models.CharField(max_length=50, db_column="PFAccount", blank=True, null=True)
    BankAccountNumber = models.CharField(max_length=50, db_column="BankAccountNumber", blank=True, null=True)
    GrossSalary = models.CharField(max_length=50, db_column="GrossSalary", blank=True, null=True)
    StoreCode = models.CharField(max_length=50, db_column="StoreCode", blank=True, null=True)
    UserId = models.IntegerField(db_column="UserId", null=True, blank=True)
    PartyId = models.CharField(max_length=100, db_column="PartyId", blank=True, null=True)
    IsActive = models.CharField(db_column="IsActive", max_length=10, blank=True, null=True)

    class Meta:
        db_table = "bss_legacy_rtl_employeemaster"


class StoreMaster(models.Model):
    Id = models.BigAutoField(primary_key=True, db_column="Id")
    PartyTypeId = models.TextField(db_column="PartyTypeId", blank=True, null=True)
    SequenceNumber = models.IntegerField(db_column="SequenceNumber", null=True, blank=True)
    StoreCode = models.CharField(max_length=50, db_column="StoreCode", blank=True, null=True)
    RefStoreCode = models.CharField(max_length=50, db_column="RefStoreCode", blank=True, null=True)
    StoreName = models.CharField(max_length=200, db_column="StoreName", blank=True, null=True)
    Category = models.CharField(max_length=100, db_column="Category", blank=True, null=True)
    StoreLocation = models.CharField(max_length=200, db_column="StoreLocation", blank=True, null=True)
    CompleteAddress = models.CharField(max_length=500, db_column="CompleteAddress", blank=True, null=True)
    CreatedBy = models.IntegerField(db_column="CreatedBy", null=True, blank=True)
    IsActive = models.CharField(db_column="IsActive", max_length=10, blank=True, null=True)
    DaysOfExpire = models.IntegerField(db_column="DaysOfExpire", null=True, blank=True)
    RegionId = models.FloatField(db_column="RegionId", null=True, blank=True)
    CityId = models.TextField(db_column="CityId", blank=True, null=True)
    UTA = models.IntegerField(db_column="UTA", null=True, blank=True)
    ProposedDate = models.DateField(db_column="ProposedDate", null=True, blank=True)
    RentAgreement = models.TextField(db_column="RentAgreement", blank=True, null=True)

    class Meta:
        db_table = "bss_legacy_rtl_storemaster"


class PartyMaster(models.Model):
    PartyId = models.AutoField(primary_key=True, db_column="PartyId")
    PartyCode = models.CharField(max_length=100, db_column="PartyCode", blank=True, null=True)
    PartyType = models.CharField(max_length=100, db_column="PartyType", blank=True, null=True)
    VendorId = models.CharField(max_length=100, db_column="VendorId", blank=True, null=True)
    PartyName = models.CharField(max_length=300, db_column="PartyName", blank=True, null=True)
    Address = models.CharField(max_length=500, db_column="Address", blank=True, null=True)
    EmailId = models.CharField(max_length=300, db_column="EmailId", blank=True, null=True)
    Pincode = models.CharField(max_length=50, db_column="Pincode", blank=True, null=True)
    ContactNo = models.CharField(max_length=50, db_column="ContactNo", blank=True, null=True)
    IsActive = models.BooleanField(db_column="IsActive", blank=True, null=True)
    BankDetails = models.CharField(max_length=500, db_column="BankDetails", blank=True, null=True)
    RegistrationType = models.CharField(max_length=200, db_column="RegistrationType", blank=True, null=True)
    PANITNO = models.CharField(max_length=100, db_column="PANITNO", blank=True, null=True)
    GSTINUIN = models.CharField(max_length=100, db_column="GSTINUIN", blank=True, null=True)
    ContactPerson = models.CharField(max_length=200, db_column="ContactPerson", blank=True, null=True)
    ContactMobile = models.CharField(max_length=50, db_column="ContactMobile", blank=True, null=True)
    Descritpion = models.CharField(max_length=500, db_column="Descritpion", blank=True, null=True)
    CreatedOn = models.DateTimeField(db_column="CreatedOn", blank=True, null=True)
    UpdateOn = models.DateTimeField(db_column="UpdateOn", blank=True, null=True)
    LAST_LOGIN_ID = models.IntegerField(db_column="LAST_LOGIN_ID", blank=True, null=True)
    CREATED_BY = models.IntegerField(db_column="CREATED_BY", blank=True, null=True)
    LAST_UPDATE_BY = models.CharField(max_length=100, db_column="LAST_UPDATE_BY", blank=True, null=True)
    ATTRIBUTE1 = models.CharField(max_length=500, db_column="ATTRIBUTE1", blank=True, null=True)
    ATTRIBUTE2 = models.CharField(max_length=500, db_column="ATTRIBUTE2", blank=True, null=True)
    ATTRIBUTE3 = models.CharField(max_length=500, db_column="ATTRIBUTE3", blank=True, null=True)
    ATTRIBUTE4 = models.CharField(max_length=500, db_column="ATTRIBUTE4", blank=True, null=True)
    ATTRIBUTE5 = models.CharField(max_length=500, db_column="ATTRIBUTE5", blank=True, null=True)
    ATTRIBUTE6 = models.CharField(max_length=500, db_column="ATTRIBUTE6", blank=True, null=True)
    IsDeleted = models.BooleanField(db_column="IsDeleted", blank=True, null=True)
    EmpId = models.IntegerField(db_column="EmpId", blank=True, null=True)
    StoreLimit = models.IntegerField(db_column="StoreLimit", blank=True, null=True)
    ValidTo = models.CharField(max_length=50, db_column="ValidTo", blank=True, null=True)
    PartyDate = models.CharField(max_length=50, db_column="PartyDate", blank=True, null=True)
    Industry = models.CharField(max_length=100, db_column="Industry", blank=True, null=True)
    MonthExpired = models.IntegerField(db_column="MonthExpired", blank=True, null=True)
    UserLimit = models.IntegerField(db_column="UserLimit", blank=True, null=True)
    ContractorLimit = models.CharField(max_length=100, db_column="ContractorLimit", blank=True, null=True)
    Sitelimit = models.CharField(max_length=100, db_column="Sitelimit", blank=True, null=True)
    startdt = models.DateField(db_column="startdt", blank=True, null=True)
    State = models.CharField(max_length=200, db_column="State", blank=True, null=True)
    City = models.CharField(max_length=200, db_column="City", blank=True, null=True)
    LIN = models.CharField(max_length=100, db_column="LIN", blank=True, null=True)
    isFlagg = models.CharField(max_length=50, db_column="isFlagg", blank=True, null=True)
    sitenm = models.CharField(max_length=200, db_column="sitenm", blank=True, null=True)

    class Meta:
        db_table = "bss_legacy_evm_tbl_partymaster"


class Location(models.Model):
    Id = models.AutoField(primary_key=True, db_column="Id")
    PartyId = models.IntegerField(db_column="PartyId", blank=True, null=True)
    SiteId = models.IntegerField(db_column="SiteId", blank=True, null=True)
    Location = models.CharField(max_length=500, db_column="Location", blank=True, null=True)
    Createdby = models.IntegerField(db_column="Createdby", blank=True, null=True)
    CreatedOn = models.DateTimeField(db_column="CreatedOn", blank=True, null=True)

    class Meta:
        db_table = "bss_legacy_dbo_location"


class SiteManager(models.Model):
    SiteId = models.AutoField(primary_key=True, db_column="SiteId")
    Automation = models.CharField(max_length=100, db_column="Automation", blank=True, null=True)
    SiteCode = models.CharField(max_length=100, db_column="SiteCode", blank=True, null=True)
    PartyID = models.IntegerField(db_column="PartyID", blank=True, null=True)
    PartyType = models.CharField(max_length=100, db_column="PartyType", blank=True, null=True)
    SiteName = models.CharField(max_length=300, db_column="SiteName", blank=True, null=True)
    Address = models.CharField(max_length=500, db_column="Address", blank=True, null=True)
    CityID = models.IntegerField(db_column="CityID", blank=True, null=True)
    StateID = models.IntegerField(db_column="StateID", blank=True, null=True)
    CountryID = models.IntegerField(db_column="CountryID", blank=True, null=True)
    Pincode = models.CharField(max_length=50, db_column="Pincode", blank=True, null=True)
    LocationCode = models.CharField(max_length=100, db_column="LocationCode", blank=True, null=True)
    EmailId = models.CharField(max_length=300, db_column="EmailId", blank=True, null=True)
    ContactNo = models.CharField(max_length=50, db_column="ContactNo", blank=True, null=True)
    Description = models.CharField(max_length=500, db_column="Description", blank=True, null=True)
    IsActive = models.CharField(max_length=50, db_column="IsActive", blank=True, null=True)
    BankDetails = models.CharField(max_length=500, db_column="BankDetails", blank=True, null=True)
    AccountNo = models.CharField(max_length=100, db_column="AccountNo", blank=True, null=True)
    RegistrationType = models.CharField(max_length=200, db_column="RegistrationType", blank=True, null=True)
    PANITNO = models.CharField(max_length=100, db_column="PANITNO", blank=True, null=True)
    GSTINUIN = models.CharField(max_length=100, db_column="GSTINUIN", blank=True, null=True)
    CLRARC = models.CharField(max_length=100, db_column="CLRARC", blank=True, null=True)
    CLRLIC = models.CharField(max_length=100, db_column="CLRLIC", blank=True, null=True)
    ContactPerson = models.CharField(max_length=200, db_column="ContactPerson", blank=True, null=True)
    ContactMobile = models.CharField(max_length=50, db_column="ContactMobile", blank=True, null=True)
    Descritpion = models.CharField(max_length=500, db_column="Descritpion", blank=True, null=True)
    ValidFrom = models.CharField(max_length=50, db_column="ValidFrom", blank=True, null=True)
    ValidTo = models.CharField(max_length=50, db_column="ValidTo", blank=True, null=True)
    Manpowertype = models.CharField(max_length=100, db_column="Manpowertype", blank=True, null=True)
    ManPowerCount = models.CharField(max_length=50, db_column="ManPowerCount", blank=True, null=True)
    CREATED_BY = models.IntegerField(db_column="CREATED_BY", blank=True, null=True)
    CreatedOn = models.DateTimeField(db_column="CreatedOn", blank=True, null=True)
    LAST_UPDATE_BY = models.CharField(max_length=100, db_column="LAST_UPDATE_BY", blank=True, null=True)
    UpdateOn = models.DateTimeField(db_column="UpdateOn", blank=True, null=True)
    IsDeleted = models.BooleanField(db_column="IsDeleted", blank=True, null=True)

    class Meta:
        db_table = "bss_legacy_evm_tbl_sitemanager"


class LWFCompliance(models.Model):
    Id = models.AutoField(primary_key=True, db_column="Id")
    State = models.CharField(max_length=200, db_column="State", blank=True, null=True)
    Status = models.CharField(max_length=100, db_column="Status", blank=True, null=True)
    MinAmt = models.CharField(max_length=100, db_column="MinAmt", blank=True, null=True)
    MaxAmt = models.CharField(max_length=100, db_column="MaxAmt", blank=True, null=True)
    EmployeeShare = models.CharField(max_length=100, db_column="EmployeeShare", blank=True, null=True)
    EmployerShare = models.CharField(max_length=100, db_column="EmployerShare", blank=True, null=True)
    Month = models.CharField(max_length=100, db_column="Month", blank=True, null=True)
    Type = models.CharField(max_length=100, db_column="Type", blank=True, null=True)
    DesignationAvail = models.CharField(max_length=100, db_column="DesignationAvail", blank=True, null=True)
    Designation = models.CharField(max_length=200, db_column="Designation", blank=True, null=True)
    Effectivefrom = models.DateField(db_column="Effectivefrom", blank=True, null=True)
    Effectiveto = models.DateField(db_column="Effectiveto", blank=True, null=True)
    CreatedBy = models.IntegerField(db_column="CreatedBy", blank=True, null=True)
    CreatedOn = models.DateTimeField(db_column="CreatedOn", blank=True, null=True)
    UpdatedBy = models.IntegerField(db_column="UpdatedBy", blank=True, null=True)
    Updatedon = models.DateField(db_column="Updatedon", blank=True, null=True)

    class Meta:
        db_table = "bss_legacy_dbo_lwfcompliances"


class MinimumWageCompliance(models.Model):
    Id = models.AutoField(primary_key=True, db_column="Id")
    State = models.CharField(max_length=200, db_column="State", blank=True, null=True)
    Industry = models.CharField(max_length=100, db_column="Industry", blank=True, null=True)
    EffectiveFrom = models.DateField(db_column="EffectiveFrom", blank=True, null=True)
    EffectiveTo = models.DateField(db_column="EffectiveTo", blank=True, null=True)
    Status = models.CharField(max_length=100, db_column="Status", blank=True, null=True)
    PaymentFrequency = models.CharField(max_length=100, db_column="PaymentFrequency", blank=True, null=True)
    YearlyperBonus = models.CharField(max_length=100, db_column="YearlyperBonus", blank=True, null=True)
    PayoutMonth = models.CharField(max_length=100, db_column="PayoutMonth", blank=True, null=True)
    Grade = models.CharField(max_length=100, db_column="Grade", blank=True, null=True)
    EmploymentCategory = models.CharField(max_length=200, db_column="EmploymentCategory", blank=True, null=True)
    Zone = models.CharField(max_length=200, db_column="Zone", blank=True, null=True)
    BasicPermonth = models.CharField(max_length=100, db_column="BasicPermonth", blank=True, null=True)
    VDAPerMonth = models.CharField(max_length=100, db_column="VDAPerMonth", blank=True, null=True)
    TotalPermonth = models.CharField(max_length=100, db_column="TotalPermonth", blank=True, null=True)
    MinWage = models.CharField(max_length=100, db_column="MinWage", blank=True, null=True)
    Floorwage = models.CharField(max_length=100, db_column="Floorwage", blank=True, null=True)
    CreatedOn = models.DateField(db_column="CreatedOn", blank=True, null=True)
    CreatedBy = models.IntegerField(db_column="CreatedBy", blank=True, null=True)
    UpdatedBy = models.IntegerField(db_column="UpdatedBy", blank=True, null=True)
    UpdatedOn = models.DateTimeField(db_column="UpdatedOn", blank=True, null=True)

    class Meta:
        db_table = "bss_legacy_dbo_minimumwagescompliance"


class ProfessionalTaxCompliance(models.Model):
    Id = models.AutoField(primary_key=True, db_column="Id")
    State = models.CharField(max_length=200, db_column="State", blank=True, null=True)
    Status = models.CharField(max_length=100, db_column="Status", blank=True, null=True)
    DeductionCycle = models.CharField(max_length=100, db_column="DeductionCycle", blank=True, null=True)
    PTNumber = models.CharField(max_length=100, db_column="PTNumber", blank=True, null=True)
    Applicability = models.CharField(max_length=200, db_column="Applicability", blank=True, null=True)
    Payment = models.CharField(max_length=100, db_column="Payment", blank=True, null=True)
    ApplicationLink = models.CharField(max_length=500, db_column="ApplicationLink", blank=True, null=True)
    GovtFees = models.CharField(max_length=100, db_column="GovtFees", blank=True, null=True)
    DepositeAmt = models.CharField(max_length=100, db_column="DepositeAmt", blank=True, null=True)
    EffectiveFrom = models.DateField(db_column="EffectiveFrom", blank=True, null=True)
    Effectiveto = models.DateField(db_column="Effectiveto", blank=True, null=True)
    CreatedBy = models.IntegerField(db_column="CreatedBy", blank=True, null=True)
    CreatedOn = models.DateTimeField(db_column="CreatedOn", blank=True, null=True)
    UpdatedBy = models.IntegerField(db_column="UpdatedBy", blank=True, null=True)
    UpdateOn = models.DateTimeField(db_column="UpdateOn", blank=True, null=True)

    class Meta:
        db_table = "bss_legacy_dbo_professionaltaxcompliance"


class LicenseManagementCompliance(models.Model):
    Id = models.AutoField(primary_key=True, db_column="Id")
    LicensesName = models.CharField(max_length=300, db_column="LicensesName", blank=True, null=True)
    State = models.CharField(max_length=200, db_column="State", blank=True, null=True)
    ApplicabilityCount = models.CharField(max_length=100, db_column="ApplicabilityCount", blank=True, null=True)
    GovtFee = models.CharField(max_length=100, db_column="GovtFee", blank=True, null=True)
    SecuritydepositeAmt = models.CharField(max_length=100, db_column="SecuritydepositeAmt", blank=True, null=True)
    Createdby = models.IntegerField(db_column="Createdby", blank=True, null=True)
    CreatedOn = models.DateTimeField(db_column="CreatedOn", blank=True, null=True)
    UpdatedBy = models.IntegerField(db_column="UpdatedBy", blank=True, null=True)
    UpdatedOn = models.DateTimeField(db_column="UpdatedOn", blank=True, null=True)

    class Meta:
        db_table = "bss_legacy_dbo_licensemanagementcompliance"


class PtComplianceSlab(models.Model):
    Id = models.AutoField(primary_key=True, db_column="Id")
    Pid = models.IntegerField(db_column="Pid", blank=True, null=True)
    StartAmt = models.CharField(max_length=100, db_column="StartAmt", blank=True, null=True)
    EndAmt = models.CharField(max_length=100, db_column="EndAmt", blank=True, null=True)
    MonthlyAmt = models.CharField(max_length=100, db_column="MonthlyAmt", blank=True, null=True)
    CreatedBy = models.IntegerField(db_column="CreatedBy", blank=True, null=True)
    CreatedOn = models.DateTimeField(db_column="CreatedOn", blank=True, null=True)
    Updatedby = models.IntegerField(db_column="Updatedby", blank=True, null=True)
    UpdatedOn = models.DateTimeField(db_column="UpdatedOn", blank=True, null=True)

    class Meta:
        db_table = "bss_legacy_dbo_ptcomplianceslabs"


class Industry(models.Model):
    Id = models.AutoField(primary_key=True, db_column="Id")
    Industry = models.CharField(max_length=300, db_column="Industry", blank=True, null=True)
    Act = models.CharField(max_length=200, db_column="Act", blank=True, null=True)
    Createdon = models.DateTimeField(db_column="Createdon", blank=True, null=True)

    class Meta:
        db_table = "bss_legacy_rtl_industry"


class Country(models.Model):
    CountryId = models.BigIntegerField(primary_key=True, db_column="CountryId")
    CountryName = models.CharField(max_length=200, db_column="CountryName", blank=True, null=True)
    CountryCode = models.CharField(max_length=50, db_column="CountryCode", blank=True, null=True)
    IsActive = models.BooleanField(db_column="IsActive", blank=True, null=True)
    CreatedBy = models.BigIntegerField(db_column="CreatedBy", blank=True, null=True)
    CreatedDate = models.DateTimeField(db_column="CreatedDate", blank=True, null=True)
    UpdatedBy = models.BigIntegerField(db_column="UpdatedBy", blank=True, null=True)
    UpdatedDate = models.DateTimeField(db_column="UpdatedDate", blank=True, null=True)
    IPAddress = models.CharField(max_length=100, db_column="IPAddress", blank=True, null=True)

    class Meta:
        db_table = "bss_legacy_evm_m_country"


class State(models.Model):
    SATE_CODE = models.FloatField(primary_key=True, db_column="SATE_CODE")
    COUNTRY_CODE = models.FloatField(db_column="COUNTRY_CODE", blank=True, null=True)
    STATE_NM = models.CharField(max_length=300, db_column="STATE_NM", blank=True, null=True)
    END_DATE = models.DateTimeField(db_column="END_DATE", blank=True, null=True)
    LAST_LOGIN_ID = models.FloatField(db_column="LAST_LOGIN_ID", blank=True, null=True)
    CREATED_BY = models.FloatField(db_column="CREATED_BY", blank=True, null=True)
    LAST_UPDATE_BY = models.CharField(max_length=100, db_column="LAST_UPDATE_BY", blank=True, null=True)
    LAST_UPDATE_DATE = models.DateTimeField(db_column="LAST_UPDATE_DATE", blank=True, null=True)
    CREATION_DATE = models.DateTimeField(db_column="CREATION_DATE", blank=True, null=True)

    class Meta:
        db_table = "bss_legacy_evm_tbl_state"


class City(models.Model):
    CITY_CODE = models.FloatField(primary_key=True, db_column="CITY_CODE")
    CITY_NAME = models.CharField(max_length=300, db_column="CITY_NAME", blank=True, null=True)
    STATE_NAME = models.CharField(max_length=300, db_column="STATE_NAME", blank=True, null=True)
    STATE_ID = models.FloatField(db_column="STATE_ID", blank=True, null=True)

    class Meta:
        db_table = "bss_legacy_evm_tbl_city"


class MaintainLog(models.Model):
    Id = models.BigAutoField(primary_key=True, db_column="Id")
    UserId = models.IntegerField(db_column="UserId", null=True, blank=True)
    Activity = models.TextField(db_column="Activity", blank=True, null=True)
    MachineName = models.CharField(max_length=200, db_column="MachineName", blank=True, null=True)
    SystemUserName = models.CharField(max_length=200, db_column="SystemUserName", blank=True, null=True)
    CreatedOn = models.CharField(max_length=50, db_column="CreatedOn", blank=True, null=True)

    class Meta:
        db_table = "bss_legacy_dbo_maintainlog"


class ModuleMaster(models.Model):
    ModuleId = models.IntegerField(primary_key=True, db_column="ModuleId")
    Name = models.CharField(max_length=200, db_column="Name", blank=True, null=True)
    DisplayOrder = models.IntegerField(db_column="DisplayOrder", null=True, blank=True)
    Icon = models.CharField(max_length=100, db_column="Icon", blank=True, null=True)

    class Meta:
        db_table = "bss_legacy_dbo_modulemaster"
        ordering = ["DisplayOrder"]


class MenuMaster(models.Model):
    MenuId = models.IntegerField(primary_key=True, db_column="MenuId")
    ModuleId = models.IntegerField(db_column="ModuleId", null=True, blank=True)
    Name = models.CharField(max_length=200, db_column="Name", blank=True, null=True)
    Url = models.CharField(max_length=500, db_column="Url", blank=True, null=True)
    DisplayOrder = models.IntegerField(db_column="DisplayOrder", null=True, blank=True)
    Icon = models.CharField(max_length=100, db_column="Icon", blank=True, null=True)

    class Meta:
        db_table = "bss_legacy_dbo_menumaster"
        ordering = ["DisplayOrder"]


class SubMenuMaster(models.Model):
    SubMenuId = models.IntegerField(primary_key=True, db_column="SubMenuId")
    MenuId = models.IntegerField(db_column="MenuId", null=True, blank=True)
    DisplayName = models.CharField(max_length=200, db_column="DisplayName", blank=True, null=True)
    Name = models.CharField(max_length=200, db_column="Name", blank=True, null=True)
    HostedFolder = models.CharField(max_length=500, db_column="HostedFolder", blank=True, null=True)
    Url = models.CharField(max_length=500, db_column="Url", blank=True, null=True)
    DisplayOrder = models.IntegerField(db_column="DisplayOrder", null=True, blank=True)
    Icon = models.CharField(max_length=100, db_column="Icon", blank=True, null=True)
    PermissionFor = models.CharField(max_length=50, db_column="PermissionFor", blank=True, null=True)
    NameForMobile = models.CharField(max_length=200, db_column="NameForMobile", blank=True, null=True)
    SAAccess = models.CharField(db_column="SAAccess", max_length=10, blank=True, null=True)
    AdminAccess = models.CharField(db_column="AdminAccess", max_length=10, blank=True, null=True)
    StaffAccess = models.CharField(db_column="StaffAccess", max_length=10, blank=True, null=True)
    UserFor = models.CharField(max_length=50, db_column="UserFor", blank=True, null=True)

    class Meta:
        db_table = "bss_legacy_dbo_submenumaster"
        ordering = ["DisplayOrder"]


class RoleMaster(models.Model):
    Id = models.AutoField(primary_key=True, db_column="Id")
    PartyType = models.IntegerField(db_column="PartyType", null=True, blank=True)
    PartyId = models.IntegerField(db_column="PartyId", null=True, blank=True)
    UserId = models.IntegerField(db_column="UserId", null=True, blank=True)
    GradeId = models.IntegerField(db_column="GradeId", null=True, blank=True)
    Name = models.CharField(max_length=100, db_column="Name", blank=True, null=True)
    Description = models.CharField(max_length=255, db_column="Description", blank=True, null=True)
    StartDate = models.CharField(max_length=50, db_column="StartDate", blank=True, null=True)
    EndDate = models.CharField(max_length=50, db_column="EndDate", blank=True, null=True)
    CreatedOn = models.DateTimeField(db_column="CreatedOn", null=True, blank=True)
    Createdby = models.IntegerField(db_column="Createdby", null=True, blank=True)
    Updatedby = models.IntegerField(db_column="Updatedby", null=True, blank=True)
    UpdatedOn = models.DateTimeField(db_column="UpdatedOn", null=True, blank=True)

    class Meta:
        db_table = "bss_legacy_rtl_rolemaster"


class StatusMaster(models.Model):
    Id = models.AutoField(primary_key=True, db_column="Id")
    KeyName = models.TextField(db_column="KeyName", blank=True, null=True)
    AttributeValue = models.TextField(db_column="AttributeValue", blank=True, null=True)

    class Meta:
        db_table = "bss_legacy_rtl_statusmaster"


class Newsletter(models.Model):
    Id = models.AutoField(primary_key=True, db_column="Id")
    StateCentralActtitle = models.TextField(db_column="StateCentralActtitle", blank=True, null=True)
    DateOfNotification = models.DateTimeField(db_column="DateOfNotification", null=True, blank=True)
    SATE_CODE = models.FloatField(db_column="SATE_CODE", null=True, blank=True)
    EffectiveDateOfNotification = models.DateTimeField(db_column="EffectiveDateOfNotification", null=True, blank=True)
    NotificationNumber = models.TextField(db_column="NotificationNumber", blank=True, null=True)
    DepartmentId = models.IntegerField(db_column="DepartmentId", null=True, blank=True)
    UploadDocPath = models.TextField(db_column="UploadDocPath", blank=True, null=True)
    SubjectLine = models.TextField(db_column="SubjectLine", blank=True, null=True)
    PartyId = models.TextField(db_column="PartyId", blank=True, null=True)
    Summary = models.TextField(db_column="Summary", blank=True, null=True)
    CreatedDate = models.DateTimeField(db_column="CreatedDate", null=True, blank=True)
    newscategory = models.TextField(db_column="newscategory", blank=True, null=True)

    class Meta:
        db_table = "bss_legacy_dbo_newsletter"


class NewsletterClientMapping(models.Model):
    Id = models.AutoField(primary_key=True, db_column="Id")
    NewsLetterId = models.IntegerField(db_column="NewsLetterId", null=True, blank=True)
    PartyId = models.IntegerField(db_column="PartyId", null=True, blank=True)

    class Meta:
        db_table = "bss_legacy_dbo_newsletter_client_mapping"


class StoreComplianceStatusMaster(models.Model):
    Id = models.AutoField(primary_key=True, db_column="Id")
    Type = models.TextField(db_column="Type", blank=True, null=True)
    CreatedOn = models.DateTimeField(db_column="CreatedOn", null=True, blank=True)
    Createdby = models.IntegerField(db_column="Createdby", null=True, blank=True)
    Updatedby = models.IntegerField(db_column="Updatedby", null=True, blank=True)
    UpdatedOn = models.DateTimeField(db_column="UpdatedOn", null=True, blank=True)

    class Meta:
        db_table = "bss_legacy_rtl_storecompliancestatusmaster"


class StoreComplianceDocument(models.Model):
    Id = models.AutoField(primary_key=True, db_column="Id")
    StoreId = models.IntegerField(db_column="StoreId", null=True, blank=True)
    DId = models.IntegerField(db_column="DId", null=True, blank=True)
    StatusYN = models.IntegerField(db_column="StatusYN", null=True, blank=True)
    UserId = models.IntegerField(db_column="UserId", null=True, blank=True)
    DocumentPath = models.TextField(db_column="DocumentPath", blank=True, null=True)
    Verify = models.IntegerField(db_column="Verify", null=True, blank=True)
    CreatedOn = models.DateTimeField(db_column="CreatedOn", null=True, blank=True)
    IsDefault = models.IntegerField(db_column="IsDefault", null=True, blank=True)

    class Meta:
        db_table = "bss_legacy_rtl_storecompliancedocument"


class StorePrefix(models.Model):
    Id = models.AutoField(primary_key=True, db_column="Id")
    PartyId = models.IntegerField(db_column="PartyId", null=True, blank=True)
    Prefix = models.TextField(db_column="Prefix", blank=True, null=True)
    Suffix = models.TextField(db_column="Suffix", blank=True, null=True)
    StartDate = models.DateField(db_column="StartDate", null=True, blank=True)
    EndDate = models.DateField(db_column="EndDate", null=True, blank=True)
    CreatedBy = models.IntegerField(db_column="CreatedBy", null=True, blank=True)
    CreatedOn = models.DateTimeField(db_column="CreatedOn", null=True, blank=True)
    ModifyBy = models.IntegerField(db_column="ModifyBy", null=True, blank=True)
    ModifiedOn = models.DateTimeField(db_column="ModifiedOn", null=True, blank=True)

    class Meta:
        db_table = "bss_legacy_rtl_storeprefix"


class RegionMaster(models.Model):
    Id = models.FloatField(primary_key=True, db_column="Id")
    Name = models.TextField(db_column="Name", blank=True, null=True)
    CityId = models.IntegerField(db_column="CityId", null=True, blank=True)

    class Meta:
        db_table = "bss_legacy_rtl_regionmaster"


class CircleMaster(models.Model):
    Id = models.FloatField(primary_key=True, db_column="Id")
    Name = models.TextField(db_column="Name", blank=True, null=True)
    CityId = models.FloatField(db_column="CityId", null=True, blank=True)

    class Meta:
        db_table = "bss_legacy_rtl_circlemaster"


class LicenseMaster(models.Model):
    LicenseId = models.IntegerField(primary_key=True, db_column="LicenseId")
    LicenseName = models.TextField(db_column="LicenseName", blank=True, null=True)
    LicenseMasterType = models.TextField(db_column="LicenseMasterType", blank=True, null=True)
    StartDate = models.TextField(db_column="StartDate", blank=True, null=True)
    EndDate = models.TextField(db_column="EndDate", blank=True, null=True)
    IsDeleted = models.BooleanField(db_column="IsDeleted", null=True, blank=True)
    PermissionId = models.TextField(db_column="PermissionId", blank=True, null=True)
    StateId = models.IntegerField(db_column="StateId", null=True, blank=True)
    ApplicationLink = models.TextField(db_column="ApplicationLink", blank=True, null=True)
    Act = models.TextField(db_column="Act", blank=True, null=True)
    Detail = models.TextField(db_column="Detail", blank=True, null=True)
    Category = models.TextField(db_column="Category", blank=True, null=True)
    Industry = models.TextField(db_column="Industry", blank=True, null=True)
    LicenseType = models.TextField(db_column="LicenseType", blank=True, null=True)
    UniqueCode = models.TextField(db_column="UniqueCode", blank=True, null=True)
    CreatedOn = models.DateTimeField(db_column="CreatedOn", null=True, blank=True)
    Createdby = models.IntegerField(db_column="Createdby", null=True, blank=True)

    class Meta:
        db_table = "bss_legacy_rtl_licensemaster"


class LicenseDetailsMaster(models.Model):
    Id = models.AutoField(primary_key=True, db_column="Id")
    LicenseId = models.IntegerField(db_column="LicenseId", null=True, blank=True)
    UserId = models.IntegerField(db_column="UserId", null=True, blank=True)
    PartyTypeId = models.IntegerField(db_column="PartyTypeId", null=True, blank=True)
    DocumentsId = models.TextField(db_column="DocumentsId", blank=True, null=True)
    PermissionId = models.IntegerField(db_column="PermissionId", null=True, blank=True)

    class Meta:
        db_table = "bss_legacy_rtl_licensedetailsmaster"


class StoreLicences(models.Model):
    Id = models.BigAutoField(primary_key=True, db_column="Id")
    StoreId = models.BigIntegerField(db_column="StoreId", null=True, blank=True)
    LicenseId = models.IntegerField(db_column="LicenseId", null=True, blank=True)
    Status = models.IntegerField(db_column="Status", null=True, blank=True)
    IsActive = models.BooleanField(db_column="IsActive", null=True, blank=True)
    Dire_Name = models.TextField(db_column="Dire_Name", blank=True, null=True)
    Dire_FatherName = models.TextField(db_column="Dire_FatherName", blank=True, null=True)
    Dire_Address = models.TextField(db_column="Dire_Address", blank=True, null=True)
    Dire_AadhaarNo = models.TextField(db_column="Dire_AadhaarNo", blank=True, null=True)
    Dire_PanNo = models.TextField(db_column="Dire_PanNo", blank=True, null=True)
    Dire_DateOfBirth = models.DateField(db_column="Dire_DateOfBirth", null=True, blank=True)
    Dire_EmailId = models.TextField(db_column="Dire_EmailId", blank=True, null=True)
    Dire_MobileNo = models.TextField(db_column="Dire_MobileNo", blank=True, null=True)
    Auth_Name = models.TextField(db_column="Auth_Name", blank=True, null=True)
    Auth_FatherName = models.TextField(db_column="Auth_FatherName", blank=True, null=True)
    Auth_Address = models.TextField(db_column="Auth_Address", blank=True, null=True)
    Auth_AadhaarNo = models.TextField(db_column="Auth_AadhaarNo", blank=True, null=True)
    Auth_PanNo = models.TextField(db_column="Auth_PanNo", blank=True, null=True)
    Auth_DateOfBirth = models.DateField(db_column="Auth_DateOfBirth", null=True, blank=True)
    Auth_EmailId = models.TextField(db_column="Auth_EmailId", blank=True, null=True)
    Auth_MobileNo = models.TextField(db_column="Auth_MobileNo", blank=True, null=True)
    NatureofBusiness = models.TextField(db_column="NatureofBusiness", blank=True, null=True)
    DateofCommencement = models.DateField(db_column="DateofCommencement", null=True, blank=True)
    ProductCategory = models.TextField(db_column="ProductCategory", blank=True, null=True)
    AadhaarRegisteredofficeAddressNo = models.TextField(db_column="AadhaarRegisteredofficeAddressNo", blank=True, null=True)
    AadhaarCardofDirector = models.TextField(db_column="AadhaarCardofDirector", blank=True, null=True)
    PANCardofDirector = models.TextField(db_column="PANCardofDirector", blank=True, null=True)
    PassportSizePhoto1 = models.TextField(db_column="PassportSizePhoto1", blank=True, null=True)
    AuthorizationLetter = models.TextField(db_column="AuthorizationLetter", blank=True, null=True)
    AadhaarCardofAuthorized = models.TextField(db_column="AadhaarCardofAuthorized", blank=True, null=True)
    PANCard = models.TextField(db_column="PANCard", blank=True, null=True)
    PassportSizePhoto2 = models.TextField(db_column="PassportSizePhoto2", blank=True, null=True)
    ElectricityBill = models.TextField(db_column="ElectricityBill", blank=True, null=True)
    SaledeedRentAgreement = models.TextField(db_column="SaledeedRentAgreement", blank=True, null=True)
    FSMSPlan = models.TextField(db_column="FSMSPlan", blank=True, null=True)
    FormIX = models.TextField(db_column="FormIX", blank=True, null=True)
    WaterTestReport = models.TextField(db_column="WaterTestReport", blank=True, null=True)
    RequestedDate = models.DateTimeField(db_column="RequestedDate", null=True, blank=True)
    CreatedBy = models.IntegerField(db_column="CreatedBy", null=True, blank=True)
    Createdon = models.DateTimeField(db_column="Createdon", null=True, blank=True)
    ModifiedBy = models.IntegerField(db_column="ModifiedBy", null=True, blank=True)
    ModifiedOn = models.DateTimeField(db_column="ModifiedOn", null=True, blank=True)
    buttonText = models.IntegerField(db_column="buttonText", null=True, blank=True)
    ValidLicense = models.DateTimeField(db_column="ValidLicense", null=True, blank=True)

    class Meta:
        db_table = "bss_legacy_rtl_storelicences"


class LicenceRequest(models.Model):
    Id = models.BigAutoField(primary_key=True, db_column="Id")
    StoreLicenceId = models.BigIntegerField(db_column="StoreLicenceId", null=True, blank=True)
    ApplicationStatus = models.TextField(db_column="ApplicationStatus", blank=True, null=True)
    ApplicationDate = models.TextField(db_column="ApplicationDate", blank=True, null=True)
    UploadApplicationCopy = models.TextField(db_column="UploadApplicationCopy", blank=True, null=True)
    UploadChallanCopy = models.TextField(db_column="UploadChallanCopy", blank=True, null=True)
    UploadFeesCopy = models.TextField(db_column="UploadFeesCopy", blank=True, null=True)
    LicenseStatus = models.TextField(db_column="LicenseStatus", blank=True, null=True)
    LicenseDate = models.TextField(db_column="LicenseDate", blank=True, null=True)
    LicenseNumber = models.TextField(db_column="LicenseNumber", blank=True, null=True)
    MachineNumber = models.TextField(db_column="MachineNumber", blank=True, null=True)
    ValidityStartDate_old = models.TextField(db_column="ValidityStartDate_old", blank=True, null=True)
    ValidityEndDate_old = models.DateTimeField(db_column="ValidityEndDate_old", null=True, blank=True)
    UploadLicenseCopy = models.TextField(db_column="UploadLicenseCopy", blank=True, null=True)
    RenewalRequestDate = models.TextField(db_column="RenewalRequestDate", blank=True, null=True)
    RenewalStatus = models.TextField(db_column="RenewalStatus", blank=True, null=True)
    RenewalStartDate = models.TextField(db_column="RenewalStartDate", blank=True, null=True)
    RenewalEnddate = models.TextField(db_column="RenewalEnddate", blank=True, null=True)
    UploadRenewedCopy = models.TextField(db_column="UploadRenewedCopy", blank=True, null=True)
    UserName = models.TextField(db_column="UserName", blank=True, null=True)
    UserPassword = models.TextField(db_column="UserPassword", blank=True, null=True)
    MobileNumber = models.TextField(db_column="MobileNumber", blank=True, null=True)
    EmailId = models.TextField(db_column="EmailId", blank=True, null=True)
    TentativeDateofComp = models.TextField(db_column="TentativeDateofComp", blank=True, null=True)
    InvoiceStatus = models.TextField(db_column="InvoiceStatus", blank=True, null=True)
    InvoiceDate = models.TextField(db_column="InvoiceDate", blank=True, null=True)
    InvoiceNo = models.TextField(db_column="InvoiceNo", blank=True, null=True)
    InvoiceAmount = models.TextField(db_column="InvoiceAmount", blank=True, null=True)
    UploadInvoice = models.TextField(db_column="UploadInvoice", blank=True, null=True)
    PaymentStatus = models.TextField(db_column="PaymentStatus", blank=True, null=True)
    PaymentTAT = models.TextField(db_column="PaymentTAT", blank=True, null=True)
    PaymentDuedate = models.TextField(db_column="PaymentDuedate", blank=True, null=True)
    PaymentOverDueDate = models.TextField(db_column="PaymentOverDueDate", blank=True, null=True)
    PaymentLink = models.TextField(db_column="PaymentLink", blank=True, null=True)
    ModifyBy = models.IntegerField(db_column="ModifyBy", null=True, blank=True)
    ModifiedOn = models.DateTimeField(db_column="ModifiedOn", null=True, blank=True)
    LStatus = models.IntegerField(db_column="LStatus", null=True, blank=True)
    ActualCost = models.TextField(db_column="ActualCost", blank=True, null=True)
    GovtFees = models.TextField(db_column="GovtFees", blank=True, null=True)
    ValidityStartDate = models.TextField(db_column="ValidityStartDate", blank=True, null=True)
    ValidityEndDate = models.TextField(db_column="ValidityEndDate", blank=True, null=True)
    ValidityStartDate1 = models.TextField(db_column="ValidityStartDate1", blank=True, null=True)
    ValidityEndDate1 = models.TextField(db_column="ValidityEndDate1", blank=True, null=True)
    UploadAmendmentCopy = models.TextField(db_column="UploadAmendmentCopy", blank=True, null=True)
    Remark = models.TextField(db_column="Remark", blank=True, null=True)
    LicenseCategory = models.TextField(db_column="LicenseCategory", blank=True, null=True)
    UploadAcknowledgement = models.TextField(db_column="UploadAcknowledgement", blank=True, null=True)

    class Meta:
        db_table = "bss_legacy_rtl_licencerequest"


class StoreMapping(models.Model):
    Id = models.AutoField(primary_key=True, db_column="Id")
    StoreId = models.IntegerField(db_column="StoreId", null=True, blank=True)
    UserId = models.IntegerField(db_column="UserId", null=True, blank=True)
    PartyId = models.IntegerField(db_column="PartyId", null=True, blank=True)
    PartyTypeId = models.IntegerField(db_column="PartyTypeId", null=True, blank=True)
    StartDate = models.TextField(db_column="StartDate", null=True, blank=True)
    EndDate = models.TextField(db_column="EndDate", null=True, blank=True)
    CreatedOn = models.DateTimeField(db_column="CreatedOn", null=True, blank=True)
    CreatedBy = models.BigIntegerField(db_column="CreatedBy", null=True, blank=True)
    ModifiedBy = models.BigIntegerField(db_column="ModifiedBy", null=True, blank=True)
    ModifiedOn = models.DateTimeField(db_column="ModifiedOn", null=True, blank=True)

    class Meta:
        db_table = "bss_legacy_rtl_storemapping"


class AssignExecuter(models.Model):
    Id = models.AutoField(primary_key=True, db_column="Id")
    ExecuterId = models.IntegerField(db_column="ExecuterId", null=True, blank=True)
    PartyId = models.IntegerField(db_column="PartyId", null=True, blank=True)
    ClientId = models.IntegerField(db_column="ClientId", null=True, blank=True)
    Createdby = models.IntegerField(db_column="Createdby", null=True, blank=True)
    CreatedOn = models.DateTimeField(db_column="CreatedOn", null=True, blank=True)

    class Meta:
        db_table = "bss_legacy_rtl_assignexecuter"


class Subsidiary(models.Model):
    Id = models.AutoField(primary_key=True, db_column="Id")
    GroupId = models.IntegerField(db_column="GroupId", null=True, blank=True)
    GroupUserid = models.IntegerField(db_column="GroupUserid", null=True, blank=True)
    SubcidiaryId = models.IntegerField(db_column="SubcidiaryId", null=True, blank=True)
    SubcidiaryUserId = models.IntegerField(db_column="SubcidiaryUserId", null=True, blank=True)
    CreatedOn = models.DateTimeField(db_column="CreatedOn", null=True, blank=True)

    class Meta:
        db_table = "bss_legacy_rtl_subcidiary"


class PagesSectionMaster(models.Model):
    Id = models.AutoField(primary_key=True, db_column="Id")
    Ismenu = models.IntegerField(db_column="Ismenu", null=True, blank=True)
    Type = models.TextField(db_column="Type", blank=True, null=True)
    Url = models.TextField(db_column="Url", blank=True, null=True)
    PageName = models.TextField(db_column="PageName", blank=True, null=True)
    SectionName = models.TextField(db_column="SectionName", blank=True, null=True)
    AllowViewFlag = models.BooleanField(db_column="AllowViewFlag", null=True, blank=True)
    AllowEditFlag = models.BooleanField(db_column="AllowEditFlag", null=True, blank=True)
    AllowDeleteFlag = models.BooleanField(db_column="AllowDeleteFlag", null=True, blank=True)
    AllowUploadFlag = models.BooleanField(db_column="AllowUploadFlag", null=True, blank=True)
    AllowDownloadFlag = models.BooleanField(db_column="AllowDownloadFlag", null=True, blank=True)
    AllowNewStoreFlag = models.BooleanField(db_column="AllowNewStoreFlag", null=True, blank=True)
    AllowNewEmployeeFlag = models.BooleanField(db_column="AllowNewEmployeeFlag", null=True, blank=True)
    AllowCheckbox1Flag = models.BooleanField(db_column="AllowCheckbox1Flag", null=True, blank=True)
    AllowCheckbox2Flag = models.BooleanField(db_column="AllowCheckbox2Flag", null=True, blank=True)
    AllowVerifyFlag = models.BooleanField(db_column="AllowVerifyFlag", null=True, blank=True)
    Ordering = models.IntegerField(db_column="Ordering", null=True, blank=True)
    IsDelete = models.IntegerField(db_column="IsDelete", null=True, blank=True)

    class Meta:
        db_table = "bss_legacy_rtl_pagessectionmaster"


class PagesSectionRolePermission(models.Model):
    Id = models.AutoField(primary_key=True, db_column="Id")
    PartyType = models.TextField(db_column="PartyType", blank=True, null=True)
    PartyId = models.IntegerField(db_column="PartyId", null=True, blank=True)
    UserId = models.IntegerField(db_column="UserId", null=True, blank=True)
    RoleId = models.IntegerField(db_column="RoleId", null=True, blank=True)
    SectionId = models.IntegerField(db_column="SectionId", null=True, blank=True)
    ViewFlag = models.BooleanField(db_column="ViewFlag", null=True, blank=True)
    EditFlag = models.BooleanField(db_column="EditFlag", null=True, blank=True)
    DeleteFlag = models.BooleanField(db_column="DeleteFlag", null=True, blank=True)
    UploadFlag = models.BooleanField(db_column="UploadFlag", null=True, blank=True)
    DownloadFlag = models.BooleanField(db_column="DownloadFlag", null=True, blank=True)
    NewStoreFlag = models.BooleanField(db_column="NewStoreFlag", null=True, blank=True)
    NewEmployeeFlag = models.BooleanField(db_column="NewEmployeeFlag", null=True, blank=True)
    Checkbox1Flag = models.BooleanField(db_column="Checkbox1Flag", null=True, blank=True)
    Checkbox2Flag = models.BooleanField(db_column="Checkbox2Flag", null=True, blank=True)
    VerifyFlag = models.BooleanField(db_column="VerifyFlag", null=True, blank=True)
    CreatedOn = models.DateTimeField(db_column="CreatedOn", null=True, blank=True)
    Createdby = models.IntegerField(db_column="Createdby", null=True, blank=True)
    Updatedby = models.IntegerField(db_column="Updatedby", null=True, blank=True)
    UpdatedOn = models.DateTimeField(db_column="UpdatedOn", null=True, blank=True)
    IsActive = models.BooleanField(db_column="IsActive", null=True, blank=True)
    IsDeleted = models.BooleanField(db_column="IsDeleted", null=True, blank=True)

    class Meta:
        db_table = "bss_legacy_rtl_pagessectionrolepermission"


class MenuPermission(models.Model):
    MenuPermissionId = models.TextField(primary_key=True, db_column="MenuPermissionId")
    ModuleId = models.IntegerField(db_column="ModuleId", null=True, blank=True)
    MenuId = models.IntegerField(db_column="MenuId", null=True, blank=True)
    SubMenuId = models.IntegerField(db_column="SubMenuId", null=True, blank=True)
    EmpId = models.TextField(db_column="EmpId", blank=True, null=True)
    IsAdd = models.BooleanField(db_column="IsAdd", null=True, blank=True)
    IsEdit = models.BooleanField(db_column="IsEdit", null=True, blank=True)
    IsDelete = models.BooleanField(db_column="IsDelete", null=True, blank=True)
    IsPrint = models.BooleanField(db_column="IsPrint", null=True, blank=True)
    IsActive = models.BooleanField(db_column="IsActive", null=True, blank=True)
    BranchCode = models.TextField(db_column="BranchCode", blank=True, null=True)
    CreatedOn = models.DateTimeField(db_column="CreatedOn", null=True, blank=True)
    CreatedBy = models.IntegerField(db_column="CreatedBy", null=True, blank=True)
    UpdatedOn = models.DateTimeField(db_column="UpdatedOn", null=True, blank=True)
    UpdatedBy = models.IntegerField(db_column="UpdatedBy", null=True, blank=True)
    IsDeleted = models.BooleanField(db_column="IsDeleted", null=True, blank=True)

    class Meta:
        db_table = "bss_legacy_dbo_menupermission"


# ---------------------------------------------------------------------------
# Worker / Contractor workflow tables (bulk-migrated from SQL Server, unmanaged
# so Django never alters them — they mirror the legacy stored-proc backing rows).
# ---------------------------------------------------------------------------


class JobDetailHistory(models.Model):
    id = models.AutoField(primary_key=True, db_column="id")
    JobDesignation = models.CharField(max_length=200, db_column="JobDesignation", blank=True, null=True)
    JobDepartment = models.CharField(max_length=200, db_column="JobDepartment", blank=True, null=True)
    JobIndustry = models.CharField(max_length=200, db_column="JobIndustry", blank=True, null=True)
    JobConID = models.CharField(max_length=100, db_column="JobConID", blank=True, null=True)
    JobConName = models.CharField(max_length=200, db_column="JobConName", blank=True, null=True)
    JobConEmail = models.CharField(max_length=200, db_column="JobConEmail", blank=True, null=True)
    JobEmployerId = models.CharField(max_length=100, db_column="JobEmployerId", blank=True, null=True)
    JobEmployerName = models.CharField(max_length=200, db_column="JobEmployerName", blank=True, null=True)
    JobEmployerEmail = models.CharField(max_length=200, db_column="JobEmployerEmail", blank=True, null=True)
    JobSiteName = models.CharField(max_length=200, db_column="JobSiteName", blank=True, null=True)
    JobSitecode = models.CharField(max_length=100, db_column="JobSitecode", blank=True, null=True)
    JobSiteLocation = models.CharField(max_length=300, db_column="JobSiteLocation", blank=True, null=True)
    JobSiteState = models.CharField(max_length=100, db_column="JobSiteState", blank=True, null=True)
    JobSdate = models.CharField(max_length=50, db_column="JobSdate", blank=True, null=True)
    Jobendate = models.CharField(max_length=50, db_column="Jobendate", blank=True, null=True)
    JobNatureJob = models.CharField(max_length=200, db_column="JobNatureJob", blank=True, null=True)
    JobTypeWork = models.CharField(max_length=200, db_column="JobTypeWork", blank=True, null=True)
    Appointmentletter = models.CharField(max_length=500, db_column="Appointmentletter", blank=True, null=True)
    Experienceletter = models.CharField(max_length=500, db_column="Experienceletter", blank=True, null=True)
    WorkerCode = models.CharField(max_length=100, db_column="WorkerCode", blank=True, null=True)
    WorkerName = models.CharField(max_length=200, db_column="WorkerName", blank=True, null=True)
    WorkerMobile = models.CharField(max_length=50, db_column="WorkerMobile", blank=True, null=True)
    WorkerEmail = models.CharField(max_length=200, db_column="WorkerEmail", blank=True, null=True)
    Loginid = models.CharField(max_length=100, db_column="Loginid", blank=True, null=True)
    CreatedBy = models.CharField(max_length=100, db_column="CreatedBy", blank=True, null=True)
    CreateOn = models.CharField(max_length=50, db_column="CreateOn", blank=True, null=True)
    JobPFAccount = models.CharField(max_length=100, db_column="JobPFAccount", blank=True, null=True)

    class Meta:
        managed = False
        db_table = "bss_legacy_dbo_jobdetailhistory"


class ReleaseWorkerByContractor(models.Model):
    id = models.AutoField(primary_key=True, db_column="id")
    completionProject = models.CharField(max_length=50, db_column="completionProject", blank=True, null=True)
    completionContract = models.CharField(max_length=50, db_column="completionContract", blank=True, null=True)
    OtherReason = models.CharField(max_length=50, db_column="OtherReason", blank=True, null=True)
    fixedTerm = models.CharField(max_length=50, db_column="fixedTerm", blank=True, null=True)
    resignation = models.CharField(max_length=50, db_column="resignation", blank=True, null=True)
    transfer = models.CharField(max_length=50, db_column="transfer", blank=True, null=True)
    retirement = models.CharField(max_length=50, db_column="retirement", blank=True, null=True)
    LastDate = models.CharField(max_length=50, db_column="LastDate", blank=True, null=True)
    Settlement = models.CharField(max_length=50, db_column="Settlement", blank=True, null=True)
    DuesClear = models.CharField(max_length=50, db_column="DuesClear", blank=True, null=True)
    Disciplinary = models.CharField(max_length=50, db_column="Disciplinary", blank=True, null=True)
    Rehiring = models.CharField(max_length=50, db_column="Rehiring", blank=True, null=True)
    Remarks = models.CharField(max_length=1000, db_column="Remarks", blank=True, null=True)
    WorkerCode = models.CharField(max_length=100, db_column="WorkerCode", blank=True, null=True)
    Partyid = models.CharField(max_length=100, db_column="Partyid", blank=True, null=True)
    Userid = models.CharField(max_length=100, db_column="Userid", blank=True, null=True)
    CreatedBy = models.CharField(max_length=100, db_column="CreatedBy", blank=True, null=True)
    CreatedOn = models.CharField(max_length=50, db_column="CreatedOn", blank=True, null=True)
    appointmentletter = models.CharField(max_length=500, db_column="appointmentletter", blank=True, null=True)
    DOJ = models.CharField(max_length=50, db_column="DOJ", blank=True, null=True)
    PFAccountno = models.CharField(max_length=100, db_column="PFAccountno", blank=True, null=True)
    Site = models.CharField(max_length=200, db_column="Site", blank=True, null=True)
    flag = models.CharField(max_length=50, db_column="flag", blank=True, null=True)
    JobDesignation = models.CharField(max_length=200, db_column="JobDesignation", blank=True, null=True)
    JobDepartment = models.CharField(max_length=200, db_column="JobDepartment", blank=True, null=True)

    class Meta:
        managed = False
        db_table = "bss_legacy_dbo_releaseworkerbycontractor"


class VendorRegistration(models.Model):
    Id = models.AutoField(primary_key=True, db_column="Id")
    AgencyName = models.CharField(max_length=300, db_column="AgencyName", blank=True, null=True)
    RegisteredAddress = models.CharField(max_length=500, db_column="RegisteredAddress", blank=True, null=True)
    CorporateAddress = models.CharField(max_length=500, db_column="CorporateAddress", blank=True, null=True)
    ContactPerson = models.CharField(max_length=200, db_column="ContactPerson", blank=True, null=True)
    Designation = models.CharField(max_length=200, db_column="Designation", blank=True, null=True)
    Mobile = models.CharField(max_length=50, db_column="Mobile", blank=True, null=True)
    Email = models.CharField(max_length=200, db_column="Email", blank=True, null=True)
    Website = models.CharField(max_length=200, db_column="Website", blank=True, null=True)
    YearEstablishment = models.CharField(max_length=50, db_column="YearEstablishment", blank=True, null=True)
    Organization = models.CharField(max_length=500, db_column="Organization", blank=True, null=True)
    PanNo = models.CharField(max_length=100, db_column="PanNo", blank=True, null=True)
    Tan = models.CharField(max_length=100, db_column="Tan", blank=True, null=True)
    GSTIN = models.CharField(max_length=100, db_column="GSTIN", blank=True, null=True)
    CIN = models.CharField(max_length=100, db_column="CIN", blank=True, null=True)
    SHOPREGI = models.CharField(max_length=100, db_column="SHOPREGI", blank=True, null=True)
    MSME = models.CharField(max_length=100, db_column="MSME", blank=True, null=True)
    EPFREGNO = models.CharField(max_length=100, db_column="EPFREGNO", blank=True, null=True)
    ESICREGNO = models.CharField(max_length=100, db_column="ESICREGNO", blank=True, null=True)
    ProfessionalREGNO = models.CharField(max_length=100, db_column="ProfessionalREGNO", blank=True, null=True)
    LabourREGNO = models.CharField(max_length=100, db_column="LabourREGNO", blank=True, null=True)
    ContractREGNO = models.CharField(max_length=100, db_column="ContractREGNO", blank=True, null=True)
    LabourLicenseNO = models.CharField(max_length=100, db_column="LabourLicenseNO", blank=True, null=True)
    LicenseValidity = models.CharField(max_length=100, db_column="LicenseValidity", blank=True, null=True)
    LicenseEmployeeCount = models.CharField(max_length=100, db_column="LicenseEmployeeCount", blank=True, null=True)
    BankName = models.CharField(max_length=200, db_column="BankName", blank=True, null=True)
    AccountNumber = models.CharField(max_length=100, db_column="AccountNumber", blank=True, null=True)
    IFSCCode = models.CharField(max_length=100, db_column="IFSCCode", blank=True, null=True)
    CancelledCheque = models.CharField(max_length=500, db_column="CancelledCheque", blank=True, null=True)
    Service = models.CharField(max_length=1000, db_column="Service", blank=True, null=True)
    Industries = models.CharField(max_length=1000, db_column="Industries", blank=True, null=True)
    TotalEmployees = models.CharField(max_length=100, db_column="TotalEmployees", blank=True, null=True)
    OperationalLocations = models.CharField(max_length=100, db_column="OperationalLocations", blank=True, null=True)
    YearsOfExperience = models.CharField(max_length=100, db_column="YearsOfExperience", blank=True, null=True)
    KeyClients = models.CharField(max_length=1000, db_column="KeyClients", blank=True, null=True)
    SimilarContracts = models.CharField(max_length=1000, db_column="SimilarContracts", blank=True, null=True)
    File1 = models.CharField(max_length=1000, db_column="File1", blank=True, null=True)
    File2 = models.CharField(max_length=1000, db_column="File2", blank=True, null=True)
    File3 = models.CharField(max_length=1000, db_column="File3", blank=True, null=True)
    File4 = models.CharField(max_length=1000, db_column="File4", blank=True, null=True)
    File5 = models.CharField(max_length=1000, db_column="File5", blank=True, null=True)
    File6 = models.CharField(max_length=1000, db_column="File6", blank=True, null=True)
    File7 = models.CharField(max_length=1000, db_column="File7", blank=True, null=True)
    File8 = models.CharField(max_length=1000, db_column="File8", blank=True, null=True)
    File9 = models.CharField(max_length=1000, db_column="File9", blank=True, null=True)
    File10 = models.CharField(max_length=1000, db_column="File10", blank=True, null=True)
    File11 = models.CharField(max_length=1000, db_column="File11", blank=True, null=True)
    File12 = models.CharField(max_length=1000, db_column="File12", blank=True, null=True)
    File13 = models.CharField(max_length=1000, db_column="File13", blank=True, null=True)
    File14 = models.CharField(max_length=1000, db_column="File14", blank=True, null=True)
    File15 = models.CharField(max_length=1000, db_column="File15", blank=True, null=True)
    File16 = models.CharField(max_length=1000, db_column="File16", blank=True, null=True)
    File17 = models.CharField(max_length=1000, db_column="File17", blank=True, null=True)
    File18 = models.CharField(max_length=1000, db_column="File18", blank=True, null=True)
    File19 = models.CharField(max_length=1000, db_column="File19", blank=True, null=True)
    File20 = models.CharField(max_length=1000, db_column="File20", blank=True, null=True)
    File21 = models.CharField(max_length=1000, db_column="File21", blank=True, null=True)
    file22 = models.CharField(max_length=1000, db_column="file22", blank=True, null=True)
    file23 = models.CharField(max_length=1000, db_column="file23", blank=True, null=True)
    file24 = models.CharField(max_length=1000, db_column="file24", blank=True, null=True)
    NameOrganization1 = models.CharField(max_length=500, db_column="NameOrganization1", blank=True, null=True)
    ServiceType1 = models.CharField(max_length=500, db_column="ServiceType1", blank=True, null=True)
    ConcernPerson1 = models.CharField(max_length=500, db_column="ConcernPerson1", blank=True, null=True)
    Designation1 = models.CharField(max_length=500, db_column="Designation1", blank=True, null=True)
    MobileNo1 = models.CharField(max_length=100, db_column="MobileNo1", blank=True, null=True)
    EmailId1 = models.CharField(max_length=300, db_column="EmailId1", blank=True, null=True)
    NameOrganization2 = models.CharField(max_length=500, db_column="NameOrganization2", blank=True, null=True)
    ServiceType2 = models.CharField(max_length=500, db_column="ServiceType2", blank=True, null=True)
    ConcernPerson2 = models.CharField(max_length=500, db_column="ConcernPerson2", blank=True, null=True)
    Designation2 = models.CharField(max_length=500, db_column="Designation2", blank=True, null=True)
    MobileNo2 = models.CharField(max_length=100, db_column="MobileNo2", blank=True, null=True)
    EmailId2 = models.CharField(max_length=300, db_column="EmailId2", blank=True, null=True)
    NameOrganization3 = models.CharField(max_length=500, db_column="NameOrganization3", blank=True, null=True)
    ServiceType3 = models.CharField(max_length=500, db_column="ServiceType3", blank=True, null=True)
    ConcernPerson3 = models.CharField(max_length=500, db_column="ConcernPerson3", blank=True, null=True)
    Designation3 = models.CharField(max_length=500, db_column="Designation3", blank=True, null=True)
    MobileNo3 = models.CharField(max_length=100, db_column="MobileNo3", blank=True, null=True)
    EmailId3 = models.CharField(max_length=300, db_column="EmailId3", blank=True, null=True)
    Representativename = models.CharField(max_length=500, db_column="Representativename", blank=True, null=True)
    RepresentativeDesignation = models.CharField(max_length=500, db_column="RepresentativeDesignation", blank=True, null=True)
    RepresentativeMobile = models.CharField(max_length=100, db_column="RepresentativeMobile", blank=True, null=True)
    RepresentativeEmail = models.CharField(max_length=300, db_column="RepresentativeEmail", blank=True, null=True)
    LoginId = models.CharField(max_length=100, db_column="LoginId", blank=True, null=True)
    Createdby = models.CharField(max_length=100, db_column="Createdby", blank=True, null=True)
    CreatedOn = models.CharField(max_length=50, db_column="CreatedOn", blank=True, null=True)
    IndemnityClause = models.TextField(db_column="IndemnityClause", blank=True, null=True)
    ConfidentialityAgreement = models.TextField(db_column="ConfidentialityAgreement", blank=True, null=True)
    CodeofConduct = models.TextField(db_column="CodeofConduct", blank=True, null=True)
    AMLDeclaration = models.TextField(db_column="AMLDeclaration", blank=True, null=True)
    AntiBribery = models.TextField(db_column="AntiBribery", blank=True, null=True)
    DPDPDeclaration = models.TextField(db_column="DPDPDeclaration", blank=True, null=True)
    SignatoryName = models.CharField(max_length=200, db_column="SignatoryName", blank=True, null=True)
    SignatoryDesignation = models.CharField(max_length=200, db_column="SignatoryDesignation", blank=True, null=True)
    GeneralDate = models.CharField(max_length=50, db_column="GeneralDate", blank=True, null=True)
    Country = models.CharField(max_length=100, db_column="Country", blank=True, null=True)
    State = models.CharField(max_length=100, db_column="State", blank=True, null=True)
    City = models.CharField(max_length=100, db_column="City", blank=True, null=True)
    Pincode = models.CharField(max_length=50, db_column="Pincode", blank=True, null=True)
    nameofeshtablishment = models.CharField(max_length=300, db_column="nameofeshtablishment", blank=True, null=True)
    typeofeshtablishment = models.CharField(max_length=300, db_column="typeofeshtablishment", blank=True, null=True)
    validupto = models.CharField(max_length=100, db_column="validupto", blank=True, null=True)
    Partyid = models.CharField(max_length=100, db_column="Partyid", blank=True, null=True)
    PartyCode = models.CharField(max_length=100, db_column="PartyCode", blank=True, null=True)
    LIN = models.CharField(max_length=100, db_column="LIN", blank=True, null=True)
    Industry = models.CharField(max_length=300, db_column="Industry", blank=True, null=True)

    class Meta:
        managed = False
        db_table = "bss_legacy_rtl_vendorregistration"


class ContractorBillingOrder(models.Model):
    Id = models.AutoField(primary_key=True, db_column="Id")
    Site = models.CharField(max_length=200, db_column="Site", blank=True, null=True)
    OrderNumber = models.CharField(max_length=100, db_column="OrderNumber", blank=True, null=True)
    OrderQty = models.CharField(max_length=50, db_column="OrderQty", blank=True, null=True)
    OrderValue = models.CharField(max_length=100, db_column="OrderValue", blank=True, null=True)
    OrderValidityFrom = models.CharField(max_length=50, db_column="OrderValidityFrom", blank=True, null=True)
    OrderValidityTo = models.CharField(max_length=50, db_column="OrderValidityTo", blank=True, null=True)
    OrderCopy = models.CharField(max_length=500, db_column="OrderCopy", blank=True, null=True)
    LoginId = models.CharField(max_length=100, db_column="LoginId", blank=True, null=True)
    CreatedBy = models.CharField(max_length=100, db_column="CreatedBy", blank=True, null=True)
    CreatedOn = models.CharField(max_length=50, db_column="CreatedOn", blank=True, null=True)
    UpdatedBy = models.CharField(max_length=100, db_column="UpdatedBy", blank=True, null=True)
    UpdatedDate = models.CharField(max_length=50, db_column="UpdatedDate", blank=True, null=True)
    OrderID = models.CharField(max_length=100, db_column="OrderID", blank=True, null=True)
    IsActive = models.CharField(max_length=10, db_column="IsActive", blank=True, null=True)

    class Meta:
        managed = False
        db_table = "bss_legacy_dbo_contractorbillingorder"


class ContractorLicenseMaster(models.Model):
    Id = models.AutoField(primary_key=True, db_column="Id")
    LoginId = models.CharField(max_length=100, db_column="LoginId", blank=True, null=True)
    CreatedBy = models.CharField(max_length=100, db_column="CreatedBy", blank=True, null=True)
    CreatedOn = models.CharField(max_length=50, db_column="CreatedOn", blank=True, null=True)
    LicenseName = models.CharField(max_length=200, db_column="LicenseName", blank=True, null=True)
    LicenseStatus = models.CharField(max_length=50, db_column="LicenseStatus", blank=True, null=True)
    LicenseDate = models.CharField(max_length=50, db_column="LicenseDate", blank=True, null=True)
    LicenseCopy = models.CharField(max_length=500, db_column="LicenseCopy", blank=True, null=True)
    AmendentCopy = models.CharField(max_length=500, db_column="AmendentCopy", blank=True, null=True)
    LicenseNumber = models.CharField(max_length=200, db_column="LicenseNumber", blank=True, null=True)
    LicenseValidFrom = models.CharField(max_length=50, db_column="LicenseValidFrom", blank=True, null=True)
    LicenseValidTo = models.CharField(max_length=50, db_column="LicenseValidTo", blank=True, null=True)
    LicenseCost = models.CharField(max_length=100, db_column="LicenseCost", blank=True, null=True)
    SecurityDepositAmt = models.CharField(max_length=100, db_column="SecurityDepositAmt", blank=True, null=True)
    ApplicationStatus = models.CharField(max_length=100, db_column="ApplicationStatus", blank=True, null=True)
    ApplicationDate = models.CharField(max_length=50, db_column="ApplicationDate", blank=True, null=True)
    ApplicationCopy = models.CharField(max_length=500, db_column="ApplicationCopy", blank=True, null=True)
    ChallanCopy = models.CharField(max_length=500, db_column="ChallanCopy", blank=True, null=True)
    FeesCopy = models.CharField(max_length=500, db_column="FeesCopy", blank=True, null=True)
    Username = models.CharField(max_length=200, db_column="Username", blank=True, null=True)
    Password = models.CharField(max_length=200, db_column="Password", blank=True, null=True)
    MobileNo = models.CharField(max_length=50, db_column="MobileNo", blank=True, null=True)
    EmailId = models.CharField(max_length=200, db_column="EmailId", blank=True, null=True)
    Remarks = models.CharField(max_length=1000, db_column="Remarks", blank=True, null=True)
    Siteid = models.CharField(max_length=100, db_column="Siteid", blank=True, null=True)

    class Meta:
        managed = False
        db_table = "bss_legacy_dbo_contractorlicensemaster"


class PartySitesV(models.Model):
    PARTY_ID = models.BigIntegerField(db_column="PARTY_ID", null=True, blank=True)
    PARTY_SITE_ID = models.BigIntegerField(primary_key=True, db_column="PARTY_SITE_ID")
    PARTY_SITE_NUMBER = models.CharField(max_length=100, db_column="PARTY_SITE_NUMBER", blank=True, null=True)
    PARTY_SITE_NAME = models.CharField(max_length=200, db_column="PARTY_SITE_NAME", blank=True, null=True)
    SITE_USE_TYPE = models.CharField(max_length=100, db_column="SITE_USE_TYPE", blank=True, null=True)
    CITY = models.CharField(max_length=100, db_column="CITY", blank=True, null=True)
    STATE = models.CharField(max_length=100, db_column="STATE", blank=True, null=True)
    COUNTRY = models.CharField(max_length=100, db_column="COUNTRY", blank=True, null=True)
    POSTAL_CODE = models.CharField(max_length=50, db_column="POSTAL_CODE", blank=True, null=True)
    ADDRESS1 = models.CharField(max_length=500, db_column="ADDRESS1", blank=True, null=True)
    STATUS = models.CharField(max_length=50, db_column="STATUS", blank=True, null=True)

    class Meta:
        managed = False
        db_table = "bss_legacy_evm_tbl_party_sites_v"


class LegacySiteManager(models.Model):
    """Full-column view of EVM.TBL_SiteManager (unmanaged; used for the
    SiteManagerController port, which reads/writes the whole row)."""
    SiteId = models.AutoField(primary_key=True, db_column="SiteId")
    Automation = models.CharField(max_length=100, db_column="Automation", blank=True, null=True)
    SiteCode = models.CharField(max_length=100, db_column="SiteCode", blank=True, null=True)
    PartyID = models.BigIntegerField(db_column="PartyID", null=True, blank=True)
    PartyType = models.CharField(max_length=50, db_column="PartyType", blank=True, null=True)
    SiteName = models.CharField(max_length=300, db_column="SiteName", blank=True, null=True)
    Address = models.CharField(max_length=500, db_column="Address", blank=True, null=True)
    CityID = models.CharField(max_length=100, db_column="CityID", blank=True, null=True)
    StateID = models.CharField(max_length=100, db_column="StateID", blank=True, null=True)
    CountryID = models.CharField(max_length=100, db_column="CountryID", blank=True, null=True)
    Pincode = models.CharField(max_length=50, db_column="Pincode", blank=True, null=True)
    LocationCode = models.CharField(max_length=100, db_column="LocationCode", blank=True, null=True)
    EmailId = models.CharField(max_length=200, db_column="EmailId", blank=True, null=True)
    ContactNo = models.CharField(max_length=50, db_column="ContactNo", blank=True, null=True)
    Description = models.CharField(max_length=500, db_column="Description", blank=True, null=True)
    IsActive = models.CharField(max_length=10, db_column="IsActive", blank=True, null=True)
    BankDetails = models.CharField(max_length=500, db_column="BankDetails", blank=True, null=True)
    AccountNo = models.CharField(max_length=100, db_column="AccountNo", blank=True, null=True)
    RegistrationType = models.CharField(max_length=200, db_column="RegistrationType", blank=True, null=True)
    PANITNO = models.CharField(max_length=100, db_column="PANITNO", blank=True, null=True)
    GSTINUIN = models.CharField(max_length=100, db_column="GSTINUIN", blank=True, null=True)
    CLRARC = models.CharField(max_length=100, db_column="CLRARC", blank=True, null=True)
    CLRLIC = models.CharField(max_length=100, db_column="CLRLIC", blank=True, null=True)
    ContactPerson = models.CharField(max_length=200, db_column="ContactPerson", blank=True, null=True)
    ContactMobile = models.CharField(max_length=50, db_column="ContactMobile", blank=True, null=True)
    Descritpion = models.CharField(max_length=500, db_column="Descritpion", blank=True, null=True)
    ValidFrom = models.CharField(max_length=50, db_column="ValidFrom", blank=True, null=True)
    ValidTo = models.CharField(max_length=50, db_column="ValidTo", blank=True, null=True)
    Manpowertype = models.CharField(max_length=200, db_column="Manpowertype", blank=True, null=True)
    ManPowerCount = models.CharField(max_length=100, db_column="ManPowerCount", blank=True, null=True)
    AdminFileDoc = models.TextField(db_column="AdminFileDoc", blank=True, null=True)
    VendorFileDoc = models.TextField(db_column="VendorFileDoc", blank=True, null=True)
    CreatedOn = models.DateTimeField(db_column="CreatedOn", null=True, blank=True)
    UpdateOn = models.DateTimeField(db_column="UpdateOn", null=True, blank=True)
    LAST_LOGIN_ID = models.IntegerField(db_column="LAST_LOGIN_ID", null=True, blank=True)
    CREATED_BY = models.IntegerField(db_column="CREATED_BY", null=True, blank=True)
    LAST_UPDATE_BY = models.CharField(max_length=100, db_column="LAST_UPDATE_BY", blank=True, null=True)
    ATTRIBUTE1 = models.CharField(max_length=500, db_column="ATTRIBUTE1", blank=True, null=True)
    ATTRIBUTE2 = models.CharField(max_length=500, db_column="ATTRIBUTE2", blank=True, null=True)
    ATTRIBUTE3 = models.CharField(max_length=500, db_column="ATTRIBUTE3", blank=True, null=True)
    ATTRIBUTE4 = models.CharField(max_length=500, db_column="ATTRIBUTE4", blank=True, null=True)
    ATTRIBUTE5 = models.CharField(max_length=500, db_column="ATTRIBUTE5", blank=True, null=True)
    ATTRIBUTE6 = models.CharField(max_length=500, db_column="ATTRIBUTE6", blank=True, null=True)
    IsDeleted = models.CharField(max_length=10, db_column="IsDeleted", blank=True, null=True)
    NLabourOffice = models.TextField(db_column="NLabourOffice", blank=True, null=True)
    Nature = models.CharField(max_length=200, db_column="Nature", blank=True, null=True)
    PrincipalRegistration = models.TextField(db_column="PrincipalRegistration", blank=True, null=True)
    IssuingAuthority = models.TextField(db_column="IssuingAuthority", blank=True, null=True)
    CLRA_MaxWorkers = models.TextField(db_column="CLRA_MaxWorkers", blank=True, null=True)
    CLRA_Validity = models.TextField(db_column="CLRA_Validity", blank=True, null=True)
    RCCopy = models.TextField(db_column="RCCopy", blank=True, null=True)
    RenewalRCCopy = models.TextField(db_column="RenewalRCCopy", blank=True, null=True)
    BOCW_Reg = models.TextField(db_column="BOCW_Reg", blank=True, null=True)
    BOCW_IssuingAuth = models.TextField(db_column="BOCW_IssuingAuth", blank=True, null=True)
    BOCW_MaxWorkers = models.TextField(db_column="BOCW_MaxWorkers", blank=True, null=True)
    BOCW_Validity = models.TextField(db_column="BOCW_Validity", blank=True, null=True)
    BOCWRCCopy = models.TextField(db_column="BOCWRCCopy", blank=True, null=True)
    RenewalBOCWRCCopy = models.TextField(db_column="RenewalBOCWRCCopy", blank=True, null=True)
    VendorType = models.TextField(db_column="VendorType", blank=True, null=True)
    MaxContractors = models.TextField(db_column="MaxContractors", blank=True, null=True)
    MaxWorkersSite = models.TextField(db_column="MaxWorkersSite", blank=True, null=True)
    PPEMandatory = models.TextField(db_column="PPEMandatory", blank=True, null=True)
    PPEType = models.TextField(db_column="PPEType", blank=True, null=True)
    SafetyTraining = models.TextField(db_column="SafetyTraining", blank=True, null=True)
    SiteInduction = models.TextField(db_column="SiteInduction", blank=True, null=True)
    PoliceVerification = models.TextField(db_column="PoliceVerification", blank=True, null=True)
    IDCardRequired = models.TextField(db_column="IDCardRequired", blank=True, null=True)
    AssignColor = models.TextField(db_column="AssignColor", blank=True, null=True)
    Drinkingwater = models.TextField(db_column="Drinkingwater", blank=True, null=True)
    Washroom = models.TextField(db_column="Washroom", blank=True, null=True)
    RestShelter = models.TextField(db_column="RestShelter", blank=True, null=True)
    FirstAid = models.TextField(db_column="FirstAid", blank=True, null=True)
    TrainerName = models.TextField(db_column="TrainerName", blank=True, null=True)
    ValidDay = models.TextField(db_column="ValidDay", blank=True, null=True)
    ReminderDay = models.TextField(db_column="ReminderDay", blank=True, null=True)
    SiteType = models.TextField(db_column="SiteType", blank=True, null=True)

    class Meta:
        managed = False
        db_table = "bss_legacy_evm_tbl_sitemanager"


# ---------------------------------------------------------------------------
# Phase 7 — Compliance calendar / statutory family (RetailController.cs).
# Backed by the migrated RTL.* Postgres tables. `managed=False` because the
# tables already exist; Django never alters them.
# ---------------------------------------------------------------------------


class RetailActCalender(models.Model):
    """RTL.USP_CreateActCalender backing table (masters / labour / secretarial
    share the same shape; this is the generic compliance-calendar row)."""
    Id = models.AutoField(primary_key=True, db_column="Id")
    State = models.IntegerField(db_column="State", null=True, blank=True)
    Act = models.TextField(db_column="Act", blank=True, null=True)
    Constitution = models.TextField(db_column="Constitution", blank=True, null=True)
    Department = models.TextField(db_column="Department", blank=True, null=True)
    Month = models.TextField(db_column="Month", blank=True, null=True)
    Year = models.TextField(db_column="Year", blank=True, null=True)
    Frequency = models.TextField(db_column="Frequency", blank=True, null=True)
    Ministry = models.TextField(db_column="Ministry", blank=True, null=True)
    ComplianceName = models.TextField(db_column="ComplianceName", blank=True, null=True)
    Calendartype = models.TextField(db_column="Calendartype", blank=True, null=True)
    Risk = models.TextField(db_column="Risk", blank=True, null=True)
    ComplianceType = models.TextField(db_column="ComplianceType", blank=True, null=True)
    Description = models.TextField(db_column="Description", blank=True, null=True)
    DueDate = models.DateTimeField(db_column="DueDate", null=True, blank=True)
    UploadFile = models.TextField(db_column="UploadFile", blank=True, null=True)
    Createdon = models.DateTimeField(db_column="Createdon", null=True, blank=True)
    Industry = models.IntegerField(db_column="Industry", null=True, blank=True)
    ActOverview = models.TextField(db_column="ActOverview", blank=True, null=True)
    excelFile = models.TextField(db_column="excelFile", blank=True, null=True)
    selectedCategory = models.TextField(db_column="selectedCategory", blank=True, null=True)
    selectedSubcategory = models.TextField(db_column="selectedSubcategory", blank=True, null=True)
    DueDay = models.TextField(db_column="DueDay", blank=True, null=True)
    Expire = models.TextField(db_column="Expire", blank=True, null=True)
    ComplianceLevel = models.TextField(db_column="ComplianceLevel", blank=True, null=True)
    currDate = models.TextField(db_column="currDate", blank=True, null=True)
    Rules = models.TextField(db_column="Rules", blank=True, null=True)
    Section = models.TextField(db_column="Section", blank=True, null=True)
    FormNo = models.TextField(db_column="FormNo", blank=True, null=True)

    class Meta:
        managed = False
        db_table = "bss_legacy_rtl_createactcalender"


class RetailFinacialActCalender(models.Model):
    """RTL.USP_FinacialCreateActCalender backing table."""
    Id = models.AutoField(primary_key=True, db_column="Id")
    State = models.IntegerField(db_column="State", null=True, blank=True)
    Act = models.TextField(db_column="Act", blank=True, null=True)
    Constitution = models.TextField(db_column="Constitution", blank=True, null=True)
    Department = models.TextField(db_column="Department", blank=True, null=True)
    Month = models.TextField(db_column="Month", blank=True, null=True)
    Year = models.TextField(db_column="Year", blank=True, null=True)
    Frequency = models.TextField(db_column="Frequency", blank=True, null=True)
    Ministry = models.TextField(db_column="Ministry", blank=True, null=True)
    ComplianceName = models.TextField(db_column="ComplianceName", blank=True, null=True)
    Calendartype = models.TextField(db_column="Calendartype", blank=True, null=True)
    Risk = models.TextField(db_column="Risk", blank=True, null=True)
    ComplianceType = models.TextField(db_column="ComplianceType", blank=True, null=True)
    Description = models.TextField(db_column="Description", blank=True, null=True)
    DueDate = models.DateTimeField(db_column="DueDate", null=True, blank=True)
    UploadFile = models.TextField(db_column="UploadFile", blank=True, null=True)
    Createdon = models.DateTimeField(db_column="Createdon", null=True, blank=True)
    Industry = models.IntegerField(db_column="Industry", null=True, blank=True)
    ActOverview = models.TextField(db_column="ActOverview", blank=True, null=True)
    excelFile = models.TextField(db_column="excelFile", blank=True, null=True)
    selectedCategory = models.TextField(db_column="selectedCategory", blank=True, null=True)
    selectedSubcategory = models.TextField(db_column="selectedSubcategory", blank=True, null=True)
    DueDay = models.TextField(db_column="DueDay", blank=True, null=True)
    Expire = models.TextField(db_column="Expire", blank=True, null=True)
    ComplianceLevel = models.TextField(db_column="ComplianceLevel", blank=True, null=True)
    Rules = models.TextField(db_column="Rules", blank=True, null=True)
    Section = models.TextField(db_column="Section", blank=True, null=True)
    currDate = models.TextField(db_column="currDate", blank=True, null=True)
    Forms = models.TextField(db_column="Forms", blank=True, null=True)
    Applicability = models.TextField(db_column="Applicability", blank=True, null=True)

    class Meta:
        managed = False
        db_table = "bss_legacy_rtl_createactcalenderfinacial"


class RetailFactoryCompliance(models.Model):
    """RTL.USP_FactoryCompliance backing table."""
    Id = models.AutoField(primary_key=True, db_column="Id")
    State = models.IntegerField(db_column="State", null=True, blank=True)
    Act = models.TextField(db_column="Act", blank=True, null=True)
    Constitution = models.TextField(db_column="Constitution", blank=True, null=True)
    Department = models.TextField(db_column="Department", blank=True, null=True)
    Month = models.TextField(db_column="Month", blank=True, null=True)
    Year = models.TextField(db_column="Year", blank=True, null=True)
    Frequency = models.TextField(db_column="Frequency", blank=True, null=True)
    Ministry = models.TextField(db_column="Ministry", blank=True, null=True)
    ComplianceName = models.TextField(db_column="ComplianceName", blank=True, null=True)
    Calendartype = models.TextField(db_column="Calendartype", blank=True, null=True)
    Risk = models.TextField(db_column="Risk", blank=True, null=True)
    ComplianceType = models.TextField(db_column="ComplianceType", blank=True, null=True)
    Description = models.TextField(db_column="Description", blank=True, null=True)
    CompanyCategory = models.TextField(db_column="CompanyCategory", blank=True, null=True)
    DueDate = models.DateTimeField(db_column="DueDate", null=True, blank=True)
    UploadFile = models.TextField(db_column="UploadFile", blank=True, null=True)
    Createdon = models.DateTimeField(db_column="Createdon", null=True, blank=True)
    Industry = models.IntegerField(db_column="Industry", null=True, blank=True)
    ActOverview = models.TextField(db_column="ActOverview", blank=True, null=True)
    excelFile = models.TextField(db_column="excelFile", blank=True, null=True)
    selectedCategory = models.TextField(db_column="selectedCategory", blank=True, null=True)
    selectedSubcategory = models.TextField(db_column="selectedSubcategory", blank=True, null=True)
    DueDay = models.TextField(db_column="DueDay", blank=True, null=True)
    Expire = models.TextField(db_column="Expire", blank=True, null=True)
    ComplianceLevel = models.TextField(db_column="ComplianceLevel", blank=True, null=True)
    Section = models.TextField(db_column="Section", blank=True, null=True)
    Rules = models.TextField(db_column="Rules", blank=True, null=True)
    currDate = models.TextField(db_column="currDate", blank=True, null=True)
    EntityType = models.TextField(db_column="EntityType", blank=True, null=True)
    ListedStatus = models.TextField(db_column="ListedStatus", blank=True, null=True)
    StockExchange = models.TextField(db_column="StockExchange", blank=True, null=True)
    FundingStatus = models.TextField(db_column="FundingStatus", blank=True, null=True)
    FundingType = models.TextField(db_column="FundingType", blank=True, null=True)
    FormNo = models.TextField(db_column="FormNo", blank=True, null=True)

    class Meta:
        managed = False
        db_table = "bss_legacy_rtl_createactcalenderfactory"


class RetailLabourCodeCompliance(models.Model):
    """RTL.USP_LabourCodeCompliance backing table."""
    Id = models.AutoField(primary_key=True, db_column="Id")
    State = models.IntegerField(db_column="State", null=True, blank=True)
    Act = models.TextField(db_column="Act", blank=True, null=True)
    Constitution = models.TextField(db_column="Constitution", blank=True, null=True)
    Department = models.TextField(db_column="Department", blank=True, null=True)
    Month = models.TextField(db_column="Month", blank=True, null=True)
    Year = models.TextField(db_column="Year", blank=True, null=True)
    Frequency = models.TextField(db_column="Frequency", blank=True, null=True)
    Ministry = models.TextField(db_column="Ministry", blank=True, null=True)
    ComplianceName = models.TextField(db_column="ComplianceName", blank=True, null=True)
    Calendartype = models.TextField(db_column="Calendartype", blank=True, null=True)
    Risk = models.TextField(db_column="Risk", blank=True, null=True)
    ComplianceType = models.TextField(db_column="ComplianceType", blank=True, null=True)
    Description = models.TextField(db_column="Description", blank=True, null=True)
    CompanyCategory = models.TextField(db_column="CompanyCategory", blank=True, null=True)
    DueDate = models.DateTimeField(db_column="DueDate", null=True, blank=True)
    UploadFile = models.TextField(db_column="UploadFile", blank=True, null=True)
    Createdon = models.DateTimeField(db_column="Createdon", null=True, blank=True)
    Industry = models.IntegerField(db_column="Industry", null=True, blank=True)
    ActOverview = models.TextField(db_column="ActOverview", blank=True, null=True)
    excelFile = models.TextField(db_column="excelFile", blank=True, null=True)
    selectedCategory = models.TextField(db_column="selectedCategory", blank=True, null=True)
    selectedSubcategory = models.TextField(db_column="selectedSubcategory", blank=True, null=True)
    DueDay = models.TextField(db_column="DueDay", blank=True, null=True)
    Expire = models.TextField(db_column="Expire", blank=True, null=True)
    ComplianceLevel = models.TextField(db_column="ComplianceLevel", blank=True, null=True)
    Section = models.TextField(db_column="Section", blank=True, null=True)
    Rules = models.TextField(db_column="Rules", blank=True, null=True)
    currDate = models.TextField(db_column="currDate", blank=True, null=True)
    EntityType = models.TextField(db_column="EntityType", blank=True, null=True)
    ListedStatus = models.TextField(db_column="ListedStatus", blank=True, null=True)
    StockExchange = models.TextField(db_column="StockExchange", blank=True, null=True)
    FundingStatus = models.TextField(db_column="FundingStatus", blank=True, null=True)
    FundingType = models.TextField(db_column="FundingType", blank=True, null=True)
    FormNo = models.TextField(db_column="FormNo", blank=True, null=True)
    DetailedCompliance = models.TextField(db_column="DetailedCompliance", blank=True, null=True)
    ImpactEmployer = models.TextField(db_column="ImpactEmployer", blank=True, null=True)

    class Meta:
        managed = False
        db_table = "bss_legacy_rtl_labourcodecompliance"


class _InternalStatutoryBase(models.Model):
    """Shared shape of the client statutory-internal tables."""
    Id = models.AutoField(primary_key=True, db_column="Id")
    CACId = models.IntegerField(db_column="CACId", null=True, blank=True)
    ASD = models.DateField(db_column="ASD", null=True, blank=True)
    SetupId = models.IntegerField(db_column="SetupId", null=True, blank=True)
    CSD = models.DateField(db_column="CSD", null=True, blank=True)
    RegNo = models.TextField(db_column="RegNo", blank=True, null=True)
    DelayDay = models.IntegerField(db_column="DelayDay", null=True, blank=True)
    UploadFile = models.TextField(db_column="UploadFile", blank=True, null=True)
    Status = models.TextField(db_column="Status", blank=True, null=True)
    VRemark = models.TextField(db_column="VRemark", blank=True, null=True)
    CRemark = models.TextField(db_column="CRemark", blank=True, null=True)
    IsVerified = models.TextField(db_column="IsVerified", blank=True, null=True)
    CreateOn = models.DateTimeField(db_column="CreateOn", null=True, blank=True)
    Createdby = models.IntegerField(db_column="Createdby", null=True, blank=True)
    Flag = models.IntegerField(db_column="Flag", null=True, blank=True)
    ClientId = models.IntegerField(db_column="ClientId", null=True, blank=True)

    class Meta:
        abstract = True


class ClientStatutoryInternal(_InternalStatutoryBase):
    """RTL.USP_StatutoryInternal / usp_ClientStatutoryInternal rows."""
    StoreId = models.TextField(db_column="StoreId", blank=True, null=True)
    MapId = models.IntegerField(db_column="MapId", null=True, blank=True)

    class Meta:
        managed = False
        db_table = "bss_legacy_rtl_clientstatutoryinternal"


class ClientSecretarialStatutoryInternal(_InternalStatutoryBase):
    """RTL.USP_SecretarialStatutory / usp_ClientSecretarialStatutoryInternal."""
    class Meta:
        managed = False
        db_table = "bss_legacy_rtl_clientsecretarialstatutoryinternal"


class ClientFinancialStatutoryInternal(_InternalStatutoryBase):
    """RTL.USP_FinancialStatutory / usp_ClientFinancialStatutoryInternal."""
    MapId = models.IntegerField(db_column="MapId", null=True, blank=True)

    class Meta:
        managed = False
        db_table = "bss_legacy_rtl_clientstatutoryinternalfinacial"


class ClientFactoryStatutoryInternal(_InternalStatutoryBase):
    """RTL.USP_FactoryStatutory / usp_ClientFactoryStatutoryInternal."""
    class Meta:
        managed = False
        db_table = "bss_legacy_rtl_clientstatutoryinternalfactory"


class ClientLabourCodeInternal(_InternalStatutoryBase):
    """RTL.USP_LabourCode / usp_ClientLabourCodeInternal."""
    class Meta:
        managed = False
        db_table = "bss_legacy_rtl_clientlabourcode"


class ClientStatutoryInternalEvents(_InternalStatutoryBase):
    """usp_ClientLabourStatutoryInternalEvent (labour event compliance)."""
    StoreId = models.TextField(db_column="StoreId", blank=True, null=True)
    MapId = models.IntegerField(db_column="MapId", null=True, blank=True)

    class Meta:
        managed = False
        db_table = "bss_legacy_rtl_clientstatutoryinternalevents"


class ClientFactoryStatutoryInternalEvent(_InternalStatutoryBase):
    """usp_ClientFactoryStatutoryInternalEvent (factory event compliance)."""
    class Meta:
        managed = False
        db_table = "bss_legacy_rtl_clientstatutoryinternalfactoryevent"


class ClientFinancialStatutoryInternalNewEvent(_InternalStatutoryBase):
    """RTL.USP_FinancialStatutoryEvent (financial event compliance)."""
    MapId = models.IntegerField(db_column="MapId", null=True, blank=True)

    class Meta:
        managed = False
        db_table = "bss_legacy_rtl_clientstatutoryinternalfinacialnewevent"


class StatutorySetup(models.Model):
    """USP_StatutorySetup rows (per-client statutory registration)."""
    ID = models.AutoField(primary_key=True, db_column="ID")
    State = models.TextField(db_column="State", blank=True, null=True)
    Act = models.TextField(db_column="Act", blank=True, null=True)
    ComplianceName = models.TextField(db_column="ComplianceName", blank=True, null=True)
    RegistrationNumber = models.TextField(db_column="RegistrationNumber", blank=True, null=True)
    ValidFrom = models.DateField(db_column="ValidFrom", null=True, blank=True)
    ValidTo = models.DateField(db_column="ValidTo", null=True, blank=True)
    TypeCode = models.TextField(db_column="TypeCode", blank=True, null=True)
    RegistrationType = models.TextField(db_column="RegistrationType", blank=True, null=True)
    Upoad = models.TextField(db_column="Upoad", blank=True, null=True)
    CreatedBy = models.IntegerField(db_column="CreatedBy", null=True, blank=True)
    CreatedOn = models.DateTimeField(db_column="CreatedOn", null=True, blank=True)
    CACID = models.IntegerField(db_column="CACID", null=True, blank=True)

    class Meta:
        managed = False
        db_table = "bss_legacy_rtl_statutorysetup"


class StatutorySecretarialSetup(models.Model):
    """USP_StatutorySecretarialSetup rows."""
    ID = models.AutoField(primary_key=True, db_column="ID")
    State = models.TextField(db_column="State", blank=True, null=True)
    Act = models.TextField(db_column="Act", blank=True, null=True)
    ComplianceName = models.TextField(db_column="ComplianceName", blank=True, null=True)
    RegistrationNumber = models.TextField(db_column="RegistrationNumber", blank=True, null=True)
    ValidFrom = models.DateField(db_column="ValidFrom", null=True, blank=True)
    ValidTo = models.DateField(db_column="ValidTo", null=True, blank=True)
    TypeCode = models.TextField(db_column="TypeCode", blank=True, null=True)
    RegistrationType = models.TextField(db_column="RegistrationType", blank=True, null=True)
    Upoad = models.TextField(db_column="Upoad", blank=True, null=True)
    CreatedBy = models.IntegerField(db_column="CreatedBy", null=True, blank=True)
    CreatedOn = models.DateTimeField(db_column="CreatedOn", null=True, blank=True)
    CACID = models.IntegerField(db_column="CACID", null=True, blank=True)

    class Meta:
        managed = False
        db_table = "bss_legacy_rtl_statutorysecretarialsetup"


class StatutoryFinancialSetup(models.Model):
    """USP_FinancialSetup rows."""
    ID = models.AutoField(primary_key=True, db_column="ID")
    State = models.TextField(db_column="State", blank=True, null=True)
    Act = models.TextField(db_column="Act", blank=True, null=True)
    ComplianceName = models.TextField(db_column="ComplianceName", blank=True, null=True)
    RegistrationNumber = models.TextField(db_column="RegistrationNumber", blank=True, null=True)
    ValidFrom = models.DateField(db_column="ValidFrom", null=True, blank=True)
    ValidTo = models.DateField(db_column="ValidTo", null=True, blank=True)
    TypeCode = models.TextField(db_column="TypeCode", blank=True, null=True)
    RegistrationType = models.TextField(db_column="RegistrationType", blank=True, null=True)
    Upoad = models.TextField(db_column="Upoad", blank=True, null=True)
    CreatedBy = models.IntegerField(db_column="CreatedBy", null=True, blank=True)
    CreatedOn = models.DateTimeField(db_column="CreatedOn", null=True, blank=True)
    CACID = models.IntegerField(db_column="CACID", null=True, blank=True)

    class Meta:
        managed = False
        db_table = "bss_legacy_rtl_statutoryfinancialsetup"


class IndustryMapping(models.Model):
    """RTL.USP_IndustryMapping backing rows (party/user <-> industry)."""
    Id = models.AutoField(primary_key=True, db_column="Id")
    PartyId = models.IntegerField(db_column="PartyId", null=True, blank=True)
    UserId = models.IntegerField(db_column="UserId", null=True, blank=True)
    Industry = models.IntegerField(db_column="Industry", null=True, blank=True)

    class Meta:
        managed = False
        db_table = "bss_legacy_rtl_industrymapping"


class RetailActMaster(models.Model):
    """Act master (dbo.RetailActMaster) — resolves Act ids to names."""
    ActId = models.IntegerField(primary_key=True, db_column="ActId")
    Act = models.TextField(db_column="Act", blank=True, null=True)
    CreatedOn = models.DateTimeField(db_column="CreatedOn", null=True, blank=True)
    selectedCategory = models.TextField(db_column="selectedCategory", blank=True, null=True)
    selectedSubcategory = models.TextField(db_column="selectedSubcategory", blank=True, null=True)

    class Meta:
        managed = False
        db_table = "bss_legacy_dbo_retailactmaster"


class BoardingMapping(models.Model):
    """RTL.USP_BoardingMapping backing rows."""
    Id = models.AutoField(primary_key=True, db_column="Id")
    PartyId = models.TextField(db_column="PartyId", blank=True, null=True)
    UserId = models.TextField(db_column="UserId", blank=True, null=True)
    BoardingType = models.TextField(db_column="BoardingType", blank=True, null=True)

    class Meta:
        managed = False
        db_table = "bss_legacy_rtl_boardingmapping"


# ---------------------------------------------------------------------------
# Report / Communication / Newsletter / Email support tables (bulk-migrated
# from SQL Server, unmanaged so Django never alters them).
# ---------------------------------------------------------------------------


class Mapping(models.Model):
    Id = models.AutoField(primary_key=True, db_column="Id")
    Sno = models.IntegerField(db_column="Sno", null=True, blank=True)
    ClientId = models.IntegerField(db_column="ClientId", null=True, blank=True)
    ClientSiteId = models.IntegerField(db_column="ClientSiteId", null=True, blank=True)
    VendorId = models.IntegerField(db_column="VendorId", null=True, blank=True)
    AuditorId = models.IntegerField(db_column="AuditorId", null=True, blank=True)
    Createdby = models.IntegerField(db_column="Createdby", null=True, blank=True)

    class Meta:
        managed = False
        db_table = "bss_legacy_dbo_mapping"


class Conversation(models.Model):
    Id = models.AutoField(primary_key=True, db_column="Id")
    ConversationId = models.TextField(db_column="ConversationId", blank=True, null=True)
    SNO = models.IntegerField(db_column="SNO", null=True, blank=True)
    InvoiceNo = models.TextField(db_column="InvoiceNo", blank=True, null=True)
    Conversation = models.TextField(db_column="Conversation", blank=True, null=True)
    Detail = models.TextField(db_column="Detail", blank=True, null=True)
    Sender = models.TextField(db_column="Sender", blank=True, null=True)
    Receiver = models.TextField(db_column="Receiver", blank=True, null=True)
    DocumentName1 = models.TextField(db_column="DocumentName1", blank=True, null=True)
    Document1 = models.TextField(db_column="Document1", blank=True, null=True)
    DocuumentApprove1 = models.IntegerField(db_column="DocuumentApprove1", null=True, blank=True)
    DocumentName2 = models.TextField(db_column="DocumentName2", blank=True, null=True)
    Document2 = models.TextField(db_column="Document2", blank=True, null=True)
    DocuumentApprove2 = models.IntegerField(db_column="DocuumentApprove2", null=True, blank=True)
    DocumentName3 = models.TextField(db_column="DocumentName3", blank=True, null=True)
    Document3 = models.TextField(db_column="Document3", blank=True, null=True)
    DocuumentApprove3 = models.IntegerField(db_column="DocuumentApprove3", null=True, blank=True)
    DocumentName4 = models.TextField(db_column="DocumentName4", blank=True, null=True)
    Document4 = models.TextField(db_column="Document4", blank=True, null=True)
    DocuumentApprove4 = models.IntegerField(db_column="DocuumentApprove4", null=True, blank=True)
    DocumentName5 = models.TextField(db_column="DocumentName5", blank=True, null=True)
    Document5 = models.TextField(db_column="Document5", blank=True, null=True)
    DocuumentApprove5 = models.IntegerField(db_column="DocuumentApprove5", null=True, blank=True)
    Updatedby = models.TextField(db_column="Updatedby", blank=True, null=True)
    UpdatedON = models.DateTimeField(db_column="UpdatedON", null=True, blank=True)
    Isdelete = models.IntegerField(db_column="Isdelete", null=True, blank=True)
    Status = models.IntegerField(db_column="Status", null=True, blank=True)
    IsRead = models.IntegerField(db_column="IsRead", null=True, blank=True)
    mtype = models.TextField(db_column="mtype", blank=True, null=True)

    class Meta:
        managed = False
        db_table = "bss_legacy_dbo_conversation"


class ConversationDocument(models.Model):
    Id = models.AutoField(primary_key=True, db_column="Id")
    ConversationId = models.TextField(db_column="ConversationId", blank=True, null=True)
    SNo = models.IntegerField(db_column="SNo", null=True, blank=True)
    InvoiceNo = models.TextField(db_column="InvoiceNo", blank=True, null=True)
    DocumentFile = models.TextField(db_column="DocumentFile", blank=True, null=True)
    DocumentName = models.TextField(db_column="DocumentName", blank=True, null=True)
    DocumentId = models.IntegerField(db_column="DocumentId", null=True, blank=True)
    Status = models.IntegerField(db_column="Status", null=True, blank=True)
    UpdatedOn = models.DateTimeField(db_column="UpdatedOn", null=True, blank=True)
    Updatedby = models.TextField(db_column="Updatedby", blank=True, null=True)
    Isdelete = models.IntegerField(db_column="Isdelete", null=True, blank=True)
    APercentage = models.TextField(db_column="APercentage", blank=True, null=True)
    Detail = models.TextField(db_column="Detail", blank=True, null=True)

    class Meta:
        managed = False
        db_table = "bss_legacy_dbo_conversationdocument"


class RetailDepartmentMaster(models.Model):
    DepartmentId = models.IntegerField(primary_key=True, db_column="DepartmentId")
    DepartmentName = models.TextField(db_column="DepartmentName", blank=True, null=True)

    class Meta:
        managed = False
        db_table = "bss_legacy_rtl_retaildepartmentmaster"


class EmailMaster(models.Model):
    Id = models.IntegerField(primary_key=True, db_column="Id")
    EmailId = models.TextField(db_column="EmailId", blank=True, null=True)
    Password = models.TextField(db_column="Password", blank=True, null=True)
    Port = models.IntegerField(db_column="Port", null=True, blank=True)
    Host = models.TextField(db_column="Host", blank=True, null=True)
    Subject = models.TextField(db_column="Subject", blank=True, null=True)
    Message = models.TextField(db_column="Message", blank=True, null=True)

    class Meta:
        managed = False
        db_table = "bss_legacy_dbo_tblemailmaster"


class EmailLog(models.Model):
    """Outbound email sink — SMTP is not configured in this environment, so
    'sent' emails are logged here instead of being dispatched."""
    Id = models.AutoField(primary_key=True, db_column="Id")
    Action = models.IntegerField(db_column="Action", null=True, blank=True)
    FromEmail = models.TextField(db_column="FromEmail", blank=True, null=True)
    ToEmail = models.TextField(db_column="ToEmail", blank=True, null=True)
    ReplyToList = models.TextField(db_column="ReplyToList", blank=True, null=True)
    EmailName = models.TextField(db_column="EmailName", blank=True, null=True)
    Subject = models.TextField(db_column="Subject", blank=True, null=True)
    Message = models.TextField(db_column="Message", blank=True, null=True)
    SmtpServer = models.TextField(db_column="SmtpServer", blank=True, null=True)
    SmtpPort = models.IntegerField(db_column="SmtpPort", null=True, blank=True)
    LicenseRequestId = models.TextField(db_column="LicenseRequestId", blank=True, null=True)
    StoreCode = models.TextField(db_column="StoreCode", blank=True, null=True)
    LicenseNumber = models.TextField(db_column="LicenseNumber", blank=True, null=True)
    LicenseName = models.TextField(db_column="LicenseName", blank=True, null=True)
    StartDate = models.TextField(db_column="StartDate", blank=True, null=True)
    EndDate = models.TextField(db_column="EndDate", blank=True, null=True)
    ReminderDate = models.TextField(db_column="ReminderDate", blank=True, null=True)
    LED = models.TextField(db_column="LED", blank=True, null=True)
    DaysOfExpire = models.TextField(db_column="DaysOfExpire", blank=True, null=True)
    UserName = models.TextField(db_column="UserName", blank=True, null=True)
    Status = models.TextField(db_column="Status", blank=True, null=True)
    CreatedBy = models.IntegerField(db_column="CreatedBy", null=True, blank=True)
    CreatedOn = models.DateTimeField(db_column="CreatedOn", null=True, blank=True)

    class Meta:
        db_table = "bss_legacy_dbo_emaillog"


# ---------------------------------------------------------------------------
# Phase 8 — Business modules (Grievances, DocumentMaster, VenInvoice, Skill,
# Rozgar, Rating). Unmanaged so Django never alters the migrated tables.
# ---------------------------------------------------------------------------


class GrievanceMaster(models.Model):
    Id = models.AutoField(primary_key=True, db_column="Id")
    LoginId = models.IntegerField(db_column="LoginId", null=True, blank=True)
    Subject = models.TextField(db_column="Subject", blank=True, null=True)
    AiText = models.TextField(db_column="AiText", blank=True, null=True)
    AudioFileName = models.TextField(db_column="AudioFileName", blank=True, null=True)
    Documents = models.TextField(db_column="Documents", blank=True, null=True)
    CreatedOn = models.DateTimeField(db_column="CreatedOn", null=True, blank=True)
    Status = models.TextField(db_column="Status", blank=True, null=True)
    UpdateOn = models.DateTimeField(db_column="UpdateOn", null=True, blank=True)
    VendorReaction = models.TextField(db_column="VendorReaction", blank=True, null=True)
    ClientReaction = models.TextField(db_column="ClientReaction", blank=True, null=True)
    Letter = models.TextField(db_column="Letter", blank=True, null=True)
    approveletter = models.IntegerField(db_column="approveletter", null=True, blank=True)
    approvedt = models.DateField(db_column="approvedt", null=True, blank=True)

    class Meta:
        managed = False
        db_table = "bss_legacy_dbo_grievancemaster"


class GrievanceCommunication(models.Model):
    Id = models.BigAutoField(primary_key=True, db_column="Id")
    Gid = models.BigIntegerField(db_column="Gid", null=True, blank=True)
    Sender = models.BigIntegerField(db_column="Sender", null=True, blank=True)
    Receiver = models.BigIntegerField(db_column="Receiver", null=True, blank=True)
    CommunicationText = models.TextField(db_column="CommunicationText", blank=True, null=True)
    IsRead = models.BooleanField(db_column="IsRead", null=True, blank=True)
    CreatedOn = models.DateTimeField(db_column="CreatedOn", null=True, blank=True)
    UpdatedOn = models.DateTimeField(db_column="UpdatedOn", null=True, blank=True)

    class Meta:
        managed = False
        db_table = "bss_legacy_dbo_grievancecommunication"


class GrivanceTracking(models.Model):
    Id = models.AutoField(primary_key=True, db_column="Id")
    GId = models.IntegerField(db_column="GId", null=True, blank=True)
    CreatedOn = models.DateTimeField(db_column="CreatedOn", null=True, blank=True)
    CStatus = models.TextField(db_column="CStatus", blank=True, null=True)
    Letter = models.TextField(db_column="Letter", blank=True, null=True)
    Reaction = models.TextField(db_column="Reaction", blank=True, null=True)

    class Meta:
        managed = False
        db_table = "bss_legacy_dbo_grivancestracking"


class DocumentMaster(models.Model):
    Id = models.AutoField(primary_key=True, db_column="Id")
    DocumentName = models.TextField(db_column="DocumentName", blank=True, null=True)
    Oid = models.IntegerField(db_column="Oid", null=True, blank=True)
    DocumentType = models.TextField(db_column="DocumentType", blank=True, null=True)
    Frequency = models.TextField(db_column="Frequency", blank=True, null=True)
    FormatType = models.TextField(db_column="FormatType", blank=True, null=True)
    Note = models.TextField(db_column="Note", blank=True, null=True)
    IsDefault = models.BooleanField(db_column="IsDefault", null=True, blank=True)
    CreatedOn = models.DateTimeField(db_column="CreatedOn", null=True, blank=True)
    Createdby = models.TextField(db_column="Createdby", blank=True, null=True)
    Updatedby = models.TextField(db_column="Updatedby", blank=True, null=True)
    UpdatedON = models.DateTimeField(db_column="UpdatedON", null=True, blank=True)
    Isdelete = models.BooleanField(db_column="Isdelete", null=True, blank=True)
    FormNo = models.TextField(db_column="FormNo", blank=True, null=True)
    StateId = models.TextField(db_column="StateId", blank=True, null=True)
    Criticality = models.TextField(db_column="Criticality", blank=True, null=True)
    Act = models.TextField(db_column="Act", blank=True, null=True)

    class Meta:
        managed = False
        db_table = "bss_legacy_dbo_documentmaster"


class OneTimeDocument(models.Model):
    Id = models.AutoField(primary_key=True, db_column="Id")
    DocumentName = models.TextField(db_column="DocumentName", blank=True, null=True)
    PartyType = models.IntegerField(db_column="PartyType", null=True, blank=True)
    AllowExpire = models.IntegerField(db_column="AllowExpire", null=True, blank=True)
    AllowFileUpload = models.IntegerField(db_column="AllowFileUpload", null=True, blank=True)
    CreatedOn = models.DateTimeField(db_column="CreatedOn", null=True, blank=True)
    Createdby = models.TextField(db_column="Createdby", blank=True, null=True)
    Updatedby = models.TextField(db_column="Updatedby", blank=True, null=True)
    UpdatedON = models.DateTimeField(db_column="UpdatedON", null=True, blank=True)
    Isdelete = models.BooleanField(db_column="Isdelete", null=True, blank=True)
    Orderby = models.IntegerField(db_column="Orderby", null=True, blank=True)

    class Meta:
        managed = False
        db_table = "bss_legacy_dbo_onetimedocument"


class OneTimeDocumentRegistration(models.Model):
    Id = models.AutoField(primary_key=True, db_column="Id")
    UserId = models.IntegerField(db_column="UserId", null=True, blank=True)
    DocumentId = models.IntegerField(db_column="DocumentId", null=True, blank=True)
    Description = models.TextField(db_column="Description", blank=True, null=True)
    FileDoc = models.TextField(db_column="FileDoc", blank=True, null=True)
    VaildFrom = models.DateTimeField(db_column="VaildFrom", null=True, blank=True)
    VaildTo = models.DateTimeField(db_column="VaildTo", null=True, blank=True)
    CreatedOn = models.DateTimeField(db_column="CreatedOn", null=True, blank=True)
    Createdby = models.TextField(db_column="Createdby", blank=True, null=True)
    Updatedby = models.TextField(db_column="Updatedby", blank=True, null=True)
    UpdatedON = models.DateTimeField(db_column="UpdatedON", null=True, blank=True)
    Isdelete = models.BooleanField(db_column="Isdelete", null=True, blank=True)
    Status = models.IntegerField(db_column="Status", null=True, blank=True)

    class Meta:
        managed = False
        db_table = "bss_legacy_dbo_onetimedocumentregistration"


class AuditorCompliance(models.Model):
    Id = models.AutoField(primary_key=True, db_column="Id")
    SNO = models.IntegerField(db_column="SNO", null=True, blank=True)
    InvoiceNo = models.TextField(db_column="InvoiceNo", blank=True, null=True)
    ComplianceId = models.TextField(db_column="ComplianceId", blank=True, null=True)
    ActId = models.IntegerField(db_column="ActId", null=True, blank=True)
    ClientId = models.IntegerField(db_column="ClientId", null=True, blank=True)
    Form = models.TextField(db_column="Form", blank=True, null=True)
    ComlianceScore = models.TextField(db_column="ComlianceScore", blank=True, null=True)
    ComplianceScoreAchieved = models.TextField(db_column="ComplianceScoreAchieved", blank=True, null=True)
    CompalianceStatus = models.IntegerField(db_column="CompalianceStatus", null=True, blank=True)
    Remark = models.TextField(db_column="Remark", blank=True, null=True)
    VendorRemark = models.TextField(db_column="VendorRemark", blank=True, null=True)
    Createdby = models.TextField(db_column="Createdby", blank=True, null=True)
    CreatedOn = models.DateTimeField(db_column="CreatedOn", null=True, blank=True)
    UpdatedOn = models.DateTimeField(db_column="UpdatedOn", null=True, blank=True)
    Updatedby = models.TextField(db_column="Updatedby", blank=True, null=True)
    Status = models.IntegerField(db_column="Status", null=True, blank=True)

    class Meta:
        managed = False
        db_table = "bss_legacy_dbo_auditorcompliance"


class AuditorComplianceFiles(models.Model):
    Id = models.AutoField(primary_key=True, db_column="Id")
    InvoiceNo = models.TextField(db_column="InvoiceNo", blank=True, null=True)
    ComplianceId = models.TextField(db_column="ComplianceId", blank=True, null=True)
    SrNo = models.IntegerField(db_column="SrNo", null=True, blank=True)
    VendorQuery = models.TextField(db_column="VendorQuery", blank=True, null=True)
    AuditorQuery = models.TextField(db_column="AuditorQuery", blank=True, null=True)
    Createdon = models.DateTimeField(db_column="Createdon", null=True, blank=True)
    RejectOn = models.DateTimeField(db_column="RejectOn", null=True, blank=True)
    Status = models.IntegerField(db_column="Status", null=True, blank=True)
    Remark = models.TextField(db_column="Remark", blank=True, null=True)
    ApproveOn = models.DateTimeField(db_column="ApproveOn", null=True, blank=True)

    class Meta:
        managed = False
        db_table = "bss_legacy_dbo_auditorcompliancefiles"


class ValidationDocument(models.Model):
    Id = models.AutoField(primary_key=True, db_column="Id")
    DocumentId = models.IntegerField(db_column="DocumentId", null=True, blank=True)
    ValdationId = models.TextField(db_column="ValdationId", blank=True, null=True)
    Value = models.TextField(db_column="Value", blank=True, null=True)

    class Meta:
        managed = False
        db_table = "bss_legacy_dbo_validationdocument"


class ComplianceMaster(models.Model):
    Id = models.AutoField(primary_key=True, db_column="Id")
    Act = models.TextField(db_column="Act", blank=True, null=True)
    Form = models.TextField(db_column="Form", blank=True, null=True)
    Nature = models.TextField(db_column="Nature", blank=True, null=True)
    REMARK = models.TextField(db_column="REMARK", blank=True, null=True)
    Score = models.TextField(db_column="Score", blank=True, null=True)

    class Meta:
        managed = False
        db_table = "bss_legacy_dbo_compliancemaster"


class InvoiceRegister(models.Model):
    Id = models.AutoField(primary_key=True, db_column="Id")
    InvoiceId = models.TextField(db_column="InvoiceId", blank=True, null=True)
    RegInvoiceNo = models.TextField(db_column="RegInvoiceNo", blank=True, null=True)
    Sno = models.IntegerField(db_column="Sno", null=True, blank=True)
    VendorInvNum = models.TextField(db_column="VendorInvNum", blank=True, null=True)
    ClientId = models.TextField(db_column="ClientId", blank=True, null=True)
    ClientSiteId = models.TextField(db_column="ClientSiteId", blank=True, null=True)
    FYID = models.TextField(db_column="FYID", blank=True, null=True)
    Month = models.TextField(db_column="Month", blank=True, null=True)
    InvDate = models.TextField(db_column="InvDate", blank=True, null=True)
    StateId = models.TextField(db_column="StateId", blank=True, null=True)
    Location = models.TextField(db_column="Location", blank=True, null=True)
    ManpowerType = models.TextField(db_column="ManpowerType", blank=True, null=True)
    ManpowerCount = models.TextField(db_column="ManpowerCount", blank=True, null=True)
    InvoiceType = models.TextField(db_column="InvoiceType", blank=True, null=True)
    CGST = models.TextField(db_column="CGST", blank=True, null=True)
    SGST = models.TextField(db_column="SGST", blank=True, null=True)
    IGST = models.TextField(db_column="IGST", blank=True, null=True)
    TaxableValue = models.TextField(db_column="TaxableValue", blank=True, null=True)
    GrossAmount = models.TextField(db_column="GrossAmount", blank=True, null=True)
    VendorId = models.TextField(db_column="VendorId", blank=True, null=True)
    VendorSiteId = models.TextField(db_column="VendorSiteId", blank=True, null=True)
    fileupload = models.TextField(db_column="fileupload", blank=True, null=True)
    Status = models.TextField(db_column="Status", blank=True, null=True)
    MapId = models.IntegerField(db_column="MapId", null=True, blank=True)
    Createdby = models.TextField(db_column="Createdby", blank=True, null=True)
    CreatedOn = models.DateTimeField(db_column="CreatedOn", null=True, blank=True)
    Updatedby = models.TextField(db_column="Updatedby", blank=True, null=True)
    UpdatedOn = models.DateTimeField(db_column="UpdatedOn", null=True, blank=True)
    Isdelete = models.IntegerField(db_column="Isdelete", null=True, blank=True)
    IsFlag = models.IntegerField(db_column="IsFlag", null=True, blank=True)
    TypeInvoice = models.TextField(db_column="TypeInvoice", blank=True, null=True)
    WIEndDate = models.DateTimeField(db_column="WIEndDate", null=True, blank=True)
    RTimeMinute = models.IntegerField(db_column="RTimeMinute", null=True, blank=True)
    RTimeHour = models.IntegerField(db_column="RTimeHour", null=True, blank=True)

    class Meta:
        managed = False
        db_table = "bss_legacy_dbo_invoiceregister"


class VendorInvoice(models.Model):
    VENDOR_INV_ID = models.AutoField(primary_key=True, db_column="VENDOR_INV_ID")
    VENDOR_INV_NUM = models.TextField(db_column="VENDOR_INV_NUM", blank=True, null=True)
    DESCRIPTION = models.TextField(db_column="DESCRIPTION", blank=True, null=True)
    VENDOR_ID = models.TextField(db_column="VENDOR_ID", blank=True, null=True)
    VENDOR_SITE_ID = models.IntegerField(db_column="VENDOR_SITE_ID", null=True, blank=True)
    VENDOR_PARTY_TYPE_ID = models.IntegerField(db_column="VENDOR_PARTY_TYPE_ID", null=True, blank=True)
    INV_DATE = models.DateTimeField(db_column="INV_DATE", null=True, blank=True)
    INV_AMOUNT = models.IntegerField(db_column="INV_AMOUNT", null=True, blank=True)
    AUDIT_ID = models.IntegerField(db_column="AUDIT_ID", null=True, blank=True)
    AUDIT_SITE_ID = models.IntegerField(db_column="AUDIT_SITE_ID", null=True, blank=True)
    AUDIT_PARTY_TYPE_ID = models.IntegerField(db_column="AUDIT_PARTY_TYPE_ID", null=True, blank=True)
    CUSTOMER_ID = models.IntegerField(db_column="CUSTOMER_ID", null=True, blank=True)
    CUSTOMER_SITE_ID = models.IntegerField(db_column="CUSTOMER_SITE_ID", null=True, blank=True)
    CUSTOMER_PARTY_TYPE_ID = models.IntegerField(db_column="CUSTOMER_PARTY_TYPE_ID", null=True, blank=True)
    VENDOR_REMARKS = models.TextField(db_column="VENDOR_REMARKS", blank=True, null=True)
    CUSTOMER_REMARKS = models.TextField(db_column="CUSTOMER_REMARKS", blank=True, null=True)
    AUDIT_REMARKS = models.TextField(db_column="AUDIT_REMARKS", blank=True, null=True)
    STATUS = models.TextField(db_column="STATUS", blank=True, null=True)
    AUDIT_APPROVE_DATE = models.DateTimeField(db_column="AUDIT_APPROVE_DATE", null=True, blank=True)
    DOCUMENT_ID = models.IntegerField(db_column="DOCUMENT_ID", null=True, blank=True)
    END_DATE = models.DateTimeField(db_column="END_DATE", null=True, blank=True)
    LAST_LOGIN_ID = models.IntegerField(db_column="LAST_LOGIN_ID", null=True, blank=True)
    CREATED_BY = models.IntegerField(db_column="CREATED_BY", null=True, blank=True)
    LAST_UPDATE_BY = models.TextField(db_column="LAST_UPDATE_BY", blank=True, null=True)
    LAST_UPDATE_DATE = models.DateTimeField(db_column="LAST_UPDATE_DATE", null=True, blank=True)
    CREATION_DATE = models.DateTimeField(db_column="CREATION_DATE", null=True, blank=True)
    ACTIVE_DATE = models.DateTimeField(db_column="ACTIVE_DATE", null=True, blank=True)
    ATTRIBUTE1 = models.TextField(db_column="ATTRIBUTE1", blank=True, null=True)
    ATTRIBUTE2 = models.TextField(db_column="ATTRIBUTE2", blank=True, null=True)
    ATTRIBUTE3 = models.TextField(db_column="ATTRIBUTE3", blank=True, null=True)
    ATTRIBUTE4 = models.TextField(db_column="ATTRIBUTE4", blank=True, null=True)
    ATTRIBUTE5 = models.TextField(db_column="ATTRIBUTE5", blank=True, null=True)
    ATTRIBUTE6 = models.TextField(db_column="ATTRIBUTE6", blank=True, null=True)
    ATTRIBUTE7 = models.TextField(db_column="ATTRIBUTE7", blank=True, null=True)
    ATTRIBUTE8 = models.TextField(db_column="ATTRIBUTE8", blank=True, null=True)
    IsActive = models.BooleanField(db_column="IsActive", null=True, blank=True)
    IsDeleted = models.BooleanField(db_column="IsDeleted", null=True, blank=True)

    class Meta:
        managed = False
        db_table = "bss_legacy_evm_tbl_vendor_invoice"


class VendorInvDoc(models.Model):
    VENDOR_INV_DOC_ID = models.FloatField(primary_key=True, db_column="VENDOR_INV_DOC_ID")
    VENDOR_INV_ID = models.FloatField(db_column="VENDOR_INV_ID", null=True, blank=True)
    DOC_ID = models.FloatField(db_column="DOC_ID", null=True, blank=True)
    DOC_FILE = models.BinaryField(db_column="DOC_FILE", null=True, blank=True)
    DESCRIPTION = models.TextField(db_column="DESCRIPTION", blank=True, null=True)
    STATUS = models.FloatField(db_column="STATUS", null=True, blank=True)
    ACTIVE_DATE = models.DateTimeField(db_column="ACTIVE_DATE", null=True, blank=True)
    END_DATE = models.DateTimeField(db_column="END_DATE", null=True, blank=True)
    LAST_LOGIN_ID = models.FloatField(db_column="LAST_LOGIN_ID", null=True, blank=True)
    CREATED_BY = models.FloatField(db_column="CREATED_BY", null=True, blank=True)
    LAST_UPDATE_BY = models.TextField(db_column="LAST_UPDATE_BY", blank=True, null=True)
    LAST_UPDATE_DATE = models.DateTimeField(db_column="LAST_UPDATE_DATE", null=True, blank=True)
    CREATION_DATE = models.DateTimeField(db_column="CREATION_DATE", null=True, blank=True)
    ATTRIBUTE1 = models.TextField(db_column="ATTRIBUTE1", blank=True, null=True)
    ATTRIBUTE2 = models.TextField(db_column="ATTRIBUTE2", blank=True, null=True)
    ATTRIBUTE3 = models.TextField(db_column="ATTRIBUTE3", blank=True, null=True)
    ATTRIBUTE4 = models.TextField(db_column="ATTRIBUTE4", blank=True, null=True)
    ATTRIBUTE5 = models.TextField(db_column="ATTRIBUTE5", blank=True, null=True)
    ATTRIBUTE6 = models.TextField(db_column="ATTRIBUTE6", blank=True, null=True)
    ATTRIBUTE7 = models.TextField(db_column="ATTRIBUTE7", blank=True, null=True)
    ATTRIBUTE8 = models.TextField(db_column="ATTRIBUTE8", blank=True, null=True)

    class Meta:
        managed = False
        db_table = "bss_legacy_evm_tbl_vendor_inv_doc"


class SkillTrainingProgram(models.Model):
    id = models.AutoField(primary_key=True, db_column="id")
    isflag = models.BooleanField(db_column="isflag", null=True, blank=True)
    Title = models.TextField(db_column="Title", blank=True, null=True)
    CourseDesc = models.TextField(db_column="CourseDesc", blank=True, null=True)
    CourseCoverPage = models.TextField(db_column="CourseCoverPage", blank=True, null=True)
    Loginid = models.IntegerField(db_column="Loginid", null=True, blank=True)
    CreatedOn = models.DateTimeField(db_column="CreatedOn", null=True, blank=True)
    CreatedBy = models.IntegerField(db_column="CreatedBy", null=True, blank=True)
    Lessonorder = models.TextField(db_column="Lessonorder", blank=True, null=True)
    VideoOrder = models.TextField(db_column="VideoOrder", blank=True, null=True)
    OnlyPublished = models.TextField(db_column="OnlyPublished", blank=True, null=True)
    AutoCertificate = models.TextField(db_column="AutoCertificate", blank=True, null=True)
    BroserVisibility = models.TextField(db_column="BroserVisibility", blank=True, null=True)
    MobileVisibility = models.TextField(db_column="MobileVisibility", blank=True, null=True)
    Status = models.TextField(db_column="Status", blank=True, null=True)

    class Meta:
        managed = False
        db_table = "bss_legacy_dbo_skilltrainingprogram"


class TrainingCourseModule(models.Model):
    id = models.AutoField(primary_key=True, db_column="id")
    CourseId = models.IntegerField(db_column="CourseId", null=True, blank=True)
    Modulename = models.TextField(db_column="Modulename", blank=True, null=True)
    ModuleDesc = models.TextField(db_column="ModuleDesc", blank=True, null=True)
    Sequence = models.TextField(db_column="Sequence", blank=True, null=True)
    Publish = models.BooleanField(db_column="Publish", null=True, blank=True)
    Loginid = models.IntegerField(db_column="Loginid", null=True, blank=True)
    CreatedBy = models.IntegerField(db_column="CreatedBy", null=True, blank=True)
    CreatedOn = models.DateTimeField(db_column="CreatedOn", null=True, blank=True)
    Thumbnail = models.TextField(db_column="Thumbnail", blank=True, null=True)

    class Meta:
        managed = False
        db_table = "bss_legacy_dbo_trainingcoursemodule"


class SkillModuleVideos(models.Model):
    id = models.AutoField(primary_key=True, db_column="id")
    CourseId = models.IntegerField(db_column="CourseId", null=True, blank=True)
    moduleid = models.IntegerField(db_column="moduleid", null=True, blank=True)
    Title = models.TextField(db_column="Title", blank=True, null=True)
    Description = models.TextField(db_column="Description", blank=True, null=True)
    Thumbnail = models.TextField(db_column="Thumbnail", blank=True, null=True)
    Videos = models.TextField(db_column="Videos", blank=True, null=True)
    Loginid = models.IntegerField(db_column="Loginid", null=True, blank=True)
    CreatedOn = models.DateTimeField(db_column="CreatedOn", null=True, blank=True)
    Status = models.TextField(db_column="Status", blank=True, null=True)

    class Meta:
        managed = False
        db_table = "bss_legacy_dbo_skillmodulevideos"


class Rozgar(models.Model):
    id = models.AutoField(primary_key=True, db_column="id")
    isflag = models.IntegerField(db_column="isflag", null=True, blank=True)
    JobTitle = models.TextField(db_column="JobTitle", blank=True, null=True)
    JobCaegory = models.TextField(db_column="JobCaegory", blank=True, null=True)
    WorkType = models.TextField(db_column="WorkType", blank=True, null=True)
    Location = models.TextField(db_column="Location", blank=True, null=True)
    Description = models.TextField(db_column="Description", blank=True, null=True)
    RequiredSkills = models.TextField(db_column="RequiredSkills", blank=True, null=True)
    MinSallery = models.DecimalField(db_column="MinSallery", max_digits=19, decimal_places=2, null=True, blank=True)
    MaxSallery = models.DecimalField(db_column="MaxSallery", max_digits=19, decimal_places=2, null=True, blank=True)
    Loginid = models.IntegerField(db_column="Loginid", null=True, blank=True)
    Mapid = models.IntegerField(db_column="Mapid", null=True, blank=True)
    CreatedOn = models.DateTimeField(db_column="CreatedOn", null=True, blank=True)
    CreatedBy = models.IntegerField(db_column="CreatedBy", null=True, blank=True)
    saveflag = models.IntegerField(db_column="saveflag", null=True, blank=True)
    Jobno = models.TextField(db_column="Jobno", blank=True, null=True)
    State = models.TextField(db_column="State", blank=True, null=True)
    City = models.TextField(db_column="City", blank=True, null=True)
    Experience = models.TextField(db_column="Experience", blank=True, null=True)

    class Meta:
        managed = False
        db_table = "bss_legacy_dbo_rtl.rozgar"


class ApplyPostJob(models.Model):
    id = models.AutoField(primary_key=True, db_column="id")
    isflag = models.IntegerField(db_column="isflag", null=True, blank=True)
    JobTitle = models.TextField(db_column="JobTitle", blank=True, null=True)
    Fullname = models.TextField(db_column="Fullname", blank=True, null=True)
    jobno = models.TextField(db_column="jobno", blank=True, null=True)
    WorkType = models.TextField(db_column="WorkType", blank=True, null=True)
    EmailID = models.TextField(db_column="EmailID", blank=True, null=True)
    Mobileno = models.TextField(db_column="Mobileno", blank=True, null=True)
    CurrentLocation = models.TextField(db_column="CurrentLocation", blank=True, null=True)
    Loginid = models.IntegerField(db_column="Loginid", null=True, blank=True)
    Mapid = models.IntegerField(db_column="Mapid", null=True, blank=True)
    CreatedBy = models.IntegerField(db_column="CreatedBy", null=True, blank=True)
    CreatedOn = models.DateTimeField(db_column="CreatedOn", null=True, blank=True)

    class Meta:
        managed = False
        db_table = "bss_legacy_dbo_rtl.applypostjob"


class Rating(models.Model):
    Id = models.AutoField(primary_key=True, db_column="Id")
    UserId = models.IntegerField(db_column="UserId", null=True, blank=True)
    Rating = models.IntegerField(db_column="Rating", null=True, blank=True)
    Certificate = models.TextField(db_column="Certificate", blank=True, null=True)

    class Meta:
        managed = False
        db_table = "bss_legacy_dbo_rating"


# ---------------------------------------------------------------------------
# Phase 10 — SiteManager / TimePeriod / CDM / ClientActMapping / Chat /
# Passcode / Payment ports. Unmanaged (tables already migrated from SQL Server).
# ---------------------------------------------------------------------------


class TimePeriod(models.Model):
    Id = models.AutoField(primary_key=True, db_column="Id")
    ClientId = models.IntegerField(db_column="ClientId", null=True, blank=True)
    VendorId = models.TextField(db_column="VendorId", blank=True, null=True)
    Year = models.TextField(db_column="Year", blank=True, null=True)
    Month = models.TextField(db_column="Month", blank=True, null=True)
    ClientSiteId = models.TextField(db_column="ClientSiteId", blank=True, null=True)
    Location = models.TextField(db_column="Location", blank=True, null=True)
    EndDate = models.DateTimeField(db_column="EndDate", null=True, blank=True)
    createdon = models.DateTimeField(db_column="createdon", null=True, blank=True)

    class Meta:
        managed = False
        db_table = "bss_legacy_dbo_timeperiod"


class ClientActMapping(models.Model):
    Id = models.AutoField(primary_key=True, db_column="Id")
    ClientId = models.IntegerField(db_column="ClientId", null=True, blank=True)
    ActId = models.IntegerField(db_column="ActId", null=True, blank=True)
    Createdby = models.IntegerField(db_column="Createdby", null=True, blank=True)
    CreatedOn = models.DateTimeField(db_column="CreatedOn", null=True, blank=True)

    class Meta:
        managed = False
        db_table = "bss_legacy_dbo_clientactmapping"


class CDMMaster(models.Model):
    Id = models.AutoField(primary_key=True, db_column="Id")
    ClientId = models.IntegerField(db_column="ClientId", null=True, blank=True)
    DocumentId = models.IntegerField(db_column="DocumentId", null=True, blank=True)
    Createdby = models.IntegerField(db_column="Createdby", null=True, blank=True)
    CreatedOn = models.DateTimeField(db_column="CreatedOn", null=True, blank=True)

    class Meta:
        managed = False
        db_table = "bss_legacy_dbo_tblcdmmaster"


class Chatbot(models.Model):
    Id = models.AutoField(primary_key=True, db_column="Id")
    TicketNo = models.TextField(db_column="TicketNo", blank=True, null=True)
    FileUpload = models.TextField(db_column="FileUpload", blank=True, null=True)
    Detail = models.TextField(db_column="Detail", blank=True, null=True)
    Rate = models.TextField(db_column="Rate", blank=True, null=True)
    Suggestion = models.TextField(db_column="Suggestion", blank=True, null=True)
    Createdby = models.IntegerField(db_column="Createdby", null=True, blank=True)
    createdon = models.DateTimeField(db_column="createdon", null=True, blank=True)
    Status = models.IntegerField(db_column="Status", null=True, blank=True)

    class Meta:
        managed = False
        db_table = "bss_legacy_rtl_chatbot"


class UserPasswordHistory(models.Model):
    Id = models.AutoField(primary_key=True, db_column="Id")
    LoginId = models.IntegerField(db_column="LoginId", null=True, blank=True)
    PasswordHash = models.TextField(db_column="PasswordHash", blank=True, null=True)
    CreatedDate = models.DateTimeField(db_column="CreatedDate", null=True, blank=True)

    class Meta:
        managed = False
        db_table = "bss_legacy_dbo_userpasswordhistory"


class PaymentRequestLog(models.Model):
    """Log sink for the ported Payment/CreateOrder stub (no real gateway call)."""
    Id = models.AutoField(primary_key=True, db_column="Id")
    LoginId = models.IntegerField(db_column="LoginId", null=True, blank=True)
    OrderId = models.TextField(db_column="OrderId", blank=True, null=True)
    Amount = models.TextField(db_column="Amount", blank=True, null=True)
    Name = models.TextField(db_column="Name", blank=True, null=True)
    MobileNo = models.TextField(db_column="MobileNo", blank=True, null=True)
    EmailId = models.TextField(db_column="EmailId", blank=True, null=True)
    Payload = models.TextField(db_column="Payload", blank=True, null=True)
    Status = models.TextField(db_column="Status", blank=True, null=True)
    CreatedOn = models.DateTimeField(db_column="CreatedOn", null=True, blank=True)

    class Meta:
        db_table = "bss_legacy_dbo_paymentrequestlog"


# ---------------------------------------------------------------------------
# RetailController master tables (GetSearchModuleReg / Search*Master etc.).
# Unmanaged — tables already migrated from SQL Server, Django never alters them.
# ---------------------------------------------------------------------------


class ModuleRegMaster(models.Model):
    """RTL.Usp_Module_Reg_Master backing table (module registration)."""
    Id = models.IntegerField(primary_key=True, db_column="Id")
    Module_Name = models.TextField(db_column="Module_Name", blank=True, null=True)
    Description = models.TextField(db_column="Description", blank=True, null=True)
    Start_Date = models.DateTimeField(db_column="Start_Date", null=True, blank=True)
    End_Date = models.DateTimeField(db_column="End_Date", null=True, blank=True)
    IsActive = models.IntegerField(db_column="IsActive", null=True, blank=True)
    IsApproval = models.IntegerField(db_column="IsApproval", null=True, blank=True)
    IsDeleted = models.IntegerField(db_column="IsDeleted", null=True, blank=True)
    Created_BY = models.IntegerField(db_column="Created_BY", null=True, blank=True)
    Created_Date = models.DateTimeField(db_column="Created_Date", null=True, blank=True)
    Updated_By = models.IntegerField(db_column="Updated_By", null=True, blank=True)
    Updated_Date = models.DateTimeField(db_column="Updated_Date", null=True, blank=True)

    class Meta:
        managed = False
        db_table = "bss_legacy_rtl_tbl_module_reg_master"


class GradeMaster(models.Model):
    """RTL.Usp_GradeMaster backing table."""
    Id = models.IntegerField(primary_key=True, db_column="Id")
    PartyType = models.IntegerField(db_column="PartyType", null=True, blank=True)
    PartyId = models.IntegerField(db_column="PartyId", null=True, blank=True)
    Name = models.TextField(db_column="Name", blank=True, null=True)
    Description = models.TextField(db_column="Description", blank=True, null=True)
    Sequence = models.IntegerField(db_column="Sequence", null=True, blank=True)
    StartDate = models.DateField(db_column="StartDate", null=True, blank=True)
    EndDate = models.DateField(db_column="EndDate", null=True, blank=True)
    CreatedOn = models.DateTimeField(db_column="CreatedOn", null=True, blank=True)
    Createdby = models.IntegerField(db_column="Createdby", null=True, blank=True)
    Updatedby = models.IntegerField(db_column="Updatedby", null=True, blank=True)
    UpdatedOn = models.DateTimeField(db_column="UpdatedOn", null=True, blank=True)

    class Meta:
        managed = False
        db_table = "bss_legacy_rtl_grademaster"


class DepartmentMaster(models.Model):
    """RTL.Usp_DepartmentMaster backing table (store compliance departments)."""
    DepartmentId = models.IntegerField(primary_key=True, db_column="DepartmentId")
    PartyId = models.IntegerField(db_column="PartyId", null=True, blank=True)
    PartyType = models.IntegerField(db_column="PartyType", null=True, blank=True)
    DepartmentName = models.TextField(db_column="DepartmentName", blank=True, null=True)
    Description = models.TextField(db_column="Description", blank=True, null=True)
    StartDate = models.TextField(db_column="StartDate", blank=True, null=True)
    EndDate = models.TextField(db_column="EndDate", blank=True, null=True)
    CreatedOn = models.DateTimeField(db_column="CreatedOn", null=True, blank=True)
    CreatedBy = models.IntegerField(db_column="CreatedBy", null=True, blank=True)
    UpdatedOn = models.DateTimeField(db_column="UpdatedOn", null=True, blank=True)
    UpdatedBy = models.IntegerField(db_column="UpdatedBy", null=True, blank=True)

    class Meta:
        managed = False
        db_table = "bss_legacy_rtl_departmentmaster"


class CreateExecuter(models.Model):
    """RTL.USP_CreateExecuter backing table."""
    Id = models.IntegerField(primary_key=True, db_column="Id")
    PartyId = models.IntegerField(db_column="PartyId", null=True, blank=True)
    ExecuterId = models.IntegerField(db_column="ExecuterId", null=True, blank=True)
    IsExecuter = models.IntegerField(db_column="IsExecuter", null=True, blank=True)
    CreatedOn = models.DateTimeField(db_column="CreatedOn", null=True, blank=True)
    Createdby = models.IntegerField(db_column="Createdby", null=True, blank=True)

    class Meta:
        managed = False
        db_table = "bss_legacy_rtl_createexecuter"


class LicenseDocumentMasterList(models.Model):
    """RTL.GetLicenseMasterDocumentList backing table (licence document list)."""
    DocumentId = models.IntegerField(primary_key=True, db_column="DocumentId")
    DocumentName = models.TextField(db_column="DocumentName", blank=True, null=True)
    DisplayName = models.TextField(db_column="DisplayName", blank=True, null=True)
    PermissionFor = models.IntegerField(db_column="PermissionFor", null=True, blank=True)

    class Meta:
        managed = False
        db_table = "bss_legacy_rtl_licensemasterdocumentlist"


class VendorClientDocument(models.Model):
    """RTL.USP_ClientDocumentMapping backing table (client doc mapping)."""
    Id = models.IntegerField(primary_key=True, db_column="Id")
    DocumentName = models.TextField(db_column="DocumentName", blank=True, null=True)
    Createdby = models.IntegerField(db_column="Createdby", null=True, blank=True)
    createdon = models.DateTimeField(db_column="createdon", null=True, blank=True)

    class Meta:
        managed = False
        db_table = "bss_legacy_dbo_vendorclientdocument"


# ---------------------------------------------------------------------------
# Phase 11 — RetailSection missing endpoints (RetailSectionController.cs).
# Backing tables already migrated; `managed=False` so Django never alters them.
# ---------------------------------------------------------------------------


class NoticeInspection(models.Model):
    """RTL.USP_Notice backing table (notice & inspection)."""
    Id = models.AutoField(primary_key=True, db_column="Id")
    UserId = models.IntegerField(db_column="UserId", null=True, blank=True)
    StoreId = models.IntegerField(db_column="StoreId", null=True, blank=True)
    DepartmentId = models.IntegerField(db_column="DepartmentId", null=True, blank=True)
    NoticeUpload = models.TextField(db_column="NoticeUpload", blank=True, null=True)
    ReceiptDate = models.DateTimeField(db_column="ReceiptDate", null=True, blank=True)
    ExecuterId = models.IntegerField(db_column="ExecuterId", null=True, blank=True)
    ExecuterStoreId = models.IntegerField(db_column="ExecuterStoreId", null=True, blank=True)
    ExecuterDepartmentId = models.IntegerField(db_column="ExecuterDepartmentId", null=True, blank=True)
    ExecuterNoticeUpload = models.TextField(db_column="ExecuterNoticeUpload", blank=True, null=True)
    ExecuterReceiptDate = models.DateTimeField(db_column="ExecuterReceiptDate", null=True, blank=True)
    FinalReceiptDate = models.DateTimeField(db_column="FinalReceiptDate", null=True, blank=True)
    FinalSubmittionbyExecuter = models.TextField(db_column="FinalSubmittionbyExecuter", blank=True, null=True)
    Status = models.IntegerField(db_column="Status", null=True, blank=True)
    CreatedOn = models.DateTimeField(db_column="CreatedOn", null=True, blank=True)
    Createdby = models.IntegerField(db_column="Createdby", null=True, blank=True)
    NoticeDate = models.DateTimeField(db_column="NoticeDate", null=True, blank=True)
    NoticeMode = models.TextField(db_column="NoticeMode", blank=True, null=True)
    HearingDate = models.DateTimeField(db_column="HearingDate", null=True, blank=True)
    OfficerName = models.TextField(db_column="OfficerName", blank=True, null=True)
    Address = models.TextField(db_column="Address", blank=True, null=True)
    RepresentativeName = models.TextField(db_column="RepresentativeName", blank=True, null=True)
    RepresentativeEmail = models.TextField(db_column="RepresentativeEmail", blank=True, null=True)
    Description = models.TextField(db_column="Description", blank=True, null=True)
    Probability = models.TextField(db_column="Probability", blank=True, null=True)
    Interest = models.TextField(db_column="Interest", blank=True, null=True)
    LateFee = models.TextField(db_column="LateFee", blank=True, null=True)
    Fines = models.TextField(db_column="Fines", blank=True, null=True)
    Penalities = models.TextField(db_column="Penalities", blank=True, null=True)
    Other = models.TextField(db_column="Other", blank=True, null=True)

    class Meta:
        managed = False
        db_table = "bss_legacy_rtl_noticesinspections"


class EscalationMaster(models.Model):
    """RTL.Escalation backing table."""
    Id = models.AutoField(primary_key=True, db_column="Id")
    ClientId = models.IntegerField(db_column="ClientId", null=True, blank=True)
    Escalation1 = models.IntegerField(db_column="Escalation1", null=True, blank=True)
    Escalation2 = models.IntegerField(db_column="Escalation2", null=True, blank=True)
    StoreCode = models.IntegerField(db_column="StoreCode", null=True, blank=True)
    LicenceId = models.IntegerField(db_column="LicenceId", null=True, blank=True)
    Remark = models.TextField(db_column="Remark", blank=True, null=True)
    Escalation1Remark = models.TextField(db_column="Escalation1Remark", blank=True, null=True)
    IsEscalate2 = models.IntegerField(db_column="IsEscalate2", null=True, blank=True)
    Escalation2Remark = models.TextField(db_column="Escalation2Remark", blank=True, null=True)
    Status = models.IntegerField(db_column="Status", null=True, blank=True)
    CreatedOn = models.DateTimeField(db_column="CreatedOn", null=True, blank=True)
    Closedby = models.IntegerField(db_column="Closedby", null=True, blank=True)

    class Meta:
        managed = False
        db_table = "bss_legacy_rtl_escalationmaster"


class PaymentDetail(models.Model):
    """RTL.USP_Payment backing table."""
    Id = models.AutoField(primary_key=True, db_column="Id")
    LId = models.IntegerField(db_column="LId", null=True, blank=True)
    StoreId = models.TextField(db_column="StoreId", blank=True, null=True)
    LicenceId = models.TextField(db_column="LicenceId", blank=True, null=True)
    OrderId = models.TextField(db_column="OrderId", blank=True, null=True)
    TransId = models.TextField(db_column="TransId", blank=True, null=True)
    Amount = models.TextField(db_column="Amount", blank=True, null=True)
    TotalAmount = models.TextField(db_column="TotalAmount", blank=True, null=True)
    Name = models.TextField(db_column="Name", blank=True, null=True)
    MobileNo = models.TextField(db_column="MobileNo", blank=True, null=True)
    EmailId = models.TextField(db_column="EmailId", blank=True, null=True)
    returnUrl = models.TextField(db_column="returnUrl", blank=True, null=True)
    PaymentMode = models.TextField(db_column="PaymentMode", blank=True, null=True)
    PaymentStatus = models.TextField(db_column="PaymentStatus", blank=True, null=True)
    CreatedOn = models.DateTimeField(db_column="CreatedOn", null=True, blank=True)
    ResponseCompleteOn = models.DateTimeField(db_column="ResponseCompleteOn", null=True, blank=True)
    Createdby = models.IntegerField(db_column="Createdby", null=True, blank=True)

    class Meta:
        managed = False
        db_table = "bss_legacy_rtl_paymentdetail"


class MailingConfiguration(models.Model):
    """RTL.Usp_Mailing backing table (mail mapping config)."""
    MailingId = models.AutoField(primary_key=True, db_column="MailingId")
    PartyId = models.IntegerField(db_column="PartyId", null=True, blank=True)
    MailFor = models.TextField(db_column="MailFor", blank=True, null=True)
    TemplateId = models.IntegerField(db_column="TemplateId", null=True, blank=True)
    To = models.TextField(db_column="To", blank=True, null=True)
    CC = models.TextField(db_column="CC", blank=True, null=True)
    BCC = models.TextField(db_column="BCC", blank=True, null=True)
    IsActive = models.BooleanField(db_column="IsActive", null=True, blank=True)
    CreatedBy = models.IntegerField(db_column="CreatedBy", null=True, blank=True)
    CreatedOn = models.DateTimeField(db_column="CreatedOn", null=True, blank=True)
    ModifiedBy = models.IntegerField(db_column="ModifiedBy", null=True, blank=True)
    ModifiedOn = models.DateTimeField(db_column="ModifiedOn", null=True, blank=True)

    class Meta:
        managed = False
        db_table = "bss_legacy_rtl_mailingconfiguration"


class TemplateMaster(models.Model):
    """RTL.Usp_Mailing template rows."""
    TemplateId = models.AutoField(primary_key=True, db_column="TemplateId")
    TemplateName = models.TextField(db_column="TemplateName", blank=True, null=True)
    Subject = models.TextField(db_column="Subject", blank=True, null=True)
    Detail = models.TextField(db_column="Detail", blank=True, null=True)
    IsActive = models.BooleanField(db_column="IsActive", null=True, blank=True)
    CreatedOn = models.DateTimeField(db_column="CreatedOn", null=True, blank=True)
    UpdatedOn = models.DateTimeField(db_column="UpdatedOn", null=True, blank=True)

    class Meta:
        managed = False
        db_table = "bss_legacy_rtl_templatemaster"


class RouteMaster(models.Model):
    """RTL.USP_RouteMaster backing table (transport routes)."""
    Id = models.AutoField(primary_key=True, db_column="Id")
    RouteID = models.TextField(db_column="RouteID", blank=True, null=True)
    RouteName = models.TextField(db_column="RouteName", blank=True, null=True)
    CompanyName = models.TextField(db_column="CompanyName", blank=True, null=True)
    Location = models.TextField(db_column="Location", blank=True, null=True)
    RouteStartLocation = models.TextField(db_column="RouteStartLocation", blank=True, null=True)
    RouteEndLocation = models.TextField(db_column="RouteEndLocation", blank=True, null=True)
    Status = models.TextField(db_column="Status", blank=True, null=True)
    BusNumber = models.TextField(db_column="BusNumber", blank=True, null=True)
    RCNO = models.TextField(db_column="RCNO", blank=True, null=True)
    SeatingCapacity = models.IntegerField(db_column="SeatingCapacity", null=True, blank=True)
    BusType = models.TextField(db_column="BusType", blank=True, null=True)
    DriverName = models.TextField(db_column="DriverName", blank=True, null=True)
    DriverContactNumber = models.TextField(db_column="DriverContactNumber", blank=True, null=True)
    DriverAddress = models.TextField(db_column="DriverAddress", blank=True, null=True)
    LicenseNumber = models.TextField(db_column="LicenseNumber", blank=True, null=True)
    ConductorName = models.TextField(db_column="ConductorName", blank=True, null=True)
    ConductorContact = models.TextField(db_column="ConductorContact", blank=True, null=True)
    ConductorAddress = models.TextField(db_column="ConductorAddress", blank=True, null=True)
    LicenseCopy = models.TextField(db_column="LicenseCopy", blank=True, null=True)
    AadharCardCopy = models.TextField(db_column="AadharCardCopy", blank=True, null=True)
    ConductorAadhaarCard = models.TextField(db_column="ConductorAadhaarCard", blank=True, null=True)
    BusRC = models.TextField(db_column="BusRC", blank=True, null=True)
    PollutionCertificate = models.TextField(db_column="PollutionCertificate", blank=True, null=True)
    FitnessCertificate = models.TextField(db_column="FitnessCertificate", blank=True, null=True)
    InsuranceCopy = models.TextField(db_column="InsuranceCopy", blank=True, null=True)
    PartyId = models.IntegerField(db_column="PartyId", null=True, blank=True)
    CreatedBy = models.IntegerField(db_column="CreatedBy", null=True, blank=True)
    CreatedDate = models.DateTimeField(db_column="CreatedDate", null=True, blank=True)
    UpdatedBy = models.IntegerField(db_column="UpdatedBy", null=True, blank=True)
    UpdatedDate = models.DateTimeField(db_column="UpdatedDate", null=True, blank=True)

    class Meta:
        managed = False
        db_table = "bss_legacy_rtl_routemaster"


class DiligenceChecklist(models.Model):
    """RTL.Usp_Diligence backing table (diligence checks)."""
    Id = models.AutoField(primary_key=True, db_column="Id")
    StoreCode = models.TextField(db_column="StoreCode", blank=True, null=True)
    DiligenceName = models.TextField(db_column="DiligenceName", blank=True, null=True)
    DiligenceAssigned = models.TextField(db_column="DiligenceAssigned", blank=True, null=True)
    Diligencedate = models.TextField(db_column="Diligencedate", blank=True, null=True)
    Note = models.TextField(db_column="Note", blank=True, null=True)

    class Meta:
        managed = False
        db_table = "bss_legacy_rtl_diligencechecklist"


class DiligenceDocumentList(models.Model):
    """RTL.Usp_Diligence document rows."""
    Id = models.AutoField(primary_key=True, db_column="Id")
    StoreCode = models.TextField(db_column="StoreCode", blank=True, null=True)
    DocumentName = models.TextField(db_column="DocumentName", blank=True, null=True)
    DiligenceId = models.IntegerField(db_column="DiligenceId", null=True, blank=True)
    uploadOn = models.TextField(db_column="uploadOn", blank=True, null=True)
    uploadedby = models.IntegerField(db_column="uploadedby", null=True, blank=True)
    Status = models.TextField(db_column="Status", blank=True, null=True)
    UploadFile = models.TextField(db_column="UploadFile", blank=True, null=True)
    LoginId = models.IntegerField(db_column="LoginId", null=True, blank=True)
    Note = models.TextField(db_column="Note", blank=True, null=True)

    class Meta:
        managed = False
        db_table = "bss_legacy_rtl_diligencedocumentlist"


class ExecuterDocumentMaster(models.Model):
    """RTL.USP_Compliance backing rows (per-store compliance documents)."""
    Id = models.AutoField(primary_key=True, db_column="Id")
    DocId = models.IntegerField(db_column="DocId", null=True, blank=True)
    ExecuterId = models.IntegerField(db_column="ExecuterId", null=True, blank=True)
    StoreId = models.IntegerField(db_column="StoreId", null=True, blank=True)
    ActId = models.TextField(db_column="ActId", blank=True, null=True)
    FY = models.TextField(db_column="FY", blank=True, null=True)
    CMonth = models.TextField(db_column="CMonth", blank=True, null=True)
    DocumentName = models.TextField(db_column="DocumentName", blank=True, null=True)
    DocumentType = models.TextField(db_column="DocumentType", blank=True, null=True)
    Frequency = models.TextField(db_column="Frequency", blank=True, null=True)
    FormatType = models.TextField(db_column="FormatType", blank=True, null=True)
    Note = models.TextField(db_column="Note", blank=True, null=True)
    Act = models.TextField(db_column="Act", blank=True, null=True)
    DocumentPath = models.TextField(db_column="DocumentPath", blank=True, null=True)
    IsDefault = models.BooleanField(db_column="IsDefault", null=True, blank=True)
    CreatedOn = models.DateTimeField(db_column="CreatedOn", null=True, blank=True)
    Createdby = models.TextField(db_column="Createdby", blank=True, null=True)
    Updatedby = models.TextField(db_column="Updatedby", blank=True, null=True)
    UpdatedON = models.DateTimeField(db_column="UpdatedON", null=True, blank=True)
    Isdelete = models.BooleanField(db_column="Isdelete", null=True, blank=True)
    FormNo = models.TextField(db_column="FormNo", blank=True, null=True)
    StateId = models.TextField(db_column="StateId", blank=True, null=True)
    Criticality = models.TextField(db_column="Criticality", blank=True, null=True)

    class Meta:
        managed = False
        db_table = "bss_legacy_rtl_executerdocumentmaster"


class ComplianceEmployeeDetail(models.Model):
    """RTL.USP_ComplianceBulk payroll/attendance detail rows."""
    Uid = models.TextField(db_column="Uid", primary_key=True, blank=True)
    Employee_Code = models.TextField(db_column="Employee_Code", blank=True, null=True)
    Employee_Name = models.TextField(db_column="Employee_Name", blank=True, null=True)
    Gender = models.TextField(db_column="Gender", blank=True, null=True)
    Father_Name = models.TextField(db_column="Father_Name", blank=True, null=True)
    Date_of_Birth = models.TextField(db_column="Date_of_Birth", blank=True, null=True)
    Age = models.TextField(db_column="Age", blank=True, null=True)
    Date_Of_Joining = models.TextField(db_column="Date_Of_Joining", blank=True, null=True)
    Date_Of_Leaving = models.TextField(db_column="Date_Of_Leaving", blank=True, null=True)
    Designation = models.TextField(db_column="Designation", blank=True, null=True)
    Department = models.TextField(db_column="Department", blank=True, null=True)
    Branch_Address = models.TextField(db_column="Branch_Address", blank=True, null=True)
    State = models.TextField(db_column="State", blank=True, null=True)
    Month = models.TextField(db_column="Month", blank=True, null=True)
    UAN_No = models.TextField(db_column="UAN_No", blank=True, null=True)
    ESIC_No = models.TextField(db_column="ESIC_No", blank=True, null=True)
    StoreCode = models.TextField(db_column="StoreCode", blank=True, null=True)
    ComplianceCategory = models.TextField(db_column="ComplianceCategory", blank=True, null=True)
    IsActive = models.IntegerField(db_column="IsActive", null=True, blank=True)

    class Meta:
        managed = False
        db_table = "bss_legacy_rtl_complianceemployeedetail"


class PayrollSalaryUpload(models.Model):
    """RTL.usp_PayRoll salary-excel rows."""
    Id = models.AutoField(primary_key=True, db_column="Id")
    uid = models.TextField(db_column="uid", blank=True, null=True)
    PayRollType = models.TextField(db_column="PayRollType", blank=True, null=True)
    Mode = models.TextField(db_column="Mode", blank=True, null=True)
    StoreCode = models.TextField(db_column="StoreCode", blank=True, null=True)
    Year = models.TextField(db_column="Year", blank=True, null=True)
    Month = models.TextField(db_column="Month", blank=True, null=True)
    LoginId = models.TextField(db_column="LoginId", blank=True, null=True)
    EmployeeCode = models.TextField(db_column="EmployeeCode", blank=True, null=True)
    EmployeeName = models.TextField(db_column="EmployeeName", blank=True, null=True)
    DOJ = models.TextField(db_column="DOJ", blank=True, null=True)
    Designation = models.TextField(db_column="Designation", blank=True, null=True)
    UANNumber = models.TextField(db_column="UANNumber", blank=True, null=True)
    TotalWorkingDays = models.TextField(db_column="TotalWorkingDays", blank=True, null=True)
    EarnedGrossSalary = models.TextField(db_column="EarnedGrossSalary", blank=True, null=True)
    NetPayableSalary = models.TextField(db_column="NetPayableSalary", blank=True, null=True)
    TotalDeduction = models.TextField(db_column="TotalDeduction", blank=True, null=True)
    CreatedDate = models.DateTimeField(db_column="CreatedDate", null=True, blank=True)
    Status = models.IntegerField(db_column="Status", null=True, blank=True)

    class Meta:
        managed = False
        db_table = "bss_legacy_rtl_payrollsalaryupload"


class PayrollUanMasterUpload(models.Model):
    """RTL.usp_PayRoll UAN-master rows."""
    Id = models.AutoField(primary_key=True, db_column="Id")
    UID = models.TextField(db_column="UID", blank=True, null=True)
    EmployeeCode = models.TextField(db_column="EmployeeCode", blank=True, null=True)
    PayRollType = models.TextField(db_column="PayRollType", blank=True, null=True)
    Mode = models.TextField(db_column="Mode", blank=True, null=True)
    StoreCode = models.TextField(db_column="StoreCode", blank=True, null=True)
    Year = models.TextField(db_column="Year", blank=True, null=True)
    Month = models.TextField(db_column="Month", blank=True, null=True)
    LoginId = models.TextField(db_column="LoginId", blank=True, null=True)
    UAN = models.TextField(db_column="UAN", blank=True, null=True)
    MemberID = models.TextField(db_column="MemberID", blank=True, null=True)
    Name = models.TextField(db_column="Name", blank=True, null=True)
    Gender = models.TextField(db_column="Gender", blank=True, null=True)
    DoB = models.TextField(db_column="DoB", blank=True, null=True)
    DoJ = models.TextField(db_column="DoJ", blank=True, null=True)
    FatherHusbandName = models.TextField(db_column="FatherHusbandName", blank=True, null=True)
    Relation = models.TextField(db_column="Relation", blank=True, null=True)
    MaritalStatus = models.TextField(db_column="MaritalStatus", blank=True, null=True)
    Mobile = models.TextField(db_column="Mobile", blank=True, null=True)
    EmailID = models.TextField(db_column="EmailID", blank=True, null=True)
    AADHAAR = models.TextField(db_column="AADHAAR", blank=True, null=True)
    PAN = models.TextField(db_column="PAN", blank=True, null=True)
    BankAccountNo = models.TextField(db_column="BankAccountNo", blank=True, null=True)
    IFSCCode = models.TextField(db_column="IFSCCode", blank=True, null=True)
    NominationFiled = models.TextField(db_column="NominationFiled", blank=True, null=True)
    IsAadhaarVerified = models.TextField(db_column="IsAadhaarVerified", blank=True, null=True)
    CreatedDate = models.DateTimeField(db_column="CreatedDate", null=True, blank=True)
    Status = models.IntegerField(db_column="Status", null=True, blank=True)

    class Meta:
        managed = False
        db_table = "bss_legacy_rtl_payrolluanmasterupload"


class LegalCasesStageOne(models.Model):
    """RTL.Usp_ManageLegalDashboard/Usp_ManageLegalCaseData stage-one rows."""
    CaseID = models.AutoField(primary_key=True, db_column="CaseID")
    CaseCode = models.TextField(db_column="CaseCode", blank=True, null=True)
    CaseTitle = models.TextField(db_column="CaseTitle", blank=True, null=True)
    CaseType = models.TextField(db_column="CaseType", blank=True, null=True)
    ForumCourtName = models.TextField(db_column="ForumCourtName", blank=True, null=True)
    CaseNumber = models.TextField(db_column="CaseNumber", blank=True, null=True)
    FilingDate = models.DateField(db_column="FilingDate", null=True, blank=True)
    OppositionParty = models.TextField(db_column="OppositionParty", blank=True, null=True)
    AdvocateOrLegalCounsel = models.TextField(db_column="AdvocateOrLegalCounsel", blank=True, null=True)
    ExternalFirm = models.TextField(db_column="ExternalFirm", blank=True, null=True)
    ExternalFirmName = models.TextField(db_column="ExternalFirmName", blank=True, null=True)
    SeniorRepName = models.TextField(db_column="SeniorRepName", blank=True, null=True)
    SeniorRepMobile = models.TextField(db_column="SeniorRepMobile", blank=True, null=True)
    SeniorRepEmail = models.TextField(db_column="SeniorRepEmail", blank=True, null=True)
    JuniorRepName = models.TextField(db_column="JuniorRepName", blank=True, null=True)
    JuniorRepMobile = models.TextField(db_column="JuniorRepMobile", blank=True, null=True)
    JuniorRepEmail = models.TextField(db_column="JuniorRepEmail", blank=True, null=True)
    ExternalCounselInitialOpinion = models.TextField(db_column="ExternalCounselInitialOpinion", blank=True, null=True)
    RepName = models.TextField(db_column="RepName", blank=True, null=True)
    RepMobile = models.TextField(db_column="RepMobile", blank=True, null=True)
    RepEmail = models.TextField(db_column="RepEmail", blank=True, null=True)
    InHouseCounselInitialOpinion = models.TextField(db_column="InHouseCounselInitialOpinion", blank=True, null=True)
    State = models.TextField(db_column="State", blank=True, null=True)
    FileUploadPath = models.TextField(db_column="FileUploadPath", blank=True, null=True)
    FileUploadDate = models.DateField(db_column="FileUploadDate", null=True, blank=True)
    Createby = models.IntegerField(db_column="Createby", null=True, blank=True)
    CreatedOn = models.DateTimeField(db_column="CreatedOn", null=True, blank=True)
    AppealStatus = models.TextField(db_column="AppealStatus", blank=True, null=True)
    Appealby = models.TextField(db_column="Appealby", blank=True, null=True)
    ACaseStatus = models.TextField(db_column="ACaseStatus", blank=True, null=True)
    Interest = models.TextField(db_column="Interest", blank=True, null=True)
    LateFee = models.TextField(db_column="LateFee", blank=True, null=True)
    Fines = models.TextField(db_column="Fines", blank=True, null=True)
    Penalities = models.TextField(db_column="Penalities", blank=True, null=True)
    Other = models.TextField(db_column="Other", blank=True, null=True)
    Probability = models.TextField(db_column="Probability", blank=True, null=True)

    class Meta:
        managed = False
        db_table = "bss_legacy_rtl_legalcases_stageone"


class LegalCaseHearing(models.Model):
    """RTL.Usp_ManageLegalCaseData hearing rows."""
    HearingID = models.AutoField(primary_key=True, db_column="HearingID")
    SNO = models.IntegerField(db_column="SNO", null=True, blank=True)
    CaseID = models.IntegerField(db_column="CaseID", null=True, blank=True)
    CaseCode = models.TextField(db_column="CaseCode", blank=True, null=True)
    DateOfHearing = models.DateField(db_column="DateOfHearing", null=True, blank=True)
    PurposeOfHearing = models.TextField(db_column="PurposeOfHearing", blank=True, null=True)
    OutcomeOfHearing = models.TextField(db_column="OutcomeOfHearing", blank=True, null=True)
    CaseStatus = models.TextField(db_column="CaseStatus", blank=True, null=True)
    DateOfUpload = models.DateField(db_column="DateOfUpload", null=True, blank=True)
    HearingFilePath = models.TextField(db_column="HearingFilePath", blank=True, null=True)
    Createby = models.IntegerField(db_column="Createby", null=True, blank=True)
    CreatedOn = models.DateTimeField(db_column="CreatedOn", null=True, blank=True)

    class Meta:
        managed = False
        db_table = "bss_legacy_rtl_legalcasehearing"


class LegalCasePleading(models.Model):
    """RTL.Usp_ManageLegalCaseData pleadings rows."""
    PID = models.AutoField(primary_key=True, db_column="PID")
    CaseID = models.IntegerField(db_column="CaseID", null=True, blank=True)
    CaseCode = models.TextField(db_column="CaseCode", blank=True, null=True)
    PleadingsType = models.TextField(db_column="PleadingsType", blank=True, null=True)
    DateOfFilling = models.DateField(db_column="DateOfFilling", null=True, blank=True)
    Note = models.TextField(db_column="Note", blank=True, null=True)
    DateOfUpload = models.DateField(db_column="DateOfUpload", null=True, blank=True)
    File1 = models.TextField(db_column="File1", blank=True, null=True)
    File2 = models.TextField(db_column="File2", blank=True, null=True)
    File3 = models.TextField(db_column="File3", blank=True, null=True)
    Createby = models.IntegerField(db_column="Createby", null=True, blank=True)
    CreatedOn = models.DateTimeField(db_column="CreatedOn", null=True, blank=True)

    class Meta:
        managed = False
        db_table = "bss_legacy_rtl_legalcasepleadings"


class LegalCaseOrderJudgment(models.Model):
    """RTL.Usp_ManageLegalCaseData order/judgment rows."""
    JudgmentID = models.AutoField(primary_key=True, db_column="JudgmentID")
    CaseId = models.IntegerField(db_column="CaseId", null=True, blank=True)
    CaseCode = models.TextField(db_column="CaseCode", blank=True, null=True)
    JudgmentPassed = models.IntegerField(db_column="JudgmentPassed", null=True, blank=True)
    JudiciaryName = models.TextField(db_column="JudiciaryName", blank=True, null=True)
    SummaryOfJudgment = models.TextField(db_column="SummaryOfJudgment", blank=True, null=True)
    JudgmentTime = models.DateField(db_column="JudgmentTime", null=True, blank=True)
    BareDate = models.DateField(db_column="BareDate", null=True, blank=True)
    ExecutionStatus = models.TextField(db_column="ExecutionStatus", blank=True, null=True)
    CondonationFiled = models.IntegerField(db_column="CondonationFiled", null=True, blank=True)
    CondonationStatus = models.TextField(db_column="CondonationStatus", blank=True, null=True)
    JudgmentCopyPath = models.TextField(db_column="JudgmentCopyPath", blank=True, null=True)
    Createby = models.IntegerField(db_column="Createby", null=True, blank=True)
    CreatedOn = models.DateTimeField(db_column="CreatedOn", null=True, blank=True)

    class Meta:
        managed = False
        db_table = "bss_legacy_rtl_legalcaseorderandjudgments"


class ProjectManagement(models.Model):
    """RTL.USP_ProjectManagement backing rows."""
    Id = models.AutoField(primary_key=True, db_column="Id")
    PartyId = models.IntegerField(db_column="PartyId", null=True, blank=True)
    SiteId = models.IntegerField(db_column="SiteId", null=True, blank=True)
    ProjectName = models.TextField(db_column="ProjectName", blank=True, null=True)
    SizeCapacity = models.TextField(db_column="SizeCapacity", blank=True, null=True)
    GovtPrivate = models.TextField(db_column="GovtPrivate", blank=True, null=True)
    EndUserParty = models.TextField(db_column="EndUserParty", blank=True, null=True)
    CommissioningDate = models.DateTimeField(db_column="CommissioningDate", null=True, blank=True)
    ExecutionDate = models.DateTimeField(db_column="ExecutionDate", null=True, blank=True)
    AggregatorFees = models.TextField(db_column="AggregatorFees", blank=True, null=True)
    LandConversion = models.TextField(db_column="LandConversion", blank=True, null=True)
    ActualCost = models.TextField(db_column="ActualCost", blank=True, null=True)
    RegistryValue = models.TextField(db_column="RegistryValue", blank=True, null=True)
    Variance = models.TextField(db_column="Variance", blank=True, null=True)
    MortgageProperty = models.TextField(db_column="MortgageProperty", blank=True, null=True)
    LoanAgreements = models.TextField(db_column="LoanAgreements", blank=True, null=True)
    MortgageAmount = models.TextField(db_column="MortgageAmount", blank=True, null=True)
    Miscellaenous = models.TextField(db_column="Miscellaenous", blank=True, null=True)
    AnyOtherDetail = models.TextField(db_column="AnyOtherDetail", blank=True, null=True)
    CreatedOn = models.DateTimeField(db_column="CreatedOn", null=True, blank=True)
    UpdatedOn = models.DateTimeField(db_column="UpdatedOn", null=True, blank=True)
    CreatedBy = models.IntegerField(db_column="CreatedBy", null=True, blank=True)

    class Meta:
        managed = False
        db_table = "bss_legacy_rtl_projectmanagement"


class ActIndustryMapping(models.Model):
    """RTL.USP_ActIndustryMapping backing rows."""
    Id = models.AutoField(primary_key=True, db_column="Id")
    ActId = models.IntegerField(db_column="ActId", null=True, blank=True)
    IndustryId = models.IntegerField(db_column="IndustryId", null=True, blank=True)

    class Meta:
        managed = False
        db_table = "bss_legacy_rtl_actindustrymapping"


class AdditionalStoreDoc(models.Model):
    """RTL.Usp_StoreMaster additional-document rows."""
    Id = models.AutoField(primary_key=True, db_column="Id")
    StoreCode = models.TextField(db_column="StoreCode", blank=True, null=True)
    AdditionalDocName = models.TextField(db_column="AdditionalDocName", blank=True, null=True)
    AdditionalDoc = models.TextField(db_column="AdditionalDoc", blank=True, null=True)
    Createdby = models.IntegerField(db_column="Createdby", null=True, blank=True)
    CreatedOn = models.DateTimeField(db_column="CreatedOn", null=True, blank=True)

    class Meta:
        managed = False
        db_table = "bss_legacy_rtl_additionalstoredoc"


class RetailDocumentMaster(models.Model):
    """RTL document-master rows (compliance document catalogue)."""
    Id = models.AutoField(primary_key=True, db_column="Id")
    DocumentName = models.TextField(db_column="DocumentName", blank=True, null=True)
    DocumentType = models.TextField(db_column="DocumentType", blank=True, null=True)
    Frequency = models.TextField(db_column="Frequency", blank=True, null=True)
    FormatType = models.TextField(db_column="FormatType", blank=True, null=True)
    Note = models.TextField(db_column="Note", blank=True, null=True)
    Act = models.TextField(db_column="Act", blank=True, null=True)
    IsDefault = models.BooleanField(db_column="IsDefault", null=True, blank=True)
    CreatedOn = models.DateTimeField(db_column="CreatedOn", null=True, blank=True)
    Createdby = models.TextField(db_column="Createdby", blank=True, null=True)
    Updatedby = models.TextField(db_column="Updatedby", blank=True, null=True)
    UpdatedON = models.DateTimeField(db_column="UpdatedON", null=True, blank=True)
    Isdelete = models.BooleanField(db_column="Isdelete", null=True, blank=True)
    FormNo = models.TextField(db_column="FormNo", blank=True, null=True)
    StateId = models.TextField(db_column="StateId", blank=True, null=True)
    Criticality = models.TextField(db_column="Criticality", blank=True, null=True)

    class Meta:
        managed = False
        db_table = "bss_legacy_rtl_retaildocumentmaster"


# ---------------------------------------------------------------------------
# Phase 11 — DashboardController.cs (Dashboard data actions). Unmanaged: the
# tables were migrated from SQL Server and Django must never alter them.
# ---------------------------------------------------------------------------


class BranchMaster(models.Model):
    """dbo.BranchMaster — company/branch master used by GetCompanyAndBranchMaster."""
    Id = models.AutoField(primary_key=True, db_column="Id")
    BranchCode = models.TextField(db_column="BranchCode", blank=True, null=True)
    BranchName = models.TextField(db_column="BranchName", blank=True, null=True)
    BranchAddress = models.TextField(db_column="BranchAddress", blank=True, null=True)
    IsActive = models.BooleanField(db_column="IsActive", null=True, blank=True)
    ContactNo = models.TextField(db_column="ContactNo", blank=True, null=True)
    CreatedOn = models.DateTimeField(db_column="CreatedOn", null=True, blank=True)

    class Meta:
        managed = False
        db_table = "bss_legacy_dbo_branchmaster"


class BranchMenuPermission(models.Model):
    """dbo.BranchMenuPermission — USP_SetBranchMenuPermission backing rows."""
    BranchMenuPermissionId = models.TextField(primary_key=True, db_column="BranchMenuPermissionId")
    BranchModuleId = models.IntegerField(db_column="BranchModuleId", null=True, blank=True)
    BranchMenuId = models.IntegerField(db_column="BranchMenuId", null=True, blank=True)
    BranchSubMenuId = models.IntegerField(db_column="BranchSubMenuId", null=True, blank=True)
    IsActive = models.BooleanField(db_column="IsActive", null=True, blank=True)
    BranchCode = models.TextField(db_column="BranchCode", blank=True, null=True)
    CreatedOn = models.DateTimeField(db_column="CreatedOn", null=True, blank=True)
    CreatedBy = models.IntegerField(db_column="CreatedBy", null=True, blank=True)
    UpdatedOn = models.DateTimeField(db_column="UpdatedOn", null=True, blank=True)
    UpdatedBy = models.IntegerField(db_column="UpdatedBy", null=True, blank=True)
    IsInsertUpdate = models.BooleanField(db_column="IsInsertUpdate", null=True, blank=True)
    IsDeleted = models.BooleanField(db_column="IsDeleted", null=True, blank=True)

    class Meta:
        managed = False
        db_table = "bss_legacy_dbo_branchmenupermission"


class ReportHeader(models.Model):
    """dbo.ReportHeader — USP_ReportHeader backing rows."""
    ReportHeaderId = models.TextField(primary_key=True, db_column="ReportHeaderId")
    ReportCategoryName = models.TextField(db_column="ReportCategoryName", blank=True, null=True)
    HeaderHtml = models.TextField(db_column="HeaderHtml", blank=True, null=True)
    IsActive = models.BooleanField(db_column="IsActive", null=True, blank=True)
    BranchCode = models.TextField(db_column="BranchCode", blank=True, null=True)
    CreatedBy = models.IntegerField(db_column="CreatedBy", null=True, blank=True)
    CreatedOn = models.DateTimeField(db_column="CreatedOn", null=True, blank=True)
    UpdatedBy = models.IntegerField(db_column="UpdatedBy", null=True, blank=True)
    UpdatedOn = models.DateTimeField(db_column="UpdatedOn", null=True, blank=True)

    class Meta:
        managed = False
        db_table = "bss_legacy_dbo_reportheader"


class ManageReportHeader(models.Model):
    """RTL.ManageReportHeader — usp_ManageReportHeader backing rows."""
    Id = models.AutoField(primary_key=True, db_column="Id")
    DocumentId = models.IntegerField(db_column="DocumentId", null=True, blank=True)
    StateId = models.IntegerField(db_column="StateId", null=True, blank=True)
    Allowed = models.IntegerField(db_column="Allowed", null=True, blank=True)
    BackupHeaderHtml = models.TextField(db_column="BackupHeaderHtml", blank=True, null=True)
    HeaderHtml = models.TextField(db_column="HeaderHtml", blank=True, null=True)

    class Meta:
        managed = False
        db_table = "bss_legacy_rtl_managereportheader"


class ContractorGatePass(models.Model):
    """dbo.TblGatePass — usp_ContractorGatePass backing rows."""
    Id = models.AutoField(primary_key=True, db_column="Id")
    EmployeeId = models.IntegerField(db_column="EmployeeId", null=True, blank=True)
    CreatedOn = models.DateTimeField(db_column="CreatedOn", null=True, blank=True)
    Status = models.IntegerField(db_column="Status", null=True, blank=True)
    Approvaldate = models.DateTimeField(db_column="Approvaldate", null=True, blank=True)
    GatePassDays = models.IntegerField(db_column="GatePassDays", null=True, blank=True)
    GatePassExpiryDate = models.DateTimeField(db_column="GatePassExpiryDate", null=True, blank=True)
    GatePassType = models.TextField(db_column="GatePassType", blank=True, null=True)
    GatePassID = models.TextField(db_column="GatePassID", blank=True, null=True)

    class Meta:
        managed = False
        db_table = "bss_legacy_dbo_tblgatepass"


class EmployeeComplianceDoc(models.Model):
    """dbo.EmployeeComplianceDoc — employee/vendor document rows (IUDEmployeeDoc)."""
    Id = models.AutoField(primary_key=True, db_column="Id")
    DocumentId = models.IntegerField(db_column="DocumentId", null=True, blank=True)
    VendorId = models.IntegerField(db_column="VendorId", null=True, blank=True)
    EmpCode = models.TextField(db_column="EmpCode", blank=True, null=True)
    Createdby = models.IntegerField(db_column="Createdby", null=True, blank=True)
    CreatedOn = models.DateTimeField(db_column="CreatedOn", null=True, blank=True)
    Filepath = models.TextField(db_column="Filepath", blank=True, null=True)
    Filepath1 = models.TextField(db_column="Filepath1", blank=True, null=True)
    Filepath2 = models.TextField(db_column="Filepath2", blank=True, null=True)
    Filepath3 = models.TextField(db_column="Filepath3", blank=True, null=True)
    Filepath4 = models.TextField(db_column="Filepath4", blank=True, null=True)
    Filepath5 = models.TextField(db_column="Filepath5", blank=True, null=True)
    Filepath6 = models.TextField(db_column="Filepath6", blank=True, null=True)
    Filepath7 = models.TextField(db_column="Filepath7", blank=True, null=True)
    Filepath8 = models.TextField(db_column="Filepath8", blank=True, null=True)
    Filepath9 = models.TextField(db_column="Filepath9", blank=True, null=True)
    Filepath10 = models.TextField(db_column="Filepath10", blank=True, null=True)
    Filepath11 = models.TextField(db_column="Filepath11", blank=True, null=True)
    Filepath12 = models.TextField(db_column="Filepath12", blank=True, null=True)
    Filepath13 = models.TextField(db_column="Filepath13", blank=True, null=True)
    CreatedOn1 = models.DateTimeField(db_column="CreatedOn1", null=True, blank=True)
    CreatedOn2 = models.DateTimeField(db_column="CreatedOn2", null=True, blank=True)
    CreatedOn3 = models.DateTimeField(db_column="CreatedOn3", null=True, blank=True)
    CreatedOn4 = models.DateTimeField(db_column="CreatedOn4", null=True, blank=True)
    CreatedOn5 = models.DateTimeField(db_column="CreatedOn5", null=True, blank=True)
    CreatedOn6 = models.DateTimeField(db_column="CreatedOn6", null=True, blank=True)
    CreatedOn7 = models.DateTimeField(db_column="CreatedOn7", null=True, blank=True)
    CreatedOn8 = models.DateTimeField(db_column="CreatedOn8", null=True, blank=True)
    CreatedOn9 = models.DateTimeField(db_column="CreatedOn9", null=True, blank=True)
    CreatedOn10 = models.DateTimeField(db_column="CreatedOn10", null=True, blank=True)
    CreatedOn11 = models.DateTimeField(db_column="CreatedOn11", null=True, blank=True)
    CreatedOn12 = models.DateTimeField(db_column="CreatedOn12", null=True, blank=True)
    CreatedOn13 = models.DateTimeField(db_column="CreatedOn13", null=True, blank=True)

    class Meta:
        managed = False
        db_table = "bss_legacy_dbo_employeecompliancedoc"


class IUDVendorClientDocument(models.Model):
    """dbo.IUDVendorClientDocument — vendor <-> document mapping (IUDEmployeeDoc)."""
    Id = models.AutoField(primary_key=True, db_column="Id")
    DocumentId = models.IntegerField(db_column="DocumentId", null=True, blank=True)
    VendorId = models.IntegerField(db_column="VendorId", null=True, blank=True)

    class Meta:
        managed = False
        db_table = "bss_legacy_dbo_iudvendorclientdocument"


# ---------------------------------------------------------------------------
# RetailController missing master tables (RetailController.cs).
# Unmanaged — tables already migrated from SQL Server.
# ---------------------------------------------------------------------------


class ModuleMappingMaster(models.Model):
    """RTL.Usp_Module_Mapping_Master backing table (module <-> party mapping)."""
    Id = models.BigAutoField(primary_key=True, db_column="Id")
    Module_Reg_Id = models.BigIntegerField(db_column="Module_Reg_Id", null=True, blank=True)
    Party_Id = models.IntegerField(db_column="Party_Id", null=True, blank=True)
    Party_Type_Id = models.IntegerField(db_column="Party_Type_Id", null=True, blank=True)
    IsActive = models.IntegerField(db_column="IsActive", null=True, blank=True)
    IsApproval = models.IntegerField(db_column="IsApproval", null=True, blank=True)
    IsDeleted = models.IntegerField(db_column="IsDeleted", null=True, blank=True)
    Created_BY = models.IntegerField(db_column="Created_BY", null=True, blank=True)
    Created_Date = models.DateTimeField(db_column="Created_Date", null=True, blank=True)
    Updated_By = models.IntegerField(db_column="Updated_By", null=True, blank=True)
    Updated_Date = models.DateTimeField(db_column="Updated_Date", null=True, blank=True)

    class Meta:
        managed = False
        db_table = "bss_legacy_rtl_tbl_module_mapping_master"


class CaseStatusMaster(models.Model):
    """dbo.CaseStatus — case status lookup (InsertUpdateDelCaseStatusMaster)."""
    Id = models.AutoField(primary_key=True, db_column="Id")
    CaseStatus = models.TextField(db_column="CaseStatus", blank=True, null=True)
    CreatedBy = models.TextField(db_column="CreatedBy", blank=True, null=True)
    CreatedOn = models.DateTimeField(db_column="CreatedOn", null=True, blank=True)

    class Meta:
        managed = False
        db_table = "bss_legacy_dbo_casestatus"


class Entify(models.Model):
    """RTL.usp_Entify backing table (InsertUpdateDelEntify / SearchEntify)."""
    Id = models.AutoField(primary_key=True, db_column="Id")
    EntityType = models.TextField(db_column="EntityType", blank=True, null=True)
    ListedCompany = models.TextField(db_column="ListedCompany", blank=True, null=True)
    ListedStatus = models.TextField(db_column="ListedStatus", blank=True, null=True)
    StockExchange = models.TextField(db_column="StockExchange", blank=True, null=True)
    FundingStatus = models.TextField(db_column="FundingStatus", blank=True, null=True)
    FundingType = models.TextField(db_column="FundingType", blank=True, null=True)
    Turnover = models.TextField(db_column="Turnover", blank=True, null=True)
    NetProfit = models.TextField(db_column="NetProfit", blank=True, null=True)
    Borrowing = models.TextField(db_column="Borrowing", blank=True, null=True)
    AuthorizedShareCap = models.TextField(db_column="AuthorizedShareCap", blank=True, null=True)
    IssuedShareCap = models.TextField(db_column="IssuedShareCap", blank=True, null=True)
    PaidupCap = models.TextField(db_column="PaidupCap", blank=True, null=True)
    AverageNetProfit = models.TextField(db_column="AverageNetProfit", blank=True, null=True)
    HoldingSubsidiary = models.TextField(db_column="HoldingSubsidiary", blank=True, null=True)
    NBFCRegisterd = models.TextField(db_column="NBFCRegisterd", blank=True, null=True)
    RBIRegistered = models.TextField(db_column="RBIRegistered", blank=True, null=True)
    Startup = models.TextField(db_column="Startup", blank=True, null=True)
    MSMERegistered = models.TextField(db_column="MSMERegistered", blank=True, null=True)
    RegisteredunderGST = models.TextField(db_column="RegisteredunderGST", blank=True, null=True)
    CIN = models.TextField(db_column="CIN", blank=True, null=True)
    PAN = models.TextField(db_column="PAN", blank=True, null=True)
    TAN = models.TextField(db_column="TAN", blank=True, null=True)
    IncorporationDate = models.DateTimeField(db_column="IncorporationDate", null=True, blank=True)
    RegisteredState = models.TextField(db_column="RegisteredState", blank=True, null=True)
    NICCode = models.TextField(db_column="NICCode", blank=True, null=True)
    FinancialYearEnd = models.TextField(db_column="FinancialYearEnd", blank=True, null=True)
    ResidentDirector = models.TextField(db_column="ResidentDirector", blank=True, null=True)
    IndependentDirectors = models.IntegerField(db_column="IndependentDirectors", null=True, blank=True)
    WomenDirector = models.TextField(db_column="WomenDirector", blank=True, null=True)
    CSAppointed = models.TextField(db_column="CSAppointed", blank=True, null=True)
    KMPAppointed = models.TextField(db_column="KMPAppointed", blank=True, null=True)
    Module_Name = models.TextField(db_column="Module_Name", blank=True, null=True)
    Description = models.TextField(db_column="Description", blank=True, null=True)
    Start_Date = models.DateTimeField(db_column="Start_Date", null=True, blank=True)
    End_Date = models.DateTimeField(db_column="End_Date", null=True, blank=True)
    UserId = models.IntegerField(db_column="UserId", null=True, blank=True)

    class Meta:
        managed = False
        db_table = "bss_legacy_rtl_entify"


class CourtMaster(models.Model):
    """RTL.Usp_RetailCourtMaster backing table (IUDCourtMaster)."""
    ID = models.AutoField(primary_key=True, db_column="ID")
    Name = models.TextField(db_column="Name", blank=True, null=True)

    class Meta:
        managed = False
        db_table = "bss_legacy_rtl_courtmaster"


class ClientBoarding(models.Model):
    """RTL.USP_ClientBoarding backing table (InsertClientOnboarding)."""
    Id = models.AutoField(primary_key=True, db_column="Id")
    Boardingtype = models.TextField(db_column="Boardingtype", blank=True, null=True)
    DocumentName = models.TextField(db_column="DocumentName", blank=True, null=True)
    Frequency = models.TextField(db_column="Frequency", blank=True, null=True)
    Month = models.TextField(db_column="Month", blank=True, null=True)
    Year = models.TextField(db_column="Year", blank=True, null=True)
    State = models.TextField(db_column="State", blank=True, null=True)
    Description = models.TextField(db_column="Description", blank=True, null=True)
    DueDate = models.TextField(db_column="DueDate", blank=True, null=True)
    Remark = models.TextField(db_column="Remark", blank=True, null=True)
    UploadFile = models.TextField(db_column="UploadFile", blank=True, null=True)
    Createdon = models.DateTimeField(db_column="Createdon", null=True, blank=True)
    Createdby = models.IntegerField(db_column="Createdby", null=True, blank=True)
    ExcelFile = models.TextField(db_column="ExcelFile", blank=True, null=True)

    class Meta:
        managed = False
        db_table = "bss_legacy_rtl_clientboarding"


class StoreDocument(models.Model):
    """RTL.StoreDocument — store licence documents (GetStoreDocumentDetails)."""
    Id = models.AutoField(primary_key=True, db_column="Id")
    StoreId = models.IntegerField(db_column="StoreId", null=True, blank=True)
    LicenseId = models.IntegerField(db_column="LicenseId", null=True, blank=True)
    DocumentId = models.IntegerField(db_column="DocumentId", null=True, blank=True)
    DocumentLink = models.TextField(db_column="DocumentLink", blank=True, null=True)
    Createdon = models.DateTimeField(db_column="Createdon", null=True, blank=True)

    class Meta:
        managed = False
        db_table = "bss_legacy_rtl_storedocument"
