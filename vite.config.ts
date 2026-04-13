/* vite.config.ts */
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
   plugins: [vue()],
   resolve: {
      alias: {
         '@': path.resolve(__dirname, './src'),
      },
   },
   server: {
      port: 5173, // Puerto por defecto de Vite
   },
   build: {
      chunkSizeWarningLimit: 1000, // Elevamos el límite de advertencia a 1000 kB (1 MB) porque ECharts/Leaflet son por naturaleza pesados
      rollupOptions: {
         output: {
            manualChunks(id) {
               if (id.includes('node_modules')) {

                  // Gráficos (ECharts y sus dependencias como zrender son muy pesados)
                  if (id.includes('echarts') || id.includes('zrender')) {
                     return 'vendor-echarts';
                  }
                  // Chart.js
                  if (id.includes('chart.js')) {
                     return 'vendor-chartjs';
                  }
                  // Mapas (Leaflet)
                  if (id.includes('leaflet')) {
                     return 'vendor-leaflet';
                  }
                  // Herramientas de exportación PDF
                  if (id.includes('jspdf') || id.includes('html2canvas')) {
                     return 'vendor-export';
                  }
                  // Iconografía FontAwesome
                  if (id.includes('@fortawesome')) {
                     return 'vendor-icons';
                  }
                  // Todo lo demás de node_modules
                  return 'vendor-core';
               }
            }
         }
      }
   }
})