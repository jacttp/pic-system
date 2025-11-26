/* src/main.ts */
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './style.css' // Importante: Tailwind

// FontAwesome (versión CDN o npm, aquí asumimos que usas la librería de iconos que prefieras o CDN en index.html)
import '@fortawesome/fontawesome-free/css/all.min.css'

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')