import { useState, useEffect } from 'react';
import { 
  Plus, Search, Pencil, Trash2, CheckCircle, XCircle, 
  Archive, ArchiveRestore, Image as ImageIcon, AlertTriangle, AlertCircle, Calendar, X, Sparkles,
  MinusCircle, ChevronDown
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import axios from 'axios';
import API_URL from '../config';
import { toast, Swal } from '../utils/themeNotifications';
import SearchableSelect from '../components/SearchableSelect';

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

export default function Extras() {
  const { user } = useAuth();
  const { settings, t, formatCurrency } = useSettings();
  const isEn = settings?.language === 'en';
  const location = useLocation();
  const navigate = useNavigate();
  const userRole = (user?.role || user?.rol || '').toString().toLowerCase().trim();
  const canEdit = userRole === 'admin' || userRole === 'produccion1' || userRole === 'produccion2';
  
  const [orders, setOrders] = useState([]);
  const [activeDropdownId, setActiveDropdownId] = useState(null);
  const [maquileros, setMaquileros] = useState([]);
  const [inventario, setInventario] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [verArchivados, setVerArchivados] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  
  const [formData, setFormData] = useState({ 
    maquilero_id: '', 
    inventario_id: '', 
    cantidad: '', 
    precio_extra: '', 
    fecha_inicio: '', 
    fecha_fin: '' 
  });
  
  const [isShortcutMode, setIsShortcutMode] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);

  useEffect(() => {
    fetchOrders();
    fetchMaquileros();
    fetchInventario();

    // Lógica para el atajo desde Producción (Sparkles)
    const queryParams = new URLSearchParams(location.search);
    const isNewExtra = queryParams.get('newExtra') === 'true';
    if (isNewExtra && canEdit) {
      const inventarioId = queryParams.get('inventario_id') || '';
      const cantidad = queryParams.get('cantidad') || '';
      const fechaInicio = queryParams.get('fecha_inicio') || new Date().toISOString().split('T')[0];
      const fechaFin = queryParams.get('fecha_fin') || '';
      
      setFormData({
        maquilero_id: '',
        inventario_id: inventarioId,
        cantidad: cantidad,
        precio_extra: '',
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin
      });
      setIsShortcutMode(true);
      setIsModalOpen(true);
      
      // Limpiar la URL para evitar que se vuelva a abrir al recargar
      window.history.replaceState({}, document.title, "/extras");
    } else {
      setIsShortcutMode(false);
    }

    const interval = setInterval(() => {
      fetchOrders();
      fetchMaquileros();
      fetchInventario();
    }, 2000); // Auto-refresca cada 2 segundos

    return () => clearInterval(interval);
  }, [verArchivados, location, canEdit]);

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

  const fetchOrders = async () => {
    try {
      const res = await axios.get(`${API}/api/extras?verArchivados=${verArchivados}`);
      setOrders(res.data);
    } catch (e) { console.error(e); }
  };

  const fetchMaquileros = async () => {
    try {
      const res = await axios.get(`${API}/api/maquileros`);
      setMaquileros(res.data);
    } catch (e) { console.error(e); }
  };

  const fetchInventario = async () => {
    try {
      const res = await axios.get(`${API}/api/inventario`);
      setInventario(res.data);
    } catch (e) { console.error(e); }
  };

  const handleSelectProduct = (e) => {
    const invId = e.target.value;
    const item = inventario.find(i => i.id === parseInt(invId));
    setFormData(prev => ({
      ...prev,
      inventario_id: invId,
      cantidad: item ? (item.piezas_en_proceso || 0) : ''
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/api/extras`, formData);
      setIsModalOpen(false);
      setFormData({ 
        maquilero_id: '', 
        inventario_id: '', 
        cantidad: '', 
        precio_extra: '', 
        fecha_inicio: '', 
        fecha_fin: '' 
      });
      setIsShortcutMode(false);
      fetchOrders();
      toast.success(isEn ? 'Extra work created successfully' : 'Trabajo extra creado correctamente', { theme: 'dark' });
    } catch (e) {
      const errorMsg = e.response?.data?.error;
      toast.error(t('prod.alertCreateError') + (errorMsg || e.message), { theme: 'dark' });
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${API}/api/produccion/${editingOrder.id}`, formData);
      toast.success(t('prod.alertUpdateSuccess'), { theme: 'dark' });
      setIsEditModalOpen(false);
      setEditingOrder(null);
      fetchOrders();
    } catch (e) {
      const errorMsg = e.response?.data?.error;
      toast.error(t('prod.alertUpdateError') + (errorMsg || e.message), { theme: 'dark' });
    }
  };

  const handleTerminar = (id) => {
    Swal.fire({
      title: isEn ? 'Finish Order?' : '¿Terminar orden?',
      text: t('prod.confirmFinish'),
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3b82f6',
      cancelButtonColor: '#64748b',
      confirmButtonText: isEn ? 'Yes, finish' : 'Sí, terminar',
      cancelButtonText: isEn ? 'Cancel' : 'Cancelar',
      background: '#1e293b',
      color: '#f8fafc'
    }).then((result) => {
      if (result.isConfirmed) {
        navigate(`/pagos?orden=${id}&tipo=completo`);
      }
    });
  };

  const handleTerminarParcial = (id) => {
    Swal.fire({
      title: isEn ? 'Partial Finish?' : '¿Terminar parcial?',
      text: t('prod.confirmPartial'),
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3b82f6',
      cancelButtonColor: '#64748b',
      confirmButtonText: isEn ? 'Yes, partial' : 'Sí, abonar/parcial',
      cancelButtonText: isEn ? 'Cancel' : 'Cancelar',
      background: '#1e293b',
      color: '#f8fafc'
    }).then((result) => {
      if (result.isConfirmed) {
        navigate(`/pagos?orden=${id}&tipo=abono`);
      }
    });
  };

  const handleCancelar = (id) => {
    Swal.fire({
      title: isEn ? 'Cancel Order?' : '¿Cancelar orden?',
      text: t('prod.confirmCancel2'),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: isEn ? 'Yes, cancel' : 'Sí, cancelar',
      cancelButtonText: isEn ? 'Cancel' : 'Cancelar',
      background: '#1e293b',
      color: '#f8fafc'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await axios.put(`${API}/api/produccion/${id}`, { estado: 'Cancelado', fecha_fin: new Date().toISOString().split('T')[0] });
          toast.success(isEn ? 'Order cancelled' : 'Orden cancelada', { theme: 'dark' });
          fetchOrders();
        } catch (e) {
          toast.error(t('prod.alertGenericError'), { theme: 'dark' });
        }
      }
    });
  };

  const handleArchivar = async (id, currentStatus) => {
    try {
      await axios.put(`${API}/api/produccion/${id}/archivo`, { archivado: !currentStatus });
      toast.success(isEn ? 'Archive status updated' : 'Estado de archivo actualizado', { theme: 'dark' });
      fetchOrders();
    } catch (e) {
      toast.error(t('prod.alertArchiveError'), { theme: 'dark' });
    }
  };

  const handleDelete = (id) => {
    Swal.fire({
      title: isEn ? 'Delete extra work?' : '¿Eliminar trabajo extra?',
      text: t('prod.confirmDelete'),
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
          await axios.delete(`${API}/api/produccion/${id}`);
          toast.success(isEn ? 'Deleted successfully' : 'Eliminado correctamente', { theme: 'dark' });
          fetchOrders();
        } catch (e) {
          toast.error(e.response?.data?.error || t('prod.alertDeleteError'), { theme: 'dark' });
        }
      }
    });
  };

  const handleRecibidasBlur = async (id, val) => {
    try {
      const cantidad_recibida = val === '' ? null : parseInt(val);
      await axios.put(`${API}/api/produccion/${id}`, { cantidad_recibida });
      fetchOrders();
    } catch (e) { console.error(e); }
  };

  const handleApplyAdjustment = async (id, value) => {
    if (!value) return;
    const [tipo, porcentaje] = value.split('-');
    try {
      await axios.put(`${API}/api/produccion/${id}/ajuste`, { tipo, porcentaje: parseInt(porcentaje) });
      toast.success(isEn ? 'Adjustment applied' : 'Ajuste aplicado', { theme: 'dark' });
      fetchOrders();
    } catch (e) {
      toast.error(t('prod.alertAdjustError'), { theme: 'dark' });
    }
  };

  const handleAddDay = (id) => {
    Swal.fire({
      title: isEn ? 'Add extension' : 'Agregar prórroga',
      text: t('prod.promptDays'),
      input: 'number',
      inputValue: '1',
      inputAttributes: {
        min: 1,
        step: 1
      },
      showCancelButton: true,
      confirmButtonText: isEn ? 'Add' : 'Agregar',
      cancelButtonText: isEn ? 'Cancel' : 'Cancelar',
      confirmButtonColor: '#3b82f6',
      cancelButtonColor: '#64748b',
      background: '#1e293b',
      color: '#f8fafc',
      inputValidator: (value) => {
        if (!value || isNaN(value) || parseInt(value) <= 0) {
          return isEn ? 'You must enter a valid number of days!' : '¡Debes ingresar un número válido de días!';
        }
      }
    }).then(async (result) => {
      if (result.isConfirmed) {
        const dias = parseInt(result.value);
        try {
          await axios.put(`${API}/api/produccion/${id}/agregar-dia`, { dias });
          toast.success(isEn ? 'Days added successfully' : 'Días agregados correctamente', { theme: 'dark' });
          fetchOrders();
        } catch (e) {
          toast.error(t('prod.alertAddDayError'), { theme: 'dark' });
        }
      }
    });
  };

  const filteredOrders = orders.filter(o => 
    (o.maquilero_nombre || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (o.producto_modelo || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const cantValue = parseFloat(formData.cantidad) || 0;
  const priceValue = parseFloat(formData.precio_extra) || 0;
  const calculatedTotal = cantValue * priceValue;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <h1 className="gradient-text" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '2.5rem', margin: 0 }}>
          <Sparkles size={32} className="text-pink-500 animate-pulse" />
          {t('nav.extras')}
        </h1>
        <div style={{ display: 'flex', gap: '1rem' }}>
          {canEdit && (
            <button className="btn btn-primary" onClick={() => {
              setFormData({ maquilero_id: '', inventario_id: '', cantidad: '', precio_extra: '', fecha_inicio: new Date().toISOString().split('T')[0], fecha_fin: '' });
              setIsShortcutMode(false);
              setIsModalOpen(true);
            }}>
              <Plus size={20} /> {t('prod.new')}
            </button>
          )}
        </div>
      </div>

      <div className="glass-card interactive-search-card" style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <Search size={20} color="#94a3b8" />
        <input 
          type="text" 
          className="form-input" 
          style={{ border: 'none', background: 'transparent', padding: '0.25rem 0.5rem', outline: 'none' }} 
          placeholder={t('prod.search')} 
          value={searchTerm} 
          onChange={e => setSearchTerm(e.target.value)} 
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

      <div className="glass-card">
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('prod.folio')}</th>
                <th>{t('prod.tailor')}</th>
                <th>{t('prod.model')}</th>
                <th>{t('prod.pieces')} ({t('dash.status') === 'Status' ? 'Sent' : 'Env.'})</th>
                <th>{t('prod.pieces')} ({t('dash.status') === 'Status' ? 'Recv.' : 'Rec.'})</th>
                <th>{t('prod.startDate')} / {t('prod.endDate')}</th>
                <th>Costo Extra Unit.</th>
                <th>Pago Total Extra</th>
                <th>{t('prod.paid')}</th>
                <th>{t('prod.status')}</th>
                <th>{t('prod.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 ? (
                <tr><td colSpan="11" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>{t('prod.noResults')}</td></tr>
              ) : (
                filteredOrders.map((o, index) => {
                  const pagado = o.pagado || 0;
                  const prodImg = getImgSrc(o.producto_imagen);
                  const isCancelado = o.estado === 'Cancelado';
                  const isTerminado = o.estado === 'Terminado';
                  
                  let rowClass = 'row-normal'; 
                  let delayIcon = null;
                  
                  if (isCancelado) {
                    rowClass = 'row-cancelado';
                  } else if (!isTerminado && o.fecha_fin) {
                    const now = new Date();
                    const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
                    const dDate = new Date(o.fecha_fin);
                    const deliveryDate = Date.UTC(dDate.getUTCFullYear(), dDate.getUTCMonth(), dDate.getUTCDate());
                    
                    const diffMs = today - deliveryDate;
                    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                    
                    if (diffDays >= 1 && diffDays <= 3) {
                      rowClass = 'row-warning';
                      delayIcon = <AlertTriangle size={16} color="#ca8a04" title={`Retraso: ${diffDays} día(s)`} />;
                    } else if (diffDays >= 4) {
                      rowClass = 'row-danger';
                      delayIcon = <AlertCircle size={16} color="#dc2626" title={`Retraso: ${diffDays} día(s)`} />;
                    }
                  }
                  
                  return (
                    <tr key={o.id} className={rowClass} style={{ opacity: isCancelado ? 0.6 : 1 }}>
                      <td>#{orders.length - orders.findIndex(item => item.id === o.id)}</td>
                      <td style={{ fontWeight: 600 }}>{o.maquilero_nombre}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          {prodImg ? (
                            <img 
                              src={prodImg} 
                              alt="" 
                              style={{ width: 32, height: 32, borderRadius: 4, objectFit: 'contain', backgroundColor: '#ffffff', cursor: 'zoom-in' }} 
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
                          key={`${o.id}-${o.cantidad_recibida}`}
                          type="number" 
                          className="form-input" 
                          style={{ width: '80px', padding: '0.25rem 0.5rem', textAlign: 'center' }}
                          defaultValue={o.cantidad_recibida ?? ''}
                          onBlur={(e) => handleRecibidasBlur(o.id, e.target.value)}
                          disabled={!canEdit || o.estado === 'Terminado' || o.estado === 'Cancelado'}
                        />
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', fontSize: '0.75rem', gap: '2px' }}>
                          <span>{t('prod.startPrefix')}: {displayDate(o.fecha_inicio)}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <span style={{ fontWeight: 700 }}>{t('prod.endPrefix')}: {displayDate(o.fecha_fin)}</span>
                            {delayIcon}
                          </div>
                        </div>
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 600 }}>{formatCurrency(o.precio_unitario)}</td>
                      <td style={{ minWidth: '130px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span style={{ fontWeight: 700, fontSize: '1rem' }}>{formatCurrency(o.precio_total)}</span>
                          {o.ajuste_tipo && o.ajuste_tipo !== 'ninguno' && (
                            <span style={{ fontSize: '10px', padding: '2px 4px', borderRadius: '4px', width: 'fit-content', background: o.ajuste_tipo === 'bono' ? 'var(--badge-bono-bg)' : 'var(--badge-desc-bg)', color: o.ajuste_tipo === 'bono' ? 'var(--badge-bono-text)' : 'var(--badge-desc-text)', fontWeight: 600 }}>
                              {o.ajuste_tipo === 'bono' ? (t('prod.bonuses') === 'Bonuses' ? 'BONUS' : 'BONO') : (t('prod.discounts') === 'Discounts' ? 'DISC' : 'DESC')} {o.ajuste_porcentaje}%
                            </span>
                          )}
                          {canEdit && (o.estado === 'En proceso' || o.estado === 'Terminado Parcial') && (
                            <select className="form-input" style={{ width: '100%', padding: '2px', fontSize: '10px', height: '24px' }} value={o.ajuste_tipo === 'ninguno' ? '' : `${o.ajuste_tipo}-${o.ajuste_porcentaje}`} onChange={(e) => handleApplyAdjustment(o.id, e.target.value)}>
                              <option value="">{t('prod.adjust')}</option>
                              <option value="ninguno-0">{t('prod.noAdjust')}</option>
                              <optgroup label={t('prod.bonuses')}>
                                <option value="bono-5">{t('prod.bonuses') === 'Bonuses' ? 'Bonus +5%' : 'Bono +5%'}</option>
                                <option value="bono-10">{t('prod.bonuses') === 'Bonuses' ? 'Bonus +10%' : 'Bono +10%'}</option>
                                <option value="bono-15">{t('prod.bonuses') === 'Bonuses' ? 'Bonus +15%' : 'Bono +15%'}</option>
                                <option value="bono-20">{t('prod.bonuses') === 'Bonuses' ? 'Bonus +20%' : 'Bono +20%'}</option>
                              </optgroup>
                              <optgroup label={t('prod.discounts')}>
                                <option value="descuento-5">{t('prod.discounts') === 'Discounts' ? 'Disc -5%' : 'Desc -5%'}</option>
                                <option value="descuento-10">{t('prod.discounts') === 'Discounts' ? 'Disc -10%' : 'Desc -10%'}</option>
                                <option value="descuento-15">{t('prod.discounts') === 'Discounts' ? 'Disc -15%' : 'Desc -15%'}</option>
                                <option value="descuento-20">{t('prod.discounts') === 'Discounts' ? 'Disc -20%' : 'Desc -20%'}</option>
                              </optgroup>
                            </select>
                          )}
                        </div>
                      </td>
                      <td style={{ color: '#10b981', fontWeight: 600 }}>{formatCurrency(pagado)}</td>
                      <td>
                        <span className={`badge ${
                          o.estado === 'Terminado' ? 'badge-success' : 
                          o.estado === 'Terminado Parcial' ? 'badge-partial' : 
                          o.estado === 'Cancelado' ? 'badge-danger' : 'badge-warning'
                        }`}>
                          {o.estado === 'Terminado' ? t('prod.statusFinished') : 
                           o.estado === 'Terminado Parcial' ? t('prod.statusPartial') : 
                           o.estado === 'Cancelado' ? t('prod.statusCanceled') : t('prod.statusInProgress')}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center' }}>
                          {canEdit ? (
                            <div className="actions-dropdown-container">
                              <button 
                                className="actions-dropdown-btn" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveDropdownId(activeDropdownId === o.id ? null : o.id);
                                }}
                              >
                                {isEn ? 'Actions' : 'Acciones'} <ChevronDown size={14} />
                              </button>
                              
                              {activeDropdownId === o.id && (
                                <div className={`actions-dropdown-menu ${index >= filteredOrders.length - 3 && filteredOrders.length > 3 ? 'open-upward' : ''}`}>
                                  {/* Acciones principales en proceso */}
                                  {(o.estado === 'En proceso' || o.estado === 'Terminado Parcial') && (
                                    <>
                                      <button className="actions-dropdown-item success" onClick={() => { setActiveDropdownId(null); handleTerminar(o.id); }}>
                                        <CheckCircle size={16} /> {isEn ? 'Finish Order' : 'Terminar Orden'}
                                      </button>
                                      <button className="actions-dropdown-item warning" onClick={() => { setActiveDropdownId(null); handleTerminarParcial(o.id); }}>
                                        <MinusCircle size={16} /> {t('prod.tooltipPartial') || (isEn ? 'Partial Pay' : 'Pago Parcial')}
                                      </button>
                                      <button className="actions-dropdown-item purple" onClick={() => { setActiveDropdownId(null); handleAddDay(o.id); }}>
                                        <Calendar size={16} /> {isEn ? 'Add Extension' : 'Agregar Prórroga'}
                                      </button>
                                      <button className="actions-dropdown-item danger" onClick={() => { setActiveDropdownId(null); handleCancelar(o.id); }}>
                                        <XCircle size={16} /> {isEn ? 'Cancel Order' : 'Cancelar Orden'}
                                      </button>
                                      <div style={{ height: '1px', background: 'var(--border-color)', margin: '4px 0' }}></div>
                                    </>
                                  )}
                                  
                                  {/* Acciones generales siempre disponibles para editores */}
                                  <button className="actions-dropdown-item" onClick={() => { 
                                    setActiveDropdownId(null);
                                    setEditingOrder(o); 
                                    setFormData({ 
                                      maquilero_id: o.maquilero_id, 
                                      inventario_id: o.inventario_id || '', 
                                      cantidad: o.cantidad,
                                      precio_extra: o.precio_extra || '',
                                      fecha_inicio: formatDate(o.fecha_inicio), 
                                      fecha_fin: formatDate(o.fecha_fin) 
                                    }); 
                                    setIsEditModalOpen(true); 
                                  }}>
                                    <Pencil size={16} /> {isEn ? 'Edit' : 'Editar'}
                                  </button>
                                  <button className="actions-dropdown-item danger" onClick={() => { setActiveDropdownId(null); handleDelete(o.id); }}>
                                    <Trash2 size={16} /> {isEn ? 'Delete' : 'Eliminar'}
                                  </button>
                                </div>
                              )}
                            </div>
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

      {/* Modal Nueva / Editar Orden Extra */}
      {(isModalOpen || isEditModalOpen) && (
        <div className="modal-overlay">
          <div className="modal-content glass-card" style={{ maxWidth: '640px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Sparkles size={20} className="text-pink-500 animate-pulse" />
                {isEditModalOpen ? (canEdit ? 'Editar Trabajo Extra' : 'Detalles de Extra') : 'Nuevo Trabajo Extra'}
              </h2>
              <button className="btn-icon" onClick={() => { setIsModalOpen(false); setIsEditModalOpen(false); setIsShortcutMode(false); }}><X size={24} /></button>
            </div>
            <form onSubmit={isEditModalOpen ? handleEditSubmit : handleSubmit}>
              <div className="form-group">
                <label className="form-label">{t('prod.selectMaquilero')}</label>
                <SearchableSelect
                  options={[...maquileros].sort((a,b) => a.nombre.localeCompare(b.nombre))}
                  value={formData.maquilero_id}
                  onChange={id => setFormData({...formData, maquilero_id: id})}
                  placeholder={t('prod.selectDefault')}
                  labelKey="nombre"
                  valueKey="id"
                  disabled={!canEdit && isEditModalOpen}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">{t('prod.selectProduct')}</label>
                <SearchableSelect
                  options={[...inventario]
                    .sort((a,b) => (a.modelo || '').localeCompare(b.modelo || '', undefined, {numeric: true}))
                    .map(i => ({
                      id: i.id,
                      modeloDisplay: `${i.modelo} - ${i.numero} ${i.es_reprogramacion === 1 ? t('prod.reprogrammedLabel') : ''} (${i.piezas_en_proceso} pzas)`
                    }))
                  }
                  value={formData.inventario_id}
                  onChange={id => handleSelectProduct({ target: { value: id } })}
                  placeholder={t('prod.selectDefault')}
                  labelKey="modeloDisplay"
                  valueKey="id"
                  disabled={(!canEdit && isEditModalOpen) || (isShortcutMode && isModalOpen)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">{t('prod.pieces')} Env.</label>
                  <input 
                    type="number" 
                    required 
                    className="form-input" 
                    value={formData.cantidad} 
                    onChange={e => setFormData({...formData, cantidad: e.target.value})}
                    disabled={!canEdit && isEditModalOpen}
                    placeholder="Cantidad de piezas"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Precio Extra por Pieza ($) *</label>
                  <div className="input-group-with-prefix">
                    <span className="input-prefix-icon">$</span>
                    <input 
                      type="number" 
                      step="0.01" 
                      min="0"
                      required 
                      className="form-input" 
                      value={formData.precio_extra} 
                      onChange={e => setFormData({...formData, precio_extra: e.target.value})}
                      disabled={!canEdit && isEditModalOpen}
                      placeholder="Tarifa extra ej: 5.00"
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">{t('prod.startDateLabel')}</label>
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
                  <label className="form-label">{t('prod.endDateLabel')}</label>
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

              {/* Cálculo en vivo de Pago Total Estimado */}
              {formData.cantidad && formData.precio_extra && (
                <div className="glass-card" style={{ marginTop: '1.5rem', background: 'rgba(236, 72, 153, 0.05)', border: '1px solid rgba(236, 72, 153, 0.2)', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Pago total de extra estimado:</span>
                  <span style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#ec4899' }}>{formatCurrency(calculatedTotal)}</span>
                </div>
              )}

              {canEdit && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => { setIsModalOpen(false); setIsEditModalOpen(false); setIsShortcutMode(false); }}>{t('prod.modalCancel')}</button>
                  <button type="submit" className="btn btn-primary" style={{ background: 'linear-gradient(135deg, #ec4899, #8b5cf6)', border: 'none' }}>
                    {isEditModalOpen ? t('prod.modalUpdate') : t('prod.modalCreate')}
                  </button>
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
