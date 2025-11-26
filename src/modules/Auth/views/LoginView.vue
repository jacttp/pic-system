<!-- src/modules/Auth/views/LoginView.vue -->
<script setup lang="ts">
import { ref } from 'vue';
// import { useAuthStore } from '../stores/authStore';
import { useAuthStore } from './stores/authStore';
import { useRouter } from 'vue-router';

const authStore = useAuthStore();
const router = useRouter();

const username = ref('');
const password = ref('');

const handleLogin = async () => {
    if (!username.value || !password.value) return;
    
    const success = await authStore.login(username.value, password.value);
    if (success) {
        router.push('/'); // Ir al Hub
    }
};
</script>

<template>
    <div class="min-h-screen flex items-center justify-center bg-slate-100">
        <div class="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-200">
            
            <!-- Logo / Header -->
            <div class="text-center mb-8">
                <div class="w-16 h-16 bg-brand-600 rounded-2xl flex items-center justify-center text-white text-3xl mx-auto mb-4 shadow-lg">
                    <i class="fa-solid fa-layer-group"></i>
                </div>
                <h1 class="text-2xl font-bold text-slate-800">Bienvenido a PIC</h1>
                <p class="text-slate-500 text-sm">Ingresa tus credenciales para continuar</p>
            </div>

            <!-- Error Alert -->
            <div v-if="authStore.error" class="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
                <i class="fa-solid fa-circle-exclamation"></i>
                {{ authStore.error }}
            </div>

            <!-- Formulario -->
            <form @submit.prevent="handleLogin" class="space-y-5">
                <div>
                    <label class="block text-sm font-medium text-slate-700 mb-1">Usuario</label>
                    <div class="relative">
                        <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                            <i class="fa-solid fa-user"></i>
                        </span>
                        <input 
                            v-model="username" 
                            type="text" 
                            class="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all"
                            placeholder="Ej: SuperAdmin"
                            required
                        >
                    </div>
                </div>

                <div>
                    <label class="block text-sm font-medium text-slate-700 mb-1">Contraseña</label>
                    <div class="relative">
                        <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                            <i class="fa-solid fa-lock"></i>
                        </span>
                        <input 
                            v-model="password" 
                            type="password" 
                            class="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all"
                            placeholder="••••••••"
                            required
                        >
                    </div>
                </div>

                <button 
                    type="submit" 
                    :disabled="authStore.isLoading"
                    class="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-3 rounded-xl shadow-md hover:shadow-lg transition-all disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                >
                    <i v-if="authStore.isLoading" class="fa-solid fa-circle-notch fa-spin"></i>
                    <span v-else>Iniciar Sesión</span>
                </button>
            </form>

            <div class="mt-6 text-center text-xs text-slate-400">
                &copy; 2025 Proyecto PIC v2.0
            </div>
        </div>
    </div>
</template>