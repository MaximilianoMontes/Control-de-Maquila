import { useState, useEffect } from 'react';
import axios from 'axios';
import { ArrowRight } from 'lucide-react';
import API_URL from '../config';

const API = API_URL;

export default function KillFeed() {
  const [logs, setLogs] = useState([]);
  const [visibleLogs, setVisibleLogs] = useState([]);
  const [lastId, setLastId] = useState(0);

  useEffect(() => {
    // Initial fetch to set the baseline
    const getInitial = async () => {
      try {
        const res = await axios.get(`${API}/api/historial?limit=5`);
        if (res.data.length > 0) {
          setLastId(res.data[0].id);
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
        // Filtrar solo los nuevos
        const newLogs = res.data.filter(l => l.id > lastId).reverse();
        if (newLogs.length > 0) {
          setLastId(newLogs[newLogs.length - 1].id);
          newLogs.forEach(log => {
            addNotification(log);
          });
        }
      } catch (e) {
        console.error("Error polling history", e);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [lastId]);

  const addNotification = (log) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newNotif = { ...log, tempId: id, fading: false };
    
    setVisibleLogs(prev => [...prev, newNotif]);

    // Empezar a desvanecer a los 4.5s, quitar a los 5s
    setTimeout(() => {
      setVisibleLogs(prev => prev.map(n => n.tempId === id ? { ...n, fading: true } : n));
    }, 4500);

    setTimeout(() => {
      setVisibleLogs(prev => prev.filter(n => n.tempId !== id));
    }, 5000);
  };

  if (visibleLogs.length === 0) return null;

  return (
    <div className="kill-feed">
      {visibleLogs.map(log => (
        <div key={log.tempId} className={`kill-item ${log.fading ? 'fade-out' : ''}`}>
          <span className="kill-username">{log.username}</span>
          <ArrowRight className="kill-arrow" size={14} />
          <span className={`kill-action action-${log.action.toLowerCase()}`}>
            {log.action}
          </span>
          <ArrowRight className="kill-arrow" size={14} />
          <span className="kill-target">{log.target}</span>
        </div>
      ))}
    </div>
  );
}
