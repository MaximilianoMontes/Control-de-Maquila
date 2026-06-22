import { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, X, Pencil, Trash2, User, AlertTriangle, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import API_URL from '../config';
import Swal from 'sweetalert2';
import { toast } from 'react-toastify';

const API = API_URL;

const emptyForm = { nombre: '', maquinaria: '', personal: '', domicilio: '', colonia: '', codigo_postal: '', telefono: '' };

const getImgSrc = (img) => img ? (img.startsWith('http') ? img : `${API}${img}`) : null;

export default function Maquileros() {
  const { user } = useAuth();
  const { t } = useSettings();
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

  useEffect(() => {
    fetchMaquileros();
    const interval = setInterval(fetchMaquileros, 2000); // Auto-refresca cada 2 segundos en segundo plano
    return () => clearInterval(interval);
  }, []);

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
    Swal.fire({
      title: '¿Eliminar este maquilero?',
      text: 'Esta acción eliminará de forma permanente al maquilero.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      background: '#1e293b',
      color: '#f8fafc'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await axios.delete(`${API}/api/maquileros/${id}`);
          toast.success('Maquilero eliminado con éxito', { theme: 'dark' });
          fetchMaquileros();
        } catch (e) { 
          toast.error(e.response?.data?.error || 'Error al eliminar', { theme: 'dark' }); 
        }
      }
    });
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
        toast.success('Maquilero actualizado con éxito', { theme: 'dark' });
      } else {
        await axios.post(`${API}/api/maquileros`, data, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success('Maquilero guardado con éxito', { theme: 'dark' });
      }
      setIsModalOpen(false);
      fetchMaquileros();
    } catch (e) { 
      toast.error('Error al guardar', { theme: 'dark' }); 
    }
  };

  const Avatar = ({ imagen, nombre, size = 120, showZoom = true }) => {
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
        <h1 className="gradient-text">{t('maq.title')}</h1>
        {canEdit && (
          <button className="btn btn-primary" onClick={openNew}>
            <Plus size={20} /> {t('maq.new')}
          </button>
        )}
      </div>

      <div className="glass-card" style={{ marginBottom: '2rem', padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <Search size={20} color="#94a3b8" />
        <input type="text" placeholder={t('maq.search')}
          style={{ width: '100%', background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none' }}
          value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
      </div>

      <div className="glass-card">
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('maq.photo')}</th>
                <th>{t('maq.id')}</th>
                <th>{t('maq.name')}</th>
                <th>{t('maq.phone')}</th>
                <th>{t('maq.colonia')}</th>
                <th>{t('maq.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredMaquileros.length === 0 ? (
                <tr><td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>{t('maq.noResults')}</td></tr>
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
        <div className="modal-overlay">
            <div className="modal-content glass-card" style={{ maxWidth: '1350px', width: '95%', position: 'relative', padding: '2rem 3.5rem' }} onClick={e => e.stopPropagation()}>
              {/* Botones de Navegación (Dentro del modal para evitar scrollbars) */}
              <button 
                className="btn-icon" 
                style={{ 
                  position: 'absolute', 
                  left: '10px', 
                  top: '50%', 
                  transform: 'translateY(-50%)', 
                  background: 'rgba(255,255,255,0.8)', 
                  color: '#2563eb', 
                  borderRadius: '50%', 
                  padding: '10px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  border: '1px solid #e2e8f0',
                  zIndex: 100,
                  display: 'flex',
                  backdropFilter: 'blur(4px)'
                }}
                onClick={() => navigateMaquilero(-1)}
              >
                <ChevronLeft size={30} strokeWidth={2.5} />
              </button>
              <button 
                className="btn-icon" 
                style={{ 
                  position: 'absolute', 
                  right: '10px', 
                  top: '50%', 
                  transform: 'translateY(-50%)', 
                  background: 'rgba(255,255,255,0.8)', 
                  color: '#2563eb', 
                  borderRadius: '50%', 
                  padding: '10px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  border: '1px solid #e2e8f0',
                  zIndex: 100,
                  display: 'flex',
                  backdropFilter: 'blur(4px)'
                }}
                onClick={() => navigateMaquilero(1)}
              >
                <ChevronRight size={30} strokeWidth={2.5} />
              </button>

              <div className="modal-header">
                <h2>{t('maq.profileTitle')}</h2>
                <button className="btn-icon" onClick={() => setSelectedMaquilero(null)}><X size={24} /></button>
              </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '2rem' }}>
              {/* Columna Izquierda: Perfil y Calificación */}
              <div style={{ borderRight: '1px solid #e2e8f0', paddingRight: '2rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '1.5rem', textAlign: 'center' }}>
                  <Avatar imagen={selectedMaquilero.imagen} nombre={selectedMaquilero.nombre} size={300} showZoom={true} />
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
                  <p style={{ fontSize: '0.8rem', color: '#64748b' }}>{t('maq.generalRating')}</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem', fontSize: '0.9rem' }}>
                  <div className="profile-detail-item">
                    <strong>{t('maq.phoneLabel')}:</strong>
                    <span>{selectedMaquilero.telefono || 'N/A'}</span>
                  </div>
                  <div className="profile-detail-item">
                    <strong>{t('maq.personalNo')}:</strong>
                    <span>{selectedMaquilero.personal || 'N/A'} {t('maq.personalValue')}</span>
                  </div>
                  <div className="profile-detail-item">
                    <strong>{t('maq.machinery')}:</strong>
                    <span>{selectedMaquilero.maquinaria || 'N/A'}</span>
                  </div>
                  <div className="profile-detail-item">
                    <strong>{t('maq.domicilio')}:</strong>
                    <span>{selectedMaquilero.domicilio || 'N/A'}, {t('maq.colonia')}: {selectedMaquilero.colonia || 'N/A'}, {t('maq.cp')}: {selectedMaquilero.codigo_postal || 'N/A'}</span>
                  </div>
                </div>

                <div className="quality-summary-card">
                   <h4>{t('maq.qualitySummary')}</h4>
                   <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem', fontSize: '0.85rem' }}>
                      <span>{t('maq.punctuality')}</span>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{selectedMaquilero.rating?.punctuality}%</span>
                   </div>
                   <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                      <span>{t('maq.fulfillment')}</span>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{selectedMaquilero.rating?.fulfillment}%</span>
                   </div>
                </div>
              </div>

              {/* Columna Derecha: Historial */}
              <div style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ marginBottom: '1rem', color: '#1e293b' }}>{t('maq.historyTitle')}</h3>
                <div className="table-wrapper" style={{ flex: 1, maxHeight: '90vh', overflowY: 'auto' }}>
                  <table className="data-table" style={{ fontSize: '0.85rem' }}>
                    <thead>
                      <tr>
                        <th>{t('maq.tablePhoto')}</th>
                        <th>{t('maq.tableModel')}</th>
                        <th>{t('maq.tablePieces')}</th>
                        <th>{t('maq.tableTotal')}</th>
                        <th>{t('maq.tableDescuento')}</th>
                        <th>{t('maq.tableNeto')}</th>
                        <th>{t('maq.tableEntrega')}</th>
                        <th>{t('maq.tableCalidad')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(!selectedMaquilero.historial || selectedMaquilero.historial.length === 0) ? (
                        <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>{t('maq.noHistory')}</td></tr>
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
                                    style={{ width: 105, height: 105, borderRadius: 4, objectFit: 'contain', backgroundColor: '#ffffff', cursor: 'zoom-in' }} 
                                    onClick={() => setSelectedImage(pImg)}
                                  />
                                ) : (
                                  <div style={{ width: 105, height: 105, borderRadius: 4, background: '#f1f5f9' }} />
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
                                  {h.retrasos > 0 && <span style={{ fontSize: '0.7rem', color: '#dc2626' }}>{h.retrasos} {t('maq.retrasosText')}</span>}
                                </div>
                              </td>
                              <td>
                                <div style={{ display: 'flex', gap: '0.25rem' }}>
                                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: esPuntual ? '#10b981' : '#f59e0b' }} title={esPuntual ? t('maq.ontimeTitle') : t('maq.delayedTitle')}></div>
                                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: esCompleto ? '#10b981' : '#dc2626' }} title={esCompleto ? t('maq.completeTitle') : t('maq.incompleteTitle')}></div>
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
        <div className="modal-overlay">
          <div className="modal-content glass-card" style={{ maxWidth: '640px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editMode ? t('maq.modalEditMaq') : t('maq.modalNewMaq')}</h2>
              <button className="btn-icon" onClick={() => setIsModalOpen(false)}><X size={24} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '1.5rem' }}>
                <div style={{ flexShrink: 0 }}>
                  {imagenFile ? (
                    <img src={URL.createObjectURL(imagenFile)} alt="preview" style={{ width: 252, height: 252, borderRadius: '50%', objectFit: 'cover', border: '2px solid #e2e8f0' }} />
                  ) : editMode && maquileros.find(m => m.id === editingId)?.imagen ? (
                    <img src={getImgSrc(maquileros.find(m => m.id === editingId)?.imagen)} alt="actual" style={{ width: 252, height: 252, borderRadius: '50%', objectFit: 'cover', border: '2px solid #e2e8f0' }} />
                  ) : (
                    <div style={{ width: 252, height: 252, borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px dashed #cbd5e1' }}>
                      <User size={120} color="#94a3b8" />
                    </div>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <label className="form-label">{t('maq.photoLabel')} {editMode ? t('maq.photoSub') : ''}</label>
                  <input type="file" accept="image/*" className="form-input" style={{ padding: '0.4rem' }} onChange={e => setImagenFile(e.target.files[0])} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">{t('maq.fullName')}</label>
                <input
                  required
                  type="text"
                  className="form-input"
                  value={formData.nombre}
                  pattern="[A-Za-záéíóúÁÉÍÓÚüÜñÑ\s]+"
                  title={t('maq.nameTitle')}
                  onChange={e => {
                    const onlyLetters = e.target.value.replace(/[^A-Za-záéíóúÁÉÍÓÚüÜñÑ\s]/g, '');
                    setFormData({...formData, nombre: onlyLetters});
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">{t('maq.phoneLabel')}</label>
                  <input type="tel" className="form-input" placeholder="Ej: 55 1234 5678" value={formData.telefono} onChange={e => setFormData({...formData, telefono: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">{t('maq.personalNo')}</label>
                  <input type="number" min="0" className="form-input" placeholder="Ej: 8" value={formData.personal} onChange={e => setFormData({...formData, personal: e.target.value})} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">{t('maq.machinery')}</label>
                <input type="text" className="form-input" placeholder="Ej: 5 máquinas overlock, 2 rectas" value={formData.maquinaria} onChange={e => setFormData({...formData, maquinaria: e.target.value})} />
              </div>

              <div className="form-group">
                <label className="form-label">{t('maq.domicilio')}</label>
                <input type="text" className="form-input" value={formData.domicilio} onChange={e => setFormData({...formData, domicilio: e.target.value})} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">{t('maq.coloniaLabel')}</label>
                  <input type="text" className="form-input" value={formData.colonia} onChange={e => setFormData({...formData, colonia: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">{t('maq.cp')}</label>
                  <input type="text" className="form-input" value={formData.codigo_postal} onChange={e => setFormData({...formData, codigo_postal: e.target.value})} />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>{t('maq.cancel')}</button>
                <button type="submit" className="btn btn-primary">{editMode ? t('maq.update') : t('maq.save')}</button>
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
