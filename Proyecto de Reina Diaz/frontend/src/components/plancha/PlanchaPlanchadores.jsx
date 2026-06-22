import { useState } from 'react';
import axios from 'axios';
import { 
  Users, 
  Plus, 
  Phone, 
  Trash2, 
  UserPlus, 
  X,
  Layers,
  Edit3
} from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';
import API_URL from '../../config';
import Swal from 'sweetalert2';
import { toast } from 'react-toastify';

export default function PlanchaPlanchadores({ planchadores, fetchPlanchadores }) {
  const { settings, formatCurrency } = useSettings();
  const isEn = settings.language === 'en';

  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoTelefono, setNuevoTelefono] = useState('');
  const [editPlanchadorId, setEditPlanchadorId] = useState(null);
  
  const [planchadorDetalle, setPlanchadorDetalle] = useState(null);
  const [mostrarDetalleModal, setMostrarDetalleModal] = useState(false);

  const handleAgregarPlanchador = async (e) => {
    e.preventDefault();
    if (!nuevoNombre.trim()) return;
    try {
      const token = localStorage.getItem('token');
      if (editPlanchadorId) {
        await axios.put(`${API_URL}/api/planchadores/${editPlanchadorId}`, {
          nombre: nuevoNombre,
          telefono: nuevoTelefono
        }, { headers: { Authorization: `Bearer ${token}` } });
        toast.success(isEn ? 'Ironer updated successfully' : 'Planchador actualizado correctamente', { theme: 'dark' });
      } else {
        await axios.post(`${API_URL}/api/planchadores`, {
          nombre: nuevoNombre,
          telefono: nuevoTelefono
        }, { headers: { Authorization: `Bearer ${token}` } });
        toast.success(isEn ? 'Ironer registered successfully' : 'Planchador registrado correctamente', { theme: 'dark' });
      }
      setNuevoNombre('');
      setNuevoTelefono('');
      setEditPlanchadorId(null);
      fetchPlanchadores();
    } catch (e) {
      console.error(e);
      toast.error(isEn ? 'Error saving ironer' : 'Error al guardar planchador', { theme: 'dark' });
    }
  };

  const handleEditPlanchadorClick = (p) => {
    setEditPlanchadorId(p.id);
    setNuevoNombre(p.nombre);
    setNuevoTelefono(p.telefono || '');
  };

  const handleEliminarPlanchador = async (id) => {
    Swal.fire({
      title: isEn ? 'Delete this ironer?' : '¿Eliminar este planchador?',
      text: isEn ? 'This action cannot be undone.' : 'Esta acción no se puede deshacer.',
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
          await axios.delete(`${API_URL}/api/planchadores/${id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          fetchPlanchadores();
          toast.success(isEn ? 'Ironer deleted' : 'Planchador eliminado', { theme: 'dark' });
        } catch (e) {
          console.error(e);
          toast.error(isEn ? 'Error deleting ironer' : 'Error al eliminar planchador', { theme: 'dark' });
        }
      }
    });
  };

  const handleVerHistorialPlanchador = async (id) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/planchadores/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPlanchadorDetalle(res.data);
      setMostrarDetalleModal(true);
    } catch (e) {
      console.error(e);
      toast.error(isEn ? 'Error retrieving history' : 'Error al obtener el historial', { theme: 'dark' });
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem', alignItems: 'start' }}>
      
      {/* Alta de Planchador */}
      <div className="glass-card">
        <h2 style={{ fontSize: '1.4rem', margin: '0 0 1.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <UserPlus color="#3b82f6" /> {editPlanchadorId ? (isEn ? 'Edit Ironer' : 'Editar Planchador') : (isEn ? 'Register Ironer' : 'Alta Planchador')}
        </h2>
        <form onSubmit={handleAgregarPlanchador} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          <div className="form-group">
            <label className="form-label">{isEn ? 'Ironer Name' : 'Nombre del Planchador'}</label>
            <input 
              type="text" 
              required 
              className="form-input" 
              placeholder={isEn ? 'e.g., Rosa Maria' : 'Ej: Rosa María'} 
              value={nuevoNombre} 
              onChange={e => setNuevoNombre(e.target.value)} 
            />
          </div>
          <div className="form-group">
            <label className="form-label">{isEn ? 'Phone Number' : 'Número de Teléfono'}</label>
            <input 
              type="tel" 
              className="form-input" 
              placeholder={isEn ? 'e.g., 3121234567' : 'Ej: 3121234567'} 
              value={nuevoTelefono} 
              onChange={e => setNuevoTelefono(e.target.value)} 
            />
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
              <Plus size={18} style={{ marginRight: '4px' }} /> {editPlanchadorId ? (isEn ? 'Save Changes' : 'Guardar Cambios') : (isEn ? 'Register Ironer' : 'Registrar Planchador')}
            </button>
            {editPlanchadorId && (
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => {
                  setEditPlanchadorId(null);
                  setNuevoNombre('');
                  setNuevoTelefono('');
                }}
              >
                {isEn ? 'Cancel' : 'Cancelar'}
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Listado de Planchadores */}
      <div className="glass-card">
        <h2 style={{ fontSize: '1.4rem', margin: '0 0 1.5rem 0' }}>{isEn ? 'Active Ironers' : 'Planchadores Activos'}</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1.2rem' }}>
          {planchadores.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--text-muted, #94a3b8)', gridColumn: '1/-1', padding: '2rem' }}>
              {isEn ? 'No registered ironers.' : 'No hay planchadores registrados.'}
            </p>
          ) : (
            planchadores.map(p => (
              <div 
                key={p.id} 
                className="glass-card" 
                style={{ 
                  padding: '1.2rem', 
                  background: 'rgba(255,255,255,0.01)', 
                  border: '1px solid rgba(255,255,255,0.05)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.8rem',
                  borderRadius: '12px'
                }}
              >
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem' }}>{p.nombre}</h3>
                  {p.telefono && (
                    <p style={{ color: 'var(--text-muted, #94a3b8)', margin: '0.2rem 0 0 0', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Phone size={12} /> {isEn ? 'Phone' : 'Teléfono'}: {p.telefono}
                    </p>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <button 
                    className="btn btn-secondary" 
                    style={{ flex: 1, padding: '6px 12px', fontSize: '0.85rem' }}
                    onClick={() => handleVerHistorialPlanchador(p.id)}
                  >
                    {isEn ? 'View History' : 'Ver Historial'}
                  </button>
                  <button 
                    className="btn" 
                    style={{ 
                      background: 'rgba(59, 130, 246, 0.1)', 
                      color: '#3b82f6', 
                      border: 'none',
                      padding: '6px'
                    }}
                    title={isEn ? 'Edit' : 'Editar'}
                    onClick={() => handleEditPlanchadorClick(p)}
                  >
                    <Edit3 size={16} />
                  </button>
                  <button 
                    className="btn" 
                    style={{ 
                      background: 'rgba(239, 68, 68, 0.1)', 
                      color: '#ef4444', 
                      border: 'none',
                      padding: '6px'
                    }}
                    title={isEn ? 'Delete' : 'Eliminar'}
                    onClick={() => handleEliminarPlanchador(p.id)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* MODAL 1: HISTORIAL DETALLADO DE TRABAJOS DEL PLANCHADOR */}
      {mostrarDetalleModal && planchadorDetalle && (
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
          <div className="glass-card" style={{ width: '95%', maxWidth: '660px', height: '96vh', maxHeight: '96vh', overflowY: 'auto', padding: '1.2rem 1.4rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.25rem' }}>{isEn ? 'Ironing History' : 'Historial de Planchado'}</h2>
                <p style={{ margin: '0.1rem 0 0 0', color: '#60a5fa', fontWeight: 'bold', fontSize: '0.82rem' }}>👤 {planchadorDetalle.nombre}</p>
              </div>
              <button 
                onClick={() => {
                  setMostrarDetalleModal(false);
                  setPlanchadorDetalle(null);
                }} 
                className="btn-icon" 
                style={{ background: 'rgba(255,255,255,0.05)', color: '#fff', border: 'none', padding: '8px', borderRadius: '50%', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div className="table-wrapper">
              <table className="data-table" style={{ fontSize: '0.78rem' }}>
                <thead>
                  <tr>
                    <th style={{ padding: '6px 4px', width: '36px' }}>{isEn ? 'Foto' : 'Foto'}</th>
                    <th style={{ padding: '6px 6px' }}>{isEn ? 'Model' : 'Modelo'}</th>
                    <th style={{ padding: '6px 4px' }}>{isEn ? 'Color' : 'Color'}</th>
                    <th style={{ padding: '6px 4px' }}>{isEn ? 'Size' : 'Talla'}</th>
                    <th style={{ padding: '6px 4px', textAlign: 'center' }}>{isEn ? 'Pzas' : 'Pzas'}</th>
                    <th style={{ padding: '6px 4px', textAlign: 'right' }}>{isEn ? 'Neto' : 'Neto'}</th>
                    <th style={{ padding: '6px 4px', textAlign: 'right' }}>{isEn ? 'P.Fijo' : 'P.Fijo'}</th>
                    <th style={{ padding: '6px 4px', textAlign: 'right' }}>{isEn ? 'Total' : 'Total'}</th>
                  </tr>
                </thead>
                <tbody>
                  {planchadorDetalle.historial.length === 0 ? (
                    <tr><td colSpan="8" style={{ textAlign: 'center', color: 'var(--text-muted, #94a3b8)', padding: '1rem' }}>{isEn ? 'This ironer has no registered completed jobs.' : 'Este planchador no tiene trabajos terminados registrados.'}</td></tr>
                  ) : (
                    planchadorDetalle.historial.map(h => (
                      <tr key={h.id}>
                        <td style={{ padding: '4px' }}>
                          {h.modelo_imagen ? (
                            <img 
                              src={`${API_URL}${h.modelo_imagen}`} 
                              alt={h.modelo_nombre} 
                              style={{ width: '32px', height: '32px', borderRadius: '5px', objectFit: 'contain', background: 'var(--bg-card)', display: 'block' }} 
                            />
                          ) : (
                            <div style={{ width: '32px', height: '32px', borderRadius: '5px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Layers size={14} color="#64748b" />
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '4px 6px' }}>
                          <strong style={{ fontSize: '0.8rem' }}>{h.modelo_nombre}</strong>
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: '1px' }}>{isEn ? 'Order' : 'Orden'}: {h.no_orden || 'N/A'}</div>
                        </td>
                        <td style={{ padding: '4px', whiteSpace: 'nowrap' }}>{h.color || '—'}</td>
                        <td style={{ padding: '4px' }}><span className="badge badge-info" style={{ fontSize: '0.68rem', padding: '2px 5px' }}>{isEn ? 'S' : 'T'}{h.talla}</span></td>
                        <td style={{ padding: '4px', textAlign: 'center' }}>{h.piezas}</td>
                        <td style={{ padding: '4px', color: '#34d399', fontWeight: 'bold', textAlign: 'right', whiteSpace: 'nowrap' }}>{formatCurrency(h.neto)}</td>
                        <td style={{ padding: '4px', textAlign: 'right', whiteSpace: 'nowrap' }}>{formatCurrency(h.ajuste)}</td>
                        <td style={{ padding: '4px', color: '#60a5fa', fontWeight: 'bold', textAlign: 'right', whiteSpace: 'nowrap' }}>{formatCurrency(h.total)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
