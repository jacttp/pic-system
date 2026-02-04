<script setup lang="ts">
import { onMounted, computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useClientValidationStore } from '../stores/validationStore';
import GeoMapWidget from '../components/GeoMapWidget.vue';
import DataComparator from '../components/DataComparator.vue';

const store = useClientValidationStore();
const { pendingClients, selectedClient, nearbyCandidates, candidateToCompare, isLoading, totalPending } = storeToRefs(store);

onMounted(() => {
  store.fetchPendingClients();
});

const handleSelect = (client: any) => {
  store.selectClientForReview(client);
};

// Computed for map data
const mainClientGeo = computed(() => {
  if (!selectedClient.value || !selectedClient.value.Geopos) return { lat: 0, lng: 0, label: '' };
  
  const [latStr, lngStr] = selectedClient.value.Geopos.split(',');
  return {
    lat: parseFloat(latStr || '0'),
    lng: parseFloat(lngStr || '0'),
    label: selectedClient.value.Nombre
  };
});

const candidateGeos = computed(() => {
  return nearbyCandidates.value.map(c => {
    const [latStr, lngStr] = c.Geopos.split(',');
    return {
      lat: parseFloat(latStr || '0'),
      lng: parseFloat(lngStr || '0'),
      label: c.Nombre,
      distancia: c.DistanciaKm,
      dataRef: c // Pasamos referencia para que el click nos devuelva este objeto
    };
  });
});

const onCandidateSelected = (candidate: any) => {
  store.setCandidateForComparison(candidate);
};

const handleMergeToMaster = ({ field, value }: { field: string, value: any }) => {
  if (selectedClient.value) {
    // Actualizamos localmente para feedback inmediato
    (selectedClient.value as any)[field] = value;
  }
};

const handleMergeToCandidate = ({ field, value }: { field: string, value: any }) => {
  if (candidateToCompare.value) {
    // Actualizamos localmente para feedback inmediato
    (candidateToCompare.value as any)[field] = value;
  }
};

const handleNext = async () => {
   await store.selectNextClient();
};

const handleSave = async () => {
   if (selectedClient.value?.TipoCli === 'Revisar') {
      alert('Debe definir si es Nuevo o Duplicado (TipoCli) antes de guardar.');
      return;
   }
   await store.saveClientAction();
   // Feedback visual simple (podría ser un toast)
};

const handleApplyMatch = () => {
  store.applyMatchLogic();
};

const handleApplyNew = () => {
  store.applyNewClientLogic();
};

const handleSkip = async () => {
   if (confirm('¿Marcar como "Sin Análisis" (SA) y omitir?')) {
      await store.applySkipLogic();
   }
};
</script>

