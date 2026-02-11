// export type SegmentationMeasure = 4 | 5 | 10 | 100; // Cuartil, Quintil, Decil, Percentil

// export interface SegmentationParams {
//    year: string;
//    month: number;
//    measure: SegmentationMeasure;
//    groupBy?: string;          // Ej: 'Gerencia', 'Zona', 'Ruta'
//    filters?: Record<string, any>;
// }

// // Estructura exacta basada en lo que acordamos del Backend
// export interface SegmentationBucket {
//    BucketNumber: number;      // 1, 2, 3...
//    ClientCount: number;       // Cantidad de clientes en este bucket
//    VolumeSum: number;         // Venta total del bucket
//    MinRange: number;          // Venta del cliente más pequeño del bucket
//    MaxRange: number;          // Venta del cliente más grande del bucket
//    PercentageOfTotal?: number;
// }

// export interface SegmentationResponse {
//    data: SegmentationBucket[];
// }