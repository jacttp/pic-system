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

const emit = defineEmits<{
    (e: 'update:modelValue', value: boolean): void;
    (e: 'saved'): void;
}>();

const store = useClientStore();

const initialState = {
    clienteid:   '',
    Nombre:      '',
    Matriz:      '',
    Cadena:      '',
    Canal:       '',
    Gerencia:    '',
    Zona:        '',
    Ciudad:      '',
    Estado:      '',
    Calle_Numero:'',
    Colonia:     '',
    Tipocli:     '',
    Formato:     ''
};

const form         = reactive({ ...initialState });
const isSubmitting = ref(false);
const errorMessage = ref('');

watch(() => props.clientToEdit, (newVal) => {
    Object.assign(form, newVal ?? initialState);
});

const closeModal = () => {
    emit('update:modelValue', false);
    errorMessage.value = '';
    Object.assign(form, initialState);
};

const handleSubmit = async () => {
    if (!form.Nombre) { errorMessage.value = 'El nombre es obligatorio.'; return; }
    isSubmitting.value = true;
    errorMessage.value = '';
    try {
        if (props.clientToEdit) await store.updateClient(props.clientToEdit.Id, form);
        else                    await store.createClient(form);
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
        <form @submit.prevent="handleSubmit" class="space-y-0">

            <!-- Error banner -->
            <transition name="error-slide">
                <div v-if="errorMessage" class="flex items-start gap-3 p-3 mb-5 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                    <i class="fa-solid fa-circle-exclamation mt-0.5 flex-shrink-0"></i>
                    <span>{{ errorMessage }}</span>
                </div>
            </transition>

            <!-- ── Section: Identificación ── -->
            <div class="mb-5">
                <div class="flex items-center gap-2 mb-3">
                    <div class="w-5 h-5 rounded bg-emerald-100 flex items-center justify-center flex-shrink-0">
                        <i class="fa-solid fa-id-card text-emerald-600" style="font-size: 10px;"></i>
                    </div>
                    <p class="text-xs font-bold text-slate-500 uppercase tracking-widest">Identificación</p>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 border border-slate-200 rounded-lg p-4">
                    <FormInput
                        v-model="form.clienteid"
                        label="ID Cliente (Negocio)"
                        placeholder="Ej: CTE-1001"
                        icon="fa-solid fa-fingerprint"
                    />
                    <FormInput
                        v-model="form.Nombre"
                        label="Razón Social / Nombre"
                        :required="true"
                        placeholder="Ej: Abarrotes La Esperanza"
                        icon="fa-solid fa-store"
                    />
                </div>
            </div>

            <!-- ── Section: Ubicación ── -->
            <div class="mb-5">
                <div class="flex items-center gap-2 mb-3">
                    <div class="w-5 h-5 rounded bg-slate-100 flex items-center justify-center flex-shrink-0">
                        <i class="fa-solid fa-map-pin text-slate-500" style="font-size: 10px;"></i>
                    </div>
                    <p class="text-xs font-bold text-slate-500 uppercase tracking-widest">Ubicación</p>
                </div>
                <div class="space-y-3 border border-slate-200 rounded-lg p-4">
                    <FormInput
                        v-model="form.Calle_Numero"
                        label="Calle y Número"
                        placeholder="Av. Principal #123"
                        icon="fa-solid fa-road"
                    />
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <FormInput v-model="form.Colonia"  label="Colonia"  placeholder="Colonia" />
                        <FormInput v-model="form.Zona"     label="Zona / CP" placeholder="Zona o CP" />
                        <FormInput v-model="form.Ciudad"   label="Ciudad"   placeholder="Ciudad" />
                        <FormInput v-model="form.Estado"   label="Estado"   placeholder="Estado" />
                    </div>
                </div>
            </div>

            <!-- ── Section: Segmentación ── -->
            <div class="mb-1">
                <div class="flex items-center gap-2 mb-3">
                    <div class="w-5 h-5 rounded bg-slate-100 flex items-center justify-center flex-shrink-0">
                        <i class="fa-solid fa-sitemap text-slate-500" style="font-size: 10px;"></i>
                    </div>
                    <p class="text-xs font-bold text-slate-500 uppercase tracking-widest">Segmentación Comercial</p>
                </div>
                <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 border border-slate-200 rounded-lg p-4">
                    <FormInput v-model="form.Canal"    label="Canal"        />
                    <FormInput v-model="form.Gerencia" label="Gerencia"     />
                    <FormInput v-model="form.Zona"     label="Zona"         />
                    <FormInput v-model="form.Cadena"   label="Cadena"       />
                    <FormInput v-model="form.Formato"  label="Formato"      />
                    <FormInput v-model="form.Tipocli"  label="Tipo Cliente" />
                </div>
            </div>

            <!-- ── Footer actions ── -->
            <div class="pt-5 mt-5 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                    type="button"
                    @click="closeModal"
                    class="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                >
                    Cancelar
                </button>
                <button
                    type="submit"
                    :disabled="isSubmitting"
                    class="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-lg shadow-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                    <i v-if="isSubmitting" class="fa-solid fa-circle-notch fa-spin text-xs"></i>
                    <i v-else class="fa-solid fa-check text-xs"></i>
                    {{ clientToEdit ? 'Actualizar Cliente' : 'Guardar Cliente' }}
                </button>
            </div>
        </form>
    </ModalDialog>
</template>

<style scoped>
.error-slide-enter-active, .error-slide-leave-active { transition: all 0.2s ease; }
.error-slide-enter-from, .error-slide-leave-to { opacity: 0; transform: translateY(-4px); }
</style>