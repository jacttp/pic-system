<!-- src/modules/Users/views/UserListView.vue -->
<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useUserStore } from '../stores/userStore';
import { useAuthStore } from '@/modules/Auth/views/stores/authStore';
import { ROLE_LEVELS } from '@/modules/Setup/types/setupTypes';
import UserTable from '../components/UserTable.vue';
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
import type { UserFull } from '../types/user.types';

const route = useRoute();
const userStore = useUserStore();
const authStore = useAuthStore();

// UI States
const showCreateModal = ref(false);
const showBroadcastModal = ref(false);
const selectedUser = ref<UserFull | null>(null);
const broadcastMode = ref<'single' | 'zone' | 'broadcast'>('broadcast');

// Permissions
const currentUserLevel = computed(() => {
   return authStore.user?.accessLevel || ROLE_LEVELS[authStore.user?.role || 'User'] || 1;
});
const canManageUsers = computed(() => currentUserLevel.value >= 3);

// Search & Filter
const searchQuery = ref('');
const statusFilter = ref<string>('all');

const filteredUsers = computed(() => {
   let result = userStore.users;
   
   if (searchQuery.value) {
      const q = searchQuery.value.toLowerCase();
      result = result.filter(u => 
         u.Usuario.toLowerCase().includes(q) ||
         u.Zona.toLowerCase().includes(q) ||
         u.TipoUser.toLowerCase().includes(q) ||
         (u.ServerUser && u.ServerUser.toLowerCase().includes(q)) ||
         (u.nombre && u.nombre.toLowerCase().includes(q)) ||
         (u.no_emp && u.no_emp.toLowerCase().includes(q))
      );
   }

   if (statusFilter.value !== 'all') {
      result = result.filter(u => (u.Status || 'active') === statusFilter.value);
   }

   return result;
});

// Stats
const stats = computed(() => ({
   total: userStore.users.length,
   active: userStore.users.filter(u => (u.Status || 'active') === 'active').length,
   blocked: userStore.users.filter(u => (u.Status || 'active') === 'blocked').length,
   admins: userStore.users.filter(u => (u.AccessLevel || 0) >= 3).length
}));

onMounted(async () => {
   await userStore.fetchUsers();
   await userStore.fetchJefaturas();
   
   // Handle deep-linking from /users/:id
   const id = Number(route.params.id);
   if (id) {
     const user = userStore.getUserById(id);
     if (user) selectedUser.value = user;
   }
});

// Watch for store changes to update selected user reference
watch(() => userStore.users, (newList) => {
  if (selectedUser.value) {
    const updated = newList.find(u => u.IdUser === selectedUser.value?.IdUser);
    if (updated) selectedUser.value = updated;
  }
}, { deep: true });

// --- Handlers ---

const handleSelectUser = (user: UserFull) => {
  // Toggle logic: if same user, deselect; otherwise, select new.
  if (selectedUser.value?.IdUser === user.IdUser) {
    selectedUser.value = null;
  } else {
    selectedUser.value = user;
  }
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
   if (!confirm(`¿${action.charAt(0).toUpperCase() + action.slice(1)} al usuario "${user.Usuario}"?`)) return;
   await userStore.toggleBlock(user.IdUser, currentlyBlocked);
};

