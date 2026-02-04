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

   const validationAction = ref<'duplicate' | 'new' | null>(null);
   const manualCheckRequired = ref(false);

   const applyMatchLogic = () => {
      if (!selectedClient.value || !candidateToCompare.value) return;

      const master = selectedClient.value;
      const candidate = candidateToCompare.value;

      // Reset states
      manualCheckRequired.value = false;
      validationAction.value = null;

      // --- REGLA EXCEPCIÓN "M" ---
      // Si el candidato es "M" (Muerto/Modificado), NO copiamos Formato ni TipoCli automáticamente
      const candTipoCli = candidate.TipoCli ? String(candidate.TipoCli).trim().toLowerCase() : '';
      const isCandidateM = candTipoCli.startsWith('m'); // insensitive check

      if (isCandidateM) {
         manualCheckRequired.value = true;
      }

      // --- HERENCIA MASIVA (ADOPCIÓN TOTAL) ---
      // Lista estricta de campos a copiar:
      // Matriz, Cadena, Canal, Canalm, Formato(con excepcion), Gerencia, Zona, Jefatura, Umaf

      // 1. Matriz & Cadena
      if ((candidate as any).Matriz) (master as any).Matriz = (candidate as any).Matriz;
      if ((candidate as any).Cadena) (master as any).Cadena = (candidate as any).Cadena;

      // 2. Canal & Canalm (Bidireccional fallback si uno falta en candidato, pero priorizando candidato)
      (master as any).canal = (candidate as any).canal || (candidate as any).canalm;
      (master as any).canalm = (candidate as any).canalm || (candidate as any).canal;

      // 3. Jerarquía Comercial
      (master as any).Gerencia = (candidate as any).Gerencia;
      (master as any).Zona = (candidate as any).Zona;
      (master as any).Jefatura = (candidate as any).Jefatura;

      // 4. UMAF
      if ((candidate as any).umaf) (master as any).umaf = (candidate as any).umaf;

      // 5. Formato & TipoCli (CONDICIONAL)
      if (!isCandidateM) {
         // Si NO es "M", copiamos todo confiados
         (master as any).formato = (candidate as any).formato || (candidate as any).formatocte;
         (master as any).formatocte = (candidate as any).formatocte || (candidate as any).formato;

         if (candidate.TipoCli) {
            master.TipoCli = candidate.TipoCli;
         }
      } else {
         // Si ES "M", NO copiamos Formato ni TipoCli.
         // La UI debe alertar.
         console.warn('Excepción "M" detectada: No se heredaron Formato ni TipoCli. Revisión manual requerida.');
      }

      // 6. Ruta Conflict Check
      if (master.Ruta !== candidate.Ruta) {
         console.warn('Conflicto de Ruta detectado:', master.Ruta, 'vs', candidate.Ruta);
         alert(`⚠️ ATENCIÓN: Conflicto de Ruta.\nMaster: ${master.Ruta}\nCandidato: ${candidate.Ruta}\n\nPor favor verifique.`);
      }

      // Marcar acción como 'duplicate' para pintar de AZUL
      validationAction.value = 'duplicate';
   };

   const applyNewClientLogic = () => {
      if (!selectedClient.value) return;

      const year = new Date().getFullYear();
      selectedClient.value.TipoCli = `Nuevo${year}`;

      // Reset exception state
      manualCheckRequired.value = false;
      // Marcar acción como 'new' para pintar de VERDE
      validationAction.value = 'new';
   };

   const resetValidationState = () => {
      validationAction.value = null;
      manualCheckRequired.value = false;
   };

   // Hook into selection to reset state
   const originalSelectClientForReview = selectClientForReview;
   const selectClientForReviewWithReset = async (client: ClientPending) => {
      resetValidationState();
      await originalSelectClientForReview(client);
   }

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
      validationAction,
      manualCheckRequired,

      // Actions
      fetchPendingClients,
      selectClientForReview: selectClientForReviewWithReset, // Override with reset wrapper
      setCandidateForComparison,
      selectNextClient,
      saveClientAction,
      applyMatchLogic,
      applyNewClientLogic,
      applySkipLogic,
      resetValidationState
   };
});

// Implementation details to be added inside the defineStore function before return
