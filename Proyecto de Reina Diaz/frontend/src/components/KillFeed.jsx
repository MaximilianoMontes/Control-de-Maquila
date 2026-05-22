import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { ArrowRight, PlusCircle, Edit3, Trash2, AlertTriangle, Info, X } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import API_URL from '../config';

const API = API_URL;

export default function KillFeed() {
  const { settings, t, translateLog } = useSettings();
  const [logs, setLogs] = useState([]);
  const [visibleLogs, setVisibleLogs] = useState([]);
  const lastIdRef = useRef(0);
  const [floats, setFloats] = useState([]); // Array of { id, x, y, emoji }

  const alertsEnabled = settings.alerts !== 'disabled';

  useEffect(() => {
    if (!alertsEnabled) {
      setVisibleLogs([]);
      return;
    }

    // Initial fetch to set the baseline
    const getInitial = async () => {
      try {
        const res = await axios.get(`${API}/api/historial?limit=5`);
        if (res.data.length > 0) {
          lastIdRef.current = res.data[0].id;
        }
      } catch (e) {
        console.error("Error fetching initial history", e);
      }
    };
    getInitial();

    // Polling every 5 seconds
    const interval = setInterval(async () => {
      try {
        const res = await axios.get(`${API}/api/historial?recent=true`);
        const currentLastId = lastIdRef.current;
        // Filtrar solo los nuevos
        const newLogs = res.data.filter(l => l.id > currentLastId).reverse();
        if (newLogs.length > 0) {
          lastIdRef.current = newLogs[newLogs.length - 1].id;
          newLogs.forEach(log => {
            addNotification(log);
          });
        }
      } catch (e) {
        console.error("Error polling history", e);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [alertsEnabled]);

  const addNotification = (log) => {
    setVisibleLogs(prev => {
      // Prevent duplicates by ID or identical description/target/action within the active visible logs
      if (prev.some(n => n.id === log.id || (n.description === log.description && n.target === log.target && n.action === log.action))) {
        return prev;
      }
      
      const id = Math.random().toString(36).substr(2, 9);
      const newNotif = { ...log, tempId: id, fading: false };
      
      // Start fade out after 8.5s
      setTimeout(() => {
        setVisibleLogs(curr => curr.map(n => n.tempId === id ? { ...n, fading: true } : n));
      }, 8500);

      // Remove after 9s
      setTimeout(() => {
        setVisibleLogs(curr => curr.filter(n => n.tempId !== id));
      }, 9000);

      return [...prev, newNotif];
    });
  };

  const handleDismiss = (tempId) => {
    setVisibleLogs(prev => prev.filter(n => n.tempId !== tempId));
  };

  const handleReact = (e, emoji) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top;
    
    const id = Math.random().toString(36).substr(2, 9);
    const newFloat = { id, x, y, emoji };
    
    setFloats(prev => [...prev, newFloat]);
    
    setTimeout(() => {
      setFloats(prev => prev.filter(f => f.id !== id));
    }, 1500);
  };

  // Render floats even if visibleLogs is empty, as long as there are active floating reactions
  if (!alertsEnabled || (visibleLogs.length === 0 && floats.length === 0)) return null;

  return (
    <>
      {visibleLogs.length > 0 && (
        <div className="kill-feed">
          {visibleLogs.map(log => {
            const normAction = (log.action || '').toUpperCase();
            const translatedAction = normAction === 'ALTA' ? t('hist.actionAlta') : normAction === 'EDIT' ? t('hist.actionEdit') : normAction === 'BAJA' ? t('hist.actionBaja') : log.action;
            const targetKey = 'hist.target.' + log.target;
            const translatedTarget = t(targetKey) !== targetKey ? t(targetKey) : log.target;
            
            let ActionIcon = Info;
            let actionClass = 'action-default';
            let borderStyle = {};
            
            if (normAction === 'ALTA') {
              ActionIcon = PlusCircle;
              actionClass = 'action-alta';
              borderStyle = { borderLeft: '4px solid var(--success-color)' };
            } else if (normAction === 'EDIT') {
              ActionIcon = Edit3;
              actionClass = 'action-edit';
              borderStyle = { borderLeft: '4px solid #fbbf24' };
            } else if (normAction === 'BAJA') {
              ActionIcon = Trash2;
              actionClass = 'action-baja';
              borderStyle = { borderLeft: '4px solid var(--danger-color)' };
            }

            return (
              <div 
                key={log.tempId} 
                className={`kill-item ${log.fading ? 'fade-out' : ''}`}
                style={borderStyle}
              >
                <div className="kill-main-content">
                  <div className="kill-header-row">
                    <ActionIcon className={`kill-type-icon ${actionClass}-text`} size={15} />
                    <span className="kill-username">{log.username}</span>
                    <ArrowRight className="kill-arrow" size={12} />
                    <span className={`kill-action ${actionClass}`}>
                      {translatedAction}
                    </span>
                    <ArrowRight className="kill-arrow" size={12} />
                    <span className="kill-target">{translatedTarget}</span>
                  </div>
                  
                  {/* Detalle del movimiento */}
                  <div className="kill-description">
                    {translateLog(log.description)}
                  </div>
                </div>

                {/* Hover controls overlay */}
                <div className="kill-controls">
                  <button className="kill-btn-emoji" onClick={(e) => handleReact(e, '👍')} title="Like">👍</button>
                  <button className="kill-btn-emoji" onClick={(e) => handleReact(e, '🎉')} title="Celebrate">🎉</button>
                  <button className="kill-btn-emoji" onClick={(e) => handleReact(e, '⚠️')} title="Warning">⚠️</button>
                  <button className="kill-btn-close" onClick={() => handleDismiss(log.tempId)} title="Dismiss">
                    <X size={12} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Floating Reactions Overlay */}
      {floats.length > 0 && (
        <div className="floating-reactions-container">
          {floats.map(f => (
            <span 
              key={f.id} 
              className="floating-reaction"
              style={{ 
                left: `${f.x}px`, 
                top: `${f.y}px`
              }}
            >
              {f.emoji}
            </span>
          ))}
        </div>
      )}
    </>
  );
}
