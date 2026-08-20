import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { FileText, Plus, X, Printer, Receipt, Paperclip, Sparkles } from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';
import API_URL from '../../config';
import { toast } from '../../utils/themeNotifications';
import SearchableSelect from '../SearchableSelect';

const authHeaders = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
const token = () => localStorage.getItem('token');

export default function TelasFacturas({ proveedores, codigos, fetchCodigos }) {
  const { settings } = useSettings();
  const isEn = settings.language === 'en';

  const [facturas, setFacturas] = useState([]);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [nueva, setNueva] = useState({ numero_factura: '', proveedor_id: '', fecha: '', tipo_cambio: '', notas: '' });
  const [archivo, setArchivo] = useState(null);
  const [guardando, setGuardando] = useState(false);

  const [facturaAbierta, setFacturaAbierta] = useState(null);
  const [recNueva, setRecNueva] = useState({ codigo_id: '', rollos: '', yardas: '', observaciones: '' });

  const [leyendoIA, setLeyendoIA] = useState(false);
  const [lineasDetectadas, setLineasDetectadas] = useState(null);

  const [aprobando, setAprobando] = useState(null); // { id, rollos, yardas }
  const [foliosDisponibles, setFoliosDisponibles] = useState([]);

  const fetchFacturas = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/api/telas/facturas`, authHeaders());
      setFacturas(res.data);
    } catch (e) { console.error('Error fetching facturas de telas', e); }
  }, []);

  useEffect(() => { fetchFacturas(); }, [fetchFacturas]);

  const abrirFactura = async (id) => {
    try {
      const res = await axios.get(`${API_URL}/api/telas/facturas/${id}`, authHeaders());
      setFacturaAbierta(res.data);
      setLineasDetectadas(null);
    } catch {
      toast.error(isEn ? 'Error loading invoice' : 'Error al cargar la factura');
    }
  };

  const handleCrearFactura = async (e) => {
    e.preventDefault();
    if (!nueva.proveedor_id || !nueva.fecha) return;
    setGuardando(true);
    try {
      const formData = new FormData();
      Object.entries(nueva).forEach(([k, v]) => formData.append(k, v));
      if (archivo) formData.append('archivo', archivo);
      const res = await axios.post(`${API_URL}/api/telas/facturas`, formData, {
        headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'multipart/form-data' }
      });
      toast.success(isEn ? 'Invoice registered' : 'Factura registrada');
      setNueva({ numero_factura: '', proveedor_id: '', fecha: '', tipo_cambio: '', notas: '' });
      setArchivo(null);
      setMostrarForm(false);
      fetchFacturas();
      abrirFactura(res.data.id);
    } catch (e) {
      toast.error(e.response?.data?.error || (isEn ? 'Error registering invoice' : 'Error al registrar la factura'));
    } finally {
      setGuardando(false);
    }
  };

  const handleAgregarRecepcion = async (e) => {
    e.preventDefault();
    if (!facturaAbierta || !recNueva.codigo_id || !recNueva.yardas) return;
    try {
      await axios.post(`${API_URL}/api/telas/facturas/${facturaAbierta.id}/recepciones`, recNueva, authHeaders());
      toast.success(isEn ? 'Receipt line added' : 'Línea de recepción agregada');
      setRecNueva({ codigo_id: '', rollos: '', yardas: '', observaciones: '' });
      abrirFactura(facturaAbierta.id);
      fetchCodigos();
    } catch (e) {
      toast.error(e.response?.data?.error || (isEn ? 'Error adding receipt line' : 'Error al agregar la línea de recepción'));
    }
  };

  const actualizarRevision = async (recepcionId, estado, extra = {}) => {
    try {
      await axios.patch(`${API_URL}/api/telas/recepciones/${recepcionId}/revision`, { ancho_revisado: 1, estado, ...extra }, authHeaders());
      toast.success(isEn ? 'Review updated' : 'Revisión actualizada');
      abrirFactura(facturaAbierta.id);
      fetchCodigos();
    } catch {
      toast.error(isEn ? 'Error updating review' : 'Error al actualizar la revisión');
    }
  };

  const abrirAprobar = async (r) => {
    const foliosYaAsignados = r.folios ? String(r.folios).split(',').map(f => parseInt(f)) : [];
    setAprobando({ id: r.id, rollos: r.rollos, metros: r.metros, observaciones: r.observaciones || '', ancho: r.ancho || '', folios: foliosYaAsignados });
    try {
      const res = await axios.get(`${API_URL}/api/telas/folios/disponibles?excluir_recepcion_id=${r.id}`, authHeaders());
      setFoliosDisponibles(res.data);
    } catch {
      setFoliosDisponibles([]);
    }
  };

  const setFolioEnSlot = (idx, valor) => {
    setAprobando(prev => {
      const folios = [...(prev.folios || [])];
      folios[idx] = valor ? parseInt(valor) : null;
      return { ...prev, folios };
    });
  };

  const confirmarAprobar = async () => {
    const foliosLimpios = (aprobando.folios || []).filter(f => f != null);
    await actualizarRevision(aprobando.id, 'aprobado', { rollos: aprobando.rollos, metros: aprobando.metros, observaciones: aprobando.observaciones, ancho: aprobando.ancho, folios: foliosLimpios });
    setAprobando(null);
  };

  const handleLeerConIA = async () => {
    if (!facturaAbierta) return;
    setLeyendoIA(true);
    try {
      const res = await axios.post(`${API_URL}/api/telas/facturas/${facturaAbierta.id}/parse-documento`, {}, authHeaders());
      const conCodigo = (res.data.lineas || []).map(l => ({ ...l, codigo_id: '' }));
      setLineasDetectadas(conCodigo);
      if (conCodigo.length === 0) {
        toast.error(isEn ? "Couldn't detect any lines in the document" : 'No se detectaron líneas en el documento');
      }
    } catch (e) {
      toast.error(e.response?.data?.error || (isEn ? 'Error reading the document' : 'Error al leer el documento'));
    } finally {
      setLeyendoIA(false);
    }
  };

  const actualizarLineaDetectada = (idx, field, value) => {
    setLineasDetectadas(prev => prev.map((l, i) => i === idx ? { ...l, [field]: value } : l));
  };

  const handleAgregarLineasDetectadas = async () => {
    const seleccionadas = lineasDetectadas.filter(l => l.codigo_id);
    if (seleccionadas.length === 0) {
      toast.error(isEn ? 'Assign a fabric code to at least one line' : 'Asigna un código de tela a al menos una línea');
      return;
    }
    let agregadas = 0;
    for (const l of seleccionadas) {
      try {
        await axios.post(`${API_URL}/api/telas/facturas/${facturaAbierta.id}/recepciones`, {
          codigo_id: l.codigo_id,
          rollos: l.rollos,
          yardas: l.yardas_total
        }, authHeaders());
        agregadas++;
      } catch (e) {
        toast.error(`${l.estilo} ${l.color}: ${e.response?.data?.error || (isEn ? 'error' : 'error')}`);
      }
    }
    if (agregadas > 0) {
      toast.success(isEn ? `${agregadas} line(s) added` : `${agregadas} línea(s) agregada(s)`);
      setLineasDetectadas(prev => prev.filter(l => !l.codigo_id));
      abrirFactura(facturaAbierta.id);
      fetchCodigos();
    }
  };

  const metrosPreview = recNueva.yardas ? Math.floor(parseFloat(recNueva.yardas) * 0.9144) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="glass-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: mostrarForm ? '1rem' : 0 }}>
          <h2 style={{ fontSize: '1.3rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileText color="#3b82f6" /> {isEn ? 'Invoices' : 'Facturas'}
          </h2>
          <button className="btn btn-primary" onClick={() => setMostrarForm(v => !v)}>
            <Plus size={16} style={{ marginRight: '4px' }} /> {isEn ? 'New Invoice' : 'Nueva Factura'}
          </button>
        </div>

        {mostrarForm && (
          <form onSubmit={handleCrearFactura} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
            <div className="form-group">
              <label className="form-label">{isEn ? 'Invoice Number' : 'Número de Factura'}</label>
              <input className="form-input" value={nueva.numero_factura} onChange={e => setNueva({ ...nueva, numero_factura: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">{isEn ? 'Supplier' : 'Proveedor'}</label>
              <select className="form-input" value={nueva.proveedor_id} onChange={e => setNueva({ ...nueva, proveedor_id: e.target.value })} required>
                <option value="">{isEn ? 'Select...' : 'Seleccionar...'}</option>
                {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">{isEn ? 'Date' : 'Fecha'}</label>
              <input type="date" className="form-input" value={nueva.fecha} onChange={e => setNueva({ ...nueva, fecha: e.target.value })} required />
            </div>
            <div className="form-group">
              <label className="form-label">{isEn ? 'Exchange Rate' : 'Tipo de Cambio'}</label>
              <input type="number" step="0.0001" className="form-input" value={nueva.tipo_cambio} onChange={e => setNueva({ ...nueva, tipo_cambio: e.target.value })} />
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">{isEn ? 'Notes' : 'Notas'}</label>
              <input className="form-input" value={nueva.notas} onChange={e => setNueva({ ...nueva, notas: e.target.value })} />
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">{isEn ? 'Attachment (invoice / packing list)' : 'Adjunto (factura / packing list)'}</label>
              <input type="file" accept="image/*,application/pdf" onChange={e => setArchivo(e.target.files[0])} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <button type="submit" className="btn btn-primary" disabled={guardando}>
                {guardando ? (isEn ? 'Saving...' : 'Guardando...') : (isEn ? 'Save Invoice' : 'Guardar Factura')}
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="glass-card">
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>{isEn ? 'Invoice' : 'Factura'}</th>
                <th>{isEn ? 'Supplier' : 'Proveedor'}</th>
                <th>{isEn ? 'Date' : 'Fecha'}</th>
                <th style={{ textAlign: 'center' }}>{isEn ? 'Lines' : 'Líneas'}</th>
                <th>{isEn ? 'Review' : 'Revisión'}</th>
                <th style={{ textAlign: 'right' }}>{isEn ? 'Action' : 'Acción'}</th>
              </tr>
            </thead>
            <tbody>
              {facturas.length === 0 ? (
                <tr><td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '1.5rem' }}>
                  {isEn ? 'No invoices registered yet.' : 'No hay facturas registradas todavía.'}
                </td></tr>
              ) : (
                facturas.map(f => (
                  <tr key={f.id}>
                    <td>{f.numero_factura || `#${f.id}`} {f.archivo && <Paperclip size={12} style={{ marginLeft: '4px', verticalAlign: 'middle' }} />}</td>
                    <td>{f.proveedor_nombre}</td>
                    <td>{new Date(f.fecha).toLocaleDateString('es-MX')}</td>
                    <td style={{ textAlign: 'center' }}>{f.total_recepciones}</td>
                    <td>
                      <span className={`badge ${f.estado_revision === 'revisado_total' ? 'badge-success' : f.estado_revision === 'revisado_parcial' ? 'badge-warning' : 'badge-info'}`}>
                        {f.estado_revision === 'revisado_total' ? (isEn ? 'Fully reviewed' : 'Revisado total') : f.estado_revision === 'revisado_parcial' ? (isEn ? 'Partially reviewed' : 'Revisado parcial') : (isEn ? 'Not reviewed' : 'Sin revisar')}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '0.8rem' }} onClick={() => abrirFactura(f.id)}>
                        {isEn ? 'Open' : 'Abrir'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {facturaAbierta && (
        <div
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(8px)' }}
          onClick={() => setFacturaAbierta(null)}
        >
          <div className="glass-card" style={{ width: '95%', maxWidth: '1100px', maxHeight: '85vh', overflowY: 'auto', padding: '1.4rem 1.8rem' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.4rem' }}>{facturaAbierta.numero_factura || `#${facturaAbierta.id}`}</h2>
                <p style={{ margin: '0.2rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  {facturaAbierta.proveedor_nombre} · {new Date(facturaAbierta.fecha).toLocaleDateString('es-MX')} · TC {facturaAbierta.tipo_cambio}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {facturaAbierta.archivo && (
                  <button className="btn btn-secondary" onClick={handleLeerConIA} disabled={leyendoIA} title={isEn ? 'Read attachment with AI' : 'Leer adjunto con IA'}>
                    <Sparkles size={16} style={{ marginRight: '4px' }} />
                    {leyendoIA ? (isEn ? 'Reading...' : 'Leyendo...') : (isEn ? 'Read with AI' : 'Leer con IA')}
                  </button>
                )}
                <a className="btn btn-secondary" href={`${API_URL}/api/telas/facturas/${facturaAbierta.id}/tarjetas.pdf?token=${token()}`} target="_blank" rel="noreferrer" title={isEn ? 'Print cards' : 'Imprimir tarjetas'}>
                  <Printer size={16} />
                </a>
                <a className="btn btn-secondary" href={`${API_URL}/api/telas/facturas/${facturaAbierta.id}/remision.pdf?token=${token()}`} target="_blank" rel="noreferrer" title={isEn ? 'Delivery note' : 'Nota de remisión'}>
                  <Receipt size={16} />
                </a>
                <button className="btn-icon" style={{ background: 'rgba(255,255,255,0.05)', border: 'none', padding: '8px', borderRadius: '50%', cursor: 'pointer' }} onClick={() => setFacturaAbierta(null)}>
                  <X size={20} />
                </button>
              </div>
            </div>

            {lineasDetectadas && (
              <div style={{ marginBottom: '1.2rem', padding: '1rem', background: 'rgba(124, 58, 237, 0.06)', border: '1px solid rgba(124, 58, 237, 0.2)', borderRadius: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                  <strong style={{ fontSize: '0.95rem' }}>
                    {isEn ? 'Lines detected by AI — review before adding' : 'Líneas detectadas por IA — revisa antes de agregar'}
                  </strong>
                  <button className="btn" style={{ padding: '2px 8px' }} onClick={() => setLineasDetectadas(null)}><X size={14} /></button>
                </div>
                {lineasDetectadas.length === 0 ? (
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{isEn ? 'Nothing detected.' : 'No se detectó nada.'}</p>
                ) : (
                  <>
                    <div className="table-wrapper">
                      <table className="data-table" style={{ fontSize: '0.82rem' }}>
                        <thead>
                          <tr>
                            <th>{isEn ? 'Style' : 'Estilo'}</th>
                            <th>{isEn ? 'Color' : 'Color'}</th>
                            <th>REF#</th>
                            <th>LOT#</th>
                            <th style={{ textAlign: 'right' }}>{isEn ? 'Rolls' : 'Rollos'}</th>
                            <th style={{ textAlign: 'right' }}>{isEn ? 'Yards' : 'Yardas'}</th>
                            <th>{isEn ? 'Fabric Code' : 'Código de Tela'}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {lineasDetectadas.map((l, idx) => (
                            <tr key={idx}>
                              <td>{l.estilo}</td>
                              <td>{l.color}</td>
                              <td>{l.referencia || '—'}</td>
                              <td>{l.lote || '—'}</td>
                              <td style={{ textAlign: 'right' }}>
                                <input type="number" className="form-input" style={{ width: '70px', padding: '4px' }} value={l.rollos} onChange={e => actualizarLineaDetectada(idx, 'rollos', e.target.value)} />
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                <input type="number" step="0.01" className="form-input" style={{ width: '90px', padding: '4px' }} value={l.yardas_total} onChange={e => actualizarLineaDetectada(idx, 'yardas_total', e.target.value)} />
                              </td>
                              <td>
                                <select className="form-input" style={{ padding: '4px' }} value={l.codigo_id} onChange={e => actualizarLineaDetectada(idx, 'codigo_id', e.target.value)}>
                                  <option value="">{isEn ? 'Not matched' : 'Sin cruzar'}</option>
                                  {codigos.map(c => <option key={c.id} value={c.id}>{c.codigo}</option>)}
                                </select>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <button className="btn btn-primary" style={{ marginTop: '0.8rem' }} onClick={handleAgregarLineasDetectadas}>
                      {isEn ? 'Add selected lines' : 'Agregar líneas seleccionadas'}
                    </button>
                  </>
                )}
              </div>
            )}

            <form onSubmit={handleAgregarRecepcion} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.8rem', marginBottom: '1.2rem', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '10px' }}>
              <div className="form-group">
                <label className="form-label">{isEn ? 'Fabric Code' : 'Código'}</label>
                <SearchableSelect
                  options={codigos}
                  value={recNueva.codigo_id}
                  onChange={val => setRecNueva({ ...recNueva, codigo_id: val })}
                  labelKey="codigo"
                  valueKey="id"
                  placeholder={isEn ? 'Select...' : 'Seleccionar...'}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">{isEn ? 'Rolls' : 'Rollos'}</label>
                <input type="number" className="form-input" value={recNueva.rollos} onChange={e => setRecNueva({ ...recNueva, rollos: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">{isEn ? 'Yards' : 'Yardas'}</label>
                <input type="number" step="0.01" className="form-input" value={recNueva.yardas} onChange={e => setRecNueva({ ...recNueva, yardas: e.target.value })} required />
                {metrosPreview !== null && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>≈ {metrosPreview.toFixed(2)} m</span>
                )}
              </div>
              <div className="form-group">
                <label className="form-label">{isEn ? 'Observations (defects, etc.)' : 'Observaciones (fallas, etc.)'}</label>
                <input className="form-input" value={recNueva.observaciones} onChange={e => setRecNueva({ ...recNueva, observaciones: e.target.value })} placeholder={isEn ? 'Optional' : 'Opcional'} />
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                  <Plus size={16} style={{ marginRight: '4px' }} /> {isEn ? 'Add' : 'Agregar'}
                </button>
              </div>
            </form>

            <div className="table-wrapper">
              <table className="data-table" style={{ fontSize: '0.88rem' }}>
                <thead>
                  <tr>
                    <th>{isEn ? 'Code' : 'Código'}</th>
                    <th style={{ textAlign: 'right' }}>{isEn ? 'Rolls' : 'Rollos'}</th>
                    <th style={{ textAlign: 'right' }}>{isEn ? 'Yards' : 'Yardas'}</th>
                    <th style={{ textAlign: 'right' }}>{isEn ? 'Meters' : 'Metros'}</th>
                    <th>{isEn ? 'Review status' : 'Estado de revisión'}</th>
                    <th style={{ textAlign: 'right' }}>{isEn ? 'Action' : 'Acción'}</th>
                  </tr>
                </thead>
                <tbody>
                  {(facturaAbierta.recepciones || []).length === 0 ? (
                    <tr><td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '1.2rem' }}>
                      {isEn ? 'No receipt lines yet.' : 'Sin líneas de recepción todavía.'}
                    </td></tr>
                  ) : (
                    facturaAbierta.recepciones.map(r => (
                      <tr key={r.id}>
                        <td style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>
                          {r.codigo}
                          {r.observaciones && <div style={{ fontWeight: 'normal', fontSize: '0.72rem', color: '#f59e0b' }} title={r.observaciones}>{r.observaciones}</div>}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          {r.rollos}
                          {r.folios && <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{isEn ? 'Folios' : 'Folios'}: {r.folios}</div>}
                        </td>
                        <td style={{ textAlign: 'right' }}>{r.yardas}</td>
                        <td style={{ textAlign: 'right' }}>{r.metros}</td>
                        <td>
                          <span className={`badge ${r.estado === 'aprobado' ? 'badge-success' : r.estado === 'devuelto' ? 'badge-danger' : 'badge-info'}`}>
                            {r.estado}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right', display: 'flex', gap: '0.3rem', justifyContent: 'flex-end' }}>
                          {r.estado !== 'aprobado' && (
                            <button className="btn btn-secondary" style={{ padding: '3px 8px', fontSize: '0.75rem' }} onClick={() => abrirAprobar(r)}>
                              {isEn ? 'Approve' : 'Aprobar'}
                            </button>
                          )}
                          {r.estado !== 'devuelto' && (
                            <button className="btn" style={{ padding: '3px 8px', fontSize: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none' }} onClick={() => actualizarRevision(r.id, 'devuelto')}>
                              {isEn ? 'Return' : 'Devolver'}
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
        </div>
      )}

      {aprobando && (
        <div
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, backdropFilter: 'blur(8px)' }}
          onClick={() => setAprobando(null)}
        >
          <div className="glass-card" style={{ width: '95%', maxWidth: '380px', padding: '1.4rem 1.6rem' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 0.6rem 0', fontSize: '1.1rem' }}>{isEn ? 'Confirm actual quantity received' : 'Confirmar cantidad que realmente llegó'}</h3>
            <p style={{ margin: '0 0 1rem 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              {isEn ? 'Correct these if what physically arrived is different from what was originally captured.' : 'Corrige estos valores si lo que llegó físicamente es distinto de lo que se capturó al dar de entrada.'}
            </p>
            <div className="form-group">
              <label className="form-label">{isEn ? 'Rolls' : 'Rollos'}</label>
              <input type="number" className="form-input" value={aprobando.rollos} onChange={e => setAprobando({ ...aprobando, rollos: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">{isEn ? 'Meters' : 'Metros'}</label>
              <input type="number" step="0.01" className="form-input" value={aprobando.metros} onChange={e => setAprobando({ ...aprobando, metros: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">{isEn ? 'Width' : 'Ancho'}</label>
              <input type="number" step="0.001" className="form-input" value={aprobando.ancho} onChange={e => setAprobando({ ...aprobando, ancho: e.target.value })} placeholder={isEn ? 'Optional' : 'Opcional'} />
            </div>
            {parseInt(aprobando.rollos) > 0 && (
              <div className="form-group">
                <label className="form-label">{isEn ? 'Roll folios (of the 50 physical tags)' : 'Folios de rollo (de las 50 etiquetas físicas)'}</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(70px, 1fr))', gap: '0.4rem' }}>
                  {Array.from({ length: parseInt(aprobando.rollos) }).map((_, idx) => {
                    const elegidoAqui = aprobando.folios?.[idx];
                    const elegidosOtros = (aprobando.folios || []).filter((f, i) => i !== idx && f != null);
                    const opciones = foliosDisponibles.filter(f => !elegidosOtros.includes(f));
                    return (
                      <select
                        key={idx}
                        className="form-input"
                        style={{ padding: '4px 6px', fontSize: '0.8rem' }}
                        value={elegidoAqui || ''}
                        onChange={e => setFolioEnSlot(idx, e.target.value)}
                      >
                        <option value="">{isEn ? `Roll ${idx + 1}` : `Rollo ${idx + 1}`}</option>
                        {(elegidoAqui && !opciones.includes(elegidoAqui)) && <option value={elegidoAqui}>{elegidoAqui}</option>}
                        {opciones.map(f => <option key={f} value={f}>{f}</option>)}
                      </select>
                    );
                  })}
                </div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                  {isEn ? 'Optional — leave blank if you are not tagging individual rolls' : 'Opcional — déjalo en blanco si no vas a etiquetar los rollos por separado'}
                </span>
              </div>
            )}
            <div className="form-group">
              <label className="form-label">{isEn ? 'Observations (defects, etc.)' : 'Observaciones (fallas, etc.)'}</label>
              <input className="form-input" value={aprobando.observaciones} onChange={e => setAprobando({ ...aprobando, observaciones: e.target.value })} placeholder={isEn ? 'Optional' : 'Opcional'} />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.8rem' }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setAprobando(null)}>{isEn ? 'Cancel' : 'Cancelar'}</button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={confirmarAprobar}>{isEn ? 'Approve' : 'Aprobar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
