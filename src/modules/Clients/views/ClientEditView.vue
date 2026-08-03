<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useClientStore } from '../stores/clientStore';
import type { Client } from '@/types/clients';
import { StdButton, StdPageHeader, StdSection } from '@/modules/Shared/components/std';
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

const pageTitle = computed(() => isNew.value ? 'Nuevo cliente' : (form.Nombre || 'Editar cliente'));
const pageDescription = computed(() => isNew.value
    ? 'Captura la identidad, ubicación y clasificación comercial del cliente.'
    : 'Actualiza los datos maestros y la asignación comercial del cliente.');
const pageMeta = computed(() => isNew.value ? 'Alta de cliente' : (form.clienteid || 'Sin ID'));

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
    <div class="min-h-full bg-pic-background pb-20 font-sans text-pic-text-main">

        <!-- ── Sticky Header ── -->
        <header class="sticky top-0 z-30 border-b border-pic-border bg-pic-surface/95 backdrop-blur-sm">
            <div class="flex min-h-14 w-full items-center justify-between gap-3 px-4 py-2 sm:px-6 lg:px-10">
                <div class="flex min-w-0 items-center gap-2">
                    <StdButton variant="ghost" size="icon" icon="fa-solid fa-arrow-left" aria-label="Volver al listado de clientes" @click="handleCancel" />
                    <div class="min-w-0">
                        <p class="truncate text-xs font-bold text-pic-text-main">Clientes</p>
                        <p class="truncate text-[10px] font-bold uppercase tracking-[0.14em] text-pic-text-muted">
                            {{ isNew ? 'Nuevo registro' : 'Edición de datos maestros' }}
                        </p>
                    </div>
                </div>

                <div class="flex shrink-0 items-center gap-2">
                    <transition name="badge-fade">
                        <span v-if="hasChanges" class="hidden items-center gap-1.5 rounded-md border border-[hsl(var(--pic-warning)/0.3)] bg-[hsl(var(--pic-warning)/0.08)] px-2.5 py-1 text-xs font-bold text-pic-warning sm:inline-flex">
                            <span class="h-1.5 w-1.5 animate-pulse rounded-sm bg-pic-warning"></span>
                            Cambios pendientes
                        </span>
                    </transition>
                    <StdButton class="hidden sm:inline-flex" variant="secondary" size="sm" @click="handleCancel">Cancelar</StdButton>
                    <StdButton
                        variant="primary"
                        size="sm"
                        :icon="isSaving ? 'fa-solid fa-circle-notch fa-spin' : 'fa-solid fa-check'"
                        :disabled="isSaving || (!hasChanges && !isNew)"
                        @click="handleSave"
                    >
                        {{ isSaving ? 'Guardando…' : (isNew ? 'Crear cliente' : 'Guardar') }}
                    </StdButton>
                </div>
            </div>
        </header>

        <!-- ── Loader ── -->
        <div v-if="isLoading" class="flex flex-col items-center justify-center py-24 gap-4">
            <i class="fa-solid fa-circle-notch fa-spin text-2xl text-pic-brand" aria-hidden="true"></i>
            <p class="text-sm font-medium text-pic-text-muted">Cargando datos del cliente…</p>
        </div>

        <!-- ── Two-column layout ── -->
        <main v-else class="w-full px-4 py-5 sm:px-6 lg:px-10 lg:py-6">
            <StdPageHeader
                eyebrow="Directorio comercial"
                :title="pageTitle"
                :description="pageDescription"
                icon="fa-solid fa-address-card"
                :meta="pageMeta"
                class="!border-pic-border !bg-pic-surface"
            />

            <div class="mt-4 flex flex-col gap-4 lg:flex-row lg:items-start">

                <!-- ══ LEFT SIDEBAR (sticky) ══ -->
                <aside class="w-full flex-shrink-0 space-y-4 lg:sticky lg:top-20 lg:w-72 xl:w-80">

                    <!-- Identity card -->
                    <div class="overflow-hidden rounded-xl border border-pic-border bg-pic-surface shadow-sm shadow-slate-100">
                        <div class="relative border-l-4 border-pic-brand px-4 py-4">
                            <!-- Avatar -->
                            <div class="mb-3 flex h-12 w-12 items-center justify-center rounded-lg border border-pic-brand-border bg-pic-brand-soft">
                                <div v-if="!isNew" class="flex h-full w-full items-center justify-center rounded-lg bg-pic-brand-soft">
                                    <span class="text-lg font-extrabold text-pic-brand">{{ clientInitials }}</span>
                                </div>
                                <div v-else class="flex h-full w-full items-center justify-center rounded-lg bg-pic-muted-surface">
                                    <i class="fa-solid fa-store text-lg text-pic-text-muted"></i>
                                </div>
                            </div>

                            <h2 class="text-base font-bold leading-tight text-pic-text-main">
                                {{ form.Nombre || (isNew ? 'Nuevo Cliente' : 'Sin nombre') }}
                            </h2>

                            <div v-if="!isNew && form.clienteid" class="mt-1.5 flex items-center gap-1.5">
                                <span class="rounded-md bg-pic-muted-surface px-2 py-0.5 font-mono text-xs font-semibold text-pic-text-muted">{{ form.clienteid }}</span>
                            </div>

                            <!-- Unsaved indicator mobile -->
                            <div v-if="hasChanges" class="mt-3 flex items-center gap-1.5 rounded-lg border border-[hsl(var(--pic-warning)/0.3)] bg-[hsl(var(--pic-warning)/0.08)] px-2.5 py-1.5 text-xs font-semibold text-pic-warning sm:hidden">
                                <span class="inline-block h-1.5 w-1.5 animate-pulse rounded-sm bg-pic-warning"></span>
                                Cambios sin guardar
                            </div>
                        </div>

                        <!-- Meta data rows -->
                        <div v-if="!isNew" class="divide-y divide-pic-border border-t border-pic-border">
                            <div class="flex items-start gap-3 px-5 py-3" v-if="form.Canal">
                                <i class="fa-solid fa-tag mt-0.5 w-4 text-xs text-pic-brand"></i>
                                <div>
                                    <p class="text-[10px] font-bold uppercase tracking-wider text-pic-text-muted">Canal</p>
                                    <p class="mt-0.5 text-sm font-semibold text-pic-text-main">{{ form.Canal }}</p>
                                </div>
                            </div>
                            <div class="flex items-start gap-3 px-5 py-3" v-if="form.Gerencia">
                                <i class="fa-solid fa-building mt-0.5 w-4 text-xs text-pic-brand"></i>
                                <div>
                                    <p class="text-[10px] font-bold uppercase tracking-wider text-pic-text-muted">Gerencia</p>
                                    <p class="mt-0.5 text-sm font-semibold text-pic-text-main">{{ form.Gerencia }}</p>
                                </div>
                            </div>
                            <div class="flex items-start gap-3 px-5 py-3" v-if="form.Ciudad">
                                <i class="fa-solid fa-location-dot mt-0.5 w-4 text-xs text-pic-brand"></i>
                                <div>
                                    <p class="text-[10px] font-bold uppercase tracking-wider text-pic-text-muted">Ciudad</p>
                                    <p class="mt-0.5 text-sm font-semibold text-pic-text-main">{{ form.Ciudad }}<span v-if="form.Estado" class="font-normal text-pic-text-muted">, {{ form.Estado }}</span></p>
                                </div>
                            </div>
                            <div class="flex items-start gap-3 px-5 py-3" v-if="form.Tipocli">
                                <i class="fa-solid fa-shapes mt-0.5 w-4 text-xs text-pic-brand"></i>
                                <div>
                                    <p class="text-[10px] font-bold uppercase tracking-wider text-pic-text-muted">Tipo</p>
                                    <p class="mt-0.5 text-sm font-semibold text-pic-text-main">{{ form.Tipocli }}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Clasificación card -->
                    <StdSection
                        eyebrow="Perfil"
                        title="Clasificación"
                        description="Atributos de catálogo y estatus."
                        icon="fa-solid fa-tag"
                        density="compact"
                        class="!border-pic-border !bg-pic-surface"
                    >
                        <div class="space-y-3.5">
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
                    </StdSection>
                </aside>

                <!-- ══ RIGHT PANEL ══ -->
                <div class="flex-1 min-w-0 space-y-5">

                    <!-- ── Section: Identificación ── -->
                    <StdSection
                        eyebrow="Datos maestros"
                        title="Identificación"
                        description="Nombre comercial e identificador único del cliente."
                        icon="fa-solid fa-id-card"
                        class="!border-pic-border !bg-pic-surface"
                    >
                        <div class="space-y-4">
                            <div>
                                <label class="field-label">Razón Social / Nombre <span class="text-pic-danger">*</span></label>
                                <input
                                    v-model="form.Nombre"
                                    type="text"
                                    placeholder="Nombre del cliente…"
                                    class="field-input text-base font-semibold"
                                    :class="{ 'field-changed': isChanged('Nombre') }"
                                />
                            </div>
                            <div v-if="!isNew" class="flex items-center gap-3 rounded-lg border border-pic-border bg-pic-muted-surface px-4 py-3">
                                <div class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-pic-brand-soft">
                                    <i class="fa-solid fa-fingerprint text-sm text-pic-brand"></i>
                                </div>
                                <div>
                                    <p class="text-[10px] font-bold uppercase tracking-wider text-pic-text-muted">ID de Negocio</p>
                                    <p class="mt-0.5 font-mono text-base font-bold text-pic-text-main">{{ form.clienteid }}</p>
                                </div>
                            </div>
                        </div>
                    </StdSection>

                    <!-- ── Section: Ubicación Geográfica ── -->
                    <section class="overflow-hidden rounded-xl border border-pic-border bg-pic-surface shadow-sm">
                        <div class="flex flex-col gap-2 border-b border-pic-border bg-pic-muted-surface px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                            <div class="flex items-center gap-2.5">
                                <div class="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg bg-pic-brand-soft">
                                    <i class="fa-solid fa-location-dot text-xs text-pic-brand"></i>
                                </div>
                                <h2 class="text-sm font-bold text-pic-text-main">Ubicación Geográfica</h2>
                            </div>
                            <div v-if="form.Geopos" class="flex items-center gap-1.5 self-start rounded-md border border-pic-border bg-pic-surface px-2.5 py-1 font-mono text-xs text-pic-text-muted shadow-sm">
                                <i class="fa-solid fa-satellite-dish text-[10px] text-pic-brand"></i>
                                {{ form.Geopos }}
                            </div>
                        </div>

                        <div class="grid grid-cols-1 lg:grid-cols-5">
                            <!-- Map -->
                            <div class="relative min-h-[260px] bg-pic-muted-surface lg:col-span-2">
                                <div ref="mapContainer" class="absolute inset-0 z-0"></div>
                                <div v-if="!form.Geopos" class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 text-pic-text-muted">
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
                    <StdSection
                        eyebrow="Estructura comercial"
                        title="Segmentación comercial"
                        description="Asigna la jerarquía de distribución y los atributos del canal."
                        icon="fa-solid fa-sitemap"
                        class="!border-pic-border !bg-pic-surface"
                    >
                        <div class="space-y-6">

                            <!-- Sub-group: Estructura de Distribución -->
                            <div>
                                <div class="flex items-center gap-2 mb-4">
                                    <div class="h-px flex-1 bg-pic-border"></div>
                                    <span class="px-2 text-[10px] font-bold uppercase tracking-widest text-pic-text-muted">Estructura de Distribución</span>
                                    <div class="h-px flex-1 bg-pic-border"></div>
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
                                            <i class="fa-solid fa-chevron-down pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-pic-text-muted"></i>
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
                                            <i class="fa-solid fa-chevron-down pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-pic-text-muted"></i>
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
                                    <div class="h-px flex-1 bg-pic-border"></div>
                                    <span class="px-2 text-[10px] font-bold uppercase tracking-widest text-pic-text-muted">Clasificación Comercial</span>
                                    <div class="h-px flex-1 bg-pic-border"></div>
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
                                            <i class="fa-solid fa-chevron-down pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-pic-text-muted"></i>
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
                    </StdSection>

                </div>
                <!-- end right panel -->
            </div>
        </main>
    </div>
