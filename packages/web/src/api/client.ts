import axios, { AxiosError } from 'axios';

export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

export const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://10.36.117.18:3000/api/v1',
  timeout: 15_000,
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('shck_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export async function unwrap<T>(request: Promise<{ data: ApiResponse<T> }>): Promise<T> {
  return (await request).data.data;
}

export function apiError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const response = error as AxiosError<{ message?: string | string[] }>;
    const message = response.response?.data?.message;
    return Array.isArray(message) ? message.join('；') : (message ?? '请求失败，请稍后重试。');
  }
  return '网络连接异常，请确认 API 服务已启动。';
}
