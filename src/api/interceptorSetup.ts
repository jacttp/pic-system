/* src/api/interceptorSetup.ts */
import type { AxiosInstance, InternalAxiosRequestConfig } from 'axios';

/**
 * Decodifica el payload del JWT para obtener la fecha de expiración.
 * Retorna los segundos restantes antes de que expire, o -1 si no se puede decodificar.
 */
function getTokenTimeLeftSeconds(token: string): number {
    try {
        const base64Url = token.split('.')[1];
        if (!base64Url) return -1;

        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function (c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));

        const { exp } = JSON.parse(jsonPayload);
        return exp - (Date.now() / 1000);
    } catch {
        return -1;
    }
}

export const setupAuthInterceptors = (axiosInstance: AxiosInstance) => {
    // 1. Interceptor de REQUEST (Salida)
    axiosInstance.interceptors.request.use(
        (config: InternalAxiosRequestConfig) => {
            const token = localStorage.getItem('pic_auth_token');

            if (token) {
                // Verificación proactiva: si el token caduca en menos de 60s, abortar
                const timeLeft = getTokenTimeLeftSeconds(token);
                if (timeLeft >= 0 && timeLeft < 60) {
                    console.warn(`⏱️ [Interceptor] Token expira en ${timeLeft.toFixed(0)}s. Redirigiendo a login...`);
                    localStorage.removeItem('pic_auth_token');
                    localStorage.removeItem('pic_user_data');
                    if (!window.location.pathname.includes('/login')) {
                        window.location.href = '/login?reason=expired';
                    }
                    // Cancelar la petición
                    return Promise.reject(new Error('Token próximo a expirar. Sesión cerrada preventivamente.'));
                }

                config.headers.Authorization = `Bearer ${token}`;
            } else {
                console.warn('⚠️ [Interceptor] Petición SIN token.');
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