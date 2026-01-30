# depasito.html

```html
<div class="lg:col-span-5 h-2/3 lg:h-full flex flex-col min-h-0 gap-6">

   <div class="flex-[3] min-h-0">
      <div v-if="selectedCase" class="h-full flex flex-col gap-4 animate-in fade-in slide-in-from-right-4 duration-300">

         <div
            class="bg-white p-4 rounded-lg border border-slate-200 shadow-sm shrink-0 flex justify-between items-center">
            <div class="min-w-0">
               <h3 class="font-bold text-slate-800 text-base truncate">{{ selectedCase.clientName }}</h3>
               <div class="flex gap-3 text-xs text-slate-500 mt-1">
                  <span class="bg-slate-100 px-2 py-0.5 rounded border border-slate-200 font-mono">{{
                     selectedCase.matriz }}</span>
                  <span>{{ selectedCase.route }}</span>
                  <span class="font-semibold text-brand-600">| {{ selectedCase.family }}</span>
               </div>
            </div>
            <div class="flex gap-4 text-right">
               <div>
                  <div class="text-[10px] text-slate-400 uppercase font-bold">Neto</div>
                  <div :class="selectedCase.netBalance >= 0 ? 'text-green-600' : 'text-red-600'"
                     class="text-lg font-bold">
                     {{ selectedCase.netBalance > 0 ? '+' : '' }}{{ selectedCase.netBalance.toFixed(0) }}
                  </div>
               </div>
            </div>
         </div>

         <div class="flex-1 min-h-0 relative bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
            <SubstitutionChart :victim-name="selectedCase.victimSku" :victim-vector="selectedVictimVector"
               :cannibal-name="selectedCase.cannibalSku" :cannibal-vector="selectedCannibalVector"
               :split-month="store.rules.splitMonth" />
         </div>
      </div>

      <div v-else
         class="h-full bg-slate-100 rounded-lg border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 p-8 text-center gap-4">
         <div class="bg-white p-4 rounded-full shadow-sm">
            <i class="fa-solid fa-chart-line text-2xl text-slate-300"></i>
         </div>
         <div>
            <h3 class="font-medium text-slate-600">Detalle Gráfico</h3>
            <p class="text-xs text-slate-400 mt-1">Selecciona un caso para ver la curva de sustitución.</p>
         </div>
      </div>
   </div>

   <div class="flex-[2] min-h-0">
      <AnalysisSummaryCard @export="handleExport" />
   </div>

</div>
```

# index.html

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.png" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>PIC System</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>

```

# package.json

```json
{
   "name": "pic-system",
   "private": true,
   "version": "0.0.0",
   "type": "module",
   "scripts": {
      "dev": "vite",
      "build": "vite build",
      "preview": "vite preview"
   },
   "dependencies": {
      "@fortawesome/fontawesome-free": "^7.1.0",
      "autoprefixer": "^10.4.22",
      "axios": "^1.13.2",
      "chart.js": "^4.5.1",
      "html2canvas": "^1.4.1",
      "jspdf": "^4.0.0",
      "pinia": "^3.0.4",
      "postcss": "^8.5.6",
      "vue": "^3.5.24",
      "vue-router": "^4.6.3"
   },
   "devDependencies": {
      "@tailwindcss/container-queries": "^0.1.1",
      "@types/node": "^24.10.1",
      "@vitejs/plugin-vue": "^6.0.1",
      "@vue/tsconfig": "^0.8.1",
      "baseline-browser-mapping": "^2.9.17",
      "tailwindcss": "^3.4.18",
      "typescript": "~5.9.3",
      "vite": "^7.2.4",
      "vue-tsc": "^3.1.4"
   }
}
```

# postcss.config.js

```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}

```

# src\api\axios.ts

```ts
/* src/api/axios.ts */
import axios from 'axios';
import { setupAuthInterceptors } from './interceptorSetup';

const api = axios.create({
    baseURL:import.meta.env.VITE_API_BASE_URL+'/v2' ,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Aplicamos la configuración centralizada
setupAuthInterceptors(api);

export default api;
```

# src\api\interceptorSetup.ts

```ts
/* src/api/interceptorSetup.ts */
import type { AxiosInstance, InternalAxiosRequestConfig } from 'axios';

export const setupAuthInterceptors = (axiosInstance: AxiosInstance) => {
    // 1. Interceptor de REQUEST (Salida)
    axiosInstance.interceptors.request.use(
        (config: InternalAxiosRequestConfig) => {
            const token = localStorage.getItem('pic_auth_token');
            
            // --- DEBUG: MIRA ESTO EN LA CONSOLA ---
            console.log(`📡 [Interceptor] Intentando petición a: ${config.url}`);
            console.log(`🔑 [Interceptor] Token en localStorage:`, token ? 'EXISTE (Oculto)' : 'NULL/VACÍO');
            // --------------------------------------

            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            } else {
                console.warn('⚠️ [Interceptor] ¡OJO! Se está enviando una petición SIN token.');
            }
            return config;
        },
        (error) => Promise.reject(error)
    );

    // 2. Interceptor de RESPONSE (Entrada)
    axiosInstance.interceptors.response.use(
        (response) => response,
        (error) => {
            if (error.response && error.response.status === 401) {
                console.warn('🔒 [Interceptor] 401 Recibido. Token expirado o inválido.');
                localStorage.removeItem('pic_auth_token');
                localStorage.removeItem('pic_user_data');
                if (!window.location.pathname.includes('/login')) {
                    window.location.href = '/login?reason=expired';
                }
            }
            return Promise.reject(error);
        }
    );
};
```

# src\App.vue

```vue
<script setup lang="ts">
import { RouterView } from 'vue-router'
</script>

<template>
  <RouterView />
</template>
```

# src\assets\vue.svg

This is a file of the type: SVG Image

# src\components\HelloWorld.vue

```vue
<script setup lang="ts">
import { ref } from 'vue'

defineProps<{ msg: string }>()

const count = ref(0)
</script>

<template>
  <h1>{{ msg }}</h1>

  <div class="card">
    <button type="button" @click="count++">count is {{ count }}</button>
    <p>
      Edit
      <code>components/HelloWorld.vue</code> to test HMR
    </p>
  </div>

  <p>
    Check out
    <a href="https://vuejs.org/guide/quick-start.html#local" target="_blank"
      >create-vue</a
    >, the official Vue + Vite starter
  </p>
  <p>
    Learn more about IDE Support for Vue in the
    <a
      href="https://vuejs.org/guide/scaling-up/tooling.html#ide-support"
      target="_blank"
      >Vue Docs Scaling up Guide</a
    >.
  </p>
  <p class="read-the-docs">Click on the Vite and Vue logos to learn more</p>
</template>

<style scoped>
.read-the-docs {
  color: #888;
}
</style>

```

# src\main.ts

```ts
/* src/main.ts */
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './style.css' // Importante: Tailwind

//En revisión
import './utils/chartConfig';

// FontAwesome (versión CDN o npm)
import '@fortawesome/fontawesome-free/css/all.min.css'

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')
```

# src\modules\Audit\stores\auditStore.ts

```ts
/* src/modules/Audit/stores/auditStore.ts */
import { defineStore } from 'pinia';
import { ref } from 'vue';
import api from '@/api/axios';
import type { AuditLog, AuditResponse } from '@/types/audit';

export const useAuditStore = defineStore('audit', () => {
    const logs = ref<AuditLog[]>([]);
    const isLoading = ref(false);

    async function fetchLogs(limit = 50) {
        isLoading.value = true;
        try {
            const { data } = await api.get<AuditResponse>(`/logs?limit=${limit}`);
            if (data.success) {
                logs.value = data.data;
            }
        } catch (e) {
            console.error('Error fetching logs', e);
        } finally {
            isLoading.value = false;
        }
    }

    return { logs, isLoading, fetchLogs };
});
```

# src\modules\Audit\views\AuditLog.vue

```vue
<!-- src/modules/Audit/views/AuditLog.vue -->
<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useAuditStore } from '../stores/auditStore';
import BaseTable from '@/modules/Shared/components/BaseTable.vue';
import ModalDialog from '@/modules/Shared/components/ModalDialog.vue';

const store = useAuditStore();
const showDetailModal = ref(false);
const selectedDetail = ref('');

const columns = [
    { key: 'Nombre_Reporte', label: 'Acción / Evento', class: 'font-medium text-slate-700' },
    { key: 'Numero_empleado', label: 'Usuario' },
    { key: 'Fecha_Registro', label: 'Fecha', class: 'font-mono text-xs text-slate-500' },
    { key: 'Detalles', label: 'Detalle', class: 'text-right' }
];

onMounted(() => store.fetchLogs());

const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('es-MX');
};

const openDetail = (detail: string) => {
    selectedDetail.value = detail || 'Sin detalles adicionales.';
    showDetailModal.value = true;
};
</script>

<template>
    <div class="p-6 lg:p-8 max-w-7xl mx-auto">
        <div class="mb-6 flex items-center justify-between">
            <div>
                <h1 class="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <i class="fa-solid fa-shield-cat text-brand-500"></i> Registro de Auditoría
                </h1>
                <p class="text-slate-500 text-sm mt-1">Historial de seguridad y movimientos del sistema.</p>
            </div>
            <button @click="store.fetchLogs()" class="text-brand-600 hover:text-brand-800 text-sm font-medium flex items-center gap-2">
                <i class="fa-solid fa-rotate-right" :class="{'fa-spin': store.isLoading}"></i> Actualizar
            </button>
        </div>

        <BaseTable :columns="columns" :data="store.logs" :loading="store.isLoading">
            <!-- Usuario con Icono -->
            <template #cell-Numero_empleado="{ value }">
                <div class="flex items-center gap-2">
                    <div class="w-6 h-6 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-xs font-bold">
                        <i class="fa-solid fa-user"></i>
                    </div>
                    <span class="text-slate-600 text-sm">{{ value }}</span>
                </div>
            </template>

            <!-- Fecha Formateada -->
            <template #cell-Fecha_Registro="{ value }">
                {{ formatDate(String(value)) }}
            </template>

            <!-- Botón Ver Detalle -->
            <template #cell-Detalles="{ value }">
                <button 
                    v-if="value"
                    @click="openDetail(String(value))" 
                    class="text-xs font-medium text-brand-600 bg-brand-50 px-2 py-1 rounded border border-brand-100 hover:bg-brand-100 transition-colors"
                >
                    Ver JSON
                </button>
                <span v-else class="text-xs text-slate-300 italic">N/A</span>
            </template>
        </BaseTable>

        <!-- Modal de Detalle Técnico -->
        <ModalDialog v-model="showDetailModal" title="Detalle Técnico del Evento" size="lg">
            <div class="bg-slate-900 rounded-lg p-4 overflow-x-auto shadow-inner">
                <pre class="text-xs text-green-400 font-mono whitespace-pre-wrap break-words">{{ selectedDetail }}</pre>
            </div>
            <p class="mt-3 text-xs text-slate-500 flex items-center gap-1">
                <i class="fa-solid fa-lock"></i> Registro inmutable almacenado en servidor.
            </p>
        </ModalDialog>
    </div>
</template>
```

# src\modules\Auth\views\LoginView.vue

```vue
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
```

# src\modules\Auth\views\stores\authStore.ts

```ts
/* src/modules/Auth/stores/authStore.ts */
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import api from '@/api/axios';
import type { User, LoginResponse } from '@/types/auth';
import { useRouter } from 'vue-router';

export const useAuthStore = defineStore('auth', () => {
    const router = useRouter();
    
    // Estado
    const token = ref<string | null>(localStorage.getItem('pic_auth_token'));
    const user = ref<User | null>(JSON.parse(localStorage.getItem('pic_user_data') || 'null'));
    const isLoading = ref(false);
    const error = ref<string | null>(null);

    // Getters
    const isAuthenticated = computed(() => !!token.value);
    const isAdmin = computed(() => user.value?.role === 'Admin');

    // Acciones
    async function login(username: string, password: string): Promise<boolean> {
        isLoading.value = true;
        error.value = null;
        
        try {
            const response = await api.post<LoginResponse>('/auth/login', { username, password });
            
            if (response.data.success) {
                const { token: newToken, user: newUser } = response.data.data;
                
                // Actualizar estado
                token.value = newToken;
                user.value = newUser;
                
                // Persistir
                localStorage.setItem('pic_auth_token', newToken);
                localStorage.setItem('pic_user_data', JSON.stringify(newUser));
                
                return true;
            }
            return false;
        } catch (e: any) {
            error.value = e.response?.data?.message || 'Error de conexión o credenciales inválidas';
            return false;
        } finally {
            isLoading.value = false;
        }
    }

    function logout() {
        token.value = null;
        user.value = null;
        localStorage.removeItem('pic_auth_token');
        localStorage.removeItem('pic_user_data');
        // Forzar recarga o redirigir
        window.location.href = '/login';
    }

    return {
        token,
        user,
        isLoading,
        error,
        isAuthenticated,
        isAdmin,
        login,
        logout
    };
});
```

# src\modules\Cannibalization\components\cards\AnalysisSummaryCard.vue

```vue
<script setup lang="ts">
import { computed } from 'vue';
import { useCannibalizationStore } from '../../stores/cannibalizationStore';

const store = useCannibalizationStore();

const emit = defineEmits(['export']);

// --- CÁLCULOS AGREGADOS ---
const stats = computed(() => {
    const cases = store.detectedCases;
    const totalCases = cases.length;
    
    if (totalCases === 0) return null;

    // 1. Totales de Volumen
    const totalLoss = cases.reduce((acc, c) => acc + c.volumeLost, 0);
    const totalGain = cases.reduce((acc, c) => acc + c.volumeGained, 0);
    const netBalance = totalGain - totalLoss;

    // 2. Conteo de Rojos (Casos ineficientes)
    const redCases = cases.filter(c => c.netBalance < 0).length;
    const redPercentage = (redCases / totalCases) * 100;

    // 3. Tasa de Sustitución (Efficiency)
    // Cuánto de la caída fue cubierto por el caníbal.
    const substitutionRate = totalLoss > 0 ? (totalGain / totalLoss) * 100 : 0;

    // 4. Familia más afectada (Moda)
    const familyCounts: Record<string, number> = {};
    cases.forEach(c => { familyCounts[c.family] = (familyCounts[c.family] || 0) + 1; });
    const topFamily = Object.keys(familyCounts).reduce((a, b) => familyCounts[a] > familyCounts[b] ? a : b, '');

    return {
        totalLoss,
        totalGain,
        netBalance,
        redCases,
        redPercentage,
        substitutionRate,
        topFamily
    };
});

// Helper de formato
const fmt = (num: number) => new Intl.NumberFormat('es-MX', { maximumFractionDigits: 1 }).format(num);

// Color semántico del balance global
const balanceColor = computed(() => {
    if (!stats.value) return 'text-slate-500';
    return stats.value.netBalance >= 0 ? 'text-emerald-600' : 'text-rose-600';
});
</script>

<template>
    <div class="bg-white p-5 rounded-lg border border-slate-200 shadow-sm flex flex-col h-full relative overflow-hidden">
        
        <div class="flex justify-between items-start mb-6 z-10">
            <div>
                <h3 class="font-bold text-slate-700 text-sm flex items-center gap-2">
                    <i class="fa-solid fa-clipboard-list text-brand-500"></i>
                    Resumen del Análisis
                </h3>
                <p class="text-[10px] text-slate-400 mt-1">
                    Basado en {{ store.detectedCases.length }} casos detectados • Corte: {{ store.rules.splitMonth }}
                </p>
            </div>
            
            <button 
                @click="$emit('export')"
                class="group flex items-center gap-2 px-3 py-1.5 bg-slate-50 hover:bg-brand-50 text-slate-600 hover:text-brand-600 border border-slate-200 hover:border-brand-200 rounded-lg transition-all text-xs font-semibold"
            >
                <i class="fa-solid fa-file-export group-hover:scale-110 transition-transform"></i>
                <span>Exportar</span>
            </button>
        </div>

        <div v-if="stats" class="flex-1 flex flex-col gap-6 z-10">
            
            <div class="flex items-end justify-between border-b border-slate-100 pb-4">
                <div>
                    <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Balance Neto Global</span>
                    <div class="text-3xl font-black tracking-tight flex items-baseline gap-1" :class="balanceColor">
                        <span>{{ stats.netBalance > 0 ? '+' : '' }}{{ fmt(stats.netBalance) }}</span>
                        <span class="text-sm font-medium text-slate-400">Kg</span>
                    </div>
                </div>
                <div class="text-right">
                    <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Tasa Sustitución</span>
                    <div class="text-xl font-bold text-slate-700">
                        {{ stats.substitutionRate.toFixed(1) }}%
                    </div>
                </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
                <div class="bg-rose-50 rounded-lg p-3 border border-rose-100">
                    <div class="flex items-center gap-2 mb-1">
                        <i class="fa-solid fa-circle-xmark text-rose-500 text-xs"></i>
                        <span class="text-[10px] font-bold text-rose-700 uppercase">CANIBALIZACIÓN</span>
                    </div>
                    <p class="text-xs text-rose-800 leading-snug">
                        <span class="font-bold">{{ stats.redCases }} casos</span> ({{ stats.redPercentage.toFixed(0) }}%) de {{ store.detectedCases.length }} generaron pérdida neta de volumen.
                    </p>
                </div>

                <div class="bg-slate-50 rounded-lg p-3 border border-slate-100">
                    <div class="flex items-center gap-2 mb-1">
                        <i class="fa-solid fa-bullseye text-slate-500 text-xs"></i>
                        <span class="text-[10px] font-bold text-slate-500 uppercase">Familia Analizada</span>
                    </div>
                    <p class="text-xs text-slate-700 font-medium truncate" :title="stats.topFamily">
                        {{ stats.topFamily || 'N/A' }}
                    </p>
                </div>
            </div>

            <div class="mt-auto pt-2 text-[9px] text-slate-400 font-mono flex gap-3">
                <span><i class="fa-solid fa-filter mr-1"></i>Umbrales: -{{ (store.rules.dropThreshold * 100).toFixed(0) }}% / +{{ (store.rules.growthThreshold * 100).toFixed(0) }}%</span>
                <span><i class="fa-solid fa-cube mr-1"></i>Vol. Min: {{ store.rules.minVolume }}kg</span>
            </div>

        </div>

        <div v-else class="flex-1 flex flex-col items-center justify-center text-slate-300 z-10">
            <i class="fa-solid fa-chart-simple text-4xl mb-2 opacity-50"></i>
            <p class="text-xs">Sin datos para resumir</p>
        </div>

        <div class="absolute -right-6 -bottom-6 text-slate-50 opacity-50 pointer-events-none transform rotate-12">
            <i class="fa-solid fa-file-invoice-dollar text-9xl"></i>
        </div>
    </div>
</template>
```

# src\modules\Cannibalization\components\charts\SubstitutionChart.vue

```vue
<script setup lang="ts">
import { computed } from 'vue';
import BaseChart from '@/modules/Shared/components/charts/BaseChart.vue';
import type { ChartData } from 'chart.js';

// Recibimos los vectores puros (Arrays de 12 números) y los nombres
const props = defineProps<{
    victimName: string;
    victimVector: number[];
    cannibalName: string;
    cannibalVector: number[];
    splitMonth: number; // Para dibujar una línea vertical de corte
}>();

const chartData = computed<ChartData>(() => ({
    labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
    datasets: [
        {
            label: `Víctima: ${props.victimName}`,
            data: props.victimVector,
            borderColor: '#ef4444', // Red-500
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            fill: true,
            tension: 0.3
        },
        {
            label: `Caníbal: ${props.cannibalName}`,
            data: props.cannibalVector,
            borderColor: '#22c55e', // Green-500
            backgroundColor: 'rgba(34, 197, 94, 0.1)',
            fill: true,
            tension: 0.3
        }
    ]
}));

const chartOptions = computed(() => ({
    plugins: {
        annotation: { // Nota: Requiere plugin chartjs-plugin-annotation (Si no lo tienes, simplemente no se dibujará la línea, no rompe nada)
            annotations: {
                line1: {
                    type: 'line',
                    xMin: props.splitMonth - 1,
                    xMax: props.splitMonth - 1,
                    borderColor: 'gray',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    label: { content: 'Cambio de Estrategia', enabled: true }
                }
            }
        }
    }
}));
</script>

<template>
    <div class="bg-white p-4 rounded-lg shadow-sm border border-slate-200 h-full">
        <h3 class="text-sm font-bold text-slate-700 mb-4">Dinámica de Sustitución Mensual</h3>
        <div class="h-[300px]">
            <BaseChart type="line" :data="chartData" :options="chartOptions" />
        </div>
    </div>
</template>
```

# src\modules\Cannibalization\components\modals\ExportModal.vue

```vue
<script setup lang="ts">
import { ref, computed } from 'vue';
import ModalDialog from '@/modules/Shared/components/ModalDialog.vue';
import { useCannibalizationStore } from '../../stores/cannibalizationStore';
import { useCannibalizationExport } from '../../composables/useCannibalizationExport';
import PdfReportTemplate from '@/modules/Cannibalization/reports/PdfReportTemplate.vue';
import type { DetectedCannibalization } from '@/modules/Cannibalization/types/cannibalizationTypes';

const props = defineProps<{ modelValue: boolean }>();
const emit = defineEmits(['update:modelValue']);
const store = useCannibalizationStore();
const { downloadCSV, generatePDF, isExporting } = useCannibalizationExport();

// --- CONFIGURACIÓN DE EXPORTACIÓN ---
const exportMode = ref<'standard' | 'custom'>('standard');
const customSearch = ref('');
const selectedCustomIds = ref<Set<string>>(new Set());
const includeCustomTable = ref(true); 

const close = () => emit('update:modelValue', false);

// --- 1. HIDRATACIÓN DE DATOS (VINCULAR VECTORES PARA GRÁFICOS) ---
// Cruzamos los casos detectados con la data cruda para obtener los arrays de venta mensual
const hydrateCases = (cases: DetectedCannibalization[]) => {
    return cases.map(item => {
        let vVec: number[] = new Array(12).fill(0);
        let cVec: number[] = new Array(12).fill(0);

        // Buscamos los vectores originales en el store
        const client = store.rawData.find(c => c.name === item.clientName);
        if (client) {
            const family = client.families.find(f => f.name === item.family);
            if (family) {
                const victim = family.skus.find(s => s.name === item.victimSku);
                const cannibal = family.skus.find(s => s.name === item.cannibalSku);
                if (victim) vVec = victim.salesVector;
                if (cannibal) cVec = cannibal.salesVector;
            }
        }
        return { ...item, victimVector: vVec, cannibalVector: cVec };
    });
};

// --- 2. LÓGICA DE SELECCIÓN DE DATOS ---
const reportPayload = computed(() => {
    let visualItems: DetectedCannibalization[] = [];
    let tableItems: DetectedCannibalization[] = [];

    if (exportMode.value === 'standard') {
        // === MODO ESTÁNDAR (Lógica de Negocio) ===
        // 1. Filtramos SOLO los casos con impacto negativo (Ineficientes)
        const negativeCases = store.detectedCases.filter(c => c.netBalance < 0);
        
        // 2. Visual: Top 5 de mayor impacto (ordenados por Score)
        // Nota: store.detectedCases ya viene ordenado por impactScore desde el engine, pero aseguramos.
        visualItems = [...negativeCases]
            .sort((a,b) => b.impactScore - a.impactScore)
            .slice(0, 5);

        // 3. Tabla: TODOS los casos negativos (para auditoría completa)
        tableItems = negativeCases;

    } else {
        // === MODO PERSONALIZADO ===
        // Visual: Lo que el usuario seleccionó manualmente
        visualItems = store.detectedCases.filter(c => selectedCustomIds.value.has(c.id));
        
        // Tabla: Si el usuario activó el check, mostramos los datos de su selección
        if (includeCustomTable.value) {
            tableItems = visualItems;
        }
    }

    return {
        visual: hydrateCases(visualItems),
        table: hydrateCases(tableItems)
    };
});

// --- UI HELPERS ---
const filteredCustomOptions = computed(() => {
    const term = customSearch.value.toLowerCase();
    // Filtramos sobre store.detectedCases para que el usuario elija de lo que ya analizó
    return store.detectedCases.filter(c => 
        !term || 
        c.clientName.toLowerCase().includes(term) || 
        c.victimSku.toLowerCase().includes(term)
    );
});

// Resumen Global para el Header del PDF
const summaryStats = computed(() => {
    const data = store.detectedCases;
    if (data.length === 0) return null;
    const loss = data.reduce((a, c) => a + c.volumeLost, 0);
    const gain = data.reduce((a, c) => a + c.volumeGained, 0);
    return {
        netBalance: gain - loss,
        substitutionRate: loss > 0 ? (gain / loss) * 100 : 0,
        redCases: data.filter(c => c.netBalance < 0).length
    };
});


const currentFilters = computed(() => {
    // Intentamos recuperar el nombre de la familia de varios posibles lugares para asegurar que no salga "Todas" erróneamente
    const rawFamily = store.lastFetchParams?.filters?.family 
                   || store.lastFetchParams?.filters?.grupo 
                   || store.lastFetchParams?.family; // Por si está en el nivel raíz
                   
    return {
        year: store.lastFetchParams?.year || '2025',
        // Si rawFamily es string vacío o null, ponemos 'Todas', si no, el valor real
        family: rawFamily ? rawFamily : 'Todas',
        rules: store.rules 
    };
});

// --- ACCIONES ---
const toggleCustomSelection = (id: string) => {
    if (selectedCustomIds.value.has(id)) {
        selectedCustomIds.value.delete(id);
    } else {
        if (selectedCustomIds.value.size >= 10) return; // Límite duro de 10 gráficos
        selectedCustomIds.value.add(id);
    }
};

const handlePdf = async () => {
    if (exportMode.value === 'custom' && selectedCustomIds.value.size === 0) {
        // Pequeña validación UX
        return; 
    }
    // Enviamos el payload ya procesado (visual + table separados)
    await generatePDF(reportPayload.value, 'mixed'); 
    close();
};

const handleCsv = () => { downloadCSV(store.detectedCases); close(); };
</script>

<template>
    <ModalDialog :model-value="modelValue" title="Generar Reporte de Resultados" size="lg" @close="close">
        
        <div style="position: fixed; left: -9999px; top: 0;">
            <PdfReportTemplate 
                :visual-data="reportPayload.visual"
                :table-data="reportPayload.table"
                :filters="currentFilters"
                :summary="summaryStats"
            />
        </div>

        <div class="p-2 h-[500px] flex flex-col">
            
            <div class="flex gap-2 p-1 bg-slate-100 rounded-lg mb-6 shrink-0">
                <button 
                    @click="exportMode = 'standard'"
                    class="flex-1 py-2.5 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-2"
                    :class="exportMode === 'standard' ? 'bg-white text-brand-600 shadow-sm ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700'"
                >
                    <i class="fa-solid fa-wand-magic-sparkles"></i> Reporte Estándar
                </button>
                <button 
                    @click="exportMode = 'custom'"
                    class="flex-1 py-2.5 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-2"
                    :class="exportMode === 'custom' ? 'bg-white text-brand-600 shadow-sm ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700'"
                >
                    <i class="fa-solid fa-hand-pointer"></i> Selección Manual
                </button>
            </div>

            <div v-if="exportMode === 'standard'" class="flex-1 flex flex-col items-center justify-center text-center p-8 bg-slate-50/50 rounded-xl border border-slate-200 border-dashed animate-in fade-in duration-300">
                
                <div class="mb-6 relative">
                    <div class="absolute inset-0 bg-brand-200 rounded-full blur-xl opacity-20"></div>
                    <div class="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-100 relative z-10 mx-auto">
                        <i class="fa-solid fa-file-invoice-dollar text-4xl text-brand-500"></i>
                    </div>
                </div>

                <h3 class="font-bold text-slate-800 text-lg mb-2">Resumen Ejecutivo Automático</h3>
                <p class="text-xs text-slate-500 max-w-[280px] mx-auto mb-8 leading-relaxed">
                    Genera un documento profesional optimizado para la toma de decisiones, basado en los filtros actuales.
                </p>

                <div class="w-full max-w-sm bg-white rounded-lg border border-slate-200 shadow-sm divide-y divide-slate-100 text-left">
                    <div class="p-4 flex items-center gap-4">
                        <div class="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                            <i class="fa-solid fa-chart-line text-lg"></i>
                        </div>
                        <div>
                            <p class="text-xs font-bold text-slate-700">Top 5 Casos Críticos</p>
                            <p class="text-[10px] text-slate-400">Gráficos detallados de sustitución.</p>
                        </div>
                    </div>
                    <div class="p-4 flex items-center gap-4">
                        <div class="w-10 h-10 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600 shrink-0">
                            <i class="fa-solid fa-table-list text-lg"></i>
                        </div>
                        <div>
                            <p class="text-xs font-bold text-slate-700">Anexo: Tabla de Ineficiencias</p>
                            <p class="text-[10px] text-slate-400">Listado completo de casos con pérdida neta.</p>
                        </div>
                    </div>
                </div>
            </div>

            <div v-else class="flex-1 flex flex-col min-h-0 animate-in fade-in duration-300">
                
                <div class="flex justify-between items-center mb-3 px-1">
                    <div class="relative w-1/2">
                        <i class="fa-solid fa-search absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]"></i>
                        <input 
                            v-model="customSearch" 
                            type="text" 
                            placeholder="Buscar caso..." 
                            class="w-full pl-7 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-brand-500 outline-none bg-slate-50 focus:bg-white transition-colors"
                        >
                    </div>
                    <div class="text-[10px] font-bold" :class="selectedCustomIds.size >= 10 ? 'text-amber-600' : 'text-slate-500'">
                        <span class="bg-slate-100 px-2 py-1 rounded">{{ selectedCustomIds.size }} / 10 Gráficos</span>
                    </div>
                </div>

                <div class="flex-1 overflow-y-auto border border-slate-200 rounded-xl bg-white relative custom-scrollbar">
                    <div v-if="filteredCustomOptions.length === 0" class="p-8 text-center text-slate-400 text-xs">
                        No hay coincidencias.
                    </div>

                    <div 
                        v-for="item in filteredCustomOptions" 
                        :key="item.id" 
                        @click="toggleCustomSelection(item.id)"
                        class="flex items-center p-3 border-b border-slate-100 last:border-0 hover:bg-slate-50 cursor-pointer group transition-colors"
                        :class="{'bg-indigo-50/50': selectedCustomIds.has(item.id)}"
                    >
                        <div 
                            class="w-4 h-4 rounded border flex items-center justify-center mr-3 transition-all shrink-0"
                            :class="selectedCustomIds.has(item.id) 
                                ? 'bg-indigo-500 border-indigo-500 shadow-sm' 
                                : 'border-slate-300 bg-white group-hover:border-indigo-400'"
                        >
                            <i v-if="selectedCustomIds.has(item.id)" class="fa-solid fa-check text-white text-[9px]"></i>
                        </div>

                        <div class="flex-1 min-w-0 grid grid-cols-12 gap-2 items-center">
                            <div class="col-span-6">
                                <div class="font-bold text-xs text-slate-700 truncate" :title="item.clientName">{{ item.clientName }}</div>
                                <div class="text-[9px] text-slate-400 flex items-center gap-1">
                                    <span class="bg-slate-100 px-1 rounded">{{ item.matriz }}</span>
                                    <span>{{ item.route }}</span>
                                </div>
                            </div>
                            <div class="col-span-4 flex flex-col text-[9px]">
                                <span class="text-rose-600 truncate" :title="item.victimSku"><i class="fa-solid fa-arrow-down mr-0.5"></i> {{ item.victimSku }}</span>
                                <span class="text-emerald-600 truncate" :title="item.cannibalSku"><i class="fa-solid fa-arrow-up mr-0.5"></i> {{ item.cannibalSku }}</span>
                            </div>
                            <div class="col-span-2 text-right">
                                <span 
                                    class="text-[10px] font-bold px-1.5 py-0.5 rounded border"
                                    :class="item.netBalance >= 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'"
                                >
                                    {{ item.netBalance > 0 ? '+' : '' }}{{ item.netBalance.toFixed(0) }}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="mt-3 bg-slate-50 p-3 rounded-lg border border-slate-200 flex items-center gap-3 shrink-0">
                    <input type="checkbox" id="incTable" v-model="includeCustomTable" class="w-4 h-4 accent-brand-600 cursor-pointer rounded">
                    <label for="incTable" class="text-xs text-slate-600 cursor-pointer select-none font-medium">
                        Incluir tabla de datos al final del reporte
                    </label>
                </div>
            </div>

            <div class="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 gap-4 shrink-0">
                <button 
                    @click="handleCsv" 
                    class="flex items-center justify-center gap-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 py-2.5 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-colors"
                >
                    <i class="fa-solid fa-file-csv text-emerald-600"></i> Exportar CSV
                </button>
                
                <button 
                    @click="handlePdf" 
                    :disabled="isExporting || (exportMode === 'custom' && selectedCustomIds.size === 0)"
                    class="flex items-center justify-center gap-2 text-xs font-bold text-white bg-brand-600 py-2.5 rounded-lg hover:bg-brand-700 shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                >
                    <i v-if="isExporting" class="fa-solid fa-circle-notch fa-spin"></i>
                    <span v-else><i class="fa-solid fa-file-pdf"></i> Generar Reporte</span>
                </button>
            </div>

        </div>
    </ModalDialog>
</template>
```

# src\modules\Cannibalization\composables\useCannibalizationEngine.ts

```ts
/*

Lógica implementada:

1. Divide el año en dos periodos usando el splitMonth.

2. Calcula promedios de venta Pre y Post corte.

3. Identifica Víctimas: SKUs que cayeron más del dropThreshold.

4. Identifica Caníbales: SKUs de la misma familia que crecieron más del growthThreshold.

5. Crea un "Caso" si encuentra ambos actores en la misma familia.

*/


/* src/modules/Cannibalization/composables/useCannibalizationEngine.ts */
import type {
   ClientNode,
   DetectionRules,
   DetectedCannibalization,
   SkuMonthlyData
} from '../types/cannibalizationTypes';

export function useCannibalizationEngine() {

   // Helper: Calcula promedio de un vector en un rango dado
   const calculateAverage = (vector: number[], startIndex: number, endIndex: number): number => {
      const slice = vector.slice(startIndex, endIndex);
      if (slice.length === 0) return 0;
      const sum = slice.reduce((a, b) => a + b, 0);
      return sum / slice.length;
   };

   /**
    * Ejecuta el análisis de detección sobre los datos crudos
    */
   const runAnalysis = (data: ClientNode[], rules: DetectionRules): DetectedCannibalization[] => {
      const results: DetectedCannibalization[] = [];
      const splitIndex = rules.splitMonth - 1; // Convertir mes (1-12) a índice (0-11)

      // Validar rangos
      if (splitIndex < 1 || splitIndex > 10) {
         console.warn("Mes de corte inválido para comparación (se necesita margen Pre y Post)");
         return [];
      }

      data.forEach(client => {
         client.families.forEach(family => {

            // Listas temporales para esta familia
            const victims: { sku: SkuMonthlyData, avgPre: number, avgPost: number, loss: number }[] = [];
            const cannibals: { sku: SkuMonthlyData, avgPre: number, avgPost: number, gain: number }[] = [];

            // 1. Clasificar SKUs
            family.skus.forEach(sku => {
               const avgPre = calculateAverage(sku.salesVector, 0, splitIndex);
               const avgPost = calculateAverage(sku.salesVector, splitIndex, 12);

               // Solo considerar productos con volumen relevante (evitar ruido de muestras gratis)
               if (avgPre + avgPost < rules.minVolume) return;

               // Detección de CAÍDA (Víctima)
               if (avgPre > 0) {
                  const dropRate = (avgPre - avgPost) / avgPre;
                  // Si cayó más del umbral configurado (ej: 40%)
                  if (dropRate >= rules.dropThreshold) {
                     victims.push({
                        sku,
                        avgPre,
                        avgPost,
                        loss: (avgPre - avgPost) * (12 - splitIndex) // Kilos totales perdidos estimados en el periodo post
                     });
                  }
               }

               // Detección de SUBIDA (Caníbal)
               // Caso A: Crecimiento porcentual fuerte
               // Caso B: Producto nuevo (avgPre cercano a 0)
               const gainDiff = avgPost - avgPre;
               if (gainDiff > 0) { // Debe haber ganancia neta
                  const growthRate = avgPre > 0 ? (avgPost - avgPre) / avgPre : 999; // 999 = infinito (nuevo producto)

                  if (growthRate >= rules.growthThreshold) {
                     cannibals.push({
                        sku,
                        avgPre,
                        avgPost,
                        gain: gainDiff * (12 - splitIndex) // Kilos totales ganados estimados
                     });
                  }
               }
            });

            // 2. Emparejar (Matchmaking)
            // Heurística simple: Si hay víctimas y caníbales en la misma familia, asumimos relación.
            // Tomamos la víctima principal y buscamos al caníbal principal.


            if (victims.length > 0 && cannibals.length > 0) {
               // Ordenamos por impacto (volumen)
               victims.sort((a, b) => b.loss - a.loss);
               cannibals.sort((a, b) => b.gain - a.gain);

               const mainVictim = victims[0];
               const mainCannibal = cannibals[0];

               if (!mainVictim || !mainCannibal) return; // Type guard extra para silenciar TS


               // Calcular Score de Impacto (0-100)
               // Basado en qué tanto de la pérdida se recuperó y el volumen total
               const netBalance = mainCannibal.gain - mainVictim.loss;
               const substitutionRate = (mainCannibal.gain / mainVictim.loss) * 100;

               // Un caso "perfecto" de canibalización es cuando la tasa de sustitución es alta
               // y hay una pérdida neta significativa o impacto en drop size (que inferimos por el cambio de SKU).

               // Score simple: Priorizar aquellos con grandes volúmenes involucrados
               const impactScore = mainVictim.loss + mainCannibal.gain;

               results.push({
                  id: `${client.id}-${family.name}`,
                  clientName: client.name,
                  matriz: client.matriz,
                  gerencia: client.gerencia,
                  jefatura: client.jefatura,
                  route: client.route,
                  family: family.name,
                  victimSku: mainVictim.sku.name,
                  cannibalSku: mainCannibal.sku.name,
                  volumeLost: parseFloat(mainVictim.loss.toFixed(2)),
                  volumeGained: parseFloat(mainCannibal.gain.toFixed(2)),
                  netBalance: parseFloat(netBalance.toFixed(2)),
                  substitutionRate: parseFloat(substitutionRate.toFixed(1)),
                  impactScore
               });
            }
         });
      });

      // Retornar ordenados por mayor impacto (volumen movido)
      return results.sort((a, b) => b.impactScore - a.impactScore);
   };

   return {
      runAnalysis
   };
}
```

# src\modules\Cannibalization\composables\useCannibalizationExport.ts

```ts
import { ref } from 'vue';
import type { DetectedCannibalization } from '../types/cannibalizationTypes';
import jsPDF from 'jspdf'; // Importar librería
import html2canvas from 'html2canvas'; // Importar librería

