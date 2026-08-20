import { useState, useMemo } from 'react';
import axios from 'axios';
import { Search, RefreshCw, X, History, Boxes } from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';
import API_URL from '../../config';
import { toast } from '../../utils/themeNotifications';

const authHeaders = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

export default function TelasCodigos({ codigos, fetchCodigos }) {
  const { settings } = useSettings();
  const isEn = settings.language === 'en';
  const [texto, setTexto] = useState('');

  const [codigoDetalle, setCodigoDetalle] = useState(null);
  const [tabDetalle, setTabDetalle] = useState('rollos');
  const [rollos, setRollos] = useState(null);
  const [cargandoRollos, setCargandoRollos] = useState(false);
  const [historial, setHistorial] = useState(null);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);

  const filtrados = useMemo(() => {
    if (!texto.trim()) return codigos;
    const q = texto.toLowerCase();
    return codigos.filter(c =>
      c.codigo.toLowerCase().includes(q) ||
      (c.descripcion || '').toLowerCase().includes(q) ||
      (c.proveedor_nombre || '').toLowerCase().includes(q) ||
      (c.color_nombre || '').toLowerCase().includes(q)
    );
  }, [codigos, texto]);

  const abrirDetalle = async (codigo) => {
    setCodigoDetalle(codigo);
    setTabDetalle('rollos');
    setCargandoRollos(true);
    try {
      const res = await axios.get(`${API_URL}/api/telas/codigos/${codigo.id}/recepciones`, authHeaders());
      setRollos(res.data);
    } catch {
      toast.error(isEn ? 'Error loading rolls' : 'Error al cargar los rollos');
    } finally {
      setCargandoRollos(false);
    }
    setCargandoHistorial(true);
    try {
      const res2 = await axios.get(`${API_URL}/api/telas/codigos/${codigo.id}/historial`, authHeaders());
      setHistorial(res2.data);
    } catch {
      toast.error(isEn ? 'Error loading history' : 'Error al cargar el historial');
    } finally {
      setCargandoHistorial(false);
    }
  };

  return (
    <div className="glass-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', gap: '1rem', flexWrap: 'wrap' }}>
        <h2 style={{ fontSize: '1.3rem', margin: 0 }}>{isEn ? 'Fabric Codes & Stock' : 'Códigos de Tela y Existencias'}</h2>
        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
          <div className="search-box">
            <Search size={16} className="search-box-icon" />
            <input
              placeholder={isEn ? 'Search code, color, supplier...' : 'Buscar código, color, proveedor...'}
              value={texto}
              onChange={e => setTexto(e.target.value)}
            />
          </div>
          <button className="btn btn-secondary" onClick={fetchCodigos} title={isEn ? 'Refresh' : 'Actualizar'}>
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      <p style={{ margin: '0 0 0.8rem 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
        {isEn ? 'Click a row to see its inventory by roll and outbound history.' : 'Haz clic en una fila para ver su inventario por rollo y su historial de salidas.'}
      </p>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>{isEn ? 'Code' : 'Código'}</th>
              <th>{isEn ? 'Description' : 'Descripción'}</th>
              <th>{isEn ? 'Supplier' : 'Proveedor'}</th>
              <th>{isEn ? 'Color' : 'Color'}</th>
              <th style={{ textAlign: 'right' }}>{isEn ? 'Price (MXN)' : 'Precio (MXN)'}</th>
              <th style={{ textAlign: 'right' }}>{isEn ? 'Stock (m)' : 'Existencia (m)'}</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '1.5rem' }}>
                {isEn ? 'No fabric codes found.' : 'No se encontraron códigos de tela.'}
              </td></tr>
            ) : (
              filtrados.map(c => (
                <tr key={c.id} onClick={() => abrirDetalle(c)} style={{ cursor: 'pointer' }}>
                  <td style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{c.codigo}</td>
                  <td style={{ fontSize: '0.85rem' }}>{c.descripcion}</td>
                  <td>{c.proveedor_nombre}</td>
                  <td>{c.color_nombre}</td>
                  <td style={{ textAlign: 'right' }}>${parseFloat(c.precio_mxn).toFixed(2)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 'bold', color: parseFloat(c.stock_metros) > 0 ? '#34d399' : '#ef4444' }}>
                    {parseFloat(c.stock_metros).toFixed(2)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {codigoDetalle && (
        <div
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(8px)' }}
          onClick={() => { setCodigoDetalle(null); setHistorial(null); setRollos(null); }}
        >
          <div className="glass-card" style={{ width: '95%', maxWidth: '700px', maxHeight: '80vh', overflowY: 'auto', padding: '1.4rem 1.8rem' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.3rem', fontFamily: 'monospace' }}>{codigoDetalle.codigo}</h2>
              <button className="btn-icon" style={{ background: 'rgba(255,255,255,0.05)', border: 'none', padding: '8px', borderRadius: '50%', cursor: 'pointer' }} onClick={() => { setCodigoDetalle(null); setHistorial(null); setRollos(null); }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)' }}>
              <button
                onClick={() => setTabDetalle('rollos')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem 0.8rem', fontSize: '0.85rem', fontWeight: tabDetalle === 'rollos' ? 'bold' : 'normal', color: tabDetalle === 'rollos' ? 'var(--primary-color)' : 'var(--text-secondary)', borderBottom: tabDetalle === 'rollos' ? '2px solid var(--primary-color)' : '2px solid transparent', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <Boxes size={14} /> {isEn ? 'Inventory by roll' : 'Inventario por rollo'}
              </button>
              <button
                onClick={() => setTabDetalle('salidas')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem 0.8rem', fontSize: '0.85rem', fontWeight: tabDetalle === 'salidas' ? 'bold' : 'normal', color: tabDetalle === 'salidas' ? 'var(--primary-color)' : 'var(--text-secondary)', borderBottom: tabDetalle === 'salidas' ? '2px solid var(--primary-color)' : '2px solid transparent', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <History size={14} /> {isEn ? 'Outbound history' : 'Historial de salidas'}
              </button>
            </div>

            {tabDetalle === 'rollos' && (
              <div className="table-wrapper">
                <table className="data-table" style={{ fontSize: '0.88rem' }}>
                  <thead>
                    <tr>
                      <th>{isEn ? 'Date' : 'Fecha'}</th>
                      <th>{isEn ? 'Invoice' : 'Factura'}</th>
                      <th style={{ textAlign: 'right' }}>{isEn ? 'Rolls' : 'Rollos'}</th>
                      <th style={{ textAlign: 'right' }}>{isEn ? 'Received (m)' : 'Recibido (m)'}</th>
                      <th style={{ textAlign: 'right' }}>{isEn ? 'Width' : 'Ancho'}</th>
                      <th style={{ textAlign: 'right' }}>{isEn ? 'Available (m)' : 'Disponible (m)'}</th>
                      <th>{isEn ? 'Status' : 'Estado'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cargandoRollos ? (
                      <tr><td colSpan="7" style={{ textAlign: 'center', padding: '1.5rem' }}>{isEn ? 'Loading...' : 'Cargando...'}</td></tr>
                    ) : !rollos || rollos.length === 0 ? (
                      <tr><td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '1.5rem' }}>
                        {isEn ? 'No rolls received for this code.' : 'No hay rollos recibidos de este código.'}
                      </td></tr>
                    ) : (
                      rollos.map(r => (
                        <tr key={r.id}>
                          <td>{new Date(r.fecha_creacion).toLocaleDateString('es-MX')}</td>
                          <td>{r.numero_factura || '—'}</td>
                          <td style={{ textAlign: 'right' }}>{r.rollos}</td>
                          <td style={{ textAlign: 'right' }}>{parseFloat(r.metros).toFixed(2)}</td>
                          <td style={{ textAlign: 'right' }}>{r.ancho ? parseFloat(r.ancho).toFixed(3) : '—'}</td>
                          <td style={{ textAlign: 'right', fontWeight: 'bold', color: parseFloat(r.disponible) > 0 ? '#34d399' : '#ef4444' }}>{parseFloat(r.disponible).toFixed(2)}</td>
                          <td>
                            <span className={`badge ${r.estado === 'aprobado' ? 'badge-success' : r.estado === 'devuelto' ? 'badge-danger' : 'badge-info'}`}>
                              {r.estado}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {tabDetalle === 'salidas' && (
              <div className="table-wrapper">
                <table className="data-table" style={{ fontSize: '0.88rem' }}>
                  <thead>
                    <tr>
                      <th>{isEn ? 'Date' : 'Fecha'}</th>
                      <th style={{ textAlign: 'right' }}>{isEn ? 'Meters' : 'Metros'}</th>
                      <th>{isEn ? 'Destination' : 'Destino'}</th>
                      <th>{isEn ? 'User' : 'Usuario'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cargandoHistorial ? (
                      <tr><td colSpan="4" style={{ textAlign: 'center', padding: '1.5rem' }}>{isEn ? 'Loading...' : 'Cargando...'}</td></tr>
                    ) : !historial || historial.length === 0 ? (
                      <tr><td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '1.5rem' }}>
                        {isEn ? 'No outbound movements registered for this code.' : 'Este código no tiene salidas registradas.'}
                      </td></tr>
                    ) : (
                      historial.map(h => (
                        <tr key={h.id}>
                          <td>{new Date(h.fecha).toLocaleString('es-MX')}</td>
                          <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{parseFloat(h.metros).toFixed(2)}</td>
                          <td>{h.destino || '—'}</td>
                          <td>{h.username || '—'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
