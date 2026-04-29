import { useState, useEffect } from 'react';
import axios from 'axios';
import { useSearchParams } from 'react-router-dom';
import { Printer } from 'lucide-react';
import API_URL from '../config';

export default function Pagos() {
  const [searchParams] = useSearchParams();
  const initialOrdenId = searchParams.get('orden') || '';

  const [orders, setOrders] = useState([]);
  const [pagos, setPagos] = useState([]);
  const [selectedOrden, setSelectedOrden] = useState(initialOrdenId);

  const [monto, setMonto] = useState('');
  const [tipoPago, setTipoPago] = useState('abono');

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    if (selectedOrden) {
      fetchPagos(selectedOrden);
    } else {
      setPagos([]);
    }
  }, [selectedOrden]);

  const fetchOrders = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/produccion`);
      setOrders(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchPagos = async (ordenId) => {
    try {
      const res = await axios.get(`${API_URL}/api/pagos/${ordenId}`);
      setPagos(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const handlePago = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/api/pagos`, {
        produccion_id: selectedOrden,
        monto: parseFloat(monto),
        tipo_pago: tipoPago
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMonto('');
      fetchPagos(selectedOrden);
      fetchOrders();
    } catch (e) {
      console.error("Error al registrar pago:", e);
      const msg = e.response?.data?.error || 'Error registrando pago';
      alert(msg);
    }
  };

  const handlePrintComprobante = (pagoId) => {
    window.open(`${API_URL}/api/pagos/${pagoId}/comprobante`, '_blank');
  };

  const ordenActual = orders.find(o => o.id.toString() === selectedOrden);
  const totalPagado = ordenActual ? (ordenActual.pagado || 0) : 0;
  const restante = ordenActual ? (ordenActual.precio_total - totalPagado) : 0;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 2fr', gap: '2rem' }}>
      <div>
        <h1 className="gradient-text" style={{ fontSize: '2rem' }}>Generar Pago</h1>
        <div className="glass-card" style={{ marginTop: '2rem' }}>
          <form onSubmit={handlePago}>
            <div className="form-group">
              <label className="form-label">Seleccionar Orden</label>
              <select className="form-input" style={{ backgroundColor: 'var(--bg-input)' }} value={selectedOrden} onChange={e => setSelectedOrden(e.target.value)} required>
                <option value="">-- Elige una orden --</option>
                {orders.map((o, index) => (
                  <option key={o.id} value={o.id}>
                    Orden #{orders.length - index} - {o.maquilero_nombre}
                  </option>
                ))}
              </select>
            </div>

            {ordenActual && (
              <div style={{ background: 'rgba(0,0,0,0.02)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                <p><strong>Costo Total:</strong> ${ordenActual.precio_total}</p>
                <p style={{ color: '#34d399' }}><strong>Pagado:</strong> ${totalPagado}</p>
                <p style={{ color: restante > 0 ? '#ef4444' : '#34d399' }}><strong>Resta:</strong> ${restante > 0 ? restante : 0}</p>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Tipo de Pago</label>
              <select className="form-input" style={{ backgroundColor: 'var(--bg-input)' }} value={tipoPago} onChange={e => setTipoPago(e.target.value)}>
                <option value="abono">Abono</option>
                <option value="completo">Pago Completo (Liquidación)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Monto ($)</label>
              <input type="number" step="0.01" max={restante} required className="form-input" value={monto} onChange={e => setMonto(e.target.value)} disabled={!selectedOrden} />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={!selectedOrden || restante <= 0}>
              Registrar Pago
            </button>
          </form>
        </div>
      </div>

      <div>
        <h2 style={{ marginTop: '1rem' }}>Historial de Pagos de la Orden</h2>
        <div className="glass-card" style={{ marginTop: '1rem', minHeight: '300px' }}>
          {!selectedOrden ? (
            <p style={{ textAlign: 'center', color: '#94a3b8', marginTop: '2rem' }}>
              Selecciona una orden para ver los pagos.
            </p>
          ) : (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID Pago</th>
                    <th>Fecha</th>
                    <th>Tipo</th>
                    <th>Monto</th>
                    <th>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {pagos.length === 0 ? (
                    <tr><td colSpan="5" style={{ textAlign: 'center' }}>Aún no hay abonos registrados para esta orden.</td></tr>
                  ) : (
                    pagos.map((p, index) => (
                      <tr key={p.id}>
                        <td>#{pagos.length - index}</td>
                        <td>{p.fecha}</td>
                        <td><span className="badge badge-info">{p.tipo_pago}</span></td>
                        <td style={{ color: '#34d399', fontWeight: 'bold' }}>${p.monto}</td>
                        <td>
                          <button 
                            className="btn-icon" 
                            title="Imprimir Comprobante"
                            onClick={() => handlePrintComprobante(p.id)}
                            style={{ 
                              background: 'rgba(59, 130, 246, 0.1)', 
                              color: '#60a5fa',
                              border: 'none',
                              padding: '6px',
                              borderRadius: '4px',
                              cursor: 'pointer'
                            }}
                          >
                            <Printer size={18} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
