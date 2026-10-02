export type StudyStatus = 'ACTIVE' | 'PAUSED';
export type FormStatus = 'PENDING' | 'SUBMITTED' | 'EXPIRED' | 'PAUSED';

export interface StudySummary {
   id: number;
   name: string;
   status: StudyStatus;
   deadlineAt: string;
   createdAt: string;
   createdByUserId: number;
   totalForms: number;
   submittedForms: number;
   pendingForms: number;
   expiredForms: number;
}

export interface StudyPage {
   page: number;
   limit: number;
   total: number;
   data: StudySummary[];
}

export interface CreatedStudy {
   id: number;
   name: string;
   status: StudyStatus;
   deadlineAt: string;
   createdAt: string;
   createdByUserId: number;
   totalForms: number;
}

export interface FormSummary {
   id: number;
   studyId: number;
   clientId: string;
   storeName: string;
   chain: string | null;
   management: string | null;
   leadership: string | null;
   status: FormStatus;
   submittedAt: string | null;
   elaboratorName: string | null;
}

export interface StudyDetail {
   id: number;
   name: string;
   status: StudyStatus;
   deadlineAt: string;
   createdAt: string;
   createdByUserId: number;
   forms: FormSummary[];
}

export interface PersonIdentity {
   userId: number;
   nombre: string;
   noEmp: string | null;
}

export type SellerType = 'PARCIAL' | 'BASE' | 'APOYO' | 'LIDERES' | 'CELULAS';
export interface StudyCompetitor {
   id: number;
   name: string;
   logo: string | null;
   description: string | null;
   isOther: boolean;
}
export interface Competitor {
   name: string;
   competitorId?: number;
   otherName?: string | null;
   estimatedMonthlyKg: number | null;
   sellerType: SellerType | '';
   sellerCount: number | null;
}

export interface FormDetail extends FormSummary {
   studyName: string;
   studyStatus: StudyStatus;
   deadlineAt: string;
   canSubmit: boolean;
   store: {
      clientId: string;
      name: string;
      chain: string | null;
      channel: string | null;
      management: string | null;
      leadership: string | null;
      zone: string | null;
      route: string | null;
   };
   elaborator: PersonIdentity | null;
   currentElaborator: PersonIdentity | null;
   responsableNombre: string | null;
   competitors: Competitor[];
}

export interface SubmitFormPayload {
   responsableNombre: string;
   competitors: Competitor[];
}

export interface StoreSearchRow {
   IDCLIENTE: string;
   NOM_CLIENTE: string;
   Cadena: string | null;
}

export interface StoreSearchResponse {
   clients: StoreSearchRow[];
   pagination: {
      currentPage: number;
      pageSize: number;
      totalFilteredRecords: number;
      totalPages: number;
   };
}
