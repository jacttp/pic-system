/* src/api/axios.ts */
import axios from 'axios';
import { setupAuthInterceptors } from './interceptorSetup';

const api = axios.create({
   baseURL: import.meta.env.VITE_API_BASE_URL,
   headers: {
      'Content-Type': 'application/json'
   }
});

// Aplicamos la configuración centralizada
setupAuthInterceptors(api);

export default api;
