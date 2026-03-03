import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    R: parseInt(result[1], 16),
    G: parseInt(result[2], 16),
    B: parseInt(result[3], 16)
  } : null;
}

export function rgbToHex(r: number, g: number, b: number) {
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
}

export function figmaRgbToHex(r: number, g: number, b: number): string {
  const to255 = (c: number) => Math.min(255, Math.max(0, Math.round(c * 255)));
  return rgbToHex(to255(r), to255(g), to255(b));
}

// Simple color similarity check using Euclidean distance in RGB space
export function getColorSimilarity(hex1: string, hex2: string): number {
  const rgb1 = hexToRgb(hex1);
  const rgb2 = hexToRgb(hex2);
  if (!rgb1 || !rgb2) return 0;

  const distance = Math.sqrt(
    Math.pow(rgb1.R - rgb2.R, 2) +
    Math.pow(rgb1.G - rgb2.G, 2) +
    Math.pow(rgb1.B - rgb2.B, 2)
  );

  // Max distance is sqrt(255^2 * 3) ≈ 441.67
  return 1 - (distance / 441.67);
}
