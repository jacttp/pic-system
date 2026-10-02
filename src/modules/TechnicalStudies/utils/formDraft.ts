import type { Competitor, StudyCompetitor, SubmitFormPayload } from '../types/technicalStudy.types';
import { sellerTypes, type CompetitorDraft, type FieldErrors, type FormDraft } from '../types/technicalStudy.ui';

let nextKey = 0;
export function makeCompetitor(item?: Competitor): CompetitorDraft {
   return { key: `competitor-${++nextKey}`, name: item?.name || '',
      ...(item?.competitorId !== undefined ? { competitorId: item.competitorId, otherName: item.otherName ?? null } : {}),
      estimatedMonthlyKgInput: item?.estimatedMonthlyKg == null ? '' : String(item.estimatedMonthlyKg),
      sellerType: item?.sellerType ?? 'BASE', sellerCountInput: item?.sellerCount == null ? '' : String(item.sellerCount) };
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
export function normalizeCompetitorName(value: string): string { return value.trim().replace(/\s+/gu, ' '); }
export function validOtherName(value: string): boolean {
   const name = normalizeCompetitorName(value);
   return !!name && name.length <= 100 && /[\p{L}\p{N}]/u.test(name)
      && !/[\p{Cc}\p{Cf}<>]/u.test(value) && !/(?:[a-z][a-z\d+.-]*:\/\/|\b(?:https?|ftp|data|javascript|mailto):|\bwww\.)/iu.test(value);
}
export function catalogNameError(name: string, catalog: StudyCompetitor[]): string {
   if (!validOtherName(name)) return 'Escribe un nombre de 1 a 100 caracteres, sin HTML ni URLs.';
   if (catalog.some(item => normalizeCompetitorName(item.name).toLocaleLowerCase('es-MX') === normalizeCompetitorName(name).toLocaleLowerCase('es-MX'))) return 'Este nombre ya está en la lista. Selecciona su registro.';
   return '';
}
export function competitorLogo(logo: string | null | undefined): string | null {
   if (!logo) return null;
   if (/^\/studies\/competitors\/[\w./%-]+$/.test(logo) && !/%(?:2e|2f|5c)/i.test(logo)
      && !logo.split('/').some(part => part === '.' || part === '..')) return logo;
   try { const url = new URL(logo); return url.protocol === 'https:' && !url.username && !url.password ? url.href : null; }
   catch { return null; }
}
export function nameErrors(draft: FormDraft): FieldErrors {
   const errors: FieldErrors = {};
   if (!draft.competitors.length || draft.competitors.length > 100) errors.competitors = 'Agrega entre 1 y 100 competidores.';
   const groups = new Map<string, CompetitorDraft[]>();
   for (const item of draft.competitors) {
      const name = normalizeCompetitorName(item.name);
      if (!name || name.length > 100) errors[`${item.key}-name`] = 'Escribe un nombre de 1 a 100 caracteres.';
      if (item.otherName != null && !validOtherName(item.name)) errors[`${item.key}-name`] = 'Escribe un nombre de 1 a 100 caracteres, sin HTML ni URLs.';
      const normalized = name.toLocaleLowerCase('es-MX');
      groups.set(normalized, [...(groups.get(normalized) || []), item]);
   }
   for (const [name, items] of groups) if (name && items.length > 1) {
      for (const item of items) errors[`${item.key}-name`] = 'Este competidor ya está en la ficha.';
   }
   const ids = new Map<number, CompetitorDraft[]>();
   for (const item of draft.competitors) if (item.competitorId !== undefined && item.otherName == null) {
      ids.set(item.competitorId, [...(ids.get(item.competitorId) || []), item]);
   }
   for (const items of ids.values()) if (items.length > 1) for (const item of items) errors[`${item.key}-name`] = 'Este competidor ya está en la ficha.';
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
      name: normalizeCompetitorName(item.name), estimatedMonthlyKg: parseKg(item.estimatedMonthlyKgInput),
      sellerType: item.sellerType, sellerCount: parseCount(item.sellerCountInput),
      ...(item.competitorId !== undefined ? { competitorId: item.competitorId,
         otherName: item.otherName != null ? normalizeCompetitorName(item.name) : null } : {}),
   })) };
}
export const hasCapture = (item: CompetitorDraft) => !!(item.estimatedMonthlyKgInput || item.sellerCountInput || (item.sellerType && item.sellerType !== 'BASE'));
export const draftSignature = (draft: FormDraft) => JSON.stringify({ responsableNombre: draft.responsableNombre, competitors: draft.competitors.map(({ key: _key, ...item }) => item) });
