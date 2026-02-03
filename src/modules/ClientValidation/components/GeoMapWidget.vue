<script setup lang="ts">
import { onMounted, ref, watch, onUnmounted } from 'vue';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Intefaces para props
interface MapPoint {
  lat: number;
  lng: number;
  label: string;
}

interface CandidatePoint extends MapPoint {
  distancia: number;
  dataRef?: any; // Referencia al objeto original si es necesario pasar datos complejos
}

const props = defineProps<{
  mainClient: MapPoint;
  candidates: CandidatePoint[];
}>();

const emit = defineEmits<{
  (e: 'select-candidate', candidate: any): void;
}>();

const mapContainer = ref<HTMLElement | null>(null);
let map: L.Map | null = null;
let markers: L.Marker[] = [];

// Iconos personalizados con colores
const redIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 40],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const blueIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [20, 32],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const initMap = () => {
  if (!mapContainer.value) return;

  // Inicializar mapa (centro temporal, se ajustará después)
  map = L.map(mapContainer.value).setView([props.mainClient.lat, props.mainClient.lng], 15);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);

  updateMarkers();
};

const updateMarkers = () => {
  if (!map) return;

  // Limpiar marcadores anteriores
  markers.forEach(marker => map?.removeLayer(marker));
  markers = [];

  const bounds = L.latLngBounds([]);

  // 1. Marcador Cliente Principal (Rojo)
  if (isValidCoordinate(props.mainClient.lat, props.mainClient.lng)) {
    const mainMarker = L.marker([props.mainClient.lat, props.mainClient.lng], { 
      icon: redIcon, 
      interactive: false // Desactivar interacción
    }).addTo(map);
    
    markers.push(mainMarker);
    bounds.extend(mainMarker.getLatLng());
  }

  // 2. Marcadores Candidatos (Azul)
  props.candidates.forEach((cand, index) => {
    if (isValidCoordinate(cand.lat, cand.lng)) {
      const marker = L.marker([cand.lat, cand.lng], { icon: blueIcon })
        .addTo(map!)
        .bindPopup(`<b>${cand.label}</b><br>Distancia: ${cand.distancia.toFixed(2)} km`)
        .on('click', () => {
           // Emitir evento al hacer click con el objeto completo o referencia
           // Importante: Aquí asumimos que candidates tiene el mismo orden o pasamos la data necesaria
           emit('select-candidate', cand.dataRef || cand); 
        });
      
      markers.push(marker);
      bounds.extend(marker.getLatLng());
    }
  });

  // Ajustar vista para mostrar todos los pines
  if (markers.length > 0) {
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
  }
};

const isValidCoordinate = (lat: number, lng: number) => {
  return !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;
};

// Ciclo de vida
onMounted(() => {
  initMap();
});

onUnmounted(() => {
  if (map) {
    map.remove();
    map = null;
  }
});

// Watch para cambios en las props
watch(() => [props.mainClient, props.candidates], () => {
  if (map) {
    // Pequeño delay para asegurar renderizado si viene de un cambio rápido
    setTimeout(() => {
      map?.invalidateSize();
      updateMarkers();
    }, 100);
  }
}, { deep: true });

</script>

<template>
  <div class="map-wrapper rounded-lg border border-gray-300 overflow-hidden shadow-sm">
    <div ref="mapContainer" class="h-full w-full bg-slate-100 z-0"></div>
  </div>
</template>

<style scoped>
.map-wrapper {
  height: 400px; /* Altura fija o h-full si el padre controla */
  width: 100%;
}
/* Leaflet z-index fix for some tailwind conflicts */
:deep(.leaflet-pane) {
  z-index: 0;
}
:deep(.leaflet-control-container .leaflet-top),
:deep(.leaflet-control-container .leaflet-bottom) {
  z-index: 1000;
}
</style>
