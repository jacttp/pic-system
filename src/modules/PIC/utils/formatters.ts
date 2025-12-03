/* src/modules/PIC/utils/formatters.ts */

/**
 * Formatea un número como moneda (Pesos MXN).
 * Ej: 12500.50 -> $12,500.50
 */
export const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value);
};

/**
 * Formatea un número con separadores de miles (para Kilos).
 * Ej: 45000 -> 45,000
 */
export const formatNumber = (value: number) => {
    return new Intl.NumberFormat('es-MX', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    }).format(value);
};