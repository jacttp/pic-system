<script setup lang="ts">
import { onMounted, ref, computed, onUnmounted, reactive } from 'vue';
import { usePicFilterStore } from '../stores/picFilterStore';
import FilterDropdown from './FilterDropdown.vue';
import PicClientModal from './modals/PicClientModal.vue';

const store = usePicFilterStore();
const filterPanel = ref<HTMLElement | null>(null);
const isCollapsed = ref(true);
const overflowVisible = ref(false);
const showClientModal = ref(false);
const openDropdownCount = ref(0);

const mobileSections = reactive<Record<string, boolean>>({
    comercial: true,
    clientes: false,
    producto: false,
    configuracion: false,
    periodo: false
});

type ToastType = 'success' | 'error' | null;
const toast = ref<{ type: ToastType; message: string; detail?: string } | null>(null);
let toastTimer: ReturnType<typeof setTimeout> | null = null;

const filterGroups = [
    'canal',
    'Gerencia',
    'Jefatura',
    'Ruta',
    'FormatoCliente',
    'Marca',
    'grupo',
    'Categorias',
    'SKU',
    'Transaccion',
    'Anio'
] as const;

const activeFilterCount = computed(() => {
    let count = filterGroups.reduce((total, key) => {
        const value = store.selected[key];
        return Array.isArray(value) && value.length > 0 ? total + 1 : total;
    }, 0);

    if (store.selectedClients.size > 0) count += 1;
    if (store.selected.usarRangoMeses) count += 1;

    return count;
});

const clientButtonText = computed(() => {
    const count = store.selectedClients.size;
    if (count === 0) return 'Buscar cliente';
    if (count === 1) return store.selectedClients.values().next().value;
    return `${count} clientes`;
});

const periodSummary = computed(() => {
    const years = store.selected.Anio.length > 0 ? store.selected.Anio.join(', ') : 'Sin años';
    if (!store.selected.usarRangoMeses) return years;
    return `${years} · M${store.selected.MesInicial}-${store.selected.MesFinal}`;
});

const applyButtonText = computed(() => {
    if (store.isGenerating) return 'Aplicando...';
    return store.filtersDirty ? 'Aplicar cambios' : 'Actualizar';
});

const panelStatus = computed(() => {
    if (store.isGenerating) return { text: 'Generando reporte', tone: 'loading' };
    if (store.filtersDirty) return { text: 'Cambios sin aplicar', tone: 'dirty' };
    if (store.hasGeneratedReport) return { text: 'Reporte actualizado', tone: 'ready' };
    return { text: 'Listo para generar', tone: 'idle' };
});

function setCollapsed(value: boolean) {
    isCollapsed.value = value;
    if (!value) {
        window.setTimeout(() => {
            overflowVisible.value = true;
        }, 220);
    } else {
        overflowVisible.value = false;
    }
}

function toggleRangoMeses() {
    store.selected.usarRangoMeses = !store.selected.usarRangoMeses;
    if (!store.selected.usarRangoMeses) {
        store.selected.MesInicial = '1';
        store.selected.MesFinal = String(new Date().getMonth() + 1);
    }
}

function toggleMobileSection(section: string) {
    mobileSections[section] = !mobileSections[section];
}

function handleDropdownOpen(isOpen: boolean) {
    openDropdownCount.value = Math.max(0, openDropdownCount.value + (isOpen ? 1 : -1));
}

function showToast(type: ToastType, message: string, detail?: string) {
    if (toastTimer) clearTimeout(toastTimer);
    toast.value = { type, message, detail };
    toastTimer = setTimeout(() => {
        toast.value = null;
    }, 4500);
}

const handleClickOutside = (event: MouseEvent) => {
    if (isCollapsed.value || showClientModal.value || openDropdownCount.value > 0) return;

    if (filterPanel.value && filterPanel.value.contains(event.target as Node)) {
        return;
    }

    setCollapsed(true);
};

const handleUpdate = async () => {
    const success = await store.generateReport();
    if (success) {
        setCollapsed(true);
        showToast('success', 'Reporte actualizado', 'Los filtros se aplicaron al reporte.');
    } else {
        setCollapsed(false);
        showToast('error', 'No se pudo generar', 'Revisa la conexión o ajusta los filtros.');
    }
};

