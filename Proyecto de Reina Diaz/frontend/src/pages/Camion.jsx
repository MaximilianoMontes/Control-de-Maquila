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

  // Modal State for Size Entry
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStockItem, setSelectedStockItem] = useState(null);
  const [editIndex, setEditIndex] = useState(null); // If editing cargo instead of adding new
  const [cargoQty, setCargoQty] = useState(0);
  const [tallas, setTallas] = useState({
    "05": 0, "07": 0, "09": 0, "11": 0, "13": 0, "15": 0
  });

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
    } catch (e) {
      console.error(e);
      alert(t('prod.alertGenericError') || 'Error al obtener datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Modal Actions
  const openCargoModal = (item, cargoIdx = null) => {
    setSelectedStockItem(item);
    setEditIndex(cargoIdx);
    if (cargoIdx !== null) {
      // Edit existing cargo
      const currentCargo = cargo[cargoIdx];
      setCargoQty(currentCargo.piezas);
      setTallas({ ...currentCargo.tallas_cantidades });
    } else {
      // Add new cargo
      setCargoQty(item.piezas);
      setTallas({
        "05": 0, "07": 0, "09": 0, "11": 0, "13": 0, "15": 0
      });
    }
    setIsModalOpen(true);
  };

  const closeCargoModal = () => {
    setIsModalOpen(false);
    setSelectedStockItem(null);
    setEditIndex(null);
  };

  const handleTallaChange = (size, value) => {
    const val = parseInt(value) || 0;
    setTallas(prev => ({
      ...prev,
      [size]: val >= 0 ? val : 0
    }));
  };

  const tallasSum = Object.values(tallas).reduce((sum, current) => sum + current, 0);
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
          numero: c.numero,
          temporada: c.temporada,
          modelo: c.modelo,
          precio: c.precio,
          color: c.color,
          cliente: c.cliente,
          no_orden: c.no_orden,
          piezas: c.piezas,
          tallas_cantidades: c.tallas_cantidades
        }))
      };

      await axios.post(`${API}/api/camiones`, payload, { headers });
      
      alert(t('camion.shipSuccess') || '¡Camión enviado con éxito!');
      
      // Reset active truck
      setCargo([]);
      setObservaciones('');
      setFechaEnvio(new Date().toISOString().split('T')[0]);
      
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
            Gestiona de forma inalterable los traslados y distribución de tallas de las prendas a fábrica (Colima)
          </p>
        </div>
      </div>

      {/* Main interactive panel */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: '2rem', alignItems: 'stretch' }}>
        
        {/* Left Side: Active Stock list */}
        <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', height: 'fit-content', minHeight: '500px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '1.25rem', margin: 0, fontWeight: 700 }}>{t('camion.activeStock')}</h2>
            <span className="badge badge-info" style={{ fontWeight: 700 }}>{filteredStock.length} Lotes</span>
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
                          Orden: {item.no_orden || 'N/A'} | Color: {item.color || 'N/A'}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-primary)', fontWeight: 600 }}>
                          Costo Unitario: {formatCurrency(item.precio)}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-primary)' }}>{item.piezas}</div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Disponibles</div>
                      </div>
                      <button 
                        className={`btn ${isLoaded ? 'btn-secondary' : 'btn-primary'}`} 
                        style={{ padding: '0.4rem', borderRadius: '6px' }}
                        onClick={() => openCargoModal(item)}
                        title="Subir al Camión"
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
            </h2>
            {cargo.length > 0 && (
              <span className="badge badge-success" style={{ fontWeight: 700 }}>
                {cargo.reduce((sum, item) => sum + item.piezas, 0)} Piezas en total
              </span>
            )}
          </div>

          {/* Active Cargo items list */}
          <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem', overflowY: 'auto', maxHeight: '300px', background: 'rgba(0,0,0,0.1)', borderRadius: '8px', padding: '0.75rem' }}>
            {cargo.length === 0 ? (
              <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>
                <Truck size={48} style={{ opacity: 0.3, marginBottom: '0.5rem', animation: 'pulse 2s infinite' }} />
                <p style={{ margin: 0, fontSize: '0.9rem' }}>
                  {dragOver ? '¡Suelta el modelo aquí!' : 'Arrastra modelos aquí o haz clic en (+) para cargarlos.'}
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
                      {item.modelo} ({item.color || 'N/A'})
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
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {Object.entries(item.tallas_cantidades).map(([talla, cant]) => (
                        cant > 0 && (
                          <span key={talla} style={{ fontSize: '0.7rem', padding: '2px 6px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)' }}>
                            T.{talla}: <strong>{cant}</strong>
                          </span>
                        )
                      ))}
                    </div>
                    <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)' }}>
                      {item.piezas} pzs
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Form input: Shipping controls */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Fecha de Envío</label>
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
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Observaciones del Chofer / Camión</label>
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

      {/* Accordion History: Shipped trucks list */}
      <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <h2 style={{ fontSize: '1.25rem', margin: 0, fontWeight: 700 }}>{t('camion.historyTitle')}</h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {history.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
              <Info size={28} style={{ opacity: 0.5, marginBottom: '0.5rem' }} />
              <p style={{ margin: 0 }}>No hay camiones registrados en el historial de despachos.</p>
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
                        Camión #{truck.id}
                      </span>
                      <span style={{ fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Calendar size={14} color="#94a3b8" /> <strong>{t('camion.shippedOn')}:</strong> {new Date(truck.fecha_envio).toLocaleDateString('es-MX')}
                      </span>
                      {truck.observaciones && (
                        <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                          "{truck.observaciones}"
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <span className="badge badge-info" style={{ fontWeight: 700 }}>
                        {totalPzs} Piezas enviadas
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
                              <th>Modelo</th>
                              <th>No. Orden</th>
                              <th>Color</th>
                              <th>Cliente</th>
                              <th style={{ textAlign: 'center' }}>Total Piezas</th>
                              <th>{t('camion.sizeDistribution')}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {truck.items.map((item, idx) => (
                              <tr key={`truck-det-${truck.id}-${idx}`}>
                                <td style={{ fontWeight: 700, color: '#c084fc' }}>{item.modelo}</td>
                                <td>{item.no_orden || 'N/A'}</td>
                                <td>{item.color || 'N/A'}</td>
                                <td>{item.cliente || 'N/A'}</td>
                                <td style={{ textAlign: 'center', fontWeight: 700 }}>{item.piezas}</td>
                                <td>
                                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                                    {Object.entries(item.tallas_cantidades).map(([talla, cant]) => (
                                      cant > 0 && (
                                        <span key={`tdt-${talla}`} style={{ padding: '2px 6px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)', fontSize: '0.75rem' }}>
                                          T.{talla}: <strong>{cant}</strong>
                                        </span>
                                      )
                                    ))}
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

      {/* Tallas and quantity Modal */}
      {isModalOpen && selectedStockItem && (
        <div className="modal-overlay" style={{ zIndex: 1000 }}>
          <div className="modal-content glass-card" style={{ width: '100%', maxWidth: '520px', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', animation: 'scaleUp 0.3s' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>
                {editIndex !== null ? 'Editar Carga del Modelo' : 'Subir Modelo al Camión'}: {selectedStockItem.modelo}
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
                  Cantidad total a enviar de este lote (Max: {selectedStockItem.piezas}):
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
                    Suma: {tallasSum} / {cargoQty} pzs
                  </span>
                </div>
                
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  {t('camion.sizeHelper')}
                </p>

                {/* Grid of size fields */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                  {Object.keys(tallas).map(size => (
                    <div 
                      key={`field-${size}`} 
                      style={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: '0.2rem',
                        background: 'rgba(255,255,255,0.02)',
                        padding: '0.5rem',
                        borderRadius: '6px',
                        border: '1px solid rgba(255,255,255,0.06)'
                      }}
                    >
                      <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#c084fc', textAlign: 'center' }}>Talla {size}</label>
                      <input 
                        type="number" 
                        value={tallas[size] || ''}
                        onChange={e => handleTallaChange(size, e.target.value)}
                        style={{ border: 'none', background: 'transparent', color: 'var(--text-primary)', outline: 'none', fontWeight: 800, textAlign: 'center', fontSize: '1rem', width: '100%', borderBottom: '1px solid rgba(255,255,255,0.1)' }}
                        placeholder="0"
                      />
                    </div>
                  ))}
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
                Confirmar
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
