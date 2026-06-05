import { useState, useEffect } from 'react';
import { 
  Truck, ArrowRight, Trash2, Calendar, Edit3, Plus, 
  ChevronDown, ChevronUp, AlertCircle, CheckCircle, Info, Search, XCircle
} from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import API_URL from '../config';

const API = API_URL;

const getImgSrc = (img) => img ? (img.startsWith('http') ? img : `${API}${img}`) : null;
const formatCurrency = (val) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val);

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const cleanDate = dateStr.split('T')[0];
  const [year, month, day] = cleanDate.split('-');
  return `${day}/${month}/${year}`;
};

const SIZES = ["05", "07", "09", "11", "13", "15"];
const parseColors = (colorStr) => {
  if (!colorStr) return ['N/A'];
  const trimmed = colorStr.trim();
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.map(c => c.color || c.Color || c.name || c).filter(Boolean);
      }
    } catch (e) {
      console.error("Error parsing color JSON:", e);
    }
  }
  // Fallback to comma-separated string
  return colorStr.split(',').map(c => c.trim()).filter(Boolean);
};

const formatColorsDisplay = (colorStr) => {
  if (!colorStr) return 'N/A';
  const trimmed = colorStr.trim();
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.map(c => `${c.color || c.Color || c.name || c} (${c.cantidad || c.Cantidad || 0} pzs)`).join(', ');
      }
    } catch (e) {
      // Fallback
    }
  }
  return colorStr;
};

