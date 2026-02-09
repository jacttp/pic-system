/* src/modules/Users/services/userApi.ts */
import api from '@/api/axios';
import type { User } from '@/types/auth'; // Ensure this type exists or adjust import

const V2 = import.meta.env.VITE_API_V2_PATH;

export const userApi = {
   async getUsers(): Promise<User[]> {
      const { data } = await api.get<{ success: boolean, data: User[] }>(`${V2}/users`);
      return data.data;
   },

   async createUser(userData: Partial<User>): Promise<boolean> {
      const { data } = await api.post<{ success: boolean }>(`${V2}/users`, userData);
      return data.success;
   }
};
