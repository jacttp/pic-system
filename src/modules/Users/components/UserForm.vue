<!-- src/modules/Users/components/UserForm.vue -->
<script setup lang="ts">
import { ref, reactive, watch, computed, onMounted } from 'vue';
import { useUserStore } from '../stores/userStore';
import { useAuthStore } from '@/modules/Auth/views/stores/authStore';
import ModalDialog from '@/modules/Shared/components/ModalDialog.vue';
import FormInput from '@/modules/Shared/components/FormInput.vue';
import FormSelect from '@/modules/Shared/components/FormSelect.vue';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import type { UserFull, UserRole } from '../types/user.types';
import { ROLE_OPTIONS } from '../types/user.types';

const props = defineProps<{
    modelValue?: boolean;
    userToEdit?: UserFull | null;
    isEmbedded?: boolean;
}>();

const emit = defineEmits(['update:modelValue', 'saved', 'cancel']);

const userStore = useUserStore();
const authStore = useAuthStore();

const isEditMode = computed(() => !!props.userToEdit);
const modalTitle = computed(() => isEditMode.value ? `Editar Usuario` : 'Nuevo Usuario');

// Permisos para cambio de password
const canChangePasswords = computed(() => (authStore.user?.accessLevel ?? 0) >= 4);

// Estado del formulario
const form = reactive({
    username: '',
    password: '',
    role: 'Jefe' as UserRole,
    jefatura: 'Corporativo', // Default según requerimiento
    gerencia: 'Corporativo',
    serverUser: '',
    accessLevel: 1,
    nombre: '',
    no_emp: ''
});

const isSubmitting = ref(false);
const isChangingPassword = ref(false);
const newPassword = ref('');
const errorMessage = ref('');
const isServerUserEdited = ref(false);
const loadingJefaturas = ref(false);

// Cargar jefaturas al montar
onMounted(async () => {
    await userStore.fetchGerencias();
    // Cargamos jefaturas basadas en la gerencia inicial (si existe)
    userStore.fetchJefaturas(form.gerencia);
});

const jefaturaOptions = computed(() => {
    return userStore.jefaturas.map(z => ({ value: z, label: z }));
});

const gerenciaOptions = computed(() => {
    return userStore.gerencias.map(g => ({ value: g, label: g }));
});

// Helper para obtener el label del rol basado en el nivel
const currentRoleLabel = computed(() => {
    const opt = ROLE_OPTIONS.find(r => r.level === form.accessLevel);
    return opt ? opt.label : 'Sin Rol';
});

// Función para cambiar nivel y actualizar rol automáticamente
const setAccessLevel = (level: number) => {
    form.accessLevel = level;
    const opt = ROLE_OPTIONS.find(r => r.level === level);
    if (opt) {
        form.role = opt.value;
    }
};

// Cargar datos del usuario
const loadUserData = (u: UserFull | null) => {
    if (u) {
        form.username = u.Usuario;
        form.password = '';
        form.role = u.TipoUser as UserRole;
        form.jefatura = u.jefatura || 'Corporativo';
        form.gerencia = u.Gerencia || 'Corporativo';
        form.serverUser = u.ServerUser || '';
        form.accessLevel = u.AccessLevel || 1;
        form.nombre = u.nombre || '';
        form.no_emp = u.no_emp || '';
    } else {
        form.username = '';
        form.password = '';
        form.role = 'Jefe';
        form.jefatura = 'Corporativo';
        form.gerencia = 'Corporativo';
        form.serverUser = 'EMBUTIDOSCORONA\\';
        form.accessLevel = 1;
        form.nombre = '';
        form.no_emp = '';
        isServerUserEdited.value = false;
    }
    errorMessage.value = '';
    newPassword.value = '';
    isChangingPassword.value = false;
};

watch(() => props.userToEdit, (u) => {
    loadUserData(u || null);
}, { immediate: true });

// Autocompletado inteligente del Servidor / Dominio
watch(() => form.username, (newVal) => {
    if (!isEditMode.value && !isServerUserEdited.value) {
        form.serverUser = `EMBUTIDOSCORONA\\${newVal}`;
    }
});

