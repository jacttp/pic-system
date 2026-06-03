<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useCommercialStructureStore } from '../stores/commercialStructureStore';
import type { CommercialStructure } from '@/types/commercialStructure';

const route = useRoute();
const router = useRouter();
const store = useCommercialStructureStore();

const searchTerm = ref('');
const currentPage = ref(1);
const itemsPerPage = 15;
const isPanelLoading = ref(false);
const isSaving = ref(false);
const cascadeInfo = ref<number | null>(null);
const showSuccess = ref(false);
const originalRuta = ref('');
const originalForm = ref<CommercialStructure | null>(null);

const form = ref<CommercialStructure>({
    Gerencia: '',
    Zona: '',
    Ruta: '',
    RutaM: '',
    Jefatura: '',
    Cedis: '',
    CanalC: '',
    nivel_ruta: 1
});

const emptyForm = (): CommercialStructure => ({
    Gerencia: '',
    Zona: '',
    Ruta: '',
    RutaM: '',
    Jefatura: '',
    Cedis: '',
    CanalC: '',
    nivel_ruta: 1
});

const isNew = computed(() => route.path.endsWith('/new'));
const totalPages = computed(() => Math.max(1, Math.ceil(store.totalRecords / itemsPerPage)));
const selectedRuta = computed(() => originalRuta.value);
const activeTitle = computed(() => isNew.value ? 'Nueva estructura' : (form.value.Ruta ? `Ruta ${form.value.Ruta}` : 'Sin seleccion'));
const displayedStart = computed(() => store.totalRecords === 0 ? 0 : ((currentPage.value - 1) * itemsPerPage) + 1);
const displayedEnd = computed(() => Math.min(currentPage.value * itemsPerPage, store.totalRecords));

const visiblePages = computed<(number | string)[]>(() => {
    if (totalPages.value <= 7) {
        return Array.from({ length: totalPages.value }, (_, index) => index + 1);
    }

    if (currentPage.value <= 4) {
        return [1, 2, 3, 4, 5, '...', totalPages.value];
    }

    if (currentPage.value >= totalPages.value - 3) {
        return [1, '...', totalPages.value - 4, totalPages.value - 3, totalPages.value - 2, totalPages.value - 1, totalPages.value];
    }

    return [1, '...', currentPage.value - 1, currentPage.value, currentPage.value + 1, '...', totalPages.value];
});

const routeParam = computed(() => {
    const param = route.params.ruta;
    return typeof param === 'string' ? decodeURIComponent(param) : '';
});

type CommercialStructureField = keyof CommercialStructure;

const editableFields: CommercialStructureField[] = [
    'Gerencia',
    'Zona',
    'Ruta',
    'RutaM',
    'Jefatura',
    'Cedis',
    'CanalC',
    'nivel_ruta'
];

const fieldValue = (item: CommercialStructure, field: CommercialStructureField) => {
    const value = item[field];
    return field === 'nivel_ruta' ? Number(value ?? 1) : String(value ?? '');
};

const resetForm = () => {
    const next = emptyForm();
    form.value = next;
    originalForm.value = { ...next };
    originalRuta.value = '';
    cascadeInfo.value = null;
    showSuccess.value = false;
};

const normalizeRecord = (item: CommercialStructure): CommercialStructure => ({
    ...item,
    nivel_ruta: Number(item.nivel_ruta ?? 1)
});

const setActiveForm = (item: CommercialStructure) => {
    const next = normalizeRecord(item);
    form.value = next;
    originalForm.value = { ...next };
};

const isFieldDirty = (field: CommercialStructureField) => {
    if (!originalForm.value) return false;
    return fieldValue(form.value, field) !== fieldValue(originalForm.value, field);
};

const hasChanges = computed(() => editableFields.some(field => isFieldDirty(field)));
const saveDisabled = computed(() => isSaving.value || isPanelLoading.value || !hasChanges.value);
const changedFieldsCount = computed(() => editableFields.filter(field => isFieldDirty(field)).length);
const dirtyFieldClass = (field: CommercialStructureField) => isFieldDirty(field) ? 'field-dirty' : '';

const loadData = async () => {
    await store.fetchItems(currentPage.value, itemsPerPage, searchTerm.value);
};

