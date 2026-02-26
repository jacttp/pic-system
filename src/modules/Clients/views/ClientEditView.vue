<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useClientStore } from '../stores/clientStore';
import type { Client } from '@/types/clients';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const route  = useRoute();
const router = useRouter();
const store  = useClientStore();

// --- State ---
const isNew    = computed(() => route.params.id === 'new');
const clientId = route.params.id as string;

const isLoading = ref(false);
const isSaving  = ref(false);

const mapContainer = ref<HTMLElement | null>(null);
let map:    L.Map    | null = null;
let marker: L.Marker | null = null;

const initialState = {
    Tipocli: '', Est2017: '', LP: '',
    clienteid: '',
    Nombre: '',
    Calle_Numero: '', Colonia: '', Ciudad: '', Estado: '', Geopos: '', Cedis: '',
    Matriz: '', Cadena: '', Canal: '', Canalm: '', Canalc: '', Formato: '',
    Gerencia: '', Zona: '', Jefatura: '', Ruta: '', Umaf: '', Segemento: ''
};

const form         = reactive({ ...initialState });
const originalForm = reactive({ ...initialState });

onMounted(async () => {
    isLoading.value = true;
    try {
        await Promise.all([store.fetchCanales(), store.fetchGerencias(), store.fetchJefaturas()]);
        if (!isNew.value && clientId) {
            const client = await store.fetchClientById(clientId);
            if (client) mapClientToForm(client);
        }
    } finally {
        isLoading.value = false;
        setTimeout(initMap, 200);
    }
});

function mapClientToForm(client: Client) {
    const apiKeys = Object.keys(client);
    Object.keys(initialState).forEach(key => {
        const match = apiKeys.find(k => k.toLowerCase() === key.toLowerCase());
        if (match) {
            const val = (client as any)[match];
            (form as any)[key]         = val !== null && val !== undefined ? val : '';
            (originalForm as any)[key] = val !== null && val !== undefined ? val : '';
        }
    });
}

