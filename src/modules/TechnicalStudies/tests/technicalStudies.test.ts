import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { createSSRApp, h } from 'vue';
import { renderToString } from '@vue/server-renderer';
import { useTechnicalForm } from '../composables/useTechnicalForm';
import { useTechnicalStudyStore } from '../stores/technicalStudyStore';
import { makeCompetitor, parseCount, parseKg, toPayload, validateDraft } from '../utils/formDraft';
import { dateDeadline, formatDeadline, selectStorePage, validDeadline } from '../utils/technicalStudyUi';
import type { FormDetail, StoreSearchRow, StudyDetail, StudyPage } from '../types/technicalStudy.types';
import TechnicalFormFields from '../components/TechnicalFormFields.vue';
import TechnicalFormReview from '../components/TechnicalFormReview.vue';

const api = vi.hoisted(() => ({ listStudies: vi.fn(), getStudy: vi.fn(), getForm: vi.fn(), submitForm: vi.fn() }));
vi.mock('../services/technicalStudyApi', () => ({ technicalStudyApi: api }));

function deferred<T>() {
   let resolve!: (value: T) => void; let reject!: (reason: unknown) => void;
   const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
   return { promise, resolve, reject };
}
const answer = { responsableNombre: 'Ana', competitors: [{ name: 'Marca A', estimatedMonthlyKg: 0, sellerType: 'BASE' as const, sellerCount: 0 }] };
function ready() { const flow = useTechnicalForm(); flow.reset(answer); flow.draft.value.responsableNombre = 'Ana Rodríguez'; flow.next(); flow.next(); flow.next(); return flow; }
function form(id: number, studyId = 1): FormDetail {
   return { id, studyId, clientId: '1497s1154', storeName: 'Tienda A', chain: null, management: null, leadership: null,
      status: 'PENDING', submittedAt: null, elaboratorName: null, studyName: 'Estudio', studyStatus: 'ACTIVE',
      deadlineAt: '2026-10-31T06:00:00.000Z', canSubmit: true,
      store: { clientId: '1497s1154', name: 'Tienda A', chain: null, channel: null, management: null, leadership: null, zone: null, route: null },
      elaborator: null, currentElaborator: null, responsableNombre: null, competitors: [] };
}
const page = (number: number): StudyPage => ({ page: number, limit: 20, total: 0, data: [] });
const study = (id: number): StudyDetail => ({ id, name: `Estudio ${id}`, status: 'ACTIVE', deadlineAt: '2026-10-31T06:00:00.000Z', createdAt: '', createdByUserId: 1, forms: [] });
const storeRow = (id: string): StoreSearchRow => ({ IDCLIENTE: id, NOM_CLIENTE: `Tienda ${id}`, Cadena: 'Cadena' });

