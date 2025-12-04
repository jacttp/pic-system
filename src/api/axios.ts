/* src/api/axios.ts */
import axios from 'axios';
import { setupAuthInterceptors } from './interceptorSetup';

const api = axios.create({
    baseURL: 'http://localhost:3000/api/v2',
    headers: {
        'Content-Type': 'application/json'
    }
});

// Aplicamos la configuración centralizada
setupAuthInterceptors(api);

export default api;