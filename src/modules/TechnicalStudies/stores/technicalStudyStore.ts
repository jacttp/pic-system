import { defineStore } from 'pinia';
import { ref } from 'vue';
import { technicalStudyApi } from '../services/technicalStudyApi';
import type { FormDetail, StudyDetail, StudyPage, StudyStatus, SubmitFormPayload } from '../types/technicalStudy.types';

export const useTechnicalStudyStore = defineStore('technicalStudies', () => {
   const studies = ref<StudyPage>({ page: 1, limit: 20, total: 0, data: [] });
   const selectedStudy = ref<StudyDetail | null>(null);
   const selectedForm = ref<FormDetail | null>(null);
   const loading = ref(false);
   const error = ref<string | null>(null);

   const captureError = (reason: unknown): never => {
      const response = (reason as { response?: { data?: { message?: string } } })?.response;
      error.value = response?.data?.message || 'No fue posible completar la operación.';
      throw reason;
   };

   async function list(params: { page?: number; limit?: number; search?: string } = {}) {
      loading.value = true;
      error.value = null;
      try {
         studies.value = await technicalStudyApi.listStudies(params);
      } catch (reason) {
         captureError(reason);
      } finally {
         loading.value = false;
      }
   }

   async function loadStudy(id: number) {
      loading.value = true;
      error.value = null;
      try {
         selectedStudy.value = await technicalStudyApi.getStudy(id);
      } catch (reason) {
         captureError(reason);
      } finally {
         loading.value = false;
      }
   }

   async function loadForm(studyId: number, formId: number) {
      loading.value = true;
      error.value = null;
      try {
         selectedForm.value = await technicalStudyApi.getForm(studyId, formId);
      } catch (reason) {
         captureError(reason);
      } finally {
         loading.value = false;
      }
   }

   async function publish(payload: { name: string; deadlineDate: string; storeIds: string[] }) {
      error.value = null;
      try {
         return await technicalStudyApi.createStudy(payload);
      } catch (reason) {
         captureError(reason);
      }
   }

   async function extend(id: number, deadlineDate: string) {
      error.value = null;
      try {
         const result = await technicalStudyApi.extendDeadline(id, deadlineDate);
         await loadStudy(id);
         return result;
      } catch (reason) {
         captureError(reason);
      }
   }

   async function changeStatus(id: number, status: StudyStatus) {
      error.value = null;
      try {
         await technicalStudyApi.setStudyStatus(id, status);
         await loadStudy(id);
      } catch (reason) {
         captureError(reason);
      }
   }

   async function removeForm(studyId: number, formId: number) {
      error.value = null;
      try {
         await technicalStudyApi.deleteForm(studyId, formId);
         await loadStudy(studyId);
      } catch (reason) {
         captureError(reason);
      }
   }

   async function removeStudy(id: number) {
      error.value = null;
      try {
         await technicalStudyApi.deleteStudy(id);
         selectedStudy.value = null;
         studies.value = { page: 1, limit: 20, total: 0, data: [] };
      } catch (reason) {
         captureError(reason);
      }
   }

   async function submit(studyId: number, formId: number, payload: SubmitFormPayload) {
      error.value = null;
      try {
         selectedForm.value = await technicalStudyApi.submitForm(studyId, formId, payload);
         return selectedForm.value;
      } catch (reason) {
         captureError(reason);
      }
   }

   return { studies, selectedStudy, selectedForm, loading, error, list, loadStudy, loadForm,
      publish, extend, changeStatus, removeForm, removeStudy, submit };
});
