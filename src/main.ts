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

// Leaflet Vite fixes
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;

L.Icon.Default.mergeOptions({
   iconRetinaUrl,
   iconUrl,
   shadowUrl,
});

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')