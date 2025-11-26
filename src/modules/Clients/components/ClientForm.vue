<!-- src/modules/Clients/components/ClientForm.vue -->
<script setup lang="ts">
import { ref, reactive, watch } from 'vue';
import { useClientStore } from '../stores/clientStore';
import type { Client } from '@/types/clients';
import ModalDialog from '@/modules/Shared/components/ModalDialog.vue';
import FormInput from '@/modules/Shared/components/FormInput.vue';

const props = defineProps<{
    modelValue: boolean;
    clientToEdit?: Client | null;
}>();

const emit = defineEmits(['update:modelValue', 'saved']);
const store = useClientStore();

const initialState = {
    clienteid: '',
    Nombre: '',
    Matriz: '',
    Cadena: '',
    Canal: '',
    Gerencia: '',
    Zona: '',
    Ciudad: '',
    Estado: '',
    Calle_Numero: '',
    Colonia: '',
    Tipocli: '',
    Formato: ''
};

const form = reactive({ ...initialState });
const isSubmitting = ref(false);
const errorMessage = ref('');

watch(() => props.clientToEdit, (newVal) => {
    if (newVal) {
        Object.assign(form, newVal);
    } else {
        Object.assign(form, initialState);
    }
});

const closeModal = () => {
    emit('update:modelValue', false);
    errorMessage.value = '';
    Object.assign(form, initialState);
};

const handleSubmit = async () => {
    if (!form.Nombre) {
        errorMessage.value = "El nombre es obligatorio";
        return;
    }
    isSubmitting.value = true;
    errorMessage.value = '';

    try {
        if (props.clientToEdit) {
            await store.updateClient(props.clientToEdit.Id, form);
        } else {
            await store.createClient(form);
        }
        emit('saved');
        closeModal();
    } catch (e: any) {
        errorMessage.value = typeof e === 'string' ? e : 'Error al guardar.';
    } finally {
        isSubmitting.value = false;
    }
};
</script>

<template>
    <ModalDialog 
        :model-value="modelValue" 
        :title="clientToEdit ? 'Editar Cliente' : 'Nuevo Cliente'" 
        size="2xl"
        @close="closeModal"
    >
        <form @submit.prevent="handleSubmit" class="space-y-6">
            <div v-if="errorMessage" class="p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-200">
                {{ errorMessage }}
            </div>

            <!-- DATOS PRINCIPALES -->
            <div class="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <h4 class="text-xs font-bold text-brand-600 uppercase tracking-wide mb-4 flex items-center gap-2">
                    <i class="fa-solid fa-store"></i> Identificación
                </h4>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormInput v-model="form.clienteid" label="ID Cliente (Negocio)" placeholder="Ej: CTE-1001" />
                    <FormInput v-model="form.Nombre" label="Razón Social / Nombre" required placeholder="Ej: Abarrotes La Esperanza" />
                </div>
            </div>

            <!-- UBICACIÓN -->
            <div>
                <h4 class="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Ubicación</h4>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <FormInput v-model="form.Ciudad" label="Ciudad" />
                    <FormInput v-model="form.Estado" label="Estado" />
                </div>
                <FormInput v-model="form.Calle_Numero" label="Calle y Número" placeholder="Av. Principal #123" />
                <div class="mt-4">
                    <FormInput v-model="form.Colonia" label="Colonia" />
                </div>
            </div>

            <!-- CLASIFICACIÓN -->
            <div class="bg-white border border-slate-200 p-4 rounded-lg">
                <h4 class="text-xs font-bold text-slate-500 uppercase tracking-wide mb-4">Segmentación Comercial</h4>
                <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <FormInput v-model="form.Canal" label="Canal" />
                    <FormInput v-model="form.Gerencia" label="Gerencia" />
                    <FormInput v-model="form.Zona" label="Zona" />
                    <FormInput v-model="form.Cadena" label="Cadena" />
                    <FormInput v-model="form.Formato" label="Formato" />
                    <FormInput v-model="form.Tipocli" label="Tipo Cliente" />
                </div>
            </div>

            <!-- FOOTER -->
            <div class="pt-4 flex justify-end gap-3 border-t border-slate-100 mt-6">
                <button type="button" @click="closeModal" class="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50">
                    Cancelar
                </button>
                <button type="submit" :disabled="isSubmitting" class="px-6 py-2 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 shadow-sm flex items-center gap-2 disabled:opacity-70">
                    <i v-if="isSubmitting" class="fa-solid fa-circle-notch fa-spin"></i>
                    {{ clientToEdit ? 'Actualizar' : 'Guardar Cliente' }}
                </button>
            </div>
        </form>
    </ModalDialog>
</template>