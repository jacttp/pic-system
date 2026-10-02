import { computed, ref } from 'vue';
import type { Competitor, StudyCompetitor, SubmitFormPayload } from '../types/technicalStudy.types';
import type { FieldErrors, FormDraft } from '../types/technicalStudy.ui';
import { catalogNameError, competitorErrors, draftSignature, makeCompetitor, makeDraft, nameErrors, normalizeCompetitorName, responsibleErrors, toPayload, validateDraft } from '../utils/formDraft';
import { errorMessage, httpStatus } from '../utils/technicalStudyUi';

const CORONA_ID = 2;
export function useTechnicalForm() {
   const draft = ref(makeDraft());
   const baseline = ref(makeDraft());
   const step = ref(1);
   const reachedStep = ref(1);
   const activeKey = ref('');
   const errors = ref<FieldErrors>({});
   const busy = ref(false);
   const submissionError = ref('');
   const catalog = ref<StudyCompetitor[]>([]);
   const catalogInitialized = ref(false);
   const included = computed(() => draft.value.competitors.filter(item => !item.excluded));
   const excluded = computed(() => draft.value.competitors.filter(item => item.excluded));
   const active = computed(() => included.value.find(item => item.key === activeKey.value));
   const activeIndex = computed(() => included.value.findIndex(item => item.key === activeKey.value));
   const dirty = computed(() => draftSignature(draft.value) !== draftSignature(baseline.value));

   function setCatalog(items: StudyCompetitor[]) { catalog.value = items; }
   function initializeCatalog() {
      if (catalogInitialized.value || busy.value) return catalogInitialized.value;
      const brands = catalog.value.filter(item => !item.isOther).sort((a, b) =>
         a.id === CORONA_ID ? -1 : b.id === CORONA_ID ? 1 : a.name.localeCompare(b.name, 'es-MX'));
      if (!brands.some(item => item.id === CORONA_ID) || brands.length > 100) return false;
      function populate(source: FormDraft): FormDraft {
         return { ...source, competitors: [
            ...brands.map(entry => source.competitors.find(item => item.competitorId === entry.id && item.otherName == null)
               || makeCompetitor({ name: entry.name, competitorId: entry.id, otherName: null,
                  estimatedMonthlyKg: null, sellerType: 'BASE', sellerCount: null })),
            ...source.competitors.filter(item => !brands.some(entry => entry.id === item.competitorId) || item.otherName != null),
         ] };
      }
      draft.value = populate(draft.value);
      // Automatic catalog rows must not accept edits typed while the request was loading.
      baseline.value = populate(baseline.value);
      catalogInitialized.value = true;
      activeKey.value = included.value[0]?.key || '';
      return true;
   }
   function names() {
      const issues = nameErrors(draft.value);
      for (const item of included.value) if (item.otherName != null) {
         const error = catalogNameError(item.name, catalog.value);
         if (error) issues[`${item.key}-name`] = error;
      }
      return issues;
   }
   function validate() {
      const issues = { ...validateDraft(draft.value), ...names() };
      if (!catalogInitialized.value) issues.catalog = 'Espera a que se cargue la lista completa de marcas, incluida Corona.';
      if (!included.value.some(item => item.competitorId === CORONA_ID && item.otherName == null)) issues.competitors = 'Corona es obligatoria en la ficha.';
      return issues;
   }
   function isComplete(key: string) {
      const item = included.value.find(row => row.key === key);
      return !!item && !names()[`${key}-name`] && !Object.keys(competitorErrors(item)).length;
   }
   const completedCount = computed(() => included.value.filter(item => isComplete(item.key)).length);
   const pendingCount = computed(() => included.value.length - completedCount.value);
   function reset(answer?: SubmitFormPayload) {
      draft.value = makeDraft(answer);
      baseline.value = { responsableNombre: draft.value.responsableNombre, competitors: draft.value.competitors.map(item => ({ ...item })) };
      catalogInitialized.value = false;
      step.value = reachedStep.value = 1;
      activeKey.value = included.value[0]?.key || ''; errors.value = {}; submissionError.value = '';
   }
   function accept() { baseline.value = { responsableNombre: draft.value.responsableNombre, competitors: draft.value.competitors.map(item => ({ ...item })) }; }
   function go(target: number) {
      if (busy.value || target < 1 || target > 3 || target > reachedStep.value) return;
      step.value = target; errors.value = {};
   }
   function add(value: string | Competitor) {
      if (busy.value || !catalogInitialized.value || draft.value.competitors.length >= 100) return false;
      const other = catalog.value.find(item => item.isOther);
      if (!other) return false;
      const rawName = typeof value === 'string' ? value : value.name;
      const name = normalizeCompetitorName(rawName);
      if (catalogNameError(rawName, catalog.value)) return false;
      const item = makeCompetitor({ ...(typeof value === 'string' ? {} : value), name, competitorId: other.id, otherName: name,
         estimatedMonthlyKg: typeof value === 'string' ? null : value.estimatedMonthlyKg,
         sellerType: typeof value === 'string' ? 'BASE' : value.sellerType,
         sellerCount: typeof value === 'string' ? null : value.sellerCount });
      if (draft.value.competitors.some(row => normalizeCompetitorName(row.name).toLocaleLowerCase('es-MX') === name.toLocaleLowerCase('es-MX'))) return false;
      draft.value.competitors.push(item); activeKey.value = item.key;
      step.value = 2; reachedStep.value = Math.max(reachedStep.value, 2); errors.value = {};
      return true;
   }
   function revealFirstError() {
      if (errors.value.responsable) step.value = 1;
      else {
         step.value = 2;
         activeKey.value = included.value.find(item => errors.value[`${item.key}-name`] || Object.keys(competitorErrors(item)).length)?.key || activeKey.value;
      }
   }
   function review() {
      errors.value = validate();
      if (Object.keys(errors.value).length) { revealFirstError(); return false; }
      step.value = reachedStep.value = 3;
      return true;
   }
   function exclude(key: string) {
      if (busy.value) return false;
      const item = included.value.find(row => row.key === key);
      if (!item || item.competitorId === CORONA_ID) return false;
      const index = activeIndex.value;
      item.excluded = true; errors.value = {};
      if (activeKey.value === key) {
         const next = included.value[index];
         if (next) activeKey.value = next.key;
         else { activeKey.value = included.value[included.value.length - 1]?.key || ''; review(); }
      }
      return true;
   }
   function restore(key: string) {
      if (busy.value) return;
      const item = excluded.value.find(row => row.key === key);
      if (!item) return;
      item.excluded = false; activeKey.value = item.key; step.value = 2;
      reachedStep.value = Math.max(reachedStep.value, 2); errors.value = {};
   }
   function select(key: string) {
      if (!busy.value && included.value.some(item => item.key === key)) { activeKey.value = key; errors.value = {}; }
   }
   function next() {
      if (busy.value) return false;
      if (step.value === 1) {
         errors.value = responsibleErrors(draft.value);
         if (Object.keys(errors.value).length) return false;
         step.value = 2; reachedStep.value = Math.max(reachedStep.value, 2);
         return true;
      }
      if (step.value !== 2) return false;
      if (!catalogInitialized.value) { errors.value = { catalog: 'Carga la lista completa de marcas para continuar.' }; return false; }
      const item = active.value;
      const nameIssues = names();
      errors.value = item ? { ...competitorErrors(item), ...(nameIssues[`${item.key}-name`] ? { [`${item.key}-name`]: nameIssues[`${item.key}-name`] } : {}) }
         : { competitors: 'Corona es obligatoria en la ficha.' };
      if (Object.keys(errors.value).length) return false;
      if (activeIndex.value < included.value.length - 1) { activeKey.value = included.value[activeIndex.value + 1]!.key; return true; }
      return review();
   }
   function previous() {
      if (busy.value) return;
      errors.value = {};
      if (step.value === 3) { step.value = 2; activeKey.value = included.value[included.value.length - 1]?.key || ''; }
      else if (step.value === 2 && activeIndex.value > 0) activeKey.value = included.value[activeIndex.value - 1]!.key;
      else step.value = Math.max(1, step.value - 1);
   }
   function payload() {
      errors.value = validate();
      if (Object.keys(errors.value).length) { revealFirstError(); return null; }
      return toPayload(draft.value);
   }
   function mayLeave(confirm: () => boolean) { return !busy.value && (!dirty.value || confirm()); }
   async function send(submit: (answer: SubmitFormPayload) => Promise<unknown>, refresh: () => Promise<boolean>) {
      if (busy.value || step.value !== 3) return false;
      const answer = payload();
      if (!answer) return false;
      busy.value = true; submissionError.value = '';
      try { await submit(answer); accept(); return true; }
      catch (reason) {
         submissionError.value = errorMessage(reason, 'No se pudo enviar. Tu captura sigue disponible en esta pantalla.');
         if (httpStatus(reason) === 409) {
            try { if (await refresh()) accept(); }
            catch { submissionError.value += ' No se pudo actualizar el estado; vuelve a consultar la ficha.'; }
         }
         return false;
      } finally { busy.value = false; }
   }
   return { draft, step, reachedStep, activeKey, active, activeIndex, included, excluded, catalogInitialized, errors, busy, dirty,
      completedCount, pendingCount, submissionError, reset, accept, go, add, exclude, restore, select, next, previous,
      payload, mayLeave, send, setCatalog, initializeCatalog, isComplete };
}
