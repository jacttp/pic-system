import type { Competitor, SubmitFormPayload } from '../types/technicalStudy.types';
import { sellerTypes, type CompetitorDraft, type FieldErrors, type FormDraft } from '../types/technicalStudy.ui';

let nextKey = 0;
export function makeCompetitor(item?: Competitor): CompetitorDraft {
   return { key: `competitor-${++nextKey}`, name: item?.name || '',
      estimatedMonthlyKgInput: item?.estimatedMonthlyKg == null ? '' : String(item.estimatedMonthlyKg),
      sellerType: item?.sellerType || '', sellerCountInput: item?.sellerCount == null ? '' : String(item.sellerCount) };
}
export function makeDraft(answer?: SubmitFormPayload): FormDraft {
   return { responsableNombre: answer?.responsableNombre || '', competitors: (answer?.competitors || []).map(makeCompetitor) };
}
export function parseKg(input: string): number | null {
   const text = input.trim();
   if (!/^\d+(?:[.,]\d{1,2})?$/.test(text)) return null;
   const number = Number(text.replace(',', '.'));
   return Number.isFinite(number) && number <= 999999999.99 ? number : null;
}
export function parseCount(input: string): number | null {
   if (!/^\d+$/.test(input.trim())) return null;
   const number = Number(input.trim());
   return Number.isInteger(number) && number <= 2147483647 ? number : null;
}
export function nameErrors(draft: FormDraft): FieldErrors {
   const errors: FieldErrors = {};
   if (!draft.competitors.length || draft.competitors.length > 100) errors.competitors = 'Agrega entre 1 y 100 competidores.';
   const groups = new Map<string, CompetitorDraft[]>();
   for (const item of draft.competitors) {
      const name = item.name.trim();
      if (!name || name.length > 100) errors[`${item.key}-name`] = 'Escribe un nombre de 1 a 100 caracteres.';
      const normalized = name.toLocaleLowerCase('es-MX');
      groups.set(normalized, [...(groups.get(normalized) || []), item]);
   }
   for (const [name, items] of groups) if (name && items.length > 1) {
      for (const item of items) errors[`${item.key}-name`] = 'Este competidor ya está en la ficha.';
   }
   return errors;
}
export function competitorErrors(item: CompetitorDraft): FieldErrors {
   const errors: FieldErrors = {};
   if (parseKg(item.estimatedMonthlyKgInput) === null) errors[`${item.key}-kg`] = 'Ingresa kg entre 0 y 999999999.99, con hasta dos decimales.';
   if (!sellerTypes.some(type => type.value === item.sellerType)) errors[`${item.key}-type`] = 'Selecciona un tipo de vendedor.';
   if (parseCount(item.sellerCountInput) === null) errors[`${item.key}-count`] = 'Ingresa una cantidad entera entre 0 y 2147483647.';
   return errors;
}
export function responsibleErrors(draft: FormDraft): FieldErrors {
   const name = draft.responsableNombre.trim();
   return !name || name.length > 200 ? { responsable: 'Escribe el nombre del responsable (1 a 200 caracteres).' } : {};
}
export function validateDraft(draft: FormDraft): FieldErrors {
   return Object.assign({}, responsibleErrors(draft), nameErrors(draft), ...draft.competitors.map(competitorErrors));
}
export function toPayload(draft: FormDraft): SubmitFormPayload {
   if (Object.keys(validateDraft(draft)).length) throw new Error('La ficha contiene datos incompletos o inválidos.');
   return { responsableNombre: draft.responsableNombre.trim(), competitors: draft.competitors.map(item => ({
      name: item.name.trim(), estimatedMonthlyKg: parseKg(item.estimatedMonthlyKgInput),
      sellerType: item.sellerType, sellerCount: parseCount(item.sellerCountInput),
   })) };
}
export const hasCapture = (item: CompetitorDraft) => !!(item.estimatedMonthlyKgInput || item.sellerType || item.sellerCountInput);
export const draftSignature = (draft: FormDraft) => JSON.stringify({ responsableNombre: draft.responsableNombre, competitors: draft.competitors.map(({ key: _key, ...item }) => item) });
