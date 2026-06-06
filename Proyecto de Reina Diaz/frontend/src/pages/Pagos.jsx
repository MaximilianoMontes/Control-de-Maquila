import { useState, useEffect } from 'react';
import axios from 'axios';
import { useSearchParams } from 'react-router-dom';
import { Printer, AlertCircle, History as HistoryIcon, Trash2 } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import API_URL from '../config';

export default function Pagos() {
  const { settings, t, formatCurrency } = useSettings();
  const [searchParams] = useSearchParams();
  const initialOrdenId = searchParams.get('orden') || '';
  const initialTipoPago = searchParams.get('tipo') === 'completo' ? 'completo' : 'abono';

  // Estados para Pagos de Órdenes
  const [orders, setOrders] = useState([]);
  const [pagos, setPagos] = useState([]);
  const [selectedOrden, setSelectedOrden] = useState(initialOrdenId);
  const [monto, setMonto] = useState('');
  const [tipoPago, setTipoPago] = useState(initialTipoPago);
  const [pendingDiscount, setPendingDiscount] = useState(0);
  const [lastPrefilledOrden, setLastPrefilledOrden] = useState('');

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

    const interval = setInterval(() => {
      fetchOrders();
      fetchMaquileros();
      fetchInventario();
    }, 15000); // Auto-refresca cada 15 segundos en segundo plano

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let interval;
    if (selectedOrden) {
      const loadSelectedData = async () => {
        fetchPagos(selectedOrden);
        const orden = orders.find(o => o.id.toString() === selectedOrden);
        if (orden) {
          const discount = await fetchPendingDiscount(orden.maquilero_id);
          setSelectedMaquilero(orden.maquilero_id.toString());
          setSelectedModelo(orden.inventario_id.toString()); // Pre-selecciona el producto de la orden
          
          if (selectedOrden !== lastPrefilledOrden) {
            const totalPagado = parseFloat(orden.pagado || 0);
            const restante = orden.precio_total - totalPagado;
            const suggested = Math.max(0, restante - discount);
            setMonto(suggested > 0 ? suggested.toFixed(2) : '');
            setLastPrefilledOrden(selectedOrden);
            
            const urlTipo = searchParams.get('tipo');
            if (urlTipo === 'completo') {
              setTipoPago('completo');
            } else if (urlTipo === 'abono') {
              setTipoPago('abono');
            }
          }
        }
      };
      
      loadSelectedData();
      interval = setInterval(loadSelectedData, 15000); // Auto-refresca pagos y descuentos cada 15 segundos
    } else {
      setPagos([]);
      setPendingDiscount(0);
      setMonto('');
      setLastPrefilledOrden('');
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [selectedOrden, orders, lastPrefilledOrden, searchParams]);

  useEffect(() => {
    if (selectedMaquilero) {
      fetchHistorialDescuentos(selectedMaquilero);
    } else {
      setHistorialDescuentos([]);
    }
  }, [selectedMaquilero]);

  const fetchOrders = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/produccion?incluirExtras=true`);
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
      return res.data.total_pendiente;
    } catch (e) {
      console.error(e);
      return 0;
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
      alert(e.response?.data?.error || t('pay.paymentError'));
    }
  };

  const handleDeletePago = async (pagoId) => {
    const confirmMsg = t('pay.confirmDeletePago') || '¿Estás seguro de que deseas cancelar o eliminar este pago? Los descuentos personales cobrados en este pago volverán a estar pendientes.';
    if (!window.confirm(confirmMsg)) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/api/pagos/${pagoId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchPagos(selectedOrden);
      fetchOrders();
    } catch (e) {
      console.error("Error al eliminar pago:", e);
      alert(e.response?.data?.error || 'Error al eliminar pago');
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
      alert(t('pay.discountSuccess'));
    } catch (e) {
      console.error("Error al registrar descuento:", e);
      alert(e.response?.data?.error || t('pay.discountError'));
    }
  };

  const getFolioNumber = (o) => {
    const isExtra = !!o.es_extra;
    const isArchived = !!o.archivado;
    const filteredList = orders
      .filter(item => !!item.es_extra === isExtra && !!item.archivado === isArchived)
      .sort((a, b) => b.id - a.id);
    const idx = filteredList.findIndex(item => item.id === o.id);
    return idx !== -1 ? (filteredList.length - idx) : o.id;
  };

  const activeProds = orders.filter(o => !o.es_extra && !o.archivado).sort((a, b) => b.id - a.id);
  const activeExtras = orders.filter(o => (o.es_extra === 1 || o.es_extra) && !o.archivado).sort((a, b) => b.id - a.id);
  const archivedOrders = orders.filter(o => o.archivado === 1 || o.archivado).sort((a, b) => b.id - a.id);

  const ordenActual = orders.find(o => o.id.toString() === selectedOrden);
  const totalPagado = ordenActual ? parseFloat(ordenActual.pagado || 0) : 0;
  const restante = ordenActual ? (ordenActual.precio_total - totalPagado) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4rem' }}>
      {/* SECCIÓN 1: PAGOS DE ÓRDENES */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 2fr', gap: '2rem' }}>
        <div>
          <h1 className="gradient-text" style={{ fontSize: '2rem' }}>{t('pay.title')}</h1>
          <div className="glass-card" style={{ marginTop: '2rem' }}>
            <form onSubmit={handlePago}>
              <div className="form-group">
                <label className="form-label">{t('pay.selectOrder')}</label>
                <select className="form-input" style={{ backgroundColor: 'var(--bg-input)' }} value={selectedOrden} onChange={e => setSelectedOrden(e.target.value)} required>
                  <option value="">{t('pay.chooseOrder')}</option>
                  
                  {activeProds.length > 0 && (
                    <optgroup label={settings.language === 'en' ? 'Active Production' : 'Producción Activa'}>
                      {activeProds.map(o => (
                        <option key={o.id} value={o.id}>
                          {t('pay.order')} #{getFolioNumber(o)} - {o.maquilero_nombre}
                        </option>
                      ))}
                    </optgroup>
                  )}

                  {activeExtras.length > 0 && (
                    <optgroup label={settings.language === 'en' ? 'Active Extras' : 'Extras Activos'}>
                      {activeExtras.map(o => (
                        <option key={o.id} value={o.id}>
                          {t('pay.order')} #{getFolioNumber(o)} - {o.maquilero_nombre} (EXTRA)
                        </option>
                      ))}
                    </optgroup>
                  )}

                  {archivedOrders.length > 0 && (
                    <optgroup label={settings.language === 'en' ? 'History / Archived' : 'Historial / Archivadas'}>
                      {archivedOrders.map(o => (
                        <option key={o.id} value={o.id}>
                          {t('pay.order')} #{getFolioNumber(o)} - {o.maquilero_nombre}{o.es_extra === 1 || o.es_extra ? ' (EXTRA)' : ''} ({settings.language === 'en' ? 'Archived' : 'Archivada'})
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>

              {ordenActual && (
                <div style={{ background: 'rgba(0,0,0,0.02)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                  <p><strong>{t('pay.totalCost')}</strong> {formatCurrency(ordenActual.precio_total)}</p>
                  <p style={{ color: '#34d399' }}><strong>{t('pay.alreadyPaid')}</strong> {formatCurrency(totalPagado)}</p>
                  <hr style={{ margin: '0.5rem 0', border: 'none', borderTop: '1px solid #e2e8f0' }} />
                  {pendingDiscount > 0 && (
                    <p style={{ color: '#ef4444', fontWeight: 'bold' }}>
                      <AlertCircle size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                      {t('pay.pendingFines')} -{formatCurrency(pendingDiscount)}
                    </p>
                  )}
                  <p style={{ color: (restante - pendingDiscount) > 0 ? '#ef4444' : '#34d399', fontSize: '1.1rem' }}>
                    <strong>{t('pay.netToPay')} {formatCurrency(Math.max(0, restante - pendingDiscount))}</strong>
                  </p>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">{t('pay.paymentType')}</label>
                <select className="form-input" style={{ backgroundColor: 'var(--bg-input)' }} value={tipoPago} onChange={e => setTipoPago(e.target.value)}>
                  <option value="abono">{t('pay.deposit')}</option>
                  <option value="completo">{t('pay.full')}</option>
                </select>
              </div>

              <div className="form-group">
              <label className="form-label">{t('pay.amount')}</label>
              <input 
                type="number" 
                step="0.01" 
                max={restante} 
                required 
                className="form-input" 
                value={monto} 
                onChange={e => setMonto(e.target.value)} 
                disabled={!selectedOrden}
                placeholder={restante > 0 ? `${t('pay.suggested')} ${formatCurrency(Math.max(0, restante - pendingDiscount))}` : ''}
              />
            </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={!selectedOrden || restante <= 0}>
                {t('pay.register')}
              </button>
            </form>
          </div>
        </div>

        <div>
          <h2 style={{ marginTop: '1rem' }}>{t('pay.histTitle')}</h2>
          <div className="glass-card" style={{ marginTop: '1rem', minHeight: '300px' }}>
            {!selectedOrden ? (
              <p style={{ textAlign: 'center', color: '#94a3b8', marginTop: '2rem' }}>
                {t('pay.selectSee')}
              </p>
            ) : (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>{t('pay.payId')}</th>
                      <th>{t('pay.date')}</th>
                      <th>{t('pay.type')}</th>
                      <th>{t('pay.amount2')}</th>
                      <th>{t('pay.action')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagos.length === 0 ? (
                      <tr><td colSpan="5" style={{ textAlign: 'center' }}>{t('pay.noPays')}</td></tr>
                    ) : (
                      pagos.map((p, index) => (
                        <tr key={p.id}>
                          <td>#{pagos.length - index}</td>
                          <td>{new Date(p.fecha).toLocaleDateString()}</td>
                          <td><span className="badge badge-info" style={{ textTransform: 'uppercase' }}>{p.tipo_pago}</span></td>
                          <td style={{ color: '#34d399', fontWeight: 'bold' }}>{formatCurrency(p.monto)}</td>
                          <td>
                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                              {(!ordenActual || (ordenActual.estado !== 'Terminado' && ordenActual.estado !== 'Terminado Parcial')) ? (
                                <button 
                                  className="btn-icon" 
                                  disabled
                                  style={{ 
                                    background: 'rgba(148, 163, 184, 0.1)', 
                                    color: '#94a3b8', 
                                    border: 'none', 
                                    padding: '6px', 
                                    borderRadius: '4px', 
                                    cursor: 'not-allowed' 
                                  }} 
                                  title="Solo disponible para órdenes terminadas o con pago parcial"
                                >
                                  <Printer size={18} />
                                </button>
                              ) : (
                                <a 
                                  href={`${API_URL}/api/pagos/${p.id}/comprobante?token=${localStorage.getItem('token')}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="btn-icon"
                                  style={{ 
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    background: 'rgba(59, 130, 246, 0.1)', 
                                    color: '#60a5fa', 
                                    border: 'none', 
                                    padding: '6px', 
                                    borderRadius: '4px', 
                                    cursor: 'pointer' 
                                  }} 
                                  title="Imprimir"
                                >
                                  <Printer size={18} />
                                </a>
                              )}
                              <button className="btn-icon" onClick={() => handleDeletePago(p.id)} style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', padding: '6px', borderRadius: '4px', cursor: 'pointer' }} title="Eliminar">
                                <Trash2 size={18} />
                              </button>
                            </div>
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
            <h2 className="gradient-text" style={{ fontSize: '1.8rem', margin: 0 }}>{t('pay.discountTitle')}</h2>
          </div>
          
          <div className="glass-card">
            <form onSubmit={handleDescuento}>
              <div className="form-group">
                <label className="form-label">{t('pay.chooseTailor')}</label>
                <select className="form-input" value={selectedMaquilero} onChange={e => setSelectedMaquilero(e.target.value)} required>
                  <option value="">{t('pay.chooseSelect')}</option>
                  {[...maquileros].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')).map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">{t('pay.model')}</label>
                <select className="form-input" value={selectedModelo} onChange={e => setSelectedModelo(e.target.value)} required>
                  <option value="">{t('pay.chooseSelect')}</option>
                  {[...inventario].sort((a, b) => (a.modelo || '').localeCompare(b.modelo || '', undefined, { numeric: true })).map(i => <option key={i.id} value={i.id}>{i.modelo} - {i.numero}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">{t('pay.reason')}</label>
                <textarea 
                  className="form-input" 
                  style={{ minHeight: '80px', resize: 'vertical' }} 
                  value={motivoDescuento} 
                  onChange={e => setMotivoDescuento(e.target.value)} 
                  placeholder={t('pay.reasonPlaceholder')}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">{t('pay.badPieces')}</label>
                  <input type="number" className="form-input" value={piezasMalas} onChange={e => setPiezasMalas(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">{t('pay.totalAmount')}</label>
                  <input type="number" step="0.01" className="form-input" value={montoDescuento} onChange={e => setMontoDescuento(e.target.value)} required />
                </div>
              </div>

              <button type="submit" className="btn" style={{ width: '100%', background: 'linear-gradient(135deg, #ef4444, #dc2626)', color: 'white', marginTop: '1rem' }}>
                {t('pay.registerDiscount')}
              </button>
            </form>
          </div>
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1.5rem' }}>
            <HistoryIcon color="#64748b" size={28} />
            <h2 style={{ fontSize: '1.5rem', margin: 0 }}>{t('pay.discountHistory')}</h2>
          </div>
          
          <div className="glass-card" style={{ minHeight: '400px' }}>
            {!selectedMaquilero ? (
              <div style={{ textAlign: 'center', color: '#94a3b8', marginTop: '5rem' }}>
                <HistoryIcon size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                <p>{t('pay.selectTailorSee')}</p>
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>{t('pay.date')}</th>
                      <th>{t('pay.discModel')}</th>
                      <th>{t('pay.discReason')}</th>
                      <th>{t('pay.discPieces')}</th>
                      <th>{t('pay.discAmount')}</th>
                      <th>{t('pay.discStatus')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historialDescuentos.length === 0 ? (
                      <tr><td colSpan="6" style={{ textAlign: 'center' }}>{t('pay.discNone')}</td></tr>
                    ) : (
                      historialDescuentos.map(d => (
                        <tr key={d.id}>
                          <td>{new Date(d.fecha).toLocaleDateString()}</td>
                          <td><strong>{d.producto_modelo}</strong></td>
                          <td style={{ fontSize: '0.85rem', maxWidth: '200px' }}>{d.motivo}</td>
                          <td style={{ textAlign: 'center' }}>{d.piezas_afectadas}</td>
                          <td style={{ color: '#ef4444', fontWeight: 'bold' }}>-{formatCurrency(d.monto_total)}</td>
                          <td>
                            <span className={`badge ${d.aplicado ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '10px' }}>
                              {d.aplicado ? t('pay.discCharged') : t('pay.discPending')}
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
