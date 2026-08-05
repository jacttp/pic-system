export const supportsCanvasWebGL = () => {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(
      canvas.getContext('webgl2') || canvas.getContext('webgl'),
    );
  } catch {
    return false;
  }
};

export const CANVAS_BREAKDOWN_COLORS = [
  '#E1E651',
  '#2B97C7',
  '#FBC5DB',
  '#C72C45',
  '#8bcddd',
  '#DD7182',
  '#b5d184',
  '#9F59F4',
] as const;

export const CANVAS_PARTICIPATION_MATERIAL = {
  shading: 'lambert',
  bevelSize: 0,
  bevelSmoothness: 0,
  label: { show: false },
  itemStyle: { opacity: 1 },
  emphasis: {
    label: { show: false },
    itemStyle: { opacity: 1 },
  },
} as const;

export const CANVAS_3D_LIGHT = {
  main: {
    color: '#ffffff',
    intensity: 1.05,
    alpha: 45,
    beta: 35,
    shadow: true,
    shadowQuality: 'medium',
  },
  ambient: {
    color: '#ffffff',
    intensity: 0.3,
  },
} as const;

export const CANVAS_3D_POST_EFFECT = {
  enable: true,
  bloom: { enable: false },
  depthOfField: { enable: false },
  screenSpaceAmbientOcclusion: {
    enable: true,
    radius: 2,
    intensity: 1.25,
    quality: 'medium',
  },
  edge: { enable: true },
  FXAA: { enable: true },
  colorCorrection: {
    enable: true,
    exposure: 0,
    brightness: 0,
    contrast: 1.06,
    saturation: 1,
  },
} as const;

export const canvas3DBarSize = (
  boxWidth: number,
  boxDepth: number,
  xCount: number,
  yCount: number,
  fillRatio = 0.62,
) => [
  (boxWidth / Math.max(1, xCount)) * fillRatio,
  (boxDepth / Math.max(1, yCount)) * fillRatio,
] as const;

interface CanvasOriginDeckOptions {
  xCount: number;
  yCount: number;
  boxWidth: number;
  boxDepth: number;
  thickness: number;
  color: string;
}

export const createCanvasOriginDeckSeries = ({
  xCount,
  yCount,
  boxWidth,
  boxDepth,
  thickness,
  color,
}: CanvasOriginDeckOptions) => {
  const data = Array.from({ length: Math.max(0, xCount * yCount) }, (_, index) => [
    index % xCount,
    Math.floor(index / xCount),
    -Math.abs(thickness),
  ]);

  return {
    type: 'bar3D' as const,
    name: 'Base de origen',
    coordinateSystem: 'cartesian3D' as const,
    data,
    barSize: [
      boxWidth / Math.max(1, xCount),
      boxDepth / Math.max(1, yCount),
    ],
    shading: 'color' as const,
    bevelSize: 0,
    bevelSmoothness: 0,
    silent: true,
    animation: false,
    itemStyle: {
      color,
      opacity: 0.40,
    },
    label: { show: false },
    emphasis: { label: { show: false } },
    tooltip: { show: false },
  };
};

interface CanvasSelectionMarkerOptions {
  xIndex: number;
  yIndex: number;
  value: number;
  color: string;
  surfaceColor: string;
  textColor: string;
}

export const createCanvasSelectionMarkerSeries = ({
  xIndex,
  yIndex,
  value,
  color,
  surfaceColor,
  textColor,
}: CanvasSelectionMarkerOptions) => ({
  type: 'scatter3D' as const,
  name: 'Selección actual',
  coordinateSystem: 'cartesian3D' as const,
  data: [[xIndex, yIndex, value]],
  symbol: 'diamond',
  symbolSize: 18,
  silent: true,
  animation: false,
  itemStyle: {
    color,
    opacity: 1,
  },
  label: {
    show: true,
    formatter: 'Selección',
    distance: 7,
    textStyle: {
      color: textColor,
      fontSize: 10,
      fontWeight: 'bold',
      backgroundColor: surfaceColor,
      borderColor: color,
      borderWidth: 1,
      borderRadius: 4,
      padding: [4, 6],
    },
  },
  emphasis: { label: { show: true } },
  tooltip: { show: false },
});

