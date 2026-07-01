export const ALLOWED_CHAINS = ['SORIANA', 'SAMS', 'CHEDRAUI', 'WALMART', 'CITYCLUB'] as const;

export type AllowedChain = typeof ALLOWED_CHAINS[number];

export const Z8_PERMISSION_OPTIONS = ['z8', 'z8carnes', 'NoResurtible', 'mix'] as const;

export type Z8Permission = typeof Z8_PERMISSION_OPTIONS[number];

export const DAY_OPTIONS = [
   { value: 1, label: 'Lunes' },
   { value: 2, label: 'Martes' },
   { value: 3, label: 'Miercoles' },
   { value: 4, label: 'Jueves' },
   { value: 5, label: 'Viernes' },
   { value: 6, label: 'Sabado' },
   { value: 7, label: 'Domingo' },
];

export function normalizeChain(value: string | null | undefined): AllowedChain {
   const chain = String(value || 'SORIANA').trim().toUpperCase();
   return ALLOWED_CHAINS.includes(chain as AllowedChain) ? chain as AllowedChain : 'SORIANA';
}

export function normalizeZ8Permission(value: string | null | undefined): Z8Permission {
   const permission = String(value || 'z8').trim().toLowerCase();
   if (permission === 'z8carnes') return 'z8carnes';
   if (permission === 'noresurtible') return 'NoResurtible';
   if (permission === 'mix') return 'mix';
   return 'z8';
}
