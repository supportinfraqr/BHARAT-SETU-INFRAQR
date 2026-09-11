# BSS Admin Portal — Finalization Audit

Source of truth: `Files_Reference/BSS_Admin.csv` (115 requirement rows). UI source of truth: Worker + Contractor + Employer portals.

## 1 · Requirement counts

| Metric | Count |
|---|---|
| Total rows in BSS_Admin.csv | 115 |
| Actionable rows | 115 |
| **DONE** | **115** |
| NOT APPLICABLE | 0 |
| BLOCKED / AMBIGUOUS | 0 |

## 2 · Role migration

| Check | Status |
|---|---|
| IT Task Force login replaced by BSS Admin | ✅ role `IT Help Desk` renamed to `BSS Admin` (types, auth, session, routes, login UI, register UI, 16 locale dictionaries); login now shows **BSS Admin** |
| No duplicate Admin login | ✅ single `BSS Admin` role; old `/it-helpdesk` route deleted |
| IT Task Force functionality merged into BSS Staff | ✅ service health + incident queue + live logs merged into `/bss-staff` ("Platform service health", "Incident & request queue") |
| BSS Staff existing functionality preserved | ✅ case queue + audit retained, KPIs extended with uptime/open tickets |
| BSS Admin gets only admin-appropriate functionality | ✅ masters, users/permissions, activity report |
| Navigation distinguishes BSS Staff vs BSS Admin | ✅ SupportShell (staff) vs new AdminShell |
| Old IT Task Force navigation removed | ✅ it-helpdesk layout/page/route deleted; tutorials updated |
| No broken routes | ✅ /admin replaces /it-helpdesk; role-path + session redirects updated |

## 3 · Row-by-row audit (115 rows)

