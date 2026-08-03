import React, { Component, useState, useEffect } from 'react';
import { 
  Plus, Search, Pencil, Trash2, CheckCircle, XCircle, 
  Archive, ArchiveRestore, Image as ImageIcon, AlertTriangle, AlertCircle, Calendar, X, Sparkles,
  MinusCircle, MessageSquare, Split, ChevronDown
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

function Produccion() {
  const { user } = useAuth();
  const { settings, t, formatCurrency } = useSettings();
  const isEn = settings?.language === 'en';
  const location = useLocation();
  const navigate = useNavigate();
  const userRole = (user?.role || user?.rol || '').toString().toLowerCase().trim();
  const canEdit = userRole === 'admin' || userRole === 'produccion1' || userRole === 'produccion2';
  const canEditPrice = userRole === 'admin' || userRole === 'inventario1' || userRole === 'inventario';
  const [orders, setOrders] = useState([]);
  const [activeDropdownId, setActiveDropdownId] = useState(null);
  const [maquileros, setMaquileros] = useState([]);
  const [inventario, setInventario] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSplitModalOpen, setIsSplitModalOpen] = useState(false);
  const [splitOrder, setSplitOrder] = useState(null);
  const [splitData, setSplitData] = useState({ cantidad_entregada: '', nuevo_maquilero_id: '' });
  
  const [obsModalOpen, setObsModalOpen] = useState(false);
  const [obsText, setObsText] = useState("");
  const [obsOrderId, setObsOrderId] = useState(null);

  const handleOpenObs = (o) => {
    setObsOrderId(o.id);
    setObsText(o.observaciones || "");
    setObsModalOpen(true);
  };

  const handleSaveObs = async () => {
    try {
      const res = await axios.put(`${API}/api/produccion/${obsOrderId}/observaciones`, {
        observaciones: obsText
      }, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      if (res.data.success) {
        setObsModalOpen(false);
        toast.success("Observaciones guardadas", { theme: 'dark' });
        fetchOrders();
      }
    } catch (e) {
      console.error(e);
      toast.error("Error al guardar observaciones", { theme: 'dark' });
    }
  };

  const [recepcionModalOpen, setRecepcionModalOpen] = useState(false);
  const [recepcionOrder, setRecepcionOrder] = useState(null);
  const [recepcionTallas, setRecepcionTallas] = useState({});

  const parseColorAndTallasStructure = (rawColor, defaultQty = 0) => {
    if (!rawColor) return { 'GENERAL': { 'TOTAL': defaultQty } };
    let parsed = rawColor;
    if (typeof rawColor === 'string') {
      try {
        parsed = JSON.parse(rawColor);
      } catch (e) {
        const colName = rawColor.trim() || 'GENERAL';
        return { [colName]: { 'TOTAL': defaultQty } };
      }
    }
    const grid = {};
    if (Array.isArray(parsed)) {
      parsed.forEach((item, index) => {
        if (typeof item === 'object' && item !== null) {
          const colorName = item.color || item.nombre_color || item.name || `Color ${index + 1}`;
          grid[colorName] = {};
          const tallasObj = item.tallas || item.variantes || item.tallas_cantidades;
          if (tallasObj && typeof tallasObj === 'object' && !Array.isArray(tallasObj)) {
            Object.entries(tallasObj).forEach(([sz, qty]) => {
              grid[colorName][sz] = parseInt(qty) || 0;
            });
          } else {
            const qty = parseInt(item.cantidad ?? item.piezas ?? item.total ?? defaultQty) || 0;
            grid[colorName]['CANTIDAD'] = qty;
          }
        } else if (typeof item === 'string' || typeof item === 'number') {
          grid[String(item)] = { 'CANTIDAD': defaultQty };
        }
      });
    } else if (typeof parsed === 'object' && parsed !== null) {
      const entries = Object.entries(parsed);
      if (entries.length === 0) return { 'GENERAL': { 'TOTAL': defaultQty } };
      const isNested = entries.some(([_, val]) => typeof val === 'object' && val !== null && !Array.isArray(val));
      if (isNested) {
        entries.forEach(([col, tallasObj]) => {
          grid[col] = {};
          if (typeof tallasObj === 'object' && tallasObj !== null && !Array.isArray(tallasObj)) {
            Object.entries(tallasObj).forEach(([sz, qty]) => {
              grid[col][sz] = parseInt(qty) || 0;
            });
          } else {
            grid[col]['CANTIDAD'] = parseInt(tallasObj) || 0;
          }
        });
      } else {
        const isSizeKeys = entries.every(([k]) => /^\d+$|^(XS|S|M|L|XL|2XL|3XL|4XL|XXL|EG|CH|G|MED|GDE)$/i.test(k.trim()));
        if (isSizeKeys) {
          grid['GENERAL'] = {};
          entries.forEach(([sz, qty]) => {
            grid['GENERAL'][sz] = parseInt(qty) || 0;
          });
        } else {
          entries.forEach(([col, qty]) => {
            grid[col] = { 'CANTIDAD': parseInt(qty) || 0 };
          });
        }
      }
    }
    return Object.keys(grid).length > 0 ? grid : { 'GENERAL': { 'TOTAL': defaultQty } };
  };

  const handleOpenRecepcionModal = (order) => {
    setRecepcionOrder(order);
    const maxGrid = parseColorAndTallasStructure(order.producto_color, order.cantidad);

    let existingRecibidas = null;
    try {
      if (order.tallas_recibidas) {
        const obj = typeof order.tallas_recibidas === 'string' ? JSON.parse(order.tallas_recibidas) : order.tallas_recibidas;
        if (typeof obj === 'object' && obj !== null && Object.keys(obj).length > 0) {
          existingRecibidas = obj;
        }
      }
    } catch (e) {}

    let initialGrid = {};
    Object.entries(maxGrid).forEach(([colKey, tallasObj]) => {
      initialGrid[colKey] = {};
      Object.entries(tallasObj).forEach(([szKey, maxQty]) => {
        let currentVal = 0;
        if (existingRecibidas) {
          if (existingRecibidas[colKey] && existingRecibidas[colKey][szKey] !== undefined) {
            currentVal = parseInt(existingRecibidas[colKey][szKey]) || 0;
          } else if (existingRecibidas[szKey] !== undefined) {
            currentVal = parseInt(existingRecibidas[szKey]) || 0;
          }
        } else if (order.cantidad_recibida !== null && order.cantidad_recibida > 0) {
          currentVal = maxQty;
        } else {
          currentVal = 0;
        }
        initialGrid[colKey][szKey] = currentVal;
      });
    });

    setRecepcionTallas(initialGrid);
    setRecepcionModalOpen(true);
  };

  const handleSaveRecepcion = async () => {
    if (!recepcionOrder) return;
    let totalSum = 0;
    Object.values(recepcionTallas).forEach(colorObj => {
      if (typeof colorObj === 'object' && colorObj !== null) {
        Object.values(colorObj).forEach(val => {
          totalSum += (parseInt(val) || 0);
        });
      } else {
        totalSum += (parseInt(colorObj) || 0);
      }
    });

    try {
      const res = await axios.put(`${API}/api/produccion/${recepcionOrder.id}/recepcion`, {
        cantidad_recibida: totalSum,
        tallas_recibidas: recepcionTallas
      }, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

      if (res.data.success) {
        toast.success(isEn ? `Received pieces updated (${totalSum} pz). Available in Truck!` : `Piezas recolectadas actualizadas (${totalSum} pz). Liberadas en Camión!`, { theme: 'dark' });
        setRecepcionModalOpen(false);
        setRecepcionOrder(null);
        fetchOrders();
      }
    } catch (e) {
      console.error(e);
      toast.error(isEn ? 'Error saving received pieces' : 'Error al guardar recepción de piezas', { theme: 'dark' });
    }
  };

  const handleMarcarTodoRecibido = () => {
    if (!recepcionOrder) return;
    const maxGrid = parseColorAndTallasStructure(recepcionOrder.producto_color, recepcionOrder.cantidad);
    setRecepcionTallas(maxGrid);
  };

  const handleLimpiarRecepcion = () => {
    if (!recepcionOrder) return;
    const maxGrid = parseColorAndTallasStructure(recepcionOrder.producto_color, recepcionOrder.cantidad);
    const clearedGrid = {};
    Object.entries(maxGrid).forEach(([colKey, tallasObj]) => {
      clearedGrid[colKey] = {};
      Object.entries(tallasObj).forEach(([szKey]) => {
        clearedGrid[colKey][szKey] = 0;
      });
    });
    setRecepcionTallas(clearedGrid);
  };

  const [verArchivados, setVerArchivados] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [activeTab, setActiveTab] = useState('proceso'); // 'proceso', 'recepcion' o 'terminado'
  
  const [formData, setFormData] = useState({ maquilero_id: '', inventario_id: '', fecha_inicio: '', fecha_fin: '', precio_unitario: '', cantidad: '' });
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

    const interval = setInterval(() => {
      fetchOrders();
      fetchMaquileros();
      fetchInventario();
    }, 2000); // Auto-refresca cada 2 segundos en segundo plano

    return () => clearInterval(interval);
  }, [verArchivados, location]);

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
      const res = await axios.get(`${API}/api/produccion?verArchivados=${verArchivados}`);
      setOrders(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error(e);
      setOrders([]);
    }
  };

  const fetchMaquileros = async () => {
    try {
      const res = await axios.get(`${API}/api/maquileros`);
      setMaquileros(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error(e);
      setMaquileros([]);
    }
  };

  const fetchInventario = async () => {
    try {
      const res = await axios.get(`${API}/api/inventario`);
      setInventario(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error(e);
      setInventario([]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const item = inventario.find(i => i.id === parseInt(formData.inventario_id));
    const cantidadFinal = item?.piezas_en_proceso || 0;
    const total = (item?.precio || 0) * cantidadFinal;
    
    try {
      await axios.post(`${API}/api/produccion`, { ...formData, cantidad: cantidadFinal, precio_total: total });
      setIsModalOpen(false);
      setFormData({ maquilero_id: '', inventario_id: '', fecha_inicio: '', fecha_fin: '', precio_unitario: '', cantidad: '' });
      toast.success("Orden creada con éxito", { theme: 'dark' });
      fetchOrders();
    } catch (e) { 
      const errorMsg = e.response?.data?.error;
      if (errorMsg === 'errorDuplicate') {
        toast.error(t('prod.errorDuplicate'), { theme: 'dark' });
      } else {
        toast.error(t('prod.alertCreateError') + (errorMsg || e.message), { theme: 'dark' });
      }
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      // Al editar, NO recalculamos cantidad ni precio desde el inventario, 
      // ya que esos datos son para órdenes NUEVAS.
      // Solo enviamos lo que está en el formulario (maquilero, fechas, etc)
      await axios.put(`${API}/api/produccion/${editingOrder.id}`, formData);
      toast.success(t('prod.alertUpdateSuccess'), { theme: 'dark' });
      setIsEditModalOpen(false);
      setEditingOrder(null);
      fetchOrders();
    } catch (e) { 
      const errorMsg = e.response?.data?.error;
      if (errorMsg === 'errorDuplicate') {
        toast.error(t('prod.errorDuplicate'), { theme: 'dark' });
      } else {
        toast.error(t('prod.alertUpdateError') + (errorMsg || e.message), { theme: 'dark' });
      }
    }
  };

  const openSplit = (order) => {
    setSplitOrder(order);
    setSplitData({ cantidad_entregada: '', nuevo_maquilero_id: '', estado_original: 'Terminado' });
    setIsSplitModalOpen(true);
  };

  const handleSplitSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/api/produccion/${splitOrder.id}/dividir`, splitData);
      toast.success('Orden dividida exitosamente.', { theme: 'dark' });
      setIsSplitModalOpen(false);
      setSplitOrder(null);
      fetchOrders();
    } catch (e) {
      toast.error('Error al dividir orden: ' + (e.response?.data?.error || e.message), { theme: 'dark' });
    }
  };


  const handleTerminar = async (id) => {
    const order = orders.find(o => o.id === id);
    if (!order) return;

    const totalCost = parseFloat(order.precio_total) || 0;
    const paidAmount = parseFloat(order.pagado) || 0;
    const isAlreadyFullyPaid = paidAmount >= totalCost;

    if (isAlreadyFullyPaid) {
      Swal.fire({
        title: isEn ? 'Order is already paid' : 'Orden ya pagada',
        text: isEn 
          ? `This order has already been fully paid ($${paidAmount.toFixed(2)} / $${totalCost.toFixed(2)}). Do you want to mark it as Finished?`
          : `Esta orden ya está completamente pagada ($${paidAmount.toFixed(2)} / $${totalCost.toFixed(2)}). ¿Deseas marcarla como Terminada directamente?`,
        icon: 'success',
        showCancelButton: true,
        confirmButtonColor: '#10b981',
        cancelButtonColor: '#64748b',
        confirmButtonText: isEn ? 'Yes, finish directly' : 'Sí, terminar directamente',
        cancelButtonText: t('maq.cancel') || 'Cancelar',
        background: '#1e293b',
        color: '#f8fafc'
      }).then(async (result) => {
        if (result.isConfirmed) {
          try {
            await axios.put(`${API}/api/produccion/${id}`, { estado: 'Terminado' });
            toast.success(isEn ? 'Order finished successfully' : 'Orden terminada correctamente', { theme: 'dark' });
            fetchOrders();
          } catch (e) {
            toast.error(isEn ? 'Error finishing order' : 'Error al terminar la orden: ' + (e.response?.data?.error || e.message), { theme: 'dark' });
          }
        }
      });
    } else {
      const pendingAmount = totalCost - paidAmount;
      Swal.fire({
        title: t('prod.confirmFinish') || '¿Marcar esta orden como terminada?',
        text: isEn
          ? `Pending balance: $${pendingAmount.toFixed(2)}. Do you want to register the final payment or mark it as finished directly?`
          : `Saldo pendiente: $${pendingAmount.toFixed(2)}. ¿Deseas registrar la liquidación o marcarla como terminada directamente sin registrar pago ahora?`,
        icon: 'question',
        showCancelButton: true,
        showDenyButton: true,
        confirmButtonColor: '#10b981',
        denyButtonColor: '#3b82f6',
        cancelButtonColor: '#64748b',
        confirmButtonText: isEn ? 'Go to Register Payment' : 'Ir a Registrar Pago',
        denyButtonText: isEn ? 'Finish Directly (Without Payment)' : 'Terminar Directamente (Sin Pago)',
        cancelButtonText: t('maq.cancel') || 'Cancelar',
        background: '#1e293b',
        color: '#f8fafc'
      }).then(async (result) => {
        if (result.isConfirmed) {
          navigate(`/pagos?orden=${id}&tipo=completo`);
        } else if (result.isDenied) {
          try {
            await axios.put(`${API}/api/produccion/${id}`, { estado: 'Terminado' });
            toast.success(isEn ? 'Order finished successfully' : 'Orden terminada correctamente', { theme: 'dark' });
            fetchOrders();
          } catch (e) {
            toast.error(isEn ? 'Error finishing order' : 'Error al terminar la orden: ' + (e.response?.data?.error || e.message), { theme: 'dark' });
          }
        }
      });
    }
  };

  const handleTerminarParcial = async (id) => {
    Swal.fire({
      title: t('prod.confirmPartial'),
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#eab308',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Sí, marcar pago parcial',
      cancelButtonText: 'Cancelar',
      background: '#1e293b',
      color: '#f8fafc'
    }).then((result) => {
      if (result.isConfirmed) {
        navigate(`/pagos?orden=${id}&tipo=abono`);
      }
    });
  };

  const handleCancelar = async (id) => {
    Swal.fire({
      title: t('prod.confirmCancel2'),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Sí, cancelar orden',
      cancelButtonText: 'Cancelar',
      background: '#1e293b',
      color: '#f8fafc'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await axios.put(`${API}/api/produccion/${id}`, { estado: 'Cancelado', fecha_fin: new Date().toISOString().split('T')[0] });
          toast.success('Orden cancelada correctamente', { theme: 'dark' });
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
      toast.success(currentStatus ? 'Orden desarchivada' : 'Orden archivada', { theme: 'dark' });
      fetchOrders();
    } catch (e) {
      toast.error(t('prod.alertArchiveError'), { theme: 'dark' });
    }
  };

  const handleDelete = async (order) => {
    const isFinished = order.estado === 'Terminado' || order.estado === 'Terminado Parcial';
    Swal.fire({
      title: isEn ? 'Delete order?' : '¿Eliminar orden?',
      text: isFinished
        ? (isEn
            ? 'This order is already finished. Deleting it will hide it from the active list to keep things clean, but all your earnings and payroll history will be kept completely safe in the database.'
            : 'Esta orden ya está terminada. Al "eliminarla", solo se ocultará de la lista activa para mantener el orden, pero todas sus ganancias e historial de pagos se conservarán intactos en la base de datos.')
        : t('prod.confirmDelete'),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: isEn ? 'Yes, delete' : 'Sí, eliminar',
      cancelButtonText: isEn ? 'Cancel' : 'Cancelar'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await axios.delete(`${API}/api/produccion/${order.id}`);
          toast.success(isEn ? 'Deleted successfully' : 'Orden eliminada correctamente');
          fetchOrders();
        } catch (e) { 
          toast.error(e.response?.data?.error || t('prod.alertDeleteError')); 
        }
      }
    });
  };

  const handleRecibidasBlur = async (id, val) => {
    try {
      const cantidad_recibida = val === '' ? null : parseInt(val);
      await axios.put(`${API}/api/produccion/${id}`, { cantidad_recibida });
      toast.success('Cantidad recibida actualizada', { theme: 'dark', autoClose: 1500 });
      fetchOrders();
    } catch (e) { console.error(e); }
  };

  const handleApplyAdjustment = async (id, value) => {
    if (!value) return;
    const [tipo, porcentaje] = value.split('-');
    try {
      await axios.put(`${API}/api/produccion/${id}/ajuste`, { tipo, porcentaje: parseInt(porcentaje) });
      toast.success('Ajuste aplicado correctamente', { theme: 'dark' });
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
          toast.success(isEn ? 'Days added successfully' : 'Prórroga agregada con éxito', { theme: 'dark' });
          fetchOrders();
        } catch (e) {
          toast.error(t('prod.alertAddDayError'), { theme: 'dark' });
        }
      }
    });
  };

  const safeOrders = Array.isArray(orders) ? orders : [];
  // "Recibido en bodega" = tiene cantidad_recibida > 0. Esto se registra con el botón
  // "Recepcionar" y es independiente del estado de la orden (el estado solo pasa a
  // 'Terminado' cuando el pago se liquida por completo). Antes, una orden ya recibida
  // pero sin pago cerrado se mostraba en "En Proceso" como si siguiera en la maquila.
  const tieneRecepcion = (o) => o.cantidad_recibida !== null && o.cantidad_recibida !== undefined && o.cantidad_recibida > 0;
  const filteredOrders = safeOrders.filter(o => {
    if (!o) return false;
    // Filtrar por pestaña activa
    if (activeTab === 'proceso') {
      if (o.estado === 'Terminado' || tieneRecepcion(o)) {
        return false;
      }
    } else if (activeTab === 'recepcion') {
      if (o.estado === 'Terminado' || !tieneRecepcion(o)) {
        return false;
      }
    } else if (activeTab === 'terminado') {
      if (o.estado !== 'Terminado') {
        return false;
      }
    }
    return (
      (o.maquilero_nombre || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (o.producto_modelo || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  // Folio = posición dentro de la lista visible, ordenada del más antiguo al más nuevo
  // Así siempre arranca en #1 independientemente de lo que esté oculto en la otra pestaña
  const filteredAsc = [...filteredOrders].sort((a, b) => a.id - b.id);
  const getFolio = (o) => {
    if (!o) return '-';
    const idx = filteredAsc.findIndex(item => item.id === o.id);
    return idx >= 0 ? idx + 1 : (o.no_orden || o.id);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <h1 className="gradient-text" style={{ fontSize: '2.5rem', margin: 0 }}>{t('prod.title')}
        </h1>
        <div style={{ display: 'flex', gap: '1rem' }}>
          {canEdit && (
            <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
              <Plus size={20} /> {t('prod.new')}
            </button>
          )}
        </div>
      </div>

      {/* Pestañas de Trabajo */}
      <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.5rem', marginBottom: '0.25rem' }}>
        <button 
          onClick={() => setActiveTab('proceso')}
          style={{
            padding: '10px 20px',
            background: activeTab === 'proceso' ? 'rgba(59, 130, 246, 0.12)' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'proceso' ? '2px solid var(--primary-color)' : 'none',
            color: activeTab === 'proceso' ? '#fff' : 'var(--text-secondary)',
            fontWeight: 600,
            borderRadius: '8px 8px 0 0',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          {isEn ? 'In Process' : 'En Proceso'}
        </button>
        <button
          onClick={() => setActiveTab('recepcion')}
          style={{
            padding: '10px 20px',
            background: activeTab === 'recepcion' ? 'rgba(59, 130, 246, 0.12)' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'recepcion' ? '2px solid var(--primary-color)' : 'none',
            color: activeTab === 'recepcion' ? '#fff' : 'var(--text-secondary)',
            fontWeight: 600,
            borderRadius: '8px 8px 0 0',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          {isEn ? 'Received' : 'Recepción'}
        </button>
        <button
          onClick={() => setActiveTab('terminado')}
          style={{
            padding: '10px 20px',
            background: activeTab === 'terminado' ? 'rgba(59, 130, 246, 0.12)' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'terminado' ? '2px solid var(--primary-color)' : 'none',
            color: activeTab === 'terminado' ? '#fff' : 'var(--text-secondary)',
            fontWeight: 600,
            borderRadius: '8px 8px 0 0',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          {isEn ? 'Finished' : 'Terminadas'}
        </button>
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
                <th>{isEn ? 'Collected Pieces' : 'Piezas Recolectadas'}</th>
                <th>{t('prod.startDate')} / {t('prod.endDate')}</th>
                <th>{t('prod.maquilaCost')}</th>
                <th>Costo Est.</th>
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
                    // Normalizar fechas a medianoche UTC para cálculo exacto de días de diferencia
                    const now = new Date();
                    const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
                    
                    const dDate = new Date(o.fecha_fin);
                    const deliveryDate = Date.UTC(dDate.getUTCFullYear(), dDate.getUTCMonth(), dDate.getUTCDate());
                    
                    const diffMs = today - deliveryDate;
                    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                    
                    if (diffDays >= 1 && diffDays <= 3) {
                      rowClass = 'row-warning'; // Amarillo (retraso 1-3 días)
                      delayIcon = <AlertTriangle size={16} color="#ca8a04" title={`Retraso: ${diffDays} día(s)`} />;
                    } else if (diffDays >= 4) {
                      rowClass = 'row-danger'; // Rojo (retraso 4+ días)
                      delayIcon = <AlertCircle size={16} color="#dc2626" title={`Retraso: ${diffDays} día(s)`} />;
                    }
                  }
                  
                  return (
                    <tr key={o.id} className={rowClass} style={{ opacity: isCancelado ? 0.6 : 1 }}>
                      <td>#{getFolio(o)}</td>
                      <td style={{ fontWeight: 600 }}>{o.maquilero_nombre}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                          {prodImg ? (
                            <img 
                              src={prodImg} 
                              alt="" 
                              style={{ width: 70, height: 70, borderRadius: 10, objectFit: 'contain', backgroundColor: '#ffffff', border: '1px solid var(--border-color)', cursor: 'zoom-in' }} 
                              onClick={() => setSelectedImage(prodImg)}
                            />
                          ) : (
                            <div style={{ width: 70, height: 70, background: '#f1f5f9', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border-color)' }}>
                              <ImageIcon size={26} color="#cbd5e1" />
                            </div>
                          )}
                          <span style={{ fontWeight: 600 }}>{o.producto_modelo || 'N/A'}</span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>{o.cantidad}</td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                          {o.cantidad_recibida === null || o.cantidad_recibida === undefined || o.cantidad_recibida === 0 ? (
                            <span className="badge badge-warning" style={{ fontSize: '10px', padding: '2px 6px', fontWeight: 600 }}>
                              {isEn ? 'Pending Receive' : 'Pendiente Recibir'}
                            </span>
                          ) : (
                            <span className="badge badge-success" style={{ fontSize: '11px', padding: '2px 6px', fontWeight: 700 }}>
                              {o.cantidad_recibida} / {o.cantidad} pz
                            </span>
                          )}
                          <button 
                            type="button"
                            className="btn btn-secondary" 
                            style={{ padding: '3px 8px', fontSize: '11px', borderRadius: '6px' }}
                            onClick={() => handleOpenRecepcionModal(o)}
                            disabled={!canEdit || o.estado === 'Cancelado'}
                          >
                            {isEn ? 'Receive' : 'Recepcionar'}
                          </button>
                        </div>
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
                          {canEdit && (o.estado !== 'Terminado' && o.estado !== 'Cancelado') && (
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
                          (o.estado === 'Terminado Parcial' || o.estado === 'Pago Parcial') ? 'badge-partial' : 
                          o.estado === 'Cancelado' ? 'badge-danger' : 'badge-warning'
                        }`}>
                          {o.estado === 'Terminado' ? t('prod.statusFinished') : 
                           (o.estado === 'Terminado Parcial' || o.estado === 'Pago Parcial') ? t('prod.statusPartial') : 
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
                                  {/* Acciones principales en proceso / pago parcial */}
                                  {(o.estado !== 'Terminado' && o.estado !== 'Cancelado') && (
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
                                      <Link to={`/extras?newExtra=true&inventario_id=${o.inventario_id}&cantidad=${o.cantidad}&fecha_inicio=${formatDate(o.fecha_inicio)}&fecha_fin=${formatDate(o.fecha_fin)}`} className="actions-dropdown-item pink" onClick={() => setActiveDropdownId(null)}>
                                        <Sparkles size={16} /> {isEn ? 'Create Extra' : 'Crear Extra'}
                                      </Link>
                                      <button className="actions-dropdown-item blue" onClick={() => { setActiveDropdownId(null); openSplit(o); }}>
                                        <Split size={16} /> {isEn ? 'Split Order' : 'Dividir / Devolución'}
                                      </button>
                                      <div style={{ height: '1px', background: 'var(--border-color)', margin: '4px 0' }}></div>
                                    </>
                                  )}
                                  
                                  {/* Acciones generales siempre disponibles para editores */}
                                  <button className="actions-dropdown-item" style={{ position: 'relative' }} onClick={() => { setActiveDropdownId(null); handleOpenObs(o); }}>
                                    <MessageSquare size={16} /> {isEn ? 'Notes / Obs.' : 'Notas / Observaciones'}
                                    {o.observaciones && <span style={{ position: 'absolute', top: 12, right: 12, width: 8, height: 8, background: '#ef4444', borderRadius: '50%' }}></span>}
                                  </button>
                                  <button className="actions-dropdown-item" onClick={() => { 
                                    setActiveDropdownId(null);
                                    setEditingOrder(o); 
                                    setFormData({ 
                                      maquilero_id: o.maquilero_id, 
                                      inventario_id: o.inventario_id, 
                                      fecha_inicio: formatDate(o.fecha_inicio), 
                                      fecha_fin: formatDate(o.fecha_fin),
                                      precio_unitario: o.precio_unitario || '',
                                      cantidad: o.cantidad || ''
                                    }); 
                                    setIsEditModalOpen(true); 
                                  }}>
                                    <Pencil size={16} /> {isEn ? 'Edit' : 'Editar'}
                                  </button>
                                  <button className="actions-dropdown-item danger" onClick={() => { setActiveDropdownId(null); handleDelete(o); }}>
                                    <Trash2 size={16} /> {isEn ? 'Delete' : 'Eliminar'}
                                  </button>
                                </div>
                              )}
                            </div>
                          ) : canEditPrice ? (
                            <button 
                              className="btn btn-secondary" 
                              style={{ padding: '0.4rem' }} 
                              onClick={() => { 
                                setEditingOrder(o); 
                                setFormData({ 
                                  maquilero_id: o.maquilero_id, 
                                  inventario_id: o.inventario_id, 
                                  fecha_inicio: formatDate(o.fecha_inicio), 
                                  fecha_fin: formatDate(o.fecha_fin),
                                  precio_unitario: o.precio_unitario || '',
                                  cantidad: o.cantidad || ''
                                }); 
                                setIsEditModalOpen(true); 
                              }} 
                              title={isEn ? 'Edit Maquila Price' : 'Editar Precio de Maquila'}
                            >
                              <Pencil size={16} />
                            </button>
                          ) : (
                            <button 
                              className="btn btn-secondary" 
                              style={{ padding: '0.4rem' }} 
                              onClick={() => { 
                                setEditingOrder(o); 
                                setFormData({ 
                                  maquilero_id: o.maquilero_id, 
                                  inventario_id: o.inventario_id, 
                                  fecha_inicio: formatDate(o.fecha_inicio), 
                                  fecha_fin: formatDate(o.fecha_fin),
                                  precio_unitario: o.precio_unitario || '',
                                  cantidad: o.cantidad || ''
                                }); 
                                setIsEditModalOpen(true); 
                              }} 
                              title="Ver Detalle"
                            >
                              <Search size={16} />
                            </button>
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
        <div className="modal-overlay">
          <div className="modal-content glass-card" style={{ maxWidth: '640px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{isEditModalOpen ? (canEdit ? t('prod.modalEditOrder') : t('prod.modalOrderDetails')) : t('prod.modalNewOrder')}</h2>
              <button className="btn-icon" onClick={() => { setIsModalOpen(false); setIsEditModalOpen(false); }}><X size={24} /></button>
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
                    .filter(i => {
                      if (isModalOpen) {
                        return i.producciones_count === 0;
                      }
                      if (isEditModalOpen && editingOrder) {
                        return i.producciones_count === 0 || i.id === editingOrder.inventario_id;
                      }
                      return true;
                    })
                    .sort((a,b) => (a.modelo || '').localeCompare(b.modelo || '', undefined, {numeric: true}))
                    .map(i => ({
                      id: i.id,
                      modeloDisplay: `${i.modelo} - ${i.numero} ${i.es_reprogramacion === 1 ? t('prod.reprogrammedLabel') : ''}`
                    }))
                  }
                  value={formData.inventario_id}
                  onChange={id => setFormData({...formData, inventario_id: id})}
                  placeholder={t('prod.selectDefault')}
                  labelKey="modeloDisplay"
                  valueKey="id"
                  disabled={!canEdit && isEditModalOpen}
                  required
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group" style={{ minWidth: 0 }}>
                  <label className="form-label">{t('prod.startDateLabel')}</label>
                  <input
                    type="date"
                    required
                    className="form-input"
                    style={{ minWidth: 0 }}
                    value={formData.fecha_inicio}
                    onChange={e => setFormData({...formData, fecha_inicio: e.target.value})}
                    disabled={!canEdit && isEditModalOpen}
                  />
                </div>
                <div className="form-group" style={{ minWidth: 0 }}>
                  <label className="form-label">{t('prod.endDateLabel')}</label>
                  <input
                    type="date"
                    required
                    className="form-input"
                    style={{ minWidth: 0 }}
                    value={formData.fecha_fin}
                    onChange={e => setFormData({...formData, fecha_fin: e.target.value})}
                    disabled={!canEdit && isEditModalOpen}
                  />
                </div>
              </div>

              {isEditModalOpen && (
                <div className="form-group">
                  <label className="form-label">{isEn ? 'Maquila Price per Piece ($)' : 'Precio de Maquila por Prenda ($)'}</label>
                  <input 
                    type="number" 
                    step="0.01"
                    min="0"
                    required 
                    className="form-input" 
                    value={formData.precio_unitario} 
                    onChange={e => setFormData({...formData, precio_unitario: e.target.value})}
                    disabled={!canEditPrice}
                  />
                </div>
              )}

              {isEditModalOpen && (
                <div className="form-group">
                  <label className="form-label">{isEn ? 'Total Pieces' : 'Total de Piezas'}</label>
                  <input 
                    type="number" 
                    min="1"
                    required 
                    className="form-input" 
                    value={formData.cantidad} 
                    onChange={e => setFormData({...formData, cantidad: e.target.value})}
                    disabled={!canEditPrice}
                  />
                </div>
              )}

              {(canEdit || canEditPrice) && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => { setIsModalOpen(false); setIsEditModalOpen(false); }}>{t('prod.modalCancel')}</button>
                  <button type="submit" className="btn btn-primary">{isEditModalOpen ? t('prod.modalUpdate') : t('prod.modalCreate')}</button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Modal Zoom de Imagen */}
      {obsModalOpen && (
        <div className="modal-overlay" onClick={() => setObsModalOpen(false)}>
          <div className="modal-content glass-card" style={{ maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Observaciones / Notas</h2>
              <button className="btn-icon" onClick={() => setObsModalOpen(false)}><X size={24} /></button>
            </div>
            <div className="form-group">
              <textarea 
                className="form-input" 
                rows="4" 
                value={obsText} 
                onChange={e => setObsText(e.target.value)} 
                placeholder="Escribe aquí tus notas o detalles importantes..."
              ></textarea>
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setObsModalOpen(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSaveObs}>Guardar</button>
            </div>
          </div>
        </div>
      )}

      {isSplitModalOpen && splitOrder && (
        <div className="modal-overlay" onClick={() => setIsSplitModalOpen(false)}>
          <div className="modal-content glass-card" style={{ maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Dividir Orden / Devolución Parcial</h2>
              <button className="btn-icon" onClick={() => setIsSplitModalOpen(false)}><X size={24} /></button>
            </div>
            <form onSubmit={handleSplitSubmit}>
              <div style={{ marginBottom: '1rem', padding: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '8px', fontSize: '0.9rem' }}>
                <strong>Aviso:</strong> Estás dividiendo la orden #{splitOrder.id}. Ingresa cuántas piezas <strong>SÍ entregó</strong> {splitOrder.maquilero_nombre}. El resto se reasignará automáticamente.
              </div>
              
              <div className="form-group">
                <label className="form-label">Piezas Entregadas (de {splitOrder.cantidad}) *</label>
                <input 
                  type="number" 
                  required 
                  className="form-input" 
                  min="1"
                  max={splitOrder.cantidad - 1}
                  value={splitData.cantidad_entregada} 
                  onChange={e => setSplitData({...splitData, cantidad_entregada: e.target.value})} 
                />
              </div>

              <div className="form-group">
                <label className="form-label">Estado de la Orden Original *</label>
                <select
                  className="form-input"
                  value={splitData.estado_original}
                  onChange={e => setSplitData({...splitData, estado_original: e.target.value})}
                  required
                >
                  <option value="Terminado">Terminado (Listo para Pago Final / Liquidación)</option>
                  <option value="Terminado Parcial">Terminado Parcial (Con Pago Parcial / Anticipo)</option>
                  <option value="En proceso">En proceso (Seguir trabajando piezas entregadas)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Reasignar las restantes a: (Opcional)</label>
                <SearchableSelect
                  options={[
                    { id: "", nombre: "Dejar libres en Cortes (Inventario)" },
                    ...[...maquileros]
                      .filter(m => m.id !== splitOrder.maquilero_id)
                      .sort((a, b) => a.nombre.localeCompare(b.nombre))
                  ]}
                  value={splitData.nuevo_maquilero_id}
                  onChange={id => setSplitData({...splitData, nuevo_maquilero_id: id})}
                  placeholder="Dejar libres en Cortes (Inventario)"
                  labelKey="nombre"
                  valueKey="id"
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setIsSplitModalOpen(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Split size={18} /> Dividir Orden
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Recepción por Color y Talla */}
      {recepcionModalOpen && recepcionOrder && (
        <div className="modal-overlay" style={{ zIndex: 1900 }} onClick={() => setRecepcionModalOpen(false)}>
          <div className="modal-content glass-card" style={{ maxWidth: '680px', width: '95%' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.75rem' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', margin: 0, fontWeight: 700 }}>
                  {isEn ? 'Receive Collected Pieces' : 'Recepcionar Piezas Recolectadas'}
                </h2>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Orden #{getFolio(recepcionOrder)} | Modelo: <strong>{recepcionOrder.producto_modelo}</strong> ({recepcionOrder.maquilero_nombre})
                </div>
              </div>
              <button className="btn-icon" onClick={() => setRecepcionModalOpen(false)}><X size={22} /></button>
            </div>

            <div style={{ margin: '1rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>
                Total Orden: <strong>{recepcionOrder.cantidad} pzs</strong>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" style={{ fontSize: '12px', padding: '4px 10px' }} onClick={handleMarcarTodoRecibido}>
                  ✓ Marcar Todo Recibido
                </button>
                <button type="button" className="btn btn-secondary" style={{ fontSize: '12px', padding: '4px 10px' }} onClick={handleLimpiarRecepcion}>
                  Limpiar
                </button>
              </div>
            </div>

            <div style={{ maxHeight: '380px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', paddingRight: '4px' }}>
              {Object.entries(recepcionTallas).map(([colorKey, tallasObj]) => (
                <div key={colorKey} style={{ background: 'rgba(255,255,255,0.03)', padding: '0.85rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#c084fc', marginBottom: '0.5rem' }}>
                    {colorKey === 'GENERAL' ? 'Desglose por Tallas' : `Color: ${colorKey}`}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '0.6rem' }}>
                    {typeof tallasObj === 'object' && tallasObj !== null ? (
                      Object.entries(tallasObj).map(([szKey, val]) => (
                        <div key={szKey} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                            {(szKey === 'CANTIDAD' || szKey === 'TOTAL') ? 'Cantidad' : (szKey.toLowerCase().startsWith('talla') ? szKey : `Talla ${szKey}`)}
                          </label>
                          <input 
                            type="number" 
                            min="0"
                            className="form-input" 
                            style={{ padding: '0.25rem 0.5rem', textAlign: 'center', fontSize: '0.9rem', fontWeight: 700 }}
                            value={val ?? 0}
                            onChange={(e) => {
                              const newQty = parseInt(e.target.value) || 0;
                              setRecepcionTallas(prev => ({
                                ...prev,
                                [colorKey]: {
                                  ...prev[colorKey],
                                  [szKey]: newQty
                                }
                              }));
                            }}
                          />
                        </div>
                      ))
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Cantidad</label>
                        <input 
                          type="number" 
                          min="0"
                          className="form-input" 
                          style={{ padding: '0.25rem 0.5rem', textAlign: 'center', fontSize: '0.9rem', fontWeight: 700 }}
                          value={tallasObj ?? 0}
                          onChange={(e) => {
                            const newQty = parseInt(e.target.value) || 0;
                            setRecepcionTallas(prev => ({ ...prev, [colorKey]: newQty }));
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '1rem', fontWeight: 800 }}>
                Total Recolectado: <span style={{ color: '#34d399' }}>
                  {Object.values(recepcionTallas).reduce((acc, colObj) => {
                    if (typeof colObj === 'object' && colObj !== null) {
                      return acc + Object.values(colObj).reduce((s, v) => s + (parseInt(v) || 0), 0);
                    }
                    return acc + (parseInt(colObj) || 0);
                  }, 0)} pzs
                </span>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setRecepcionModalOpen(false)}>Cancelar</button>
                <button type="button" className="btn btn-primary" onClick={handleSaveRecepcion}>Guardar Recepción</button>
              </div>
            </div>
          </div>
        </div>
      )}

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

class ProduccionErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("Error capturado en Producción:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="glass-card" style={{ margin: '2rem', padding: '3rem', textAlign: 'center', color: '#fff' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#f87171' }}>Módulo de Producción</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>{this.state.error?.toString()}</p>
          <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
            Reintentar / Recargar Página
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function ProduccionWrapper(props) {
  return (
    <ProduccionErrorBoundary>
      <Produccion {...props} />
    </ProduccionErrorBoundary>
  );
}
