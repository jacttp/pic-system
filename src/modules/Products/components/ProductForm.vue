<!-- src/modules/Products/components/ProductForm.vue -->
<script setup lang="ts">
import { ref, reactive, watch } from 'vue';
import { useProductStore } from '../stores/productStore';
import type { Product } from '@/types/products';
import ModalDialog from '@/modules/Shared/components/ModalDialog.vue';
import FormInput from '@/modules/Shared/components/FormInput.vue';
import FormSelect from '@/modules/Shared/components/FormSelect.vue';

const props = defineProps<{
    modelValue: boolean;
    productToEdit?: Product | null; // Si viene, es edición
}>();

const emit = defineEmits(['update:modelValue', 'saved']);
const store = useProductStore();

// Estado inicial vacío
const initialState = {
    SkuReal: '',
    SKUMuliix: '',
    Nombre: '',
    Marca: '',
    Grupo: '',
    Categorias: '',
    TipoCom: '',
    Peso: 0,
    Status: 1, // 1 = Activo
    EmpaqueA: '',
    EmpaqueB: '',
    Id_SkuRetail: '',
    Contol: ''
};

const form = reactive({ ...initialState });
const isSubmitting = ref(false);
const errorMessage = ref('');

// Detectar si estamos editando para llenar el form
watch(() => props.productToEdit, (newVal) => {
    if (newVal) {
        Object.assign(form, newVal);
        // Asegurar tipos
        form.Status = newVal.Status ? 1 : 0;
    } else {
        Object.assign(form, initialState);
    }
});

const brandOptions = [
    { value: 'CORONA', label: 'CORONA' },
    { value: 'SAN RAFAEL', label: 'SAN RAFAEL' },
    { value: 'FUD', label: 'FUD' } // Ejemplos
];

const statusOptions = [
    { value: 1, label: 'Activo' },
    { value: 0, label: 'Inactivo' }
];

const closeModal = () => {
    emit('update:modelValue', false);
    errorMessage.value = '';
    Object.assign(form, initialState);
};

const handleSubmit = async () => {
    isSubmitting.value = true;
    errorMessage.value = '';

    try {
        if (props.productToEdit) {
            // Edición
            await store.updateProduct(props.productToEdit.Id, form);
        } else {
            // Creación
            await store.createProduct(form);
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
        :title="productToEdit ? 'Editar Producto' : 'Nuevo Producto'" 
        size="4xl"
        @close="closeModal"
    >
        <form @submit.prevent="handleSubmit" class="space-y-6">
            
            <!-- Error -->
            <div v-if="errorMessage" class="p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-200">
                {{ errorMessage }}
            </div>

            <!-- SECCIÓN 1: IDENTIFICACIÓN -->
            <div class="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <h4 class="text-xs font-bold text-brand-600 uppercase tracking-wide mb-4 flex items-center gap-2">
                    <i class="fa-solid fa-barcode"></i> Identificación
                </h4>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormInput v-model="form.SkuReal" label="SKU Real (Familia)" placeholder="EJ: JAM-001" required />
                    <FormInput v-model="form.SKUMuliix" label="SKU Muliix" placeholder="EJ: MUL-999" />
                    <FormInput v-model="form.Id_SkuRetail" label="ID Retail" />
                </div>
            </div>

            <!-- SECCIÓN 2: INFORMACIÓN BÁSICA -->
            <div class="bg-white p-1">
                <div class="grid grid-cols-12 gap-4">
                    <div class="col-span-12 md:col-span-8">
                        <FormInput v-model="form.Nombre" label="Nombre del Producto" required placeholder="Ej: Jamón Serrano 250g" />
                    </div>
                    <div class="col-span-6 md:col-span-4">
                        <FormInput v-model.number="form.Peso" type="number" label="Peso (Kg)" placeholder="0.000" />
                    </div>
                </div>
            </div>

            <!-- SECCIÓN 3: CLASIFICACIÓN -->
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                <FormSelect v-model="form.Marca" label="Marca" :options="brandOptions" />
                <FormInput v-model="form.Grupo" label="Grupo" placeholder="Ej: Embutidos" />
                <FormInput v-model="form.Categorias" label="Categoría" />
                <FormInput v-model="form.TipoCom" label="Tipo Comercial" />
            </div>

            <!-- SECCIÓN 4: LOGÍSTICA -->
            <div class="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <h4 class="text-xs font-bold text-slate-500 uppercase tracking-wide mb-4">Logística & Control</h4>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormInput v-model="form.EmpaqueA" label="Empaque A" />
                    <FormInput v-model="form.EmpaqueB" label="Empaque B" />
                    <FormSelect v-model="form.Status" label="Estado" :options="statusOptions" />
                </div>
                <div class="mt-4 flex items-center gap-2">
                    <input type="checkbox" id="chk-control" v-model="form.Contol" true-value="Si" false-value="No" class="h-4 w-4 text-brand-600 rounded border-slate-300">
                    <label for="chk-control" class="text-sm text-slate-700">Producto Controlado</label>
                </div>
            </div>

            <!-- Footer Botones -->
            <div class="pt-4 flex justify-end gap-3 border-t border-slate-100 mt-6">
                <button type="button" @click="closeModal" class="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50">
                    Cancelar
                </button>
                <button type="submit" :disabled="isSubmitting" class="px-6 py-2 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 shadow-sm flex items-center gap-2 disabled:opacity-70">
                    <i v-if="isSubmitting" class="fa-solid fa-circle-notch fa-spin"></i>
                    {{ productToEdit ? 'Actualizar' : 'Guardar Producto' }}
                </button>
            </div>
        </form>
    </ModalDialog>
</template>