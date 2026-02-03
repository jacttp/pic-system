import api from '@/api/axios'; // Asumo que este es tu instancia base con interceptores
import type { AxiosResponse } from 'axios';

// Interfaces para tipado estricto
export interface ClientPending {
   clienteid: string;
   Nombre: string;
   Matriz: string;
   Cadena: string;
   Calle_Numero: string;
   Colonia: string;
   Ciudad: string;
   Estado: string;
   Geopos: string; // "lat,long"
   TipoCli: string;
}

export interface ClientGeoMatch extends ClientPending {
   DistanciaKm: number;
}

export interface PendingResponse {
   success: boolean;
   page: number;
   total: number;
   data: ClientPending[];
}

export interface NearbyResponse {
   success: boolean;
   center: { lat: number; lng: number };
   count: number;
   data: ClientGeoMatch[];
}

// Endpoints
const BASE_URL = '/homologation';

export default {
   getPendingClients(page = 1, limit = 50): Promise<AxiosResponse<PendingResponse>> {
      return api.get(`${BASE_URL}/pending`, { params: { page, limit } });
   },

   getNearbyClients(lat: number, lng: number, radiusMetros = 500, excludeId?: string): Promise<AxiosResponse<NearbyResponse>> {
      return api.get(`${BASE_URL}/nearby`, {
         params: { lat, lng, radiusMetros, excludeId }
      });
   }
};