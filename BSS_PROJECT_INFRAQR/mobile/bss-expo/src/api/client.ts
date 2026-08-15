import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

// Point this at your Django backend. For a device use the machine's LAN IP.
export const BASE_URL = 'http://10.0.2.2:8001'; // Android emulator -> host loopback

const api = axios.create({ baseURL: BASE_URL, timeout: 20000 });

export const TOKEN_KEY = 'bss_token';
export const USER_KEY = 'bss_user';
export const LEGACY_LOGIN_KEY = 'bss_legacy_login';

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  const legacy = await AsyncStorage.getItem(LEGACY_LOGIN_KEY);
  if (legacy) {
    config.headers['X-Legacy-Login-Id'] = legacy;
  }
  return config;
});

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    if (error.response && error.response.status === 401) {
      await AsyncStorage.removeItem(TOKEN_KEY);
      await AsyncStorage.removeItem(USER_KEY);
    }
    return Promise.reject(error);
  },
);

export default api;