// Cascada: Cuando cambia Gerencia, recargar Jefaturas
watch(() => form.gerencia, async (newGerencia) => {
    loadingJefaturas.value = true;
    try {
        await userStore.fetchJefaturas(newGerencia);
        // Si la jefatura actual no es Corporativo y no está en la nueva lista, resetearla
        if (form.jefatura !== 'Corporativo' && !userStore.jefaturas.includes(form.jefatura)) {
            form.jefatura = 'Corporativo';
        }
    } finally {
        loadingJefaturas.value = false;
    }
});

// Detectar edición manual para detener el autocompletado
const handleServerUserEdit = () => {
    isServerUserEdited.value = true;
};

const closeModal = () => {
    emit('update:modelValue', false);
    emit('cancel');
};

const handlePasswordChange = async () => {
    if (!newPassword.value || newPassword.value.length < 4) {
        errorMessage.value = 'La nueva contraseña debe tener al menos 4 caracteres.';
        return;
    }
    
    if (!props.userToEdit) return;

    isSubmitting.value = true;
    errorMessage.value = '';
    try {
        await userStore.changePassword(props.userToEdit.IdUser, newPassword.value);
        newPassword.value = '';
        isChangingPassword.value = false;
        alert('Contraseña actualizada con éxito');
    } catch (e: any) {
        errorMessage.value = e.response?.data?.message || 'Error al cambiar contraseña.';
    } finally {
        isSubmitting.value = false;
    }
};

const handleSubmit = async () => {
    if (!isEditMode.value && (!form.username || !form.password || !form.nombre || !form.no_emp)) {
        errorMessage.value = 'Por favor completa todos los campos obligatorios.';
        return;
    }

    if (isEditMode.value && (!form.username || !form.nombre || !form.no_emp)) {
        errorMessage.value = 'Nombre, No. Emp y Usuario son obligatorios.';
        return;
    }

    isSubmitting.value = true;
    errorMessage.value = '';

    try {
        if (isEditMode.value && props.userToEdit) {
            await userStore.updateUser(props.userToEdit.IdUser, {
                role: form.role,
                jefatura: form.jefatura,
                gerencia: form.gerencia,
                serverUser: form.serverUser || undefined,
                accessLevel: form.accessLevel,
                nombre: form.nombre,
                no_emp: form.no_emp
            });
        } else {
            await userStore.createUser({
                username: form.username,
                password: form.password,
                role: form.role,
                jefatura: form.jefatura,
                gerencia: form.gerencia,
                serverUser: form.serverUser || undefined,
                accessLevel: form.accessLevel,
                nombre: form.nombre,
                no_emp: form.no_emp
            });
        }
        emit('saved');
        if (!props.isEmbedded) closeModal();
    } catch (e: any) {
        errorMessage.value = e.response?.data?.message || 'Error al guardar.';
    } finally {
        isSubmitting.value = false;
    }
};
</script>