export function useCannibalizationExport() {
   const isExporting = ref(false);

   // --- LÓGICA CSV ---
   const downloadCSV = (data: DetectedCannibalization[]) => {
      isExporting.value = true;
      try {
         // 1. Definir cabeceras y mapeo de columnas
         const headers = [
            'ID Caso', 'Gerencia', 'Jefatura', 'Matriz', 'Ruta', 'Cliente',
            'Familia', 'SKU Victima', 'SKU Canibal',
            'Vol. Perdido (Kg)', 'Vol. Ganado (Kg)', 'Balance Neto (Kg)',
            'Tasa Sustitucion (%)', 'Score Impacto'
         ];

         // 2. Transformar datos
         const rows = data.map(item => [
            item.id,
            item.gerencia || 'N/A',
            item.jefatura || 'N/A',
            item.matriz,
            item.route,
            `"${item.clientName}"`, // Entre comillas por si tiene comas
            item.family,
            item.victimSku,
            item.cannibalSku,
            item.volumeLost.toFixed(2),
            item.volumeGained.toFixed(2),
            item.netBalance.toFixed(2),
            item.substitutionRate.toFixed(1) + '%',
            item.impactScore.toFixed(0)
         ]);

         // 3. Construir String CSV
         const csvContent = [
            headers.join(','),
            ...rows.map(r => r.join(','))
         ].join('\n');

         // 4. Disparar descarga
         const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
         const link = document.createElement('a');
         const url = URL.createObjectURL(blob);
         link.setAttribute('href', url);
         link.setAttribute('download', `Canibalizacion_Reporte_${new Date().toISOString().slice(0, 10)}.csv`);
         link.style.visibility = 'hidden';
         document.body.appendChild(link);
         link.click();
         document.body.removeChild(link);

      } catch (e) {
         console.error("Error exportando CSV", e);
      } finally {
         isExporting.value = false;
      }
   };

   // --- LÓGICA PDF REAL ---
   const generatePDF = async (
      data: DetectedCannibalization[],
      scope: string
   ) => {
      isExporting.value = true;

      try {
         // 1. Buscamos el elemento oculto en el DOM
         const element = document.getElementById('pdf-report-content');

         if (!element) {
            console.error("No se encontró la plantilla del reporte");
            return;
         }

         // 2. Capturamos el elemento como Canvas (Foto de alta calidad)
         const canvas = await html2canvas(element, {
            scale: 2, // Mejor resolución
            useCORS: true, // Para íconos o imágenes externas
            logging: false
         });

         // 3. Calculamos dimensiones para ajustar al PDF (A4)
         const imgData = canvas.toDataURL('image/png');
         const pdf = new jsPDF('p', 'mm', 'a4');

         const pdfWidth = pdf.internal.pageSize.getWidth();
         const pdfHeight = pdf.internal.pageSize.getHeight();

         const imgWidth = canvas.width;
         const imgHeight = canvas.height;

         // Ajustar ancho al PDF y calcular altura proporcional
         const ratio = pdfWidth / imgWidth;
         const finalHeight = imgHeight * ratio;

         // 4. Agregamos la imagen al PDF
         // Si el contenido es muy largo, aquí habría que hacer lógica de paginación,
         // pero para este MVP escalaremos el contenido o cortaremos.
         // Para una versión robusta multipágina, html2pdf.js es mejor, 
         // pero html2canvas da más control visual.

         let heightLeft = finalHeight;
         let position = 0;

         // Primera página
         pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, finalHeight);
         heightLeft -= pdfHeight;

         // (Opcional) Ciclo para múltiples páginas si es muy largo
         while (heightLeft > 0) {
            position = heightLeft - finalHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, finalHeight);
            heightLeft -= pdfHeight;
         }

         // 5. Descargar
         const filename = `Reporte_PIC_${scope}_${new Date().toISOString().slice(0, 10)}.pdf`;
         pdf.save(filename);

      } catch (e) {
         console.error("Error generando PDF:", e);
         alert("Hubo un error al generar el PDF. Revisa la consola.");
      } finally {
         isExporting.value = false;
      }
   };

   return {
      isExporting,
      downloadCSV,
      generatePDF
   };
}
```

# src\modules\Cannibalization\reports\PdfReportTemplate.vue

```vue
<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
    visualData: any[]; 
    tableData: any[];
    filters: any; // Ahora incluye .rules
    summary: any;
}>();

const today = new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute:'2-digit' });

// --- UTILS GRÁFICOS ---
const getSparklinePath = (data: number[], width: number, height: number) => {
    if (!data || data.length === 0) return '';
    const max = Math.max(...data, 10);
    const stepX = width / (data.length - 1);
    const points = data.map((val, index) => {
        const x = index * stepX;
        const y = height - ((val / max) * height); 
        return `${x},${y}`;
    });
    return `M ${points.join(' L ')}`;
};

const getSparklineFill = (data: number[], width: number, height: number) => {
    const linePath = getSparklinePath(data, width, height);
    return `${linePath} L ${width},${height} L 0,${height} Z`;
};

// --- HELPER FORMATO ---
const fmtPct = (val: number) => `${(val * 100).toFixed(0)}%`;
</script>

<template>
    <div id="pdf-report-content" class="w-[900px] bg-white p-10 text-slate-800 relative font-sans">
        
        <div class="flex justify-between items-end mb-6 border-b-2 border-slate-800 pb-4">
            <div>
                <h1 class="text-2xl font-black text-slate-900 uppercase tracking-tighter">Reporte de Análisis: Canibalización</h1>
                <p class="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">PIC System • Inteligencia Comercial</p>
            </div>
            <div class="text-right">
                <div class="text-[10px] font-mono text-slate-400 mb-1">Generado el: {{ today }}</div>
                <div class="bg-slate-900 text-white text-[10px] font-bold px-2 py-1 inline-block rounded-sm">CONFIDENCIAL</div>
            </div>
        </div>

        <div class="bg-slate-50 border border-slate-200 rounded-lg p-5 mb-10 shadow-sm break-inside-avoid">
            <h3 class="text-xs font-bold text-slate-900 uppercase mb-4 flex items-center gap-2 border-b border-slate-200 pb-2">
                <i class="fa-solid fa-sliders"></i> Parámetros y Contexto del Análisis
            </h3>
            
            <div class="grid grid-cols-3 gap-8">
                <div class="space-y-2">
                    <div>
                        <span class="block text-[9px] font-bold text-slate-400 uppercase">Familia Analizada</span>
                        <span class="block text-sm font-bold text-slate-800">{{ filters.family }}</span>
                    </div>
                    <div>
                        <span class="block text-[9px] font-bold text-slate-400 uppercase">Periodo Fiscal</span>
                        <span class="block text-sm font-bold text-slate-800">{{ filters.year }}</span>
                    </div>
                </div>

                <div class="space-y-2 border-l border-slate-200 pl-4">
                    <div>
                        <span class="block text-[9px] font-bold text-slate-400 uppercase">Punto de Inflexión (Corte)</span>
                        <span class="block text-sm font-bold text-slate-800">Mes {{ filters.rules.splitMonth }}</span>
                    </div>
                    <div class="flex gap-4">
                        <div>
                            <span class="block text-[9px] font-bold text-slate-400 uppercase">Sensib. Caída</span>
                            <span class="block text-xs font-mono text-slate-700 bg-white px-1 border border-slate-200 rounded">{{ fmtPct(filters.rules.dropThreshold) }}</span>
                        </div>
                        <div>
                            <span class="block text-[9px] font-bold text-slate-400 uppercase">Sensib. Crecim.</span>
                            <span class="block text-xs font-mono text-slate-700 bg-white px-1 border border-slate-200 rounded">{{ fmtPct(filters.rules.growthThreshold) }}</span>
                        </div>
                    </div>
                </div>

                <div v-if="summary" class="space-y-2 border-l border-slate-200 pl-4">
                    <div class="flex justify-between items-center">
                        <span class="text-[9px] font-bold text-slate-400 uppercase">Impacto Neto Total</span>
                        <span class="text-sm font-black" :class="summary.netBalance >= 0 ? 'text-emerald-700' : 'text-rose-700'">
                            {{ summary.netBalance > 0 ? '+' : '' }}{{ summary.netBalance.toFixed(0) }} Kg
                        </span>
                    </div>
                    <div class="flex justify-between items-center">
                        <span class="text-[9px] font-bold text-slate-400 uppercase">Tasa Sustitución Global</span>
                        <span class="text-sm font-bold text-slate-800">{{ summary.substitutionRate.toFixed(1) }}%</span>
                    </div>
                    <div class="flex justify-between items-center">
                        <span class="text-[9px] font-bold text-slate-400 uppercase">Casos Críticos</span>
                        <span class="text-xs font-bold text-rose-600 bg-rose-50 px-2 rounded-full border border-rose-100">{{ summary.redCases }} Detec.</span>
                    </div>
                </div>
            </div>
        </div>

        <div v-if="visualData.length > 0" class="mb-10">
            <h3 class="text-sm font-bold text-slate-800 border-l-4 border-brand-600 pl-3 mb-6 uppercase tracking-wide">
                Detalle Gráfico (Top {{ visualData.length }})
            </h3>

            <div class="space-y-6">
                <div v-for="(item, idx) in visualData" :key="item.id" class="break-inside-avoid bg-white border border-slate-300 rounded-lg overflow-hidden shadow-sm">
                    
                    <div class="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
                        <div class="flex items-center gap-3">
                            <span class="w-6 h-6 rounded bg-slate-800 text-white text-xs font-bold flex items-center justify-center">#{{ idx + 1 }}</span>
                            <div>
                                <h4 class="text-sm font-bold text-slate-800">{{ item.clientName }}</h4>
                                <div class="text-[10px] text-slate-500 font-mono flex gap-2">
                                    <span>{{ item.matriz }}</span> • <span>{{ item.route }}</span>
                                </div>
                            </div>
                        </div>
                        <div class="text-right">
                             <span class="block text-[9px] font-bold text-slate-400 uppercase">Score Impacto</span>
                             <span class="font-mono font-bold text-slate-700">{{ item.impactScore.toFixed(0) }} pts</span>
                        </div>
                    </div>

                    <div class="p-4 grid grid-cols-12 gap-6">
                        <div class="col-span-7 relative h-32 border border-slate-100 rounded bg-slate-50/50">
                             <div class="absolute top-0 bottom-0 border-l border-dashed border-slate-400 z-0" :style="{ left: `${(filters.rules.splitMonth / 12) * 100}%` }"></div>
                             
                             <svg class="w-full h-full" viewBox="0 0 800 100" preserveAspectRatio="none">
                                <path :d="getSparklineFill(item.victimVector, 800, 100)" fill="rgba(244, 63, 94, 0.1)" />
                                <path :d="getSparklinePath(item.victimVector, 800, 100)" fill="none" stroke="#e11d48" stroke-width="2.5" />
                                <path :d="getSparklineFill(item.cannibalVector, 800, 100)" fill="rgba(16, 185, 129, 0.1)" />
                                <path :d="getSparklinePath(item.cannibalVector, 800, 100)" fill="none" stroke="#059669" stroke-width="2.5" />
                            </svg>
                        </div>

                        <div class="col-span-5 flex flex-col justify-center space-y-3">
                            <div class="flex justify-between items-start border-b border-slate-100 pb-2">
                                <div>
                                    <span class="text-[9px] font-bold text-rose-600 uppercase block mb-0.5">Víctima (Desplazado)</span>
                                    <span class="text-[10px] font-medium text-slate-600 leading-tight block">{{ item.victimSku }}</span>
                                </div>
                                <div class="text-right">
                                    <span class="text-xs font-bold text-rose-600">-{{ item.volumeLost.toFixed(1) }}</span>
                                    <span class="text-[9px] text-slate-400 block">Kg</span>
                                </div>
                            </div>

                            <div class="flex justify-between items-start border-b border-slate-100 pb-2">
                                <div>
                                    <span class="text-[9px] font-bold text-emerald-600 uppercase block mb-0.5">Caníbal (Crecimiento)</span>
                                    <span class="text-[10px] font-medium text-slate-600 leading-tight block">{{ item.cannibalSku }}</span>
                                </div>
                                <div class="text-right">
                                    <span class="text-xs font-bold text-emerald-600">+{{ item.volumeGained.toFixed(1) }}</span>
                                    <span class="text-[9px] text-slate-400 block">Kg</span>
                                </div>
                            </div>

                            <div class="flex justify-between items-center pt-1">
                                <div>
                                    <span class="text-[9px] text-slate-400 font-bold uppercase">Sustitución</span>
                                    <span class="ml-1 text-[10px] font-bold text-slate-700">{{ item.substitutionRate.toFixed(1) }}%</span>
                                </div>
                                <div class="text-right">
                                    <span class="text-sm font-black px-2 py-0.5 rounded border"
                                          :class="item.netBalance >= 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'">
                                        Neto: {{ item.netBalance > 0 ? '+' : '' }}{{ item.netBalance.toFixed(1) }}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="break-after-page"></div>
        </div>

        <div v-if="tableData.length > 0" class="break-inside-avoid">
            <h3 class="text-sm font-bold text-slate-800 border-l-4 border-slate-600 pl-3 mb-6 uppercase tracking-wide">
                Anexo de Datos Tabulares ({{ tableData.length }} Registros)
            </h3>

            <table class="w-full text-[10px] text-left border border-slate-300">
                <thead class="bg-slate-100 text-slate-700 uppercase font-bold">
                    <tr>
                        <th class="p-2 border-b border-slate-300 w-1/4">Cliente / Ruta</th>
                        <th class="p-2 border-b border-slate-300 w-1/4">Víctima</th>
                        <th class="p-2 border-b border-slate-300 w-1/4">Caníbal</th>
                        <th class="p-2 border-b border-slate-300 text-right w-[8%]">Perd.</th>
                        <th class="p-2 border-b border-slate-300 text-right w-[8%]">Gan.</th>
                        <th class="p-2 border-b border-slate-300 text-right w-[9%]">Neto</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-200">
                    <tr v-for="(item, idx) in tableData" :key="item.id" class="break-inside-avoid" :class="idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'">
                        <td class="p-2 align-top">
                            <div class="font-bold text-slate-800">{{ item.clientName }}</div>
                            <div class="text-[9px] text-slate-500 mt-0.5">{{ item.matriz }} - {{ item.route }}</div>
                        </td>
                        <td class="p-2 align-top text-slate-600 whitespace-normal">
                            {{ item.victimSku }}
                        </td>
                        <td class="p-2 align-top text-slate-600 whitespace-normal">
                            {{ item.cannibalSku }}
                        </td>
                        <td class="p-2 align-top text-right text-rose-600 font-bold border-l border-slate-100">
                            -{{ item.volumeLost.toFixed(1) }}
                        </td>
                        <td class="p-2 align-top text-right text-emerald-600 font-bold border-l border-slate-100">
                            +{{ item.volumeGained.toFixed(1) }}
                        </td>
                        <td class="p-2 align-top text-right font-black border-l border-slate-100" 
                            :class="item.netBalance >= 0 ? 'text-emerald-700' : 'text-rose-700'">
                            {{ item.netBalance.toFixed(1) }}
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

        <div class="mt-10 pt-4 border-t border-slate-300 text-center">
            <p class="text-[9px] text-slate-400">
                Este reporte refleja los datos disponibles al momento de la generación bajo los filtros especificados.
            </p>
        </div>
    </div>
</template>
```

# src\modules\Cannibalization\services\cannibalizationApi.ts

```ts
/* src/modules/Cannibalization/services/cannibalizationApi.ts */
import api from '@/api/axios';
import type { ClientNode } from '../types/cannibalizationTypes';

// Payload para los filtros
interface AnalysisFilters {
   grupo?: string;
   ruta?: string;
   gerencia?: string;
   jefatura?: string;
}

export default {
   /**
    * Obtiene los datos jerárquicos de ventas
    */
   async fetchAnalysisData(year: string, filters: AnalysisFilters = {}): Promise<ClientNode[]> {
      const { data } = await api.post<ClientNode[]>('/cannibalization', {
         year,
         filters
      }, {
         baseURL: import.meta.env.VITE_API_BASE_URL
      });

      return data;
   },

   /**
    * Obtiene la lista de familias (grupos) disponibles.
    */
   async fetchFamilies(): Promise<string[]> {
      const { data } = await api.post<string[]>('/grupos', {}, {
         baseURL: import.meta.env.VITE_API_BASE_URL + '/filters'
      });
      return data;
   },

   /**
    * NUEVO: Obtiene la lista de años disponibles (Fiscal Years).
    */
   async fetchYears(): Promise<string[]> {
      // Usamos GET porque así está definido en filterRoutes.js
      const { data } = await api.get<string[]>('/anios', {
         baseURL: import.meta.env.VITE_API_BASE_URL + '/filters'
      });
      return data;
   }
};
```

# src\modules\Cannibalization\stores\cannibalizationStore.ts

```ts
/* src/modules/Cannibalization/stores/cannibalizationStore.ts */
import { defineStore } from 'pinia';
import { ref, reactive } from 'vue';
import cannibalizationApi from '../services/cannibalizationApi';
import { useCannibalizationEngine } from '../composables/useCannibalizationEngine';
import type { ClientNode, DetectionRules, DetectedCannibalization } from '../types/cannibalizationTypes';

export const useCannibalizationStore = defineStore('cannibalization', () => {

   // --- STATE ---
   const isLoading = ref(false);
   const rawData = ref<ClientNode[]>([]);
   const detectedCases = ref<DetectedCannibalization[]>([]);
   const lastFetchParams = ref<any>({});


   // Metadatos Dinámicos
   const availableFamilies = ref<string[]>([]);
   const availableYears = ref<string[]>([]); // <--- NUEVO


   // Configuración Reactiva (Valores por defecto)
   const rules = reactive<DetectionRules>({
      dropThreshold: 0.5,    // 50% caída para ser víctima
      growthThreshold: 0.2,  // 20% subida para ser caníbal
      minVolume: 10,         // Mínimo 10kg promedio para considerar
      splitMonth: 8          // Agosto (según el caso de uso del usuario)
   });

   // --- COMPOSABLES ---
   const engine = useCannibalizationEngine();

   // --- ACTIONS ---

   /**
    * 1. Cargar Datos del Servidor
    */
   async function fetchData(year: string, filters: any = {}) {
      lastFetchParams.value = { year, filters };
      isLoading.value = true;
      try {
         rawData.value = await cannibalizationApi.fetchAnalysisData(year, filters);
         analyze();
      } catch (error) {
         console.error('Error fetching cannibalization data:', error);
         rawData.value = [];
      } finally {
         isLoading.value = false;
      }
   }
   /**
   * NUEVO: Cargar lista de familias al iniciar
   */
   async function loadMetadata() {
      try {
         // Hacemos las dos peticiones al mismo tiempo para no perder tiempo
         const [families, years] = await Promise.all([
            cannibalizationApi.fetchFamilies(),
            cannibalizationApi.fetchYears()
         ]);

         availableFamilies.value = families;
         // Ordenamos los años descendente (2025, 2024...) para que el más reciente salga primero
         availableYears.value = years.sort().reverse();

      } catch (error) {
         console.error('Error cargando metadatos:', error);
      }
   }

   function analyze() {
      if (rawData.value.length === 0) {
         detectedCases.value = [];
         return;
      }
      detectedCases.value = engine.runAnalysis(rawData.value, rules);
   }

   function updateRules(newRules: Partial<DetectionRules>) {
      Object.assign(rules, newRules);
      analyze();
   }

   return {
      // State
      isLoading,
      rawData,

      detectedCases,
      lastFetchParams,
      rules,
      availableFamilies,
      availableYears,

      // Actions
      fetchData,
      loadMetadata,
      analyze,
      updateRules
   };
});
```

# src\modules\Cannibalization\types\cannibalizationTypes.ts

```ts
/* src/modules/Cannibalization/types/cannibalizationTypes.ts */

// --- 1. DATOS CRUDOS (Respuesta del API) ---

export interface SkuMonthlyData {
   name: string;
   salesVector: number[]; // Array de 12 posiciones (Ene-Dic) con VentaKG
   metaVector: number[];  // Array de 12 posiciones (Ene-Dic) con MetasKG
}

export interface FamilyGroup {
   name: string;
   totalVolumen: number; // Para ordenar importancia
   skus: SkuMonthlyData[];
}

export interface ClientNode {
   id: string;
   matriz: string;
   name: string;
   route: string;
   gerencia: string;
   jefatura: string;
   families: FamilyGroup[];
}

// --- 2. CONFIGURACIÓN DEL MOTOR ---

export interface DetectionRules {
   dropThreshold: number;   // Ej: 0.4 (40% caída)
   growthThreshold: number; // Ej: 0.2 (20% subida)
   minVolume: number;       // Filtro para ignorar "ruido" o ventas hormiga (Ej: 10kg)
   splitMonth: number;      // Mes de corte (1-12). Ej: 8 (Agosto) para comparar Ene-Jul vs Ago-Dic
}

// --- 3. RESULTADOS DEL ANÁLISIS ---

export interface DetectedCannibalization {
   id: string; // ID único del caso (Matriz + Familia)
   clientName: string;
   matriz: string;
   gerencia: string;
   jefatura: string;
   route: string;
   family: string;

   // Los actores del crimen
   victimSku: string;
   cannibalSku: string;

   // Métricas del impacto
   volumeLost: number;      // Kilos que perdió la víctima (Post-Corte)
   volumeGained: number;    // Kilos que ganó el caníbal (Post-Corte)
   netBalance: number;      // Gained - Lost
   substitutionRate: number; // Qué % de la pérdida fue cubierto por el caníbal (0 a 100+)

   impactScore: number;     // Puntuación calculada para ordenar la tabla de prioridad
}
```

# src\modules\Cannibalization\views\CannibalizationDashboard.vue

```vue
<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useCannibalizationStore } from '../stores/cannibalizationStore';
import AnalysisConfigPanel from '../../Shared/components/config/AnalysisConfigPanel.vue';
import SuspectsTable from '../../Shared/components/tables/SuspectsTable.vue';
import SubstitutionChart from '../components/charts/SubstitutionChart.vue';
import type { DetectedCannibalization } from '../types/cannibalizationTypes';
import AnalysisSummaryCard from '../components/cards/AnalysisSummaryCard.vue';
import ExportModal from '../components/modals/ExportModal.vue'; 

const store = useCannibalizationStore();

// --- ESTADO LOCAL ---
const selectedCase = ref<DetectedCannibalization | null>(null);
const selectedVictimVector = ref<number[]>([]);
const selectedCannibalVector = ref<number[]>([]);

// Filtros de API
const selectedYear = ref('2025');
const selectedFamily = ref('');

// Estado visual (replicando PIC)
const isCollapsed = ref(true); 
const overflowVisible = ref(true);

// Helper para formato visual de porcentaje
const toPct = (val: number) => `${(val * 100).toFixed(0)}%`;

// --- ACCIONES ---

const onCaseSelected = (item: DetectedCannibalization) => {
    selectedCase.value = item;
    
    // Buscar los datos crudos para el gráfico
    const client = store.rawData.find(c => c.name === item.clientName);
    if (client) {
        const family = client.families.find(f => f.name === item.family);
        if (family) {
            const victim = family.skus.find(s => s.name === item.victimSku);
            const cannibal = family.skus.find(s => s.name === item.cannibalSku);
            
            if (victim && cannibal) {
                selectedVictimVector.value = victim.salesVector;
                selectedCannibalVector.value = cannibal.salesVector;
            }
        }
    }
};

const loadData = () => {
    selectedCase.value = null;
    const filters: any = {};
    
    if (selectedFamily.value) {
        filters.grupo = selectedFamily.value;
    }
    
    // Fetch Data trae los datos y ejecuta analyze() internamente
    store.fetchData(selectedYear.value, filters);
};

const showExportModal = ref(false);

const handleExport = () => {
    showExportModal.value = true;
};
// --- WATCHERS (PIC STYLE) ---
watch(isCollapsed, (newVal) => {
    if (newVal) {
        overflowVisible.value = false; 
    } else {
        setTimeout(() => {
            overflowVisible.value = true; 
        }, 350); 
    }
});

// --- CICLO DE VIDA ---

onMounted(async () => {
    // Solo cargamos los catálogos (Años y Familias)
    // Asumimos que loadMetadata existe en tu store completo (aunque no aparecía en el snippet provisto)
    if (store.loadMetadata) {
        await store.loadMetadata();
    }
    
    // Seleccionar año más reciente por defecto visualmente, pero SIN cargar datos
    if (store.availableYears && store.availableYears.length > 0) {
        if (!store.availableYears.includes(selectedYear.value)) {
            selectedYear.value = store.availableYears[0];
        }
    }

    // ELIMINADO: loadData(); 
    // Ahora el usuario debe hacer clic explícitamente en "ANALIZAR"
});


</script>

<template>
    <div class="h-full flex flex-col p-6 gap-6 bg-slate-50 overflow-hidden">
        
        <!-- HEADER: PANEL FILTROS (Estilo PIC) -->
        <div class="relative z-40 bg-white border border-slate-200 shadow-sm rounded-xl transition-all duration-300 ease-in-out mb-2">
            
            <div 
                class="transition-all duration-300 ease-in-out"
                :class="[
                    isCollapsed ? 'max-h-0 opacity-0 overflow-hidden' : 'max-h-[800px] opacity-100',
                    overflowVisible && !isCollapsed ? 'overflow-visible' : 'overflow-hidden'
                ]"
            >
                <div class="p-6">
                    <div class="flex justify-between items-center mb-6 pb-4 border-b border-slate-100">
                        <h2 class="text-sm font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2">
                            <div class="p-1.5 bg-brand-50 rounded text-brand-600">
                                <i class="fa-solid fa-sliders"></i>
                            </div>
                            Configuración de Análisis
                        </h2>
                        <div class="flex gap-3">
                            <button 
                                @click="loadData" 
                                :disabled="store.isLoading"
                                class="bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold px-5 py-2 rounded-lg shadow-md shadow-brand-500/20 transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed hover:-translate-y-0.5"
                            >
                                <i v-if="store.isLoading" class="fa-solid fa-circle-notch fa-spin"></i>
                                <span v-else class="flex items-center gap-2">
                                    <i class="fa-solid fa-rotate"></i> Actualizar
                                </span>
                            </button>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-6">
                        
                        <!-- GRUPO 1: ORIGEN DE DATOS -->
                        <div class="space-y-4">
                            <h3 class="text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 mb-3">
                                <i class="fa-solid fa-database mr-1"></i> Origen de Datos
                            </h3>
                            
                            <div>
                                <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Año Fiscal</label>
                                <div class="relative">
                                    <select v-model="selectedYear" class="w-full text-xs font-medium border border-slate-200 rounded-lg pl-2 pr-6 h-[38px] bg-white appearance-none focus:border-brand-500 focus:ring-1 focus:ring-brand-100 outline-none cursor-pointer hover:border-slate-300">
                                        <option v-for="year in store.availableYears" :key="year" :value="year">{{ year }}</option>
                                    </select>
                                    <i class="fa-solid fa-chevron-down absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 pointer-events-none"></i>
                                </div>
                            </div>
                            
                            <div>
                                <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Familia</label>
                                <div class="relative">
                                    <select v-model="selectedFamily" class="w-full text-xs font-medium border border-slate-200 rounded-lg pl-2 pr-6 h-[38px] bg-white appearance-none focus:border-brand-500 focus:ring-1 focus:ring-brand-100 outline-none cursor-pointer hover:border-slate-300">
                                        <option value="">-- Todas --</option>
                                        <option v-for="fam in store.availableFamilies" :key="fam" :value="fam">{{ fam }}</option>
                                    </select>
                                    <i class="fa-solid fa-chevron-down absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 pointer-events-none"></i>
                                </div>
                            </div>
                        </div>

                        <!-- GRUPO 2: PARÁMETROS -->
                        <div class="space-y-4">
                            <h3 class="text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 mb-3">
                                <i class="fa-solid fa-gears mr-1"></i> Parámetros
                            </h3>
                            
                            <div>
                                <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Mes Corte</label>
                                <div class="relative">
                                    <select v-model.number="store.rules.splitMonth" @change="store.analyze()" class="w-full text-xs font-medium border border-slate-200 rounded-lg pl-2 pr-6 h-[38px] bg-white appearance-none focus:border-brand-500 focus:ring-1 focus:ring-brand-100 outline-none cursor-pointer hover:border-slate-300">
                                        <option :value="1">Enero</option>
                                        <option :value="6">Junio</option>
                                        <option :value="7">Julio</option>
                                        <option :value="8">Agosto</option>
                                        <option :value="9">Septiembre</option>
                                        <option :value="10">Octubre</option>
                                    </select>
                                    <i class="fa-solid fa-chevron-down absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 pointer-events-none"></i>
                                </div>
                            </div>

                            <div>
                                <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Vol. Min (Kg)</label>
                                <input 
                                    type="number" 
                                    v-model.number="store.rules.minVolume"
                                    @input="store.analyze()"
                                    class="w-full text-xs font-medium border border-slate-200 rounded-lg px-3 h-[38px] bg-white focus:border-brand-500 focus:ring-1 focus:ring-brand-100 outline-none transition-shadow"
                                />
                            </div>
                        </div>

                        <!-- GRUPO 3: SENSIBILIDAD -->
                        <div class="space-y-4">
                            <h3 class="text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 mb-3">
                                <i class="fa-solid fa-chart-line mr-1"></i> Sensibilidad
                            </h3>
                            
                            <div class="space-y-4 pt-2">
                                <div>
                                    <div class="flex justify-between text-[10px] uppercase font-bold text-slate-400 mb-2">
                                        <span>Umbral Caída</span>
                                        <span class="text-rose-600 bg-rose-50 px-1.5 rounded">{{ toPct(store.rules.dropThreshold) }}</span>
                                    </div>
                                    <input 
                                        type="range" min="0.1" max="0.9" step="0.05" 
                                        v-model.number="store.rules.dropThreshold"
                                        @change="store.analyze()"
                                        class="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-rose-500 hover:accent-rose-600 transition-colors"
                                    />
                                </div>
                                <div>
                                     <div class="flex justify-between text-[10px] uppercase font-bold text-slate-400 mb-2">
                                        <span>Umbral Subida</span>
                                        <span class="text-emerald-600 bg-emerald-50 px-1.5 rounded">{{ toPct(store.rules.growthThreshold) }}</span>
                                    </div>
                                    <input 
                                        type="range" min="0.1" max="2.0" step="0.1" 
                                        v-model.number="store.rules.growthThreshold"
                                        @change="store.analyze()"
                                        class="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-500 hover:accent-emerald-600 transition-colors"
                                    />
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>

            <!-- BUTTON TOGGLE (Colgando) -->
            <div class="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full z-50">
                <button 
                    @click="isCollapsed = !isCollapsed"
                    class="flex items-center gap-2 px-6 py-1.5 rounded-b-xl shadow-md border-x border-b border-t-0 transition-all duration-300 group"
                    :class="[
                        isCollapsed 
                            ? 'bg-brand-600 border-brand-700 text-white hover:bg-brand-700 hover:pt-3' 
                            : 'bg-white border-slate-200 text-slate-300 hover:text-brand-600 hover:bg-slate-50'
                    ]"
                    :title="isCollapsed ? 'Mostrar Filtros' : 'Ocultar Filtros'"
                >
                    <i 
                        class="fa-solid transition-transform duration-300"
                        :class="isCollapsed ? 'fa-filter' : 'fa-chevron-up group-hover:-translate-y-0.5'"
                    ></i>
                    <span v-if="isCollapsed" class="text-xs font-bold tracking-wide uppercase">
                        Filtros
                    </span>
                </button>
            </div>

        </div>

        <div 
            class="flex-1 flex flex-col lg:grid lg:grid-cols-12 gap-6 min-h-0 overflow-hidden transition-all duration-500 ease-in-out"
        >
            
            <div class="lg:col-span-7 h-1/3 lg:h-full min-h-0 flex flex-col">
                <SuspectsTable 
                    @select="onCaseSelected" 
                />
            </div>

            <div class="lg:col-span-5 h-2/3 lg:h-full flex flex-col min-h-0 gap-6">
                
                <div class="flex-[3] min-h-0">
                    <div v-if="selectedCase" class="h-full flex flex-col gap-4 animate-in fade-in slide-in-from-right-4 duration-300">
                        
                         <div class="bg-white p-4 rounded-lg border border-slate-200 shadow-sm shrink-0 flex justify-between items-center">
                            <div class="min-w-0">
                                <h3 class="font-bold text-slate-800 text-base truncate">{{ selectedCase.clientName }}</h3>
                                <div class="flex gap-3 text-xs text-slate-500 mt-1">
                                    <span class="bg-slate-100 px-2 py-0.5 rounded border border-slate-200 font-mono">{{ selectedCase.matriz }}</span>
                                    <span>{{ selectedCase.route }}</span>
                                    <span class="font-semibold text-brand-600">| {{ selectedCase.family }}</span>
                                </div>
                            </div>
                             <div class="flex gap-4 text-right">
                                <div>
                                    <div class="text-[10px] text-slate-400 uppercase font-bold">Neto</div>
                                    <div :class="selectedCase.netBalance >= 0 ? 'text-green-600' : 'text-red-600'" class="text-lg font-bold">
                                        {{ selectedCase.netBalance > 0 ? '+' : '' }}{{ selectedCase.netBalance.toFixed(0) }}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="flex-1 min-h-0 relative bg-white rounded-lg border border-slate-200 p-4 shadow-sm"> 
                            <SubstitutionChart 
                                :victim-name="selectedCase.victimSku"
                                :victim-vector="selectedVictimVector"
                                :cannibal-name="selectedCase.cannibalSku"
                                :cannibal-vector="selectedCannibalVector"
                                :split-month="store.rules.splitMonth"
                            />
                        </div>
                    </div>

                    <div v-else class="h-full bg-slate-100 rounded-lg border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 p-8 text-center gap-4">
                         <div class="bg-white p-4 rounded-full shadow-sm">
                            <i class="fa-solid fa-chart-line text-2xl text-slate-300"></i>
                        </div>
                        <div>
                            <h3 class="font-medium text-slate-600">Detalle Gráfico</h3>
                            <p class="text-xs text-slate-400 mt-1">Selecciona un caso para ver la curva de sustitución.</p>
                        </div>
                    </div>
                </div>

                <div class="flex-[2] min-h-0">
                    <AnalysisSummaryCard @export="handleExport" />
                </div>

            </div>
        </div>
    
        <ExportModal v-model="showExportModal" />
    </div>
