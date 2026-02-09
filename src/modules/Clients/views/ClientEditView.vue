<script setup lang="ts">
import { ref, reactive, onMounted, computed, watch, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useClientStore } from '../stores/clientStore';
import type { Client } from '@/types/clients';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const route = useRoute();
const router = useRouter();
const store = useClientStore();

// --- State ---
const isNew = computed(() => route.params.id === 'new');
const clientId = route.params.id as string;

const isLoading = ref(false);
const isSaving = ref(false);

const mapContainer = ref<HTMLElement | null>(null);
let map: L.Map | null = null;
let marker: L.Marker | null = null;

const initialState = {
    // Status
    Tipocli: '',
    
    // Identification
    clienteid: '', // Readonly
    Nombre: '',
    
    // Location
    Calle_Numero: '',
    Colonia: '',
    Ciudad: '',
    Estado: '',
    Geopos: '',

    // Segmentation
    Matriz: '',
    Cadena: '',
    Canal: '',
    Canalm: '',
    Formato: '',
    Gerencia: '',
    Zona: '',
    Jefatura: '',
    Ruta: '',
    Umaf: ''
};

const form = reactive({ ...initialState });
const originalForm = reactive({ ...initialState });

onMounted(async () => {
    isLoading.value = true;
    try {
        // Carga de catálogos
        await Promise.all([
            store.fetchCanales(),
            store.fetchGerencias(),
            store.fetchJefaturas()
        ]);

        // Carga del Cliente (Solo si no es nuevo y el ID existe)
        if (!isNew.value && clientId) {
            try {
                const client = await store.fetchClientById(clientId);
                if (client) {
                    mapClientToForm(client);
                }
            } catch (e) {
                console.error('Error recuperando cliente', e);
                // Opcional: router.push('/admin/clients');
            }
        }
    } finally {
        isLoading.value = false;
        setTimeout(initMap, 200);
    }
});

 function mapClientToForm(client: Client) {
      // Obtenemos las claves reales que vienen de la API para buscar sin importar mayúsculas/minúsculas
      const apiKeys = Object.keys(client);

      Object.keys(initialState).forEach(formKey => {  
          // Buscamos la clave equivalente en la respuesta de la API (Case Insensitive Match)
          const matchedKey = apiKeys.find(k => k.toLowerCase() === formKey.toLowerCase());
          
          if (matchedKey) {
              // @ts-ignore
              const val = client[matchedKey];
              // Asignamos asegurando que no sea null/undefined
              // @ts-ignore
              form[formKey] = val !== null && val !== undefined ? val : '';
              // @ts-ignore
              originalForm[formKey] = val !== null && val !== undefined ? val : '';
          }
      });
  }
// --- Map Logic ---
function initMap() {
    if (!mapContainer.value) return;
    
    // Default: CDMX center
    let lat = 19.4326;
    let lng = -99.1332;
    
    // Try parse existing
    if (form.Geopos) {
        const parts = form.Geopos.split(',').map(p => parseFloat(p.trim()));
        if (parts.length === 2) {
             const p0 = parts[0];
             const p1 = parts[1];
             if (p0 !== undefined && p1 !== undefined && !isNaN(p0) && !isNaN(p1)) {
                 lat = p0;
                 lng = p1;
             }
        }
    }

    if (map) map.remove();

    map = L.map(mapContainer.value).setView([lat, lng], 15);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    marker = L.marker([lat, lng], { draggable: true }).addTo(map);
    
    marker.on('dragend', (event) => {
        const pos = event.target.getLatLng();
        form.Geopos = `${pos.lat.toFixed(6)}, ${pos.lng.toFixed(6)}`;
    });
    
    // Fix map size on load
    setTimeout(() => map?.invalidateSize(), 300);
}

// --- Logic ---
const hasChanges = computed(() => {
    return Object.keys(initialState).some(key => {
         // @ts-ignore
        return form[key] !== originalForm[key];
    });
});

const isChanged = (key: string) => {
     // @ts-ignore
    return form[key] !== originalForm[key];
};

const handleSave = async () => {
    isSaving.value = true;
    try {
        if (isNew.value) {
            await store.createClient(form);
        } else {
            await store.updateClient(clientId, form);
        }
        router.push('/admin/clients');
    } catch (e) {
        alert('Error al guardar');
    } finally {
        isSaving.value = false;
    }
};

const handleCancel = () => {
    if (hasChanges.value) {
        if (!confirm('Tiene cambios sin guardar. ¿Salir?')) return;
    }
    router.push('/admin/clients');
};
</script>

