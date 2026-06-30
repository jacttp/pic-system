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

export const useUiThemeStore = defineStore('uiTheme', () => {
  const catalog = ref<UiThemeCatalog>(getStoredUiThemeCatalog());
  const isLoading = ref(false);
  const isSaving = ref(false);
  const lastError = ref<string | null>(null);
  const isUsingFallback = ref(false);

  const palettes = computed(() => catalog.value.palettes);
  const activePaletteId = computed(() => catalog.value.activePaletteId);
  const activePalette = computed(() => getActiveUiThemePalette(catalog.value));

  const cacheAndApply = () => {
    const nextCatalog = cloneUiThemeCatalog(catalog.value);
    catalog.value = nextCatalog;
    applyUiThemePalette(getActiveUiThemePalette(nextCatalog));
    saveUiThemeCatalogCache(nextCatalog);
  };

  const replaceCatalog = (nextCatalog: UiThemeCatalog, fallback = false) => {
    catalog.value = cloneUiThemeCatalog(nextCatalog);
    isUsingFallback.value = fallback;
    cacheAndApply();
  };

  const loadThemeCatalog = async () => {
    isLoading.value = true;
    lastError.value = null;
    cacheAndApply();

    if (!window.localStorage.getItem('pic_auth_token')) {
      isLoading.value = false;
      isUsingFallback.value = true;
      return;
    }

    try {
      const response = await setupApi.getUiThemeCatalog();
      replaceCatalog(response.catalog, response.fallback);
    } catch (error) {
      console.warn('[uiThemeStore] No se pudo cargar catalogo UI. Usando cache local.', error);
      lastError.value = 'No se pudo cargar el catalogo desde backend.';
      isUsingFallback.value = true;
    } finally {
      isLoading.value = false;
    }
  };

  const saveThemeCatalog = async () => {
    isSaving.value = true;
    lastError.value = null;

    try {
      const savedCatalog = await setupApi.updateUiThemeCatalog(cloneUiThemeCatalog(catalog.value));
      replaceCatalog(savedCatalog, false);
      return true;
    } catch (error) {
      console.error('[uiThemeStore] Error guardando catalogo UI:', error);
      lastError.value = 'No se pudo guardar el catalogo de paletas.';
      return false;
    } finally {
      isSaving.value = false;
    }
  };

  const setActivePalette = (id: string) => {
    if (!catalog.value.palettes.some((palette) => palette.id === id)) return;
    catalog.value = { ...catalog.value, activePaletteId: id };
    cacheAndApply();
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
      activePaletteId: id,
      palettes: [...catalog.value.palettes, palette],
    };
    cacheAndApply();
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
    cacheAndApply();
  };

  const deletePalette = (id: string) => {
    const target = catalog.value.palettes.find((palette) => palette.id === id);
    if (!target || target.isSystem || catalog.value.palettes.length <= 1) return false;

    const nextPalettes = catalog.value.palettes.filter((palette) => palette.id !== id);
    catalog.value = {
      activePaletteId: catalog.value.activePaletteId === id ? nextPalettes[0]!.id : catalog.value.activePaletteId,
      palettes: nextPalettes,
    };
    cacheAndApply();
    return true;
  };

  const applyPalette = (palette: UiThemePalette) => {
    applyUiThemePalette(palette);
    saveUiThemeCatalogCache(catalog.value);
  };

  return {
    catalog,
    palettes,
    activePaletteId,
    activePalette,
    isLoading,
    isSaving,
    lastError,
    isUsingFallback,
    loadThemeCatalog,
    saveThemeCatalog,
    setActivePalette,
    createPalette,
    duplicatePalette,
    updatePalette,
    deletePalette,
    applyPalette,
    replaceCatalog,
  };
});
