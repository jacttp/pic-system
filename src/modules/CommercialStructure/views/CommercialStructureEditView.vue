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
    // Cargar opciones de RutaM siempre
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
    if (!form.value.Ruta) {
        alert('La Ruta es obligatoria.');
        return;
    }

    isSaving.value = true;
    cascadeInfo.value = null;
    showSuccess.value = false;

    try {
        if (isNew.value) {
            const success = await store.createItem(form.value);
            if (success) {
                showSuccess.value = true;
                setTimeout(() => router.push('/admin/commercial-structure'), 1500);
            } else {
                alert('Error al crear la estructura.');
            }
        } else {
            const result = await store.updateItem(originalRuta.value, form.value);
            if (result) {
                cascadeInfo.value = result.clientesActualizados;
                showSuccess.value = true;
                setTimeout(() => router.push('/admin/commercial-structure'), 2500);
            } else {
                alert('Error al actualizar la estructura.');
            }
        }
    } finally {
        isSaving.value = false;
    }
};

const handleCancel = () => {
    router.push('/admin/commercial-structure');
};
</script>

<template>
    <div class="p-6 lg:p-8 max-w-3xl mx-auto">
        <!-- Header -->
        <div class="mb-8">
            <button @click="handleCancel" class="text-sm text-slate-500 hover:text-slate-700 mb-3 flex items-center gap-1 transition-colors">
                <i class="fa-solid fa-arrow-left"></i> Volver al listado
            </button>
            <h1 class="text-2xl font-bold text-slate-800">
                {{ isNew ? 'Nueva Estructura' : 'Editar Estructura' }}
            </h1>
            <p v-if="!isNew" class="text-slate-500 text-sm mt-1">
                Ruta: <span class="font-mono font-medium text-slate-700">{{ originalRuta }}</span>
            </p>
        </div>

        <!-- Loading state -->
        <div v-if="isLoading" class="flex items-center justify-center py-20">
            <i class="fa-solid fa-circle-notch fa-spin text-3xl text-brand-500"></i>
        </div>

        <!-- Form -->
        <div v-else class="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">

            <!-- Success banner -->
            <div v-if="showSuccess" class="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-start gap-3">
                <i class="fa-solid fa-check-circle text-emerald-500 text-lg mt-0.5"></i>
                <div>
                    <p class="text-emerald-800 font-medium text-sm">
                        {{ isNew ? 'Estructura creada exitosamente.' : 'Estructura actualizada exitosamente.' }}
                    </p>
                    <p v-if="cascadeInfo !== null" class="text-emerald-600 text-xs mt-1">
                        <i class="fa-solid fa-rotate"></i>
                        Se actualizaron <strong>{{ cascadeInfo }}</strong> clientes en ClientesIC con los nuevos datos.
                    </p>
                </div>
            </div>

            <!-- Cascade warning for edit -->
            <div v-if="!isNew" class="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
                <i class="fa-solid fa-triangle-exclamation text-amber-500 text-lg mt-0.5"></i>
                <div>
                    <p class="text-amber-800 font-medium text-sm">Propagación automática</p>
                    <p class="text-amber-700 text-xs mt-1">
                        Al guardar, los campos <strong>Gerencia, Zona, Jefatura y Cedis</strong> se actualizarán
                        automáticamente en todos los clientes que tengan esta Ruta asignada.
                    </p>
                </div>
            </div>

            <!-- Fields grid -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                    <label class="block text-sm font-medium text-slate-700 mb-1">Ruta <span class="text-red-500">*</span></label>
                    <input v-model="form.Ruta" type="text"
                        class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                        :class="{ 'bg-slate-50': !isNew }"
                        placeholder="Ej: R001" />
                    <p v-if="!isNew" class="text-xs text-slate-400 mt-1">Cambiar la ruta también actualizará la ruta en los clientes asociados.</p>
                </div>

                <div>
                    <label class="block text-sm font-medium text-slate-700 mb-1">Ruta M <span class="text-red-500">*</span></label>
                    <select v-model="form.RutaM"
                        class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 bg-white"
                        :disabled="!isNew">
                        <option value="" disabled>Seleccionar Ruta M...</option>
                        <option v-for="opt in store.rutaMOptions" :key="opt" :value="opt">{{ opt }}</option>
                    </select>
                    <p v-if="isNew" class="text-xs text-slate-400 mt-1">Solo se permiten valores existentes.</p>
                    <p v-else class="text-xs text-slate-400 mt-1">No se puede modificar en edición.</p>
                </div>

                <div>
                    <label class="block text-sm font-medium text-slate-700 mb-1">Gerencia</label>
                    <input v-model="form.Gerencia" type="text"
                        class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                        placeholder="Gerencia" />
                </div>

                <div>
                    <label class="block text-sm font-medium text-slate-700 mb-1">Zona</label>
                    <input v-model="form.Zona" type="text"
                        class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                        placeholder="Zona" />
                </div>

                <div>
                    <label class="block text-sm font-medium text-slate-700 mb-1">Jefatura</label>
                    <input v-model="form.Jefatura" type="text"
                        class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                        placeholder="Jefatura" />
                </div>

                <div>
                    <label class="block text-sm font-medium text-slate-700 mb-1">Cedis</label>
                    <input v-model="form.Cedis" type="text"
                        class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                        placeholder="Cedis" />
                </div>

                <div>
                    <label class="block text-sm font-medium text-slate-700 mb-1">Canal C</label>
                    <input v-model="form.CanalC" type="text"
                        class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                        placeholder="Canal comercial" />
                </div>
            </div>

            <!-- Actions -->
            <div class="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button @click="handleCancel"
                    class="px-5 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
                    Cancelar
                </button>
                <button @click="handleSave" :disabled="isSaving"
                    class="px-5 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2">
                    <i v-if="isSaving" class="fa-solid fa-circle-notch fa-spin"></i>
                    <i v-else class="fa-solid fa-floppy-disk"></i>
                    {{ isSaving ? 'Guardando...' : 'Guardar' }}
                </button>
            </div>
        </div>
    </div>
</template>