const loadRecord = async (ruta: string) => {
    if (!ruta) {
        resetForm();
        return;
    }

    isPanelLoading.value = true;
    cascadeInfo.value = null;
    showSuccess.value = false;
    try {
        const data = await store.fetchByRuta(ruta);
        if (data) {
            setActiveForm(data);
            originalRuta.value = data.Ruta;
        } else {
            alert('Registro no encontrado.');
            router.push('/admin/commercial-structure');
        }
    } finally {
        isPanelLoading.value = false;
    }
};

const selectFirstAvailable = async () => {
    const first = store.items[0];
    if (first?.Ruta) {
        setActiveForm(first);
        originalRuta.value = first.Ruta;
    } else {
        resetForm();
    }
};

const syncSelectionFromRoute = async () => {
    if (isNew.value) {
        resetForm();
        return;
    }

    if (routeParam.value) {
        await loadRecord(routeParam.value);
        return;
    }

    await selectFirstAvailable();
};

onMounted(async () => {
    await store.fetchRutaMOptions();
    await loadData();
    await syncSelectionFromRoute();
});

let timeout: ReturnType<typeof setTimeout> | undefined;
watch(searchTerm, () => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(async () => {
        currentPage.value = 1;
        await loadData();
        if (!routeParam.value && !isNew.value) {
            await selectFirstAvailable();
        }
    }, 500);
});

watch(() => route.fullPath, async () => {
    await syncSelectionFromRoute();
});

const handlePageChange = async (page: number | string) => {
    if (typeof page !== 'number' || page < 1 || page > totalPages.value || page === currentPage.value) return;
    currentPage.value = page;
    await loadData();
    if (!routeParam.value && !isNew.value) {
        await selectFirstAvailable();
    }
};

const handleCreate = () => {
    router.push('/admin/commercial-structure/new');
};

const handleEdit = (item: CommercialStructure) => {
    if (item.Ruta) {
        router.push(`/admin/commercial-structure/${encodeURIComponent(item.Ruta)}`);
    } else {
        console.error('Ruta is missing in handleEdit:', item);
    }
};

const handleDelete = async (item: CommercialStructure) => {
    if (confirm(`Eliminar la estructura de la ruta "${item.Ruta}"?`)) {
        const success = await store.deleteItem(item.Ruta);
        if (success) {
            await loadData();
            if (originalRuta.value === item.Ruta) {
                await router.push('/admin/commercial-structure');
                await selectFirstAvailable();
            }
        } else {
            alert('Error al eliminar la estructura.');
        }
    }
};

const handleSave = async () => {
    if (!form.value.Ruta) { alert('La Ruta es obligatoria.'); return; }
    if (!hasChanges.value) return;
    isSaving.value = true;
    cascadeInfo.value = null;
    showSuccess.value = false;
    try {
        if (isNew.value) {
            const success = await store.createItem(form.value);
            if (success) {
                showSuccess.value = true;
                originalForm.value = { ...form.value };
                await loadData();
                setTimeout(() => router.push('/admin/commercial-structure'), 1500);
            }
            else alert('Error al crear la estructura.');
        } else {
            const result = await store.updateItem(originalRuta.value, form.value);
            if (result) {
                cascadeInfo.value = result.clientesActualizados;
                showSuccess.value = true;
                originalForm.value = { ...form.value };
                await loadData();
                setTimeout(() => router.push('/admin/commercial-structure'), 2500);
            } else alert('Error al actualizar la estructura.');
        }
    } finally { isSaving.value = false; }
};

const handleCancel = () => {
    router.push('/admin/commercial-structure');
};

const gerenciaColor = (name: string) => {
    const colors = [
        'bg-blue-50 text-blue-700 border-blue-100',
        'bg-indigo-50 text-indigo-700 border-indigo-100',
        'bg-emerald-50 text-emerald-700 border-emerald-100',
        'bg-amber-50 text-amber-700 border-amber-100',
        'bg-rose-50 text-rose-700 border-rose-100'
    ];
    const idx = (name?.charCodeAt(0) ?? 0) % colors.length;
    return colors[idx];
};
</script>