</template>
```

# src\modules\Hub\components\ModuleCard.vue

```vue
<!-- src/modules/Hub/components/ModuleCard.vue -->
<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
    title: string;
    description: string;
    icon: string; // Clase de FontAwesome (ej: "fa-solid fa-users")
    to?: string;  // Ruta interna
    href?: string; // Ruta externa (Legacy)
    active?: boolean;
    colorClass?: string; // Clase de color para el icono (ej: "text-blue-600")
    bgClass?: string;    // Clase de fondo para el icono (ej: "bg-blue-50")
}>();

// Decidir si es un link externo o interno
const isExternal = computed(() => !!props.href);
</script>

<template>
    <!-- Opción A: Link Externo (Dashboard Legacy) -->
    <a 
        v-if="isExternal" 
        :href="href" 
        target="_blank"
        class="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 hover:shadow-md hover:-translate-y-1 transition-all duration-300 cursor-pointer group relative overflow-hidden block"
    >
        <div class="absolute top-0 left-0 w-1 h-full bg-brand-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
        
        <div 
            class="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mb-6 group-hover:scale-110 transition-transform"
            :class="[bgClass || 'bg-slate-50', colorClass || 'text-slate-500']"
        >
            <i :class="icon"></i>
        </div>
        
        <h3 class="text-lg font-bold text-slate-800 mb-2 group-hover:text-brand-600 transition-colors">
            {{ title }}
        </h3>
        <p class="text-sm text-slate-500 mb-6 leading-relaxed">
            {{ description }}
        </p>
        
        <div class="flex items-center justify-end pt-4 border-t border-slate-50">
            <span class="text-xs text-slate-300 group-hover:text-brand-500 font-medium flex items-center gap-1 transition-colors">
                Abrir <i class="fa-solid fa-arrow-up-right-from-square"></i>
            </span>
        </div>
    </a>

    <!-- Opción B: Router Link (Módulos Vue) -->
    <router-link 
        v-else 
        :to="to || '#'"
        class="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 hover:shadow-md hover:-translate-y-1 transition-all duration-300 cursor-pointer group relative overflow-hidden block"
    >
        <div class="absolute top-0 left-0 w-1 h-full bg-brand-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
        
        <div 
            class="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mb-6 group-hover:scale-110 transition-transform"
            :class="[bgClass || 'bg-slate-50', colorClass || 'text-slate-500']"
        >
            <i :class="icon"></i>
        </div>
        
        <h3 class="text-lg font-bold text-slate-800 mb-2 group-hover:text-brand-600 transition-colors">
            {{ title }}
        </h3>
        <p class="text-sm text-slate-500 mb-6 leading-relaxed">
            {{ description }}
        </p>
        
        <div class="flex items-center justify-end pt-4 border-t border-slate-50">
            <i class="fa-solid fa-arrow-right text-slate-300 group-hover:text-brand-500 transition-colors"></i>
        </div>
    </router-link>
</template>
```

# src\modules\Hub\views\HubView.vue

```vue
<!-- src/modules/Hub/views/HubView.vue -->
<script setup lang="ts">
import { onMounted, computed } from 'vue';
import { useAuthStore } from '@/modules/Auth/views/stores/authStore';
import { useSetupStore } from '@/modules/Setup/stores/setupStores';
import ModuleCard from '../components/ModuleCard.vue';

const auth = useAuthStore();
const setupStore = useSetupStore();

onMounted(async () => {
   if (setupStore.modules.length === 0) {
       await setupStore.fetchModules();
   }
});

const dashboardModules = computed(() => {
    return setupStore.userMenu.filter(m => m.ModuleKey !== 'HUB');
});

const handleLogout = () => {
    auth.logout();
};

// Mapeo de estilos visuales por Key del módulo
// Si se agregan nuevos módulos en BD, usarán el estilo 'DEFAULT' si no se configuran aquí.
const MODULE_STYLES: Record<string, { color: string, bg: string, desc?: string }> = {
    'HUB': { color: 'text-brand-600', bg: 'bg-brand-50', desc: 'Panel central de bienvenida y accesos rápidos.' },
    'PIC_RPT': { color: 'text-brand-600', bg: 'bg-brand-50', desc: 'Dashboard analítico de ventas, cumplimiento de metas y análisis por zona.' },
    'LOGISTICS': { color: 'text-lime-600', bg: 'bg-lime-50', desc: 'Gestion, Edición, Alta y Publicación de Rutas e Itinerarios.' },
    'FORECAST': { color: 'text-rose-600', bg: 'bg-rose-50', desc: 'Dashboard analítico de Forecast, análisis y edición de metas y proyecciones.' },
    
    'USERS': { color: 'text-purple-500', bg: 'bg-purple-50', desc: 'Control de accesos, roles y administración de personal del sistema.' },
    'PRODUCTS': { color: 'text-orange-500', bg: 'bg-orange-50', desc: 'Alta, baja y modificación de artículos y listas de precios.' },
    'CLIENTS': { color: 'text-emerald-500', bg: 'bg-emerald-50', desc: 'Directorio comercial, segmentación y datos de contacto.' },
    'VAL_CLI': { color: 'text-pink-500', bg: 'bg-pink-50', desc: 'Validación y aprobación de nuevos clientes.' },
    
    'AUDIT': { color: 'text-slate-500', bg: 'bg-slate-100', desc: 'Historial de movimientos y seguridad del sistema.' },
    'SETUP': { color: 'text-sky-500', bg: 'bg-sky-100', desc: 'Configuración de Roles y Opciones de sistema.' },

    'DEFAULT': { color: 'text-slate-500', bg: 'bg-slate-50', desc: 'Módulo del sistema.' }
};

const getStyle = (key: string) => {
    return MODULE_STYLES[key] || MODULE_STYLES['DEFAULT']!;
};

</script>

<template>
    <div class="flex h-screen bg-slate-50 overflow-hidden font-sans">
        
        <!-- SIDEBAR FIJO (Estilo Hub) -->
        <aside class="w-64 bg-white border-r border-slate-200 hidden md:flex flex-col z-20">
            <div class="p-6 border-b border-slate-100">
                <div class="flex items-center gap-3 text-brand-800 font-bold text-xl">
                    <div class="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center text-white shadow-sm">
                        <i class="fa-solid fa-layer-group"></i>
                    </div>
                    PIC System
                </div>
            </div>
            
            <nav class="flex-1 p-4 space-y-1">
                <a href="#" class="flex items-center gap-3 px-4 py-3 bg-brand-50 text-brand-700 rounded-xl font-medium shadow-sm border border-brand-100">
                    <i class="fa-solid fa-grid-2 w-5"></i> Inicio
                </a>
                <!-- Placeholder links -->
                <a href="#" class="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-50 rounded-xl transition-colors">
                    <i class="fa-regular fa-bell w-5"></i> Notificaciones
                </a>
            </nav>

            <div class="p-4 border-t border-slate-100">
                <div class="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors">
                    <div class="w-10 h-10 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center font-bold">
                        {{ auth.user?.username.substring(0,2).toUpperCase() }}
                    </div>
                    <div class="overflow-hidden flex-1">
                        <p class="text-sm font-bold text-slate-700 truncate">{{ auth.user?.username }}</p>
                        <p class="text-xs text-slate-500 truncate">{{ auth.user?.role }}</p>
                    </div>
                    <button @click="handleLogout" class="text-slate-400 hover:text-red-500 transition-colors" title="Salir">
                        <i class="fa-solid fa-right-from-bracket"></i>
                    </button>
                </div>
            </div>
        </aside>

        <!-- CONTENIDO PRINCIPAL -->
        <main class="flex-1 p-8 lg:p-12 overflow-y-auto">
            <header class="mb-10 fade-in">
                <h1 class="text-3xl font-bold text-slate-800 mb-2">Bienvenido a PIC System</h1>
                <p class="text-slate-500">Selecciona un módulo para comenzar a trabajar.</p>
            </header>

            <!-- Skeleton Loading -->
            <div v-if="setupStore.isLoading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                <div v-for="i in 4" :key="i" class="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 h-64 animate-pulse">
                    <div class="w-14 h-14 bg-slate-100 rounded-2xl mb-6"></div>
                    <div class="h-6 bg-slate-100 rounded w-3/4 mb-4"></div>
                    <div class="h-4 bg-slate-100 rounded w-full mb-2"></div>
                    <div class="h-4 bg-slate-100 rounded w-5/6"></div>
                </div>
            </div>

            <!-- GRID DE MÓDULOS -->
            <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 fade-in" style="animation-delay: 0.1s;">
                
                <ModuleCard 
                    v-for="mod in dashboardModules"
                    :key="mod.ModuleId"
                    :title="mod.Label"
                    :description="getStyle(mod.ModuleKey).desc || 'Descripción no disponible.'"
                    :icon="mod.Icon"
                    :to="mod.Route"
                    :color-class="getStyle(mod.ModuleKey).color"
                    :bg-class="getStyle(mod.ModuleKey).bg"
                />

                <div v-if="setupStore.userMenu.length === 0" class="col-span-full text-center py-10 text-slate-400">
                    <i class="fa-solid fa-folder-open text-4xl mb-4"></i>
                    <p>No tienes módulos asignados. Contacta al administrador.</p>
                </div>

            </div>
        </main>
    </div>
</template>

<style scoped>
.fade-in {
    animation: fadeIn 0.5s ease-out forwards;
    opacity: 0;
    transform: translateY(10px);
}

@keyframes fadeIn {
    to {
        opacity: 1;
        transform: translateY(0);
    }
}
</style>
```

# src\modules\PIC\components\AiModelSelector.vue

```vue
<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { usePicChatStore } from '../stores/picChatStore';

const store = usePicChatStore();
const isOpen = ref(false);
const dropdownRef = ref<HTMLElement | null>(null);

// CAMBIO 1: Reemplazamos Emojis por clases de FontAwesome
const models = [
  { id: 'gemini', name: 'Gemini 2.5', icon: 'fa-brands fa-chrome', color: 'text-blue-500', desc: 'Rápido y preciso' },
  { id: 'openai', name: 'GPT-4o', icon: 'fa-brands fa-openai', color: 'text-green-500', desc: 'Mayor razonamiento' },
  { id: 'deepseek', name: 'DeepSeek', icon: 'fa-solid fa-robot', color: 'text-purple-500', desc: 'Open Source potente' },
  { id: 'groq', name: 'Llama 3.1 (Groq)', icon: 'fa-solid fa-bolt', color: 'text-orange-500', desc: 'Velocidad Instantánea'}
];

const currentModel = computed(() => models.find(m => m.id === store.selectedModel) || models[0]);

const selectModel = (id: string) => {
  store.setModel(id);
  isOpen.value = false;
};

const handleClickOutside = (event: MouseEvent) => {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target as Node)) {
    isOpen.value = false;
  }
};

onMounted(() => document.addEventListener('click', handleClickOutside));
onUnmounted(() => document.removeEventListener('click', handleClickOutside));
</script>

<template>
  <div class="relative" ref="dropdownRef">
    
    <!-- MENÚ FLOTANTE (Dropup) -->
    <transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="translate-y-2 opacity-0 scale-95"
      enter-to-class="translate-y-0 opacity-100 scale-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="translate-y-0 opacity-100 scale-100"
      leave-to-class="translate-y-2 opacity-0 scale-95"
    >
      <div 
        v-if="isOpen"
        class="absolute bottom-full mb-2 left-0 w-48 bg-white rounded-xl shadow-xl border border-slate-100 py-1 overflow-hidden z-50"
      >
        <div class="px-3 py-2 border-b border-slate-50 bg-slate-50/50">
          <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Motor de Inteligencia</span>
        </div>
        
        <button
          v-for="model in models"
          :key="model.id"
          @click="selectModel(model.id)"
          class="w-full text-left px-3 py-2.5 flex items-center gap-3 hover:bg-slate-50 transition-colors group"
        >
          <!-- CAMBIO 2: Renderizar icono como clase CSS -->
          <div class="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-100 group-hover:bg-white group-hover:shadow-sm transition-all">
            <i :class="[model.icon, 'text-sm text-slate-600']"></i>
          </div>
          
          <div class="flex flex-col">
            <span class="text-xs font-semibold text-slate-700" :class="{ 'text-brand-600': store.selectedModel === model.id }">
              {{ model.name }}
            </span>
            <span class="text-[10px] text-slate-400 leading-tight">{{ model.desc }}</span>
          </div>
          
          <i v-if="store.selectedModel === model.id" class="fa-solid fa-check text-brand-500 text-xs ml-auto"></i>
        </button>
      </div>
    </transition>

    <!-- BOTÓN TRIGGER -->
    <button 
      @click.stop="isOpen = !isOpen"
      class="flex items-center gap-2 pl-3 pr-2 py-2 rounded-lg hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-200 group"
      :class="{ 'bg-slate-50 border-slate-200': isOpen }"
      title="Cambiar Modelo IA"
    >
      <!-- CAMBIO 3: Renderizar icono seleccionado como clase CSS -->
      <i :class="[currentModel.icon, currentModel.color, 'text-sm']"></i>
      
      <span class="text-xs font-medium text-slate-500 group-hover:text-slate-700 transition-colors hidden sm:block">
        {{ currentModel.name }}
      </span>
      <i class="fa-solid fa-chevron-up text-[10px] text-slate-300 transition-transform duration-300" :class="{ 'rotate-180': isOpen }"></i>
    </button>

  </div>
</template>
```

# src\modules\PIC\components\charts\BaseChart.vue

```vue
<script setup lang="ts">
import { ref, onMounted, watch, onUnmounted } from 'vue';
import Chart from 'chart.js/auto';
import { usePicChatStore } from '../../stores/picChatStore'; // <--- Importar Chat Store

const props = defineProps<{
    config: any; 
    title?: string;
    enableSwitch?: boolean;
}>();

const canvasRef = ref<HTMLCanvasElement | null>(null);
let chartInstance: Chart | null = null;
const currentType = ref(props.config.type || 'bar');

// Acceso al store del chat para enviar el contexto
const chatStore = usePicChatStore();

const renderChart = () => {
    if (!canvasRef.value) return;
    if (chartInstance) {
        chartInstance.destroy();
    }
    const config = getFinalConfig();
    chartInstance = new Chart(canvasRef.value, config);
};

watch(() => props.config, (newConfig) => {
    currentType.value = newConfig.type || 'bar';
    renderChart();
}, { deep: true });

const getFinalConfig = () => {
    const finalConfig = JSON.parse(JSON.stringify(props.config));
    finalConfig.type = currentType.value;
    if (finalConfig.data.datasets.length > 0) {
        if (currentType.value === 'line') {
            finalConfig.data.datasets.forEach((ds: any) => ds.type = 'line');
        } else {
            finalConfig.data.datasets.forEach((ds: any) => {
                if (ds.label && ds.label.toString().startsWith('Venta')) {
                    delete ds.type; 
                }
            });
        }
    }
    return finalConfig;
};

watch(currentType, () => {
    renderChart();
});

onMounted(() => {
    renderChart();
});

onUnmounted(() => {
    if (chartInstance) chartInstance.destroy();
});

// ACCIÓN: Enviar datos al chat
const handleAnalyze = () => {
    if (!props.config || !props.config.data) return;
    
    // Simplificamos los datos para no saturar el prompt
    // Extraemos etiquetas y datasets
    const simplifiedData = {
        labels: props.config.data.labels,
        datasets: props.config.data.datasets.map((ds: any) => ({
            label: ds.label,
            data: ds.data
        }))
    };

    chatStore.setContext(props.title || 'Gráfico', simplifiedData, 'chart');
};
</script>

<template>
    <div class="bg-white p-4 rounded-xl shadow-sm border border-slate-200 h-full flex flex-col relative group transition-shadow hover:shadow-md">
        
        <div class="flex justify-between items-center mb-4">
            <div class="flex items-center gap-2">
                <h3 v-if="title" class="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <i class="fa-solid fa-chart-simple text-brand-500"></i>
                    {{ title }}
                </h3>
            </div>

            <div class="flex items-center gap-2">
                <button 
                    @click="handleAnalyze"
                    class="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-all border border-transparent hover:border-brand-200"
                    title="Analizar este gráfico con IA"
                >
                    <i class="fa-solid fa-wand-magic-sparkles text-xs"></i>
                </button>

                <div v-if="enableSwitch" class="flex bg-slate-100 rounded-lg p-1 gap-1">
                    <button 
                        @click="currentType = 'bar'"
                        class="p-1.5 rounded transition-all text-xs flex items-center justify-center w-6 h-6"
                        :class="currentType === 'bar' ? 'bg-white text-brand-600 shadow-sm font-bold' : 'text-slate-400 hover:text-slate-600'"
                        title="Ver como Barras"
                    >
                        <i class="fa-solid fa-chart-bar"></i>
                    </button>
                    <button 
                        @click="currentType = 'line'"
                        class="p-1.5 rounded transition-all text-xs flex items-center justify-center w-6 h-6"
                        :class="currentType === 'line' ? 'bg-white text-brand-600 shadow-sm font-bold' : 'text-slate-400 hover:text-slate-600'"
                        title="Ver como Líneas"
                    >
                        <i class="fa-solid fa-chart-line"></i>
                    </button>
                </div>
            </div>
        </div>

        <div class="flex-1 relative min-h-[250px]">
            <canvas ref="canvasRef"></canvas>
        </div>
    </div>
</template>
```

# src\modules\PIC\components\ChatMessage.vue

```vue
<script setup lang="ts">
import { computed } from 'vue';
import type { ChatMessage } from '../stores/picChatStore';
import { usePicChatStore } from '../stores/picChatStore';

const props = defineProps<{
    message: ChatMessage;
}>();

const store = usePicChatStore();
const isUser = computed(() => props.message.role === 'user');
const isSystem = computed(() => props.message.role === 'system');

const bubbleClass = computed(() => {
    if (isSystem.value) return 'bg-red-50 text-red-600 border border-red-100 text-center w-full';
    if (isUser.value) return 'bg-brand-600 text-white self-end rounded-br-none';
    return 'bg-white border border-slate-200 text-slate-700 self-start rounded-bl-none shadow-sm';
});

// Función para activar la visualización
const handleVisualize = () => {
    store.visualizeData(props.message.id);
};
</script>

<template>
    <div class="flex flex-col mb-4 max-w-[85%] animate-fade-in" :class="isUser ? 'items-end self-end' : 'items-start self-start'">
        
        <span v-if="!isSystem" class="text-[10px] text-slate-400 mb-1 px-1">
            {{ isUser ? 'Tú' : 'PIC Assistant' }}
        </span>

        <div class="px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap shadow-sm" :class="bubbleClass">
            {{ message.text }}
        </div>

        <div v-if="message.chartConfig" class="mt-2 flex flex-col gap-2 self-start w-full">
            
            <button 
                @click="handleVisualize"
                class="group flex items-center gap-3 bg-white border border-brand-200 hover:border-brand-400 hover:shadow-md p-3 rounded-xl transition-all w-full text-left"
            >
                <div class="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center text-brand-600 group-hover:scale-110 transition-transform">
                    <i class="fa-solid fa-chart-column text-lg"></i>
                </div>
                <div>
                    <p class="text-xs font-bold text-slate-700 group-hover:text-brand-700">Visualizar Datos</p>
                    <p class="text-[10px] text-slate-400">Clic para generar gráfico en el tablero</p>
                </div>
                <i class="fa-solid fa-chevron-right text-slate-300 ml-auto group-hover:text-brand-500"></i>
            </button>

            </div>
        
        <span class="text-[10px] text-slate-300 mt-1 px-1">
            {{ message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }}
        </span>
    </div>
</template>

<style scoped>
.animate-fade-in {
    animation: fadeIn 0.3s ease-out forwards;
}
@keyframes fadeIn {
    from { opacity: 0; transform: translateY(5px); }
    to { opacity: 1; transform: translateY(0); }
}
</style>
```

# src\modules\PIC\components\ExecutiveSummaryCard.vue

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { usePicFilterStore } from '../stores/picFilterStore';
import { picApi } from '../services/picApi';

const store = usePicFilterStore();
const summaryHtml = ref('');
const isLoading = ref(false);
const isExpanded = ref(true);
const hasGenerated = ref(false);

const generateSummary = async () => {
    if (store.reportData.length === 0) return;
    
    isLoading.value = true;
    isExpanded.value = true;
    try {
        const result = await picApi.getExecutiveSummary(store.reportData);
        summaryHtml.value = result;
        hasGenerated.value = true;
    } catch (e) {
        summaryHtml.value = '<p class="text-red-500">No se pudo generar el resumen ejecutivo en este momento.</p>';
    } finally {
        isLoading.value = false;
    }
};
</script>

<template>
    <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-8 transition-all duration-300">
        
        <div class="p-4 bg-gradient-to-r from-slate-800 to-slate-900 text-white flex justify-between items-center">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center backdrop-blur-sm">
                    <i class="fa-solid fa-user-tie text-xl text-brand-300"></i>
                </div>
                <div>
                    <h3 class="font-bold text-sm md:text-base">Resumen Ejecutivo IA</h3>
                    <p class="text-[10px] text-slate-300 uppercase tracking-wider font-medium">Análisis Financiero Automático</p>
                </div>
            </div>

            <div class="flex items-center gap-3">
                <button 
                    v-if="hasGenerated"
                    @click="isExpanded = !isExpanded"
                    class="text-slate-300 hover:text-white transition-colors"
                >
                    <i class="fa-solid" :class="isExpanded ? 'fa-chevron-up' : 'fa-chevron-down'"></i>
                </button>
            </div>
        </div>

        <div v-if="isExpanded" class="bg-white transition-all duration-300">
            
            <div v-if="!hasGenerated && !isLoading" class="p-8 text-center">
                <p class="text-slate-500 text-sm mb-4">
                    Genera un análisis narrativo profesional basado en los datos actuales del reporte.
                </p>
                <button 
                    @click="generateSummary"
                    class="bg-brand-600 hover:bg-brand-700 text-white px-6 py-2.5 rounded-lg text-sm font-bold shadow-md shadow-brand-500/20 transition-all hover:-translate-y-0.5 flex items-center gap-2 mx-auto"
                >
                    <i class="fa-solid fa-wand-magic-sparkles"></i> Generar Análisis
                </button>
            </div>

            <div v-if="isLoading" class="p-12 flex flex-col items-center justify-center text-slate-400">
                <i class="fa-solid fa-circle-notch fa-spin text-3xl text-brand-500 mb-3"></i>
                <span class="text-xs font-medium animate-pulse">El CFO Virtual está analizando los datos...</span>
            </div>

            <div v-if="hasGenerated && !isLoading" class="p-6 md:p-8 animate-fade-in">
                <div class="prose prose-sm prose-slate max-w-none">
                    <div v-html="summaryHtml" class="ai-content text-slate-700 leading-relaxed"></div>
                </div>
                
                <div class="mt-6 pt-4 border-t border-slate-100 flex justify-between items-center">
                    <span class="text-[10px] text-slate-400">Generado con IA • Revisar antes de compartir</span>
                    <button @click="generateSummary" class="text-xs text-brand-600 hover:text-brand-800 font-medium flex items-center gap-1">
                        <i class="fa-solid fa-rotate-right"></i> Regenerar
                    </button>
                </div>
            </div>

        </div>
    </div>
</template>

<style>
/* Estilos para el contenido HTML inyectado por la IA */
.ai-content p { margin-bottom: 1rem; }
.ai-content strong { color: #0f172a; font-weight: 700; }
.ai-content ul { list-style-type: disc; padding-left: 1.5rem; margin-bottom: 1rem; }
.ai-content li { margin-bottom: 0.5rem; }
</style>
```

# src\modules\PIC\components\FilterDropdown.vue

```vue
<script setup lang="ts">
import { ref, computed } from 'vue';

const props = defineProps<{
    label?: string; // Hacemos el label opcional para casos inline
    options: string[];
    modelValue: string[]; 
    disabled?: boolean;
    placeholder?: string; // Nuevo: Texto por defecto personalizado
}>();

const emit = defineEmits(['update:modelValue', 'change']);

const isOpen = ref(false);
const searchTerm = ref('');

const filteredOptions = computed(() => {
    if (!searchTerm.value) return props.options;
    return props.options.filter(opt => 
        opt.toLowerCase().includes(searchTerm.value.toLowerCase())
    );
});

const buttonText = computed(() => {
    if (props.modelValue.length === 0) return props.placeholder || 'Todos';
    if (props.modelValue.length === 1) return props.modelValue[0];
    return `${props.modelValue.length} seleccionados`;
});

const toggleSelection = (option: string) => {
    const newValue = [...props.modelValue];
    if (newValue.includes(option)) {
        newValue.splice(newValue.indexOf(option), 1);
    } else {
        newValue.push(option);
    }
    emit('update:modelValue', newValue);
    emit('change');
};

const selectAll = () => {
    if (props.modelValue.length === props.options.length) {
        emit('update:modelValue', []);
    } else {
        emit('update:modelValue', [...props.options]);
    }
    emit('change');
};
</script>

<template>
    <div class="relative w-full group">
        <label v-if="label" class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">
            {{ label }}
        </label>
        
        <button 
            @click="!disabled && (isOpen = !isOpen)"
            class="w-full text-left bg-white border rounded-lg px-3 h-[38px] flex justify-between items-center text-xs transition-all shadow-sm"
            :class="[
                disabled 
                    ? 'opacity-50 cursor-not-allowed bg-slate-50 border-slate-200' 
                    : 'hover:border-brand-400 hover:shadow-md focus:ring-2 focus:ring-brand-100',
                isOpen ? 'border-brand-500 ring-2 ring-brand-100' : 'border-slate-200'
            ]"
            :disabled="disabled"
        >
            <span class="truncate font-medium" :class="modelValue.length > 0 ? 'text-brand-700' : 'text-slate-600'">
                {{ buttonText }}
            </span>
            <i class="fa-solid fa-chevron-down text-[10px] text-slate-400 transition-transform duration-200" :class="{'rotate-180': isOpen}"></i>
        </button>

        <div 
            v-if="isOpen" 
            class="absolute top-full left-0 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-[100] overflow-hidden flex flex-col max-h-60 animate-in fade-in zoom-in-95 duration-100"
        >
            <div class="p-2 border-b border-slate-100 bg-slate-50">
                <div class="relative">
                    <i class="fa-solid fa-search absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]"></i>
                    <input 
                        v-model="searchTerm" 
                        type="text" 
                        placeholder="Buscar..." 
                        class="w-full text-xs pl-6 pr-2 py-1.5 rounded border border-slate-200 focus:border-brand-500 outline-none transition-colors"
                        ref="searchInput"
                    >
                </div>
            </div>

            <div class="overflow-y-auto flex-1 p-1 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                <div 
                    v-for="opt in filteredOptions" 
                    :key="opt"
                    class="flex items-center px-2 py-1.5 hover:bg-brand-50 rounded cursor-pointer group/item transition-colors"
                    @click="toggleSelection(opt)"
                >
                    <div 
                        class="w-3.5 h-3.5 border rounded mr-2 flex items-center justify-center transition-all"
                        :class="modelValue.includes(opt) 
                            ? 'bg-brand-500 border-brand-500 shadow-sm' 
                            : 'border-slate-300 bg-white group-hover/item:border-brand-400'"
                    >
                        <i v-if="modelValue.includes(opt)" class="fa-solid fa-check text-white text-[8px]"></i>
                    </div>
                    <span class="text-xs text-slate-600 truncate group-hover/item:text-brand-700">{{ opt }}</span>
                </div>
                <div v-if="filteredOptions.length === 0" class="p-4 text-center text-xs text-slate-400 italic">
                    Sin resultados
                </div>
            </div>

            <div class="p-2 border-t border-slate-100 bg-slate-50 text-center">
                <button @click="selectAll" class="text-[10px] font-bold text-brand-600 hover:text-brand-800 uppercase tracking-wide transition-colors">
                    {{ modelValue.length === options.length ? 'Ninguno' : 'Todos' }}
                </button>
            </div>
        </div>

        <div v-if="isOpen" @click="isOpen = false" class="fixed inset-0 z-[90] cursor-default"></div>
    </div>
</template>
```

# src\modules\PIC\components\modals\PicClientModal.vue

```vue
<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { usePicFilterStore } from '../../stores/picFilterStore';
import { picApi } from '../../services/picApi';
import ModalDialog from '@/modules/Shared/components/ModalDialog.vue'; 

const props = defineProps<{
    modelValue: boolean; 
}>();

const emit = defineEmits(['update:modelValue']);

const store = usePicFilterStore();

// Estado Local
const searchTerm = ref('');
const currentPage = ref(1);
const totalPages = ref(1);
const isLoading = ref(false);
const clientsList = ref<any[]>([]);
let debounceTimeout: any = null;

const close = () => {
    emit('update:modelValue', false);
    // No limpiamos searchTerm para que el usuario no pierda su búsqueda si cierra y abre rápido
};

const fetchClients = async () => {
    isLoading.value = true;
    try {
        const activeFilters = store.getFiltersForClientSearch();
        const response = await picApi.searchClients(
            searchTerm.value, 
            currentPage.value, 
            activeFilters
        );
        clientsList.value = response.clients || [];
        totalPages.value = response.totalPages || 1;
        
        if (currentPage.value > totalPages.value && totalPages.value > 0) {
            currentPage.value = 1;
        }
    } catch (error) {
        console.error("Error buscando clientes:", error);
        clientsList.value = [];
    } finally {
        isLoading.value = false;
    }
};

watch(searchTerm, () => {
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => {
        currentPage.value = 1; 
        fetchClients();
    }, 350); 
});

watch(() => props.modelValue, (isOpen) => {
    if (isOpen && clientsList.value.length === 0) {
        currentPage.value = 1;
        fetchClients();
    }
});

const changePage = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages.value) {
        currentPage.value = newPage;
        fetchClients();
    }
};

const toggleSelectAllPage = () => {
    const allSelected = clientsList.value.every(c => store.selectedClients.has(c.IDCLIENTE));
    clientsList.value.forEach(c => {
        if (allSelected) store.selectedClients.delete(c.IDCLIENTE);
        else store.selectedClients.set(c.IDCLIENTE, c.NOM_CLIENTE);
    });
};

const isPageFullySelected = computed(() => {
    return clientsList.value.length > 0 && clientsList.value.every(c => store.selectedClients.has(c.IDCLIENTE));
});
</script>

<template>
    <ModalDialog 
        :model-value="modelValue" 
        title="Búsqueda y Selección de Clientes" 
        size="4xl"
        @close="close"
    >
        <div class="flex flex-col h-[500px]"> 
            
            <div class="mb-4 relative shrink-0">
                <i class="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                <input 
                    v-model="searchTerm"
                    type="text" 
                    placeholder="Buscar por ID, Nombre, Cadena..." 
                    class="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-xs transition-all"
                    autofocus
                >
            </div>

            <div class="flex-1 overflow-y-auto border border-slate-200 rounded-lg relative">
                
                <div v-if="isLoading" class="absolute inset-0 bg-white/80 z-20 flex items-center justify-center backdrop-blur-sm">
                    <div class="flex flex-col items-center gap-2">
                        <i class="fa-solid fa-circle-notch fa-spin text-brand-600 text-2xl"></i>
                        <span class="text-xs text-slate-500 font-medium">Cargando clientes...</span>
                    </div>
                </div>

                <table class="w-full text-xs text-left border-collapse table-fixed">
                    <thead class="bg-brand-50/50 text-brand-600 uppercase font-bold sticky top-0 z-10 backdrop-blur-sm border-b border-brand-100">
                        <tr>
                            <th class="px-2 py-3 w-10 text-center">
                                <input 
                                    type="checkbox" 
                                    class="rounded border-brand-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                                    :checked="isPageFullySelected"
                                    @change="toggleSelectAllPage"
                                >
                            </th>
                            <th class="px-2 py-3 w-20">ID</th>
                            <th class="px-2 py-3 w-24">Matriz</th>
                            <th class="px-2 py-3 w-28">Cadena</th>
                            <th class="px-2 py-3 w-64">Nombre</th> <th class="px-2 py-3 w-24">Formato</th>
                            <th class="px-2 py-3 w-16">Tipo</th>
                            <th class="px-2 py-3 w-20">Estrategia</th>
                        </tr>
                    </thead>
                    
                    <tbody class="divide-y divide-slate-100">
                        <tr 
                            v-for="client in clientsList" 
                            :key="client.IDCLIENTE"
                            class="hover:bg-slate-50 transition-colors cursor-pointer group"
                            :class="{'bg-brand-50/40': store.selectedClients.has(client.IDCLIENTE)}"
                            @click="store.toggleClientSelection(client.IDCLIENTE, client.NOM_CLIENTE)"
                        >
                            <td class="px-2 py-2 text-center" @click.stop>
                                <input 
                                    type="checkbox" 
                                    class="rounded border-slate-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                                    :checked="store.selectedClients.has(client.IDCLIENTE)"
                                    @change="store.toggleClientSelection(client.IDCLIENTE, client.NOM_CLIENTE)"
                                >
                            </td>
                            
                            <td class="px-2 py-2 font-mono text-slate-500 truncate" :title="client.IDCLIENTE">
                                {{ client.IDCLIENTE }}
                            </td>
                            <td class="px-2 py-2 text-slate-600 truncate" :title="client.Matriz">
                                {{ client.Matriz || '-' }}
                            </td>
                            <td class="px-2 py-2 text-slate-600 truncate" :title="client.Cadena">
                                {{ client.Cadena || '-' }}
                            </td>
                            <td class="px-2 py-2 font-semibold text-slate-700 truncate" :title="client.NOM_CLIENTE">
                                {{ client.NOM_CLIENTE }}
                            </td>
                            <td class="px-2 py-2 text-slate-600 truncate" :title="client.formatocte">
                                {{ client.formatocte || '-' }}
                            </td>
                            <td class="px-2 py-2 text-slate-600 truncate" :title="client.TipoCLI">
                                {{ client.TipoCLI || '-' }}
                            </td>
                            <td class="px-2 py-2">
                                <span class="truncate block text-slate-500" :title="client.EST2017">
                                    {{ client.EST2017 || '-' }}
                                </span>
                            </td>
                        </tr>
                        
                        <tr v-if="clientsList.length === 0 && !isLoading">
                            <td colspan="8" class="px-4 py-12 text-center text-slate-400 flex flex-col items-center justify-center w-full">
                                <i class="fa-regular fa-folder-open text-2xl mb-2 opacity-50"></i>
                                <span>No se encontraron resultados.</span>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div class="mt-4 flex justify-between items-center pt-2 border-t border-slate-100 shrink-0">
                <div class="text-xs text-slate-500 flex items-center gap-2">
                    <span class="font-bold text-brand-600 text-sm">{{ store.selectedClients.size }}</span> seleccionados
                    <button 
                        v-if="store.selectedClients.size > 0" 
                        @click="store.clearSelectedClients"
                        class="text-red-500 hover:text-red-700 hover:underline ml-2 font-medium"
                    >
                        Borrar todo
                    </button>
                </div>

                <div class="flex items-center gap-2">
                    <button 
                        @click="changePage(currentPage - 1)" 
                        :disabled="currentPage === 1"
                        class="px-3 py-1 rounded border border-slate-200 text-slate-500 hover:bg-slate-50 text-xs disabled:opacity-50 transition-colors"
                    >
                        <i class="fa-solid fa-chevron-left mr-1"></i> Anterior
                    </button>
                    <span class="text-xs text-slate-600 font-mono bg-slate-100 px-2 py-1 rounded">
                        {{ currentPage }} / {{ totalPages }}
                    </span>
                    <button 
                        @click="changePage(currentPage + 1)" 
                        :disabled="currentPage === totalPages"
                        class="px-3 py-1 rounded border border-slate-200 text-slate-500 hover:bg-slate-50 text-xs disabled:opacity-50 transition-colors"
                    >
                        Siguiente <i class="fa-solid fa-chevron-right ml-1"></i>
                    </button>
                </div>
            </div>
        </div>

        <template #footer>
            <button 
                @click="close"
                class="bg-brand-600 hover:bg-brand-700 text-white px-6 py-2 rounded-lg text-xs font-bold shadow-sm transition-colors uppercase tracking-wide"
            >
                Aplicar Selección
            </button>
        </template>
    </ModalDialog>
</template>
```

# src\modules\PIC\components\PicChat.vue

