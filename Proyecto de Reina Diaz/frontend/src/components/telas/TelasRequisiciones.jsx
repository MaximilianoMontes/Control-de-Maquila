import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { ClipboardList, Plus, X, CheckCircle2, Trash2 } from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';
import API_URL from '../../config';
import { toast } from '../../utils/themeNotifications';

const authHeaders = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

export default function TelasRequisiciones({ codigos }) {
  const { settings } = useSettings();
  const isEn = settings.language === 'en';

  const [requisiciones, setRequisiciones] = useState([]);
  const [modelo, setModelo] = useState('');
  const [notas, setNotas] = useState('');
  const [lineas, setLineas] = useState([]);
  const [lineaNueva, setLineaNueva] = useState({ codigo_id: '', cantidad_requerida: '', ancho: '' });
  const [guardando, setGuardando] = useState(false);

  const [detalle, setDetalle] = useState(null);

  const fetchRequisiciones = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/api/telas/requisiciones`, authHeaders());
      setRequisiciones(res.data);
    } catch (e) { console.error('Error fetching requisiciones', e); }
  }, []);

  useEffect(() => {
    fetchRequisiciones();
  }, [fetchRequisiciones]);

  const agregarLinea = () => {
    if (!lineaNueva.codigo_id || !lineaNueva.cantidad_requerida) return;
    const codigo = codigos.find(c => String(c.id) === String(lineaNueva.codigo_id));
    setLineas(prev => [...prev, { ...lineaNueva, codigoTexto: codigo?.codigo || lineaNueva.codigo_id }]);
    setLineaNueva({ codigo_id: '', cantidad_requerida: '', ancho: '' });
  };

  const quitarLinea = (idx) => {
    setLineas(prev => prev.filter((_, i) => i !== idx));
  };

  const guardarRequisicion = async () => {
    if (!modelo.trim() || lineas.length === 0) {
      toast.error(isEn ? 'Model and at least one line are required' : 'El modelo y al menos una línea son requeridos');
      return;
    }
    setGuardando(true);
    try {
      await axios.post(`${API_URL}/api/telas/requisiciones`, { modelo, notas, lineas }, authHeaders());
      toast.success(isEn ? 'Requisition created' : 'Requisición creada');
      setModelo('');
      setNotas('');
      setLineas([]);
      fetchRequisiciones();
    } catch (e) {
      toast.error(e.response?.data?.error || (isEn ? 'Error creating requisition' : 'Error al crear la requisición'));
    } finally {
      setGuardando(false);
    }
  };

  const finalizar = async (id) => {
    try {
      await axios.patch(`${API_URL}/api/telas/requisiciones/${id}/finalizar`, {}, authHeaders());
      toast.success(isEn ? 'Requisition finalized — ready to fulfill in Outbound' : 'Requisición finalizada — lista para surtir en Salidas');
      fetchRequisiciones();
    } catch (e) {
      toast.error(e.response?.data?.error || (isEn ? 'Error finalizing requisition' : 'Error al finalizar la requisición'));
    }
  };

  const verDetalle = async (id) => {
    try {
      const res = await axios.get(`${API_URL}/api/telas/requisiciones/${id}`, authHeaders());
      setDetalle(res.data);
    } catch {
      toast.error(isEn ? 'Error loading requisition' : 'Error al cargar la requisición');
    }
  };

  const estadoBadge = (estado) => {
    const map = { borrador: 'badge-info', finalizada: 'badge-warning', surtida: 'badge-success', cancelada: 'badge-danger' };
    return map[estado] || 'badge-info';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="glass-card">
        <h2 style={{ fontSize: '1.3rem', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ClipboardList color="#f59e0b" /> {isEn ? 'New Fabric Requisition' : 'Nueva Requisición de Tela'}
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
          <div className="form-group">
            <label className="form-label">{isEn ? 'Model' : 'Modelo'}</label>
            <input className="form-input" value={modelo} onChange={e => setModelo(e.target.value)} placeholder="Ej: 53 2182" />
          </div>
          <div className="form-group">
            <label className="form-label">{isEn ? 'Notes' : 'Notas'}</label>
            <input className="form-input" value={notas} onChange={e => setNotas(e.target.value)} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.8rem', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', marginBottom: '1rem' }}>
          <div className="form-group">
            <label className="form-label">{isEn ? 'Fabric Code' : 'Código de Tela'}</label>
            <select className="form-input" value={lineaNueva.codigo_id} onChange={e => setLineaNueva({ ...lineaNueva, codigo_id: e.target.value })}>
              <option value="">{isEn ? 'Select...' : 'Seleccionar...'}</option>
              {codigos.map(c => <option key={c.id} value={c.id}>{c.codigo}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">{isEn ? 'Quantity (m)' : 'Cantidad (m)'}</label>
            <input type="number" step="0.01" className="form-input" value={lineaNueva.cantidad_requerida} onChange={e => setLineaNueva({ ...lineaNueva, cantidad_requerida: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">{isEn ? 'Width' : 'Ancho'}</label>
            <input type="number" step="0.001" className="form-input" value={lineaNueva.ancho} onChange={e => setLineaNueva({ ...lineaNueva, ancho: e.target.value })} placeholder="1.44" />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" style={{ width: '100%' }} onClick={agregarLinea}>
              <Plus size={16} style={{ marginRight: '4px' }} /> {isEn ? 'Add line' : 'Agregar línea'}
            </button>
          </div>
        </div>

        {lineas.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1rem' }}>
            {lineas.map((l, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.8rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', fontSize: '0.85rem' }}>
                <span><strong style={{ fontFamily: 'monospace' }}>{l.codigoTexto}</strong> — {l.cantidad_requerida} m{l.ancho ? ` · ${isEn ? 'width' : 'ancho'} ${l.ancho}` : ''}</span>
                <button className="btn" style={{ padding: '2px 6px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none' }} onClick={() => quitarLinea(idx)}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        <button className="btn btn-primary" disabled={guardando} onClick={guardarRequisicion}>
          {guardando ? (isEn ? 'Saving...' : 'Guardando...') : (isEn ? 'Save Requisition' : 'Guardar Requisición')}
        </button>
      </div>

      <div className="glass-card">
        <h2 style={{ fontSize: '1.3rem', margin: '0 0 1rem 0' }}>{isEn ? 'Requisitions' : 'Requisiciones'}</h2>
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>{isEn ? 'Model' : 'Modelo'}</th>
                <th>{isEn ? 'Status' : 'Estado'}</th>
                <th style={{ textAlign: 'center' }}>{isEn ? 'Lines' : 'Líneas'}</th>
                <th>{isEn ? 'Created' : 'Creada'}</th>
                <th style={{ textAlign: 'right' }}>{isEn ? 'Action' : 'Acción'}</th>
              </tr>
            </thead>
            <tbody>
              {requisiciones.length === 0 ? (
                <tr><td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '1.5rem' }}>
                  {isEn ? 'No requisitions yet.' : 'No hay requisiciones todavía.'}
                </td></tr>
              ) : (
                requisiciones.map(r => (
                  <tr key={r.id}>
                    <td>{r.modelo}</td>
                    <td><span className={`badge ${estadoBadge(r.estado)}`}>{r.estado}</span></td>
                    <td style={{ textAlign: 'center' }}>{r.total_lineas - r.lineas_pendientes}/{r.total_lineas}</td>
                    <td>{new Date(r.fecha_creacion).toLocaleDateString('es-MX')}</td>
                    <td style={{ textAlign: 'right', display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                      <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '0.78rem' }} onClick={() => verDetalle(r.id)}>
                        {isEn ? 'View' : 'Ver'}
                      </button>
                      {r.estado === 'borrador' && (
                        <button className="btn btn-primary" style={{ padding: '4px 10px', fontSize: '0.78rem' }} onClick={() => finalizar(r.id)}>
                          <CheckCircle2 size={14} style={{ marginRight: '4px' }} /> {isEn ? 'Finalize' : 'Finalizar'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {detalle && (
        <div
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(8px)' }}
          onClick={() => setDetalle(null)}
        >
          <div className="glass-card" style={{ width: '95%', maxWidth: '700px', maxHeight: '80vh', overflowY: 'auto', padding: '1.4rem 1.8rem' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.3rem' }}>{isEn ? 'Model' : 'Modelo'} {detalle.modelo}</h2>
                <p style={{ margin: '0.2rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  <span className={`badge ${estadoBadge(detalle.estado)}`}>{detalle.estado}</span> {detalle.notas ? `· ${detalle.notas}` : ''}
                </p>
              </div>
              <button className="btn-icon" style={{ background: 'rgba(255,255,255,0.05)', border: 'none', padding: '8px', borderRadius: '50%', cursor: 'pointer' }} onClick={() => setDetalle(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="table-wrapper">
              <table className="data-table" style={{ fontSize: '0.88rem' }}>
                <thead>
                  <tr>
                    <th>{isEn ? 'Code' : 'Código'}</th>
                    <th style={{ textAlign: 'right' }}>{isEn ? 'Quantity (m)' : 'Cantidad (m)'}</th>
                    <th style={{ textAlign: 'right' }}>{isEn ? 'Width' : 'Ancho'}</th>
                    <th>{isEn ? 'Status' : 'Estado'}</th>
                  </tr>
                </thead>
                <tbody>
                  {(detalle.lineas || []).map(l => (
                    <tr key={l.id}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{l.codigo}</td>
                      <td style={{ textAlign: 'right' }}>{parseFloat(l.cantidad_requerida).toFixed(2)}</td>
                      <td style={{ textAlign: 'right' }}>{l.ancho || '—'}</td>
                      <td><span className={`badge ${l.estado === 'surtida' ? 'badge-success' : 'badge-info'}`}>{l.estado}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
