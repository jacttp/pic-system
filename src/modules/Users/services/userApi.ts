/* src/modules/Users/services/userApi.ts */
import api from '@/api/axios';
import type { UserFull, UserCreatePayload, UserUpdatePayload, MessagePayload } from '../types/user.types';
import type { HubFeatureKey, UserFeatureOverride } from '@/modules/Setup/types/setupTypes';

const V2 = import.meta.env.VITE_API_V2_PATH;

export const userApi = {
   async getUsers(): Promise<UserFull[]> {
      const { data } = await api.get<{ success: boolean; data: UserFull[] }>(`${V2}/users`);
      return data.data;
   },

   async getActiveUsers(): Promise<UserFull[]> {
      const { data } = await api.get<{ success: boolean; data: UserFull[] }>(`${V2}/users/active`);
      return data.data;
   },

   async createUser(payload: UserCreatePayload): Promise<boolean> {
      const { data } = await api.post<{ success: boolean }>(`${V2}/users`, payload);
      return data.success;
   },

   async updateUser(id: number, payload: UserUpdatePayload): Promise<boolean> {
      const { data } = await api.put<{ success: boolean }>(`${V2}/users/${id}`, payload);
      return data.success;
   },

   async deleteUser(id: number): Promise<boolean> {
      const { data } = await api.delete<{ success: boolean }>(`${V2}/users/${id}`);
      return data.success;
   },

   async blockUser(id: number, block: boolean): Promise<boolean> {
      const { data } = await api.patch<{ success: boolean }>(`${V2}/users/${id}/block`, { block });
      return data.success;
   },

   async sendMessage(payload: MessagePayload): Promise<boolean> {
      const { data } = await api.post<{ success: boolean }>(`${V2}/users/message`, payload);
      return data.success;
   },

   async changePassword(id: number, newPassword: string): Promise<boolean> {
      const { data } = await api.patch<{ success: boolean }>(`${V2}/users/${id}/password`, { newPassword });
      return data.success;
   },

   async getJefaturas(gerencia?: string): Promise<string[]> {
      const payload = gerencia && gerencia !== 'Corporativo' ? { Gerencia: [gerencia] } : {};
      const { data } = await api.post<string[]>(`/filters/jefaturas`, payload);
      return data;
   },

   async getZonas(gerencia?: string, jefatura?: string): Promise<string[]> {
      if (!gerencia || !jefatura || gerencia === 'Corporativo' || jefatura === 'Corporativo') return ['Corporativo'];

      const { data } = await api.post<string[]>(`/filters/zonas`, { Gerencia: [gerencia], Jefatura: [jefatura] });
      return data;
   },

   async getGerencias(): Promise<string[]> {
      const { data } = await api.get<string[]>(`/filters/gerencias`);
      return data;
   },

   async getFeatureOverrides(id: number): Promise<UserFeatureOverride[]> {
      const { data } = await api.get<{ success: boolean; data: UserFeatureOverride[] }>(`${V2}/users/${id}/feature-overrides`);
      return data.data;
   },

   async updateFeatureOverride(id: number, featureKey: HubFeatureKey, isEnabled: boolean | null): Promise<boolean> {
      const { data } = await api.patch<{ success: boolean }>(
         `${V2}/users/${id}/feature-overrides/${encodeURIComponent(featureKey)}`,
         { IsEnabled: isEnabled }
      );
      return data.success;
   }
};
