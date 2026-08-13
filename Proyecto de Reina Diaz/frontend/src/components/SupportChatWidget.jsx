import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import { MessageCircle, X, Paperclip, Send, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import API_URL from '../config';
import { toast } from '../utils/themeNotifications';

const API = API_URL;

// Fase 1 del buzón de reportes de soporte: botón flotante visible para todo el equipo
// (menos admin, que es quien los revisa) para reportar un problema desde cualquier
// pantalla, con la ruta actual capturada automáticamente. Sin IA ni Discord todavía.
export default function SupportChatWidget() {
  const { user } = useAuth();
  const { settings } = useSettings();
  const isEn = settings?.language === 'en';
  const location = useLocation();

  const userRole = (user?.role || user?.rol || '').toString().toLowerCase().trim();

  const [isOpen, setIsOpen] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [archivos, setArchivos] = useState([]);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  if (!user || userRole === 'admin') return null;

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []).slice(0, 5);
    setArchivos(files);
  };

  const resetAndClose = () => {
    setMensaje('');
    setArchivos([]);
    setSent(false);
    setIsOpen(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!mensaje.trim() || sending) return;
    setSending(true);
    try {
      const data = new FormData();
      data.append('mensaje', mensaje.trim());
      data.append('pantalla', location.pathname);
      archivos.forEach(file => data.append('archivos', file));

      await axios.post(`${API}/api/soporte/reportes`, data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setSent(true);
      setMensaje('');
      setArchivos([]);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || (isEn ? 'Error sending report' : 'Error al enviar el reporte'), { theme: 'dark' });
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {isOpen && (
        <div
          className="glass-card"
          style={{
            position: 'fixed',
            bottom: '90px',
            right: '24px',
            width: '340px',
            maxWidth: '90vw',
            zIndex: 4000,
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            boxShadow: '0 12px 32px rgba(0,0,0,0.35)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <MessageCircle size={18} /> {isEn ? 'Report a problem' : 'Reportar un problema'}
            </h3>
            <button type="button" className="btn-icon" onClick={resetAndClose}><X size={18} /></button>
          </div>

          {sent ? (
            <div style={{ textAlign: 'center', padding: '1.5rem 0.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
              <CheckCircle2 size={36} color="#10b981" />
              <p style={{ margin: 0, fontSize: '0.9rem' }}>
                {isEn ? 'Thanks! Your report was sent.' : '¡Gracias! Tu reporte fue enviado.'}
              </p>
              <button type="button" className="btn btn-secondary" style={{ marginTop: '0.5rem' }} onClick={resetAndClose}>
                {isEn ? 'Close' : 'Cerrar'}
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                {isEn ? 'Reporting from' : 'Reportando desde'}: <strong>{location.pathname}</strong>
              </div>
              <textarea
                className="form-input"
                rows={4}
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
        </div>
      )}

      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        title={isEn ? 'Report a problem' : 'Reportar un problema'}
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
      </button>
    </>
  );
}
