export interface ClientPending {
   clienteid: string;
   Nombre: string;
   Matriz?: string;
   Cadena?: string;
   Calle_Numero: string;
   Colonia?: string;
   Ciudad: string;
   Estado: string;
   Geopos: string; // "lat,long"
   TipoCli: string;
   canal?: string;
   formatocte?: string;
   Gerencia?: string;
   Jefatura?: string;
   Zona?: string;
   Ruta?: string;
   canalm?: string;
   formato?: string; // Alias para formatocte
   umaf?: string;
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
