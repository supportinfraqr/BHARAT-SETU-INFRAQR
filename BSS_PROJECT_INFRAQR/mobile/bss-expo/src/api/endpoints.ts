import api from './client';

export const authApi = {
  login: (username: string, password: string) =>
    api.post('/api/auth/login/', { username, password }),
  me: () => api.get('/api/auth/me/'),
  logout: (refresh?: string) => api.post('/api/auth/logout/', { refresh }),
};

export const qrApi = {
  dashboard: () => api.get('/api/qr/dashboard/'),
  employers: () => api.get('/api/qr/employers/'),
  contractors: () => api.get('/api/qr/contractors/'),
  workers: () => api.get('/api/qr/workers/'),
  scan: (qrReference: string, lat?: number, lng?: number) =>
    api.post('/api/qr/qr/scan/', { qr_reference: qrReference, latitude: lat, longitude: lng }),
  getQr: (entityType: string, entityId: number) =>
    api.get('/api/qr/qr/', { params: { entity_type: entityType, entity_id: entityId } }),
  bindings: () => api.get('/api/qr/bindings/'),
  createBinding: (payload: any) => api.post('/api/qr/bindings/', payload),
  scans: () => api.get('/api/qr/scans/'),
  notifications: () => api.get('/api/qr/notifications/'),
  workerCard: (workerId: number, format = 'png') =>
    `${api.defaults.baseURL}/api/qr/workers/${workerId}/card/?format=${format}`,
};

export const legacyApi = {
  getUserId: (payload: any) => api.post('/api/Login/GetUserId', payload),
  nGetUserId: (payload: any) => api.post('/api/Login/NGetUserId', payload),
  moduleList: () => api.post('/api/Dashboard/ModuleList', {}),
  navMenu: () => api.post('/api/Dashboard/NavMenuList', {}),
  employees: (params: any = {}) => api.post('/api/RetailSection/GetEmployeeMaster', params),
  stores: () => api.post('/api/RetailSection/GetStoreMaster', {}),
  partyMaster: (params: any = {}) => api.post('/api/PartyMaster/GetPartyMasterDT', params),
};
