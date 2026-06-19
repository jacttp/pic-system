<!-- src/modules/Users/views/UserListView.vue -->
<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useUserStore } from '../stores/userStore';
import { useAuthStore } from '@/modules/Auth/views/stores/authStore';
import { ROLE_LEVELS } from '@/modules/Setup/types/setupTypes';
import UserForm from '../components/UserForm.vue';
import UserDetailPanel from '../components/UserDetailPanel.vue';
import BroadcastMessageModal from '../components/BroadcastMessageModal.vue';
import ActiveUsersPanel from '../components/ActiveUsersPanel.vue';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { UserFull } from '../types/user.types';

const route = useRoute();
const userStore = useUserStore();
const authStore = useAuthStore();

const showCreateModal = ref(false);
const showBroadcastModal = ref(false);
const selectedUser = ref<UserFull | null>(null);
const broadcastMode = ref<'single' | 'zone' | 'broadcast'>('broadcast');

const currentUserLevel = computed(() => {
  return authStore.user?.accessLevel || ROLE_LEVELS[authStore.user?.role || 'User'] || 1;
});
const canManageUsers = computed(() => currentUserLevel.value >= 3);

const searchQuery = ref('');
const roleFilter = ref<string>('all');

const roleSortOrder: Record<string, number> = {
  SuperAdmin: 1,
  Admin: 2,
  Gerente: 3,
  Jefe: 4
};

const filteredUsers = computed(() => {
  let result = userStore.users;

  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase();
    result = result.filter(u =>
      u.Usuario.toLowerCase().includes(q) ||
      u.jefatura.toLowerCase().includes(q) ||
      (u.Zona && u.Zona.toLowerCase().includes(q)) ||
      u.TipoUser.toLowerCase().includes(q) ||
      (u.ServerUser && u.ServerUser.toLowerCase().includes(q)) ||
      (u.nombre && u.nombre.toLowerCase().includes(q)) ||
      (u.no_emp && u.no_emp.toLowerCase().includes(q))
    );
  }

  if (roleFilter.value !== 'all') {
    result = result.filter(u => u.TipoUser === roleFilter.value);
  }

  return [...result].sort((a, b) => {
    const roleA = roleSortOrder[a.TipoUser] ?? 99;
    const roleB = roleSortOrder[b.TipoUser] ?? 99;
    if (roleA !== roleB) return roleA - roleB;
    return (a.nombre || a.Usuario).localeCompare(b.nombre || b.Usuario);
  });
});

const stats = computed(() => ({
  total: userStore.users.length,
  active: userStore.users.filter(u => (u.Status || 'active') === 'active').length,
  blocked: userStore.users.filter(u => (u.Status || 'active') === 'blocked').length,
  admins: userStore.users.filter(u => (u.AccessLevel || 0) >= 3).length
}));

const statCards = computed(() => [
  {
    label: 'Total usuarios',
    value: stats.value.total,
    caption: 'Todos'
  },
  {
    label: 'Activos',
    value: stats.value.active,
    caption: 'Activos'
  },
  {
    label: 'Bloqueados',
    value: stats.value.blocked,
    caption: 'Bloqueados'
  },
  {
    label: 'Admins',
    value: stats.value.admins,
    caption: 'Admin'
  }
]);

const roleLabel = (role: string) => {
  const map: Record<string, string> = {
    SuperAdmin: 'Super administrador',
    Admin: 'Administrador',
    Gerente: 'Gerente',
    Jefe: 'Jefe'
  };
  return map[role] || role;
};

const roleBadgeClass = (user: UserFull) => {
  return 'bg-slate-50 text-slate-600 border-slate-200';
};

const isOnline = (user: UserFull) => {
  if (!user.LastActivity) return false;
  const diffMs = Date.now() - new Date(user.LastActivity).getTime();
  return diffMs >= 0 && diffMs <= 15 * 60 * 1000;
};

onMounted(async () => {
  await userStore.fetchUsers();
  await userStore.fetchJefaturas();
  await userStore.fetchActiveUsers();

  const id = Number(route.params.id);
  if (id) {
    const user = userStore.getUserById(id);
    if (user) selectedUser.value = user;
  } else if (!selectedUser.value && filteredUsers.value.length > 0) {
    selectedUser.value = filteredUsers.value[0];
  }
});

watch(() => userStore.users, (newList) => {
  if (selectedUser.value) {
    const updated = newList.find(u => u.IdUser === selectedUser.value?.IdUser);
    if (updated) selectedUser.value = updated;
  } else if (newList.length > 0) {
    selectedUser.value = filteredUsers.value[0] || newList[0];
  }
}, { deep: true });

