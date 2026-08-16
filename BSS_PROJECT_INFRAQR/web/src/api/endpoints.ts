import api from './client';

export const authApi = {
  login: (username: string, password: string) =>
    api.post('/v1/auth/login', { username, password, method: 'password' }),
  me: () => api.get('/v1/session'),
  logout: (refreshToken?: string) => api.post('/v1/auth/logout', { refreshToken }),
};

export const grievanceApi = {
  create: (payload: FormData) => api.post('/v1/grievances', payload),
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
  createBinding: (payload: any) => api.post('/qr/bindings/', payload),
  scans: () => api.get('/qr/scans/'),
  notifications: () => api.get('/qr/notifications/'),
  workerCard: (workerId: number, format = "png") =>
    `/api/qr/workers/${workerId}/card/?fmt=${format}`,
};

export const legacyApi = {
  navMenu: () => api.post('/Dashboard/NavMenuList', {}),
  moduleList: () => api.post('/Dashboard/ModuleList', {}),
  employees: (params: any = {}) => api.post('/RetailSection/GetEmployeeMaster', params),
  stores: (params: any = {}) => api.post('/RetailSection/GetStoreMaster', params),
  partyMaster: (params: any = {}) => api.post('/PartyMaster/GetPartyMasterDT', params),
};