<template>
    <div class="min-h-full bg-[#f7f8fb] text-slate-800">
        <header class="bg-white border-b border-slate-200/80">
            <div class="w-full px-4 sm:px-6 lg:px-8 py-5 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
                <div class="flex items-center gap-4 min-w-0">
                    <div class="h-12 w-12 rounded-xl bg-red-600 text-white shadow-lg shadow-red-200 flex items-center justify-center shrink-0">
                        <i class="fa-solid fa-sitemap text-base"></i>
                    </div>
                    <div class="min-w-0">
                        <h1 class="text-xl font-black tracking-tight text-slate-950">Estructura Comercial</h1>
                        <p class="text-xs font-semibold text-slate-500 mt-1">Jerarquia territorial - Gerencia -> Zona -> Jefatura -> Ruta</p>
                    </div>
                </div>

                <div class="flex items-center gap-3">
                    <div class="hidden sm:flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 shadow-sm">
                        <span class="h-2 w-2 rounded-full bg-red-500"></span>
                        <span v-if="!store.isLoading">{{ store.totalRecords.toLocaleString() }} registros</span>
                        <span v-else>Cargando...</span>
                    </div>
                    <button
                        @click="handleCreate"
                        class="inline-flex h-10 items-center gap-2 rounded-lg bg-red-600 px-4 text-sm font-black text-white shadow-lg shadow-red-200 transition hover:bg-red-700 disabled:opacity-60"
                    >
                        <i class="fa-solid fa-plus text-xs"></i>
                        Nueva Estructura
                    </button>
                </div>
            </div>
        </header>

        <main class="grid min-h-[calc(100vh-104px)] grid-cols-1 2xl:grid-cols-[minmax(760px,1fr)_480px]">
            <section class="border-b border-slate-200/80 bg-white 2xl:border-b-0 2xl:border-r">
                <div class="p-4 sm:p-5 2xl:p-6">
                    <div class="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
                        <div class="relative flex-1">
                            <i class="fa-solid fa-magnifying-glass pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-400"></i>
                            <input
                                v-model="searchTerm"
                                type="text"
                                placeholder="Buscar por gerencia, zona, jefatura o ruta..."
                                class="h-11 w-full rounded-lg border border-slate-200 bg-white pl-11 pr-4 text-sm font-semibold text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-red-300 focus:ring-4 focus:ring-red-50"
                            />
                        </div>

                        <div class="flex items-center gap-2">
                            <button
                                v-if="searchTerm"
                                @click="searchTerm = ''"
                                class="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-xs font-black text-slate-700 shadow-sm transition hover:bg-slate-50"
                            >
                                <i class="fa-solid fa-xmark text-[11px] text-slate-400"></i>
                                Limpiar
                            </button>
                        </div>
                    </div>

                    <div class="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                        <div v-if="store.isLoading" class="flex flex-col items-center justify-center gap-3 py-20">
                            <div class="h-9 w-9 rounded-full border-[3px] border-red-100 border-t-red-600 animate-spin"></div>
                            <p class="text-sm font-semibold text-slate-400">Cargando estructuras...</p>
                        </div>

                        <div v-else-if="store.items.length === 0" class="flex flex-col items-center justify-center gap-3 px-6 py-20 text-center">
                            <div class="flex h-14 w-14 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-300">
                                <i class="fa-regular fa-folder-open text-2xl"></i>
                            </div>
                            <div>
                                <p class="text-sm font-black text-slate-700">Sin resultados</p>
                                <p class="mt-1 text-xs font-medium text-slate-400">No se encontraron registros con los filtros actuales.</p>
                            </div>
                        </div>

                        <div v-else class="overflow-x-auto">
                            <table class="w-full min-w-[860px] border-collapse text-left">
                                <thead>
                                    <tr class="border-b border-slate-200 bg-slate-50">
                                        <th class="px-4 py-3 text-[11px] font-black uppercase text-slate-600">Ruta</th>
                                        <th class="px-4 py-3 text-[11px] font-black uppercase text-slate-600">Gerencia</th>
                                        <th class="px-4 py-3 text-[11px] font-black uppercase text-slate-600">Zona</th>
                                        <th class="px-4 py-3 text-[11px] font-black uppercase text-slate-600">Jefatura</th>
                                        <th class="px-4 py-3 text-[11px] font-black uppercase text-slate-600">Ruta M</th>
                                        <th class="px-4 py-3 text-[11px] font-black uppercase text-slate-600">Cedis</th>
                                        <th class="px-4 py-3 text-[11px] font-black uppercase text-slate-600">Canal C</th>
                                        <th class="px-4 py-3 text-right text-[11px] font-black uppercase text-slate-600">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-slate-100">
                                    <tr
                                        v-for="item in store.items"
                                        :key="item.Ruta"
                                        class="group cursor-pointer transition"
                                        :class="selectedRuta === item.Ruta && !isNew ? 'bg-red-50/45 ring-1 ring-inset ring-red-300' : 'hover:bg-slate-50'"
                                        @click="handleEdit(item)"
                                    >
                                        <td class="px-4 py-3">
                                            <span class="inline-flex max-w-[140px] items-center rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-black text-slate-700">
                                                <span class="truncate">{{ item.Ruta || '-' }}</span>
                                            </span>
                                        </td>
                                        <td class="px-4 py-3">
                                            <div class="flex items-center gap-2">
                                                <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border text-[10px] font-black" :class="gerenciaColor(item.Gerencia)">
                                                    {{ item.Gerencia?.charAt(0)?.toUpperCase() || '-' }}
                                                </span>
                                                <span class="text-sm font-semibold text-slate-700">{{ item.Gerencia || '-' }}</span>
                                            </div>
                                        </td>
                                        <td class="px-4 py-3 text-sm font-semibold text-slate-700">
                                            <span class="line-clamp-2">{{ item.Zona || '-' }}</span>
                                        </td>
                                        <td class="px-4 py-3 text-sm font-semibold text-slate-700">
                                            <span class="line-clamp-2">{{ item.Jefatura || '-' }}</span>
                                        </td>
                                        <td class="px-4 py-3">
                                            <span class="inline-flex rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[11px] font-black text-violet-700">
                                                {{ item.RutaM || '-' }}
                                            </span>
                                        </td>
                                        <td class="px-4 py-3 text-sm font-medium text-slate-600">{{ item.Cedis || '-' }}</td>
                                        <td class="px-4 py-3">
                                            <span class="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-0.5 text-[11px] font-bold text-slate-600">
                                                {{ item.CanalC || '-' }}
                                            </span>
                                        </td>
                                        <td class="px-4 py-3.5">
                                            <div class="flex items-center justify-end gap-1">
                                                <button
                                                    title="Editar"
                                                    class="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white hover:text-red-600"
                                                    @click.stop="handleEdit(item)"
                                                >
                                                    <i class="fa-solid fa-chevron-right text-xs"></i>
                                                </button>
                                                <button
                                                    title="Eliminar"
                                                    class="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-300 transition hover:bg-red-50 hover:text-red-600"
                                                    @click.stop="handleDelete(item)"
                                                >
                                                    <i class="fa-solid fa-trash-can text-xs"></i>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <div class="flex flex-col gap-3 border-t border-slate-100 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                            <p class="text-xs font-semibold text-slate-500">
                                Mostrando {{ displayedStart }} a {{ displayedEnd }} de {{ store.totalRecords.toLocaleString() }} resultados
                            </p>
                            <div class="flex items-center gap-1.5">
                                <button
                                    :disabled="currentPage === 1"
                                    @click="handlePageChange(currentPage - 1)"
                                    class="pagination-button"
                                >
                                    <i class="fa-solid fa-chevron-left text-[10px]"></i>
                                </button>
                                <button
                                    v-for="page in visiblePages"
                                    :key="String(page)"
                                    :disabled="page === '...'"
                                    class="pagination-button"
                                    :class="page === currentPage ? 'border-red-500 text-red-600' : ''"
                                    @click="handlePageChange(page)"
                                >
                                    {{ page }}
                                </button>
                                <button
                                    :disabled="currentPage === totalPages"
                                    @click="handlePageChange(currentPage + 1)"
                                    class="pagination-button"
                                >
                                    <i class="fa-solid fa-chevron-right text-[10px]"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section class="bg-rose-50/45 p-4 sm:p-6 2xl:p-5">
                <div class="mb-5 flex items-start justify-between gap-3">
                    <div class="min-w-0">
                        <div class="flex items-center gap-2">
                            <h2 class="truncate text-xl font-black tracking-tight text-slate-950">{{ activeTitle }}</h2>
                            <span v-if="!isNew && form.Ruta" class="rounded-full border border-red-100 bg-red-50 px-2 py-0.5 text-[11px] font-black text-red-600">Activa</span>
                        </div>
                        <p v-if="isNew" class="mt-1 text-xs font-semibold text-slate-500">Alta de estructura comercial</p>
                    </div>

                    <div class="hidden rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-wide sm:block"
                         :class="hasChanges ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-rose-100 bg-white/70 text-rose-500'">
                        {{ hasChanges ? `${changedFieldsCount} cambios` : 'Sin cambios' }}
                    </div>
                </div>

                <div v-if="isPanelLoading" class="flex min-h-[420px] flex-col items-center justify-center gap-3 rounded-lg border border-slate-200 bg-white">
                    <div class="h-9 w-9 rounded-full border-[3px] border-red-100 border-t-red-600 animate-spin"></div>
                    <p class="text-sm font-semibold text-slate-400">Cargando estructura...</p>
                </div>

                <div v-else class="space-y-5 pb-24 2xl:pb-28">
                    <section class="form-section">
                        <div class="section-title">
                            <span class="section-icon"><i class="fa-solid fa-route"></i></span>
                            <h3>Identificacion de Ruta</h3>
                        </div>
                        <div class="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2">
                            <div>
                                <label class="field-label">Ruta <span class="text-red-500">*</span></label>
                                <input v-model="form.Ruta" type="text" placeholder="Ags 02" class="field-input font-bold" :class="dirtyFieldClass('Ruta')" />
                                <p v-if="!isNew" class="field-hint">Cambiar la ruta actualizara todos los clientes asociados.</p>
                            </div>
                            <div>
                                <label class="field-label">Ruta M <span class="text-red-500">*</span></label>
                                <div class="relative">
                                    <select
                                        v-model="form.RutaM"
                                        :disabled="!isNew"
                                        class="field-select"
                                        :class="[dirtyFieldClass('RutaM'), { 'cursor-not-allowed opacity-60': !isNew }]"
                                    >
                                        <option value="" disabled>Seleccionar Ruta M...</option>
                                        <option v-for="opt in store.rutaMOptions" :key="opt" :value="opt">{{ opt }}</option>
                                    </select>
                                    <i class="fa-solid fa-chevron-down pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-400"></i>
                                </div>
                                <p class="field-hint">
                                    <i class="fa-solid fa-lock text-[10px]"></i>
                                    {{ isNew ? 'Solo se permiten valores existentes.' : 'No modificable en edicion.' }}
                                </p>
                            </div>
                            <div class="sm:col-span-2">
                                <label class="field-label">Nivel de ruta</label>
                                <div class="relative">
                                    <select v-model.number="form.nivel_ruta" class="field-select" :class="dirtyFieldClass('nivel_ruta')">
                                        <option v-for="level in 10" :key="level" :value="level">Nivel {{ level }}</option>
                                    </select>
                                    <i class="fa-solid fa-chevron-down pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-400"></i>
                                </div>
                                <p class="field-hint">Solo se guarda en EstructuraIC. No se propaga a clientes.</p>
                            </div>
                        </div>
                    </section>

                    <section class="form-section">
                        <div class="section-title">
                            <span class="section-icon"><i class="fa-solid fa-sitemap"></i></span>
                            <h3>Jerarquia Territorial</h3>
                        </div>
                        <div class="p-5">
                            <div class="section-divider">
                                <span>Estructura jerarquica</span>
                            </div>
                            <div class="grid grid-cols-1 gap-5">
                                <div>
                                    <label class="field-label">Gerencia</label>
                                    <input v-model="form.Gerencia" type="text" class="field-input" :class="dirtyFieldClass('Gerencia')" placeholder="Bajo" />
                                </div>
                                <div>
                                    <label class="field-label">Zona</label>
                                    <input v-model="form.Zona" type="text" class="field-input" :class="dirtyFieldClass('Zona')" placeholder="Detalle Aguascalientes - Jorge Eudave" />
                                </div>
                                <div>
                                    <label class="field-label">Jefatura</label>
                                    <input v-model="form.Jefatura" type="text" class="field-input" :class="dirtyFieldClass('Jefatura')" placeholder="Detalle Aguascalientes" />
                                </div>
                            </div>

                            <div class="section-divider mt-7">
                                <span>Logistica y canal</span>
                            </div>
                            <div class="grid grid-cols-1 gap-5 sm:grid-cols-2">
                                <div>
                                    <label class="field-label">CEDIS</label>
                                    <input v-model="form.Cedis" type="text" class="field-input" :class="dirtyFieldClass('Cedis')" placeholder="Ags" />
                                </div>
                                <div>
                                    <label class="field-label">Canal C</label>
                                    <input v-model="form.CanalC" type="text" class="field-input" :class="dirtyFieldClass('CanalC')" placeholder="Detalle" />
                                </div>
                            </div>
                        </div>
                    </section>

                    <div v-if="!isNew" class="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-5 py-4">
                        <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                            <i class="fa-solid fa-triangle-exclamation text-sm"></i>
                        </div>
                        <div>
                            <p class="text-sm font-black text-amber-800">Propagacion automatica</p>
                            <p class="mt-1 text-xs font-semibold leading-relaxed text-amber-700">
                                Al guardar, Gerencia, Zona, Jefatura y Cedis se actualizaran en todos los clientes con esta Ruta.
                            </p>
                        </div>
                    </div>

                    <transition name="fade">
                        <div v-if="showSuccess" class="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-5 py-4">
                            <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                                <i class="fa-solid fa-check text-sm"></i>
                            </div>
                            <div>
                                <p class="text-sm font-black text-emerald-800">{{ isNew ? 'Estructura creada' : 'Actualizacion exitosa' }}</p>
                                <p v-if="cascadeInfo !== null" class="mt-1 text-xs font-semibold text-emerald-700">{{ cascadeInfo }} clientes actualizados.</p>
                            </div>
                        </div>
                    </transition>
                </div>

                <div class="sticky bottom-0 -mx-4 mt-5 border-t border-rose-100 bg-rose-50/95 px-4 py-4 backdrop-blur sm:-mx-6 sm:px-6 2xl:-mx-5 2xl:px-5">
                    <div class="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
                        <button
                            @click="handleCancel"
                            class="inline-flex h-11 items-center justify-center rounded-lg border border-slate-200 bg-white px-5 text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-50"
                        >
                            Cancelar
                        </button>
                        <button
                            @click="handleSave"
                            :disabled="saveDisabled"
                            class="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-red-600 px-5 text-sm font-black text-white shadow-lg shadow-red-200 transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
                            :title="!hasChanges ? 'No hay cambios para guardar' : ''"
                        >
                            <i v-if="isSaving" class="fa-solid fa-circle-notch fa-spin text-xs"></i>
                            <i v-else class="fa-solid fa-check text-xs"></i>
                            {{ isNew ? 'Crear estructura' : 'Guardar cambios' }}
                        </button>
                    </div>
                </div>
            </section>
        </main>
    </div>
