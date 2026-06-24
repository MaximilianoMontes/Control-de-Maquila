import { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, Image as ImageIcon, Trash2, Calendar, ClipboardList, RefreshCw, ChevronDown, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import API_URL from '../config';

import { toast, Swal } from '../utils/themeNotifications';

const API = API_URL;

const getImgSrc = (img) => img ? (img.startsWith('http') ? img : `${API}${img}`) : null;

const displayDate = (date) => {
  if (!date) return 'N/A';
  const d = new Date(date);
  if (isNaN(d.getTime())) return 'N/A';
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
};

export default function Inventario() {
  const { user } = useAuth();
  const { t, formatCurrency, settings } = useSettings();
  const isEn = settings?.language === 'en';
  const userRole = (user?.role || user?.rol || '').toString().toLowerCase().trim();
  const canEdit = userRole === 'admin' || userRole === 'inventario1';
  
  const [items, setItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [activeDropdownId, setActiveDropdownId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchItems();
    const interval = setInterval(fetchItems, 2000); // Auto-refresca cada 2 segundos en segundo plano
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (!e.target.closest('.actions-dropdown-container')) {
        setActiveDropdownId(null);
      }
    };
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        setActiveDropdownId(null);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('click', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const fetchItems = async () => {
    try {
      const res = await axios.get(`${API}/api/inventario_real`);
      setItems(res.data);
    } catch (e) {
      console.error("Error al obtener inventario general:", e);
    }
  };

  const handleDelete = async (id) => {
    Swal.fire({
      title: isEn ? 'Delete product?' : '¿Eliminar producto?',
      text: isEn 
        ? 'Are you sure you want to delete this product from the general inventory?' 
        : '¿Estás seguro de eliminar este producto del inventario general?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: isEn ? 'Yes, delete' : 'Sí, eliminar',
      cancelButtonText: isEn ? 'Cancel' : 'Cancelar',
      background: '#1e293b',
      color: '#f8fafc'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const token = localStorage.getItem('token');
          await axios.delete(`${API}/api/inventario_real/${id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          fetchItems();
          toast.success(isEn ? 'Product deleted successfully' : 'Producto eliminado correctamente', { theme: 'dark' });
        } catch (e) {
          toast.error((isEn ? 'Error deleting: ' : 'Error al eliminar: ') + (e.response?.data?.error || e.message), { theme: 'dark' });
        }
      }
    });
  };

  const filteredItems = items.filter(item =>
    (item.modelo || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.cliente || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.no_orden || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPiezas = filteredItems.reduce((sum, item) => sum + (parseInt(item.piezas) || 0), 0);
  const valorTotal = filteredItems.reduce((sum, item) => sum + ((parseFloat(item.precio) || 0) * (parseInt(item.piezas) || 0)), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <h1 className="gradient-text" style={{ fontSize: '2.5rem', margin: 0 }}>{t('inv.title')}</h1>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
        <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '1rem', background: 'rgba(37, 99, 235, 0.1)', borderRadius: '12px', color: '#2563eb' }}>
            <ClipboardList size={28} />
          </div>
          <div>
            <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>{t('inv.kpiModels')}</span>
            <h3 style={{ fontSize: '1.75rem', margin: '0.25rem 0 0 0', fontWeight: 700 }}>{filteredItems.length}</h3>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '1rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '12px', color: '#10b981' }}>
            <Calendar size={28} />
          </div>
          <div>
            <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>{t('inv.kpiTotal')}</span>
            <h3 style={{ fontSize: '1.75rem', margin: '0.25rem 0 0 0', fontWeight: 700, color: '#10b981' }}>{totalPiezas}</h3>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '1rem', background: 'rgba(139, 92, 246, 0.1)', borderRadius: '12px', color: '#8b5cf6' }}>
            <span style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>$</span>
          </div>
          <div>
            <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>{t('inv.kpiValue')}</span>
            <h3 style={{ fontSize: '1.75rem', margin: '0.25rem 0 0 0', fontWeight: 700, color: '#8b5cf6' }}>
              {formatCurrency(valorTotal)}
            </h3>
          </div>
        </div>
      </div>

      {/* Search Input */}
      <div className="glass-card interactive-search-card" style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <Search size={20} color="#94a3b8" />
        <input 
          type="text" 
          placeholder={t('inv.search')}
          style={{ width: '100%', background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none' }}
          value={searchTerm} 
          onChange={(e) => setSearchTerm(e.target.value)} 
        />
        {searchTerm && (
          <button 
            type="button" 
            className="search-clear-btn" 
            onClick={() => setSearchTerm('')}
            title={isEn ? 'Clear search' : 'Limpiar búsqueda'}
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Table view */}
      <div className="glass-card">
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('inv.image')}</th>
                <th>{t('inv.code')}</th>
                <th>{t('inv.colors')}</th>
                <th>{t('inv.client')}</th>
                <th>{t('inv.orderNo')}</th>
                <th>{t('inv.price')}</th>
                <th>{t('inv.stock')}</th>
                <th>{t('inv.total')}</th>
                <th>{t('inv.date')}</th>
                {canEdit && <th>{t('inv.actions')}</th>}
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={canEdit ? 10 : 9} style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-secondary)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                      <ClipboardList size={48} color="#cbd5e1" />
                      <div>
                        <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>{t('inv.noResults')}</h4>
                        <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.9rem', maxWidth: '500px', lineHeight: '1.5' }}>
                          {t('inv.emptyDesc')}
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item, index) => {
                  const total = (parseFloat(item.precio) || 0) * (parseInt(item.piezas) || 0);
                  const imgSrc = getImgSrc(item.imagen);
                  return (
                    <tr key={item.id}>
                      <td>
                        {imgSrc ? (
                          <img 
                            src={imgSrc} 
                            alt={item.modelo} 
                            style={{ width: 44, height: 44, objectFit: 'contain', backgroundColor: '#ffffff', borderRadius: 8, border: '1px solid #e2e8f0', cursor: 'zoom-in' }} 
                            onClick={() => setSelectedImage(imgSrc)}
                          />
                        ) : (
                          <div style={{ width: 44, height: 44, background: '#f1f5f9', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <ImageIcon size={20} color="#cbd5e1" />
                          </div>
                        )}
                      </td>
                      <td style={{ fontWeight: 700 }}>{item.modelo}</td>
                      <td>
                        {(() => {
                          try {
                            const parsed = JSON.parse(item.color);
                            return Array.isArray(parsed) 
                              ? parsed.map(v => `${v.color} (${v.cantidad})`).join(', ') 
                              : (item.color || '-');
                          } catch (e) {
                            return item.color || '-';
                          }
                        })()}
                      </td>
                      <td>{item.cliente || '-'}</td>
                      <td><span className="badge badge-info">{item.no_orden || '-'}</span></td>
                      <td>{formatCurrency(item.precio || 0)}</td>
                      <td style={{ fontWeight: 700, fontSize: '1.1rem', color: '#10b981' }}>{item.piezas} {t('dash.status') === 'Status' ? 'pcs' : 'pzas'}</td>
                      <td style={{ fontWeight: 700, color: '#2563eb' }}>{formatCurrency(total)}</td>
                      <td>{displayDate(item.fecha_ingreso)}</td>
                      {canEdit && (
                        <td>
                          <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center' }}>
                            <div className="actions-dropdown-container">
                              <button 
                                className="actions-dropdown-btn" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveDropdownId(activeDropdownId === item.id ? null : item.id);
                                }}
                              >
                                {isEn ? 'Actions' : 'Acciones'} <ChevronDown size={14} />
                              </button>
                              
                              {activeDropdownId === item.id && (
                                <div className={`actions-dropdown-menu ${index >= filteredItems.length - 3 && filteredItems.length > 3 ? 'open-upward' : ''}`}>
                                  {/* Reprogramar */}
                                  <button className="actions-dropdown-item purple" onClick={() => { setActiveDropdownId(null); navigate('/cortes', { state: { reprogramItem: item } }); }}>
                                    <RefreshCw size={16} /> {isEn ? 'Reprogram' : 'Reprogramar'}
                                  </button>
                                  
                                  {/* Eliminar */}
                                  <button className="actions-dropdown-item danger" onClick={() => { setActiveDropdownId(null); handleDelete(item.id); }}>
                                    <Trash2 size={16} /> {isEn ? 'Delete from Stock' : 'Eliminar del stock'}
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Image Modal Zoom */}
      {selectedImage && (
        <div className="modal-overlay" onClick={() => setSelectedImage(null)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="glass-card" style={{ position: 'relative', padding: '0.5rem', maxWidth: '90vw', maxHeight: '90vh' }}>
            <img src={selectedImage} alt="" style={{ maxWidth: '100%', maxHeight: '80vh', borderRadius: '8px', objectFit: 'contain' }} />
            <button 
              className="btn btn-secondary" 
              onClick={() => setSelectedImage(null)}
              style={{ position: 'absolute', top: '10px', right: '10px', minWidth: 'auto', padding: '0.25rem 0.5rem' }}
            >
              {t('cortes.close')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
