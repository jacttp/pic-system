<script setup lang="ts">
import { ref } from 'vue';
import type { SystemModule } from '../types/setupTypes';

const emit = defineEmits<{
    (e: 'close'): void,
    (e: 'save', payload: Omit<SystemModule, 'ModuleId'>): void
}>();

const form = ref<Omit<SystemModule, 'ModuleId'>>({
    ModuleKey: '',
    Label: '',
    Route: '',
    Icon: 'fa-solid fa-cube',
    Category: 'Otro',
    DisplayOrder: 99,
    MinRoleLevel: 1,
    IsActive: true,
    DevStatus: 'Development',
    Scope: 'Global',
    Description: '',
    IconColor: 'text-slate-500',
    BgColor: 'bg-slate-50'
});

const handleSave = () => {
    emit('save', form.value);
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
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
        <div class="bg-white rounded-2xl shadow-xl w-full max-w-lg animate-in fade-in zoom-in duration-200">
            
            <div class="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 class="font-bold text-lg text-slate-800">Nuevo Módulo</h3>
                <button @click="emit('close')" class="text-slate-400 hover:text-red-500">
                    <i class="fa-solid fa-xmark text-xl"></i>
                </button>
            </div>

            <div class="p-6 space-y-4 max-h-[70vh] overflow-y-auto pb-40">
                
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Module Key</label>
                        <input v-model="form.ModuleKey" type="text" placeholder="Ej. INVENTORY" class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none transition-all uppercase font-mono">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Nombre (Label)</label>
                        <input v-model="form.Label" type="text" placeholder="Ej. Inventario" class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none transition-all">
                    </div>
                </div>

                <div>
                    <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Ruta (Route)</label>
                    <input v-model="form.Route" type="text" placeholder="Ej. /admin/inventory" class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none transition-all font-mono text-sm">
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Categoría</label>
                        <select v-model="form.Category" class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none bg-white text-sm">
                            <option value="Analítica">Analítica</option>
                            <option value="Gestión">Gestión</option>
                            <option value="Sistema">Sistema</option>
                            <option value="Otro">Otro</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Estado Desarrollo</label>
                        <select v-model="form.DevStatus" class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none bg-white text-sm">
                            <option value="Development">Development 🚧</option>
                            <option value="Maintaining">Maintaining 🛠️</option>
                            <option value="Finished">Finished ✅</option>
                        </select>
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Icono (FontAwesome)</label>
                        <div class="flex gap-2">
                            <div class="w-10 h-10 rounded bg-slate-100 flex items-center justify-center shrink-0 text-slate-600">
                                <i :class="form.Icon"></i>
                            </div>
                            <input v-model="form.Icon" type="text" class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none text-sm font-mono text-slate-500">
                        </div>
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Display Order</label>
                        <input v-model.number="form.DisplayOrder" type="number" class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none transition-all">
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
                                <div :class="[form.IconColor || 'text-slate-500']" class="text-xl w-6 flex justify-center shrink-0">
                                    <i :class="form.Icon"></i>
                                </div>
                                <input 
                                    v-model="form.IconColor" 
                                    placeholder="text-brand-600"
                                    class="w-full bg-transparent focus:outline-none text-xs font-mono"
                                    @focus="activeDropdown = 'new-icon'"
                                >
                                <button @click="toggleDropdown('new-icon')" type="button" class="text-slate-400 hover:text-slate-600">
                                    <i class="fa-solid fa-chevron-down text-[10px]"></i>
                                </button>
                            </div>

                            <!-- Custom Dropdown -->
                            <div v-if="activeDropdown === 'new-icon'" class="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg p-2 grid grid-cols-5 gap-1 animate-in fade-in slide-in-from-top-1">
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
                                    @focus="activeDropdown = 'new-bg'"
                                >
                                <button @click="toggleDropdown('new-bg')" type="button" class="text-slate-400 hover:text-slate-600">
                                    <i class="fa-solid fa-chevron-down text-[10px]"></i>
                                </button>
                            </div>

                            <!-- Custom Dropdown -->
                            <div v-if="activeDropdown === 'new-bg'" class="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg p-2 grid grid-cols-5 gap-1 animate-in fade-in slide-in-from-top-1">
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
                
                <div class="grid grid-cols-3 gap-4">
                    <div>
                        <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Min Role Level</label>
                        <input v-model.number="form.MinRoleLevel" type="number" min="1" max="4" class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none transition-all">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Scope</label>
                        <select v-model="form.Scope" class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none bg-white text-sm">
                            <option value="Global">Global</option>
                            <option value="Admin">Admin</option>
                        </select>
                    </div>
                    <div class="flex flex-col justify-center items-center h-full pt-4 relative">
                        <label class="flex items-center gap-2 cursor-pointer relative">
                            <input type="checkbox" v-model="form.IsActive" class="sr-only peer">
                            <div class="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:bg-brand-600 after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full peer-checked:after:border-white"></div>
                            <span class="text-xs font-bold text-slate-500 uppercase">Activo</span>
                        </label>
                    </div>
                </div>

            </div>

            <div class="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                <button @click="emit('close')" class="px-4 py-2 text-slate-500 font-medium hover:bg-slate-100 rounded-lg transition-colors">
                    Cancelar
                </button>
                <button @click="handleSave" :disabled="!form.ModuleKey || !form.Label || !form.Route" class="px-4 py-2 bg-brand-600 text-white font-medium rounded-lg hover:bg-brand-700 shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    Crear Módulo
                </button>
            </div>

        </div>
    </div>
</template>
