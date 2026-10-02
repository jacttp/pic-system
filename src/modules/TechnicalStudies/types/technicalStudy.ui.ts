import type { SellerType } from './technicalStudy.types';

export interface CompetitorDraft {
   key: string;
   name: string;
   competitorId?: number;
   otherName?: string | null;
   excluded: boolean;
   estimatedMonthlyKgInput: string;
   sellerType: SellerType | '';
   sellerCountInput: string;
}
export interface FormDraft {
   responsableNombre: string;
   competitors: CompetitorDraft[];
}
export type FieldErrors = Record<string, string>;
export const sellerTypes: { value: SellerType; label: string }[] = [
   { value: 'BASE', label: 'Base' }, { value: 'PARCIAL', label: 'Parcial' },
   { value: 'APOYO', label: 'Apoyo' }, { value: 'LIDERES', label: 'Líderes' },
   { value: 'CELULAS', label: 'Células' },
];
