import { defineStore } from 'pinia';
import { ref } from 'vue';
import validationApi from '../services/validationApi';
import type { ClientPending, ClientGeoMatch } from '../types/clientValidationTypes';

export const useClientValidationStore = defineStore('clientValidation', () => {
   // State
   const pendingClients = ref<ClientPending[]>([]);
   const selectedClient = ref<ClientPending | null>(null);
   const nearbyCandidates = ref<ClientGeoMatch[]>([]);
   const candidateToCompare = ref<ClientGeoMatch | null>(null);

   const isLoading = ref(false);
   const totalPending = ref(0);
   const currentPage = ref(1);

   // Actions
   const fetchPendingClients = async (page = 1) => {
      isLoading.value = true;
      try {
         const { data } = await validationApi.getPendingClients(page);
         if (data.success) {
            pendingClients.value = data.data;
            totalPending.value = data.total;
            currentPage.value = data.page;
         }
      } catch (error) {
         console.error('Error fetching pending clients:', error);
      } finally {
         isLoading.value = false;
      }
   };

   const setCandidateForComparison = (candidate: ClientGeoMatch | null) => {
      candidateToCompare.value = candidate;
   };

   const selectClientForReview = async (client: ClientPending) => {
      selectedClient.value = client;
      nearbyCandidates.value = []; // Limpiar anteriores
      candidateToCompare.value = null; // Reset comparison

      // Si tiene Geopos válida, buscar candidatos automáticamente
      if (client.Geopos && client.Geopos.includes(',')) {
         const [latStr, lngStr] = client.Geopos.split(',');
         const lat = parseFloat(latStr || '');
         const lng = parseFloat(lngStr || '');

         if (!isNaN(lat) && !isNaN(lng)) {
            isLoading.value = true;
            try {
               // Buscamos a 1km a la redonda por defecto
               const { data } = await validationApi.getNearbyClients(lat, lng, 200, client.clienteid);

               if (data.success) {
                  nearbyCandidates.value = data.data;

                  // ✅ NUEVO: Auto-selección del vecino más cercano (El #1 de la lista)
                  if (nearbyCandidates.value.length > 0) {
                     // Esto hace que la tabla comparativa se abra sola inmediatamente
                     candidateToCompare.value = nearbyCandidates.value[0] || null;
                  }
               }
            } catch (error) {
               console.error('Error fetching nearby candidates:', error);
            } finally {
               isLoading.value = false;
            }
         }
      }
   };

   const selectNextClient = async () => {
      if (!selectedClient.value) return;

      const currentIndex = pendingClients.value.findIndex(c => c.clienteid === selectedClient.value?.clienteid);
      if (currentIndex !== -1 && currentIndex < pendingClients.value.length - 1) {
         const nextClient = pendingClients.value[currentIndex + 1];
         if (nextClient) {
            await selectClientForReview(nextClient);
         }
      }
   };

   const saveClientAction = async () => {
      if (!selectedClient.value) return;

      try {
         isLoading.value = true;
         const { data } = await validationApi.saveClient(selectedClient.value.clienteid, selectedClient.value);
         if (data.success) {
            // Eliminar de pendientes o marcar como revisado (depende de lógica de negocio, asumimos eliminar por ahora)
            // O avanzar al siguiente
            console.log('Cliente guardado correctamente');
            await selectNextClient();

            // Refetch lista si es necesario o filtrar localmente
            // pendingClients.value = pendingClients.value.filter(c => c.clienteid !== savedId); (Optimizacion futura)
         }
      } catch (error: any) {
         console.error('Error saving client:', error);
         if (error.response) {
            console.error('Server responded with:', error.response.status, error.response.data);
            alert(`Error al guardar: ${error.response.data.message || 'Error del servidor'}`);
         } else {
            alert('Error de conexión al intentar guardar.');
         }
         throw error;
      } finally {
         isLoading.value = false;
      }
   };

   // const applyMatchLogic = () => {
   //    if (!selectedClient.value || !candidateToCompare.value) return;

   //    const master = selectedClient.value;
   //    const candidate = candidateToCompare.value;

   //    // 1. Copiar valores del Candidato al Master
   //    // Campos: 'canal', 'canalm', 'formato', 'gerencia', 'zona', 'jefatura'
   //    // Mapeamos keys dinámicamente si existen
   //    (master as any).canal = (candidate as any).canal || (candidate as any).canalm;
   //    (master as any).canalm = (candidate as any).canalm || (candidate as any).canal;
   //    (master as any).formato = (candidate as any).formato || (candidate as any).formatocte;
   //    (master as any).formatocte = (candidate as any).formatocte || (candidate as any).formato;

   //    // Hierarchy
   //    (master as any).Gerencia = (candidate as any).Gerencia;
   //    (master as any).Zona = (candidate as any).Zona;
   //    (master as any).Jefatura = (candidate as any).Jefatura;

   //    // UMAF (si aplica)
   //    if ((candidate as any).umaf) (master as any).umaf = (candidate as any).umaf;

   //    // 2. Ruta Conflict Check
   //    if (master.Ruta !== candidate.Ruta) {
   //       // Podríamos usar un estado global para alertas, por ahora console warning
   //       console.warn('Conflicto de Ruta detectado:', master.Ruta, 'vs', candidate.Ruta);
   //       alert(`Conflicto de Ruta: Master [${master.Ruta}] vs Candidato [${candidate.Ruta}]. Verifique.`);
   //    }

   //    // Update TipoCli
   //    master.TipoCli = 'Igual';
   // };

   const applyMatchLogic = () => {
      if (!selectedClient.value || !candidateToCompare.value) return;

      const master = selectedClient.value;
      const candidate = candidateToCompare.value;


      // 1. Copiar valores del Candidato al Master
      (master as any).canal = (candidate as any).canal || (candidate as any).canalm;
      (master as any).canalm = (candidate as any).canalm || (candidate as any).canal;
      (master as any).formato = (candidate as any).formato || (candidate as any).formatocte;
      (master as any).formatocte = (candidate as any).formatocte || (candidate as any).formato;

      // Hierarchy
      (master as any).Gerencia = (candidate as any).Gerencia;
      (master as any).Zona = (candidate as any).Zona;
      (master as any).Jefatura = (candidate as any).Jefatura;

      // UMAF (si aplica)
      if ((candidate as any).umaf) (master as any).umaf = (candidate as any).umaf;

      // 2. Ruta Conflict Check
      if (master.Ruta !== candidate.Ruta) {
         console.warn('Conflicto de Ruta detectado:', master.Ruta, 'vs', candidate.Ruta);
         alert(`⚠️ ATENCIÓN: Conflicto de Ruta.\nMaster: ${master.Ruta}\nCandidato: ${candidate.Ruta}\n\nPor favor verifique.`);
      }

      // 3. Update TipoCli (CORREGIDO)
      // En lugar de poner el texto "Igual", copiamos el estatus real del vecino
      if (candidate.TipoCli) {
         master.TipoCli = candidate.TipoCli;
      }
   };

   const applyNewClientLogic = () => {
      if (!selectedClient.value) return;

      const year = new Date().getFullYear();
      selectedClient.value.TipoCli = `Nuevo${year}`;
   };

   const applySkipLogic = async () => {
      if (!selectedClient.value) return;

      selectedClient.value.TipoCli = 'SA'; // Sin Análisis
      await saveClientAction();
   };

   return {
      // State
      pendingClients,
      selectedClient,
      nearbyCandidates,
      candidateToCompare,
      isLoading,
      totalPending,
      currentPage,

      // Actions
      fetchPendingClients,
      selectClientForReview,
      setCandidateForComparison,
      selectNextClient,
      saveClientAction,
      applyMatchLogic,
      applyNewClientLogic,
      applySkipLogic
   };
});

// Implementation details to be added inside the defineStore function before return
