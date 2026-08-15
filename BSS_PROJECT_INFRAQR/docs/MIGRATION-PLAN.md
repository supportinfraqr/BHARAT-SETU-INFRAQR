# Legacy → Django Migration Plan — All Endpoints

Comprehensive plan to translate the entire legacy ASP.NET BharatShramSetu backend into
Django (project: `/home/yasser/BSS_Project/BSS_PROJECT_INFRAQR`).

## Scope summary
- **~500 controller actions** total (MVC + Web API) across **~45 MVC controllers + ~18 Web API controllers**
- **215 tables** already migrated to PostgreSQL (prefix `bss_legacy_*`) — ✅ DONE
- **118 stored procedures** — each needs porting to Django ORM (no direct proc execution in Postgres)
- Response contract: JSON array-of-objects (keys = column names), or `{status, Result}` / `{status:false, message}` for IUD ops

## Migration pattern
Every legacy action follows one of these shapes → mapped to Django:

| Legacy pattern | Django equivalent |
|---|---|
| `JsonConvert.SerializeObject(DLL.X(obj))` (DataTable) | ORM query → `list(.values())` → JSON array |
| `Json(new {status=true, Result=...})` | DRF `Response({"status": True, "Result": ...})` |
| `Json(new {status=false, message=ex.Message})` | DRF error response |
| File upload actions | Django `request.FILES` handling |
| Session auth (`Session["LoginId"]`) | JWT auth + `X-Legacy-Login-Id` compat header |

---

## PHASE 1 — Auth & Session (✅ partially done, priority HIGH)
| # | Legacy route | Method | Status |
|---|---|---|---|
| 1 | `/Login/Login` | GET view | ✅ (JWT login instead) |
| 2 | `/Login/GetUserId` | POST | ✅ DONE |
| 3 | `/Login/NGetUserId` | POST | ✅ DONE |
| 4 | `/Login/VLoginVerify` | POST | ⏳ (login verify proc) |
| 5 | `/Login/chkUserId` | POST | ⏳ |
| 6 | `/Login/CaptchaImage` | GET | ⏳ CAPTCHA |
| 7 | `/Login/SendGeneralSMS` | POST | ⏳ SMS |
| 8 | `/Login/SendEmail` | POST | ⏳ |
| 9 | `/Login/UrlAccessPermission` | POST | ⏳ |
| 10 | `/Login/GetModulePermission` | POST | ⏳ |
| 11 | `/Login/DigiLockerLogin` | GET | ⏳ (OAuth redirect) |

## PHASE 2 — Dashboard (priority HIGH)
`DashboardController` (85 actions):
- Views: unit, employee, communication, documentsMaster, Dashboard, all *DashBoard variants, CommonDashboard, Compliance*, GatePass
- Data actions: NavMenuList, ModuleList, SubMenuList, InsertMenuPermission, SearchMenuPermission,
  InsertBranchMenuPermission, SearchBranchMenuPermission, InsertSectionPermissionForRole,
  GetCompanyAndBranchMaster, InsertUpdateDeleteCompanyBranchUserPermission, UpdateAllMembers,
  SeprateUpdateMembers, GetLoginMemberDetails, GetDetails, InsertUpdateDeleteReportHeader,
  GetReportHeader, GetUserRegistration, GetempRegistration, IUDUserRegistration, IUDEmployeeDoc,
  RoleList, PagesSectionMasterList, SearchSectionandRoleMenuPermission, IUDManageReportHeader,
  GetManageReportHeader, IUDContractorGatePass, GetContractorGatePass, GetContractorDetail

## PHASE 3 — RetailSection (largest, ~195 MVC + 75 API = priority HIGH)
Sub-modules:
- **Masters**: GetEmployeeMaster, GetStoreMaster, GetMasters, GetStoreCodeNumber, GenerateEmployeeCode, GetStatusMaster, GetStoreDataBySearch
- **License**: GetLicenseMaster, GetLicenseAndRegistrationBy, ApproveLicense, LicenseRequestData, ReportLicenseRequestData, ApprovalUpdate, IUDLicense, UploadDoc, GetStoreDocumentDetails, StoreComplianceStatusMaster
- **Compliance**: UploadComplianceDoc, SearchCompliance, SearchStoreCompliance, IUDRetailcompliance, IUDRetailUpdatecompliance, SearchRETAILCompliance, BulkActSave, IUDBulkComplianceExcel, GetComlist, GetReportlist
- **Employee**: GetEmployeeMaster, UpdateEmpStatus, IUDBulkEmployeee, NewIUDBulkEmployeee, GenerateEmployeeCode, bindworkerdetail, SendReqToWorker
- **Payroll/Statutory**: GetPAYROLLDetail, UpdateerrorList, GetBulkReportlist
- **Contractor**: IUDBulkContractorComplianceExcel, ContractorGetReportlist, GetContractorComlist, ContractorDashboard, SearchPrincipleEmploye
- **Worker**: bindworkerdetail, WorkerDashboard, WorkerRegistration views, JobHistory, ReleaseWorkerByContractor, ApproveorRejectRequest
- **Dashboard/Reports**: GetStoreDashboard, GetRetailMainDashboard, GetLSDashboard, GetLDashboard, bindcommonreport, ContractorDashboard
- **Misc**: GetNewsletter, GetNoticeList, InsertUpdateNotice, MaintainLog, GetMaintainLog, Exception, getredirect, RetailRolePermisssion, SearchEscalation, IUDEscalation, SearchPayment, IUDPayment, IUDManualPayment, iudMailing, MailingSearching, IUDDiligenceCheckList, DiligenceCheckList, InsertRegister, SearchRegistration, UploadVfile, SearchRoute, GetUserPermissionSectionRoll

