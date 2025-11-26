/* src/types/audit.d.ts */
export interface AuditLog {
    id: number;
    Nombre_Reporte: string; // Acción
    Numero_empleado: string; // Usuario
    Fecha_Registro: string;
    Detalles?: string;
}

export interface AuditResponse {
    success: boolean;
    data: AuditLog[];
    count: number;
}