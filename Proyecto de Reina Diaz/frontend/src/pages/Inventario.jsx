import { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, Image as ImageIcon, Trash2, Calendar, ClipboardList } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import API_URL from '../config';

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
  const userRole = (user?.role || user?.rol || '').toString().toLowerCase().trim();
  const canEdit = userRole === 'admin' || userRole === 'inventario1';
  
  const [items, setItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);

  useEffect(() => {
    fetchItems();
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
    if (!confirm('¿Eliminar este producto del inventario general?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/api/inventario_real/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchItems();
    } catch (e) {
      alert('Error al eliminar: ' + (e.response?.data?.error || e.message));
    }
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
          <h1 className="gradient-text" style={{ fontSize: '2.5rem', margin: 0 }}>Inventario General</h1>
          <p style={{ color: '#94a3b8', margin: '0.25rem 0 0 0' }}>Historial y stock actual de prendas terminadas y liquidadas</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
        <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '1rem', background: 'rgba(37, 99, 235, 0.1)', borderRadius: '12px', color: '#2563eb' }}>
            <ClipboardList size={28} />
          </div>
          <div>
            <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Modelos Diferentes</span>
            <h3 style={{ fontSize: '1.75rem', margin: '0.25rem 0 0 0', fontWeight: 700 }}>{filteredItems.length}</h3>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '1rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '12px', color: '#10b981' }}>
            <Calendar size={28} />
          </div>
          <div>
            <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Total Piezas en Stock</span>
            <h3 style={{ fontSize: '1.75rem', margin: '0.25rem 0 0 0', fontWeight: 700, color: '#10b981' }}>{totalPiezas}</h3>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '1rem', background: 'rgba(139, 92, 246, 0.1)', borderRadius: '12px', color: '#8b5cf6' }}>
            <span style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>$</span>
          </div>
          <div>
            <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Valor Total Estimado</span>
            <h3 style={{ fontSize: '1.75rem', margin: '0.25rem 0 0 0', fontWeight: 700, color: '#8b5cf6' }}>
              ${valorTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </h3>
          </div>
        </div>
      </div>

      {/* Search Input */}
      <div className="glass-card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <Search size={20} color="#94a3b8" />
        <input 
          type="text" 
          placeholder="Buscar por modelo, cliente u orden..."
          style={{ width: '100%', background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none' }}
          value={searchTerm} 
          onChange={(e) => setSearchTerm(e.target.value)} 
        />
      </div>

      {/* Table view */}
      <div className="glass-card">
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Imagen</th>
                <th>Código / Modelo</th>
                <th>Variantes de Color</th>
                <th>Cliente</th>
                <th>No. Orden</th>
                <th>Precio Unit.</th>
                <th>Stock Terminado</th>
                <th>Valor Total</th>
                <th>Fecha Ingreso</th>
                {canEdit && <th>Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={canEdit ? 10 : 9} style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-secondary)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                      <ClipboardList size={48} color="#cbd5e1" />
                      <div>
                        <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>No hay productos en inventario</h4>
                        <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.9rem', maxWidth: '500px', lineHeight: '1.5' }}>
                          Los cortes se pasarán automáticamente aquí una vez que su orden de producción sea marcada como <strong>Terminada</strong> y esté <strong>100% Pagada</strong>.
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredItems.map(item => {
                  const total = (parseFloat(item.precio) || 0) * (parseInt(item.piezas) || 0);
                  const imgSrc = getImgSrc(item.imagen);
                  return (
                    <tr key={item.id}>
                      <td>
                        {imgSrc ? (
                          <img 
                            src={imgSrc} 
                            alt={item.modelo} 
                            style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 8, border: '1px solid #e2e8f0', cursor: 'zoom-in' }} 
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
                      <td>${parseFloat(item.precio || 0).toFixed(2)}</td>
                      <td style={{ fontWeight: 700, fontSize: '1.1rem', color: '#10b981' }}>{item.piezas} pzas</td>
                      <td style={{ fontWeight: 700, color: '#2563eb' }}>${total.toFixed(2)}</td>
                      <td>{displayDate(item.fecha_ingreso)}</td>
                      {canEdit && (
                        <td>
                          <button className="btn-icon" onClick={() => handleDelete(item.id)} title="Eliminar del stock" style={{ color: '#ef4444' }}>
                            <Trash2 size={18} />
                          </button>
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
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
