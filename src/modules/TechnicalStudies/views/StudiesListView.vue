<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import StdButton from '@/modules/Shared/components/std/StdButton.vue';
import StdPageHeader from '@/modules/Shared/components/std/StdPageHeader.vue';
import TechnicalPage from '../components/TechnicalPage.vue';
import TechnicalNotice from '../components/TechnicalNotice.vue';
import TechnicalPagination from '../components/TechnicalPagination.vue';
import StudyResults from '../components/StudyResults.vue';
import { useTechnicalStudyStore } from '../stores/technicalStudyStore';
import { errorMessage } from '../utils/technicalStudyUi';
const router = useRouter(); const store = useTechnicalStudyStore();
const search = ref(''); const page = ref(1); const error = ref('');
async function load(target = page.value) {
   page.value = target; error.value = '';
   try { await store.list({ page: target, limit: 20, search: search.value.trim() }); }
   catch (reason) { error.value = errorMessage(reason, 'No se pudieron cargar los estudios.'); }
}
onMounted(() => load());
</script>
<template>
  <TechnicalPage class="ts-study-admin">
    <StdPageHeader class="ts-header" eyebrow="Fichas técnicas · administración" title="Estudios" description="Publica estudios y da seguimiento a la respuesta de cada tienda." icon="fa-solid fa-clipboard-list">
      <template #actions><StdButton class="ts-button-secondary" @click="router.push('/admin/technical-forms')">Bandeja de fichas</StdButton><StdButton variant="primary" icon="fa-solid fa-plus" @click="router.push('/admin/technical-studies/new')">Crear estudio</StdButton></template>
    </StdPageHeader>
    <TechnicalNotice v-if="error" tone="danger" title="No se pudieron cargar los estudios" :description="error" />
    <form class="ts-toolbar" @submit.prevent="load(1)"><label class="ts-label ts-search">Buscar estudio<input v-model="search" class="ts-input" type="search" maxlength="200" placeholder="Nombre del estudio" :disabled="store.loadingStudies"></label><StdButton class="ts-button-secondary" type="submit" icon="fa-solid fa-magnifying-glass" :disabled="store.loadingStudies">Buscar</StdButton></form>
    <StudyResults :studies="error ? [] : store.studies.data" :loading="store.loadingStudies" @open="router.push(`/admin/technical-studies/${$event}`)" />
    <TechnicalPagination v-if="!error" :page="page" :total="store.studies.total" :busy="store.loadingStudies" @change="load" />
    <StdButton v-else class="ts-button-secondary" @click="load()">Volver a intentar</StdButton>
  </TechnicalPage>
</template>