## PHASE 4 — Retail (~170 MVC, priority HIGH)
- Module masters: GetSearchModuleReg, InsertUpdateDelModuleReg, GetSearchModuleMappingMaster, InsertUpdateDelMappingMaster
- Role/Grade: SearchRoleMaster, InsertUpdateDelRoleMaster, SearchGradeMaster, InsertUpdateDelGradeMaster
- License/Store: GetLicenseMasterDocumentList, InsertUpdateDelLicenseDocumentMaster, SearchLicenseDocumentMaster, GetStore, InsertUpdateDelStoreMapping, InsertUpdateDelIndustryMapping, InsertUpdateDelStorePrefix, InsertUpdateDelDepartmentMaster, InsertUpdateDelStoreComplianceStatusMaster
- Compliance calenders: IUDRetailCreateActCalender, SearchRetailCreateActCalender, InsertRetailCreateIndustry, SearchRetailCreateIndustry, InsertCreateOverview, IUDActoverview, IUDStatutory, SearchStatutory, IUDSecretarialStatutory, IUDFinancialStatutory, IUDFactoryCompliance, IUDLabourcodeCompliance, AddFactoryEventcompliance, SearchFinacialStatutory, SearchFactoryCompliance
- Client mapping: IUDClientActMapping, SearchClientActMapping, InsertClientOnboarding, SearchClientOnboarding, InsertBoardingMapping, SearchBoardingMapping
- Dashboard: InsertMainRetailDashboard, SearchMainRetailDashboard, SearchComplianceDashboard, SearchClientDashboard
- Misc: SearchRetailAssignExecuter, IUDRetailAssignExecuter, IUDRetailLicenceMaster, SearchRetailLicenceMaster, InsertUpdateDelEntify, SearchEntify, InsertUpdateDelCaseStatusMaster, SearchCaseStatusMaster, InsertUpdateDelIndustryLicenseMapping, SearchIndustryLicenseMapping, iudMasters

## PHASE 5 — PartyMaster (~15, priority HIGH)
- GetPartyMasterDT, InsertUpdateDelPartyMaster, GetSearchLocation, InsertUpdateDelLocation, InsertUpdateDelLWFCompliance, GetNewCompliancesData, InsertUpdateDelMinimumWageCompliance, GetNewCMinmumWages, SaveDynamicRows

## PHASE 6 — Worker + Contractor (priority HIGH — pairs with QR)
- **WorkerController** (9): SavePhoto, SaveDocument, AgainSaveDocument, getdetailocr, UploadName
- **ContractorController** (4): contractor registration/management
- **Worker registration flow** → should integrate QR (new QR card on worker create)

## PHASE 7 — Reports & Communication (MEDIUM)
- ReportController (10): SearchReport, SearchReminderReport + views
- SendEmailController (11): SendEmail, SendEmailBULK, EmailApi
- NewsletterController (7), CommunicationController (6), NotificationReminderController (9)

## PHASE 8 — Business modules (MEDIUM)
- GrievancesController (16), DocumentMasterController (15), VenInvoiceController (14), SkillController (11), RozgarController (11), RatingController (4), SiteManagerController (4), ChangePassCodeController (4), CDMController (3), ClientActMappingController (3)

## PHASE 9 — Payments & Misc (LOW)
- PaymentgatewayController, ReturnController, ReturngatewayController, SUBSCRIPTIONMSTController, ServiceController, TimePeriodController, ChatController, MappingController, LookupController, BackupServiceController, CientSubscriptionsController

## Web API controllers (all phases, mirrored where frontend calls them)
- RetailSectionApiController (75), SendEmailApiController (33), DashboardApiController (16), LoginApiController (14), DocumentMasterApiController (11), VenInvoiceApiController (7), ApiVerification (7), CashfreeApiController (5), PartyMasterApiController (4), RatingApiController (3), CommunicationApiController (3), ChangePassCodeApiController (3), SiteManagerApiController (2), OCRAPIController (2), CDMApiController (2), ReportApiController (1), PaymentApiController (1), EZAIAPIController (1)

---

## Execution order (step by step)
1. ✅ Phase 0: DB migrated (215 tables / 900k rows)
2. **Phase 1: Auth** — finish login verify, captcha, URL permission, module permission
3. **Phase 2: Dashboard** — menus + permissions (core for frontend nav)
4. **Phase 5: PartyMaster** — party/location/compliance masters (referenced by everything)
5. **Phase 3: RetailSection masters** — employee/store/license (core data screens)
6. **Phase 6: Worker + Contractor** — registration + bind + QR integration
7. **Phase 4: Retail** — compliance calenders
8. **Phase 7-9: remaining modules** — batch by batch

## Verification
- After each phase: curl endpoints, compare JSON shape to legacy contract
- Contract test file: `docs/CONTRACT-TESTS.md`