<template>
    <!-- MODO EMBEBIDO (Panel Lateral) -->
    <div v-if="isEmbedded" class="space-y-8 p-1">
        <div v-if="errorMessage" class="p-4 bg-red-50 text-red-700 rounded-2xl text-sm flex items-center gap-3 border border-red-100 italic shadow-sm">
            <i class="fa-solid fa-circle-exclamation text-lg"></i> 
            <span class="font-medium">{{ errorMessage }}</span>
        </div>

        <div class="grid grid-cols-1 gap-6">
            <div class="grid grid-cols-2 gap-4">
                <FormInput 
                    v-model="form.nombre" 
                    label="Nombre Completo" 
                    placeholder="Nombre real"
                    icon="fa-solid fa-id-card"
                    required
                />
                <FormInput 
                    v-model="form.no_emp" 
                    label="No. Empleado" 
                    placeholder="12345"
                    icon="fa-solid fa-hashtag"
                    required
                />
            </div>

            <div class="grid grid-cols-2 gap-4">
                <FormInput 
                    v-model="form.username" 
                    label="Nombre de Usuario" 
                    placeholder="Nombre de acceso"
                    icon="fa-solid fa-user-circle"
                    disabled
                    class="opacity-70"
                />
                <FormInput 
                    v-model="form.serverUser"
                    label="Server ID"
                    placeholder="DOMAIN\user"
                    icon="fa-solid fa-server"
                />
            </div>

            <div class="space-y-4">
                <FormSelect 
                    v-model="form.gerencia" 
                    label="Gerencia" 
                    :options="gerenciaOptions" 
                />
                <FormSelect 
                    v-model="form.jefatura" 
                    label="Jefatura" 
                    :options="jefaturaOptions"
                    :disabled="loadingJefaturas"
                />
                <p class="text-[10px] text-slate-400 font-medium px-1">Se utiliza "Corporativo" para personal administrativo no operativo.</p>
            </div>

            <div class="p-6 bg-slate-50/80 rounded-3xl border border-slate-200/60 shadow-sm relative overflow-hidden group">
                <div class="absolute -right-4 -top-4 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl"></div>
                
                <div class="flex items-center justify-between mb-6">
                    <div class="space-y-1">
                        <h4 class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nivel de Acceso</h4>
                        <p class="text-sm font-black text-blue-700 leading-none">{{ currentRoleLabel }}</p>
                    </div>
                    <div class="bg-blue-600 text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow-lg shadow-blue-100">
                        NIVEL {{ form.accessLevel }}
                    </div>
                </div>

                <div class="flex gap-2.5 h-12 items-end">
                    <div 
                        v-for="i in 4" 
                        :key="i"
                        @click="setAccessLevel(i)"
                        class="flex-1 rounded-2xl transition-all duration-300 cursor-pointer flex items-center justify-center text-xs font-bold shadow-sm"
                        :class="[
                            i <= form.accessLevel 
                                ? 'bg-blue-600 text-white shadow-blue-100 h-full' 
                                : 'bg-slate-200/50 text-slate-400 h-10 hover:bg-blue-100 hover:text-blue-500'
                        ]"
                    >
                        {{ i }}
                    </div>
                </div>
            </div>

            <!-- Cambio de Password (Solo para SuperAdm nivel 4) -->
            <div v-if="canChangePasswords && isEditMode" class="p-6 bg-amber-50/50 rounded-3xl border border-amber-100 shadow-sm space-y-4">
                <div class="flex items-center gap-2">
                    <i class="fa-solid fa-key text-amber-600"></i>
                    <h4 class="text-[10px] font-black text-amber-700 uppercase tracking-widest">Seguridad</h4>
                </div>
                
                <div v-if="!isChangingPassword">
                    <Button 
                        variant="outline" 
                        size="sm"
                        @click="isChangingPassword = true"
                        class="w-full rounded-xl border-amber-200 text-amber-700 hover:bg-amber-100 text-xs font-bold"
                    >
                        Cambiar Contraseña
                    </Button>
                </div>
                <div v-else class="space-y-3">
                    <FormInput 
                        v-model="newPassword" 
                        type="password" 
                        label="Nueva Contraseña"
                        placeholder="••••••••"
                        class="bg-white"
                    />
                    <div class="flex gap-2">
                        <Button 
                            variant="ghost" 
                            size="sm"
                            @click="isChangingPassword = false"
                            class="flex-1 text-[10px] font-bold uppercase"
                        >
                            Cancelar
                        </Button>
                        <Button 
                            size="sm"
                            @click="handlePasswordChange"
                            :disabled="isSubmitting"
                            class="flex-1 bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-bold uppercase"
                        >
                            Confirmar
                        </Button>
                    </div>
                </div>
            </div>
        </div>

        <div class="flex justify-end gap-3 pt-6 border-t border-slate-100">
            <Button 
                variant="outline" 
                @click="emit('cancel')"
                class="rounded-2xl h-11 px-6 font-bold border-slate-200 text-slate-500 hover:bg-slate-50"
            >
                Cancelar
            </Button>
            <Button 
                @click="handleSubmit" 
                :disabled="isSubmitting"
                class="bg-blue-600 hover:bg-blue-700 text-white rounded-2xl h-11 px-8 shadow-xl shadow-blue-100 gap-2 font-black transition-all active:scale-95"
            >
                <i v-if="isSubmitting" class="fa-solid fa-circle-notch fa-spin"></i>
                <i v-else class="fa-solid fa-floppy-disk"></i>
                Guardar Cambios
            </Button>
        </div>
    </div>

    <!-- MODO MODAL (CREACIÓN) -->
    <ModalDialog 
        v-else
        :model-value="!!modelValue" 
        :title="modalTitle" 
        size="lg"
        @close="closeModal"
    >
        <template #default>
            <div class="space-y-6">
                <div class="flex items-center gap-5 p-6 bg-blue-50/50 rounded-[2rem] border border-blue-100/50 relative overflow-hidden">
                    <div class="absolute right-0 top-0 w-32 h-32 bg-blue-100/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                    <div class="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-xl shadow-blue-200 relative z-10">
                        <i class="fa-solid fa-user-plus text-2xl"></i>
                    </div>
                    <div class="relative z-10">
                        <h4 class="text-lg font-black text-slate-900 leading-tight">Alta de Usuario</h4>
                        <p class="text-xs text-slate-500 font-bold uppercase tracking-wider opacity-60">Complete los datos de la persona y acceso.</p>
                    </div>
                </div>

                <div v-if="errorMessage" class="p-4 bg-red-50 text-red-700 rounded-2xl text-sm flex items-center gap-3 border border-red-100">
                    <i class="fa-solid fa-circle-exclamation"></i> {{ errorMessage }}
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <FormInput 
                        v-model="form.nombre" 
                        label="Nombre Completo" 
                        placeholder="Ej: Juan Pérez"
                        icon="fa-solid fa-id-card"
                        required
                    />
                    <FormInput 
                        v-model="form.no_emp" 
                        label="No. Empleado" 
                        placeholder="Ej: 5432"
                        icon="fa-solid fa-hashtag"
                        required
                    />
                    <FormInput 
                        v-model="form.username" 
                        label="Usuario (Login)" 
                        placeholder="Ej: jperez"
                        icon="fa-solid fa-at"
                        required
                    />
                    <FormInput 
                        v-model="form.password" 
                        label="Contraseña" 
                        type="password"
                        placeholder="••••••••"
                        icon="fa-solid fa-key"
                        required
                    />
                </div>

                <div class="grid grid-cols-1 gap-6">
                    <FormInput 
                        v-model="form.serverUser"
                        label="Servidor / Dominio"
                        placeholder="Ej: EMBUTIDOSCORONA\usuario"
                        icon="fa-solid fa-network-wired"
                        class="w-full"
                        @input="handleServerUserEdit"
                    />
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <FormSelect 
                        v-model="form.gerencia" 
                        label="Gerencia" 
                        :options="gerenciaOptions" 
                    />
                    <FormSelect 
                        v-model="form.jefatura" 
                        label="Jefatura" 
                        :options="jefaturaOptions"
                        :disabled="loadingJefaturas"
                    />
                </div>
                
                <div class="bg-slate-50/50 p-6 rounded-[2rem] border border-slate-200/50">
                    <div class="flex items-center justify-between mb-5">
                        <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nivel de Acceso</span>
                        <div class="flex items-center gap-2">
                            <span class="text-blue-600 text-xs font-black uppercase">{{ currentRoleLabel }}</span>
                        </div>
                    </div>
                    <div class="flex gap-2">
                        <div 
                            v-for="i in 4" 
                            :key="i"
                            @click="setAccessLevel(i)"
                            class="flex-1 h-3 rounded-full transition-all duration-300 cursor-pointer"
                            :class="i <= form.accessLevel ? 'bg-blue-600 shadow-md shadow-blue-100' : 'bg-slate-200 hover:bg-blue-200'"
                        ></div>
                    </div>
                    <div class="flex justify-between mt-3 px-1 text-[10px] font-black text-slate-300">
                        <span v-for="i in 4" :key="i" :class="i === form.accessLevel ? 'text-blue-600' : ''">{{ i }}</span>
                    </div>
                </div>
            </div>
        </template>

        <template #footer>
            <div class="flex w-full justify-between items-center">
                <p class="text-[10px] text-slate-400 font-medium">* Nombre y No. Empleado son requeridos por RH.</p>
                <div class="flex gap-3">
                    <Button variant="ghost" @click="closeModal" class="text-slate-400 font-bold hover:bg-slate-100 rounded-xl px-4">
                        Cancelar
                    </Button>
                    <Button 
                        @click="handleSubmit" 
                        :disabled="isSubmitting"
                        class="bg-blue-600 hover:bg-blue-700 text-white px-8 h-12 font-black rounded-2xl shadow-xl shadow-blue-100 gap-2 transition-all active:scale-95"
                    >
                        <i v-if="isSubmitting" class="fa-solid fa-circle-notch fa-spin"></i>
                        Crear Usuario
                    </Button>
                </div>
            </div>
        </template>
    </ModalDialog>
</template>