import { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, X, Pencil, Trash2, User, AlertTriangle, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import API_URL from '../config';

const API = API_URL;

const emptyForm = { nombre: '', maquinaria: '', personal: '', domicilio: '', colonia: '', codigo_postal: '', telefono: '' };

const getImgSrc = (img) => img ? (img.startsWith('http') ? img : `${API}${img}`) : null;

export default function Maquileros() {
  const { user } = useAuth();
  const userRole = (user?.role || user?.rol || '').toString().toLowerCase().trim();
  const canEdit = userRole === 'admin' || userRole === 'produccion1' || userRole === 'produccion2';
  const [maquileros, setMaquileros] = useState([]);
  const [selectedMaquilero, setSelectedMaquilero] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [imagenFile, setImagenFile] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);

  useEffect(() => { fetchMaquileros(); }, []);

  const fetchMaquileros = async () => {
    try {
      const res = await axios.get(`${API}/api/maquileros`);
      const sorted = res.data.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
      setMaquileros(sorted);
    } catch (e) { console.error(e); }
  };

  const openNew = () => {
    setEditMode(false);
    setEditingId(null);
    setFormData(emptyForm);
    setImagenFile(null);
    setIsModalOpen(true);
  };

  const openEdit = (m, e) => {
    e.stopPropagation();
    setEditMode(true);
    setEditingId(m.id);
    setFormData({ nombre: m.nombre || '', maquinaria: m.maquinaria || '', personal: m.personal || '', domicilio: m.domicilio || '', colonia: m.colonia || '', codigo_postal: m.codigo_postal || '', telefono: m.telefono || '' });
    setImagenFile(null);
    setIsModalOpen(true);
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!confirm('¿Eliminar este maquilero?')) return;
    try {
      await axios.delete(`${API}/api/maquileros/${id}`);
      fetchMaquileros();
    } catch (e) { 
      alert(e.response?.data?.error || 'Error al eliminar'); 
    }
  };

  const handleRowClick = async (id) => {
    try {
      const res = await axios.get(`${API}/api/maquileros/${id}`);
      setSelectedMaquilero(res.data);
    } catch (e) { console.error(e); }
  };

  const navigateMaquilero = (direction) => {
    if (!selectedMaquilero || filteredMaquileros.length === 0) return;
    const currentIndex = filteredMaquileros.findIndex(m => m.id === selectedMaquilero.id);
    if (currentIndex === -1) return;

    let nextIndex = currentIndex + direction;
    if (nextIndex < 0) nextIndex = filteredMaquileros.length - 1;
    if (nextIndex >= filteredMaquileros.length) nextIndex = 0;

    handleRowClick(filteredMaquileros[nextIndex].id);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = new FormData();
      Object.keys(formData).forEach(k => data.append(k, formData[k]));
      if (imagenFile) data.append('imagenBtn', imagenFile);

      if (editMode) {
        // Mantener imagen actual si no se cambia
        const current = maquileros.find(m => m.id === editingId);
        if (!imagenFile && current?.imagen) data.append('imagen_actual', current.imagen);
        await axios.put(`${API}/api/maquileros/${editingId}`, data, { headers: { 'Content-Type': 'multipart/form-data' } });
      } else {
        await axios.post(`${API}/api/maquileros`, data, { headers: { 'Content-Type': 'multipart/form-data' } });
      }
      setIsModalOpen(false);
      fetchMaquileros();
    } catch (e) { alert('Error al guardar'); }
  };

  const Avatar = ({ imagen, nombre, size = 40, showZoom = true }) => {
    const src = getImgSrc(imagen);
    if (src) return (
      <img 
        src={src} 
        alt={nombre} 
        className={showZoom ? "img-zoom" : ""} 
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', border: '2px solid #e2e8f0', cursor: showZoom ? 'zoom-in' : 'default' }} 
        onClick={(e) => {
          if (showZoom) {
            e.stopPropagation();
            setSelectedImage(src);
          }
        }}
      />
    );
    return (
      <div style={{ width: size, height: size, borderRadius: '50%', background: 'linear-gradient(135deg, #2563eb, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 600, fontSize: size * 0.4 }}>
        {nombre?.charAt(0).toUpperCase()}
      </div>
    );
  };

  const isDataIncomplete = (m) => {
    return !m.telefono || !m.domicilio || !m.colonia || !m.maquinaria || !m.personal || !m.codigo_postal;
  };

  const filteredMaquileros = maquileros.filter(m => 
    (m.nombre || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (m.telefono || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (m.colonia || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 className="gradient-text">Maquileros y Talleres</h1>
        {canEdit && (
          <button className="btn btn-primary" onClick={openNew}>
            <Plus size={20} /> Nuevo Maquilero
          </button>
        )}
      </div>

      <div className="glass-card" style={{ marginBottom: '2rem', padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <Search size={20} color="#94a3b8" />
        <input type="text" placeholder="Buscar por nombre, teléfono o colonia..."
          style={{ width: '100%', background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none' }}
          value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
      </div>

      <div className="glass-card">
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Foto</th>
                <th>ID</th>
                <th>Nombre</th>
                <th>Teléfono</th>
                <th>Colonia</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredMaquileros.length === 0 ? (
                <tr><td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No hay maquileros que coincidan con la búsqueda</td></tr>
              ) : (
                filteredMaquileros.map((m, index) => (
                  <tr key={m.id} onClick={() => handleRowClick(m.id)} style={{ cursor: 'pointer' }}>
                    <td><Avatar imagen={m.imagen} nombre={m.nombre} /></td>
                    <td>#{index + 1}</td>
                    <td style={{ fontWeight: 600 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {m.nombre}
                        {isDataIncomplete(m) && (
                          <AlertTriangle size={16} color="#f59e0b" title="Datos incompletos en el perfil" />
                        )}
                      </div>
                    </td>
                    <td>{m.telefono || 'N/A'}</td>
                    <td>{m.colonia || 'N/A'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }} onClick={e => e.stopPropagation()}>
                        {canEdit ? (
                          <>
                            <button className="btn btn-secondary" style={{ padding: '0.35rem 0.6rem' }} onClick={(e) => openEdit(m, e)} title="Editar">
                              <Pencil size={15} />
                            </button>
                            <button className="btn btn-danger" style={{ padding: '0.35rem 0.6rem' }} onClick={(e) => handleDelete(m.id, e)} title="Eliminar">
                              <Trash2 size={15} />
                            </button>
                          </>
                        ) : (
                          <button className="btn btn-secondary" style={{ padding: '0.35rem 0.6rem' }} onClick={() => handleRowClick(m.id)} title="Ver Perfil">
                            <Search size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Perfil */}
      {selectedMaquilero && (
        <div className="modal-overlay" onClick={() => setSelectedMaquilero(null)}>
            <div className="modal-content glass-card" style={{ maxWidth: '1350px', width: '85%', position: 'relative' }} onClick={e => e.stopPropagation()}>
              {/* Botones de Navegación */}
              <button 
                className="btn-icon" 
                style={{ 
                  position: 'absolute', 
                  left: '-70px', 
                  top: '50%', 
                  transform: 'translateY(-50%)', 
                  background: 'white', 
                  color: '#2563eb', 
                  borderRadius: '50%', 
                  padding: '15px',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
                  border: '2px solid #2563eb',
                  zIndex: 100,
                  display: 'flex'
                }}
                onClick={() => navigateMaquilero(-1)}
              >
                <ChevronLeft size={40} strokeWidth={3} />
              </button>
              <button 
                className="btn-icon" 
                style={{ 
                  position: 'absolute', 
                  right: '-70px', 
                  top: '50%', 
                  transform: 'translateY(-50%)', 
                  background: 'white', 
                  color: '#2563eb', 
                  borderRadius: '50%', 
                  padding: '15px',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
                  border: '2px solid #2563eb',
                  zIndex: 100,
                  display: 'flex'
                }}
                onClick={() => navigateMaquilero(1)}
              >
                <ChevronRight size={40} strokeWidth={3} />
              </button>

              <div className="modal-header">
                <h2>Perfil y Desempeño del Maquilero</h2>
                <button className="btn-icon" onClick={() => setSelectedMaquilero(null)}><X size={24} /></button>
              </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '2rem' }}>
              {/* Columna Izquierda: Perfil y Calificación */}
              <div style={{ borderRight: '1px solid #e2e8f0', paddingRight: '2rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '1.5rem', textAlign: 'center' }}>
                  <Avatar imagen={selectedMaquilero.imagen} nombre={selectedMaquilero.nombre} size={100} showZoom={true} />
                  <h3 style={{ marginTop: '1rem', marginBottom: '0.25rem', fontSize: '1.25rem', width: '100%' }}>{selectedMaquilero.nombre}</h3>
                  
                  {/* Calificación Visual */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.5rem' }}>
                    {[1,2,3,4,5].map(star => {
                      const ratingVal = (selectedMaquilero.rating?.total || 0) / 20;
                      return (
                        <div key={star} style={{ color: star <= ratingVal ? '#f59e0b' : '#e2e8f0' }}>
                          <User size={18} fill={star <= ratingVal ? '#f59e0b' : 'none'} />
                        </div>
                      );
                    })}
                    <span style={{ marginLeft: '0.5rem', fontWeight: 700, color: '#f59e0b' }}>
                      {selectedMaquilero.rating?.total}%
                    </span>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: '#64748b' }}>Calificación General basada en historial</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem', fontSize: '0.9rem' }}>
                  <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '8px' }}>
                    <strong style={{ color: '#64748b', fontSize: '0.75rem', display: 'block', textTransform: 'uppercase' }}>Teléfono:</strong>
                    <span>{selectedMaquilero.telefono || 'N/A'}</span>
                  </div>
                  <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '8px' }}>
                    <strong style={{ color: '#64748b', fontSize: '0.75rem', display: 'block', textTransform: 'uppercase' }}>Personal:</strong>
                    <span>{selectedMaquilero.personal || 'N/A'} personas</span>
                  </div>
                  <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '8px' }}>
                    <strong style={{ color: '#64748b', fontSize: '0.75rem', display: 'block', textTransform: 'uppercase' }}>Maquinaria:</strong>
                    <span>{selectedMaquilero.maquinaria || 'N/A'}</span>
                  </div>
                  <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '8px' }}>
                    <strong style={{ color: '#64748b', fontSize: '0.75rem', display: 'block', textTransform: 'uppercase' }}>Domicilio:</strong>
                    <span>{selectedMaquilero.domicilio || 'N/A'}, Col. {selectedMaquilero.colonia || 'N/A'}, C.P. {selectedMaquilero.codigo_postal || 'N/A'}</span>
                  </div>
                </div>

                <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'linear-gradient(135deg, #eff6ff, #dbeafe)', borderRadius: '12px' }}>
                   <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: '#1e40af' }}>Resumen de Calidad</h4>
                   <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem', fontSize: '0.85rem' }}>
                      <span>Puntualidad:</span>
                      <span style={{ fontWeight: 600 }}>{selectedMaquilero.rating?.punctuality}%</span>
                   </div>
                   <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                      <span>Cumplimiento:</span>
                      <span style={{ fontWeight: 600 }}>{selectedMaquilero.rating?.fulfillment}%</span>
                   </div>
                </div>
              </div>

              {/* Columna Derecha: Historial */}
              <div style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ marginBottom: '1rem', color: '#1e293b' }}>Historial de Maquila</h3>
                <div className="table-wrapper" style={{ flex: 1, maxHeight: '90vh', overflowY: 'auto' }}>
                  <table className="data-table" style={{ fontSize: '0.85rem' }}>
                    <thead>
                      <tr>
                        <th>Foto</th>
                        <th>Modelo</th>
                        <th>Pzas (E/R)</th>
                        <th>Total</th>
                        <th>Multa</th>
                        <th>Neto</th>
                        <th>Entrega</th>
                        <th>Calidad</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(!selectedMaquilero.historial || selectedMaquilero.historial.length === 0) ? (
                        <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>Este maquilero aún no tiene historial de producción.</td></tr>
                      ) : (
                        selectedMaquilero.historial.map(h => {
                          const pImg = h.producto_imagen ? (h.producto_imagen.startsWith('http') ? h.producto_imagen : `${API}${h.producto_imagen}`) : null;
                          const esPuntual = h.retrasos === 0;
                          const esCompleto = (h.cantidad_recibida || h.cantidad) >= h.cantidad;

                          return (
                            <tr key={h.id}>
                              <td>
                                {pImg ? (
                                  <img 
                                    src={pImg} 
                                    alt="" 
                                    style={{ width: 35, height: 35, borderRadius: 4, objectFit: 'cover', cursor: 'zoom-in' }} 
                                    onClick={() => setSelectedImage(pImg)}
                                  />
                                ) : (
                                  <div style={{ width: 35, height: 35, borderRadius: 4, background: '#f1f5f9' }} />
                                )}
                              </td>
                              <td style={{ fontWeight: 600 }}>{h.producto_modelo}</td>
                              <td>{h.cantidad} / <span style={{ color: esCompleto ? '#10b981' : '#dc2626' }}>{h.cantidad_recibida || '-'}</span></td>
                              <td>
                                <span style={{ fontWeight: 600 }}>${Number(h.precio_total).toFixed(2)}</span>
                              </td>
                              <td style={{ color: h.descuento_aplicado > 0 ? '#ef4444' : '#94a3b8' }}>
                                {h.descuento_aplicado > 0 ? `-$${Number(h.descuento_aplicado).toFixed(2)}` : '$0.00'}
                              </td>
                              <td style={{ color: '#10b981', fontWeight: 'bold' }}>
                                ${Number(h.pagado_efectivo).toFixed(2)}
                              </td>
                              <td>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                  <span>{h.fecha_fin ? new Date(h.fecha_fin).toLocaleDateString() : 'N/A'}</span>
                                  {h.retrasos > 0 && <span style={{ fontSize: '0.7rem', color: '#dc2626' }}>{h.retrasos} retraso(s)</span>}
                                </div>
                              </td>
                              <td>
                                <div style={{ display: 'flex', gap: '0.25rem' }}>
                                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: esPuntual ? '#10b981' : '#f59e0b' }} title={esPuntual ? "Entregado a tiempo" : "Con retraso"}></div>
                                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: esCompleto ? '#10b981' : '#dc2626' }} title={esCompleto ? "Piezas completas" : "Incompleto"}></div>
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
            </div>
          </div>
        </div>
      )}

      {/* Modal Crear / Editar */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content glass-card" style={{ maxWidth: '640px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editMode ? 'Editar Maquilero' : 'Nuevo Maquilero'}</h2>
              <button className="btn-icon" onClick={() => setIsModalOpen(false)}><X size={24} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '1.5rem' }}>
                <div style={{ flexShrink: 0 }}>
                  {imagenFile ? (
                    <img src={URL.createObjectURL(imagenFile)} alt="preview" style={{ width: 84, height: 84, borderRadius: '50%', objectFit: 'cover', border: '2px solid #e2e8f0' }} />
                  ) : editMode && maquileros.find(m => m.id === editingId)?.imagen ? (
                    <img src={getImgSrc(maquileros.find(m => m.id === editingId)?.imagen)} alt="actual" style={{ width: 84, height: 84, borderRadius: '50%', objectFit: 'cover', border: '2px solid #e2e8f0' }} />
                  ) : (
                    <div style={{ width: 84, height: 84, borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px dashed #cbd5e1' }}>
                      <User size={40} color="#94a3b8" />
                    </div>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <label className="form-label">Foto del Maquilero {editMode ? '(dejar vacío para no cambiar)' : ''}</label>
                  <input type="file" accept="image/*" className="form-input" style={{ padding: '0.4rem' }} onChange={e => setImagenFile(e.target.files[0])} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Nombre Completo *</label>
                <input
                  required
                  type="text"
                  className="form-input"
                  value={formData.nombre}
                  pattern="[A-Za-záéíóúÁÉÍÓÚüÜñÑ\s]+"
                  title="El nombre solo puede contener letras y espacios"
                  onChange={e => {
                    const onlyLetters = e.target.value.replace(/[^A-Za-záéíóúÁÉÍÓÚüÜñÑ\s]/g, '');
                    setFormData({...formData, nombre: onlyLetters});
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Teléfono</label>
                  <input type="tel" className="form-input" placeholder="Ej: 55 1234 5678" value={formData.telefono} onChange={e => setFormData({...formData, telefono: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Personal (personas)</label>
                  <input type="number" min="0" className="form-input" placeholder="Ej: 8" value={formData.personal} onChange={e => setFormData({...formData, personal: e.target.value})} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Maquinaria</label>
                <input type="text" className="form-input" placeholder="Ej: 5 máquinas overlock, 2 rectas" value={formData.maquinaria} onChange={e => setFormData({...formData, maquinaria: e.target.value})} />
              </div>

              <div className="form-group">
                <label className="form-label">Domicilio</label>
                <input type="text" className="form-input" value={formData.domicilio} onChange={e => setFormData({...formData, domicilio: e.target.value})} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Colonia</label>
                  <input type="text" className="form-input" value={formData.colonia} onChange={e => setFormData({...formData, colonia: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">C.P.</label>
                  <input type="text" className="form-input" value={formData.codigo_postal} onChange={e => setFormData({...formData, codigo_postal: e.target.value})} />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">{editMode ? 'Actualizar' : 'Guardar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal Zoom de Imagen */}
      {selectedImage && (
        <div className="modal-overlay" style={{ zIndex: 3000 }} onClick={() => setSelectedImage(null)}>
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
