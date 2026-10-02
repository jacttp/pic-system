<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/modules/Auth/views/stores/authStore';
import StdButton from '@/modules/Shared/components/std/StdButton.vue';
import StdPageHeader from '@/modules/Shared/components/std/StdPageHeader.vue';
import TechnicalPage from '../components/TechnicalPage.vue';
import TechnicalNotice from '../components/TechnicalNotice.vue';
import TechnicalPagination from '../components/TechnicalPagination.vue';
import StudyResults from '../components/StudyResults.vue';
import FormResults from '../components/FormResults.vue';
import { useTechnicalStudyStore } from '../stores/technicalStudyStore';
import { errorMessage, formatDeadline } from '../utils/technicalStudyUi';
const route = useRoute(); const router = useRouter(); const auth = useAuthStore(); const store = useTechnicalStudyStore();
const queryNumber = (value: unknown, fallback: number) => { const n = Number(value); return Number.isInteger(n) && n > 0 ? n : fallback; };
const page = computed(() => queryNumber(route.query.page, 1));
const search = computed(() => typeof route.query.search === 'string' ? route.query.search.slice(0, 200) : '');
const activeStudyId = computed(() => queryNumber(route.query.studyId, 0));
const searchInput = ref(search.value);
const listError = ref(''); const detailError = ref('');
const study = computed(() => store.selectedStudy?.id === activeStudyId.value ? store.selectedStudy : null);
async function loadList() {
   listError.value = '';
   try {
      const result = await store.list({ page: page.value, limit: 20, search: search.value });
      if (result && result.total === 1 && result.data.length === 1 && !activeStudyId.value && route.query.choose !== '1') await openStudy(result.data[0]!.id);
   } catch (reason) { listError.value = errorMessage(reason, 'No se pudo cargar la bandeja.'); }
}
async function loadStudy() {
   detailError.value = '';
   if (!activeStudyId.value) return;
   try { await store.loadStudy(activeStudyId.value); }
   catch (reason) { detailError.value = errorMessage(reason, 'No se pudieron cargar las fichas.'); }
}
function openStudy(id: number) { return router.replace({ query: { ...route.query, studyId: String(id), choose: undefined } }); }
function changeStudy() { return router.replace({ query: { ...route.query, studyId: undefined, choose: '1' } }); }
function applySearch() {
   const next = searchInput.value.trim();
   if (page.value === 1 && search.value === next) void loadList();
   else void router.replace({ query: { page: '1', search: next || undefined, choose: '1' } });
}
function changePage(target: number) { void router.replace({ query: { ...route.query, page: String(target), studyId: undefined, choose: '1' } }); }
function openForm(id: number) { void router.push({ path: `/admin/technical-forms/${activeStudyId.value}/${id}`, query: { page: String(page.value), search: search.value || undefined } }); }
watch([page, search], () => { searchInput.value = search.value; void loadList(); }, { immediate: true });
watch(activeStudyId, loadStudy, { immediate: true });
</script>
<template>
  <TechnicalPage class="ts-study-admin">
    <StdPageHeader class="ts-header" eyebrow="Fichas técnicas · estructura comercial" title="Bandeja de fichas" description="Elige un estudio y abre las fichas de las tiendas de tu estructura comercial." icon="fa-solid fa-inbox">
      <template #actions><StdButton v-if="auth.isAdmin" class="ts-button-secondary" @click="router.push('/admin/technical-studies')">Administrar estudios</StdButton></template>
    </StdPageHeader>
    <template v-if="!activeStudyId">
      <TechnicalNotice v-if="listError" tone="danger" title="Bandeja no disponible" :description="listError" />
      <form class="ts-toolbar" @submit.prevent="applySearch"><label class="ts-label ts-search">Buscar estudio<input v-model="searchInput" class="ts-input" type="search" maxlength="200" placeholder="Nombre del estudio" :disabled="store.loadingStudies"></label><StdButton class="ts-button-secondary" type="submit" :disabled="store.loadingStudies">Buscar</StdButton></form>
      <StudyResults :studies="listError ? [] : store.studies.data" :loading="store.loadingStudies" action-label="Ver fichas" empty-description="Aquí aparecerán los estudios con tiendas de tu estructura comercial." @open="openStudy" />
      <TechnicalPagination v-if="!listError" :page="page" :total="store.studies.total" :busy="store.loadingStudies" @change="changePage" />
      <StdButton v-else class="ts-button-secondary" @click="loadList">Volver a intentar</StdButton>
    </template>
    <template v-else>
      <div class="ts-context ts-actions"><div><p class="ts-muted">Estudio seleccionado</p><h2 class="mt-1 text-xl font-semibold">{{ study?.name || 'Cargando estudio…' }}</h2><p v-if="study" class="ts-muted mt-1">Límite: {{ formatDeadline(study.deadlineAt) }}</p></div><StdButton class="ts-button-secondary" @click="changeStudy">Cambiar estudio</StdButton></div>
      <TechnicalNotice v-if="detailError" tone="danger" title="No se pudieron cargar las fichas" :description="detailError" />
      <FormResults v-if="!detailError" :key="activeStudyId" :forms="study?.forms || []" :loading="store.loadingStudy" @open="openForm" />
      <StdButton v-else class="ts-button-secondary" @click="loadStudy">Volver a intentar</StdButton>
    </template>
  </TechnicalPage>
</template>