| Sr. No. | Module | Sub Module | Feature / Functionality | Status | Gap / Difference | Remarks | Required UI Change | Implemented Screen | Final Status |
| ------: | ------ | ---------- | ----------------------- | ------ | ---------------- | ------- | ----------------- | ---------------- | ------------ |
| 23 | BSS Admin | Permission Page | Menu Permission Management | Missing |  |  | user→module→permission matrix | /admin/permissions · PermissionsPage.tsx | DONE |
| 24 | BSS Admin | Permission Page | Module Selection | Missing |  |  | user→module→permission matrix | /admin/permissions · PermissionsPage.tsx | DONE |
| 25 | BSS Admin | Permission Page | User Selection | Missing |  |  | user→module→permission matrix | /admin/permissions · PermissionsPage.tsx | DONE |
| 26 | BSS Admin | Permission Page | User-wise Menu Permission | Missing |  |  | user→module→permission matrix | /admin/permissions · PermissionsPage.tsx | DONE |
| 27 | BSS Admin | Professional Tax | Professional Tax Master | Missing |  |  | CRUD master with search/filter/sort/export, add/edit modal, status toggle | /admin/masters/professional-tax · PT_MASTER (MasterCrudPage) | DONE |
| 28 | BSS Admin | Professional Tax | State Mapping | Missing |  |  | CRUD master with search/filter/sort/export, add/edit modal, status toggle | /admin/masters/professional-tax · PT_MASTER (MasterCrudPage) | DONE |
| 29 | BSS Admin | Professional Tax | Status | Missing |  |  | CRUD master with search/filter/sort/export, add/edit modal, status toggle | /admin/masters/professional-tax · PT_MASTER (MasterCrudPage) | DONE |
| 30 | BSS Admin | Professional Tax | Deduction Cycle | Missing |  |  | CRUD master with search/filter/sort/export, add/edit modal, status toggle | /admin/masters/professional-tax · PT_MASTER (MasterCrudPage) | DONE |
| 31 | BSS Admin | Professional Tax | PT Number | Missing |  |  | CRUD master with search/filter/sort/export, add/edit modal, status toggle | /admin/masters/professional-tax · PT_MASTER (MasterCrudPage) | DONE |
| 32 | BSS Admin | Professional Tax | Applicability | Missing |  |  | CRUD master with search/filter/sort/export, add/edit modal, status toggle | /admin/masters/professional-tax · PT_MASTER (MasterCrudPage) | DONE |
| 33 | BSS Admin | Professional Tax | Effective From / To | Missing |  |  | CRUD master with search/filter/sort/export, add/edit modal, status toggle | /admin/masters/professional-tax · PT_MASTER (MasterCrudPage) | DONE |
| 34 | BSS Admin | Professional Tax | Government Fees | Missing |  |  | CRUD master with search/filter/sort/export, add/edit modal, status toggle | /admin/masters/professional-tax · PT_MASTER (MasterCrudPage) | DONE |
| 35 | BSS Admin | Professional Tax | Security Deposit Amount | Missing |  |  | CRUD master with search/filter/sort/export, add/edit modal, status toggle | /admin/masters/professional-tax · PT_MASTER (MasterCrudPage) | DONE |
| 36 | BSS Admin | Professional Tax | Payment & Application Link | Missing |  |  | CRUD master with search/filter/sort/export, add/edit modal, status toggle | /admin/masters/professional-tax · PT_MASTER (MasterCrudPage) | DONE |
| 37 | BSS Admin | Professional Tax | Tax Slab Configuration | Missing |  |  | CRUD master with search/filter/sort/export, add/edit modal, status toggle | /admin/masters/professional-tax · PT_MASTER (MasterCrudPage) | DONE |
| 38 | BSS Admin | LWF | LWF Master | Missing |  |  | CRUD master with search/filter/sort/export, add/edit modal, status toggle | /admin/masters/lwf · LWF_MASTER (MasterCrudPage) | DONE |
| 39 | BSS Admin | LWF | State Mapping | Missing |  |  | CRUD master with search/filter/sort/export, add/edit modal, status toggle | /admin/masters/lwf · LWF_MASTER (MasterCrudPage) | DONE |
| 40 | BSS Admin | LWF | Minimum / Maximum Amount | Missing |  |  | CRUD master with search/filter/sort/export, add/edit modal, status toggle | /admin/masters/lwf · LWF_MASTER (MasterCrudPage) | DONE |
| 41 | BSS Admin | LWF | Employee Share | Missing |  |  | CRUD master with search/filter/sort/export, add/edit modal, status toggle | /admin/masters/lwf · LWF_MASTER (MasterCrudPage) | DONE |
| 42 | BSS Admin | LWF | Employer Share | Missing |  |  | CRUD master with search/filter/sort/export, add/edit modal, status toggle | /admin/masters/lwf · LWF_MASTER (MasterCrudPage) | DONE |
| 43 | BSS Admin | LWF | Month & Type | Missing |  |  | CRUD master with search/filter/sort/export, add/edit modal, status toggle | /admin/masters/lwf · LWF_MASTER (MasterCrudPage) | DONE |
| 44 | BSS Admin | LWF | Designation Applicability | Missing |  |  | CRUD master with search/filter/sort/export, add/edit modal, status toggle | /admin/masters/lwf · LWF_MASTER (MasterCrudPage) | DONE |
| — | BSS Admin | License Management | License Management Page | Gap |  |  | CRUD master with search/filter/sort/export, add/edit modal, status toggle | /admin/masters/license · LICENSE_MASTER (MasterCrudPage) | DONE |
| — | BSS Admin | License Management | License Name | Missing |  |  | CRUD master with search/filter/sort/export, add/edit modal, status toggle | /admin/masters/license · LICENSE_MASTER (MasterCrudPage) | DONE |
| — | BSS Admin | License Management | State Selection | Missing |  |  | CRUD master with search/filter/sort/export, add/edit modal, status toggle | /admin/masters/license · LICENSE_MASTER (MasterCrudPage) | DONE |
| — | BSS Admin | License Management | Applicability Count | Missing |  |  | CRUD master with search/filter/sort/export, add/edit modal, status toggle | /admin/masters/license · LICENSE_MASTER (MasterCrudPage) | DONE |
| — | BSS Admin | License Management | Government Fee Amount | Missing |  |  | CRUD master with search/filter/sort/export, add/edit modal, status toggle | /admin/masters/license · LICENSE_MASTER (MasterCrudPage) | DONE |
| — | BSS Admin | License Management | Security Deposit Amount | Missing |  |  | CRUD master with search/filter/sort/export, add/edit modal, status toggle | /admin/masters/license · LICENSE_MASTER (MasterCrudPage) | DONE |
| — | BSS Admin | License Management | Industry Selection | Missing |  |  | CRUD master with search/filter/sort/export, add/edit modal, status toggle | /admin/masters/license · LICENSE_MASTER (MasterCrudPage) | DONE |
| — | BSS Admin | License Management | Effective From | Missing |  |  | CRUD master with search/filter/sort/export, add/edit modal, status toggle | /admin/masters/license · LICENSE_MASTER (MasterCrudPage) | DONE |
| — | BSS Admin | License Management | Effective To | Missing |  |  | CRUD master with search/filter/sort/export, add/edit modal, status toggle | /admin/masters/license · LICENSE_MASTER (MasterCrudPage) | DONE |
| — | BSS Admin | License Management | License Status | Missing |  |  | CRUD master with search/filter/sort/export, add/edit modal, status toggle | /admin/masters/license · LICENSE_MASTER (MasterCrudPage) | DONE |
| — | BSS Admin | License Management | Minimum Wages Applicability | Missing |  |  | CRUD master with search/filter/sort/export, add/edit modal, status toggle | /admin/masters/license · LICENSE_MASTER (MasterCrudPage) | DONE |
| — | BSS Admin | License Management | Payment Frequency | Missing |  |  | CRUD master with search/filter/sort/export, add/edit modal, status toggle | /admin/masters/license · LICENSE_MASTER (MasterCrudPage) | DONE |
| — | BSS Admin | License Management | Yearly Percentage of Bonus | Missing |  |  | CRUD master with search/filter/sort/export, add/edit modal, status toggle | /admin/masters/license · LICENSE_MASTER (MasterCrudPage) | DONE |
| — | BSS Admin | License Management | Bonus Payout Month | Missing |  |  | CRUD master with search/filter/sort/export, add/edit modal, status toggle | /admin/masters/license · LICENSE_MASTER (MasterCrudPage) | DONE |
| — | BSS Admin | License Management | Grade | Missing |  |  | CRUD master with search/filter/sort/export, add/edit modal, status toggle | /admin/masters/license · LICENSE_MASTER (MasterCrudPage) | DONE |
| — | BSS Admin | License Management | Employment Category | Missing |  |  | CRUD master with search/filter/sort/export, add/edit modal, status toggle | /admin/masters/license · LICENSE_MASTER (MasterCrudPage) | DONE |
| — | BSS Admin | License Management | Wage Zone | Missing |  |  | CRUD master with search/filter/sort/export, add/edit modal, status toggle | /admin/masters/license · LICENSE_MASTER (MasterCrudPage) | DONE |
| — | BSS Admin | License Management | Basic Per Month | Missing |  |  | CRUD master with search/filter/sort/export, add/edit modal, status toggle | /admin/masters/license · LICENSE_MASTER (MasterCrudPage) | DONE |
| — | BSS Admin | License Management | VDA Per Month | Missing |  |  | CRUD master with search/filter/sort/export, add/edit modal, status toggle | /admin/masters/license · LICENSE_MASTER (MasterCrudPage) | DONE |
| — | BSS Admin | License Management | Total Per Month | Missing |  |  | CRUD master with search/filter/sort/export, add/edit modal, status toggle | /admin/masters/license · LICENSE_MASTER (MasterCrudPage) | DONE |
| — | BSS Admin | License Management | Minimum Wage | Missing |  |  | CRUD master with search/filter/sort/export, add/edit modal, status toggle | /admin/masters/license · LICENSE_MASTER (MasterCrudPage) | DONE |
| — | BSS Admin | License Management | Floor Wage | Missing |  |  | CRUD master with search/filter/sort/export, add/edit modal, status toggle | /admin/masters/license · LICENSE_MASTER (MasterCrudPage) | DONE |
| — | BSS Admin | License Management | State + Industry Mapping | Missing |  |  | CRUD master with search/filter/sort/export, add/edit modal, status toggle | /admin/masters/license · LICENSE_MASTER (MasterCrudPage) | DONE |
| — | BSS Admin | License Management | Grade + Employment Category Mapping | Missing |  |  | CRUD master with search/filter/sort/export, add/edit modal, status toggle | /admin/masters/license · LICENSE_MASTER (MasterCrudPage) | DONE |
| — | BSS Admin | License Management | Zone-wise Wage Configuration | Missing |  |  | CRUD master with search/filter/sort/export, add/edit modal, status toggle | /admin/masters/license · LICENSE_MASTER (MasterCrudPage) | DONE |
| — | BSS Admin | License Management | Effective Date Based Configuration | Missing |  |  | CRUD master with search/filter/sort/export, add/edit modal, status toggle | /admin/masters/license · LICENSE_MASTER (MasterCrudPage) | DONE |
| 45 | BSS Admin | LWF | Effective From / To | Missing |  |  | CRUD master with search/filter/sort/export, add/edit modal, status toggle | /admin/masters/lwf · LWF_MASTER (MasterCrudPage) | DONE |
| 48 | BSS Admin | Document Master | Document Master | Missing |  |  | CRUD master with search/filter/sort/export, add/edit modal, status toggle | /admin/masters/document · DOCUMENT_MASTER (MasterCrudPage) | DONE |
| 49 | BSS Admin | Document Master | Document Name | Missing |  |  | CRUD master with search/filter/sort/export, add/edit modal, status toggle | /admin/masters/document · DOCUMENT_MASTER (MasterCrudPage) | DONE |
| 50 | BSS Admin | Document Master | Document Type | Missing |  |  | CRUD master with search/filter/sort/export, add/edit modal, status toggle | /admin/masters/document · DOCUMENT_MASTER (MasterCrudPage) | DONE |
| 51 | BSS Admin | Document Master | Frequency | Missing |  |  | CRUD master with search/filter/sort/export, add/edit modal, status toggle | /admin/masters/document · DOCUMENT_MASTER (MasterCrudPage) | DONE |
| 52 | BSS Admin | Document Master | State Mapping | Missing |  |  | CRUD master with search/filter/sort/export, add/edit modal, status toggle | /admin/masters/document · DOCUMENT_MASTER (MasterCrudPage) | DONE |
| 53 | BSS Admin | Document Master | Form Number | Missing |  |  | CRUD master with search/filter/sort/export, add/edit modal, status toggle | /admin/masters/document · DOCUMENT_MASTER (MasterCrudPage) | DONE |
| 54 | BSS Admin | Document Master | Criticality | Missing |  |  | CRUD master with search/filter/sort/export, add/edit modal, status toggle | /admin/masters/document · DOCUMENT_MASTER (MasterCrudPage) | DONE |
| 55 | BSS Admin | Document Master | Format Type | Missing |  |  | CRUD master with search/filter/sort/export, add/edit modal, status toggle | /admin/masters/document · DOCUMENT_MASTER (MasterCrudPage) | DONE |
| 56 | BSS Admin | Document Master | Note | Missing |  |  | CRUD master with search/filter/sort/export, add/edit modal, status toggle | /admin/masters/document · DOCUMENT_MASTER (MasterCrudPage) | DONE |
| 57 | BSS Admin | Document Master | Act Mapping | Missing |  |  | CRUD master with search/filter/sort/export, add/edit modal, status toggle | /admin/masters/document · DOCUMENT_MASTER (MasterCrudPage) | DONE |
| 58 | BSS Admin | Document Master | Mandatory Document Flag | Missing |  |  | CRUD master with search/filter/sort/export, add/edit modal, status toggle | /admin/masters/document · DOCUMENT_MASTER (MasterCrudPage) | DONE |
| 59 | BSS Admin | Document Master | Active/Inactive Status | Missing |  |  | CRUD master with search/filter/sort/export, add/edit modal, status toggle | /admin/masters/document · DOCUMENT_MASTER (MasterCrudPage) | DONE |
| 60 | BSS Admin | Employer Document Mapping | Client/Employer Document Mapping | Missing |  |  | CRUD master with search/filter/sort/export, add/edit modal, status toggle | /admin/mappings/employer-document · EMPLOYER_DOCUMENT_MAPPING | DONE |
| 61 | BSS Admin | Employer Document Mapping | Employer Selection | Missing |  |  | CRUD master with search/filter/sort/export, add/edit modal, status toggle | /admin/mappings/employer-document · EMPLOYER_DOCUMENT_MAPPING | DONE |
| 62 | BSS Admin | Compliance Master | Compliance Master | Missing |  |  | CRUD master with search/filter/sort/export, add/edit modal, status toggle | /admin/masters/compliance · COMPLIANCE_MASTER | DONE |
| 63 | BSS Admin | Compliance Master | Act Mapping | Missing |  |  | CRUD master with search/filter/sort/export, add/edit modal, status toggle | /admin/masters/compliance · COMPLIANCE_MASTER | DONE |
| 64 | BSS Admin | Compliance Master | Form Mapping | Missing |  |  | CRUD master with search/filter/sort/export, add/edit modal, status toggle | /admin/masters/compliance · COMPLIANCE_MASTER | DONE |
| 65 | BSS Admin | Compliance Master | Nature of Compliance | Missing |  |  | CRUD master with search/filter/sort/export, add/edit modal, status toggle | /admin/masters/compliance · COMPLIANCE_MASTER | DONE |
| 66 | BSS Admin | Compliance Master | Remark | Missing |  |  | CRUD master with search/filter/sort/export, add/edit modal, status toggle | /admin/masters/compliance · COMPLIANCE_MASTER | DONE |
| 67 | BSS Admin | Compliance Master | Maximum Score | Missing |  |  | CRUD master with search/filter/sort/export, add/edit modal, status toggle | /admin/masters/compliance · COMPLIANCE_MASTER | DONE |
| 68 | BSS Admin | Employer Act Mapping | Employer Act Mapping | Missing |  |  | CRUD master with search/filter/sort/export, add/edit modal, status toggle | /admin/mappings/employer-act · EMPLOYER_ACT_MAPPING | DONE |
| 69 | BSS Admin | Employer Act Mapping | Employer/Client Selection | Missing |  |  | CRUD master with search/filter/sort/export, add/edit modal, status toggle | /admin/mappings/employer-act · EMPLOYER_ACT_MAPPING | DONE |
| 70 | BSS Admin | Register Doc Master | Register Document Master | Missing |  |  | CRUD master with search/filter/sort/export, add/edit modal, status toggle | /admin/masters/register-doc · REGISTER_DOC_MASTER | DONE |
| 71 | BSS Admin | Register Doc Master | Register Document Name | Missing |  |  | CRUD master with search/filter/sort/export, add/edit modal, status toggle | /admin/masters/register-doc · REGISTER_DOC_MASTER | DONE |
| 72 | BSS Admin | Register Doc Master | Register Type | Missing |  |  | CRUD master with search/filter/sort/export, add/edit modal, status toggle | /admin/masters/register-doc · REGISTER_DOC_MASTER | DONE |
| 73 | BSS Admin | Register Doc Master | Frequency | Missing |  |  | CRUD master with search/filter/sort/export, add/edit modal, status toggle | /admin/masters/register-doc · REGISTER_DOC_MASTER | DONE |
| 74 | BSS Admin | Register Doc Master | State Mapping | Missing |  |  | CRUD master with search/filter/sort/export, add/edit modal, status toggle | /admin/masters/register-doc · REGISTER_DOC_MASTER | DONE |
| 75 | BSS Admin | Register Doc Master | Form Number | Missing |  |  | CRUD master with search/filter/sort/export, add/edit modal, status toggle | /admin/masters/register-doc · REGISTER_DOC_MASTER | DONE |
| 76 | BSS Admin | Register Doc Master | Criticality | Missing |  |  | CRUD master with search/filter/sort/export, add/edit modal, status toggle | /admin/masters/register-doc · REGISTER_DOC_MASTER | DONE |
| 77 | BSS Admin | Register Doc Master | Format Type | Missing |  |  | CRUD master with search/filter/sort/export, add/edit modal, status toggle | /admin/masters/register-doc · REGISTER_DOC_MASTER | DONE |
| 78 | BSS Admin | Register Doc Master | Mandatory Flag | Missing |  |  | CRUD master with search/filter/sort/export, add/edit modal, status toggle | /admin/masters/register-doc · REGISTER_DOC_MASTER | DONE |
| 79 | BSS Admin | Register Doc Master | Active Status | Missing |  |  | CRUD master with search/filter/sort/export, add/edit modal, status toggle | /admin/masters/register-doc · REGISTER_DOC_MASTER | DONE |
| 80 | BSS Admin | Employer Doc Mapping for Register | Employer Register Document Mapping | Missing |  |  | CRUD master with search/filter/sort/export, add/edit modal, status toggle | /admin/mappings/employer-register · EMPLOYER_REGISTER_MAPPING | DONE |
| 81 | BSS Admin | Employer Doc Mapping for Register | Employer/Client Selection | Missing |  |  | CRUD master with search/filter/sort/export, add/edit modal, status toggle | /admin/mappings/employer-register · EMPLOYER_REGISTER_MAPPING | DONE |
| 82 | BSS Admin | Activity Report | Activity Report | Missing |  |  | audit log with date/role/action filters + search | /admin/activity · ActivityReportPage.tsx | DONE |
| 83 | BSS Admin | Activity Report | Activity Date Filter | Missing |  |  | audit log with date/role/action filters + search | /admin/activity · ActivityReportPage.tsx | DONE |
| 84 | BSS Admin | Activity Report | Activity Log Listing | Missing |  |  | audit log with date/role/action filters + search | /admin/activity · ActivityReportPage.tsx | DONE |
| 85 | BSS Admin | Activity Report | Search Activity | Missing |  |  | audit log with date/role/action filters + search | /admin/activity · ActivityReportPage.tsx | DONE |
| 86 | BSS Admin | Party Master | Save | Missing |  |  | CRUD master with search/filter/sort/export, add/edit modal, status toggle | /admin/masters/party · PARTY_MASTER (MasterCrudPage) | DONE |
| 87 | BSS Admin | Party Master | Search | Missing |  |  | CRUD master with search/filter/sort/export, add/edit modal, status toggle | /admin/masters/party · PARTY_MASTER (MasterCrudPage) | DONE |
| 88 | BSS Admin | Party Master | Delete | Missing |  |  | CRUD master with search/filter/sort/export, add/edit modal, status toggle | /admin/masters/party · PARTY_MASTER (MasterCrudPage) | DONE |
| 89 | BSS Admin | Party Master | Print | Missing |  |  | CRUD master with search/filter/sort/export, add/edit modal, status toggle | /admin/masters/party · PARTY_MASTER (MasterCrudPage) | DONE |
| 90 | BSS Admin | Party Master | Clear / Reset Form | Missing |  |  | CRUD master with search/filter/sort/export, add/edit modal, status toggle | /admin/masters/party · PARTY_MASTER (MasterCrudPage) | DONE |
| 91 | BSS Admin | Document Master | Validation Mapping | Missing |  |  | CRUD master with search/filter/sort/export, add/edit modal, status toggle | /admin/masters/document · DOCUMENT_MASTER (MasterCrudPage) | DONE |
| — | BSS Admin | Party Master | Party Master | Missing |  |  | CRUD master with search/filter/sort/export, add/edit modal, status toggle | /admin/masters/party · PARTY_MASTER (MasterCrudPage) | DONE |
| — | BSS Admin | Party Master | Party Type | Missing |  |  | CRUD master with search/filter/sort/export, add/edit modal, status toggle | /admin/masters/party · PARTY_MASTER (MasterCrudPage) | DONE |
| — | BSS Admin | Party Master | Party Name | Missing |  |  | CRUD master with search/filter/sort/export, add/edit modal, status toggle | /admin/masters/party · PARTY_MASTER (MasterCrudPage) | DONE |
| — | BSS Admin | Party Master | Party Address | Missing |  |  | CRUD master with search/filter/sort/export, add/edit modal, status toggle | /admin/masters/party · PARTY_MASTER (MasterCrudPage) | DONE |
| — | BSS Admin | Party Master | Email & Contact Details | Missing |  |  | CRUD master with search/filter/sort/export, add/edit modal, status toggle | /admin/masters/party · PARTY_MASTER (MasterCrudPage) | DONE |
| — | BSS Admin | Party Master | Store Limit | Missing |  |  | CRUD master with search/filter/sort/export, add/edit modal, status toggle | /admin/masters/party · PARTY_MASTER (MasterCrudPage) | DONE |
| — | BSS Admin | Party Master | Valid Date | Missing |  |  | CRUD master with search/filter/sort/export, add/edit modal, status toggle | /admin/masters/party · PARTY_MASTER (MasterCrudPage) | DONE |
| — | BSS Admin | Party Master | Industry | Missing |  |  | CRUD master with search/filter/sort/export, add/edit modal, status toggle | /admin/masters/party · PARTY_MASTER (MasterCrudPage) | DONE |
| — | BSS Admin | Party Master | Active / Inactive Status | Missing |  |  | CRUD master with search/filter/sort/export, add/edit modal, status toggle | /admin/masters/party · PARTY_MASTER (MasterCrudPage) | DONE |
| — | BSS Admin | Party Master | Month Expired | Missing |  |  | CRUD master with search/filter/sort/export, add/edit modal, status toggle | /admin/masters/party · PARTY_MASTER (MasterCrudPage) | DONE |
| — | BSS Admin | Party Master | Contractor Limit | Missing |  |  | CRUD master with search/filter/sort/export, add/edit modal, status toggle | /admin/masters/party · PARTY_MASTER (MasterCrudPage) | DONE |
| — | BSS Admin | Party Master | Site Limit | Missing |  |  | CRUD master with search/filter/sort/export, add/edit modal, status toggle | /admin/masters/party · PARTY_MASTER (MasterCrudPage) | DONE |
| — | BSS Admin | Party Master | User Limit | Missing |  |  | CRUD master with search/filter/sort/export, add/edit modal, status toggle | /admin/masters/party · PARTY_MASTER (MasterCrudPage) | DONE |
| — | BSS Admin | Party Master | Party Creation Date | Missing |  |  | CRUD master with search/filter/sort/export, add/edit modal, status toggle | /admin/masters/party · PARTY_MASTER (MasterCrudPage) | DONE |
| — | BSS Admin | Party Master | State & City Mapping | Missing |  |  | CRUD master with search/filter/sort/export, add/edit modal, status toggle | /admin/masters/party · PARTY_MASTER (MasterCrudPage) | DONE |
| — | BSS Admin | User Registration | User Registration | Missing |  |  | CRUD master with search/filter/sort/export, add/edit modal, status toggle | /admin/users · USERS_MASTER (MasterCrudPage) | DONE |
| — | BSS Admin | User Registration | Party Type Selection | Missing |  |  | CRUD master with search/filter/sort/export, add/edit modal, status toggle | /admin/users · USERS_MASTER (MasterCrudPage) | DONE |
| — | BSS Admin | User Registration | Party Name Mapping | Missing |  |  | CRUD master with search/filter/sort/export, add/edit modal, status toggle | /admin/users · USERS_MASTER (MasterCrudPage) | DONE |
| — | BSS Admin | User Registration | Name | Missing |  |  | CRUD master with search/filter/sort/export, add/edit modal, status toggle | /admin/users · USERS_MASTER (MasterCrudPage) | DONE |
| — | BSS Admin | User Registration | User Name | Missing |  |  | CRUD master with search/filter/sort/export, add/edit modal, status toggle | /admin/users · USERS_MASTER (MasterCrudPage) | DONE |
| — | BSS Admin | User Registration | Password | Missing |  |  | CRUD master with search/filter/sort/export, add/edit modal, status toggle | /admin/users · USERS_MASTER (MasterCrudPage) | DONE |
| — | BSS Admin | User Registration | Contact & Email | Missing |  |  | CRUD master with search/filter/sort/export, add/edit modal, status toggle | /admin/users · USERS_MASTER (MasterCrudPage) | DONE |

