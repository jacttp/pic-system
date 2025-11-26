/* src/types/clients.d.ts */

export interface Client {
    Id: number;
    clienteid: string; // ID de negocio (ej: CTE-1001)
    Nombre: string;
    Matriz?: string;
    Cadena?: string;
    Canal?: string;
    Canalm?: string;
    Formato?: string;
    Gerencia?: string;
    Zona?: string;
    Jefatura?: string;
    Ruta?: string;
    Umaf?: string;
    Canalc?: string;
    Calle_Numero?: string;
    Colonia?: string;
    Ciudad?: string;
    Estado?: string;
    Tipocli?: string;
    Est2017?: string;
    Geopos?: string;
    Segemento?: string;
    LP?: string;
    Cedis?: string;
    FechaCreacion?: string;
}

export interface ClientResponse {
    success: boolean;
    data: Client[];
    total: number;
    page: number;
    limit: number;
}