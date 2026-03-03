import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function hexToRgb(hex: string): { R: number; G: number; B: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    R: parseInt(result[1], 16),
    G: parseInt(result[2], 16),
    B: parseInt(result[3], 16),
  } : null;
}

export function rgbToHex(r: number, g: number, b: number) {
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
}

export function figmaRgbToHex(r: number, g: number, b: number): string {
  const to255 = (c: number) => Math.min(255, Math.max(0, Math.round(c * 255)));
  return rgbToHex(to255(r), to255(g), to255(b));
}

// Weighted HSL distance — better than pure RGB Euclidean for perceived similarity
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return [h * 360, s * 100, l * 100];
}

export function colorDistance(hex1: string, hex2: string): number {
  const rgb1 = hexToRgb(hex1);
  const rgb2 = hexToRgb(hex2);
  if (!rgb1 || !rgb2) return 999;
  const hsl1 = rgbToHsl(rgb1.R, rgb1.G, rgb1.B);
  const hsl2 = rgbToHsl(rgb2.R, rgb2.G, rgb2.B);
  const dh = Math.min(Math.abs(hsl1[0] - hsl2[0]), 360 - Math.abs(hsl1[0] - hsl2[0])) / 180;
  const ds = Math.abs(hsl1[1] - hsl2[1]) / 100;
  const dl = Math.abs(hsl1[2] - hsl2[2]) / 100;
  return Math.sqrt(dh * dh * 0.4 + ds * ds * 0.3 + dl * dl * 0.3) * 100;
}

// Legacy — kept for compatibility
export function getColorSimilarity(hex1: string, hex2: string): number {
  const rgb1 = hexToRgb(hex1);
  const rgb2 = hexToRgb(hex2);
  if (!rgb1 || !rgb2) return 0;
  const distance = Math.sqrt(
    Math.pow(rgb1.R - rgb2.R, 2) +
    Math.pow(rgb1.G - rgb2.G, 2) +
    Math.pow(rgb1.B - rgb2.B, 2)
  );
  return 1 - distance / 441.67;
}

export function detectGridBase(values: number[]): number {
  const bases = [4, 8, 10, 12, 16];
  const scores = bases.map(base => ({
    base,
    score: values.filter(v => v > 0 && v % base === 0).length / Math.max(values.length, 1),
  }));
  scores.sort((a, b) => b.score - a.score);
  return scores[0].score > 0.35 ? scores[0].base : 8;
}

export function nearestGrid(value: number, base: number): number {
  return Math.round(value / base) * base;
}

export function getScoreColor(score: number): string {
  if (score >= 80) return "#c8f04a";
  if (score >= 60) return "#f5a524";
  return "#ff5c5c";
}

export function getScoreLabel(score: number): string {
  if (score >= 80) return "Healthy";
  if (score >= 60) return "Fair";
  if (score >= 40) return "Needs Work";
  return "Critical";
}

export function getSeverityStyles(severity: "error" | "warning" | "pass" | "info") {
  switch (severity) {
    case "error":   return { tag: "bg-[rgba(255,92,92,0.1)] text-[#ff5c5c] border border-[rgba(255,92,92,0.2)]",   label: "ERROR" };
    case "warning": return { tag: "bg-[rgba(245,165,36,0.1)] text-[#f5a524] border border-[rgba(245,165,36,0.2)]", label: "WARN" };
    case "pass":    return { tag: "bg-[rgba(200,240,74,0.12)] text-[#c8f04a] border border-[rgba(200,240,74,0.2)]", label: "PASS" };
    default:        return { tag: "bg-[rgba(92,164,255,0.1)] text-[#5ca4ff] border border-[rgba(92,164,255,0.2)]",  label: "INFO" };
  }
}
