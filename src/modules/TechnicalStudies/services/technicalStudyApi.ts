import api from '@/api/axios';
import type {
   FormDetail,
   CreatedStudy,
   StoreSearchResponse,
   StudyDetail,
   StudyPage,
   StudyStatus,
   SubmitFormPayload,
} from '../types/technicalStudy.types';

const base = '/v2/technical-studies';

export const technicalStudyApi = {
   async getManagements(): Promise<string[]> {
      const { data } = await api.get<string[]>('/filters/gerencias');
      return data;
   },

   async getLeaderships(managements: string[]): Promise<string[]> {
      const { data } = await api.post<string[]>('/filters/jefaturas', { Gerencia: managements });
      return data;
   },

   async searchStores(params: {
      searchTerm: string;
      filters: { canal: string[]; Gerencia: string[]; Jefatura: string[]; Ruta: string[] };
      page: number;
      pageSize: number;
   }): Promise<StoreSearchResponse> {
      const { data } = await api.post<StoreSearchResponse>('/filters/search-clients', params);
      return data;
   },

   async createStudy(payload: { name: string; deadlineDate: string; storeIds: string[] }): Promise<CreatedStudy> {
      const { data } = await api.post(`${base}`, payload);
      return data.data;
   },

   async listStudies(params: { page?: number; limit?: number; search?: string } = {}): Promise<StudyPage> {
      const { data } = await api.get(base, { params });
      return { page: data.page, limit: data.limit, total: data.total, data: data.data };
   },

   async getStudy(id: number): Promise<StudyDetail> {
      const { data } = await api.get(`${base}/${id}`);
      return data.data;
   },

   async extendDeadline(id: number, deadlineDate: string): Promise<{ deadlineAt: string; reactivatedForms: number }> {
      const { data } = await api.patch(`${base}/${id}/deadline`, { deadlineDate });
      return data.data;
   },

   async setStudyStatus(id: number, status: StudyStatus): Promise<{ id: number; status: StudyStatus }> {
      const { data } = await api.patch(`${base}/${id}/status`, { status });
      return data.data;
   },

   async deleteStudy(id: number): Promise<void> {
      await api.delete(`${base}/${id}`);
   },

   async deleteForm(studyId: number, formId: number): Promise<void> {
      await api.delete(`${base}/${studyId}/forms/${formId}`);
   },

   async getForm(studyId: number, formId: number): Promise<FormDetail> {
      const { data } = await api.get(`${base}/${studyId}/forms/${formId}`);
      return data.data;
   },

   async submitForm(studyId: number, formId: number, payload: SubmitFormPayload): Promise<FormDetail> {
      const { data } = await api.post(`${base}/${studyId}/forms/${formId}/submit`, payload);
      return data.data;
   },
};
