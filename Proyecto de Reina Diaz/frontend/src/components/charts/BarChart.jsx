import { useState, useRef } from 'react';
import { categoricalPalette, sequentialColorFor } from './colors';

// Path de una barra con extremo redondeado solo del lado del dato (nunca en la base) —
// especificación de la skill dataviz: 4px de radio, cuadrado en la base.
function hBarPath(x, y, width, height, radius) {
  const w = Math.max(width, 0.01);
  const r = Math.min(radius, w, height / 2);
  if (w <= r * 1.5) {
    return `M${x},${y} h${w} v${height} h${-w} Z`;
  }
  return `M${x},${y} H${x + w - r} A${r},${r} 0 0 1 ${x + w},${y + r} V${y + height - r} A${r},${r} 0 0 1 ${x + w - r},${y + height} H${x} Z`;
}

function vBarPath(x, yTop, width, height, radius) {
  const h = Math.max(height, 0.01);
  const r = Math.min(radius, width / 2, h / 2);
  if (h <= r * 1.5) {
    return `M${x},${yTop} h${width} v${h} h${-width} Z`;
  }
  return `M${x + r},${yTop} H${x + width - r} A${r},${r} 0 0 1 ${x + width},${yTop + r} V${yTop + h} H${x} V${yTop + r} A${r},${r} 0 0 1 ${x + r},${yTop} Z`;
}

const fmt = (n) => n.toLocaleString('es-MX');

/**
 * Barra horizontal o vertical, hecha a mano siguiendo la skill dataviz:
 * extremos redondeados solo del lado del dato, gap de 2px, etiqueta de valor
 * siempre visible (nunca solo color), tooltip por barra en hover/foco.
 */
export default function BarChart({
  data,              // [{ label, value }]
  orientation = 'vertical', // 'vertical' (columnas) | 'horizontal' (barras)
  colorMode = 'sequential',  // 'sequential' | 'categorical'
  isDark = false,
  height = 280,
  valueFormatter = fmt,
  subLabel = null,
}) {
  const [hoverIdx, setHoverIdx] = useState(null);
  const containerRef = useRef(null);

  if (!data || data.length === 0) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Sin datos para este periodo.</div>;
  }

  const values = data.map(d => d.value);
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const palette = categoricalPalette(isDark);

  const colorFor = (v, i) => colorMode === 'categorical' ? palette[i % palette.length] : sequentialColorFor(v, min, max, isDark);

  const GAP = 2;
  const BAR_MAX = 22;
  const PAD = 8;

  if (orientation === 'horizontal') {
    const labelColW = 140;
    const valueColW = 56;
    const rowH = Math.min(BAR_MAX + GAP + 10, (height - PAD * 2) / data.length);
    const chartW = 560;
    const plotW = chartW - labelColW - valueColW;
    const svgH = rowH * data.length + PAD * 2;

    return (
      <div ref={containerRef} style={{ width: '100%', overflowX: 'auto' }}>
        <svg width="100%" viewBox={`0 0 ${chartW} ${svgH}`} height={svgH} role="img" aria-label="Gráfica de barras horizontal" style={{ fontFamily: 'inherit' }}>
          {data.map((d, i) => {
            const y = PAD + i * rowH;
            const barH = Math.min(BAR_MAX, rowH - GAP);
            const barY = y + (rowH - barH) / 2;
            const w = max > 0 ? (d.value / max) * plotW : 0;
            const color = colorFor(d.value, i);
            const isHover = hoverIdx === i;
            return (
              <g key={d.label}
                 onPointerEnter={() => setHoverIdx(i)}
                 onPointerLeave={() => setHoverIdx(null)}
                 onFocus={() => setHoverIdx(i)}
                 onBlur={() => setHoverIdx(null)}
                 tabIndex={0}
                 style={{ cursor: 'pointer', outline: 'none' }}>
                <title>{`${d.label}: ${valueFormatter(d.value)}`}</title>
                <text x={labelColW - 10} y={barY + barH / 2} textAnchor="end" dominantBaseline="middle"
                      fontSize="11" fill="var(--text-secondary)">
                  {d.label.length > 24 ? d.label.slice(0, 23) + '…' : d.label}
                </text>
                <rect x={labelColW} y={y} width={plotW} height={rowH} fill="transparent" />
                <path d={hBarPath(labelColW, barY, w, barH, 4)} fill={color} opacity={isHover ? 1 : 0.92}
                      style={{ transition: 'opacity 0.12s' }} />
                {isHover && (
                  <path d={hBarPath(labelColW, barY, w, barH, 4)} fill="none" stroke="var(--bg-card)" strokeWidth="2" opacity="0.6" />
                )}
                <text x={labelColW + w + 8} y={barY + barH / 2} dominantBaseline="middle"
                      fontSize="11" fontWeight="600" fill="var(--text-primary)">
                  {valueFormatter(d.value)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    );
  }

  // Orientación vertical (columnas)
  const chartW = Math.max(360, data.length * 56);
  const plotH = height - 50;
  const colW = chartW / data.length;
  const barW = Math.min(BAR_MAX, colW - GAP * 2);

  return (
    <div ref={containerRef} style={{ width: '100%', overflowX: 'auto' }}>
      <svg width="100%" viewBox={`0 0 ${chartW} ${height}`} height={height} role="img" aria-label="Gráfica de columnas" style={{ fontFamily: 'inherit' }}>
        <line x1="0" y1={plotH} x2={chartW} y2={plotH} stroke="var(--border-color)" strokeWidth="1" />
        {data.map((d, i) => {
          const x = i * colW + (colW - barW) / 2;
          const h = max > 0 ? (d.value / max) * (plotH - 30) : 0;
          const yTop = plotH - h;
          const color = colorFor(d.value, i);
          const isHover = hoverIdx === i;
          return (
            <g key={d.label}
               onPointerEnter={() => setHoverIdx(i)}
               onPointerLeave={() => setHoverIdx(null)}
               onFocus={() => setHoverIdx(i)}
               onBlur={() => setHoverIdx(null)}
               tabIndex={0}
               style={{ cursor: 'pointer', outline: 'none' }}>
              <title>{`${d.label}: ${valueFormatter(d.value)}`}</title>
              <rect x={i * colW} y="0" width={colW} height={plotH} fill="transparent" />
              <text x={x + barW / 2} y={yTop - 6} textAnchor="middle" fontSize="10.5" fontWeight="600" fill="var(--text-primary)">
                {valueFormatter(d.value)}
              </text>
              <path d={vBarPath(x, yTop, barW, h, 4)} fill={color} opacity={isHover ? 1 : 0.92} style={{ transition: 'opacity 0.12s' }} />
              <text x={x + barW / 2} y={plotH + 16} textAnchor="middle" fontSize="10.5" fill="var(--text-secondary)">
                {d.label.length > 9 ? d.label.slice(0, 8) + '…' : d.label}
              </text>
            </g>
          );
        })}
      </svg>
      {subLabel && <div style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>{subLabel}</div>}
    </div>
  );
}
