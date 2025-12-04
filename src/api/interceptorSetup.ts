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