import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import setupApi from '@/modules/Setup/services/setupApi';
import {
  applyUiThemePalette,
  cloneUiThemeCatalog,
  defaultUiThemeCatalog,
  getActiveUiThemePalette,
  getStoredUiThemeCatalog,
  saveUiThemeCatalogCache,
  type UiThemeCatalog,
  type UiThemeCatalogResult,
  type UiThemePalette,
} from '@/modules/Shared/design/uiTheme';

const slugifyPaletteId = (value: string) => {
  const slug = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return slug || `paleta-${Date.now()}`;
};

const getUniquePaletteId = (baseId: string, palettes: UiThemePalette[]) => {
  const usedIds = new Set(palettes.map((palette) => palette.id));
  if (!usedIds.has(baseId)) return baseId;

  let index = 2;
  while (usedIds.has(`${baseId}-${index}`)) index += 1;
  return `${baseId}-${index}`;
};

const THEME_AUTO_SAVE_DELAY_MS = 600;

export const useUiThemeStore = defineStore('uiTheme', () => {
  const catalog = ref<UiThemeCatalog>(getStoredUiThemeCatalog());
  const persistedCatalog = ref<UiThemeCatalog | null>(null);
  const isLoading = ref(false);
  const isSaving = ref(false);
  const lastError = ref<string | null>(null);
  const isUsingFallback = ref(false);
  const isPersisted = ref(false);
  const updatedAt = ref<string | null>(null);
  const updatedBy = ref<number | null>(null);
  let hasLoadedFromServer = false;
  let loadPromise: Promise<boolean> | null = null;
  let autoSaveTimer: ReturnType<typeof setTimeout> | null = null;

  const palettes = computed(() => catalog.value.palettes);
  const activePaletteId = computed(() => catalog.value.activePaletteId);
  const activePalette = computed(() => getActiveUiThemePalette(catalog.value));
  const catalogFingerprint = (value: UiThemeCatalog) => JSON.stringify(cloneUiThemeCatalog(value));
  const isDirty = computed(() => (
    persistedCatalog.value
      ? catalogFingerprint(catalog.value) !== catalogFingerprint(persistedCatalog.value)
      : false
  ));

  const cacheAndApply = () => {
    const nextCatalog = cloneUiThemeCatalog(catalog.value);
    catalog.value = nextCatalog;
    applyUiThemePalette(getActiveUiThemePalette(nextCatalog));
    saveUiThemeCatalogCache(nextCatalog);
  };

  const updatePersistenceState = (result: UiThemeCatalogResult) => {
    persistedCatalog.value = cloneUiThemeCatalog(result.catalog);
    isUsingFallback.value = result.fallback;
    isPersisted.value = result.persisted;
    updatedAt.value = result.updatedAt;
    updatedBy.value = result.updatedBy;
  };

  const hydrateFromServer = (result: UiThemeCatalogResult) => {
    const nextCatalog = cloneUiThemeCatalog(result.catalog);
    catalog.value = nextCatalog;
    updatePersistenceState(result);
    cacheAndApply();
  };

  const loadThemeCatalog = async (force = false): Promise<boolean> => {
    if (!window.localStorage.getItem('pic_auth_token')) {
      isUsingFallback.value = true;
      isPersisted.value = false;
      return false;
    }

    if (loadPromise) return loadPromise;
    if (hasLoadedFromServer && !force) return true;

    isLoading.value = true;
    lastError.value = null;
    cacheAndApply();

    const request = (async () => {
      try {
        const response = await setupApi.getUiThemeCatalog();
        hydrateFromServer(response);
        hasLoadedFromServer = true;
        return true;
      } catch (error) {
        console.warn('[uiThemeStore] No se pudo cargar catalogo UI. Usando cache local.', error);
        lastError.value = 'No se pudo cargar el catálogo desde el servidor.';
        isUsingFallback.value = true;
        return false;
      } finally {
        isLoading.value = false;
      }
    })();

    loadPromise = request;
    try {
      return await request;
    } finally {
      if (loadPromise === request) loadPromise = null;
    }
  };

  const restoreThemeCatalog = () => {
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer);
      autoSaveTimer = null;
    }
    return loadThemeCatalog(true);
  };

  const queueThemeCatalogSave = () => {
    if (!window.localStorage.getItem('pic_auth_token') || !isDirty.value) return;
    if (autoSaveTimer) clearTimeout(autoSaveTimer);

    autoSaveTimer = setTimeout(() => {
      autoSaveTimer = null;
      if (!isSaving.value && isDirty.value) void saveThemeCatalog();
    }, THEME_AUTO_SAVE_DELAY_MS);
  };

  const applyDraftChanges = () => {
    cacheAndApply();
    queueThemeCatalogSave();
  };

  async function saveThemeCatalog() {
    if (isSaving.value) return false;
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer);
      autoSaveTimer = null;
    }

    isSaving.value = true;
    lastError.value = null;
    let draftChangedDuringSave = false;

    try {
      const submittedCatalog = cloneUiThemeCatalog(catalog.value);
      const submittedFingerprint = catalogFingerprint(submittedCatalog);
      const response = await setupApi.updateUiThemeCatalog(submittedCatalog);
      if (!response.persisted) throw new Error('El servidor no confirmó la persistencia del catálogo.');
      draftChangedDuringSave = catalogFingerprint(catalog.value) !== submittedFingerprint;

      if (draftChangedDuringSave) {
        updatePersistenceState(response);
        cacheAndApply();
      } else {
        hydrateFromServer(response);
      }
      hasLoadedFromServer = true;
      return true;
    } catch (error) {
      console.error('[uiThemeStore] Error guardando catalogo UI:', error);
      lastError.value = 'No se pudo guardar el catalogo de paletas.';
      return false;
    } finally {
      isSaving.value = false;
      if (draftChangedDuringSave) queueThemeCatalogSave();
    }
  }

  const setActivePalette = (id: string) => {
    if (!catalog.value.palettes.some((palette) => palette.id === id)) return;
    catalog.value = { ...catalog.value, activePaletteId: id };
    applyDraftChanges();
  };

  const createPalette = (payload?: Partial<UiThemePalette>) => {
    const basePalette = activePalette.value || defaultUiThemeCatalog.palettes[0]!;
    const name = payload?.name?.trim() || 'Nueva paleta';
    const id = getUniquePaletteId(payload?.id || slugifyPaletteId(name), catalog.value.palettes);
    const palette: UiThemePalette = {
      id,
      name,
      description: payload?.description?.trim() || 'Paleta personalizada.',
      isSystem: false,
      tokens: {
        ...basePalette.tokens,
        ...payload?.tokens,
      },
    };

    catalog.value = {
      ...catalog.value,
      activePaletteId: id,
      palettes: [...catalog.value.palettes, palette],
    };
    applyDraftChanges();
    return palette;
  };

  const duplicatePalette = (id: string) => {
    const source = catalog.value.palettes.find((palette) => palette.id === id);
    if (!source) return null;

    return createPalette({
      id: getUniquePaletteId(`${source.id}-copy`, catalog.value.palettes),
      name: `${source.name} copia`,
      description: source.description,
      tokens: { ...source.tokens },
    });
  };

  const updatePalette = (id: string, changes: Partial<UiThemePalette>) => {
    const nextPalettes = catalog.value.palettes.map((palette) => {
      if (palette.id !== id) return palette;
      return {
        ...palette,
        ...changes,
        id: palette.id,
        isSystem: palette.isSystem,
        tokens: {
          ...palette.tokens,
          ...changes.tokens,
        },
      };
    });

    catalog.value = {
      ...catalog.value,
      palettes: nextPalettes,
    };
    applyDraftChanges();
  };

  const deletePalette = (id: string) => {
    const target = catalog.value.palettes.find((palette) => palette.id === id);
    if (!target || target.isSystem || catalog.value.palettes.length <= 1) return false;

    const nextPalettes = catalog.value.palettes.filter((palette) => palette.id !== id);
    catalog.value = {
      ...catalog.value,
      activePaletteId: catalog.value.activePaletteId === id ? nextPalettes[0]!.id : catalog.value.activePaletteId,
      palettes: nextPalettes,
    };
    applyDraftChanges();
    return true;
  };

  return {
    catalog,
    persistedCatalog,
    palettes,
    activePaletteId,
    activePalette,
    isLoading,
    isSaving,
    isDirty,
    isPersisted,
    lastError,
    isUsingFallback,
    updatedAt,
    updatedBy,
    loadThemeCatalog,
    restoreThemeCatalog,
    saveThemeCatalog,
    setActivePalette,
    createPalette,
    duplicatePalette,
    updatePalette,
    deletePalette,
  };
});
