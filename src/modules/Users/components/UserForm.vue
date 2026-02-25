<!-- src/modules/Users/components/UserForm.vue -->
<script setup lang="ts">
import { ref, reactive, watch, computed } from 'vue';
import { useUserStore } from '../stores/userStore';
import ModalDialog from '@/modules/Shared/components/ModalDialog.vue';
import FormInput from '@/modules/Shared/components/FormInput.vue';
import FormSelect from '@/modules/Shared/components/FormSelect.vue';
import type { UserFull, UserRole } from '../types/user.types';
import { ROLE_OPTIONS } from '../types/user.types';

const props = defineProps<{
    modelValue: boolean;
    userToEdit?: UserFull | null;
}>();

const emit = defineEmits(['update:modelValue', 'saved']);

const userStore = useUserStore();

const isEditMode = computed(() => !!props.userToEdit);
const modalTitle = computed(() => isEditMode.value ? `Editar Usuario: ${props.userToEdit?.Usuario}` : 'Nuevo Usuario');

// Estado del formulario
const form = reactive({
    username: '',
    password: '',
    role: 'Gerente' as UserRole,
    zona: '',
    serverUser: '',
    accessLevel: 1
});

const isSubmitting = ref(false);
const errorMessage = ref('');

// Opciones de rol con mapeo al nivel
const roleOptions = ROLE_OPTIONS.map(r => ({ value: r.value, label: r.label }));

const zonaOptions = [
    { value: 'Norte', label: 'Zona Norte' },
    { value: 'Sur', label: 'Zona Sur' },
    { value: 'Centro', label: 'Zona Centro' },
    { value: 'Corporativo', label: 'Corporativo' }
];

// Sincronizar accessLevel cuando cambia el rol
watch(() => form.role, (newRole) => {
    const roleOption = ROLE_OPTIONS.find(r => r.value === newRole);
    if (roleOption) {
        form.accessLevel = roleOption.level;
    }
});

// Cargar datos al abrir en modo edición
watch(() => props.modelValue, (open) => {
    if (open && props.userToEdit) {
        form.username = props.userToEdit.Usuario;
        form.password = '';
        form.role = props.userToEdit.TipoUser as UserRole;
        form.zona = props.userToEdit.Zona;
        form.serverUser = props.userToEdit.ServerUser || '';
        form.accessLevel = props.userToEdit.AccessLevel || 1;
    }
});

const closeModal = () => {
    emit('update:modelValue', false);
    form.username = '';
    form.password = '';
    form.role = 'Gerente';
    form.zona = '';
    form.serverUser = '';
    form.accessLevel = 1;
    errorMessage.value = '';
};

const handleSubmit = async () => {
    if (!isEditMode.value && (!form.username || !form.password)) {
        errorMessage.value = 'Por favor completa todos los campos obligatorios.';
        return;
    }

    if (isEditMode.value && !form.username) {
        errorMessage.value = 'El nombre de usuario es obligatorio.';
        return;
    }

    isSubmitting.value = true;
    errorMessage.value = '';

    try {
        if (isEditMode.value && props.userToEdit) {
            await userStore.updateUser(props.userToEdit.IdUser, {
                role: form.role,
                zona: form.zona,
                serverUser: form.serverUser || undefined,
                accessLevel: form.accessLevel
            });
        } else {
            await userStore.createUser({
                username: form.username,
                password: form.password,
                role: form.role,
                zona: form.zona,
                serverUser: form.serverUser || undefined,
                accessLevel: form.accessLevel
            });
        }
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
        :title="modalTitle" 
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
                :disabled="isEditMode"
            />

            <FormInput 
                v-model="form.serverUser"
                label="Server User"
                placeholder="Ej: SERVIDOR\nombre.apellido"
                icon="fa-solid fa-server"
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

            <!-- Indicador de nivel -->
            <div class="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg text-sm">
                <i class="fa-solid fa-layer-group text-slate-400"></i>
                <span class="text-slate-500">Nivel de acceso:</span>
                <span class="font-bold text-brand-600">{{ form.accessLevel }}</span>
            </div>

            <FormInput 
                v-if="!isEditMode"
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
                    {{ isEditMode ? 'Guardar Cambios' : 'Crear Usuario' }}
                </button>
            </div>
        </form>
    </ModalDialog>
</template>