const handleDelete = async (user: UserFull) => {
   if (!confirm(`¿Estás seguro de eliminar al usuario "${user.Usuario}"?`)) return;
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
  <div class="h-screen flex flex-col overflow-hidden bg-slate-50/50">
    
    <!-- Header Section -->
    <header class="bg-white border-b border-slate-200 px-6 py-4 shrink-0 shadow-sm z-10">
      <div class="max-w-[1700px] mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 rounded-2xl bg-gradient-to-tr from-slate-700 to-slate-900 flex items-center justify-center text-white shadow-lg shadow-slate-100 ring-4 ring-slate-50 transition-transform hover:scale-105 duration-300">
             <i class="fa-solid fa-users-gear text-lg"></i>
          </div>
          <div>
            <h1 class="text-xl font-black text-slate-900 tracking-tight leading-none mb-1">Control de Usuarios</h1>
            <p class="text-xs text-slate-400 font-bold uppercase tracking-wider">Gestión centralizada de accesos</p>
          </div>
        </div>

        <div v-if="canManageUsers" class="flex items-center gap-3">
          <Button 
            variant="outline" 
            @click="handleBroadcast"
            class="hidden md:flex items-center gap-2 border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl font-bold text-xs uppercase"
          >
            <i class="fa-solid fa-paper-plane text-blue-500"></i> Comunicado
          </Button>
          <Button 
            @click="handleCreate" 
            class="bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl shadow-lg shadow-blue-100 flex items-center gap-2 px-6 transition-all active:scale-95"
          >
            <i class="fa-solid fa-plus-circle text-sm"></i> NUEVO USUARIO
          </Button>
        </div>
      </div>
    </header>

    <!-- Main Content Area (Split) -->
    <div class="flex-1 flex overflow-hidden relative">
      
      <!-- Left: Users List (70%) -->
      <main 
        class="flex-1 overflow-y-auto p-6 transition-all duration-300 ease-in-out"
        :class="{ 'mr-[400px]': !!selectedUser }"
      >
        <div class="max-w-[1500px] mx-auto space-y-6">
          
          <!-- Stats Summary Bar (Redesigned with 5 items, last one larger) -->
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4">
            <!-- Normal Stats -->
            <div 
              v-for="(val, label) in { 'Total': stats.total, 'Activos': stats.active, 'Bloqueados': stats.blocked, 'Admins': stats.admins }" 
              :key="label"
              class="lg:col-span-2 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5"
            >
              <div class="flex items-center justify-between pointer-events-none">
                <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">{{ label }}</span>
                <div class="w-6 h-6 rounded-lg bg-slate-50 flex items-center justify-center text-[10px] text-slate-400">
                  <i :class="label === 'Bloqueados' ? 'fa-solid fa-ban' : 'fa-solid fa-user'"></i>
                </div>
              </div>
              <p class="text-2xl font-black text-slate-900 mt-1 tabular-nums">{{ val }}</p>
            </div>

            <!-- Active Users (Live Card) - Larger (col-span-4) -->
            <div class="lg:col-span-4 h-full">
              <ActiveUsersPanel is-compact />
            </div>
          </div>

          <!-- Filters Row -->
          <div class="flex flex-col md:flex-row gap-3 items-center sticky top-0 z-20 bg-slate-50/20 backdrop-blur-xl py-2 px-1">
            <div class="relative flex-1">
              <i class="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"></i>
              <Input
                v-model="searchQuery"
                placeholder="Filtrar por nombre, zona, rol o servidor..."
                class="pl-10 h-11 bg-white border-slate-200 rounded-xl shadow-sm focus-visible:ring-blue-500/20 focus-visible:border-blue-500 font-medium"
              />
            </div>
            <Select v-model="statusFilter">
              <SelectTrigger class="w-[220px] h-11 bg-white border-slate-200 rounded-xl shadow-sm font-bold text-slate-600">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent class="rounded-xl border-slate-100 shadow-xl font-medium">
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="active">Solo Activos</SelectItem>
                <SelectItem value="blocked">Solo Bloqueados</SelectItem>
                <SelectItem value="inactive">Solo Inactivos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <!-- Table Wrapper (Hover bug fixed by removing 'group' and glow here) -->
          <div class="relative">
            <UserTable
              :users="filteredUsers"
              :loading="userStore.loading"
              :selected-user-id="selectedUser?.IdUser"
              @select="handleSelectUser"
              @edit="handleSelectUser"
              @delete="handleDelete"
              @block="handleBlock"
              @message="handleMessage"
            />
          </div>
        </div>
      </main>

      <!-- Right: Detail Panel (Overlay/Sidebar) -->
      <aside 
        class="fixed top-0 right-0 h-full w-[400px] z-30 transition-transform duration-300 shadow-2xl"
        :class="selectedUser ? 'translate-x-0' : 'translate-x-full'"
      >
        <UserDetailPanel
           :user="selectedUser"
           @close="handleDeselect"
           @saved="handleUserSaved"
           @block="handleBlock"
           @delete="handleDelete"
           @message="handleMessage"
        />
      </aside>
    </div>

    <!-- Modals -->
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

<style scoped>
/* Transición suave para el contenido principal cuando el panel lateral se abre */
main {
  transition: margin-right 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
</style>


