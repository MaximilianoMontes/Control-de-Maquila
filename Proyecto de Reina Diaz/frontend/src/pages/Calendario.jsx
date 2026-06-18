import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { ChevronLeft, ChevronRight, Plus, Trash2, X, Calendar as CalendarIcon, Clock, AlignLeft, Home } from 'lucide-react';
import API_URL from '../config';

export default function Calendario() {
  const { user } = useAuth();
  const { t, settings } = useSettings();
  const navigate = useNavigate();
  const isEn = settings.language === 'en';

  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  
  // Form states
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [horaInicio, setHoraInicio] = useState('09:00');
  const [fechaFin, setFechaFin] = useState('');
  const [horaFin, setHoraFin] = useState('10:00');
  const [color, setColor] = useState('#8b5cf6');

  const colores = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#64748b'];

  useEffect(() => {
    fetchEvents();
  }, [currentDate]);

  const fetchEvents = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/calendario`);
      setEvents(res.data);
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  };

  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const today = () => setCurrentDate(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const monthNamesEs = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const monthNamesEn = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNamesEs = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const dayNamesEn = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const monthNames = isEn ? monthNamesEn : monthNamesEs;
  const dayNames = isEn ? dayNamesEn : dayNamesEs;

  const handleDayClick = (day) => {
    const pad = n => n < 10 ? '0'+n : n;
    const dateStr = `${year}-${pad(month + 1)}-${pad(day)}`;
    openModal(null, dateStr);
  };

  const handleEventClick = (e, event) => {
    e.stopPropagation();
    openModal(event);
  };

  const openModal = (event = null, defaultDate = '') => {
    if (event) {
      setEditingEvent(event);
      setTitulo(event.titulo);
      setDescripcion(event.descripcion || '');
      
      const startParts = event.fecha_inicio.replace('T', ' ').split(' ');
      setFechaInicio(startParts[0]);
      setHoraInicio(startParts[1] ? startParts[1].substring(0, 5) : '09:00');
      
      const endParts = event.fecha_fin.replace('T', ' ').split(' ');
      setFechaFin(endParts[0]);
      setHoraFin(endParts[1] ? endParts[1].substring(0, 5) : '10:00');
      
      setColor(event.color || '#8b5cf6');
    } else {
      setEditingEvent(null);
      setTitulo('');
      setDescripcion('');
      const now = new Date();
      const pad = n => n < 10 ? '0'+n : n;
      const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
      const dateToUse = defaultDate || todayStr;
      setFechaInicio(dateToUse);
      setHoraInicio('09:00');
      setFechaFin(dateToUse);
      setHoraFin('10:00');
      setColor('#8b5cf6');
    }
    setShowModal(true);
  };

  const saveEvent = async (e) => {
    e.preventDefault();
    const payload = {
      titulo,
      descripcion,
      fecha_inicio: `${fechaInicio} ${horaInicio}:00`,
      fecha_fin: `${fechaFin} ${horaFin}:00`,
      color
    };

    try {
      if (editingEvent) {
        await axios.put(`${API_URL}/api/calendario/${editingEvent.id}`, payload);
      } else {
        await axios.post(`${API_URL}/api/calendario`, payload);
      }
      setShowModal(false);
      fetchEvents();
    } catch (error) {
      alert(isEn ? 'Error saving event' : 'Error guardando evento');
    }
  };

  const deleteEvent = async () => {
    if (!editingEvent) return;
    if (!confirm(isEn ? 'Are you sure you want to delete this event?' : '¿Estás seguro de que quieres eliminar este evento?')) return;
    
    try {
      await axios.delete(`${API_URL}/api/calendario/${editingEvent.id}`);
      setShowModal(false);
      fetchEvents();
    } catch (error) {
      alert(isEn ? 'Error deleting event' : 'Error eliminando evento');
    }
  };

  // Render grid
  const days = [];
  for (let i = 0; i < firstDay; i++) {
    days.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const pad = n => n < 10 ? '0'+n : n;
    const dateStr = `${year}-${pad(month + 1)}-${pad(d)}`;
    
    const dayEvents = events.filter(ev => {
      const start = ev.fecha_inicio.replace('T', ' ').split(' ')[0];
      const end = ev.fecha_fin.replace('T', ' ').split(' ')[0];
      return dateStr >= start && dateStr <= end;
    });

    const isToday = new Date(year, month, d).toDateString() === new Date().toDateString();

    days.push(
      <div key={`day-${d}`} className={`calendar-day ${isToday ? 'today' : ''}`} onClick={() => handleDayClick(d)}>
        <div className="day-number">{d}</div>
        <div className="day-events">
          {dayEvents.map(ev => {
            const timeStr = ev.fecha_inicio.replace('T', ' ').split(' ')[1];
            return (
              <div 
                key={ev.id} 
                className="calendar-event" 
                style={{ backgroundColor: ev.color || '#3b82f6' }}
                onClick={(e) => handleEventClick(e, ev)}
              >
                {timeStr ? timeStr.substring(0, 5) : '00:00'} {ev.titulo}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', height: '100vh', padding: '2rem', boxSizing: 'border-box', fontFamily: 'Inter, sans-serif', backgroundColor: 'var(--bg-body)' }}>
      <style>{`
        .calendar-container {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
          display: flex;
          flex-direction: column;
          height: calc(100vh - 180px);
        }
        .calendar-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.5rem;
          border-bottom: 1px solid var(--border-color);
        }
        .calendar-header-actions {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .calendar-nav-btn {
          background: transparent;
          border: 1px solid var(--border-color);
          color: var(--text-primary);
          padding: 0.5rem;
          border-radius: 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }
        .calendar-nav-btn:hover {
          background: var(--bg-hover);
        }
        .calendar-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          flex: 1;
          background: var(--border-color);
          gap: 1px;
        }
        .calendar-day-header {
          background: var(--bg-card);
          text-align: center;
          padding: 1rem;
          font-weight: 600;
          color: var(--text-secondary);
          font-size: 0.9rem;
        }
        .calendar-day {
          background: var(--bg-card);
          min-height: 100px;
          padding: 0.5rem;
          cursor: pointer;
          transition: background 0.2s;
          display: flex;
          flex-direction: column;
        }
        .calendar-day:hover {
          background: var(--bg-hover);
        }
        .calendar-day.empty {
          background: var(--bg-body);
          cursor: default;
        }
        .calendar-day.today .day-number {
          background: #8b5cf6;
          color: white;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
        }
        .day-number {
          font-size: 0.9rem;
          color: var(--text-primary);
          margin-bottom: 0.5rem;
          align-self: flex-end;
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .day-events {
          display: flex;
          flex-direction: column;
          gap: 4px;
          overflow-y: auto;
          flex: 1;
        }
        .calendar-event {
          color: white;
          font-size: 0.75rem;
          padding: 2px 6px;
          border-radius: 4px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          cursor: pointer;
          opacity: 0.9;
          transition: opacity 0.2s;
        }
        .calendar-event:hover {
          opacity: 1;
        }
        .modal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          backdrop-filter: blur(4px);
        }
        .modal-content {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 16px;
          width: 100%;
          max-width: 500px;
          box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04);
          overflow: hidden;
        }
        .modal-header {
          padding: 1.5rem;
          border-bottom: 1px solid var(--border-color);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .modal-body {
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .modal-footer {
          padding: 1.5rem;
          border-top: 1px solid var(--border-color);
          display: flex;
          justify-content: flex-end;
          gap: 1rem;
        }
        .color-picker {
          display: flex;
          gap: 8px;
        }
        .color-circle {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          cursor: pointer;
          border: 2px solid transparent;
          transition: transform 0.2s;
        }
        .color-circle:hover {
          transform: scale(1.1);
        }
        .color-circle.selected {
          border-color: white;
          box-shadow: 0 0 0 2px var(--text-primary);
        }
      `}</style>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }} onClick={() => navigate('/')}>
            <Home size={18} />
            {isEn ? 'Home' : 'Volver al Inicio'}
          </button>
          <h1 className="gradient-text" style={{ fontSize: '2rem', margin: 0 }}>{isEn ? 'Calendar & Alerts' : 'Calendario y Alertas'}</h1>
        </div>
        <button className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => openModal()}>
          <Plus size={18} />
          {isEn ? 'New Event' : 'Nuevo Evento'}
        </button>
      </div>

      <div className="calendar-container">
        <div className="calendar-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <h2 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--text-primary)' }}>{monthNames[month]} {year}</h2>
            <button className="btn btn-secondary" style={{ padding: '0.4rem 1rem', fontSize: '0.9rem' }} onClick={today}>
              {isEn ? 'Today' : 'Hoy'}
            </button>
          </div>
          <div className="calendar-header-actions">
            <button className="calendar-nav-btn" onClick={prevMonth}><ChevronLeft size={20} /></button>
            <button className="calendar-nav-btn" onClick={nextMonth}><ChevronRight size={20} /></button>
          </div>
        </div>

        <div className="calendar-grid">
          {/* Header Row */}
          {dayNames.map(d => (
            <div key={d} className="calendar-day-header">{d}</div>
          ))}
          
          {/* Days */}
          {days}
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-primary)' }}>
                {editingEvent ? (isEn ? 'Edit Event' : 'Editar Evento') : (isEn ? 'New Event' : 'Nuevo Evento')}
              </h3>
              <button className="btn" style={{ background: 'transparent', padding: '4px', color: 'var(--text-secondary)' }} onClick={() => setShowModal(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={saveEvent}>
              <div className="modal-body">
                
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">{isEn ? 'Title' : 'Título'}</label>
                  <div style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', top: '10px', left: '12px', color: 'var(--text-muted)' }}>
                      <CalendarIcon size={18} />
                    </div>
                    <input type="text" className="form-input" style={{ paddingLeft: '40px' }} value={titulo} onChange={e => setTitulo(e.target.value)} required placeholder={isEn ? 'Add title' : 'Añadir título'} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">{isEn ? 'Start' : 'Inicio'}</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input type="date" className="form-input" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} required />
                      <input type="time" className="form-input" value={horaInicio} onChange={e => setHoraInicio(e.target.value)} required />
                    </div>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">{isEn ? 'End' : 'Fin'}</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input type="date" className="form-input" value={fechaFin} onChange={e => setFechaFin(e.target.value)} required />
                      <input type="time" className="form-input" value={horaFin} onChange={e => setHoraFin(e.target.value)} required />
                    </div>
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">{isEn ? 'Description / Notes' : 'Descripción / Notas'}</label>
                  <div style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', top: '10px', left: '12px', color: 'var(--text-muted)' }}>
                      <AlignLeft size={18} />
                    </div>
                    <textarea className="form-input" style={{ paddingLeft: '40px', minHeight: '80px', resize: 'vertical' }} value={descripcion} onChange={e => setDescripcion(e.target.value)} placeholder={isEn ? 'Event details...' : 'Detalles del evento...'} />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">{isEn ? 'Color Label' : 'Etiqueta de Color'}</label>
                  <div className="color-picker">
                    {colores.map(c => (
                      <div 
                        key={c} 
                        className={`color-circle ${color === c ? 'selected' : ''}`} 
                        style={{ backgroundColor: c }}
                        onClick={() => setColor(c)}
                      />
                    ))}
                  </div>
                </div>

              </div>
              <div className="modal-footer">
                {editingEvent && (
                  <button type="button" className="btn" style={{ marginRight: 'auto', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '6px' }} onClick={deleteEvent}>
                    <Trash2 size={16} /> {isEn ? 'Delete' : 'Eliminar'}
                  </button>
                )}
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  {isEn ? 'Cancel' : 'Cancelar'}
                </button>
                <button type="submit" className="btn btn-primary">
                  {isEn ? 'Save' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
