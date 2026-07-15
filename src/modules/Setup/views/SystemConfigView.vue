<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useSetupStore } from '../stores/setupStores';
import { useAuthStore } from '@/modules/Auth/views/stores/authStore';
import type { SystemModule, DevStatus, HubFeatureKey, HubMainBlockKey, HubSidebarBlockKey } from '../types/setupTypes';
import NewModuleModal from '../components/NewModuleModal.vue';
import {
    getModuleColorPresetId,
    MODULE_COLOR_PRESETS,
} from '@/modules/Shared/design/moduleStyles';

const setupStore = useSetupStore();
const authStore = useAuthStore();

// Permissions
const isAdmin = computed(() => authStore.isAdmin);

// Edit Modal State
const showModal = ref(false);
const editingModule = ref<SystemModule | null>(null);
const form = ref<Partial<SystemModule>>({});

const showNewModal = ref(false);

onMounted(async () => {
    if (setupStore.modules.length === 0) {
        await setupStore.fetchModules();
    } else {
        await setupStore.fetchModuleColorOverrides();
    }
    setupStore.fetchFeatureFlags();
});

const handleCreateModule = async (payload: Omit<SystemModule, 'ModuleId'>) => {
    await setupStore.createModule(payload);
    showNewModal.value = false;
};

const openEdit = (mod: SystemModule) => {
    editingModule.value = mod;
    form.value = {
        ...mod,
        UsesCustomColors: setupStore.hasModuleColorOverride(mod.ModuleId),
        ModuleColorPreset: getModuleColorPresetId(mod),
    };
    showModal.value = true;
};

const closeEdit = () => {
    showModal.value = false;
    editingModule.value = null;
    form.value = {};
};

const saveEdit = async () => {
    if (editingModule.value && form.value) {
        const { UsesCustomColors, ModuleColorPreset, ...moduleChanges } = form.value;
        const moduleSaved = await setupStore.updateModule(editingModule.value.ModuleId, moduleChanges);
        if (!moduleSaved) return;

        const overrideSaved = await setupStore.setModuleColorOverride(
            editingModule.value.ModuleId,
            Boolean(UsesCustomColors)
        );
        if (overrideSaved) closeEdit();
    }
};

const getStatusColor = (status: DevStatus | undefined) => {
    switch (status) {
        case 'Finished': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
        case 'Maintaining': return 'bg-amber-100 text-amber-700 border-amber-200';
        case 'Development': return 'bg-blue-100 text-blue-700 border-blue-200';
        default: return 'bg-slate-100 text-slate-600 border-slate-200';
    }
};

const isCritical = (mod: SystemModule) => {
    // Definir módulos críticos que NO se pueden desactivar desde la UI
    // 'HUB' es el dashboard principal, 'SETUP' es este mismo módulo
    const CRITICAL_KEYS = ['HUB', 'SETUP'];
    return CRITICAL_KEYS.includes(mod.ModuleKey);
};

const handleToggle = (mod: SystemModule) => {
    if (isCritical(mod)) return;
    setupStore.toggleModuleStatus(mod.ModuleId, !!mod.IsActive);
};

const hubVisibilityControls = computed(() => [
    {
        featureKey: 'hub.kpi_cards' as const,
        settingKey: 'showKpiCards' as const,
        icon: 'fa-solid fa-chart-line',
    },
    {
        featureKey: 'hub.management_tray' as const,
        settingKey: 'showManagementTray' as const,
        icon: 'fa-solid fa-clipboard-check',
    },
    {
        featureKey: 'hub.quick_actions' as const,
        settingKey: 'showQuickActions' as const,
        icon: 'fa-solid fa-bolt',
    },
    {
        featureKey: 'hub.notices_panel' as const,
        settingKey: 'showNoticesPanel' as const,
        icon: 'fa-solid fa-bell',
    },
    {
        featureKey: 'hub.activity_panel' as const,
        settingKey: 'showInfoPanel' as const,
        icon: 'fa-solid fa-table-columns',
    },
].map(control => {
    const feature = setupStore.normalizedFeatureFlags.find(item => item.FeatureKey === control.featureKey);
    return {
        ...control,
        feature,
        title: feature?.FeatureName || control.featureKey,
        description: feature?.Description || 'Bloque informativo del Hub Central.',
        enabled: !!feature?.IsEnabled,
        minAccessLevel: feature?.MinAccessLevel || 4,
        requiresDataScope: feature?.RequiresDataScope ?? true,
    };
}));

