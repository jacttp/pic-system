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
  ArcElement
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
  Legend
);

// Configuración global de fuentes/colores para que coincida con Tailwind
ChartJS.defaults.font.family = "'Inter', sans-serif";
ChartJS.defaults.color = '#64748b'; // slate-500
ChartJS.defaults.scale.grid.color = '#e2e8f0'; // slate-200