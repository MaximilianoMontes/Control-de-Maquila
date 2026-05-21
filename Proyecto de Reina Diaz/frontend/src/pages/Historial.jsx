import { useState, useEffect } from 'react';
import axios from 'axios';
import { History, Search, Filter, Clock, User as UserIcon, Tag } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import API_URL from '../config';

const API = API_URL;

export default function Historial() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const { t, settings, translateLog } = useSettings();

  useEffect(() => {
    fetchHistory();
    const interval = setInterval(fetchHistory, 15000); // Auto-refresca cada 15 segundos en segundo plano
    return () => clearInterval(interval);
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await axios.get(`${API}/api/historial?limit=200`);
      setLogs(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(l => 
    l.username.toLowerCase().includes(filter.toLowerCase()) ||
    l.description.toLowerCase().includes(filter.toLowerCase()) ||
    l.target.toLowerCase().includes(filter.toLowerCase())
  );

  const getActionColor = (action) => {
    switch (action) {
      case 'ALTA': return '#10b981';
      case 'EDIT': return '#fbbf24';
      case 'BAJA': return '#ef4444';
      default: return '#64748b';
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 className="gradient-text" style={{ marginBottom: '0.5rem' }}>{t('hist.title')}</h1>
        </div>
        <div style={{ position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input 
            type="text" 
            placeholder={t('hist.search')} 
            className="form-input" 
            style={{ paddingLeft: '40px', width: '300px' }}
            value={filter}
            onChange={e => setFilter(e.target.value)}
          />
        </div>
      </div>

      <div className="glass-card">
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('hist.date')}</th>
                <th>{t('hist.user')}</th>
                <th>{t('hist.action')}</th>
                <th>{t('hist.module')}</th>
                <th>{t('hist.detail')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="5" style={{ textAlign: 'center', padding: '3rem' }}>{t('hist.loading')}</td></tr>
              ) : filteredLogs.length === 0 ? (
                <tr><td colSpan="5" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>{t('hist.noResults')}</td></tr>
              ) : (
                filteredLogs.map(log => (
                  <tr key={log.id} className="log-row">
                    <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', minWidth: '160px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Clock size={14} />
                        {new Date(log.timestamp).toLocaleString(settings.language === 'en' ? 'en-US' : 'es-MX')}
                      </div>
                    </td>
                    <td style={{ fontWeight: 600 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <UserIcon size={12} color="var(--primary-color)" />
                        </div>
                        {log.username}
                      </div>
                    </td>
                    <td>
                      <span className="badge" style={{ 
                        background: `${getActionColor(log.action)}20`, 
                        color: getActionColor(log.action),
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: getActionColor(log.action) }} />
                        {log.action === 'ALTA' ? t('hist.actionAlta') : log.action === 'EDIT' ? t('hist.actionEdit') : log.action === 'BAJA' ? t('hist.actionBaja') : log.action}
                      </span>
                    </td>
                    <td style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Tag size={14} />
                        {t('hist.target.' + log.target) !== 'hist.target.' + log.target ? t('hist.target.' + log.target) : log.target}
                      </div>
                    </td>
                    <td style={{ fontSize: '0.9rem', maxWidth: '400px' }}>
                      <span style={{ fontWeight: 500 }}>{translateLog(log.description)}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
