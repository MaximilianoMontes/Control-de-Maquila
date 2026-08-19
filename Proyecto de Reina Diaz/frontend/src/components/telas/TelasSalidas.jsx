import { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { PackageMinus, ClipboardCheck, RefreshCw, Boxes } from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';
import API_URL from '../../config';
import { toast } from '../../utils/themeNotifications';

const authHeaders = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

function LineaPorSurtir({ linea, isEn, onSurtida }) {
  const [abierto, setAbierto] = useState(false);
  const [rollos, setRollos] = useState(null);
  const [cargandoRollos, setCargandoRollos] = useState(false);
  const [asignado, setAsignado] = useState({}); // { recepcion_id: metros }
  const [surtiendo, setSurtiendo] = useState(false);

  const disponible = parseFloat(linea.stock_disponible);
  const requerida = parseFloat(linea.cantidad_requerida);
  const sinExistencia = disponible <= 0;

  const abrirPanel = async () => {
    setAbierto(true);
    setCargandoRollos(true);
    try {
      const res = await axios.get(`${API_URL}/api/telas/codigos/${linea.codigo_id}/recepciones`, authHeaders());
      const disponibles = res.data.filter(r => parseFloat(r.disponible) > 0);
      setRollos(disponibles);
      // Sugerencia inicial: llenar rollo por rollo (el más viejo primero) hasta cubrir lo
      // pedido o hasta agotar la existencia — lo más cercano posible a lo pedido.
      let restante = requerida;
      const sugerido = {};
      for (const r of disponibles) {
        if (restante <= 0) break;
        const tomar = Math.min(parseFloat(r.disponible), restante);
        if (tomar > 0) {
          sugerido[r.id] = tomar.toFixed(2);
          restante -= tomar;
        }
      }
      setAsignado(sugerido);
    } catch {
      toast.error(isEn ? 'Error loading rolls' : 'Error al cargar los rollos');
    } finally {
      setCargandoRollos(false);
    }
  };

  const totalAsignado = Object.values(asignado).reduce((acc, v) => acc + (parseFloat(v) || 0), 0);

  const cambiarAsignacion = (recepcionId, value) => {
    setAsignado(prev => ({ ...prev, [recepcionId]: value }));
  };

  const confirmarSurtir = async () => {
    const asignaciones = Object.entries(asignado)
      .map(([recepcion_id, metros]) => ({ recepcion_id, metros: parseFloat(metros) }))
      .filter(a => a.metros > 0);
    if (asignaciones.length === 0) {
      toast.error(isEn ? 'Assign meters to at least one roll' : 'Asigna metros de al menos un rollo');
      return;
    }
    setSurtiendo(true);
    try {
      await axios.post(`${API_URL}/api/telas/requisiciones/lineas/${linea.id}/surtir`, { asignaciones }, authHeaders());
      toast.success(isEn ? 'Requisition line fulfilled' : 'Línea de requisición surtida');
      onSurtida();
    } catch (e) {
      toast.error(e.response?.data?.error || (isEn ? 'Error fulfilling requisition line' : 'Error al surtir la línea'));
    } finally {
      setSurtiendo(false);
    }
  };

  return (
    <div style={{ background: 'rgba(245, 158, 11, 0.06)', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: '8px', overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0.8rem', gap: '0.6rem', flexWrap: 'wrap' }}>
        <div style={{ fontSize: '0.85rem' }}>
          <strong style={{ fontFamily: 'monospace' }}>{linea.codigo}</strong> — {requerida.toFixed(2)} m
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
            {isEn ? 'Stock' : 'Existencia'}: {disponible.toFixed(2)} m
          </div>
        </div>
        {abierto ? (
          <button className="btn" style={{ padding: '5px 12px', fontSize: '0.8rem' }} onClick={() => setAbierto(false)}>
            {isEn ? 'Close' : 'Cerrar'}
          </button>
        ) : (
          <button className="btn btn-primary" style={{ padding: '5px 12px', fontSize: '0.8rem' }} disabled={sinExistencia} onClick={abrirPanel}>
            {isEn ? 'Fulfill' : 'Surtir'}
          </button>
        )}
      </div>

      {abierto && (
        <div style={{ padding: '0.8rem', borderTop: '1px solid rgba(245, 158, 11, 0.2)', background: 'rgba(0,0,0,0.03)' }}>
          <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Boxes size={13} /> {isEn ? 'Choose which rolls to take meters from:' : 'Elige de qué rollos tomar los metros:'}
          </p>
          {cargandoRollos ? (
            <p style={{ margin: '0 0 0.6rem 0', fontSize: '0.8rem' }}>{isEn ? 'Loading...' : 'Cargando...'}</p>
          ) : (rollos || []).length === 0 ? (
            <p style={{ margin: '0 0 0.6rem 0', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{isEn ? 'No rolls with stock for this code.' : 'No hay rollos con existencia de este código.'}</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '0.6rem', maxHeight: '180px', overflowY: 'auto' }}>
              {rollos.map(r => (
                <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', fontSize: '0.78rem' }}>
                  <span style={{ flex: 1 }}>
                    {new Date(r.fecha_creacion).toLocaleDateString('es-MX')} {r.numero_factura ? `· ${r.numero_factura}` : ''}
                    <span style={{ color: 'var(--text-secondary)' }}> — {isEn ? 'available' : 'disponible'}: {parseFloat(r.disponible).toFixed(2)} m</span>
                  </span>
                  <input
                    type="number" step="0.01" min="0" max={r.disponible}
                    className="form-input" style={{ width: '90px', padding: '4px' }}
                    value={asignado[r.id] ?? ''}
                    onChange={e => cambiarAsignacion(r.id, e.target.value)}
                    placeholder="0"
                  />
                </div>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>
              {isEn ? 'Total assigned' : 'Total asignado'}: {totalAsignado.toFixed(2)} / {requerida.toFixed(2)} m
            </span>
            <button className="btn btn-primary" style={{ padding: '6px 14px', fontSize: '0.8rem' }} disabled={surtiendo || totalAsignado <= 0} onClick={confirmarSurtir}>
              {surtiendo ? (isEn ? 'Confirming...' : 'Confirmando...') : (isEn ? 'Confirm' : 'Confirmar')}
            </button>
          </div>
          {requerida > disponible && (
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.75rem', color: '#f59e0b' }}>
              {isEn ? `Only ${disponible.toFixed(2)} m available — the closest possible amount was suggested.` : `Solo hay ${disponible.toFixed(2)} m disponibles — se sugirió la cantidad más cercana posible.`}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function TelasSalidas({ codigos, fetchCodigos }) {
  const { settings } = useSettings();
  const isEn = settings.language === 'en';
  const [codigoId, setCodigoId] = useState('');
  const [metros, setMetros] = useState('');
  const [destino, setDestino] = useState('');
  const [guardando, setGuardando] = useState(false);

  const [lineasPendientes, setLineasPendientes] = useState([]);

  const [historial, setHistorial] = useState([]);
  const [filtros, setFiltros] = useState({ desde: '', hasta: '', codigo_id: '', destino: '' });

  const codigoSeleccionado = codigos.find(c => String(c.id) === String(codigoId));

  const fetchLineasPendientes = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/api/telas/requisiciones/lineas-pendientes`, authHeaders());
      setLineasPendientes(res.data);
    } catch (e) { console.error('Error fetching lineas pendientes de requisicion', e); }
  }, []);

  const fetchHistorial = useCallback(async () => {
    try {
      const params = {};
      if (filtros.desde) params.desde = filtros.desde;
      if (filtros.hasta) params.hasta = filtros.hasta;
      if (filtros.codigo_id) params.codigo_id = filtros.codigo_id;
      if (filtros.destino) params.destino = filtros.destino;
      const res = await axios.get(`${API_URL}/api/telas/salidas`, { ...authHeaders(), params });
      setHistorial(res.data);
    } catch (e) { console.error('Error fetching historial de salidas', e); }
  }, [filtros]);

  useEffect(() => {
    fetchLineasPendientes();
  }, [fetchLineasPendientes]);

  useEffect(() => {
    fetchHistorial();
  }, [fetchHistorial]);

  const requisicionesAgrupadas = useMemo(() => {
    const grupos = new Map();
    for (const l of lineasPendientes) {
      if (!grupos.has(l.requisicion_id)) {
        grupos.set(l.requisicion_id, { requisicion_id: l.requisicion_id, modelo: l.modelo, fecha_finalizada: l.fecha_finalizada, lineas: [] });
      }
      grupos.get(l.requisicion_id).lineas.push(l);
    }
    return Array.from(grupos.values());
  }, [lineasPendientes]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!codigoId || !metros) return;
    setGuardando(true);
    try {
      await axios.post(`${API_URL}/api/telas/salidas`, { codigo_id: codigoId, metros, destino }, authHeaders());
      toast.success(isEn ? 'Outbound movement registered' : 'Salida registrada');
      setMetros('');
      setDestino('');
      fetchCodigos();
      fetchHistorial();
    } catch (e) {
      toast.error(e.response?.data?.error || (isEn ? 'Error registering outbound movement' : 'Error al registrar la salida'));
    } finally {
      setGuardando(false);
    }
  };

  const handleLineaSurtida = () => {
    fetchLineasPendientes();
    fetchCodigos();
    fetchHistorial();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>
        <div className="glass-card">
          <h2 style={{ fontSize: '1.3rem', margin: '0 0 1.2rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <PackageMinus color="#ef4444" /> {isEn ? 'Register Outbound Fabric' : 'Registrar Salida de Tela'}
          </h2>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">{isEn ? 'Fabric Code' : 'Código de Tela'}</label>
              <select className="form-input" value={codigoId} onChange={e => setCodigoId(e.target.value)} required>
                <option value="">{isEn ? 'Select...' : 'Seleccionar...'}</option>
                {codigos.map(c => (
                  <option key={c.id} value={c.id}>{c.codigo} — {isEn ? 'Stock' : 'Existencia'}: {parseFloat(c.stock_metros).toFixed(2)} m</option>
                ))}
              </select>
            </div>
            {codigoSeleccionado && (
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{codigoSeleccionado.descripcion}</p>
            )}
            <div className="form-group">
              <label className="form-label">{isEn ? 'Meters' : 'Metros'}</label>
              <input type="number" step="0.01" className="form-input" value={metros} onChange={e => setMetros(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">{isEn ? 'Destination (model / cut)' : 'Destino (modelo / corte)'}</label>
              <input className="form-input" value={destino} onChange={e => setDestino(e.target.value)} placeholder={isEn ? 'Free text, e.g. model 723138' : 'Texto libre, ej. modelo 723138'} />
            </div>
            <button type="submit" className="btn btn-primary" disabled={guardando}>
              {guardando ? (isEn ? 'Saving...' : 'Guardando...') : (isEn ? 'Register Outbound' : 'Registrar Salida')}
            </button>
          </form>
        </div>

        <div className="glass-card">
          <h2 style={{ fontSize: '1.3rem', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ClipboardCheck color="#f59e0b" /> {isEn ? 'Requisitions Ready to Fulfill' : 'Requisiciones por Surtir'}
          </h2>
          {requisicionesAgrupadas.length === 0 ? (
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              {isEn ? 'No finalized requisition lines waiting to be fulfilled.' : 'No hay líneas de requisición finalizadas esperando surtirse.'}
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {requisicionesAgrupadas.map(grupo => (
                <div key={grupo.requisicion_id}>
                  <p style={{ margin: '0 0 0.4rem 0', fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-secondary)' }}>
                    {isEn ? 'Requisition' : 'Requisición'} #{grupo.requisicion_id} — {isEn ? 'Model' : 'Modelo'} {grupo.modelo}
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {grupo.lineas.map(l => (
                      <LineaPorSurtir key={l.id} linea={l} isEn={isEn} onSurtida={handleLineaSurtida} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="glass-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.8rem' }}>
          <h2 style={{ fontSize: '1.3rem', margin: 0 }}>{isEn ? 'Outbound History' : 'Historial de Salidas'}</h2>
          <button className="btn btn-secondary" onClick={fetchHistorial} title={isEn ? 'Refresh' : 'Actualizar'}>
            <RefreshCw size={16} />
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.8rem', marginBottom: '1rem' }}>
          <div className="form-group">
            <label className="form-label">{isEn ? 'From' : 'Desde'}</label>
            <input type="date" className="form-input" value={filtros.desde} onChange={e => setFiltros({ ...filtros, desde: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">{isEn ? 'To' : 'Hasta'}</label>
            <input type="date" className="form-input" value={filtros.hasta} onChange={e => setFiltros({ ...filtros, hasta: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">{isEn ? 'Fabric Code' : 'Código de Tela'}</label>
            <select className="form-input" value={filtros.codigo_id} onChange={e => setFiltros({ ...filtros, codigo_id: e.target.value })}>
              <option value="">{isEn ? 'All' : 'Todos'}</option>
              {codigos.map(c => <option key={c.id} value={c.id}>{c.codigo}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">{isEn ? 'Destination / Model' : 'Destino / Modelo'}</label>
            <input className="form-input" value={filtros.destino} onChange={e => setFiltros({ ...filtros, destino: e.target.value })} placeholder={isEn ? 'Search...' : 'Buscar...'} />
          </div>
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>{isEn ? 'Date & Time' : 'Fecha y Hora'}</th>
                <th>{isEn ? 'Code' : 'Código'}</th>
                <th style={{ textAlign: 'right' }}>{isEn ? 'Meters' : 'Metros'}</th>
                <th>{isEn ? 'Destination' : 'Destino'}</th>
                <th>{isEn ? 'User' : 'Usuario'}</th>
              </tr>
            </thead>
            <tbody>
              {historial.length === 0 ? (
                <tr><td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '1.5rem' }}>
                  {isEn ? 'No outbound movements found.' : 'No se encontraron salidas.'}
                </td></tr>
              ) : (
                historial.map(h => (
                  <tr key={h.id}>
                    <td>{new Date(h.fecha).toLocaleString('es-MX')}</td>
                    <td style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{h.codigo}</td>
                    <td style={{ textAlign: 'right' }}>{parseFloat(h.metros).toFixed(2)}</td>
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
  );
}
