import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { DeviceEventEmitter } from 'react-native';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://api.diplebill.com';

const axiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json'
  }
});

// Inyectar token Bearer automáticamente en cada request
// (equivalente al interceptor del proyecto web)
axiosInstance.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('admin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // En desarrollo local con IP, Nginx necesita el Host header para saber qué sitio servir
  if (
    __DEV__ &&
    (BASE_URL.includes('127.0.0.1') ||
      BASE_URL.includes('localhost') ||
      BASE_URL.includes('192.168.'))
  ) {
    config.headers.Host = 'inventory_api.test';
  }

  return config;
});

export default axiosInstance;