</template>

<style scoped>
.field-label {
    display: block;
    margin-bottom: 0.375rem;
    color: hsl(var(--pic-text-muted));
    font-size: 0.625rem;
    font-weight: 900;
    letter-spacing: 0.08em;
    line-height: 1rem;
    text-transform: uppercase;
}
.field-input,
.field-select {
    width: 100%;
    min-height: 2.5rem;
    border: 1px solid hsl(var(--pic-border));
    border-radius: 0.5rem;
    background: hsl(var(--pic-surface));
    color: hsl(var(--pic-text-main));
    padding: 0.625rem 0.875rem;
    font-size: 0.875rem;
    font-weight: 600;
    transition: border-color 150ms, background-color 150ms, box-shadow 150ms;
}
.field-select {
    appearance: none;
    padding-right: 2.25rem;
    cursor: pointer;
}
.field-input::placeholder { color: hsl(var(--pic-text-muted)); }
.field-input:hover,
.field-select:hover { background: hsl(var(--pic-muted-surface)); }
.field-input:focus,
.field-select:focus {
    border-color: hsl(var(--pic-brand));
    background: hsl(var(--pic-surface));
    box-shadow: 0 0 0 2px hsl(var(--pic-brand-border));
    outline: none;
}
.field-changed {
    border-color: hsl(var(--pic-warning) / 0.45);
    background: hsl(var(--pic-warning) / 0.08);
    color: hsl(var(--pic-text-main));
}
.field-changed:focus {
    border-color: hsl(var(--pic-warning));
    box-shadow: 0 0 0 2px hsl(var(--pic-warning) / 0.18);
}

.badge-fade-enter-active, .badge-fade-leave-active { transition: opacity 0.2s, transform 0.2s; }
.badge-fade-enter-from, .badge-fade-leave-to { opacity: 0; transform: translateX(4px); }

/* Leaflet z-index fixes */
:deep(.leaflet-pane)    { z-index: 10; }
:deep(.leaflet-control) { z-index: 11; }
</style>