watch(filteredUsers, (users) => {
  if (users.length === 0) {
    selectedUser.value = null;
    return;
  }

  if (!selectedUser.value || !users.some(user => user.IdUser === selectedUser.value?.IdUser)) {
    selectedUser.value = users[0];
  }
});

const handleSelectUser = (user: UserFull) => {
  selectedUser.value = user;
};

const handleDeselect = () => {
  selectedUser.value = null;
};

const handleCreate = () => {
  showCreateModal.value = true;
};

const handleBlock = async (user: UserFull) => {
  const currentlyBlocked = user.Status === 'blocked';
  const action = currentlyBlocked ? 'desbloquear' : 'bloquear';
  if (!confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} al usuario "${user.Usuario}"?`)) return;
  await userStore.toggleBlock(user.IdUser, currentlyBlocked);
};

const handleDelete = async (user: UserFull) => {
  if (!confirm(`Estas seguro de eliminar al usuario "${user.Usuario}"?`)) return;
  await userStore.deleteUser(user.IdUser);
  if (selectedUser.value?.IdUser === user.IdUser) handleDeselect();
};

const handleMessage = (user: UserFull) => {
  selectedUser.value = user;
  broadcastMode.value = 'single';
  showBroadcastModal.value = true;
};

const handleBroadcast = () => {
  broadcastMode.value = 'broadcast';
  showBroadcastModal.value = true;
};

const handleUserSaved = () => {
  userStore.fetchUsers();
};
</script>

<template>
  <div class="min-h-screen bg-slate-50 text-slate-900 xl:h-screen xl:overflow-hidden">
    <main class="mx-auto flex min-h-screen max-w-[1800px] flex-col gap-4 px-3 py-3 sm:gap-5 sm:px-5 sm:py-5 lg:px-7 xl:h-full">
      <header class="flex shrink-0 flex-col gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm sm:px-5 sm:py-4 lg:flex-row lg:items-center lg:justify-between">
        <div class="min-w-0">
          <div class="flex items-center gap-3">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-600 text-white shadow-sm shadow-red-100">
              <i class="fa-solid fa-users-gear text-sm"></i>
            </div>
            <div class="min-w-0">
              <h1 class="truncate text-lg font-black leading-tight text-slate-900 sm:text-xl">Control de Usuarios</h1>
              <p class="mt-0.5 text-xs font-semibold text-slate-500">Gestion de perfiles, accesos y permisos del Hub</p>
            </div>
          </div>
        </div>

        <div v-if="canManageUsers" class="grid grid-cols-2 gap-2 sm:flex sm:justify-end">
          <Button
            variant="outline"
            class="h-10 rounded-lg border-slate-200 px-3 text-xs font-black text-slate-600 hover:bg-slate-50 sm:px-4"
            @click="handleBroadcast"
          >
            <i class="fa-solid fa-paper-plane mr-2 text-slate-500"></i>
            Comunicado
          </Button>
          <Button
            class="h-10 rounded-lg bg-red-600 px-3 text-xs font-black text-white shadow-md shadow-red-100 hover:bg-red-700 sm:px-5"
            @click="handleCreate"
          >
            <i class="fa-solid fa-plus mr-2"></i>
            Nuevo Usuario
          </Button>
        </div>
      </header>

      <section class="grid shrink-0 grid-cols-2 gap-2 md:grid-cols-[repeat(4,minmax(0,1fr))_minmax(220px,1.2fr)]">
        <div
          v-for="card in statCards"
          :key="card.label"
          class="flex min-h-[48px] items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm"
        >
          <div class="min-w-0">
            <p class="truncate text-[10px] font-black uppercase text-slate-500">{{ card.label }}</p>
            <p class="mt-1 text-[11px] font-semibold text-slate-500">{{ card.caption }}</p>
          </div>
          <p class="ml-3 text-xl font-black leading-none tabular-nums text-slate-900">{{ card.value }}</p>
        </div>

        <div class="col-span-2 md:col-span-1">
          <ActiveUsersPanel is-compact />
        </div>
      </section>

      <section class="grid flex-1 grid-cols-1 gap-4 xl:min-h-0 xl:grid-cols-[430px_minmax(0,1fr)] 2xl:grid-cols-[470px_minmax(0,1fr)]">
        <aside class="flex min-h-[360px] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div class="shrink-0 border-b border-slate-100 px-4 py-4 sm:px-5">
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="text-[11px] font-black uppercase text-slate-500">Usuarios</p>
                <p class="mt-1 text-xs font-semibold text-slate-400">{{ filteredUsers.length }} resultados</p>
              </div>
            </div>

            <div class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_190px] xl:grid-cols-1 2xl:grid-cols-[minmax(0,1fr)_190px]">
              <div class="relative">
                <i class="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400"></i>
                <Input
                  v-model="searchQuery"
                  placeholder="Buscar usuario..."
                  class="h-11 rounded-lg border-slate-200 bg-white pl-9 text-xs font-semibold focus-visible:border-red-500 focus-visible:ring-red-100"
                />
              </div>
              <Select v-model="roleFilter">
                <SelectTrigger class="h-11 rounded-lg border-slate-200 bg-white text-xs font-bold text-slate-600">
                  <SelectValue placeholder="Rol" />
                </SelectTrigger>
                <SelectContent class="rounded-xl border-slate-100 shadow-xl">
                  <SelectItem value="all">Todos los roles</SelectItem>
                  <SelectItem value="SuperAdmin">SuperAdmin</SelectItem>
                  <SelectItem value="Admin">Admin</SelectItem>
                  <SelectItem value="Gerente">Gerente</SelectItem>
                  <SelectItem value="Jefe">Jefe</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div class="min-h-0 flex-1 overflow-y-auto">
            <div v-if="userStore.loading" class="flex h-44 flex-col items-center justify-center gap-3 text-slate-400">
              <i class="fa-solid fa-circle-notch fa-spin text-2xl text-red-500"></i>
              <span class="text-xs font-bold">Cargando usuarios...</span>
            </div>

            <div v-else-if="filteredUsers.length === 0" class="flex h-44 flex-col items-center justify-center gap-2 px-8 text-center text-slate-400">
              <i class="fa-solid fa-users-slash text-3xl"></i>
              <p class="text-sm font-bold">No se encontraron usuarios</p>
            </div>

            <template v-else>
              <button
                v-for="user in filteredUsers"
                :key="user.IdUser"
                type="button"
                class="group grid w-full grid-cols-[48px_minmax(0,1fr)] gap-3 border-b border-slate-100 px-4 py-4 text-left transition hover:bg-slate-50 sm:grid-cols-[48px_minmax(0,1fr)_auto] sm:px-5"
                :class="selectedUser?.IdUser === user.IdUser ? 'bg-red-50/60 shadow-[inset_4px_0_0_0_rgb(220,38,38)] hover:bg-red-50' : ''"
                @click="handleSelectUser(user)"
              >
                <div class="relative flex h-11 w-11 items-center justify-center rounded-xl bg-red-600 text-sm font-black text-white shadow-sm">
                  {{ user.Usuario.substring(0, 2).toUpperCase() }}
                  <span
                    class="absolute -right-0.5 bottom-0 h-3 w-3 rounded-full border-2 border-white"
                    :class="isOnline(user) ? 'bg-emerald-500' : 'bg-slate-300'"
                  ></span>
                </div>
                <div class="min-w-0">
                  <p class="truncate text-sm font-black text-slate-800">{{ user.nombre || user.Usuario }}</p>
                  <div class="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                    <p class="truncate text-[11px] font-bold uppercase text-slate-500">@{{ user.Usuario }}</p>
                    <span v-if="user.no_emp" class="text-[10px] font-black text-slate-400">#{{ user.no_emp }}</span>
                  </div>
                  <p class="mt-1 hidden truncate text-[11px] font-semibold uppercase text-slate-400 sm:block">
                    {{ user.jefatura || 'Corporativo' }}
                  </p>
                </div>
                <div class="col-span-2 flex items-center justify-between gap-3 pl-[60px] sm:col-span-1 sm:flex-col sm:items-end sm:justify-center sm:gap-2 sm:pl-0">
                  <span :class="cn('max-w-[180px] truncate rounded-md border px-2.5 py-1 text-[9px] font-black uppercase tracking-wide', roleBadgeClass(user))">
                    {{ roleLabel(user.TipoUser) }}
                  </span>
                  <span class="h-2 w-2 rounded-full" :class="isOnline(user) ? 'bg-emerald-500' : 'bg-slate-300'"></span>
                </div>
              </button>
            </template>
          </div>

          <div class="shrink-0 border-t border-slate-100 px-4 py-3 text-[11px] font-semibold text-slate-500">
            Mostrando {{ filteredUsers.length }} de {{ userStore.users.length }} usuarios
          </div>
        </aside>

        <UserDetailPanel
          class="min-h-0"
          :user="selectedUser"
          @close="handleDeselect"
          @saved="handleUserSaved"
          @block="handleBlock"
          @delete="handleDelete"
          @message="handleMessage"
        />
      </section>
    </main>

    <UserForm
      v-model="showCreateModal"
      :user-to-edit="null"
      @saved="handleUserSaved"
    />

    <BroadcastMessageModal
      v-model="showBroadcastModal"
      :mode="broadcastMode"
      :target-user="selectedUser"
      @sent="() => {}"
    />
  </div>
</template>