</template>

<style scoped>
.field-label {
    @apply mb-2 block text-xs font-black text-slate-600;
}

.field-input {
    @apply h-12 w-full rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm outline-none transition placeholder:text-slate-300 focus:border-red-300 focus:ring-4 focus:ring-red-50;
}

.field-select {
    @apply h-12 w-full appearance-none rounded-lg border border-slate-200 bg-white px-4 pr-10 text-sm font-semibold text-slate-800 shadow-sm outline-none transition focus:border-red-300 focus:ring-4 focus:ring-red-50;
}

.field-dirty {
    @apply border-amber-300 bg-amber-50/70 ring-4 ring-amber-100 focus:border-amber-400 focus:ring-amber-100;
}

.field-hint {
    @apply mt-2 text-xs font-semibold text-slate-400;
}

.form-section {
    @apply overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm;
}

.section-title {
    @apply flex items-center gap-3 border-b border-slate-100 px-5 py-4;
}

.section-title h3 {
    @apply text-sm font-black text-slate-800;
}

.section-icon {
    @apply flex h-7 w-7 items-center justify-center rounded-lg bg-red-50 text-xs text-red-600;
}

.section-divider {
    @apply mb-5 flex items-center gap-3;
}

.section-divider::before,
.section-divider::after {
    content: '';
    @apply h-px flex-1 bg-slate-100;
}

.section-divider span {
    @apply text-[10px] font-black uppercase tracking-[0.18em] text-slate-400;
}

.pagination-button {
    @apply inline-flex h-9 min-w-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40;
}

.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.25s ease, transform 0.25s ease;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
    transform: translateY(-4px);
}
</style>
