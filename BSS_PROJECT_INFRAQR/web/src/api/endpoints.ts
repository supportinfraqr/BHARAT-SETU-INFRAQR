import api from './client';

export const authApi = {
  login: (username: string, password: string) =>
    api.post('/auth/login/', { username, password }),
  me: () => api.get('/auth/me/'),
  logout: () => api.post('/auth/logout/', {}),
};

export const qrApi = {
  dashboard: () => api.get('/qr/dashboard/'),
  employers: () => api.get('/qr/employers/'),
  contractors: () => api.get('/qr/contractors/'),
  workers: () => api.get('/qr/workers/'),
  scan: (qrReference: string, lat?: number, lng?: number) =>
    api.post('/qr/qr/scan/', { qr_reference: qrReference, latitude: lat, longitude: lng }),
  getQr: (entityType: string, entityId: number) =>
    api.get('/qr/qr/', { params: { entity_type: entityType, entity_id: entityId } }),
  createWorker: (payload: any) => api.post('/qr/workers/', payload),
  bindings: () => api.get('/qr/bindings/'),
  bindingList: () => api.get('/qr/bindings/list/'),
  createBinding: (payload: any) => api.post('/qr/bindings/', payload),
  unbind: (workerId: number) => api.post('/qr/bindings/unbind/', { worker: workerId }),
  approveBinding: (id: number, decision: 'APPROVE' | 'REJECT') =>
    api.post(`/qr/bindings/${id}/approve/`, { decision }),
  scans: () => api.get('/qr/scans/'),
  notifications: () => api.get('/qr/notifications/'),
  workerCard: (workerId: number, format = "png") =>
    `/api/qr/workers/${workerId}/card/?fmt=${format}`,
  geocode: (lat: number, lng: number) =>
    api.get('/qr/qr/geocode/', { params: { lat, lng } }),
};

export const locationApi = {
  list: () => api.get('/qr/locations/'),
  save: (payload: { name: string; latitude: number; longitude: number; address?: string; is_starred?: boolean }) =>
    api.post('/qr/locations/', payload),
  delete: (id: number) => api.delete(`/qr/locations/${id}/`),
  setContractorLocation: (contractorId: number, payload: { latitude: number; longitude: number; site_name?: string; address?: string }) =>
    api.post(`/qr/contractors/${contractorId}/location/`, payload),
};

export const qrMgmtApi = {
  employers: (status?: string) =>
    api.get('/qr/management/employers/', { params: status ? { status } : {} }),
  approve: (id: number, decision: 'APPROVE' | 'REJECT') =>
    api.post(`/qr/management/employers/${id}/approve/`, { decision }),
  plans: () => api.get('/qr/management/plans/'),
  attachPlan: (planType: string, employerId?: number, expiryDate?: string) =>
    api.post('/qr/management/employer/plan/', { plan_type: planType, employer_id: employerId, expiry_date: expiryDate }),
  myPlan: () => api.get('/qr/management/employer/my/'),
  myProfile: () => api.get('/qr/profile/me/'),
  updateProfile: (payload: any) => api.put('/qr/profile/me/', payload),
};

export const legacyApi = {
  navMenu: () => api.post('/Dashboard/NavMenuList', {}),
  moduleList: () => api.post('/Dashboard/ModuleList', {}),
  employees: (params: any = {}) => api.post('/RetailSection/GetEmployeeMaster', params),
  stores: (params: any = {}) => api.post('/RetailSection/GetStoreMaster', params),
  partyMaster: (params: any = {}) => api.post('/PartyMaster/GetPartyMasterDT', params),
  peDashboard: (loginId: number) => api.post('/RetailSection/SearchPrincipleEmploye', { Action: 1, LoginId: loginId }),
  workerDetail: (loginId: number) => api.post('/RetailSection/bindworkerdetail', { ActionType: 1, UserId: loginId }),
  contractorDashboard: (loginId: number) => api.post('/RetailSection/ContractorDashboard', { Action: 1, LoginId: loginId }),
};