export default function Camion() {
  const { t } = useSettings();
  const { user } = useAuth();
  
  // Data State
  const [stock, setStock] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Active Truck Load State
  const [cargo, setCargo] = useState([]); // Array of { ...stockItem, piezas: N, tallas_cantidades: { "05": 10, ... } }
  const [fechaEnvio, setFechaEnvio] = useState(new Date().toISOString().split('T')[0]);
  const [observaciones, setObservaciones] = useState('');

  const [draftLoaded, setDraftLoaded] = useState(false);
  const [savingStatus, setSavingStatus] = useState(''); // '', 'saving', 'saved', 'error'

  // Modal State for Size Entry
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStockItem, setSelectedStockItem] = useState(null);
  const [editIndex, setEditIndex] = useState(null); // If editing cargo instead of adding new
  const [cargoQty, setCargoQty] = useState(0);
  const [tallas, setTallas] = useState({});

  // Tab State
  const [activeTab, setActiveTab] = useState('cargar'); // 'cargar', 'historial', 'devoluciones'
  const [devoluciones, setDevoluciones] = useState([]);

  // Accordion History State
  const [expandedTruckId, setExpandedTruckId] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  // Fetch Data
  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      // Fetch active stock from finished / partially finished production orders
      const stockRes = await axios.get(`${API}/api/camiones/disponibles`, { headers });
      setStock(stockRes.data);

      // Fetch history of sent trucks
      const historyRes = await axios.get(`${API}/api/camiones`, { headers });
      setHistory(historyRes.data);

      // Fetch returns from plancha
      const devRes = await axios.get(`${API}/api/maquila/devoluciones`, { headers });
      setDevoluciones(devRes.data);

      // Fetch draft from database
      const draftRes = await axios.get(`${API}/api/camiones/borrador`, { headers });
      if (draftRes.data) {
        setCargo(draftRes.data.cargo || []);
        setObservaciones(draftRes.data.observaciones || '');
        if (draftRes.data.fecha_envio) {
          setFechaEnvio(draftRes.data.fecha_envio);
        }
      }
      setDraftLoaded(true);
    } catch (e) {
      console.error(e);
      alert(t('prod.alertGenericError') || 'Error al obtener datos');
    } finally {
      setLoading(false);
    }
  };

  const handleArreglarDevolucion = async (id) => {
    if (!confirm('¿Seguro que deseas marcar esta devolución como terminada/arreglada?')) return;
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      await axios.put(`${API}/api/maquila/devoluciones/${id}/arreglar`, {}, { headers });
      alert('Devolución marcada como arreglada. Ahora está disponible en la lista para cargarse al camión.');
      fetchData();
    } catch (e) {
      console.error(e);
      alert('Error al actualizar devolución.');
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Save draft to database on change
  useEffect(() => {
    if (!draftLoaded) return;

    const saveDraft = async () => {
      try {
        setSavingStatus('saving');
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };
        await axios.post(`${API}/api/camiones/borrador`, {
          cargo,
          observaciones,
          fecha_envio: fechaEnvio
        }, { headers });
        setSavingStatus('saved');
      } catch (err) {
        console.error("Error saving draft to DB:", err);
        setSavingStatus('error');
      }
    };

    const delayDebounce = setTimeout(() => {
      saveDraft();
    }, 800);

    return () => clearTimeout(delayDebounce);
  }, [cargo, observaciones, fechaEnvio, draftLoaded]);

  // Modal Actions
  const openCargoModal = (item, cargoIdx = null) => {
    setSelectedStockItem(item);
    setEditIndex(cargoIdx);
    const colors = parseColors(item.color);

    if (cargoIdx !== null) {
      // Edit existing cargo
      const currentCargo = cargo[cargoIdx];
      setCargoQty(currentCargo.piezas);
      
      const initialTallas = {};
      colors.forEach(col => {
        initialTallas[col] = {
          "05": 0, "07": 0, "09": 0, "11": 0, "13": 0, "15": 0
        };
        if (currentCargo.tallas_cantidades && typeof currentCargo.tallas_cantidades[col] === 'object') {
          SIZES.forEach(sz => {
            initialTallas[col][sz] = parseInt(currentCargo.tallas_cantidades[col][sz]) || 0;
          });
        } else if (currentCargo.tallas_cantidades && colors.length === 1) {
          // If legacy flat format and only one color, map it
          SIZES.forEach(sz => {
            if (currentCargo.tallas_cantidades[sz] !== undefined) {
              initialTallas[col][sz] = parseInt(currentCargo.tallas_cantidades[sz]) || 0;
            }
          });
        }
      });
      setTallas(initialTallas);
    } else {
      // Add new cargo
      setCargoQty(item.piezas);
      const initialTallas = {};
      colors.forEach(col => {
        initialTallas[col] = {
          "05": 0, "07": 0, "09": 0, "11": 0, "13": 0, "15": 0
        };
      });
      setTallas(initialTallas);
    }
    setIsModalOpen(true);
  };

  const closeCargoModal = () => {
    setIsModalOpen(false);
    setSelectedStockItem(null);
    setEditIndex(null);
  };

  const handleTallaChange = (color, size, value) => {
    const val = parseInt(value) || 0;
    setTallas(prev => ({
      ...prev,
      [color]: {
        ...(prev[color] || { "05": 0, "07": 0, "09": 0, "11": 0, "13": 0, "15": 0 }),
        [size]: val >= 0 ? val : 0
      }
    }));
  };

  const tallasSum = Object.values(tallas).reduce((sum, colorObj) => {
    if (typeof colorObj === 'object' && colorObj !== null) {
      return sum + Object.values(colorObj).reduce((subSum, val) => subSum + (parseInt(val) || 0), 0);
    }
    return sum + (parseInt(colorObj) || 0);
  }, 0);
  const isTallaValid = tallasSum === cargoQty && cargoQty > 0;

  const handleConfirmCargo = () => {
    if (!isTallaValid) return;

    const cargoItem = {
      ...selectedStockItem,
      piezas: cargoQty,
      tallas_cantidades: { ...tallas }
    };

    if (editIndex !== null) {
      // Update
      const newCargo = [...cargo];
      newCargo[editIndex] = cargoItem;
      setCargo(newCargo);
    } else {
      // Add
      // Check if already in cargo, update or push
      const existingIdx = cargo.findIndex(c => c.id === selectedStockItem.id);
      if (existingIdx >= 0) {
        const newCargo = [...cargo];
        newCargo[existingIdx] = cargoItem;
        setCargo(newCargo);
      } else {
        setCargo(prev => [...prev, cargoItem]);
      }
    }
    closeCargoModal();
  };

  const handleRemoveCargo = (idx) => {
    setCargo(prev => prev.filter((_, i) => i !== idx));
  };

  // Drag and Drop Handlers
  const handleDragStart = (e, item) => {
    e.dataTransfer.setData('application/json', JSON.stringify(item));
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    try {
      const dataStr = e.dataTransfer.getData('application/json');
      if (dataStr) {
        const item = JSON.parse(dataStr);
        openCargoModal(item);
      }
    } catch (err) {
      console.error("Drop error:", err);
    }
  };

  // Ship Truck Action
  const handleShipTruck = async () => {
    if (cargo.length === 0) {
      alert(t('camion.emptyCargo') || 'Carga vacía');
      return;
    }

    if (!confirm(t('prod.confirmFinish') || '¿Seguro que deseas enviar el camión?')) return;

    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const payload = {
        fecha_envio: fechaEnvio,
        observaciones,
        items: cargo.map(c => ({
          id: c.id,
          produccion_id: c.produccion_id || c.id,
          numero: c.numero,
          temporada: c.temporada,
          modelo: c.modelo,
          precio: c.precio,
          color: c.color,
          cliente: c.cliente,
          no_orden: c.no_orden,
          piezas: c.piezas,
          tallas_cantidades: c.tallas_cantidades,
          is_devolucion: c.is_devolucion || false,
          devolucion_id: c.devolucion_id || null
        }))
      };

      await axios.post(`${API}/api/camiones`, payload, { headers });
      
      alert(t('camion.shipSuccess') || '¡Camión enviado con éxito!');
      
      // Prevent auto-save from writing an empty draft back
      setDraftLoaded(false);

      // Reset active truck
      setCargo([]);
      setObservaciones('');
      setFechaEnvio(new Date().toISOString().split('T')[0]);
      setSavingStatus('');
      
      // Refresh
      fetchData();
    } catch (e) {
      console.error(e);
      alert(e.response?.data?.error || t('prod.alertGenericError') || 'Error al enviar el camión');
    }
  };

  const toggleAccordion = (id) => {
    setExpandedTruckId(expandedTruckId === id ? null : id);
  };

  // Filter Stock List
  const filteredStock = stock.filter(item => 
    (item.modelo || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.color || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.no_orden || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', minHeight: '100vh', paddingBottom: '3rem' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="gradient-text" style={{ fontSize: '2.5rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Truck size={36} /> {t('camion.title')}
          </h1>
          <p style={{ color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>
            {t('camion.subtitle')}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
        <button 
          onClick={() => setActiveTab('cargar')}
          style={{
            padding: '10px 20px',
            background: activeTab === 'cargar' ? 'rgba(139, 92, 246, 0.15)' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'cargar' ? '2px solid var(--color-primary)' : 'none',
            color: activeTab === 'cargar' ? '#fff' : 'var(--text-secondary)',
            fontWeight: 600,
            borderRadius: '8px 8px 0 0',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          Cargar Camión
        </button>
        <button 
          onClick={() => setActiveTab('historial')}
          style={{
            padding: '10px 20px',
            background: activeTab === 'historial' ? 'rgba(139, 92, 246, 0.15)' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'historial' ? '2px solid var(--color-primary)' : 'none',
            color: activeTab === 'historial' ? '#fff' : 'var(--text-secondary)',
            fontWeight: 600,
            borderRadius: '8px 8px 0 0',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          Historial de Envíos
        </button>
        <button 
          onClick={() => setActiveTab('devoluciones')}
          style={{
            padding: '10px 20px',
            background: activeTab === 'devoluciones' ? 'rgba(139, 92, 246, 0.15)' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'devoluciones' ? '2px solid var(--color-primary)' : 'none',
            color: activeTab === 'devoluciones' ? '#fff' : 'var(--text-secondary)',
            fontWeight: 600,
            borderRadius: '8px 8px 0 0',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          Devoluciones en Maquila
        </button>
      </div>

      {activeTab === 'cargar' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: '2rem', alignItems: 'stretch' }}>
        
        {/* Left Side: Active Stock list */}
        <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', height: 'fit-content', minHeight: '500px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '1.25rem', margin: 0, fontWeight: 700 }}>{t('camion.activeStock')}</h2>
            <span className="badge badge-info" style={{ fontWeight: 700 }}>{filteredStock.length} {t('camion.lots') || 'Lotes'}</span>
          </div>

          {/* Search bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '0.5rem 0.75rem', border: '1px solid rgba(255,255,255,0.1)' }}>
            <Search size={18} color="#94a3b8" />
            <input 
              type="text" 
              placeholder={t('prod.search') || 'Buscar modelo, color, orden...'}
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)}
              style={{ border: 'none', background: 'transparent', color: 'var(--text-primary)', outline: 'none', width: '100%', fontSize: '0.9rem' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '420px', overflowY: 'auto', paddingRight: '0.25rem' }}>
            {filteredStock.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-secondary)' }}>
                <Info size={32} style={{ opacity: 0.5, marginBottom: '0.5rem' }} />
                <p style={{ margin: 0 }}>{t('camion.emptyStock')}</p>
              </div>
            ) : (
              filteredStock.map(item => {
                const img = getImgSrc(item.imagen);
                const isLoaded = cargo.some(c => c.id === item.id);
                return (
                  <div 
                    key={item.id} 
                    draggable
                    onDragStart={(e) => handleDragStart(e, item)}
                    className="glass-card" 
                    style={{ 
                      padding: '0.75rem', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between', 
                      background: 'rgba(255, 255, 255, 0.02)', 
                      border: isLoaded ? '1px dashed var(--color-primary)' : '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '8px',
                      cursor: 'grab',
                      transition: 'transform 0.2s, box-shadow 0.2s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      {img ? (
                        <img src={img} alt="" style={{ width: 44, height: 44, borderRadius: 6, objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: 44, height: 44, background: 'rgba(255,255,255,0.05)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Truck size={20} color="var(--text-secondary)" />
                        </div>
                      )}
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          {item.modelo}
                          <span className="badge badge-partial" style={{ fontSize: '10px', padding: '2px 6px', fontWeight: 600, display: 'inline-block' }}>
                            {item.maquilero_nombre}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {t('pay.order') || 'Orden'}: {item.no_orden || 'N/A'} | {t('cortes.color') || 'Color'}: {formatColorsDisplay(item.color)}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-primary)' }}>{item.piezas}</div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>{t('cortes.available') || 'Disponibles'}</div>
                      </div>
                      <button 
                        className={`btn ${isLoaded ? 'btn-secondary' : 'btn-primary'}`} 
                        style={{ padding: '0.4rem', borderRadius: '6px' }}
                        onClick={() => openCargoModal(item)}
                        title={t('camion.loadBtn') || 'Subir al Camión'}
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Virtual Truck cargo list */}
        <div 
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className="glass-card" 
          style={{ 
            padding: '1.5rem', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '1.25rem',
            border: dragOver ? '2px dashed var(--color-primary)' : '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: dragOver ? '0 0 20px rgba(139, 92, 246, 0.25)' : 'none',
            background: dragOver ? 'rgba(139, 92, 246, 0.02)' : 'var(--glass-bg)',
            transition: 'all 0.2s',
            minHeight: '500px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '1.25rem', margin: 0, fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Truck size={22} color="var(--color-primary)" /> {t('camion.cargoArea')}
              {savingStatus === 'saving' && (
                <span style={{ fontSize: '0.75rem', color: '#fbbf24', fontWeight: 'normal', display: 'inline-flex', alignItems: 'center', gap: '4px', marginLeft: '0.5rem', background: 'rgba(245, 158, 11, 0.1)', padding: '2px 8px', borderRadius: '12px' }}>
                  🔄 Guardando...
                </span>
              )}
              {savingStatus === 'saved' && (
                <span style={{ fontSize: '0.75rem', color: '#34d399', fontWeight: 'normal', display: 'inline-flex', alignItems: 'center', gap: '4px', marginLeft: '0.5rem', background: 'rgba(52, 211, 153, 0.1)', padding: '2px 8px', borderRadius: '12px' }}>
                  ✓ Guardado
                </span>
              )}
              {savingStatus === 'error' && (
                <span style={{ fontSize: '0.75rem', color: '#f87171', fontWeight: 'normal', display: 'inline-flex', alignItems: 'center', gap: '4px', marginLeft: '0.5rem', background: 'rgba(248, 113, 113, 0.1)', padding: '2px 8px', borderRadius: '12px' }}>
                  ⚠️ Error
                </span>
              )}
            </h2>
            {cargo.length > 0 && (
              <span className="badge badge-success" style={{ fontWeight: 700 }}>
                {cargo.reduce((sum, item) => sum + item.piezas, 0)} {t('camion.totalPieces') || 'Piezas en total'}
              </span>
            )}
          </div>

          {/* Active Cargo items list */}
          <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem', overflowY: 'auto', maxHeight: '300px', background: 'rgba(0,0,0,0.1)', borderRadius: '8px', padding: '0.75rem' }}>
            {cargo.length === 0 ? (
              <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>
                <Truck size={48} style={{ opacity: 0.3, marginBottom: '0.5rem', animation: 'pulse 2s infinite' }} />
                <p style={{ margin: 0, fontSize: '0.9rem' }}>
                  {dragOver ? (t('settings.themeSystem') === 'System' ? 'Drop the model here!' : '¡Suelta el modelo aquí!') : t('camion.emptyCargo')}
                </p>
              </div>
            ) : (
              cargo.map((item, idx) => (
                <div 
                  key={`cargo-${item.id}`} 
                  className="glass-card" 
                  style={{ 
                    padding: '0.75rem', 
                    background: 'rgba(139, 92, 246, 0.04)', 
                    border: '1px solid rgba(139, 92, 246, 0.15)',
                    borderRadius: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#c084fc' }}>
                      {item.modelo} ({formatColorsDisplay(item.color)})
                    </span>
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      <button 
                        className="btn" 
                        style={{ padding: '3px 6px', background: 'rgba(255,255,255,0.05)', color: '#a78bfa' }} 
                        onClick={() => openCargoModal(item, idx)}
                      >
                        <Edit3 size={14} />
                      </button>
                      <button 
                        className="btn btn-danger" 
                        style={{ padding: '3px 6px' }} 
                        onClick={() => handleRemoveCargo(idx)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', width: '100%', flexGrow: 1 }}>
                      {Object.entries(item.tallas_cantidades).map(([key, val]) => {
                        if (typeof val === 'object' && val !== null) {
                          const entries = Object.entries(val).filter(([_, qty]) => qty > 0);
                          if (entries.length === 0) return null;
                          return (
                            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '0.7rem', color: '#c084fc', fontWeight: 700 }}>{key}:</span>
                              {entries.map(([sz, qty]) => (
                                <span key={sz} style={{ fontSize: '0.7rem', padding: '1px 5px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                  T.{sz}: <strong>{qty}</strong>
                                </span>
                              ))}
                            </div>
                          );
                        } else if (parseInt(val) > 0) {
                          return (
                            <span key={key} style={{ fontSize: '0.7rem', padding: '2px 6px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)' }}>
                              T.{key}: <strong>{val}</strong>
                            </span>
                          );
                        }
                        return null;
                      })}
                    </div>
                    <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)' }}>
                      {item.piezas} {t('settings.themeSystem') === 'System' ? 'pcs' : 'pzs'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Form input: Shipping controls */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>{t('camion.shippingDate') || 'Fecha de Envío'}</label>
              <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '0.5rem', border: '1px solid rgba(255,255,255,0.08)' }}>
                <Calendar size={16} color="#c084fc" style={{ marginRight: '0.5rem' }} />
                <input 
                  type="date" 
                  value={fechaEnvio} 
                  onChange={e => setFechaEnvio(e.target.value)}
                  style={{ border: 'none', background: 'transparent', color: 'var(--text-primary)', outline: 'none', fontSize: '0.9rem', width: '100%' }}
                />
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>{t('camion.observationsLabel') || 'Observaciones del Chofer / Camión'}</label>
              <input 
                type="text" 
                placeholder={t('camion.observations') || 'Chofer, placas...'}
                value={observaciones} 
                onChange={e => setObservaciones(e.target.value)}
                className="form-input"
                style={{ fontSize: '0.9rem', padding: '0.55rem' }}
              />
            </div>
          </div>

          <button 
            className="btn btn-primary" 
            style={{ width: '100%', padding: '0.8rem', fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', borderRadius: '8px' }}
            disabled={cargo.length === 0}
            onClick={handleShipTruck}
          >
            <Truck size={20} /> {t('camion.shipBtn')} <ArrowRight size={18} />
          </button>
        </div>

      </div>
      )}

      {activeTab === 'historial' && (
        <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <h2 style={{ fontSize: '1.25rem', margin: 0, fontWeight: 700 }}>{t('camion.historyTitle')}</h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {history.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
              <Info size={28} style={{ opacity: 0.5, marginBottom: '0.5rem' }} />
              <p style={{ margin: 0 }}>{t('camion.noHistory') || 'No hay camiones registrados en el historial de despachos.'}</p>
            </div>
          ) : (
            history.map(truck => {
              const isExpanded = expandedTruckId === truck.id;
              const totalPzs = truck.items.reduce((sum, item) => sum + item.piezas, 0);
              return (
                <div 
                  key={truck.id} 
                  className="glass-card" 
                  style={{ 
                    padding: '1rem', 
                    background: isExpanded ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.01)', 
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '8px',
                    transition: 'all 0.2s'
                  }}
                >
                  {/* Collapsible header */}
                  <div 
                    onClick={() => toggleAccordion(truck.id)}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 800, color: 'var(--color-primary)', fontSize: '1.05rem' }}>
                        {t('nav.camion') || 'Camión'} #{truck.id}
                      </span>
                      <span style={{ fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Calendar size={14} color="#94a3b8" /> <strong>{t('camion.shippedOn')}:</strong> {formatDate(truck.fecha_envio)}
                      </span>
                      {truck.observaciones && (
                        <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                          "{truck.observaciones}"
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <span className="badge badge-info" style={{ fontWeight: 700 }}>
                        {totalPzs} {t('camion.piecesShipped') || 'Piezas enviadas'}
                      </span>
                      {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </div>
                  </div>

                  {/* Expanded body content */}
                  {isExpanded && (
                    <div style={{ marginTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1rem' }}>
                      <div className="table-wrapper" style={{ maxHeight: '250px', overflowY: 'auto' }}>
                        <table className="data-table" style={{ width: '100%', fontSize: '0.85rem' }}>
                          <thead>
                            <tr>
                              <th>{t('prod.model') || 'Modelo'}</th>
                              <th>{t('inv.orderNo') || 'No. Orden'}</th>
                              <th>{t('cortes.color') || 'Color'}</th>
                              <th>{t('inv.client') || 'Cliente'}</th>
                              <th style={{ textAlign: 'center' }}>{t('camion.totalPieces') || 'Total Piezas'}</th>
                              <th>{t('camion.sizeDistribution')}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {truck.items.map((item, idx) => (
                              <tr key={`truck-det-${truck.id}-${idx}`}>
                                <td style={{ fontWeight: 700, color: '#c084fc' }}>{item.modelo}</td>
                                <td>{item.no_orden || 'N/A'}</td>
                                <td>{formatColorsDisplay(item.color)}</td>
                                <td>{item.cliente || 'N/A'}</td>
                                <td style={{ textAlign: 'center', fontWeight: 700 }}>{item.piezas}</td>
                                <td>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                    {Object.entries(item.tallas_cantidades).map(([key, val]) => {
                                      if (typeof val === 'object' && val !== null) {
                                        const entries = Object.entries(val).filter(([_, qty]) => qty > 0);
                                        if (entries.length === 0) return null;
                                        return (
                                          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                                            <span style={{ fontSize: '0.75rem', color: '#c084fc', fontWeight: 700 }}>{key}:</span>
                                            {entries.map(([sz, qty]) => (
                                              <span key={sz} style={{ padding: '1px 5px', background: 'rgba(255,255,255,0.04)', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.03)', fontSize: '0.75rem' }}>
                                                T.{sz}: <strong>{qty}</strong>
                                              </span>
                                            ))}
                                          </div>
                                        );
                                      } else if (parseInt(val) > 0) {
                                        return (
                                          <span key={key} style={{ padding: '1px 5px', background: 'rgba(255,255,255,0.04)', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.03)', fontSize: '0.75rem' }}>
                                            T.{key}: <strong>{val}</strong>
                                          </span>
                                        );
                                      }
                                      return null;
                                    })}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
      )}

      {activeTab === 'devoluciones' && (
        <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '1.25rem', margin: 0, fontWeight: 700 }}>Devoluciones de Plancha</h2>
            <span className="badge badge-info" style={{ fontWeight: 700 }}>
              {devoluciones.filter(d => d.estado === 'pendiente').length} Pendientes
            </span>
          </div>

          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Imagen</th>
                  <th>Modelo</th>
                  <th>Maquilero</th>
                  <th>No. Orden</th>
                  <th>Piezas Dev.</th>
                  <th>Desglose por Talla</th>
                  <th>Fecha Devolución</th>
                  <th>Estado</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {devoluciones.length === 0 ? (
                  <tr>
                    <td colSpan="9" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>
                      No hay devoluciones registradas.
                    </td>
                  </tr>
                ) : (
                  devoluciones.map(d => {
                    const img = getImgSrc(d.imagen);
                    const firstVal = d.tallas_cantidades ? Object.values(d.tallas_cantidades)[0] : null;
                    const isNested = (typeof firstVal === 'object' && firstVal !== null);
                    
                    return (
                      <tr key={d.id}>
                        <td>
                          {img ? (
                            <img src={img} alt="" style={{ width: 40, height: 40, borderRadius: 6, objectFit: 'cover' }} />
                          ) : (
                            <div style={{ width: 40, height: 40, background: 'rgba(255,255,255,0.05)', borderRadius: 6 }} />
                          )}
                        </td>
                        <td style={{ fontWeight: 700 }}>{d.modelo}</td>
                        <td>{d.maquilero_nombre || 'N/A'}</td>
                        <td>{d.no_orden || 'N/A'}</td>
                        <td style={{ fontWeight: 800 }}>{d.piezas}</td>
                        <td style={{ fontSize: '0.75rem' }}>
                          {isNested ? (
                            Object.entries(d.tallas_cantidades).map(([color, tallasObj]) => {
                              const entries = Object.entries(tallasObj).filter(([_, q]) => q > 0);
                              if (entries.length === 0) return null;
                              return (
                                <div key={color} style={{ margin: '2px 0' }}>
                                  <strong style={{ color: '#c084fc' }}>{color}:</strong> {entries.map(([sz, q]) => `T${sz}(${q})`).join(', ')}
                                </div>
                              );
                            })
                          ) : (
                            Object.entries(d.tallas_cantidades || {})
                              .filter(([_, q]) => q > 0)
                              .map(([sz, q]) => `T${sz}(${q})`)
                              .join(', ')
                          )}
                        </td>
                        <td>{formatDate(d.fecha_devolucion)}</td>
                        <td>
                          <span className={`badge ${
                            d.estado === 'pendiente' ? 'badge-warning' : 
                            d.estado === 'arreglado' ? 'badge-success' : 'badge-partial'
                          }`}>
                            {d.estado === 'pendiente' ? 'Pendiente' : 
                             d.estado === 'arreglado' ? 'Arreglado' : 'Enviado'}
                          </span>
                        </td>
                        <td>
                          {d.estado === 'pendiente' ? (
                            <button 
                              className="btn btn-success" 
                              style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                              onClick={() => handleArreglarDevolucion(d.id)}
                            >
                              Arreglado / Terminado
                            </button>
                          ) : (
                            <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic' }}>
                              {d.estado === 'arreglado' ? 'Listo para enviar' : 'Enviado en camión'}
                            </span>
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
      )}

      {/* Tallas and quantity Modal */}
      {isModalOpen && selectedStockItem && (
        <div className="modal-overlay" style={{ zIndex: 1000 }}>
          <div className="modal-content glass-card" style={{ width: '90%', maxWidth: '680px', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', animation: 'scaleUp 0.3s' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>
                {editIndex !== null ? t('camion.editModelCargo') : t('camion.uploadModel')}: {selectedStockItem.modelo}
              </h3>
              <button 
                onClick={closeCargoModal} 
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <XCircle size={22} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              {/* Total cargo quantity input */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  {t('camion.totalAmountToShip').replace('{max}', selectedStockItem.piezas)}
                </label>
                <input 
                  type="number" 
                  value={cargoQty || ''}
                  onChange={e => {
                    const val = parseInt(e.target.value) || 0;
                    setCargoQty(val > selectedStockItem.piezas ? selectedStockItem.piezas : (val >= 0 ? val : 0));
                  }}
                  className="form-input"
                  style={{ fontWeight: 700, fontSize: '1.1rem' }}
                />
              </div>

              {/* Sizes breakdown distribution */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700 }}>
                    {t('camion.sizeDistribution')}
                  </label>
                  <span style={{ fontSize: '0.8rem', color: isTallaValid ? '#34d399' : '#f87171', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    {isTallaValid ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                    {t('settings.themeSystem') === 'System' ? 'Sum' : 'Suma'}: {tallasSum} / {cargoQty} {t('settings.themeSystem') === 'System' ? 'pcs' : 'pzs'}
                  </span>
                </div>
                
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  {t('camion.sizeHelper')}
                </p>

                {/* Table Matrix instead of flat grid */}
                <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.08)', background: 'rgba(0, 0, 0, 0.2)' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                    <thead>
                      <tr style={{ background: 'rgba(255, 255, 255, 0.05)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 700, color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase' }}>{t('cortes.color') || 'Color'}</th>
                        {SIZES.map(sz => (
                          <th key={sz} style={{ padding: '0.75rem 0.5rem', textAlign: 'center', fontWeight: 700, color: '#c084fc', minWidth: '60px' }}>{sz}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Object.keys(tallas).map(color => (
                        <tr key={color} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)', transition: 'background 0.2s' }}>
                          <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                            {color}
                          </td>
                          {SIZES.map(sz => (
                            <td key={sz} style={{ padding: '0.5rem 0.25rem', textAlign: 'center' }}>
                              <input 
                                type="number" 
                                value={tallas[color]?.[sz] || ''}
                                onChange={e => handleTallaChange(color, sz, e.target.value)}
                                placeholder="0"
                                style={{
                                  width: '50px',
                                  padding: '0.4rem 0.25rem',
                                  borderRadius: '6px',
                                  border: '1px solid rgba(255, 255, 255, 0.1)',
                                  background: 'rgba(255, 255, 255, 0.03)',
                                  color: 'var(--text-primary)',
                                  fontWeight: 800,
                                  textAlign: 'center',
                                  outline: 'none',
                                  transition: 'all 0.2s',
                                }}
                                onFocus={e => {
                                  e.target.style.borderColor = 'var(--color-primary)';
                                  e.target.style.background = 'rgba(139, 92, 246, 0.1)';
                                  e.target.select();
                                }}
                                onBlur={e => {
                                  e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                                  e.target.style.background = 'rgba(255, 255, 255, 0.03)';
                                }}
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {!isTallaValid && cargoQty > 0 && (
                  <span style={{ fontSize: '0.75rem', color: '#f87171', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.25rem' }}>
                    <AlertCircle size={14} />
                    {t('camion.sizeSumError').replace('{total}', cargoQty).replace('{current}', tallasSum)}
                  </span>
                )}
              </div>

            </div>

            {/* Modal actions */}
            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
              <button 
                className="btn btn-secondary" 
                style={{ flex: 1, padding: '0.65rem' }} 
                onClick={closeCargoModal}
              >
                {t('prod.modalCancel')}
              </button>
              <button 
                className="btn btn-primary" 
                style={{ flex: 1, padding: '0.65rem', fontWeight: 700 }} 
                disabled={!isTallaValid}
                onClick={handleConfirmCargo}
              >
                {t('camion.confirm') || 'Confirmar'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
