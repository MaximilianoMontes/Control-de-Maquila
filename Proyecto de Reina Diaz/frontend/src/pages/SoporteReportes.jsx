import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { MessageCircle, FileText, X, Send } from 'lucide-react';
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

  const [activeReporte, setActiveReporte] = useState(null);
  const [mensajes, setMensajes] = useState([]);
  const [adjuntosHilo, setAdjuntosHilo] = useState([]);
  const [loadingThread, setLoadingThread] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const scrollRef = useRef(null);

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
      if (activeReporte?.id === id) setActiveReporte(prev => ({ ...prev, estado }));
    } catch (e) {
      console.error(e);
      toast.error(isEn ? 'Error updating status' : 'Error al actualizar el estado', { theme: 'dark' });
    }
  };

  const openThread = async (reporte) => {
    setActiveReporte(reporte);
    setLoadingThread(true);
    try {
      const res = await axios.get(`${API}/api/soporte/reportes/${reporte.id}/mensajes`);
      setMensajes(res.data.mensajes);
      setAdjuntosHilo(res.data.adjuntos || []);
    } catch (e) {
      console.error(e);
      toast.error(isEn ? 'Error loading conversation' : 'Error al cargar la conversación', { theme: 'dark' });
    } finally {
      setLoadingThread(false);
      setTimeout(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, 50);
    }
  };

  const closeThread = () => {
    setActiveReporte(null);
    setMensajes([]);
    setAdjuntosHilo([]);
    setReplyText('');
    fetchReportes();
  };

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || sendingReply || !activeReporte) return;
    setSendingReply(true);
    try {
      await axios.post(`${API}/api/soporte/reportes/${activeReporte.id}/mensajes`, { mensaje: replyText.trim() });
      setReplyText('');
      const res = await axios.get(`${API}/api/soporte/reportes/${activeReporte.id}/mensajes`);
      setMensajes(res.data.mensajes);
      setTimeout(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, 50);
    } catch (err) {
      console.error(err);
      toast.error(isEn ? 'Error sending message' : 'Error al enviar el mensaje', { theme: 'dark' });
    } finally {
      setSendingReply(false);
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {filteredReportes.map(r => (
            <div
              key={r.id}
              className="glass-card"
              onClick={() => openThread(r)}
              style={{ padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', cursor: 'pointer' }}
            >
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {r.username || (isEn ? 'Unknown user' : 'Usuario desconocido')}
                  <span className="badge badge-partial" style={{ fontSize: '10px', padding: '2px 6px', fontWeight: 600 }}>{r.rol}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 400 }}>
                    {isEn ? 'from' : 'desde'} {r.pantalla || 'N/A'}
                  </span>
                </div>
                <div style={{ fontSize: '0.85rem', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {r.mensaje}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  {new Date(r.fecha_actualizacion).toLocaleString()}
                </div>
              </div>
              <span className={`badge ${badgeClassFor(r.estado)}`} style={{ fontWeight: 700, flexShrink: 0 }}>
                {labelFor(r.estado, isEn)}
              </span>
            </div>
          ))}
        </div>
      )}

      {activeReporte && (
        <div className="modal-overlay" style={{ zIndex: 3500 }} onClick={closeThread}>
          <div className="modal-content glass-card" style={{ maxWidth: '560px', width: '95%', height: '600px', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h2 style={{ fontSize: '1.1rem', margin: 0, fontWeight: 700 }}>
                  {activeReporte.username} <span className="badge badge-partial" style={{ fontSize: '10px', padding: '2px 6px', fontWeight: 600 }}>{activeReporte.rol}</span>
                </h2>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  {isEn ? 'from' : 'desde'} {activeReporte.pantalla}
                </div>
              </div>
              <button className="btn-icon" onClick={closeThread}><X size={22} /></button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0.75rem 0' }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                {isEn ? 'Status' : 'Estado'}:
              </label>
              <select
                className="form-input"
                style={{ width: 'auto', padding: '4px 8px', fontSize: '0.85rem' }}
                value={activeReporte.estado}
                onChange={e => handleEstadoChange(activeReporte.id, e.target.value)}
              >
                {ESTADOS.map(e => <option key={e} value={e}>{labelFor(e, isEn)}</option>)}
              </select>
            </div>

            <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.6rem', padding: '0.5rem', background: 'rgba(0,0,0,0.1)', borderRadius: '8px' }}>
              {loadingThread ? (
                <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '1rem' }}>
                  {isEn ? 'Loading...' : 'Cargando...'}
                </div>
              ) : (
                <>
                  {mensajes.map((m, idx) => {
                    const isAdminMsg = m.role === 'admin';
                    return (
                      <div key={idx} style={{ alignSelf: isAdminMsg ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
                        <div style={{
                          background: isAdminMsg ? 'linear-gradient(135deg, #7c3aed, #4f46e5)' : 'rgba(255,255,255,0.06)',
                          color: isAdminMsg ? 'white' : 'var(--text-primary)',
                          padding: '0.5rem 0.7rem',
                          borderRadius: '10px',
                          fontSize: '0.85rem',
                          whiteSpace: 'pre-wrap'
                        }}>
                          {m.mensaje}
                        </div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '2px', textAlign: isAdminMsg ? 'right' : 'left' }}>
                          {isAdminMsg ? (m.username ? m.username : (isEn ? 'Support' : 'Soporte')) : m.username} · {new Date(m.fecha_creacion).toLocaleString()}
                        </div>
                      </div>
                    );
                  })}
                  {adjuntosHilo.length > 0 && (
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {adjuntosHilo.map(a => {
                        const src = getFileSrc(a.archivo);
                        const isImage = /\.(jpe?g|png|webp|gif)$/i.test(a.archivo);
                        return isImage ? (
                          <img key={a.id} src={src} alt={a.nombre_original || 'adjunto'} style={{ width: 70, height: 70, borderRadius: 8, objectFit: 'cover', border: '1px solid var(--border-color)' }} />
                        ) : (
                          <a key={a.id} href={src} target="_blank" rel="noopener noreferrer" className="btn btn-secondary" style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <FileText size={14} /> {a.nombre_original || 'PDF'}
                          </a>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>

            <form onSubmit={handleSendReply} style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
              <input
                type="text"
                className="form-input"
                style={{ flex: 1 }}
                placeholder={isEn ? 'Write a reply...' : 'Escribe una respuesta...'}
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
              />
              <button type="submit" className="btn btn-primary" disabled={sendingReply || !replyText.trim()}>
                <Send size={16} />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