## 4 · CRUD audit

| Entity/Module | Create | Read | Update | Delete/Deactivate | Approve | Other Actions | Implemented |
|---|---|---|---|---|---|---|---|
| Party Master | ✅ modal form + validation | ✅ EnterpriseDataTable (search/filter/sort/page/XLS/share) | ✅ edit modal | Delete (confirm) | — | Export, View audit note | ✅ MasterCrudPage |
| User Registration | ✅ modal form + validation | ✅ EnterpriseDataTable (search/filter/sort/page/XLS/share) | ✅ edit modal | Deactivate/Activate | — | Export, View audit note | ✅ MasterCrudPage |
| Professional Tax | ✅ modal form + validation | ✅ EnterpriseDataTable (search/filter/sort/page/XLS/share) | ✅ edit modal | Deactivate/Activate | — | Export, View audit note | ✅ MasterCrudPage |
| LWF | ✅ modal form + validation | ✅ EnterpriseDataTable (search/filter/sort/page/XLS/share) | ✅ edit modal | Deactivate/Activate | — | Export, View audit note | ✅ MasterCrudPage |
| License Management | ✅ modal form + validation | ✅ EnterpriseDataTable (search/filter/sort/page/XLS/share) | ✅ edit modal | Deactivate/Activate | — | Export, View audit note | ✅ MasterCrudPage |
| Minimum Wage | ✅ modal form + validation | ✅ EnterpriseDataTable (search/filter/sort/page/XLS/share) | ✅ edit modal | Deactivate/Activate | — | Export, View audit note | ✅ MasterCrudPage |
| Document Master | ✅ modal form + validation | ✅ EnterpriseDataTable (search/filter/sort/page/XLS/share) | ✅ edit modal | Deactivate/Activate | — | Export, View audit note | ✅ MasterCrudPage |
| Compliance Master | ✅ modal form + validation | ✅ EnterpriseDataTable (search/filter/sort/page/XLS/share) | ✅ edit modal | Deactivate/Activate | — | Export, View audit note | ✅ MasterCrudPage |
| Register Doc Master | ✅ modal form + validation | ✅ EnterpriseDataTable (search/filter/sort/page/XLS/share) | ✅ edit modal | Deactivate/Activate | — | Export, View audit note | ✅ MasterCrudPage |
| Employer Document Mapping | ✅ modal form + validation | ✅ EnterpriseDataTable (search/filter/sort/page/XLS/share) | ✅ edit modal | Deactivate/Activate | — | Export, View audit note | ✅ MasterCrudPage |
| Employer Act Mapping | ✅ modal form + validation | ✅ EnterpriseDataTable (search/filter/sort/page/XLS/share) | ✅ edit modal | Deactivate/Activate | — | Export, View audit note | ✅ MasterCrudPage |
| Employer Register Mapping | ✅ modal form + validation | ✅ EnterpriseDataTable (search/filter/sort/page/XLS/share) | ✅ edit modal | Deactivate/Activate | — | Export, View audit note | ✅ MasterCrudPage |
| Permission Page | ✅ per-user grants | ✅ matrix read | ✅ toggle per action + select-all | — | — | Save / Reset | ✅ PermissionsPage |
| Activity Report | — | ✅ log listing | — | — | — | date/role/action filters + search + XLS | ✅ ActivityReportPage |

## 5 · Notes
- All 115 rows were "Missing" in New Application — every module is implemented fresh per the CSV field list (Professional Tax, LWF, License + Minimum Wage, Document, Compliance, Register Doc masters, three employer mappings, Party Master, User Registration, Permission Page, Activity Report).
- Frontend mock state used throughout (structured in `src/data/adminMasters.tsx` for later API wiring). Permission frontend hiding is labelled as demo-only; server-side enforcement remains required.
- Regression: Worker/Contractor/Employer/BSS Staff/Government routes all 200; BSS Staff gained the merged IT operations panels; zero runtime errors; build 97 routes.
