import { computed, ref } from 'vue';
import type { CanvasInspectorTab, CanvasSelectionSource } from '../types/canvasTypes';

export const useCanvasWorkspace = (initialOpen = false) => {
  const inspectorOpen = ref(initialOpen);
  const activeTab = ref<CanvasInspectorTab>('priorities');
  const hasUnreadSelection = ref(false);

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
    if (tab === 'selection') hasUnreadSelection.value = false;
  };

  const registerSelection = (source: CanvasSelectionSource) => {
    if (source === 'chart') {
      hasUnreadSelection.value = activeTab.value !== 'selection' || !inspectorOpen.value;
      return;
    }

    activeTab.value = 'selection';
    inspectorOpen.value = true;
    hasUnreadSelection.value = false;
  };

  const resetContext = () => {
    activeTab.value = 'priorities';
    hasUnreadSelection.value = false;
  };

  return {
    inspectorOpen,
    inspectorCollapsed,
    activeTab,
    hasUnreadSelection,
    setInspectorOpen,
    toggleInspector,
    setActiveTab,
    registerSelection,
    resetContext,
  };
};