// --- Map ---
function initMap() {
    if (!mapContainer.value) return;
    let lat = 19.4326, lng = -99.1332;
    if (form.Geopos) {
        const p = form.Geopos.split(',').map(x => parseFloat(x.trim()));
        if (p.length === 2 && !isNaN(p[0]!) && !isNaN(p[1]!)) { lat = p[0]!; lng = p[1]!; }
    }
    if (map) map.remove();
    map = L.map(mapContainer.value).setView([lat, lng], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap contributors' }).addTo(map);
    marker = L.marker([lat, lng], { draggable: true }).addTo(map);
    marker.on('dragend', e => { const p = e.target.getLatLng(); form.Geopos = `${p.lat.toFixed(6)}, ${p.lng.toFixed(6)}`; });
    setTimeout(() => map?.invalidateSize(), 300);
}

// --- Logic ---
const hasChanges = computed(() => Object.keys(initialState).some(k => (form as any)[k] !== (originalForm as any)[k]));
const isChanged  = (key: string) => (form as any)[key] !== (originalForm as any)[key];

const clientInitials = computed(() => {
    if (!form.Nombre) return '?';
    return form.Nombre.trim().split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase();
});

const handleSave = async () => {
    isSaving.value = true;
    try {
        if (isNew.value) await store.createClient(form);
        else             await store.updateClient(form.clienteid, form);
        router.push('/admin/clients');
    } catch { alert('Error al guardar'); }
    finally { isSaving.value = false; }
};

const handleCancel = () => {
    if (hasChanges.value && !confirm('Tiene cambios sin guardar. ¿Desea salir?')) return;
    router.push('/admin/clients');
};
</script>

<template>
    <div class="min-h-full bg-slate-50/70 pb-20">

        <!-- ── Sticky Header ── -->
        <header class="bg-white/90 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-30 shadow-sm">
            <div class="w-full px-4 sm:px-6 lg:px-10 h-16 flex items-center justify-between gap-4">

                <!-- Left: back + breadcrumb + identity -->
                <div class="flex items-center gap-3 min-w-0">
                    <button
                        @click="handleCancel"
                        class="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors flex-shrink-0"
                    >
                        <i class="fa-solid fa-arrow-left text-sm"></i>
                    </button>

                    <!-- Breadcrumb -->
                    <div class="hidden sm:flex items-center gap-2 text-xs text-slate-400">
                        <span class="font-medium hover:text-slate-600 cursor-pointer transition-colors" @click="router.push('/admin/clients')">
                            Clientes
                        </span>
                        <i class="fa-solid fa-chevron-right text-[9px] text-slate-300"></i>
                        <span class="font-semibold text-slate-600 truncate max-w-[180px]">
                            {{ isNew ? 'Nuevo Cliente' : (form.Nombre || `#${form.clienteid}`) }}
                        </span>
                    </div>

                    <!-- Mobile avatar (sm hidden above) -->
                    <div class="flex sm:hidden items-center gap-2">
                        <div class="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                            <span class="text-xs font-bold text-emerald-700">{{ clientInitials }}</span>
                        </div>
                        <span class="text-sm font-semibold text-slate-800 truncate max-w-[140px]">
                            {{ isNew ? 'Nuevo' : form.Nombre }}
                        </span>
                    </div>
                </div>

                <!-- Right: unsaved badge + actions -->
                <div class="flex items-center gap-2 flex-shrink-0">
                    <transition name="badge-fade">
                        <span v-if="hasChanges" class="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
                            <span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse inline-block"></span>
                            Sin guardar
                        </span>
                    </transition>
                    <button
                        @click="handleCancel"
                        class="text-sm font-medium text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        @click="handleSave"
                        :disabled="!hasChanges && !isNew"
                        class="inline-flex items-center gap-2 px-4 py-1.5 text-sm font-semibold rounded-lg shadow-sm transition-all
                               bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800
                               disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none disabled:cursor-not-allowed"
                    >
                        <i v-if="isSaving" class="fa-solid fa-circle-notch fa-spin text-xs"></i>
                        <i v-else class="fa-solid fa-check text-xs"></i>
                        {{ isNew ? 'Crear Cliente' : 'Guardar' }}
                    </button>
                </div>
            </div>
        </header>

        <!-- ── Loader ── -->
        <div v-if="isLoading" class="flex flex-col items-center justify-center py-24 gap-4">
            <div class="w-10 h-10 rounded-full border-[3px] border-emerald-200 border-t-emerald-600 animate-spin"></div>
            <p class="text-sm text-slate-400 font-medium">Cargando datos del cliente…</p>
        </div>

        <!-- ── Two-column layout ── -->
        <main v-else class="w-full px-4 sm:px-6 lg:px-10 py-6 lg:py-8">
            <div class="flex flex-col lg:flex-row gap-6 lg:items-start">

                <!-- ══ LEFT SIDEBAR (sticky) ══ -->
                <aside class="w-full lg:w-72 xl:w-80 flex-shrink-0 lg:sticky lg:top-20 space-y-4">

                    <!-- Identity card -->
                    <div class="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                        <!-- Gradient banner -->
                        <div class="h-20 bg-gradient-to-br from-emerald-500 to-teal-600 relative">
                            <div class="absolute inset-0 opacity-20"
                                 style="background-image: url('data:image/svg+xml,%3Csvg width=\'40\' height=\'40\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M0 40L40 0H20L0 20M40 40V20L20 40\' fill=\'white\' fill-opacity=\'0.5\'/%3E%3C/svg%3E')">
                            </div>
                        </div>

                        <div class="px-5 pb-5 -mt-9 relative">
                            <!-- Avatar -->
                            <div class="w-16 h-16 rounded-2xl bg-white border-2 border-white shadow-md flex items-center justify-center mb-3">
                                <div v-if="!isNew" class="w-full h-full rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
                                    <span class="text-xl font-extrabold text-white">{{ clientInitials }}</span>
                                </div>
                                <div v-else class="w-full h-full rounded-2xl bg-slate-100 flex items-center justify-center">
                                    <i class="fa-solid fa-store text-slate-400 text-xl"></i>
                                </div>
                            </div>

                            <h2 class="text-base font-bold text-slate-900 leading-tight">
                                {{ form.Nombre || (isNew ? 'Nuevo Cliente' : 'Sin nombre') }}
                            </h2>

                            <div v-if="!isNew && form.clienteid" class="mt-1.5 flex items-center gap-1.5">
                                <span class="font-mono text-xs font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">{{ form.clienteid }}</span>
                            </div>

                            <!-- Unsaved indicator mobile -->
                            <div v-if="hasChanges" class="mt-3 flex items-center gap-1.5 text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-1.5 rounded-lg">
                                <span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse inline-block"></span>
                                Cambios sin guardar
                            </div>
                        </div>

                        <!-- Meta data rows -->
                        <div v-if="!isNew" class="border-t border-slate-100 divide-y divide-slate-100">
                            <div class="flex items-start gap-3 px-5 py-3" v-if="form.Canal">
                                <i class="fa-solid fa-tag text-emerald-500 text-xs mt-0.5 w-4"></i>
                                <div>
                                    <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Canal</p>
                                    <p class="text-sm font-semibold text-slate-700 mt-0.5">{{ form.Canal }}</p>
                                </div>
                            </div>
                            <div class="flex items-start gap-3 px-5 py-3" v-if="form.Gerencia">
                                <i class="fa-solid fa-building text-emerald-500 text-xs mt-0.5 w-4"></i>
                                <div>
                                    <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Gerencia</p>
                                    <p class="text-sm font-semibold text-slate-700 mt-0.5">{{ form.Gerencia }}</p>
                                </div>
                            </div>
                            <div class="flex items-start gap-3 px-5 py-3" v-if="form.Ciudad">
                                <i class="fa-solid fa-location-dot text-emerald-500 text-xs mt-0.5 w-4"></i>
                                <div>
                                    <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ciudad</p>
                                    <p class="text-sm font-semibold text-slate-700 mt-0.5">{{ form.Ciudad }}<span v-if="form.Estado" class="text-slate-400 font-normal">, {{ form.Estado }}</span></p>
                                </div>
                            </div>
                            <div class="flex items-start gap-3 px-5 py-3" v-if="form.Tipocli">
                                <i class="fa-solid fa-shapes text-emerald-500 text-xs mt-0.5 w-4"></i>
                                <div>
                                    <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tipo</p>
                                    <p class="text-sm font-semibold text-slate-700 mt-0.5">{{ form.Tipocli }}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Clasificación card -->
                    <div class="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                        <div class="flex items-center gap-2 px-5 py-3 border-b border-slate-100 bg-slate-50/60">
                            <i class="fa-solid fa-tag text-emerald-500 text-xs"></i>
                            <h3 class="text-xs font-bold text-slate-600 uppercase tracking-wider">Clasificación</h3>
                        </div>
                        <div class="p-4 space-y-3.5">
                            <div>
                                <label class="field-label">Tipo Cliente</label>
                                <input v-model="form.Tipocli" type="text" class="field-input" :class="{ 'field-changed': isChanged('Tipocli') }" />
                            </div>
                            <div>
                                <label class="field-label">Estatus (Est2017)</label>
                                <input v-model="form.Est2017" type="text" class="field-input" :class="{ 'field-changed': isChanged('Est2017') }" />
                            </div>
                            <div>
                                <label class="field-label">LP</label>
                                <input v-model="form.LP" type="text" class="field-input" :class="{ 'field-changed': isChanged('LP') }" />
                            </div>
                        </div>
                    </div>
                </aside>

                <!-- ══ RIGHT PANEL ══ -->
                <div class="flex-1 min-w-0 space-y-5">

                    <!-- ── Section: Identificación ── -->
                    <section class="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                        <div class="flex items-center gap-2.5 px-6 py-4 border-b border-slate-100 bg-slate-50/60">
                            <div class="w-6 h-6 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                                <i class="fa-solid fa-id-card text-emerald-600 text-xs"></i>
                            </div>
                            <h2 class="text-sm font-bold text-slate-700">Identificación</h2>
                        </div>
                        <div class="p-6 space-y-4">
                            <div>
                                <label class="field-label">Razón Social / Nombre <span class="text-red-500">*</span></label>
                                <input
                                    v-model="form.Nombre"
                                    type="text"
                                    placeholder="Nombre del cliente…"
                                    class="field-input text-base font-semibold"
                                    :class="{ 'field-changed': isChanged('Nombre') }"
                                />
                            </div>
                            <div v-if="!isNew" class="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-50 border border-slate-200">
                                <div class="w-9 h-9 rounded-xl bg-slate-200 flex items-center justify-center flex-shrink-0">
                                    <i class="fa-solid fa-fingerprint text-slate-500 text-sm"></i>
                                </div>
                                <div>
                                    <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ID de Negocio</p>
                                    <p class="font-mono text-base font-bold text-slate-700 mt-0.5">{{ form.clienteid }}</p>
                                </div>
                            </div>
                        </div>
                    </section>

                    <!-- ── Section: Ubicación Geográfica ── -->
                    <section class="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                        <div class="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/60">
                            <div class="flex items-center gap-2.5">
                                <div class="w-6 h-6 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                                    <i class="fa-solid fa-location-dot text-emerald-600 text-xs"></i>
                                </div>
                                <h2 class="text-sm font-bold text-slate-700">Ubicación Geográfica</h2>
                            </div>
                            <div v-if="form.Geopos" class="flex items-center gap-1.5 text-xs font-mono text-slate-500 bg-white border border-slate-200 px-2.5 py-1 rounded-full shadow-sm">
                                <i class="fa-solid fa-satellite-dish text-emerald-500 text-[10px]"></i>
                                {{ form.Geopos }}
                            </div>
                        </div>

                        <div class="grid grid-cols-1 lg:grid-cols-5">
                            <!-- Map -->
                            <div class="lg:col-span-2 relative min-h-[260px] bg-slate-100">
                                <div ref="mapContainer" class="absolute inset-0 z-0"></div>
                                <div v-if="!form.Geopos" class="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-400 pointer-events-none">
                                    <i class="fa-solid fa-map text-3xl opacity-30"></i>
                                    <p class="text-xs font-medium opacity-50">Arrastra el marcador para geolocalizar</p>
                                </div>
                            </div>

                            <!-- Location Fields -->
                            <div class="lg:col-span-3 p-5">
                                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div class="sm:col-span-2">
                                        <label class="field-label">Calle y Número</label>
                                        <input v-model="form.Calle_Numero" type="text" class="field-input" :class="{ 'field-changed': isChanged('Calle_Numero') }" />
                                    </div>
                                    <div>
                                        <label class="field-label">Colonia</label>
                                        <input v-model="form.Colonia" type="text" class="field-input" :class="{ 'field-changed': isChanged('Colonia') }" />
                                    </div>
                                    <div>
                                        <label class="field-label">Zona / CP</label>
                                        <input v-model="form.Zona" type="text" class="field-input" :class="{ 'field-changed': isChanged('Zona') }" />
                                    </div>
                                    <div>
                                        <label class="field-label">Ciudad</label>
                                        <input v-model="form.Ciudad" type="text" class="field-input" :class="{ 'field-changed': isChanged('Ciudad') }" />
                                    </div>
                                    <div>
                                        <label class="field-label">Estado</label>
                                        <input v-model="form.Estado" type="text" class="field-input" :class="{ 'field-changed': isChanged('Estado') }" />
                                    </div>
                                    <div class="sm:col-span-2">
                                        <label class="field-label">CEDIS</label>
                                        <input v-model="form.Cedis" type="text" class="field-input" :class="{ 'field-changed': isChanged('Cedis') }" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    <!-- ── Section: Segmentación Comercial ── -->
                    <section class="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                        <div class="flex items-center gap-2.5 px-6 py-4 border-b border-slate-100 bg-slate-50/60">
                            <div class="w-6 h-6 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                                <i class="fa-solid fa-sitemap text-emerald-600 text-xs"></i>
                            </div>
                            <h2 class="text-sm font-bold text-slate-700">Segmentación Comercial</h2>
                        </div>

                        <div class="p-6 space-y-6">

                            <!-- Sub-group: Estructura de Distribución -->
                            <div>
                                <div class="flex items-center gap-2 mb-4">
                                    <div class="h-px flex-1 bg-slate-100"></div>
                                    <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">Estructura de Distribución</span>
                                    <div class="h-px flex-1 bg-slate-100"></div>
                                </div>
                                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-4">
                                    <!-- Gerencia -->
                                    <div>
                                        <label class="field-label">Gerencia</label>
                                        <div class="relative">
                                            <select v-model="form.Gerencia" class="field-select" :class="{ 'field-changed': isChanged('Gerencia') }">
                                                <option value="">Seleccionar…</option>
                                                <option v-for="g in store.gerencias" :key="g" :value="g">{{ g }}</option>
                                            </select>
                                            <i class="fa-solid fa-chevron-down pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                                        </div>
                                    </div>
                                    <!-- Jefatura -->
                                    <div>
                                        <label class="field-label">Jefatura</label>
                                        <div class="relative">
                                            <select v-model="form.Jefatura" class="field-select" :class="{ 'field-changed': isChanged('Jefatura') }">
                                                <option value="">Seleccionar…</option>
                                                <option v-for="j in store.jefaturas" :key="j" :value="j">{{ j }}</option>
                                            </select>
                                            <i class="fa-solid fa-chevron-down pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                                        </div>
                                    </div>
                                    <div>
                                        <label class="field-label">Ruta</label>
                                        <input v-model="form.Ruta" type="text" class="field-input" :class="{ 'field-changed': isChanged('Ruta') }" />
                                    </div>
                                    <div>
                                        <label class="field-label">UMAF</label>
                                        <input v-model="form.Umaf" type="text" class="field-input" :class="{ 'field-changed': isChanged('Umaf') }" />
                                    </div>
                                </div>
                            </div>

                            <!-- Sub-group: Clasificación Comercial -->
                            <div>
                                <div class="flex items-center gap-2 mb-4">
                                    <div class="h-px flex-1 bg-slate-100"></div>
                                    <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">Clasificación Comercial</span>
                                    <div class="h-px flex-1 bg-slate-100"></div>
                                </div>
                                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-4">
                                    <!-- Canal -->
                                    <div>
                                        <label class="field-label">Canal</label>
                                        <div class="relative">
                                            <select v-model="form.Canal" class="field-select" :class="{ 'field-changed': isChanged('Canal') }">
                                                <option value="">Seleccionar…</option>
                                                <option v-for="c in store.canales" :key="c" :value="c">{{ c }}</option>
                                            </select>
                                            <i class="fa-solid fa-chevron-down pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                                        </div>
                                    </div>
                                    <div>
                                        <label class="field-label">Canal M</label>
                                        <input v-model="form.Canalm" type="text" class="field-input" :class="{ 'field-changed': isChanged('Canalm') }" />
                                    </div>
                                    <div>
                                        <label class="field-label">Canal C</label>
                                        <input v-model="form.Canalc" type="text" class="field-input" :class="{ 'field-changed': isChanged('Canalc') }" />
                                    </div>
                                    <div>
                                        <label class="field-label">Matriz</label>
                                        <input v-model="form.Matriz" type="text" class="field-input" :class="{ 'field-changed': isChanged('Matriz') }" />
                                    </div>
                                    <div>
                                        <label class="field-label">Cadena</label>
                                        <input v-model="form.Cadena" type="text" class="field-input" :class="{ 'field-changed': isChanged('Cadena') }" />
                                    </div>
                                    <div>
                                        <label class="field-label">Formato</label>
                                        <input v-model="form.Formato" type="text" class="field-input" :class="{ 'field-changed': isChanged('Formato') }" />
                                    </div>
                                    <div>
                                        <label class="field-label">Segmento</label>
                                        <input v-model="form.Segemento" type="text" class="field-input" :class="{ 'field-changed': isChanged('Segemento') }" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                </div>
                <!-- end right panel -->
            </div>
        </main>
    </div>
</template>

<style scoped>
.field-label {
    @apply block text-xs font-semibold text-slate-500 mb-1.5;
}
.field-input {
    @apply w-full rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-800 px-3.5 py-2.5
           focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none
           placeholder:text-slate-300 transition-all duration-150;
}
.field-select {
    @apply w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-800
           px-3.5 py-2.5 pr-9 cursor-pointer
           focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all duration-150;
}
.field-changed {
    @apply bg-amber-50 border-amber-300 text-amber-900 focus:border-amber-400 focus:ring-amber-400/20;
}

.badge-fade-enter-active, .badge-fade-leave-active { transition: opacity 0.2s, transform 0.2s; }
.badge-fade-enter-from, .badge-fade-leave-to { opacity: 0; transform: translateX(4px); }

/* Leaflet z-index fixes */
:deep(.leaflet-pane)    { z-index: 10; }
:deep(.leaflet-control) { z-index: 11; }
</style>