<template>
    <div class="min-h-screen bg-slate-50 pb-20">
        <!-- Header Sticky -->
        <header class="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
            <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                <div class="flex items-center gap-4">
                    <button @click="handleCancel" class="text-slate-400 hover:text-slate-600 transition-colors">
                        <i class="fa-solid fa-arrow-left"></i>
                    </button>
                    <div>
                        <h1 class="text-xl font-bold text-slate-900 tracking-tight">
                            {{ isNew ? 'Nuevo Cliente' : 'Editar Cliente' }}
                        </h1>
                        <p v-if="!isNew" class="text-xs text-slate-500 font-mono mt-0.5">{{ form.clienteid }}</p>
                    </div>
                </div>
                
                <div class="flex items-center gap-3">
                    <span v-if="hasChanges" class="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-200 animate-pulse">
                        <i class="fa-solid fa-pen-to-square mr-1"></i> Modificado
                    </span>
                    <button 
                        @click="handleCancel" 
                        class="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        Cancelar
                    </button>
                    <button 
                        @click="handleSave"
                        :disabled="!hasChanges && !isNew"
                        class="px-5 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-md transition-all flex items-center gap-2"
                    >
                        <i v-if="isSaving" class="fa-solid fa-circle-notch fa-spin"></i>
                        {{ isNew ? 'Crear Cliente' : 'Guardar Cambios' }}
                    </button>
                </div>
            </div>
        </header>

        <!-- Main Content -->
        <main class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

            <!-- Section: Identificación & Status -->
            <section class="grid grid-cols-1 md:grid-cols-3 gap-6">
                <!-- Status Card -->
                <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-6 md:col-span-1 h-fit">
                    <h2 class="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">
                        Clasificación
                    </h2>
                    <div class="space-y-4">
                         <div>
                            <label class="block text-xs font-semibold text-slate-500 mb-1">Tipo Cliente</label>
                            <input 
                                v-model="form.Tipocli" 
                                type="text"
                                class="w-full rounded-md border-slate-200 bg-slate-50 focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all font-medium text-slate-700"
                                :class="{'bg-amber-50 border-amber-300': isChanged('Tipocli')}"
                            />
                        </div>
                    </div>
                </div>

                <!-- ID Card -->
                <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-6 md:col-span-2">
                    <h2 class="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">
                        Identificación
                    </h2>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div class="md:col-span-2">
                            <label class="block text-xs font-semibold text-slate-500 mb-1">Razón Social</label>
                            <input 
                                v-model="form.Nombre" 
                                type="text"
                                class="w-full text-lg font-bold text-slate-800 rounded-md border-slate-200 placeholder:text-slate-300 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all"
                                :class="{'bg-amber-50 border-amber-300': isChanged('Nombre')}"
                            />
                        </div>
                         <!-- Extra ID fields if needed can go here -->
                    </div>
                </div>
            </section>

             <!-- Section: Ubicación -->
            <section class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div class="p-6 border-b border-slate-100 flex justify-between items-center">
                    <h2 class="text-sm font-bold text-slate-400 uppercase tracking-wider">Ubicación Geográfica</h2>
                    <div class="flex items-center gap-2 text-xs font-mono text-slate-500 bg-slate-100 px-2 py-1 rounded">
                        <i class="fa-solid fa-location-dot"></i>
                        {{ form.Geopos || 'Sin coordenadas' }}
                    </div>
                </div>
                
                <div class="grid grid-cols-1 lg:grid-cols-3">
                    <!-- Map Column -->
                    <div class="lg:col-span-1 h-64 lg:h-auto bg-slate-100 relative min-h-[300px]">
                         <div ref="mapContainer" class="absolute inset-0 z-0"></div>
                    </div>

                    <!-- Fields Column -->
                    <div class="lg:col-span-2 p-6 space-y-4">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div class="md:col-span-2">
                                <label class="block text-xs font-semibold text-slate-500 mb-1">Calle y Número</label>
                                <input v-model="form.Calle_Numero" type="text" class="input-premium" :class="{'input-changed': isChanged('Calle_Numero')}" />
                            </div>
                            <div>
                                <label class="block text-xs font-semibold text-slate-500 mb-1">Colonia</label>
                                <input v-model="form.Colonia" type="text" class="input-premium" :class="{'input-changed': isChanged('Colonia')}" />
                            </div>
                             <div>
                                <label class="block text-xs font-semibold text-slate-500 mb-1">Código Postal / Zona</label>
                                <input v-model="form.Zona" type="text" class="input-premium" :class="{'input-changed': isChanged('Zona')}" />
                            </div>
                            <div>
                                <label class="block text-xs font-semibold text-slate-500 mb-1">Ciudad</label>
                                <input v-model="form.Ciudad" type="text" class="input-premium" :class="{'input-changed': isChanged('Ciudad')}" />
                            </div>
                            <div>
                                <label class="block text-xs font-semibold text-slate-500 mb-1">Estado</label>
                                <input v-model="form.Estado" type="text" class="input-premium" :class="{'input-changed': isChanged('Estado')}" />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

             <!-- Section: Segmentación -->
             <section class="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h2 class="text-sm font-bold text-slate-400 uppercase tracking-wider mb-6 border-b border-slate-100 pb-2">
                    Segmentación Comercial
                </h2>
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-5">
                    
                    <!-- Gerencia (Select) -->
                    <div>
                        <label class="block text-xs font-semibold text-slate-500 mb-1">Gerencia</label>
                         <div class="relative">
                            <select v-model="form.Gerencia" class="select-premium" :class="{'input-changed': isChanged('Gerencia')}">
                                <option value="">Seleccionar...</option>
                                <option v-for="g in store.gerencias" :key="g" :value="g">{{ g }}</option>
                            </select>
                            <i class="fa-solid fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-xs"></i>
                         </div>
                    </div>

                    <!-- Jefatura (Select) -->
                    <div>
                        <label class="block text-xs font-semibold text-slate-500 mb-1">Jefatura</label>
                        <div class="relative">
                            <select v-model="form.Jefatura" class="select-premium" :class="{'input-changed': isChanged('Jefatura')}">
                                <option value="">Seleccionar...</option>
                                <option v-for="j in store.jefaturas" :key="j" :value="j">{{ j }}</option>
                            </select>
                             <i class="fa-solid fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-xs"></i>
                        </div>
                    </div>

                    <!-- Canal (Select) -->
                    <div>
                        <label class="block text-xs font-semibold text-slate-500 mb-1">Canal</label>
                        <div class="relative">
                            <select v-model="form.Canal" class="select-premium" :class="{'input-changed': isChanged('Canal')}">
                                <option value="">Seleccionar...</option>
                                <option v-for="c in store.canales" :key="c" :value="c">{{ c }}</option>
                            </select>
                            <i class="fa-solid fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-xs"></i>
                        </div>
                    </div>

                    <!-- Free Text Fields -->
                    <div>
                        <label class="block text-xs font-semibold text-slate-500 mb-1">Matriz</label>
                        <input v-model="form.Matriz" type="text" class="input-premium" :class="{'input-changed': isChanged('Matriz')}" />
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-500 mb-1">Cadena</label>
                        <input v-model="form.Cadena" type="text" class="input-premium" :class="{'input-changed': isChanged('Cadena')}" />
                    </div>
                     <div>
                        <label class="block text-xs font-semibold text-slate-500 mb-1">Canal M</label>
                        <input v-model="form.Canalm" type="text" class="input-premium" :class="{'input-changed': isChanged('Canalm')}" />
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-500 mb-1">Formato</label>
                        <input v-model="form.Formato" type="text" class="input-premium" :class="{'input-changed': isChanged('Formato')}" />
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-500 mb-1">Ruta</label>
                        <input v-model="form.Ruta" type="text" class="input-premium" :class="{'input-changed': isChanged('Ruta')}" />
                    </div>
                     <div>
                        <label class="block text-xs font-semibold text-slate-500 mb-1">UMAF</label>
                        <input v-model="form.Umaf" type="text" class="input-premium" :class="{'input-changed': isChanged('Umaf')}" />
                    </div>

                </div>
             </section>

        </main>
    </div>
</template>

<style scoped>
.input-premium {
    @apply w-full rounded-md border-slate-200 text-slate-700 text-sm py-2 px-3 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all placeholder:text-slate-300;
}
.select-premium {
    @apply w-full rounded-md border-slate-200 text-slate-700 text-sm py-2 pl-3 pr-8 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all appearance-none cursor-pointer bg-white;
}

.input-changed {
    @apply bg-amber-50 border-amber-300 text-amber-900;
}

/* Leaflet Overrides */
:deep(.leaflet-pane) { z-index: 10; }
:deep(.leaflet-control) { z-index: 11; }
</style>
