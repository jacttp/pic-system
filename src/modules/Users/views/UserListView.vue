<!-- src/modules/Users/views/UserListView.vue -->
<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '../stores/userStore';
import { useAuthStore } from '@/modules/Auth/views/stores/authStore';
import { ROLE_LEVELS } from '@/modules/Setup/types/setupTypes';
import UserTable from '../components/UserTable.vue';
import UserForm from '../components/UserForm.vue';
import UserPermissionsForm from '../components/UserPermissionsForm.vue';
import BroadcastMessageModal from '../components/BroadcastMessageModal.vue';
import ActiveUsersPanel from '../components/ActiveUsersPanel.vue';
import type { UserFull } from '../types/user.types';

const router = useRouter();
const userStore = useUserStore();
const authStore = useAuthStore();

// Modals state
const showUserForm = ref(false);
const showPermissionsForm = ref(false);
const showBroadcastModal = ref(false);

// Selected user for edit/actions
const selectedUser = ref<UserFull | null>(null);
const broadcastMode = ref<'single' | 'zone' | 'broadcast'>('broadcast');

// Permisos del usuario actual
const currentUserLevel = computed(() => {
   return authStore.user?.accessLevel || ROLE_LEVELS[authStore.user?.role || 'User'] || 1;
});
const canManageUsers = computed(() => currentUserLevel.value >= 3); // Admin+

// Búsqueda y filtro
const searchQuery = ref('');
const statusFilter = ref<string>('all');

const filteredUsers = computed(() => {
   let result = userStore.users;
   
   // Filtro por búsqueda
   if (searchQuery.value) {
      const q = searchQuery.value.toLowerCase();
      result = result.filter(u => 
         u.Usuario.toLowerCase().includes(q) ||
         u.Zona.toLowerCase().includes(q) ||
         u.TipoUser.toLowerCase().includes(q) ||
         (u.ServerUser && u.ServerUser.toLowerCase().includes(q))
      );
   }

   // Filtro por estado
   if (statusFilter.value !== 'all') {
      result = result.filter(u => (u.Status || 'active') === statusFilter.value);
   }

   return result;
});

// Estadísticas rápidas
const stats = computed(() => ({
   total: userStore.users.length,
   active: userStore.users.filter(u => (u.Status || 'active') === 'active').length,
   blocked: userStore.users.filter(u => u.Status === 'blocked').length,
   admins: userStore.users.filter(u => (u.AccessLevel || 0) >= 3).length
}));

onMounted(() => {
   userStore.fetchUsers();
});

// --- Handlers ---

const handleCreate = () => {
   selectedUser.value = null;
   showUserForm.value = true;
};

const handleEdit = (user: UserFull) => {
   selectedUser.value = user;
   showUserForm.value = true;
};

const handleView = (user: UserFull) => {
   router.push({ name: 'user-detail', params: { id: user.IdUser } });
};

const handleDelete = async (user: UserFull) => {
   if (!confirm(`¿Estás seguro de eliminar al usuario "${user.Usuario}"? Esta acción no se puede deshacer.`)) return;
   try {
      await userStore.deleteUser(user.IdUser);
   } catch {
      // Error is already handled in store
   }
};

const handleBlock = async (user: UserFull) => {
   const currentlyBlocked = user.Status === 'blocked';
   const action = currentlyBlocked ? 'desbloquear' : 'bloquear';
   if (!confirm(`¿${action.charAt(0).toUpperCase() + action.slice(1)} al usuario "${user.Usuario}"?`)) return;
   try {
      await userStore.toggleBlock(user.IdUser, currentlyBlocked);
   } catch {
      // Error is already handled in store
   }
};

const handleMessage = (user: UserFull) => {
   selectedUser.value = user;
   broadcastMode.value = 'single';
   showBroadcastModal.value = true;
};

const handleBroadcast = () => {
   selectedUser.value = null;
   broadcastMode.value = 'broadcast';
   showBroadcastModal.value = true;
};

const handleUserSaved = () => {
   userStore.fetchUsers();
};
</script>

