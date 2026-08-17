// Paleta de referencia validada (skill dataviz): CVD-safe en orden fijo, nunca ciclada.
// Ambas variantes (clara/oscura) pasaron el validador contra las superficies reales de esta app
// (#ffffff claro, #1e293b oscuro) — ver el plan de este cambio para el detalle de la corrida.
export const CATEGORICAL_LIGHT = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948'];
export const CATEGORICAL_DARK = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767'];

// Rampa secuencial de un solo tono (azul), mas oscuro = mas alto.
export const SEQUENTIAL_LIGHT = ['#cde2fb', '#9ec5f4', '#6da7ec', '#3987e5', '#256abf', '#184f95', '#0d366b'];
export const SEQUENTIAL_DARK = ['#184f95', '#256abf', '#3987e5', '#6da7ec', '#9ec5f4', '#cde2fb', '#e8f1fc'];

export function categoricalPalette(isDark) {
  return isDark ? CATEGORICAL_DARK : CATEGORICAL_LIGHT;
}

export function sequentialColorFor(value, min, max, isDark) {
  const ramp = isDark ? SEQUENTIAL_DARK : SEQUENTIAL_LIGHT;
  if (max === min) return ramp[Math.floor(ramp.length / 2)];
  const t = (value - min) / (max - min);
  const idx = Math.min(ramp.length - 1, Math.max(0, Math.round(t * (ramp.length - 1))));
  return ramp[idx];
}

// Tonos con contraste <3:1 sobre alguna de las dos superficies (marcados WARN por el validador):
// estos slots SIEMPRE deben ir acompañados de etiqueta directa visible, nunca solo color.
export const LOW_CONTRAST_HEXES = new Set(['#1baf7a', '#eda100', '#e87ba4', '#199e70', '#c98500', '#d55181', '#008300']);