const handleHubVisibilityToggle = (setting: 'showKpiCards' | 'showManagementTray' | 'showQuickActions' | 'showNoticesPanel' | 'showInfoPanel', value: boolean) => {
    if (!isAdmin.value) return;
    setupStore.updateHubDisplaySetting(setting, value);
};

const handleHubMinLevelChange = (featureKey: HubFeatureKey, event: Event) => {
    const value = Number((event.target as HTMLSelectElement).value);
    setupStore.updateFeatureFlag(featureKey, { MinAccessLevel: value });
};

type HubLayoutArea = 'main' | 'sidebar';

const mainLayoutControls: Record<HubMainBlockKey, { label: string; icon: string }> = {
    kpi_cards: { label: 'KPIs', icon: 'fa-solid fa-chart-line' },
    management_tray: { label: 'Bandeja', icon: 'fa-solid fa-clipboard-check' },
};

const sidebarLayoutControls: Record<HubSidebarBlockKey, { label: string; icon: string }> = {
    notices_panel: { label: 'Avisos', icon: 'fa-solid fa-bell' },
    activity_panel: { label: 'Actividad', icon: 'fa-regular fa-clock' },
    quick_actions: { label: 'Acciones', icon: 'fa-solid fa-bolt' },
};

const draggedLayoutItem = ref<{ area: HubLayoutArea; key: HubMainBlockKey | HubSidebarBlockKey } | null>(null);

const mainLayoutItems = computed(() => setupStore.hubDisplaySettings.mainBlockOrder.map((key: HubMainBlockKey) => ({
    key,
    ...mainLayoutControls[key],
})));

const sidebarLayoutItems = computed(() => setupStore.hubDisplaySettings.sidebarBlockOrder.map((key: HubSidebarBlockKey) => ({
    key,
    ...sidebarLayoutControls[key],
})));

const getLayoutOrder = (area: HubLayoutArea) => area === 'main'
    ? [...setupStore.hubDisplaySettings.mainBlockOrder]
    : [...setupStore.hubDisplaySettings.sidebarBlockOrder];

const handleLayoutDragStart = (area: HubLayoutArea, key: HubMainBlockKey | HubSidebarBlockKey, event: DragEvent) => {
    if (!isAdmin.value) return;
    draggedLayoutItem.value = { area, key };
    if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', key);
    }
};

const handleLayoutDrop = (area: HubLayoutArea, targetKey: HubMainBlockKey | HubSidebarBlockKey) => {
    if (!isAdmin.value || !draggedLayoutItem.value || draggedLayoutItem.value.area !== area) return;

    const nextOrder = getLayoutOrder(area);
    const fromIndex = nextOrder.indexOf(draggedLayoutItem.value.key as never);
    const toIndex = nextOrder.indexOf(targetKey as never);

    if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) {
        draggedLayoutItem.value = null;
        return;
    }

    const [movedItem] = nextOrder.splice(fromIndex, 1);
    if (!movedItem) return;
    nextOrder.splice(toIndex, 0, movedItem);
    setupStore.setHubLayoutOrder(area, nextOrder);
    draggedLayoutItem.value = null;
};

const handleLayoutDragEnd = () => {
    draggedLayoutItem.value = null;
};

