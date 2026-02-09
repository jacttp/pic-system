/* src/modules/Auth/services/authApi.ts */
import api from '@/api/axios';
import type { LoginResponse } from '@/types/auth';

const V2 = import.meta.env.VITE_API_V2_PATH;

export const authApi = {
   async login(credentials: { username: string; password: string }): Promise<LoginResponse> {
      const { data } = await api.post<LoginResponse>(`${V2}/auth/login`, credentials);
      return data;
   }
};
