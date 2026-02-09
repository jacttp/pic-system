/* src/modules/Clients/services/clientApi.ts */
import api from '@/api/axios';
import type { Client, ClientResponse } from '@/types/clients';

const V2 = import.meta.env.VITE_API_V2_PATH;
const BASE = import.meta.env.VITE_API_BASE_URL;

export const clientApi = {
   async getClients(params: URLSearchParams): Promise<ClientResponse> {
      const { data } = await api.get<ClientResponse>(`${V2}/clients?${params.toString()}`);
      return data;
   },

   async createClient(client: Partial<Client>): Promise<void> {
      await api.post(`${V2}/clients`, client);
   },

   async updateClient(id: number, client: Partial<Client>): Promise<void> {
      await api.put(`${V2}/clients/${id}`, client);
   },

   async deleteClient(id: number): Promise<void> {
      await api.delete(`${V2}/clients/${id}`);
   },

   async getClientById(id: number | string): Promise<Client | null> {
      const { data } = await api.get<{ success: boolean, data: Client }>(`${V2}/clients/${id}`);
      return data.success ? data.data : null;
   },

   // Filters - Using V2 to match PIC module standard
   async getCanales(): Promise<string[]> {
      const { data } = await api.get('/filters/canales');
      return this.parseFilterResponse(data);
   },

   async getGerencias(): Promise<string[]> {
      const { data } = await api.get('/filters/gerencias');
      return this.parseFilterResponse(data);
   },

   async getJefaturas(): Promise<string[]> {
      // Keeping POST as in original store
      const { data } = await api.post('/filters/jefaturas', {});
      return this.parseFilterResponse(data);
   },

   parseFilterResponse(data: any): string[] {
      if (Array.isArray(data)) return data;
      if (data.data && Array.isArray(data.data)) return data.data;
      return [];
   }
};
