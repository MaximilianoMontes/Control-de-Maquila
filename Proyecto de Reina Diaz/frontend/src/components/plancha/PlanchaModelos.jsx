import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
  Layers, 
  Unlock, 
  Lock, 
  Edit3, 
  ShieldCheck, 
  X,
  AlertCircle,
  ArrowLeftRight
} from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';
import API_URL from '../../config';
import { toast, Swal } from '../../utils/themeNotifications';
import ImageZoom from '../ImageZoom';

export default function PlanchaModelos({ modelosCamion, fetchModelosCamion, fetchModelosDisponibles, userRole }) {
  const { settings, formatCurrency } = useSettings();
  const isEn = settings.language === 'en';

  const [searchModelosCamion, setSearchModelosCamion] = useState('');
  
  // Verification Modal State
  const [mostrarVerificarModal, setMostrarVerificarModal] = useState(false);
  const [modeloAVerificar, setModeloAVerificar] = useState(null);
  const [precioPlanchaInput, setPrecioPlanchaInput] = useState('');

  // Devolucion Modal State
  const [mostrarDevolucionModal, setMostrarDevolucionModal] = useState(false);
  const [modeloADevolver, setModeloADevolver] = useState(null);
  const [devolucionCantidades, setDevolucionCantidades] = useState({});
  const [isMouseDownDev, setIsMouseDownDev] = useState(false);
  const [editingBlockDev, setEditingBlockDev] = useState(null); // { color, talla }
  const dragActionDevRef = useRef(null); // 'select' | 'deselect'

  // Reset drag state when mouse is released anywhere on the page
  useEffect(() => {
    const handleMouseUp = () => setIsMouseDownDev(false);
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, []);

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const cleanDate = dateStr.split('T')[0];
    const parts = cleanDate.split('-');
    if (parts.length < 3) return dateStr;
    const [year, month, day] = parts;
    return `${parseInt(day, 10)}/${parseInt(month, 10)}/${year}`;
  };

  const handleAbrirVerificacion = (modelo) => {
    setModeloAVerificar(modelo);
    setPrecioPlanchaInput(modelo.precio_plancha !== undefined && modelo.precio_plancha !== null ? String(modelo.precio_plancha) : '');
    setMostrarVerificarModal(true);
  };

  const handleConfirmarVerificacion = async (e) => {
    e.preventDefault();
    if (!modeloAVerificar || precioPlanchaInput === '') return;
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/api/plancha/modelos/${modeloAVerificar.id}/verificar`, {
        precio_plancha: parseFloat(precioPlanchaInput)
      }, { headers: { Authorization: `Bearer ${token}` } });

      setMostrarVerificarModal(false);
      const isEditing = modeloAVerificar.verificado;
      setModeloAVerificar(null);
      setPrecioPlanchaInput('');
      fetchModelosCamion();
      fetchModelosDisponibles();
      toast.success(isEditing 
        ? (isEn ? 'Ironing price updated successfully' : 'Precio de planchado actualizado con éxito')
        : (isEn ? 'Model verified and unlocked' : 'Modelo verificado y desbloqueado para Plancha'), 
        { theme: 'dark' }
      );
    } catch (e) {
      console.error(e);
      toast.error(isEn ? 'Error verifying model' : 'Error al verificar modelo', { theme: 'dark' });
    }
  };

  const handleAbrirDevolucion = (modelo) => {
    setModeloADevolver(modelo);
    setDevolucionCantidades({});
    setEditingBlockDev(null);
    setIsMouseDownDev(false);
    setMostrarDevolucionModal(true);
  };

  const handleBlockMouseDown = (color, talla, maxQty) => {
    const currentVal = color
      ? (devolucionCantidades[color]?.[talla] || 0)
      : (devolucionCantidades[talla] || 0);
    const isSelected = currentVal > 0;
    const newAction = isSelected ? 'deselect' : 'select';
    dragActionDevRef.current = newAction;
    setIsMouseDownDev(true);
    
    updateDevQty(color, talla, newAction === 'select' ? maxQty : 0);
  };

  const handleBlockMouseEnter = (color, talla, maxQty) => {
    if (!isMouseDownDev) return;
    const action = dragActionDevRef.current;
    updateDevQty(color, talla, action === 'select' ? maxQty : 0);
  };

  const updateDevQty = (color, talla, qty) => {
    setDevolucionCantidades(prev => {
      const next = { ...prev };
      if (color) {
        if (!next[color]) next[color] = {};
        next[color][talla] = qty;
      } else {
        next[talla] = qty;
      }
      return next;
    });
  };

  const handleConfirmarDevolucion = async (e) => {
    e.preventDefault();
    if (!modeloADevolver) return;
    
    const payload = {};
    const firstVal = Object.values(modeloADevolver.tallas_cantidades)[0];
    const isNested = (typeof firstVal === 'object' && firstVal !== null);
    let totalPieces = 0;

    if (isNested) {
      Object.entries(devolucionCantidades).forEach(([color, tallasObj]) => {
        if (!tallasObj || typeof tallasObj !== 'object') return;
        Object.entries(tallasObj).forEach(([talla, qty]) => {
          const qtyInt = parseInt(qty) || 0;
          if (qtyInt > 0) {
            if (!payload[color]) payload[color] = {};
            payload[color][talla] = qtyInt;
            totalPieces += qtyInt;
          }
        });
      });
    } else {
      Object.entries(devolucionCantidades).forEach(([talla, qty]) => {
        const qtyInt = parseInt(qty) || 0;
        if (qtyInt > 0) {
          payload[talla] = qtyInt;
          totalPieces += qtyInt;
        }
      });
    }

    if (totalPieces === 0) {
      toast.warning(isEn ? 'Please select at least one piece to return.' : 'Por favor, selecciona al menos una pieza para devolver.', { theme: 'dark' });
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/api/plancha/modelos/${modeloADevolver.id}/devolver`, {
        tallas_devolucion: payload
      }, { headers: { Authorization: `Bearer ${token}` } });

      setMostrarDevolucionModal(false);
      setModeloADevolver(null);
      setDevolucionCantidades({});
      fetchModelosCamion();
      fetchModelosDisponibles();
      toast.success(isEn ? 'Return registered successfully' : 'Devolución registrada con éxito.', { theme: 'dark' });
    } catch (e) {
      console.error(e);
      toast.error(e.response?.data?.error || (isEn ? 'Error registering return' : 'Error al registrar devolución'), { theme: 'dark' });
    }
  };

  return (
    <div className="glass-card">
      <h2 style={{ fontSize: '1.5rem', margin: '0 0 1.5rem 0' }}>{isEn ? 'Models in Transit / Colima' : 'Modelos en Tránsito / Colima'}</h2>
      
      <div style={{ marginBottom: '1.5rem' }}>
        <input 
          type="text" 
          placeholder={isEn ? 'Search by model...' : 'Buscar por modelo...'}
          value={searchModelosCamion} 
          onChange={e => setSearchModelosCamion(e.target.value)} 
          style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--border-color, #e2e8f0)', background: 'var(--bg-input)', color: 'var(--text-primary)', outline: 'none' }} 
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {modelosCamion.filter(m => m.modelo.toLowerCase().includes(searchModelosCamion.toLowerCase())).length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--text-muted, #94a3b8)', gridColumn: '1/-1', padding: '3rem' }}>
            {isEn ? 'No registered models from sent trucks.' : 'No hay modelos registrados de camiones enviados.'}
          </p>
        ) : (
          (() => {
            const filtered = modelosCamion
              .filter(m => m.modelo.toLowerCase().includes(searchModelosCamion.toLowerCase()));
            
            const getMarca = (mod) => mod?.charAt(0) === '5' ? 'Reina Diaz' : (mod?.charAt(0) === '7' ? 'POET' : 'Otra Marca');
            const getTipo = (mod) => {
              const s = mod?.charAt(1);
              return { '0':'Saco', '1':'Conjunto', '2':'Vestido', '3':'Pantalón', '4':'Falda', '5':'Blusa', '6':'Ensamble' }[s] || 'Otro';
            };

            // Build groups using a Map to avoid duplicates across different camión dates
            const grupoMap = new Map();
            filtered.forEach(m => {
              const key = `${getMarca(m.modelo)} - ${getTipo(m.modelo)}`;
              if (!grupoMap.has(key)) {
                grupoMap.set(key, { nombre: key, items: [], maxFecha: new Date(0) });
              }
              const g = grupoMap.get(key);
              g.items.push(m);
              // Track newest fecha_envio for this group (used to sort groups)
              const fecha = m.fecha_envio ? new Date(m.fecha_envio) : new Date(0);
              if (fecha > g.maxFecha) g.maxFecha = fecha;
            });

            // Sort groups by newest fecha_envio DESC
            const grupos = Array.from(grupoMap.values()).sort((a, b) => b.maxFecha - a.maxFecha);

            // Within each group sort by fecha_envio DESC, then modelo ASC
            grupos.forEach(g => {
              g.items.sort((a, b) => {
                const dateA = a.fecha_envio ? new Date(a.fecha_envio) : new Date(0);
                const dateB = b.fecha_envio ? new Date(b.fecha_envio) : new Date(0);
                if (dateB - dateA !== 0) return dateB - dateA;
                return a.modelo.localeCompare(b.modelo);
              });
            });
            

            return grupos.map((grupo) => (
              <div key={grupo.nombre} style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.2rem', margin: '0 0 1rem 0', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>
                  {grupo.nombre} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: '8px', fontWeight: 'normal' }}>({grupo.items.length} {grupo.items.length === 1 ? 'modelo' : 'modelos'})</span>
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
                  {grupo.items.map(m => (
                    <div 
                      key={m.id} 
                      className="glass-card" 
                      style={{ 
                        position: 'relative', 
                        padding: '1.5rem', 
                        borderRadius: '16px',
                        background: m.verificado ? 'rgba(16, 185, 129, 0.02)' : 'rgba(239, 68, 68, 0.01)',
                        border: `1px solid ${m.verificado ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255,255,255,0.06)'}`,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1rem',
                        overflow: 'hidden'
                      }}
                    >
                      {/* Candado / Estado de bloqueo */}
                      <div style={{ position: 'absolute', top: '12px', right: '12px' }}>
                        {m.verificado ? (
                          <span className="badge badge-success" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Unlock size={12} /> {isEn ? 'Unlocked' : 'Desbloqueado'}
                          </span>
                        ) : (
                          <span className="badge badge-warning" style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(245, 158, 11, 0.1)', color: '#fbbf24' }}>
                            <Lock size={12} /> {isEn ? 'Locked' : 'Bloqueado'}
                          </span>
                        )}
                      </div>

                      {/* Imagen y Detalles del modelo */}
                      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <ImageZoom
                          src={m.imagen ? `${API_URL}${m.imagen}` : null}
                          alt={m.modelo}
                          style={{ width: '60px', height: '60px', borderRadius: '8px', objectFit: 'contain', background: 'var(--bg-card)' }}
                          fallback={
                            <div style={{ width: '60px', height: '60px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Layers size={24} color="#64748b" />
                            </div>
                          }
                        />
                        <div>
                          <h3 style={{ margin: 0, fontSize: '1.3rem' }}>{isEn ? 'Model' : 'Modelo'} {m.modelo}</h3>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                            Camión del: {formatDate(m.fecha_envio)}
                          </div>
                        </div>
                      </div>

                      {/* Acciones */}
                      <div style={{ marginTop: 'auto', paddingTop: '0.5rem' }}>
                        {m.verificado ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem' }}>
                              <span style={{ color: 'var(--text-muted, #94a3b8)' }}>{isEn ? 'Ironing Pay' : 'Pago de Plancha'}:</span>
                              <strong style={{ color: '#34d399', fontSize: '1.1rem' }}>{formatCurrency(m.precio_plancha)} <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: 'var(--text-secondary)' }}>{isEn ? '/ pc' : '/ pza'}</span></strong>
                            </div>
                            {userRole !== 'plancha' && (
                              <button 
                                className="btn btn-secondary" 
                                style={{ width: '100%', padding: '6px', fontSize: '0.8rem', borderColor: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                                onClick={() => handleAbrirVerificacion(m)}
                              >
                                <Edit3 size={12} /> {isEn ? 'Edit Price' : 'Editar Precio'}
                              </button>
                            )}
                          </div>
                        ) : (
                          userRole === 'plancha' ? (
                            <div style={{ textAlign: 'center', color: 'var(--text-muted, #94a3b8)', fontSize: '0.85rem', fontStyle: 'italic', padding: '4px 0' }}>
                              {isEn ? 'Pending Verification' : 'Pendiente de Verificación'}
                            </div>
                          ) : (
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <button 
                                className="btn btn-primary" 
                                style={{ flex: 1, padding: '8px', fontSize: '0.85rem' }}
                                onClick={() => handleAbrirVerificacion(m)}
                              >
                                {isEn ? 'Verify' : 'Verificar'}
                              </button>
                              {m.modelo === '723131' ? (
                                <button 
                                  className="btn" 
                                  style={{ flex: 1, padding: '8px', fontSize: '0.85rem', background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-muted)', border: '1px solid rgba(255, 255, 255, 0.1)', cursor: 'not-allowed' }}
                                  disabled
                                  title={isEn ? 'Returns not allowed for this model' : 'No se permiten devoluciones para este modelo'}
                                >
                                  {isEn ? 'No Return' : 'Sin Devolución'}
                                </button>
                              ) : (
                                <button 
                                  className="btn" 
                                  style={{ flex: 1, padding: '8px', fontSize: '0.85rem', background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)' }}
                                  onClick={() => handleAbrirDevolucion(m)}
                                >
                                  {isEn ? 'Return' : 'Devolución'}
                                </button>
                              )}
                            </div>
                          )
                        )}
                      </div>

                    </div>
                  ))}
                </div>
              </div>
            ));
          })()
        )}
      </div>

      {/* MODAL: VERIFICACIÓN / PRECIO */}
      {mostrarVerificarModal && modeloAVerificar && (
        <div 
          style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            background: 'rgba(0,0,0,0.6)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            zIndex: 1000, 
            backdropFilter: 'blur(8px)' 
          }}
        >
          <div className="glass-card" style={{ width: '95%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck color="#10b981" /> {modeloAVerificar.verificado ? (isEn ? 'Edit Ironing Price' : 'Editar Precio de Planchado') : (isEn ? 'Confirm Arrival' : 'Confirmar Llegada')}
              </h2>
              <button 
                onClick={() => {
                  setMostrarVerificarModal(false);
                  setModeloAVerificar(null);
                }} 
                className="btn-icon" 
                style={{ background: 'rgba(255,255,255,0.05)', color: '#fff', border: 'none', padding: '8px', borderRadius: '50%', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem', background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '12px' }}>
              {modeloAVerificar.imagen ? (
                <img 
                  src={`${API_URL}${modeloAVerificar.imagen}`} 
                  alt={modeloAVerificar.modelo} 
                  style={{ width: '50px', height: '50px', borderRadius: '6px', objectFit: 'contain', background: 'var(--bg-card)' }} 
                />
              ) : null}
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem' }}>{isEn ? 'Model' : 'Modelo'} {modeloAVerificar.modelo}</h3>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{isEn ? 'Order No' : 'No. Orden'}: {modeloAVerificar.no_orden}</p>
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted, #94a3b8)', margin: '0 0 0.8rem 0' }}>{isEn ? 'Confirm that the following quantities of pieces per size arrived completely in Colima:' : 'Confirma que las siguientes cantidades de piezas por talla llegaron completas a Colima:'}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '40vh', overflowY: 'auto', paddingRight: '4px' }}>
                {Object.entries(modeloAVerificar.tallas_cantidades)
                  .sort(([keyA], [keyB]) => {
                    const numA = parseInt(keyA, 10);
                    const numB = parseInt(keyB, 10);
                    if (isNaN(numA) && isNaN(numB)) return keyA.localeCompare(keyB);
                    if (isNaN(numA)) return 1;
                    if (isNaN(numB)) return -1;
                    return numA - numB;
                  })
                  .map(([key, val]) => {
                    if (typeof val === 'object' && val !== null) {
                      const entries = Object.entries(val)
                        .filter(([_, qty]) => qty > 0)
                        .sort(([szA], [szB]) => {
                          const numA = parseInt(szA, 10);
                          const numB = parseInt(szB, 10);
                          if (isNaN(numA) && isNaN(numB)) return szA.localeCompare(szB);
                          if (isNaN(numA)) return 1;
                          if (isNaN(numB)) return -1;
                          return numA - numB;
                        });
                      if (entries.length === 0) return null;
                      return (
                        <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', background: 'rgba(255,255,255,0.01)', padding: '8px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
                          <span style={{ fontSize: '0.85rem', color: '#c084fc', fontWeight: 700 }}>{isEn ? 'Color' : 'Color'}: {key}</span>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                            {entries.map(([sz, qty]) => (
                              <div 
                                key={sz} 
                                style={{ 
                                  background: 'rgba(255,255,255,0.03)', 
                                  border: '1px solid rgba(255,255,255,0.05)', 
                                  padding: '6px', 
                                  borderRadius: '6px', 
                                  textAlign: 'center',
                                  fontSize: '0.8rem'
                                }}
                              >
                                {isEn ? 'Size' : 'Talla'} {sz}: <br /><strong>{qty} {isEn ? 'pcs' : 'pzas'}</strong>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    } else if (parseInt(val) > 0) {
                      return (
                        <div 
                          key={key} 
                          style={{ 
                            background: 'rgba(255,255,255,0.03)', 
                            border: '1px solid rgba(255,255,255,0.05)', 
                            padding: '8px', 
                            borderRadius: '8px', 
                            textAlign: 'center',
                            fontSize: '0.85rem'
                          }}
                        >
                          {isEn ? 'Size' : 'Talla'} {key}: <br /><strong>{val} {isEn ? 'pcs' : 'pzas'}</strong>
                        </div>
                      );
                    }
                    return null;
                  })}
              </div>
            </div>

            <form onSubmit={handleConfirmarVerificacion} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {isEn ? 'Ironing Price per Piece ($)' : 'Precio de Planchado por Pieza'} <AlertCircle size={14} color="#f59e0b" title={isEn ? 'How much will the ironer earn for ironing each piece of this model?' : '¿Cuánto ganará la planchadora por planchar cada pieza de este modelo?'} />
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted, #94a3b8)' }}>$</span>
                  <input 
                    type="number" 
                    step="0.01" 
                    min="0"
                    required
                    className="form-input" 
                    style={{ paddingLeft: '24px' }}
                    placeholder={isEn ? 'e.g., 2.50' : 'Ej: 2.50'} 
                    value={precioPlanchaInput} 
                    onChange={e => setPrecioPlanchaInput(e.target.value)} 
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  style={{ flex: 1 }}
                  onClick={() => {
                    setMostrarVerificarModal(false);
                    setModeloAVerificar(null);
                  }}
                >
                  {isEn ? 'Cancel' : 'Cancelar'}
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  {modeloAVerificar.verificado ? (isEn ? 'Save Changes' : 'Guardar Cambios') : (isEn ? 'Confirm Arrival' : 'Confirmar Llegada')}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* MODAL DE DEVOLUCIÓN A MAQUILA */}
      {mostrarDevolucionModal && modeloADevolver && (
        <div 
          style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            background: 'rgba(0,0,0,0.6)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            zIndex: 1000, 
            backdropFilter: 'blur(8px)' 
          }}
        >
          <div className="glass-card" style={{ width: '95%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ArrowLeftRight color="#ef4444" /> {isEn ? 'Register Return' : 'Registrar Devolución'}
              </h2>
              <button 
                onClick={() => {
                  setMostrarDevolucionModal(false);
                  setModeloADevolver(null);
                  setDevolucionCantidades({});
                }} 
                className="btn-icon" 
                style={{ background: 'rgba(255,255,255,0.05)', color: '#fff', border: 'none', padding: '8px', borderRadius: '50%', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem', background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '12px' }}>
              {modeloADevolver.imagen ? (
                <img 
                  src={`${API_URL}${modeloADevolver.imagen}`} 
                  alt={modeloADevolver.modelo} 
                  style={{ width: '50px', height: '50px', borderRadius: '6px', objectFit: 'contain', background: 'var(--bg-card)' }} 
                />
              ) : null}
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem' }}>{isEn ? 'Model' : 'Modelo'} {modeloADevolver.modelo}</h3>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{isEn ? 'Order No' : 'No. Orden'}: {modeloADevolver.no_orden}</p>
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted, #94a3b8)', margin: '0 0 1rem 0', lineHeight: '1.4' }}>
                {isEn ? 'Select the pieces to return. Click or hold and drag to select/deselect complete sizes. Double click a box to enter a specific number of pieces.' : 'Selecciona las piezas que se van a devolver. Haz clic o mantén presionado y arrastra para seleccionar/deseleccionar tallas completas. Haz doble clic en una casilla para ingresar una cantidad específica de piezas.'}
              </p>
              
              <div 
                style={{ display: 'flex', flexDirection: 'column', gap: '1rem', userSelect: 'none' }}
                onMouseLeave={() => setIsMouseDownDev(false)}
              >
                {(() => {
                  const isNested = Object.values(modeloADevolver.tallas_cantidades).some(v => typeof v === 'object' && v !== null);
                  
                  if (isNested) {
                    return Object.entries(modeloADevolver.tallas_cantidades).map(([color, tallasObj]) => {
                      const entries = Object.entries(tallasObj).filter(([_, qty]) => qty > 0);
                      if (entries.length === 0) return null;
                      return (
                        <div key={color} style={{ background: 'rgba(255,255,255,0.01)', padding: '10px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.04)' }}>
                          <h4 style={{ margin: '0 0 8px 0', fontSize: '0.9rem', color: '#c084fc' }}>{isEn ? 'Color' : 'Color'}: {color}</h4>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                            {entries.map(([talla, maxQty]) => {
                              const currentQty = devolucionCantidades[color]?.[talla] || 0;
                              const isSelected = currentQty > 0;
                              const isEditing = editingBlockDev?.color === color && editingBlockDev?.talla === talla;
                              
                              return (
                                <div
                                  key={talla}
                                  onMouseDown={() => handleBlockMouseDown(color, talla, maxQty)}
                                  onMouseEnter={() => handleBlockMouseEnter(color, talla, maxQty)}
                                  onDoubleClick={(e) => {
                                    e.stopPropagation();
                                    setEditingBlockDev({ color, talla });
                                  }}
                                  style={{
                                    background: isSelected ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255,255,255,0.03)',
                                    border: isSelected ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(255,255,255,0.05)',
                                    padding: '8px',
                                    borderRadius: '8px',
                                    textAlign: 'center',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease'
                                  }}
                                >
                                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)' }}>{isEn ? 'Size' : 'Talla'} {talla}</div>
                                  {isEditing ? (
                                    <input 
                                      type="number"
                                      min="0"
                                      max={maxQty}
                                      className="form-input"
                                      style={{ width: '100%', padding: '2px', textAlign: 'center', fontSize: '0.85rem', marginTop: '4px' }}
                                      defaultValue={currentQty}
                                      autoFocus
                                      onMouseDown={(e) => e.stopPropagation()}
                                      onBlur={(e) => {
                                        let val = parseInt(e.target.value) || 0;
                                        if (val < 0) val = 0;
                                        if (val > maxQty) val = maxQty;
                                        updateDevQty(color, talla, val);
                                        setEditingBlockDev(null);
                                      }}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          let val = parseInt(e.target.value) || 0;
                                          if (val < 0) val = 0;
                                          if (val > maxQty) val = maxQty;
                                          updateDevQty(color, talla, val);
                                          setEditingBlockDev(null);
                                        } else if (e.key === 'Escape') {
                                          setEditingBlockDev(null);
                                        }
                                      }}
                                    />
                                  ) : (
                                    <div style={{ fontWeight: 'bold', fontSize: '0.85rem', color: isSelected ? '#f87171' : '#fff', marginTop: '2px' }}>
                                      {currentQty} / {maxQty}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    });
                  } else {
                    return (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                        {Object.entries(modeloADevolver.tallas_cantidades).filter(([_, qty]) => qty > 0).map(([talla, maxQty]) => {
                          const currentQty = devolucionCantidades[talla] || 0;
                          const isSelected = currentQty > 0;
                          const isEditing = editingBlockDev?.color === null && editingBlockDev?.talla === talla;
                          
                          return (
                            <div
                              key={talla}
                              onMouseDown={() => handleBlockMouseDown(null, talla, maxQty)}
                              onMouseEnter={() => handleBlockMouseEnter(null, talla, maxQty)}
                              onDoubleClick={(e) => {
                                e.stopPropagation();
                                setEditingBlockDev({ color: null, talla });
                              }}
                              style={{
                                background: isSelected ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255,255,255,0.03)',
                                border: isSelected ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(255,255,255,0.05)',
                                padding: '8px',
                                borderRadius: '8px',
                                textAlign: 'center',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)' }}>{isEn ? 'Size' : 'Talla'} {talla}</div>
                              {isEditing ? (
                                <input 
                                  type="number"
                                  min="0"
                                  max={maxQty}
                                  className="form-input"
                                  style={{ width: '100%', padding: '2px', textAlign: 'center', fontSize: '0.85rem', marginTop: '4px' }}
                                  defaultValue={currentQty}
                                  autoFocus
                                  onMouseDown={(e) => e.stopPropagation()}
                                  onBlur={(e) => {
                                    let val = parseInt(e.target.value) || 0;
                                    if (val < 0) val = 0;
                                    if (val > maxQty) val = maxQty;
                                    updateDevQty(null, talla, val);
                                    setEditingBlockDev(null);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      let val = parseInt(e.target.value) || 0;
                                      if (val < 0) val = 0;
                                      if (val > maxQty) val = maxQty;
                                      updateDevQty(null, talla, val);
                                      setEditingBlockDev(null);
                                    } else if (e.key === 'Escape') {
                                      setEditingBlockDev(null);
                                    }
                                  }}
                                />
                              ) : (
                                <div style={{ fontWeight: 'bold', fontSize: '0.85rem', color: isSelected ? '#f87171' : '#fff', marginTop: '2px' }}>
                                  {currentQty} / {maxQty}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  }
                })()}
              </div>
            </div>

            <form onSubmit={handleConfirmarDevolucion} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  style={{ flex: 1 }}
                  onClick={() => {
                    setMostrarDevolucionModal(false);
                    setModeloADevolver(null);
                    setDevolucionCantidades({});
                  }}
                >
                  {isEn ? 'Cancel' : 'Cancelar'}
                </button>
                <button type="submit" className="btn" style={{ flex: 1, background: '#ef4444', color: '#fff' }}>
                  {isEn ? 'Confirm Return' : 'Confirmar Devolución'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
