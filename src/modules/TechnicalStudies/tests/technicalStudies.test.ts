import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { createSSRApp, h } from 'vue';
import { renderToString } from '@vue/server-renderer';
import { useTechnicalForm } from '../composables/useTechnicalForm';
import { useTechnicalStudyStore } from '../stores/technicalStudyStore';
import { competitorLogo, makeCompetitor, parseCount, parseKg, toPayload, validateDraft, validOtherName } from '../utils/formDraft';
import { dateDeadline, formatDeadline, selectStorePage, validDeadline } from '../utils/technicalStudyUi';
import type { FormDetail, StoreSearchRow, StudyCompetitor, StudyDetail, StudyPage } from '../types/technicalStudy.types';
import TechnicalFormFields from '../components/TechnicalFormFields.vue';
import TechnicalFormReview from '../components/TechnicalFormReview.vue';
import CompetitorNamesEditor from '../components/CompetitorNamesEditor.vue';
import TechnicalFormView from '../views/TechnicalFormView.vue';
import TechnicalFormSteps from '../components/TechnicalFormSteps.vue';

const api = vi.hoisted(() => ({ listStudies: vi.fn(), getStudy: vi.fn(), getForm: vi.fn(), submitForm: vi.fn(), getCompetitors: vi.fn() }));
vi.mock('../services/technicalStudyApi', () => ({ technicalStudyApi: api }));

function deferred<T>() {
   let resolve!: (value: T) => void; let reject!: (reason: unknown) => void;
   const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
   return { promise, resolve, reject };
}
const answer = { responsableNombre: 'Ana', competitors: [
   { name: 'Corona', competitorId: 2, otherName: null, estimatedMonthlyKg: 0, sellerType: 'BASE' as const, sellerCount: 0 },
   { name: 'Marca A', competitorId: 12, otherName: null, estimatedMonthlyKg: 0, sellerType: 'BASE' as const, sellerCount: 0 },
] };
function ready() {
   const flow = useTechnicalForm(); flow.reset(answer); flow.setCatalog(catalog); flow.initializeCatalog();
   flow.draft.value.responsableNombre = 'Ana Rodríguez'; flow.next(); flow.next(); flow.next();
   return flow;
}
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
const catalog: StudyCompetitor[] = [
   { id: 2, name: 'Corona', logo: '/studies/competitors/corona.png', description: null, isOther: false },
   { id: 12, name: 'Marca A', logo: '/studies/competitors/a.webp', description: 'Referencia de captura', isOther: false },
   { id: 91, name: 'Otro', logo: null, description: null, isOther: true },
];