```vue
<script setup lang="ts">
import { ref, onMounted, nextTick, watch, computed } from 'vue';
import { usePicChatStore } from '../stores/picChatStore';
import { usePicFilterStore } from '../stores/picFilterStore';
import ChatMessage from './ChatMessage.vue';
import AiModelSelector from './AiModelSelector.vue';

const store = usePicChatStore();
const filterStore = usePicFilterStore();

const userInput = ref('');
const messagesContainer = ref<HTMLElement | null>(null);
const isCollapsed = ref(false);

const isChatEnabled = computed(() => {
    return filterStore.reportData.length > 0 && !store.isLoading;
});

const inputPlaceholder = computed(() => {
    if (store.isLoading) return 'Pensando...';
    if (filterStore.reportData.length === 0) return 'Genera el reporte para activar el chat 🔒';
    // Cambiamos el placeholder si hay contexto
    if (store.activeContext) return `Pregunta sobre "${store.activeContext.title}"...`;
    return 'Pregunta sobre los datos (ej: Ventas de Corona)...';
});

onMounted(() => {
    store.initChat();
    scrollToBottom();
});

watch(() => store.messages.length, () => {
    nextTick(() => scrollToBottom());
});

const scrollToBottom = () => {
    if (messagesContainer.value) {
        messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
    }
};

const handleSend = async () => {
    if (!userInput.value.trim() || !isChatEnabled.value) return;
    const text = userInput.value;
    userInput.value = ''; 
    await store.sendMessage(text);
};
</script>

<template>
    <div 
        class="relative z-30 flex-shrink-0 transition-all duration-300 ease-in-out h-full border-l border-slate-200 shadow-xl bg-slate-50"
        :class="isCollapsed ? 'w-0' : 'w-full md:w-96'"
    >
        <button
            @click="isCollapsed = !isCollapsed"
            class="absolute top-1/2 -translate-y-1/2 flex items-center justify-center transition-all duration-300 z-50 focus:outline-none shadow-lg border-y border-l"
            :class="[
                isCollapsed 
                    ? '-left-12 w-12 h-16 bg-brand-600 border-brand-700 text-white rounded-l-2xl hover:bg-brand-700 shadow-brand-500/30' 
                    : '-left-5 w-5 h-12 bg-white border-slate-200 text-slate-300 rounded-l-lg hover:text-brand-600 hover:bg-slate-50'
            ]"
            :title="isCollapsed ? 'Abrir Asistente IA' : 'Ocultar Chat'"
        >
            <i 
                class="fa-solid transition-all duration-300" 
                :class="[
                    isCollapsed ? 'fa-wand-magic-sparkles text-xl animate-pulse-slow' : 'fa-chevron-right text-xs',
                    isCollapsed ? 'scale-100' : 'group-hover:scale-110'
                ]"
            ></i>
        </button>

        <div class="h-full flex flex-col overflow-hidden w-96 bg-slate-50">
            
            <div class="p-4 bg-white border-b border-slate-200 flex justify-between items-center shadow-sm flex-shrink-0">
                <h3 class="font-bold text-slate-700 flex items-center gap-2">
                    <div class="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center text-brand-600">
                        <i class="fa-solid fa-wand-magic-sparkles"></i>
                    </div>
                    Asistente IA
                </h3>

                <!-- GRUPO DE CONTROLES: SELECTOR + BASURA -->
                <div class="flex items-center gap-2">
                   

                    <!-- 2. BOTÓN LIMPIAR (Existente) -->
                    <button @click="store.clearChat" class="text-xs text-slate-400 hover:text-red-500 transition-colors p-2 hover:bg-slate-100 rounded-lg" title="Limpiar historial">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </div>

            <div ref="messagesContainer" class="flex-1 overflow-y-auto p-4 flex flex-col space-y-3 bg-slate-50/50">
                <ChatMessage 
                    v-for="msg in store.messages" 
                    :key="msg.id" 
                    :message="msg" 
                />
                
                <div v-if="store.isLoading" class="flex items-center gap-2 text-slate-400 text-xs p-3 bg-white rounded-xl border border-slate-100 shadow-sm self-start w-fit animate-pulse">
                    <i class="fa-solid fa-circle-notch fa-spin text-brand-500"></i>
                    <span class="font-medium">Analizando...</span>
                </div>
            </div>

            <div class="p-4 bg-white border-t border-slate-200 flex-shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                
                <div v-if="store.activeContext" class="mb-2 flex items-center justify-between px-3 py-2 bg-indigo-50 border border-indigo-100 rounded-lg animate-in slide-in-from-bottom-2 fade-in duration-300">
                    <div class="flex items-center gap-2 overflow-hidden">
                        <i class="fa-solid fa-eye text-indigo-500 text-xs"></i>
                        <div class="flex flex-col">
                            <span class="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Analizando</span>
                            <span class="text-xs font-medium text-indigo-700 truncate max-w-[200px]" :title="store.activeContext.title">
                                {{ store.activeContext.title }}
                            </span>
                        </div>
                    </div>
                    <button @click="store.clearContext" class="text-indigo-400 hover:text-indigo-600 p-1 rounded-md hover:bg-indigo-100 transition-colors">
                        <i class="fa-solid fa-xmark text-xs"></i>
                    </button>
                </div>

                <div v-if="filterStore.reportData.length === 0" class="mb-2 px-3 py-2 bg-yellow-50 border border-yellow-100 rounded-lg text-[10px] text-yellow-700 flex items-center gap-2">
                    <i class="fa-solid fa-circle-info"></i>
                    <span>Primero genera el reporte con los filtros.</span>
                </div>

                  <!-- BARRA UNIFICADA: SELECTOR + INPUT + BOTÓN -->
                <div class="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl p-1 focus-within:ring-2 focus-within:ring-brand-500/20 focus-within:border-brand-500 transition-all">
                    
                    <!-- 1. El Selector de Modelos (Izquierda) -->
                    <AiModelSelector />

                    <div class="h-6 w-px bg-slate-200 mx-1"></div>

                    <!-- 2. El Input de Texto (Centro) -->
                    <input 
                        v-model="userInput" 
                        @keydown.enter.prevent="handleSend"
                        type="text" 
                        :placeholder="inputPlaceholder"
                        class="flex-1 bg-transparent border-none outline-none text-sm placeholder:text-slate-400 py-2.5 min-w-0"
                        :disabled="!isChatEnabled"
                    >

                    <!-- 3. El Botón Enviar (Derecha) -->
                    <button 
                        @click="handleSend"
                        :disabled="!userInput.trim() || !isChatEnabled"
                        class="p-2 mr-1 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 disabled:bg-slate-300 disabled:cursor-not-allowed transition-all shadow-sm flex-shrink-0"
                    >
                        <i class="fa-solid fa-paper-plane text-xs"></i>
                    </button>
                </div>
            </div>

        </div>
    </div>
</template>

<style scoped>
.animate-pulse-slow {
    animation: pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
@keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: .7; }
}
</style>
```

# src\modules\PIC\components\PicFilters.vue

```vue
<script setup lang="ts">
import { onMounted, ref, watch, computed } from 'vue';
import { usePicFilterStore } from '../stores/picFilterStore';
import FilterDropdown from './FilterDropdown.vue';
// 1. IMPORTAMOS EL MODAL
import PicClientModal from './modals/PicClientModal.vue'; 

const store = usePicFilterStore();
const isCollapsed = ref(true); 
const overflowVisible = ref(true); 

// 2. ESTADO DEL MODAL
const showClientModal = ref(false); 

// 3. TEXTO DINÁMICO DEL BOTÓN DE CLIENTES
const clientButtonText = computed(() => {
    const count = store.selectedClients.size;
    if (count === 0) return 'Buscar Cliente...';
    if (count === 1) {
        // Obtenemos el nombre del primer valor del Map
        return store.selectedClients.values().next().value; 
    }
    return `${count} Clientes Seleccionados`;
});

onMounted(() => {
    store.initFilters();
});

const handleUpdate = async () => {
    await store.generateReport();
};

const handleReset = () => {
    store.resetFilters();
    // Opcional: Si quieres que se recargue el reporte vacío o con defaults:
    // await store.generateReport(); 
};

watch(isCollapsed, (newVal) => {
    if (newVal) {
        overflowVisible.value = false; 
    } else {
        setTimeout(() => {
            overflowVisible.value = true; 
        }, 350); 
    }
});


</script>

<template>
    <div class="relative z-40 bg-white border-b border-slate-200 shadow-sm transition-all duration-300 ease-in-out">
        
        <PicClientModal v-model="showClientModal" />

        <div 
            class="transition-all duration-300 ease-in-out"
            :class="[
                isCollapsed ? 'max-h-0 opacity-0 overflow-hidden' : 'max-h-[800px] opacity-100',
                overflowVisible && !isCollapsed ? 'overflow-visible' : 'overflow-hidden'
            ]"
        >
            <div class="p-6">
                <div class="flex justify-between items-center mb-6 pb-4 border-b border-slate-100">
                    <h2 class="text-sm font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2">
                        <div class="p-1.5 bg-brand-50 rounded text-brand-600">
                            <i class="fa-solid fa-sliders"></i>
                        </div>
                        Parámetros de Reporte
                    </h2>
                    <div class="flex gap-3">
                        <button 
                            @click="handleReset"
                            class="text-xs font-medium text-slate-500 hover:text-brand-600 flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-200"
                        >
                            <i class="fa-solid fa-rotate-left"></i> Limpiar Filtros
                        </button>
                        
                        <button 
                            @click="handleUpdate" 
                            :disabled="store.isGenerating"
                            class="bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold px-5 py-2 rounded-lg shadow-md shadow-brand-500/20 transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed hover:-translate-y-0.5"
                        >
                            <i v-if="store.isGenerating" class="fa-solid fa-circle-notch fa-spin"></i>
                            <span v-else class="flex items-center gap-2">
                                <i class="fa-solid fa-bolt"></i> GENERAR AHORA
                            </span>
                        </button>
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-6">
                    
                    <div class="space-y-4">
                        <h3 class="text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 mb-3">
                            <i class="fa-solid fa-briefcase mr-1"></i> Comercial
                        </h3>
                        <FilterDropdown label="Canal" :options="store.options.canales" v-model="store.selected.canal" />
                        <FilterDropdown label="Gerencia" :options="store.options.gerencias" v-model="store.selected.Gerencia" @change="store.handleGerenciaChange" />
                        <FilterDropdown label="Jefatura" :options="store.depOptions.jefaturas" v-model="store.selected.Jefatura" :disabled="store.depOptions.jefaturas.length === 0" @change="store.handleJefaturaChange" />
                        <FilterDropdown label="Ruta" :options="store.depOptions.rutas" v-model="store.selected.Ruta" :disabled="store.depOptions.rutas.length === 0" />
                    </div>

                    <div class="space-y-4">
                        <h3 class="text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 mb-3">
                            <i class="fa-solid fa-users mr-1"></i> Clientes
                        </h3>
                        
                        <div>
                            <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">
                                Selección Individual
                            </label>
                            <button 
                                @click="showClientModal = true"
                                class="w-full text-left bg-white border border-slate-200 rounded-lg px-3 h-[38px] flex justify-between items-center text-xs hover:border-brand-400 hover:shadow-md group transition-all"
                                :class="{'border-brand-500 ring-1 ring-brand-100': store.selectedClients.size > 0}"
                            >
                                <span 
                                    class="font-medium truncate mr-2" 
                                    :class="store.selectedClients.size > 0 ? 'text-brand-700' : 'text-slate-600 group-hover:text-brand-700'"
                                >
                                    <i class="fa-solid fa-magnifying-glass mr-1.5 opacity-50"></i>
                                    {{ clientButtonText }}
                                </span>
                                <i 
                                    class="fa-solid text-[10px]"
                                    :class="store.selectedClients.size > 0 ? 'fa-check text-brand-600' : 'fa-arrow-up-right-from-square text-slate-300 group-hover:text-brand-500'"
                                ></i>
                            </button>
                        </div>
                        <FilterDropdown label="Formato Cliente" :options="store.options.formatosCliente" v-model="store.selected.FormatoCliente" />
                    </div>

                    <div class="space-y-4">
                        <h3 class="text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 mb-3">
                            <i class="fa-solid fa-box-open mr-1"></i> Producto
                        </h3>
                        <FilterDropdown label="Marca" :options="store.options.marcas" v-model="store.selected.Marca" @change="store.handleMarcaChange" />
                        <FilterDropdown label="Grupo" :options="store.depOptions.grupos" v-model="store.selected.grupo" :disabled="store.depOptions.grupos.length === 0" @change="store.handleGrupoChange" />
                        <FilterDropdown label="Categoría" :options="store.depOptions.categorias" v-model="store.selected.Categorias" :disabled="store.depOptions.categorias.length === 0" />
                        <FilterDropdown label="SKU" :options="store.depOptions.skus" v-model="store.selected.SKU" :disabled="store.depOptions.skus.length === 0" placeholder="Buscar SKU..." />
                    </div>

                    <div class="space-y-6">
                        <div class="space-y-4">
                            <h3 class="text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 mb-3">
                                <i class="fa-solid fa-gears mr-1"></i> Configuración
                            </h3>
                            <FilterDropdown label="Transacción" :options="store.options.transacciones" v-model="store.selected.Transaccion" />
                        </div>

                        <div class="space-y-4">
                            <h3 class="text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 mb-3">
                                <i class="fa-regular fa-calendar mr-1"></i> Periodo
                            </h3>
                            <FilterDropdown label="Año(s)" :options="store.options.anios" v-model="store.selected.Anio" />
                            
                            <div class="grid grid-cols-2 gap-3">
                                <div>
                                    <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Mes Ini</label>
                                    <div class="relative">
                                        <select v-model="store.selected.MesInicial" class="w-full text-xs font-medium border border-slate-200 rounded-lg pl-2 pr-6 h-[38px] bg-white appearance-none focus:border-brand-500 focus:ring-1 focus:ring-brand-100 outline-none cursor-pointer hover:border-slate-300">
                                            <option v-for="i in 12" :key="i" :value="String(i)">{{ i }}</option>
                                        </select>
                                        <i class="fa-solid fa-chevron-down absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 pointer-events-none"></i>
                                    </div>
                                </div>
                                <div>
                                    <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Mes Fin</label>
                                    <div class="relative">
                                        <select v-model="store.selected.MesFinal" class="w-full text-xs font-medium border border-slate-200 rounded-lg pl-2 pr-6 h-[38px] bg-white appearance-none focus:border-brand-500 focus:ring-1 focus:ring-brand-100 outline-none cursor-pointer hover:border-slate-300">
                                            <option v-for="i in 12" :key="i" :value="String(i)">{{ i }}</option>
                                        </select>
                                        <i class="fa-solid fa-chevron-down absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 pointer-events-none"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>

        <div class="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full z-50">
            <button 
                @click="isCollapsed = !isCollapsed"
                class="flex items-center gap-2 px-6 py-1.5 rounded-b-xl shadow-md border-x border-b border-t-0 transition-all duration-300 group"
                :class="[
                    isCollapsed 
                        ? 'bg-brand-600 border-brand-700 text-white hover:bg-brand-700 hover:pt-3' 
                        : 'bg-white border-slate-200 text-slate-300 hover:text-brand-600 hover:bg-slate-50'
                ]"
                :title="isCollapsed ? 'Mostrar Filtros' : 'Ocultar Filtros'"
            >
                <i 
                    class="fa-solid transition-transform duration-300"
                    :class="isCollapsed ? 'fa-filter' : 'fa-chevron-up group-hover:-translate-y-0.5'"
                ></i>
                <span v-if="isCollapsed" class="text-xs font-bold tracking-wide uppercase">
                    Filtros
                </span>
            </button>
        </div>

    </div>
</template>
```

# src\modules\PIC\components\PicGrid.vue

```vue
<script setup lang="ts">
import { computed, ref } from 'vue'; // <--- AGREGAR ref
import { usePicFilterStore } from '../stores/picFilterStore';
import { processChartData, processAnnualData, getChartConfig, CHART_COLORS, CHART_COLORS_GREEN, MONTH_NAMES } from '../utils/picUtils';
import BaseChart from './charts/BaseChart.vue';
import PicDataTable from './tables/PicDataTable.vue';
import PicProjectionTable from './tables/PicProjectionTable.vue';
import KpiCardWidget from './widgets/KpiCardWidget.vue';       
import SimpleTableWidget from './widgets/SimpleTableWidget.vue'; 

const store = usePicFilterStore();
const selectedYears = computed(() => store.selected.Anio.sort());

// <--- NUEVO: Estado para colapsar toda la sección de desglose
const showDesglose = ref(true);

// --- 1. CONFIGURACIÓN PESOS ($) ---
const dataPesos = computed(() => processChartData(store.reportData, selectedYears.value, 'pesos'));
const configPesosMensual = computed(() => {
    const datasets = selectedYears.value.map((year, i) => ({
        label: year,
        data: dataPesos.value.map(d => d[year]),
        backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
        borderRadius: 4
    }));
    return getChartConfig(MONTH_NAMES, datasets, 'bar');
});

const dataPesosAnual = computed(() => processAnnualData(store.reportData, selectedYears.value, 'pesos'));
const configPesosAnual = computed(() => {
    return getChartConfig(selectedYears.value, [{
        label: 'Total Anual ($)',
        data: dataPesosAnual.value,
        backgroundColor: selectedYears.value.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]),
        borderRadius: 4
    }], 'bar');
});


// --- 2. CONFIGURACIÓN KILOS (KG) ---
const dataKilos = computed(() => processChartData(store.reportData, selectedYears.value, 'kilos'));
const configKilosMensual = computed(() => {
    const datasets = selectedYears.value.map((year, i) => ({
        label: `KG ${year}`,
        data: dataKilos.value.map(d => d[year]),
        backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
        borderRadius: 4,
        order: 2
    }));
    const lastYear = selectedYears.value[selectedYears.value.length - 1];
    if (lastYear) {
        datasets.push({
            label: `Meta ${lastYear}`,
            data: dataKilos.value.map(d => d[`meta_${lastYear}`]),
            type: 'line' as any,
            borderColor: '#9333ea', 
            borderWidth: 2,
            pointRadius: 3,
            backgroundColor: 'transparent',
            order: 1
        });
    }
    return getChartConfig(MONTH_NAMES, datasets, 'bar');
});

const dataKilosAnual = computed(() => processAnnualData(store.reportData, selectedYears.value, 'kilos'));
const configKilosAnual = computed(() => {
    return getChartConfig(selectedYears.value, [{
        label: 'Total Anual (KG)',
        data: dataKilosAnual.value,
        backgroundColor: selectedYears.value.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]),
        borderRadius: 4
    }], 'bar');
});


// --- 3. CONFIGURACIÓN PROMEDIO ($/KG) ---
const dataPromedio = computed(() => processChartData(store.reportData, selectedYears.value, 'promedio'));
const configPromedioMensual = computed(() => {
    const datasets = selectedYears.value.map((year, i) => ({
        label: `Promedio ${year}`,
        data: dataPromedio.value.map(d => d[year]),
        borderColor: CHART_COLORS_GREEN[i % CHART_COLORS_GREEN.length],
        backgroundColor: CHART_COLORS_GREEN[i % CHART_COLORS_GREEN.length],
        borderRadius: 4
       
    }));
    return getChartConfig(MONTH_NAMES, datasets, 'bar');
});

const dataPromedioAnual = computed(() => processAnnualData(store.reportData, selectedYears.value, 'promedio'));
const configPromedioAnual = computed(() => {
    return getChartConfig(selectedYears.value, [{
        label: 'Promedio Anual ($/KG)',
        data: dataPromedioAnual.value,
        backgroundColor: selectedYears.value.map((_, i) => CHART_COLORS_GREEN[i % CHART_COLORS_GREEN.length]),
        borderRadius: 4
    }], 'bar');
});

// Helper para eliminar widgets
const removeWidget = (id: string) => {
    store.removeDynamicWidget(id);
};
</script>

<template>
    <div class="space-y-8 pb-20 @container">
        
        <div v-if="store.dynamicWidgets.length > 0" class="bg-brand-50/50 rounded-2xl p-6 border border-brand-100 shadow-inner animate-fade-in mb-8">
            <div class="flex items-center justify-between border-b border-brand-200 pb-3 mb-4">
                <h3 class="text-sm font-bold text-brand-700 flex items-center gap-2">
                    <div class="p-1.5 bg-white rounded-md shadow-sm text-brand-600">
                        <i class="fa-solid fa-wand-magic-sparkles"></i>
                    </div>
                    Insights Generados por IA
                </h3>
                <button @click="store.clearDynamicWidgets()" class="text-xs font-medium text-slate-500 hover:text-red-500 transition-colors flex items-center gap-1">
                    <i class="fa-regular fa-trash-can"></i> Limpiar zona
                </button>
            </div>

            <div class="grid grid-cols-1 @3xl:grid-cols-2 gap-6">
                <div 
                    v-for="widget in store.dynamicWidgets" 
                    :key="widget.id" 
                    class="relative group bg-white rounded-xl shadow-sm border border-slate-200 p-1 transition-all hover:shadow-md"
                >
                    <div class="h-80 w-full overflow-hidden rounded-lg"> 
                        
                        <KpiCardWidget 
                            v-if="widget.type === 'kpi'" 
                            :config="widget.config" 
                        />

                        <SimpleTableWidget 
                            v-else-if="widget.type === 'table'" 
                            :config="widget.config" 
                        />

                        <BaseChart 
                            v-else 
                            :config="widget.config" 
                            :title="widget.title" 
                            :enable-switch="widget.type !== 'pie' && widget.type !== 'doughnut'" 
                        />
                    </div>

                    <button 
                        @click="removeWidget(widget.id)"
                        class="absolute top-3 right-3 bg-white text-slate-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg shadow-md border border-slate-100 transition-all opacity-0 group-hover:opacity-100 z-20 scale-90 hover:scale-100"
                        title="Eliminar este elemento"
                    >
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>
            </div>
        </div>

       <div class="grid grid-cols-1 @split:grid-cols-3 gap-6">
            <div class="@split:col-span-2">
                <BaseChart 
                :config="configPesosMensual" 
                title="Facturación Mensual ($)" 
                :enable-switch="true"/>
            </div>
            <div class="@split:col-span-1">
                <BaseChart :config="configPesosAnual" title="Facturación Anual ($)" />
            </div>
        </div>
        <PicDataTable title="Detalle Facturación ($)" type="pesos" :processed-data="dataPesos" :years="selectedYears" />

        <div class="border-t border-slate-200 my-8"></div>

        <div class="grid grid-cols-1 @split:grid-cols-3 gap-6">
            <div class="@split:col-span-2">
                <BaseChart 
                :config="configKilosMensual" 
                title="Venta vs Metas (KG)" 
                :enable-switch="true"
                />
            </div>
            <div class="@split:col-span-1">
                <BaseChart :config="configKilosAnual" title="Facturación Anual (KG)" />
            </div>
        </div>
        <PicDataTable title="Detalle Volumen (KG)" type="kilos" 
        :processed-data="dataKilos" 
        :years="selectedYears" />

        <div class="border-t border-slate-200 my-8"></div>

        <div class="grid grid-cols-1 @4xl:grid-cols-3 gap-6">
            <div class="@split:col-span-2">
                <BaseChart 
                :config="configPromedioMensual" 
                title="Precio Promedio Mensual ($/KG)"
                :enable-switch="true" />
            </div>
            <div class="@split:col-span-1">
                <BaseChart :config="configPromedioAnual" title="Precio Promedio Anual ($/KG)" />
            </div>
        </div>
        <PicDataTable title="Detalle Precio Promedio" type="promedio" :processed-data="dataPromedio" :years="selectedYears" />

        <div class="pt-8 border-t-2 border-slate-200 border-dashed mt-12">
            <button 
                @click="showDesglose = !showDesglose"
                class="w-full flex justify-between items-center mb-6 group focus:outline-none"
            >
                <div class="flex items-center gap-2">
                    <h2 class="text-xl font-bold text-slate-800 flex items-center gap-2 px-1 group-hover:text-brand-600 transition-colors">
                        <i class="fa-solid fa-layer-group text-brand-500"></i>
                        Desglose Operativo
                    </h2>
                    <span class="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                        {{ showDesglose ? 'Visible' : 'Oculto' }}
                    </span>
                </div>
                <div class="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-brand-50 group-hover:text-brand-600 transition-all">
                    <i class="fa-solid fa-chevron-down transition-transform duration-300" :class="{'rotate-180': !showDesglose}"></i>
                </div>
            </button>

            <div v-show="showDesglose" class="space-y-6 transition-all duration-500 ease-in-out">
                <PicProjectionTable title="Proyección por Marcas" dimensionKey="marcas" />
                <div class="grid grid-cols-1 @split:grid-cols-2 gap-6">
                    <PicProjectionTable title="Proyección por Gerencia" dimensionKey="gerencia" />
                    <PicProjectionTable title="Proyección por Zona" dimensionKey="zona" drill-down-target="articulos" />
                </div>
                <PicProjectionTable title="Proyección por Canal" dimensionKey="canal" drill-down-target="articulos"/>
                <PicProjectionTable title="Proyección por Familias" dimensionKey="familias" drill-down-target="articulos"/>
                <PicProjectionTable title="Proyección por Clientes (Top)" dimensionKey="clientes" drill-down-target="articulos" :initial-collapsed="true"/>
                <PicProjectionTable title="Proyección por Artículos" dimensionKey="articulos" :initial-collapsed="true"/>
            </div>
        </div>

    </div>
</template>
```

# src\modules\PIC\components\tables\PicDataTable.vue

```vue
<script setup lang="ts">
import { computed } from 'vue';
import { usePicFilterStore } from '../../stores/picFilterStore';
import { usePicChatStore } from '../../stores/picChatStore'; // <--- Importar Chat Store
import { calculateTableData, formatCurrency, formatNumber } from '../../utils/picUtils';

const props = defineProps<{
    title: string;
    type: 'pesos' | 'kilos' | 'promedio';
    processedData: any[]; 
    years: string[];
}>();

const store = usePicFilterStore();
const chatStore = usePicChatStore(); // <--- Instanciar

const tableData = computed(() => {
    return calculateTableData(
        props.processedData, 
        props.years, 
        props.type, 
        store.isComparisonFrozen
    );
});

const getDiffClass = (val: number) => val < 0 ? 'text-red-500' : 'text-emerald-600';
const fmt = (val: number) => props.type === 'kilos' ? formatNumber(val) : formatCurrency(val);

// ACCIÓN: Enviar datos de la tabla al chat
const handleAnalyze = () => {
    // Enviamos 'tableData.rows' y 'footer' que ya contienen los cálculos (diff, growth, etc.)
    // Esto es mucho más rico para la IA que los datos crudos.
    const contextData = {
        rows: tableData.value.rows,
        totals: tableData.value.footer,
        years: tableData.value.sortedYears
    };
    
    chatStore.setContext(props.title, contextData, 'table');
};
</script>

<template>
    <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col group transition-shadow hover:shadow-md">
        
        <div class="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h3 class="text-sm font-bold text-slate-700 flex items-center gap-2">
                <i class="fa-solid fa-table text-slate-400"></i> {{ title }}
            </h3>
            
            <div class="flex items-center gap-3">
                <button 
                    @click="handleAnalyze"
                    class="text-slate-400 hover:text-brand-600 flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded hover:bg-brand-50 transition-colors"
                    title="Analizar esta tabla con IA"
                >
                    <i class="fa-solid fa-wand-magic-sparkles"></i> Analizar
                </button>

                <button 
                    v-if="tableData.prevYear"
                    @click="store.toggleComparisonLock()"
                    class="text-xs px-2 py-1 rounded border transition-colors flex items-center gap-1"
                    :class="store.isComparisonFrozen ? 'bg-slate-100 text-slate-500 border-slate-200' : 'bg-orange-50 text-orange-600 border-orange-200'"
                    title="Bloquear/Desbloquear comparación del mes actual"
                >
                    <i class="fa-solid" :class="store.isComparisonFrozen ? 'fa-lock' : 'fa-lock-open'"></i>
                    <span class="hidden sm:inline">{{ store.isComparisonFrozen ? 'Mes Actual Bloqueado' : 'Comparar Mes Actual' }}</span>
                </button>
            </div>
        </div>

        <div class="overflow-x-auto custom-scrollbar">
            <table class="w-full text-sm text-left border-collapse">
                <thead class="text-xs text-white uppercase bg-slate-800 font-semibold sticky top-0 z-10 shadow-sm">
                    <tr>
                        <th class="px-4 py-3 border-r border-slate-700 bg-slate-900/50">Mes</th>
                        <th v-for="y in tableData.sortedYears" :key="y" class="px-4 py-3 text-right font-medium">
                            {{ type === 'kilos' ? 'Venta KG' : (type === 'pesos' ? 'Venta $' : 'Promedio') }} {{ y }}
                        </th>
                        
                        <th v-if="type === 'kilos'" class="px-4 py-3 text-right text-purple-300 bg-slate-700/50">
                            Meta {{ tableData.currentYear }}
                        </th>

                        <template v-if="tableData.prevYear">
                            <th class="px-4 py-3 text-right text-slate-300 font-medium">DIF vs {{ tableData.prevYear }}</th>
                            <th class="px-4 py-3 text-right text-slate-300 font-medium">Crec %</th>
                            
                            <template v-if="type === 'kilos'">
                                <th class="px-4 py-3 text-right text-slate-300 font-medium">DIF vs Meta</th>
                                <th class="px-4 py-3 text-right text-slate-300 font-medium">Var % Meta</th>
                            </template>
                        </template>
                    </tr>
                </thead>
               <tbody class="divide-y divide-slate-100">
                    <tr v-for="row in tableData.rows" :key="row.mesIndex" class="hover:bg-slate-50/50 transition-colors">
                        <td class="px-4 py-3 font-medium text-slate-700">{{ row.nombre }}</td>
                        
                        <td v-for="y in tableData.sortedYears" :key="y" class="px-4 py-3 text-right tabular-nums text-slate-600 font-mono">
                            {{ fmt(row[y]) }}
                        </td>

                        <td v-if="type === 'kilos'" class="px-4 py-3 text-right tabular-nums text-purple-600 font-medium font-mono">
                            {{ fmt(row[`meta_${tableData.currentYear}`]) }}
                        </td>

                        <template v-if="tableData.prevYear">
                            <td class="px-4 py-3 text-right tabular-nums font-medium font-mono" :class="row.diff !== null ? getDiffClass(row.diff) : 'text-slate-300'">
                                {{ row.diff !== null ? fmt(row.diff) : '—' }}
                            </td>
                            <td class="px-4 py-3 text-right tabular-nums font-bold font-mono" :class="row.growth !== null ? getDiffClass(row.growth) : 'text-slate-300'">
                                {{ row.growth !== null ? row.growth.toFixed(1) + '%' : '—' }}
                            </td>

                            <template v-if="type === 'kilos'">
                                <td class="px-4 py-3 text-right tabular-nums font-mono" :class="row.diffMeta !== null ? getDiffClass(row.diffMeta) : 'text-slate-300'">
                                    {{ row.diffMeta !== null ? fmt(row.diffMeta) : '—' }}
                                </td>
                                <td class="px-4 py-3 text-right tabular-nums font-bold font-mono" :class="row.varMeta !== null ? (row.varMeta >= 100 ? 'text-emerald-600' : 'text-red-500') : 'text-slate-300'">
                                    {{ row.varMeta !== null ? row.varMeta.toFixed(1) + '%' : '—' }}
                                </td>
                            </template>
                        </template>
                    </tr>
                </tbody>
               <tfoot class="bg-slate-50 font-bold text-slate-800 border-t border-slate-200">
                    <tr>
                        <td class="px-4 py-3">TOTAL</td>
                        
                        <td v-for="y in tableData.sortedYears" :key="y" class="px-4 py-3 text-right tabular-nums font-mono">
                            {{ fmt(tableData.footer[y]) }}
                        </td>
                        
                        <td v-if="type === 'kilos'" class="px-4 py-3 text-right tabular-nums text-purple-700 font-mono">
                            {{ fmt(tableData.footer[`meta_${tableData.currentYear}`]) }}
                        </td>

                        <template v-if="tableData.prevYear">
                            <td class="px-4 py-3 text-right tabular-nums font-mono" :class="getDiffClass(tableData.footer.diff)">
                                {{ fmt(tableData.footer.diff) }}
                            </td>
                            <td class="px-4 py-3 text-right tabular-nums font-mono" :class="getDiffClass(tableData.footer.growth)">
                                {{ tableData.footer.growth.toFixed(1) }}%
                            </td>

                            <template v-if="type === 'kilos'">
                                <td class="px-4 py-3 text-right tabular-nums font-mono" :class="getDiffClass(tableData.footer.diffMeta)">
                                    {{ fmt(tableData.footer.diffMeta) }}
                                </td>
                                <td class="px-4 py-3 text-right tabular-nums font-mono" :class="tableData.footer.varMeta >= 100 ? 'text-emerald-600' : 'text-red-500'">
                                    {{ tableData.footer.varMeta.toFixed(1) }}%
                                </td>
                            </template>
                        </template>
                    </tr>
                </tfoot>
            </table>
        </div>
    </div>
</template>
<style scoped>
/* Scrollbar fino para coincidir con el estilo del sistema */
.custom-scrollbar::-webkit-scrollbar { height: 8px; width: 8px; }
.custom-scrollbar::-webkit-scrollbar-track { background: #f1f5f9; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
</style>
```

# src\modules\PIC\components\tables\PicProjectionTable.vue

