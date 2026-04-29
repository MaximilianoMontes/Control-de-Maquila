import { useState, useEffect } from 'react';
import { Plus, X, DollarSign, CheckCircle, Package, Search, Image as ImageIcon, Archive, Trash2, XCircle, Pencil, ArchiveRestore, Calendar, AlertTriangle, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import API_URL from '../config';

const API = API_URL;

const getImgSrc = (img) => img ? (img.startsWith('http') ? img : `${API}${img}`) : null;

export default function Produccion() {
  const [orders, setOrders] = useState([]);
  const [maquileros, setMaquileros] = useState([]);
  const [inventario, setInventario] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [verArchivados, setVerArchivados] = useState(false);
  
  const [formData, setFormData] = useState({ maquilero_id: '', inventario_id: '', fecha_inicio: '', fecha_fin: '' });
  const [editingOrder, setEditingOrder] = useState(null);

  useEffect(() => {
    fetchOrders();
    fetchMaquileros();
    fetchInventario();
  }, [verArchivados]);

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
    } catch (e) { alert('Error al crear orden'); }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    const item = inventario.find(i => i.id === parseInt(formData.inventario_id));
    const cantidadFinal = item?.piezas_en_proceso || 0;
    const total = (item?.precio || 0) * cantidadFinal;

    try {
      await axios.put(`${API}/api/produccion/${editingOrder.id}`, { ...formData, cantidad: cantidadFinal, precio_total: total });
      setIsEditModalOpen(false);
      setEditingOrder(null);
      fetchOrders();
    } catch (e) { alert('Error al actualizar orden'); }
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
    } catch (e) { alert('Error al eliminar'); }
  };

  const openEdit = (order) => {
    setEditingOrder(order);
    setFormData({
      maquilero_id: order.maquilero_id,
      inventario_id: order.inventario_id,
      fecha_inicio: order.fecha_inicio || '',
      fecha_fin: order.fecha_fin || ''
    });
    setIsEditModalOpen(true);
  };

  const handleAddDays = async (order) => {
    const daysStr = prompt("¿Cuántos días desea agregar a la fecha de entrega?", "2");
    if (daysStr === null) return;
    const days = parseInt(daysStr);
    if (isNaN(days)) {
      alert("Por favor ingrese un número válido de días.");
      return;
    }

    try {
      const currentFechaFin = order.fecha_fin || new Date().toISOString().split('T')[0];
      const date = new Date(currentFechaFin);
      date.setDate(date.getDate() + days);
      const newFechaFin = date.toISOString().split('T')[0];
      const newRetrasos = (order.retrasos || 0) + 1;
      
      await axios.put(`${API}/api/produccion/${order.id}`, { 
        fecha_fin: newFechaFin,
        retrasos: newRetrasos 
      });
      fetchOrders();
    } catch (e) { console.error('Error al posponer entrega', e); }
  };

  const handleRecibidasBlur = async (id, val) => {
    const newVal = val === '' ? null : parseInt(val);
    try {
      await axios.put(`${API}/api/produccion/${id}`, { cantidad_recibida: newVal });
      fetchOrders();
    } catch (e) { console.error('Error al actualizar piezas recibidas', e); }
  };

  const handleApplyAdjustment = async (id, val) => {
    if (!val) {
      await axios.put(`${API}/api/produccion/${id}`, { ajuste_tipo: 'ninguno', ajuste_porcentaje: 0 });
      fetchOrders();
      return;
    }
    const [tipo, porc] = val.split('-');
    try {
      await axios.put(`${API}/api/produccion/${id}`, { 
        ajuste_tipo: tipo, 
        ajuste_porcentaje: parseInt(porc) 
      });
      fetchOrders();
    } catch (e) { console.error('Error al aplicar ajuste', e); }
  };

  const filteredOrders = orders.filter(o => 
    (o.maquilero_nombre || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (o.producto_modelo || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedItem = inventario.find(i => i.id === parseInt(formData.inventario_id));

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="gradient-text">Producción en Curso</h1>
          <p style={{ color: '#64748b' }}>Gestión de órdenes y procesos de manufactura</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button 
            className={`btn ${verArchivados ? 'btn-primary' : 'btn-secondary'}`} 
            onClick={() => setVerArchivados(!verArchivados)}
          >
            {verArchivados ? <ArchiveRestore size={20} /> : <Archive size={20} />}
            {verArchivados ? 'Ver Activos' : 'Ver Archivados'}
          </button>
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
            <Plus size={20} /> Nueva Orden
          </button>
        </div>
      </div>

      <div className="glass-card" style={{ marginBottom: '2rem', padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <Search size={20} color="#94a3b8" />
        <input 
          type="text" 
          placeholder="Buscar por maquilero o modelo..." 
          style={{ width: '100%', background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none' }}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
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
                  const useRecibidas = o.cantidad_recibida !== null && o.cantidad_recibida !== undefined;
                  
                  const prodImg = getImgSrc(o.producto_imagen);
                  const isCancelado = o.estado === 'Cancelado';
                  
                  // Lógica de colores semáforo
                  let rowBg = '#f0fdf4'; // Verde claro por defecto (alta)
                  let delayIcon = null;
                  if (o.retrasos === 1) {
                    rowBg = '#fef9c3'; // Amarillo
                    delayIcon = <AlertTriangle size={14} color="#ca8a04" title="Primer retraso" />;
                  } else if (o.retrasos >= 2) {
                    rowBg = '#fee2e2'; // Rojo claro
                    delayIcon = <AlertCircle size={14} color="#dc2626" title="Retraso crítico" />;
                  }

                  if (isCancelado) rowBg = 'transparent';
                  
                  return (
                    <tr key={o.id} style={{ opacity: isCancelado ? 0.6 : 1, backgroundColor: rowBg }}>
                      <td>#{orders.length - index}</td>
                      <td style={{ fontWeight: 600 }}>{o.maquilero_nombre}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          {prodImg ? (
                            <img src={prodImg} alt="" className="img-zoom" style={{ width: 32, height: 32, borderRadius: 4, objectFit: 'cover' }} />
                          ) : (
                            <div style={{ width: 32, height: 32, background: '#f1f5f9', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <ImageIcon size={16} color="#cbd5e1" />
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
                        />
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', fontSize: '0.85rem' }}>
                          <span>In: {o.fecha_inicio}</span>
                          <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            Fin: {o.fecha_fin || 'N/A'} {delayIcon}
                          </span>
                        </div>
                      </td>
                      <td style={{ minWidth: '130px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span style={{ fontWeight: 700, fontSize: '1rem' }}>${Number(o.precio_total).toFixed(2)}</span>
                          
                          {o.ajuste_tipo && o.ajuste_tipo !== 'ninguno' && (
                            <span style={{ 
                              fontSize: '10px', 
                              padding: '2px 4px', 
                              borderRadius: '4px',
                              width: 'fit-content',
                              background: o.ajuste_tipo === 'bono' ? '#dcfce7' : '#fee2e2',
                              color: o.ajuste_tipo === 'bono' ? '#166534' : '#991b1b',
                              fontWeight: 600
                            }}>
                              {o.ajuste_tipo === 'bono' ? 'BONO' : 'DESC'} {o.ajuste_porcentaje}%
                            </span>
                          )}

                          {o.estado === 'En proceso' && (
                            <select 
                              className="form-input" 
                              style={{ width: '100%', padding: '2px', fontSize: '10px', height: '24px' }}
                              value={o.ajuste_tipo === 'ninguno' ? '' : `${o.ajuste_tipo}-${o.ajuste_porcentaje}`}
                              onChange={(e) => handleApplyAdjustment(o.id, e.target.value)}
                            >
                              <option value="">Aplicar ajuste...</option>
                              <optgroup label="Bonos (Puntualidad)">
                                <option value="bono-5">Bono +5%</option>
                                <option value="bono-10">Bono +10%</option>
                                <option value="bono-15">Bono +15%</option>
                                <option value="bono-20">Bono +20%</option>
                              </optgroup>
                              <optgroup label="Descuentos (Demora)">
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
                        <span className={`badge ${
                          o.estado === 'Terminado' ? 'badge-success' : 
                          o.estado === 'Cancelado' ? 'badge-danger' : 
                          'badge-warning'
                        }`}>
                          {o.estado}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                          {o.estado === 'En proceso' && (
                            <>
                              <button className="btn btn-success" style={{ padding: '0.35rem' }} onClick={() => handleTerminar(o.id)} title="Terminar">
                                <CheckCircle size={16} />
                              </button>
                              <button className="btn btn-warning" style={{ padding: '0.35rem', color: '#fff' }} onClick={() => handleCancelar(o.id)} title="Cancelar Proceso">
                                <XCircle size={16} />
                              </button>
                              <button className="btn btn-secondary" style={{ padding: '0.35rem', background: '#8b5cf6', borderColor: '#8b5cf6', color: '#fff' }} onClick={() => handleAddDays(o)} title="Agregar 2 días">
                                <Calendar size={16} />
                              </button>
                            </>
                          )}
                          
                          <Link to={`/pagos?orden=${o.id}`} className="btn btn-primary" style={{ padding: '0.35rem' }} title="Pagos">
                            <DollarSign size={16} />
                          </Link>

                          <button className="btn btn-secondary" style={{ padding: '0.35rem' }} onClick={() => openEdit(o)} title="Editar">
                            <Pencil size={16} />
                          </button>

                          <button className="btn btn-secondary" style={{ padding: '0.35rem' }} onClick={() => handleArchivar(o.id, o.archivado)} title={o.archivado ? "Restaurar" : "Archivar"}>
                            {o.archivado ? <ArchiveRestore size={16} /> : <Archive size={16} />}
                          </button>

                          <button className="btn btn-danger" style={{ padding: '0.35rem' }} onClick={() => handleDelete(o.id)} title="Eliminar">
                            <Trash2 size={16} />
                          </button>
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
              <h2>{isEditModalOpen ? 'Editar Orden' : 'Nueva Orden de Producción'}</h2>
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
                >
                  <option value="">Seleccione un maquilero...</option>
                  {maquileros.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Producto del Inventario *</label>
                <select 
                  required 
                  className="form-input" 
                  value={formData.inventario_id} 
                  onChange={e => setFormData({...formData, inventario_id: e.target.value})}
                >
                  <option value="">Seleccione el producto a manufacturar...</option>
                  {inventario.map(i => {
                      let colorText = '-';
                      try {
                          const arr = JSON.parse(i.color);
                          if(Array.isArray(arr)) colorText = arr.map(c => c.color).join(', ');
                      } catch(e) { colorText = i.color || '-'; }
                      const reproTag = i.es_reprogramacion === 1 ? ' (Reprogramado)' : '';
                      return <option key={i.id} value={i.id}>{i.modelo} - {colorText} (${i.precio}/pza){reproTag}</option>;
                  })}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Fecha de Inicio *</label>
                  <input 
                    type="date" 
                    required
                    className="form-input" 
                    value={formData.fecha_inicio} 
                    onChange={e => setFormData({...formData, fecha_inicio: e.target.value})} 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Fecha de Entrega (Estimada) *</label>
                  <input 
                    type="date" 
                    required
                    className="form-input" 
                    value={formData.fecha_fin} 
                    onChange={e => setFormData({...formData, fecha_fin: e.target.value})} 
                  />
                </div>
              </div>

              {selectedItem && (
                <div style={{ background: 'rgba(59, 130, 246, 0.05)', padding: '1rem', borderRadius: 8, marginTop: '1rem', border: '1px solid rgba(59, 130, 246, 0.1)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ color: '#64748b' }}>Precio unitario:</span>
                    <span style={{ fontWeight: 600 }}>${selectedItem.precio}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ color: '#64748b' }}>Total piezas (Del Inventario):</span>
                    <span style={{ fontWeight: 600 }}>{selectedItem.piezas_en_proceso || 0}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem' }}>
                    <span style={{ fontWeight: 700 }}>Costo Total:</span>
                    <span style={{ fontWeight: 800, color: 'var(--primary)' }}>${((selectedItem.precio || 0) * (selectedItem.piezas_en_proceso || 0)).toFixed(2)}</span>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => { setIsModalOpen(false); setIsEditModalOpen(false); }}>Cancelar</button>
                <button type="submit" className="btn btn-primary">{isEditModalOpen ? 'Actualizar Orden' : 'Crear Orden'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
