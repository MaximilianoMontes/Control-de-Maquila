import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Users, 
  Layers, 
  Flame, 
  Wallet, 
  Plus, 
  Check, 
  AlertCircle, 
  Phone, 
  ShieldCheck, 
  Lock, 
  Unlock, 
  ArrowRight, 
  Trash2, 
  UserPlus, 
  X,
  History,
  Download,
  Calculator
} from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import API_URL from '../config';
import PlanchaSidebar from '../components/PlanchaSidebar';
import Header from '../components/Header';

// Tallas asociadas a cada burro (1 al 10)
const BURROS_TALLAS = {
  1: '5',
  2: '7',
  3: '9',
  4: '11',
  5: '13',
  6: '5',
  7: '7',
  8: '9',
  9: '11',
  10: '13'
};

const normalizeTalla = (t) => {
  if (!t) return "";
  const num = parseInt(t, 10);
  return isNaN(num) ? t.trim() : num.toString();
};

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const cleanDate = dateStr.split('T')[0];
  const parts = cleanDate.split('-');
  if (parts.length < 3) return dateStr;
  const [year, month, day] = parts;
  return `${parseInt(day, 10)}/${parseInt(month, 10)}/${year}`;
};

export default function Plancha() {
  const { settings, t, formatCurrency } = useSettings();
  const [activeTab, setActiveTab] = useState('plancha');

  // Estados comunes
  const [planchadores, setPlanchadores] = useState([]);
  const [modelosCamion, setModelosCamion] = useState([]);
  const [modelosDisponibles, setModelosDisponibles] = useState([]);
  const [historialGeneral, setHistorialGeneral] = useState([]);

  // Estado pestaña Planchadores
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoTelefono, setNuevoTelefono] = useState('');
  const [planchadorDetalle, setPlanchadorDetalle] = useState(null);
  const [mostrarDetalleModal, setMostrarDetalleModal] = useState(false);

  // Estado pestaña Modelos (Verificación)
  const [modeloAVerificar, setModeloAVerificar] = useState(null);
  const [precioPlanchaInput, setPrecioPlanchaInput] = useState('');
  const [mostrarVerificarModal, setMostrarVerificarModal] = useState(false);

  // Estado pestaña Plancha (Drag & Drop)
  const [draggedItem, setDraggedItem] = useState(null); // { type: 'planchador'|'modelo', data: obj }
  const [burrosState, setBurrosState] = useState(
    Array.from({ length: 10 }, (_, i) => ({
      numero: i + 1,
      talla: BURROS_TALLAS[i + 1],
      planchador: null, // { id, nombre }
      modelos: [] // [{ id, modelo, imagen, piezas, maxPiezas }]
    }))
  );

  // Estado pestaña Pagos
  const [planchadorPagoDetalle, setPlanchadorPagoDetalle] = useState(null);
  const [pagoPlanchadorId, setPagoPlanchadorId] = useState('');
  const [montoPago, setMontoPago] = useState('');
  const [tipoPago, setTipoPago] = useState('completo');

  // Estado de banner de asistencia
  const [attendanceNotif, setAttendanceNotif] = useState(null); // { nombre, count }

  // Estado de modal de Ajustes / Pagos fijos
  const [showAjusteModal, setShowAjusteModal] = useState(false);
  const [ajustePlanchadorId, setAjustePlanchadorId] = useState('');
  const [ajusteRazon, setAjusteRazon] = useState('Dia adelantado');
  const [ajusteApoyoDetalle, setAjusteApoyoDetalle] = useState('Corte');
  const [ajusteMonto, setAjusteMonto] = useState('250');
  const [ajusteParamDias, setAjusteParamDias] = useState('1');
  const [ajusteParamTarifa, setAjusteParamTarifa] = useState('250');
  const [ajusteParamHoras, setAjusteParamHoras] = useState('8');
  const [ajusteParamPagoHora, setAjusteParamPagoHora] = useState('50');

  // Estado de modal de Cuadre
  const [showCuadreModal, setShowCuadreModal] = useState(false);
  const [cuadrePlanchadorId, setCuadrePlanchadorId] = useState('');
  const [cuadreStart, setCuadreStart] = useState(() => {
    // Lunes de la semana actual
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    return monday.toISOString().split('T')[0];
  });
  const [cuadreEnd, setCuadreEnd] = useState(() => {
    // Viernes de la semana actual
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1) + 4;
    const friday = new Date(d.setDate(diff));
    return friday.toISOString().split('T')[0];
  });
  const [cuadreDiaAdelantado, setCuadreDiaAdelantado] = useState('400');
  const [cuadrePlanchaReal, setCuadrePlanchaReal] = useState(0);

  // Filtros de reporte de pago
  const [reportStart, setReportStart] = useState('');
  const [reportEnd, setReportEnd] = useState('');

  // Carga inicial
  useEffect(() => {
    fetchPlanchadores();
    fetchModelosCamion();
    fetchModelosDisponibles();
  }, []);

  // Recalcular cuadre automáticamente cuando cambien las fechas o el planchador en el modal de cuadre
  useEffect(() => {
    if (showCuadreModal && cuadrePlanchadorId && cuadreStart && cuadreEnd) {
      handleCalcularCuadre(true);
    }
  }, [showCuadreModal, cuadrePlanchadorId, cuadreStart, cuadreEnd]);

  const fetchPlanchadores = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/planchadores`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPlanchadores(res.data);
    } catch (e) {
      console.error("Error al obtener planchadores:", e);
    }
  };

  const fetchModelosCamion = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/plancha/modelos`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setModelosCamion(res.data);
    } catch (e) {
      console.error("Error al obtener modelos de camión:", e);
    }
  };

  const fetchModelosDisponibles = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/plancha/disponibles`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setModelosDisponibles(res.data);
    } catch (e) {
      console.error("Error al obtener modelos disponibles:", e);
    }
  };

  const fetchHistorialGeneral = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/plancha/historial`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setHistorialGeneral(res.data);
    } catch (e) {
      console.error("Error al obtener el historial general:", e);
    }
  };

  useEffect(() => {
    if (activeTab === 'historial') {
      fetchHistorialGeneral();
    }
  }, [activeTab]);

  // --- MÉTODOS PLANCHADORES ---
  const handleAgregarPlanchador = async (e) => {
    e.preventDefault();
    if (!nuevoNombre.trim()) return;
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/api/planchadores`, {
        nombre: nuevoNombre,
        telefono: nuevoTelefono
      }, { headers: { Authorization: `Bearer ${token}` } });
      setNuevoNombre('');
      setNuevoTelefono('');
      fetchPlanchadores();
      alert('Planchador registrado correctamente');
    } catch (e) {
      console.error(e);
      alert('Error al registrar planchador');
    }
  };

  const handleEliminarPlanchador = async (id) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este planchador?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/api/planchadores/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchPlanchadores();
      alert('Planchador eliminado');
    } catch (e) {
      console.error(e);
      alert('Error al eliminar planchador');
    }
  };

  const handleVerHistorialPlanchador = async (id) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/planchadores/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPlanchadorDetalle(res.data);
      setMostrarDetalleModal(true);
    } catch (e) {
      console.error(e);
      alert('Error al obtener el historial');
    }
  };

  // --- MÉTODOS VERIFICACIÓN (MODELOS) ---
  const handleAbrirVerificacion = (modelo) => {
    setModeloAVerificar(modelo);
    setPrecioPlanchaInput('');
    setMostrarVerificarModal(true);
  };

  const handleConfirmarVerificacion = async (e) => {
    e.preventDefault();
    if (!modeloAVerificar || precioPlanchaInput === '') return;
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/api/plancha/modelos/${modeloAVerificar.id}/verificar`, {
        precio_plancha: parseFloat(precioPlanchaInput)
      }, { headers: { Authorization: `Bearer ${token}` } });

      setMostrarVerificarModal(false);
      setModeloAVerificar(null);
      setPrecioPlanchaInput('');
      fetchModelosCamion();
      fetchModelosDisponibles();
      alert('Modelo verificado y desbloqueado para Plancha');
    } catch (e) {
      console.error(e);
      alert('Error al verificar modelo');
    }
  };

  // --- MÉTODOS DRAG & DROP (PLANCHA) ---
  const handleDragStart = (e, type, data) => {
    setDraggedItem({ type, data });
    e.dataTransfer.setData('text/plain', ''); // Requerido por Firefox
  };

  const handleDropOnBurro = (e, index) => {
    e.preventDefault();
    if (!draggedItem) return;

    const newBurros = [...burrosState];
    const burro = newBurros[index];

    if (draggedItem.type === 'planchador') {
      // Asignar planchador al burro
      burro.planchador = {
        id: draggedItem.data.id,
        nombre: draggedItem.data.nombre
      };
      // Registrar la asistencia de forma automática al asignar al burro
      registrarAsistencia(draggedItem.data.id, draggedItem.data.nombre);
    } else if (draggedItem.type === 'modelo') {
      const model = draggedItem.data;
      const talla = burro.talla;
      const normTalla = normalizeTalla(talla);

      // Validar si el modelo tiene stock disponible en la talla de este burro (normalizado)
      const matchingTallaKey = Object.keys(model.tallas_disponibles || {}).find(
        k => normalizeTalla(k) === normTalla
      );
      const disp = matchingTallaKey ? (model.tallas_disponibles[matchingTallaKey] || 0) : 0;
      if (disp <= 0) {
        alert(`El modelo ${model.modelo} no tiene piezas disponibles para la Talla ${talla}`);
        setDraggedItem(null);
        return;
      }

      // Buscar el primer color disponible con stock > 0 para esta talla que NO esté ya asignado en este burro (normalizado)
      let selectedColor = "";
      let stockDeEseColorYTalla = 0;

      if (model.tallas_colores_disponibles) {
        const foundColorEntry = Object.entries(model.tallas_colores_disponibles).find(
          ([color, tallasObj]) => {
            const matchingColorTallaKey = Object.keys(tallasObj || {}).find(
              k => normalizeTalla(k) === normTalla
            );
            const stockVal = matchingColorTallaKey ? (tallasObj[matchingColorTallaKey] || 0) : 0;

            // Verificar que tenga stock y que no esté ya asignado en este burro
            const alreadyAssigned = burro.modelos.some(
              m => m.id === model.id && m.color === color
            );

            return stockVal > 0 && !alreadyAssigned;
          }
        );
        if (foundColorEntry) {
          selectedColor = foundColorEntry[0];
          const colorTallasObj = foundColorEntry[1];
          const matchingColorTallaKey = Object.keys(colorTallasObj || {}).find(
            k => normalizeTalla(k) === normTalla
          );
          stockDeEseColorYTalla = matchingColorTallaKey ? (colorTallasObj[matchingColorTallaKey] || 0) : 0;
        }
      }

      if (stockDeEseColorYTalla <= 0) {
        alert(`Todas las variantes de color disponibles del modelo ${model.modelo} para la Talla ${talla} ya han sido agregadas a este burro.`);
        setDraggedItem(null);
        return;
      }

      // Validar si el modelo con ese mismo color ya está asignado en este burro (seguridad secundaria)
      const existing = burro.modelos.find(m => m.id === model.id && m.color === selectedColor);
      if (existing) {
        alert(`La variante de color "${selectedColor || 'Único'}" del modelo ${model.modelo} ya está en la lista de este burro`);
        setDraggedItem(null);
        return;
      }

      // Agregar modelo al burro con 1 pieza
      burro.modelos.push({
        id: model.id,
        modelo: model.modelo,
        imagen: model.imagen,
        color: selectedColor,
        piezas: 1,
        maxPiezas: stockDeEseColorYTalla,
        tallas_colores_disponibles: model.tallas_colores_disponibles
      });
    }

    setBurrosState(newBurros);
    setDraggedItem(null);
  };

  const handleChangeModeloColor = (burroIndex, modelId, oldColor, newColor) => {
    if (oldColor === newColor) return;
    const newBurros = [...burrosState];
    const burro = newBurros[burroIndex];
    const talla = burro.talla;
    const normTalla = normalizeTalla(talla);

    // Verificar si el modelo con el nuevo color ya está en este burro
    const duplicate = burro.modelos.some(m => m.id === modelId && m.color === newColor);
    if (duplicate) {
      alert(`La variante de color "${newColor || 'Único'}" ya está en la lista de este burro.`);
      return;
    }

    const model = burro.modelos.find(m => m.id === modelId && m.color === oldColor);
    if (model) {
      let stockDeEseColorYTalla = 0;
      if (model.tallas_colores_disponibles && model.tallas_colores_disponibles[newColor]) {
        const colorTallasObj = model.tallas_colores_disponibles[newColor];
        const matchingColorTallaKey = Object.keys(colorTallasObj || {}).find(
          k => normalizeTalla(k) === normTalla
        );
        stockDeEseColorYTalla = matchingColorTallaKey ? (colorTallasObj[matchingColorTallaKey] || 0) : 0;
      }

      model.color = newColor;
      model.maxPiezas = stockDeEseColorYTalla;
      if (model.piezas > stockDeEseColorYTalla) {
        model.piezas = stockDeEseColorYTalla > 0 ? stockDeEseColorYTalla : 1;
      }
      setBurrosState(newBurros);
    }
  };

  const handleRemovePlanchadorFromBurro = (index) => {
    const newBurros = [...burrosState];
    newBurros[index].planchador = null;
    setBurrosState(newBurros);
  };

  const handleRemoveModeloFromBurro = (burroIndex, modelId, color) => {
    const newBurros = [...burrosState];
    newBurros[burroIndex].modelos = newBurros[burroIndex].modelos.filter(m => !(m.id === modelId && m.color === color));
    setBurrosState(newBurros);
  };

  const handleUpdatePiezas = (burroIndex, modelId, color, delta) => {
    const newBurros = [...burrosState];
    const model = newBurros[burroIndex].modelos.find(m => m.id === modelId && m.color === color);
    if (model) {
      const newVal = model.piezas + delta;
      if (newVal >= 1 && newVal <= model.maxPiezas) {
        model.piezas = newVal;
        setBurrosState(newBurros);
      }
    }
  };

  const handleFinalizarPlanchado = async (index) => {
    const burro = burrosState[index];
    if (!burro.planchador) {
      alert('Debes asignar un planchador a este burro primero');
      return;
    }
    if (burro.modelos.length === 0) {
      alert('Debes arrastrar al menos un modelo a este burro');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/api/plancha/asignar`, {
        planchador_id: burro.planchador.id,
        burro_numero: burro.numero,
        talla: burro.talla,
        modelos: burro.modelos.map(m => ({
          camion_detalles_id: m.id,
          piezas: m.piezas,
          color: m.color
        }))
      }, { headers: { Authorization: `Bearer ${token}` } });

      // Limpiar los modelos del burro (el planchador se queda asignado)
      const newBurros = [...burrosState];
      newBurros[index].modelos = [];
      setBurrosState(newBurros);

      // Recargar stock disponible
      fetchModelosDisponibles();
      alert('¡Trabajo de planchado registrado y finalizado con éxito!');
    } catch (e) {
      console.error(e);
      alert(e.response?.data?.error || 'Error al finalizar planchado');
    }
  };

  // --- MÉTODOS PAGOS ---
  const handleCargarPagosPlanchador = async (id) => {
    setPagoPlanchadorId(id);
    if (!id) {
      setPlanchadorPagoDetalle(null);
      setMontoPago('');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/planchadores/${id}/pagos`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPlanchadorPagoDetalle(res.data);
      // Auto-rellenar monto completo
      if (res.data && res.data.pendiente !== undefined) {
        setMontoPago(res.data.pendiente.toString());
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRegistrarPago = async (e) => {
    e.preventDefault();
    if (!pagoPlanchadorId || !montoPago || parseFloat(montoPago) <= 0) return;
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/api/plancha/pagos`, {
        planchador_id: pagoPlanchadorId,
        monto: parseFloat(montoPago),
        tipo_pago: 'completo' // Siempre completo
      }, { headers: { Authorization: `Bearer ${token}` } });

      setMontoPago('');
      handleCargarPagosPlanchador(pagoPlanchadorId);
      alert('Pago registrado correctamente');
    } catch (e) {
      console.error(e);
      alert(e.response?.data?.error || 'Error al registrar pago');
    }
  };

  // --- MÉTODOS EXTRA (ASISTENCIAS, AJUSTES, CUADRE, REPORTES) ---
  
  const registrarAsistencia = async (planchadorId, nombre) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API_URL}/api/planchadores/${planchadorId}/asistencia`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Mostrar banner por 5 segundos
      setAttendanceNotif({
        nombre,
        count: res.data.asistencias_count,
        registered: res.data.registered
      });
      
      setTimeout(() => {
        setAttendanceNotif(null);
      }, 5000);

      // Recargar planchadores para actualizar saldos si se requiere
      fetchPlanchadores();
    } catch (e) {
      console.error("Error registrando asistencia:", e);
    }
  };

  const handleRegistrarAjuste = async (e) => {
    e.preventDefault();
    if (!ajustePlanchadorId) {
      alert('Selecciona un planchador');
      return;
    }
    
    // Calcular monto final según el tipo de ajuste
    const dias = parseFloat(ajusteParamDias) || 1;
    const tarifa = 400; // Tarifa fija e inalterable
    const finalMonto = dias * tarifa;
    let descFormula = '';
    
    if (ajusteRazon === 'Dia adelantado' || ajusteRazon === 'Vacaciones') {
      descFormula = `${dias} días × $${tarifa}/día`;
    } else if (ajusteRazon === 'Festivo') {
      descFormula = `${dias} días festivos × $${tarifa}/día`;
    } else if (ajusteRazon === 'Apoyo en calidad') {
      descFormula = `${dias} días × $${tarifa}/día en Apoyo calidad`;
    }

    if (finalMonto <= 0) {
      alert('El monto del ajuste debe ser mayor a 0');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const razonFinal = ajusteRazon === 'Apoyo en calidad' 
        ? `Apoyo en calidad (${ajusteApoyoDetalle}) [${descFormula}]`
        : `${ajusteRazon} [${descFormula}]`;

      await axios.post(`${API_URL}/api/plancha/ajustes`, {
        planchador_id: ajustePlanchadorId,
        razon: razonFinal,
        monto: finalMonto
      }, { headers: { Authorization: `Bearer ${token}` } });

      alert('Ajuste / Pago fijo registrado con éxito');
      setShowAjusteModal(false);
      setAjustePlanchadorId('');
      fetchModelosDisponibles();
      if (pagoPlanchadorId === ajustePlanchadorId) {
        handleCargarPagosPlanchador(pagoPlanchadorId);
      }
    } catch (e) {
      console.error(e);
      alert(e.response?.data?.error || 'Error al registrar ajuste');
    }
  };

  const handleCalcularCuadre = async (silente = false) => {
    if (!cuadrePlanchadorId || !cuadreStart || !cuadreEnd) {
      if (!silente) alert('Faltan datos para realizar la consulta del cuadre');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/planchadores/${cuadrePlanchadorId}/piezas-rango?start=${cuadreStart}&end=${cuadreEnd}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCuadrePlanchaReal(res.data.total_ganado || 0);
    } catch (e) {
      console.error(e);
      if (!silente) alert('Error al consultar plancha real del planchador');
    }
  };

  const handleAplicarCuadre = async () => {
    const diaAdelantadoVal = parseFloat(cuadreDiaAdelantado) || 0;
    const planchaRealVal = parseFloat(cuadrePlanchaReal) || 0;
    const finalMonto = planchaRealVal - diaAdelantadoVal;

    if (finalMonto === 0) {
      alert('La diferencia es 0, no hay ajuste necesario.');
      return;
    }

    const descRazon = finalMonto > 0
      ? `Diferencia de Cuadre Plancha (Bono) [Real: $${planchaRealVal} vs Adelantado: $${diaAdelantadoVal}]`
      : `Diferencia de Cuadre Plancha (Descuento) [Real: $${planchaRealVal} vs Adelantado: $${diaAdelantadoVal}]`;

    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/api/plancha/ajustes`, {
        planchador_id: cuadrePlanchadorId,
        razon: descRazon,
        monto: finalMonto
      }, { headers: { Authorization: `Bearer ${token}` } });

      alert(`Cuadre aplicado correctamente: Diferencia de ${formatCurrency(finalMonto)}`);
      setShowCuadreModal(false);
      setCuadrePlanchadorId('');
      setCuadrePlanchaReal(0);
      if (pagoPlanchadorId === cuadrePlanchadorId) {
        handleCargarPagosPlanchador(pagoPlanchadorId);
      }
    } catch (e) {
      console.error(e);
      alert(e.response?.data?.error || 'Error al aplicar el cuadre');
    }
  };

  const handleDownloadReporte = () => {
    let url = `${API_URL}/api/reportes/plancha/pagos`;
    const params = new URLSearchParams();
    if (reportStart) params.append('start', reportStart);
    if (reportEnd) params.append('end', reportEnd);
    const query = params.toString();
    if (query) url += `?${query}`;
    window.open(url, '_blank');
  };

  return (
    <div className="app-layout">
      {/* Sidebar exclusiva de Plancha */}
      <PlanchaSidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <div className="main-container">
        <Header />

        {/* Banner de Asistencia */}
        {attendanceNotif && (
          <div className="attendance-banner">
            👤 {attendanceNotif.nombre} - {attendanceNotif.count}/5 asistido {attendanceNotif.registered ? '(Asistencia Registrada)' : '(Ya registrado hoy)'}
          </div>
        )}

        <main className="main-content" style={{ padding: '2rem' }}>

      {/* CONTENIDO PESTAÑA 1: PLANCHADORES */}
      {activeTab === 'planchadores' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem', alignItems: 'start' }}>
          
          {/* Alta de Planchador */}
          <div className="glass-card">
            <h2 style={{ fontSize: '1.4rem', margin: '0 0 1.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <UserPlus color="#3b82f6" /> Alta Planchador
            </h2>
            <form onSubmit={handleAgregarPlanchador} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              <div className="form-group">
                <label className="form-label">Nombre del Planchador</label>
                <input 
                  type="text" 
                  required 
                  className="form-input" 
                  placeholder="Ej: Rosa María" 
                  value={nuevoNombre} 
                  onChange={e => setNuevoNombre(e.target.value)} 
                />
              </div>
              <div className="form-group">
                <label className="form-label">Número de Teléfono</label>
                <input 
                  type="tel" 
                  className="form-input" 
                  placeholder="Ej: 3121234567" 
                  value={nuevoTelefono} 
                  onChange={e => setNuevoTelefono(e.target.value)} 
                />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                <Plus size={18} style={{ marginRight: '4px' }} /> Registrar Planchador
              </button>
            </form>
          </div>

          {/* Listado de Planchadores */}
          <div className="glass-card">
            <h2 style={{ fontSize: '1.4rem', margin: '0 0 1.5rem 0' }}>Planchadores Activos</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1.2rem' }}>
              {planchadores.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#94a3b8', gridColumn: '1/-1', padding: '2rem' }}>
                  No hay planchadores registrados.
                </p>
              ) : (
                planchadores.map(p => (
                  <div 
                    key={p.id} 
                    className="glass-card" 
                    style={{ 
                      padding: '1.2rem', 
                      background: 'rgba(255,255,255,0.01)', 
                      border: '1px solid rgba(255,255,255,0.05)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.8rem',
                      borderRadius: '12px'
                    }}
                  >
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.2rem' }}>{p.nombre}</h3>
                      {p.telefono && (
                        <p style={{ color: '#94a3b8', margin: '0.2rem 0 0 0', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Phone size={12} /> {p.telefono}
                        </p>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                      <button 
                        className="btn btn-secondary" 
                        style={{ flex: 1, padding: '6px 12px', fontSize: '0.85rem' }}
                        onClick={() => handleVerHistorialPlanchador(p.id)}
                      >
                        Ver Historial
                      </button>
                      <button 
                        className="btn" 
                        style={{ 
                          background: 'rgba(239, 68, 68, 0.1)', 
                          color: '#ef4444', 
                          border: 'none',
                          padding: '6px'
                        }}
                        onClick={() => handleEliminarPlanchador(p.id)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* CONTENIDO PESTAÑA 2: MODELOS (LLEGADA Y VERIFICACIÓN) */}
      {activeTab === 'modelos' && (
        <div className="glass-card">
          <h2 style={{ fontSize: '1.5rem', margin: '0 0 1.5rem 0' }}>Modelos en Tránsito / Colima</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
            {modelosCamion.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#94a3b8', gridColumn: '1/-1', padding: '3rem' }}>
                No hay modelos registrados de camiones enviados.
              </p>
            ) : (
              modelosCamion.map(m => (
                <div 
                  key={m.id} 
                  className="glass-card" 
                  style={{ 
                    position: 'relative', 
                    padding: '1.5rem', 
                    borderRadius: '16px',
                    background: m.verificado ? 'rgba(16, 185, 129, 0.02)' : 'rgba(239, 68, 68, 0.01)',
                    border: `1px solid ${m.verificado ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255,255,255,0.06)'}`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem',
                    overflow: 'hidden'
                  }}
                >
                  {/* Candado / Estado de bloqueo */}
                  <div style={{ position: 'absolute', top: '12px', right: '12px' }}>
                    {m.verificado ? (
                      <span className="badge badge-success" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Unlock size={12} /> Desbloqueado
                      </span>
                    ) : (
                      <span className="badge badge-warning" style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(245, 158, 11, 0.1)', color: '#fbbf24' }}>
                        <Lock size={12} /> Bloqueado
                      </span>
                    )}
                  </div>

                  {/* Imagen y Detalles del modelo (Versión Simplificada) */}
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    {m.imagen ? (
                      <img 
                        src={`${API_URL}${m.imagen}`} 
                        alt={m.modelo} 
                        style={{ width: '60px', height: '60px', borderRadius: '8px', objectFit: 'cover', background: '#000' }} 
                      />
                    ) : (
                      <div style={{ width: '60px', height: '60px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Layers size={24} color="#64748b" />
                      </div>
                    )}
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.3rem' }}>Modelo {m.modelo}</h3>
                    </div>
                  </div>

                  {/* Acciones */}
                  <div style={{ marginTop: 'auto', paddingTop: '0.5rem' }}>
                    {m.verificado ? (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem' }}>
                        <span style={{ color: '#94a3b8' }}>Pago de Plancha:</span>
                        <strong style={{ color: '#34d399', fontSize: '1.1rem' }}>{formatCurrency(m.precio_plancha)} <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: '#64748b' }}>/ pza</span></strong>
                      </div>
                    ) : (
                      <button 
                        className="btn btn-primary" 
                        style={{ width: '100%', padding: '8px' }}
                        onClick={() => handleAbrirVerificacion(m)}
                      >
                        Verificar en Colima
                      </button>
                    )}
                  </div>

                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* CONTENIDO PESTAÑA 3: INTERFAZ DE PLANCHA (ANVIL DRAG & DROP) */}
      {activeTab === 'plancha' && (
        <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '2rem', alignItems: 'start' }}>
          
          {/* Side panel de elementos arrastrables */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            
            {/* Planchadores */}
            <div className="glass-card" style={{ padding: '1.2rem' }}>
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Users size={18} color="#3b82f6" /> Planchadores
              </h3>
              <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '-0.5rem 0 1rem 0' }}>Arrastra un planchador hacia un Burro para asignarlo</p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', maxHeight: '250px', overflowY: 'auto', paddingRight: '4px' }}>
                {planchadores.length === 0 ? (
                  <p style={{ fontSize: '0.85rem', color: '#94a3b8', textAlign: 'center' }}>Registra planchadores en su pestaña primero.</p>
                ) : (
                  planchadores.map(p => (
                    <div 
                      key={p.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, 'planchador', p)}
                      className="glass-card"
                      style={{ 
                        padding: '10px 14px', 
                        cursor: 'grab', 
                        background: 'rgba(59, 130, 246, 0.05)',
                        border: '1px dashed rgba(59, 130, 246, 0.3)',
                        borderRadius: '8px',
                        fontSize: '0.95rem',
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}
                    >
                      <span>{p.nombre}</span>
                      <span style={{ fontSize: '0.7rem', background: 'rgba(59, 130, 246, 0.2)', padding: '2px 6px', borderRadius: '4px', color: '#93c5fd' }}>PLANCHADOR</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Modelos Disponibles */}
            <div className="glass-card" style={{ padding: '1.2rem' }}>
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Layers size={18} color="#10b981" /> Modelos Verificados
              </h3>
              <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '-0.5rem 0 1rem 0' }}>Modelos listos en Colima. Arrástralos a un Burro de su talla</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '400px', overflowY: 'auto', paddingRight: '4px' }}>
                {modelosDisponibles.length === 0 ? (
                  <p style={{ fontSize: '0.85rem', color: '#94a3b8', textAlign: 'center' }}>
                    No hay modelos verificados con piezas disponibles. Verifica camiones en su pestaña.
                  </p>
                ) : (
                  modelosDisponibles.map(m => (
                    <div 
                      key={m.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, 'modelo', m)}
                      className="glass-card"
                      style={{ 
                        padding: '12px', 
                        cursor: 'grab', 
                        background: 'rgba(16, 185, 129, 0.03)',
                        border: '1px dashed rgba(16, 185, 129, 0.25)',
                        borderRadius: '10px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5rem'
                      }}
                    >
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        {m.imagen ? (
                          <img 
                            src={`${API_URL}${m.imagen}`} 
                            alt={m.modelo} 
                            style={{ width: '40px', height: '40px', borderRadius: '6px', objectFit: 'cover', background: '#000' }} 
                          />
                        ) : (
                          <div style={{ width: '40px', height: '40px', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Layers size={18} color="#64748b" />
                          </div>
                        )}
                        <div>
                          <strong style={{ fontSize: '0.95rem' }}>Mod: {m.modelo}</strong>
                          <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>Precio Plancha: {formatCurrency(m.precio_plancha)}</p>
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {Object.entries(m.tallas_disponibles).map(([talla, qty]) => {
                          if (qty <= 0) return null;

                          // Calcular desglose de colores para esta talla (normalizado)
                          const normT = normalizeTalla(talla);
                          const colorPieces = [];
                          if (m.tallas_colores_disponibles) {
                            Object.entries(m.tallas_colores_disponibles).forEach(([col, tallasObj]) => {
                              const matchingKey = Object.keys(tallasObj || {}).find(k => normalizeTalla(k) === normT);
                              const cQty = matchingKey ? (tallasObj[matchingKey] || 0) : 0;
                              if (cQty > 0) {
                                colorPieces.push(`${col || 'Único'}: ${cQty}`);
                              }
                            });
                          }

                          return (
                            <div 
                              key={talla} 
                              style={{ 
                                display: 'flex',
                                flexDirection: 'column',
                                background: 'rgba(255,255,255,0.02)', 
                                border: '1px solid rgba(255,255,255,0.05)',
                                padding: '4px 8px',
                                borderRadius: '6px',
                                fontSize: '0.75rem',
                                minWidth: '85px',
                                gap: '2px'
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '2px', marginBottom: '2px' }}>
                                <span style={{ color: '#64748b', fontWeight: 'bold' }}>T{talla}</span>
                                <strong style={{ color: '#10b981' }}>{qty}</strong>
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', fontSize: '0.65rem', color: '#94a3b8' }}>
                                {colorPieces.map(cp => (
                                  <span key={cp}>{cp}</span>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

          {/* Tablero de 10 Burros de Plancha (Anvil Dashboard) */}
          <div className="glass-card" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.8rem' }}>
              <h2 style={{ fontSize: '1.6rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Flame color="#ef4444" size={24} /> Tablero de Burros
              </h2>
              <span style={{ fontSize: '0.85rem', color: '#64748b', background: 'rgba(255,255,255,0.02)', padding: '4px 10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                1 al 5 y 6 al 10 repiten tallas: <strong>5, 7, 9, 11, 13</strong>
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
              {burrosState.map((burro, index) => {
                const hasPlanchador = !!burro.planchador;
                const hasModelos = burro.modelos.length > 0;

                return (
                  <div 
                    key={burro.numero}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => handleDropOnBurro(e, index)}
                    className="glass-card"
                    style={{ 
                      borderRadius: '16px',
                      border: `1.5px solid ${hasPlanchador ? 'rgba(59, 130, 246, 0.3)' : 'rgba(255,255,255,0.06)'}`,
                      background: hasPlanchador ? 'rgba(59, 130, 246, 0.01)' : 'rgba(0,0,0,0.1)',
                      padding: '1.2rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '1rem',
                      transition: 'all 0.2s ease',
                      boxShadow: hasPlanchador ? '0 8px 32px rgba(59, 130, 246, 0.05)' : 'none'
                    }}
                  >
                    {/* Indicador de Talla y Número de Burro */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#94a3b8' }}>
                        {burro.numero === 1 ? 'Burro #1-Maru' :
                         burro.numero === 2 ? 'Burro #2-Karla' :
                         burro.numero === 3 ? 'Burro #3-Maribel' :
                         burro.numero === 4 ? 'Burro #4-Alma' :
                         burro.numero === 5 ? 'Burro #5-Karina' :
                         `Burro #${burro.numero}`}
                      </span>
                      <span 
                        style={{ 
                          fontSize: '1rem', 
                          fontWeight: 'bold', 
                          background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                          color: '#fff',
                          padding: '3px 12px',
                          borderRadius: '20px',
                          boxShadow: '0 2px 10px rgba(217, 119, 6, 0.3)'
                        }}
                      >
                        Talla {burro.talla}
                      </span>
                    </div>

                    {/* Zona Drop Planchador */}
                    <div 
                      style={{ 
                        border: '1.5px dashed rgba(255,255,255,0.08)',
                        background: 'rgba(255,255,255,0.01)',
                        borderRadius: '10px',
                        padding: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: '50px',
                        position: 'relative'
                      }}
                    >
                      {hasPlanchador ? (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                          <span style={{ fontWeight: 'bold', color: '#60a5fa', fontSize: '0.95rem' }}>👤 {burro.planchador.nombre}</span>
                          <button 
                            onClick={() => handleRemovePlanchadorFromBurro(index)}
                            style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '2px' }}
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Arrastra un planchador aquí</span>
                      )}
                    </div>

                    {/* Zona Drop Modelos (Lista Acumulativa) */}
                    <div 
                      style={{ 
                        border: '1.5px dashed rgba(255,255,255,0.08)',
                        background: 'rgba(255,255,255,0.01)',
                        borderRadius: '10px',
                        padding: '12px',
                        minHeight: '120px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.8rem'
                      }}
                    >
                      <h4 style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '4px' }}>
                        Modelos a planchar (Talla {burro.talla}):
                      </h4>

                      {!hasModelos ? (
                        <div style={{ margin: 'auto', textAlign: 'center', color: '#64748b', fontSize: '0.8rem' }}>
                          Arrastra un modelo de Talla {burro.talla} aquí
                        </div>
                      ) : (
                        burro.modelos.map(m => {
                          const normTalla = normalizeTalla(burro.talla);
                          const availableColors = [];
                          if (m.tallas_colores_disponibles) {
                            Object.entries(m.tallas_colores_disponibles).forEach(([col, tallasObj]) => {
                              const matchingColorTallaKey = Object.keys(tallasObj || {}).find(
                                k => normalizeTalla(k) === normTalla
                              );
                              const qty = matchingColorTallaKey ? (tallasObj[matchingColorTallaKey] || 0) : 0;
                              if (qty > 0 || col === m.color) {
                                availableColors.push({
                                  color: col,
                                  qty: qty
                                });
                              }
                            });
                          }

                          return (
                            <div 
                              key={`${m.id}_${m.color}`} 
                              style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '8px', 
                                background: 'rgba(255,255,255,0.02)',
                                padding: '6px 8px',
                                borderRadius: '8px',
                                border: '1px solid rgba(255,255,255,0.04)'
                              }}
                            >
                              {m.imagen ? (
                                <img 
                                  src={`${API_URL}${m.imagen}`} 
                                  alt={m.modelo} 
                                  style={{ width: '32px', height: '32px', borderRadius: '4px', objectFit: 'cover', background: '#000' }} 
                                />
                              ) : (
                                <div style={{ width: '32px', height: '32px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <Layers size={14} color="#64748b" />
                                </div>
                              )}

                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <strong style={{ fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Mod {m.modelo}</strong>
                                  <button 
                                    onClick={() => handleRemoveModeloFromBurro(index, m.id, m.color)}
                                    style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '2px' }}
                                  >
                                    <X size={14} />
                                  </button>
                                </div>

                                {/* Selector o Tag de Color */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Color:</span>
                                  {availableColors.length <= 1 ? (
                                    <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#a78bfa' }}>
                                      {m.color || 'Único'}
                                    </span>
                                  ) : (
                                    <select
                                      value={m.color}
                                      onChange={(e) => handleChangeModeloColor(index, m.id, m.color, e.target.value)}
                                      style={{
                                        background: 'rgba(0, 0, 0, 0.4)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        color: '#a78bfa',
                                        borderRadius: '4px',
                                        fontSize: '0.8rem',
                                        fontWeight: 'bold',
                                        padding: '1px 4px',
                                        outline: 'none',
                                        cursor: 'pointer'
                                      }}
                                    >
                                      {availableColors.map(c => (
                                        <option key={c.color} value={c.color} style={{ background: '#1e293b', color: '#fff' }}>
                                          {c.color || 'Único'} ({c.qty} pzs)
                                        </option>
                                      ))}
                                    </select>
                                  )}
                                </div>

                                {/* Controles de más y menos */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                                  <button 
                                    onClick={() => handleUpdatePiezas(index, m.id, m.color, -1)}
                                    className="btn"
                                    style={{ padding: '2px 8px', minWidth: 0, fontSize: '0.75rem', background: 'rgba(255,255,255,0.05)', border: 'none' }}
                                    disabled={m.piezas <= 1}
                                  >
                                    -
                                  </button>
                                  <span style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>
                                    {m.piezas} <span style={{ fontWeight: 'normal', color: '#64748b', fontSize: '0.75rem' }}>/ {m.maxPiezas}</span>
                                  </span>
                                  <button 
                                    onClick={() => handleUpdatePiezas(index, m.id, m.color, 1)}
                                    className="btn"
                                    style={{ padding: '2px 8px', minWidth: 0, fontSize: '0.75rem', background: 'rgba(255,255,255,0.05)', border: 'none' }}
                                    disabled={m.piezas >= m.maxPiezas}
                                  >
                                    +
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Botón Finalizar Planchado */}
                    <button 
                      onClick={() => handleFinalizarPlanchado(index)}
                      className="btn btn-primary"
                      style={{ width: '100%', padding: '10px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                      disabled={!hasPlanchador || !hasModelos}
                    >
                      <Check size={16} /> Finalizar Planchado
                    </button>

                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* CONTENIDO PESTAÑA 4: PAGOS */}
      {activeTab === 'pagos' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem', alignItems: 'start' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* Formulario de Pagos */}
            <div className="glass-card">
              <h2 style={{ fontSize: '1.4rem', margin: '0 0 1.5rem 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Wallet color="#3b82f6" /> Registrar Pago Plancha
              </h2>
              <form onSubmit={handleRegistrarPago} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                <div className="form-group">
                  <label className="form-label">Seleccionar Planchador</label>
                  <select 
                    className="form-input" 
                    value={pagoPlanchadorId} 
                    onChange={e => handleCargarPagosPlanchador(e.target.value)} 
                    required
                  >
                    <option value="">-- Elige un Planchador --</option>
                    {planchadores.map(p => (
                      <option key={p.id} value={p.id}>{p.nombre}</option>
                    ))}
                  </select>
                </div>

                {planchadorPagoDetalle && (
                  <div style={{ background: 'rgba(0,0,0,0.02)', padding: '1rem', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.95rem' }}>
                    <p style={{ margin: 0 }}><strong>Total Ganado:</strong> {formatCurrency(planchadorPagoDetalle.ganado)}</p>
                    <p style={{ margin: 0, color: '#34d399' }}><strong>Total Pagado:</strong> {formatCurrency(planchadorPagoDetalle.pagado)}</p>
                    <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.05)', margin: '0.4rem 0' }} />
                    <p style={{ margin: 0, fontSize: '1.1rem', color: planchadorPagoDetalle.pendiente > 0 ? '#ef4444' : '#34d399' }}>
                      <strong>Saldo Pendiente: {formatCurrency(planchadorPagoDetalle.pendiente)}</strong>
                    </p>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Tipo de Pago</label>
                  <select className="form-input" value="completo" disabled style={{ background: 'rgba(255,255,255,0.05)', cursor: 'not-allowed' }}>
                    <option value="completo">Pago Completo (Liquidación)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Monto del Pago</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    required 
                    className="form-input"
                    placeholder={planchadorPagoDetalle ? `Sugerido: ${formatCurrency(planchadorPagoDetalle.pendiente)}` : 'Ej: 500'} 
                    value={montoPago} 
                    onChange={e => setMontoPago(e.target.value)} 
                    disabled={!pagoPlanchadorId}
                  />
                </div>

                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  style={{ width: '100%' }}
                  disabled={!pagoPlanchadorId || parseFloat(montoPago || 0) <= 0}
                >
                  Registrar Pago
                </button>

                <div style={{ display: 'flex', gap: '0.8rem', marginTop: '0.5rem' }}>
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    style={{ flex: 1, borderColor: 'rgba(14, 165, 233, 0.4)', color: '#0ea5e9', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', padding: '10px' }}
                    onClick={() => {
                      setAjustePlanchadorId(pagoPlanchadorId);
                      setShowAjusteModal(true);
                    }}
                  >
                    <Plus size={16} /> Ajuste/Pago Fijo
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    style={{ flex: 1, borderColor: 'rgba(16, 185, 129, 0.4)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', padding: '10px' }}
                    onClick={() => {
                      setCuadrePlanchadorId(pagoPlanchadorId);
                      setShowCuadreModal(true);
                    }}
                  >
                    <Calculator size={16} /> Cuadre Semanal
                  </button>
                </div>
              </form>
            </div>

            {/* Descarga de Reportes de Nómina PDF */}
            <div className="glass-card" style={{ padding: '1.5rem' }}>
              <h3 style={{ margin: '0 0 1.2rem 0', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <History size={18} color="#0ea5e9" /> Reporte de Nómina PDF
              </h3>
              <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '-0.5rem 0 1.2rem 0' }}>Descarga un reporte consolidado en PDF de las ganancias y nómina de los planchadores</p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Fecha de Inicio</label>
                  <input 
                    type="date" 
                    className="form-input" 
                    value={reportStart} 
                    onChange={e => setReportStart(e.target.value)} 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Fecha Fin</label>
                  <input 
                    type="date" 
                    className="form-input" 
                    value={reportEnd} 
                    onChange={e => setReportEnd(e.target.value)} 
                  />
                </div>
                <button 
                  type="button" 
                  className="btn btn-primary" 
                  style={{ width: '100%', marginTop: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                  onClick={handleDownloadReporte}
                >
                  <Download size={16} /> Descargar Reporte (PDF)
                </button>
              </div>
            </div>
          </div>

          {/* Historial de Pagos y Trabajos pendientes */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            
            {/* Trabajos por liquidar */}
            <div className="glass-card">
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.2rem' }}>Trabajos terminados pendientes de pago</h3>
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Modelo</th>
                      <th>Fecha Trabajo</th>
                      <th>Talla</th>
                      <th>Pzas</th>
                      <th>Neto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!planchadorPagoDetalle || planchadorPagoDetalle.trabajosPendientes.length === 0 ? (
                      <tr>
                        <td colSpan="5" style={{ textAlign: 'center', color: '#94a3b8' }}>
                          {!pagoPlanchadorId ? 'Selecciona un planchador para ver sus pendientes.' : 'No hay trabajos pendientes de pago.'}
                        </td>
                      </tr>
                    ) : (
                      planchadorPagoDetalle.trabajosPendientes.map(t => (
                        <tr key={t.id}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {t.modelo_imagen ? (
                                <img 
                                  src={`${API_URL}${t.modelo_imagen}`} 
                                  alt={t.modelo_nombre} 
                                  style={{ width: '28px', height: '28px', borderRadius: '4px', objectFit: 'cover', background: '#000' }} 
                                />
                              ) : null}
                              <strong>{t.modelo_nombre || t.color}</strong>
                            </div>
                          </td>
                          <td>{formatDate(t.fecha_creacion)}</td>
                          <td>
                            {t.talla === 'AJUSTE' ? (
                              <span className="badge badge-warning" style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.3)' }}>AJUSTE</span>
                            ) : (
                              <span className="badge badge-info">T{t.talla}</span>
                            )}
                          </td>
                          <td>{t.piezas}</td>
                          <td style={{ color: t.neto < 0 ? '#ef4444' : '#34d399', fontWeight: 'bold' }}>
                            {t.neto < 0 ? '-' : ''}{formatCurrency(Math.abs(t.neto))}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recibos de Pagos */}
            <div className="glass-card">
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.2rem' }}>Recibos de pagos entregados</h3>
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>ID Recibo</th>
                      <th>Fecha de Pago</th>
                      <th>Tipo</th>
                      <th>Monto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!planchadorPagoDetalle || planchadorPagoDetalle.pagos.length === 0 ? (
                      <tr>
                        <td colSpan="4" style={{ textAlign: 'center', color: '#94a3b8' }}>
                          {!pagoPlanchadorId ? 'Selecciona un planchador para ver sus recibos.' : 'No se han registrado pagos aún.'}
                        </td>
                      </tr>
                    ) : (
                      planchadorPagoDetalle.pagos.map((p, index) => (
                        <tr key={p.id}>
                          <td>#{planchadorPagoDetalle.pagos.length - index}</td>
                          <td>{formatDate(p.fecha)}</td>
                          <td><span className="badge badge-info" style={{ textTransform: 'uppercase' }}>{p.tipo_pago}</span></td>
                          <td style={{ color: '#34d399', fontWeight: 'bold' }}>{formatCurrency(p.monto)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* CONTENIDO PESTAÑA 5: HISTORIAL GENERAL DE PLANCHADO */}
      {activeTab === 'historial' && (
        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.5rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <History color="#0ea5e9" size={24} /> Historial General de Planchado
            </h2>
            <button className="btn btn-secondary" onClick={fetchHistorialGeneral}>Refrescar Historial</button>
          </div>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Fecha y Hora</th>
                  <th>Foto</th>
                  <th>Modelo</th>
                  <th>Color</th>
                  <th>Talla</th>
                  <th>Planchador</th>
                  <th>Burro</th>
                  <th>Pzas Planchadas</th>
                  <th>Neto</th>
                  <th>Ajuste</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {historialGeneral.length === 0 ? (
                  <tr>
                    <td colSpan="11" style={{ textAlign: 'center', color: '#94a3b8', padding: '3rem' }}>
                      No hay registros de planchado en el historial general.
                    </td>
                  </tr>
                ) : (
                  historialGeneral.map(h => (
                    <tr key={h.id}>
                      <td>{new Date(h.fecha_terminado || h.fecha_creacion).toLocaleString()}</td>
                      <td>
                        {h.modelo_imagen ? (
                          <img 
                            src={`${API_URL}${h.modelo_imagen}`} 
                            alt={h.modelo_nombre} 
                            style={{ width: '40px', height: '40px', borderRadius: '6px', objectFit: 'cover', background: '#000' }} 
                          />
                        ) : (
                          <div style={{ width: '40px', height: '40px', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Layers size={18} color="#64748b" />
                          </div>
                        )}
                      </td>
                      <td>
                        <strong>{h.modelo_nombre}</strong>
                        <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>Orden: {h.no_orden || 'N/A'}</p>
                      </td>
                      <td>{h.color || 'N/A'}</td>
                      <td><span className="badge badge-info">T{h.talla}</span></td>
                      <td><span style={{ fontWeight: 'bold', color: '#38bdf8' }}>{h.planchador_nombre}</span></td>
                      <td><span style={{ background: 'rgba(255,255,255,0.03)', padding: '2px 8px', borderRadius: '4px' }}>Burro #{h.burro_numero}</span></td>
                      <td><strong>{h.piezas} pzas</strong></td>
                      <td style={{ color: '#34d399', fontWeight: 'bold' }}>{formatCurrency(h.neto)}</td>
                      <td>{formatCurrency(h.ajuste)}</td>
                      <td style={{ color: '#60a5fa', fontWeight: 'bold' }}>{formatCurrency(h.total)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: HISTORIAL DETALLADO DE TRABAJOS DEL PLANCHADOR */}
      {mostrarDetalleModal && planchadorDetalle && (
        <div 
          style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            background: 'rgba(0,0,0,0.6)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            zIndex: 1000, 
            backdropFilter: 'blur(8px)' 
          }}
        >
          <div className="glass-card" style={{ width: '90%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.6rem' }}>Historial de Planchado</h2>
                <p style={{ margin: '0.2rem 0 0 0', color: '#60a5fa', fontWeight: 'bold' }}>👤 {planchadorDetalle.nombre}</p>
              </div>
              <button 
                onClick={() => {
                  setMostrarDetalleModal(false);
                  setPlanchadorDetalle(null);
                }} 
                className="btn-icon" 
                style={{ background: 'rgba(255,255,255,0.05)', color: '#fff', border: 'none', padding: '8px', borderRadius: '50%', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Foto</th>
                    <th>Modelo</th>
                    <th>Color</th>
                    <th>Talla</th>
                    <th>Pzas-Planchadas</th>
                    <th>Neto</th>
                    <th>Ajuste</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {planchadorDetalle.historial.length === 0 ? (
                    <tr><td colSpan="8" style={{ textAlign: 'center', color: '#94a3b8' }}>Este planchador no tiene trabajos terminados registrados.</td></tr>
                  ) : (
                    planchadorDetalle.historial.map(h => (
                      <tr key={h.id}>
                        <td>
                          {h.modelo_imagen ? (
                            <img 
                              src={`${API_URL}${h.modelo_imagen}`} 
                              alt={h.modelo_nombre} 
                              style={{ width: '40px', height: '40px', borderRadius: '6px', objectFit: 'cover', background: '#000' }} 
                            />
                          ) : (
                            <div style={{ width: '40px', height: '40px', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Layers size={18} color="#64748b" />
                            </div>
                          )}
                        </td>
                        <td>
                          <strong>{h.modelo_nombre}</strong>
                          <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>Orden: {h.no_orden || 'N/A'}</p>
                        </td>
                        <td>{h.color || 'N/A'}</td>
                        <td><span className="badge badge-info">T{h.talla}</span></td>
                        <td>{h.piezas}</td>
                        <td style={{ color: '#34d399', fontWeight: 'bold' }}>{formatCurrency(h.neto)}</td>
                        <td>{formatCurrency(h.ajuste)}</td>
                        <td style={{ color: '#60a5fa', fontWeight: 'bold' }}>{formatCurrency(h.total)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

          </div>
        </div>
      )}

      {/* MODAL 2: VERIFICAR LLEGADA A COLIMA Y PRECIO PLANCHA */}
      {mostrarVerificarModal && modeloAVerificar && (
        <div 
          style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            background: 'rgba(0,0,0,0.6)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            zIndex: 1000, 
            backdropFilter: 'blur(8px)' 
          }}
        >
          <div className="glass-card" style={{ width: '95%', maxWidth: '500px', padding: '2rem', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck color="#10b981" /> Confirmar Llegada
              </h2>
              <button 
                onClick={() => {
                  setMostrarVerificarModal(false);
                  setModeloAVerificar(null);
                }} 
                className="btn-icon" 
                style={{ background: 'rgba(255,255,255,0.05)', color: '#fff', border: 'none', padding: '8px', borderRadius: '50%', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem', background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '12px' }}>
              {modeloAVerificar.imagen ? (
                <img 
                  src={`${API_URL}${modeloAVerificar.imagen}`} 
                  alt={modeloAVerificar.modelo} 
                  style={{ width: '50px', height: '50px', borderRadius: '6px', objectFit: 'cover', background: '#000' }} 
                />
              ) : null}
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Modelo {modeloAVerificar.modelo}</h3>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>No. Orden: {modeloAVerificar.no_orden}</p>
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <p style={{ fontSize: '0.9rem', color: '#94a3b8', margin: '0 0 0.8rem 0' }}>Confirma que las siguientes cantidades de piezas por talla llegaron completas a Colima:</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {Object.entries(modeloAVerificar.tallas_cantidades).map(([key, val]) => {
                  if (typeof val === 'object' && val !== null) {
                    const entries = Object.entries(val).filter(([_, qty]) => qty > 0);
                    if (entries.length === 0) return null;
                    return (
                      <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', background: 'rgba(255,255,255,0.01)', padding: '8px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
                        <span style={{ fontSize: '0.85rem', color: '#c084fc', fontWeight: 700 }}>Color: {key}</span>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                          {entries.map(([sz, qty]) => (
                            <div 
                              key={sz} 
                              style={{ 
                                background: 'rgba(255,255,255,0.03)', 
                                border: '1px solid rgba(255,255,255,0.05)', 
                                padding: '6px', 
                                borderRadius: '6px', 
                                textAlign: 'center',
                                fontSize: '0.8rem'
                              }}
                            >
                              Talla {sz}: <br /><strong>{qty} pzas</strong>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  } else if (parseInt(val) > 0) {
                    return (
                      <div 
                        key={key} 
                        style={{ 
                          background: 'rgba(255,255,255,0.03)', 
                          border: '1px solid rgba(255,255,255,0.05)', 
                          padding: '8px', 
                          borderRadius: '8px', 
                          textAlign: 'center',
                          fontSize: '0.85rem'
                        }}
                      >
                        Talla {key}: <br /><strong>{val} pzas</strong>
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            </div>

            <form onSubmit={handleConfirmarVerificacion} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Precio de Planchado por Pieza <AlertCircle size={14} color="#f59e0b" title="¿Cuánto ganará la planchadora por planchar cada pieza de este modelo?" />
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>$</span>
                  <input 
                    type="number" 
                    step="0.01" 
                    min="0"
                    required
                    className="form-input" 
                    style={{ paddingLeft: '24px' }}
                    placeholder="Ej: 2.50" 
                    value={precioPlanchaInput} 
                    onChange={e => setPrecioPlanchaInput(e.target.value)} 
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  style={{ flex: 1 }}
                  onClick={() => {
                    setMostrarVerificarModal(false);
                    setModeloAVerificar(null);
                  }}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  Confirmar Llegada
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* MODAL 3: REGISTRAR AJUSTE / PAGO FIJO */}
      {showAjusteModal && (
        <div 
          style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            background: 'rgba(0,0,0,0.6)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            zIndex: 1000, 
            backdropFilter: 'blur(8px)' 
          }}
        >
          <div className="glass-card" style={{ width: '95%', maxWidth: '500px', padding: '2rem', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Wallet color="#0ea5e9" /> Registrar Ajuste / Pago Fijo
              </h2>
              <button 
                onClick={() => {
                  setShowAjusteModal(false);
                  setAjustePlanchadorId('');
                }} 
                className="btn-icon" 
                style={{ background: 'rgba(255,255,255,0.05)', color: '#fff', border: 'none', padding: '8px', borderRadius: '50%', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleRegistrarAjuste} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              
              <div className="form-group">
                <label className="form-label">Planchador</label>
                <select 
                  className="form-input" 
                  value={ajustePlanchadorId} 
                  onChange={e => setAjustePlanchadorId(e.target.value)}
                  required
                >
                  <option value="">-- Elige un Planchador --</option>
                  {planchadores.map(p => (
                    <option key={p.id} value={p.id}>{p.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Razón del Pago Fijo</label>
                <select 
                  className="form-input" 
                  value={ajusteRazon} 
                  onChange={e => {
                    setAjusteRazon(e.target.value);
                    setAjusteParamDias('1');
                  }}
                >
                  <option value="Dia adelantado">Día adelantado</option>
                  <option value="Vacaciones">Vacaciones</option>
                  <option value="Festivo">Festivo</option>
                  <option value="Apoyo en calidad">Apoyo en calidad (Corte, Empaque, Limpieza, etc)</option>
                </select>
              </div>

              {/* Selector de Área de Apoyo solo para Apoyo en calidad */}
              {ajusteRazon === 'Apoyo en calidad' && (
                <div className="form-group">
                  <label className="form-label">Área de Apoyo</label>
                  <select 
                    className="form-input" 
                    value={ajusteApoyoDetalle} 
                    onChange={e => setAjusteApoyoDetalle(e.target.value)}
                  >
                    <option value="Corte">Corte</option>
                    <option value="Empaque">Empaque</option>
                    <option value="Limpieza">Limpieza</option>
                    <option value="Avios">Avios</option>
                    <option value="Terminados">Terminados</option>
                    <option value="Almacen de ventas">Almacen de ventas</option>
                  </select>
                </div>
              )}

              {/* Campos comunes para todos los tipos de ajuste */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">
                    {ajusteRazon === 'Festivo' ? 'Días Festivos' : 'Días'}
                  </label>
                  <input 
                    type="number" 
                    step="0.5"
                    min="0.5"
                    required
                    className="form-input" 
                    value={ajusteParamDias} 
                    onChange={e => setAjusteParamDias(e.target.value)} 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Tarifa por Día ($)</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value="400" 
                    disabled 
                    style={{ background: 'rgba(255,255,255,0.05)', cursor: 'not-allowed', fontWeight: 'bold' }} 
                  />
                </div>
              </div>

              {/* Mostrar Monto Resultante y Fórmula */}
              {(() => {
                const dias = parseFloat(ajusteParamDias) || 0;
                const tarifa = 400;
                const val = dias * tarifa;
                let formulaText = '';

                if (ajusteRazon === 'Dia adelantado' || ajusteRazon === 'Vacaciones') {
                  formulaText = `${dias} días × $${tarifa}/día`;
                } else if (ajusteRazon === 'Festivo') {
                  formulaText = `${dias} días festivos × $${tarifa}/día`;
                } else if (ajusteRazon === 'Apoyo en calidad') {
                  formulaText = `${dias} días × $${tarifa}/día en Apoyo calidad`;
                }

                return (
                  <div 
                    style={{ 
                      padding: '1rem', 
                      background: 'rgba(14, 165, 233, 0.1)', 
                      border: '1px solid rgba(14, 165, 233, 0.2)', 
                      borderRadius: '10px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '0.2rem'
                    }}
                  >
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Fórmula: {formulaText}</span>
                    <span style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#38bdf8' }}>
                      Total: {formatCurrency(val)}
                    </span>
                  </div>
                );
              })()}

              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  style={{ flex: 1 }}
                  onClick={() => {
                    setShowAjusteModal(false);
                    setAjustePlanchadorId('');
                  }}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  Registrar Ajuste
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* MODAL 4: CALCULAR Y APLICAR CUADRE SEMANAL */}
      {showCuadreModal && (
        <div 
          style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            background: 'rgba(0,0,0,0.6)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            zIndex: 1000, 
            backdropFilter: 'blur(8px)' 
          }}
        >
          <div className="glass-card" style={{ width: '95%', maxWidth: '550px', padding: '2rem', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calculator color="#10b981" /> Cuadre Semanal de Plancha
              </h2>
              <button 
                onClick={() => {
                  setShowCuadreModal(false);
                  setCuadrePlanchadorId('');
                  setCuadrePlanchaReal(0);
                }} 
                className="btn-icon" 
                style={{ background: 'rgba(255,255,255,0.05)', color: '#fff', border: 'none', padding: '8px', borderRadius: '50%', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              
              <div className="form-group">
                <label className="form-label">Planchador</label>
                <select 
                  className="form-input" 
                  value={cuadrePlanchadorId} 
                  onChange={e => setCuadrePlanchadorId(e.target.value)}
                  required
                >
                  <option value="">-- Elige un Planchador --</option>
                  {planchadores.map(p => (
                    <option key={p.id} value={p.id}>{p.nombre}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Fecha de Inicio</label>
                  <input 
                    type="date" 
                    required
                    className="form-input" 
                    value={cuadreStart} 
                    onChange={e => setCuadreStart(e.target.value)} 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Fecha Fin</label>
                  <input 
                    type="date" 
                    required
                    className="form-input" 
                    value={cuadreEnd} 
                    onChange={e => setCuadreEnd(e.target.value)} 
                  />
                </div>
              </div>

              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => handleCalcularCuadre(false)}
                disabled={!cuadrePlanchadorId}
                style={{ width: '100%', borderColor: 'rgba(16, 185, 129, 0.4)', color: '#10b981' }}
              >
                Recargar Plancha Real
              </button>

              <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.08)', margin: '0.5rem 0' }} />

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Día adelantado ($)</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value="400" 
                    disabled 
                    style={{ background: 'rgba(255,255,255,0.05)', cursor: 'not-allowed', fontWeight: 'bold' }} 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Plancha real ($)</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={formatCurrency(cuadrePlanchaReal)} 
                    disabled 
                    style={{ background: 'rgba(255,255,255,0.05)', cursor: 'not-allowed', fontWeight: 'bold', color: '#10b981' }} 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Diferencia ($)</label>
                  {(() => {
                    const diaAdelantadoVal = 400;
                    const diferencia = cuadrePlanchaReal - diaAdelantadoVal;
                    return (
                      <input 
                        type="text" 
                        className="form-input" 
                        value={(diferencia >= 0 ? '+' : '') + formatCurrency(diferencia)} 
                        disabled 
                        style={{ 
                          background: 'rgba(255,255,255,0.05)', 
                          cursor: 'not-allowed', 
                          fontWeight: 'bold', 
                          color: diferencia > 0 ? '#10b981' : diferencia < 0 ? '#ef4444' : '#fff' 
                        }} 
                      />
                    );
                  })()}
                </div>
              </div>

              {/* Resultado del Cuadre */}
              {(() => {
                const diaAdelantadoVal = 400;
                const diferencia = cuadrePlanchaReal - diaAdelantadoVal;

                return (
                  <div 
                    style={{ 
                      padding: '1.2rem', 
                      background: diferencia > 0 ? 'rgba(16, 185, 129, 0.1)' : diferencia < 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255, 255, 255, 0.02)', 
                      border: `1px solid ${diferencia > 0 ? 'rgba(16, 185, 129, 0.25)' : diferencia < 0 ? 'rgba(239, 68, 68, 0.25)' : 'rgba(255, 255, 255, 0.08)'}`, 
                      borderRadius: '12px',
                      textAlign: 'center'
                    }}
                  >
                    <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '0.2rem' }}>Resultado de Diferencia:</div>
                    <div style={{ fontSize: '1.6rem', fontWeight: 'bold', color: diferencia > 0 ? '#10b981' : diferencia < 0 ? '#ef4444' : '#fff' }}>
                      {diferencia > 0 ? `Bono: +${formatCurrency(diferencia)}` : diferencia < 0 ? `Descuento: ${formatCurrency(diferencia)}` : 'Sin Diferencia'}
                    </div>
                    <div style={{ marginTop: '0.4rem', fontSize: '0.85rem', color: '#64748b' }}>
                      {diferencia > 0 ? 'Se sumará la diferencia como un bono en el historial.' : diferencia < 0 ? 'Se restará la diferencia como un descuento en el historial.' : 'No se registrará ningún ajuste financiero.'}
                    </div>
                  </div>
                );
              })()}

              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  style={{ flex: 1 }}
                  onClick={() => {
                    setShowCuadreModal(false);
                    setCuadrePlanchadorId('');
                    setCuadrePlanchaReal(0);
                  }}
                >
                  Cancelar
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary" 
                  style={{ flex: 1 }}
                  disabled={!cuadrePlanchadorId}
                  onClick={handleAplicarCuadre}
                >
                  Aplicar Cuadre
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

        </main>
      </div>
    </div>
  );
}