```vue
<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { usePicFilterStore } from '../../stores/picFilterStore';
import { picApi } from '../../services/picApi'; // <--- NUEVO: Necesario para pedir el detalle
import { formatNumber } from '../../utils/formatters';

const props = defineProps<{
    title: string;
    dimensionKey: string; // La dimensión de ESTA tabla (ej: 'familias')
    initialCollapsed?: boolean;
    // <--- NUEVO: Define qué dimensión pedir al hacer clic (ej: 'articulos')
    // Si no se pasa esta prop, la tabla no será interactiva (caso Marcas/Gerencia)
    drillDownTarget?: string; 
}>();

const store = usePicFilterStore();
const isCollapsed = ref(props.initialCollapsed || false);

// --- ESTADO LOCAL PARA EL DRILL-DOWN ---
// Guardamos los datos de las filas hijas aquí: { "NombreFilaPadre": [datosHijos...] }
const expandedRows = ref<Record<string, any[]>>({});
const loadingRows = ref<Record<string, boolean>>({});

// Acceso al store para datos principales
const tableData = computed(() => store.projectionData[props.dimensionKey as keyof typeof store.projectionData] || []);
const isLoading = computed(() => store.loadingProjections[props.dimensionKey] || false);

// Años (Sincronizados con el store)
const years = computed(() => store.selected.Anio.length > 0 ? [...store.selected.Anio].sort() : ['2023', '2024', '2025']);
const currentYear = computed(() => years.value[years.value.length - 1]);
const prevYear = computed(() => years.value.length > 1 ? years.value[years.value.length - 2] : null);

// --- LÓGICA DE CARGA PRINCIPAL ---
const handleLoad = () => {
    isCollapsed.value = false;
    store.fetchSingleProjection(props.dimensionKey);
};

// --- LÓGICA MATEMÁTICA (Factorizada para reusar en Padre e Hijos) ---
// Esta función calcula crecimientos y diferencias para cualquier array de datos
const processData = (data: any[], totalMarketSize: number) => {
    if (!data || data.length === 0) return [];
    const yCurr = currentYear.value;
    const yPrev = prevYear.value;

    return data.map(row => {
        const valCurr = row[`Venta_${yCurr}`] || 0;
        const valPrev = yPrev ? (row[`Venta_${yPrev}`] || 0) : 0;
        const meta = row[`Meta_${yCurr}`] || 0;
        const difAnual = valCurr - valPrev;
        const difMeta = valCurr - meta;
        
        const crec = valPrev !== 0 ? (difAnual / valPrev) * 100 : 0;
        const varMeta = meta !== 0 ? (valCurr / meta) * 100 : 0;
        
        // La participación siempre es relativa al total que le pasemos
        const share = totalMarketSize !== 0 ? (valCurr / totalMarketSize) * 100 : 0;

        return { ...row, valCurr, valPrev, meta, difAnual, difMeta, crec, varMeta, share };
    });
};

// Procesar filas PADRE (La tabla principal)
const processedRows = computed(() => {
    const yCurr = currentYear.value;
    // El 100% es la suma de toda la tabla actual
    const total = tableData.value.reduce((s, r) => s + (r[`Venta_${yCurr}`] || 0), 0);
    return processData(tableData.value, total);
});

// --- NUEVO: LÓGICA DE CLIC EN FILA (DRILL-DOWN) ---
const toggleRow = async (row: any) => {
    // Si no se configuró un objetivo de drilldown, no hacemos nada (ej: Marcas)
    if (!props.drillDownTarget) return;

    const rowId = row.Dimension; // Ej: "ZF-Jamon Pierna"

    // 1. Si ya está abierto, lo cerramos (borramos del estado local)
    if (expandedRows.value[rowId]) {
        delete expandedRows.value[rowId];
        return;
    }

    // 2. Si no, cargamos los datos
    loadingRows.value[rowId] = true;
    try {
        // Obtenemos los filtros globales actuales
        const activeFilters = JSON.parse(JSON.stringify(store.getFiltersForClientSearch())); 
        
        // Mapeamos: Si estoy en la tabla 'familias', el filtro de BD es 'grupo'
        const dimensionToFilterMap: Record<string, string> = {
            'familias': 'grupo',
            'zona': 'Zona',
            'canal': 'canal',
            'clientes': 'NOM_CLIENTE',
            'gerencia': 'Gerencia'
        };
        
        const filterKey = dimensionToFilterMap[props.dimensionKey] || props.dimensionKey;
        
        // AGREGAMOS EL FILTRO: "Traeme los artículos DONDE grupo = 'ZF-Jamon Pierna'"
        activeFilters[filterKey] = [row.Dimension]; 

        // Llamamos a la API directamente (sin pasar por el store global para no sobrescribir nada)
        const childData = await picApi.getProjection(props.drillDownTarget, activeFilters, years.value);
        
        expandedRows.value[rowId] = childData;

    } catch (e) {
        console.error("Error cargando detalle:", e);
    } finally {
        loadingRows.value[rowId] = false;
    }
};

// Helper para procesar las filas HIJAS (cuando se renderizan)
const getChildRows = (parentId: string) => {
    const data = expandedRows.value[parentId];
    if (!data) return [];
    
    // Para las hijas, el 100% de participación es con respecto a SU PADRE
    const parentRow = processedRows.value.find(p => p.Dimension === parentId);
    const parentTotal = parentRow ? parentRow.valCurr : 1; 

    return processData(data, parentTotal);
};

// Footer (Cálculo de totales generales)
const footer = computed(() => {
    if (processedRows.value.length === 0) return null;
    const sums: any = { Dimension: 'TOTAL' };
    years.value.forEach(y => {
        sums[`Venta_${y}`] = processedRows.value.reduce((s, r) => s + (r[`Venta_${y}`] || 0), 0);
    });
    sums.meta = processedRows.value.reduce((s, r) => s + r.meta, 0);
    const totalCurr = sums[`Venta_${currentYear.value}`];
    const totalPrev = prevYear.value ? sums[`Venta_${prevYear.value}`] : 0;
    sums.difAnual = totalCurr - totalPrev;
    sums.difMeta = totalCurr - sums.meta;
    sums.crec = totalPrev !== 0 ? (sums.difAnual / totalPrev) * 100 : 0;
    sums.varMeta = sums.meta !== 0 ? (totalCurr / sums.meta) * 100 : 0;
    sums.share = 100;
    return sums;
});

const colorClass = (val: number, isPercent = false) => {
    if (val === 0) return 'text-slate-400';
    if (isPercent && val >= 100) return 'text-emerald-700 font-bold';
    if (isPercent) return val >= 0 ? 'text-emerald-700' : 'text-red-600';
    return val >= 0 ? 'text-emerald-700' : 'text-red-600';
};
</script>

<template>
    <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full transition-all duration-300">
        
        <div class="px-4 py-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center shrink-0">
            <h3 class="font-bold text-slate-700 text-xs uppercase tracking-wide flex items-center gap-2">
                <i class="fa-solid fa-chart-gantt text-slate-400"></i>
                {{ title }}
            </h3>
            
            <button v-if="tableData.length > 0" @click="isCollapsed = !isCollapsed" class="text-[10px] uppercase font-bold text-slate-400 hover:text-brand-600">
                {{ isCollapsed ? 'Mostrar' : 'Ocultar' }}
            </button>
        </div>

        <div v-if="tableData.length === 0 && !isLoading" class="p-6 flex flex-col items-center justify-center bg-slate-50/50 min-h-[150px]">
            <p class="text-xs text-slate-500 mb-3">Análisis disponible bajo demanda</p>
            <button 
                @click="handleLoad"
                class="bg-white border border-slate-300 hover:border-brand-400 hover:text-brand-600 text-slate-600 px-4 py-2 rounded-lg text-xs font-bold shadow-sm transition-all flex items-center gap-2"
            >
                <i class="fa-solid fa-bolt"></i> Generar Tabla
            </button>
        </div>

        <div v-else-if="isLoading" class="p-8 text-center text-slate-500 min-h-[150px] flex items-center justify-center">
            <div class="flex flex-col items-center gap-2">
                <i class="fa-solid fa-circle-notch fa-spin text-2xl text-brand-500"></i>
                <span class="text-xs font-medium">Procesando datos...</span>
            </div>
        </div>

        <div v-else-if="!isCollapsed" class="overflow-x-auto custom-scrollbar animate-fade-in">
            <table class="w-full text-xs text-left border-collapse whitespace-nowrap">
                <thead class="bg-slate-800 text-white font-semibold uppercase sticky top-0 z-10">
                    <tr>
                        <th class="px-3 py-2 text-left bg-slate-900 border-r border-slate-700 min-w-[180px] sticky left-0 z-20">
                            Concepto
                        </th>
                        <th v-for="y in years" :key="y" class="px-3 py-2 text-right">Venta {{ y }}</th>
                        <th class="px-3 py-2 text-right bg-slate-700">Meta {{ currentYear }}</th>
                        <th class="px-3 py-2 text-right">Dif (Año)</th>
                        <th class="px-3 py-2 text-right">Dif (Meta)</th>
                        <th class="px-3 py-2 text-right">Crec %</th>
                        <th class="px-3 py-2 text-right">Cumpl %</th>
                        <th class="px-3 py-2 text-right bg-slate-900/50">Part %</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                    <template v-for="(row, idx) in processedRows" :key="row.Dimension">
                        
                        <tr 
                            class="transition-colors group border-l-4 border-transparent"
                            :class="[
                                drillDownTarget ? 'cursor-pointer hover:bg-yellow-50' : 'hover:bg-slate-50',
                                expandedRows[row.Dimension] ? 'bg-slate-50 border-l-brand-500' : ''
                            ]"
                            @click="toggleRow(row)"
                        >
                            <td class="px-3 py-2 font-bold text-slate-700 sticky left-0 bg-inherit border-r border-slate-100 truncate max-w-[200px]" :title="row.Dimension">
                                <div class="flex items-center gap-2">
                                    <i v-if="drillDownTarget" 
                                       class="fa-solid text-[10px] text-slate-400 transition-transform duration-200"
                                       :class="expandedRows[row.Dimension] || loadingRows[row.Dimension] ? 'fa-chevron-down' : 'fa-chevron-right'">
                                    </i>
                                    {{ row.Dimension }}
                                </div>
                            </td>

                            <td v-for="y in years" :key="y" class="px-3 py-2 text-right text-slate-600 font-mono">{{ formatNumber(row[`Venta_${y}`]) }}</td>
                            <td class="px-3 py-2 text-right text-emerald-700 font-mono bg-emerald-50/30">{{ formatNumber(row.meta) }}</td>
                            <td class="px-3 py-2 text-right font-mono" :class="colorClass(row.difAnual)">{{ formatNumber(row.difAnual) }}</td>
                            <td class="px-3 py-2 text-right font-mono" :class="colorClass(row.difMeta)">{{ formatNumber(row.difMeta) }}</td>
                            
                            <td class="px-3 py-2 text-right font-bold font-mono" :class="colorClass(row.crec)">{{ row.crec.toFixed(1) }}%</td>
                            <td class="px-3 py-2 text-right font-bold font-mono" :class="colorClass(row.varMeta, true)">{{ row.varMeta.toFixed(1) }}%</td>
                            <td class="px-3 py-2 text-right text-slate-800 font-bold bg-slate-50 font-mono">{{ row.share.toFixed(1) }}%</td>
                        </tr>

                        <tr v-if="loadingRows[row.Dimension]">
                            <td :colspan="8 + years.length" class="bg-slate-50 p-2 text-center text-slate-400 text-[10px]">
                                <i class="fa-solid fa-circle-notch fa-spin mr-1"></i> Cargando detalle...
                            </td>
                        </tr>

                        <tr v-if="expandedRows[row.Dimension]" class="bg-slate-50 shadow-inner">
                            <td :colspan="8 + years.length" class="p-0">
                                <div class="pl-8 py-2 pr-2 border-l-4 border-brand-500/20">
                                    <table class="w-full text-[11px] text-slate-600">
                                        <tr v-for="child in getChildRows(row.Dimension)" :key="child.Dimension" class="border-b border-slate-200/50 last:border-0 hover:bg-white transition-colors">
                                            <td class="py-1.5 px-2 font-medium truncate w-[180px] text-slate-500 pl-4">{{ child.Dimension }}</td>
                                            
                                            <td v-for="y in years" :key="y" class="py-1.5 px-2 text-right font-mono w-[80px]">
                                                {{ formatNumber(child[`Venta_${y}`]) }}
                                            </td>
                                            <td class="py-1.5 px-2 text-right text-emerald-700/70 font-mono w-[80px]">{{ formatNumber(child.meta) }}</td>
                                            
                                            <td class="py-1.5 px-2 text-right font-mono w-[80px]" :class="colorClass(child.difAnual)">{{ formatNumber(child.difAnual) }}</td>
                                            <td class="py-1.5 px-2 text-right font-mono w-[80px]" :class="colorClass(child.difMeta)">{{ formatNumber(child.difMeta) }}</td>
                                            <td class="py-1.5 px-2 text-right font-mono w-[60px]" :class="colorClass(child.crec)">{{ child.crec.toFixed(1) }}%</td>
                                            <td class="py-1.5 px-2 text-right font-mono w-[60px]" :class="colorClass(child.varMeta, true)">{{ child.varMeta.toFixed(1) }}%</td>
                                            
                                            <td class="py-1.5 px-2 text-right font-bold text-brand-700 bg-brand-50/20 font-mono w-[60px]">
                                                {{ child.share.toFixed(1) }}%
                                            </td>
                                        </tr>
                                    </table>
                                </div>
                            </td>
                        </tr>

                    </template>
                </tbody>
                <tfoot v-if="footer" class="bg-slate-100 font-bold text-slate-800 border-t-2 border-slate-300">
                    <tr>
                        <td class="px-3 py-2 sticky left-0 bg-slate-100 border-r border-slate-200">TOTAL</td>
                        <td v-for="y in years" :key="y" class="px-3 py-2 text-right font-mono">{{ formatNumber(footer[`Venta_${y}`]) }}</td>
                        <td class="px-3 py-2 text-right font-mono text-emerald-800">{{ formatNumber(footer.meta) }}</td>
                        <td class="px-3 py-2 text-right font-mono" :class="colorClass(footer.difAnual)">{{ formatNumber(footer.difAnual) }}</td>
                        <td class="px-3 py-2 text-right font-mono" :class="colorClass(footer.difMeta)">{{ formatNumber(footer.difMeta) }}</td>
                        <td class="px-3 py-2 text-right font-mono"  :class="colorClass(footer.crec)">{{ footer.crec.toFixed(1) }}%</td>
                        <td class="px-3 py-2 text-right font-mono" :class="colorClass(footer.varMeta, true)">{{ footer.varMeta.toFixed(1) }}%</td>
                        <td class="px-3 py-2 text-right bg-slate-200 font-mono">100%</td>
                    </tr>
                </tfoot>
            </table>
        </div>
    </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar { height: 8px; width: 8px; }
.custom-scrollbar::-webkit-scrollbar-track { background: #f1f5f9; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
.animate-fade-in { animation: fadeIn 0.3s ease-in; }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
</style>
```

# src\modules\PIC\components\widgets\KpiCardWidget.vue

```vue
<script setup lang="ts">
import { formatCurrency, formatNumber } from '../../utils/formatters';

const props = defineProps<{
    config: {
        value: number;
        label: string;
        subtext?: string;
    };
}>();

const formattedValue = () => {
    // Si la etiqueta sugiere dinero ($$), usamos moneda. Si no, número estándar.
    const isMoney = props.config.label.includes('$') || props.config.label.toLowerCase().includes('venta');
    return isMoney ? formatCurrency(props.config.value) : formatNumber(props.config.value);
};
</script>

<template>
    <div class="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-full flex flex-col items-center justify-center text-center relative overflow-hidden group">
        <div class="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <i class="fa-solid fa-chart-line text-6xl text-brand-600"></i>
        </div>

        <h4 class="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2 z-10">
            {{ config.label }}
        </h4>
        
        <div class="text-4xl md:text-5xl font-black text-slate-800 z-10 mb-2 tracking-tight">
            {{ formattedValue() }}
        </div>
        
        <p v-if="config.subtext" class="text-xs text-slate-500 z-10 bg-slate-50 px-2 py-1 rounded-full border border-slate-100">
            {{ config.subtext }}
        </p>
    </div>
</template>
```

# src\modules\PIC\components\widgets\SimpleTableWidget.vue

```vue
<script setup lang="ts">
import { computed } from 'vue';
import { formatCurrency, formatNumber } from '../../utils/formatters';

const props = defineProps<{
    config: {
        columns: string[]; // ['Gerencia', 'Zona', 'TotalMetric']
        data: any[];
        metricLabel: string; // 'Venta ($)'
    };
}>();

// Detectar si la métrica es dinero para formatear
const isMoney = computed(() => props.config.metricLabel.includes('$'));

const formatVal = (val: number) => isMoney.value ? formatCurrency(val) : formatNumber(val);
</script>

<template>
    <div class="bg-white rounded-xl shadow-sm border border-slate-200 h-full flex flex-col overflow-hidden">
        <div class="overflow-auto custom-scrollbar flex-1">
            <table class="w-full text-xs text-left">
                <thead class="bg-slate-50 text-slate-500 font-bold uppercase sticky top-0 z-10">
                    <tr>
                        <th v-for="col in config.columns.filter(c => c !== 'TotalMetric')" :key="col" class="px-4 py-3 border-b border-slate-200">
                            {{ col }}
                        </th>
                        <th class="px-4 py-3 text-right border-b border-slate-200 text-brand-600">
                            {{ config.metricLabel }}
                        </th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                    <tr v-for="(row, idx) in config.data" :key="idx" class="hover:bg-slate-50 transition-colors">
                        <td v-for="col in config.columns.filter(c => c !== 'TotalMetric')" :key="col" class="px-4 py-2.5 text-slate-600 font-medium">
                            {{ row[col] }}
                        </td>
                        <td class="px-4 py-2.5 text-right font-mono font-bold text-slate-700">
                            {{ formatVal(row.TotalMetric) }}
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
        <div class="bg-slate-50 px-3 py-2 text-[10px] text-slate-400 text-center border-t border-slate-100">
            Mostrando top {{ config.data.length }} registros
        </div>
    </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
</style>
```

# src\modules\PIC\composables\useChartData.ts

```ts
/* src/modules/PIC/composables/useChartData.ts */
import { computed } from 'vue';
import type { PicDataRecord } from '../types/pic';
import { CHART_COLORS, CHART_COLORS_GREEN, MESES } from '@/utils/constants'; // Asegúrate de tener estas constantes migradas o defínelas aquí

export function useChartData() {
    
    // Función pura para procesar datos según el tipo (Pesos, Kilos, Promedio)
    const processData = (
        rawData: PicDataRecord[], 
        years: string[], 
        metricType: 'pesos' | 'kilos' | 'promedio',
        monthRange: { start: string, end: string }
    ) => {
        const startMonth = parseInt(monthRange.start, 10);
        const endMonth = parseInt(monthRange.end, 10);
        
        // 1. Estructura base (Filas por Mes)
        const rows = [];
        const chartLabels: string[] = [];
        
        // Colores según métrica
        const colors = metricType === 'promedio' ? CHART_COLORS_GREEN : CHART_COLORS;

        for (let i = startMonth; i <= endMonth; i++) {
            const mesIndex = i - 1;
            const mesNombre = MESES[mesIndex];
            chartLabels.push(mesNombre);

            // Objeto fila base
            const row: any = { 
                mes: i, 
                nombre: mesNombre 
            };

            // Llenar datos por año
            years.forEach(year => {
                // Buscar el registro exacto en los datos crudos
                const record = rawData.find(d => d.Año == year && d.Mes == i);
                
                let value = 0;
                let meta = 0;

                if (record) {
                    if (metricType === 'pesos') value = record.TotalVentaPesos;
                    else if (metricType === 'kilos') {
                        value = record.TotalVentaKG;
                        meta = record.TotalMetasKG;
                    }
                    else if (metricType === 'promedio') {
                        // Cálculo seguro del promedio
                        value = record.TotalVentaKG ? (record.TotalVentaPesos / record.TotalVentaKG) : 0;
                    }
                }

                row[year] = value;
                if (metricType === 'kilos') row[`meta_${year}`] = meta;
            });

            rows.push(row);
        }

        // 2. Estructura para Chart.js (Datasets)
        const chartDatasets = years.map((year, index) => ({
            label: metricType === 'promedio' ? `Promedio ${year}` : (metricType === 'kilos' ? `Venta KG ${year}` : `Venta $ ${year}`),
            data: rows.map(r => r[year]),
            backgroundColor: colors[index % colors.length],
            borderColor: colors[index % colors.length],
            borderRadius: 4,
            tension: 0.1
        }));

        // Caso especial: Metas en Kilos (Línea)
        if (metricType === 'kilos') {
            const lastYear = years[years.length - 1]; // Año más reciente para la meta
            chartDatasets.push({
                label: `Meta KG ${lastYear}`,
                data: rows.map(r => r[`meta_${lastYear}`]),
                type: 'line' as any, // Forzamos tipo línea
                borderColor: '#a855f7', // Morado
                backgroundColor: '#a855f7',
                borderWidth: 2,
                tension: 0.1,
                pointRadius: 3
            } as any);
        }

        return {
            tableRows: rows,
            chartData: {
                labels: chartLabels,
                datasets: chartDatasets
            }
        };
    };

    return {
        processData
    };
}
```

# src\modules\PIC\services\picApi.ts

```ts
/* src/modules/PIC/services/picApi.ts */
import axios from 'axios';
import { setupAuthInterceptors } from '@/api/interceptorSetup';
import type { PicFilterOptions, PicDataPoint, AiChatResponse, AiQueryConfig } from '../types/picTypes';


// Instancia para API V1
const picClient = axios.create({
   baseURL: import.meta.env.VITE_API_BASE_URL,
   headers: {
      'Content-Type': 'application/json'
   }
});

// Aplicamos la misma configuración de seguridad que en V2
setupAuthInterceptors(picClient);

export const picApi = {

   // --- FILTROS ---
   async getInitialFilters(): Promise<PicFilterOptions> {
      const [canales, gerencias, marcas, anios, transacciones, formatos] = await Promise.all([
         picClient.get<string[]>('/filters/canales'),
         picClient.get<string[]>('/filters/gerencias'),
         picClient.get<string[]>('/filters/marcas'),
         picClient.get<string[]>('/filters/anios'),
         picClient.get<string[]>('/filters/transacciones'),
         picClient.get<string[]>('/filters/formato-cliente')
      ]);

      return {
         canales: canales.data,
         gerencias: gerencias.data,
         marcas: marcas.data,
         anios: anios.data,
         transacciones: transacciones.data,
         formatosCliente: formatos.data
      };
   },

   async getDependentOptions(endpoint: string, parentFilters: Record<string, string[]>): Promise<string[]> {
      const { data } = await picClient.post<string[]>(`/filters/${endpoint}`, parentFilters);
      return data;
   },

   async searchClients(searchTerm: string, page: number, filters: Record<string, any>) {
      const { data } = await picClient.post('/filters/clients', {
         searchTerm,
         page,
         filters
      });
      return data;
   },

   async getDashboardData(filters: Record<string, any>, dimensions: string[] = ['Año', 'Mes']): Promise<PicDataPoint[]> {
      const { data } = await picClient.post<PicDataPoint[]>('/query', {
         dimensions,
         filters
      });
      return data;
   },

   async getProjection(dimension: string, filters: Record<string, any>, years: string[], limit?: number) {
      const { data } = await picClient.post('/projections', {
         dimension,
         filters,
         years,
         limit // Enviamos el límite al backend
      });
      return data;
   },

   async getPriceAverageSummary(): Promise<any[]> {
      const { data } = await picClient.get('/summary/price-average');
      return data;
   },


   // --- INTELIGENCIA ARTIFICIAL (ACTUALIZADO FASE 4) ---
   async sendChatPrompt(userPrompt: string, history: any[] = [], model: string = 'gemini'): Promise<AiChatResponse> {
      console.log("📡 [Front] Enviando prompt a Smart Agent:", userPrompt);

      // 1. Llamada al nuevo endpoint 'Inteligente'
      // El backend ahora devuelve: { type: 'text'|'data_query', explanation: string, queryConfig?: object }
      const { data } = await picClient.post('/ai/chat', {
         userPrompt,
         history,
         modelProvider: model
      });

      // 2. Ya no necesitamos parsear texto crudo ni limpiar \`\`\`json
      // Retornamos la respuesta estructurada directamente
      return {
         explanation: data.explanation,
         queryConfig: data.type === 'data_query' ? data.queryConfig : null
      };
   },


   async executeAiQuery(queryConfig: AiQueryConfig): Promise<any[]> {
      const { data } = await picClient.post('/ia-query', queryConfig);
      return data;
   },

   // Actualiza esta función:
   async getDataInsights(chartData: any[], promptContext: string, model: string = 'gemini'): Promise<string> {
      try {
         // CAMBIO: Apuntamos a /ai/insight y enviamos modelProvider
         const { data } = await picClient.post('/ai/insight', {
            userPrompt: promptContext,
            chartData,
            modelProvider: model
         });
         return data.insight;
      } catch (error) {
         console.error("❌ Error getting insight:", error);
         return "No se pudo generar el análisis automático.";
      }
   },

   async getExecutiveSummary(reportData: any[]): Promise<string> {
      // 1. Pre-procesamiento ligero para no enviar MBs de datos a la IA
      // Agrupamos solo los totales anuales y por mes para reducir tokens
      const summaryData = reportData.reduce((acc, row) => {
         const key = `${row.Año}-${row.Mes}`;
         if (!acc[key]) acc[key] = { k: 0, p: 0, m: 0 };
         acc[key].k += row.TotalVentaKG || 0;
         acc[key].p += row.TotalVentaPesos || 0;
         acc[key].m += row.TotalMetasKG || 0;
         return acc;
      }, {});

      const context = `
            Actúa como un Director Financiero (CFO) experto.
            Analiza los siguientes datos agregados (Año-Mes: {k: Kilos, p: Pesos, m: Meta}).
            
            DATOS: ${JSON.stringify(summaryData)}
            
            INSTRUCCIÓN:
            Genera un "Resumen Ejecutivo" en formato HTML simple (usa <p>, <ul>, <li>, <strong>).
            Debe contener:
            1. 📊 **Veredicto General:** Una frase contundente sobre el desempeño.
            2. 📈 **Tendencias:** Qué subió o bajó significativamente.
            3. 🎯 **Cumplimiento:** Mención sobre si se lograron las metas de Kilos.
            4. 💡 **Observación Clave:** Un insight que destaque (ej: precio promedio o mes récord).
            
            Tono: Profesional, directo, orientado a resultados. No saludes.
        `;

      const { data } = await picClient.post('/gemini-insight', {
         userPrompt: context,
         chartData: summaryData // Enviamos data reducida
      });

      return data.insight;
   },
};


```

# src\modules\PIC\stores\picChatStore.ts

```ts
import { defineStore } from 'pinia';
import { ref } from 'vue';
import axios from 'axios';
import { picApi } from '../services/picApi';
import type { AiQueryConfig, DynamicWidget, ChatMessage } from '../types/picTypes';
import { usePicFilterStore } from './picFilterStore';
import { getChartConfig, getPieConfig } from '../utils/picUtils';

interface ChatContext {
    id: string;
    title: string;
    data: any;
    type: 'chart' | 'table';
}

export const usePicChatStore = defineStore('picChat', () => {
    // --- ESTADO ---
    const messages = ref<ChatMessage[]>([]);
    const isLoading = ref(false);
    const activeContext = ref<ChatContext | null>(null);
    const isReportActive = ref(false);
    const filterStore = usePicFilterStore();         
    const selectedModel = ref<string>('gemini'); // Default
    
    // --- ACCIONES BÁSICAS ---
    function initChat() {
        if (messages.value.length === 0) {
            addMessage('assistant', 'Hola, soy tu analista virtual de PIC. Puedes pedirme datos específicos o generar reportes.');
        }
    }
    function setModel(modelId: string) {
        selectedModel.value = modelId;
    }

    function addMessage(role: 'user' | 'assistant' | 'system', text: string, chartConfig: AiQueryConfig | null = null) {
        const id = Date.now().toString() + Math.random().toString();
        messages.value.push({
            id,
            role,
            text,
            timestamp: new Date(),
            chartConfig
        });
        return id; // Retornamos ID para uso posterior
    }

    function setContext(title: string, data: any, type: 'chart' | 'table') {
        activeContext.value = {
            id: Date.now().toString(),
            title,
            data,
            type
        };
        console.log("Contexto establecido:", title);
    }

    function clearContext() {
        activeContext.value = null;
    }

    function clearChat() {
        messages.value = [];
        clearContext();
        initChat();
    }

    async function sendMessage(userText: string) {
        if (!userText.trim()) return;

        // 1. Agregar mensaje del usuario a la UI inmediatamente
        addMessage('user', userText);
        isLoading.value = true;

        try {
            // --- A. PREPARAR MEMORIA (HISTORIAL) ---
            // Tomamos los últimos 10 mensajes previos para dar contexto
            // Excluimos el mensaje actual (que acabamos de agregar) y los mensajes de error (system)
            const history = messages.value
                .slice(0, -1) // Ignoramos el mensaje actual
                .slice(-10)   // Limitamos a 10 turnos para ahorrar tokens
                .filter(m => m.role !== 'system') 
                .map(m => ({
                    role: m.role === 'user' ? 'user' : 'model', // Gemini usa 'model', no 'assistant'
                    parts: [{ text: m.text }]
                }));

            // --- B. INYECTAR CONTEXTO VISUAL (Si el usuario seleccionó un gráfico) ---
            let promptToSend = userText;
            
            if (activeContext.value) {
                const contextDataStr = JSON.stringify(activeContext.value.data).slice(0, 5000);
                promptToSend = `
                [CONTEXTO VISUAL ACTIVO]
                Elemento: "${activeContext.value.title}" (${activeContext.value.type}).
                Datos: ${contextDataStr}.
                
                [PREGUNTA USUARIO]
                "${userText}"
                `;
            }

            // --- C. LLAMADA A LA API ---
            // Enviamos el prompt actual + el historial de la conversación
            const response = await picApi.sendChatPrompt(promptToSend, history, selectedModel.value);

            // --- D. PROCESAR RESPUESTA ---
            if (response.explanation) {
                const msgId = addMessage('assistant', response.explanation, response.queryConfig);

                // Si la IA decidió generar un gráfico, lo renderizamos automáticamente
                if (response.queryConfig) {
                    await visualizeData(msgId);
                }
            }

            // Limpiamos el contexto visual después de usarlo
            clearContext();

        } catch (error: any) {
            const errorMsg = error.response?.data?.message || 'Hubo un error técnico al procesar tu solicitud.';
            addMessage('system', errorMsg);
            console.error("Chat Error:", error);
        } finally {
            isLoading.value = false;
        }
    }

    
   //  async function visualizeData(messageId: string) {
   //      const message = messages.value.find(m => m.id === messageId);
   //      if (!message || !message.chartConfig) return;

   //      // Indicador visual de que "sigue pensando" (generando insight)
   //      const localLoading = !isLoading.value;
   //      if (localLoading) isLoading.value = true;
        
   //      try {
   //          // 1. Ejecutar Query (Traer números)
   //          const data = await picApi.executeAiQuery(message.chartConfig);
            
   //          if (!data || data.length === 0) {
   //              // Actualizamos el mensaje original para decir que no hubo datos
   //              message.text += "\n\n(Nota: La consulta no arrojó resultados numéricos).";
   //              return;
   //          }

   //          // 2. Procesar y Graficar (Código visual existente...)
   //          const config = message.chartConfig;
   //          const labels = data.map((d: any) => config.dimensions.map(dim => d[dim]).join(' - '));
   //          const values = data.map((d: any) => d.TotalMetric || 0);
            
   //          const metricMap: Record<string, string> = { 
   //              'VENTA_KG': 'Venta (KG)', 
   //              'VENTA_$$': 'Venta ($)', 
   //              'METAS_KG': 'Meta (KG)' 
   //          };
   //          const labelMetric = metricMap[config.metric] || config.metric;

   //          const chartJsConfig = getChartConfig(
   //              labels, 
   //              [{
   //                  label: labelMetric,
   //                  data: values,
   //                  backgroundColor: '#0ea5e9',
   //                  borderRadius: 4
   //              }], 
   //              'bar'
   //          );

   //          const newWidget: DynamicWidget = {
   //              id: Date.now().toString(),
   //              title: `IA: ${labelMetric} por ${config.dimensions.join(', ')}`,
   //              type: 'bar',
   //              config: chartJsConfig,
   //              rawQuery: config,
   //              timestamp: Date.now()
   //          };

   //          filterStore.addDynamicWidget(newWidget);
   //          isReportActive.value = true;

   //          // --- 3. NUEVO: GENERACIÓN DE INSIGHT AUTOMÁTICO ---
   //          // Tomamos los datos reales y pedimos un micro-resumen
   //          // Limitamos a los top 10 registros para no saturar tokens
   //          const dataSample = data.slice(0, 15); 
            
   //          const promptInsight = `
   //              Dame UN párrafo muy breve (máx 30 palabras) describiendo la tendencia principal o el 
   //              valor más destacado.
   //              Empieza directo, ej: "Se observa que..." o "Destaca que..."
   //          `;

   //          // Llamamos a la API de insight (que ya tienes configurada en picApi)
   //          const insightText = await picApi.getDataInsights(dataSample, promptInsight);
            
   //          // 4. Actualizamos el mensaje del chat con el insight
   //          // Efecto: "Aquí tienes el gráfico... [Se escribe solo:] Se observa que la Zona Norte domina..."
   //          message.text = `${message.text}\n\n💡 ${insightText}`;

   //      } catch (error: any) {
   //          console.error("❌ Error visualizando/analizando:", error);
   //          // No mostramos error al usuario si falla el insight, solo el gráfico se queda igual
   //      } finally {
   //          if (localLoading) isLoading.value = false;
   //      }
   //  }

   async function visualizeData(messageId: string) {
        const message = messages.value.find(m => m.id === messageId);
        if (!message || !message.chartConfig) return;

        // Evitar doble loading si el usuario hace clic varias veces rápido
        if (isLoading.value) return;
        isLoading.value = true;
        
        try {
            // 1. Ejecutar Query a la API (Obtener los datos crudos)
            const data = await picApi.executeAiQuery(message.chartConfig);
            
            if (!data || data.length === 0) {
                message.text += "\n\n(La consulta no devolvió datos para visualizar).";
                return;
            }

            setContext(
                `Resultado: ${message.chartConfig.metric} por ${message.chartConfig.dimensions.join(', ')}`, // Título
                data.slice(0, 50), // Datos (Limitamos a 50 filas para no saturar tokens)
                'chart' // Tipo
            );

            const config = message.chartConfig;
            const vizType = config.visualization || 'bar'; // Fallback por seguridad

            // Preparar etiquetas y valores comunes
            // (Para tablas y KPIs se procesan distinto abajo)
            const labels = data.map((d: any) => config.dimensions.map(dim => d[dim]).join(' - '));
            const values = data.map((d: any) => d.TotalMetric || 0);
            
            // Mapas de etiquetas amigables
            const metricMap: Record<string, string> = { 
                'VENTA_KG': 'Venta (KG)', 
                'VENTA_$$': 'Venta ($)', 
                'METAS_KG': 'Meta (KG)' 
            };
            const labelMetric = metricMap[config.metric] || config.metric;

            let widgetConfig: any = null;
            let widgetType = vizType;

            // --- FÁBRICA DE VISUALIZACIONES ---
            switch (vizType) {
                case 'kpi':
                    // Para KPI sumamos todo el resultado (ej: Venta total de la consulta)
                    const totalValue = values.reduce((a: number, b: number) => a + b, 0);
                    widgetConfig = {
                        value: totalValue,
                        label: labelMetric,
                        subtext: `Basado en ${data.length} registros filtrados`
                    };
                    break;

                case 'table':
                    // Para tabla pasamos los datos crudos y las columnas
                    widgetConfig = {
                        columns: [...config.dimensions, 'TotalMetric'], // Columnas dinámicas
                        data: data,
                        metricLabel: labelMetric
                    };
                    break;

                case 'pie':
                case 'doughnut':
                    // Usamos el nuevo helper de Utils
                    // Importante: Pie charts necesitan colores variados
                    const bgColors = [
                        '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', 
                        '#ec4899', '#06b6d4', '#84cc16', '#6366f1', '#14b8a6'
                    ];
                    widgetConfig = getPieConfig(
                        labels,
                        [{
                            data: values,
                            backgroundColor: bgColors,
                            borderWidth: 1
                        }],
                        vizType
                    );
                    break;

                case 'line':
                case 'bar':
                default:
                    // Usamos el helper existente
                    widgetConfig = getChartConfig(
                        labels, 
                        [{
                            label: labelMetric,
                            data: values,
                            backgroundColor: vizType === 'line' ? 'rgba(59, 130, 246, 0.2)' : '#0ea5e9',
                            borderColor: '#0ea5e9',
                            fill: vizType === 'line', // Relleno solo si es línea
                            borderRadius: 4,
                            tension: 0.3 // Curva suave para líneas
                        }], 
                        vizType as 'bar' | 'line'
                    );
                    break;
            }

            // 2. Crear el Widget Dinámico
            const newWidget: DynamicWidget = {
                id: Date.now().toString(),
                title: `IA: ${labelMetric} por ${config.dimensions.join(', ')}`,
                type: widgetType, // 'bar', 'kpi', 'table', etc.
                config: widgetConfig,
                rawQuery: config,
                timestamp: Date.now()
            };

            filterStore.addDynamicWidget(newWidget);
            isReportActive.value = true;

            // 3. Generar Insight (Micro-resumen)
            // Solo para gráficos y tablas, los KPIs suelen explicarse solos
            if (vizType !== 'kpi') {
                const dataSample = data.slice(0, 15); 
                const promptInsight = `Describe brevemente la tendencia, valor más alto o distribución. Máx 20 palabras.`;
                const insightText = await picApi.getDataInsights(dataSample, promptInsight);
                message.text = `${message.text}\n\n💡 ${insightText}`;
            }

        } catch (error: any) {
            console.error("❌ Error visualizando/analizando:", error);
            message.text += "\n\n(Error al generar la visualización).";
        } finally {
            isLoading.value = false;
        }
    }

    return {
        messages,
        isLoading,
        activeContext,
        isReportActive,
        initChat,
        sendMessage,
        clearChat,
        visualizeData,
        setContext,
        clearContext,

        selectedModel, 
        setModel
    };
});
```

# src\modules\PIC\stores\picFilterStore.ts

```ts
import { defineStore } from 'pinia';
import { ref, reactive } from 'vue';
import { picApi } from '../services/picApi';
import type { PicFilterOptions } from '../types/picTypes';

