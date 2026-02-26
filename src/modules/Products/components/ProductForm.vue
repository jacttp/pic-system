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
    productToEdit?: Product | null;
}>();

const emit = defineEmits(['update:modelValue', 'saved']);
const store = useProductStore();

const initialState = {
    SkuReal:      '',
    SKUMuliix:    '',
    Nombre:       '',
    Marca:        '',
    Grupo:        '',
    Categorias:   '',
    TipoCom:      '',
    Peso:         0,
    Status:       1,
    EmpaqueA:     '',
    EmpaqueB:     '',
    Id_SkuRetail: '',
    Contol:       ''
};

const form         = reactive({ ...initialState });
const isSubmitting = ref(false);
const errorMessage = ref('');

watch(() => props.productToEdit, (newVal) => {
    if (newVal) {
        Object.assign(form, newVal);
        form.Status = newVal.Status ? 1 : 0;
    } else {
        Object.assign(form, initialState);
    }
});

const brandOptions = [
    { value: 'CORONA',      label: 'CORONA'      },
    { value: 'SAN RAFAEL',  label: 'SAN RAFAEL'  },
    { value: 'FUD',         label: 'FUD'         },
];

const statusOptions = [
    { value: 1, label: 'Activo'   },
    { value: 0, label: 'Inactivo' },
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
        if (props.productToEdit) await store.updateProduct(props.productToEdit.Id, form);
        else                     await store.createProduct(form);
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
        <form @submit.prevent="handleSubmit" class="space-y-0">

            <!-- Error banner -->
            <transition name="error-slide">
                <div v-if="errorMessage" class="flex items-start gap-3 p-3 mb-5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
                    <i class="fa-solid fa-circle-exclamation mt-0.5 flex-shrink-0"></i>
                    <span>{{ errorMessage }}</span>
                </div>
            </transition>

            <!-- ── SECCIÓN 1: Identificación ── -->
            <div class="mb-5">
                <div class="flex items-center gap-2 px-1 mb-3">
                    <div class="w-5 h-5 rounded bg-orange-100 flex items-center justify-center flex-shrink-0">
                        <i class="fa-solid fa-barcode text-orange-600" style="font-size: 10px;"></i>
                    </div>
                    <p class="text-xs font-bold text-slate-500 uppercase tracking-widest">Identificación</p>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 border border-slate-200 rounded-xl p-4">
                    <FormInput v-model="form.SkuReal"      label="SKU Real (Familia)"  placeholder="Ej: JAM-001" required />
                    <FormInput v-model="form.SKUMuliix"    label="SKU Muliix"          placeholder="Ej: MUL-999" />
                    <FormInput v-model="form.Id_SkuRetail" label="ID Retail"           placeholder="—" />
                </div>
            </div>

            <!-- ── SECCIÓN 2: Información del Producto ── -->
            <div class="mb-5">
                <div class="flex items-center gap-2 px-1 mb-3">
                    <div class="w-5 h-5 rounded bg-slate-100 flex items-center justify-center flex-shrink-0">
                        <i class="fa-solid fa-box text-slate-500" style="font-size: 10px;"></i>
                    </div>
                    <p class="text-xs font-bold text-slate-500 uppercase tracking-widest">Información del Producto</p>
                </div>
                <div class="border border-slate-200 rounded-xl p-4 space-y-4">
                    <div class="grid grid-cols-12 gap-4">
                        <div class="col-span-12 md:col-span-8">
                            <FormInput v-model="form.Nombre" label="Nombre del Producto" required placeholder="Ej: Jamón Serrano 250g" />
                        </div>
                        <div class="col-span-6 md:col-span-4">
                            <FormInput v-model.number="form.Peso" type="number" label="Peso (Kg)" placeholder="0.000" />
                        </div>
                    </div>
                    <div class="grid grid-cols-1 sm:grid-cols-4 gap-4">
                        <FormSelect v-model="form.Marca"      label="Marca"           :options="brandOptions" />
                        <FormInput  v-model="form.Grupo"      label="Grupo"           placeholder="Ej: Embutidos" />
                        <FormInput  v-model="form.Categorias" label="Categoría"       placeholder="—" />
                        <FormInput  v-model="form.TipoCom"    label="Tipo Comercial"  placeholder="—" />
                    </div>
                </div>
            </div>

            <!-- ── SECCIÓN 3: Logística & Control ── -->
            <div class="mb-1">
                <div class="flex items-center gap-2 px-1 mb-3">
                    <div class="w-5 h-5 rounded bg-slate-100 flex items-center justify-center flex-shrink-0">
                        <i class="fa-solid fa-warehouse text-slate-500" style="font-size: 10px;"></i>
                    </div>
                    <p class="text-xs font-bold text-slate-500 uppercase tracking-widest">Logística & Control</p>
                </div>
                <div class="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <FormInput  v-model="form.EmpaqueA" label="Empaque A" placeholder="—" />
                        <FormInput  v-model="form.EmpaqueB" label="Empaque B" placeholder="—" />
                        <FormSelect v-model="form.Status"   label="Estado"   :options="statusOptions" />
                    </div>
                    <label class="flex items-center gap-3 cursor-pointer group">
                        <div class="relative flex items-center">
                            <input
                                type="checkbox"
                                id="chk-control"
                                v-model="form.Contol"
                                true-value="Si"
                                false-value="No"
                                class="w-4 h-4 rounded border-slate-300 text-orange-500 focus:ring-orange-500/30 cursor-pointer"
                            />
                        </div>
                        <span class="text-sm text-slate-700 font-medium group-hover:text-slate-900 transition-colors">Producto Controlado</span>
                    </label>
                </div>
            </div>

            <!-- ── Footer actions ── -->
            <div class="pt-5 mt-5 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                    type="button"
                    @click="closeModal"
                    class="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors"
                >
                    Cancelar
                </button>
                <button
                    type="submit"
                    :disabled="isSubmitting"
                    class="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 active:bg-orange-700 rounded-xl shadow-sm shadow-orange-200 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                    <i v-if="isSubmitting" class="fa-solid fa-circle-notch fa-spin text-xs"></i>
                    <i v-else class="fa-solid fa-check text-xs"></i>
                    {{ productToEdit ? 'Actualizar Producto' : 'Guardar Producto' }}
                </button>
            </div>
        </form>
    </ModalDialog>
</template>

<style scoped>
.error-slide-enter-active, .error-slide-leave-active { transition: all 0.2s ease; }
.error-slide-enter-from, .error-slide-leave-to { opacity: 0; transform: translateY(-4px); }
</style>