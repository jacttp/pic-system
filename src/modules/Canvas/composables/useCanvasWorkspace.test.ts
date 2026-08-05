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

  it('abre Selección al elegir una columna desde la gráfica', () => {
    const workspace = useCanvasWorkspace(false);
    workspace.registerSelection('chart');

    expect(workspace.inspectorOpen.value).toBe(true);
    expect(workspace.activeTab.value).toBe('selection');
  });

  it('abre Selección cuando el origen es el ranking', () => {
    const workspace = useCanvasWorkspace(false);
    workspace.registerSelection('ranking');

    expect(workspace.inspectorOpen.value).toBe(true);
    expect(workspace.activeTab.value).toBe('selection');
  });

  it('inicia colapsado cuando no se solicita apertura explícita', () => {
    const workspace = useCanvasWorkspace();
    expect(workspace.inspectorOpen.value).toBe(false);
    expect(workspace.inspectorCollapsed.value).toBe(true);
  });

  it('restablece contexto al cambiar el escenario', () => {
    const workspace = useCanvasWorkspace(true);
    workspace.registerSelection('chart');
    workspace.setActiveTab('evidence');
    workspace.resetContext();

    expect(workspace.activeTab.value).toBe('priorities');
    expect(workspace.inspectorOpen.value).toBe(true);
  });
});
