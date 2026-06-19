<!-- src/modules/Users/components/UserForm.vue -->
<script setup lang="ts">
import { ref, reactive, watch, computed, onMounted } from 'vue';
import { useUserStore } from '../stores/userStore';
import { useAuthStore } from '@/modules/Auth/views/stores/authStore';
import { useSetupStore } from '@/modules/Setup/stores/setupStores';
import ModalDialog from '@/modules/Shared/components/ModalDialog.vue';
import FormInput from '@/modules/Shared/components/FormInput.vue';
import FormSelect from '@/modules/Shared/components/FormSelect.vue';
import { Button } from '@/components/ui/button';
import type { HubFeatureKey } from '@/modules/Setup/types/setupTypes';
import type { UserFull, UserRole } from '../types/user.types';
import { ROLE_OPTIONS } from '../types/user.types';

const props = defineProps<{
    modelValue?: boolean;
    userToEdit?: UserFull | null;
    isEmbedded?: boolean;
    showFeatureOverrides?: boolean;
    showAccessLevel?: boolean;
    showPasswordChange?: boolean;
}>();

const emit = defineEmits(['update:modelValue', 'saved', 'cancel']);

const userStore = useUserStore();
const authStore = useAuthStore();
const setupStore = useSetupStore();

const isEditMode = computed(() => !!props.userToEdit);
const modalTitle = computed(() => isEditMode.value ? 'Editar Usuario' : 'Nuevo Usuario');

const canChangePasswords = computed(() => props.showPasswordChange !== false && (authStore.user?.accessLevel ?? 0) >= 4);
const canManageFeatureOverrides = computed(() => props.showFeatureOverrides !== false && (authStore.user?.accessLevel ?? 0) >= 4 && isEditMode.value && !!props.userToEdit);
const currentFeatureOverrides = computed(() => props.userToEdit ? userStore.featureOverrides[props.userToEdit.IdUser] || [] : []);

const getOverrideValue = (featureKey: HubFeatureKey) => {
    const override = currentFeatureOverrides.value.find(item => item.FeatureKey === featureKey);
    if (!override) return 'inherit';
    return override.IsEnabled ? 'enabled' : 'disabled';
};

const setFeatureOverride = async (featureKey: HubFeatureKey, value: string) => {
    if (!props.userToEdit) return;
    const nextValue = value === 'inherit' ? null : value === 'enabled';
    await userStore.updateFeatureOverride(props.userToEdit.IdUser, featureKey, nextValue);
};

const handleFeatureOverrideChange = (featureKey: HubFeatureKey, event: Event) => {
    setFeatureOverride(featureKey, (event.target as HTMLSelectElement).value);
};

