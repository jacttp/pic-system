import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { technicalStudyApi } from '../services/technicalStudyApi';
import type { FormDetail, StudyDetail, StudyPage, StudyStatus, SubmitFormPayload } from '../types/technicalStudy.types';

export const useTechnicalStudyStore = defineStore('technicalStudies', () => {
   const studies = ref<StudyPage>({ page: 1, limit: 20, total: 0, data: [] });
   const selectedStudy = ref<StudyDetail | null>(null);
   const selectedForm = ref<FormDetail | null>(null);
   const loadingStudies = ref(false);
   const loadingStudy = ref(false);
   const loadingForm = ref(false);
   const loading = computed(() => loadingStudies.value || loadingStudy.value || loadingForm.value);
   let listRequest = 0;
   let studyRequest = 0;
   let formRequest = 0;
   const error = ref<string | null>(null);

   const captureError = (reason: unknown): never => {
      const response = (reason as { response?: { data?: { message?: string } } })?.response;
      error.value = response?.data?.message || 'No fue posible completar la operación.';
      throw reason;
   };

   async function list(params: { page?: number; limit?: number; search?: string } = {}) {
      const request = ++listRequest;
      loadingStudies.value = true;
      error.value = null;
      try {
         const result = await technicalStudyApi.listStudies(params);
         if (request !== listRequest) return null;
         studies.value = result;
         return result;
      } catch (reason) {
         if (request !== listRequest) return null;
         captureError(reason);
      } finally {
         if (request === listRequest) loadingStudies.value = false;
      }
   }

   async function loadStudy(id: number) {
      const request = ++studyRequest;
      loadingStudy.value = true;
      selectedStudy.value = null;
      error.value = null;
      try {
         const result = await technicalStudyApi.getStudy(id);
         if (request !== studyRequest) return null;
         selectedStudy.value = result;
         return result;
      } catch (reason) {
         if (request !== studyRequest) return null;
         captureError(reason);
      } finally {
         if (request === studyRequest) loadingStudy.value = false;
      }
   }

   async function loadForm(studyId: number, formId: number) {
      const request = ++formRequest;
      loadingForm.value = true;
      selectedForm.value = null;
      error.value = null;
      try {
         const result = await technicalStudyApi.getForm(studyId, formId);
         if (request !== formRequest) return null;
         selectedForm.value = result;
         return result;
      } catch (reason) {
         if (request !== formRequest) return null;
         captureError(reason);
      } finally {
         if (request === formRequest) loadingForm.value = false;
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
         ++studyRequest;
         ++listRequest;
         loadingStudy.value = loadingStudies.value = false;
         selectedStudy.value = null;
         studies.value = { page: 1, limit: 20, total: 0, data: [] };
      } catch (reason) {
         captureError(reason);
      }
   }

   async function submit(studyId: number, formId: number, payload: SubmitFormPayload) {
      const request = ++formRequest;
      loadingForm.value = false;
      error.value = null;
      try {
         const result = await technicalStudyApi.submitForm(studyId, formId, payload);
         if (request === formRequest) selectedForm.value = result;
         return result;
      } catch (reason) {
         captureError(reason);
      }
   }

   return { studies, selectedStudy, selectedForm, loading, loadingStudies, loadingStudy, loadingForm, error, list, loadStudy, loadForm,
      publish, extend, changeStatus, removeForm, removeStudy, submit };
});
