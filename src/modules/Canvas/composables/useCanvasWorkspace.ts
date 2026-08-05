import { computed, ref } from 'vue';
import type { CanvasInspectorTab, CanvasSelectionSource } from '../types/canvasTypes';

export const useCanvasWorkspace = (initialOpen = false) => {
  const inspectorOpen = ref(initialOpen);
  const activeTab = ref<CanvasInspectorTab>('priorities');

  const inspectorCollapsed = computed(() => !inspectorOpen.value);

  const setInspectorOpen = (open: boolean) => {
    inspectorOpen.value = open;
  };

  const toggleInspector = () => {
    inspectorOpen.value = !inspectorOpen.value;
  };

  const setActiveTab = (tab: CanvasInspectorTab) => {
    activeTab.value = tab;
    inspectorOpen.value = true;
  };

  const registerSelection = (_source: CanvasSelectionSource) => {
    activeTab.value = 'selection';
    inspectorOpen.value = true;
  };

  const resetContext = () => {
    activeTab.value = 'priorities';
  };

  return {
    inspectorOpen,
    inspectorCollapsed,
    activeTab,
    setInspectorOpen,
    toggleInspector,
    setActiveTab,
    registerSelection,
    resetContext,
  };
};
