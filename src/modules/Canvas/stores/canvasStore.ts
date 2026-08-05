import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import type {
  CanvasAxisConfig,
  CanvasDimension,
  CanvasMetric,
  CanvasRow,
  CanvasValidationIssue,
  CanvasViewMode,
} from '../types/canvasTypes';
import {
  analyzeCanvasRows,
  createCanvasAxisConfig,
  resolveCanvasFilterDimension,
  uniqueInSourceOrder,
} from '../utils/canvasAnalytics';
import { readCanvasFile } from '../utils/canvasParser';

export const useCanvasStore = defineStore('canvas', () => {
  const rows = ref<CanvasRow[]>([]);
  const fileName = ref('');
  const fileSize = ref(0);
  const issues = ref<CanvasValidationIssue[]>([]);
  const isParsing = ref(false);
  const axis = ref<CanvasAxisConfig>(createCanvasAxisConfig());
  const metric = ref<CanvasMetric>('netDifference');
  const viewMode = ref<CanvasViewMode>('bar3d');
  const selectedFilterValues = ref<string[]>([]);
  const selectedCellKey = ref<string | null>(null);

  const hasData = computed(() => rows.value.length > 0 && issues.value.length === 0);
  const filterValues = computed(() => uniqueInSourceOrder(rows.value, axis.value.filter));
  const analysis = computed(() => analyzeCanvasRows(
    rows.value,
    axis.value,
    selectedFilterValues.value,
    metric.value,
  ));
  const selectedCell = computed(() => analysis.value.cells.find(
    (cell) => cell.key === selectedCellKey.value,
  ) || null);

  const syncFilterValues = () => {
    selectedFilterValues.value = uniqueInSourceOrder(rows.value, axis.value.filter);
    selectedCellKey.value = null;
  };

  const loadFile = async (file: File) => {
    isParsing.value = true;
    issues.value = [];
    rows.value = [];
    fileName.value = file.name;
    fileSize.value = file.size;
    selectedCellKey.value = null;

    try {
      const result = await readCanvasFile(file);
      issues.value = result.issues;
      rows.value = result.issues.length === 0 ? result.rows : [];
      if (rows.value.length > 0) syncFilterValues();
    } finally {
      isParsing.value = false;
    }
  };

  const setAxisDimension = (target: 'x' | 'y', dimension: CanvasDimension) => {
    const current = axis.value;
    const swappedX = target === 'x'
      ? dimension
      : dimension === current.x ? current.y : current.x;
    const swappedY = target === 'y'
      ? dimension
      : dimension === current.y ? current.x : current.y;

    axis.value = {
      x: swappedX,
      y: swappedY,
      filter: resolveCanvasFilterDimension(swappedX, swappedY),
    };
    syncFilterValues();
  };

  const toggleFilterValue = (value: string) => {
    const selected = new Set(selectedFilterValues.value);
    if (selected.has(value) && selected.size > 1) selected.delete(value);
    else selected.add(value);
    selectedFilterValues.value = filterValues.value.filter((item) => selected.has(item));
    selectedCellKey.value = null;
  };

  const selectAllFilterValues = () => {
    selectedFilterValues.value = [...filterValues.value];
    selectedCellKey.value = null;
  };

  const setMetric = (value: CanvasMetric) => {
    metric.value = value;
    selectedCellKey.value = null;
  };

  const setViewMode = (value: CanvasViewMode) => {
    viewMode.value = value;
  };

  const selectCell = (key: string | null) => {
    selectedCellKey.value = key;
  };

  const reset = () => {
    rows.value = [];
    fileName.value = '';
    fileSize.value = 0;
    issues.value = [];
    isParsing.value = false;
    axis.value = createCanvasAxisConfig();
    metric.value = 'netDifference';
    viewMode.value = 'bar3d';
    selectedFilterValues.value = [];
    selectedCellKey.value = null;
  };

  return {
    rows,
    fileName,
    fileSize,
    issues,
    isParsing,
    axis,
    metric,
    viewMode,
    selectedFilterValues,
    selectedCellKey,
    hasData,
    filterValues,
    analysis,
    selectedCell,
    loadFile,
    setAxisDimension,
    toggleFilterValue,
    selectAllFilterValues,
    setMetric,
    setViewMode,
    selectCell,
    reset,
  };
});