export const usePicFilterStore = defineStore('picFilter', () => {
    // 1. ESTADO: Opciones disponibles para llenar los selects
    const options = reactive<PicFilterOptions>({
        canales: [],
        gerencias: [],
        marcas: [],
        anios: [],
        transacciones: [],
        formatosCliente: []
    });

    // Opciones dependientes (se llenan dinámicamente)
    const depOptions = reactive({
        jefaturas: [] as string[],
        rutas: [] as string[],
        grupos: [] as string[],
        categorias: [] as string[],
        skus: [] as string[]
    });

    // 2. ESTADO: Selecciones del usuario
    const selected = reactive({
        canal: [] as string[],
        Gerencia: [] as string[],
        Jefatura: [] as string[],
        Ruta: [] as string[],
        Marca: [] as string[],
        grupo: [] as string[],
        Categorias: [] as string[],
        SKU: [] as string[],
        Anio: [] as string[],
        Transaccion: ['Venta', 'Metas', 'NC'], // Default legacy
        FormatoCliente: [] as string[],
        MesInicial: '1',
        MesFinal: '12'
    });

    // Almacén para las tablas
    const projectionData = reactive({
        familias: [] as any[],
        marcas: [] as any[],
        gerencia: [] as any[],
        zona: [] as any[],
        canal: [] as any[],
        clientes: [] as any[],
        articulos: [] as any[]
    });
    const isLoading = ref(false);
    
    const reportData = ref<any[]>([]); // Datos crudos de la API
    const isGenerating = ref(false);   // Loading específico del botón generar

    const isComparisonFrozen = ref(true); //Candado de comparación - por defecto activado. 
    const selectedClients = reactive(new Map<string, string>());
    const loadingProjections = reactive<Record<string, boolean>>({});

    const dynamicWidgets = ref<DynamicWidget[]>([]);



    // 3. ACCIONES

    // Carga inicial (al montar el componente)
    async function initFilters() {
        isLoading.value = true;
        try {
            const data = await picApi.getInitialFilters();
            Object.assign(options, data);
            
            // Lógica Legacy: Seleccionar los últimos 3 años por defecto
            if (options.anios.length > 0) {
                const sortedYears = [...options.anios].sort();
                selected.Anio = sortedYears.slice(-3);
            }
        } catch (error) {
            console.error("Error cargando filtros iniciales", error);
        } finally {
            isLoading.value = false;
        }
    }

    // --- CASCADAS ---

    // Cuando cambia GERENCIA
    async function handleGerenciaChange() {
        // 1. Limpiar hijos
        selected.Jefatura = [];
        selected.Ruta = [];
        depOptions.jefaturas = [];
        depOptions.rutas = [];

        // 2. Si hay selección, buscar nuevos datos
        if (selected.Gerencia.length > 0) {
            const data = await picApi.getDependentOptions('jefaturas', { Gerencia: selected.Gerencia });
            depOptions.jefaturas = data;
        }
    }

    // Cuando cambia JEFATURA
    async function handleJefaturaChange() {
        selected.Ruta = [];
        depOptions.rutas = [];

        if (selected.Jefatura.length > 0) {
            const data = await picApi.getDependentOptions('rutas', { Jefatura: selected.Jefatura });
            depOptions.rutas = data;
        }
    }

    // Cuando cambia MARCA
    async function handleMarcaChange() {
        selected.grupo = [];
        selected.Categorias = [];
        selected.SKU = [];
        depOptions.grupos = [];
        depOptions.categorias = [];
        depOptions.skus = [];

        if (selected.Marca.length > 0) {
            const [grupos, skus] = await Promise.all([
                picApi.getDependentOptions('grupos', { Marca: selected.Marca }),
                picApi.getDependentOptions('skus', { Marca: selected.Marca })
            ]);
            depOptions.grupos = grupos;
            depOptions.skus = skus;
        }
    }

    // Cuando cambia GRUPO
    async function handleGrupoChange() {
        selected.Categorias = [];
        // Nota: SKU se recarga filtrado por Marca + Grupo
        selected.SKU = []; 
        depOptions.categorias = [];

        if (selected.grupo.length > 0) {
            const [categorias, skus] = await Promise.all([
                picApi.getDependentOptions('categorias', { Marca: selected.Marca, grupo: selected.grupo }),
                picApi.getDependentOptions('skus', { Marca: selected.Marca, grupo: selected.grupo })
            ]);
            depOptions.categorias = categorias;
            depOptions.skus = skus;
        } else {
            // Si deselecciono grupo, recargar SKUs solo por Marca
            if (selected.Marca.length > 0) {
                depOptions.skus = await picApi.getDependentOptions('skus', { Marca: selected.Marca });
            }
        }
    }

    // NUEVA ACCIÓN: Generar Reporte (CORREGIDA)
    async function generateReport() {
        isGenerating.value = true;
        try {
             // 1. Limpiar proyecciones anteriores (CRÍTICO para consistencia)
            Object.keys(projectionData).forEach(key => {
                projectionData[key as keyof typeof projectionData] = [];
            });

            // 1. Construir filtros limpios para la API
            const apiFilters: Record<string, any> = {};
            
            // Mapeo de filtros UI -> API Columns
            const mappings: Record<string, string> = {
                'Transaccion': 'TRANSACCION',
                'FormatoCliente': 'formatocte',
                'grupo': 'grupo',
                'Categorias': 'Categorias',
                'SKU': 'SKU_NOMBRE'
            };

            // A. Agregar filtros estándar (Dropdowns)
            for (const key in selected) {
                const val = selected[key as keyof typeof selected];
                // Si es un array y tiene valores
                if (Array.isArray(val) && val.length > 0) {
                    const dbKey = mappings[key] || key;
                    // Excluimos mes/año aquí porque se tratan aparte o ya tienen su lógica
                    if(key !== 'MesInicial' && key !== 'MesFinal') {
                         apiFilters[dbKey] = val;
                    }
                }
            }
            
            // B. Agregar rango de meses
            apiFilters['MesInicial'] = selected.MesInicial;
            apiFilters['MesFinal'] = selected.MesFinal;

            // C. AGREGRAR CLIENTES SELECCIONADOS (¡ESTO FALTABA!)
            if (selectedClients.size > 0) {
                // Convertimos las llaves del Map (IDs) a un Array simple
                apiFilters['IDCLIENTE'] = Array.from(selectedClients.keys());
                console.log("Filtro de clientes aplicado:", apiFilters['IDCLIENTE']);
            }

            // 2. Llamada a la API
            // Nota: El backend en 'picController.js' ya está programado para recibir 'IDCLIENTE'
            // y filtrar por la columna [IDCLIENTE] IN (...)
            const data = await picApi.getDashboardData(apiFilters, ['Año', 'Mes']);
            reportData.value = data;
            
            return true; // Éxito

        } catch (error) {
            console.error("Error generando reporte:", error);
            return false;
        } finally {
            isGenerating.value = false;
        }
    }

    // --- NUEVA ACCIÓN: CARGA BAJO DEMANDA ---
    async function fetchSingleProjection(dimensionKey: string) {
        // Marcamos esta tabla específica como cargando
        loadingProjections[dimensionKey] = true;
        
        try {
            // 1. Reconstruir filtros (Podríamos refactorizar esto a un getter para no repetir código, pero por ahora copiamos la lógica)
            const apiFilters: Record<string, any> = {};
            const mappings: Record<string, string> = {
                'Transaccion': 'TRANSACCION', 'FormatoCliente': 'formatocte',
                'grupo': 'grupo', 'Categorias': 'Categorias', 'SKU': 'SKU_NOMBRE'
            };
            for (const key in selected) {
                const val = selected[key as keyof typeof selected];
                if (Array.isArray(val) && val.length > 0) {
                    const dbKey = mappings[key] || key;
                    if(key !== 'MesInicial' && key !== 'MesFinal') apiFilters[dbKey] = val;
                }
            }
            apiFilters['MesInicial'] = selected.MesInicial;
            apiFilters['MesFinal'] = selected.MesFinal;
            if (selectedClients.size > 0) apiFilters['IDCLIENTE'] = Array.from(selectedClients.keys());

            // 2. Años objetivo
            let yearsTarget = selected.Anio.length > 0 
                ? [...selected.Anio].sort() 
                : (options.anios.length > 0 ? options.anios.slice(-3).sort() : ['2023', '2024', '2025']);

             // --- CAMBIO AQUÍ: Definir límite según la dimensión ---
            let limit: number | undefined = undefined;
            
            // Regla: Clientes y Artículos limitados a Top 50 para rendimiento
            if (dimensionKey === 'clientes' || dimensionKey === 'articulos') {
                limit = 50;
            }

            // 3. Llamada API
            const data = await picApi.getProjection(dimensionKey, apiFilters, yearsTarget, limit);
            
            // 4. Guardar en el slot correspondiente
            // @ts-ignore (Tipado dinámico rápido)
            projectionData[dimensionKey] = data;

        } catch (e) {         
            console.error(`Error cargando proyección ${dimensionKey}`, e);
        } finally {
            loadingProjections[dimensionKey] = false;
        }
    }
    
    //Toggle Candado
    function toggleComparisonLock() {
        isComparisonFrozen.value = !isComparisonFrozen.value;
    }

     // ACCIONES DE CLIENTES
    function toggleClientSelection(id: string, name: string) {
        if (selectedClients.has(id)) {
            selectedClients.delete(id);
        } else {
            selectedClients.set(id, name);
        }
    }

    function clearSelectedClients() {
        selectedClients.clear();
    }

    // Helper para formatear filtros para la API de Clientes
    // (Excluye mes/año porque los clientes son entidades estáticas, no transaccionales)
    function getFiltersForClientSearch() {
        const apiFilters: Record<string, any> = {};
        
        // Mapeo manual de lo que espera el backend vs lo que tenemos
        // Basado en filterController.js: allowedFilterColumns
        const keys = ['canal', 'Gerencia', 'Jefatura', 'Ruta', 'FormatoCliente'];
        const backendKeys: Record<string, string> = { 'FormatoCliente': 'formatocte' };

        keys.forEach(key => {
            const val = selected[key as keyof typeof selected];
            if (Array.isArray(val) && val.length > 0) {
                const dbKey = backendKeys[key] || key;
                apiFilters[dbKey] = val;
            }
        });
        return apiFilters;
    }
     function resetFilters() {
        // 1. Limpiar arrays de selección
        selected.canal = [];
        selected.Gerencia = [];
        selected.Jefatura = [];
        selected.Ruta = [];
        selected.Marca = [];
        selected.grupo = [];
        selected.Categorias = [];
        selected.SKU = [];
        selected.FormatoCliente = [];
        
        // 2. Restaurar Defaults
        selected.Transaccion = ['Venta', 'Metas', 'NC'];
        selected.MesInicial = '1';
        selected.MesFinal = '12';

        // 3. Restaurar Años (Últimos 3)
        if (options.anios.length > 0) {
            const sortedYears = [...options.anios].sort();
            selected.Anio = sortedYears.slice(-3);
        } else {
            selected.Anio = [];
        }

        // 4. Limpiar Clientes
        selectedClients.clear();

        // 5. Limpiar opciones dependientes (Cascada)
        depOptions.jefaturas = [];
        depOptions.rutas = [];
        depOptions.grupos = [];
        depOptions.categorias = [];
        depOptions.skus = [];
    }

    function addDynamicWidget(widget: DynamicWidget) {
    // Agregamos al inicio para que se vea luego luego
    dynamicWidgets.value.unshift(widget);
    
    // Opcional: Limitar a máximo 5 gráficos dinámicos para no saturar memoria
    if (dynamicWidgets.value.length > 5) {
        dynamicWidgets.value.pop();
    }
   }

   function removeDynamicWidget(id: string) {
      dynamicWidgets.value = dynamicWidgets.value.filter(w => w.id !== id);
   }

   function clearDynamicWidgets() {
      dynamicWidgets.value = [];
   }

    return {

        selectedClients,
        toggleClientSelection,
        clearSelectedClients,
        getFiltersForClientSearch, 
        
        resetFilters,

        isComparisonFrozen, 
        toggleComparisonLock,
        
        reportData,
        projectionData,     // Datos de tablas
        loadingProjections, // Estado de carga individual
        fetchSingleProjection, // Acción nueva
        
        isGenerating,
        generateReport,
        
        options,
        depOptions,
        selected,
        isLoading,
        initFilters,
        handleGerenciaChange,
        handleJefaturaChange,
        handleMarcaChange,
        handleGrupoChange,

        dynamicWidgets,
        addDynamicWidget,
        removeDynamicWidget,
        clearDynamicWidgets
    };
});
```

# src\modules\PIC\types\picTypes.ts

```ts
// Interfaces para el manejo de datos del Reporte PIC

// Estructura de un registro crudo que viene de la API (basevPic)
// NOTA: Mapeamos las columnas principales usadas en los gráficos
export interface PicDataPoint {
    Gerencia?: string;
    Zona?: string;
    Jefatura?: string;
    Ruta?: string;
    canal?: string;
    Año: string; // La API a veces devuelve string o number, estandarizamos al usarlo
    Mes: number;
    SKU_NOMBRE?: string;
    Marca?: string;
    Categorias?: string;
    grupo?: string;
    
    // Métricas
    TotalVentaKG?: number;
    TotalVentaPesos?: number;
    TotalMetasKG?: number;
    PromedioPrecio?: number; // Calculado o venido de endpoint específico
}

// Estructura para los Filtros Disponibles (Dropdowns)
export interface PicFilterOptions {
    canales: string[];
    gerencias: string[];
    marcas: string[];
    anios: string[];
    transacciones: string[];
    formatosCliente: string[];
}

// Estructura de la respuesta del Chat IA (Híbrida)
export interface AiQueryConfig {
    metric: 'VENTA_KG' | 'VENTA_$$' | 'METAS_KG';
    dimensions: string[];
    filters: Record<string, string | string[]>;
    visualization: 'bar' | 'line' | 'pie' | 'doughnut' | 'table' | 'kpi'; 
   }

export interface AiChatResponse {
    explanation: string;
    queryConfig: AiQueryConfig | null;
    // type?: 'text' | 'data_query'; esto si lo usas en el UI
}

// Tipo para el estado de los filtros seleccionados en la UI
export interface PicActiveFilters {
    [key: string]: Set<string> | string | null;
    // Específicos
    MesInicial: string;
    MesFinal: string;
    Anio: Set<string>;
    // Genéricos (Gerencia, Marca, etc...)
}

// Estructura para un Gráfico Dinámico generado por IA
export interface DynamicWidget {
    id: string;
    title: string;
    // CAMBIO: Ampliamos los tipos visuales del widget local
    type: 'bar' | 'line' | 'pie' | 'doughnut' | 'table' | 'kpi';
    config: any; // Para Chart.js o datos crudos (en caso de table/kpi)
    rawQuery: AiQueryConfig;
    timestamp: number;
}

// Estructura para las Chips de Sugerencia (Propuesta A)
export interface AiSuggestionChip {
    label: string;
    prompt: string; // Lo que se enviará al chat al hacer clic
    icon?: string;
}
```

# src\modules\PIC\utils\formatters.ts

```ts
/* src/modules/PIC/utils/formatters.ts */

/**
 * Formatea un número como moneda (Pesos MXN).
 * Ej: 12500.50 -> $12,500.50
 */
export const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value);
};

/**
 * Formatea un número con separadores de miles (para Kilos).
 * Ej: 45000 -> 45,000
 */
export const formatNumber = (value: number) => {
    return new Intl.NumberFormat('es-MX', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    }).format(value);
};
```

# src\modules\PIC\utils\picUtils.ts

```ts
/* src/modules/PIC/utils/picUtils.ts */
import { formatCurrency, formatNumber } from './formatters';

// Constantes visuales
export const CHART_COLORS = ['#2563eb', '#9333ea', '#db2777', '#f97316', '#16a34a', '#0891b2', '#facc15'];
export const CHART_COLORS_GREEN = ['#22c55e', '#16a34a', '#15803d', '#14532d'];
export const MONTH_NAMES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

// Re-exportamos para que los componentes puedan usarlos desde aquí si quieren
export { formatCurrency, formatNumber };

/**
 * Pivotea los datos planos de la API para organizarlos por Mes y Año.
 */
export function processChartData(rawData: any[], years: string[], metricType: 'pesos' | 'kilos' | 'promedio') {
    const processed = new Array(12).fill(null).map((_, i) => ({   
        nombre: MONTH_NAMES[i],
        mesIndex: i + 1,
        // Inicializamos cada año en 0
        ...years.reduce((acc, year) => ({ ...acc, [year]: 0, [`meta_${year}`]: 0 }), {})
    }));

    // Llenado de datos
    rawData.forEach(item => {
        const mesIdx = parseInt(item.Mes) - 1;
        const anio = String(item.Año);
        
        if (processed[mesIdx] && years.includes(anio)) {
            const row = processed[mesIdx] as any;
            
            if (metricType === 'pesos') {
                row[anio] = item.TotalVentaPesos || 0;
            } else if (metricType === 'kilos') {
                row[anio] = item.TotalVentaKG || 0;
                row[`meta_${anio}`] = item.TotalMetasKG || 0;
            } else if (metricType === 'promedio') {
                // Cálculo seguro del promedio
                const venta = item.TotalVentaPesos || 0;
                const kilos = item.TotalVentaKG || 0;
                row[anio] = kilos !== 0 ? venta / kilos : 0;
            }
        }
    });

    return processed;
}

/**
 * Genera la configuración para Chart.js con escalas inteligentes y seguras.
 */
export function getChartConfig(labels: string[], datasets: any[], type: 'bar' | 'line' = 'bar') {
    
    // 1. APLANAR DATOS: Obtenemos todos los valores numéricos de todos los datasets para analizarlos
    const allValues = datasets.flatMap(ds => ds.data).filter(v => v !== null && v !== undefined);
    
    const minVal = Math.min(...allValues);
    const maxVal = Math.max(...allValues);
    const range = maxVal - minVal;
    
    // 2. CÁLCULO DE GRACE (MARGEN): 25% del rango
    const graceVal = range * 0.25;

    // 3. DECISIÓN DE PISO (La lógica "Que no floten")
    // Si al restar el margen (grace) al valor más bajo, cruzamos el cero...
    // ...entonces FORZAMOS el inicio en 0 para evitar el eje negativo (-500k).
    // Si no cruzamos el cero (ej: ventas de 2M a 2.5M), dejamos que el zoom actúe.
    let forcedMin = undefined;
    
    if (minVal >= 0 && (minVal - graceVal) < 0) {
        forcedMin = 0; // Anclar al piso si el margen nos llevaría a negativos
    }

    return {
        type,
        data: { labels, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top' as const },
                tooltip: { 
                    mode: 'index' as const,
                    intersect: false,
                    callbacks: {
                        label: function(context: any) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                if (context.dataset.label.includes('KG') || context.dataset.label.includes('Meta')) {
                                    label += formatNumber(context.parsed.y) + ' KG';
                                } else {
                                    label += formatCurrency(context.parsed.y);
                                }
                            }
                            return label;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: false, // Siempre intentamos hacer zoom...
                    min: forcedMin,     // ...pero respetamos el piso 0 si es necesario.
                    grace: '25%',       // Mantenemos el aire visual arriba/abajo.
                    
                    grid: { color: '#f1f5f9' },
                    ticks: {
                        callback: function(value: any) {
                            if (value >= 1000000) return (value/1000000).toFixed(1) + 'M';
                            if (value >= 1000) return (value/1000).toFixed(0) + 'k';
                            return value;
                        }
                    }
                },
                x: {
                    grid: { display: false }
                }
            }
        }
    };
}
/* Calcula la estructura completa para una tabla de datos (Filas + Totales + Comparativas)*/

export function calculateTableData(
    processedData: any[], 
    years: string[], 
    metricType: 'pesos' | 'kilos' | 'promedio',
    isFrozen: boolean
) {
    // Ordenar años ascendente
    const sortedYears = [...years].sort();
    const currentYear = sortedYears[sortedYears.length - 1]; // Año más reciente
    const prevYear = sortedYears.length > 1 ? sortedYears[sortedYears.length - 2] : null;
    
    // Fecha actual para lógica de candado
    const today = new Date();
    const currentMonthIdx = today.getMonth() + 1; // 1-12
    const currentRealYear = today.getFullYear();

    // 1. Acumuladores para el Footer
    const totals: Record<string, number> = {};
    sortedYears.forEach(y => totals[y] = 0);
    if (metricType === 'kilos') totals[`meta_${currentYear}`] = 0;

    // 2. Procesar Filas
    const rows = processedData.map(row => {
        const rowData: any = { ...row };
        const isCurrentMonth = String(currentYear) === String(currentRealYear) && row.mesIndex === currentMonthIdx;
        const isFutureMonth = String(currentYear) === String(currentRealYear) && row.mesIndex > currentMonthIdx;

        // Sumar totales
        sortedYears.forEach(y => {
            const val = row[y] || 0;
            // Para promedio, no sumamos tal cual, pero por ahora sumaremos para sacar avg al final si es necesario
            // Ojo: El footer de promedio se calcula distinto (Promedio de promedios o Global).
            // Para simplificar, sumamos valores y luego ajustamos en el footer.
            totals[y] += val; 
            
            if (metricType === 'kilos' && String(y) === String(currentYear)) {
                totals[`meta_${y}`] += (row[`meta_${y}`] || 0);
            }
        });

        // Lógica de Comparativa (Solo si hay año anterior)
        if (prevYear) {
            // Si es mes futuro o (es mes actual Y está congelado), no mostramos diff
            const shouldHideDiff = isFutureMonth || (isCurrentMonth && isFrozen);

            if (shouldHideDiff) {
                rowData.diff = null;
                rowData.growth = null;
                rowData.diffMeta = null;
                rowData.varMeta = null;
            } else {
                const valCurr = row[currentYear] || 0;
                const valPrev = row[prevYear] || 0;
                
                rowData.diff = valCurr - valPrev;
                rowData.growth = valPrev !== 0 ? (rowData.diff / valPrev) * 100 : 0;

                if (metricType === 'kilos') {
                    const meta = row[`meta_${currentYear}`] || 0;
                    rowData.diffMeta = valCurr - meta;
                    rowData.varMeta = meta !== 0 ? (valCurr / meta) * 100 : 0;
                }
            }
        }
        return rowData;
    });

    // 3. Calcular Footer Comparativo
    const footer: any = { ...totals };
    if (prevYear) {
        const totalCurr = totals[currentYear];
        const totalPrev = totals[prevYear];
        
        // Ajuste para Promedio: El total no es la suma, es el promedio global (recalculado idealmente)
        // Nota: Si metricType es promedio, el total aquí es la suma de promedios (incorrecto). 
        // Para v2.1 simplificado, dividiremos por 12 o meses activos, o lo dejaremos como suma si la API no da el dato.
        // *Mejor estrategia:* Si es promedio, recalculamos el footer dividiendo por el conteo de meses con datos.
        
        if (metricType === 'promedio') {
            let countCurr = 0, countPrev = 0;
            rows.forEach(r => { if(r[currentYear] > 0) countCurr++; if(r[prevYear] > 0) countPrev++; });
            footer[currentYear] = countCurr > 0 ? footer[currentYear] / countCurr : 0;
            footer[prevYear] = countPrev > 0 ? footer[prevYear] / countPrev : 0;
        }

        const finalCurr = footer[currentYear];
        const finalPrev = footer[prevYear];

        footer.diff = finalCurr - finalPrev;
        footer.growth = finalPrev !== 0 ? (footer.diff / finalPrev) * 100 : 0;

        if (metricType === 'kilos') {
            const totalMeta = totals[`meta_${currentYear}`];
            footer.diffMeta = totalCurr - totalMeta;
            footer.varMeta = totalMeta !== 0 ? (totalCurr / totalMeta) * 100 : 0;
        }
    }

    return { rows, footer, sortedYears, currentYear, prevYear };
}

/* Calcula los totales anuales para gráficos simples.*/

export function processAnnualData(rawData: any[], years: string[], metricType: 'pesos' | 'kilos' | 'promedio') {
    // Inicializar acumuladores por año
    const totals: Record<string, number> = {};
    years.forEach(y => totals[y] = 0);

    // Sumarizar
    rawData.forEach(item => {
        const anio = String(item.Año);
        if (years.includes(anio)) {
            if (metricType === 'pesos') {
                totals[anio] += (item.TotalVentaPesos || 0);
            } else if (metricType === 'kilos') {
                totals[anio] += (item.TotalVentaKG || 0);
            } else if (metricType === 'promedio') {
                // Para promedio anual necesitamos acumuladores auxiliares, no se pueden sumar promedios
                // Pero como rawData ya viene desagregado, necesitamos lógica extra. 
                // TRUCO: Usaremos acumuladores de ventas y kilos temporales
                if (!totals[`_ventas_${anio}`]) totals[`_ventas_${anio}`] = 0;
                if (!totals[`_kilos_${anio}`]) totals[`_kilos_${anio}`] = 0;
                
                totals[`_ventas_${anio}`] += (item.TotalVentaPesos || 0);
                totals[`_kilos_${anio}`] += (item.TotalVentaKG || 0);
            }
        }
    });

    // Calcular valores finales para el array de datos
    return years.map(year => {
        if (metricType === 'promedio') {
            const v = totals[`_ventas_${year}`] || 0;
            const k = totals[`_kilos_${year}`] || 0;
            return k !== 0 ? v / k : 0;
        }
        return totals[year];
    });
}

/**
 * Genera configuración específica para gráficos circulares (Pie/Doughnut).
 * No tienen ejes cartesianos (X/Y).
 */
export function getPieConfig(labels: string[], datasets: any[], type: 'pie' | 'doughnut' = 'doughnut') {
    return {
        type,
        data: { labels, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { 
                    position: 'right' as const,
                    labels: { boxWidth: 12, font: { size: 11 } }
                },
                tooltip: { 
                    callbacks: {
                        label: function(context: any) {
                            let label = context.label || '';
                            if (label) label += ': ';
                            if (context.parsed !== null) {
                                // Detectar si es dinero o número por el dataset label o contexto
                                // Por defecto formateamos bonito
                                const val = context.parsed;
                                label += val >= 1000 ? new Intl.NumberFormat('es-MX').format(val) : val;
                            }
                            return label;
                        }
                    }
                }
            },
            // Sin escalas X/Y
        }
    };
}
```

# src\modules\PIC\views\PicDashboardView.vue

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { usePicFilterStore } from '../stores/picFilterStore';
import PicChat from '../components/PicChat.vue';
import PicFilters from '../components/PicFilters.vue';
import PicGrid from '../components/PicGrid.vue'; 
import ExecutiveSummaryCard from '../components/ExecutiveSummaryCard.vue'; // <--- IMPORTAR

const store = usePicFilterStore();
const isReportActive = ref(false);

const handleGenerate = async () => {
    const success = await store.generateReport();
    if (success) {
        isReportActive.value = true;
    }
};
</script>

<template>
    <div class="flex h-screen overflow-hidden bg-slate-100">
        
        <div class="flex-1 flex flex-col relative overflow-hidden">
            
            <PicFilters v-if="isReportActive" />
            
            <header v-else class="h-16 bg-white border-b border-slate-200 flex items-center px-8 justify-between shrink-0">
                <h1 class="text-xl font-bold text-slate-800">Reporte PIC <span class="text-xs font-normal text-slate-400 ml-2">v2.1</span></h1>
            </header>

            <main class="flex-1 overflow-y-auto p-8 relative">
                
                <div v-if="!isReportActive" class="flex h-full items-center justify-center">
                    <div class="text-center max-w-lg">
                        <div class="w-20 h-20 bg-white rounded-3xl shadow-sm border border-slate-100 flex items-center justify-center mx-auto mb-6">
                            <i class="fa-solid fa-chart-pie text-4xl text-brand-500"></i>
                        </div>
                        <h2 class="text-2xl font-bold text-slate-800 mb-2">Generador de Reportes</h2>
                        <p class="text-slate-500 mb-8">
                            Utiliza el panel de filtros o consulta a la IA para visualizar el rendimiento de ventas y metas.
                        </p>
                        
                        <button 
                            @click="handleGenerate"
                            :disabled="store.isGenerating"
                            class="bg-brand-600 hover:bg-brand-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-brand-500/20 transition-transform active:scale-95 flex items-center gap-2 mx-auto disabled:opacity-70 disabled:cursor-not-allowed disabled:scale-100"
                        >
                            <i v-if="store.isGenerating" class="fa-solid fa-circle-notch fa-spin"></i>
                            <span v-else>
                                <i class="fa-solid fa-bolt"></i> Generar Reporte 
                            </span>
                        </button>
                    </div>
                </div>

                <div v-else class="pb-20">
                    <ExecutiveSummaryCard />
                    
                    <PicGrid />
                </div>

            </main>
        </div>

        <PicChat />

    </div>
</template>
```

# src\modules\Setup\components\tables\ModulesTable.ts

```ts

```

# src\modules\Setup\services\setupApi.ts

```ts
import api from '@/api/axios';
import type { SystemModule } from '../types/setupTypes';

export default {

   /**
    * Obtiene todos los módulos del sistema (activos e inactivos)
    * Backend: SELECT * FROM SysModulesIC ORDER BY DisplayOrder ASC
    */
   async getModules(): Promise<SystemModule[]> {
      const { data } = await api.get('/setup/modules');
      // Ajusta según la estructura de tu respuesta (data.data, data.result, etc.)
      return data.data || data;
   },

   /**
    * Activa/Desactiva un módulo
    */
   async toggleModuleStatus(moduleId: number, isActive: boolean): Promise<void> {
      await api.patch(`/setup/modules/${moduleId}`, { IsActive: isActive });
   },

   /**
    * Actualiza la configuración de un módulo
    */
   async updateModule(moduleId: number, payload: Partial<SystemModule>): Promise<void> {
      await api.patch(`/setup/modules/${moduleId}`, payload);
   }
};

```

# src\modules\Setup\setup.md

```md
src/modules/Setup/
├── components/
│   └── tables/
│       └── ModulesTable.vue    # Tabla para activar/desactivar módulos
├── services/
│   └── setupApi.ts             # Endpoints: getModules, toggleModule
├── stores/
│   └── setupStore.ts           # State: lista de módulos globales
├── types/
│   └── setupTypes.ts           # Interfaces
└── views/
    └── SystemConfigView.vue    # Vista principal de configuración
```

# src\modules\Setup\stores\setupStores.ts

```ts
// src/modules/Setup/stores/setupStore.ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import setupApi from '../services/setupApi';
import type { SystemModule } from '../types/setupTypes';
import { useAuthStore } from '@/modules/Auth/views/stores/authStore';
import { ROLE_LEVELS } from '../types/setupTypes';

export const useSetupStore = defineStore('setup', () => {
   const modules = ref<SystemModule[]>([]);
   const isLoading = ref(false);
   const authStore = useAuthStore();

   // Datos Mock para desarrollo (Fallback)
   const MOCK_MODULES: SystemModule[] = [
      // Analítica
      { ModuleId: 1, ModuleKey: 'HUB', Label: 'Hub Central', Route: '/', Icon: 'fa-solid fa-chart-simple', Category: 'Analítica', DisplayOrder: 10, IsActive: true, MinRoleLevel: 1, DevStatus: 'Finished' },
      { ModuleId: 2, ModuleKey: 'PIC_RPT', Label: 'Reporte PIC', Route: '/admin/pic', Icon: 'fa-solid fa-chart-pie', Category: 'Analítica', DisplayOrder: 20, IsActive: true, MinRoleLevel: 1, DevStatus: 'Maintaining' },
      { ModuleId: 3, ModuleKey: 'LOGISTICS', Label: 'Logística', Route: '/admin/pic-logistics', Icon: 'fa-solid fa-route', Category: 'Analítica', DisplayOrder: 30, IsActive: true, MinRoleLevel: 1, DevStatus: 'Development' },
      { ModuleId: 4, ModuleKey: 'FORECAST', Label: 'Forecast', Route: '/admin/pic-forecast', Icon: 'fa-solid fa-arrow-trend-up', Category: 'Analítica', DisplayOrder: 40, IsActive: true, MinRoleLevel: 1, DevStatus: 'Development' },

      // Gestión
      { ModuleId: 5, ModuleKey: 'USERS', Label: 'Usuarios', Route: '/admin/users', Icon: 'fa-solid fa-users', Category: 'Gestión', DisplayOrder: 50, IsActive: true, MinRoleLevel: 3, DevStatus: 'Finished' }, // Admin only
      { ModuleId: 6, ModuleKey: 'PRODUCTS', Label: 'Productos', Route: '/admin/products', Icon: 'fa-solid fa-boxes-stacked', Category: 'Gestión', DisplayOrder: 60, IsActive: true, MinRoleLevel: 2, DevStatus: 'Finished' },
      { ModuleId: 7, ModuleKey: 'CLIENTS', Label: 'Clientes', Route: '/admin/clients', Icon: 'fa-solid fa-store', Category: 'Gestión', DisplayOrder: 70, IsActive: true, MinRoleLevel: 2, DevStatus: 'Development' },
      { ModuleId: 8, ModuleKey: 'VAL_CLI', Label: 'Validación Clientes', Route: '/admin/clients-validation', Icon: 'fa-solid fa-user-check', Category: 'Gestión', DisplayOrder: 80, IsActive: true, MinRoleLevel: 2, DevStatus: 'Development' },

      // Sistema
      { ModuleId: 9, ModuleKey: 'AUDIT', Label: 'Auditoría', Route: '/admin/audit', Icon: 'fa-solid fa-shield-cat', Category: 'Sistema', DisplayOrder: 90, IsActive: true, MinRoleLevel: 3, DevStatus: 'Maintaining' },
      { ModuleId: 10, ModuleKey: 'SETUP', Label: 'Setup', Route: '/admin/setup', Icon: 'fa-solid fa-gear', Category: 'Sistema', DisplayOrder: 100, IsActive: true, MinRoleLevel: 3, DevStatus: 'Finished' },
   ];

   // 1. Fetch de módulos
   async function fetchModules() {
      isLoading.value = true;
      try {
         modules.value = await setupApi.getModules();
      } catch (error) {
         console.warn("⚠️ API Backend no disponible. Usando datos Mock para 'Setup'.");
         modules.value = MOCK_MODULES;
      } finally {
         isLoading.value = false;
      }
   }

   // 2. Computed: Menú filtrado para el usuario actual
   const userMenu = computed(() => {
      // Normalizar rol del usuario actual
      const userRoleStr = authStore.user?.role || 'User';
      // Obtener nivel numérico (1=User, 2=General, 3=Admin)
      const userLevel = ROLE_LEVELS[userRoleStr] || 1;

      return modules.value
         .filter(m => m.IsActive)                   // Solo módulos activos globalmente
         .filter(m => m.MinRoleLevel <= userLevel)  // Solo si tengo nivel suficiente
         .sort((a, b) => a.DisplayOrder - b.DisplayOrder); // Ordenados por DisplayOrder
   });

   // 3. Computed: Agrupado por Categoría (para el sidebar)
   const groupedMenu = computed(() => {
      // Definimos el orden deseado de las categorías
      const categoryOrder = ['Analítica', 'Gestión', 'Sistema', 'Otro'];

      const groups: Record<string, SystemModule[]> = {};

      // Agrupar
      userMenu.value.forEach(m => {
         const cat = m.Category || 'Otro';
         if (!groups[cat]) groups[cat] = [];
         groups[cat].push(m);
      });

      // Retornar objeto ordenado por keys específicas
      const orderedGroups: Record<string, SystemModule[]> = {};
      categoryOrder.forEach(cat => {
         if (groups[cat] && groups[cat].length > 0) {
            orderedGroups[cat] = groups[cat];
         }
      });

      // Añadir cualquier otra categoría que no esté en la lista predefinida
      Object.keys(groups).forEach(key => {
         if (!orderedGroups[key]) {
            orderedGroups[key] = groups[key]!;
         }
      });

      return orderedGroups;
   });

   // 4. Acción Admin: Cambiar estado (Toggle)
   async function toggleModuleStatus(moduleId: number, currentStatus: boolean) {
      const originalState = modules.value.find(m => m.ModuleId === moduleId)?.IsActive;
      try {
         // UI Optimista: cambiar inmediatamente
         const mod = modules.value.find(m => m.ModuleId === moduleId);
         if (mod) mod.IsActive = !currentStatus;

         await setupApi.toggleModuleStatus(moduleId, !currentStatus);
         return true;
      } catch (e) {
         console.error("Error actualizando módulo", e);
         // Revertir en caso de error
         const mod = modules.value.find(m => m.ModuleId === moduleId);
         if (mod) mod.IsActive = originalState ?? currentStatus;
         return false;
      }
   }

   // 5. Acción Admin: Actualizar Módulo Completo
   async function updateModule(moduleId: number, changes: Partial<SystemModule>) {
      const index = modules.value.findIndex(m => m.ModuleId === moduleId);
      if (index === -1) return false;

      const targetModule = modules.value[index];
      if (!targetModule) return false;

      // Hacemos una copia 'segura' tipada
      const original: SystemModule = { ...targetModule };

      try {
         // UI Optimista
         Object.assign(targetModule, changes);

         await setupApi.updateModule(moduleId, changes);
         return true;
      } catch (e) {
         console.error("Error actualizando módulo", e);
         // Revertir
         modules.value[index] = original;
         return false;
      }
   }

   return {
      modules,
      isLoading,
      userMenu,
      groupedMenu,
      fetchModules,
      toggleModuleStatus,
      updateModule
   };
});
```

# src\modules\Setup\types\setupTypes.ts

```ts
export interface SystemModule {

   ModuleId: number;
   ModuleKey: string;
   Label: string;
   Route: string;
   Icon: string;
   Description?: string;
   MinRoleLevel: number;
   IsActive: boolean;
   DisplayOrder: number;
   Category: 'Analítica' | 'Gestión' | 'Sistema' | 'Otro';
   DevStatus?: 'Finished' | 'Maintaining' | 'Development';
}

export type DevStatus = 'Finished' | 'Maintaining' | 'Development';

//Mapeo para traducir tus roles de string a número

export const ROLE_LEVELS: Record<string, number> = {

   'User': 1,
   'General': 2,
   'Admin': 3,

   //Alias
   'user': 1,
   'general': 2,
   'admin': 3,

};


```

# src\modules\Setup\views\SystemConfigView.vue

