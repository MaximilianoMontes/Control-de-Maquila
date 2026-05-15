import { useState, useEffect } from 'react';
import { 
  Plus, Search, Pencil, Trash2, CheckCircle, XCircle, DollarSign, 
  Archive, ArchiveRestore, Image as ImageIcon, AlertTriangle, AlertCircle, Calendar, X 
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import API_URL from '../config';

const API = API_URL;

const getImgSrc = (img) => img ? (img.startsWith('http') ? img : `${API}${img}`) : null;
const formatDate = (date) => {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
const displayDate = (date) => {
  if (!date) return 'N/A';
  const d = new Date(date);
  if (isNaN(d.getTime())) return 'N/A';
  return `${d.getUTCDate()}/${d.getUTCMonth() + 1}/${d.getUTCFullYear()}`;
};

export default function Produccion() {
  const { user } = useAuth();
  const location = useLocation();
  const userRole = (user?.role || user?.rol || '').toString().toLowerCase().trim();
  const canEdit = userRole === 'admin' || userRole === 'produccion1' || userRole === 'produccion2';
  const [orders, setOrders] = useState([]);
  const [maquileros, setMaquileros] = useState([]);
  const [inventario, setInventario] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [verArchivados, setVerArchivados] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  
  const [formData, setFormData] = useState({ maquilero_id: '', inventario_id: '', fecha_inicio: '', fecha_fin: '' });
  const [editingOrder, setEditingOrder] = useState(null);

  useEffect(() => {
    fetchOrders();
    fetchMaquileros();
    fetchInventario();

    // Lógica para el atajo desde Inventario
    const queryParams = new URLSearchParams(location.search);
    const productId = queryParams.get('productId');
    if (productId && canEdit) {
      setFormData(prev => ({ ...prev, inventario_id: productId, fecha_inicio: new Date().toISOString().split('T')[0] }));
      setIsModalOpen(true);
      // Limpiar la URL para evitar que se abra de nuevo al recargar
      window.history.replaceState({}, document.title, "/produccion");
    }
  }, [verArchivados, location]);

  const fetchOrders = async () => {
    try {
      const res = await axios.get(`${API}/api/produccion?verArchivados=${verArchivados}`);
      setOrders(res.data);
    } catch (e) { console.error(e); }
  };

  const fetchMaquileros = async () => {
    const res = await axios.get(`${API}/api/maquileros`);
    setMaquileros(res.data);
  };

  const fetchInventario = async () => {
    const res = await axios.get(`${API}/api/inventario`);
    setInventario(res.data);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const item = inventario.find(i => i.id === parseInt(formData.inventario_id));
    const cantidadFinal = item?.piezas_en_proceso || 0;
    const total = (item?.precio || 0) * cantidadFinal;
    
    try {
      await axios.post(`${API}/api/produccion`, { ...formData, cantidad: cantidadFinal, precio_total: total });
      setIsModalOpen(false);
      setFormData({ maquilero_id: '', inventario_id: '', fecha_inicio: '', fecha_fin: '' });
      fetchOrders();
    } catch (e) { 
      alert('Error al crear orden: ' + (e.response?.data?.error || e.message)); 
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      // Al editar, NO recalculamos cantidad ni precio desde el inventario, 
      // ya que esos datos son para órdenes NUEVAS.
      // Solo enviamos lo que está en el formulario (maquilero, fechas, etc)
      await axios.put(`${API}/api/produccion/${editingOrder.id}`, formData);
      alert('Orden actualizada con éxito');
      setIsEditModalOpen(false);
      setEditingOrder(null);
      fetchOrders();
    } catch (e) { 
      alert('Error al actualizar orden: ' + (e.response?.data?.error || e.message)); 
    }
  };

  const handleTerminar = async (id) => {
    if (!confirm('¿Marcar esta orden como terminada?')) return;
    try {
      await axios.put(`${API}/api/produccion/${id}`, { estado: 'Terminado', fecha_fin: new Date().toISOString().split('T')[0] });
      fetchOrders();
    } catch (e) { alert('Error'); }
  };

  const handleCancelar = async (id) => {
    if (!confirm('¿Cancelar este proceso de producción?')) return;
    try {
      await axios.put(`${API}/api/produccion/${id}`, { estado: 'Cancelado', fecha_fin: new Date().toISOString().split('T')[0] });
      fetchOrders();
    } catch (e) { alert('Error'); }
  };

  const handleArchivar = async (id, currentStatus) => {
    try {
      await axios.put(`${API}/api/produccion/${id}/archivo`, { archivado: !currentStatus });
      fetchOrders();
    } catch (e) { alert('Error al archivar'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta orden permanentemente? Esto también borrará todos los pagos asociados.')) return;
    try {
      await axios.delete(`${API}/api/produccion/${id}`);
      fetchOrders();
    } catch (e) { 
      alert(e.response?.data?.error || 'Error al eliminar'); 
    }
  };

  const handleRecibidasBlur = async (id, val) => {
    if (val === '') return;
    try {
      await axios.put(`${API}/api/produccion/${id}`, { cantidad_recibida: parseInt(val) });
      fetchOrders();
    } catch (e) { console.error(e); }
  };

  const handleApplyAdjustment = async (id, value) => {
    if (!value) return;
    const [tipo, porcentaje] = value.split('-');
    try {
      await axios.put(`${API}/api/produccion/${id}/ajuste`, { tipo, porcentaje: parseInt(porcentaje) });
      fetchOrders();
    } catch (e) { alert('Error al aplicar ajuste'); }
  };

  const handleAddDay = async (id) => {
    const dias = prompt("¿Cuántos días de prórroga deseas agregar?", "1");
    if (!dias || isNaN(dias)) return;
    try {
      await axios.put(`${API}/api/produccion/${id}/agregar-dia`, { dias: parseInt(dias) });
      fetchOrders();
    } catch (e) { alert('Error al agregar día'); }
  };

  const filteredOrders = orders.filter(o => 
    (o.maquilero_nombre || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (o.producto_modelo || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <h1 className="gradient-text" style={{ fontSize: '2.5rem', margin: 0 }}>Gestión de Producción</h1>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn btn-secondary" onClick={() => setVerArchivados(!verArchivados)}>
            {verArchivados ? 'Ver Activos' : 'Ver Archivados'}
          </button>
          {canEdit && (
            <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
              <Plus size={20} /> Nueva Orden
            </button>
          )}
        </div>
      </div>

      <div className="glass-card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <Search size={20} color="#94a3b8" />
        <input type="text" className="form-input" style={{ border: 'none', background: 'transparent', padding: '0.5rem' }} placeholder="Buscar por maquilero o modelo..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
      </div>

      <div className="glass-card">
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Folio</th>
                <th>Maquilero</th>
                <th>Producto / Modelo</th>
                <th>Pzas. Enviadas</th>
                <th>Pzas. Recibidas</th>
                <th>Inicio / Entrega</th>
                <th>Costo Est.</th>
                <th>Pagado</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 ? (
                <tr><td colSpan="10" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No hay órdenes en esta vista</td></tr>
              ) : (
                filteredOrders.map((o, index) => {
                  const pagado = o.pagado || 0;
                  const prodImg = getImgSrc(o.producto_imagen);
                  const isCancelado = o.estado === 'Cancelado';
                  const isTerminado = o.estado === 'Terminado';
                  
                  let rowBg = '#f0fdf4'; 
                  let delayIcon = null;
                  
                  if (isCancelado) {
                    rowBg = 'transparent';
                  } else if (!isTerminado && o.fecha_fin) {
                    // Normalizar fechas a medianoche UTC para cálculo exacto de días de diferencia
                    const now = new Date();
                    const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
                    
                    const dDate = new Date(o.fecha_fin);
                    const deliveryDate = Date.UTC(dDate.getUTCFullYear(), dDate.getUTCMonth(), dDate.getUTCDate());
                    
                    const diffMs = today - deliveryDate;
                    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                    
                    if (diffDays >= 1 && diffDays <= 3) {
                      rowBg = '#fef9c3'; // Amarillo (retraso 1-3 días)
                      delayIcon = <AlertTriangle size={16} color="#ca8a04" title={`Retraso: ${diffDays} día(s)`} />;
                    } else if (diffDays >= 4) {
                      rowBg = '#fee2e2'; // Rojo (retraso 4+ días)
                      delayIcon = <AlertCircle size={16} color="#dc2626" title={`Retraso: ${diffDays} día(s)`} />;
                    }
                  }
                  
                  return (
                    <tr key={o.id} style={{ opacity: isCancelado ? 0.6 : 1, backgroundColor: rowBg }}>
                      <td>#{orders.length - index}</td>
                      <td style={{ fontWeight: 600 }}>{o.maquilero_nombre}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          {prodImg ? (
                            <img 
                              src={prodImg} 
                              alt="" 
                              style={{ width: 32, height: 32, borderRadius: 4, objectFit: 'cover', cursor: 'zoom-in' }} 
                              onClick={() => setSelectedImage(prodImg)}
                            />
                          ) : (
                            <div style={{ width: 32, height: 32, background: '#f1f5f9', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <ImageIcon size={16} />
                            </div>
                          )}
                          <span>{o.producto_modelo || 'N/A'}</span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>{o.cantidad}</td>
                      <td>
                        <input 
                          type="number" 
                          className="form-input" 
                          style={{ width: '80px', padding: '0.25rem 0.5rem', textAlign: 'center' }}
                          defaultValue={o.cantidad_recibida ?? ''}
                          onBlur={(e) => handleRecibidasBlur(o.id, e.target.value)}
                          disabled={!canEdit}
                        />
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', fontSize: '0.75rem', gap: '2px' }}>
                          <span>Inicio: {displayDate(o.fecha_inicio)}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <span style={{ fontWeight: 700 }}>Entrega: {displayDate(o.fecha_fin)}</span>
                            {delayIcon}
                          </div>
                        </div>
                      </td>
                      <td style={{ minWidth: '130px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span style={{ fontWeight: 700, fontSize: '1rem' }}>${Number(o.precio_total).toFixed(2)}</span>
                          {o.ajuste_tipo && o.ajuste_tipo !== 'ninguno' && (
                            <span style={{ fontSize: '10px', padding: '2px 4px', borderRadius: '4px', width: 'fit-content', background: o.ajuste_tipo === 'bono' ? '#dcfce7' : '#fee2e2', color: o.ajuste_tipo === 'bono' ? '#166534' : '#991b1b', fontWeight: 600 }}>
                              {o.ajuste_tipo === 'bono' ? 'BONO' : 'DESC'} {o.ajuste_porcentaje}%
                            </span>
                          )}
                          {canEdit && o.estado === 'En proceso' && (
                            <select className="form-input" style={{ width: '100%', padding: '2px', fontSize: '10px', height: '24px' }} value={o.ajuste_tipo === 'ninguno' ? '' : `${o.ajuste_tipo}-${o.ajuste_porcentaje}`} onChange={(e) => handleApplyAdjustment(o.id, e.target.value)}>
                              <option value="">Ajustar...</option>
                              <option value="ninguno-0">❌ Sin Ajuste</option>
                              <optgroup label="Bonos">
                                <option value="bono-5">Bono +5%</option>
                                <option value="bono-10">Bono +10%</option>
                                <option value="bono-15">Bono +15%</option>
                                <option value="bono-20">Bono +20%</option>
                              </optgroup>
                              <optgroup label="Descuentos">
                                <option value="descuento-5">Desc -5%</option>
                                <option value="descuento-10">Desc -10%</option>
                                <option value="descuento-15">Desc -15%</option>
                                <option value="descuento-20">Desc -20%</option>
                              </optgroup>
                            </select>
                          )}
                        </div>
                      </td>
                      <td style={{ color: '#10b981', fontWeight: 600 }}>${pagado}</td>
                      <td>
                        <span className={`badge ${o.estado === 'Terminado' ? 'badge-success' : o.estado === 'Cancelado' ? 'badge-danger' : 'badge-warning'}`}>
                          {o.estado}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center' }}>
                          {canEdit && o.estado === 'En proceso' && (
                            <>
                              <button className="btn btn-success" style={{ padding: '0.4rem' }} onClick={() => handleTerminar(o.id)} title="Terminar Orden"><CheckCircle size={16} /></button>
                              <button className="btn" style={{ padding: '0.4rem', background: '#8b5cf6', color: 'white' }} onClick={() => handleAddDay(o.id)} title="Agregar Prórroga (Días)"><Calendar size={16} /></button>
                              <button className="btn btn-danger" style={{ padding: '0.4rem' }} onClick={() => handleCancelar(o.id)} title="Cancelar Orden"><XCircle size={16} /></button>
                              <Link to={`/pagos?orden=${o.id}`} className="btn btn-primary" style={{ padding: '0.4rem', display: 'flex', alignItems: 'center' }} title="Registrar Pago"><DollarSign size={16} /></Link>
                            </>
                          )}
                          {canEdit ? (
                            <>
                              <button className="btn btn-secondary" style={{ padding: '0.4rem' }} onClick={() => { 
                                setEditingOrder(o); 
                                setFormData({ 
                                  maquilero_id: o.maquilero_id, 
                                  inventario_id: o.inventario_id, 
                                  fecha_inicio: formatDate(o.fecha_inicio), 
                                  fecha_fin: formatDate(o.fecha_fin) 
                                }); 
                                setIsEditModalOpen(true); 
                              }} title="Editar"><Pencil size={16} /></button>
                              <button className="btn btn-secondary" style={{ padding: '0.4rem' }} onClick={() => handleArchivar(o.id, o.archivado)} title={o.archivado ? "Restaurar" : "Archivar"}>
                                {o.archivado ? <ArchiveRestore size={16} /> : <Archive size={16} />}
                              </button>
                              <button className="btn btn-danger" style={{ padding: '0.4rem' }} onClick={() => handleDelete(o.id)} title="Eliminar"><Trash2 size={16} /></button>
                            </>
                          ) : (
                            <button className="btn btn-secondary" style={{ padding: '0.4rem' }} onClick={() => { setEditingOrder(o); setIsEditModalOpen(true); }} title="Ver Detalle"><Search size={16} /></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Nueva / Editar Orden */}
      {(isModalOpen || isEditModalOpen) && (
        <div className="modal-overlay" onClick={() => { setIsModalOpen(false); setIsEditModalOpen(false); }}>
          <div className="modal-content glass-card" style={{ maxWidth: '640px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{isEditModalOpen ? (canEdit ? 'Editar Orden' : 'Detalles de la Orden') : 'Nueva Orden de Producción'}</h2>
              <button className="btn-icon" onClick={() => { setIsModalOpen(false); setIsEditModalOpen(false); }}><X size={24} /></button>
            </div>
            <form onSubmit={isEditModalOpen ? handleEditSubmit : handleSubmit}>
              <div className="form-group">
                <label className="form-label">Maquilero *</label>
                <select 
                  required 
                  className="form-input" 
                  value={formData.maquilero_id} 
                  onChange={e => setFormData({...formData, maquilero_id: e.target.value})}
                  disabled={!canEdit && isEditModalOpen}
                >
                  <option value="">-- Seleccionar --</option>
                  {[...maquileros].sort((a,b) => a.nombre.localeCompare(b.nombre)).map(m => (
                    <option key={m.id} value={m.id}>{m.nombre}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Producto del Inventario *</label>
                <select 
                  required 
                  className="form-input" 
                  value={formData.inventario_id} 
                  onChange={e => setFormData({...formData, inventario_id: e.target.value})}
                  disabled={!canEdit && isEditModalOpen}
                >
                  <option value="">-- Seleccionar --</option>
                  {[...inventario].sort((a,b) => (a.modelo || '').localeCompare(b.modelo || '', undefined, {numeric: true})).map(i => (
                    <option key={i.id} value={i.id}>
                      {i.modelo} - {i.numero} {i.es_reprogramacion === 1 ? ' (REPROGRAMADO)' : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Fecha Inicio *</label>
                  <input 
                    type="date" 
                    required 
                    className="form-input" 
                    value={formData.fecha_inicio} 
                    onChange={e => setFormData({...formData, fecha_inicio: e.target.value})}
                    disabled={!canEdit && isEditModalOpen}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Fecha Entrega Est. *</label>
                  <input 
                    type="date" 
                    required 
                    className="form-input" 
                    value={formData.fecha_fin} 
                    onChange={e => setFormData({...formData, fecha_fin: e.target.value})}
                    disabled={!canEdit && isEditModalOpen}
                  />
                </div>
              </div>

              {canEdit && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => { setIsModalOpen(false); setIsEditModalOpen(false); }}>Cancelar</button>
                  <button type="submit" className="btn btn-primary">{isEditModalOpen ? 'Actualizar Orden' : 'Crear Orden'}</button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Modal Zoom de Imagen */}
      {selectedImage && (
        <div className="modal-overlay" style={{ zIndex: 2000 }} onClick={() => setSelectedImage(null)}>
          <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }} onClick={e => e.stopPropagation()}>
            <button 
              onClick={() => setSelectedImage(null)}
              style={{ position: 'absolute', top: '-40px', right: '-40px', background: 'white', border: 'none', borderRadius: '50%', padding: '8px', cursor: 'pointer', display: 'flex' }}
            >
              <X size={24} />
            </button>
            <img 
              src={selectedImage} 
              alt="Zoom" 
              style={{ width: '100%', height: '100%', borderRadius: '12px', objectFit: 'contain', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }} 
            />
          </div>
        </div>
      )}
    </div>
  );
}
