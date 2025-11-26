/* src/api/axios.ts */
import axios from 'axios';

// Creamos una instancia dedicada
const api = axios.create({
    baseURL: 'http://localhost:3000/api/v2', // Apunta a tu backend v2
    headers: {
        'Content-Type': 'application/json'
    }
});

// Interceptor de Request (Aquí inyectaremos el token más adelante)
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('pic_auth_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

export default api;