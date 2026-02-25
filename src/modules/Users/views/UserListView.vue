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
   <div class="p-6 lg:p-8 max-w-[1400px] mx-auto">
      
      <!-- Header -->
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
         <div>
            <h1 class="text-2xl font-bold text-slate-800 flex items-center gap-2">
               <i class="fa-solid fa-users-gear text-purple-500"></i>
               Gestión de Usuarios
            </h1>
            <p class="text-slate-500 text-sm mt-1">Administra usuarios, permisos y monitorea actividad.</p>
         </div>
         <div v-if="canManageUsers" class="flex items-center gap-2">
            <button 
               @click="handleBroadcast"
               class="px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2"
            >
               <i class="fa-solid fa-paper-plane text-emerald-500"></i> Broadcast
            </button>
            <button 
               @click="handleCreate" 
               class="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium shadow-sm flex items-center gap-2 transition-colors"
            >
               <i class="fa-solid fa-user-plus"></i> Nuevo Usuario
            </button>
         </div>
      </div>

      <!-- Estadísticas rápidas -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
         <div class="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
               <i class="fa-solid fa-users text-purple-500"></i>
            </div>
            <div>
               <p class="text-xl font-bold text-slate-800">{{ stats.total }}</p>
               <p class="text-xs text-slate-400">Total</p>
            </div>
         </div>
         <div class="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
               <i class="fa-solid fa-circle-check text-emerald-500"></i>
            </div>
            <div>
               <p class="text-xl font-bold text-slate-800">{{ stats.active }}</p>
               <p class="text-xs text-slate-400">Activos</p>
            </div>
         </div>
         <div class="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
               <i class="fa-solid fa-ban text-red-500"></i>
            </div>
            <div>
               <p class="text-xl font-bold text-slate-800">{{ stats.blocked }}</p>
               <p class="text-xs text-slate-400">Bloqueados</p>
            </div>
         </div>
         <div class="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
               <i class="fa-solid fa-shield-halved text-amber-500"></i>
            </div>
            <div>
               <p class="text-xl font-bold text-slate-800">{{ stats.admins }}</p>
               <p class="text-xs text-slate-400">Admins</p>
            </div>
         </div>
      </div>

      <!-- Layout principal: tabla + panel lateral -->
      <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">

         <!-- Columna izquierda: filtros + tabla (3/4) -->
         <div class="lg:col-span-3 space-y-4">
            
            <!-- Barra de filtros -->
            <div class="flex flex-col sm:flex-row gap-3">
               <!-- Búsqueda -->
               <div class="relative flex-1">
                  <i class="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
                  <input
                     v-model="searchQuery"
                     type="text"
                     placeholder="Buscar por nombre, zona, rol..."
                     class="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none bg-white"
                  />
               </div>
               <!-- Filtro de estado -->
               <select 
                  v-model="statusFilter"
                  class="px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none bg-white"
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
            <div class="text-xs text-slate-400 text-right">
               Mostrando {{ filteredUsers.length }} de {{ userStore.users.length }} usuarios
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
