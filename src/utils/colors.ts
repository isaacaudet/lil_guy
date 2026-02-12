/** Default background colors for avatar containers (Tailwind 500 equivalents) */
export const DEFAULT_COLORS = [
  "#ec4899", // pink-500
  "#f59e0b", // amber-500
  "#3b82f6", // blue-500
  "#f97316", // orange-500
  "#10b981", // emerald-500
] as const;

/** Light mode variants (Tailwind 100 equivalents) */
export const DEFAULT_COLORS_LIGHT = [
  "#fce7f3", // pink-100
  "#fef3c7", // amber-100
  "#dbeafe", // blue-100
  "#ffedd5", // orange-100
  "#d1fae5", // emerald-100
] as const;

/** Dark mode variants (Tailwind 600 equivalents) */
export const DEFAULT_COLORS_DARK = [
  "#db2777", // pink-600
  "#d97706", // amber-600
  "#2563eb", // blue-600
  "#ea580c", // orange-600
  "#059669", // emerald-600
] as const;

const FALLBACK_COLOR = "#ec4899";

/** Get a color from an array by index (wraps around) */
export function getColor(colors: readonly string[], index: number): string {
  const palette = colors.length > 0 ? colors : DEFAULT_COLORS;
  return palette[index % palette.length] ?? FALLBACK_COLOR;
}