beforeEach(() => { vi.resetAllMocks(); setActivePinia(createPinia()); });
describe('Captura guiada y validación', () => {
   it('inicializa todas las marcas con Corona primero, BASE y entradas vacías sin ensuciar la captura', () => {
      const flow = useTechnicalForm(); flow.setCatalog([...catalog].reverse());
      expect(flow.initializeCatalog()).toBe(true);
      expect(flow.draft.value.competitors.map(item => item.competitorId)).toEqual([2, 12]);
      expect(flow.active.value?.name).toBe('Corona'); expect(flow.dirty.value).toBe(false);
      for (const item of flow.included.value) {
         expect(item.sellerType).toBe('BASE'); expect(item.estimatedMonthlyKgInput).toBe('');
         expect(item.sellerCountInput).toBe(''); expect(item.excluded).toBe(false);
      }
      expect(flow.completedCount.value).toBe(0); expect(flow.pendingCount.value).toBe(2);
      flow.draft.value.responsableNombre = 'Ana'; flow.next(); expect(flow.next()).toBe(false);
      expect(flow.errors.value[`${flow.activeKey.value}-kg`]).toBeTruthy();
   });
   it('conserva cambios previos a la carga y no reinicializa valores, claves ni exclusiones al reintentar', () => {
      const flow = useTechnicalForm(); flow.draft.value.responsableNombre = 'Ana'; flow.setCatalog(catalog);
      flow.initializeCatalog(); expect(flow.dirty.value).toBe(true);
      flow.select(flow.included.value[1]!.key); flow.active.value!.estimatedMonthlyKgInput = '25';
      const keys = flow.draft.value.competitors.map(item => item.key);
      flow.exclude(flow.activeKey.value);
      flow.setCatalog([...catalog, { id: 14, name: 'Nueva del catálogo', logo: null, description: null, isOther: false }]);
      flow.initializeCatalog();
      expect(flow.draft.value.competitors.map(item => item.key)).toEqual(keys);
      expect(flow.excluded.value[0]?.estimatedMonthlyKgInput).toBe('25'); expect(flow.draft.value.responsableNombre).toBe('Ana');
      flow.reset(); flow.initializeCatalog(); expect(flow.included.value).toHaveLength(3); expect(flow.dirty.value).toBe(false);
   });
   it('bloquea payload hasta tener el catálogo inicial completo con Corona', () => {
      const flow = useTechnicalForm(); flow.reset(answer);
      flow.setCatalog(catalog.filter(item => item.id !== 2)); expect(flow.initializeCatalog()).toBe(false);
      expect(flow.payload()).toBeNull(); expect(flow.errors.value.catalog).toBeTruthy();
      expect(flow.draft.value.responsableNombre).toBe('Ana');
      flow.setCatalog(catalog); expect(flow.initializeCatalog()).toBe(true); expect(flow.payload()).toBeTruthy();
   });
   it('no permite excluir Corona; conserva datos al excluir y restaurar la marca activa', () => {
      const flow = ready(); flow.go(2); expect(flow.exclude(flow.included.value[0]!.key)).toBe(false);
      const second = flow.included.value[1]!; const key = second.key;
      flow.select(key); second.estimatedMonthlyKgInput = '25,50'; second.sellerCountInput = '3';
      expect(flow.exclude(key)).toBe(true); expect(flow.step.value).toBe(3);
      expect(flow.isComplete(key)).toBe(false); expect(flow.completedCount.value).toBe(1);
      expect(flow.excluded.value).toHaveLength(1); expect(flow.pendingCount.value).toBe(0);
      flow.restore(key); expect(flow.step.value).toBe(2); expect(flow.active.value?.key).toBe(key);
      expect(flow.active.value?.estimatedMonthlyKgInput).toBe('25,50'); expect(flow.active.value?.sellerCountInput).toBe('3');
      expect(flow.excluded.value).toHaveLength(0); expect(flow.completedCount.value).toBe(2);
   });
   it('excluir la marca activa intermedia avanza a la siguiente incluida por identidad', () => {
      const flow = ready(); flow.add('Marca B'); flow.go(2);
      const second = flow.included.value[1]!; const last = flow.included.value[2]!;
      flow.select(second.key); flow.exclude(second.key);
      expect(flow.active.value?.key).toBe(last.key); expect(flow.activeIndex.value).toBe(1);
      flow.previous(); expect(flow.active.value?.competitorId).toBe(2);
   });
   it('omite marcas excluidas y campos locales del payload; cero sigue siendo una captura válida', () => {
      const flow = ready(); const second = flow.included.value[1]!;
      second.estimatedMonthlyKgInput = ''; second.sellerCountInput = ''; flow.exclude(second.key);
      const payload = flow.payload(); expect(payload?.competitors).toEqual([answer.competitors[0]]);
      expect(payload?.competitors[0]).not.toHaveProperty('key'); expect(payload?.competitors[0]).not.toHaveProperty('excluded');
      expect(validateDraft(flow.draft.value)).toEqual({});
      flow.draft.value.competitors[0]!.excluded = true; expect(flow.payload()).toBeNull();
      expect(flow.errors.value.competitors).toContain('Corona');
   });
   it('Otro es opcional, admite varios nombres y valida duplicados, nombres catalogados y controles', () => {
      for (const value of ['', '---', '<img src=x>', 'https://example.com', 'www.marca.com', 'Marca\nNueva']) expect(validOtherName(value)).toBe(false);
      expect(validOtherName('Competidor Ñ & Hijos')).toBe(true);
      const flow = ready(); expect(flow.payload()?.competitors).toHaveLength(2);
      for (const name of ['CORONA', 'Marca A', 'Marca\nNueva', '<img>', 'https://example.com']) expect(flow.add(name)).toBe(false);
      expect(flow.add(' Marca  nueva ')).toBe(true);
      const item = flow.active.value!; const key = item.key;
      expect(item.competitorId).toBe(91); expect(item.sellerType).toBe('BASE'); expect(flow.next()).toBe(false);
      item.estimatedMonthlyKgInput = '850,50'; item.sellerCountInput = '2';
      expect(flow.next()).toBe(true); expect(flow.step.value).toBe(3);
      expect(flow.payload()?.competitors[2]).toEqual({ name: 'Marca nueva', competitorId: 91, otherName: 'Marca nueva', estimatedMonthlyKg: 850.5, sellerType: 'BASE', sellerCount: 2 });
      flow.go(2); flow.select(key); item.name = 'MARCA A'; expect(flow.next()).toBe(false); expect(flow.errors.value[`${key}-name`]).toBeTruthy();
      item.name = 'Marca nueva'; flow.exclude(key); expect(flow.add('MARCA NUEVA')).toBe(false);
      flow.restore(key); expect(flow.active.value?.key).toBe(key); expect(flow.add('Marca B')).toBe(true);
   });
   it('distingue vacío de cero y normaliza coma decimal sin aceptar miles', () => {
      expect(parseKg('')).toBeNull(); expect(parseCount('')).toBeNull();
      expect(parseKg('0')).toBe(0); expect(parseCount('0')).toBe(0);
      expect(parseKg('850,50')).toBe(850.5); expect(parseKg('850.50')).toBe(850.5);
      for (const value of ['1,000', '1.000', '1,234.56', '-1', '1e3', 'Infinity', '1000000000', '0.001']) expect(parseKg(value)).toBeNull();
      for (const value of ['2.5', '-1', '2147483648', '1e3']) expect(parseCount(value)).toBeNull();
      expect(parseKg('999999999.99')).toBe(999999999.99); expect(parseCount('2147483647')).toBe(2147483647);
   });
   it('limita a 100 entradas y vuelve al primer error desde revisión sin perder valores', () => {
      const flow = ready(); flow.go(2); const key = flow.activeKey.value;
      flow.active.value!.sellerCountInput = '2.5'; flow.go(3); expect(flow.payload()).toBeNull();
      expect(flow.step.value).toBe(2); expect(flow.activeKey.value).toBe(key);
      flow.active.value!.sellerCountInput = '3'; flow.draft.value.responsableNombre = ' '; expect(flow.payload()).toBeNull(); expect(flow.step.value).toBe(1);
      while (flow.draft.value.competitors.length < 100) expect(flow.add(`Otra ${flow.draft.value.competitors.length}`)).toBe(true);
      expect(flow.add('Marca 101')).toBe(false);
   });
   it('navega tres pasos y conserva datos al retroceder', () => {
      const flow = ready(); expect(flow.step.value).toBe(3); flow.go(4); expect(flow.step.value).toBe(3);
      flow.previous(); expect(flow.step.value).toBe(2); expect(flow.active.value?.name).toBe('Marca A');
      flow.previous(); expect(flow.active.value?.name).toBe('Corona'); flow.previous(); expect(flow.step.value).toBe(1);
      flow.next(); expect(flow.step.value).toBe(2); expect(flow.active.value?.estimatedMonthlyKgInput).toBe('0');
      flow.next(); flow.next(); expect(flow.step.value).toBe(3);
   });
   it('advierte por cambios y bloquea exclusiones, restauraciones y envíos duplicados durante la solicitud', async () => {
      const fresh = useTechnicalForm(); fresh.setCatalog(catalog); fresh.initializeCatalog(); const confirm = vi.fn(() => false);
      expect(fresh.mayLeave(confirm)).toBe(true); expect(confirm).not.toHaveBeenCalled();
      fresh.exclude(fresh.included.value[1]!.key); expect(fresh.mayLeave(confirm)).toBe(false);
      confirm.mockReturnValue(true); expect(fresh.mayLeave(confirm)).toBe(true);
      const flow = ready(); const secondKey = flow.included.value[1]!.key; flow.exclude(secondKey);
      const pending = deferred<void>(); const submit = vi.fn(() => pending.promise); const refresh = vi.fn();
      const sending = flow.send(submit, refresh); expect(flow.busy.value).toBe(true);
      flow.restore(secondKey); flow.previous(); expect(flow.excluded.value).toHaveLength(1); expect(flow.step.value).toBe(3);
      expect(flow.add('Marca B')).toBe(false); expect(flow.mayLeave(confirm)).toBe(false);
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
   it('reintenta el catálogo sin borrar captura ni estado de la ficha y descarta respuestas obsoletas', async () => {
      const flow = ready(); const original = flow.draft.value.competitors[0]!.key;
      const store = useTechnicalStudyStore(); store.selectedForm = form(2);
      api.getCompetitors.mockRejectedValueOnce(new Error('Network')).mockResolvedValueOnce(catalog);
      expect(await store.loadCatalog()).toBeNull(); expect(store.catalogError).toBeTruthy();
      expect(store.selectedForm?.id).toBe(2); expect(flow.draft.value.competitors[0]!.key).toBe(original);
      await store.loadCatalog(); expect(store.catalogError).toBe(''); expect(store.competitorCatalog).toEqual(catalog);
      const old = deferred<StudyCompetitor[]>(); const latest = deferred<StudyCompetitor[]>();
      api.getCompetitors.mockReturnValueOnce(old.promise).mockReturnValueOnce(latest.promise);
      const one = store.loadCatalog(); const two = store.loadCatalog(); latest.resolve(catalog); await two;
      old.reject(new Error('old')); await one; expect(store.catalogError).toBe(''); expect(store.loadingCatalog).toBe(false);
   });
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
describe('Presentación del recorrido', () => {
   it('compila la vista con tres pasos y ofrece Otro sin selector de catálogo', async () => {
      expect(TechnicalFormView).toBeTruthy(); const flow = ready();
      const steps = await renderToString(createSSRApp({ render: () => h(TechnicalFormSteps, { step: 2, reached: 3 }) }));
      expect(steps).toContain('Paso 2 de 3'); expect(steps).toContain('Captura de marcas'); expect(steps).not.toContain('de 4');
      const html = await renderToString(createSSRApp({ render: () => h(CompetitorNamesEditor, { draft: flow.draft.value, catalog }) }));
      expect(html).toContain('Agregar otra marca'); expect(html).not.toContain('<select');
   });
   it('muestra la guía completa con ampliación, descripción escapada y rutas de imagen seguras', async () => {
      expect(competitorLogo('/studies/competitors/a.webp')).toBe('/studies/competitors/a.webp');
      for (const value of ['javascript:alert(1)', 'http://example.com/a.png', '/studies/competitors/../a.png', '/studies/competitors/%2e%2e/a.png']) expect(competitorLogo(value)).toBeNull();
      const entry = catalog.find(item => item.id === 12)!;
      const html = await renderToString(createSSRApp({ render: () => h(TechnicalFormFields, {
         modelValue: makeCompetitor(answer.competitors[1]), errors: {}, competitor: { ...entry, description: '<script>Texto</script>' },
      }) }));
      expect(html).toContain('alt="Marcas y productos de Marca A"'); expect(html).toContain('ts-brand-reference'); expect(html).toContain('Ampliar referencia');
      expect(html).toContain('&lt;script&gt;Texto&lt;/script&gt;'); expect(html).not.toContain('<script>Texto');
      const fallback = await renderToString(createSSRApp({ render: () => h(TechnicalFormFields, { modelValue: makeCompetitor(answer.competitors[0]), errors: {}, competitor: { ...catalog[0]!, logo: null } }) }));
      expect(fallback).toContain('Referencia visual no disponible'); expect(fallback).not.toContain('Ampliar referencia');
   });
   it('presenta un tipo y una cantidad por marca con errores accesibles', async () => {
      const item = makeCompetitor(answer.competitors[0]);
      const html = await renderToString(createSSRApp({ render: () => h(TechnicalFormFields, { modelValue: item, errors: { [`${item.key}-kg`]: 'Valor inválido' } }) }));
      expect(html.match(/<select/g)).toHaveLength(1); expect(html.match(/<input/g)).toHaveLength(2);
      expect(html).toContain('inputmode="decimal"'); expect(html).toContain('aria-invalid="true"'); expect(html).toContain('Valor inválido');
   });
   it('separa marcas excluidas en revisión y no las reconstruye en fichas históricas de lectura', async () => {
      const flow = ready(); flow.exclude(flow.included.value[1]!.key);
      const review = await renderToString(createSSRApp({ render: () => h(TechnicalFormReview, { draft: flow.draft.value, elaborator: null, editable: true }) }));
      expect(review).toContain('No se venden en esta tienda'); expect(review).toContain('Restaurar Marca A'); expect(review).toContain('Corona');
      const historical = { responsableNombre: 'Ana Rodríguez', competitors: [makeCompetitor(answer.competitors[1])] };
      const html = await renderToString(createSSRApp({ render: () => h(TechnicalFormReview, { draft: historical, elaborator: null }) }));
      expect(html).toContain('Ana Rodríguez'); expect(html).toContain('Marca A'); expect(html).not.toContain('Corona');
      expect(html).not.toContain('<input'); expect(html).not.toContain('Editar responsable'); expect(html).not.toContain('No se venden');
   });
});