export const canvasBreakdownColor = (value: string, domain: string[]) => {
  const index = domain.indexOf(value);
  const stableIndex = index >= 0
    ? index
    : [...value].reduce((total, character) => total + character.charCodeAt(0), 0);
  return CANVAS_BREAKDOWN_COLORS[stableIndex % CANVAS_BREAKDOWN_COLORS.length]!;
};

export const canvasHslTokenToHex = (token: string, fallback: string) => {
  const match = token.trim().match(/^(-?\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%$/);
  if (!match) return fallback;

  const hue = ((Number(match[1]) % 360) + 360) % 360;
  const saturation = Number(match[2]) / 100;
  const lightness = Number(match[3]) / 100;
  const chroma = (1 - Math.abs((2 * lightness) - 1)) * saturation;
  const segment = hue / 60;
  const secondary = chroma * (1 - Math.abs((segment % 2) - 1));
  const offset = lightness - (chroma / 2);
  const [red, green, blue] = segment < 1 ? [chroma, secondary, 0]
    : segment < 2 ? [secondary, chroma, 0]
      : segment < 3 ? [0, chroma, secondary]
        : segment < 4 ? [0, secondary, chroma]
          : segment < 5 ? [secondary, 0, chroma]
            : [chroma, 0, secondary];
  const channel = (value: number) => Math.round((value + offset) * 255)
    .toString(16)
    .padStart(2, '0');

  return `#${channel(red)}${channel(green)}${channel(blue)}`;
};

export const mixCanvasHexColor = (from: string, to: string, ratio: number) => {
  const parse = (color: string) => color.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i)
    ?.slice(1)
    .map((channel) => Number.parseInt(channel, 16));
  const start = parse(from);
  const end = parse(to);
  if (!start || !end) return to;
  const weight = Math.min(1, Math.max(0, ratio));
  const channel = (index: number) => Math.round(start[index]! + ((end[index]! - start[index]!) * weight))
    .toString(16)
    .padStart(2, '0');
  return `#${channel(0)}${channel(1)}${channel(2)}`;
};

export const canvasSignedChartColor = (
  value: number,
  maxMagnitude: number,
  colors: { lossSoft: string; loss: string; gainSoft: string; gain: string; neutral: string },
) => {
  if (value === 0) return colors.neutral;
  const intensity = 0.35 + (0.65 * Math.min(1, Math.abs(value) / Math.max(maxMagnitude, 1)));
  return value < 0
    ? mixCanvasHexColor(colors.lossSoft, colors.loss, intensity)
    : mixCanvasHexColor(colors.gainSoft, colors.gain, intensity);
};

export const createCanvasSignedHeatmapVisualMap = (
  values: number[],
  colors: { loss: string; neutral: string; gain: string },
) => {
  const maxMagnitude = Math.max(1, ...values.map((value) => Math.abs(value)));
  return {
    show: false,
    type: 'continuous' as const,
    min: -maxMagnitude,
    max: maxMagnitude,
    dimension: 3,
    calculable: false,
    inRange: {
      color: [colors.loss, colors.neutral, colors.gain],
    },
  };
};

export const readCanvasChartPalette = () => {
  const styles = getComputedStyle(document.documentElement);
  const hsl = (token: string, fallback: string) => {
    const value = styles.getPropertyValue(token).trim();
    return value ? canvasHslTokenToHex(value, fallback) : fallback;
  };

  return {
    blue: hsl('--pic-accent-blue', '#2563eb'),
    blueSoft: hsl('--pic-accent-blue-soft', '#dbeafe'),
    orange: hsl('--pic-accent-orange', '#ea580c'),
    orangeSoft: hsl('--pic-accent-orange-soft', '#ffedd5'),
    brand: hsl('--pic-brand', '#9f1239'),
    text: hsl('--pic-text-main', '#0f172a'),
    muted: hsl('--pic-text-muted', '#64748b'),
    border: hsl('--pic-border', '#e2e8f0'),
    surface: hsl('--pic-surface', '#ffffff'),
    missing: '#cbd5e1',
  };
};
