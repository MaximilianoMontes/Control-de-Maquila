import { useEffect, useRef } from 'react';
import axios from 'axios';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import API_URL from '../config';
import { toast } from 'react-toastify';

const API = API_URL;

export default function KillFeed() {
  const { settings, t, translateLog } = useSettings();
  const { user } = useAuth();
  const lastIdRef = useRef(0);

  const alertsEnabled = settings.alerts !== 'disabled';
  const currentUsername = user?.username || '';
  const isEn = settings?.language === 'en';

  useEffect(() => {
    if (!alertsEnabled) return;

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
        // Filter only new logs
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
  }, [alertsEnabled, currentUsername]);

  const addNotification = (log) => {
    // Only display notifications for actions performed by OTHER users to avoid duplicate local/global toasts
    if (currentUsername && log.username && log.username.toLowerCase() === currentUsername.toLowerCase()) {
      return;
    }

    const normAction = (log.action || '').toUpperCase();
    const translatedAction = normAction === 'ALTA' ? t('hist.actionAlta') : normAction === 'EDIT' ? t('hist.actionEdit') : normAction === 'BAJA' ? t('hist.actionBaja') : log.action;
    const targetKey = 'hist.target.' + log.target;
    const translatedTarget = t(targetKey) !== targetKey ? t(targetKey) : log.target;
    const description = translateLog(log.description);

    toast(
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 'bold' }}>
          <span style={{ color: '#3b82f6' }}>{log.username}</span>
          <span style={{ color: '#94a3b8' }}>➔</span>
          <span style={{ 
            color: normAction === 'ALTA' ? '#10b981' : normAction === 'BAJA' ? '#ef4444' : '#fbbf24',
            background: normAction === 'ALTA' ? 'rgba(16, 185, 129, 0.15)' : normAction === 'BAJA' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(251, 191, 36, 0.15)',
            padding: '2px 6px',
            borderRadius: '4px',
            fontSize: '0.75rem'
          }}>
            {translatedAction}
          </span>
          <span style={{ color: '#94a3b8' }}>➔</span>
          <span style={{ color: '#e2e8f0' }}>{translatedTarget}</span>
        </div>
        <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '2px' }}>
          {description}
        </div>
      </div>,
      {
        theme: 'dark',
        icon: normAction === 'ALTA' ? '➕' : normAction === 'BAJA' ? '🗑️' : '📝',
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true
      }
    );
  };

  return null;
}
