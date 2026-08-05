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