const form = reactive({
    username: '',
    password: '',
    role: 'Jefe' as UserRole,
    jefatura: 'Corporativo',
    gerencia: 'Corporativo',
    zona: 'Corporativo',
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
const loadingZonas = ref(false);
const loadingJefaturas = ref(false);

onMounted(async () => {
    await userStore.fetchGerencias();
    setupStore.fetchFeatureFlags();
    await userStore.fetchJefaturas(form.gerencia);
    await userStore.fetchZonas(form.gerencia, form.jefatura);
});

const jefaturaOptions = computed(() => userStore.jefaturas.map(z => ({ value: z, label: z })));
const gerenciaOptions = computed(() => userStore.gerencias.map(g => ({ value: g, label: g })));
const zonaOptions = computed(() => userStore.zonas.map(z => ({ value: z, label: z })));
const canLoadZonas = computed(() => form.gerencia !== 'Corporativo' && form.jefatura !== 'Corporativo');

const currentRoleLabel = computed(() => {
    const opt = ROLE_OPTIONS.find(r => r.level === form.accessLevel);
    return opt ? opt.label : 'Sin rol';
});

const accessLevelOptions = computed(() => ROLE_OPTIONS.map(item => ({
    level: item.level,
    label: item.label
})));

const setAccessLevel = (level: number) => {
    form.accessLevel = level;
    const opt = ROLE_OPTIONS.find(r => r.level === level);
    if (opt) form.role = opt.value;
};

const loadUserData = (u: UserFull | null) => {
    if (u) {
        form.username = u.Usuario;
        form.password = '';
        form.role = u.TipoUser as UserRole;
        form.jefatura = u.jefatura || 'Corporativo';
        form.gerencia = u.Gerencia || 'Corporativo';
        form.zona = u.Zona || 'Corporativo';
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
        form.zona = 'Corporativo';
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
    if (u && canChangePasswords.value) userStore.fetchFeatureOverrides(u.IdUser);
}, { immediate: true });

watch(() => props.modelValue, (isOpen) => {
    if (isOpen && !props.userToEdit) loadUserData(null);
});

watch(() => form.username, (newVal) => {
    if (!isEditMode.value && !isServerUserEdited.value) {
        form.serverUser = `EMBUTIDOSCORONA\\${newVal}`;
    }
});

watch(() => form.gerencia, async (newGerencia) => {
    loadingZonas.value = true;
    loadingJefaturas.value = true;
    try {
        await userStore.fetchJefaturas(newGerencia);

        if (newGerencia === 'Corporativo') {
            form.zona = 'Corporativo';
            form.jefatura = 'Corporativo';
            await userStore.fetchZonas();
            return;
        }

        if (form.jefatura !== 'Corporativo' && !userStore.jefaturas.includes(form.jefatura)) {
            form.jefatura = 'Corporativo';
        }

        await userStore.fetchZonas(newGerencia, form.jefatura);

        if (form.zona !== 'Corporativo' && !userStore.zonas.includes(form.zona)) {
            form.zona = 'Corporativo';
        }
    } finally {
        loadingZonas.value = false;
        loadingJefaturas.value = false;
    }
});

watch(() => form.jefatura, async () => {
    if (!canLoadZonas.value) {
        form.zona = 'Corporativo';
        await userStore.fetchZonas();
        return;
    }

    loadingZonas.value = true;
    try {
        await userStore.fetchZonas(form.gerencia, form.jefatura);
        if (form.zona !== 'Corporativo' && !userStore.zonas.includes(form.zona)) {
            form.zona = 'Corporativo';
        }
    } finally {
        loadingZonas.value = false;
    }
});

const handleServerUserEdit = () => {
    isServerUserEdited.value = true;
};

const closeModal = () => {
    emit('update:modelValue', false);
    emit('cancel');
};

const handlePasswordChange = async () => {
    if (!newPassword.value || newPassword.value.length < 4) {
        errorMessage.value = 'La nueva contrasena debe tener al menos 4 caracteres.';
        return;
    }

    if (!props.userToEdit) return;

    isSubmitting.value = true;
    errorMessage.value = '';
    try {
        await userStore.changePassword(props.userToEdit.IdUser, newPassword.value);
        newPassword.value = '';
        isChangingPassword.value = false;
        alert('Contrasena actualizada con exito');
    } catch (e: any) {
        errorMessage.value = e.response?.data?.message || 'Error al cambiar contrasena.';
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
                zona: form.zona,
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
                zona: form.zona,
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
    <div v-if="isEmbedded" class="user-form-surface space-y-4">
        <div v-if="errorMessage" class="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
            <i class="fa-solid fa-circle-exclamation mr-2"></i>
            {{ errorMessage }}
        </div>

        <section class="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-100 transition hover:border-red-100 sm:p-5">
            <div class="absolute inset-y-0 left-0 w-1 bg-red-600"></div>
            <div class="mb-5 pl-1">
                <p class="text-[10px] font-black uppercase text-red-600">Identidad de usuario</p>
                <h4 class="mt-1 text-sm font-black text-slate-900">Datos personales</h4>
                <p class="mt-1 text-xs font-semibold text-slate-500">Identidad y credenciales visibles del usuario.</p>
            </div>
            <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div class="editable-field">
                    <FormInput v-model="form.nombre" label="Nombre Completo" placeholder="Nombre real" icon="fa-solid fa-id-card" required />
                </div>
                <div class="editable-field">
                    <FormInput v-model="form.no_emp" label="No. Empleado" placeholder="12345" icon="fa-solid fa-hashtag" required />
                </div>
                <div class="editable-field is-disabled">
                    <FormInput v-model="form.username" label="Nombre de Usuario" placeholder="Nombre de acceso" icon="fa-solid fa-user-circle" disabled />
                </div>
                <div class="editable-field">
                    <FormInput v-model="form.serverUser" label="Server ID" placeholder="DOMAIN\user" icon="fa-solid fa-server" />
                </div>
            </div>
        </section>

        <section class="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-100 transition hover:border-red-100 sm:p-5">
            <div class="absolute inset-y-0 left-0 w-1 bg-red-600"></div>
            <div class="mb-5 pl-1">
                <p class="text-[10px] font-black uppercase text-red-600">Alcance comercial</p>
                <h4 class="mt-1 text-sm font-black text-slate-900">Organizacion</h4>
                <p class="mt-1 text-xs font-semibold text-slate-500">Alcance operativo para reportes y permisos por zona.</p>
            </div>
            <div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <div class="editable-field">
                    <FormSelect v-model="form.gerencia" label="Gerencia" :options="gerenciaOptions" />
                </div>
                <div class="editable-field">
                    <FormSelect v-model="form.jefatura" label="Jefatura" :options="jefaturaOptions" :disabled="loadingJefaturas" />
                </div>
                <div class="editable-field" :class="{ 'is-disabled': loadingZonas || !canLoadZonas }">
                    <FormSelect v-model="form.zona" label="Zona" :options="zonaOptions" :disabled="loadingZonas || !canLoadZonas" />
                </div>
            </div>
            <p class="mt-4 rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2 text-xs font-semibold text-slate-500">
                Usa "Corporativo" cuando el usuario no pertenece a una estructura operativa.
            </p>
        </section>

        <section v-if="props.showAccessLevel !== false" class="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-100 transition hover:border-red-100 sm:p-5">
            <div class="absolute inset-y-0 left-0 w-1 bg-red-600"></div>
            <div class="flex flex-col gap-3 pl-1 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <p class="text-[10px] font-black uppercase text-red-600">Control de permisos</p>
                    <h4 class="mt-1 text-sm font-black text-slate-900">Nivel de acceso</h4>
                    <p class="mt-1 text-xs font-semibold text-slate-500">{{ currentRoleLabel }}</p>
                </div>
                <span class="w-fit rounded-md border border-red-100 bg-red-50 px-2.5 py-1 text-[10px] font-black uppercase text-red-700">
                    Nivel {{ form.accessLevel }}
                </span>
            </div>
            <div class="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <button
                    v-for="option in accessLevelOptions"
                    :key="option.level"
                    type="button"
                    class="group min-h-14 rounded-lg border px-3 py-2 text-left transition"
                    :class="option.level === form.accessLevel ? 'border-red-600 bg-red-600 text-white shadow-sm shadow-red-100' : 'border-slate-200 bg-white text-slate-600 hover:border-red-200 hover:bg-red-50/70 hover:text-red-700'"
                    @click="setAccessLevel(option.level)"
                >
                    <span
                        class="block text-[10px] font-black uppercase"
                        :class="option.level === form.accessLevel ? 'text-red-50' : 'text-slate-400 group-hover:text-red-500'"
                    >
                        Nivel {{ option.level }}
                    </span>
                    <span class="mt-1 block truncate text-xs font-black">{{ option.label }}</span>
                </button>
            </div>
        </section>

        <section v-if="canChangePasswords && isEditMode" class="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-100 transition hover:border-red-100 sm:p-5">
            <div class="absolute inset-y-0 left-0 w-1 bg-red-600"></div>
            <div class="mb-5 flex items-start justify-between gap-3 pl-1">
                <div>
                    <p class="text-[10px] font-black uppercase text-red-600">Seguridad</p>
                    <h4 class="mt-1 text-sm font-black text-slate-900">Cambio de contrasena</h4>
                    <p class="mt-1 text-xs font-semibold text-slate-500">Cambio manual de contrasena.</p>
                </div>
                <span class="rounded-md border border-red-100 bg-red-50 px-2 py-1 text-[10px] font-black uppercase text-red-700">Permitido</span>
            </div>
            <Button v-if="!isChangingPassword" variant="outline" size="sm" class="h-10 w-full rounded-lg border-red-100 text-xs font-black text-red-700 hover:bg-red-50" @click="isChangingPassword = true">
                Cambiar contrasena
            </Button>
            <div v-else class="space-y-3">
                <div class="editable-field">
                    <FormInput v-model="newPassword" type="password" label="Nueva contrasena" placeholder="Minimo 4 caracteres" />
                </div>
                <div class="grid grid-cols-2 gap-2">
                    <Button variant="outline" size="sm" class="h-10 rounded-lg border-slate-200 text-xs font-black text-slate-600 hover:bg-slate-50" @click="isChangingPassword = false">
                        Cancelar
                    </Button>
                    <Button size="sm" class="h-10 rounded-lg bg-red-600 text-xs font-black text-white hover:bg-red-700" :disabled="isSubmitting" @click="handlePasswordChange">
                        Confirmar
                    </Button>
                </div>
            </div>
        </section>

        <section v-if="canManageFeatureOverrides" class="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-100 transition hover:border-red-100 sm:p-5">
            <div class="absolute inset-y-0 left-0 w-1 bg-red-600"></div>
            <div class="mb-5 pl-1">
                <p class="text-[10px] font-black uppercase text-red-600">Visibilidad por usuario</p>
                <h4 class="mt-1 text-sm font-black text-slate-900">Permisos especiales del Hub</h4>
                <p class="mt-1 text-xs font-semibold text-slate-500">Heredar respeta la configuracion global.</p>
            </div>
            <div class="grid gap-3 lg:grid-cols-2">
                <div v-for="feature in setupStore.normalizedFeatureFlags" :key="feature.FeatureKey" class="rounded-xl border border-slate-100 bg-slate-50/80 p-4 transition hover:border-red-100 hover:bg-red-50/20">
                    <p class="text-sm font-black text-slate-800">{{ feature.FeatureName }}</p>
                    <p class="mt-1 text-xs font-semibold text-slate-500">{{ feature.Description }}</p>
                    <select
                        :value="getOverrideValue(feature.FeatureKey)"
                        class="mt-4 h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-black text-slate-700 outline-none transition hover:border-red-100 hover:bg-white focus:border-red-500 focus:ring-2 focus:ring-red-100"
                        @change="handleFeatureOverrideChange(feature.FeatureKey, $event)"
                    >
                        <option value="inherit">Heredar configuracion global</option>
                        <option value="enabled">Forzar visible</option>
                        <option value="disabled">Forzar oculto</option>
                    </select>
                </div>
            </div>
        </section>

        <div class="sticky bottom-0 -mx-4 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:bg-transparent sm:px-0 sm:pt-4">
            <div class="grid grid-cols-2 gap-2 sm:flex sm:justify-end">
                <Button variant="outline" class="h-10 rounded-lg border-slate-200 text-xs font-black text-slate-600 hover:bg-slate-50" @click="emit('cancel')">
                    Cancelar
                </Button>
                <Button class="h-10 rounded-lg bg-red-600 px-5 text-xs font-black text-white hover:bg-red-700" :disabled="isSubmitting" @click="handleSubmit">
                    <i v-if="isSubmitting" class="fa-solid fa-circle-notch fa-spin mr-2"></i>
                    <i v-else class="fa-solid fa-floppy-disk mr-2"></i>
                    Guardar
                </Button>
            </div>
        </div>
    </div>

    <ModalDialog v-else :model-value="!!modelValue" :title="modalTitle" size="2xl" @close="closeModal">
        <template #default>
            <div class="user-form-surface space-y-4">
                <section class="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-100 sm:p-5">
                    <div class="absolute inset-y-0 left-0 w-1 bg-red-600"></div>
                    <div class="flex items-center gap-3 pl-1">
                        <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-600 text-white shadow-sm shadow-red-100">
                            <i class="fa-solid fa-user-plus text-sm"></i>
                        </div>
                        <div class="min-w-0">
                            <p class="text-[10px] font-black uppercase text-red-600">Control de usuarios</p>
                            <h4 class="mt-1 text-base font-black text-slate-900">Alta de Usuario</h4>
                            <p class="mt-1 text-xs font-semibold text-slate-500">Datos personales, credenciales y alcance inicial.</p>
                        </div>
                    </div>
                </section>

                <div v-if="errorMessage" class="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
                    <i class="fa-solid fa-circle-exclamation mr-2"></i>{{ errorMessage }}
                </div>

                <section class="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-100 transition hover:border-red-100 sm:p-5">
                    <div class="absolute inset-y-0 left-0 w-1 bg-red-600"></div>
                    <div class="mb-5 pl-1">
                        <p class="text-[10px] font-black uppercase text-red-600">Identidad de usuario</p>
                        <h4 class="mt-1 text-sm font-black text-slate-900">Datos personales</h4>
                        <p class="mt-1 text-xs font-semibold text-slate-500">Captura el nombre, empleado y credenciales de acceso.</p>
                    </div>
                    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div class="editable-field">
                            <FormInput v-model="form.nombre" label="Nombre Completo" placeholder="Ej: Juan Perez" icon="fa-solid fa-id-card" required />
                        </div>
                        <div class="editable-field">
                            <FormInput v-model="form.no_emp" label="No. Empleado" placeholder="Ej: 5432" icon="fa-solid fa-hashtag" required />
                        </div>
                        <div class="editable-field">
                            <FormInput v-model="form.username" label="Usuario (Login)" placeholder="Ej: jperez" icon="fa-solid fa-at" required />
                        </div>
                        <div class="editable-field">
                            <FormInput v-model="form.password" label="Contrasena" type="password" placeholder="Minimo 4 caracteres" icon="fa-solid fa-key" required />
                        </div>
                    </div>
                </section>

                <section class="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-100 transition hover:border-red-100 sm:p-5">
                    <div class="absolute inset-y-0 left-0 w-1 bg-red-600"></div>
                    <div class="mb-5 pl-1">
                        <p class="text-[10px] font-black uppercase text-red-600">Alcance comercial</p>
                        <h4 class="mt-1 text-sm font-black text-slate-900">Servidor y organizacion</h4>
                        <p class="mt-1 text-xs font-semibold text-slate-500">Define dominio y estructura operativa inicial.</p>
                    </div>
                    <div class="editable-field">
                        <FormInput v-model="form.serverUser" label="Servidor / Dominio" placeholder="Ej: EMBUTIDOSCORONA\usuario" icon="fa-solid fa-network-wired" @update:model-value="handleServerUserEdit" />
                    </div>
                    <div class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <div class="editable-field">
                            <FormSelect v-model="form.gerencia" label="Gerencia" :options="gerenciaOptions" />
                        </div>
                        <div class="editable-field" :class="{ 'is-disabled': loadingJefaturas }">
                            <FormSelect v-model="form.jefatura" label="Jefatura" :options="jefaturaOptions" :disabled="loadingJefaturas" />
                        </div>
                        <div class="editable-field" :class="{ 'is-disabled': loadingZonas || !canLoadZonas }">
                            <FormSelect v-model="form.zona" label="Zona" :options="zonaOptions" :disabled="loadingZonas || !canLoadZonas" />
                        </div>
                    </div>
                </section>

                <section class="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-100 transition hover:border-red-100 sm:p-5">
                    <div class="absolute inset-y-0 left-0 w-1 bg-red-600"></div>
                    <div class="flex flex-col gap-3 pl-1 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <p class="text-[10px] font-black uppercase text-red-600">Control de permisos</p>
                            <h4 class="mt-1 text-sm font-black text-slate-900">Nivel de acceso</h4>
                            <p class="mt-1 text-xs font-semibold text-slate-500">{{ currentRoleLabel }}</p>
                        </div>
                        <span class="w-fit rounded-md border border-red-100 bg-red-50 px-2.5 py-1 text-[10px] font-black uppercase text-red-700">
                            Nivel {{ form.accessLevel }}
                        </span>
                    </div>
                    <div class="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                        <button
                            v-for="option in accessLevelOptions"
                            :key="option.level"
                            type="button"
                            class="group min-h-14 rounded-lg border px-3 py-2 text-left transition"
                            :class="option.level === form.accessLevel ? 'border-red-600 bg-red-600 text-white shadow-sm shadow-red-100' : 'border-slate-200 bg-white text-slate-600 hover:border-red-200 hover:bg-red-50/70 hover:text-red-700'"
                            @click="setAccessLevel(option.level)"
                        >
                            <span
                                class="block text-[10px] font-black uppercase"
                                :class="option.level === form.accessLevel ? 'text-red-50' : 'text-slate-400 group-hover:text-red-500'"
                            >
                                Nivel {{ option.level }}
                            </span>
                            <span class="mt-1 block truncate text-xs font-black">{{ option.label }}</span>
                        </button>
                    </div>
                </section>
            </div>
        </template>

        <template #footer>
            <div class="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p class="text-xs font-semibold text-slate-500">Nombre y No. Empleado son obligatorios.</p>
                <div class="grid grid-cols-2 gap-2 sm:flex">
                    <Button variant="outline" class="h-10 rounded-lg border-slate-200 text-xs font-black text-slate-600 hover:bg-slate-50" @click="closeModal">
                        Cancelar
                    </Button>
                    <Button class="h-10 rounded-lg bg-red-600 px-5 text-xs font-black text-white hover:bg-red-700" :disabled="isSubmitting" @click="handleSubmit">
                        <i v-if="isSubmitting" class="fa-solid fa-circle-notch fa-spin mr-2"></i>
                        Crear Usuario
                    </Button>
                </div>
            </div>
        </template>
    </ModalDialog>
</template>

<style scoped>
.user-form-surface :deep(label) {
    font-size: 0.75rem;
    font-weight: 800;
    color: rgb(71 85 105);
}

.editable-field {
    border-radius: 0.75rem;
    border: 1px solid rgb(241 245 249);
    background: rgb(248 250 252 / 0.8);
    padding: 0.875rem;
    transition: border-color 0.15s ease, background-color 0.15s ease, box-shadow 0.15s ease;
}

.editable-field:hover {
    border-color: rgb(254 202 202);
    background: rgb(254 242 242 / 0.35);
}

.editable-field:focus-within {
    border-color: rgb(254 202 202);
    background: rgb(255 255 255);
    box-shadow: 0 1px 2px rgb(15 23 42 / 0.04);
}

.editable-field.is-disabled {
    opacity: 0.78;
}

.user-form-surface :deep(input),
.user-form-surface :deep(select) {
    height: 2.5rem;
    border-radius: 0.5rem;
    border: 1px solid rgb(226 232 240);
    box-shadow: none !important;
    outline: none !important;
    transition: border-color 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease;
}

.editable-field:hover :deep(input:not(:disabled)),
.editable-field:hover :deep(select:not(:disabled)) {
    border-color: rgb(254 202 202) !important;
    background-color: rgb(255 255 255);
}

.user-form-surface :deep(select) {
    background-color: rgb(248 250 252);
}

.user-form-surface :deep(input:focus),
.user-form-surface :deep(select:focus) {
    border-color: rgb(239 68 68) !important;
    box-shadow: 0 0 0 2px rgb(254 226 226) !important;
    --tw-ring-offset-shadow: 0 0 #0000 !important;
    --tw-ring-shadow: 0 0 #0000 !important;
}

.user-form-surface :deep(input:focus-visible),
.user-form-surface :deep(select:focus-visible) {
    outline: none !important;
}
</style>