beforeEach(() => { vi.resetAllMocks(); setActivePinia(createPinia()); });
describe('Captura y validación', () => {
   it('distingue vacío de cero y normaliza coma decimal sin aceptar miles', () => {
      expect(parseKg('')).toBeNull(); expect(parseCount('')).toBeNull();
      expect(parseKg('0')).toBe(0); expect(parseCount('0')).toBe(0);
      expect(parseKg('850,50')).toBe(850.5); expect(parseKg('850.50')).toBe(850.5);
      for (const value of ['1,000', '1.000', '1,234.56', '-1', '1e3', 'Infinity', '1000000000', '0.001']) expect(parseKg(value)).toBeNull();
      for (const value of ['2.5', '-1', '2147483648', '1e3']) expect(parseCount(value)).toBeNull();
      expect(parseKg('999999999.99')).toBe(999999999.99); expect(parseCount('2147483647')).toBe(2147483647);
   });
   it('detecta duplicados en ambas filas y no envía claves de UI', () => {
      const flow = ready(); flow.draft.value.competitors[0]!.estimatedMonthlyKgInput = '12,50';
      expect(toPayload(flow.draft.value)).toEqual({ responsableNombre: 'Ana Rodríguez', competitors: [{ name: 'Marca A', estimatedMonthlyKg: 12.5, sellerType: 'BASE', sellerCount: 0 }] });
      const duplicate = makeCompetitor(answer.competitors[0]); duplicate.name = ' marca a ';
      flow.draft.value.competitors.push(duplicate);
      const errors = validateDraft(flow.draft.value);
      expect(errors[`${duplicate.key}-name`]).toBeTruthy(); expect(errors[`${flow.draft.value.competitors[0]!.key}-name`]).toBeTruthy();
      expect(() => toPayload(flow.draft.value)).toThrow();
   });
   it('mantiene valores entre pasos y reajusta la captura por clave al eliminar', () => {
      const flow = ready(); flow.go(2); expect(flow.add('Marca B')).toBe(true);
      const second = flow.draft.value.competitors[1]!; second.estimatedMonthlyKgInput = '25';
      flow.go(3); flow.select(second.key); flow.remove(flow.draft.value.competitors[0]!.key);
      expect(flow.active.value?.key).toBe(second.key); expect(flow.active.value?.estimatedMonthlyKgInput).toBe('25');
      flow.previous(); flow.next(); expect(flow.active.value?.estimatedMonthlyKgInput).toBe('25');
      expect(flow.next()).toBe(false); expect(flow.errors.value[`${second.key}-count`]).toBeTruthy();
      flow.remove(second.key); expect(flow.active.value).toBeUndefined(); expect(flow.payload()).toBeNull(); expect(flow.step.value).toBe(2);
   });
   it('revalida pasos alcanzados y dirige al primer competidor incompleto', () => {
      const flow = ready(); flow.go(2); flow.add('Marca B'); flow.go(4);
      expect(flow.payload()).toBeNull(); expect(flow.step.value).toBe(3); expect(flow.active.value?.name).toBe('Marca B');
      flow.draft.value.responsableNombre = ' '; expect(flow.payload()).toBeNull(); expect(flow.step.value).toBe(1);
   });
   it('advierte solo con cambios pendientes e impide salir durante envío', () => {
      const flow = useTechnicalForm(); const confirm = vi.fn(() => false);
      expect(flow.mayLeave(confirm)).toBe(true); expect(confirm).not.toHaveBeenCalled();
      flow.draft.value.responsableNombre = 'Ana'; expect(flow.mayLeave(confirm)).toBe(false);
      confirm.mockReturnValue(true); expect(flow.mayLeave(confirm)).toBe(true);
      flow.busy.value = true; expect(flow.mayLeave(confirm)).toBe(false);
      flow.busy.value = false; flow.accept(); expect(flow.dirty.value).toBe(false);
   });
   it('bloquea envíos duplicados y acepta el estado solo tras éxito', async () => {
      const flow = ready(); const pending = deferred<void>(); const submit = vi.fn(() => pending.promise); const refresh = vi.fn();
      const sending = flow.send(submit, refresh); expect(flow.busy.value).toBe(true);
      flow.remove(flow.activeKey.value); flow.previous(); expect(flow.draft.value.competitors).toHaveLength(1); expect(flow.step.value).toBe(4);
      expect(await flow.send(submit, refresh)).toBe(false); expect(submit).toHaveBeenCalledTimes(1);
      pending.resolve(); expect(await sending).toBe(true); expect(flow.dirty.value).toBe(false); expect(flow.busy.value).toBe(false);
   });
   it('conserva datos ante fallo de red y permite reintentar', async () => {
      const flow = ready(); const submit = vi.fn().mockRejectedValueOnce(new Error('Network')).mockResolvedValueOnce({}); const refresh = vi.fn();
      expect(await flow.send(submit, refresh)).toBe(false); expect(flow.dirty.value).toBe(true); expect(flow.draft.value.responsableNombre).toBe('Ana Rodríguez'); expect(refresh).not.toHaveBeenCalled();
      expect(await flow.send(submit, refresh)).toBe(true); expect(flow.dirty.value).toBe(false);
   });
   it('actualiza estado por HTTP 409 aunque el mensaje no contenga frases conocidas', async () => {
      const flow = ready(); const refresh = vi.fn().mockResolvedValue(true);
      await flow.send(vi.fn().mockRejectedValue({ response: { status: 409, data: { message: 'Conflicto' } } }), refresh);
      expect(refresh).toHaveBeenCalledOnce(); expect(flow.submissionError.value).toBe('Conflicto'); expect(flow.dirty.value).toBe(false);
   });
   it('retiene la captura si no se logra consultar el estado tras un conflicto', async () => {
      const flow = ready(); await flow.send(vi.fn().mockRejectedValue({ response: { status: 409 } }), vi.fn().mockRejectedValue(new Error('Network')));
      expect(flow.dirty.value).toBe(true); expect(flow.submissionError.value).toContain('No se pudo actualizar');
   });
});
describe('Selección y fechas', () => {
   it('conserva tiendas de otras páginas, elimina solo esta página y limita a 200', () => {
      const original = [storeRow('A')]; const selected = selectStorePage(original, [storeRow('B'), storeRow('C'), storeRow('A')], true);
      expect(selected.map(row => row.IDCLIENTE)).toEqual(['A', 'B', 'C']);
      expect(selectStorePage(selected, [storeRow('B'), storeRow('C')], false)).toEqual(original);
      const many = Array.from({ length: 199 }, (_, i) => storeRow(String(i)));
      expect(selectStorePage(many, [storeRow('200'), storeRow('201')], true)).toHaveLength(200);
   });
   it('incluye el día completo en Ciudad de México y exige una ampliación posterior', () => {
      const deadline = dateDeadline('2026-10-30'); expect(new Date(deadline).toISOString()).toBe('2026-10-31T06:00:00.000Z');
      expect(formatDeadline(new Date(deadline).toISOString())).toBe('30/10/2026');
      expect(validDeadline('2026-10-30', undefined, deadline - 1)).toBe(true);
      expect(validDeadline('2026-10-30', undefined, deadline)).toBe(false);
      expect(validDeadline('2026-10-30', new Date(deadline).toISOString(), deadline - 1)).toBe(false);
      expect(validDeadline('2026-10-31', new Date(deadline).toISOString(), deadline - 1)).toBe(true);
      expect(dateDeadline('2026-02-30')).toBeNaN();
   });
});
describe('Solicitudes remotas', () => {
   it('descarta listados obsoletos incluso si fallan después de la solicitud vigente', async () => {
      const old = deferred<StudyPage>(); const latest = deferred<StudyPage>();
      api.listStudies.mockReturnValueOnce(old.promise).mockReturnValueOnce(latest.promise);
      const store = useTechnicalStudyStore(); const one = store.list({ page: 1 }); const two = store.list({ page: 2 });
      latest.resolve(page(2)); await two; old.reject(new Error('old')); expect(await one).toBeNull();
      expect(store.studies.page).toBe(2); expect(store.loadingStudies).toBe(false); expect(store.error).toBeNull();
   });
   it('separa cargas y no muestra fichas ni estudios de otra selección', async () => {
      const first = deferred<FormDetail>(); const second = deferred<FormDetail>(); const detail = deferred<StudyDetail>();
      api.getForm.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise); api.getStudy.mockReturnValueOnce(detail.promise);
      const store = useTechnicalStudyStore(); const one = store.loadForm(1, 1); const loadingStudy = store.loadStudy(3); const two = store.loadForm(1, 2);
      first.resolve(form(1)); expect(await one).toBeNull(); expect(store.selectedForm).toBeNull(); expect(store.loadingForm).toBe(true);
      second.resolve(form(2)); await two; expect(store.selectedForm?.id).toBe(2); expect(store.loadingStudy).toBe(true);
      detail.resolve(study(3)); await loadingStudy; expect(store.loading).toBe(false);
      const oldStudy = deferred<StudyDetail>(); const newStudy = deferred<StudyDetail>(); api.getStudy.mockReturnValueOnce(oldStudy.promise).mockReturnValueOnce(newStudy.promise);
      const a = store.loadStudy(1); const b = store.loadStudy(2); newStudy.resolve(study(2)); await b; oldStudy.resolve(study(1)); await a;
      expect(store.selectedStudy?.id).toBe(2);
   });
});
describe('Presentación del contrato', () => {
   it('presenta un tipo y una cantidad por competidor con errores accesibles', async () => {
      const item = makeCompetitor(answer.competitors[0]);
      const html = await renderToString(createSSRApp({ render: () => h(TechnicalFormFields, { modelValue: item, errors: { [`${item.key}-kg`]: 'Valor inválido' } }) }));
      expect(html.match(/<select/g)).toHaveLength(1); expect(html.match(/<input/g)).toHaveLength(2);
      expect(html).toContain('inputmode="decimal"'); expect(html).toContain('aria-invalid="true"'); expect(html).toContain('Valor inválido');
   });
   it('ofrece revisión de lectura sin inputs ni acciones de edición', async () => {
      const flow = ready();
      const html = await renderToString(createSSRApp({ render: () => h(TechnicalFormReview, { draft: flow.draft.value, elaborator: null }) }));
      expect(html).toContain('Ana Rodríguez'); expect(html).toContain('Marca A'); expect(html).not.toContain('<input'); expect(html).not.toContain('Editar responsable');
   });
});
