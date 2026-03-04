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
    Scope: 'Global'
});

const handleSave = () => {
    emit('save', form.value);
};
</script>

<template>
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
        <div class="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            
            <div class="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 class="font-bold text-lg text-slate-800">Nuevo Módulo</h3>
                <button @click="emit('close')" class="text-slate-400 hover:text-red-500">
                    <i class="fa-solid fa-xmark text-xl"></i>
                </button>
            </div>

            <div class="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                
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
