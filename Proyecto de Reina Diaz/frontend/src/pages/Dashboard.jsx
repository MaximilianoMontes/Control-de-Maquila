import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Users, Package, Factory, TrendingUp } from 'lucide-react';
import axios from 'axios';
import API_URL from '../config';

const API = API_URL;

export default function Dashboard() {
  const { user } = useAuth();
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
        const inventario = invRes.data.reduce((sum, item) => sum + (item.piezas_en_proceso || 0), 0);
        const ordenes_proceso = prodRes.data.filter(o => o.estado === 'En proceso').length;

        // Pagos totales (acumulado mostrado en dashboard)
        const pagos_mes = prodRes.data.reduce((sum, o) => sum + parseFloat(o.pagado || 0), 0);

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
  }, []);

  const kpiCards = [
    {
      icon: <Users size={24} />,
      value: stats.maquileros,
      label: 'Maquileros Activos',
      style: {},
    },
    {
      icon: <Package size={24} />,
      value: stats.inventario.toLocaleString(),
      label: 'Piezas en Inventario',
      style: { background: 'rgba(16, 185, 129, 0.2)', color: '#34d399' },
    },
    {
      icon: <Factory size={24} />,
      value: stats.ordenes_proceso,
      label: 'Órdenes en Proceso',
      style: { background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24' },
    },
    {
      icon: <TrendingUp size={24} />,
      value: `$${stats.pagos_mes.toLocaleString('es-MX', { minimumFractionDigits: 0 })}`,
      label: 'Total Pagado (Acumulado)',
      style: { background: 'rgba(139, 92, 246, 0.2)', color: '#a78bfa' },
    },
  ];

  return (
    <div>
      <h1 className="gradient-text">Bienvenido, {user?.username}</h1>
      <p style={{ marginBottom: '2rem' }}>Este es el resumen actual del sistema de control de maquileros.</p>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <p style={{ color: 'var(--text-secondary)' }}>Cargando datos del sistema...</p>
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
            <h2>Órdenes de Producción</h2>
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Folio</th>
                    <th>Maquilero</th>
                    <th>Fecha Inicio</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.length === 0 ? (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                        No hay órdenes registradas aún.
                      </td>
                    </tr>
                  ) : (
                    recentOrders.map((o, index) => (
                      <tr key={o.id}>
                        {/* El folio es el número total menos la posición en la lista (si la lista es DESC) */}
                        <td style={{ fontWeight: 'bold' }}>#{totalOrders - index}</td>
                        <td style={{ fontWeight: 600 }}>{o.maquilero_nombre}</td>
                        <td>{o.fecha_inicio}</td>
                        <td>
                          <span className={`badge ${o.estado === 'Terminado' ? 'badge-success' : 'badge-warning'}`}>
                            {o.estado}
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
