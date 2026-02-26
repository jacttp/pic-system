<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useCommercialStructureStore } from '../stores/commercialStructureStore';
import type { CommercialStructure } from '@/types/commercialStructure';

const route = useRoute();
const router = useRouter();
const store = useCommercialStructureStore();

const isNew = computed(() => route.params.ruta === undefined || route.path.endsWith('/new'));
const isLoading = ref(false);
const isSaving = ref(false);
const cascadeInfo = ref<number | null>(null);
const showSuccess = ref(false);

const form = ref<CommercialStructure>({
    Gerencia: '',
    Zona: '',
    Ruta: '',
    RutaM: '',
    Jefatura: '',
    Cedis: '',
    CanalC: ''
});

const originalRuta = ref('');

onMounted(async () => {
    await store.fetchRutaMOptions();
    if (!isNew.value) {
        isLoading.value = true;
        const ruta = decodeURIComponent(route.params.ruta as string);
        const data = await store.fetchByRuta(ruta);
        if (data) {
            form.value = { ...data };
            originalRuta.value = data.Ruta;
        } else {
            alert('Registro no encontrado.');
            router.push('/admin/commercial-structure');
        }
        isLoading.value = false;
    }
});

const handleSave = async () => {
    if (!form.value.Ruta) { alert('La Ruta es obligatoria.'); return; }
    isSaving.value = true;
    cascadeInfo.value = null;
    showSuccess.value = false;
    try {
        if (isNew.value) {
            const success = await store.createItem(form.value);
            if (success) { showSuccess.value = true; setTimeout(() => router.push('/admin/commercial-structure'), 1500); }
            else alert('Error al crear la estructura.');
        } else {
            const result = await store.updateItem(originalRuta.value, form.value);
            if (result) {
                cascadeInfo.value = result.clientesActualizados;
                showSuccess.value = true;
                setTimeout(() => router.push('/admin/commercial-structure'), 2500);
            } else alert('Error al actualizar la estructura.');
        }
    } finally { isSaving.value = false; }
};

const handleCancel = () => router.push('/admin/commercial-structure');
</script>

