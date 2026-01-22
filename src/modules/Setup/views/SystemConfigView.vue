<script setup lang="ts">
import { ref, computed } from 'vue';
import { useSetupStore } from '../stores/setupStores';
import { useAuthStore } from '@/modules/Auth/views/stores/authStore';
import type { SystemModule, DevStatus } from '../types/setupTypes';

const setupStore = useSetupStore();
const authStore = useAuthStore();

// Permissions
const isAdmin = computed(() => (authStore.user?.role === 'Admin'));

// Edit Modal State
const showModal = ref(false);
const editingModule = ref<SystemModule | null>(null);
const form = ref<Partial<SystemModule>>({});

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
</script>

<template>
  <div class="p-6 max-w-7xl mx-auto">
    
    <div class="flex items-center justify-between mb-8">
        <div>
            <h1 class="text-2xl font-bold text-slate-800">Configuración del Sistema</h1>
            <p class="text-slate-500">Gestión de módulos, permisos y visibilidad.</p>
        </div>
        <div class="text-right">
             <span class="text-xs px-2 py-1 rounded bg-slate-100 text-slate-500 font-mono">
                Admin Mode: {{ isAdmin ? 'ON' : 'OFF' }}
             </span>
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
                                    @click="setupStore.toggleModuleStatus(mod.ModuleId, !!mod.IsActive)"
                                    class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
                                    :class="mod.IsActive ? 'bg-brand-600' : 'bg-slate-200'"
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
        <div class="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            
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
                        <input v-model="form.MinRoleLevel" type="number" min="1" max="3" class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none">
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
                        <input v-model="form.Icon" type="text" class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none text-sm font-mono text-slate-500">
                    </div>
                </div>

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

  </div>
</template>
