import axios from 'axios';

// Same-origin API (nginx proxies /api -> Django :8001)
const api = axios.create({ baseURL: '/api', timeout: 20000 });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('bss_token');
  const legacy = localStorage.getItem('bss_legacy_login');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (legacy && !config.url?.startsWith('/v1/')) config.headers['X-Legacy-Login-Id'] = legacy;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('bss_token');
      localStorage.removeItem('bss_refresh_token');
      localStorage.removeItem('bss_user');
      localStorage.removeItem('bss_legacy_login');
    }
    return Promise.reject(error);
  },
);

export default api;
