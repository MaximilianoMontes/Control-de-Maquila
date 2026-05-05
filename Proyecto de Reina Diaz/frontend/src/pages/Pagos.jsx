import { useState, useEffect } from 'react';
import axios from 'axios';
import { useSearchParams } from 'react-router-dom';
import { Printer, AlertCircle, History as HistoryIcon } from 'lucide-react';
import API_URL from '../config';

export default function Pagos() {
  const [searchParams] = useSearchParams();
  const initialOrdenId = searchParams.get('orden') || '';

  // Estados para Pagos de Órdenes
  const [orders, setOrders] = useState([]);
  const [pagos, setPagos] = useState([]);
  const [selectedOrden, setSelectedOrden] = useState(initialOrdenId);
  const [monto, setMonto] = useState('');
  const [tipoPago, setTipoPago] = useState('abono');
  const [pendingDiscount, setPendingDiscount] = useState(0);

  // Estados para Descuentos Personales
  const [maquileros, setMaquileros] = useState([]);
  const [inventario, setInventario] = useState([]);
  const [selectedMaquilero, setSelectedMaquilero] = useState('');
  const [selectedModelo, setSelectedModelo] = useState('');
  const [motivoDescuento, setMotivoDescuento] = useState('');
  const [montoDescuento, setMontoDescuento] = useState('');
  const [piezasMalas, setPiezasMalas] = useState('');
  const [historialDescuentos, setHistorialDescuentos] = useState([]);

  useEffect(() => {
    fetchOrders();
    fetchMaquileros();
    fetchInventario();
  }, []);

  useEffect(() => {
    if (selectedOrden) {
      fetchPagos(selectedOrden);
      const orden = orders.find(o => o.id.toString() === selectedOrden);
      if (orden) {
        fetchPendingDiscount(orden.maquilero_id);
      }
    } else {
      setPagos([]);
      setPendingDiscount(0);
    }
  }, [selectedOrden, orders]);

  useEffect(() => {
    if (selectedMaquilero) {
      fetchHistorialDescuentos(selectedMaquilero);
    } else {
      setHistorialDescuentos([]);
    }
  }, [selectedMaquilero]);

  const fetchOrders = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/produccion`);
      setOrders(res.data);
    } catch (e) { console.error(e); }
  };

  const fetchMaquileros = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/maquileros`);
      setMaquileros(res.data);
    } catch (e) { console.error(e); }
  };

  const fetchInventario = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/inventario`);
      setInventario(res.data);
    } catch (e) { console.error(e); }
  };

  const fetchPagos = async (ordenId) => {
    try {
      const res = await axios.get(`${API_URL}/api/pagos/${ordenId}`);
      setPagos(res.data);
    } catch (e) { console.error(e); }
  };

  const fetchHistorialDescuentos = async (maquileroId) => {
    try {
      const res = await axios.get(`${API_URL}/api/descuentos/maquilero/${maquileroId}`);
      setHistorialDescuentos(res.data);
    } catch (e) { console.error(e); }
  };

  const fetchPendingDiscount = async (maquileroId) => {
    try {
      const res = await axios.get(`${API_URL}/api/descuentos/pendientes/${maquileroId}`);
      setPendingDiscount(res.data.total_pendiente);
    } catch (e) { console.error(e); }
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
      alert(e.response?.data?.error || 'Error registrando pago');
    }
  };

  const handleDescuento = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/api/descuentos`, {
        maquilero_id: selectedMaquilero,
        inventario_id: selectedModelo,
        motivo: motivoDescuento,
        monto_total: parseFloat(montoDescuento),
        piezas_afectadas: parseInt(piezasMalas)
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Limpiar y Recargar
      setMotivoDescuento('');
      setMontoDescuento('');
      setPiezasMalas('');
      fetchHistorialDescuentos(selectedMaquilero);
      alert("Descuento registrado correctamente");
    } catch (e) {
      console.error("Error al registrar descuento:", e);
      alert(e.response?.data?.error || 'Error registrando descuento');
    }
  };

  const handlePrintComprobante = (pagoId) => {
    window.open(`${API_URL}/api/pagos/${pagoId}/comprobante`, '_blank');
  };

  const ordenActual = orders.find(o => o.id.toString() === selectedOrden);
  const totalPagado = ordenActual ? (ordenActual.pagado || 0) : 0;
  const restante = ordenActual ? (ordenActual.precio_total - totalPagado) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4rem' }}>
      {/* SECCIÓN 1: PAGOS DE ÓRDENES */}
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
                  <p><strong>Costo Total de Orden:</strong> ${ordenActual.precio_total}</p>
                  <p style={{ color: '#34d399' }}><strong>Ya Pagado:</strong> ${totalPagado}</p>
                  <hr style={{ margin: '0.5rem 0', border: 'none', borderTop: '1px solid #e2e8f0' }} />
                  {pendingDiscount > 0 && (
                    <p style={{ color: '#ef4444', fontWeight: 'bold' }}>
                      <AlertCircle size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                      Multas Pendientes: -${pendingDiscount}
                    </p>
                  )}
                  <p style={{ color: (restante - pendingDiscount) > 0 ? '#ef4444' : '#34d399', fontSize: '1.1rem' }}>
                    <strong>A Pagar (Neto): ${Math.max(0, restante - pendingDiscount)}</strong>
                  </p>
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
              <label className="form-label">Monto a Entregar ($)</label>
              <input 
                type="number" 
                step="0.01" 
                max={restante} 
                required 
                className="form-input" 
                value={monto} 
                onChange={e => setMonto(e.target.value)} 
                disabled={!selectedOrden}
                placeholder={restante > 0 ? `Sugerido: $${Math.max(0, restante - pendingDiscount)}` : ''}
              />
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
                            <button className="btn-icon" onClick={() => handlePrintComprobante(p.id)} style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa', border: 'none', padding: '6px', borderRadius: '4px', cursor: 'pointer' }}>
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

      <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.1)', margin: '1rem 0' }} />

      {/* SECCIÓN 2: DESCUENTOS PERSONALES */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 2fr', gap: '2rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1.5rem' }}>
            <AlertCircle color="#ef4444" size={28} />
            <h2 className="gradient-text" style={{ fontSize: '1.8rem', margin: 0 }}>Descuento Personal</h2>
          </div>
          
          <div className="glass-card">
            <form onSubmit={handleDescuento}>
              <div className="form-group">
                <label className="form-label">Elegir Maquilero</label>
                <select className="form-input" value={selectedMaquilero} onChange={e => setSelectedMaquilero(e.target.value)} required>
                  <option value="">-- Seleccionar --</option>
                  {maquileros.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Modelo / Producto</label>
                <select className="form-input" value={selectedModelo} onChange={e => setSelectedModelo(e.target.value)} required>
                  <option value="">-- Seleccionar --</option>
                  {inventario.map(i => <option key={i.id} value={i.id}>{i.modelo} - {i.numero}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Motivo del Error / Hallazgo</label>
                <textarea 
                  className="form-input" 
                  style={{ minHeight: '80px', resize: 'vertical' }} 
                  value={motivoDescuento} 
                  onChange={e => setMotivoDescuento(e.target.value)} 
                  placeholder="Describe el error encontrado..."
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Piezas Malas</label>
                  <input type="number" className="form-input" value={piezasMalas} onChange={e => setPiezasMalas(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Monto Total ($)</label>
                  <input type="number" step="0.01" className="form-input" value={montoDescuento} onChange={e => setMontoDescuento(e.target.value)} required />
                </div>
              </div>

              <button type="submit" className="btn" style={{ width: '100%', background: 'linear-gradient(135deg, #ef4444, #dc2626)', color: 'white', marginTop: '1rem' }}>
                Registrar Descuento
              </button>
            </form>
          </div>
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1.5rem' }}>
            <HistoryIcon color="#64748b" size={28} />
            <h2 style={{ fontSize: '1.5rem', margin: 0 }}>Historial de Descuentos Personales</h2>
          </div>
          
          <div className="glass-card" style={{ minHeight: '400px' }}>
            {!selectedMaquilero ? (
              <div style={{ textAlign: 'center', color: '#94a3b8', marginTop: '5rem' }}>
                <HistoryIcon size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                <p>Selecciona un maquilero para ver su historial de multas acumuladas.</p>
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Modelo</th>
                      <th>Motivo</th>
                      <th>Piezas</th>
                      <th>Monto</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historialDescuentos.length === 0 ? (
                      <tr><td colSpan="6" style={{ textAlign: 'center' }}>Este maquilero no tiene descuentos registrados.</td></tr>
                    ) : (
                      historialDescuentos.map(d => (
                        <tr key={d.id}>
                          <td>{new Date(d.fecha).toLocaleDateString()}</td>
                          <td><strong>{d.producto_modelo}</strong></td>
                          <td style={{ fontSize: '0.85rem', maxWidth: '200px' }}>{d.motivo}</td>
                          <td style={{ textAlign: 'center' }}>{d.piezas_afectadas}</td>
                          <td style={{ color: '#ef4444', fontWeight: 'bold' }}>-${d.monto_total}</td>
                          <td>
                            <span className={`badge ${d.aplicado ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '10px' }}>
                              {d.aplicado ? 'Cobrado' : 'Pendiente'}
                            </span>
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
    </div>
  );
}
