import axios from 'axios';

/** 开发默认 localhost:8080；Docker 构建时 VITE_API_BASE_URL="" 表示同源走 Nginx /api */
const envBase = import.meta.env.VITE_API_BASE_URL;
const baseURL =
  envBase !== undefined && envBase !== null ? String(envBase) : 'http://localhost:8080';

const client = axios.create({
  baseURL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // FormData 必须由浏览器带 multipart boundary；全局默认 application/json 会导致后端 415
  if (config.data instanceof FormData && config.headers != null) {
    if (typeof config.headers.delete === 'function') {
      config.headers.delete('Content-Type');
    } else {
      delete config.headers['Content-Type'];
    }
  }
  return config;
});

export default client;
