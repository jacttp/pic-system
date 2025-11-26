<!-- src/modules/Users/views/UserList.vue -->
<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useUserStore } from '../stores/userStore';
import BaseTable from '@/modules/Shared/components/BaseTable.vue';
import StatusBadge from '@/modules/Shared/components/StatusBadge.vue';
import UserForm from '../components/UserForm.vue';

const userStore = useUserStore();
const showModal = ref(false);

// Configuración de columnas para BaseTable
const columns = [
    { key: 'IdUser', label: 'ID', class: 'text-center w-16 text-slate-400 font-mono' },
    { key: 'Usuario', label: 'Usuario' },
    { key: 'TipoUser', label: 'Rol' },
    { key: 'Zona', label: 'Zona' },
    { key: 'status', label: 'Estado' } // Campo simulado para ejemplo visual
];

onMounted(() => {
    userStore.fetchUsers();
});

// Paginación del Cliente (Simulada porque la API v2 devuelve todo)
const currentPage = ref(1);
const itemsPerPage = 10;

const totalPages = computed(() => Math.ceil(userStore.users.length / itemsPerPage));

const paginatedUsers = computed(() => {
    const start = (currentPage.value - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    // Mapeamos para agregar un status visual dummy
    return userStore.users.slice(start, end).map(u => ({
        ...u,
        status: 'Activo' // La tabla v2 no tiene status, lo simulamos
    }));
});

const handlePageChange = (page: number) => {
    currentPage.value = page;
};

const handleEdit = (item: any) => {
    alert(`Editar usuario: ${item.Usuario} (Próximamente en v2.1)`);
};

const handleDelete = (item: any) => {
    if(confirm(`¿Eliminar usuario ${item.Usuario}?`)) {
        alert('La API v2 Fase 2 aún no soporta DELETE. ¡Próximamente!');
    }
};
</script>

<template>
    <div class="p-6 lg:p-8 max-w-7xl mx-auto">
        <!-- Header de la Sección -->
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div>
                <h1 class="text-2xl font-bold text-slate-800">Gestión de Usuarios</h1>
                <p class="text-slate-500 text-sm mt-1">Administra los accesos al sistema.</p>
            </div>
            <button 
                @click="showModal = true" 
                class="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium shadow-sm flex items-center gap-2 transition-colors"
            >
                <i class="fa-solid fa-plus"></i> Nuevo Usuario
            </button>
        </div>

        <!-- Tabla de Datos -->
        <BaseTable 
            :columns="columns" 
            :data="paginatedUsers" 
            :loading="userStore.loading"
            :current-page="currentPage"
            :total-pages="totalPages"
            :total-records="userStore.users.length"
            show-actions
            @page-change="handlePageChange"
            @edit="handleEdit"
            @delete="handleDelete"
        >
            <!-- Slot personalizado para la columna 'Usuario' -->
            <template #cell-Usuario="{ value }">
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center font-bold text-xs">
                        {{ String(value).substring(0, 2).toUpperCase() }}
                    </div>
                    <span class="font-medium text-slate-700">{{ value }}</span>
                </div>
            </template>

            <!-- Slot personalizado para la columna 'TipoUser' (Rol) -->
            <template #cell-TipoUser="{ value }">
                <span 
                    class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border"
                    :class="value === 'Admin' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-slate-50 text-slate-600 border-slate-200'"
                >
                    <i v-if="value === 'Admin'" class="fa-solid fa-shield-halved text-[10px]"></i>
                    {{ value }}
                </span>
            </template>

            <!-- Slot personalizado para Status -->
            <template #cell-status="{ value }">
                <StatusBadge :status="value" type="success" />
            </template>
        </BaseTable>

        <!-- Modal Formulario -->
        <UserForm v-model="showModal" @saved="userStore.fetchUsers" />
    </div>
</template>