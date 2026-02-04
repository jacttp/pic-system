<script setup lang="ts">
import { computed } from 'vue';
import type { ClientPending, ClientGeoMatch } from '../types/clientValidationTypes';
import { useClientValidationStore } from '../stores/validationStore';

const validationStore = useClientValidationStore();

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
// Campos a comparar (Orden Estricto)
const COMPARE_FIELDS = [
  'TipoCli',  
  'clienteid',
  'Nombre', 
  'Calle_Numero', 
  'Colonia', 
  'Ciudad', 
  'Estado', 
  'Geopos', 
  'Matriz',
  'Cadena', 
  'Canal',
  'Canalm',
  'formatocte',
  'Gerencia',
  'Zona',
  'Jefatura',
  'Ruta',
  'Umaf'
  
] as const;

const FIELD_LABELS: Record<string, string> = {
  clienteid: 'Id Cliente',
  Canalm: 'Canal M',
  formatocte: 'Formato'
};

// Helper de normalización
const normalize = (val: any): string => {
  return val ? String(val).trim().toLowerCase() : '';
};

// Helper verificador de colisión Geopos (Tolerancia 4 decimales)
const checkGeoposCollision = (geo1: string, geo2: string): boolean => {
  if (!geo1 || !geo2) return false;
  
  // Intentar parsear "lat, lon"
  const parseGeo = (s: string) => {
    const parts = s.split(',').map(p => parseFloat(p.trim()));
    return parts.length === 2 && !parts.some(isNaN) ? parts : null;
  };

  const p1 = parseGeo(geo1);
  const p2 = parseGeo(geo2);

  if (p1 && p2) {
    const latDiff = Math.abs(p1[0] - p2[0]);
    const lonDiff = Math.abs(p1[1] - p2[1]);
    const tolerance = 0.0001;

    return latDiff < tolerance && lonDiff < tolerance;
  }

  // Si no es parseable, comparación estricta de strings
  return normalize(geo1) === normalize(geo2);
};

// Helper verificador TipoCli crítico
const checkCriticalTipoCli = (val: any): boolean => {
  const s = normalize(val);
  return s.startsWith('m') || s === 'baja';
};

const comparisonRows = computed(() => {
  return COMPARE_FIELDS.map(field => {
    const valMaster = (props.master as any)[field];
    const valCandidate = props.candidate ? (props.candidate as any)[field] : null;
    
    // Normalizar para comparación básica
    const normMaster = normalize(valMaster);
    const normCandidate = normalize(valCandidate);
    
    // Reglas de Visualización
    // Si no hay candidato, no hay match
    const isMatch = props.candidate ? (normMaster === normCandidate && normMaster !== '') : false;
    const isMismatch = props.candidate ? (!isMatch && normMaster !== '' && normCandidate !== '') : false;

    // 1. Regla Geoposición (Colisión)
    // Se marca si son "iguales" (dentro de tolerancia)
    const isGeoposCollision = field === 'Geopos' && props.candidate && checkGeoposCollision(String(valMaster), String(valCandidate));
    
    // 2. Regla TipoCli (Crítico)
    // Se evalúa sobre el valor del candidato (o maestro? El requerimiento dice "Si el valor de TipoCli..."). 
    // Asumiremos que si CUALQUIERA de los dos es crítico, se alerta, o mejor, revisemos la fila.
    // El requerimiento dice "Si el valor de TipoCli [es tal] -> PINTAR DE ROJO". 
    // Aplicaremos al valor que se muestra.
    const isCriticalMaster = field === 'TipoCli' && checkCriticalTipoCli(valMaster);
    const isCriticalCandidate = field === 'TipoCli' && checkCriticalTipoCli(valCandidate);

    // 2. Regla Crítica: Ruta diferente (Mantenida de lógica anterior)
    const isRutaMismatch = field === 'Ruta' && isMismatch;

    return {
      field,
      label: FIELD_LABELS[field] || field,
      masterValue: valMaster || '',
      candidateValue: valCandidate || (props.candidate ? '-' : null),
      isMatch,
      isGeoposCollision,
      isCriticalMaster,
      isCriticalCandidate,
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
         <span class="inline-flex items-center"><span class="w-2 h-2 rounded-full bg-red-600 mr-1"></span> Alerta Crítica</span>
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
            :class="{ 
              'bg-yellow-50': row.isMatch && !row.isGeoposCollision,
              'bg-red-50': row.isGeoposCollision || row.isCriticalMaster || row.isCriticalCandidate
            }"
          >
            <!-- Campo -->
            <td 
              class="p-2 pl-4 font-bold text-gray-700 border-r border-gray-100 truncate" 
              :class="{ 'bg-cyan-100 text-cyan-900': row.field === 'TipoCli' }"
              :title="row.field"
            >
              {{ row.label }}
            </td>

            <!-- Master Value (Input) -->
            <td class="p-1">
               <!-- CASO ESPECIAL: Cliente ID (Solo lectura) -->
               <template v-if="row.field === 'clienteid'">
                  <div class="px-2 py-1.5 text-gray-500 font-mono text-xs bg-gray-50 rounded border border-transparent">
                     {{ (props.master as any)[row.field] }}
                  </div>
               </template>

               <!-- CASO GENERAL: Input Editable -->
               <template v-else>
                  <input 
                     type="text" 
                     v-model="(props.master as any)[row.field]"
                     class="w-full px-2 py-1.5 bg-transparent border border-transparent hover:border-gray-200 focus:border-blue-500 focus:bg-white rounded transition-all outline-none"
                     :class="{ 
                        'text-red-700 font-bold': row.isGeoposCollision || row.isCriticalMaster,
                        'text-red-600': row.isRutaMismatch,
                        
                        // Action Feedback (Blue=Duplicate, Green=New)
                        'text-blue-600 font-semibold': validationStore.validationAction === 'duplicate' && !row.isCriticalMaster,
                        'text-green-600 font-semibold': validationStore.validationAction === 'new',
                        
                        // Exception Warning for 'M' cases
                        'bg-yellow-100 border-yellow-300 text-yellow-900': validationStore.manualCheckRequired && (row.field === 'formatocte' || row.field === 'TipoCli'),
                        'text-gray-700': !validationStore.validationAction && !row.isGeoposCollision && !row.isCriticalMaster && !row.isRutaMismatch
                     }"
                     placeholder="-"
                  />
               </template>
            </td>

            <!-- Merge Buttons (Bidireccional) -->
            <td class="p-2 text-center align-middle border-x border-gray-100">
               <div v-if="candidate && row.field !== 'clienteid'" class="flex justify-center space-x-1">
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
                <span :class="{ 'text-red-600 font-bold': row.isGeoposCollision || row.isCriticalCandidate }">
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
