import api from './client';

// Map legacy page URLs (from NavMenuList) to backend data endpoints.
// Submenus that only open a view map to their corresponding search/list endpoint.
export const PAGE_ENDPOINT_MAP: Record<string, { endpoint: string; method?: 'GET' | 'POST'; payload?: any }> = {
  // ---- Retail Master ----
  '/Retail/ModuleRegMaster': { endpoint: '/Retail/GetSearchModuleReg', payload: {} },
  '/Retail/ModuleMappingMaster': { endpoint: '/Retail/GetSearchModuleMappingMaster', payload: {} },
  '/Retail/RoleMaster': { endpoint: '/Retail/SearchRoleMaster', payload: {} },
  '/Retail/GradeMaster': { endpoint: '/Retail/SearchGradeMaster', payload: {} },
  '/Dashboard/RoleMenuPermission': { endpoint: '/Retail/SearchRetailAssignExecuter', payload: {} },
  '/Retail/RetailLicenceMaster': { endpoint: '/Retail/SearchRetailLicenceMaster', payload: {} },
  '/Retail/LicenseMaster': { endpoint: '/Retail/SearchLicenseDocumentMasterList', payload: {} },
  '/Retail/StoreMapping': { endpoint: '/Retail/SearchStoreMapping', payload: {} },
  '/Retail/StorePrefix': { endpoint: '/Retail/SearchStorePrefix', payload: {} },
  '/Retail/RetailDepartmentMaster': { endpoint: '/Retail/SearchDepartmentMaster', payload: {} },
  '/Retail/DepartmentMaster': { endpoint: '/Retail/SearchDepMaster', payload: {} },
  '/Retail/StoreComplianceStatusMaster': { endpoint: '/Retail/SearchStoreComplianceStatusMaster', payload: {} },
  '/Retail/RetailDocumentMaster': { endpoint: '/Retail/SearchRetailDocumentMaster', payload: {} },
  '/Retail/RetailClientDocMapping': { endpoint: '/Retail/SearchRetailClientDocMapping', payload: {} },
  '/Retail/RetailCreateExecuter': { endpoint: '/Retail/SearchRetailCreateExecuter', payload: {} },
  '/Retail/RetailAssignExecuter': { endpoint: '/Retail/SearchRetailAssignExecuter', payload: {} },
  '/Retail/IndustryMapping': { endpoint: '/Retail/SearchMapping', payload: {} },

  // ---- Retail compliance calenders ----
  '/retail/RetailCreateActCalenderMaster': { endpoint: '/Retail/SearchRetailCreateActCalender', payload: {} },
  '/retail/RetailFinacialCalenderMaster': { endpoint: '/Retail/SearchRetailFinacialCreateActCalender', payload: {} },
  '/retail/RetailCreateindustry': { endpoint: '/Retail/SearchRetailCreateIndustry', payload: {} },
  '/retail/FactoryCompliance': { endpoint: '/Retail/SearchFactoryCompliance', payload: {} },
  '/Retail/LabourCodeCompliance': { endpoint: '/Retail/SearchLabourcodeCompliance', payload: {} },
  '/retail/RETAILSecretarialCompliance': { endpoint: '/Retail/SearchSecretarialCompliance', payload: {} },
  '/retail/ClientOnboarding': { endpoint: '/Retail/SearchClientOnboarding', payload: {} },
  '/retail/BoardingMapping': { endpoint: '/Retail/SearchBoardingMapping', payload: {} },
  '/retail/HeaderTemplate': { endpoint: '/Retail/SearchStatutorySetup', payload: {} },
  '/retail/retailcourtmaster': { endpoint: '/Retail/SearchCourtMaster', payload: {} },
  '/Retail/Casestatusmaster': { endpoint: '/Retail/SearchCaseStatusMaster', payload: {} },
  '/Retail/RetailFileMatching': { endpoint: '/Retail/SearchRetailFileMatching', payload: {} },
  '/retail/MainRetailDashboard': { endpoint: '/Retail/SearchMainRetailDashboard', payload: {} },

  // ---- RetailSection ----
  '/RetailSection/ActMaster': { endpoint: '/RetailSection/SearchActMaster', payload: {} },
  '/RetailSection/overviewmaster': { endpoint: '/RetailSection/SearchActMaster', payload: {} },
  '/RetailSection/Declaration': { endpoint: '/RetailSection/SearchRetailONETIMEDOCUMENT', payload: {} },

  // ---- PartyMaster ----
  '/PartyMaster/PartyMast': { endpoint: '/PartyMaster/GetPartyMasterDT', payload: {} },
  '/PartyMaster/Location': { endpoint: '/PartyMaster/GetSearchLocation', payload: {} },

  // ---- Report ----
  '/Report/ReminderReport': { endpoint: '/Report/SearchReminderReport', payload: {} },
  '/report/Logonreport': { endpoint: '/Report/SearchReport', payload: {} },
};

export const EMPLOYEE_ENDPOINT = '/RetailSection/GetEmployeeMaster';

export async function fetchPageData(url: string, extraPayload: any = {}) {
  const mapping = PAGE_ENDPOINT_MAP[url];
  if (!mapping) return null;
  const payload = { ...(mapping.payload || {}), ...extraPayload };
  const res = await api.post(mapping.endpoint, payload);
  // Legacy data is a JSON array of row objects; normalize a {Result:[...]} wrapper
  const data = res.data;
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.Result)) return data.Result;
  if (data && Array.isArray(data.Data)) return data.Data;
  return [];
}
