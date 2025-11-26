<!-- src/modules/Users/components/UserForm.vue -->
<script setup lang="ts">
import { ref, reactive } from 'vue';
import { useUserStore } from '../stores/userStore';
import ModalDialog from '@/modules/Shared/components/ModalDialog.vue';
import FormInput from '@/modules/Shared/components/FormInput.vue';
import FormSelect from '@/modules/Shared/components/FormSelect.vue';

const props = defineProps<{
    modelValue: boolean; // Controla apertura del modal
}>();

const emit = defineEmits(['update:modelValue', 'saved']);

const userStore = useUserStore();

// Estado del formulario
const form = reactive({
    username: '',
    password: '',
    role: 'User',
    zona: 'Norte'
});

const isSubmitting = ref(false);
const errorMessage = ref('');

const roleOptions = [
    { value: 'Admin', label: 'Administrador' },
    { value: 'User', label: 'Usuario Operativo' }
];

const zonaOptions = [
    { value: 'Norte', label: 'Zona Norte' },
    { value: 'Sur', label: 'Zona Sur' },
    { value: 'Centro', label: 'Zona Centro' },
    { value: 'Corporativo', label: 'Corporativo' }
];

const closeModal = () => {
    emit('update:modelValue', false);
    // Resetear form
    form.username = '';
    form.password = '';
    errorMessage.value = '';
};

const handleSubmit = async () => {
    if (!form.username || !form.password) {
        errorMessage.value = 'Por favor completa todos los campos obligatorios.';
        return;
    }

    isSubmitting.value = true;
    errorMessage.value = '';

    try {
        await userStore.createUser({ ...form });
        emit('saved');
        closeModal();
    } catch (e: any) {
        errorMessage.value = e.response?.data?.message || 'Error al guardar.';
    } finally {
        isSubmitting.value = false;
    }
};
</script>

<template>
    <ModalDialog 
        :model-value="modelValue" 
        title="Nuevo Usuario" 
        size="md"
        @close="closeModal"
    >
        <form @submit.prevent="handleSubmit" class="space-y-4">
            
            <!-- Mensaje de Error -->
            <div v-if="errorMessage" class="p-3 bg-red-50 text-red-700 rounded-lg text-sm flex items-center gap-2">
                <i class="fa-solid fa-circle-exclamation"></i> {{ errorMessage }}
            </div>

            <FormInput 
                v-model="form.username" 
                label="Nombre de Usuario" 
                placeholder="Ej: JuanPerez"
                icon="fa-solid fa-user"
                required
            />

            <div class="grid grid-cols-2 gap-4">
                <FormSelect 
                    v-model="form.role" 
                    label="Rol" 
                    :options="roleOptions" 
                />
                <FormSelect 
                    v-model="form.zona" 
                    label="Zona Asignada" 
                    :options="zonaOptions" 
                />
            </div>

            <FormInput 
                v-model="form.password" 
                label="Contraseña" 
                type="password"
                placeholder="••••••••"
                icon="fa-solid fa-lock"
                required
            />

            <!-- Botones -->
            <div class="pt-4 flex justify-end gap-3 border-t border-slate-100 mt-6">
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
                    class="px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 transition-colors shadow-sm flex items-center gap-2 disabled:opacity-70"
                >
                    <i v-if="isSubmitting" class="fa-solid fa-circle-notch fa-spin"></i>
                    Guardar Usuario
                </button>
            </div>
        </form>
    </ModalDialog>
</template>