const handleReset = () => {
    store.resetFilters();
    setCollapsed(false);
};

onMounted(() => {
    store.initFilters();
    document.addEventListener('mousedown', handleClickOutside);
});

onUnmounted(() => {
    document.removeEventListener('mousedown', handleClickOutside);
    if (toastTimer) clearTimeout(toastTimer);
});
</script>

<template>
    <div
        ref="filterPanel"
        class="relative z-40 text-pic-text-main md:w-full md:border-b md:border-pic-border md:bg-pic-surface md:shadow-sm"
        :class="isCollapsed ? 'shrink-0 self-start justify-self-end' : 'col-span-2 w-full basis-full justify-self-stretch'"
    >
        <PicClientModal v-model="showClientModal" />

        <Transition
            enter-active-class="transition-all duration-300 ease-out"
            enter-from-class="opacity-0 translate-y-2 scale-95"
            enter-to-class="opacity-100 translate-y-0 scale-100"
            leave-active-class="transition-all duration-200 ease-in"
            leave-from-class="opacity-100 translate-y-0 scale-100"
            leave-to-class="opacity-0 translate-y-2 scale-95"
        >
            <div
                v-if="toast"
                class="fixed bottom-6 right-6 z-[9999] flex w-full max-w-sm items-start gap-3 rounded-xl border bg-pic-surface px-4 py-3.5 shadow-xl"
                :class="toast.type === 'success' ? 'border-pic-brand-border shadow-[hsl(var(--pic-brand)/0.10)]' : 'border-[hsl(var(--pic-danger)/0.28)] shadow-[hsl(var(--pic-danger)/0.10)]'"
            >
                <div
                    class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                    :class="toast.type === 'success' ? 'bg-pic-brand-soft' : 'bg-[hsl(var(--pic-danger)/0.08)]'"
                >
                    <i
                        class="fa-solid text-sm"
                        :class="toast.type === 'success' ? 'fa-circle-check text-pic-brand' : 'fa-circle-xmark text-pic-danger'"
                    ></i>
                </div>
                <div class="min-w-0 flex-1">
                    <p class="text-sm font-bold" :class="toast.type === 'success' ? 'text-pic-brand' : 'text-pic-danger'">
                        {{ toast.message }}
                    </p>
                    <p v-if="toast.detail" class="mt-0.5 text-xs leading-snug text-pic-text-muted">{{ toast.detail }}</p>
                </div>
                <button @click="toast = null" class="mt-0.5 shrink-0 text-pic-text-muted transition-colors hover:text-pic-text-main">
                    <i class="fa-solid fa-xmark text-xs"></i>
                </button>
            </div>
        </Transition>

        <div class="flex justify-end md:min-h-[56px] md:flex-col md:gap-3 md:border-b md:border-pic-border md:px-4 md:py-3 lg:flex-row lg:items-center lg:justify-between lg:px-6">
            <button
                @click="setCollapsed(!isCollapsed)"
                class="hidden min-w-0 items-center gap-3 text-left md:flex"
                title="Filtros"
            >
                <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-pic-brand text-white shadow-sm shadow-pic-brand/20">
                    <i class="fa-solid" :class="isCollapsed ? 'fa-filter' : 'fa-sliders'"></i>
                </span>
                <span class="min-w-0">
                    <span class="flex items-center gap-2">
                        <span class="text-sm font-black uppercase tracking-wide text-pic-text-main">Filtros</span>
                        <span class="rounded-full bg-pic-muted-surface px-2 py-0.5 text-[11px] font-bold text-pic-text-muted">
                            {{ activeFilterCount }} activos
                        </span>
                    </span>
                    <span class="mt-0.5 block truncate text-xs text-pic-text-muted">
                        {{ periodSummary }}
                    </span>
                </span>
            </button>

            <div class="flex items-center justify-end gap-2 md:hidden">
                <slot name="mobile-actions"></slot>

                <button
                    @click="setCollapsed(!isCollapsed)"
                    class="inline-flex h-9 items-center gap-2 rounded-full border border-pic-brand-border bg-pic-surface px-3 text-sm font-bold text-pic-brand shadow-sm shadow-pic-brand/10 transition-all hover:-translate-y-0.5 hover:bg-pic-brand-soft"
                    :title="isCollapsed ? 'Expandir filtros' : 'Contraer filtros'"
                >
                    <i class="fa-solid fa-filter text-sm"></i>
                    <span>Filtros</span>
                    <span class="grid h-6 min-w-6 place-items-center rounded-full bg-pic-brand px-1.5 text-xs font-black leading-none text-white shadow-sm shadow-pic-brand/25">
                        {{ activeFilterCount }}
                    </span>
                </button>
            </div>

            <div class="hidden flex-wrap items-center gap-2 md:flex lg:justify-end">
                <span
                    class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold"
                    :class="{
                        'border-[hsl(var(--pic-warning)/0.36)] bg-[hsl(var(--pic-warning)/0.10)] text-pic-warning': panelStatus.tone === 'dirty',
                        'border-pic-brand-border bg-pic-brand-soft text-pic-brand': panelStatus.tone === 'ready',
                        'border-pic-border bg-pic-muted-surface text-pic-text-muted': panelStatus.tone === 'idle',
                        'border-[hsl(var(--pic-info)/0.30)] bg-[hsl(var(--pic-info)/0.08)] text-pic-info': panelStatus.tone === 'loading'
                    }"
                >
                    <i
                        class="fa-solid text-[10px]"
                        :class="{
                            'fa-triangle-exclamation': panelStatus.tone === 'dirty',
                            'fa-circle-check': panelStatus.tone === 'ready',
                            'fa-circle-dot': panelStatus.tone === 'idle',
                            'fa-circle-notch fa-spin': panelStatus.tone === 'loading'
                        }"
                    ></i>
                    {{ panelStatus.text }}
                </span>

                <button
                    v-if="!(store.isGerenciaLocked && store.isJefaturaLocked)"
                    @click="handleReset"
                    class="inline-flex h-8 items-center gap-2 rounded-lg border border-transparent px-3 text-xs font-bold text-pic-text-muted transition-all hover:border-[hsl(var(--pic-danger)/0.22)] hover:bg-[hsl(var(--pic-danger)/0.08)] hover:text-pic-danger"
                >
                    <i class="fa-solid fa-trash-can text-[11px] opacity-70"></i>
                    Limpiar
                </button>

                <button
                    @click="handleUpdate"
                    :disabled="store.isGenerating"
                    class="inline-flex h-8 items-center gap-2 rounded-lg bg-pic-brand px-4 text-xs font-black uppercase tracking-wide text-white shadow-md shadow-pic-brand/20 transition-all hover:brightness-95 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
                >
                    <i v-if="store.isGenerating" class="fa-solid fa-circle-notch fa-spin"></i>
                    <i v-else class="fa-solid fa-bolt"></i>
                    {{ applyButtonText }}
                </button>

                <button
                    @click="setCollapsed(!isCollapsed)"
                    class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-pic-brand-border bg-pic-brand-soft text-pic-brand shadow-sm transition-all hover:-translate-y-0.5 hover:bg-pic-brand hover:text-white"
                    :title="isCollapsed ? 'Expandir filtros' : 'Contraer filtros'"
                >
                    <i class="fa-solid" :class="isCollapsed ? 'fa-filter' : 'fa-sliders'"></i>
                </button>
            </div>
        </div>

        <div
            class="transition-all duration-300 ease-in-out"
            :class="[
                isCollapsed ? 'max-h-0 opacity-0 overflow-hidden' : 'max-h-[78vh] opacity-100',
                overflowVisible && !isCollapsed ? 'overflow-visible' : 'overflow-hidden'
            ]"
        >
            <div class="max-h-[calc(78vh-56px)] overflow-y-auto px-0 py-3 md:px-4 lg:px-6 xl:max-h-none xl:overflow-visible">
                <div class="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
                    <section class="rounded-lg border border-pic-border bg-pic-muted-surface p-3">
                        <button
                            @click="toggleMobileSection('comercial')"
                            class="mb-2 flex w-full items-center justify-between border-b border-pic-border pb-2 text-left md:pointer-events-none"
                        >
                            <span class="text-[11px] font-black uppercase tracking-widest text-pic-text-muted">
                                <i class="fa-solid fa-briefcase mr-1 text-pic-brand"></i>
                                Comercial
                            </span>
                            <i class="fa-solid fa-chevron-down text-[10px] text-pic-text-muted transition-transform md:hidden" :class="{ 'rotate-180': mobileSections.comercial }"></i>
                        </button>

                        <div class="space-y-2" :class="mobileSections.comercial ? 'block' : 'hidden md:block'">
                            <FilterDropdown density="compact" label="Canal" :options="store.options.canales" v-model="store.selected.canal" @open-change="handleDropdownOpen" />

                            <div>
                                <FilterDropdown
                                    density="compact"
                                    label="Gerencia"
                                    :options="store.options.gerencias"
                                    v-model="store.selected.Gerencia"
                                    @change="store.handleGerenciaChange"
                                    @open-change="handleDropdownOpen"
                                    :disabled="store.isGerenciaLocked"
                                />
                                <p v-if="store.isGerenciaLocked" class="mt-1 ml-1 flex items-center gap-1 text-[10px] text-pic-brand">
                                    <i class="fa-solid fa-lock text-[9px]"></i>
                                    Restringida
                                </p>
                            </div>

                            <div>
                                <FilterDropdown
                                    density="compact"
                                    label="Jefatura"
                                    :options="store.depOptions.jefaturas"
                                    v-model="store.selected.Jefatura"
                                    :disabled="store.depOptions.jefaturas.length === 0 || store.isJefaturaLocked"
                                    :loading="store.depLoading.jefaturas"
                                    @change="store.handleJefaturaChange"
                                    @open-change="handleDropdownOpen"
                                />
                                <p v-if="store.isJefaturaLocked" class="mt-1 ml-1 flex items-center gap-1 text-[10px] text-pic-brand">
                                    <i class="fa-solid fa-lock text-[9px]"></i>
                                    Restringida
                                </p>
                            </div>

                            <FilterDropdown density="compact" label="Ruta" :options="store.depOptions.rutas" v-model="store.selected.Ruta" :disabled="store.depOptions.rutas.length === 0" :loading="store.depLoading.rutas" @open-change="handleDropdownOpen" />
                        </div>
                    </section>

                    <section class="rounded-lg border border-pic-border bg-pic-muted-surface p-3">
                        <button
                            @click="toggleMobileSection('clientes')"
                            class="mb-2 flex w-full items-center justify-between border-b border-pic-border pb-2 text-left md:pointer-events-none"
                        >
                            <span class="text-[11px] font-black uppercase tracking-widest text-pic-text-muted">
                                <i class="fa-solid fa-users mr-1 text-pic-brand"></i>
                                Clientes
                            </span>
                            <i class="fa-solid fa-chevron-down text-[10px] text-pic-text-muted transition-transform md:hidden" :class="{ 'rotate-180': mobileSections.clientes }"></i>
                        </button>

                        <div class="space-y-2" :class="mobileSections.clientes ? 'block' : 'hidden md:block'">
                            <div>
                                <label class="mb-1 ml-1 block text-[9px] font-bold uppercase tracking-wider text-pic-text-muted">
                                    Seleccion individual
                                </label>
                                <button
                                    @click="showClientModal = true"
                                    class="flex h-8 w-full items-center justify-between rounded-lg border border-pic-border bg-pic-surface px-2.5 text-left text-xs shadow-sm transition-all hover:border-pic-brand-border hover:shadow-md"
                                    :class="{ 'border-pic-brand ring-1 ring-pic-brand-border': store.selectedClients.size > 0 }"
                                >
                                    <span
                                        class="mr-2 truncate font-medium"
                                        :class="store.selectedClients.size > 0 ? 'text-pic-brand' : 'text-pic-text-muted'"
                                    >
                                        <i class="fa-solid fa-magnifying-glass mr-1.5 opacity-50"></i>
                                        {{ clientButtonText }}
                                    </span>
                                    <i
                                        class="fa-solid text-[10px]"
                                        :class="store.selectedClients.size > 0 ? 'fa-check text-pic-brand' : 'fa-arrow-up-right-from-square text-pic-text-muted'"
                                    ></i>
                                </button>
                            </div>

                            <FilterDropdown density="compact" label="Formato Cliente" :options="store.options.formatosCliente" v-model="store.selected.FormatoCliente" @open-change="handleDropdownOpen" />
                        </div>
                    </section>

                    <section class="rounded-lg border border-pic-border bg-pic-muted-surface p-3">
                        <button
                            @click="toggleMobileSection('producto')"
                            class="mb-2 flex w-full items-center justify-between border-b border-pic-border pb-2 text-left md:pointer-events-none"
                        >
                            <span class="text-[11px] font-black uppercase tracking-widest text-pic-text-muted">
                                <i class="fa-solid fa-box-open mr-1 text-pic-brand"></i>
                                Producto
                            </span>
                            <i class="fa-solid fa-chevron-down text-[10px] text-pic-text-muted transition-transform md:hidden" :class="{ 'rotate-180': mobileSections.producto }"></i>
                        </button>

                        <div class="space-y-2" :class="mobileSections.producto ? 'block' : 'hidden md:block'">
                            <FilterDropdown density="compact" label="Marca" :options="store.options.marcas" v-model="store.selected.Marca" @change="store.handleMarcaChange" @open-change="handleDropdownOpen" />
                            <FilterDropdown density="compact" label="Grupo" :options="store.depOptions.grupos" v-model="store.selected.grupo" :disabled="store.depOptions.grupos.length === 0" :loading="store.depLoading.grupos" @change="store.handleGrupoChange" @open-change="handleDropdownOpen" />
                            <FilterDropdown density="compact" label="Categoria" :options="store.depOptions.categorias" v-model="store.selected.Categorias" :disabled="store.depOptions.categorias.length === 0" :loading="store.depLoading.categorias" @open-change="handleDropdownOpen" />
                            <FilterDropdown density="compact" label="SKU" :options="store.depOptions.skus" v-model="store.selected.SKU" :disabled="store.depOptions.skus.length === 0" :loading="store.depLoading.skus" placeholder="Buscar SKU" @open-change="handleDropdownOpen" />
                        </div>
                    </section>

                    <section class="rounded-lg border border-pic-border bg-pic-muted-surface p-3">
                        <button
                            @click="toggleMobileSection('configuracion')"
                            class="mb-2 flex w-full items-center justify-between border-b border-pic-border pb-2 text-left md:pointer-events-none"
                        >
                            <span class="text-[11px] font-black uppercase tracking-widest text-pic-text-muted">
                                <i class="fa-solid fa-gears mr-1 text-pic-brand"></i>
                                Configuracion
                            </span>
                            <i class="fa-solid fa-chevron-down text-[10px] text-pic-text-muted transition-transform md:hidden" :class="{ 'rotate-180': mobileSections.configuracion }"></i>
                        </button>

                        <div class="space-y-2" :class="mobileSections.configuracion ? 'block' : 'hidden md:block'">
                            <FilterDropdown density="compact" label="Transaccion" :options="store.options.transacciones" v-model="store.selected.Transaccion" @open-change="handleDropdownOpen" />
                        </div>
                    </section>

                    <section class="rounded-lg border border-pic-border bg-pic-muted-surface p-3">
                        <button
                            @click="toggleMobileSection('periodo')"
                            class="mb-2 flex w-full items-center justify-between border-b border-pic-border pb-2 text-left md:pointer-events-none"
                        >
                            <span class="text-[11px] font-black uppercase tracking-widest text-pic-text-muted">
                                <i class="fa-regular fa-calendar mr-1 text-pic-brand"></i>
                                Periodo
                            </span>
                            <i class="fa-solid fa-chevron-down text-[10px] text-pic-text-muted transition-transform md:hidden" :class="{ 'rotate-180': mobileSections.periodo }"></i>
                        </button>

                        <div class="space-y-2" :class="mobileSections.periodo ? 'block' : 'hidden md:block'">
                            <FilterDropdown density="compact" label="Anio(s)" :options="store.options.anios" v-model="store.selected.Anio" @open-change="handleDropdownOpen" />

                            <div class="rounded-lg border border-pic-border bg-pic-surface p-2">
                                <div class="mb-2 flex items-center justify-between">
                                    <label class="text-[9px] font-black uppercase tracking-wider text-pic-text-muted">Acotar meses</label>
                                    <button
                                        @click="toggleRangoMeses"
                                        class="relative h-4 w-8 rounded-full transition-colors"
                                        :class="store.selected.usarRangoMeses ? 'bg-pic-brand' : 'bg-pic-border'"
                                        title="Activar o desactivar rango de meses"
                                    >
                                        <span
                                            class="absolute left-0.5 top-0.5 h-3 w-3 rounded-full bg-pic-surface shadow-sm transition-transform"
                                            :class="store.selected.usarRangoMeses ? 'translate-x-4' : 'translate-x-0'"
                                        ></span>
                                    </button>
                                </div>

                                <div class="grid grid-cols-2 gap-2" :class="{ 'pointer-events-none opacity-50': !store.selected.usarRangoMeses }">
                                    <div>
                                        <label class="mb-1 ml-1 block text-[9px] font-bold uppercase tracking-wider text-pic-text-muted">Mes ini</label>
                                        <div class="relative">
                                            <select v-model="store.selected.MesInicial" class="h-8 w-full cursor-pointer appearance-none rounded-lg border border-pic-border bg-pic-surface pl-2 pr-6 text-xs font-medium text-pic-text-main outline-none transition-colors hover:border-pic-brand-border focus:border-pic-brand focus:ring-1 focus:ring-pic-brand-border">
                                                <option v-for="i in 12" :key="'ini-' + i" :value="String(i)">{{ i }}</option>
                                            </select>
                                            <i class="fa-solid fa-chevron-down pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-pic-text-muted"></i>
                                        </div>
                                    </div>
                                    <div>
                                        <label class="mb-1 ml-1 block text-[9px] font-bold uppercase tracking-wider text-pic-text-muted">Mes fin</label>
                                        <div class="relative">
                                            <select v-model="store.selected.MesFinal" class="h-8 w-full cursor-pointer appearance-none rounded-lg border border-pic-border bg-pic-surface pl-2 pr-6 text-xs font-medium text-pic-text-main outline-none transition-colors hover:border-pic-brand-border focus:border-pic-brand focus:ring-1 focus:ring-pic-brand-border">
                                                <option v-for="i in 12" :key="'fin-' + i" :value="String(i)">{{ i }}</option>
                                            </select>
                                            <i class="fa-solid fa-chevron-down pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-pic-text-muted"></i>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>

                <div class="sticky bottom-0 mt-3 flex flex-col gap-2 border-t border-pic-border bg-pic-surface/95 py-3 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
                    <p class="text-xs text-pic-text-muted">
                        Los cambios se aplican solo al presionar
                        <span class="font-bold text-pic-text-main">Aplicar cambios</span>.
                    </p>
                    <div class="flex items-center justify-end gap-2">
                        <button
                            v-if="!(store.isGerenciaLocked && store.isJefaturaLocked)"
                            @click="handleReset"
                            class="inline-flex h-8 items-center gap-2 rounded-lg border border-pic-border px-3 text-xs font-bold text-pic-text-muted transition-all hover:border-[hsl(var(--pic-danger)/0.22)] hover:bg-[hsl(var(--pic-danger)/0.08)] hover:text-pic-danger"
                        >
                            <i class="fa-solid fa-trash-can text-[11px] opacity-70"></i>
                            Limpiar filtros
                        </button>
                        <button
                            @click="handleUpdate"
                            :disabled="store.isGenerating"
                            class="inline-flex h-8 items-center gap-2 rounded-lg bg-pic-brand px-4 text-xs font-black uppercase tracking-wide text-white shadow-md shadow-pic-brand/20 transition-all hover:brightness-95 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
                        >
                            <i v-if="store.isGenerating" class="fa-solid fa-circle-notch fa-spin"></i>
                            <i v-else class="fa-solid fa-bolt"></i>
                            {{ applyButtonText }}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
