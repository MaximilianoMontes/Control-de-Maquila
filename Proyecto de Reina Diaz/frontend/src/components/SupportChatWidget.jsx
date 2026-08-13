import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import { MessageCircle, X, Paperclip, Send, ArrowLeft, Plus, FileText } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import API_URL from '../config';
import { toast } from '../utils/themeNotifications';

const API = API_URL;

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

const getFileSrc = (path) => path ? (path.startsWith('http') ? path : `${API}${path}`) : null;

// Fase 1 del buzón de soporte, con conversación real (no solo un reporte de una vía):
// botón flotante visible para todo el equipo (menos admin) desde donde se puede abrir un
// reporte nuevo o continuar la plática de uno ya existente con el admin.
export default function SupportChatWidget() {
  const { user } = useAuth();
  const { settings } = useSettings();
  const isEn = settings?.language === 'en';
  const location = useLocation();

  const userRole = (user?.role || user?.rol || '').toString().toLowerCase().trim();

  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState('list'); // 'list' | 'thread' | 'new'
  const [mias, setMias] = useState([]);
  const [loadingMias, setLoadingMias] = useState(false);

  const [activeId, setActiveId] = useState(null);
  const [mensajes, setMensajes] = useState([]);
  const [adjuntosHilo, setAdjuntosHilo] = useState([]);
  const [loadingThread, setLoadingThread] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const scrollRef = useRef(null);

  const [mensaje, setMensaje] = useState('');
  const [archivos, setArchivos] = useState([]);
  const [sending, setSending] = useState(false);

  const hasUnread = mias.some(r => r.ultimo_mensaje_user_id && r.ultimo_mensaje_user_id !== user?.id);

  if (!user || userRole === 'admin') return null;

  const fetchMias = async () => {
    setLoadingMias(true);
    try {
      const res = await axios.get(`${API}/api/soporte/reportes/mias`);
      setMias(res.data);
      return res.data;
    } catch (e) {
      console.error(e);
      return [];
    } finally {
      setLoadingMias(false);
    }
  };

  const openWidget = async () => {
    setIsOpen(true);
    const data = await fetchMias();
    setView(data.length === 0 ? 'new' : 'list');
  };

  const closeWidget = () => {
    setIsOpen(false);
    setView('list');
    setActiveId(null);
  };

  const openThread = async (id) => {
    setActiveId(id);
    setView('thread');
    setLoadingThread(true);
    try {
      const res = await axios.get(`${API}/api/soporte/reportes/${id}/mensajes`);
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

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []).slice(0, 5);
    setArchivos(files);
  };

  const handleSubmitNew = async (e) => {
    e.preventDefault();
    if (!mensaje.trim() || sending) return;
    setSending(true);
    try {
      const data = new FormData();
      data.append('mensaje', mensaje.trim());
      data.append('pantalla', location.pathname);
      archivos.forEach(file => data.append('archivos', file));

      const res = await axios.post(`${API}/api/soporte/reportes`, data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setMensaje('');
      setArchivos([]);
      await fetchMias();
      await openThread(res.data.id);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || (isEn ? 'Error sending report' : 'Error al enviar el reporte'), { theme: 'dark' });
    } finally {
      setSending(false);
    }
  };

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || sendingReply || !activeId) return;
    setSendingReply(true);
    try {
      await axios.post(`${API}/api/soporte/reportes/${activeId}/mensajes`, { mensaje: replyText.trim() });
      setReplyText('');
      await openThread(activeId);
      fetchMias();
    } catch (err) {
      console.error(err);
      toast.error(isEn ? 'Error sending message' : 'Error al enviar el mensaje', { theme: 'dark' });
    } finally {
      setSendingReply(false);
    }
  };

  const activeReporte = mias.find(r => r.id === activeId);

  return (
    <>
      {isOpen && (
        <div
          className="glass-card"
          style={{
            position: 'fixed',
            bottom: '90px',
            right: '24px',
            width: '360px',
            maxWidth: '90vw',
            height: '480px',
            maxHeight: '75vh',
            zIndex: 4000,
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.6rem',
            boxShadow: '0 12px 32px rgba(0,0,0,0.35)'
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              {view === 'thread' && (
                <button type="button" className="btn-icon" onClick={() => setView('list')} style={{ padding: '2px' }}>
                  <ArrowLeft size={16} />
                </button>
              )}
              <MessageCircle size={18} /> {isEn ? 'Support' : 'Soporte'}
            </h3>
            <div style={{ display: 'flex', gap: '0.3rem' }}>
              {view !== 'new' && (
                <button type="button" className="btn-icon" title={isEn ? 'New report' : 'Nuevo reporte'} onClick={() => setView('new')}>
                  <Plus size={16} />
                </button>
              )}
              <button type="button" className="btn-icon" onClick={closeWidget}><X size={18} /></button>
            </div>
          </div>

          {/* LIST VIEW */}
          {view === 'list' && (
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {loadingMias ? (
                <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '1rem', fontSize: '0.85rem' }}>
                  {isEn ? 'Loading...' : 'Cargando...'}
                </div>
              ) : mias.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '1rem', fontSize: '0.85rem' }}>
                  {isEn ? 'No conversations yet.' : 'Todavía no tienes conversaciones.'}
                </div>
              ) : (
                mias.map(r => {
                  const needsAttention = r.ultimo_mensaje_user_id && r.ultimo_mensaje_user_id !== user?.id;
                  return (
                    <div
                      key={r.id}
                      onClick={() => openThread(r.id)}
                      className="glass-card"
                      style={{ padding: '0.6rem 0.75rem', cursor: 'pointer', border: needsAttention ? '1px solid #7c3aed' : '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{r.pantalla || 'N/A'}</span>
                        <span className={`badge ${badgeClassFor(r.estado)}`} style={{ fontSize: '9px', fontWeight: 700 }}>
                          {labelFor(r.estado, isEn)}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        {needsAttention && <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#7c3aed', flexShrink: 0 }} />}
                        {r.mensaje}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* NEW REPORT VIEW */}
          {view === 'new' && (
            <form onSubmit={handleSubmitNew} style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', flex: 1 }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                {isEn ? 'Reporting from' : 'Reportando desde'}: <strong>{location.pathname}</strong>
              </div>
              <textarea
                className="form-input"
                rows={5}
                placeholder={isEn ? 'Describe the problem...' : 'Describe el problema...'}
                value={mensaje}
                onChange={e => setMensaje(e.target.value)}
                required
                style={{ resize: 'vertical' }}
              />
              <label className="btn btn-secondary" style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem', justifyContent: 'center', cursor: 'pointer' }}>
                <Paperclip size={14} />
                {archivos.length > 0
                  ? `${archivos.length} ${isEn ? 'file(s) selected' : 'archivo(s) seleccionado(s)'}`
                  : (isEn ? 'Attach images or PDF (optional)' : 'Adjuntar imágenes o PDF (opcional)')}
                <input type="file" accept="image/*,.pdf" multiple hidden onChange={handleFileChange} />
              </label>
              <button type="submit" className="btn btn-primary" disabled={sending || !mensaje.trim()} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                <Send size={15} /> {sending ? (isEn ? 'Sending...' : 'Enviando...') : (isEn ? 'Send' : 'Enviar')}
              </button>
            </form>
          )}

          {/* THREAD VIEW */}
          {view === 'thread' && (
            <>
              {activeReporte && (
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>{activeReporte.pantalla}</span>
                  <span className={`badge ${badgeClassFor(activeReporte.estado)}`} style={{ fontSize: '9px', fontWeight: 700 }}>
                    {labelFor(activeReporte.estado, isEn)}
                  </span>
                </div>
              )}
              <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0.25rem' }}>
                {loadingThread ? (
                  <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '1rem', fontSize: '0.85rem' }}>
                    {isEn ? 'Loading...' : 'Cargando...'}
                  </div>
                ) : (
                  <>
                    {mensajes.map((m, idx) => {
                      const isMine = m.user_id === user?.id;
                      const isAdminMsg = !isMine;
                      return (
                        <div key={idx} style={{ alignSelf: isMine ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                          <div style={{
                            background: isMine ? 'linear-gradient(135deg, #7c3aed, #4f46e5)' : 'rgba(255,255,255,0.06)',
                            color: isMine ? 'white' : 'var(--text-primary)',
                            padding: '0.5rem 0.7rem',
                            borderRadius: '10px',
                            fontSize: '0.85rem',
                            whiteSpace: 'pre-wrap'
                          }}>
                            {m.mensaje}
                          </div>
                          <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '2px', textAlign: isMine ? 'right' : 'left' }}>
                            {isMine ? (isEn ? 'You' : 'Tú') : (isAdminMsg ? (isEn ? 'Support' : 'Soporte') : m.username)} · {new Date(m.fecha_creacion).toLocaleString()}
                          </div>
                        </div>
                      );
                    })}
                    {adjuntosHilo.length > 0 && (
                      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                        {adjuntosHilo.map(a => {
                          const src = getFileSrc(a.archivo);
                          const isImage = /\.(jpe?g|png|webp|gif)$/i.test(a.archivo);
                          return isImage ? (
                            <img key={a.id} src={src} alt="" style={{ width: 50, height: 50, borderRadius: 6, objectFit: 'cover' }} />
                          ) : (
                            <a key={a.id} href={src} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.2rem', color: 'var(--text-secondary)' }}>
                              <FileText size={12} /> {a.nombre_original}
                            </a>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>
              <form onSubmit={handleSendReply} style={{ display: 'flex', gap: '0.4rem' }}>
                <input
                  type="text"
                  className="form-input"
                  style={{ flex: 1 }}
                  placeholder={isEn ? 'Write a message...' : 'Escribe un mensaje...'}
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                />
                <button type="submit" className="btn btn-primary" disabled={sendingReply || !replyText.trim()} style={{ padding: '0.5rem 0.8rem' }}>
                  <Send size={15} />
                </button>
              </form>
            </>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={() => (isOpen ? closeWidget() : openWidget())}
        title={isEn ? 'Support' : 'Soporte'}
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          border: 'none',
          background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '0 8px 20px rgba(79, 70, 229, 0.45)',
          zIndex: 4000
        }}
      >
        {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
        {!isOpen && hasUnread && (
          <span style={{ position: 'absolute', top: 4, right: 4, width: 12, height: 12, borderRadius: '50%', background: '#ef4444', border: '2px solid var(--bg-primary, #1e293b)' }} />
        )}
      </button>
    </>
  );
}
