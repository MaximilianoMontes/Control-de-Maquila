import { useState, useMemo } from 'react';
import axios from 'axios';
import { Search, RefreshCw, X, History } from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';
import API_URL from '../../config';
import { toast } from '../../utils/themeNotifications';

const authHeaders = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

export default function TelasCodigos({ codigos, fetchCodigos }) {
  const { settings } = useSettings();
  const isEn = settings.language === 'en';
  const [texto, setTexto] = useState('');

  const [codigoDetalle, setCodigoDetalle] = useState(null);
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

  const verHistorial = async (codigo) => {
    setCodigoDetalle(codigo);
    setCargandoHistorial(true);
    try {
      const res = await axios.get(`${API_URL}/api/telas/codigos/${codigo.id}/historial`, authHeaders());
      setHistorial(res.data);
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
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
            <input
              className="form-input"
              style={{ paddingLeft: '32px' }}
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
        {isEn ? 'Click a row to see its outbound history.' : 'Haz clic en una fila para ver su historial de salidas.'}
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
                <tr key={c.id} onClick={() => verHistorial(c)} style={{ cursor: 'pointer' }}>
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
          onClick={() => { setCodigoDetalle(null); setHistorial(null); }}
        >
          <div className="glass-card" style={{ width: '95%', maxWidth: '700px', maxHeight: '80vh', overflowY: 'auto', padding: '1.4rem 1.8rem' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.3rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <History size={20} /> {codigoDetalle.codigo}
                </h2>
                <p style={{ margin: '0.2rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  {isEn ? 'Outbound history' : 'Historial de salidas'}
                </p>
              </div>
              <button className="btn-icon" style={{ background: 'rgba(255,255,255,0.05)', border: 'none', padding: '8px', borderRadius: '50%', cursor: 'pointer' }} onClick={() => { setCodigoDetalle(null); setHistorial(null); }}>
                <X size={20} />
              </button>
            </div>

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
          </div>
        </div>
      )}
    </div>
  );
}
