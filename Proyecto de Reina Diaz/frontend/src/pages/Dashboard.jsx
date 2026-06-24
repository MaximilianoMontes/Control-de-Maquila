import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { Users, Package, Factory, TrendingUp, Calendar } from 'lucide-react';
import axios from 'axios';
import API_URL from '../config';

const API = API_URL;

export default function Dashboard() {
  const { user } = useAuth();
  const { t, formatCurrency } = useSettings();
  const [stats, setStats] = useState({
    maquileros: 0,
    inventario: 0,
    ordenes_proceso: 0,
    pagos_mes: 0,
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [totalOrders, setTotalOrders] = useState(0);
  const [loading, setLoading] = useState(true);

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
      label: t('dash.activeTailors'),
      style: {},
    },
    {
      icon: <Calendar size={24} />,
      value: stats.inventario.toLocaleString(),
      label: t('dash.piecesInventory'),
      style: { background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' },
    },
    {
      icon: <Factory size={24} />,
      value: stats.ordenes_proceso,
      label: t('dash.ordersProcess'),
      style: { background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24' },
    },
    {
      icon: <TrendingUp size={24} />,
      value: formatCurrency(stats.pagos_mes),
      label: t('dash.totalPaid'),
      style: { background: 'rgba(139, 92, 246, 0.2)', color: '#a78bfa' },
    },
  ];

  return (
    <div>


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
            <h2>{t('dash.productionOrders')}</h2>
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{t('dash.folio')}</th>
                    <th>{t('dash.tailor')}</th>
                    <th>{t('dash.startDate')}</th>
                    <th>{t('dash.status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.length === 0 ? (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                        {t('dash.noOrders')}
                      </td>
                    </tr>
                  ) : (
                    recentOrders.map((o, index) => (
                      <tr key={o.id}>
                        {/* El folio es el ID estable de la base de datos */}
                        <td style={{ fontWeight: 'bold' }}>#{o.id}</td>
                        <td style={{ fontWeight: 600 }}>{o.maquilero_nombre}</td>
                        <td>{new Date(o.fecha_inicio).toLocaleDateString()}</td>
                        <td>
                          <span className={`badge ${o.estado === 'Terminado' ? 'badge-success' : o.estado === 'Cancelado' ? 'badge-danger' : 'badge-warning'}`}>
                            {o.estado === 'Terminado' ? t('prod.statusFinished') : o.estado === 'Cancelado' ? t('prod.statusCanceled') : t('prod.statusInProgress')}
                          </span>
                        </td>
                      </tr>
                    ))
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

