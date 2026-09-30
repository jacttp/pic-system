import { computed, ref } from 'vue';
import type { SubmitFormPayload } from '../types/technicalStudy.types';
import type { FieldErrors } from '../types/technicalStudy.ui';
import { competitorErrors, draftSignature, makeCompetitor, makeDraft, nameErrors, responsibleErrors, toPayload, validateDraft } from '../utils/formDraft';
import { errorMessage, httpStatus } from '../utils/technicalStudyUi';

export function useTechnicalForm() {
   const draft = ref(makeDraft());
   const baseline = ref(draftSignature(draft.value));
   const step = ref(1);
   const reachedStep = ref(1);
   const activeKey = ref('');
   const errors = ref<FieldErrors>({});
   const busy = ref(false);
   const submissionError = ref('');
   const active = computed(() => draft.value.competitors.find(item => item.key === activeKey.value));
   const activeIndex = computed(() => draft.value.competitors.findIndex(item => item.key === activeKey.value));
   const dirty = computed(() => draftSignature(draft.value) !== baseline.value);
   const completedCount = computed(() => {
      const names = nameErrors(draft.value);
      return draft.value.competitors.filter(item => !names[`${item.key}-name`] && !Object.keys(competitorErrors(item)).length).length;
   });
   function reset(answer?: SubmitFormPayload) {
      draft.value = makeDraft(answer); baseline.value = draftSignature(draft.value);
      step.value = reachedStep.value = 1; activeKey.value = draft.value.competitors[0]?.key || ''; errors.value = {};
      submissionError.value = '';
   }
   function accept() { baseline.value = draftSignature(draft.value); }
   function go(target: number) {
      if (busy.value || target < 1 || target > reachedStep.value) return;
      step.value = target; errors.value = {};
   }
   function add(name: string) {
      if (busy.value || draft.value.competitors.length >= 100) return false;
      const item = makeCompetitor(); item.name = name.trim();
      const candidate = { ...draft.value, competitors: [...draft.value.competitors, item] };
      const issues = nameErrors(candidate);
      if (issues[`${item.key}-name`] || issues.competitors) return false;
      draft.value.competitors.push(item); activeKey.value ||= item.key;
      return true;
   }
   function remove(key: string) {
      if (busy.value) return;
      const index = draft.value.competitors.findIndex(item => item.key === key);
      if (index < 0) return;
      draft.value.competitors.splice(index, 1);
      if (activeKey.value === key) activeKey.value = draft.value.competitors[Math.min(index, draft.value.competitors.length - 1)]?.key || '';
      errors.value = {};
   }
   function select(key: string) {
      if (!busy.value && draft.value.competitors.some(item => item.key === key)) { activeKey.value = key; errors.value = {}; }
   }
   function revealFirstError() {
      if (errors.value.responsable) step.value = 1;
      else if (errors.value.competitors || draft.value.competitors.some(item => errors.value[`${item.key}-name`])) step.value = 2;
      else {
         step.value = 3;
         activeKey.value = draft.value.competitors.find(item => Object.keys(competitorErrors(item)).length)?.key || activeKey.value;
      }
   }
   function next() {
      if (busy.value) return false;
      errors.value = step.value === 1 ? responsibleErrors(draft.value)
         : step.value === 2 ? nameErrors(draft.value)
         : active.value ? competitorErrors(active.value) : { competitors: 'Agrega al menos un competidor.' };
      if (Object.keys(errors.value).length) return false;
      if (step.value === 3 && activeIndex.value < draft.value.competitors.length - 1) {
         activeKey.value = draft.value.competitors[activeIndex.value + 1]!.key; return true;
      }
      if (step.value === 3) {
         errors.value = validateDraft(draft.value);
         if (Object.keys(errors.value).length) { revealFirstError(); return false; }
      }
      step.value = Math.min(4, step.value + 1); reachedStep.value = Math.max(reachedStep.value, step.value);
      if (step.value === 3 && !active.value) activeKey.value = draft.value.competitors[0]?.key || '';
      return true;
   }
   function previous() {
      if (busy.value) return;
      errors.value = {};
      if (step.value === 3 && activeIndex.value > 0) activeKey.value = draft.value.competitors[activeIndex.value - 1]!.key;
      else step.value = Math.max(1, step.value - 1);
   }
   function payload() {
      errors.value = validateDraft(draft.value);
      if (Object.keys(errors.value).length) { revealFirstError(); return null; }
      return toPayload(draft.value);
   }
   function mayLeave(confirm: () => boolean) { return !busy.value && (!dirty.value || confirm()); }
   async function send(submit: (answer: SubmitFormPayload) => Promise<unknown>, refresh: () => Promise<boolean>) {
      if (busy.value || step.value !== 4) return false;
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
   return { draft, step, reachedStep, activeKey, active, activeIndex, errors, busy, dirty, completedCount, submissionError,
      reset, accept, go, add, remove, select, next, previous, payload, mayLeave, send };
}
