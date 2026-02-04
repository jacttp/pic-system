<script setup lang="ts">
import { computed } from 'vue';
import type { ClientPending, ClientGeoMatch } from '../types/clientValidationTypes';

const props = defineProps<{
  master: ClientPending;
  candidate: ClientGeoMatch | ClientPending | null;
}>();

const emit = defineEmits<{
  (e: 'mergeToMaster', payload: { field: string; value: any }): void;
  (e: 'mergeToCandidate', payload: { field: string; value: any }): void;
  (e: 'update:master', payload: any): void; 
}>();

// Campos a comparar (Orden Estricto)
const COMPARE_FIELDS = [
  'Nombre', 
  'Calle_Numero', 
  'Colonia', 
  'Ciudad', 
  'Estado', 
  'Geopos', 
  'TipoCli',
  'canal',
  'formatocte',
  'Gerencia',
  'Jefatura',
  'Zona',
  'Ruta',
  'Cadena', 
  'umaf'
] as const;

// Helper de normalización
const normalize = (val: any): string => {
  return val ? String(val).trim().toLowerCase() : '';
};

const comparisonRows = computed(() => {
  return COMPARE_FIELDS.map(field => {
    const valMaster = (props.master as any)[field];
    const valCandidate = props.candidate ? (props.candidate as any)[field] : null;
    
    // Normalizar para comparación
    const normMaster = normalize(valMaster);
    const normCandidate = normalize(valCandidate);
    
    // Reglas de Visualización
    // Si no hay candidato, no hay match
    const isMatch = props.candidate ? (normMaster === normCandidate && normMaster !== '') : false;
    const isMismatch = props.candidate ? (!isMatch && normMaster !== '' && normCandidate !== '') : false;

    // 1. Regla Especial: Geopos match exacto
    const isGeoposMatch = field === 'Geopos' && isMatch;
    
    // Check if Geopos is empty/invalid on Master (for explicit styling)
    const isGeoposEmptyMaster = field === 'Geopos' && !valMaster;

    // 2. Regla Crítica: Ruta diferente
    const isRutaMismatch = field === 'Ruta' && isMismatch;

    return {
      field,
      masterValue: valMaster || '',
      candidateValue: valCandidate || (props.candidate ? '-' : null), // null indicates invalid candidate
      isMatch,
      isGeoposMatch,
      isGeoposEmptyMaster,
      isRutaMismatch
    };
  });
});

const handleMergeToMaster = (field: string, value: any) => {
  emit('mergeToMaster', { field, value });
};

const handleMergeToCandidate = (field: string, value: any) => {
  emit('mergeToCandidate', { field, value });
};
</script>

<template>
  <div class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden text-sm">
    <div class="px-4 py-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
      <h3 class="font-bold text-gray-700">Edición y Homologación</h3>
      <div v-if="candidate" class="text-xs space-x-3">
         <span class="inline-flex items-center"><span class="w-2 h-2 rounded-full bg-yellow-200 mr-1"></span> Coincidencia</span>
         <span class="inline-flex items-center"><span class="w-2 h-2 rounded-full bg-red-600 mr-1"></span> Alerta Ruta/Geopos</span>
      </div>
      <div v-else class="text-xs text-gray-500 italic">
        Sin coincidencias cercanas ("Isla")
      </div>
    </div>

    <div class="overflow-x-auto">
      <table class="w-full text-left border-collapse table-fixed">
        <thead>
          <tr class="bg-gray-100 text-xs text-gray-500 uppercase font-semibold">
            <th class="p-3 border-b w-32">Campo</th>
            <th class="p-3 border-b w-1/3">Original (Editable)</th>
            <th class="p-3 border-b w-24 text-center">Acciones</th>
            <th class="p-3 border-b w-1/3 text-blue-700">Candidato (Referencia)</th>
          </tr>
        </thead>
        <tbody>
          <tr 
            v-for="row in comparisonRows" 
            :key="row.field"
            class="border-b last:border-0 hover:bg-gray-50 transition-colors"
            :class="{ 'bg-yellow-50': row.isMatch }"
          >
            <!-- Campo -->
            <td class="p-2 pl-4 font-medium text-gray-600 border-r border-gray-100 truncate" :title="row.field">
              {{ row.field }}
            </td>

            <!-- Master Value (Input) -->
            <td class="p-1">
               <input 
                  type="text" 
                  v-model="(props.master as any)[row.field]"
                  class="w-full px-2 py-1.5 bg-transparent border border-transparent hover:border-gray-200 focus:border-blue-500 focus:bg-white rounded transition-all outline-none text-gray-700"
                  :class="{ 
                     'text-red-700 font-bold': row.isGeoposMatch,
                     'text-red-600': row.isRutaMismatch,
                     'bg-red-50 border-red-300 ring-1 ring-red-200': row.isGeoposEmptyMaster
                  }"
                  placeholder="-"
               />
            </td>

            <!-- Merge Buttons (Bidireccional) -->
            <td class="p-2 text-center align-middle border-x border-gray-100">
               <div v-if="candidate" class="flex justify-center space-x-1">
                 <!-- Hacia Master -->
                 <button 
                  @click="handleMergeToMaster(row.field, row.candidateValue)"
                  class="w-6 h-6 rounded bg-white border border-gray-200 hover:bg-green-50 hover:border-green-300 text-gray-400 hover:text-green-600 transition-all shadow-sm flex items-center justify-center text-[10px]"
                  title="Copiar hacia Maestro (←)"
                  tabindex="-1"
                 >
                   <i class="fas fa-arrow-left"></i>
                 </button>

                 <!-- Hacia Candidato -->
                 <button 
                  @click="handleMergeToCandidate(row.field, row.masterValue)"
                  class="w-6 h-6 rounded bg-white border border-gray-200 hover:bg-blue-50 hover:border-blue-300 text-gray-400 hover:text-blue-600 transition-all shadow-sm flex items-center justify-center text-[10px]"
                  title="Copiar hacia Candidato (→)"
                  tabindex="-1"
                 >
                   <i class="fas fa-arrow-right"></i>
                 </button>
               </div>
               <div v-else class="text-xs text-gray-300 text-center">-</div>
            </td>

            <!-- Candidate Value -->
            <td class="p-3 text-blue-800 break-words font-mono text-xs select-text">
              <template v-if="candidate">
                <span :class="{ 'text-red-600 font-bold': row.isGeoposMatch }">
                  {{ row.candidateValue }}
                </span>
              </template>
              <template v-else>
                 <span class="text-gray-400 italic font-sans text-[10px]">-- Sin datos --</span>
              </template>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
