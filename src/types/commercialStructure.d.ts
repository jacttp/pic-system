/* src/types/commercialStructure.d.ts */

export interface CommercialStructure {
   Gerencia: string;
   Zona: string;
   Ruta: string;       // Logical PK
   RutaM: string;
   Jefatura: string;
   Cedis: string;
   CanalC: string;
}

export interface CommercialStructureResponse {
   success: boolean;
   data: CommercialStructure[];
   total: number;
   page: number;
   limit: number;
}
