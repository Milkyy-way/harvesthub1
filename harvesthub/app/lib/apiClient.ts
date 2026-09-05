import axios from 'axios';
import { supabase } from './supabase';

const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
if (!apiBaseUrl) {
  throw new Error(
    'Missing EXPO_PUBLIC_API_BASE_URL. Set it in .env to your FastAPI server URL (LAN IP, not localhost, for on-device testing).'
  );
}

export const apiClient = axios.create({
  baseURL: apiBaseUrl,
});

apiClient.interceptors.request.use(async (config) => {
  const { data } = await supabase.auth.getSession();
  if (data.session?.access_token) {
    config.headers.Authorization = `Bearer ${data.session.access_token}`;
  }
  return config;
});
