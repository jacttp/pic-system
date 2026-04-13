<script setup lang="ts">
import { ref, computed } from 'vue';
import { useSetupStore } from '../stores/setupStores';
import { useAuthStore } from '@/modules/Auth/views/stores/authStore';
import type { SystemModule, DevStatus } from '../types/setupTypes';
import NewModuleModal from '../components/NewModuleModal.vue';

const setupStore = useSetupStore();
const authStore = useAuthStore();

// Permissions
const isAdmin = computed(() => authStore.isAdmin);

// Edit Modal State
const showModal = ref(false);
const editingModule = ref<SystemModule | null>(null);
const form = ref<Partial<SystemModule>>({});

const showNewModal = ref(false);

const handleCreateModule = async (payload: Omit<SystemModule, 'ModuleId'>) => {
    await setupStore.createModule(payload);
    showNewModal.value = false;
};

const openEdit = (mod: SystemModule) => {
    editingModule.value = mod;
    form.value = { ...mod };
    showModal.value = true;
};

const closeEdit = () => {
    showModal.value = false;
    editingModule.value = null;
    form.value = {};
};

const saveEdit = async () => {
    if (editingModule.value && form.value) {
        await setupStore.updateModule(editingModule.value.ModuleId, form.value);
        closeEdit();
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

// Custom Dropdown Logic
const activeDropdown = ref<string | null>(null);
const toggleDropdown = (id: string) => {
    if (activeDropdown.value === id) activeDropdown.value = null;
    else activeDropdown.value = id;
};

const selectColor = (field: 'IconColor' | 'BgColor', value: string) => {
    if (form.value) form.value[field] = value;
    activeDropdown.value = null;
};

const PRESET_ICON_COLORS = [
    'text-brand-600', 'text-orange-500', 'text-emerald-500', 'text-purple-500', 
    'text-rose-800', 'text-indigo-500', 'text-lime-600', 'text-teal-600', 
    'text-pink-500', 'text-slate-500'
];

const PRESET_BG_COLORS = [
    'bg-brand-50', 'bg-orange-50', 'bg-emerald-50', 'bg-purple-50', 
    'bg-fuchsia-50', 'bg-slate-100', 'bg-lime-50', 'bg-teal-50', 
    'bg-pink-50', 'bg-slate-50'
];
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
    <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
        <div class="bg-white rounded-2xl shadow-xl w-full max-w-md animate-in fade-in zoom-in duration-200">
            
            <div class="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 class="font-bold text-lg text-slate-800">Editar Módulo</h3>
                <button @click="closeEdit" class="text-slate-400 hover:text-red-500">
                    <i class="fa-solid fa-xmark text-xl"></i>
                </button>
            </div>

            <div class="p-6 space-y-4">
                
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

                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Color Icono (Tailwind)</label>
                        <div class="relative">
                            <div class="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg focus-within:ring-2 focus-within:ring-brand-500 bg-white transition-all">
                                <div :class="[form.IconColor || 'text-slate-500']" class="text-lg w-6 flex justify-center shrink-0">
                                    <i :class="form.Icon"></i>
                                </div>
                                <input 
                                    v-model="form.IconColor" 
                                    placeholder="text-brand-600"
                                    class="w-full bg-transparent focus:outline-none text-xs font-mono"
                                    @focus="activeDropdown = 'icon'"
                                >
                                <button @click="toggleDropdown('icon')" type="button" class="text-slate-400 hover:text-slate-600">
                                    <i class="fa-solid fa-chevron-down text-[10px]"></i>
                                </button>
                            </div>

                            <!-- Custom Dropdown -->
                            <div v-if="activeDropdown === 'icon'" class="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg p-2 grid grid-cols-5 gap-1 animate-in fade-in slide-in-from-top-1">
                                <button 
                                    v-for="color in PRESET_ICON_COLORS" 
                                    :key="color"
                                    type="button"
                                    @click="selectColor('IconColor', color)"
                                    class="w-8 h-8 rounded flex items-center justify-center hover:bg-slate-50 border border-slate-100 transition-colors"
                                    :title="color"
                                >
                                    <i :class="['fa-solid fa-circle', color]"></i>
                                </button>
                                <div class="col-span-full border-t border-slate-100 mt-1 pt-1 text-[10px] text-slate-400 text-center">O escribe arriba</div>
                            </div>
                        </div>
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Color Fondo (Tailwind)</label>
                        <div class="relative">
                            <div class="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg focus-within:ring-2 focus-within:ring-brand-500 bg-white transition-all">
                                <div :class="[form.BgColor || 'bg-slate-50']" class="w-6 h-6 rounded border border-slate-100 shrink-0"></div>
                                <input 
                                    v-model="form.BgColor" 
                                    placeholder="bg-brand-50"
                                    class="w-full bg-transparent focus:outline-none text-xs font-mono"
                                    @focus="activeDropdown = 'bg'"
                                >
                                <button @click="toggleDropdown('bg')" type="button" class="text-slate-400 hover:text-slate-600">
                                    <i class="fa-solid fa-chevron-down text-[10px]"></i>
                                </button>
                            </div>

                            <!-- Custom Dropdown -->
                            <div v-if="activeDropdown === 'bg'" class="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg p-2 grid grid-cols-5 gap-1 animate-in fade-in slide-in-from-top-1">
                                <button 
                                    v-for="color in PRESET_BG_COLORS" 
                                    :key="color"
                                    type="button"
                                    @click="selectColor('BgColor', color)"
                                    class="w-8 h-8 rounded border border-slate-200 hover:border-brand-500 transition-all"
                                    :class="color"
                                    :title="color"
                                ></button>
                                <div class="col-span-full border-t border-slate-100 mt-1 pt-1 text-[10px] text-slate-400 text-center">O escribe arriba</div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Click outside listener for dropdowns -->
                <div v-if="activeDropdown" class="fixed inset-0 z-40" @click="activeDropdown = null"></div>

            </div>

            <div class="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                <button @click="closeEdit" class="px-4 py-2 text-slate-500 font-medium hover:bg-slate-100 rounded-lg transition-colors">
                    Cancelar
                </button>
                <button @click="saveEdit" class="px-4 py-2 bg-brand-600 text-white font-medium rounded-lg hover:bg-brand-700 shadow-sm transition-colors">
                    Guardar Cambios
                </button>
            </div>

        </div>
    </div>

    <!-- CREATE MODAL -->
    <NewModuleModal
        v-if="showNewModal"
        @close="showNewModal = false"
        @save="handleCreateModule"
    />

    </div>
  </div>
</template>
