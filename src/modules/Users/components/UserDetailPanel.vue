<!-- src/modules/Users/components/UserDetailPanel.vue -->
<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { UserFull, UserRole } from '../types/user.types';
import { ROLE_OPTIONS } from '../types/user.types';
import UserStatusBadge from './UserStatusBadge.vue';
import UserForm from './UserForm.vue';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/modules/Auth/views/stores/authStore';
import { useSetupStore } from '@/modules/Setup/stores/setupStores';
import { useUserStore } from '../stores/userStore';
import type { HubFeatureKey } from '@/modules/Setup/types/setupTypes';

type TabKey = 'perfil' | 'tiendas' | 'acceso' | 'hub' | 'actividad' | 'editar';

const props = defineProps<{
  user: UserFull | null;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'saved'): void;
  (e: 'block', user: UserFull): void;
  (e: 'delete', user: UserFull): void;
  (e: 'message', user: UserFull): void;
}>();

const activeTab = ref<TabKey>('perfil');
const authStore = useAuthStore();
const setupStore = useSetupStore();
const userStore = useUserStore();
const accessLevelDraft = ref(1);
const accessError = ref('');
const isSavingAccess = ref(false);
const newPassword = ref('');
const isChangingPassword = ref(false);
const passwordError = ref('');
const isSavingPassword = ref(false);
const storeSearch = ref('');

const tabs: { key: TabKey; label: string; icon: string }[] = [
  { key: 'perfil', label: 'Perfil', icon: 'fa-regular fa-user' },
  { key: 'tiendas', label: 'Mis tiendas', icon: 'fa-solid fa-store' },
  { key: 'acceso', label: 'Acceso', icon: 'fa-solid fa-briefcase' },
  { key: 'hub', label: 'Configuracion del Hub', icon: 'fa-solid fa-sliders' },
  { key: 'actividad', label: 'Actividad', icon: 'fa-regular fa-clock' },
  { key: 'editar', label: 'Editar', icon: 'fa-solid fa-pen' }
];

watch(() => props.user?.IdUser, async (id) => {
  activeTab.value = 'perfil';
  accessLevelDraft.value = props.user?.AccessLevel || 1;
  accessError.value = '';
  passwordError.value = '';
  newPassword.value = '';
  isChangingPassword.value = false;
  storeSearch.value = '';
  if (!id) return;
  setupStore.fetchFeatureFlags();
  if ((authStore.user?.accessLevel ?? 0) >= 4) {
    await userStore.fetchFeatureOverrides(id);
  }
}, { immediate: true });

watch([activeTab, () => props.user?.IdUser], async ([tab]) => {
  if (tab !== 'tiendas' || !props.user) return;
  await userStore.fetchAssignedStores(props.user);
});

const userInitials = computed(() => {
  if (!props.user) return '';
  return props.user.Usuario.substring(0, 2).toUpperCase();
});

const displayName = computed(() => props.user?.nombre || props.user?.Usuario || '');

const roleLabel = computed(() => {
  if (!props.user) return 'Sin rol';
  const map: Record<string, string> = {
    SuperAdmin: 'Super administrador',
    Admin: 'Administrador',
    Gerente: 'Gerente',
    Jefe: 'Jefe'
  };
  return map[props.user.TipoUser] || props.user.TipoUser;
});

const draftRoleLabel = computed(() => {
  const option = ROLE_OPTIONS.find(item => item.level === accessLevelDraft.value);
  return option?.label || roleLabel.value;
});

const accessLevelOptions = computed(() => ROLE_OPTIONS.map(item => ({
  level: item.level,
  label: item.label
})));

const canChangePasswords = computed(() => (authStore.user?.accessLevel ?? 0) >= 4);

const isOnline = computed(() => {
  if (!props.user?.LastActivity) return false;
  const diffMs = Date.now() - new Date(props.user.LastActivity).getTime();
  return diffMs >= 0 && diffMs <= 15 * 60 * 1000;
});

const formatDate = (dateStr: string | null | undefined) => {
  if (!dateStr) return 'Sin registro';
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return 'Sin registro';
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(date);
};

