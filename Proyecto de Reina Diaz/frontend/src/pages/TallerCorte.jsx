import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { 
  Scissors, Users, Calendar, Check, X, Lock, Unlock, 
  Download, ChevronLeft, ChevronRight, Edit2, Plus, 
  Trash2, Play, AlertTriangle, Calculator, FileText,
  Home, LogOut, Layers
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import SearchableSelect from '../components/SearchableSelect';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function TallerCorte() {
  const { settings } = useSettings();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const isEn = settings?.language === 'en';

  const [activeTab, setActiveTab] = useState('registro'); // 'registro', 'reporte', 'personal'
  const [personal, setPersonal] = useState([]);
  const [loading, setLoading] = useState(false);

  // Pestaña 1: Registro Diario
  const [fechaRegistro, setFechaRegistro] = useState(new Date().toISOString().split('T')[0]);
  const [asistencias, setAsistencias] = useState({}); // { personal_id: true/false }
  const [produccion, setProduccion] = useState({
    piezas_proyectadas: 0,
    piezas_cortadas: 0,
    piezas_foliadas: 0,
    piezas_tendidas: 0,
    piezas_fusionadas: 0
  });
  const [isWeekClosed, setIsWeekClosed] = useState(false);
  const [weekDetails, setWeekDetails] = useState({ anio: 0, semana: 0 });

  // Pestaña 2: Reporte Semanal
  const [fechaFiltro, setFechaFiltro] = useState(new Date().toISOString().split('T')[0]);
  const [reportData, setReportData] = useState({
    dias: [], // [{ fecha, diaLabel }]
    asistencias: {}, // { fecha: { personal_id: { asistio, salario_guardado } } }
    produccion: {}, // { fecha: { piezas_... } }
    semanaCerrada: false,
    anio: 0,
    semana: 0
  });

  // Pestaña 3: Catálogo Personal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEmpleado, setNewEmpleado] = useState({ nombre: '', salario_diario: '' });
  const [editingEmpleado, setEditingEmpleado] = useState(null);

  useEffect(() => {
    fetchPersonal();
  }, []);

  useEffect(() => {
    if (activeTab === 'registro') {
      checkWeekStatus();
      fetchDailyData();
    } else if (activeTab === 'reporte') {
      fetchWeeklyReport();
    }
  }, [activeTab, fechaRegistro, fechaFiltro]);

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  const fetchPersonal = async () => {
    try {
      const res = await axios.get(`${API}/api/corte/personal?includeInactive=true`, { headers });
      setPersonal(res.data);
    } catch (e) {
      console.error(e);
      toast.error(isEn ? 'Error fetching staff' : 'Error al obtener personal', { theme: 'dark' });
    }
  };

  // --- LOGICA PESTAÑA 1: REGISTRO DIARIO ---

  const checkWeekStatus = async () => {
    try {
      const res = await axios.get(`${API}/api/corte/semanas/status?fecha=${fechaRegistro}`, { headers });
      setIsWeekClosed(res.data.cerrada);
      setWeekDetails({ anio: res.data.anio, semana: res.data.semana });
    } catch (e) {
      console.error(e);
    }
  };

  const fetchDailyData = async () => {
    setLoading(true);
    try {
      // 1. Obtener asistencia de este día
      const resAsist = await axios.get(`${API}/api/corte/asistencia?start=${fechaRegistro}&end=${fechaRegistro}`, { headers });
      const asistMap = {};
      
      // Inicializar con todos los activos en true por defecto si no hay registros anteriores
      const activos = personal.filter(p => p.activo === 1);
      activos.forEach(p => {
        asistMap[p.id] = true;
      });

      if (resAsist.data.length > 0) {
        resAsist.data.forEach(a => {
          asistMap[a.personal_id] = a.asistio === 1;
        });
      }
      setAsistencias(asistMap);

      // 2. Obtener producción de este día
      const resProd = await axios.get(`${API}/api/corte/produccion?start=${fechaRegistro}&end=${fechaRegistro}`, { headers });
      if (resProd.data.length > 0) {
        setProduccion(resProd.data[0]);
      } else {
        setProduccion({
          piezas_proyectadas: 0,
          piezas_cortadas: 0,
          piezas_foliadas: 0,
          piezas_tendidas: 0,
          piezas_fusionadas: 0
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDaily = async (e) => {
    e.preventDefault();
    if (isWeekClosed) {
      toast.warning(isEn ? 'This week is closed. Cannot modify.' : 'Esta semana está cerrada. No se puede modificar.', { theme: 'dark' });
      return;
    }

    try {
      // 1. Guardar Asistencia
      const asistList = Object.keys(asistencias).map(id => ({
        personal_id: parseInt(id),
        asistio: asistencias[id]
      }));
      await axios.post(`${API}/api/corte/asistencia`, {
        fecha: fechaRegistro,
        asistencias: asistList
      }, { headers });

      // 2. Guardar Producción
      await axios.post(`${API}/api/corte/produccion`, {
        fecha: fechaRegistro,
        piezas_proyectadas: Number(produccion.piezas_proyectadas) || 0,
        piezas_cortadas: Number(produccion.piezas_cortadas) || 0,
        piezas_foliadas: Number(produccion.piezas_foliadas) || 0,
        piezas_tendidas: Number(produccion.piezas_tendidas) || 0,
        piezas_fusionadas: Number(produccion.piezas_fusionadas) || 0
      }, { headers });

      toast.success(isEn ? 'Daily record saved successfully' : 'Registro diario guardado con éxito', { theme: 'dark' });
      fetchDailyData();
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.error || (isEn ? 'Error saving record' : 'Error al guardar el registro'), { theme: 'dark' });
    }
  };

  // --- LOGICA PESTAÑA 2: REPORTE SEMANAL ---

  const getMondayOfDate = (dStr) => {
    const d = new Date(dStr + 'T12:00:00Z');
    const day = d.getUTCDay();
    const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1); // lunes es 1
    const monday = new Date(d.setDate(diff));
    return monday.toISOString().split('T')[0];
  };

  const fetchWeeklyReport = async () => {
    setLoading(true);
    try {
      const mondayStr = getMondayOfDate(fechaFiltro);
      const mondayDate = new Date(mondayStr + 'T12:00:00Z');
      
      // Construir los 5 días de la semana laboral (Lunes a Viernes)
      const dias = [];
      const labels = isEn 
        ? ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
        : ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

      for (let i = 0; i < 5; i++) {
        const current = new Date(mondayDate.getTime());
        current.setUTCDate(mondayDate.getUTCDate() + i);
        const fStr = current.toISOString().split('T')[0];
        dias.push({
          fecha: fStr,
          diaLabel: labels[i],
          fechaShort: fStr.split('-').slice(1).reverse().join('/') // DD/MM
        });
      }

      const start = dias[0].fecha;
      const end = dias[dias.length - 1].fecha;

      // Obtener asistencias del rango
      const resAsist = await axios.get(`${API}/api/corte/asistencia?start=${start}&end=${end}`, { headers });
      const asistMap = {}; // { fecha: { personal_id: { asistio, salario_guardado } } }
      resAsist.data.forEach(a => {
        const cleanFecha = typeof a.fecha === 'string' ? a.fecha.split('T')[0] : new Date(a.fecha).toISOString().split('T')[0];
        if (!asistMap[cleanFecha]) asistMap[cleanFecha] = {};
        asistMap[cleanFecha][a.personal_id] = {
          asistio: a.asistio === 1,
          salario_guardado: Number(a.salario_guardado)
        };
      });

      // Obtener produccion del rango
      const resProd = await axios.get(`${API}/api/corte/produccion?start=${start}&end=${end}`, { headers });
      const prodMap = {}; // { fecha: { piezas_... } }
      resProd.data.forEach(p => {
        const cleanFecha = typeof p.fecha === 'string' ? p.fecha.split('T')[0] : new Date(p.fecha).toISOString().split('T')[0];
        prodMap[cleanFecha] = p;
      });

      // Chequear si la semana está cerrada
      const resStatus = await axios.get(`${API}/api/corte/semanas/status?fecha=${start}`, { headers });

      setReportData({
        dias,
        asistencias: asistMap,
        produccion: prodMap,
        semanaCerrada: resStatus.data.cerrada,
        anio: resStatus.data.anio,
        semana: resStatus.data.semana
      });
    } catch (e) {
      console.error(e);
      toast.error(isEn ? 'Error fetching weekly report' : 'Error al obtener el reporte semanal', { theme: 'dark' });
    } finally {
      setLoading(false);
    }
  };

  const handleCerrarSemana = async () => {
    if (window.confirm(isEn 
      ? `Are you sure you want to CLOSE week ${reportData.semana} of ${reportData.anio}? This will freeze all data and prevent any edits.` 
      : `¿Estás seguro de que deseas CERRAR la semana ${reportData.semana} del ${reportData.anio}? Esto congelará todos los datos y no se podrá volver a editar.`
    )) {
      try {
        await axios.post(`${API}/api/corte/semanas/cerrar`, {
          anio: reportData.anio,
          semana: reportData.semana
        }, { headers });
        toast.success(isEn ? 'Week closed successfully' : 'Semana cerrada con éxito', { theme: 'dark' });
        fetchWeeklyReport();
        checkWeekStatus();
      } catch (e) {
        console.error(e);
        toast.error(isEn ? 'Error closing week' : 'Error al cerrar la semana', { theme: 'dark' });
      }
    }
  };

  // --- LOGICA PESTAÑA 3: CATALOGO PERSONAL ---

  const handleAddEmpleado = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/api/corte/personal`, newEmpleado, { headers });
      toast.success(isEn ? 'Employee added successfully' : 'Cortador agregado con éxito', { theme: 'dark' });
      setNewEmpleado({ nombre: '', salario_diario: '' });
      setShowAddModal(false);
      fetchPersonal();
    } catch (e) {
      console.error(e);
      toast.error(isEn ? 'Error adding employee' : 'Error al agregar cortador', { theme: 'dark' });
    }
  };

  const handleEditEmpleadoSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${API}/api/corte/personal/${editingEmpleado.id}`, editingEmpleado, { headers });
      toast.success(isEn ? 'Employee updated successfully' : 'Cortador actualizado con éxito', { theme: 'dark' });
      setEditingEmpleado(null);
      fetchPersonal();
    } catch (e) {
      console.error(e);
      toast.error(isEn ? 'Error updating employee' : 'Error al actualizar cortador', { theme: 'dark' });
    }
  };

  const toggleEmpleadoActivo = async (emp) => {
    try {
      await axios.put(`${API}/api/corte/personal/${emp.id}`, { activo: emp.activo === 1 ? 0 : 1 }, { headers });
      toast.success(isEn ? 'Status updated' : 'Estado actualizado', { theme: 'dark' });
      fetchPersonal();
    } catch (e) {
      console.error(e);
    }
  };

  // --- CALCULOS AUXILIARES PARA LA TABLA SEMANAL ---

  // Obtener salario acumulado de un empleado en la semana
  const getEmpleadoSemanalTotal = (empId) => {
    let total = 0;
    reportData.dias.forEach(d => {
      const asistInfo = reportData.asistencias[d.fecha]?.[empId];
      if (asistInfo?.asistio) {
        total += asistInfo.salario_guardado;
      }
    });
    return total;
  };

  // Obtener nómina total de un día específico
  const getDiaNominaTotal = (fecha) => {
    let total = 0;
    personal.forEach(p => {
      const asistInfo = reportData.asistencias[fecha]?.[p.id];
      if (asistInfo?.asistio) {
        total += asistInfo.salario_guardado;
      }
    });
    return total;
  };

  // Obtener número de empleados que asistieron un día
  const getDiaAsistenciaCount = (fecha) => {
    let count = 0;
    personal.forEach(p => {
      const asistInfo = reportData.asistencias[fecha]?.[p.id];
      if (asistInfo?.asistio) {
        count++;
      }
    });
    return count;
  };

  return (
    <div className="app-layout">
      {/* Sidebar personalizado del Módulo de Corte */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <Layers size={26} color="#ef4444" style={{ filter: 'drop-shadow(0 0 8px rgba(239, 68, 68, 0.4))' }} />
          <span className="gradient-text" style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>
            {isEn ? 'Cutting Room' : 'Taller de Corte'}
          </span>
        </div>

        <nav className="nav-links" style={{ marginBottom: '1rem' }}>
          <button 
            className={`nav-link ${activeTab === 'registro' ? 'active' : ''}`}
            onClick={() => setActiveTab('registro')}
            style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}
          >
            <Calendar size={20} />
            {isEn ? 'Daily Log' : 'Registro Diario'}
          </button>

          <button 
            className={`nav-link ${activeTab === 'reporte' ? 'active' : ''}`}
            onClick={() => setActiveTab('reporte')}
            style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}
          >
            <Calculator size={20} />
            {isEn ? 'Weekly Costs' : 'Reporte de Costos'}
          </button>

          <button 
            className={`nav-link ${activeTab === 'personal' ? 'active' : ''}`}
            onClick={() => setActiveTab('personal')}
            style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}
          >
            <Users size={20} />
            {isEn ? 'Cutting Staff' : 'Personal de Corte'}
          </button>
        </nav>

        {/* Botones al fondo */}
        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <Link 
            to="/" 
            className="btn" 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '8px', 
              background: 'rgba(255,255,255,0.03)', 
              border: '1px solid rgba(255,255,255,0.05)', 
              color: 'var(--text-primary)',
              padding: '10px',
              borderRadius: '8px',
              fontSize: '0.95rem',
              textDecoration: 'none'
            }}
          >
            <Home size={18} /> {isEn ? 'Back to Launcher' : 'Volver al Inicio'}
          </Link>

          <button 
            className="btn logout-btn" 
            onClick={() => { logout(); navigate('/login'); }} 
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%' }}
          >
            <LogOut size={20} /> {isEn ? 'Log Out' : 'Cerrar Sesión'}
          </button>
        </div>
      </aside>

      {/* Contenedor Principal */}
      <div className="main-container">
        <main className="main-content" style={{ padding: '2rem' }}>
          
          {/* --- TAB 1: REGISTRO DIARIO --- */}
          {activeTab === 'registro' && (
            <div className="row">
              <div className="col-md-12 mb-4">
                <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                  <div className="d-flex align-items-center gap-3">
                    <label className="form-label" style={{ margin: 0, fontWeight: 'bold', minWidth: '110px' }}>
                      {isEn ? 'Work Date:' : 'Fecha de Trabajo:'}
                    </label>
                    <input 
                      type="date" 
                      className="form-input" 
                      style={{ maxWidth: '200px' }}
                      value={fechaRegistro}
                      onChange={e => setFechaRegistro(e.target.value)}
                    />
                  </div>

                  <div className="d-flex align-items-center gap-2" style={{ marginLeft: 'auto' }}>
                    {isWeekClosed ? (
                      <span className="badge badge-danger" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', fontSize: '0.9rem' }}>
                        <Lock size={16} /> {isEn ? `Week ${weekDetails.semana} Closed (Locked)` : `Semana ${weekDetails.semana} Cerrada (Bloqueado)`}
                      </span>
                    ) : (
                      <span className="badge badge-success" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', fontSize: '0.9rem' }}>
                        <Unlock size={16} /> {isEn ? `Week ${weekDetails.semana} Open` : `Semana ${weekDetails.semana} Abierta`}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="col-md-12">
                <form onSubmit={handleSaveDaily}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '2rem' }}>
                    {/* Panel de Asistencia */}
                    <div className="glass-card" style={{ padding: '1.5rem' }}>
                      <h3 style={{ fontSize: '1.2rem', margin: '0 0 1.2rem 0', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
                        <Users size={18} color="#3b82f6" /> {isEn ? 'Attendance Check' : 'Pase de Asistencia'}
                      </h3>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '350px', overflowY: 'auto', paddingRight: '5px' }}>
                        {personal.filter(p => p.activo === 1).map(emp => (
                          <div 
                            key={emp.id} 
                            style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'space-between', 
                              padding: '10px 14px', 
                              background: 'rgba(255,255,255,0.02)', 
                              borderRadius: '8px',
                              border: '1px solid var(--border-color)'
                            }}
                          >
                            <div>
                              <span style={{ fontWeight: '500', display: 'block' }}>{emp.nombre}</span>
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                {isEn ? 'Daily Salary:' : 'Sueldo Diario:'} ${Number(emp.salario_diario).toFixed(2)}
                              </span>
                            </div>
                            <input 
                              type="checkbox" 
                              className="form-checkbox"
                              style={{ width: '22px', height: '22px', cursor: isWeekClosed ? 'not-allowed' : 'pointer' }}
                              checked={!!asistencias[emp.id]}
                              disabled={isWeekClosed}
                              onChange={e => setAsistencias({...asistencias, [emp.id]: e.target.checked})}
                            />
                          </div>
                        ))}
                        {personal.filter(p => p.activo === 1).length === 0 && (
                          <p className="text-muted" style={{ textAlign: 'center', fontSize: '0.9rem', margin: '20px 0' }}>
                            {isEn ? 'No active cutters registered.' : 'No hay cortadores activos registrados.'}
                          </p>
                        )}
                      </div>

                      {/* Resumen Gasto del Día */}
                      <div 
                        style={{ 
                          marginTop: '1.5rem', 
                          padding: '12px 16px', 
                          background: 'rgba(14, 165, 233, 0.1)', 
                          borderRadius: '8px',
                          border: '1px solid rgba(14, 165, 233, 0.2)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <span style={{ fontWeight: '500' }}>{isEn ? 'Total Daily Payroll:' : 'Nómina del Día:'}</span>
                        <span style={{ fontWeight: 'bold', fontSize: '1.2rem', color: '#0ea5e9' }}>
                          ${personal.reduce((sum, p) => sum + (asistencias[p.id] ? Number(p.salario_diario) : 0), 0).toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {/* Panel de Producción Física */}
                    <div className="glass-card" style={{ padding: '1.5rem' }}>
                      <h3 style={{ fontSize: '1.2rem', margin: '0 0 1.2rem 0', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
                        <Scissors size={18} color="#10b981" /> {isEn ? 'Daily Production (Pieces)' : 'Producción Física del Día (Piezas)'}
                      </h3>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                        <div className="form-group">
                          <label className="form-label" style={{ fontWeight: 'bold', color: '#38bdf8' }}>
                            {isEn ? 'Meta: Projected Pieces (Goal)' : 'Meta: Piezas Proyectadas'}
                          </label>
                          <input 
                            type="number" 
                            required 
                            className="form-input" 
                            value={produccion.piezas_proyectadas}
                            disabled={isWeekClosed}
                            onChange={e => setProduccion({...produccion, piezas_proyectadas: parseInt(e.target.value) || 0})}
                          />
                        </div>

                        <div className="form-group">
                          <label className="form-label">
                            {isEn ? 'Step 1: Actual Laid (Tendido)' : '1. Piezas Tendidas Reales (Tendido)'}
                          </label>
                          <input 
                            type="number" 
                            required 
                            className="form-input" 
                            value={produccion.piezas_tendidas}
                            disabled={isWeekClosed}
                            onChange={e => setProduccion({...produccion, piezas_tendidas: parseInt(e.target.value) || 0})}
                          />
                        </div>

                        <div className="form-group">
                          <label className="form-label">
                            {isEn ? 'Step 2: Actual Cut Pieces' : '2. Piezas Cortadas Reales (Corte)'}
                          </label>
                          <input 
                            type="number" 
                            required 
                            className="form-input" 
                            value={produccion.piezas_cortadas}
                            disabled={isWeekClosed}
                            onChange={e => setProduccion({...produccion, piezas_cortadas: parseInt(e.target.value) || 0})}
                          />
                        </div>

                        <div className="form-group">
                          <label className="form-label">
                            {isEn ? 'Step 3: Actual Numbered (Foliado)' : '3. Piezas Foliadas Reales (Foliado)'}
                          </label>
                          <input 
                            type="number" 
                            required 
                            className="form-input" 
                            value={produccion.piezas_foliadas}
                            disabled={isWeekClosed}
                            onChange={e => setProduccion({...produccion, piezas_foliadas: parseInt(e.target.value) || 0})}
                          />
                        </div>

                        <div className="form-group">
                          <label className="form-label">
                            {isEn ? 'Step 4: Actual Fused (Fusionado)' : '4. Piezas Fusionadas Reales (Fusionado)'}
                          </label>
                          <input 
                            type="number" 
                            required 
                            className="form-input" 
                            value={produccion.piezas_fusionadas}
                            disabled={isWeekClosed}
                            onChange={e => setProduccion({...produccion, piezas_fusionadas: parseInt(e.target.value) || 0})}
                          />
                        </div>
                      </div>

                      {!isWeekClosed && (
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2.5rem' }}>
                          <button type="submit" className="btn btn-primary" style={{ padding: '0.8rem 2rem', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Check size={18} />
                            {isEn ? 'Save Daily Record' : 'Guardar Registro Diario'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* --- TAB 2: REPORTE DE RENDIMIENTO Y COSTOS --- */}
          {activeTab === 'reporte' && (
            <div className="row">
              <div className="col-md-12 mb-4">
                <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                  <div className="d-flex align-items-center gap-3">
                    <label className="form-label" style={{ margin: 0, fontWeight: 'bold' }}>
                      {isEn ? 'Select Week (Any Date):' : 'Selecciona Semana (Cualquier día):'}
                    </label>
                    <input 
                      type="date" 
                      className="form-input" 
                      style={{ maxWidth: '200px' }}
                      value={fechaFiltro}
                      onChange={e => setFechaFiltro(e.target.value)}
                    />
                  </div>

                  <div style={{ marginLeft: '1rem', padding: '6px 12px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', fontSize: '0.9rem' }}>
                    <strong>{isEn ? 'Period:' : 'Período:'}</strong> {reportData.dias[0]?.fechaShort} {isEn ? 'to' : 'al'} {reportData.dias[reportData.dias.length - 1]?.fechaShort}
                  </div>

                  <div className="d-flex align-items-center gap-3" style={{ marginLeft: 'auto' }}>
                    {reportData.semanaCerrada ? (
                      <span className="badge badge-danger" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', fontSize: '0.9rem' }}>
                        <Lock size={16} /> {isEn ? 'Week Locked' : 'Semana Cerrada'}
                      </span>
                    ) : (
                      <>
                        <span className="badge badge-success" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', fontSize: '0.9rem' }}>
                          <Unlock size={16} /> {isEn ? 'Week Open' : 'Semana Abierta'}
                        </span>
                        <button 
                          className="btn btn-primary" 
                          style={{ background: '#ef4444', borderColor: '#ef4444', display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px' }}
                          onClick={handleCerrarSemana}
                        >
                          <Lock size={16} />
                          {isEn ? 'Close & Lock Week' : 'Cerrar y Congelar Semana'}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="col-md-12">
                <div className="glass-card" style={{ padding: '1.5rem', overflowX: 'auto' }}>
                  <h3 style={{ fontSize: '1.2rem', margin: '0 0 1.2rem 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FileText size={18} color="#0ea5e9" />
                    {isEn ? `Efficiency and Cost Sheet - Week ${reportData.semana} (${reportData.anio})` : `Hoja de Rendimiento y Costos - Semana ${reportData.semana} del ${reportData.anio}`}
                  </h3>

                  <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                        <th style={{ textAlign: 'left', padding: '12px' }}>{isEn ? 'Employee Name' : 'Nombre del Empleado'}</th>
                        <th style={{ textAlign: 'right', padding: '12px' }}>{isEn ? 'Daily Salary' : 'Salario Diario'}</th>
                        {reportData.dias.map(d => (
                          <th key={d.fecha} style={{ textAlign: 'center', padding: '12px' }}>
                            {d.diaLabel}
                            <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>{d.fechaShort}</span>
                          </th>
                        ))}
                        <th style={{ textAlign: 'right', padding: '12px', background: 'rgba(14,165,233,0.05)', fontWeight: 'bold' }}>{isEn ? 'Weekly Total' : 'Total Semana'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {personal.map(p => {
                        const weeklyTotal = getEmpleadoSemanalTotal(p.id);
                        const hasAsistencia = weeklyTotal > 0;
                        if (p.activo === 0 && !hasAsistencia) return null;

                        return (
                          <tr key={p.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <td style={{ padding: '10px 12px', fontWeight: '500' }}>{p.nombre}</td>
                            <td style={{ padding: '10px 12px', textAlign: 'right' }}>${Number(p.salario_diario).toFixed(2)}</td>
                            {reportData.dias.map(d => {
                              const asist = reportData.asistencias[d.fecha]?.[p.id]?.asistio;
                              return (
                                <td key={d.fecha} style={{ padding: '10px 12px', textAlign: 'center' }}>
                                  {asist ? (
                                    <span style={{ color: '#10b981', fontWeight: 'bold', fontSize: '1.1rem' }}>X</span>
                                  ) : (
                                    <span style={{ color: 'var(--text-muted)' }}>-</span>
                                  )}
                                </td>
                              );
                            })}
                            <td style={{ padding: '10px 12px', textAlign: 'right', background: 'rgba(14,165,233,0.02)', fontWeight: 'bold' }}>
                              ${weeklyTotal.toFixed(2)}
                            </td>
                          </tr>
                        );
                      })}

                      <tr style={{ background: 'rgba(255,255,255,0.03)', fontWeight: 'bold', borderTop: '2px solid var(--border-color)' }}>
                        <td style={{ padding: '12px' }}>{isEn ? 'TOTAL DAILY PAYROLL' : 'SALARIO TOTAL DIARIO'}</td>
                        <td style={{ padding: '12px' }}></td>
                        {reportData.dias.map(d => (
                          <td key={d.fecha} style={{ padding: '12px', textAlign: 'center' }}>
                            ${getDiaNominaTotal(d.fecha).toFixed(2)}
                          </td>
                        ))}
                        <td style={{ padding: '12px', textAlign: 'right', background: 'rgba(14,165,233,0.08)', color: '#0ea5e9' }}>
                          ${reportData.dias.reduce((sum, d) => sum + getDiaNominaTotal(d.fecha), 0).toFixed(2)}
                        </td>
                      </tr>

                      <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '10px 12px', fontWeight: '500' }}>{isEn ? 'EMPLOYEES AT WORK' : 'CORTADORES ASISTENTES'}</td>
                        <td style={{ padding: '10px 12px' }}></td>
                        {reportData.dias.map(d => (
                          <td key={d.fecha} style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 'bold' }}>
                            {getDiaAsistenciaCount(d.fecha)}
                          </td>
                        ))}
                        <td style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.02)' }}></td>
                      </tr>

                      <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '10px 12px', fontWeight: '500' }}>{isEn ? 'PROJECTED PIECES (GOAL)' : 'PIEZAS CORTE PROYECTADAS'}</td>
                        <td style={{ padding: '10px 12px' }}></td>
                        {reportData.dias.map(d => {
                          const proj = reportData.produccion[d.fecha]?.piezas_proyectadas || 0;
                          return (
                            <td key={d.fecha} style={{ padding: '10px 12px', textAlign: 'center' }}>
                              {proj || '-'}
                            </td>
                          );
                        })}
                        <td style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.02)' }}></td>
                      </tr>

                      <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                        <td style={{ padding: '10px 12px', fontStyle: 'italic' }}>{isEn ? 'Projected Avg. Cost / Piece' : 'Costo Promedio Corte Proyectado'}</td>
                        <td style={{ padding: '10px 12px' }}></td>
                        {reportData.dias.map(d => {
                          const payroll = getDiaNominaTotal(d.fecha);
                          const proj = reportData.produccion[d.fecha]?.piezas_proyectadas || 0;
                          const cost = proj > 0 ? (payroll / proj) : 0;
                          return (
                            <td key={d.fecha} style={{ padding: '10px 12px', textAlign: 'center', fontStyle: 'italic' }}>
                              {cost > 0 ? `$${cost.toFixed(2)}` : '-'}
                            </td>
                          );
                        })}
                        <td style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.02)' }}></td>
                      </tr>

                      {/* TENDIDO REAL */}
                      <tr style={{ background: 'rgba(245,158,11,0.05)', fontWeight: 'bold' }}>
                        <td style={{ padding: '10px 12px' }}>{isEn ? 'ACTUAL LAID PIECES' : 'PIEZAS TENDIDAS REALES'}</td>
                        <td style={{ padding: '10px 12px' }}></td>
                        {reportData.dias.map(d => {
                          const val = reportData.produccion[d.fecha]?.piezas_tendidas || 0;
                          return (
                            <td key={d.fecha} style={{ padding: '10px 12px', textAlign: 'center' }}>{val || '-'}</td>
                          );
                        })}
                        <td style={{ padding: '10px 12px', textAlign: 'right', color: '#f59e0b' }}>
                          {reportData.dias.reduce((sum, d) => sum + (reportData.produccion[d.fecha]?.piezas_tendidas || 0), 0)}
                        </td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '10px 12px', fontWeight: '500' }}>{isEn ? 'Actual Daily Spreading Cost / pc' : 'COSTO TENDIDO DIARIO REAL'}</td>
                        <td style={{ padding: '10px 12px' }}></td>
                        {reportData.dias.map(d => {
                          const payroll = getDiaNominaTotal(d.fecha);
                          const proj = reportData.produccion[d.fecha]?.piezas_proyectadas || 0;
                          const real = reportData.produccion[d.fecha]?.piezas_tendidas || 0;
                          
                          const projCost = proj > 0 ? (payroll / proj) : 0;
                          const realCost = real > 0 ? (payroll / real) : 0;

                          let bgColor = 'transparent';
                          let textColor = 'inherit';
                          if (realCost > 0) {
                            if (realCost <= projCost) {
                              bgColor = 'rgba(16,185,129,0.15)';
                              textColor = '#10b981';
                            } else {
                              bgColor = 'rgba(239,68,68,0.15)';
                              textColor = '#ef4444';
                            }
                          }

                          return (
                            <td key={d.fecha} style={{ padding: '10px 12px', textAlign: 'center', backgroundColor: bgColor, color: textColor, fontWeight: realCost > 0 ? 'bold' : 'normal' }}>
                              {realCost > 0 ? `$${realCost.toFixed(2)}` : '-'}
                            </td>
                          );
                        })}
                        <td style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.02)' }}></td>
                      </tr>

                      {/* CORTE REAL */}
                      <tr style={{ background: 'rgba(14,165,233,0.05)', fontWeight: 'bold' }}>
                        <td style={{ padding: '10px 12px' }}>{isEn ? 'ACTUAL CUT PIECES' : 'PIEZAS CORTADAS REALES'}</td>
                        <td style={{ padding: '10px 12px' }}></td>
                        {reportData.dias.map(d => {
                          const val = reportData.produccion[d.fecha]?.piezas_cortadas || 0;
                          return (
                            <td key={d.fecha} style={{ padding: '10px 12px', textAlign: 'center' }}>{val || '-'}</td>
                          );
                        })}
                        <td style={{ padding: '10px 12px', textAlign: 'right', color: '#0ea5e9' }}>
                          {reportData.dias.reduce((sum, d) => sum + (reportData.produccion[d.fecha]?.piezas_cortadas || 0), 0)}
                        </td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '10px 12px', fontWeight: '500' }}>{isEn ? 'Actual Daily Cutting Cost / pc' : 'COSTO CORTE DIARIO REAL'}</td>
                        <td style={{ padding: '10px 12px' }}></td>
                        {reportData.dias.map(d => {
                          const payroll = getDiaNominaTotal(d.fecha);
                          const proj = reportData.produccion[d.fecha]?.piezas_proyectadas || 0;
                          const real = reportData.produccion[d.fecha]?.piezas_cortadas || 0;
                          
                          const projCost = proj > 0 ? (payroll / proj) : 0;
                          const realCost = real > 0 ? (payroll / real) : 0;

                          let bgColor = 'transparent';
                          let textColor = 'inherit';
                          if (realCost > 0) {
                            if (realCost <= projCost) {
                              bgColor = 'rgba(16,185,129,0.15)';
                              textColor = '#10b981';
                            } else {
                              bgColor = 'rgba(239,68,68,0.15)';
                              textColor = '#ef4444';
                            }
                          }

                          return (
                            <td key={d.fecha} style={{ padding: '10px 12px', textAlign: 'center', backgroundColor: bgColor, color: textColor, fontWeight: realCost > 0 ? 'bold' : 'normal' }}>
                              {realCost > 0 ? `$${realCost.toFixed(2)}` : '-'}
                            </td>
                          );
                        })}
                        <td style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.02)' }}></td>
                      </tr>

                      {/* FOLIADO REAL */}
                      <tr style={{ background: 'rgba(16,185,129,0.05)', fontWeight: 'bold' }}>
                        <td style={{ padding: '10px 12px' }}>{isEn ? 'ACTUAL NUMBERED PIECES' : 'PIEZAS FOLIADAS REALES'}</td>
                        <td style={{ padding: '10px 12px' }}></td>
                        {reportData.dias.map(d => {
                          const val = reportData.produccion[d.fecha]?.piezas_foliadas || 0;
                          return (
                            <td key={d.fecha} style={{ padding: '10px 12px', textAlign: 'center' }}>{val || '-'}</td>
                          );
                        })}
                        <td style={{ padding: '10px 12px', textAlign: 'right', color: '#10b981' }}>
                          {reportData.dias.reduce((sum, d) => sum + (reportData.produccion[d.fecha]?.piezas_foliadas || 0), 0)}
                        </td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '10px 12px', fontWeight: '500' }}>{isEn ? 'Actual Daily Numbering Cost / pc' : 'COSTO FOLIADO DIARIO REAL'}</td>
                        <td style={{ padding: '10px 12px' }}></td>
                        {reportData.dias.map(d => {
                          const payroll = getDiaNominaTotal(d.fecha);
                          const proj = reportData.produccion[d.fecha]?.piezas_proyectadas || 0;
                          const real = reportData.produccion[d.fecha]?.piezas_foliadas || 0;
                          
                          const projCost = proj > 0 ? (payroll / proj) : 0;
                          const realCost = real > 0 ? (payroll / real) : 0;

                          let bgColor = 'transparent';
                          let textColor = 'inherit';
                          if (realCost > 0) {
                            if (realCost <= projCost) {
                              bgColor = 'rgba(16,185,129,0.15)';
                              textColor = '#10b981';
                            } else {
                              bgColor = 'rgba(239,68,68,0.15)';
                              textColor = '#ef4444';
                            }
                          }

                          return (
                            <td key={d.fecha} style={{ padding: '10px 12px', textAlign: 'center', backgroundColor: bgColor, color: textColor, fontWeight: realCost > 0 ? 'bold' : 'normal' }}>
                              {realCost > 0 ? `$${realCost.toFixed(2)}` : '-'}
                            </td>
                          );
                        })}
                        <td style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.02)' }}></td>
                      </tr>

                      {/* FUSIONADO REAL */}
                      <tr style={{ background: 'rgba(139,92,246,0.05)', fontWeight: 'bold' }}>
                        <td style={{ padding: '10px 12px' }}>{isEn ? 'ACTUAL FUSED PIECES' : 'PIEZAS FUSIONADAS REALES'}</td>
                        <td style={{ padding: '10px 12px' }}></td>
                        {reportData.dias.map(d => {
                          const val = reportData.produccion[d.fecha]?.piezas_fusionadas || 0;
                          return (
                            <td key={d.fecha} style={{ padding: '10px 12px', textAlign: 'center' }}>{val || '-'}</td>
                          );
                        })}
                        <td style={{ padding: '10px 12px', textAlign: 'right', color: '#8b5cf6' }}>
                          {reportData.dias.reduce((sum, d) => sum + (reportData.produccion[d.fecha]?.piezas_fusionadas || 0), 0)}
                        </td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '10px 12px', fontWeight: '500' }}>{isEn ? 'Actual Daily Fusing Cost / pc' : 'COSTO FUSIONADO DIARIO REAL'}</td>
                        <td style={{ padding: '10px 12px' }}></td>
                        {reportData.dias.map(d => {
                          const payroll = getDiaNominaTotal(d.fecha);
                          const proj = reportData.produccion[d.fecha]?.piezas_proyectadas || 0;
                          const real = reportData.produccion[d.fecha]?.piezas_fusionadas || 0;
                          
                          const projCost = proj > 0 ? (payroll / proj) : 0;
                          const realCost = real > 0 ? (payroll / real) : 0;

                          let bgColor = 'transparent';
                          let textColor = 'inherit';
                          if (realCost > 0) {
                            if (realCost <= projCost) {
                              bgColor = 'rgba(16,185,129,0.15)';
                              textColor = '#10b981';
                            } else {
                              bgColor = 'rgba(239,68,68,0.15)';
                              textColor = '#ef4444';
                            }
                          }

                          return (
                            <td key={d.fecha} style={{ padding: '10px 12px', textAlign: 'center', backgroundColor: bgColor, color: textColor, fontWeight: realCost > 0 ? 'bold' : 'normal' }}>
                              {realCost > 0 ? `$${realCost.toFixed(2)}` : '-'}
                            </td>
                          );
                        })}
                        <td style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.02)' }}></td>
                      </tr>

                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* --- TAB 3: CATALOGO DE PERSONAL --- */}
          {activeTab === 'personal' && (
            <div className="row">
              <div className="col-md-12 mb-4 d-flex justify-content-between align-items-center">
                <h3 style={{ fontSize: '1.2rem', margin: 0 }}>
                  {isEn ? 'Active Cutters List' : 'Lista de Cortadores Registrados'}
                </h3>
                <button 
                  className="btn btn-primary" 
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                  onClick={() => setShowAddModal(true)}
                >
                  <Plus size={16} />
                  {isEn ? 'Add Cutter' : 'Agregar Cortador'}
                </button>
              </div>

              <div className="col-md-12">
                <div className="glass-card" style={{ padding: '1.5rem' }}>
                  <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                        <th style={{ textAlign: 'left', padding: '12px' }}>{isEn ? 'Name' : 'Nombre'}</th>
                        <th style={{ textAlign: 'right', padding: '12px' }}>{isEn ? 'Daily Salary ($)' : 'Salario Diario ($)'}</th>
                        <th style={{ textAlign: 'center', padding: '12px' }}>{isEn ? 'Status' : 'Estatus'}</th>
                        <th style={{ textAlign: 'center', padding: '12px' }}>{isEn ? 'Actions' : 'Acciones'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {personal.map(emp => (
                        <tr key={emp.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '12px', fontWeight: '500' }}>{emp.nombre}</td>
                          <td style={{ padding: '12px', textAlign: 'right' }}>${Number(emp.salario_diario).toFixed(2)}</td>
                          <td style={{ padding: '12px', textAlign: 'center' }}>
                            {emp.activo === 1 ? (
                              <span className="badge badge-success">{isEn ? 'Active' : 'Activo'}</span>
                            ) : (
                              <span className="badge badge-danger">{isEn ? 'Inactive' : 'Inactivo'}</span>
                            )}
                          </td>
                          <td style={{ padding: '12px', textAlign: 'center' }}>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                              <button 
                                className="btn btn-secondary" 
                                style={{ padding: '4px 8px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                                onClick={() => setEditingEmpleado(emp)}
                              >
                                <Edit2 size={12} /> {isEn ? 'Edit' : 'Editar'}
                              </button>
                              <button 
                                className={`btn ${emp.activo === 1 ? 'btn-secondary' : 'btn-primary'}`}
                                style={{ 
                                  padding: '4px 8px', 
                                  fontSize: '0.8rem',
                                  background: emp.activo === 1 ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                                  color: emp.activo === 1 ? '#ef4444' : '#10b981',
                                  border: emp.activo === 1 ? '1px solid rgba(239,68,68,0.2)' : '1px solid rgba(16,185,129,0.2)'
                                }}
                                onClick={() => toggleEmpleadoActivo(emp)}
                              >
                                {emp.activo === 1 
                                  ? (isEn ? 'Deactivate' : 'Desactivar') 
                                  : (isEn ? 'Activate' : 'Activar')}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* --- MODAL AGREGAR EMPLEADO --- */}
          {showAddModal && (
            <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
              <div className="modal-content glass-card" style={{ maxWidth: '450px' }} onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                  <h2>{isEn ? 'Add Cutter' : 'Agregar Nuevo Cortador'}</h2>
                  <button className="modal-close-btn" onClick={() => setShowAddModal(false)}><X size={20} /></button>
                </div>
                <form onSubmit={handleAddEmpleado}>
                  <div className="modal-body">
                    <div className="form-group mb-3">
                      <label className="form-label">{isEn ? 'Full Name' : 'Nombre Completo'}</label>
                      <input 
                        type="text" 
                        required 
                        className="form-input" 
                        placeholder="Ej. Saucedo Cardenas Alexander"
                        value={newEmpleado.nombre}
                        onChange={e => setNewEmpleado({...newEmpleado, nombre: e.target.value})}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">{isEn ? 'Daily Salary ($)' : 'Salario Diario ($)'}</label>
                      <input 
                        type="number" 
                        step="0.01"
                        min="0"
                        required 
                        className="form-input" 
                        placeholder="Ej. 425.00"
                        value={newEmpleado.salario_diario}
                        onChange={e => setNewEmpleado({...newEmpleado, salario_diario: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
                    <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>{isEn ? 'Cancel' : 'Cancelar'}</button>
                    <button type="submit" className="btn btn-primary">{isEn ? 'Save' : 'Guardar'}</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* --- MODAL EDITAR EMPLEADO --- */}
          {editingEmpleado && (
            <div className="modal-overlay" onClick={() => setEditingEmpleado(null)}>
              <div className="modal-content glass-card" style={{ maxWidth: '450px' }} onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                  <h2>{isEn ? 'Edit Cutter' : 'Editar Cortador'}</h2>
                  <button className="modal-close-btn" onClick={() => setEditingEmpleado(null)}><X size={20} /></button>
                </div>
                <form onSubmit={handleEditEmpleadoSubmit}>
                  <div className="modal-body">
                    <div className="form-group mb-3">
                      <label className="form-label">{isEn ? 'Full Name' : 'Nombre Completo'}</label>
                      <input 
                        type="text" 
                        required 
                        className="form-input" 
                        value={editingEmpleado.nombre}
                        onChange={e => setEditingEmpleado({...editingEmpleado, nombre: e.target.value})}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">{isEn ? 'Daily Salary ($)' : 'Salario Diario ($)'}</label>
                      <input 
                        type="number" 
                        step="0.01"
                        min="0"
                        required 
                        className="form-input" 
                        value={editingEmpleado.salario_diario}
                        onChange={e => setEditingEmpleado({...editingEmpleado, salario_diario: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
                    <button type="button" className="btn btn-secondary" onClick={() => setEditingEmpleado(null)}>{isEn ? 'Cancel' : 'Cancelar'}</button>
                    <button type="submit" className="btn btn-primary">{isEn ? 'Update' : 'Actualizar'}</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
