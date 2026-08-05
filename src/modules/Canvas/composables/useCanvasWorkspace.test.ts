import { describe, expect, it } from 'vitest';
import { useCanvasWorkspace } from './useCanvasWorkspace';

describe('useCanvasWorkspace', () => {
  it('colapsa, abre y cambia pestañas explícitamente', () => {
    const workspace = useCanvasWorkspace(true);
    expect(workspace.inspectorCollapsed.value).toBe(false);

    workspace.toggleInspector();
    expect(workspace.inspectorOpen.value).toBe(false);

    workspace.setActiveTab('evidence');
    expect(workspace.inspectorOpen.value).toBe(true);
    expect(workspace.activeTab.value).toBe('evidence');
  });

  it('notifica una selección desde gráfica sin forzar la apertura', () => {
    const workspace = useCanvasWorkspace(false);
    workspace.registerSelection('chart');

    expect(workspace.inspectorOpen.value).toBe(false);
    expect(workspace.activeTab.value).toBe('priorities');
    expect(workspace.hasUnreadSelection.value).toBe(true);
  });

  it('abre Selección cuando el origen es el ranking', () => {
    const workspace = useCanvasWorkspace(false);
    workspace.registerSelection('ranking');

    expect(workspace.inspectorOpen.value).toBe(true);
    expect(workspace.activeTab.value).toBe('selection');
    expect(workspace.hasUnreadSelection.value).toBe(false);
  });

  it('restablece contexto al cambiar el escenario', () => {
    const workspace = useCanvasWorkspace(true);
    workspace.registerSelection('chart');
    workspace.setActiveTab('evidence');
    workspace.resetContext();

    expect(workspace.activeTab.value).toBe('priorities');
    expect(workspace.hasUnreadSelection.value).toBe(false);
    expect(workspace.inspectorOpen.value).toBe(true);
  });
});