const moveLayoutItem = (area: HubLayoutArea, key: HubMainBlockKey | HubSidebarBlockKey, direction: -1 | 1) => {
    if (!isAdmin.value) return;
    const currentOrder = getLayoutOrder(area);
    const currentIndex = currentOrder.indexOf(key as never);
    if (currentIndex === -1) return;
    setupStore.updateHubLayoutOrder(area, key, currentIndex + direction);
};

const applyModuleColorPreset = (presetId: string) => {
    if (!form.value) return;
    const preset = MODULE_COLOR_PRESETS.find(item => item.id === presetId);
    if (!preset) return;

    form.value.ModuleColorPreset = preset.id;
    form.value.IconColor = preset.color;
    form.value.BgColor = preset.bg;
};
</script>

<template>
  <div class="h-full overflow-y-auto">
    <div class="p-6 max-w-7xl mx-auto">
    
    <div class="flex items-center justify-between mb-8">
        <div>
            <h1 class="text-2xl font-bold text-slate-800">Configuración del Sistema</h1>
            <p class="text-slate-500">Gestión de módulos, permisos y visibilidad.</p>
        </div>
        <div class="text-right flex items-center justify-end gap-4">
             <span class="text-xs px-2 py-1 rounded bg-slate-100 text-slate-500 font-mono">
                Admin Mode: {{ isAdmin ? 'ON' : 'OFF' }}
             </span>
             <button
                 v-if="isAdmin"
                 @click="showNewModal = true"
                 class="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 shadow-sm"
             >
                 <i class="fa-solid fa-plus"></i>
                 <span>Nuevo Módulo</span>
             </button>
        </div>
    </div>

    <section class="mb-8 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div class="flex min-w-0 items-start gap-3">
                <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-red-100 bg-red-50 text-red-600">
                    <i class="fa-solid fa-swatchbook"></i>
                </span>
                <div class="min-w-0">
                    <p class="text-[10px] font-black uppercase text-red-600">UI Standards</p>
                    <h2 class="mt-1 text-sm font-black text-slate-900">Configuracion UI y catalogo STD</h2>
                    <p class="mt-1 text-xs font-semibold leading-5 text-slate-500">
                        Accede a la paleta activa, tokens frontend, componentes STD, patrones de dashboard y ejemplos ECharts.
                    </p>
                </div>
            </div>
            <router-link
                to="/admin/ui-standards"
                class="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-red-600 bg-red-600 px-4 text-sm font-black text-white transition hover:bg-red-700 sm:w-auto"
            >
                <i class="fa-solid fa-arrow-up-right-from-square"></i>
                Abrir UI Standards
            </router-link>
        </div>
    </section>

    <!-- HUB DISPLAY SETTINGS -->
    <section class="mb-8 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div class="mb-5 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
                <p class="text-xs font-bold uppercase tracking-[0.18em] text-brand-600">Hub Central</p>
                <h2 class="mt-1 text-lg font-bold text-slate-800">Visibilidad de bloques informativos</h2>
                <p class="mt-1 text-sm text-slate-500">
                    Controla los bloques placeholder del Hub mientras se liberan versiones completas o se restringe informacion por usuario.
                </p>
            </div>
            <span class="inline-flex w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">
                Backend + overrides
            </span>
        </div>

        <div class="mb-5 rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-3">
            <div class="mb-3 flex items-center justify-between gap-3">
                <p class="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Orden del Hub</p>
                <span class="text-[11px] font-semibold text-slate-400">Preferencia local</span>
            </div>

            <div class="grid grid-cols-1 gap-3 xl:grid-cols-2">
                <div class="min-w-0">
                    <p class="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Centro</p>
                    <div class="flex flex-wrap gap-2">
                        <div
                            v-for="(item, index) in mainLayoutItems"
                            :key="item.key"
                            :draggable="isAdmin"
                            class="group flex h-9 min-w-[132px] items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 text-xs font-bold text-slate-700 shadow-sm transition"
                            :class="draggedLayoutItem?.key === item.key ? 'opacity-50 ring-2 ring-brand-200' : 'hover:border-brand-200 hover:shadow'"
                            @dragstart="handleLayoutDragStart('main', item.key, $event)"
                            @dragover.prevent
                            @drop.prevent="handleLayoutDrop('main', item.key)"
                            @dragend="handleLayoutDragEnd"
                        >
                            <span class="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-slate-100 text-[10px] text-slate-400 group-hover:text-brand-600">
                                <i class="fa-solid fa-grip-vertical"></i>
                            </span>
                            <span class="flex min-w-0 flex-1 items-center gap-1.5">
                                <i :class="[item.icon, 'text-brand-600']"></i>
                                <span class="truncate">{{ item.label }}</span>
                            </span>
                            <button
                                type="button"
                                :disabled="!isAdmin || index === 0"
                                class="flex h-6 w-6 shrink-0 items-center justify-center rounded text-slate-400 transition hover:bg-slate-100 hover:text-brand-600 disabled:cursor-not-allowed disabled:opacity-30"
                                title="Subir"
                                @click="moveLayoutItem('main', item.key, -1)"
                            >
                                <i class="fa-solid fa-chevron-left text-[10px]"></i>
                            </button>
                            <button
                                type="button"
                                :disabled="!isAdmin || index === mainLayoutItems.length - 1"
                                class="flex h-6 w-6 shrink-0 items-center justify-center rounded text-slate-400 transition hover:bg-slate-100 hover:text-brand-600 disabled:cursor-not-allowed disabled:opacity-30"
                                title="Bajar"
                                @click="moveLayoutItem('main', item.key, 1)"
                            >
                                <i class="fa-solid fa-chevron-right text-[10px]"></i>
                            </button>
                        </div>
                    </div>
                </div>

                <div class="min-w-0">
                    <p class="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Lateral</p>
                    <div class="flex flex-wrap gap-2">
                        <div
                            v-for="(item, index) in sidebarLayoutItems"
                            :key="item.key"
                            :draggable="isAdmin"
                            class="group flex h-9 min-w-[132px] items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 text-xs font-bold text-slate-700 shadow-sm transition"
                            :class="draggedLayoutItem?.key === item.key ? 'opacity-50 ring-2 ring-brand-200' : 'hover:border-brand-200 hover:shadow'"
                            @dragstart="handleLayoutDragStart('sidebar', item.key, $event)"
                            @dragover.prevent
                            @drop.prevent="handleLayoutDrop('sidebar', item.key)"
                            @dragend="handleLayoutDragEnd"
                        >
                            <span class="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-slate-100 text-[10px] text-slate-400 group-hover:text-brand-600">
                                <i class="fa-solid fa-grip-vertical"></i>
                            </span>
                            <span class="flex min-w-0 flex-1 items-center gap-1.5">
                                <i :class="[item.icon, 'text-brand-600']"></i>
                                <span class="truncate">{{ item.label }}</span>
                            </span>
                            <button
                                type="button"
                                :disabled="!isAdmin || index === 0"
                                class="flex h-6 w-6 shrink-0 items-center justify-center rounded text-slate-400 transition hover:bg-slate-100 hover:text-brand-600 disabled:cursor-not-allowed disabled:opacity-30"
                                title="Subir"
                                @click="moveLayoutItem('sidebar', item.key, -1)"
                            >
                                <i class="fa-solid fa-chevron-left text-[10px]"></i>
                            </button>
                            <button
                                type="button"
                                :disabled="!isAdmin || index === sidebarLayoutItems.length - 1"
                                class="flex h-6 w-6 shrink-0 items-center justify-center rounded text-slate-400 transition hover:bg-slate-100 hover:text-brand-600 disabled:cursor-not-allowed disabled:opacity-30"
                                title="Bajar"
                                @click="moveLayoutItem('sidebar', item.key, 1)"
                            >
                                <i class="fa-solid fa-chevron-right text-[10px]"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <article
                v-for="control in hubVisibilityControls"
                :key="control.featureKey"
                class="rounded-lg border border-slate-200 bg-slate-50/60 p-4"
            >
                <div class="flex items-start justify-between gap-4">
                    <div class="flex min-w-0 items-start gap-3">
                        <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                            <i :class="control.icon"></i>
                        </span>
                        <div class="min-w-0">
                            <h3 class="font-bold text-slate-800">{{ control.title }}</h3>
                            <p class="mt-1 text-sm leading-5 text-slate-500">{{ control.description }}</p>
                        </div>
                    </div>

                    <button
                        type="button"
                        :disabled="!isAdmin"
                        class="relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
                        :class="[
                            control.enabled ? 'bg-brand-600' : 'bg-slate-300',
                            isAdmin ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'
                        ]"
                        :aria-pressed="control.enabled"
                        :title="isAdmin ? 'Alternar visibilidad global' : 'Solo administradores'"
                        @click="handleHubVisibilityToggle(control.settingKey, !control.enabled)"
                    >
                        <span
                            class="inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform"
                            :class="control.enabled ? 'translate-x-6' : 'translate-x-1'"
                        />
                    </button>
                </div>

                <div class="mt-4 grid grid-cols-1 gap-3 border-t border-slate-200 pt-4 sm:grid-cols-2">
                    <label class="block">
                        <span class="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Nivel minimo</span>
                        <select
                            :value="control.minAccessLevel"
                            :disabled="!isAdmin"
                            class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-60"
                            @change="handleHubMinLevelChange(control.featureKey, $event)"
                        >
                            <option :value="1">1 - Jefe</option>
                            <option :value="2">2 - Gerente</option>
                            <option :value="3">3 - Administrador</option>
                            <option :value="4">4 - SuperAdmin</option>
                        </select>
                    </label>
                    <div>
                        <span class="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Alcance de datos</span>
                        <div class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600">
                            {{ control.requiresDataScope ? 'Gerencia / Jefatura' : 'Global' }}
                        </div>
                    </div>
                </div>
            </article>
        </div>
    </section>

    <!-- MODULES TABLE -->
    <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div class="overflow-x-auto">
            <table class="w-full text-left text-sm text-slate-600">
                <thead class="bg-slate-50 border-b border-slate-200 text-xs uppercase font-semibold text-slate-500">
                    <tr>
                        <th class="px-6 py-4">Módulo</th>
                        <th class="px-6 py-4">Categoría</th>
                        <th class="px-6 py-4 text-center">Nivel Min.</th>
                        <th class="px-6 py-4 text-center">Estado Dev</th>
                        <th class="px-6 py-4 text-center">Activo</th>
                        <th v-if="isAdmin" class="px-6 py-4 text-right">Acciones</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                    <tr v-for="mod in setupStore.modules" :key="mod.ModuleId" class="hover:bg-slate-50transition-colors">
                        
                        <!-- Module Info -->
                        <td class="px-6 py-4">
                            <div class="flex items-center gap-3">
                                <div class="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 text-lg">
                                    <i :class="mod.Icon"></i>
                                </div>
                                <div>
                                    <p class="font-bold text-slate-800">{{ mod.Label }}</p>
                                    <p class="text-xs text-slate-400 font-mono">{{ mod.ModuleKey }}</p>
                                </div>
                            </div>
                        </td>

                        <!-- Category -->
                        <td class="px-6 py-4">
                            <span class="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                                {{ mod.Category }}
                            </span>
                        </td>

                        <!-- Min Level -->
                        <td class="px-6 py-4 text-center">
                            <span class="font-bold text-slate-700">{{ mod.MinRoleLevel }}</span>
                        </td>

                        <!-- Dev Status -->
                        <td class="px-6 py-4 text-center">
                            <span class="px-3 py-1 rounded-full text-xs font-bold border" :class="getStatusColor(mod.DevStatus)">
                                {{ mod.DevStatus || 'N/A' }}
                            </span>
                        </td>

                        <!-- Active Toggle -->
                        <td class="px-6 py-4 text-center">
                            <div class="flex justify-center">
                                <button 
                                    v-if="isAdmin"
                                    @click="handleToggle(mod)"
                                    :disabled="isCritical(mod)"
                                    class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
                                    :class="[
                                        mod.IsActive ? 'bg-brand-600' : 'bg-slate-200',
                                        isCritical(mod) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                                    ]"
                                    :title="isCritical(mod) ? 'Módulo Crítico (No se puede desactivar)' : 'Alternar Estado'"
                                >
                                    <span 
                                        class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
                                        :class="mod.IsActive ? 'translate-x-6' : 'translate-x-1'"
                                    />
                                </button>
                                <span v-else class="text-xs font-bold" :class="mod.IsActive ? 'text-green-600' : 'text-slate-400'">
                                    {{ mod.IsActive ? 'Sí' : 'No' }}
                                </span>
                            </div>
                        </td>

                        <!-- Actions -->
                        <td v-if="isAdmin" class="px-6 py-4 text-right">
                            <button 
                                @click="openEdit(mod)" 
                                class="text-slate-400 hover:text-brand-600 p-2 rounded-lg hover:bg-brand-50 transition-colors"
                            >
                                <i class="fa-solid fa-pen-to-square"></i>
                            </button>
                        </td>

                    </tr>
                </tbody>
            </table>
        </div>
    </div>

    <!-- EDIT MODAL -->
    <Teleport to="body">
    <div v-if="showModal" class="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
        <div class="max-h-[calc(100vh-2rem)] w-full max-w-md overflow-y-auto rounded-2xl bg-white shadow-xl animate-in fade-in zoom-in duration-200">
            
            <div class="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-3 sm:px-6 sm:py-4">
                <h3 class="font-bold text-lg text-slate-800">Editar Módulo</h3>
                <button @click="closeEdit" class="text-slate-400 hover:text-red-500">
                    <i class="fa-solid fa-xmark text-xl"></i>
                </button>
            </div>

            <div class="space-y-4 p-5 sm:p-6">
                
                <div>
                    <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Nombre (Label)</label>
                    <input v-model="form.Label" type="text" class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none transition-all">
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Categoría</label>
                        <select v-model="form.Category" class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none bg-white">
                            <option value="Analítica">Analítica</option>
                            <option value="Gestión">Gestión</option>
                            <option value="Sistema">Sistema</option>
                            <option value="Otro">Otro</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Min. Role Level</label>
                        <input v-model="form.MinRoleLevel" type="number" min="1" max="4" class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none">
                    </div>
                </div>

                <div>
                    <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Estado Desarrollo</label>
                    <select v-model="form.DevStatus" class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none bg-white">
                        <option value="Development">Development 🚧</option>
                        <option value="Maintaining">Maintaining 🛠️</option>
                        <option value="Finished">Finished ✅</option>
                    </select>
                </div>

                <div>
                    <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Icono (FontAwesome)</label>
                    <div class="flex gap-2">
                         <div class="w-10 h-10 rounded bg-slate-100 flex items-center justify-center shrink-0 text-slate-600">
                            <i :class="form.Icon"></i>
                         </div>
                        <input v-model="form.Icon" type="text" placeholder="fa-solid fa-cube" class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none text-sm font-mono text-slate-500">
                    </div>
                </div>

                <div>
                    <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Descripción del Módulo</label>
                    <textarea 
                        v-model="form.Description" 
                        rows="3" 
                        placeholder="Breve descripción de la funcionalidad del módulo..."
                        class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none text-sm transition-all"
                    ></textarea>
                </div>

                <section class="rounded-xl border border-pic-border bg-pic-muted-surface p-4">
                    <div class="flex items-start justify-between gap-4">
                        <div>
                            <p class="text-xs font-black uppercase tracking-wide text-pic-text-main">Color de tarjeta</p>
                            <p class="mt-1 text-xs font-medium leading-5 text-pic-text-muted">
                                Por defecto usa el tema global. Activa una excepción solo cuando este módulo necesite distinguirse.
                            </p>
                        </div>
                        <button
                            type="button"
                            class="relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-pic-brand-border"
                            :class="form.UsesCustomColors ? 'bg-pic-brand' : 'bg-slate-300'"
                            :aria-pressed="Boolean(form.UsesCustomColors)"
                            @click="form.UsesCustomColors = !form.UsesCustomColors"
                        >
                            <span class="inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform" :class="form.UsesCustomColors ? 'translate-x-6' : 'translate-x-1'"></span>
                        </button>
                    </div>

                    <div v-if="form.UsesCustomColors" class="mt-4 border-t border-pic-border pt-4">
                        <label class="block text-xs font-bold uppercase tracking-wide text-pic-text-muted">Acento de módulo</label>
                        <div class="mt-2 flex items-center gap-3">
                            <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" :class="form.BgColor || 'bg-pic-module-bg'">
                                <i :class="[form.Icon || 'fa-solid fa-cube', form.IconColor || 'text-pic-module']"></i>
                            </span>
                            <p class="text-xs font-semibold text-pic-text-muted">Selecciona uno de los acentos configurados en UI Standards.</p>
                        </div>
                        <div class="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5" role="radiogroup" aria-label="Combinaciones de acento de módulo">
                            <button
                                v-for="preset in MODULE_COLOR_PRESETS"
                                :key="preset.id"
                                type="button"
                                class="group flex min-h-[76px] flex-col items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-center transition focus:outline-none focus:ring-2 focus:ring-pic-brand-border"
                                :class="form.ModuleColorPreset === preset.id
                                    ? 'border-pic-brand bg-pic-surface shadow-sm ring-1 ring-pic-brand-border'
                                    : 'border-pic-border bg-pic-surface hover:border-pic-brand-border hover:bg-pic-muted-surface'"
                                :aria-pressed="form.ModuleColorPreset === preset.id"
                                @click="applyModuleColorPreset(preset.id)"
                            >
                                <span class="flex h-8 w-8 items-center justify-center rounded-lg" :class="preset.bg">
                                    <i :class="[form.Icon || 'fa-solid fa-cube', preset.color]"></i>
                                </span>
                                <span class="text-[10px] font-bold leading-none text-pic-text-main">{{ preset.label }}</span>
                            </button>
                        </div>
                        <p class="mt-2 text-[11px] font-medium text-pic-text-muted">
                            Cada combinación usa su par sólido y suave de <span class="font-semibold text-pic-text-main">Acentos de módulo</span>, configurables en UI Standards. El título conserva el token global de texto de la Tarjeta Hub.
                        </p>
                    </div>
                    <p v-else class="mt-3 text-[11px] font-semibold text-pic-brand">
                        Este módulo usa <span class="font-mono">--pic-module</span>, <span class="font-mono">--pic-module-bg</span>, <span class="font-mono">--pic-module-text</span> y <span class="font-mono">--pic-module-soft</span>.
                    </p>
                </section>

            </div>

            <div class="flex justify-end gap-3 border-t border-slate-100 bg-slate-50 px-5 py-3 sm:px-6 sm:py-4">
                <button @click="closeEdit" class="px-4 py-2 text-slate-500 font-medium hover:bg-slate-100 rounded-lg transition-colors">
                    Cancelar
                </button>
                <button @click="saveEdit" class="px-4 py-2 bg-brand-600 text-white font-medium rounded-lg hover:bg-brand-700 shadow-sm transition-colors">
                    Guardar Cambios
                </button>
            </div>

        </div>
    </div>
    </Teleport>

    <!-- CREATE MODAL -->
    <NewModuleModal
        v-if="showNewModal"
        @close="showNewModal = false"
        @save="handleCreateModule"
    />

    </div>
  </div>
</template>