```vue
<script setup lang="ts">
import { ref, computed } from 'vue';
import { useSetupStore } from '../stores/setupStores';
import { useAuthStore } from '@/modules/Auth/views/stores/authStore';
import type { SystemModule, DevStatus } from '../types/setupTypes';

const setupStore = useSetupStore();
const authStore = useAuthStore();

// Permissions
const isAdmin = computed(() => (authStore.user?.role === 'Admin'));

// Edit Modal State
const showModal = ref(false);
const editingModule = ref<SystemModule | null>(null);
const form = ref<Partial<SystemModule>>({});

const openEdit = (mod: SystemModule) => {
    editingModule.value = mod;
    form.value = { ...mod };
    showModal.value = true;
};

const closeEdit = () => {
    showModal.value = false;
    editingModule.value = null;
    form.value = {};
};

const saveEdit = async () => {
    if (editingModule.value && form.value) {
        await setupStore.updateModule(editingModule.value.ModuleId, form.value);
        closeEdit();
    }
};

const getStatusColor = (status: DevStatus | undefined) => {
    switch (status) {
        case 'Finished': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
        case 'Maintaining': return 'bg-amber-100 text-amber-700 border-amber-200';
        case 'Development': return 'bg-blue-100 text-blue-700 border-blue-200';
        default: return 'bg-slate-100 text-slate-600 border-slate-200';
    }
};

const isCritical = (mod: SystemModule) => {
    // Definir módulos críticos que NO se pueden desactivar desde la UI
    // 'HUB' es el dashboard principal, 'SETUP' es este mismo módulo
    const CRITICAL_KEYS = ['HUB', 'SETUP'];
    return CRITICAL_KEYS.includes(mod.ModuleKey);
};

const handleToggle = (mod: SystemModule) => {
    if (isCritical(mod)) return;
    setupStore.toggleModuleStatus(mod.ModuleId, !!mod.IsActive);
};
</script>

<template>
  <div class="h-full overflow-y-auto">
    <div class="p-6 max-w-7xl mx-auto">
    
    <div class="flex items-center justify-between mb-8">
        <div>
            <h1 class="text-2xl font-bold text-slate-800">Configuración del Sistema</h1>
            <p class="text-slate-500">Gestión de módulos, permisos y visibilidad.</p>
        </div>
        <div class="text-right">
             <span class="text-xs px-2 py-1 rounded bg-slate-100 text-slate-500 font-mono">
                Admin Mode: {{ isAdmin ? 'ON' : 'OFF' }}
             </span>
        </div>
    </div>

    <!-- MODULES TABLE -->
    <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div class="overflow-x-auto">
            <table class="w-full text-left text-sm text-slate-600">
                <thead class="bg-slate-50 border-b border-slate-200 text-xs uppercase font-semibold text-slate-500">
                    <tr>
                        <th class="px-6 py-4">Módulo</th>
                        <th class="px-6 py-4">Categoría</th>
                        <th class="px-6 py-4 text-center">Nivel Min.</th>
                        <th class="px-6 py-4 text-center">Estado Dev</th>
                        <th class="px-6 py-4 text-center">Activo</th>
                        <th v-if="isAdmin" class="px-6 py-4 text-right">Acciones</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                    <tr v-for="mod in setupStore.modules" :key="mod.ModuleId" class="hover:bg-slate-50transition-colors">
                        
                        <!-- Module Info -->
                        <td class="px-6 py-4">
                            <div class="flex items-center gap-3">
                                <div class="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 text-lg">
                                    <i :class="mod.Icon"></i>
                                </div>
                                <div>
                                    <p class="font-bold text-slate-800">{{ mod.Label }}</p>
                                    <p class="text-xs text-slate-400 font-mono">{{ mod.ModuleKey }}</p>
                                </div>
                            </div>
                        </td>

                        <!-- Category -->
                        <td class="px-6 py-4">
                            <span class="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                                {{ mod.Category }}
                            </span>
                        </td>

                        <!-- Min Level -->
                        <td class="px-6 py-4 text-center">
                            <span class="font-bold text-slate-700">{{ mod.MinRoleLevel }}</span>
                        </td>

                        <!-- Dev Status -->
                        <td class="px-6 py-4 text-center">
                            <span class="px-3 py-1 rounded-full text-xs font-bold border" :class="getStatusColor(mod.DevStatus)">
                                {{ mod.DevStatus || 'N/A' }}
                            </span>
                        </td>

                        <!-- Active Toggle -->
                        <td class="px-6 py-4 text-center">
                            <div class="flex justify-center">
                                <button 
                                    v-if="isAdmin"
                                    @click="handleToggle(mod)"
                                    :disabled="isCritical(mod)"
                                    class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
                                    :class="[
                                        mod.IsActive ? 'bg-brand-600' : 'bg-slate-200',
                                        isCritical(mod) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                                    ]"
                                    :title="isCritical(mod) ? 'Módulo Crítico (No se puede desactivar)' : 'Alternar Estado'"
                                >
                                    <span 
                                        class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
                                        :class="mod.IsActive ? 'translate-x-6' : 'translate-x-1'"
                                    />
                                </button>
                                <span v-else class="text-xs font-bold" :class="mod.IsActive ? 'text-green-600' : 'text-slate-400'">
                                    {{ mod.IsActive ? 'Sí' : 'No' }}
                                </span>
                            </div>
                        </td>

                        <!-- Actions -->
                        <td v-if="isAdmin" class="px-6 py-4 text-right">
                            <button 
                                @click="openEdit(mod)" 
                                class="text-slate-400 hover:text-brand-600 p-2 rounded-lg hover:bg-brand-50 transition-colors"
                            >
                                <i class="fa-solid fa-pen-to-square"></i>
                            </button>
                        </td>

                    </tr>
                </tbody>
            </table>
        </div>
    </div>

    <!-- EDIT MODAL -->
    <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
        <div class="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            
            <div class="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 class="font-bold text-lg text-slate-800">Editar Módulo</h3>
                <button @click="closeEdit" class="text-slate-400 hover:text-red-500">
                    <i class="fa-solid fa-xmark text-xl"></i>
                </button>
            </div>

            <div class="p-6 space-y-4">
                
                <div>
                    <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Nombre (Label)</label>
                    <input v-model="form.Label" type="text" class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none transition-all">
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Categoría</label>
                        <select v-model="form.Category" class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none bg-white">
                            <option value="Analítica">Analítica</option>
                            <option value="Gestión">Gestión</option>
                            <option value="Sistema">Sistema</option>
                            <option value="Otro">Otro</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Min. Role Level</label>
                        <input v-model="form.MinRoleLevel" type="number" min="1" max="3" class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none">
                    </div>
                </div>

                <div>
                    <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Estado Desarrollo</label>
                    <select v-model="form.DevStatus" class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none bg-white">
                        <option value="Development">Development 🚧</option>
                        <option value="Maintaining">Maintaining 🛠️</option>
                        <option value="Finished">Finished ✅</option>
                    </select>
                </div>

                <div>
                    <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Icono (FontAwesome)</label>
                    <div class="flex gap-2">
                         <div class="w-10 h-10 rounded bg-slate-100 flex items-center justify-center shrink-0 text-slate-600">
                            <i :class="form.Icon"></i>
                         </div>
                        <input v-model="form.Icon" type="text" class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none text-sm font-mono text-slate-500">
                    </div>
                </div>

            </div>

            <div class="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                <button @click="closeEdit" class="px-4 py-2 text-slate-500 font-medium hover:bg-slate-100 rounded-lg transition-colors">
                    Cancelar
                </button>
                <button @click="saveEdit" class="px-4 py-2 bg-brand-600 text-white font-medium rounded-lg hover:bg-brand-700 shadow-sm transition-colors">
                    Guardar Cambios
                </button>
            </div>

        </div>
    </div>

    </div>
  </div>
</template>

```

# src\modules\Shared\components\BaseTable.vue

```vue
<!-- src/modules/Shared/components/BaseTable.vue -->
<script setup lang="ts">
export interface Column {
    key: string;
    label: string;
    class?: string; // Clases extra para la celda (ej: text-right)
}

defineProps<{
    columns: Column[];
    data: any[];
    loading?: boolean;
    // Props de paginación
    currentPage?: number;
    totalPages?: number;
    totalRecords?: number;
    showActions?: boolean; // Mostrar columna de botones editar/borrar
}>();

const emit = defineEmits(['edit', 'delete', 'page-change']);
</script>

<template>
    <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
        
        <!-- Estado de Carga -->
        <div v-if="loading" class="p-12 text-center">
            <i class="fa-solid fa-circle-notch fa-spin text-3xl text-brand-500 mb-4"></i>
            <p class="text-slate-500">Cargando datos...</p>
        </div>

        <!-- Estado Vacío -->
        <div v-else-if="!loading && data.length === 0" class="p-12 text-center">
            <div class="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300 text-3xl">
                <i class="fa-regular fa-folder-open"></i>
            </div>
            <h3 class="text-lg font-medium text-slate-900">No hay registros</h3>
            <p class="text-slate-500 text-sm">No se encontraron datos para mostrar.</p>
        </div>

        <!-- Tabla -->
        <div v-else class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
                <thead>
                    <tr class="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-semibold tracking-wide">
                        <th 
                            v-for="col in columns" 
                            :key="col.key" 
                            class="px-6 py-3 whitespace-nowrap"
                            :class="col.class"
                        >
                            {{ col.label }}
                        </th>
                        <th v-if="showActions" class="px-6 py-3 text-right">Acciones</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 text-sm">
                    <tr 
                        v-for="(item, index) in data" 
                        :key="index" 
                        class="hover:bg-slate-50/80 transition-colors group"
                    >
                        <td 
                            v-for="col in columns" 
                            :key="col.key" 
                            class="px-6 py-4 whitespace-nowrap"
                            :class="col.class"
                        >
                            <!-- Slot dinámico: permite personalizar el contenido de cada celda -->
                            <slot :name="`cell-${col.key}`" :item="item" :value="item[col.key]">
                                {{ item[col.key] }}
                            </slot>
                        </td>
                        
                        <!-- Botones de Acción -->
                        <td v-if="showActions" class="px-6 py-4 text-right whitespace-nowrap">
                            <div class="flex justify-end gap-2">
                                <button 
                                    @click="$emit('edit', item)" 
                                    class="text-slate-400 hover:text-brand-600 p-1 transition-colors" 
                                    title="Editar"
                                >
                                    <i class="fa-solid fa-pen"></i>
                                </button>
                                <button 
                                    @click="$emit('delete', item)" 
                                    class="text-slate-400 hover:text-red-500 p-1 transition-colors" 
                                    title="Eliminar"
                                >
                                    <i class="fa-solid fa-trash"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

        <!-- Paginación (Footer) -->
        <div v-if="!loading && totalPages && totalPages > 1" class="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/30">
            <span class="text-xs text-slate-500">
                Total: <span class="font-medium text-slate-700">{{ totalRecords }}</span> registros
            </span>
            
            <div class="flex gap-1">
                <button 
                    :disabled="currentPage === 1"
                    @click="$emit('page-change', (currentPage || 1) - 1)"
                    class="px-3 py-1 text-xs font-medium rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    Anterior
                </button>
                
                <span class="px-3 py-1 text-xs font-medium text-slate-600 flex items-center">
                    Pág {{ currentPage }} de {{ totalPages }}
                </span>

                <button 
                    :disabled="currentPage === totalPages"
                    @click="$emit('page-change', (currentPage || 1) + 1)"
                    class="px-3 py-1 text-xs font-medium rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    Siguiente
                </button>
            </div>
        </div>
    </div>
</template>
```

# src\modules\Shared\components\charts\BaseChart.vue

```vue
<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, type PropType } from 'vue';
import { Chart, type ChartConfiguration, type ChartType } from 'chart.js';

const props = defineProps({
    type: {
        type: String as PropType<ChartType>,
        default: 'bar'
    },
    data: {
        type: Object as PropType<ChartConfiguration['data']>,
        required: true
    },
    options: {
        type: Object as PropType<ChartConfiguration['options']>,
        default: () => ({})
    },
    title: {
        type: String,
        default: ''
    }
});

const canvasRef = ref<HTMLCanvasElement | null>(null);
let chartInstance: Chart | null = null;

const renderChart = () => {
    if (!canvasRef.value) return;

    // Destruir instancia previa si existe
    if (chartInstance) {
        chartInstance.destroy();
    }

    // Crear nueva instancia
    chartInstance = new Chart(canvasRef.value, {
        type: props.type,
        data: props.data,
        options: {
            responsive: true,
            maintainAspectRatio: false, // Importante para contenedores flexibles
            plugins: {
                title: {
                    display: !!props.title,
                    text: props.title,
                    font: { size: 16, weight: 'bold' },
                    color: '#1e293b', // slate-800
                    align: 'start',
                    padding: { bottom: 20 }
                },
                legend: {
                    position: 'bottom',
                    labels: { usePointStyle: true, boxWidth: 8 }
                }
            },
            ...props.options
        }
    });
};

// --- Ciclo de Vida y Reactividad ---

onMounted(() => {
    renderChart();
});

// Si cambian los datos, actualizamos (sin destruir si es posible, para animaciones)
watch(() => props.data, (newData) => {
    if (chartInstance) {
        chartInstance.data = newData;
        chartInstance.update();
    } else {
        renderChart();
    }
}, { deep: true });

// Si cambia el tipo de gráfico, hay que destruir y recrear
watch(() => props.type, () => {
    renderChart();
});

onUnmounted(() => {
    if (chartInstance) {
        chartInstance.destroy();
    }
});
</script>

<template>
    <div class="w-full h-full min-h-[300px] relative">
        <canvas ref="canvasRef"></canvas>
    </div>
</template>
```

# src\modules\Shared\components\config\AnalysisConfigPanel.vue

```vue
<script setup lang="ts">
import { useCannibalizationStore } from '@/modules/Cannibalization/stores/cannibalizationStore';
import { storeToRefs } from 'pinia';

const store = useCannibalizationStore();
const { rules, isLoading } = storeToRefs(store);

// Función auxiliar para formatear porcentaje
const toPct = (val: number) => `${(val * 100).toFixed(0)}%`;
</script>

<template>
    <div class="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
        <div class="flex items-start gap-6">
            <!-- Header & Action -->
            <div class="min-w-[140px] pt-1">
                <h2 class="text-sm font-bold text-slate-800 mb-2">Variables de Detección</h2>
                <button 
                    @click="store.analyze()" 
                    class="text-xs bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded hover:bg-indigo-100 font-medium flex items-center gap-1 transition-colors"
                >
                    <span>↻</span> Re-Analizar
                </button>
            </div>

            <!-- Controls Grid -->
            <div class="flex-1 grid grid-cols-4 gap-6 border-l border-slate-100 pl-6">
                <!-- Drop Threshold -->
                <div>
                    <div class="flex justify-between text-xs mb-1.5">
                        <label class="font-medium text-slate-600">Umbral Caída</label>
                        <span class="text-red-600 font-bold">{{ toPct(rules.dropThreshold) }}</span>
                    </div>
                    <input 
                        type="range" min="0.1" max="0.9" step="0.05" 
                        v-model.number="rules.dropThreshold"
                        class="w-full accent-red-500 cursor-pointer h-1.5 bg-slate-200 rounded-lg appearance-none"
                        @change="store.analyze()" 
                    />
                    <p class="text-[10px] text-slate-400 mt-1 truncate" title="Mínima caída % requerida">Mínima caída % requerida</p>
                </div>

                <!-- Growth Threshold -->
                <div>
                    <div class="flex justify-between text-xs mb-1.5">
                        <label class="font-medium text-slate-600">Umbral Crecimiento</label>
                        <span class="text-green-600 font-bold">{{ toPct(rules.growthThreshold) }}</span>
                    </div>
                    <input 
                        type="range" min="0.1" max="2.0" step="0.1" 
                        v-model.number="rules.growthThreshold"
                        class="w-full accent-green-500 cursor-pointer h-1.5 bg-slate-200 rounded-lg appearance-none"
                        @change="store.analyze()" 
                    />
                    <p class="text-[10px] text-slate-400 mt-1 truncate" title="Mínimo crecimiento % requerido">Mínimo crecimiento % requerido</p>
                </div>

                <!-- Split Month -->
                <div>
                    <label class="block text-xs font-medium text-slate-600 mb-1.5">Mes de Corte</label>
                    <select 
                        v-model.number="rules.splitMonth" 
                        @change="store.analyze()"
                        class="w-full border-slate-300 rounded text-xs py-1 px-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                        <option :value="1">Enero</option>
                        <option :value="6">Junio</option>
                        <option :value="7">Julio</option>
                        <option :value="8">Agosto</option>
                        <option :value="9">Septiembre</option>
                        <option :value="10">Octubre</option>
                    </select>
                    <p class="text-[10px] text-slate-400 mt-1 truncate">Inicio de estrategia</p>
                </div>
                
                <!-- Min Volume -->
                 <div>
                    <label class="block text-xs font-medium text-slate-600 mb-1.5">Volumen Mínimo</label>
                    <div class="relative">
                        <input 
                            type="number" 
                            v-model.number="rules.minVolume"
                            class="w-full border-slate-300 rounded text-xs py-1 px-2 pr-8"
                            @input="store.analyze()"
                        />
                        <span class="absolute right-2 top-1 text-xs text-slate-400">Kg</span>
                    </div>
                    <p class="text-[10px] text-slate-400 mt-1 truncate">Filtro de ruido</p>
                </div>
            </div>
        </div>
    </div>
</template>
```

# src\modules\Shared\components\FormInput.vue

```vue
<!-- src/modules/Shared/components/FormInput.vue -->
<script setup lang="ts">
defineProps<{
    modelValue: string | number | null;
    label?: string;
    type?: string;
    placeholder?: string;
    required?: boolean;
    disabled?: boolean;
    error?: string;
    icon?: string; // Clase de FontAwesome (ej: fa-solid fa-user)
}>();

const emit = defineEmits(['update:modelValue']);

const updateValue = (event: Event) => {
    const target = event.target as HTMLInputElement;
    emit('update:modelValue', target.value);
};
</script>

<template>
    <div class="w-full">
        <label v-if="label" class="block text-sm font-medium text-slate-700 mb-1">
            {{ label }} <span v-if="required" class="text-red-500">*</span>
        </label>
        
        <div class="relative">
            <div v-if="icon" class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <i :class="[icon, 'text-slate-400 text-sm']"></i>
            </div>
            
            <input
                :type="type || 'text'"
                :value="modelValue"
                @input="updateValue"
                :placeholder="placeholder"
                :disabled="disabled"
                class="block w-full rounded-lg border-slate-300 text-sm shadow-sm placeholder-slate-400 focus:border-brand-500 focus:ring-brand-500 disabled:bg-slate-50 disabled:text-slate-500 transition-colors"
                :class="{'pl-10': icon, 'border-red-300 focus:border-red-500 focus:ring-red-500': error}"
            />
        </div>
        
        <p v-if="error" class="mt-1 text-xs text-red-600 flex items-center gap-1">
            <i class="fa-solid fa-circle-exclamation"></i> {{ error }}
        </p>
    </div>
</template>
```

# src\modules\Shared\components\FormSelect.vue

```vue
<!-- src/modules/Shared/components/FormSelect.vue -->
<script setup lang="ts">
defineProps<{
    modelValue: string | number | null;
    label?: string;
    options: { value: string | number; label: string }[];
    required?: boolean;
    disabled?: boolean;
    error?: string;
}>();

const emit = defineEmits(['update:modelValue']);

const updateValue = (event: Event) => {
    const target = event.target as HTMLSelectElement;
    emit('update:modelValue', target.value);
};
</script>

<template>
    <div class="w-full">
        <label v-if="label" class="block text-sm font-medium text-slate-700 mb-1">
            {{ label }} <span v-if="required" class="text-red-500">*</span>
        </label>
        
        <select
            :value="modelValue"
            @change="updateValue"
            :disabled="disabled"
            class="block w-full rounded-lg border-slate-300 text-sm shadow-sm focus:border-brand-500 focus:ring-brand-500 disabled:bg-slate-50 disabled:text-slate-500 transition-colors"
            :class="{'border-red-300 focus:border-red-500 focus:ring-red-500': error}"
        >
            <option value="" disabled selected>Seleccionar...</option>
            <option v-for="opt in options" :key="opt.value" :value="opt.value">
                {{ opt.label }}
            </option>
        </select>
        
        <p v-if="error" class="mt-1 text-xs text-red-600 flex items-center gap-1">
            <i class="fa-solid fa-circle-exclamation"></i> {{ error }}
        </p>
    </div>
</template>
```

# src\modules\Shared\components\inputs\MultiSelectDropdown.vue

```vue
<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { onClickOutside } from '@vueuse/core'; // *Nota 1 abajo

interface Option {
    label: string;
    value: string | number;
}

const props = defineProps<{
    modelValue: (string | number)[]; // Array de valores seleccionados
    options: string[] | Option[];    // Soporta array de strings o de objetos
    label: string;
    disabled?: boolean;
    placeholder?: string;
}>();

const emit = defineEmits(['update:modelValue']);

// --- Estado ---
const isOpen = ref(false);
const searchTerm = ref('');
const dropdownRef = ref(null);

// Cerrar al hacer click fuera
// *Nota 1: Si no tienes @vueuse/core, implementamos un listener nativo simple
// pero idealmente instala: npm i @vueuse/core
const closeDropdown = () => isOpen.value = false;

// --- Normalización de Opciones ---
// Convierte strings simples a objetos {label, value} para consistencia
const normalizedOptions = computed(() => {
    return props.options.map(opt => {
        if (typeof opt === 'object') return opt;
        return { label: String(opt), value: opt };
    });
});

// --- Filtrado (Buscador Interno) ---
const filteredOptions = computed(() => {
    if (!searchTerm.value) return normalizedOptions.value;
    const term = searchTerm.value.toLowerCase();
    return normalizedOptions.value.filter(opt => 
        String(opt.label).toLowerCase().includes(term)
    );
});

// --- Texto del Botón ---
const buttonText = computed(() => {
    if (props.modelValue.length === 0) return 'Todos';
    if (props.modelValue.length === normalizedOptions.value.length) return 'Todos (Seleccionados)';
    if (props.modelValue.length === 1) {
        const selected = normalizedOptions.value.find(o => o.value === props.modelValue[0]);
        return selected ? selected.label : '1 seleccionado';
    }
    return `${props.modelValue.length} seleccionados`;
});

// --- Lógica de Selección ---
const toggleOption = (value: string | number) => {
    const newValue = [...props.modelValue];
    const index = newValue.indexOf(value);
    
    if (index === -1) {
        newValue.push(value);
    } else {
        newValue.splice(index, 1);
    }
    emit('update:modelValue', newValue);
};

const toggleAll = () => {
    // Si ya están todos seleccionados (filtrados o totales), deseleccionar
    // Si no, seleccionar todos los VISIBLES (respeta el buscador)
    const allVisibleValues = filteredOptions.value.map(o => o.value);
    const areAllVisibleSelected = allVisibleValues.every(val => props.modelValue.includes(val));

    let newValue = [...props.modelValue];

    if (areAllVisibleSelected) {
        // Remover los visibles de la selección
        newValue = newValue.filter(val => !allVisibleValues.includes(val));
    } else {
        // Agregar los visibles que falten
        allVisibleValues.forEach(val => {
            if (!newValue.includes(val)) newValue.push(val);
        });
    }
    emit('update:modelValue', newValue);
};

// Listener click outside (Implementación manual simple si no usas VueUse)
import { onMounted, onUnmounted } from 'vue';
const handleClickOutside = (event: Event) => {
    if (dropdownRef.value && !(dropdownRef.value as any).contains(event.target)) {
        isOpen.value = false;
    }
};
onMounted(() => document.addEventListener('click', handleClickOutside));
onUnmounted(() => document.removeEventListener('click', handleClickOutside));

</script>

<template>
    <div class="relative w-full" ref="dropdownRef">
        <label class="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
            {{ label }}
        </label>
        
        <button 
            type="button"
            @click="!disabled && (isOpen = !isOpen)"
            :disabled="disabled"
            class="w-full text-left bg-white border border-slate-300 rounded-lg shadow-sm py-2 px-3 flex justify-between items-center text-sm transition-colors focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            :class="{'opacity-60 cursor-not-allowed bg-slate-50': disabled, 'border-brand-500 ring-1 ring-brand-500': isOpen}"
        >
            <span class="truncate text-slate-700 font-medium">{{ buttonText }}</span>
            <i class="fa-solid fa-chevron-down text-xs text-slate-400 transition-transform" :class="{'rotate-180': isOpen}"></i>
        </button>

        <div v-show="isOpen" class="absolute z-50 mt-1 w-full bg-white rounded-lg shadow-xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
            
            <div class="p-2 border-b border-slate-100 bg-slate-50">
                <div class="relative">
                    <i class="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                    <input 
                        v-model="searchTerm"
                        type="text" 
                        class="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                        placeholder="Buscar..."
                    >
                </div>
            </div>

            <div class="px-2 py-1.5 border-b border-slate-100 flex justify-end">
                <button @click="toggleAll" class="text-xs text-brand-600 hover:text-brand-800 font-medium hover:underline">
                    Seleccionar/Deseleccionar visibles
                </button>
            </div>

            <ul class="max-h-60 overflow-y-auto p-1 space-y-0.5">
                <li v-if="filteredOptions.length === 0" class="text-xs text-slate-400 text-center py-2">
                    No hay resultados
                </li>
                
                <li v-for="opt in filteredOptions" :key="opt.value">
                    <label class="flex items-center px-2 py-1.5 hover:bg-slate-50 rounded cursor-pointer group transition-colors">
                        <input 
                            type="checkbox" 
                            :value="opt.value"
                            :checked="modelValue.includes(opt.value)"
                            @change="toggleOption(opt.value)"
                            class="form-checkbox h-4 w-4 text-brand-600 border-slate-300 rounded focus:ring-brand-500 transition duration-150 ease-in-out"
                        >
                        <span class="ml-2 text-sm text-slate-600 group-hover:text-slate-900 truncate">
                            {{ opt.label }}
                        </span>
                    </label>
                </li>
            </ul>
        </div>
    </div>
</template>
```

# src\modules\Shared\components\ModalDialog.vue

```vue
<!-- src/modules/Shared/components/ModalDialog.vue -->
<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';

const props = defineProps<{
    modelValue: boolean; // Controla si está abierto o cerrado
    title: string;
    size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl';
}>();

const emit = defineEmits(['update:modelValue', 'close']);

const close = () => {
    emit('update:modelValue', false);
    emit('close');
};

// Cerrar con la tecla ESC
const handleKeyup = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && props.modelValue) close();
};

onMounted(() => document.addEventListener('keyup', handleKeyup));
onUnmounted(() => document.removeEventListener('keyup', handleKeyup));

const sizeClasses = {
    sm: 'sm:max-w-sm',
    md: 'sm:max-w-md',
    lg: 'sm:max-w-lg',
    xl: 'sm:max-w-xl',
    '2xl': 'sm:max-w-2xl',
    '4xl': 'sm:max-w-4xl'
};
</script>

<template>
    <Teleport to="body">
        <Transition name="modal">
            <div v-if="modelValue" class="relative z-50" aria-labelledby="modal-title" role="dialog" aria-modal="true">
                <!-- Backdrop oscuro -->
                <div class="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" @click="close"></div>

                <div class="fixed inset-0 z-10 overflow-y-auto">
                    <div class="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
                        
                        <!-- Panel del Modal -->
                        <div 
                            class="relative transform overflow-hidden rounded-xl bg-white text-left shadow-xl transition-all sm:my-8 w-full"
                            :class="sizeClasses[size || 'md']"
                        >
                            <!-- Header -->
                            <div class="bg-white px-4 py-3 border-b border-slate-100 flex justify-between items-center">
                                <h3 class="text-lg font-semibold leading-6 text-slate-800" id="modal-title">{{ title }}</h3>
                                <button @click="close" class="text-slate-400 hover:text-slate-500 hover:bg-slate-100 p-1 rounded-md transition-colors">
                                    <i class="fa-solid fa-xmark text-lg"></i>
                                </button>
                            </div>

                            <!-- Slot para el contenido del formulario -->
                            <div class="px-4 py-5 sm:p-6 max-h-[80vh] overflow-y-auto">
                                <slot></slot>
                            </div>

                            <!-- Slot para botones de acción (Footer) -->
                            <div v-if="$slots.footer" class="bg-slate-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6 border-t border-slate-100">
                                <slot name="footer"></slot>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .relative,
.modal-leave-active .relative {
    transition: all 0.3s ease-out;
}

.modal-enter-from .relative, 
.modal-leave-to .relative {
    opacity: 0;
    transform: translateY(10px) scale(0.95);
}
</style>
```

# src\modules\Shared\components\StatusBadge.vue

```vue
<!-- src/modules/Shared/components/StatusBadge.vue -->
<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
    status: string | boolean | number;
    type?: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
}>();

const colorClasses = computed(() => {
    // Si nos pasan un tipo explícito, lo usamos
    if (props.type) {
        switch (props.type) {
            case 'success': return 'bg-green-100 text-green-700 border-green-200';
            case 'warning': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
            case 'danger': return 'bg-red-100 text-red-700 border-red-200';
            case 'info': return 'bg-blue-100 text-blue-700 border-blue-200';
            default: return 'bg-slate-100 text-slate-700 border-slate-200';
        }
    }

    // Lógica automática basada en el valor del status
    const s = String(props.status).toLowerCase();
    if (['activo', '1', 'true', 'completado', 'pagado'].includes(s)) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (['inactivo', '0', 'false', 'cancelado', 'baja'].includes(s)) return 'bg-slate-100 text-slate-500 border-slate-200';
    if (['pendiente', 'en proceso', 'alerta'].includes(s)) return 'bg-amber-50 text-amber-700 border-amber-200';
    
    return 'bg-slate-100 text-slate-700 border-slate-200';
});

const label = computed(() => {
    if (props.status === true || props.status === 1) return 'Activo';
    if (props.status === false || props.status === 0) return 'Inactivo';
    return props.status;
});
</script>

<template>
    <span 
        class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border"
        :class="colorClasses"
    >
        <span class="w-1.5 h-1.5 rounded-full mr-1.5 bg-current opacity-60"></span>
        {{ label }}
    </span>
</template>
```

# src\modules\Shared\components\tables\SuspectsTable.vue

```vue
<script setup lang="ts">
import { ref, computed } from 'vue';
import { useCannibalizationStore } from '@/modules/Cannibalization/stores/cannibalizationStore';
import type { DetectedCannibalization } from '@/modules/Cannibalization/types/cannibalizationTypes';

const store = useCannibalizationStore();
const props = defineProps<{
    selectedId?: string;
}>();

const emit = defineEmits<{
    (e: 'select', item: DetectedCannibalization): void
}>();

// --- FILTROS LOCALES ---
const searchTerm = ref('');
const filterStatus = ref<'all' | 'negative' | 'positive'>('all');
const filterVictim = ref('');   // Nuevo
const filterCannibal = ref(''); // Nuevo

// --- LISTAS DINÁMICAS PARA LOS SELECTS (NUEVO) ---
// Extraemos valores únicos y los ordenamos alfabéticamente
const uniqueVictims = computed(() => {
    const victims = new Set(store.detectedCases.map(c => c.victimSku));
    return Array.from(victims).sort();
});

const uniqueCannibals = computed(() => {
    const cannibals = new Set(store.detectedCases.map(c => c.cannibalSku));
    return Array.from(cannibals).sort();
});

// --- FILTRADO MAESTRO ---
const filteredData = computed(() => {
    let data = store.detectedCases;

    // 1. Filtro Texto (Cliente o Ruta)
    if (searchTerm.value) {
        const term = searchTerm.value.toLowerCase();
        data = data.filter(item => 
            item.clientName.toLowerCase().includes(term) || 
            item.route.toLowerCase().includes(term)
        );
    }

    // 2. Filtro Estado (Neto)
    if (filterStatus.value === 'negative') {
        data = data.filter(item => item.netBalance < 0);
    } else if (filterStatus.value === 'positive') {
        data = data.filter(item => item.netBalance >= 0);
    }

    // 3. Filtro Víctima (NUEVO)
    if (filterVictim.value) {
        data = data.filter(item => item.victimSku === filterVictim.value);
    }

    // 4. Filtro Caníbal (NUEVO)
    if (filterCannibal.value) {
        data = data.filter(item => item.cannibalSku === filterCannibal.value);
    }

    return data;
});



// --- KPI EN TIEMPO REAL ---
const totalRedCases = computed(() => {
    // Calculamos sobre los datos FILTRADOS para que el KPI refleje lo que ves
    return filteredData.value.filter(c => c.netBalance < 0).length;
});

const selectItem = (item: DetectedCannibalization) => {
    emit('select', item);
};

// Reset rápido
const clearFilters = () => {
    searchTerm.value = '';
    filterStatus.value = 'all';
    filterVictim.value = '';
    filterCannibal.value = '';
};
</script>

<template>
    <div class="bg-white rounded-lg border border-slate-200 overflow-hidden flex flex-col h-full min-h-0 shadow-sm transition-all">
        
        <div class="p-3 border-b border-slate-100 bg-slate-50 flex flex-col gap-3 shrink-0">
            
            <div class="flex justify-between items-center">
                <h3 class="font-bold text-slate-700 text-xs uppercase tracking-wide flex items-center gap-2">
                    <i class="fa-solid fa-list-ul text-slate-400"></i> Casos Detectados
                </h3>
                
                <div class="flex items-center gap-2 text-[10px] font-medium">
                    <button 
                        v-if="filterVictim || filterCannibal || searchTerm || filterStatus !== 'all'"
                        @click="clearFilters"
                        class="text-slate-400 hover:text-brand-600 mr-2 transition-colors"
                        title="Limpiar filtros"
                    >
                        <i class="fa-solid fa-filter-circle-xmark"></i>
                    </button>

                    <span class="bg-red-100 text-red-700 px-2 py-0.5 rounded border border-red-200" title="Casos con Pérdida Neta (Vista Actual)">
                        <i class="fa-solid fa-triangle-exclamation mr-1"></i> {{ totalRedCases }}
                    </span>
                    <span class="bg-slate-200 text-slate-600 px-2 py-0.5 rounded border border-slate-300">
                        {{ filteredData.length }} / {{ store.detectedCases.length }}
                    </span>
                </div>
            </div>

            <div class="flex gap-2">
                <div class="relative flex-1">
                    <i class="fa-solid fa-search absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                    <input 
                        v-model="searchTerm"
                        type="text" 
                        placeholder="Buscar Cliente o Ruta..." 
                        class="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-brand-500 focus:border-brand-500 outline-none bg-white shadow-sm"
                    >
                </div>
                <select 
                    v-model="filterStatus"
                    class="text-xs border border-slate-300 rounded-lg px-2 py-1.5 bg-white focus:ring-1 focus:ring-brand-500 outline-none cursor-pointer shadow-sm min-w-[100px]"
                >
                    <option value="all">Estado: Todos</option>
                    <option value="negative">🔴 Negativos</option>
                    <option value="positive">🟢 Positivos</option>
                </select>
            </div>

            <div class="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/60">
                
                <div class="relative group">
                    <div class="absolute left-2.5 top-1/2 -translate-y-1/2 text-red-400 text-[10px] pointer-events-none">
                        <i class="fa-solid fa-arrow-trend-down"></i>
                    </div>
                    <select 
                        v-model="filterVictim"
                        class="w-full pl-7 pr-4 py-1 text-[11px] border border-transparent bg-red-50/50 hover:bg-red-50 text-slate-600 rounded-md focus:ring-1 focus:ring-red-200 focus:bg-white outline-none cursor-pointer transition-colors appearance-none truncate font-medium"
                    >
                        <option value="">Todas las Víctimas</option>
                        <option v-for="sku in uniqueVictims" :key="sku" :value="sku">{{ sku }}</option>
                    </select>
                    <i class="fa-solid fa-caret-down absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-red-200 group-hover:text-red-300 pointer-events-none"></i>
                </div>

                <div class="relative group">
                    <div class="absolute left-2.5 top-1/2 -translate-y-1/2 text-green-500 text-[10px] pointer-events-none">
                        <i class="fa-solid fa-arrow-trend-up"></i>
                    </div>
                    <select 
                        v-model="filterCannibal"
                        class="w-full pl-7 pr-4 py-1 text-[11px] border border-transparent bg-green-50/50 hover:bg-green-50 text-slate-600 rounded-md focus:ring-1 focus:ring-green-200 focus:bg-white outline-none cursor-pointer transition-colors appearance-none truncate font-medium"
                    >
                        <option value="">Todos los Caníbales</option>
                        <option v-for="sku in uniqueCannibals" :key="sku" :value="sku">{{ sku }}</option>
                    </select>
                    <i class="fa-solid fa-caret-down absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-green-200 group-hover:text-green-300 pointer-events-none"></i>
                </div>

            </div>
        </div>

        <div class="flex-1 overflow-y-auto relative custom-scrollbar">
            <table class="w-full text-xs text-left border-collapse">
                <thead class="text-[10px] text-slate-500 uppercase bg-slate-50 sticky top-0 z-10 shadow-sm border-b border-slate-200">
                    <tr>
                        <th class="px-3 py-2 bg-slate-50">Cliente / Ruta</th>
                        <th class="px-3 py-2 bg-slate-50 text-red-600 border-l border-slate-100">Víctima</th>
                        <th class="px-3 py-2 bg-slate-50 text-green-600 border-l border-slate-100">Caníbal</th>
                        <th class="px-3 py-2 bg-slate-50 text-center border-l border-slate-100">Neto</th>
                        <th class="px-3 py-2 bg-slate-50 text-center border-l border-slate-100">Score</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                    <tr 
                        v-for="item in filteredData" 
                        :key="item.id"
                        @click="selectItem(item)"
                        class="cursor-pointer transition-colors border-l-4 group hover:bg-slate-50"
                        :class="[
                            item.id === selectedId 
                                ? 'bg-indigo-50 border-brand-500' 
                                : 'border-transparent'
                        ]"
                    >
                        <td class="px-3 py-2 max-w-[180px]">
                            <div class="font-bold text-slate-700 truncate" :title="item.clientName">{{ item.clientName }}</div>
                            <div class="text-[10px] text-slate-400 flex items-center gap-1">
                                <span class="bg-slate-100 px-1 rounded">{{ item.matriz }}</span>
                                <span>{{ item.route }}</span>
                            </div>
                        </td>
                        
                        <td class="px-3 py-2 border-l border-slate-50">
                            <div class="text-slate-600 truncate max-w-[120px]" :title="item.victimSku">{{ item.victimSku }}</div>
                            <div class="text-[10px] font-bold text-red-500">-{{ item.volumeLost.toFixed(1) }}</div>
                        </td>
                        
                        <td class="px-3 py-2 border-l border-slate-50">
                            <div class="text-slate-600 truncate max-w-[120px]" :title="item.cannibalSku">{{ item.cannibalSku }}</div>
                            <div class="text-[10px] font-bold text-green-500">+{{ item.volumeGained.toFixed(1) }}</div>
                        </td>
                        
                        <td class="px-3 py-2 text-center border-l border-slate-50">
                            <span 
                                :class="item.netBalance >= 0 ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'"
                                class="px-2 py-0.5 rounded border text-[10px] font-bold block w-fit mx-auto"
                            >
                                {{ item.netBalance > 0 ? '+' : '' }}{{ item.netBalance.toFixed(1) }}
                            </span>
                        </td>
                        
                        <td class="px-3 py-2 text-center font-mono text-slate-400 border-l border-slate-50 group-hover:text-slate-600">
                            {{ item.impactScore.toFixed(0) }}
                        </td>
                    </tr>
                    
                    <tr v-if="filteredData.length === 0">
                        <td colspan="5" class="px-4 py-12 text-center text-slate-400">
                            <div class="flex flex-col items-center gap-2">
                                <i class="fa-solid fa-filter opacity-30 text-2xl"></i>
                                <span v-if="store.isLoading" class="animate-pulse">Analizando datos...</span>
                                <span v-else-if="store.detectedCases.length > 0">
                                    No hay coincidencias.<br>
                                    <button @click="clearFilters" class="text-brand-600 underline text-[10px] mt-1">Limpiar filtros</button>
                                </span>
                                <span v-else>No se detectaron casos con los parámetros actuales.</span>
                            </div>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</template>
```

