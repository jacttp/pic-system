<!-- src/modules/Auth/views/LoginView.vue -->
<script setup lang="ts">
import { ref } from 'vue';
// import { useAuthStore } from '../stores/authStore';
import { useAuthStore } from './stores/authStore';
import { useRouter } from 'vue-router';
import coronaLogo from '@/assets/logo.png';

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
                <div class="mx-auto mb-5 flex h-20 items-center justify-center">
                    <img :src="coronaLogo" alt="Corona" class="h-16 w-auto object-contain" />
                </div>
                <div class="mb-2 flex items-center justify-center gap-3">
                    
                    <h1 class="text-2xl font-bold text-slate-800">Bienvenido a System PIC</h1>
                </div>
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
                    <label class="block text-sm font-medium text-slate-700 mb-1">Usuario: </label>
                    <div class="relative">
                        <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                            <i class="fa-solid fa-user"></i>
                        </span>
                        <input 
                            v-model="username" 
                            type="text" 
                            class="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all"
                            placeholder="Ej: usuario.corona"
                            required
                        >
                    </div>
                </div>

                <div>
                    <label class="block text-sm font-medium text-slate-700 mb-1">Contraseña: </label>
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
                &copy; 2026 System PIC v2.40
            </div>
        </div>
    </div>
</template>