<template>
  <div class="flex h-[calc(100vh-4rem)] overflow-hidden bg-gray-50 relative">
    
    <aside class="w-1/3 min-w-[350px] max-w-md bg-white border-r border-gray-200 flex flex-col shadow-sm z-10">
      
      <div class="p-4 border-b border-gray-100 bg-white">
        <h2 class="text-lg font-bold text-gray-800 flex items-center justify-between">
          Validación Clientes
          <span class="bg-orange-100 text-orange-700 text-xs px-2 py-1 rounded-full border border-orange-200">
            {{ totalPending }} Pendientes
          </span>
        </h2>
        <p class="text-xs text-gray-500 mt-1">Selecciona un caso para homologar datos.</p>
      </div>

      <div class="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
        <div v-if="isLoading && pendingClients.length === 0" class="p-4 text-center text-gray-400">
          <i class="fas fa-spinner fa-spin mr-2"></i> Cargando casos...
        </div>

        <div 
          v-for="client in pendingClients" 
          :key="client.clienteid"
          @click="handleSelect(client)"
          class="p-3 rounded-lg cursor-pointer transition-all border group hover:shadow-md"
          :class="selectedClient?.clienteid === client.clienteid 
            ? 'bg-blue-50 border-blue-300 ring-1 ring-blue-200' 
            : 'bg-white border-gray-100 hover:border-gray-300'"
        >
          <div class="flex justify-between items-start mb-1">
            <h3 class="font-semibold text-gray-800 text-sm group-hover:text-blue-700 truncate w-3/4">
              {{ client.Nombre }}
            </h3>
            <span class="text-[10px] font-mono text-gray-400 bg-gray-100 px-1 rounded">
              {{ client.clienteid }}
            </span>
          </div>
          
          <div class="text-xs text-gray-500 space-y-0.5">
            <p v-if="client.Cadena" class="text-blue-600 font-medium">{{ client.Cadena }}</p>
            <p class="truncate"><i class="fas fa-map-marker-alt text-gray-300 mr-1"></i>{{ client.Ciudad }}, {{ client.Estado }}</p>
            <p v-if="!client.Geopos" class="text-red-400 italic">⚠️ Sin coordenadas</p>
          </div>
        </div>
      </div>
    </aside>

    <main class="flex-1 relative bg-gray-50 flex flex-col">
      
      <div v-if="!selectedClient" class="flex-1 flex flex-col items-center justify-center text-gray-400">
        <div class="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mb-4">
          <i class="fas fa-search-location text-4xl text-gray-400"></i>
        </div>
        <p class="text-lg font-medium">Selecciona un cliente para comenzar</p>
        <p class="text-sm">Se analizarán duplicados por geolocalización.</p>
      </div>

      <div v-else class="flex-1 p-6 overflow-y-auto pb-20">
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div class="flex justify-between items-start mb-2">
            <div>
              <h1 class="text-2xl font-bold text-gray-800">{{ selectedClient.Nombre }}</h1>
              <span class="text-sm font-mono text-gray-400">ID: {{ selectedClient.clienteid }}</span>
            </div>
            <button 
              @click="handleNext"
              class="text-gray-400 hover:text-blue-600 transition-colors p-2 rounded-full hover:bg-gray-100"
              title="Siguiente Caso"
            >
              <i class="fas fa-arrow-right text-xl"></i>
            </button>
          </div>

          <div class="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-6 transition-all">
             <div>
                <span class="block font-bold text-gray-400 text-xs uppercase">Dirección</span>
                {{ selectedClient.Calle_Numero }}, {{ selectedClient.Colonia }}
             </div>
             <div>
                <span class="block font-bold text-gray-400 text-xs uppercase">Coordenadas</span>
                {{ selectedClient.Geopos || 'No registradas' }}
             </div>
          </div>
          
          <div class="relative rounded-lg overflow-hidden border border-gray-200">
             <!-- Escenario B: FANTASMA (Sin Geopos) -->
             <div v-if="!selectedClient.Geopos" class="h-24 bg-red-50 flex items-center justify-center text-red-500 border-b border-red-100">
               <span class="font-medium flex items-center">
                  <i class="fas fa-exclamation-triangle mr-2"></i> 
                  ⚠️ Cliente sin geolocalización detectada.
               </span>
             </div>

             <!-- Escenario A: Isvalid Geo -->
             <div v-else-if="mainClientGeo.lat !== 0">
                 <GeoMapWidget 
                   :main-client="mainClientGeo"
                   :candidates="candidateGeos"
                   @select-candidate="onCandidateSelected"
                 />
             </div>
             
             <div v-else class="h-64 bg-slate-100 flex items-center justify-center text-slate-400">
               <span class="italic"><i class="fas fa-map-marked-alt mr-2"></i> Cargando mapa...</span>
             </div>

             <div v-if="isLoading" class="absolute inset-0 bg-white/60 flex items-center justify-center z-[2000] backdrop-blur-[1px]">
               <div class="bg-white px-4 py-2 rounded-full shadow-lg border border-blue-100 flex items-center">
                 <i class="fas fa-circle-notch fa-spin text-blue-600 mr-2"></i>
                 <span class="text-blue-700 font-medium">Buscando cercanos...</span>
               </div>
             </div>
          </div>
        </div>

        <!-- Seccion comparador: Siempre Visible ahora (incluso si no hay candidato seleccionado, se ve la "Isla") -->
        <transition 
          enter-active-class="transition duration-300 ease-out" 
          enter-from-class="transform translate-y-4 opacity-0" 
          enter-to-class="transform translate-y-0 opacity-100"
        >
          <div class="mt-4">
            <div class="flex items-center mb-2 justify-between">
               <div class="flex items-center">
                  <h3 class="text-lg font-bold text-gray-700">Candidato Seleccionado:</h3>
                  <span v-if="candidateToCompare" class="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-md border border-blue-200">
                      {{ candidateToCompare.Nombre }} ({{ candidateToCompare.clienteid }})
                  </span>
                  <span v-else class="ml-2 px-2 py-1 bg-gray-100 text-gray-500 text-xs font-semibold rounded-md border border-gray-200 italic">
                      -- Ninguno --
                  </span>
               </div>
            </div>
            
            <DataComparator 
               :master="selectedClient" 
               :candidate="candidateToCompare"
               @merge-to-master="handleMergeToMaster"
               @merge-to-candidate="handleMergeToCandidate"
            />
          </div>
        </transition>

      </div>

      <!-- Footer Flotante de Acciones -->
      <div v-if="selectedClient" class="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-50">
         <div class="bg-white rounded-full shadow-lg border border-gray-200 px-6 py-2 flex items-center space-x-4">
            
            <!-- Boton Duplicado (Solo si hay candidato) -->
            <button 
               v-if="candidateToCompare"
               @click="handleApplyMatch"
               class="px-4 py-2 bg-blue-50 text-blue-700 font-medium rounded-full hover:bg-blue-100 transition-colors text-sm flex items-center"
            >
               <i class="fas fa-equals mr-2"></i> Es Duplicado
            </button>

            <button 
               @click="handleApplyNew"
               class="px-4 py-2 bg-green-50 text-green-700 font-medium rounded-full hover:bg-green-100 transition-colors text-sm flex items-center"
            >
               <i class="fas fa-plus-circle mr-2"></i> Es Nuevo
            </button>

            <!-- Boton OMITIR (Solo si no hay geopos o explicito) -->
            <button 
               v-if="!selectedClient.Geopos"
               @click="handleSkip"
               class="px-4 py-2 bg-red-50 text-red-600 font-medium rounded-full hover:bg-red-100 transition-colors text-sm flex items-center"
               title="Marcar como Sin Análisis (SA)"
            >
               <i class="fas fa-ban mr-2"></i> OMITIR (SA)
            </button>

            <div class="h-6 w-px bg-gray-300"></div>

            <button 
               @click="handleSave"
               :disabled="isLoading || selectedClient.TipoCli === 'Revisar'"
               class="px-6 py-2 bg-slate-800 text-white font-bold rounded-full hover:bg-black transition-all shadow-md flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
               <i class="fas fa-save"></i>
               <span>GUARDAR</span>
            </button>
            
         </div>
      </div>

    </main>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: #f1f1f1;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}
</style>