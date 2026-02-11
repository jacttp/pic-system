<script setup lang="ts">
import { computed } from 'vue';
import { useSegmentationStore } from '../stores/segmentationStore';
import { storeToRefs } from 'pinia';

const store = useSegmentationStore();
const { buckets, isLoading } = storeToRefs(store);

// Helper para formatear números
const fmtNum = (num: number, decimals = 0) => 
  new Intl.NumberFormat('es-MX', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(num);

// Calculamos el total global para sacar porcentajes visuales
const totalVolume = computed(() => buckets.value.reduce((acc, b) => acc + b.VolumeSum, 0));

// Función para obtener color según el decil (Calor: Rojo intenso -> Azul frío)
const getBadgeColor = (index: number, total: number) => {
  if (index < total * 0.2) return 'bg-red-100 text-red-700 border-red-200'; // Top 20%
  if (index < total * 0.5) return 'bg-amber-100 text-amber-700 border-amber-200'; // Medio
  return 'bg-slate-100 text-slate-600 border-slate-200'; // Cola
};
</script>

<template>
  <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
    <div class="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
      <h3 class="font-semibold text-slate-700 flex items-center gap-2">
        <span class="i-heroicons-table-cells w-5 h-5 text-slate-400"/> 
        Detalle por Segmento
      </h3>
      <span class="text-xs font-medium px-2 py-1 bg-white border rounded text-slate-500">
        {{ buckets.length }} Grupos
      </span>
    </div>

    <div v-if="isLoading" class="p-8 text-center text-slate-400 animate-pulse">
      Cargando tabla de datos...
    </div>

    <div v-else class="overflow-auto flex-1">
      <table class="w-full text-sm text-left">
        <thead class="text-xs text-slate-500 uppercase bg-slate-50 sticky top-0 z-10 shadow-sm">
          <tr>
            <th class="px-4 py-3 font-medium">Grupo</th>
            <th class="px-4 py-3 font-medium text-right">Rango (Kg)</th>
            <th class="px-4 py-3 font-medium text-right">Clientes</th>
            <th class="px-4 py-3 font-medium text-right">Volumen</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          <tr 
            v-for="(bucket, idx) in buckets" 
            :key="bucket.BucketNumber"
            class="hover:bg-slate-50 transition-colors"
          >
            <td class="px-4 py-3">
              <span 
                class="px-2 py-1 rounded-md text-xs font-bold border"
                :class="getBadgeColor(idx, buckets.length)"
              >
                #{{ bucket.BucketNumber }}
              </span>
            </td>

            <td class="px-4 py-3 text-right text-slate-600 font-mono text-xs">
              {{ fmtNum(bucket.MinRange) }} - {{ fmtNum(bucket.MaxRange) }}
            </td>

            <td class="px-4 py-3 text-right font-medium text-slate-700">
              {{ fmtNum(bucket.ClientCount) }}
            </td>

            <td class="px-4 py-3 text-right">
              <div class="font-bold text-slate-800">{{ fmtNum(bucket.VolumeSum) }}</div>
              <div class="h-1.5 w-full bg-slate-100 rounded-full mt-1 overflow-hidden">
                <div 
                  class="h-full bg-blue-500 rounded-full opacity-80"
                  :style="{ width: `${(bucket.VolumeSum / totalVolume) * 100}%` }"
                ></div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    
    <div class="p-3 border-t border-slate-100 bg-slate-50 text-xs text-slate-500 text-center">
      Mostrando datos base (Sin filtros aplicados)
    </div>
  </div>
</template>