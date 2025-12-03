/**
 * src/utils/formatters.ts
 * Funciones puras para dar formato a datos numéricos.
 */

/**
 * Formatea un número como moneda (MXN).
 * Ej: 12500.5 -> "$12,500.50"
 */
export const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('es-MX', { 
        style: 'currency', 
        currency: 'MXN' 
    }).format(value);
};

/**
 * Formatea un número con separadores de miles y decimales.
 * Ej: 1500.123 -> "1,500.123"
 */
export const formatNumber = (value: number): string => {
    return new Intl.NumberFormat('es-MX', {
        maximumFractionDigits: 3
    }).format(value);
};