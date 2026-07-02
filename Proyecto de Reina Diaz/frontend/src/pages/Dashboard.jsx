import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { Users, Package, Factory, TrendingUp, Calendar, ClipboardList } from 'lucide-react';
import axios from 'axios';
import API_URL from '../config';

const API = API_URL;

export default function Dashboard() {
  const { user } = useAuth();
  const { settings, t, formatCurrency } = useSettings();
  const isLobotomy = settings?.theme === 'lobotomy';

  const [stats, setStats] = useState({
    maquileros: 0,
    inventario: 0,
    ordenes_proceso: 0,
    pagos_mes: 0,
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [totalOrders, setTotalOrders] = useState(0);
  const [loading, setLoading] = useState(true);
  const [lobotomyDay, setLobotomyDay] = useState(1);

  useEffect(() => {
    if (isLobotomy) {
      const getLobotomyDay = () => {
        const todayStr = new Date().toISOString().split('T')[0];
        const startStr = localStorage.getItem('lobotomyThemeStartDate');
        if (!startStr) {
          localStorage.setItem('lobotomyThemeStartDate', todayStr);
          return 1;
        }
        const start = new Date(startStr);
        const today = new Date(todayStr);
        start.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);
        const diffTime = today.getTime() - start.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
        return Math.max(1, diffDays);
      };
      setLobotomyDay(getLobotomyDay());
    }
  }, [isLobotomy]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [maqRes, invRes, prodRes] = await Promise.all([
          axios.get(`${API}/api/maquileros`),
          axios.get(`${API}/api/inventario`),
          axios.get(`${API}/api/produccion`),
        ]);

        const maquileros = maqRes.data.length;

        // Piezas en Corte (piezas de cortes activos no asignadas a maquila)
        const piezas_corte = invRes.data.reduce((sum, cut) => {
          return sum + Math.max(0, (parseInt(cut.piezas_en_proceso) || 0) - (parseInt(cut.total_asignado) || 0));
        }, 0);

        // Piezas en Producción (piezas en talleres de maquila no enviadas aún en camión)
        const piezas_produccion = prodRes.data.reduce((sum, p) => {
          if (p.estado === 'En proceso' || p.estado === 'Terminado Parcial') {
            const total = parseInt(p.cantidad) || 0;
            const sent = parseInt(p.piezas_enviadas) || 0;
            return sum + Math.max(0, total - sent);
          } else if (p.estado === 'Terminado') {
            const total = p.cantidad_recibida !== null ? (parseInt(p.cantidad_recibida) || 0) : (parseInt(p.cantidad) || 0);
            const sent = parseInt(p.piezas_enviadas) || 0;
            return sum + Math.max(0, total - sent);
          }
          return sum;
        }, 0);

        const inventario = piezas_corte + piezas_produccion;
        const ordenes_proceso = prodRes.data.filter(o => o.estado === 'En proceso').length;

        // Pagos totales (solo efectivo real en dashboard)
        const pagos_mes = prodRes.data.reduce((sum, o) => sum + parseFloat(o.pagado_efectivo || 0), 0);

        // Mostrar todas las órdenes en el dashboard
        const recent = prodRes.data;
        
        setStats({ maquileros, inventario, ordenes_proceso, pagos_mes });
        setTotalOrders(prodRes.data.length);
        setRecentOrders(recent);
      } catch (e) {
        console.error('Error cargando dashboard:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 2000); // Auto-refresca cada 2 segundos en segundo plano
    return () => clearInterval(interval);
  }, []);

  const kpiCards = [
    {
      icon: <Users size={24} />,
      value: stats.maquileros,
      label: isLobotomy ? 'AGENTES ASIGNADOS' : t('dash.activeTailors'),
      style: isLobotomy 
        ? { background: 'rgba(202, 138, 4, 0.15)', color: '#ffe600', filter: 'drop-shadow(0 0 5px rgba(255, 230, 0, 0.3))' }
        : {},
    },
    {
      icon: <Package size={24} />,
      value: stats.inventario.toLocaleString(),
      label: isLobotomy ? 'RECURSOS EN STOCK' : t('dash.piecesInventory'),
      style: isLobotomy 
        ? { background: 'rgba(0, 255, 204, 0.15)', color: '#00ffcc', filter: 'drop-shadow(0 0 5px rgba(0, 255, 204, 0.3))' }
        : { background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' },
    },
    {
      icon: <ClipboardList size={24} />,
      value: stats.ordenes_proceso,
      label: isLobotomy ? 'OPERACIONES ACTIVAS' : t('dash.ordersProcess'),
      style: isLobotomy 
        ? { background: 'rgba(255, 144, 0, 0.15)', color: '#ff9000', filter: 'drop-shadow(0 0 5px rgba(255, 144, 0, 0.3))' }
        : { background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24' },
    },
    {
      icon: isLobotomy ? (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 0 4px #ff1a1a)' }}>
          <circle cx="12" cy="12" r="10" />
          <path d="M12 2a10 10 0 0 1 10 10A10 10 0 0 1 12 22A10 10 0 0 1 2 12A10 10 0 0 1 12 2zm1 14.5a3.5 3.5 0 0 1-3.5-3.5V7a1 1 0 0 1 2 0v4a1.5 1.5 0 0 0 3 0V7a1 1 0 0 1 2 0v4a3.5 3.5 0 0 1-3.5 3.5z" fill="currentColor" />
          <circle cx="12" cy="12" r="3.5" fill="currentColor" />
        </svg>
      ) : <TrendingUp size={24} />,
      value: formatCurrency(stats.pagos_mes),
      label: isLobotomy ? 'ENERGÍA RECOLECTADA (ACUMULADO)' : t('dash.totalPaid'),
      style: isLobotomy 
        ? { background: 'rgba(255, 26, 26, 0.15)', color: '#ff1a1a', filter: 'drop-shadow(0 0 5px rgba(255, 26, 26, 0.3))' }
        : { background: 'rgba(139, 92, 246, 0.2)', color: '#a78bfa' },
    },
  ];

  return (
    <div>
      {isLobotomy && (
        <div className="lobotomy-header">
          <div className="lobotomy-header-left">
            <h1 className="lobotomy-title">CENTRO DE CONTROL</h1>
            <p className="lobotomy-subtitle">FACILITY CONTROL SYSTEM</p>
          </div>
          <div className="lobotomy-header-right">
            <div className="lobotomy-day-widget">
              <span className="lobotomy-day-label">DÍA</span>
              <span className="lobotomy-day-number">{lobotomyDay}</span>
            </div>
            <p className="lobotomy-sub-right">FACILITY CONTROL SYSTEM</p>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <p style={{ color: 'var(--text-secondary)' }}>{t('dash.loading')}</p>
        </div>
      ) : (
        <>
          <div className="kpi-grid">
            {kpiCards.map((card, i) => (
              <div key={i} className="glass-card kpi-card">
                <div className="kpi-icon" style={card.style}>
                  {card.icon}
                </div>
                <div className="kpi-info">
                  <h3>{card.value}</h3>
                  <p>{card.label}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="glass-card" style={{ marginTop: '2rem' }}>
            <h2 className={isLobotomy ? "lobotomy-table-title" : ""}>
              {isLobotomy ? "OPERACIONES ACTIVAS" : t('dash.productionOrders')}
            </h2>
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  {isLobotomy ? (
                    <tr>
                      <th>FOLIO</th>
                      <th>AGENTE RESPONSABLE</th>
                      <th>FECHA INICIO</th>
                      <th style={{ textAlign: 'center' }}>RIESGO</th>
                      <th style={{ textAlign: 'center' }}>ESTADO</th>
                      <th style={{ textAlign: 'center' }}>PROGRESO</th>
                    </tr>
                  ) : (
                    <tr>
                      <th>{t('dash.folio')}</th>
                      <th>{t('dash.tailor')}</th>
                      <th>{t('dash.startDate')}</th>
                      <th>{t('dash.status')}</th>
                    </tr>
                  )}
                </thead>
                <tbody>
                  {recentOrders.length === 0 ? (
                    <tr>
                      <td colSpan={isLobotomy ? "6" : "4"} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                        {t('dash.noOrders')}
                      </td>
                    </tr>
                  ) : (
                    recentOrders.map((o) => {
                      const ordersAsc = [...recentOrders].sort((a, b) => a.id - b.id);
                      const folio = ordersAsc.findIndex(item => item.id === o.id) + 1;

                      // Date Math for alert delay
                      const now = new Date();
                      const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
                      const dDate = new Date(o.fecha_fin);
                      const deliveryDate = Date.UTC(dDate.getUTCFullYear(), dDate.getUTCMonth(), dDate.getUTCDate());
                      const diffMs = today - deliveryDate;
                      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

                      // Abnormality Risk Level Mapping
                      let riskLabel = 'ZAYIN';
                      let riskStyle = { background: '#10b981', color: '#ffffff' }; // Green
                      
                      if (o.estado === 'Terminado') {
                        riskLabel = 'TETH';
                        riskStyle = { background: '#00d2ff', color: '#030408' }; // Blue
                      } else if (o.estado === 'Terminado Parcial') {
                        riskLabel = 'WAW';
                        riskStyle = { background: '#f97316', color: '#ffffff' }; // Orange
                      } else if (o.estado === 'Cancelado') {
                        riskLabel = 'ALEPH';
                        riskStyle = { background: '#ef4444', color: '#ffffff' }; // Red
                      } else {
                        // En proceso
                        const qty = parseInt(o.cantidad) || 0;
                        if (diffDays >= 4) {
                          riskLabel = 'ALEPH';
                          riskStyle = { background: '#ef4444', color: '#ffffff' };
                        } else if (diffDays >= 1 && diffDays <= 3) {
                          riskLabel = 'HE';
                          riskStyle = { background: '#eab308', color: '#030408' };
                        } else {
                          // On time: classify by size
                          if (qty >= 1000) {
                            riskLabel = 'ALEPH';
                            riskStyle = { background: '#ef4444', color: '#ffffff' };
                          } else if (qty >= 500) {
                            riskLabel = 'WAW';
                            riskStyle = { background: '#f97316', color: '#ffffff' };
                          } else if (qty >= 250) {
                            riskLabel = 'HE';
                            riskStyle = { background: '#eab308', color: '#030408' };
                          } else if (qty >= 100) {
                            riskLabel = 'TETH';
                            riskStyle = { background: '#00d2ff', color: '#030408' };
                          } else {
                            riskLabel = 'ZAYIN';
                            riskStyle = { background: '#10b981', color: '#ffffff' };
                          }
                        }
                      }

                      // Containment Alert Status Mapping
                      let statusLabel = t('prod.statusInProgress');
                      let statusClass = 'badge-warning';
                      
                      if (isLobotomy) {
                        if (o.estado === 'Terminado') {
                          statusLabel = 'ESTABLE';
                          statusClass = 'lobotomy-status-stable';
                        } else if (o.estado === 'Cancelado') {
                          statusLabel = 'BRECHA';
                          statusClass = 'lobotomy-status-breach';
                        } else if (o.estado === 'Terminado Parcial') {
                          statusLabel = 'OBSERVACIÓN';
                          statusClass = 'lobotomy-status-observation';
                        } else {
                          // En proceso
                          if (diffDays >= 1) {
                            statusLabel = 'OBSERVACIÓN';
                            statusClass = 'lobotomy-status-observation';
                          } else {
                            statusLabel = 'ESTABLE';
                            statusClass = 'lobotomy-status-stable';
                          }
                        }
                      } else {
                        statusLabel = o.estado === 'Terminado' ? t('prod.statusFinished') : o.estado === 'Cancelado' ? t('prod.statusCanceled') : t('prod.statusInProgress');
                        statusClass = o.estado === 'Terminado' ? 'badge-success' : o.estado === 'Cancelado' ? 'badge-danger' : 'badge-warning';
                      }

                      // Progress Math
                      const cantidadTotal = parseInt(o.cantidad) || 0;
                      const cantidadRecibida = o.cantidad_recibida !== null ? parseInt(o.cantidad_recibida) : 0;
                      const progressPercent = cantidadTotal > 0 ? Math.min(100, Math.round((cantidadRecibida / cantidadTotal) * 100)) : 0;

                      return (
                        <tr key={o.id}>
                          <td style={{ fontWeight: 'bold' }}>#{folio}</td>
                          <td style={{ fontWeight: 600 }}>{o.maquilero_nombre}</td>
                          <td>{new Date(o.fecha_inicio).toLocaleDateString()}</td>
                          
                          {isLobotomy ? (
                            <>
                              <td style={{ textAlign: 'center' }}>
                                <span className="lobotomy-risk-badge" style={riskStyle}>{riskLabel}</span>
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <span className={`lobotomy-status-badge ${statusClass}`}>{statusLabel}</span>
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', minWidth: '140px' }}>
                                  <div className="lobotomy-progress-container">
                                    <div className="lobotomy-progress-bar" style={{ width: `${progressPercent}%` }}></div>
                                  </div>
                                  <span className="lobotomy-progress-percent">{progressPercent}%</span>
                                </div>
                              </td>
                            </>
                          ) : (
                            <td>
                              <span className={`badge ${statusClass}`}>
                                {statusLabel}
                              </span>
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

