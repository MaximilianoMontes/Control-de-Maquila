import { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, X, Pencil, Trash2, User, AlertTriangle, Search, ChevronLeft, ChevronRight, ClipboardList, UserX, UserCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import API_URL from '../config';
import { toast, Swal } from '../utils/themeNotifications';

const API = API_URL;

const DOCUMENTOS_MAQUILERO = [
  { key: 'contrato_vigente', label: 'Contrato Vigente' },
  { key: 'reglamento', label: 'Reglamento' },
  { key: 'pagare', label: 'Pagaré' },
  { key: 'ine', label: 'INE' },
  { key: 'acta_nacimiento', label: 'Acta de Nacimiento' },
  { key: 'curp', label: 'CURP' },
  { key: 'comprobante_domicilio', label: 'Comprobante de domicilio' },
  { key: 'clabe_interbancaria', label: 'CLABE Interbancaria' },
];

const emptyDocumentos = { ...DOCUMENTOS_MAQUILERO.reduce((acc, d) => ({ ...acc, [d.key]: false }), {}), pagare_monto: '' };

const emptyForm = { nombre: '', maquinaria: '', personal: '', domicilio: '', colonia: '', poblacion: '', codigo_postal: '', telefono: '', documentos: emptyDocumentos };

const parseDocumentos = (raw) => {
  let parsed = {};
  if (raw) {
    try { parsed = JSON.parse(raw); } catch { parsed = {}; }
  }
  return { ...emptyDocumentos, ...parsed };
};

const getImgSrc = (img) => img ? (img.startsWith('http') ? img : `${API}${img}`) : null;

export default function Maquileros() {
  const { user } = useAuth();
  const { t, settings } = useSettings();
  const isEn = settings?.language === 'en';
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
  const [entregasDetailOrder, setEntregasDetailOrder] = useState(null);
  const [activeTab, setActiveTab] = useState('activos');

  useEffect(() => {
    fetchMaquileros();
    const interval = setInterval(fetchMaquileros, 2000); // Auto-refresca cada 2 segundos en segundo plano
    return () => clearInterval(interval);
  }, []);

  const fetchMaquileros = async () => {
    try {
      const res = await axios.get(`${API}/api/maquileros`);
      const sorted = res.data.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || '', 'es', { sensitivity: 'base' }));
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
    setFormData({ nombre: m.nombre || '', maquinaria: m.maquinaria || '', personal: m.personal || '', domicilio: m.domicilio || '', colonia: m.colonia || '', poblacion: m.poblacion || '', codigo_postal: m.codigo_postal || '', telefono: m.telefono || '', documentos: parseDocumentos(m.documentos) });
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

  const handleMarkInactive = async (m, e) => {
    e.stopPropagation();
    const { value: nota, isConfirmed } = await Swal.fire({
      title: t('maq.inactiveReasonTitle'),
      input: 'textarea',
      inputPlaceholder: t('maq.inactiveReasonPlaceholder'),
      showCancelButton: true,
      confirmButtonText: t('maq.markInactive'),
      cancelButtonText: t('maq.cancel'),
      background: '#1e293b',
      color: '#f8fafc',
      confirmButtonColor: '#f59e0b',
      inputValidator: (value) => !value || !value.trim() ? t('maq.inactiveReasonRequired') : undefined
    });

    if (isConfirmed) {
      try {
        await axios.put(`${API}/api/maquileros/${m.id}/estado`, { activo: false, nota });
        toast.success(t('maq.markedInactiveSuccess'), { theme: 'dark' });
        fetchMaquileros();
      } catch (err) {
        toast.error(err.response?.data?.error || 'Error', { theme: 'dark' });
      }
    }
  };

  const handleReactivate = async (m, e) => {
    e.stopPropagation();
    Swal.fire({
      title: t('maq.reactivateConfirmTitle'),
      text: t('maq.reactivateConfirmText'),
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#64748b',
      confirmButtonText: t('maq.reactivate'),
      cancelButtonText: t('maq.cancel'),
      background: '#1e293b',
      color: '#f8fafc'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await axios.put(`${API}/api/maquileros/${m.id}/estado`, { activo: true });
          toast.success(t('maq.reactivatedSuccess'), { theme: 'dark' });
          fetchMaquileros();
        } catch (err) {
          toast.error(err.response?.data?.error || 'Error', { theme: 'dark' });
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

  const handleSaveObservacion = async (historialId, currentObs) => {
    const { value: text, isConfirmed } = await Swal.fire({
      title: 'Observaciones de Producción',
      input: 'textarea',
      inputValue: currentObs || '',
      inputPlaceholder: 'Escribe aquí observaciones o detalles sobre el trabajo del maquilero en esta orden...',
      showCancelButton: true,
      confirmButtonText: 'Guardar',
      cancelButtonText: 'Cancelar',
      background: '#1e293b',
      color: '#f8fafc',
      confirmButtonColor: '#0284c7'
    });

    if (isConfirmed) {
      try {
        await axios.put(`${API}/api/produccion/${historialId}/observaciones`, { observaciones: text });
        toast.success('Observaciones actualizadas', { theme: 'dark' });
        setSelectedMaquilero(prev => {
          if (!prev || !prev.historial) return prev;
          return {
            ...prev,
            historial: prev.historial.map(item => item.id === historialId ? { ...item, observaciones: text } : item)
          };
        });
      } catch (err) {
        console.error(err);
        toast.error('Error al actualizar observaciones', { theme: 'dark' });
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = new FormData();
      Object.keys(formData).forEach(k => {
        if (k === 'documentos') return;
        data.append(k, formData[k]);
      });
      data.append('documentos', JSON.stringify(formData.documentos));
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

  const isActivo = (m) => !(m.activo === 0 || m.activo === false || m.activo === '0');

  const filteredMaquileros = maquileros.filter(m =>
    (activeTab === 'activos' ? isActivo(m) : !isActivo(m)) &&
    ((m.nombre || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (m.telefono || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (m.colonia || '').toLowerCase().includes(searchTerm.toLowerCase()))
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

      <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
        <button
          onClick={() => setActiveTab('activos')}
          style={{
            padding: '10px 20px',
            background: activeTab === 'activos' ? 'rgba(59, 130, 246, 0.12)' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'activos' ? '2px solid var(--primary-color)' : 'none',
            color: activeTab === 'activos' ? '#fff' : 'var(--text-secondary)',
            fontWeight: 600,
            borderRadius: '8px 8px 0 0',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          {t('maq.tabActive')}
        </button>
        <button
          onClick={() => setActiveTab('inactivos')}
          style={{
            padding: '10px 20px',
            background: activeTab === 'inactivos' ? 'rgba(59, 130, 246, 0.12)' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'inactivos' ? '2px solid var(--primary-color)' : 'none',
            color: activeTab === 'inactivos' ? '#fff' : 'var(--text-secondary)',
            fontWeight: 600,
            borderRadius: '8px 8px 0 0',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          {t('maq.tabInactive')}
        </button>
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
                {activeTab === 'inactivos' && <th>{t('maq.motivo')}</th>}
                <th>{t('maq.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredMaquileros.length === 0 ? (
                <tr><td colSpan={activeTab === 'inactivos' ? 7 : 6} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>{t('maq.noResults')}</td></tr>
              ) : (
                filteredMaquileros.map((m, index) => (
                  <tr key={m.id} onClick={() => handleRowClick(m.id)} style={{ cursor: 'pointer' }}>
                    <td><Avatar imagen={m.imagen} nombre={m.nombre} /></td>
                    <td>{m.id}</td>
                    <td style={{ fontWeight: 600 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span>{m.nombre}</span>
                        {isDataIncomplete(m) && (
                          <AlertTriangle
                            size={16}
                            color="#f59e0b"
                            title="Información incompleta (Faltan datos de contacto, dirección o maquinaria)"
                          />
                        )}
                      </div>
                    </td>
                    <td>{m.telefono || '-'}</td>
                    <td>{m.colonia || '-'}</td>
                    {activeTab === 'inactivos' && (
                      <td style={{ maxWidth: '260px' }}>
                        <div style={{ fontSize: '0.85rem' }} title={m.inactivo_nota || ''}>
                          {m.inactivo_nota || '-'}
                        </div>
                        {m.inactivo_fecha && (
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                            {t('maq.inactiveSince')}: {new Date(m.inactivo_fecha).toLocaleDateString()}
                          </div>
                        )}
                      </td>
                    )}
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }} onClick={e => e.stopPropagation()}>
                        {canEdit ? (
                          <>
                            <button className="btn btn-secondary" style={{ padding: '0.35rem 0.6rem' }} onClick={(e) => openEdit(m, e)} title="Editar">
                              <Pencil size={15} />
                            </button>
                            {activeTab === 'activos' ? (
                              <button className="btn btn-secondary" style={{ padding: '0.35rem 0.6rem', color: '#f59e0b' }} onClick={(e) => handleMarkInactive(m, e)} title={t('maq.markInactive')}>
                                <UserX size={15} />
                              </button>
                            ) : (
                              <button className="btn btn-secondary" style={{ padding: '0.35rem 0.6rem', color: '#10b981' }} onClick={(e) => handleReactivate(m, e)} title={t('maq.reactivate')}>
                                <UserCheck size={15} />
                              </button>
                            )}
                            <button className="btn btn-secondary" style={{ padding: '0.35rem 0.6rem', color: '#ef4444' }} onClick={(e) => handleDelete(m.id, e)} title="Eliminar">
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
            <div className="modal-content glass-card" style={{ maxWidth: '98vw', width: '98vw', maxHeight: '94vh', position: 'relative', padding: '1.5rem 2.5rem', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
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
            
            <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '1.5rem' }}>
              {/* Columna Izquierda: Perfil y Calificación */}
              <div style={{ borderRight: '1px solid #e2e8f0', paddingRight: '1.5rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '1.5rem', textAlign: 'center' }}>
                  <Avatar imagen={selectedMaquilero.imagen} nombre={selectedMaquilero.nombre} size={260} showZoom={true} />
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
                    <span>{selectedMaquilero.domicilio || 'N/A'}, {t('maq.colonia')}: {selectedMaquilero.colonia || 'N/A'}, Población: {selectedMaquilero.poblacion || 'N/A'}, {t('maq.cp')}: {selectedMaquilero.codigo_postal || 'N/A'}</span>
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
                <div className="table-wrapper" style={{ flex: 1, maxHeight: '80vh', overflowY: 'auto' }}>
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
                        <th>{t('maq.tableEntregasLog')}</th>
                        <th>{t('maq.tableObservaciones')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(!selectedMaquilero.historial || selectedMaquilero.historial.length === 0) ? (
                        <tr><td colSpan="10" style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>{t('maq.noHistory')}</td></tr>
                      ) : (
                        selectedMaquilero.historial.map(h => {
                          const pImg = h.producto_imagen ? (h.producto_imagen.startsWith('http') ? h.producto_imagen : `${API}${h.producto_imagen}`) : null;
                          const esPuntual = h.entrega_a_tiempo !== null && h.entrega_a_tiempo !== undefined ? h.entrega_a_tiempo : h.retrasos === 0;
                          const esCompleto = (h.cantidad_recibida || h.cantidad) >= h.cantidad;
                          const entregasLog = h.entregas_log || [];

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
                              <td>
                                <button
                                  type="button"
                                  className="btn btn-secondary"
                                  style={{ padding: '0.3rem 0.55rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem', whiteSpace: 'nowrap' }}
                                  onClick={() => setEntregasDetailOrder(h)}
                                  title={t('maq.tableEntregasLog')}
                                >
                                  <ClipboardList size={13} />
                                  {entregasLog.length > 0
                                    ? `${entregasLog.length} ${entregasLog.length === 1 ? (isEn ? 'record' : 'registro') : (isEn ? 'records' : 'registros')}`
                                    : t('maq.noEntregasLog')}
                                </button>
                                {entregasLog.length > 0 && (
                                  <span
                                    className={`badge ${esPuntual ? 'badge-success' : 'badge-danger'}`}
                                    style={{ display: 'inline-block', marginTop: '0.3rem', fontSize: '10px', fontWeight: 700, padding: '2px 6px' }}
                                  >
                                    {esPuntual ? t('maq.ontimeTitle') : t('maq.delayedTitle')}
                                  </span>
                                )}
                              </td>
                              <td style={{ minWidth: '220px', maxWidth: '350px' }}>
                                {h.observaciones ? (
                                  <div 
                                    style={{ 
                                      fontSize: '0.8rem', 
                                      color: 'var(--text-primary, #f8fafc)', 
                                      background: 'rgba(15, 23, 42, 0.65)', 
                                      padding: '0.45rem 0.65rem', 
                                      borderRadius: '6px',
                                      border: '1px solid rgba(56, 189, 248, 0.3)',
                                      maxHeight: '85px',
                                      overflowY: 'auto',
                                      whiteSpace: 'pre-wrap',
                                      wordBreak: 'break-word',
                                      lineHeight: '1.35',
                                      cursor: canEdit ? 'pointer' : 'default'
                                    }}
                                    title={canEdit ? "Haz clic para editar esta observación" : h.observaciones}
                                    onClick={() => canEdit && handleSaveObservacion(h.id, h.observaciones)}
                                  >
                                    {h.observaciones}
                                  </div>
                                ) : (
                                  canEdit ? (
                                    <button 
                                      className="btn btn-secondary" 
                                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', color: '#94a3b8', background: 'rgba(255,255,255,0.05)', border: '1px dashed #64748b' }}
                                      onClick={() => handleSaveObservacion(h.id, '')}
                                      title="Agregar observación a esta orden"
                                    >
                                      + Nota
                                    </button>
                                  ) : (
                                    <span style={{ color: '#64748b', fontSize: '0.8rem' }}>-</span>
                                  )
                                )}
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

              <div className="form-group">
                <label className="form-label">Población</label>
                <input type="text" className="form-input" value={formData.poblacion} onChange={e => setFormData({...formData, poblacion: e.target.value})} />
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

              <div className="form-group" style={{ marginTop: '0.5rem' }}>
                <label className="form-label">Documentos del Maquilero Adquiridos</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem 1rem', padding: '0.75rem', border: '1px solid var(--border-color, #e2e8f0)', borderRadius: '8px' }}>
                  {DOCUMENTOS_MAQUILERO.map(doc => (
                    <div key={doc.key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                        <input
                          type="checkbox"
                          checked={!!formData.documentos[doc.key]}
                          onChange={e => setFormData({ ...formData, documentos: { ...formData.documentos, [doc.key]: e.target.checked } })}
                        />
                        {doc.label}
                      </label>
                      {doc.key === 'pagare' && (
                        <div style={{ position: 'relative', width: '110px' }}>
                          <span style={{ position: 'absolute', left: '0.5rem', top: '50%', transform: 'translateY(-50%)', fontSize: '0.85rem', color: 'var(--text-secondary, #64748b)', pointerEvents: 'none' }}>$</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            className="form-input"
                            placeholder="0.00"
                            style={{ padding: '0.25rem 0.5rem 0.25rem 1.25rem', fontSize: '0.85rem', width: '100%' }}
                            value={formData.documentos.pagare_monto}
                            onChange={e => setFormData({ ...formData, documentos: { ...formData.documentos, pagare_monto: e.target.value } })}
                          />
                        </div>
                      )}
                    </div>
                  ))}
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
      {/* Modal Detalle de Registro de Entregas (solo lectura) */}
      {entregasDetailOrder && (
        <div className="modal-overlay" style={{ zIndex: 3000 }} onClick={() => setEntregasDetailOrder(null)}>
          <div className="modal-content glass-card" style={{ maxWidth: '520px', width: '95%' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2 style={{ fontSize: '1.15rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <ClipboardList size={19} /> {t('maq.tableEntregasLog')}
                </h2>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  {t('maq.tableModel')}: <strong>{entregasDetailOrder.producto_modelo}</strong>
                  {' · '}{t('maq.tableEntrega')}: <strong>{entregasDetailOrder.fecha_fin ? new Date(entregasDetailOrder.fecha_fin).toLocaleDateString() : 'N/A'}</strong>
                </div>
              </div>
              <button className="btn-icon" onClick={() => setEntregasDetailOrder(null)}><X size={22} /></button>
            </div>
            <div style={{ margin: '1rem 0', maxHeight: '320px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {(!entregasDetailOrder.entregas_log || entregasDetailOrder.entregas_log.length === 0) ? (
                <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '1rem', fontSize: '0.9rem' }}>
                  {t('maq.noEntregasLog')}
                </div>
              ) : (
                entregasDetailOrder.entregas_log.map(entry => {
                  const entryDate = Date.UTC(...entry.fecha.slice(0, 10).split('-').map((v, i) => i === 1 ? parseInt(v) - 1 : parseInt(v)));
                  let isLate = false;
                  let diffDays = 0;
                  if (entregasDetailOrder.fecha_fin) {
                    const fDate = new Date(entregasDetailOrder.fecha_fin);
                    const limitDate = Date.UTC(fDate.getUTCFullYear(), fDate.getUTCMonth(), fDate.getUTCDate());
                    diffDays = Math.round((entryDate - limitDate) / (1000 * 60 * 60 * 24));
                    isLate = diffDays > 0;
                  }
                  return (
                    <div key={entry.id} className="glass-card" style={{ padding: '0.6rem 0.8rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <strong style={{ fontSize: '0.9rem' }}>{new Date(entry.fecha).toLocaleDateString()}</strong>
                        <span className={`badge ${isLate ? 'badge-danger' : 'badge-success'}`} style={{ fontSize: '10px', padding: '2px 6px', fontWeight: 700 }}>
                          {isLate ? `${isEn ? 'Late' : 'Tarde'} (${diffDays}d)` : (isEn ? 'On time' : 'A tiempo')}
                        </span>
                      </div>
                      {entry.nota && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{entry.nota}</div>
                      )}
                      {entry.username && (
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '2px', opacity: 0.7 }}>
                          {isEn ? 'by' : 'por'} {entry.username}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