const formatTime = (dateStr: string | null | undefined) => {
  if (!dateStr) return 'Sin actividad';
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return 'Sin actividad';
  return new Intl.DateTimeFormat('es-MX', {
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};

const formatRelative = (dateStr: string | null) => {
  if (!dateStr) return 'Offline';
  const d = new Date(dateStr);
  const diffMs = Date.now() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Ahora';
  if (diffMins < 60) return `${diffMins}m`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h`;
  return `${Math.floor(diffHours / 24)}d`;
};

const accessTone = computed(() => {
  const level = props.user?.AccessLevel || 0;
  if (level >= 4) return 'bg-red-50 text-red-700 border-red-100';
  return 'bg-slate-50 text-slate-600 border-slate-200';
});

const profileItems = computed(() => {
  if (!props.user) return [];
  return [
    { label: 'Nombre completo', value: displayName.value },
    { label: 'No. empleado', value: props.user.no_emp || 'Sin dato' },
    { label: 'Usuario', value: props.user.Usuario },
    { label: 'Servidor / dominio', value: props.user.ServerUser || 'Sin ID servidor' },
    { label: 'Estado', value: props.user.Status || 'active' },
    { label: 'Ultimo acceso', value: `${formatDate(props.user.LastActivity)} ${formatTime(props.user.LastActivity)}` }
  ];
});

const organizationItems = computed(() => {
  if (!props.user) return [];
  return [
    { label: 'Gerencia', value: props.user.Gerencia || 'Corporativo', icon: 'fa-solid fa-building' },
    { label: 'Jefatura', value: props.user.jefatura || 'Corporativo', icon: 'fa-solid fa-user-tie' },
    { label: 'Zona', value: props.user.Zona || 'Corporativo', icon: 'fa-solid fa-location-dot' }
  ];
});

const assignedStores = computed(() => {
  if (!props.user) return [];
  return userStore.assignedStores[props.user.IdUser] || [];
});

const isLoadingAssignedStores = computed(() => {
  if (!props.user) return false;
  return userStore.assignedStoresLoading[props.user.IdUser] || false;
});

const assignedStoresError = computed(() => {
  if (!props.user) return '';
  return userStore.assignedStoresError[props.user.IdUser] || '';
});

const assignedStoresFilters = computed(() => {
  if (!props.user) return {};
  return userStore.buildAssignedStoreFilters(props.user);
});

const assignedStoresSummary = computed(() => {
  const matrices = new Set(assignedStores.value.map(item => item.matriz).filter(Boolean));
  const rutas = new Set(assignedStores.value.map(item => item.Ruta).filter(Boolean));
  return {
    stores: assignedStores.value.length,
    matrices: matrices.size,
    routes: rutas.size
  };
});

const assignedScopeLabels = computed(() => {
  if (props.user?.TipoUser === 'SuperAdmin') {
    return ['Alcance: todas las tiendas'];
  }

  return Object.entries(assignedStoresFilters.value)
    .map(([key, values]) => `${key}: ${values.join(', ')}`);
});

const filteredAssignedStores = computed(() => {
  const query = storeSearch.value.trim().toLowerCase();
  if (!query) return assignedStores.value;

  return assignedStores.value.filter(item => [
    item.matriz,
    item.Nombre,
    item.Ruta,
    item.Zona
  ].some(value => String(value || '').toLowerCase().includes(query)));
});

const activityItems = computed(() => {
  if (!props.user) return [];
  return [
    {
      title: isOnline.value ? 'Sesion activa' : 'Ultima actividad registrada',
      description: `${formatDate(props.user.LastActivity)} ${formatTime(props.user.LastActivity)}`,
      tone: isOnline.value ? 'bg-emerald-500' : 'bg-slate-400'
    },
    {
      title: 'Cuenta creada',
      description: formatDate(props.user.CreatedAt),
      tone: 'bg-slate-500'
    },
    {
      title: props.user.Status === 'blocked' ? 'Cuenta bloqueada' : 'Cuenta habilitada',
      description: props.user.Status === 'blocked' ? 'El usuario no puede iniciar sesion.' : 'El usuario puede operar segun su nivel.',
      tone: props.user.Status === 'blocked' ? 'bg-red-500' : 'bg-emerald-500'
    }
  ];
});

const canManageFeatureOverrides = computed(() => (authStore.user?.accessLevel ?? 0) >= 4 && !!props.user);

const currentFeatureOverrides = computed(() => {
  if (!props.user) return [];
  return userStore.featureOverrides[props.user.IdUser] || [];
});

const getOverrideValue = (featureKey: HubFeatureKey) => {
  const override = currentFeatureOverrides.value.find(item => item.FeatureKey === featureKey);
  if (!override) return 'inherit';
  return override.IsEnabled ? 'enabled' : 'disabled';
};

const setFeatureOverride = async (featureKey: HubFeatureKey, value: string) => {
  if (!props.user || !canManageFeatureOverrides.value) return;
  const nextValue = value === 'inherit' ? null : value === 'enabled';
  await userStore.updateFeatureOverride(props.user.IdUser, featureKey, nextValue);
};

const handleFeatureOverrideChange = (featureKey: HubFeatureKey, event: Event) => {
  setFeatureOverride(featureKey, (event.target as HTMLSelectElement).value);
};

const setAccessLevel = (level: number) => {
  accessLevelDraft.value = level;
};

const saveAccessLevel = async () => {
  if (!props.user) return;
  const option = ROLE_OPTIONS.find(item => item.level === accessLevelDraft.value);
  if (!option) {
    accessError.value = 'Nivel de acceso invalido.';
    return;
  }

  isSavingAccess.value = true;
  accessError.value = '';
  try {
    await userStore.updateUser(props.user.IdUser, {
      accessLevel: accessLevelDraft.value,
      role: option.value as UserRole
    });
    emit('saved');
  } catch (error: any) {
    accessError.value = error.response?.data?.message || 'Error al actualizar el nivel de acceso.';
  } finally {
    isSavingAccess.value = false;
  }
};

const changePassword = async () => {
  if (!props.user) return;
  if (!newPassword.value || newPassword.value.length < 4) {
    passwordError.value = 'La nueva contrasena debe tener al menos 4 caracteres.';
    return;
  }

  isSavingPassword.value = true;
  passwordError.value = '';
  try {
    await userStore.changePassword(props.user.IdUser, newPassword.value);
    newPassword.value = '';
    isChangingPassword.value = false;
  } catch (error: any) {
    passwordError.value = error.response?.data?.message || 'Error al cambiar contrasena.';
  } finally {
    isSavingPassword.value = false;
  }
};
</script>

<template>
  <section class="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
    <div v-if="user" class="flex min-h-0 flex-1 flex-col">
      <header class="shrink-0 border-b border-slate-100 px-4 py-4 sm:px-5 lg:px-6">
        <div class="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
          <div class="grid min-w-0 grid-cols-[56px_minmax(0,1fr)] gap-4 sm:grid-cols-[64px_minmax(0,1fr)]">
            <div class="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-red-600 text-lg font-black text-white shadow-lg shadow-red-100 sm:h-16 sm:w-16 sm:text-xl">
              {{ userInitials }}
              <span
                class="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-white"
                :class="isOnline ? 'bg-emerald-500' : 'bg-slate-300'"
              ></span>
            </div>

            <div class="min-w-0">
              <div class="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
                <h2 class="truncate text-xl font-black leading-tight text-slate-900 sm:text-2xl">{{ displayName }}</h2>
                <div class="flex shrink-0">
                  <UserStatusBadge :status="user.Status || 'active'" />
                </div>
              </div>
              <div class="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-bold uppercase text-slate-500">
                <span>@{{ user.Usuario }}</span>
                <span>No. empleado: {{ user.no_emp || '---' }}</span>
                <span class="break-all">{{ user.ServerUser || 'Sin ID servidor' }}</span>
              </div>
              <div class="mt-3 flex flex-wrap items-center gap-2">
                <span :class="cn('rounded-md border px-2 py-0.5 text-[10px] font-black uppercase', accessTone)">
                  {{ roleLabel }}
                </span>
              </div>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end lg:max-w-[430px]">
            <Button
              variant="outline"
              class="h-9 rounded-lg border-slate-200 px-3 text-xs font-black text-slate-600 hover:bg-slate-50"
              @click="emit('message', user)"
            >
              <i class="fa-regular fa-message mr-2 text-slate-500"></i>
              Chat
            </Button>
            <Button
              variant="outline"
              class="h-9 rounded-lg px-3 text-xs font-black"
              :class="user.Status === 'blocked' ? 'border-emerald-200 text-emerald-700 hover:bg-emerald-50' : 'border-red-200 text-red-700 hover:bg-red-50'"
              @click="emit('block', user)"
            >
              <i :class="user.Status === 'blocked' ? 'fa-solid fa-lock-open' : 'fa-solid fa-lock'" class="mr-2"></i>
              {{ user.Status === 'blocked' ? 'Desbloquear' : 'Bloquear' }}
            </Button>
            <Button
              variant="outline"
              class="h-9 rounded-lg border-slate-200 px-3 text-xs font-black text-slate-600 hover:bg-slate-50"
              @click="activeTab = 'editar'"
            >
              <i class="fa-solid fa-pen mr-2 text-slate-500"></i>
              Editar
            </Button>
            <Button
              variant="outline"
              class="h-9 rounded-lg border-red-200 px-3 text-xs font-black text-red-700 hover:bg-red-50"
              @click="emit('delete', user)"
            >
              <i class="fa-solid fa-trash-can mr-2"></i>
              Eliminar
            </Button>
            <Button
              variant="ghost"
              size="icon"
              class="h-10 w-10 rounded-lg text-slate-500 hover:bg-slate-50 xl:hidden"
              @click="emit('close')"
            >
              <i class="fa-solid fa-xmark"></i>
            </Button>
          </div>
        </div>
      </header>

      <nav class="shrink-0 overflow-x-auto border-b border-slate-100 px-3 sm:px-5 lg:px-6">
        <div class="flex min-w-max gap-1 py-2">
          <button
            v-for="tab in tabs"
            :key="tab.key"
            type="button"
            class="flex h-9 items-center gap-2 rounded-lg px-3 text-xs font-black transition"
            :class="activeTab === tab.key ? 'bg-red-50 text-red-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'"
            @click="activeTab = tab.key"
          >
            <i :class="tab.icon"></i>
            {{ tab.label }}
          </button>
        </div>
      </nav>

      <div class="min-h-0 flex-1 overflow-y-auto bg-slate-50/60 p-3 sm:p-5 lg:p-6">
        <div v-if="activeTab === 'perfil'" class="grid gap-4 lg:grid-cols-[1.1fr_0.9fr] xl:grid-cols-[1.15fr_0.85fr]">
          <section class="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-100 sm:p-5">
            <div class="absolute inset-y-0 left-0 w-1 bg-red-600"></div>
            <div class="mb-5 flex items-center justify-between gap-3 pl-1">
              <div>
                <p class="text-[10px] font-black uppercase text-red-600">Perfil operativo</p>
                <h3 class="mt-1 text-sm font-black text-slate-900">Informacion personal</h3>
              </div>
              <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 text-red-600">
                <i class="fa-solid fa-user-pen text-xs"></i>
              </div>
            </div>
            <dl class="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div
                v-for="item in profileItems"
                :key="item.label"
                class="rounded-lg border border-slate-100 bg-slate-50/70 px-3 py-3"
              >
                <dt class="text-[10px] font-black uppercase text-slate-500">{{ item.label }}</dt>
                <dd class="mt-1.5 break-words text-sm font-black text-slate-900">{{ item.value }}</dd>
              </div>
            </dl>
          </section>

          <section class="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-100 sm:p-5">
            <div class="absolute inset-y-0 left-0 w-1 bg-red-600"></div>
            <div class="mb-5 flex items-center justify-between gap-3 pl-1">
              <div>
                <p class="text-[10px] font-black uppercase text-red-600">Alcance comercial</p>
                <h3 class="mt-1 text-sm font-black text-slate-900">Organizacion</h3>
              </div>
              <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-50 text-slate-600 ring-1 ring-slate-100">
                <i class="fa-solid fa-sitemap text-xs"></i>
              </div>
            </div>
            <div class="grid gap-3">
              <div
                v-for="item in organizationItems"
                :key="item.label"
                class="group grid grid-cols-[38px_minmax(0,1fr)] items-center gap-3 rounded-lg border border-slate-100 bg-slate-50/80 p-3 transition hover:border-red-100 hover:bg-red-50/30"
              >
                <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-slate-500 shadow-sm ring-1 ring-slate-100 transition group-hover:text-red-600 group-hover:ring-red-100">
                  <i :class="item.icon" class="text-xs"></i>
                </div>
                <div class="min-w-0">
                  <p class="text-[10px] font-black uppercase text-slate-500 group-hover:text-red-700">{{ item.label }}</p>
                  <p class="mt-0.5 truncate text-sm font-black text-slate-900">{{ item.value }}</p>
                </div>
              </div>
            </div>
          </section>

          <section class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-100 sm:p-5 lg:col-span-2">
            <div class="mb-5 flex items-center justify-between gap-3">
              <div>
                <p class="text-[10px] font-black uppercase text-red-600">Control de cuenta</p>
                <h3 class="mt-1 text-sm font-black text-slate-900">Estado de cuenta</h3>
              </div>
              <span class="rounded-full px-2.5 py-1 text-[10px] font-black uppercase"
                :class="user.Status === 'blocked' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'"
              >
                {{ user.Status === 'blocked' ? 'Bloqueada' : 'Habilitada' }}
              </span>
            </div>
            <div class="grid gap-3 md:grid-cols-3">
              <div class="rounded-lg border border-slate-100 bg-slate-50/80 p-4">
                <div class="mb-3 flex h-8 w-8 items-center justify-center rounded-lg" :class="user.Status === 'blocked' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'">
                  <i :class="user.Status === 'blocked' ? 'fa-solid fa-lock' : 'fa-solid fa-check'" class="text-xs"></i>
                </div>
                <div class="min-w-0">
                  <p class="text-sm font-black text-slate-800">Cuenta {{ user.Status === 'blocked' ? 'bloqueada' : 'habilitada' }}</p>
                  <p class="mt-1 text-xs font-semibold text-slate-500">{{ user.Status === 'blocked' ? 'Requiere desbloqueo para operar.' : 'Puede iniciar sesion con su nivel asignado.' }}</p>
                </div>
              </div>
              <div class="rounded-lg border border-slate-100 bg-slate-50/80 p-4">
                <div class="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-600">
                  <i class="fa-regular fa-clock text-xs"></i>
                </div>
                <div class="min-w-0">
                  <p class="text-sm font-black text-slate-800">Ultimo acceso</p>
                  <p class="mt-1 text-xs font-semibold text-slate-500">{{ formatDate(user.LastActivity) }} {{ formatTime(user.LastActivity) }}</p>
                </div>
              </div>
              <div class="rounded-lg border border-slate-100 bg-slate-50/80 p-4">
                <div class="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                  <i class="fa-regular fa-calendar text-xs"></i>
                </div>
                <div class="min-w-0">
                  <p class="text-sm font-black text-slate-800">Alta en sistema</p>
                  <p class="mt-1 text-xs font-semibold text-slate-500">{{ formatDate(user.CreatedAt) }}</p>
                </div>
              </div>
            </div>
          </section>
        </div>

        <div v-else-if="activeTab === 'tiendas'" class="space-y-4">
          <section class="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-100 sm:p-5">
            <div class="absolute inset-y-0 left-0 w-1 bg-red-600"></div>
            <div class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start">
              <div class="min-w-0 pl-1">
                <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50 text-red-600">
                  <i class="fa-solid fa-store text-sm"></i>
                </div>
                <p class="mt-4 text-[10px] font-black uppercase text-red-600">Cobertura CPFR</p>
                <h3 class="mt-1 text-base font-black text-slate-900">Mis tiendas</h3>
                <p class="mt-1 max-w-2xl text-sm font-semibold leading-6 text-slate-500">
                  Tiendas de Autoservicio y Clubs ligadas a la estructura comercial del usuario.
                </p>
                <div class="mt-3 flex flex-wrap gap-2">
                  <span
                    v-for="scope in assignedScopeLabels"
                    :key="scope"
                    class="rounded-md border border-red-100 bg-red-50/70 px-2 py-1 text-[10px] font-black uppercase text-red-700"
                  >
                    {{ scope }}
                  </span>
                  <span
                    v-if="assignedScopeLabels.length === 0"
                    class="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-black uppercase text-amber-700"
                  >
                    Sin alcance comercial
                  </span>
                </div>
              </div>

              <div class="grid grid-cols-3 gap-2 sm:min-w-[300px]">
                <div class="rounded-xl border border-red-100 bg-red-50/50 p-3 transition hover:border-red-200 hover:bg-red-50">
                  <p class="text-[10px] font-black uppercase text-red-600">Tiendas</p>
                  <p class="mt-1 text-lg font-black text-slate-900">{{ assignedStoresSummary.stores }}</p>
                </div>
                <div class="rounded-xl border border-slate-100 bg-slate-50/80 p-3 transition hover:border-red-100 hover:bg-red-50/30">
                  <p class="text-[10px] font-black uppercase text-slate-500">Matrices</p>
                  <p class="mt-1 text-lg font-black text-slate-900">{{ assignedStoresSummary.matrices }}</p>
                </div>
                <div class="rounded-xl border border-slate-100 bg-slate-50/80 p-3 transition hover:border-red-100 hover:bg-red-50/30">
                  <p class="text-[10px] font-black uppercase text-slate-500">Rutas</p>
                  <p class="mt-1 text-lg font-black text-slate-900">{{ assignedStoresSummary.routes }}</p>
                </div>
              </div>
            </div>

            <div class="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
              <input
                v-model="storeSearch"
                type="search"
                class="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 hover:border-red-100 hover:bg-white focus:border-red-500 focus:bg-white focus:ring-2 focus:ring-red-100"
                placeholder="Buscar por matriz, tienda, ruta o zona"
              />
              <Button
                variant="outline"
                class="h-10 rounded-lg border-red-100 px-4 text-xs font-black text-red-700 hover:bg-red-50"
                :disabled="isLoadingAssignedStores"
                @click="user && userStore.fetchAssignedStores(user)"
              >
                <i v-if="isLoadingAssignedStores" class="fa-solid fa-circle-notch fa-spin mr-2 text-red-500"></i>
                Actualizar
              </Button>
            </div>
          </section>

          <section class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm shadow-slate-100">
            <div v-if="isLoadingAssignedStores" class="flex min-h-[260px] items-center justify-center p-8 text-sm font-bold text-slate-500">
              <i class="fa-solid fa-circle-notch fa-spin mr-2 text-red-500"></i>
              Cargando tiendas asignadas...
            </div>

            <div v-else-if="assignedStoresError" class="flex min-h-[240px] flex-col items-center justify-center p-8 text-center">
              <div class="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-black uppercase text-amber-700">
                {{ assignedStoresError }}
              </div>
              <p class="mt-3 max-w-md text-sm font-semibold text-slate-500">
                Revisa el alcance comercial del usuario antes de consultar tiendas CPFR.
              </p>
            </div>

            <div v-else-if="filteredAssignedStores.length === 0" class="flex min-h-[240px] flex-col items-center justify-center p-8 text-center">
              <p class="text-sm font-black text-slate-800">Sin tiendas para mostrar</p>
              <p class="mt-2 max-w-md text-sm font-semibold text-slate-500">
                No se encontraron tiendas con el alcance comercial o busqueda actual.
              </p>
            </div>

            <div v-else>
              <div class="hidden overflow-x-auto md:block">
                <table class="min-w-full divide-y divide-slate-100 text-left">
                  <thead class="bg-red-50/40">
                    <tr>
                      <th class="px-4 py-3 text-[10px] font-black uppercase text-red-700">Matriz</th>
                      <th class="px-4 py-3 text-[10px] font-black uppercase text-red-700">Nombre</th>
                      <th class="px-4 py-3 text-[10px] font-black uppercase text-red-700">Ruta</th>
                      <th class="px-4 py-3 text-[10px] font-black uppercase text-red-700">Zona</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100 bg-white">
                    <tr
                      v-for="store in filteredAssignedStores"
                      :key="`${store.matriz}-${store.Nombre}-${store.Ruta}`"
                      class="transition hover:bg-red-50/20"
                    >
                      <td class="max-w-[220px] px-4 py-3 text-sm font-black text-slate-900">
                        <span class="inline-flex max-w-full rounded-md border border-slate-100 bg-slate-50 px-2 py-1 text-xs font-black text-slate-800">
                          <span class="truncate">{{ store.matriz || 'Sin matriz' }}</span>
                        </span>
                      </td>
                      <td class="max-w-[360px] px-4 py-3 text-sm font-semibold text-slate-700">
                        <span class="block truncate">{{ store.Nombre || 'Sin nombre' }}</span>
                      </td>
                      <td class="px-4 py-3 text-xs font-black uppercase text-slate-600">
                        <span class="rounded-md bg-red-50 px-2 py-1 text-red-700">{{ store.Ruta || 'Sin ruta' }}</span>
                      </td>
                      <td class="px-4 py-3 text-xs font-black uppercase text-slate-600">
                        {{ store.Zona || 'Sin zona' }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div class="grid gap-3 p-3 md:hidden">
                <article
                  v-for="store in filteredAssignedStores"
                  :key="`${store.matriz}-${store.Nombre}-${store.Ruta}-mobile`"
                  class="rounded-xl border border-slate-100 bg-slate-50/80 p-4 transition hover:border-red-100 hover:bg-red-50/30"
                >
                  <div class="flex items-start justify-between gap-3">
                    <div class="min-w-0">
                      <p class="truncate text-sm font-black text-slate-900">{{ store.Nombre || 'Sin nombre' }}</p>
                      <p class="mt-1 truncate text-xs font-bold text-slate-500">{{ store.matriz || 'Sin matriz' }}</p>
                    </div>
                    <span class="shrink-0 rounded-md border border-red-100 bg-red-50 px-2 py-1 text-[10px] font-black uppercase text-red-700">
                      {{ store.Ruta || 'Sin ruta' }}
                    </span>
                  </div>
                  <div class="mt-3 rounded-lg border border-slate-100 bg-white px-3 py-2">
                    <p class="text-[10px] font-black uppercase text-red-600">Zona</p>
                    <p class="mt-0.5 text-xs font-black uppercase text-slate-800">{{ store.Zona || 'Sin zona' }}</p>
                  </div>
                </article>
              </div>
            </div>
          </section>
        </div>

        <div v-else-if="activeTab === 'acceso'" class="grid gap-4 xl:grid-cols-[1fr_1fr]">
          <section class="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-100 sm:p-5">
            <div class="absolute inset-y-0 left-0 w-1 bg-red-600"></div>
            <div class="flex flex-col gap-3 pl-1 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p class="text-[10px] font-black uppercase text-red-600">Control de permisos</p>
                <h3 class="mt-1 text-sm font-black text-slate-900">Nivel de acceso</h3>
                <p class="mt-1 text-xs font-semibold text-slate-500">Define rol y jerarquia operativa del usuario.</p>
              </div>
              <span :class="cn('w-fit rounded-lg border px-3 py-1 text-[11px] font-black uppercase', accessTone)">
                Actual {{ user.AccessLevel || 0 }}
              </span>
            </div>

            <div class="mt-5 rounded-xl border border-red-100 bg-red-50/30 p-4">
              <div class="flex items-center justify-between gap-4">
                <div>
                  <p class="text-[10px] font-black uppercase text-red-600">Rol seleccionado</p>
                  <p class="mt-1 text-lg font-black text-slate-900">{{ draftRoleLabel }}</p>
                </div>
                <span class="rounded-md border border-red-100 bg-white px-3 py-1 text-[10px] font-black uppercase text-red-700 shadow-sm">
                  Nivel {{ accessLevelDraft }}
                </span>
              </div>

              <div class="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <button
                  v-for="option in accessLevelOptions"
                  :key="option.level"
                  type="button"
                  class="group min-h-14 rounded-lg border px-3 py-2 text-left transition"
                  :class="option.level === accessLevelDraft ? 'border-red-600 bg-red-600 text-white shadow-sm shadow-red-100' : 'border-slate-200 bg-white text-slate-600 hover:border-red-200 hover:bg-red-50/70 hover:text-red-700'"
                  @click="setAccessLevel(option.level)"
                >
                  <span
                    class="block text-[10px] font-black uppercase"
                    :class="option.level === accessLevelDraft ? 'text-red-50' : 'text-slate-400 group-hover:text-red-500'"
                  >
                    Nivel {{ option.level }}
                  </span>
                  <span class="mt-1 block truncate text-xs font-black">{{ option.label }}</span>
                </button>
              </div>
            </div>

            <p v-if="accessError" class="mt-3 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
              {{ accessError }}
            </p>

            <div class="mt-4 flex justify-end">
              <Button
                class="h-10 rounded-lg bg-red-600 px-5 text-xs font-black text-white hover:bg-red-700"
                :disabled="isSavingAccess || accessLevelDraft === (user.AccessLevel || 0)"
                @click="saveAccessLevel"
              >
                <i v-if="isSavingAccess" class="fa-solid fa-circle-notch fa-spin mr-2"></i>
                Guardar acceso
              </Button>
            </div>
          </section>

          <section class="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-100 sm:p-5">
            <div class="absolute inset-y-0 left-0 w-1 bg-red-600"></div>
            <div class="flex flex-col gap-3 pl-1 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p class="text-[10px] font-black uppercase text-red-600">Seguridad</p>
                <h3 class="mt-1 text-sm font-black text-slate-900">Cambio de contrasena</h3>
                <p class="mt-1 text-xs font-semibold text-slate-500">Disponible para usuarios con nivel SuperAdmin.</p>
              </div>
              <span
                class="w-fit rounded-md px-2 py-1 text-[10px] font-black uppercase"
                :class="canChangePasswords ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-500'"
              >
                {{ canChangePasswords ? 'Permitido' : 'Sin permiso' }}
              </span>
            </div>

            <div v-if="canChangePasswords" class="mt-5">
              <Button
                v-if="!isChangingPassword"
                variant="outline"
                class="h-10 w-full rounded-lg border-slate-200 text-xs font-black text-slate-600 hover:bg-slate-50"
                @click="isChangingPassword = true"
              >
                <i class="fa-solid fa-key mr-2 text-slate-500"></i>
                Cambiar contrasena
              </Button>

              <div v-else class="space-y-3">
                <input
                  v-model="newPassword"
                  type="password"
                  class="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100"
                  placeholder="Nueva contrasena"
                />
                <p v-if="passwordError" class="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
                  {{ passwordError }}
                </p>
                <div class="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    class="h-10 rounded-lg border-slate-200 text-xs font-black text-slate-600"
                    @click="isChangingPassword = false; newPassword = ''; passwordError = ''"
                  >
                    Cancelar
                  </Button>
                  <Button
                    class="h-10 rounded-lg bg-red-600 text-xs font-black text-white hover:bg-red-700"
                    :disabled="isSavingPassword"
                    @click="changePassword"
                  >
                    <i v-if="isSavingPassword" class="fa-solid fa-circle-notch fa-spin mr-2"></i>
                    Confirmar
                  </Button>
                </div>
              </div>
            </div>
          </section>

          <section class="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-100 xl:col-span-2">
            <div class="absolute inset-y-0 left-0 w-1 bg-red-600"></div>
            <div class="pl-1">
              <p class="text-[10px] font-black uppercase text-red-600">Identidad</p>
              <h3 class="mt-1 text-sm font-black text-slate-900">Credenciales y alcance</h3>
            </div>
            <div class="mt-5 grid gap-3 sm:grid-cols-2">
              <div class="rounded-lg border border-slate-100 bg-slate-50/80 p-4">
                <p class="text-[10px] font-black uppercase text-slate-500">Usuario</p>
                <p class="mt-1.5 text-sm font-black text-slate-900">@{{ user.Usuario }}</p>
              </div>
              <div class="rounded-lg border border-slate-100 bg-slate-50/80 p-4">
                <p class="text-[10px] font-black uppercase text-slate-500">Servidor</p>
                <p class="mt-1.5 break-words text-sm font-black text-slate-900">{{ user.ServerUser || 'Sin ID servidor' }}</p>
              </div>
              <div class="rounded-lg border border-slate-100 bg-slate-50/80 p-4">
                <p class="text-[10px] font-black uppercase text-slate-500">Estado</p>
                <UserStatusBadge class="mt-1" :status="user.Status || 'active'" />
              </div>
              <div class="rounded-lg border border-slate-100 bg-slate-50/80 p-4">
                <p class="text-[10px] font-black uppercase text-slate-500">Sesion</p>
                <p class="mt-1.5 text-sm font-black" :class="isOnline ? 'text-emerald-600' : 'text-slate-500'">
                  {{ isOnline ? 'En linea' : 'Sin sesion activa' }}
                </p>
              </div>
            </div>
          </section>
        </div>

        <div v-else-if="activeTab === 'hub'" class="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
          <section class="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-100 sm:p-5">
            <div class="absolute inset-y-0 left-0 w-1 bg-red-600"></div>
            <div class="pl-1">
              <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50 text-red-600">
                <i class="fa-solid fa-sliders"></i>
              </div>
              <p class="mt-4 text-[10px] font-black uppercase text-red-600">Hub central</p>
              <h3 class="mt-1 text-sm font-black text-slate-900">Configuracion del Hub</h3>
              <p class="mt-2 text-sm font-semibold leading-6 text-slate-500">
                Ajustes de visibilidad para bloques del Hub Central en este usuario.
              </p>
            </div>
            <div class="mt-5 grid gap-3">
              <div class="rounded-lg border border-slate-100 bg-slate-50/80 p-3">
                <p class="text-[10px] font-black uppercase text-slate-500">Rol base</p>
                <p class="mt-1 text-sm font-black text-slate-900">{{ roleLabel }}</p>
              </div>
              <div class="rounded-lg border border-slate-100 bg-slate-50/80 p-3">
                <p class="text-[10px] font-black uppercase text-slate-500">Nivel</p>
                <p class="mt-1 text-sm font-black text-slate-900">{{ user.AccessLevel || 0 }}</p>
              </div>
            </div>
          </section>

          <section class="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-100 sm:p-5">
            <div class="absolute inset-y-0 left-0 w-1 bg-red-600"></div>
            <div class="flex flex-col gap-2 border-b border-slate-100 pb-4 pl-1 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p class="text-[10px] font-black uppercase text-red-600">Visibilidad por usuario</p>
                <h3 class="mt-1 text-sm font-black text-slate-900">Permisos especiales del Hub</h3>
                <p class="mt-1 text-xs font-semibold text-slate-500">Heredar respeta la configuracion global del sistema.</p>
              </div>
              <span
                class="w-fit rounded-md px-2 py-1 text-[10px] font-black uppercase"
                :class="canManageFeatureOverrides ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'"
              >
                {{ canManageFeatureOverrides ? 'Editable' : 'Solo lectura' }}
              </span>
            </div>

            <div v-if="setupStore.isFeatureConfigLoading" class="flex h-32 items-center justify-center text-sm font-bold text-slate-400">
              <i class="fa-solid fa-circle-notch fa-spin mr-2 text-red-500"></i>
              Cargando configuracion...
            </div>

            <div v-else class="mt-4 grid gap-3 lg:grid-cols-2">
              <div
                v-for="feature in setupStore.normalizedFeatureFlags"
                :key="feature.FeatureKey"
                class="rounded-xl border border-slate-100 bg-slate-50/80 p-4 transition hover:border-red-100 hover:bg-red-50/20"
              >
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0">
                    <p class="text-sm font-black text-slate-800">{{ feature.FeatureName }}</p>
                    <p class="mt-1 text-xs font-semibold leading-5 text-slate-500">{{ feature.Description }}</p>
                  </div>
                  <span
                    class="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black uppercase"
                    :class="feature.IsEnabled ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'"
                  >
                    Global {{ feature.IsEnabled ? 'on' : 'off' }}
                  </span>
                </div>

                <select
                  :value="getOverrideValue(feature.FeatureKey)"
                  class="mt-4 h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-black text-slate-700 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                  :disabled="!canManageFeatureOverrides"
                  @change="handleFeatureOverrideChange(feature.FeatureKey, $event)"
                >
                  <option value="inherit">Heredar configuracion global</option>
                  <option value="enabled">Forzar visible</option>
                  <option value="disabled">Forzar oculto</option>
                </select>
              </div>
            </div>
          </section>
        </div>

        <div v-else-if="activeTab === 'actividad'" class="rounded-xl border border-slate-200 bg-white p-5">
          <h3 class="text-sm font-black text-slate-800">Actividad de la cuenta</h3>
          <div class="mt-5 space-y-5">
            <div v-for="item in activityItems" :key="item.title" class="flex gap-4">
              <div class="flex flex-col items-center">
                <span class="h-3 w-3 rounded-full" :class="item.tone"></span>
                <span class="mt-2 h-full w-px bg-slate-200"></span>
              </div>
              <div class="pb-3">
                <p class="text-sm font-black text-slate-800">{{ item.title }}</p>
                <p class="mt-1 text-xs font-semibold text-slate-500">{{ item.description }}</p>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="space-y-4">
          <section class="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-100 sm:p-5">
            <div class="absolute inset-y-0 left-0 w-1 bg-red-600"></div>
            <div class="flex flex-col gap-3 pl-1 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p class="text-[10px] font-black uppercase text-red-600">Edicion de usuario</p>
                <h3 class="mt-1 text-sm font-black text-slate-900">Datos editables</h3>
                <p class="mt-1 text-xs font-semibold text-slate-500">Actualiza identidad y estructura comercial del usuario.</p>
              </div>
              <span class="w-fit rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-black uppercase text-slate-600">
                {{ roleLabel }}
              </span>
            </div>
          </section>

          <UserForm
            :user-to-edit="user"
            is-embedded
            :show-feature-overrides="false"
            :show-access-level="false"
            :show-password-change="false"
            @saved="emit('saved')"
            @cancel="activeTab = 'perfil'"
          />
        </div>
      </div>
    </div>

    <div v-else class="flex min-h-[420px] flex-1 flex-col items-center justify-center bg-white p-8 text-center">
      <div class="flex h-16 w-16 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-2xl text-slate-300">
        <i class="fa-solid fa-user"></i>
      </div>
      <h3 class="mt-4 text-lg font-black text-slate-800">Selecciona un usuario</h3>
      <p class="mt-2 max-w-sm text-sm font-semibold text-slate-500">El perfil, permisos, organizacion y actividad apareceran en este panel.</p>
    </div>
  </section>
</template>