# src\modules\Shared\layouts\AdminLayout.vue

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useAuthStore } from '@/modules/Auth/views/stores/authStore';
import { useSetupStore } from '@/modules/Setup/stores/setupStores';
import { useRouter, useRoute } from 'vue-router';

const auth = useAuthStore();
const setupStore = useSetupStore();
const router = useRouter();
const route = useRoute(); 

const isCollapsed = ref(false); // Inicia expandido

onMounted(async () => {
   await setupStore.fetchModules();
});

const handleLogout = () => {
    auth.logout();
};

const isActive = (path: string) => {
    if (path === '/') return route.path === '/'; 
    return route.path.startsWith(path);
};

const toggleSidebar = () => {
    isCollapsed.value = !isCollapsed.value;
};
</script>

<template>
    <div class="flex h-screen bg-slate-50 overflow-hidden">
        
        <aside 
            class="bg-white border-r border-slate-200 hidden md:flex flex-col shrink-0 z-50 transition-all duration-300 ease-in-out relative"
            :class="isCollapsed ? 'w-20' : 'w-64'"
        >
            
            <div class="h-16 flex items-center border-b border-slate-100 transition-all duration-300 px-4"
                 :class="isCollapsed ? 'justify-center' : 'justify-between'">
                
                <router-link 
                    to="/" 
                    v-show="!isCollapsed"
                    class="flex items-center gap-3 text-brand-800 font-bold text-lg group overflow-hidden whitespace-nowrap transition-opacity duration-200"
                >
                    <div class="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center text-white shadow-sm">
                        <i class="fa-solid fa-layer-group"></i>
                    </div>
                    <span>PIC System</span>
                </router-link>

                <button 
                    @click="toggleSidebar"
                    class="text-slate-400 hover:text-brand-600 p-2 rounded-lg hover:bg-slate-50 transition-all focus:outline-none"
                    :title="isCollapsed ? 'Expandir menú' : 'Colapsar menú'"
                >
                    <i class="fa-solid text-lg" :class="isCollapsed ? 'fa-bars' : 'fa-indent'"></i>
                </button>

            </div>

            <nav class="flex-1 p-3 space-y-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
                
                <!-- Skeleton Loading -->
                <div v-if="setupStore.isLoading" class="space-y-4 p-2">
                   <div v-for="i in 3" :key="i" class="animate-pulse">
                      <div class="h-3 bg-slate-100 rounded w-20 mb-2"></div>
                      <div class="h-10 bg-slate-100 rounded-lg"></div>
                      <div class="h-10 bg-slate-100 rounded-lg mt-1"></div>
                   </div>
                </div>

                <!-- Dynamic Menu -->
                <template v-else v-for="(modules, category) in setupStore.groupedMenu" :key="category">
                    
                   <!-- Category Header -->
                   <p v-if="!isCollapsed" class="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 mt-6 fade-in first:mt-2">
                       {{ category }}
                   </p>
                   <div v-else class="h-px bg-slate-100 my-4 mx-2"></div>

                   <!-- Modules Loop -->
                   <router-link 
                       v-for="mod in modules" 
                       :key="mod.ModuleId"
                       :to="mod.Route" 
                       class="flex items-center gap-3 py-2.5 rounded-lg transition-all font-medium group relative"
                       :class="[
                           isActive(mod.Route) ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50 hover:text-brand-600',
                           isCollapsed ? 'justify-center px-0' : 'px-4'
                       ]"
                   >
                       <i :class="[mod.Icon, 'w-5 text-center text-lg']"></i>
                       <span v-show="!isCollapsed" class="whitespace-nowrap">{{ mod.Label }}</span>
                       <div v-if="isCollapsed" class="tooltip">{{ mod.Label }}</div>
                   </router-link>
                   
                </template>

            </nav>

            <div class="p-3 border-t border-slate-100 bg-slate-50/50">
                <div 
                    class="flex items-center gap-3 p-2 rounded-lg hover:bg-white transition-all group relative cursor-default"
                    :class="isCollapsed ? 'justify-center' : ''"
                >
                    <div class="w-9 h-9 rounded-full bg-brand-600 text-white flex items-center justify-center font-bold text-sm shadow-md shrink-0">
                        {{ auth.user?.username.substring(0,2).toUpperCase() }}
                    </div>
                    
                    <div v-if="!isCollapsed" class="overflow-hidden transition-opacity duration-300">
                        <p class="text-xs font-bold text-slate-700 truncate w-32">{{ auth.user?.username }}</p>
                        <p class="text-[10px] uppercase font-bold text-slate-400 truncate tracking-wide">{{ auth.user?.role }}</p>
                    </div>
                    
                    <button 
                        @click="handleLogout" 
                        class="text-slate-400 hover:text-red-500 transition-colors p-1.5 hover:bg-red-50 rounded-md" 
                        :class="isCollapsed ? 'absolute left-10 top-0 opacity-0 group-hover:opacity-100 bg-white shadow-lg border border-slate-100 z-50 ml-4' : 'ml-auto'"
                        title="Cerrar Sesión"
                    >
                        <i class="fa-solid fa-right-from-bracket"></i>
                    </button>
                </div>
            </div>
        </aside>

        <main class="flex-1 flex flex-col min-w-0 overflow-hidden relative">
            <router-view></router-view>
        </main>
    </div>
</template>

<style scoped>
/* Scrollbar fino */
.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 2px; }
.custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }

/* Animación suave para textos */
.fade-in {
    animation: fadeIn 0.3s ease-in;
}
@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}

/* Tooltip flotante reutilizable */
.tooltip {
    position: absolute;
    left: 100%;
    top: 50%;
    transform: translateY(-50%);
    margin-left: 10px;
    background-color: #1e293b; /* Slate-800 */
    color: white;
    font-size: 0.75rem; /* text-xs */
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.2s;
    white-space: nowrap;
    z-index: 100;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.group:hover .tooltip {
    opacity: 1;
}
</style>
```

# src\prueba-chat.html

```html
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PIC System - AI Chat Prototype</title>
    
    <!-- 1. STACK VISUAL (CDN) -->
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <!-- Chart.js para visualización de datos -->
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>

    <script>
        tailwind.config = {
            theme: {
                extend: {
                    colors: {
                        brand: { 50: '#f0f9ff', 100: '#e0f2fe', 500: '#0ea5e9', 600: '#0284c7', 700: '#0369a1' }
                    },
                    animation: {
                        'fade-in': 'fadeIn 0.3s ease-out forwards',
                        'pulse-slow': 'pulse 3s infinite'
                    },
                    keyframes: {
                        fadeIn: {
                            '0%': { opacity: '0', transform: 'translateY(10px)' },
                            '100%': { opacity: '1', transform: 'translateY(0)' },
                        }
                    }
                }
            }
        }
    </script>
    <style>
        /* Scrollbar estilo sistema */
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: #f1f5f9; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
        body { font-family: 'Inter', system-ui, sans-serif; }
    </style>
</head>
<body class="bg-slate-100 h-screen flex overflow-hidden font-sans">

    <!-- LOGIN OVERLAY (Se muestra si no hay token) -->
    <div id="login-overlay" class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] hidden flex items-center justify-center">
        <div class="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-sm border border-slate-200">
            <div class="text-center mb-6">
                <div class="w-12 h-12 bg-brand-600 rounded-xl flex items-center justify-center text-white text-xl mx-auto mb-3 shadow-lg">
                    <i class="fa-solid fa-layer-group"></i>
                </div>
                <h2 class="text-xl font-bold text-slate-800">Iniciar Sesión</h2>
                <p class="text-xs text-slate-500">Ingresa credenciales para obtener token</p>
            </div>
            
            <form onsubmit="event.preventDefault(); chatApp.login();" class="space-y-4">
                <div>
                    <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Usuario</label>
                    <input type="text" id="username" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none" placeholder="Ej: SuperAdmin">
                </div>
                <div>
                    <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Contraseña</label>
                    <input type="password" id="password" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none" placeholder="••••••••">
                </div>
                <div id="login-error" class="text-red-500 text-xs hidden">Credenciales incorrectas</div>
                <button type="submit" class="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-2.5 rounded-lg transition-colors shadow-sm text-sm">
                    Acceder
                </button>
            </form>
        </div>
    </div>

    <!-- DASHBOARD MOCK (Fondo) -->
    <main class="flex-1 flex flex-col relative overflow-hidden bg-white m-4 rounded-2xl shadow-sm border border-slate-200">
        <header class="h-16 border-b border-slate-100 flex items-center px-8 justify-between bg-slate-50/50">
            <h1 class="text-xl font-bold text-slate-800 flex items-center gap-2">
                <i class="fa-solid fa-layer-group text-brand-600"></i> PIC Dashboard <span class="text-xs font-normal text-slate-400 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">Vanilla Prototype</span>
            </h1>
            <div id="user-badge" class="hidden flex items-center gap-2">
                <span id="user-name" class="text-sm font-bold text-slate-700">Usuario</span>
                <button onclick="chatApp.logout()" class="text-xs text-red-500 hover:underline">Salir</button>
            </div>
        </header>
        
        <div id="dashboard-container" class="flex-1 p-8 overflow-y-auto bg-slate-50 relative">
            <!-- AQUÍ SE INYECTARÁN LOS WIDGETS DINÁMICOS -->
            <div id="widgets-area" class="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-20">
                <!-- Placeholder inicial -->
                <div id="empty-state" class="col-span-full h-96 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
                    <div class="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                        <i class="fa-solid fa-chart-pie text-2xl text-slate-300"></i>
                    </div>
                    <p>Usa el chat para generar gráficos aquí.</p>
                </div>
            </div>
        </div>
    </main>

    <!-- CHAT INTERFACE (Panel Lateral) -->
    <aside class="w-96 bg-white border-l border-slate-200 flex flex-col shadow-xl z-50 h-full">
        
        <!-- Header Chat -->
        <div class="p-4 border-b border-slate-100 flex justify-between items-center bg-white shadow-sm z-10">
            <h3 class="font-bold text-slate-700 flex items-center gap-2 text-sm">
                <div class="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center text-brand-600">
                    <i class="fa-solid fa-wand-magic-sparkles"></i>
                </div>
                Analista Virtual
            </h3>
            <div class="flex gap-2">
                <select id="model-selector" class="text-xs border-none bg-slate-50 text-slate-600 rounded px-2 py-1 focus:ring-0 cursor-pointer">
                    <option value="gemini">Gemini 2.5</option>
                    <option value="openai">GPT-4o</option>
                </select>
                <button onclick="chatApp.clearChat()" class="text-slate-400 hover:text-red-500 p-2 hover:bg-red-50 rounded-lg transition-colors" title="Limpiar">
                    <i class="fa-solid fa-trash text-xs"></i>
                </button>
            </div>
        </div>

        <!-- Área de Mensajes -->
        <div id="chat-messages" class="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 scroll-smooth">
            <!-- Mensaje de bienvenida -->
            <div class="flex flex-col items-start max-w-[85%] animate-fade-in">
                <span class="text-[10px] text-slate-400 mb-1 px-1">PIC Assistant</span>
                <div class="px-4 py-3 rounded-2xl rounded-bl-none shadow-sm text-sm bg-white border border-slate-200 text-slate-700">
                    Hola. Soy tu asistente de datos. Pídeme reportes como "Ventas por zona 2024" o "Comparativo de marcas".
                </div>
                <span class="text-[9px] text-slate-300 mt-1 px-1">Justo ahora</span>
            </div>
        </div>

        <!-- Indicador de Carga -->
        <div id="loading-indicator" class="hidden px-4 py-2">
            <div class="flex items-center gap-2 text-slate-400 text-xs p-3 bg-white rounded-xl border border-slate-100 shadow-sm w-fit">
                <i class="fa-solid fa-circle-notch fa-spin text-brand-500"></i>
                <span class="font-medium">Analizando datos...</span>
            </div>
        </div>

        <!-- Input Area -->
        <div class="p-4 bg-white border-t border-slate-200">
            <div class="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl p-1 focus-within:ring-2 focus-within:ring-brand-500/20 focus-within:border-brand-500 transition-all">
                <input 
                    type="text" 
                    id="user-input"
                    placeholder="Escribe tu consulta aquí..." 
                    class="flex-1 bg-transparent border-none outline-none text-xs placeholder:text-slate-400 py-3 px-3 min-w-0 text-slate-700"
                    onkeydown="if(event.key === 'Enter') chatApp.sendMessage()"
                >
                <button 
                    onclick="chatApp.sendMessage()"
                    class="p-2.5 mr-1 bg-brand-600 text-white rounded-lg hover:bg-brand-700 shadow-sm transition-all active:scale-95"
                >
                    <i class="fa-solid fa-paper-plane text-xs"></i>
                </button>
            </div>
        </div>
    </aside>

    <!-- LÓGICA DE APLICACIÓN (VANILLA JS) -->
    <script>
        /**
         * CLASE PRINCIPAL: ChatApplication
         * Encapsula toda la lógica de estado, API y renderizado.
         */
        class ChatApplication {
            constructor() {
                // Configuración
                this.apiBase = 'http://localhost:3000/api'; 
                this.token = localStorage.getItem('pic_auth_token') || ''; 
                
                // Estado
                this.messages = [];
                this.isLoading = false;
                
                // DOM Elements
                this.dom = {
                    messages: document.getElementById('chat-messages'),
                    input: document.getElementById('user-input'),
                    loading: document.getElementById('loading-indicator'),
                    widgetsArea: document.getElementById('widgets-area'),
                    emptyState: document.getElementById('empty-state'),
                    modelSelect: document.getElementById('model-selector'),
                    loginOverlay: document.getElementById('login-overlay'),
                    usernameInput: document.getElementById('username'),
                    passwordInput: document.getElementById('password'),
                    loginError: document.getElementById('login-error'),
                    userBadge: document.getElementById('user-badge'),
                    userName: document.getElementById('user-name')
                };

                this.checkAuth();
            }

            // --- AUTENTICACIÓN ---

            checkAuth() {
                if (!this.token) {
                    this.dom.loginOverlay.classList.remove('hidden');
                } else {
                    this.dom.userBadge.classList.remove('hidden');
                    const userData = JSON.parse(localStorage.getItem('pic_user_data') || '{}');
                    this.dom.userName.textContent = userData.username || 'Usuario';
                }
            }

            async login() {
                const username = this.dom.usernameInput.value;
                const password = this.dom.passwordInput.value;
                
                try {
                    // Endpoint estándar de Login del Backend
                    const response = await fetch(`${this.apiBase}/v2/auth/login`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ username, password })
                    });

                    const res = await response.json();

                    if (res.success) {
                        this.token = res.data.token;
                        localStorage.setItem('pic_auth_token', this.token);
                        localStorage.setItem('pic_user_data', JSON.stringify(res.data.user));
                        
                        // UI Update
                        this.dom.loginOverlay.classList.add('hidden');
                        this.dom.userBadge.classList.remove('hidden');
                        this.dom.userName.textContent = res.data.user.username;
                        this.appendMessage('assistant', `Bienvenido ${res.data.user.username}, ¿qué analizamos hoy?`);
                    } else {
                        this.dom.loginError.textContent = res.message || 'Error de login';
                        this.dom.loginError.classList.remove('hidden');
                    }
                } catch (e) {
                    this.dom.loginError.textContent = 'Error de conexión con el servidor.';
                    this.dom.loginError.classList.remove('hidden');
                }
            }

            logout() {
                this.token = '';
                localStorage.removeItem('pic_auth_token');
                localStorage.removeItem('pic_user_data');
                location.reload();
            }

            // --- UI HELPERS ---

            scrollToBottom() {
                this.dom.messages.scrollTop = this.dom.messages.scrollHeight;
            }

            setLoading(loading) {
                this.isLoading = loading;
                this.dom.loading.classList.toggle('hidden', !loading);
                this.dom.input.disabled = loading;
                if(loading) this.scrollToBottom();
            }

            // --- RENDERIZADO DE MENSAJES ---

            appendMessage(role, text, timestamp = new Date()) {
                const isUser = role === 'user';
                const timeStr = timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                
                const msgHTML = `
                    <div class="flex flex-col mb-4 max-w-[90%] animate-fade-in ${isUser ? 'items-end self-end ml-auto' : 'items-start self-start'}">
                        <span class="text-[10px] text-slate-400 mb-1 px-1">${isUser ? 'Tú' : 'PIC AI'}</span>
                        <div class="px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm whitespace-pre-wrap ${
                            isUser 
                            ? 'bg-brand-600 text-white rounded-br-none' 
                            : 'bg-white border border-slate-200 text-slate-700 rounded-bl-none'
                        }">
                            ${text}
                        </div>
                        <span class="text-[9px] text-slate-300 mt-1 px-1 font-mono">${timeStr}</span>
                    </div>
                `;
                
                this.dom.messages.insertAdjacentHTML('beforeend', msgHTML);
                this.scrollToBottom();
                
                this.messages.push({ role, text });
            }

            appendSystemError(text) {
                const html = `
                    <div class="w-full text-center my-2 animate-fade-in">
                        <span class="bg-red-50 text-red-600 text-xs px-3 py-1 rounded-full border border-red-100">
                            <i class="fa-solid fa-circle-exclamation mr-1"></i> ${text}
                        </span>
                    </div>
                `;
                this.dom.messages.insertAdjacentHTML('beforeend', html);
                this.scrollToBottom();
            }

            // --- LÓGICA DE API Y CEREBRO ---

            async sendMessage() {
                const text = this.dom.input.value.trim();
                if (!text || this.isLoading) return;

                // 1. UI Update
                this.dom.input.value = '';
                this.appendMessage('user', text);
                this.setLoading(true);

                try {
                    // 2. Preparar Payload (Historial + Prompt)
                    const historyPayload = this.messages
                        .slice(-10) // Últimos 10 mensajes
                        .map(m => ({
                            role: m.role === 'user' ? 'user' : 'model',
                            parts: [{ text: m.text }] // Formato Gemini
                        }));

                    const model = this.dom.modelSelect.value;

                    // 3. Llamada al Backend (Chat Intent)
                    const response = await fetch(`${this.apiBase}/ai/chat`, {
                        method: 'POST',
                        headers: { 
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${this.token}` // Token enviado aquí
                        },
                        body: JSON.stringify({ 
                            userPrompt: text, 
                            history: historyPayload,
                            modelProvider: model
                        })
                    });

                    if (response.status === 401 || response.status === 403) {
                        this.logout(); // Token expirado
                        throw new Error('Sesión expirada. Por favor ingresa nuevamente.');
                    }

                    if (!response.ok) throw new Error('Error conectando con el servidor AI');
                    
                    const data = await response.json();

                    // 4. Procesar Respuesta
                    if (data.explanation) {
                        this.appendMessage('assistant', data.explanation);
                    }

                    // 5. Si hay intención de datos (Gráfico), ejecutar Query
                    if (data.type === 'data_query' && data.queryConfig) {
                        await this.executeAndVisualize(data.queryConfig);
                    }

                } catch (error) {
                    console.error(error);
                    this.appendSystemError(error.message || 'Error desconocido');
                } finally {
                    this.setLoading(false);
                    this.dom.input.focus();
                }
            }

            async executeAndVisualize(queryConfig) {
                this.appendSystemError("Ejecutando consulta SQL..."); // Feedback visual
                
                try {
                    const response = await fetch(`${this.apiBase}/ia-query`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.token}` },
                        body: JSON.stringify(queryConfig)
                    });

                    const data = await response.json();

                    if (!data || data.length === 0) {
                        this.appendSystemError("La consulta no arrojó resultados.");
                        return;
                    }

                    // Renderizar Widget
                    this.createWidget(data, queryConfig);

                } catch (e) {
                    this.appendSystemError("Fallo al obtener datos SQL.");
                }
            }

            // --- VISUALIZACIÓN (CHART.JS) ---

            createWidget(data, config) {
                // Ocultar empty state
                if (this.dom.emptyState) this.dom.emptyState.style.display = 'none';

                const vizType = config.visualization || 'bar';
                const canvasId = `chart-${Date.now()}`;
                const title = `${config.metric} por ${config.dimensions.join(' y ')}`;

                // HTML del contenedor del widget
                const widgetHTML = `
                    <div class="bg-white p-4 rounded-xl shadow-sm border border-slate-200 animate-fade-in relative group">
                        <div class="flex justify-between items-center mb-4">
                            <h4 class="font-bold text-slate-700 text-sm uppercase flex items-center gap-2">
                                <i class="fa-solid fa-chart-simple text-brand-500"></i> ${title}
                            </h4>
                            <button onclick="this.closest('.bg-white').remove()" class="text-slate-300 hover:text-red-500 text-xs">
                                <i class="fa-solid fa-xmark"></i>
                            </button>
                        </div>
                        <div class="h-64 relative">
                            ${vizType === 'kpi' 
                                ? `<div class="flex items-center justify-center h-full text-4xl font-black text-brand-600">
                                     ${this.formatNumber(data.reduce((a,b) => a + (b.TotalMetric||0), 0))}
                                   </div>` 
                                : `<canvas id="${canvasId}"></canvas>`
                            }
                        </div>
                    </div>
                `;

                this.dom.widgetsArea.insertAdjacentHTML('afterbegin', widgetHTML);

                // Si no es KPI, inicializar Chart.js
                if (vizType !== 'kpi') {
                    const ctx = document.getElementById(canvasId).getContext('2d');
                    
                    // Procesar datos para Chart.js
                    const labels = data.map(d => config.dimensions.map(dim => d[dim]).join(' - '));
                    const values = data.map(d => d.TotalMetric);

                    new Chart(ctx, {
                        type: vizType === 'table' ? 'bar' : vizType, // Fallback table -> bar
                        data: {
                            labels: labels,
                            datasets: [{
                                label: config.metric,
                                data: values,
                                backgroundColor: vizType === 'line' ? 'rgba(14, 165, 233, 0.2)' : '#0ea5e9',
                                borderColor: '#0ea5e9',
                                borderWidth: 1,
                                borderRadius: 4,
                                fill: vizType === 'line'
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: { legend: { display: false } }
                        }
                    });
                }
            }

            clearChat() {
                this.dom.messages.innerHTML = '';
                this.messages = [];
                this.appendMessage('assistant', 'Chat reiniciado. ¿En qué puedo ayudarte?');
            }

            formatNumber(num) {
                return new Intl.NumberFormat('es-MX').format(num);
            }
        }

        // Inicialización
        const chatApp = new ChatApplication();
    </script>
</body>
</html>
```

# src\router\index.ts

```ts
/* src/router/index.ts */
import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/modules/Auth/views/stores/authStore';
import { useSetupStore } from '@/modules/Setup/stores/setupStores';
import { ROLE_LEVELS } from '@/modules/Setup/types/setupTypes';

// Función auxiliar robusta para verificar expiración
function isTokenExpired(token: string): boolean {
   try {
      const base64Url = token.split('.')[1];
      if (!base64Url) return true;

      // 1. Normalizar Base64Url a Base64 estándar
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');

      // 2. Decodificar
      const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function (c) {
         return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));

      const { exp } = JSON.parse(jsonPayload);

      // --- DEBUG: BORRAR EN PRODUCCIÓN ---
      const now = Date.now() / 1000;
      const timeLeft = exp - now;
      console.log(`⏱️ Token Check: Expira en ${timeLeft.toFixed(1)} segundos`);
      // -----------------------------------

      // Si la fecha actual es mayor a la de expiración
      return Date.now() >= exp * 1000;
   } catch (e) {
      console.error("Error al decodificar token:", e);
      return true; // Ante la duda, bloquear
   }
}

const router = createRouter({
   history: createWebHistory(import.meta.env.BASE_URL),
   routes: [
      {
         path: '/',
         name: 'hub',
         component: () => import('@/modules/Hub/views/HubView.vue'),
         meta: { requiresAuth: true }
      },
      {
         path: '/login',
         name: 'login',
         component: () => import('@/modules/Auth/views/LoginView.vue'),
         meta: { guestOnly: true }
      },
      {
         path: '/admin',
         component: () => import('@/modules/Shared/layouts/AdminLayout.vue'),
         meta: { requiresAuth: true },
         children: [
            {
               path: 'users',
               name: 'users',
               component: () => import('@/modules/Users/views/UserList.vue')
            },
            {
               path: 'products',
               name: 'products',
               component: () => import('@/modules/Products/views/ProductList.vue')
            },
            {
               path: 'clients',
               name: 'clients',
               component: () => import('@/modules/Clients/views/ClientList.vue')
            },
            {
               path: 'clients-validation',
               name: 'clients-validation',
               component: () => import('@/modules/Clients/views/ClientList.vue') // Reusando vista temporalmente
            },
            {
               path: 'audit',
               name: 'audit',
               component: () => import('@/modules/Audit/views/AuditLog.vue')
            },
            {
               path: 'setup',
               name: 'setup',
               component: () => import('@/modules/Setup/views/SystemConfigView.vue')
            },
            // NUEVA RUTA: Módulo PIC (Fase 2)
            {
               path: 'pic',
               name: 'pic-report',
               component: () => import('@/modules/PIC/views/PicDashboardView.vue')
            },
            {
               path: 'pic-logistics',
               name: 'pic-logistics',
               component: () => import('@/modules/PIC/views/PicDashboardView.vue')
            },
            {
               path: 'pic-forecast',
               name: 'pic-forecast',
               component: () => import('@/modules/PIC/views/PicDashboardView.vue')
            },
            {
               path: 'cannibalization', // URL: /admin/cannibalization
               name: 'cannibalization',
               component: () => import('@/modules/Cannibalization/views/CannibalizationDashboard.vue'),
               meta: {
                  requiresAuth: true,
                  // Opcional: Si tienes roles, agrégalos aquí
               }
            },

         ]
      },
      // Ruta comodín para redirigir cualquier URL no encontrada al inicio
      { path: '/:pathMatch(.*)*', redirect: '/' }
   ]
})

// Guardia de navegación global
router.beforeEach(async (to, from, next) => {
   const authStore = useAuthStore();
   const setupStore = useSetupStore();

   // Obtener token (prioridad: Store > LocalStorage)
   const token = authStore.token || localStorage.getItem('pic_auth_token');

   // Verificar existencia Y validez
   const isAuthenticated = token && !isTokenExpired(token);

   // 1. Si la ruta requiere auth
   if (to.meta.requiresAuth) {
      if (!isAuthenticated) {
         // Si el token existe pero expiró, limpiamos para evitar bucles
         if (token) {
            console.log('🔒 Sesión expirada. Redirigiendo a login...');
            authStore.logout(); // Esto limpia el estado y localStorage
         }
         return next('/login');
      }

      // --- SETUP SECURITY & DYNAMIC MODULE CHECK ---
      // Verificar si la ruta destino está protegida por configuración de módulos

      // Cargar módulos si no existen aún (y estamos autenticados)
      if (setupStore.modules.length === 0) {
         await setupStore.fetchModules();
      }

      // Buscar si la ruta actual coincide con algún módulo definido
      // Normalizamos rutas quitando query params y hashes para comparar
      const targetPath = to.path;

      // Encontrar módulo que coincida con la ruta destino
      const moduleConfig = setupStore.modules.find(m => targetPath.startsWith(m.Route) && m.Route !== '/');
      // Nota: m.Route !== '/' evita que el módulo "HOME" bloquee todo si tiene ruta raíz

      if (moduleConfig) {
         // 1. Verificar si está activo globalmente
         if (!moduleConfig.IsActive) {
            console.warn(`⛔ Acceso denegado: El módulo ${moduleConfig.Label} está desactivado.`);
            return next('/'); // O una página 404/Mantenimiento
         }

         // 2. Verificar Rol (MinRoleLevel)
         const userRoleStr = authStore.user?.role || 'User';
         const userLevel = ROLE_LEVELS[userRoleStr] || 1;

         if (userLevel < moduleConfig.MinRoleLevel) {
            console.warn(`⛔ Acceso Prohibido: Nivel ${userLevel} vs Requerido ${moduleConfig.MinRoleLevel}`);
            // Redirigir a Home o 403
            return next('/');
         }
      }
      // ---------------------------------------------

   }

   // 2. Si la ruta es solo para invitados (Login) y está autenticado
   if (to.meta.guestOnly && isAuthenticated) {
      return next('/');
   }

   next();
});
export default router

```

# src\style.css

```css
/* src/style.css */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

/* Estilos base globales */
body {
  @apply font-sans text-slate-800 bg-slate-50;
}

/* Transiciones suaves para tarjetas */
.card-hover {
  @apply transition-all duration-300 ease-out hover:-translate-y-1;
}

/* Custom Scrollbar */
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  @apply bg-slate-200 rounded-full;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  @apply bg-slate-300;
}
```

# src\types\audit.d.ts

```ts
/* src/types/audit.d.ts */
export interface AuditLog {
    id: number;
    Nombre_Reporte: string; // Acción
    Numero_empleado: string; // Usuario
    Fecha_Registro: string;
    Detalles?: string;
}

export interface AuditResponse {
    success: boolean;
    data: AuditLog[];
    count: number;
}
```

# src\types\auth.d.ts

```ts
/* src/types/auth.d.ts */

export interface User {
    id: number;
    username: string;
    role: 'Admin' | 'User';
    zona: string;
}

export interface LoginResponse {
    success: boolean;
    data: {
        token: string;
        user: User;
    };
    message?: string;
}
```

# src\types\clients.d.ts

```ts
/* src/types/clients.d.ts */

export interface Client {
    Id: number;
    clienteid: string; // ID de negocio (ej: CTE-1001)
    Nombre: string;
    Matriz?: string;
    Cadena?: string;
    Canal?: string;
    Canalm?: string;
    Formato?: string;
    Gerencia?: string;
    Zona?: string;
    Jefatura?: string;
    Ruta?: string;
    Umaf?: string;
    Canalc?: string;
    Calle_Numero?: string;
    Colonia?: string;
    Ciudad?: string;
    Estado?: string;
    Tipocli?: string;
    Est2017?: string;
    Geopos?: string;
    Segemento?: string;
    LP?: string;
    Cedis?: string;
    FechaCreacion?: string;
}

export interface ClientResponse {
    success: boolean;
    data: Client[];
    total: number;
    page: number;
    limit: number;
}
```

# src\types\products.d.ts

```ts
/* src/types/products.d.ts */

export interface Product {
    Id: number; // ID interno autoincremental
    SkuReal: string;
    SKUMuliix?: string;
    Nombre: string;
    Marca?: string;
    Grupo?: string;
    Status: number | boolean; // 1/0 o true/false
    Peso?: number;
    Canibalizacion?: number;
    EmpaqueA?: string;
    EmpaqueB?: string;
    Categorias?: string;
    TipoCom?: string;
    Id_SkuRetail?: string;
    Contol?: string;
    TipoEsqDis?: string;
    GrupoOP?: string;
    FechaCreacion?: string;
}

export interface ProductResponse {
    success: boolean;
    data: Product[];
    total: number;
    page: number;
    limit: number;
}
```

# src\utils\chartConfig.ts

```ts
/* src/utils/chartConfig.ts */
import {
   Chart as ChartJS,
   Title,
   Tooltip,
   Legend,
   BarElement,
   LineElement,
   PointElement,
   CategoryScale,
   LinearScale,

   Filler,

   ArcElement,
   LineController,
   BarController,
   PieController,
   DoughnutController
} from 'chart.js';

// Registrar componentes necesarios (Tree Shaking)
ChartJS.register(
   CategoryScale,
   LinearScale,
   BarElement,
   LineElement,
   PointElement,
   ArcElement,
   Title,
   Tooltip,
   Legend,
   Filler,
   LineController,
   BarController,
   PieController,
   DoughnutController
);

// Configuración global de fuentes/colores para que coincida con Tailwind
ChartJS.defaults.font.family = "'Inter', sans-serif";
ChartJS.defaults.color = '#64748b'; // slate-500
ChartJS.defaults.scale.grid.color = '#e2e8f0'; // slate-200
```

# src\utils\constants.ts

```ts
/* src/utils/constants.ts */

export const MESES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export const CHART_COLORS = [
    '#0ea5e9', // brand-500 (Azul principal)
    '#6366f1', // Indigo
    '#ec4899', // Pink
    '#f59e0b', // Amber
    '#10b981', // Emerald
    '#8b5cf6', // Violet
    '#f43f5e'  // Rose
];

export const CHART_COLORS_GREEN = [
    '#10b981', // Emerald-500
    '#059669', // Emerald-600
    '#047857', // Emerald-700
    '#34d399'  // Emerald-400
];
```

# src\utils\formatters.ts

```ts
/**
 * src/utils/formatters.ts
 * Funciones puras para dar formato a datos numéricos.
 */

/**
 * Formatea un número como moneda (MXN).
 * Ej: 12500.5 -> "$12,500.50"
 */
export const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('es-MX', { 
        style: 'currency', 
        currency: 'MXN' 
    }).format(value);
};

/**
 * Formatea un número con separadores de miles y decimales.
 * Ej: 1500.123 -> "1,500.123"
 */
export const formatNumber = (value: number): string => {
    return new Intl.NumberFormat('es-MX', {
        maximumFractionDigits: 3
    }).format(value);
};
```

# src\vite-env.d.ts

```ts
/// <reference types="vite/client" />

```

# tailwind.config.js

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9', // Color primario principal
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
          950: '#082f49',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }, 
      containers: {
        '2xs': '16rem',
        '3xl': '48rem', // 768px (El default)
        'split': '850px', // <--- TU VALOR PERSONALIZADO
      },
    },
  },
  plugins: [
    require('@tailwindcss/container-queries'),
  ],
}
```

# tsconfig.app.json

```json
{
  "extends": "@vue/tsconfig/tsconfig.dom.json",
  "compilerOptions": {
    "composite": true,
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.app.tsbuildinfo",
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src/**/*.ts", "src/**/*.tsx", "src/**/*.vue"]
}

```

# tsconfig.json

```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}

```

# tsconfig.node.json

```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.node.tsbuildinfo",
    "target": "ES2023",
    "lib": ["ES2023"],
    "module": "ESNext",
    "types": ["node"],
    "skipLibCheck": true,

    /* Bundler mode */
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "noEmit": true,

    /* Linting */
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "erasableSyntaxOnly": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedSideEffectImports": true
  },
  "include": ["vite.config.ts"]
}

```

