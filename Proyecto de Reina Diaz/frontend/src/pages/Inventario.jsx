import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Plus, X, UploadCloud, Search, Image as ImageIcon, Pencil, Trash2, RefreshCw, MessageSquare } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import API_URL from '../config';

const API = API_URL;

const emptyForm = { numero: '', modelo: '', precio: '', cliente: '', no_orden: '', variantes: [{ color: '', cantidad: '' }], imagenUrl: '', observaciones: '' };

const getImgSrc = (img) => img ? (img.startsWith('http') ? img : `${API}${img}`) : null;

export default function Inventario() {
  const { user } = useAuth();
  const userRole = (user?.role || user?.rol || '').toString().toLowerCase().trim();
  const canEdit = userRole === 'admin' || userRole === 'inventario1';
  const [items, setItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [editImageItem, setEditImageItem] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [isReprogram, setIsReprogram] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const fileInputRef = useRef(null);
  const [formData, setFormData] = useState(emptyForm);
  const [imagenFile, setImagenFile] = useState(null);
  const [editImageFile, setEditImageFile] = useState(null);
  const [editImageUrl, setEditImageUrl] = useState('');

  useEffect(() => { fetchItems(); }, []);

  const fetchItems = async () => {
    try {
      const res = await axios.get(`${API}/api/inventario`);
      setItems(res.data);
    } catch (e) { console.error(e); }
  };

  const openNew = () => {
    setEditMode(false);
    setIsReprogram(false);
    setEditingId(null);
    setFormData(emptyForm);
    setImagenFile(null);
    setIsModalOpen(true);
  };

  const openEdit = (item, e) => {
    e.stopPropagation();
    setEditMode(true);
    setIsReprogram(false);
    setEditingId(item.id);
    prepareForm(item);
    setIsModalOpen(true);
  };

  const openReprogram = (item, e) => {
    e.stopPropagation();
    setEditMode(true);
    setIsReprogram(true);
    setEditingId(item.id);
    // Para reprogramar, mantenemos datos base pero limpiamos variantes y orden
    let parsedVariantes = [{ color: '', cantidad: '' }];
    setFormData({
      numero: item.numero || '',
      modelo: item.modelo || '',
      precio: item.precio || '',
      cliente: item.cliente || '',
      no_orden: '', // Limpiamos para nueva orden
      variantes: parsedVariantes,
      imagenUrl: '',
      observaciones: item.observaciones || '',
    });
    setImagenFile(null);
    setIsModalOpen(true);
  };

  const prepareForm = (item) => {
    let parsedVariantes = [{ color: '', cantidad: '' }];
    try {
      const prs = JSON.parse(item.color);
      if (Array.isArray(prs) && prs.length > 0) parsedVariantes = prs;
      else if (item.color) parsedVariantes = [{ color: item.color, cantidad: item.piezas_en_proceso }];
    } catch(err) {
      if (item.color) parsedVariantes = [{ color: item.color, cantidad: item.piezas_en_proceso }];
    }

    setFormData({
      numero: item.numero || '',
      modelo: item.modelo || '',
      precio: item.precio || '',
      cliente: item.cliente || '',
      no_orden: item.no_orden || '',
      variantes: parsedVariantes,
      imagenUrl: item.imagen || '',
      observaciones: item.observaciones || '',
    });
    setImagenFile(null);
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!confirm('¿Eliminar este producto del inventario?')) return;
    try {
      await axios.delete(`${API}/api/inventario/${id}`);
      fetchItems();
    } catch (e) { 
      alert(e.response?.data?.error || 'Error al eliminar'); 
    }
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = new FormData();
      Object.keys(formData).forEach(k => {
        if (k === 'variantes') {
          data.append('color', JSON.stringify(formData.variantes));
        } else {
          data.append(k, formData[k]);
        }
      });
      if (imagenFile) data.append('imagenBtn', imagenFile);

      if (isReprogram) {
        // Para reprogramar, creamos un NUEVO registro (POST)
        data.append('es_reprogramacion', true);
        const current = items.find(i => i.id === editingId);
        if (!imagenFile && !formData.imagenUrl && current?.imagen) data.append('imagenUrl', current.imagen);
        await axios.post(`${API}/api/inventario`, data, { headers: { 'Content-Type': 'multipart/form-data' } });
      } else if (editMode) {
        const current = items.find(i => i.id === editingId);
        if (!imagenFile && !formData.imagenUrl && current?.imagen) data.append('imagen_actual', current.imagen);
        await axios.put(`${API}/api/inventario/${editingId}`, data, { headers: { 'Content-Type': 'multipart/form-data' } });
      } else {
        await axios.post(`${API}/api/inventario`, data, { headers: { 'Content-Type': 'multipart/form-data' } });
      }
      setIsModalOpen(false);
      setFormData(emptyForm);
      setImagenFile(null);
      fetchItems();
    } catch (e) {
      alert(e.response?.data?.error || 'Error al guardar');
    }
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();
    const file = fileInputRef.current?.files[0];
    if (!file) return;
    const data = new FormData();
    data.append('file', file);
    try {
      await axios.post(`${API}/api/inventario/import`, data, { headers: { 'Content-Type': 'multipart/form-data' } });
      setIsUploadModalOpen(false);
      fetchItems();
      alert('Inventario importado con éxito');
    } catch (e) { alert('Error en importación'); }
  };

  const handleEditImageSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = new FormData();
      data.append('imagenUrl', editImageUrl);
      if (editImageFile) data.append('imagenBtn', editImageFile);
      await axios.put(`${API}/api/inventario/${editImageItem.id}/imagen`, data, { headers: { 'Content-Type': 'multipart/form-data' } });
      setEditImageItem(null);
      setEditImageFile(null);
      setEditImageUrl('');
      fetchItems();
    } catch (e) { alert('Error guardando imagen'); }
  };

  const filteredItems = items.filter(item =>
    (item.modelo || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.cliente || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.no_orden || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', gap: '1rem', flexWrap: 'wrap' }}>
        <h1 className="gradient-text" style={{ fontSize: '2.5rem', margin: 0 }}>Inventario en Proceso</h1>
        <div style={{ display: 'flex', gap: '1rem' }}>
          {canEdit && (
            <>
              <button className="btn btn-secondary" onClick={() => setIsUploadModalOpen(true)}>
                <UploadCloud size={20} /> Importar Excel
              </button>
              <button className="btn btn-primary" onClick={openNew}>
                <Plus size={20} /> Nuevo Ingreso
              </button>
            </>
          )}
        </div>
      </div>

      <div className="glass-card" style={{ marginBottom: '2rem', padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <Search size={20} color="#94a3b8" />
        <input type="text" placeholder="Buscar por modelo, cliente u orden..."
          style={{ width: '100%', background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none' }}
          value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
      </div>

      <div className="glass-card">
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Imagen</th>
                <th>Código del Producto</th>
                <th>Estado</th>
                <th>Colores</th>
                <th>Cliente</th>
                <th>No. Orden</th>
                <th>Precio</th>
                <th>Piezas</th>
                <th>Total</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 ? (
                <tr><td colSpan={10} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No hay registros</td></tr>
              ) : (
                filteredItems.map(item => {
                  const total = (parseFloat(item.precio) || 0) * (parseInt(item.piezas_en_proceso) || 0);
                  const imgSrc = getImgSrc(item.imagen);
                  return (
                    <tr key={item.id}>
                      <td>
                        {imgSrc
                          ? <img src={imgSrc} alt={item.modelo} className="img-zoom" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 8, border: '1px solid #e2e8f0' }} />
                          : canEdit
                            ? <button className="btn btn-secondary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }} onClick={() => setEditImageItem(item)}>+ Foto</button>
                            : <div style={{ width: 48, height: 48, background: '#f1f5f9', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ImageIcon size={20} color="#cbd5e1" /></div>
                        }
                      </td>
                      <td style={{ fontWeight: 700 }}>
                        {item.modelo}
                        {item.es_reprogramacion === 1 && (
                          <div style={{ fontSize: '0.65rem', color: '#8b5cf6', background: '#e0e7ff', padding: '0.1rem 0.3rem', borderRadius: 4, width: 'fit-content', marginTop: '0.2rem', fontWeight: 600 }}>REPROGRAMADO</div>
                        )}
                      </td>
                      <td>
                        {item.producciones_count > 0 ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#16a34a', fontWeight: 600, fontSize: '0.85rem' }}>
                            <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#16a34a', boxShadow: '0 0 5px rgba(22, 163, 74, 0.5)' }}></div> Asignado
                          </div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#ef4444', fontWeight: 600, fontSize: '0.85rem' }}>
                            <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#ef4444', boxShadow: '0 0 5px rgba(239, 68, 68, 0.5)' }}></div> Disponible
                          </div>
                        )}
                      </td>
                      <td>
                        {(() => {
                          try {
                            const parsed = JSON.parse(item.color);
                            return Array.isArray(parsed) 
                              ? parsed.map(v => v.color).filter(Boolean).join(', ') 
                              : (item.color || '-');
                          } catch (e) {
                            return item.color || '-';
                          }
                        })()}
                      </td>
                      <td>{item.cliente}</td>
                      <td><span className="badge badge-info">{item.no_orden}</span></td>
                      <td>${item.precio}</td>
                      <td style={{ fontWeight: 700, fontSize: '1.1rem' }}>{item.piezas_en_proceso}</td>
                      <td style={{ fontWeight: 700, color: '#2563eb' }}>${total.toFixed(2)}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          {item.observaciones && (
                              <div className="tooltip-container" style={{ marginRight: '0.2rem' }}>
                                <MessageSquare size={18} color="#64748b" />
                                <div className="tooltip-box">{item.observaciones}</div>
                              </div>
                          )}
                          {canEdit ? (
                            <>
                              <button className="btn-icon" onClick={(e) => openEdit(item, e)} title="Editar"><Pencil size={18} /></button>
                              <button className="btn-icon" onClick={(e) => openReprogram(item, e)} title="Reprogramar" style={{ color: '#8b5cf6' }}><RefreshCw size={18} /></button>
                              <button className="btn-icon" onClick={(e) => handleDelete(item.id, e)} title="Eliminar" style={{ color: '#ef4444' }}><Trash2 size={18} /></button>
                            </>
                          ) : (
                            <button className="btn-icon" onClick={(e) => { e.stopPropagation(); openEdit(item, e); }} title="Ver Detalles"><Search size={18} /></button>
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

      {/* Modal Crear / Editar */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content glass-card" style={{ maxWidth: '640px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                {isReprogram ? 'Reprogramar Producción' : (editMode ? 'Editar Producto' : 'Alta de Producciones en Proceso')}
              </h2>
              <button className="btn-icon" onClick={() => setIsModalOpen(false)}><X size={24} /></button>
            </div>
            <form onSubmit={handleManualSubmit}>
              <div className="form-group">
                <label className="form-label">Código del Producto *</label>
                <input 
                  type="text" 
                  required 
                  className="form-input" 
                  disabled={isReprogram}
                  value={formData.modelo} 
                  onChange={e => setFormData({...formData, modelo: e.target.value, numero: e.target.value})} 
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.5rem', marginBottom: '1rem', border: '1px solid #e2e8f0', padding: '1rem', borderRadius: 8 }}>
                <label className="form-label" style={{ marginBottom: 0 }}>Colores y Cantidades</label>
                {formData.variantes.map((v, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '0.5rem', alignItems: 'center' }}>
                    <input type="text" placeholder="Color" className="form-input" value={v.color} onChange={e => {
                      const newVar = [...formData.variantes];
                      newVar[i].color = e.target.value;
                      setFormData({...formData, variantes: newVar});
                    }} />
                    <input type="number" placeholder="Cantidad" className="form-input" value={v.cantidad} onChange={e => {
                      const newVar = [...formData.variantes];
                      newVar[i].cantidad = e.target.value;
                      setFormData({...formData, variantes: newVar});
                    }} />
                    {formData.variantes.length > 1 && (
                      <button type="button" className="btn-icon" onClick={() => {
                        const newVar = formData.variantes.filter((_, idx) => idx !== i);
                        setFormData({...formData, variantes: newVar});
                      }}><Trash2 size={20} color="#ef4444" /></button>
                    )}
                  </div>
                ))}
                <button type="button" className="btn btn-secondary" style={{ width: 'fit-content', marginTop: '0.5rem' }} onClick={() => setFormData({...formData, variantes: [...formData.variantes, {color: '', cantidad: ''}] })}>+ Agregar Color</button>
              </div>

              <div className="form-group">
                <label className="form-label">Cliente</label>
                <input type="text" className="form-input" value={formData.cliente} onChange={e => setFormData({...formData, cliente: e.target.value})} />
              </div>
              
              <div className="form-group">
                <label className="form-label">No. Orden</label>
                <input type="text" className="form-input" value={formData.no_orden} onChange={e => setFormData({...formData, no_orden: e.target.value})} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Precio de maquila</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontWeight: 500 }}>$</span>
                    <input type="number" step="0.01" className="form-input" style={{ paddingLeft: '2rem' }} value={formData.precio} onChange={e => setFormData({...formData, precio: e.target.value})} />
                  </div>
                </div>
              </div>
              <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '1rem', marginTop: '0.5rem' }}>
                <label className="form-label">Imagen del Producto</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.5rem' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: '#64748b' }}>Archivo Local</label>
                    <input type="file" accept="image/*" className="form-input" style={{ padding: '0.5rem', marginTop: '0.25rem' }} onChange={e => setImagenFile(e.target.files[0])} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: '#64748b' }}>URL de Internet</label>
                    <input type="url" placeholder="https://..." className="form-input" style={{ marginTop: '0.25rem' }} value={formData.imagenUrl} onChange={e => setFormData({...formData, imagenUrl: e.target.value})} />
                  </div>
                </div>
              </div>
              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label className="form-label">Observaciones / Notas</label>
                <textarea 
                  className="form-input" 
                  style={{ minHeight: '80px', resize: 'vertical' }} 
                  value={formData.observaciones} 
                  onChange={e => setFormData({...formData, observaciones: e.target.value})}
                  placeholder="Detalles adicionales del producto..."
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">{editMode ? 'Actualizar' : 'Guardar Producto'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Agregar Foto a registro existente */}
      {editImageItem && (
        <div className="modal-overlay">
          <div className="modal-content glass-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Agregar Foto: {editImageItem.modelo}</h2>
              <button className="btn-icon" onClick={() => setEditImageItem(null)}><X size={24} /></button>
            </div>
            <form onSubmit={handleEditImageSubmit}>
              <div className="form-group">
                <label className="form-label">Archivo Local</label>
                <input type="file" accept="image/*" className="form-input" onChange={e => setEditImageFile(e.target.files[0])} />
              </div>
              <div style={{ textAlign: 'center', color: '#94a3b8', margin: '0.5rem 0' }}>— O —</div>
              <div className="form-group">
                <label className="form-label">URL Externa</label>
                <input type="url" placeholder="https://..." className="form-input" value={editImageUrl} onChange={e => setEditImageUrl(e.target.value)} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setEditImageItem(null)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Subir Foto</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Importar Excel */}
      {isUploadModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content glass-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Importar desde Excel</h2>
              <button className="btn-icon" onClick={() => setIsUploadModalOpen(false)}><X size={24} /></button>
            </div>
            <p style={{ marginBottom: '1rem', color: '#64748b' }}>Columnas esperadas: #, MODELO, PRECIO, COLOR, CLIENTE, NO. ORDEN, PIEZAS EN PROCESO.</p>
            <form onSubmit={handleFileUpload}>
              <div className="form-group">
                <input type="file" ref={fileInputRef} accept=".xlsx, .xls" required className="form-input" style={{ paddingTop: '0.5rem' }} />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>Subir y Procesar</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
