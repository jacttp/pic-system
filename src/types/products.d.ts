/* src/types/products.d.ts */

export interface Product {
    Id: number; // ID interno autoincremental
    SkuReal: string;
    SKUMuliix?: string;
    Nombre: string;
    Marca?: string;
    Grupo?: string;
    Status: number | boolean; // 1/0 o true/false
    Peso?: number;
    Canibalizacion?: number;
    EmpaqueA?: string;
    EmpaqueB?: string;
    Categorias?: string;
    TipoCom?: string;
    Id_SkuRetail?: string;
    Contol?: string;
    TipoEsqDis?: string;
    GrupoOP?: string;
    FechaCreacion?: string;
}

export interface ProductResponse {
    success: boolean;
    data: Product[];
    total: number;
    page: number;
    limit: number;
}