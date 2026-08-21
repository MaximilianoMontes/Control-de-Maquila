import { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { PackagePlus, ClipboardCheck, RefreshCw, CheckSquare } from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';
import API_URL from '../../config';
import { toast } from '../../utils/themeNotifications';
import SearchableSelect from '../SearchableSelect';

const authHeaders = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

// Reparte los metros pedidos entre los rollos disponibles de un código, empezando por el
// más viejo — misma lógica que usa el panel manual, reutilizada para el "surtir" rápido.
async function sugerirAsignaciones(codigoId, requerida) {
  const res = await axios.get(`${API_URL}/api/telas/codigos/${codigoId}/recepciones`, authHeaders());
  const disponibles = res.data.filter(r => parseFloat(r.disponible) > 0);
  let restante = requerida;
  const asignaciones = [];
  for (const r of disponibles) {
    if (restante <= 0) break;
    const tomar = Math.min(parseFloat(r.disponible), restante);
    if (tomar > 0) {
      asignaciones.push({ recepcion_id: r.id, metros: tomar });
      restante -= tomar;
    }
  }
  return asignaciones;
}

function LineaPorSurtir({ linea, isEn, onSurtida, seleccionada, onToggleSeleccion }) {
  const [abierto, setAbierto] = useState(false);
  const [montoSurtir, setMontoSurtir] = useState('');
  const [surtiendo, setSurtiendo] = useState(false);

  const disponible = parseFloat(linea.stock_disponible);
  const requerida = parseFloat(linea.cantidad_requerida);
  const sinExistencia = disponible <= 0;

  const abrirPanel = () => {
    setMontoSurtir(Math.min(requerida, disponible).toFixed(2));
    setAbierto(true);
  };

  const confirmarSurtir = async () => {
    const monto = parseFloat(montoSurtir);
    if (!(monto > 0)) {
      toast.error(isEn ? 'Enter how much you are fulfilling' : 'Escribe cuánto estás surtiendo');
      return;
    }
    if (monto > disponible) {
      toast.error(isEn ? `Only ${disponible.toFixed(2)} m available` : `Solo hay ${disponible.toFixed(2)} m disponibles`);
      return;
    }
    setSurtiendo(true);
    try {
      // Por dentro se sigue repartiendo entre los rollos más viejos con existencia (FIFO) —
      // solo que ya no se le pide a la persona elegir de cuál rollo, solo cuánto surtir.
      const asignaciones = await sugerirAsignaciones(linea.codigo_id, monto);
      if (asignaciones.length === 0) {
        toast.error(isEn ? 'No rolls with stock for this code' : 'No hay rollos con existencia de este código');
        return;
      }
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
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
          <input
            type="checkbox" checked={seleccionada} disabled={sinExistencia}
            onChange={() => onToggleSeleccion(linea.id)}
            style={{ marginTop: '4px', cursor: sinExistencia ? 'not-allowed' : 'pointer' }}
            title={sinExistencia ? (isEn ? 'No stock available' : 'Sin existencia disponible') : (isEn ? 'Select to authorize in bulk' : 'Seleccionar para autorizar en lote')}
          />
          <div style={{ fontSize: '0.85rem' }}>
            <strong style={{ fontFamily: 'monospace' }}>{linea.codigo}</strong> — {requerida.toFixed(2)} m
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
              {isEn ? 'Stock' : 'Existencia'}: {disponible.toFixed(2)} m
            </div>
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
          <p style={{ margin: '0 0 0.6rem 0', fontSize: '0.8rem' }}>
            {isEn ? 'Total stock available' : 'Existencia total disponible'}: <strong>{disponible.toFixed(2)} m</strong>
          </p>
          <div className="form-group" style={{ marginBottom: '0.6rem' }}>
            <label className="form-label">{isEn ? 'Amount to fulfill' : 'Cantidad a surtir'}</label>
            <input
              type="number" step="0.01" min="0" max={disponible}
              className="form-input"
              value={montoSurtir}
              onChange={e => setMontoSurtir(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn btn-primary" style={{ padding: '6px 14px', fontSize: '0.8rem' }} disabled={surtiendo} onClick={confirmarSurtir}>
              {surtiendo ? (isEn ? 'Confirming...' : 'Confirmando...') : (isEn ? 'Confirm' : 'Confirmar')}
            </button>
          </div>
          {requerida > disponible && (
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.75rem', color: '#f59e0b' }}>
              {isEn ? `Only ${disponible.toFixed(2)} m available — less than the ${requerida.toFixed(2)} m requested.` : `Solo hay ${disponible.toFixed(2)} m disponibles — menos de los ${requerida.toFixed(2)} m pedidos.`}
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

  const [devCodigoId, setDevCodigoId] = useState('');
  const [devMetros, setDevMetros] = useState('');
  const [devMotivo, setDevMotivo] = useState('');
  const [guardandoDev, setGuardandoDev] = useState(false);

  const [lineasPendientes, setLineasPendientes] = useState([]);
  const [seleccionadas, setSeleccionadas] = useState(new Set());
  const [autorizandoLote, setAutorizandoLote] = useState(false);

  const [historial, setHistorial] = useState([]);
  const [filtros, setFiltros] = useState({ desde: '', hasta: '', codigo_id: '', destino: '' });
  const [devoluciones, setDevoluciones] = useState([]);

  const devCodigoSeleccionado = codigos.find(c => String(c.id) === String(devCodigoId));

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

  const fetchDevoluciones = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/api/telas/devoluciones`, authHeaders());
      setDevoluciones(res.data);
    } catch (e) { console.error('Error fetching devoluciones de telas', e); }
  }, []);

  useEffect(() => {
    fetchLineasPendientes();
  }, [fetchLineasPendientes]);

  useEffect(() => {
    fetchHistorial();
  }, [fetchHistorial]);

  useEffect(() => {
    fetchDevoluciones();
  }, [fetchDevoluciones]);

  const codigosConTodos = useMemo(() => [{ id: '', codigo: isEn ? 'All' : 'Todos' }, ...codigos], [codigos, isEn]);

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

  const handleSubmitDevolucion = async (e) => {
    e.preventDefault();
    if (!devCodigoId || !devMetros) return;
    setGuardandoDev(true);
    try {
      await axios.post(`${API_URL}/api/telas/devoluciones`, { codigo_id: devCodigoId, metros: devMetros, motivo: devMotivo }, authHeaders());
      toast.success(isEn ? 'Return registered' : 'Devolución registrada');
      setDevMetros('');
      setDevMotivo('');
      fetchCodigos();
      fetchDevoluciones();
    } catch (e) {
      toast.error(e.response?.data?.error || (isEn ? 'Error registering return' : 'Error al registrar la devolución'));
    } finally {
      setGuardandoDev(false);
    }
  };

  const handleLineaSurtida = () => {
    fetchLineasPendientes();
    fetchCodigos();
    fetchHistorial();
  };

  const toggleSeleccion = (lineaId) => {
    setSeleccionadas(prev => {
      const next = new Set(prev);
      if (next.has(lineaId)) next.delete(lineaId); else next.add(lineaId);
      return next;
    });
  };

  const autorizarSeleccionadas = async () => {
    const lineas = lineasPendientes.filter(l => seleccionadas.has(l.id));
    if (lineas.length === 0) return;
    setAutorizandoLote(true);
    let ok = 0, fallidas = 0;
    for (const linea of lineas) {
      try {
        const asignaciones = await sugerirAsignaciones(linea.codigo_id, parseFloat(linea.cantidad_requerida));
        if (asignaciones.length === 0) { fallidas++; continue; }
        await axios.post(`${API_URL}/api/telas/requisiciones/lineas/${linea.id}/surtir`, { asignaciones }, authHeaders());
        ok++;
      } catch {
        fallidas++;
      }
    }
    setSeleccionadas(new Set());
    setAutorizandoLote(false);
    if (ok > 0) toast.success(isEn ? `${ok} line(s) fulfilled` : `${ok} línea(s) surtida(s)`);
    if (fallidas > 0) toast.error(isEn ? `${fallidas} line(s) could not be fulfilled` : `${fallidas} línea(s) no se pudieron surtir`);
    handleLineaSurtida();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2.1fr) minmax(280px, 1fr)', gap: '1.5rem', alignItems: 'start' }}>
        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <h2 style={{ fontSize: '1.3rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ClipboardCheck color="#f59e0b" /> {isEn ? 'Requisitions Ready to Fulfill' : 'Requisiciones por Surtir'}
            </h2>
            {seleccionadas.size > 0 && (
              <button className="btn btn-primary" style={{ padding: '5px 12px', fontSize: '0.78rem' }} disabled={autorizandoLote} onClick={autorizarSeleccionadas}>
                <CheckSquare size={14} style={{ marginRight: '4px' }} />
                {autorizandoLote ? (isEn ? 'Authorizing...' : 'Autorizando...') : (isEn ? `Authorize (${seleccionadas.size})` : `Autorizar (${seleccionadas.size})`)}
              </button>
            )}
          </div>
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
                      <LineaPorSurtir
                        key={l.id} linea={l} isEn={isEn} onSurtida={handleLineaSurtida}
                        seleccionada={seleccionadas.has(l.id)} onToggleSeleccion={toggleSeleccion}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="glass-card">
          <h2 style={{ fontSize: '1.15rem', margin: '0 0 1.2rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <PackagePlus color="#34d399" /> {isEn ? 'Register Fabric Return' : 'Registrar Devolución de Tela'}
          </h2>
          <form onSubmit={handleSubmitDevolucion} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">{isEn ? 'Fabric Code' : 'Código de Tela'}</label>
              <SearchableSelect
                options={codigos}
                value={devCodigoId}
                onChange={setDevCodigoId}
                labelKey="codigo"
                valueKey="id"
                placeholder={isEn ? 'Select...' : 'Seleccionar...'}
                required
              />
            </div>
            {devCodigoSeleccionado && (
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{devCodigoSeleccionado.descripcion}</p>
            )}
            <div className="form-group">
              <label className="form-label">{isEn ? 'Meters' : 'Metros'}</label>
              <input type="number" step="0.01" className="form-input" value={devMetros} onChange={e => setDevMetros(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">{isEn ? 'Reason' : 'Motivo'}</label>
              <input className="form-input" value={devMotivo} onChange={e => setDevMotivo(e.target.value)} placeholder={isEn ? 'e.g. unused excess, defect found later' : 'ej. sobrante sin usar, defecto detectado después'} />
            </div>
            <button type="submit" className="btn btn-primary" disabled={guardandoDev}>
              {guardandoDev ? (isEn ? 'Saving...' : 'Guardando...') : (isEn ? 'Register Return' : 'Registrar Devolución')}
            </button>
          </form>
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
            <SearchableSelect
              options={codigosConTodos}
              value={filtros.codigo_id}
              onChange={val => setFiltros({ ...filtros, codigo_id: val })}
              labelKey="codigo"
              valueKey="id"
              placeholder={isEn ? 'All' : 'Todos'}
            />
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
                <th style={{ textAlign: 'right' }}>{isEn ? 'Requested (m)' : 'Pedido (m)'}</th>
                <th style={{ textAlign: 'right' }}>{isEn ? 'Fulfilled' : 'Surtido'}</th>
                <th style={{ textAlign: 'right' }}>{isEn ? 'Stock (before)' : 'Metros'}</th>
                <th style={{ textAlign: 'right' }}>{isEn ? 'Remaining' : 'Sobrante'}</th>
                <th>{isEn ? 'Type' : 'Tipo'}</th>
                <th>{isEn ? 'Destination' : 'Destino'}</th>
                <th>{isEn ? 'User' : 'Usuario'}</th>
              </tr>
            </thead>
            <tbody>
              {historial.length === 0 ? (
                <tr><td colSpan="9" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '1.5rem' }}>
                  {isEn ? 'No outbound movements found.' : 'No se encontraron salidas.'}
                </td></tr>
              ) : (
                historial.map(h => (
                  <tr key={h.id}>
                    <td>{new Date(h.fecha).toLocaleString('es-MX')}</td>
                    <td style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{h.codigo}</td>
                    <td style={{ textAlign: 'right' }}>{h.pedido_metros != null ? parseFloat(h.pedido_metros).toFixed(2) : '—'}</td>
                    <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{parseFloat(h.metros).toFixed(2)}</td>
                    <td style={{ textAlign: 'right' }}>{h.inventario_antes != null ? parseFloat(h.inventario_antes).toFixed(2) : '—'}</td>
                    <td style={{ textAlign: 'right' }}>{h.sobrante != null ? parseFloat(h.sobrante).toFixed(2) : '—'}</td>
                    <td>
                      <span className={`badge ${h.tipo === 'muestra' ? 'badge-warning' : 'badge-info'}`}>
                        {h.tipo === 'muestra' ? (isEn ? 'Sample' : 'Muestra') : (isEn ? 'Production' : 'Producción')}
                      </span>
                    </td>
                    <td>{h.destino || '—'}</td>
                    <td>{h.username || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="glass-card">
        <h2 style={{ fontSize: '1.3rem', margin: '0 0 1rem 0' }}>{isEn ? 'Return History' : 'Historial de Devoluciones'}</h2>
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>{isEn ? 'Date & Time' : 'Fecha y Hora'}</th>
                <th>{isEn ? 'Code' : 'Código'}</th>
                <th style={{ textAlign: 'right' }}>{isEn ? 'Meters' : 'Metros'}</th>
                <th>{isEn ? 'Reason' : 'Motivo'}</th>
                <th>{isEn ? 'User' : 'Usuario'}</th>
              </tr>
            </thead>
            <tbody>
              {devoluciones.length === 0 ? (
                <tr><td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '1.5rem' }}>
                  {isEn ? 'No returns found.' : 'No se encontraron devoluciones.'}
                </td></tr>
              ) : (
                devoluciones.map(d => (
                  <tr key={d.id}>
                    <td>{new Date(d.fecha).toLocaleString('es-MX')}</td>
                    <td style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{d.codigo}</td>
                    <td style={{ textAlign: 'right', color: '#34d399', fontWeight: 'bold' }}>+{parseFloat(d.metros).toFixed(2)}</td>
                    <td>{d.motivo || '—'}</td>
                    <td>{d.username || '—'}</td>
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
