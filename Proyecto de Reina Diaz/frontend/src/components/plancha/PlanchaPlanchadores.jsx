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
          <div className="glass-card" style={{ width: '90%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.6rem' }}>{isEn ? 'Ironing History' : 'Historial de Planchado'}</h2>
                <p style={{ margin: '0.2rem 0 0 0', color: '#60a5fa', fontWeight: 'bold' }}>👤 {planchadorDetalle.nombre}</p>
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
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{isEn ? 'Photo' : 'Foto'}</th>
                    <th>{isEn ? 'Model' : 'Modelo'}</th>
                    <th>{isEn ? 'Color' : 'Color'}</th>
                    <th>{isEn ? 'Size' : 'Talla'}</th>
                    <th>{isEn ? 'Ironed-Pcs' : 'Pzas-Planchadas'}</th>
                    <th>{isEn ? 'Net' : 'Neto'}</th>
                    <th>{isEn ? 'Fixed Pay' : 'Pago Fijo'}</th>
                    <th>{isEn ? 'Total' : 'Total'}</th>
                  </tr>
                </thead>
                <tbody>
                  {planchadorDetalle.historial.length === 0 ? (
                    <tr><td colSpan="8" style={{ textAlign: 'center', color: 'var(--text-muted, #94a3b8)' }}>{isEn ? 'This ironer has no registered completed jobs.' : 'Este planchador no tiene trabajos terminados registrados.'}</td></tr>
                  ) : (
                    planchadorDetalle.historial.map(h => (
                      <tr key={h.id}>
                        <td>
                          {h.modelo_imagen ? (
                            <img 
                              src={`${API_URL}${h.modelo_imagen}`} 
                              alt={h.modelo_nombre} 
                              style={{ width: '40px', height: '40px', borderRadius: '6px', objectFit: 'contain', background: 'var(--bg-card)' }} 
                            />
                          ) : (
                            <div style={{ width: '40px', height: '40px', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Layers size={18} color="#64748b" />
                            </div>
                          )}
                        </td>
                        <td>
                          <strong>{h.modelo_nombre}</strong>
                          <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{isEn ? 'Order' : 'Orden'}: {h.no_orden || 'N/A'}</p>
                        </td>
                        <td>{h.color || 'N/A'}</td>
                        <td><span className="badge badge-info">{isEn ? 'S' : 'T'}{h.talla}</span></td>
                        <td>{h.piezas}</td>
                        <td style={{ color: '#34d399', fontWeight: 'bold' }}>{formatCurrency(h.neto)}</td>
                        <td>{formatCurrency(h.ajuste)}</td>
                        <td style={{ color: '#60a5fa', fontWeight: 'bold' }}>{formatCurrency(h.total)}</td>
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
