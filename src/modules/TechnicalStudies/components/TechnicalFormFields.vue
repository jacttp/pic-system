<script setup lang="ts">
import type { PersonIdentity, SellerType, SubmitFormPayload } from '../types/technicalStudy.types';
import StdButton from '@/modules/Shared/components/std/StdButton.vue';
import StdSection from '@/modules/Shared/components/std/StdSection.vue';

defineProps<{ readonly?: boolean; currentElaborator: PersonIdentity | null }>();
const model = defineModel<SubmitFormPayload>({ required: true });
const sellerTypes: { value: SellerType; label: string }[] = [
   { value: 'BASE', label: 'Base' },
   { value: 'PARCIAL', label: 'Parcial' },
   { value: 'APOYO', label: 'Apoyo' },
   { value: 'LIDERES', label: 'Líderes' },
   { value: 'CELULAS', label: 'Células' },
];
const inputClass = 'mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 disabled:bg-slate-50';

function addCompetitor() {
   model.value.competitors.push({ name: '', estimatedMonthlyKg: null, sellerType: '', sellerCount: null });
}
function removeCompetitor(index: number) {
   model.value.competitors.splice(index, 1);
}
</script>

<template>
  <div class="space-y-5">
    <StdSection title="Personas" description="El elaborador es tu usuario PIC; el responsable es la persona observada en la tienda." icon="fa-solid fa-people-group">
      <div class="grid gap-4 md:grid-cols-2">
        <div class="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
          <p class="text-xs font-black uppercase text-slate-500">Elabora · solo lectura</p>
          <p class="mt-1 font-bold text-slate-900">{{ currentElaborator?.nombre || '—' }}</p>
          <p class="text-xs text-slate-500">No. empleado {{ currentElaborator?.noEmp || '—' }}</p>
        </div>
        <label class="text-xs font-bold text-slate-600">Responsable del departamento en tienda
          <input v-model.trim="model.responsableNombre" :disabled="readonly" :class="inputClass" maxlength="200" required placeholder="Nombre de la persona en tienda">
        </label>
      </div>
    </StdSection>

    <StdSection title="Competidores y marcas" description="Registra la venta mensual estimada y un tipo de vendedor por marca. Puedes escribir marcas nuevas." icon="fa-solid fa-chart-simple">
      <div class="space-y-3">
        <div v-for="(competitor, index) in model.competitors" :key="index" class="grid gap-3 rounded-xl border border-slate-200 p-3 md:grid-cols-[2fr_1fr_1fr_1fr_auto]">
          <label class="text-xs font-bold text-slate-600">Marca o competidor
            <input v-model.trim="competitor.name" :disabled="readonly" :class="inputClass" maxlength="100" required>
          </label>
          <label class="text-xs font-bold text-slate-600">Venta mensual estimada (kg)
            <input v-model.number="competitor.estimatedMonthlyKg" :disabled="readonly" :class="inputClass" type="number" min="0" step="0.01" required>
          </label>
          <label class="text-xs font-bold text-slate-600">Tipo de vendedor
            <select v-model="competitor.sellerType" :disabled="readonly" :class="inputClass" required>
              <option value="" disabled>Selecciona</option>
              <option v-for="type in sellerTypes" :key="type.value" :value="type.value">{{ type.label }}</option>
            </select>
          </label>
          <label class="text-xs font-bold text-slate-600">Cantidad
            <input v-model.number="competitor.sellerCount" :disabled="readonly" :class="inputClass" type="number" min="0" step="1" required>
          </label>
          <StdButton v-if="!readonly" size="sm" variant="ghost" class="self-end" :disabled="model.competitors.length <= 1" @click="removeCompetitor(index)">Quitar</StdButton>
        </div>
        <StdButton v-if="!readonly" size="sm" icon="fa-solid fa-plus" @click="addCompetitor">Agregar marca</StdButton>
      </div>
    </StdSection>
  </div>
</template>