<template>
   <div class="w-full px-4 sm:px-6 lg:px-10 py-6 lg:py-8">
      
      <!-- Header -->
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
         <div class="flex items-center gap-4">
            <div class="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center flex-shrink-0 shadow-md shadow-purple-200">
               <i class="fa-solid fa-users-gear text-white text-base"></i>
            </div>
            <div>
               <h1 class="text-xl font-bold text-slate-900 tracking-tight leading-tight">Gestión de Usuarios</h1>
               <p class="text-xs text-slate-500 mt-0.5 font-medium">Administra usuarios, permisos y monitorea actividad.</p>
            </div>
         </div>
         <div v-if="canManageUsers" class="flex items-center gap-2">
            <button 
               @click="handleBroadcast"
               class="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-colors flex items-center gap-2"
            >
               <i class="fa-solid fa-paper-plane text-emerald-500 text-xs"></i> Broadcast
            </button>
            <button 
               @click="handleCreate" 
               class="bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-sm shadow-purple-200 flex items-center gap-2 transition-all"
            >
               <i class="fa-solid fa-user-plus text-xs"></i> Nuevo Usuario
            </button>
         </div>
      </div>

      <!-- Estadísticas rápidas -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
         <div class="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center flex-shrink-0">
               <i class="fa-solid fa-users text-purple-500"></i>
            </div>
            <div>
               <p class="text-xl font-bold text-slate-800 tabular-nums">{{ stats.total }}</p>
               <p class="text-xs font-medium text-slate-400">Total</p>
            </div>
         </div>
         <div class="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
               <i class="fa-solid fa-circle-check text-emerald-500"></i>
            </div>
            <div>
               <p class="text-xl font-bold text-slate-800 tabular-nums">{{ stats.active }}</p>
               <p class="text-xs font-medium text-slate-400">Activos</p>
            </div>
         </div>
         <div class="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
               <i class="fa-solid fa-ban text-red-500"></i>
            </div>
            <div>
               <p class="text-xl font-bold text-slate-800 tabular-nums">{{ stats.blocked }}</p>
               <p class="text-xs font-medium text-slate-400">Bloqueados</p>
            </div>
         </div>
         <div class="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
               <i class="fa-solid fa-shield-halved text-amber-500"></i>
            </div>
            <div>
               <p class="text-xl font-bold text-slate-800 tabular-nums">{{ stats.admins }}</p>
               <p class="text-xs font-medium text-slate-400">Admins</p>
            </div>
         </div>
      </div>

      <!-- Layout principal: tabla + panel lateral -->
      <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">

         <!-- Columna izquierda: filtros + tabla (3/4) -->
         <div class="lg:col-span-3 space-y-4">
            
            <!-- Barra de filtros -->
            <div class="flex flex-col sm:flex-row gap-2.5">
               <!-- Búsqueda -->
               <div class="relative flex-1">
                  <i class="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
                  <input
                     v-model="searchQuery"
                     type="text"
                     placeholder="Buscar por nombre, zona, rol…"
                     class="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 focus:outline-none transition"
                  />
               </div>
               <!-- Filtro de estado -->
               <select 
                  v-model="statusFilter"
                  class="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 focus:outline-none transition cursor-pointer"
               >
                  <option value="all">Todos los estados</option>
                  <option value="active">Activos</option>
                  <option value="blocked">Bloqueados</option>
                  <option value="inactive">Inactivos</option>
               </select>
            </div>

            <!-- Tabla de usuarios -->
            <UserTable
               :users="filteredUsers"
               :loading="userStore.loading"
               @edit="handleEdit"
               @delete="handleDelete"
               @block="handleBlock"
               @view="handleView"
               @message="handleMessage"
            />

            <!-- Info de conteo -->
            <div class="text-xs text-slate-500 font-medium text-right">
               Mostrando <span class="font-semibold text-slate-700">{{ filteredUsers.length }}</span> de <span class="font-semibold text-slate-700">{{ userStore.users.length }}</span> usuarios
            </div>
         </div>

         <!-- Columna derecha: panel activos (1/4) -->
         <div class="lg:col-span-1">
            <ActiveUsersPanel />
         </div>
      </div>

      <!-- Modals -->
      <UserForm 
         v-model="showUserForm" 
         :user-to-edit="selectedUser"
         @saved="handleUserSaved" 
      />

      <UserPermissionsForm
         v-model="showPermissionsForm"
         :user="selectedUser"
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
