import api from '@/api/axios';
import type { AxiosResponse } from 'axios';
import type { PendingResponse, NearbyResponse, ClientPending } from '../types/clientValidationTypes';

// Endpoints
const BASE_URL = '/homologation';

export default {
   getPendingClients(page = 1, limit = 50): Promise<AxiosResponse<PendingResponse>> {
      return api.get(`${BASE_URL}/pending`, { params: { page, limit } });
   },

   getNearbyClients(lat: number, lng: number, radiusMetros = 1000, excludeId?: string): Promise<AxiosResponse<NearbyResponse>> {
      return api.get(`${BASE_URL}/nearby`, {
         params: { lat, lng, radiusMetros, excludeId }
      });
   },

   saveClient(id: string, clientData: Partial<ClientPending>): Promise<AxiosResponse<any>> {
      return api.patch(`${BASE_URL}/save/${id}`, clientData);
   }
};
