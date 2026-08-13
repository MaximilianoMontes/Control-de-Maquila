import { useState, useEffect } from 'react';
import axios from 'axios';
import { MessageCircle, FileText, X } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import API_URL from '../config';
import { toast } from '../utils/themeNotifications';

const API = API_URL;

const getFileSrc = (path) => path ? (path.startsWith('http') ? path : `${API}${path}`) : null;

const ESTADOS = ['nuevo', 'en_revision', 'resuelto'];

const badgeClassFor = (estado) => {
  if (estado === 'resuelto') return 'badge-success';
  if (estado === 'en_revision') return 'badge-info';
  return 'badge-warning';
};

const labelFor = (estado, isEn) => {
  if (estado === 'resuelto') return isEn ? 'Resolved' : 'Resuelto';
  if (estado === 'en_revision') return isEn ? 'In review' : 'En revisión';
  return isEn ? 'New' : 'Nuevo';
};

export default function SoporteReportes() {
  const { settings } = useSettings();
  const isEn = settings?.language === 'en';

  const [reportes, setReportes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [respuestas, setRespuestas] = useState({});
  const [selectedImage, setSelectedImage] = useState(null);

  const fetchReportes = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/api/soporte/reportes`);
      setReportes(res.data);
    } catch (e) {
      console.error(e);
      toast.error(isEn ? 'Error loading reports' : 'Error al cargar los reportes', { theme: 'dark' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReportes(); }, []);

  const handleEstadoChange = async (id, estado) => {
    try {
      await axios.put(`${API}/api/soporte/reportes/${id}`, { estado });
      setReportes(prev => prev.map(r => r.id === id ? { ...r, estado } : r));
    } catch (e) {
      console.error(e);
      toast.error(isEn ? 'Error updating status' : 'Error al actualizar el estado', { theme: 'dark' });
    }
  };

  const handleSaveRespuesta = async (id) => {
    const respuesta = respuestas[id];
    if (respuesta === undefined) return;
    try {
      await axios.put(`${API}/api/soporte/reportes/${id}`, { respuesta });
      setReportes(prev => prev.map(r => r.id === id ? { ...r, respuesta } : r));
      toast.success(isEn ? 'Reply saved' : 'Respuesta guardada', { theme: 'dark' });
    } catch (e) {
      console.error(e);
      toast.error(isEn ? 'Error saving reply' : 'Error al guardar la respuesta', { theme: 'dark' });
    }
  };

  const filteredReportes = filtroEstado === 'todos' ? reportes : reportes.filter(r => r.estado === filtroEstado);
  const nuevosCount = reportes.filter(r => r.estado === 'nuevo').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h1 className="gradient-text" style={{ fontSize: '2rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <MessageCircle size={32} /> {isEn ? 'Support Reports' : 'Reportes de Soporte'}
        </h1>
        <p style={{ color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>
          {isEn ? 'Problems reported by the team from anywhere in the system.' : 'Problemas reportados por el equipo desde cualquier parte del sistema.'}
        </p>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {['todos', ...ESTADOS].map(e => (
          <button
            key={e}
            type="button"
            className={`btn ${filtroEstado === e ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.8rem', padding: '6px 14px' }}
            onClick={() => setFiltroEstado(e)}
          >
            {e === 'todos' ? (isEn ? 'All' : 'Todos') : labelFor(e, isEn)}
            {e === 'nuevo' && nuevosCount > 0 && ` (${nuevosCount})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
          {isEn ? 'Loading...' : 'Cargando...'}
        </div>
      ) : filteredReportes.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
          {isEn ? 'No reports here.' : 'No hay reportes aquí.'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filteredReportes.map(r => (
            <div key={r.id} className="glass-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <div style={{ fontWeight: 700 }}>
                    {r.username || (isEn ? 'Unknown user' : 'Usuario desconocido')}
                    <span className="badge badge-partial" style={{ marginLeft: '0.5rem', fontSize: '10px', padding: '2px 6px', fontWeight: 600 }}>
                      {r.rol}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {new Date(r.fecha_creacion).toLocaleString()} · {isEn ? 'from' : 'desde'} <strong>{r.pantalla || 'N/A'}</strong>
                  </div>
                </div>
                <span className={`badge ${badgeClassFor(r.estado)}`} style={{ fontWeight: 700 }}>
                  {labelFor(r.estado, isEn)}
                </span>
              </div>

              <div style={{ fontSize: '0.95rem', whiteSpace: 'pre-wrap' }}>{r.mensaje}</div>

              {r.adjuntos && r.adjuntos.length > 0 && (
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {r.adjuntos.map(a => {
                    const src = getFileSrc(a.archivo);
                    const isImage = /\.(jpe?g|png|webp|gif)$/i.test(a.archivo);
                    return isImage ? (
                      <img
                        key={a.id}
                        src={src}
                        alt={a.nombre_original || 'adjunto'}
                        style={{ width: 70, height: 70, borderRadius: 8, objectFit: 'cover', cursor: 'zoom-in', border: '1px solid var(--border-color)' }}
                        onClick={() => setSelectedImage(src)}
                      />
                    ) : (
                      <a
                        key={a.id}
                        href={src}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-secondary"
                        style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                      >
                        <FileText size={14} /> {a.nombre_original || 'PDF'}
                      </a>
                    );
                  })}
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                  {isEn ? 'Status' : 'Estado'}:
                </label>
                <select
                  className="form-input"
                  style={{ width: 'auto', padding: '4px 8px', fontSize: '0.85rem' }}
                  value={r.estado}
                  onChange={e => handleEstadoChange(r.id, e.target.value)}
                >
                  {ESTADOS.map(e => (
                    <option key={e} value={e}>{labelFor(e, isEn)}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  className="form-input"
                  style={{ flex: '1 1 220px' }}
                  placeholder={isEn ? 'Write a reply / note (optional)' : 'Escribe una respuesta / nota (opcional)'}
                  value={respuestas[r.id] !== undefined ? respuestas[r.id] : (r.respuesta || '')}
                  onChange={e => setRespuestas(prev => ({ ...prev, [r.id]: e.target.value }))}
                />
                <button type="button" className="btn btn-primary" style={{ fontSize: '0.8rem' }} onClick={() => handleSaveRespuesta(r.id)}>
                  {isEn ? 'Save' : 'Guardar'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedImage && (
        <div className="modal-overlay" style={{ zIndex: 5000 }} onClick={() => setSelectedImage(null)}>
          <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }} onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setSelectedImage(null)}
              style={{ position: 'absolute', top: '-40px', right: '-40px', background: 'white', border: 'none', borderRadius: '50%', padding: '8px', cursor: 'pointer', display: 'flex' }}
            >
              <X size={24} />
            </button>
            <img src={selectedImage} alt="Zoom" style={{ width: '100%', height: '100%', borderRadius: '12px', objectFit: 'contain', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }} />
          </div>
        </div>
      )}
    </div>
  );
}
