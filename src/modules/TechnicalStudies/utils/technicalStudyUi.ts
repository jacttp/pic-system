import type { FormStatus, StoreSearchRow } from '../types/technicalStudy.types';

const zone = 'America/Mexico_City';
export const formStatuses: { value: FormStatus; label: string }[] = [
   { value: 'PENDING', label: 'Pendiente' }, { value: 'SUBMITTED', label: 'Enviada' },
   { value: 'EXPIRED', label: 'Vencida' }, { value: 'PAUSED', label: 'Pausada' },
];
export const statusLabel = (status: string) => formStatuses.find(item => item.value === status)?.label
   || (status === 'ACTIVE' ? 'Activo' : status === 'PAUSED' ? 'Pausado' : status);
const statusTones: Record<string, string> = { PENDING: 'info', SUBMITTED: 'success', EXPIRED: 'warning', PAUSED: 'neutral', ACTIVE: 'success' };
export const statusTone = (status: string) => statusTones[status] || 'neutral';
export function formatDeadline(value: string) {
   const date = new Date(new Date(value).getTime() - 1000);
   return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('es-MX', { timeZone: zone });
}
export function formatInstant(value: string | null) {
   return value ? new Date(value).toLocaleString('es-MX', { timeZone: zone, dateStyle: 'medium', timeStyle: 'short' }) : '—';
}
export function localDate(value = new Date()) {
   const parts = new Intl.DateTimeFormat('en-US', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(value);
   const part = (type: string) => parts.find(item => item.type === type)?.value;
   return `${part('year')}-${part('month')}-${part('day')}`;
}
export function dateDeadline(value: string): number {
   if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return NaN;
   const [year, month, day] = value.split('-').map(Number);
   const date = new Date(Date.UTC(year!, month! - 1, day!));
   if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month! - 1 || date.getUTCDate() !== day) return NaN;
   // The contract ends at the next local midnight in Mexico City (UTC-6).
   return date.getTime() + 30 * 60 * 60 * 1000;
}
export function validDeadline(value: string, previous?: string, now = Date.now()) {
   const deadline = dateDeadline(value);
   return Number.isFinite(deadline) && deadline > now && (!previous || deadline > new Date(previous).getTime());
}
export const progress = (submitted: number, total: number) => total ? Math.round(submitted / total * 100) : 0;
export function errorMessage(reason: unknown, fallback = 'No fue posible completar la operación.') {
   return (reason as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;
}
export const httpStatus = (reason: unknown) => (reason as { response?: { status?: number } })?.response?.status;
export function selectStorePage(selected: StoreSearchRow[], rows: StoreSearchRow[], checked: boolean) {
   const pageIds = new Set(rows.map(row => row.IDCLIENTE));
   if (!checked) return selected.filter(row => !pageIds.has(row.IDCLIENTE));
   const result = new Map(selected.map(row => [row.IDCLIENTE, row]));
   for (const row of rows) if (result.size < 200) result.set(row.IDCLIENTE, row);
   return [...result.values()];
}
