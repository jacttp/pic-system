<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import StoreSelector from '../components/StoreSelector.vue';
import { useTechnicalStudyStore } from '../stores/technicalStudyStore';
import type { StoreSearchRow } from '../types/technicalStudy.types';
import StdAlert from '@/modules/Shared/components/std/StdAlert.vue';
import StdButton from '@/modules/Shared/components/std/StdButton.vue';
import StdPageHeader from '@/modules/Shared/components/std/StdPageHeader.vue';
import StdSection from '@/modules/Shared/components/std/StdSection.vue';

const router = useRouter();
const store = useTechnicalStudyStore();
const name = ref('');
const deadlineDate = ref('');
const selectedStores = ref<StoreSearchRow[]>([]);
const submitting = ref(false);
const error = ref('');
const invalidStoreIds = ref<string[]>([]);
const canPublish = computed(() => !!name.value.trim() && !!deadlineDate.value && selectedStores.value.length > 0 && !submitting.value);

async function publish() {
   if (!canPublish.value) return;
   error.value = '';
   invalidStoreIds.value = [];
   submitting.value = true;
   try {
      const created = await store.publish({
         name: name.value.trim(), deadlineDate: deadlineDate.value,
         storeIds: selectedStores.value.map(item => item.IDCLIENTE),
      });
      if (created) await router.push(`/admin/technical-studies/${created.id}`);
   } catch (reason) {
      const response = (reason as { response?: { data?: { message?: string; details?: { storeIds?: string[] } } } })?.response;
      error.value = response?.data?.message || store.error || 'No fue posible publicar el estudio.';
      invalidStoreIds.value = response?.data?.details?.storeIds || [];
   } finally {
      submitting.value = false;
   }
}
</script>

<template>
  <div class="space-y-5">
    <StdPageHeader eyebrow="Fichas técnicas · administración" title="Crear estudio" description="Una ficha por tienda seleccionada. La publicación se realiza completa o no se realiza." icon="fa-solid fa-file-circle-plus">
      <template #actions><StdButton @click="router.push('/admin/technical-studies')">Volver</StdButton></template>
    </StdPageHeader>
    <StdAlert v-if="error" tone="danger" title="No se publicó el estudio" :description="error" />
    <StdAlert v-if="invalidStoreIds.length" tone="warning" title="Tiendas sin jefe elegible o no válidas" :description="invalidStoreIds.join(', ')" />
    <StdSection title="Datos del estudio" description="La fecha límite incluye todo el día indicado, en horario de Ciudad de México." icon="fa-solid fa-calendar-days">
      <div class="grid gap-4 md:grid-cols-2">
        <label class="text-xs font-bold text-slate-600">Nombre
          <input v-model.trim="name" maxlength="200" class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Ej. Condiciones de tienda · septiembre" required>
        </label>
        <label class="text-xs font-bold text-slate-600">Fecha límite
          <input v-model="deadlineDate" type="date" class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" required>
        </label>
      </div>
    </StdSection>
    <StdSection title="Tiendas de autoservicio" description="La selección se conserva al cambiar de página o aplicar filtros." icon="fa-solid fa-store">
      <StoreSelector v-model="selectedStores" />
    </StdSection>
    <div class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4">
      <p class="text-sm font-semibold text-slate-600">Se crearán {{ selectedStores.length }} fichas y se avisará a los jefes elegibles.</p>
      <StdButton variant="primary" :disabled="!canPublish" icon="fa-solid fa-paper-plane" @click="publish">{{ submitting ? 'Publicando…' : 'Publicar estudio' }}</StdButton>
    </div>
  </div>
</template>
