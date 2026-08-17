import { useState, useRef, useCallback, useMemo } from 'react';
import { SEQUENTIAL_LIGHT, SEQUENTIAL_DARK } from './colors';

const fmt = (n) => n.toLocaleString('es-MX');

/**
 * Linea de tendencia de una sola serie: 2px, crosshair que sigue al puntero
 * y se ancla al punto de datos mas cercano (skill dataviz — la linea es una
 * sola serie, no necesita leyenda; el titulo de la tarjeta ya dice que es).
 */
export default function LineChart({ data, isDark = false, height = 260, valueFormatter = fmt }) {
  const [hoverIdx, setHoverIdx] = useState(null);
  const svgRef = useRef(null);

  const safeData = useMemo(() => (data && data.length > 0 ? data : []), [data]);
  const color = isDark ? SEQUENTIAL_DARK[2] : SEQUENTIAL_LIGHT[3];
  const chartW = Math.max(420, safeData.length * 90);
  const PAD_L = 46;
  const PAD_R = 20;
  const PAD_T = 24;
  const PAD_B = 34;
  const plotW = chartW - PAD_L - PAD_R;
  const plotH = height - PAD_T - PAD_B;

  const values = safeData.map(d => d.value);
  const max = Math.max(...values, 1);
  const min = 0;

  const xFor = useCallback(
    (i) => PAD_L + (safeData.length === 1 ? plotW / 2 : (i / (safeData.length - 1)) * plotW),
    [safeData.length, plotW]
  );
  const yFor = (v) => PAD_T + plotH - ((v - min) / (max - min || 1)) * plotH;

  const linePath = safeData.map((d, i) => `${i === 0 ? 'M' : 'L'}${xFor(i)},${yFor(d.value)}`).join(' ');
  const areaPath = safeData.length
    ? `${linePath} L${xFor(safeData.length - 1)},${PAD_T + plotH} L${xFor(0)},${PAD_T + plotH} Z`
    : '';

  const handleMove = useCallback((e) => {
    if (!svgRef.current || safeData.length === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * chartW;
    let nearest = 0;
    let best = Infinity;
    safeData.forEach((d, i) => {
      const dist = Math.abs(xFor(i) - px);
      if (dist < best) { best = dist; nearest = i; }
    });
    setHoverIdx(nearest);
  }, [safeData, chartW, xFor]);

  if (safeData.length === 0) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Sin datos para este periodo.</div>;
  }
  const dataRows = safeData;

  // Y-axis ticks redondeados
  const tickCount = 4;
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) => Math.round((max / tickCount) * i));

  const hover = hoverIdx !== null ? dataRows[hoverIdx] : null;

  return (
    <div style={{ width: '100%', overflowX: 'auto', position: 'relative' }}>
      <svg
        ref={svgRef}
        width="100%"
        viewBox={`0 0 ${chartW} ${height}`}
        height={height}
        role="img"
        aria-label="Gráfica de tendencia"
        onPointerMove={handleMove}
        onPointerLeave={() => setHoverIdx(null)}
        style={{ fontFamily: 'inherit', cursor: 'crosshair' }}
      >
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={PAD_L} y1={yFor(t)} x2={chartW - PAD_R} y2={yFor(t)} stroke="var(--border-color)" strokeWidth="1" />
            <text x={PAD_L - 8} y={yFor(t)} textAnchor="end" dominantBaseline="middle" fontSize="10" fill="var(--text-secondary)">
              {valueFormatter(t)}
            </text>
          </g>
        ))}

        <path d={areaPath} fill={color} opacity="0.1" />
        <path d={linePath} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

        {dataRows.map((d, i) => (
          <g key={d.label}>
            <circle cx={xFor(i)} cy={yFor(d.value)} r={hoverIdx === i ? 6 : 4} fill={color} stroke="var(--bg-card)" strokeWidth="2" />
            <text x={xFor(i)} y={height - 10} textAnchor="middle" fontSize="10.5" fill="var(--text-secondary)">{d.label}</text>
          </g>
        ))}

        {hover && (
          <line x1={xFor(hoverIdx)} y1={PAD_T} x2={xFor(hoverIdx)} y2={PAD_T + plotH} stroke="var(--text-secondary)" strokeWidth="1" strokeDasharray="3,3" opacity="0.5" />
        )}
      </svg>

      {hover && (
        <div style={{
          position: 'absolute',
          left: `${(xFor(hoverIdx) / chartW) * 100}%`,
          top: 4,
          transform: 'translateX(-50%)',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          padding: '6px 10px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
          zIndex: 5
        }}>
          <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>{valueFormatter(hover.value)}</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{hover.label}</div>
        </div>
      )}
    </div>
  );
}