<template>
    <div class="min-h-full bg-slate-50/70 pb-20">

        <!-- ── Sticky Header ── -->
        <header class="bg-white/90 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-30 shadow-sm">
            <div class="w-full px-4 sm:px-6 lg:px-10 h-16 flex items-center justify-between gap-4">

                <!-- Left: back + breadcrumb -->
                <div class="flex items-center gap-3 min-w-0">
                    <button
                        @click="handleCancel"
                        class="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors flex-shrink-0"
                    >
                        <i class="fa-solid fa-arrow-left text-sm"></i>
                    </button>
                    <div class="hidden sm:flex items-center gap-2 text-xs text-slate-400">
                        <span class="font-medium hover:text-slate-600 cursor-pointer transition-colors" @click="router.push('/admin/commercial-structure')">
                            Estructura Comercial
                        </span>
                        <i class="fa-solid fa-chevron-right text-[9px] text-slate-300"></i>
                        <span class="font-semibold text-slate-600 truncate max-w-[200px]">
                            {{ isNew ? 'Nueva Estructura' : `Ruta ${originalRuta}` }}
                        </span>
                    </div>
                </div>

                <!-- Right: actions -->
                <div class="flex items-center gap-2 flex-shrink-0">
                    <button
                        @click="handleCancel"
                        class="text-sm font-medium text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        @click="handleSave"
                        :disabled="isSaving"
                        class="inline-flex items-center gap-2 px-4 py-1.5 text-sm font-semibold rounded-lg shadow-sm transition-all
                               bg-violet-600 text-white hover:bg-violet-700 active:bg-violet-800
                               disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none disabled:cursor-not-allowed"
                    >
                        <i v-if="isSaving" class="fa-solid fa-circle-notch fa-spin text-xs"></i>
                        <i v-else class="fa-solid fa-check text-xs"></i>
                        {{ isNew ? 'Crear Estructura' : 'Guardar cambios' }}
                    </button>
                </div>
            </div>
        </header>

        <!-- ── Loader ── -->
        <div v-if="isLoading" class="flex flex-col items-center justify-center py-24 gap-4">
            <div class="w-10 h-10 rounded-full border-[3px] border-violet-200 border-t-violet-600 animate-spin"></div>
            <p class="text-sm text-slate-400 font-medium">Cargando estructura…</p>
        </div>

        <!-- ── Layout ── -->
        <main v-else class="w-full px-4 sm:px-6 lg:px-10 py-6 lg:py-8">
            <div class="flex flex-col lg:flex-row gap-6 lg:items-start">

                <!-- ══ LEFT SIDEBAR ══ -->
                <aside class="w-full lg:w-72 xl:w-80 flex-shrink-0 lg:sticky lg:top-20 space-y-4">

                    <!-- Identity card -->
                    <div class="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                        <div class="h-20 bg-gradient-to-br from-violet-500 to-indigo-600 relative">
                            <div class="absolute inset-0 opacity-20"
                                 style="background-image: url('data:image/svg+xml,%3Csvg width=\'40\' height=\'40\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M0 40L40 0H20L0 20M40 40V20L20 40\' fill=\'white\' fill-opacity=\'0.5\'/%3E%3C/svg%3E')">
                            </div>
                        </div>
                        <div class="px-5 pb-5 -mt-9 relative">
                            <div class="w-16 h-16 rounded-2xl bg-white border-2 border-white shadow-md flex items-center justify-center mb-3">
                                <div v-if="!isNew" class="w-full h-full rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
                                    <span class="text-xl font-extrabold text-white font-mono">{{ form.Ruta?.charAt(0) || 'R' }}</span>
                                </div>
                                <div v-else class="w-full h-full rounded-2xl bg-slate-100 flex items-center justify-center">
                                    <i class="fa-solid fa-sitemap text-slate-400 text-xl"></i>
                                </div>
                            </div>
                            <h2 class="text-base font-bold text-slate-900 font-mono">
                                {{ isNew ? 'Nueva Estructura' : (form.Ruta || '—') }}
                            </h2>
                            <p v-if="form.Gerencia" class="text-xs text-slate-500 mt-1">{{ form.Gerencia }}</p>
                        </div>

                        <!-- Meta rows -->
                        <div v-if="!isNew" class="border-t border-slate-100 divide-y divide-slate-100">
                            <div class="flex items-start gap-3 px-5 py-3" v-if="form.Zona">
                                <i class="fa-solid fa-map text-violet-500 text-xs mt-0.5 w-4"></i>
                                <div>
                                    <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Zona</p>
                                    <p class="text-sm font-semibold text-slate-700 mt-0.5">{{ form.Zona }}</p>
                                </div>
                            </div>
                            <div class="flex items-start gap-3 px-5 py-3" v-if="form.Jefatura">
                                <i class="fa-solid fa-user-tie text-violet-500 text-xs mt-0.5 w-4"></i>
                                <div>
                                    <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Jefatura</p>
                                    <p class="text-sm font-semibold text-slate-700 mt-0.5">{{ form.Jefatura }}</p>
                                </div>
                            </div>
                            <div class="flex items-start gap-3 px-5 py-3" v-if="form.RutaM">
                                <i class="fa-solid fa-route text-violet-500 text-xs mt-0.5 w-4"></i>
                                <div>
                                    <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ruta M</p>
                                    <p class="text-sm font-semibold text-violet-700 mt-0.5">{{ form.RutaM }}</p>
                                </div>
                            </div>
                            <div class="flex items-start gap-3 px-5 py-3" v-if="form.Cedis">
                                <i class="fa-solid fa-warehouse text-violet-500 text-xs mt-0.5 w-4"></i>
                                <div>
                                    <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">CEDIS</p>
                                    <p class="text-sm font-semibold text-slate-700 mt-0.5">{{ form.Cedis }}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Cascade warning -->
                    <div v-if="!isNew" class="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
                        <div class="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <i class="fa-solid fa-triangle-exclamation text-amber-600 text-sm"></i>
                        </div>
                        <div>
                            <p class="text-xs font-bold text-amber-800">Propagación automática</p>
                            <p class="text-xs text-amber-700 mt-1 leading-relaxed">
                                Al guardar, <strong>Gerencia, Zona, Jefatura y Cedis</strong> se actualizarán en todos los clientes con esta Ruta.
                            </p>
                        </div>
                    </div>

                    <!-- Success banner -->
                    <transition name="fade">
                        <div v-if="showSuccess" class="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-start gap-3">
                            <div class="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <i class="fa-solid fa-check text-emerald-600 text-sm"></i>
                            </div>
                            <div>
                                <p class="text-xs font-bold text-emerald-800">
                                    {{ isNew ? 'Estructura creada' : 'Actualización exitosa' }}
                                </p>
                                <p v-if="cascadeInfo !== null" class="text-xs text-emerald-700 mt-1">
                                    <i class="fa-solid fa-rotate"></i>
                                    {{ cascadeInfo }} clientes actualizados.
                                </p>
                                <p class="text-xs text-emerald-600 mt-1">Redirigiendo…</p>
                            </div>
                        </div>
                    </transition>
                </aside>

                <!-- ══ RIGHT PANEL ══ -->
                <div class="flex-1 min-w-0 space-y-5">

                    <!-- ── Section: Identificación de Ruta ── -->
                    <section class="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                        <div class="flex items-center gap-2.5 px-6 py-4 border-b border-slate-100 bg-slate-50/60">
                            <div class="w-6 h-6 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0">
                                <i class="fa-solid fa-route text-violet-600 text-xs"></i>
                            </div>
                            <h2 class="text-sm font-bold text-slate-700">Identificación de Ruta</h2>
                        </div>
                        <div class="p-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
                            <!-- Ruta -->
                            <div>
                                <label class="field-label">Ruta <span class="text-red-500">*</span></label>
                                <input
                                    v-model="form.Ruta"
                                    type="text"
                                    placeholder="Ej: R001"
                                    class="field-input font-mono font-bold"
                                />
                                <p v-if="!isNew" class="text-xs text-slate-400 mt-1.5">
                                    <i class="fa-solid fa-circle-info text-[10px]"></i>
                                    Cambiar la ruta actualizará todos los clientes asociados.
                                </p>
                            </div>

                            <!-- Ruta M -->
                            <div>
                                <label class="field-label">Ruta M <span class="text-red-500">*</span></label>
                                <div class="relative">
                                    <select
                                        v-model="form.RutaM"
                                        :disabled="!isNew"
                                        class="field-select"
                                        :class="{ 'opacity-60 cursor-not-allowed': !isNew }"
                                    >
                                        <option value="" disabled>Seleccionar Ruta M…</option>
                                        <option v-for="opt in store.rutaMOptions" :key="opt" :value="opt">{{ opt }}</option>
                                    </select>
                                    <i class="fa-solid fa-chevron-down pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                                </div>
                                <p class="text-xs text-slate-400 mt-1.5">
                                    <i class="fa-solid fa-lock text-[10px]"></i>
                                    {{ isNew ? 'Solo se permiten valores existentes.' : 'No modificable en edición.' }}
                                </p>
                            </div>
                        </div>
                    </section>

                    <!-- ── Section: Jerarquía Territorial ── -->
                    <section class="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                        <div class="flex items-center gap-2.5 px-6 py-4 border-b border-slate-100 bg-slate-50/60">
                            <div class="w-6 h-6 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0">
                                <i class="fa-solid fa-sitemap text-violet-600 text-xs"></i>
                            </div>
                            <h2 class="text-sm font-bold text-slate-700">Jerarquía Territorial</h2>
                        </div>
                        <div class="p-6">
                            <!-- Section label divider -->
                            <div class="flex items-center gap-2 mb-5">
                                <div class="h-px flex-1 bg-slate-100"></div>
                                <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">Estructura jerárquica</span>
                                <div class="h-px flex-1 bg-slate-100"></div>
                            </div>
                            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                                <div>
                                    <label class="field-label">Gerencia</label>
                                    <input v-model="form.Gerencia" type="text" class="field-input" placeholder="Gerencia" />
                                </div>
                                <div>
                                    <label class="field-label">Zona</label>
                                    <input v-model="form.Zona" type="text" class="field-input" placeholder="Zona" />
                                </div>
                                <div>
                                    <label class="field-label">Jefatura</label>
                                    <input v-model="form.Jefatura" type="text" class="field-input" placeholder="Jefatura" />
                                </div>
                            </div>

                            <div class="flex items-center gap-2 my-5">
                                <div class="h-px flex-1 bg-slate-100"></div>
                                <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">Logística y canal</span>
                                <div class="h-px flex-1 bg-slate-100"></div>
                            </div>
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                <div>
                                    <label class="field-label">CEDIS</label>
                                    <input v-model="form.Cedis" type="text" class="field-input" placeholder="Centro de distribución" />
                                </div>
                                <div>
                                    <label class="field-label">Canal C</label>
                                    <input v-model="form.CanalC" type="text" class="field-input" placeholder="Canal comercial" />
                                </div>
                            </div>
                        </div>
                    </section>

                </div>
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
           focus:bg-white focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 focus:outline-none
           placeholder:text-slate-300 transition-all duration-150;
}
.field-select {
    @apply w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-800
           px-3.5 py-2.5 pr-9
           focus:bg-white focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 focus:outline-none transition-all duration-150;
}

.fade-enter-active, .fade-leave-active { transition: opacity 0.3s, transform 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; transform: translateY(-4px); }
</style>
