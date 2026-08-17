import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Activity, Users, TrendingUp, Calendar, Table2, ChevronDown, BarChart3 } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import API_URL from '../config';
import { toast } from '../utils/themeNotifications';
import BarChart from '../components/charts/BarChart';
import LineChart from '../components/charts/LineChart';

const API = API_URL;
const DARK_THEMES = [
  'dark', 'ocean', 'nature', 'sunset', 'lavender', 'cherry', 'midnight', 'dim', 'miku', 'teto', 'ror2', 'limbus', 'ruina', 'minecraft',
  'geometry', 'fallout', 'tf2', 'cyberpunk', 'backrooms', 'terraria', 'castle', 'starwars', 'cod3', 'subnautica', 'cuphead',
  'undertale', 'lobotomy', 'papers', 'plague', 'pvz'
];

const fmt = (n) => (n || 0).toLocaleString('es-MX');

const PRESETS = [
  { id: 'todo', label: 'Todo', days: null },
  { id: '7d', label: 'Últimos 7 días', days: 7 },
  { id: '30d', label: 'Últimos 30 días', days: 30 },
  { id: 'mes', label: 'Este mes', days: 'mes' },
];

function presetToRange(preset) {
  if (!preset.days) return { desde: null, hasta: null };
  const hasta = new Date();
  let desde;
  if (preset.days === 'mes') {
    desde = new Date(hasta.getFullYear(), hasta.getMonth(), 1);
  } else {
    desde = new Date();
    desde.setDate(desde.getDate() - preset.days);
  }
  const toISO = (d) => d.toISOString().split('T')[0];
  return { desde: toISO(desde), hasta: toISO(hasta) };
}

