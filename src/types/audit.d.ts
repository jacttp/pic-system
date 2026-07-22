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

export interface CpfrExcelExportAuditDetail {
    tipo: 'CPFR_EXCEL_FINAL';
    fecha_descarga: string;
    archivo: string;
    cadena: string;
    pestaña: 'aprobada';
    estado_incluido: 'aprobado';
    transicion_estado: {
        destino: 'enviado';
        exitosa: boolean;
        ocs_solicitadas: number;
        error: string | null;
    };
    dias: Array<{ numero: number; nombre: string }>;
    semanas: string[];
    resumen: { tiendas: number; ocs: number; skus: number; piezas: number; kilogramos: number };
    ocs: Array<{
        numero: string;
        tienda: { id: string; nombre: string };
        dia: number;
        semana: string | null;
        anio: number | null;
        skus: number;
        piezas: number;
        kilogramos: number;
    }>;
}