function SectionCard({ title, icon, children, showTableToggle, tableView, onToggleTable, note }) {
  return (
    <div className="glass-card" style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <h3 style={{ margin: 0, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {icon} {title}
        </h3>
        {showTableToggle && (
          <button className="btn btn-secondary" style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '5px 10px' }} onClick={onToggleTable}>
            <Table2 size={14} /> {tableView ? 'Ver gráfica' : 'Ver tabla'}
          </button>
        )}
      </div>
      {children}
      {note && <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.75rem', marginBottom: 0 }}>{note}</p>}
    </div>
  );
}

function DataTable({ columns, rows }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%' }}>
        <thead>
          <tr>{columns.map(c => <th key={c}>{c}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>{r.map((v, j) => <td key={j}>{v}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AnalisisUso() {
  const { settings } = useSettings();
  const isDark = DARK_THEMES.includes(settings?.theme) ||
    (settings?.theme === 'system' && window.matchMedia?.('(prefers-color-scheme: dark)').matches);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [presetId, setPresetId] = useState('todo');
  const [tableViews, setTableViews] = useState({});
  const [expandedUser, setExpandedUser] = useState(null);

  const toggleTable = (key) => setTableViews(prev => ({ ...prev, [key]: !prev[key] }));

  const fetchData = useCallback(async (silent) => {
    if (!silent) setLoading(true);
    try {
      const preset = PRESETS.find(p => p.id === presetId);
      const { desde, hasta } = presetToRange(preset);
      const params = {};
      if (desde) params.desde = desde;
      if (hasta) params.hasta = hasta;
      const res = await axios.get(`${API}/api/admin/analytics`, { params });
      setData(res.data);
    } catch (e) {
      console.error(e);
      if (!silent) toast.error('Error al cargar la analítica de uso', { theme: 'dark' });
    } finally {
      setLoading(false);
    }
  }, [presetId]);

  useEffect(() => {
    fetchData(false);
    const interval = setInterval(() => fetchData(true), 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading && !data) {
    return <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>Cargando analítica...</div>;
  }
  if (!data) return null;

  const fechaCorta = (iso) => iso ? new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h1 className="gradient-text" style={{ fontSize: '2rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <BarChart3 size={32} /> Analítica de Uso
        </h1>
        <p style={{ color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>
          Basado en acciones reales registradas en el Historial del sistema. Se actualiza solo cada 30 segundos.
        </p>
      </div>

      {/* Filtro de rango — una sola fila, arriba de todo, escoge todo lo que sigue */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {PRESETS.map(p => (
          <button
            key={p.id}
            className={`btn ${presetId === p.id ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.82rem', padding: '7px 16px' }}
            onClick={() => setPresetId(p.id)}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* KPIs */}
      <div className="kpi-grid">
        <div className="glass-card kpi-card">
          <div className="kpi-icon" style={{ background: 'rgba(37, 99, 235, 0.12)', color: '#2563eb' }}><Activity size={24} /></div>
          <div className="kpi-info">
            <h3 className="kpi-value">{fmt(data.resumen.total)}</h3>
            <p>Acciones registradas</p>
          </div>
        </div>
        <div className="glass-card kpi-card">
          <div className="kpi-icon" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10b981' }}><Users size={24} /></div>
          <div className="kpi-info">
            <h3 className="kpi-value">{data.resumen.usuariosActivos}</h3>
            <p>Usuarios activos</p>
          </div>
        </div>
        <div className="glass-card kpi-card">
          <div className="kpi-icon" style={{ background: 'rgba(180, 138, 46, 0.15)', color: '#b48a2e' }}><TrendingUp size={24} /></div>
          <div className="kpi-info">
            <h3 className="kpi-value" style={{ fontSize: '1.15rem' }}>{data.resumen.moduloTop || '—'}</h3>
            <p>Módulo más usado</p>
          </div>
        </div>
        <div className="glass-card kpi-card">
          <div className="kpi-icon" style={{ background: 'rgba(99, 102, 241, 0.12)', color: '#6366f1' }}><Calendar size={24} /></div>
          <div className="kpi-info">
            <h3 className="kpi-value" style={{ fontSize: '1rem' }}>{fechaCorta(data.resumen.desde)} — {fechaCorta(data.resumen.hasta)}</h3>
            <p>Periodo analizado</p>
          </div>
        </div>
      </div>

      <SectionCard title="Actividad por módulo" showTableToggle tableView={tableViews.modulo} onToggleTable={() => toggleTable('modulo')}>
        {tableViews.modulo ? (
          <DataTable columns={['Módulo', 'Acciones', '%']} rows={data.porModulo.map(r => [r.modulo, fmt(r.total), `${((r.total / data.resumen.total) * 100).toFixed(1)}%`])} />
        ) : (
          <BarChart data={data.porModulo.map(r => ({ label: r.modulo, value: r.total }))} orientation="horizontal" colorMode="sequential" isDark={isDark} height={Math.max(280, data.porModulo.length * 30)} />
        )}
      </SectionCard>

      <SectionCard title="Actividad por usuario" showTableToggle tableView={tableViews.usuario} onToggleTable={() => toggleTable('usuario')}>
        {tableViews.usuario ? (
          <DataTable columns={['Usuario', 'Acciones', '%']} rows={data.porUsuario.map(r => [r.usuario, fmt(r.total), `${((r.total / data.resumen.total) * 100).toFixed(1)}%`])} />
        ) : (
          <BarChart data={data.porUsuario.map(r => ({ label: r.usuario, value: r.total }))} orientation="vertical" colorMode="categorical" isDark={isDark} />
        )}
      </SectionCard>

      <SectionCard title="Rutina por usuario" note="En qué módulos concentra su actividad cada cuenta.">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {Object.entries(data.rutinaPorUsuario).map(([usuario, items]) => {
            const userTotal = items.reduce((s, it) => s + it.total, 0);
            const isOpen = expandedUser === usuario;
            return (
              <div key={usuario} style={{ border: '1px solid var(--border-color)', borderRadius: '10px', overflow: 'hidden' }}>
                <button
                  onClick={() => setExpandedUser(isOpen ? null : usuario)}
                  style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', background: 'var(--bg-input)', border: 'none', cursor: 'pointer', color: 'var(--text-primary)' }}
                >
                  <span style={{ fontWeight: 600 }}>{usuario} <span style={{ fontWeight: 400, color: 'var(--text-secondary)', fontSize: '0.8rem' }}>({fmt(userTotal)} acciones)</span></span>
                  <ChevronDown size={18} style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
                </button>
                {isOpen && (
                  <div style={{ padding: '1rem' }}>
                    <BarChart data={items.map(it => ({ label: it.modulo, value: it.total }))} orientation="horizontal" colorMode="sequential" isDark={isDark} height={Math.max(160, items.length * 30)} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </SectionCard>

      <SectionCard title="Tipo de acción" showTableToggle tableView={tableViews.tipo} onToggleTable={() => toggleTable('tipo')}>
        {tableViews.tipo ? (
          <DataTable columns={['Tipo', 'Acciones', '%']} rows={data.porTipoAccion.map(r => [r.tipo, fmt(r.total), `${((r.total / data.resumen.total) * 100).toFixed(1)}%`])} />
        ) : (
          <BarChart data={data.porTipoAccion.map(r => ({ label: r.tipo, value: r.total }))} orientation="horizontal" colorMode="sequential" isDark={isDark} height={Math.max(220, data.porTipoAccion.length * 30)} />
        )}
      </SectionCard>

      <SectionCard title="Horario de uso" showTableToggle tableView={tableViews.hora} onToggleTable={() => toggleTable('hora')}
                   note="El servidor guarda la hora en UTC; el eje muestra la hora estimada en Colima (UTC-6).">
        {tableViews.hora ? (
          <DataTable columns={['Hora (Colima)', 'Acciones']} rows={data.porHora.map(r => [`${String(r.horaLocal).padStart(2, '0')}:00`, fmt(r.total)])} />
        ) : (
          <BarChart data={data.porHora.map(r => ({ label: `${String(r.horaLocal).padStart(2, '0')}h`, value: r.total }))} orientation="vertical" colorMode="sequential" isDark={isDark} />
        )}
      </SectionCard>

      <SectionCard title="Día de la semana" showTableToggle tableView={tableViews.dia} onToggleTable={() => toggleTable('dia')}>
        {tableViews.dia ? (
          <DataTable columns={['Día', 'Acciones']} rows={data.porDia.map(r => [r.dia, fmt(r.total)])} />
        ) : (
          <BarChart data={data.porDia.map(r => ({ label: r.dia, value: r.total }))} orientation="vertical" colorMode="sequential" isDark={isDark} />
        )}
      </SectionCard>

      <SectionCard title="Tendencia mensual" showTableToggle tableView={tableViews.mes} onToggleTable={() => toggleTable('mes')}>
        {tableViews.mes ? (
          <DataTable columns={['Mes', 'Acciones']} rows={data.tendenciaMensual.map(r => [r.mes, fmt(r.total)])} />
        ) : (
          <LineChart data={data.tendenciaMensual.map(r => ({ label: r.mes, value: r.total }))} isDark={isDark} />
        )}
      </SectionCard>
    </div>
  );
}
