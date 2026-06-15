import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  ArrowLeftRight,
  Trash2, 
  UserPlus, 
  X,
  History,
  Download,
  Calculator,
  FileText,
  Edit3,
  MinusCircle
} from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import API_URL from '../config';
import PlanchaSidebar from '../components/PlanchaSidebar';
import Header from '../components/Header';

// Tallas asociadas a cada burro (1 al 12)
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
  10: '13',
  11: 'TODAS',
  12: 'TODAS'
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
  const isEn = settings.language === 'en';
  const { user } = useAuth();
  const userRole = (user?.role || user?.rol || '').toString().toLowerCase().trim();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'plancha';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) {
      setActiveTab(tab);
    }
  }, [searchParams]);

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

  // Estado pestaña Modelos (Devolución)
  const [mostrarDevolucionModal, setMostrarDevolucionModal] = useState(false);
  const [modeloADevolver, setModeloADevolver] = useState(null);
  const [devolucionCantidades, setDevolucionCantidades] = useState({});
  const [isMouseDownDev, setIsMouseDownDev] = useState(false);
  const [editingBlockDev, setEditingBlockDev] = useState(null); // { color, talla }
  const dragActionDevRef = useRef(null); // 'select' | 'deselect'

  const handleAbrirDevolucion = (modelo) => {
    setModeloADevolver(modelo);
    setDevolucionCantidades({});
    setEditingBlockDev(null);
    setIsMouseDownDev(false);
    setMostrarDevolucionModal(true);
  };

  const handleBlockMouseDown = (color, talla, maxQty) => {
    const currentVal = color
      ? (devolucionCantidades[color]?.[talla] || 0)
      : (devolucionCantidades[talla] || 0);
    const isSelected = currentVal > 0;
    const newAction = isSelected ? 'deselect' : 'select';
    dragActionDevRef.current = newAction;
    setIsMouseDownDev(true);
    
    updateDevQty(color, talla, newAction === 'select' ? maxQty : 0);
  };

  const handleBlockMouseEnter = (color, talla, maxQty) => {
    if (!isMouseDownDev) return;
    const action = dragActionDevRef.current;
    updateDevQty(color, talla, action === 'select' ? maxQty : 0);
  };

  const updateDevQty = (color, talla, qty) => {
    setDevolucionCantidades(prev => {
      const next = { ...prev };
      if (color) {
        if (!next[color]) next[color] = {};
        next[color][talla] = qty;
      } else {
        next[talla] = qty;
      }
      return next;
    });
  };

  // Reset drag state when mouse is released anywhere on the page
  useEffect(() => {
    const handleMouseUp = () => setIsMouseDownDev(false);
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, []);

  const handleConfirmarDevolucion = async (e) => {
    e.preventDefault();
    if (!modeloADevolver) return;
    
    // Clean up quantities to only send positive numbers
    const payload = {};
    const firstVal = Object.values(modeloADevolver.tallas_cantidades)[0];
    const isNested = (typeof firstVal === 'object' && firstVal !== null);
    let totalPieces = 0;

    if (isNested) {
      Object.entries(devolucionCantidades).forEach(([color, tallasObj]) => {
        if (!tallasObj || typeof tallasObj !== 'object') return;
        Object.entries(tallasObj).forEach(([talla, qty]) => {
          const qtyInt = parseInt(qty) || 0;
          if (qtyInt > 0) {
            if (!payload[color]) payload[color] = {};
            payload[color][talla] = qtyInt;
            totalPieces += qtyInt;
          }
        });
      });
    } else {
      Object.entries(devolucionCantidades).forEach(([talla, qty]) => {
        const qtyInt = parseInt(qty) || 0;
        if (qtyInt > 0) {
          payload[talla] = qtyInt;
          totalPieces += qtyInt;
        }
      });
    }

    if (totalPieces === 0) {
      alert('Por favor, selecciona al menos una pieza para devolver.');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/api/plancha/modelos/${modeloADevolver.id}/devolver`, {
        tallas_devolucion: payload
      }, { headers: { Authorization: `Bearer ${token}` } });

      setMostrarDevolucionModal(false);
      setModeloADevolver(null);
      setDevolucionCantidades({});
      fetchModelosCamion();
      fetchModelosDisponibles();
      alert('Devolución registrada con éxito.');
    } catch (e) {
      console.error(e);
      alert(e.response?.data?.error || 'Error al registrar devolución');
    }
  };

  // Estado pestaña Plancha (Drag & Drop)
  const [draggedItem, setDraggedItem] = useState(null); // { type: 'planchador'|'modelo', data: obj }
  const [burrosState, setBurrosState] = useState(
    Array.from({ length: 12 }, (_, i) => ({
      numero: i + 1,
      talla: BURROS_TALLAS[i + 1],
      planchador: null, // { id, nombre }
      modelos: [] // [{ id, modelo, imagen, piezas, maxPiezas }]
    }))
  );

  // Nombres personalizados de los burros del 1 al 10 con persistencia
  const [burrosNames, setBurrosNames] = useState(() => {
    try {
      const saved = localStorage.getItem('plancha_burros_names');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error("Error loading burros names:", e);
    }
    return {
      1: 'Mary',
      2: 'Karla',
      3: 'Maribel',
      4: 'Alma',
      5: 'Karina',
      6: '',
      7: '',
      8: '',
      9: '',
      10: ''
    };
  });

  const handleRenameBurro = (numero, newName) => {
    const updated = { ...burrosNames, [numero]: newName };
    setBurrosNames(updated);
    localStorage.setItem('plancha_burros_names', JSON.stringify(updated));
  };

  // Estado pestaña Pagos
  const [planchadorPagoDetalle, setPlanchadorPagoDetalle] = useState(null);
  const [pagoPlanchadorId, setPagoPlanchadorId] = useState('');
  const [montoPago, setMontoPago] = useState('');
  const [tipoPago, setTipoPago] = useState('completo');
  const [pagoSubmitting, setPagoSubmitting] = useState(false);

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
  const [reportPlanchadorId, setReportPlanchadorId] = useState('');

  // Carga inicial
  useEffect(() => {
    fetchPlanchadores();
    fetchModelosCamion();
    fetchModelosDisponibles();
  }, []);

  // Recalcular cuadre automáticamente cuando cambien las fechas o el planchador en el modal de cuadre
  useEffect(() => {
    if (showCuadreModal && cuadrePlanchadorId && cuadreStart) {
      handleCalcularCuadre(true);
    }
  }, [showCuadreModal, cuadrePlanchadorId, cuadreStart]);

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

  // --- BARCODE SCANNER LOGIC ---
  const activeBurroScannerRef = useRef(null);
  const burrosStateRef = useRef(burrosState);
  const planchadoresRef = useRef(planchadores);
  const modelosDisponiblesRef = useRef(modelosDisponibles);
  const modelosCamionRef = useRef(modelosCamion);
  
  const [activeBurroScanner, setActiveBurroScanner] = useState(null);

  useEffect(() => { activeBurroScannerRef.current = activeBurroScanner; }, [activeBurroScanner]);
  useEffect(() => { burrosStateRef.current = burrosState; }, [burrosState]);
  useEffect(() => { planchadoresRef.current = planchadores; }, [planchadores]);
  useEffect(() => { modelosDisponiblesRef.current = modelosDisponibles; }, [modelosDisponibles]);
  useEffect(() => { modelosCamionRef.current = modelosCamion; }, [modelosCamion]);

  const playBeep = (type = 'success') => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      if (type === 'success') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      } else {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, ctx.currentTime);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      }
    } catch(e) {}
  };

  useEffect(() => {
    if (activeTab !== 'plancha') return;

    let buffer = '';
    let timeout = null;

    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;

      if (e.key === 'Enter' || e.key === 'Tab') {
        if (e.key === 'Tab') e.preventDefault();
        if (buffer.length > 0) {
          const code = buffer.trim();
          buffer = '';
          handleScannedCode(code);
        }
        return;
      }

      if (e.key.length > 1) return;

      buffer += e.key;
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        buffer = '';
      }, 300);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(timeout);
    };
  }, [activeTab]);

  const handleScannedCode = async (code) => {
    const codeUpper = code.toUpperCase();
    if (codeUpper.startsWith('B-') || codeUpper.startsWith('BURRO')) {
      const numStr = codeUpper.replace('BURRO', '').replace('B-', '');
      const num = parseInt(numStr, 10);
      if (!isNaN(num) && num >= 1 && num <= 12) {
        setActiveBurroScanner(num);
        playBeep('success');
        return;
      }
    }

    const planchadorEncontrado = planchadoresRef.current.find(p => p.nombre.toLowerCase() === code.toLowerCase());
    if (planchadorEncontrado) {
      if (!activeBurroScannerRef.current) {
        playBeep('error');
        alert("Escanea primero un Burro para asignarle al planchador.");
        return;
      }
      const burroIdx = activeBurroScannerRef.current - 1;
      const newBurros = [...burrosStateRef.current];
      newBurros[burroIdx].planchador = planchadorEncontrado;
      setBurrosState(newBurros);
      playBeep('success');
      return;
    }

    let exactMatches = modelosDisponiblesRef.current.filter(m => code.toUpperCase().includes(m.modelo.toUpperCase()));
    
    if (exactMatches.length === 0) {
      // Saltar candado si existe en camión
      exactMatches = modelosCamionRef.current.filter(m => code.toUpperCase().includes(m.modelo.toUpperCase()));
    }

    if (exactMatches.length === 0) {
      playBeep('error');
      alert(`Modelo no encontrado en Colima: ${code}`);
      return;
    }

    const modeloMatch = exactMatches[0];

    if (!activeBurroScannerRef.current) {
      playBeep('error');
      alert(`Modelo ${modeloMatch.modelo} detectado. Escanea primero un Burro para asignarlo.`);
      return;
    }

    const burroIdx = activeBurroScannerRef.current - 1;
    const currentBurro = burrosStateRef.current[burroIdx];

    let selectedTalla = null;
    const availableTallas = Object.entries(modeloMatch.tallas_disponibles || {}).filter(([t, q]) => q > 0);
    
    if (availableTallas.length === 1) {
      selectedTalla = availableTallas[0][0];
    } else if (availableTallas.length > 1) {
      if (currentBurro.numero < 11) {
        const match = availableTallas.find(([t]) => normalizeTalla(t) === normalizeTalla(currentBurro.talla));
        if (match) selectedTalla = match[0];
      }
      if (!selectedTalla) {
        selectedTalla = prompt(`El modelo ${modeloMatch.modelo} tiene varias tallas. Ingresa la talla a asignar:`);
        if (!selectedTalla) {
          playBeep('error');
          return;
        }
      }
    } else {
      playBeep('error');
      alert(`El modelo ${modeloMatch.modelo} no tiene piezas disponibles.`);
      return;
    }

    const newBurros = [...burrosStateRef.current];
    const existingModelIdx = newBurros[burroIdx].modelos.findIndex(m => m.id === modeloMatch.id && m.talla === selectedTalla);
    
    if (existingModelIdx !== -1) {
      playBeep('success');
    } else {
      newBurros[burroIdx].modelos.push({
        ...modeloMatch,
        talla: selectedTalla,
        asignadas: 1
      });
      setBurrosState(newBurros);
      playBeep('success');
    }
  };

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
    setPrecioPlanchaInput(modelo.precio_plancha !== undefined && modelo.precio_plancha !== null ? String(modelo.precio_plancha) : '');
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
      const isEditing = modeloAVerificar.verificado;
      setModeloAVerificar(null);
      setPrecioPlanchaInput('');
      fetchModelosCamion();
      fetchModelosDisponibles();
      alert(isEditing ? 'Precio de planchado actualizado con éxito' : 'Modelo verificado y desbloqueado para Plancha');
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
      
      let selectedTalla = "";
      if (burro.numero >= 11) {
        // Encontrar la primera talla con stock disponible > 0
        const foundTallaEntry = Object.entries(model.tallas_disponibles || {}).find(
          ([t, disp]) => disp > 0
        );
        if (!foundTallaEntry) {
          alert(`El modelo ${model.modelo} no tiene piezas disponibles en ninguna talla.`);
          setDraggedItem(null);
          return;
        }
        selectedTalla = foundTallaEntry[0];
      } else {
        selectedTalla = burro.talla;
      }

      const normTalla = normalizeTalla(selectedTalla);

      // Validar si el modelo tiene stock disponible en la talla elegida (normalizado)
      const matchingTallaKey = Object.keys(model.tallas_disponibles || {}).find(
        k => normalizeTalla(k) === normTalla
      );
      const disp = matchingTallaKey ? (model.tallas_disponibles[matchingTallaKey] || 0) : 0;
      if (disp <= 0) {
        alert(`El modelo ${model.modelo} no tiene piezas disponibles para la Talla ${selectedTalla}`);
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

            // Verificar que tenga stock y que no esté ya asignado en este burro con esta talla y color
            const alreadyAssigned = burro.modelos.some(
              m => m.id === model.id && m.color === color && m.talla === selectedTalla
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
        alert(`Todas las variantes de color disponibles del modelo ${model.modelo} para la Talla ${selectedTalla} ya han sido agregadas a este burro.`);
        setDraggedItem(null);
        return;
      }

      // Validar si el modelo con ese mismo color y talla ya está asignado en este burro (seguridad secundaria)
      const existing = burro.modelos.find(
        m => m.id === model.id && m.color === selectedColor && m.talla === selectedTalla
      );
      if (existing) {
        alert(`La variante de color "${selectedColor || 'Único'}" del modelo ${model.modelo} para la Talla ${selectedTalla} ya está en la lista de este burro`);
        setDraggedItem(null);
        return;
      }

      // Agregar modelo al burro con 1 pieza
      burro.modelos.push({
        id: model.id,
        modelo: model.modelo,
        imagen: model.imagen,
        color: selectedColor,
        talla: selectedTalla,
        piezas: 1,
        maxPiezas: stockDeEseColorYTalla,
        tallas_colores_disponibles: model.tallas_colores_disponibles
      });
    }

    setBurrosState(newBurros);
    setDraggedItem(null);
  };

  const handleChangeModeloColor = (burroIndex, modelId, oldColor, newColor, modelTalla) => {
    if (oldColor === newColor) return;
    const newBurros = [...burrosState];
    const burro = newBurros[burroIndex];
    const talla = burro.numero >= 11 ? modelTalla : burro.talla;
    const normTalla = normalizeTalla(talla);

    // Verificar si el modelo con el nuevo color ya está en este burro para esta talla
    const duplicate = burro.modelos.some(
      m => m.id === modelId && m.color === newColor && m.talla === talla
    );
    if (duplicate) {
      alert(`La variante de color "${newColor || 'Único'}" ya está en la lista de este burro.`);
      return;
    }

    const model = burro.modelos.find(
      m => m.id === modelId && m.color === oldColor && m.talla === talla
    );
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

  const handleChangeModeloTalla = (burroIndex, modelId, color, oldTalla, newTalla) => {
    if (oldTalla === newTalla) return;
    const newBurros = [...burrosState];
    const burro = newBurros[burroIndex];
    const normTalla = normalizeTalla(newTalla);

    const model = burro.modelos.find(
      m => m.id === modelId && m.color === color && m.talla === oldTalla
    );
    if (!model) return;

    // Verificar si el modelo con la nueva talla y el color actual ya está en este burro
    const duplicate = burro.modelos.some(
      m => m.id === modelId && m.color === color && m.talla === newTalla
    );
    if (duplicate) {
      alert(`El modelo ${model.modelo} con la Talla ${newTalla} y color ${color || 'Único'} ya está en este burro.`);
      return;
    }

    // Verificar stock de la nueva talla para el color actual
    let stockDeEseColorYTalla = 0;
    if (model.tallas_colores_disponibles && model.tallas_colores_disponibles[color]) {
      const colorTallasObj = model.tallas_colores_disponibles[color];
      const matchingColorTallaKey = Object.keys(colorTallasObj || {}).find(
        k => normalizeTalla(k) === normTalla
      );
      stockDeEseColorYTalla = matchingColorTallaKey ? (colorTallasObj[matchingColorTallaKey] || 0) : 0;
    }

    let finalColor = color;
    // Si no hay stock para el color actual en la nueva talla, buscar el primer color con stock
    if (stockDeEseColorYTalla <= 0 && model.tallas_colores_disponibles) {
      const foundColorEntry = Object.entries(model.tallas_colores_disponibles).find(
        ([col, tallasObj]) => {
          const matchingColorTallaKey = Object.keys(tallasObj || {}).find(
            k => normalizeTalla(k) === normTalla
          );
          const stockVal = matchingColorTallaKey ? (tallasObj[matchingColorTallaKey] || 0) : 0;
          // Que no esté duplicado en el burro
          const alreadyAssigned = burro.modelos.some(
            m => m.id === modelId && m.color === col && m.talla === newTalla
          );
          return stockVal > 0 && !alreadyAssigned;
        }
      );
      if (foundColorEntry) {
        finalColor = foundColorEntry[0];
        const colorTallasObj = foundColorEntry[1];
        const matchingColorTallaKey = Object.keys(colorTallasObj || {}).find(
          k => normalizeTalla(k) === normTalla
        );
        stockDeEseColorYTalla = matchingColorTallaKey ? (colorTallasObj[matchingColorTallaKey] || 0) : 0;
      } else {
        alert(`No hay stock disponible para ninguna variante de color del modelo ${model.modelo} en la Talla ${newTalla}`);
        return;
      }
    }

    model.talla = newTalla;
    model.color = finalColor;
    model.maxPiezas = stockDeEseColorYTalla;
    if (model.piezas > stockDeEseColorYTalla) {
      model.piezas = stockDeEseColorYTalla > 0 ? stockDeEseColorYTalla : 1;
    }
    setBurrosState(newBurros);
  };

  const handleRemovePlanchadorFromBurro = (index) => {
    const newBurros = [...burrosState];
    newBurros[index].planchador = null;
    setBurrosState(newBurros);
  };

  const handleRemoveModeloFromBurro = (burroIndex, modelId, color, talla) => {
    const newBurros = [...burrosState];
    newBurros[burroIndex].modelos = newBurros[burroIndex].modelos.filter(
      m => !(m.id === modelId && m.color === color && m.talla === talla)
    );
    setBurrosState(newBurros);
  };

  const handleUpdatePiezas = (burroIndex, modelId, color, talla, delta) => {
    const newBurros = [...burrosState];
    const model = newBurros[burroIndex].modelos.find(
      m => m.id === modelId && m.color === color && m.talla === talla
    );
    if (model) {
      const newVal = model.piezas + delta;
      if (newVal >= 1 && newVal <= model.maxPiezas) {
        model.piezas = newVal;
        setBurrosState(newBurros);
      }
    }
  };

  const handleSetPiezas = (burroIndex, modelId, color, talla, val) => {
    const newBurros = [...burrosState];
    const model = newBurros[burroIndex].modelos.find(
      m => m.id === modelId && m.color === color && m.talla === talla
    );
    if (model) {
      model.piezas = val;
      setBurrosState(newBurros);
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
          color: m.color,
          talla: m.talla
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
    if (!pagoPlanchadorId || !montoPago || parseFloat(montoPago) <= 0 || pagoSubmitting) return;
    try {
      setPagoSubmitting(true);
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
    } finally {
      setPagoSubmitting(false);
    }
  };

  const handleEliminarAjuste = async (id) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este ajuste/pago fijo?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/api/plancha/trabajos/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Ajuste eliminado correctamente');
      handleCargarPagosPlanchador(pagoPlanchadorId);
    } catch (e) {
      console.error(e);
      alert(e.response?.data?.error || 'Error al eliminar el ajuste');
    }
  };

  const handleEliminarAsistencia = async (id) => {
    if (!confirm('¿Estás seguro de que deseas eliminar esta asistencia?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/api/plancha/asistencias/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Asistencia eliminada correctamente');
      handleCargarPagosPlanchador(pagoPlanchadorId);
    } catch (e) {
      console.error(e);
      alert(e.response?.data?.error || 'Error al eliminar la asistencia');
    }
  };

  // --- MÉTODOS EXTRA (ASISTENCIAS, AJUSTES, CUADRE, REPORTES) ---
  
  const registrarAsistencia = async (planchadorId, nombre) => {
    if (nombre && nombre.toLowerCase().includes('olga')) {
      console.log("Olga no puede tener asistencias.");
      return;
    }
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
      alert('El monto del pago fijo debe ser mayor a 0');
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

      alert('Pago fijo registrado con éxito');
      setShowAjusteModal(false);
      setAjustePlanchadorId('');
      fetchModelosDisponibles();
      if (pagoPlanchadorId === ajustePlanchadorId) {
        handleCargarPagosPlanchador(pagoPlanchadorId);
      }
    } catch (e) {
      console.error(e);
      alert(e.response?.data?.error || 'Error al registrar pago fijo');
    }
  };

  const handleCalcularCuadre = async (silente = false) => {
    if (!cuadrePlanchadorId || !cuadreStart) {
      if (!silente) alert('Faltan datos para realizar la consulta del cuadre');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/planchadores/${cuadrePlanchadorId}/piezas-rango?start=${cuadreStart}&end=${cuadreStart}`, {
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

    if (!cuadreEnd) {
      alert('Debe elegir la fecha en la cual se aplicará la diferencia.');
      return;
    }

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
        monto: finalMonto,
        fecha: cuadreEnd
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
    if (reportPlanchadorId) params.append('planchadorId', reportPlanchadorId);
    params.append('lang', settings.language || 'es');
    const query = params.toString();
    if (query) url += `?${query}`;
    window.open(url, '_blank');
  };

  const handleDownloadResumen = () => {
    let url = `${API_URL}/api/reportes/plancha/resumen`;
    const params = new URLSearchParams();
    if (reportStart) params.append('start', reportStart);
    if (reportEnd) params.append('end', reportEnd);
    params.append('lang', settings.language || 'es');
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
            👤 {attendanceNotif.nombre} - {attendanceNotif.count}/5 {isEn ? 'attended' : 'asistido'} {attendanceNotif.registered ? (isEn ? '(Attendance Registered)' : '(Asistencia Registrada)') : (isEn ? '(Already registered today)' : '(Ya registrado hoy)')}
          </div>
        )}

        <main className="main-content" style={{ padding: '2rem' }}>

      {/* CONTENIDO PESTAÑA 1: PLANCHADORES */}
      {activeTab === 'planchadores' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem', alignItems: 'start' }}>
          
          {/* Alta de Planchador */}
          <div className="glass-card">
            <h2 style={{ fontSize: '1.4rem', margin: '0 0 1.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <UserPlus color="#3b82f6" /> {isEn ? 'Register Ironer' : 'Alta Planchador'}
            </h2>
            <form onSubmit={handleAgregarPlanchador} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              <div className="form-group">
                <label className="form-label">{isEn ? 'Ironer Name' : 'Nombre del Planchador'}</label>
                <input 
                  type="text" 
                  required 
                  className="form-input" 
                  placeholder={isEn ? 'e.g., Rosa Maria' : 'Ej: Rosa María'} 
                  value={nuevoNombre} 
                  onChange={e => setNuevoNombre(e.target.value)} 
                />
              </div>
              <div className="form-group">
                <label className="form-label">{isEn ? 'Phone Number' : 'Número de Teléfono'}</label>
                <input 
                  type="tel" 
                  className="form-input" 
                  placeholder={isEn ? 'e.g., 3121234567' : 'Ej: 3121234567'} 
                  value={nuevoTelefono} 
                  onChange={e => setNuevoTelefono(e.target.value)} 
                />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                <Plus size={18} style={{ marginRight: '4px' }} /> {isEn ? 'Register Ironer' : 'Registrar Planchador'}
              </button>
            </form>
          </div>

          {/* Listado de Planchadores */}
          <div className="glass-card">
            <h2 style={{ fontSize: '1.4rem', margin: '0 0 1.5rem 0' }}>{isEn ? 'Active Ironers' : 'Planchadores Activos'}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1.2rem' }}>
              {planchadores.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--text-muted, #94a3b8)', gridColumn: '1/-1', padding: '2rem' }}>
                  {isEn ? 'No registered ironers.' : 'No hay planchadores registrados.'}
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
                        <p style={{ color: 'var(--text-muted, #94a3b8)', margin: '0.2rem 0 0 0', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Phone size={12} /> {isEn ? 'Phone' : 'Teléfono'}: {p.telefono}
                        </p>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                      <button 
                        className="btn btn-secondary" 
                        style={{ flex: 1, padding: '6px 12px', fontSize: '0.85rem' }}
                        onClick={() => handleVerHistorialPlanchador(p.id)}
                      >
                        {isEn ? 'View History' : 'Ver Historial'}
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
          <h2 style={{ fontSize: '1.5rem', margin: '0 0 1.5rem 0' }}>{isEn ? 'Models in Transit / Colima' : 'Modelos en Tránsito / Colima'}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
            {modelosCamion.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--text-muted, #94a3b8)', gridColumn: '1/-1', padding: '3rem' }}>
                {isEn ? 'No registered models from sent trucks.' : 'No hay modelos registrados de camiones enviados.'}
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
                        <Unlock size={12} /> {isEn ? 'Unlocked' : 'Desbloqueado'}
                      </span>
                    ) : (
                      <span className="badge badge-warning" style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(245, 158, 11, 0.1)', color: '#fbbf24' }}>
                        <Lock size={12} /> {isEn ? 'Locked' : 'Bloqueado'}
                      </span>
                    )}
                  </div>

                  {/* Imagen y Detalles del modelo (Versión Simplificada) */}
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    {m.imagen ? (
                      <img 
                        src={`${API_URL}${m.imagen}`} 
                        alt={m.modelo} 
                        style={{ width: '60px', height: '60px', borderRadius: '8px', objectFit: 'contain', background: 'var(--bg-card)' }} 
                      />
                    ) : (
                      <div style={{ width: '60px', height: '60px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Layers size={24} color="#64748b" />
                      </div>
                    )}
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.3rem' }}>{isEn ? 'Model' : 'Modelo'} {m.modelo}</h3>
                    </div>
                  </div>

                  {/* Acciones */}
                  <div style={{ marginTop: 'auto', paddingTop: '0.5rem' }}>
                    {m.verificado ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem' }}>
                          <span style={{ color: 'var(--text-muted, #94a3b8)' }}>{isEn ? 'Ironing Pay' : 'Pago de Plancha'}:</span>
                          <strong style={{ color: '#34d399', fontSize: '1.1rem' }}>{formatCurrency(m.precio_plancha)} <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: 'var(--text-secondary)' }}>{isEn ? '/ pc' : '/ pza'}</span></strong>
                        </div>
                        {userRole !== 'plancha' && (
                          <button 
                            className="btn btn-secondary" 
                            style={{ width: '100%', padding: '6px', fontSize: '0.8rem', borderColor: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                            onClick={() => handleAbrirVerificacion(m)}
                          >
                            <Edit3 size={12} /> {isEn ? 'Edit Price' : 'Editar Precio'}
                          </button>
                        )}
                      </div>
                    ) : (
                      userRole === 'plancha' ? (
                        <div style={{ textAlign: 'center', color: 'var(--text-muted, #94a3b8)', fontSize: '0.85rem', fontStyle: 'italic', padding: '4px 0' }}>
                          {isEn ? 'Pending Verification' : 'Pendiente de Verificación'}
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button 
                            className="btn btn-primary" 
                            style={{ flex: 1, padding: '8px', fontSize: '0.85rem' }}
                            onClick={() => handleAbrirVerificacion(m)}
                          >
                            {isEn ? 'Verify' : 'Verificar'}
                          </button>
                          <button 
                            className="btn" 
                            style={{ flex: 1, padding: '8px', fontSize: '0.85rem', background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)' }}
                            onClick={() => handleAbrirDevolucion(m)}
                          >
                            {isEn ? 'Return' : 'Devolución'}
                          </button>
                        </div>
                      )
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', fontFamily: 'Inter, sans-serif' }}>
          
          {/* KPIs Top */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div style={{ background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border-color)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <h4 style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '0 0 0.5rem 0' }}>{isEn ? 'Active Boards' : 'Burros activos'}</h4>
              <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>{burrosState.filter(b => b.planchador).length}</div>
            </div>
            <div style={{ background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border-color)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <h4 style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '0 0 0.5rem 0' }}>{isEn ? 'Assigned Models' : 'Modelos asignados'}</h4>
              <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#10b981' }}>{burrosState.reduce((sum, b) => sum + b.modelos.length, 0)}</div>
            </div>

            <div style={{ background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border-color)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <h4 style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '0 0 0.5rem 0' }}>{isEn ? 'Unassigned' : 'Sin asignar'}</h4>
              <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#f59e0b' }}>{modelosDisponibles.length}</div>
            </div>
          </div>

          {/* Main Content Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr 300px', gap: '1.5rem', alignItems: 'start' }}>
            
            {/* Left Column: Pendientes */}
            <div style={{ background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border-color)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 250px)' }}>
              <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)' }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center' }}>
                  {isEn ? 'Pending Models' : 'Modelos pendientes'} 
                  <span style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.8rem', marginLeft: 'auto', fontWeight: '600' }}>{modelosDisponibles.length}</span>
                </h3>
                <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Arrastra un modelo a un burro disponible o usa Asignar</p>
              </div>
              
              <div style={{ padding: '1rem 1.5rem 0 1.5rem' }}>
                <input 
                  type="text" 
                  placeholder={isEn ? "Search model..." : "Buscar modelo..."} 
                  value={searchQuery} 
                  onChange={e => setSearchQuery(e.target.value)} 
                  style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--border-color, #e2e8f0)', background: 'var(--bg-input)', color: 'var(--text-primary)', outline: 'none' }} 
                />
              </div>

              <div style={{ overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {modelosDisponibles.filter(m => m.modelo.toLowerCase().includes(searchQuery.toLowerCase())).map(m => (
                  <div 
                    key={m.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, 'modelo', m)}
                    style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1rem', display: 'flex', gap: '1rem', cursor: 'grab', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', transition: 'all 0.2s' }}
                    onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = 'var(--primary-color)'; }}
                    onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'var(--border-color)'; }}
                  >
                    {m.imagen ? (
                      <img src={`${API_URL}${m.imagen}`} style={{ width: '60px', height: '80px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--border-color)' }} />
                    ) : (
                      <div style={{ width: '60px', height: '80px', background: 'var(--bg-input)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Layers color="#cbd5e1" /></div>
                    )}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div>
                        <h4 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '0.95rem' }}>{m.modelo}</h4>
                        <p style={{ margin: '4px 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{formatCurrency(m.precio_plancha)}/pza</p>
                        <button onClick={() => { playBeep('success'); alert('Escanea un burro o arrástralo manualmente para asignar.'); }} style={{ background: '#3b82f6', color: 'var(--bg-card)', border: 'none', borderRadius: '6px', padding: '4px 12px', fontSize: '0.75rem', cursor: 'pointer', alignSelf: 'flex-start', marginTop: '4px' }}>Asignar</button>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {Object.entries(m.tallas_disponibles).filter(([_, q]) => q > 0).map(([t, q]) => (
                          <span key={t} style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', fontWeight: '600' }}>T{t}: {q}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
                
                {planchadores.length > 0 && (
                  <div style={{ marginTop: '0.5rem', paddingTop: '1.5rem', borderTop: '1px dashed var(--border-color)' }}>
                     <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '600' }}>Operarios (Planchadores)</h4>
                     <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                       {planchadores.map(p => (
                         <div key={p.id} draggable onDragStart={(e) => handleDragStart(e, 'planchador', p)} style={{ padding: '0.8rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '8px', cursor: 'grab', display: 'flex', alignItems: 'center', gap: '0.8rem', fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: '500', transition: 'background 0.2s' }} onMouseOver={e => e.currentTarget.style.opacity = '0.8'} onMouseOut={e => e.currentTarget.style.opacity = '1'}>
                           <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#dbeafe', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>{p.nombre.charAt(0)}</div>
                           {p.nombre}
                         </div>
                       ))}
                     </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Mapa de Burros */}
            <div style={{ background: 'var(--bg-input)', borderRadius: '16px', border: '1px solid var(--border-color)', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-primary)' }}>{isEn ? 'Board Map' : 'Mapa de burros'}</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981' }}></div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Activos</span>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#cbd5e1', marginLeft: '8px' }}></div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Disponibles</span>
                </div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
                {burrosState.map((burro, index) => {
                  const hasPlanchador = !!burro.planchador;
                  const hasModelos = burro.modelos.length > 0;
                  const isActiveScanner = activeBurroScanner === burro.numero;

                  return (
                    <div 
                      key={burro.numero}
                      onDragOver={e => e.preventDefault()}
                      onDrop={e => handleDropOnBurro(e, index)}
                      style={{ 
                        background: 'var(--bg-card)',
                        border: isActiveScanner ? '2px solid #3b82f6' : hasPlanchador ? '1px solid #cbd5e1' : '1px dashed #cbd5e1',
                        borderRadius: '16px',
                        padding: '1.2rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1rem',
                        boxShadow: isActiveScanner ? '0 0 0 4px rgba(59, 130, 246, 0.1)' : '0 1px 3px rgba(0,0,0,0.05)',
                        position: 'relative',
                        transition: 'all 0.2s'
                      }}
                    >
                      {/* Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)' }}>Burro {String(burro.numero).padStart(2, '0')}</h4>
                          <span style={{ fontSize: '0.7rem', fontWeight: 'bold', background: burro.numero >= 11 ? '#ecfdf5' : '#fff7ed', color: burro.numero >= 11 ? '#059669' : '#ea580c', padding: '2px 8px', borderRadius: '12px' }}>
                            {burro.numero >= 11 ? 'Comodín' : `Talla ${burro.talla}`}
                          </span>
                        </div>
                        <span style={{ fontSize: '0.75rem', fontWeight: '600', color: hasPlanchador ? '#10b981' : '#94a3b8' }}>
                          {hasPlanchador ? 'Activo' : 'Disponible'}
                        </span>
                      </div>

                      {/* Planchador Zone */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', padding: '0.8rem', background: 'var(--bg-input)', borderRadius: '8px', border: '1px solid transparent', minHeight: '60px' }}>
                        {hasPlanchador ? (
                          <>
                            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#dbeafe', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', flexShrink: 0 }}>{burro.planchador.nombre.charAt(0)}</div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Planchando:</p>
                              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{burro.planchador.nombre}</p>
                            </div>
                            <button onClick={() => handleRemovePlanchadorFromBurro(index)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted, #94a3b8)', padding: '4px' }}><X size={16} /></button>
                          </>
                        ) : (
                          <div style={{ flex: 1, textAlign: 'center', color: 'var(--text-muted, #94a3b8)', fontSize: '0.85rem' }}>Arrastra un operario aquí</div>
                        )}
                      </div>

                      {/* Models Zone */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', minHeight: '120px', background: 'var(--bg-input)', borderRadius: '8px', padding: '0.8rem', border: '1px dashed var(--border-color)' }}>
                        {!hasModelos ? (
                          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted, #94a3b8)' }}>
                            <Layers size={24} style={{ marginBottom: '8px' }} />
                            <span style={{ fontSize: '0.8rem' }}>Suelta un modelo aquí</span>
                          </div>
                        ) : (
                          burro.modelos.map(m => (
                            <div key={`${m.id}_${m.color}_${m.talla}`} style={{ background: 'var(--bg-card)', borderRadius: '8px', padding: '0.8rem', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.8rem', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-primary)' }}>MOD-{m.modelo}</span>
                                <button onClick={() => handleRemoveModeloFromBurro(index, m.id, m.color, m.talla)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '2px' }}><X size={14} /></button>
                              </div>
                              
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                {burro.numero >= 11 ? (
                                  <select value={m.talla} onChange={(e) => handleChangeModeloTalla(index, m.id, m.color, m.talla, e.target.value)} style={{ fontSize: '0.75rem', padding: '2px 4px', borderRadius: '4px', border: '1px solid var(--border-color)', outline: 'none' }}>
                                    {Object.keys(m.tallas_disponibles).map(t => <option key={t} value={t}>T{t}</option>)}
                                  </select>
                                ) : (
                                  <span style={{ fontSize: '0.75rem', background: 'var(--bg-input)', color: 'var(--text-secondary)', padding: '2px 6px', borderRadius: '4px', fontWeight: '600' }}>T{m.talla}</span>
                                )}
                                
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--bg-input)', borderRadius: '6px', padding: '2px' }}>
                                  <button onClick={() => handleUpdatePiezas(index, m.id, m.color, m.talla, -1)} style={{ border: 'none', background: 'var(--bg-card)', width: '22px', height: '22px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 1px rgba(0,0,0,0.05)' }}>-</button>
                                  <input type="number" value={m.piezas} onChange={(e) => handleSetPiezas(index, m.id, m.color, m.talla, parseInt(e.target.value)||1)} style={{ width: '32px', border: 'none', background: 'transparent', textAlign: 'center', fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-primary)', outline: 'none' }} />
                                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted, #94a3b8)', fontWeight: '600' }}>/ {m.maxPiezas}</span>
                                  <button onClick={() => handleUpdatePiezas(index, m.id, m.color, m.talla, 1)} style={{ border: 'none', background: 'var(--bg-card)', width: '22px', height: '22px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 1px rgba(0,0,0,0.05)' }}>+</button>
                                </div>
                              </div>

                              {/* Progress Bar */}
                              <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: '600' }}>
                                  <span>{m.piezas} / {m.maxPiezas} pz</span>
                                  <span>{Math.round((m.piezas/m.maxPiezas)*100)}%</span>
                                </div>
                                <div style={{ width: '100%', height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                                  <div style={{ width: `${(m.piezas/m.maxPiezas)*100}%`, height: '100%', background: '#10b981', transition: 'width 0.3s ease' }}></div>
                                </div>
                              </div>

                            </div>
                          ))
                        )}
                      </div>

                      {/* Footer Action */}
                      <button 
                        onClick={() => handleFinalizarPlanchado(index)}
                        disabled={!hasPlanchador || !hasModelos}
                        style={{ 
                          width: '100%', 
                          padding: '0.8rem', 
                          border: 'none', 
                          borderRadius: '8px', 
                          background: (!hasPlanchador || !hasModelos) ? 'var(--bg-input)' : '#2563eb', 
                          color: (!hasPlanchador || !hasModelos) ? '#94a3b8' : 'var(--bg-card)', 
                          fontWeight: '600', 
                          cursor: (!hasPlanchador || !hasModelos) ? 'not-allowed' : 'pointer',
                          transition: 'all 0.2s',
                          marginTop: 'auto',
                          boxShadow: (!hasPlanchador || !hasModelos) ? 'none' : '0 2px 4px rgba(37, 99, 235, 0.2)'
                        }}
                      >
                        Confirmar asignación
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Third Column: Detalle y Carga Operario */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Detalle de Asignación */}
              <div style={{ background: 'var(--bg-card, #fff)', borderRadius: '16px', border: '1px solid var(--border-color, #e2e8f0)', padding: '1.5rem' }}>
                <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', color: 'var(--text-primary)' }}>Detalle de Asignación</h3>
                <div style={{ background: 'var(--bg-input)', borderRadius: '8px', padding: '1rem', border: '1px solid var(--border-color, #e2e8f0)', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  {activeBurroScanner ? (
                    <>
                      <p style={{ margin: '0 0 0.5rem 0' }}><strong>Burro Seleccionado:</strong> #{activeBurroScanner}</p>
                      <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Escanea operario o prenda para asignar al Burro #{activeBurroScanner}.</p>
                    </>
                  ) : (
                    <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Escanea un burro (Ej. B-01) o usa arrastrar y soltar para comenzar a asignar.</p>
                  )}
                </div>
              </div>

              {/* Carga Operario */}
              <div style={{ background: 'var(--bg-card, #fff)', borderRadius: '16px', border: '1px solid var(--border-color, #e2e8f0)', padding: '1.5rem' }}>
                <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', color: 'var(--text-primary)' }}>Carga Operario</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                  {planchadores.slice(0, 8).map(p => {
                    let piezasAsignadas = 0;
                    burrosState.forEach(b => {
                      if (b.planchador && b.planchador.id === p.id) {
                        b.modelos.forEach(m => piezasAsignadas += (parseInt(m.piezas)||0));
                      }
                    });
                    return (
                      <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.8rem', background: 'var(--bg-input)', borderRadius: '8px', border: '1px solid var(--border-color, #e2e8f0)' }}>
                        <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: '500' }}>{p.nombre}</span>
                        <span style={{ fontSize: '0.85rem', color: '#10b981', fontWeight: 'bold', background: 'rgba(16, 185, 129, 0.1)', padding: '2px 8px', borderRadius: '12px' }}>{piezasAsignadas} pzas</span>
                      </div>
                    );
                  })}
                </div>
              </div>
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
                <Wallet color="#3b82f6" /> {isEn ? 'Register Ironing Payment' : 'Registrar Pago Plancha'}
              </h2>
              <form onSubmit={handleRegistrarPago} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                <div className="form-group">
                  <label className="form-label">{isEn ? 'Select Ironer' : 'Seleccionar Planchador'}</label>
                  <select 
                    className="form-input" 
                    value={pagoPlanchadorId} 
                    onChange={e => handleCargarPagosPlanchador(e.target.value)} 
                    required
                  >
                    <option value="">{isEn ? '-- Choose an Ironer --' : '-- Elige un Planchador --'}</option>
                    {planchadores.map(p => (
                      <option key={p.id} value={p.id}>{p.nombre}</option>
                    ))}
                  </select>
                </div>

                {planchadorPagoDetalle && (() => {
                  const trabajos = planchadorPagoDetalle.trabajosPendientes || [];
                  const asistenciasList = planchadorPagoDetalle.asistenciasPendientes || [];
                  
                  const regularWork = trabajos
                    .filter(pt => pt.talla !== 'AJUSTE')
                    .reduce((sum, pt) => sum + parseFloat(pt.total || 0), 0);
                    
                  const cuadreDif = trabajos
                    .filter(pt => pt.talla === 'AJUSTE' && (pt.color?.includes('Cuadre') || pt.color?.includes('Diferencia')))
                    .reduce((sum, pt) => sum + parseFloat(pt.total || 0), 0);
                    
                  const pagoFijoVal = trabajos
                    .filter(pt => pt.talla === 'AJUSTE' && !(pt.color?.includes('Cuadre') || pt.color?.includes('Diferencia')))
                    .reduce((sum, pt) => sum + parseFloat(pt.total || 0), 0);
                    
                  const asistenciasVal = asistenciasList.reduce((sum, pa) => sum + parseFloat(pa.monto || 0), 0);
 
                  const cuadreItems = trabajos.filter(pt => pt.talla === 'AJUSTE' && (pt.color?.includes('Cuadre') || pt.color?.includes('Diferencia')));
                  const pagoFijoItems = trabajos.filter(pt => pt.talla === 'AJUSTE' && !(pt.color?.includes('Cuadre') || pt.color?.includes('Diferencia')));
 
                  return (
                    <div style={{ background: 'rgba(0,0,0,0.02)', padding: '1rem', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.95rem' }}>
                      <p style={{ margin: 0 }}><strong>{isEn ? 'Total Earned' : 'Total Ganado'}:</strong> {formatCurrency(planchadorPagoDetalle.ganado)}</p>
                      
                      {regularWork > 0 && (
                        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted, #94a3b8)', paddingLeft: '1rem' }}>
                          • {isEn ? 'Regular Ironing' : 'Plancha Regular'}: <span style={{ color: 'var(--bg-input)' }}>{formatCurrency(regularWork)}</span>
                        </p>
                      )}
                      
                      {cuadreDif !== 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingLeft: '1rem' }}>
                          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted, #94a3b8)' }}>
                            • {isEn ? 'Adjustment Difference' : 'Diferencia Cuadre'}: <span style={{ color: cuadreDif > 0 ? '#34d399' : '#ef4444', fontWeight: 'bold' }}>
                              {cuadreDif > 0 ? '+' : ''}{formatCurrency(cuadreDif)}
                            </span>
                          </p>
                          {cuadreItems.map(item => (
                            <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)', paddingLeft: '0.5rem', background: 'rgba(255,255,255,0.02)', padding: '4px 8px', borderRadius: '6px' }}>
                              <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '180px' }} title={item.color}>
                                - {item.color || 'Ajuste'}
                              </span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ fontWeight: 600, color: item.total > 0 ? '#34d399' : '#ef4444' }}>
                                  {item.total > 0 ? '+' : ''}{formatCurrency(item.total)}
                                </span>
                                <MinusCircle 
                                  size={14} 
                                  color="#ef4444" 
                                  style={{ cursor: 'pointer' }} 
                                  title={isEn ? 'Remove adjustment' : 'Eliminar ajuste'}
                                  onClick={() => handleEliminarAjuste(item.id)}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {pagoFijoVal !== 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingLeft: '1rem' }}>
                          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted, #94a3b8)' }}>
                            • {isEn ? 'Fixed Pay / Support' : 'Pago Fijo / Apoyos'}: <span style={{ color: '#60a5fa', fontWeight: 'bold' }}>
                              {pagoFijoVal > 0 ? '+' : ''}{formatCurrency(pagoFijoVal)}
                            </span>
                          </p>
                          {pagoFijoItems.map(item => (
                            <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)', paddingLeft: '0.5rem', background: 'rgba(255,255,255,0.02)', padding: '4px 8px', borderRadius: '6px' }}>
                              <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '180px' }} title={item.color}>
                                - {item.color || 'Apoyo'}
                              </span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ fontWeight: 600, color: '#60a5fa' }}>
                                  {item.total > 0 ? '+' : ''}{formatCurrency(item.total)}
                                </span>
                                <MinusCircle 
                                  size={14} 
                                  color="#ef4444" 
                                  style={{ cursor: 'pointer' }} 
                                  title={isEn ? 'Remove fixed pay' : 'Eliminar pago fijo'}
                                  onClick={() => handleEliminarAjuste(item.id)}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {asistenciasVal > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingLeft: '1rem' }}>
                          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted, #94a3b8)' }}>
                            • {isEn ? 'Attendances' : 'Asistencias'}: <span style={{ color: '#10b981' }}>
                              +{formatCurrency(asistenciasVal)}
                            </span>
                          </p>
                          {asistenciasList.map(item => (
                            <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)', paddingLeft: '0.5rem', background: 'rgba(255,255,255,0.02)', padding: '4px 8px', borderRadius: '6px' }}>
                              <span>
                                - {isEn ? 'Attendance' : 'Asistencia'} {formatDate(item.fecha)}
                              </span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ fontWeight: 600, color: '#10b981' }}>
                                  +{formatCurrency(item.monto)}
                                </span>
                                <MinusCircle 
                                  size={14} 
                                  color="#ef4444" 
                                  style={{ cursor: 'pointer' }} 
                                  title={isEn ? 'Remove attendance' : 'Eliminar asistencia'}
                                  onClick={() => handleEliminarAsistencia(item.id)}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
 
                      <p style={{ margin: 0, color: '#34d399' }}><strong>{isEn ? 'Total Paid' : 'Total Pagado'}:</strong> {formatCurrency(planchadorPagoDetalle.pagado)}</p>
                      <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.05)', margin: '0.4rem 0' }} />
                      <p style={{ margin: 0, fontSize: '1.1rem', color: planchadorPagoDetalle.pendiente > 0 ? '#ef4444' : '#34d399' }}>
                        <strong>{isEn ? 'Pending Balance' : 'Saldo Pendiente'}: {formatCurrency(planchadorPagoDetalle.pendiente)}</strong>
                      </p>
                    </div>
                  );
                })()}
 
                <div className="form-group">
                  <label className="form-label">{isEn ? 'Payment Type' : 'Tipo de Pago'}</label>
                  <select className="form-input" value="completo" disabled style={{ background: 'rgba(255,255,255,0.05)', cursor: 'not-allowed' }}>
                    <option value="completo">{isEn ? 'Full Payment (Settlement)' : 'Pago Completo (Liquidación)'}</option>
                  </select>
                </div>
 
                <div className="form-group">
                  <label className="form-label">{isEn ? 'Payment Amount' : 'Monto del Pago'}</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    required 
                    className="form-input"
                    placeholder={planchadorPagoDetalle ? (isEn ? `Suggested: ${formatCurrency(planchadorPagoDetalle.pendiente)}` : `Sugerido: ${formatCurrency(planchadorPagoDetalle.pendiente)}`) : (isEn ? 'e.g. 500' : 'Ej: 500')} 
                    value={montoPago} 
                    onChange={e => setMontoPago(e.target.value)} 
                    disabled={!pagoPlanchadorId}
                  />
                </div>
 
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  style={{ width: '100%' }}
                  disabled={pagoSubmitting || !pagoPlanchadorId || parseFloat(montoPago || 0) <= 0}
                >
                  {pagoSubmitting ? (isEn ? 'Registering...' : 'Registrando...') : (isEn ? 'Register Payment' : 'Registrar Pago')}
                </button>
 
                {(() => {
                  const selectedPlanchadorObj = planchadores.find(p => String(p.id) === String(pagoPlanchadorId));
                  const isOlga = selectedPlanchadorObj?.nombre?.toLowerCase().includes('olga');
                  const isLuis = selectedPlanchadorObj?.nombre?.toLowerCase().includes('luis');
                  const restrictAjusteCuadre = isOlga || isLuis;
 
                  return (
                    <div style={{ display: 'flex', gap: '0.8rem', marginTop: '0.5rem' }}>
                      <button 
                        type="button" 
                        className="btn btn-secondary" 
                        style={{ 
                          flex: 1, 
                          borderColor: restrictAjusteCuadre ? 'rgba(255,255,255,0.05)' : 'rgba(14, 165, 233, 0.4)', 
                          color: restrictAjusteCuadre ? '#64748b' : '#0ea5e9', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          gap: '4px', 
                          padding: '10px',
                          cursor: restrictAjusteCuadre ? 'not-allowed' : 'pointer',
                          opacity: restrictAjusteCuadre ? 0.5 : 1
                        }}
                        onClick={() => {
                          if (restrictAjusteCuadre) return;
                          setAjustePlanchadorId(pagoPlanchadorId);
                          setShowAjusteModal(true);
                        }}
                        disabled={restrictAjusteCuadre}
                      >
                        <Plus size={16} /> {isEn ? 'Fixed Pay' : 'Pago Fijo'}
                      </button>
                      <button 
                        type="button" 
                        className="btn btn-secondary" 
                        style={{ 
                          flex: 1, 
                          borderColor: restrictAjusteCuadre ? 'rgba(255,255,255,0.05)' : 'rgba(16, 185, 129, 0.4)', 
                          color: restrictAjusteCuadre ? '#64748b' : '#10b981', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          gap: '4px', 
                          padding: '10px',
                          cursor: restrictAjusteCuadre ? 'not-allowed' : 'pointer',
                          opacity: restrictAjusteCuadre ? 0.5 : 1
                        }}
                        onClick={() => {
                          if (restrictAjusteCuadre) return;
                          setCuadrePlanchadorId(pagoPlanchadorId);
                          setShowCuadreModal(true);
                        }}
                        disabled={restrictAjusteCuadre}
                      >
                        <Calculator size={16} /> {isEn ? 'Weekly Adj.' : 'Cuadre Semanal'}
                      </button>
                    </div>
                  );
                })()}
              </form>
            </div>

            {/* Descarga de Reportes de Nómina PDF */}
            <div className="glass-card" style={{ padding: '1.5rem' }}>
              <h3 style={{ margin: '0 0 1.2rem 0', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <History size={18} color="#0ea5e9" /> {isEn ? 'Payroll PDF Report' : 'Reporte de Nómina PDF'}
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '-0.5rem 0 1.2rem 0' }}>{isEn ? 'Download a consolidated PDF report of ironers earnings and payroll' : 'Descarga un reporte consolidado en PDF de las ganancias y nómina de los planchadores'}</p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">{isEn ? 'Start Date' : 'Fecha de Inicio'}</label>
                  <input 
                    type="date" 
                    className="form-input" 
                    value={reportStart} 
                    onChange={e => setReportStart(e.target.value)} 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">{isEn ? 'End Date' : 'Fecha Fin'}</label>
                  <input 
                    type="date" 
                    className="form-input" 
                    value={reportEnd} 
                    onChange={e => setReportEnd(e.target.value)} 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">{isEn ? 'Ironer (Optional)' : 'Planchador (Opcional)'}</label>
                  <select 
                    className="form-input" 
                    value={reportPlanchadorId} 
                    onChange={e => setReportPlanchadorId(e.target.value)}
                  >
                    <option value="">{isEn ? '-- All Ironers --' : '-- Todos los Planchadores --'}</option>
                    {planchadores.map(p => (
                      <option key={p.id} value={p.id}>{p.nombre}</option>
                    ))}
                  </select>
                </div>
                <button 
                  type="button" 
                  className="btn btn-primary" 
                  style={{ width: '100%', marginTop: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                  onClick={handleDownloadReporte}
                >
                  <Download size={16} /> {isEn ? 'Download Report (PDF)' : 'Descargar Reporte (PDF)'}
                </button>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  style={{ width: '100%', marginTop: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', borderColor: 'rgba(14, 165, 233, 0.4)', color: '#0ea5e9' }}
                  onClick={handleDownloadResumen}
                >
                  <FileText size={16} /> {isEn ? 'Download General Summary (PDF)' : 'Descargar Resumen General (PDF)'}
                </button>
              </div>
            </div>
          </div>

          {/* Historial de Pagos y Trabajos pendientes */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            
            {/* Trabajos por liquidar */}
            <div className="glass-card">
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.2rem' }}>{isEn ? 'Completed jobs pending payment' : 'Trabajos terminados pendientes de pago'}</h3>
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>{isEn ? 'Model' : 'Modelo'}</th>
                      <th>{isEn ? 'Work Date' : 'Fecha Trabajo'}</th>
                      <th>{isEn ? 'Size' : 'Talla'}</th>
                      <th>{isEn ? 'Pcs' : 'Pzas'}</th>
                      <th>{isEn ? 'Net' : 'Neto'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!planchadorPagoDetalle || planchadorPagoDetalle.trabajosPendientes.length === 0 ? (
                      <tr>
                        <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted, #94a3b8)' }}>
                          {!pagoPlanchadorId ? (isEn ? 'Select an ironer to view pending jobs.' : 'Selecciona un planchador para ver sus pendientes.') : (isEn ? 'No jobs pending payment.' : 'No hay trabajos pendientes de pago.')}
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
                                  style={{ width: '28px', height: '28px', borderRadius: '4px', objectFit: 'contain', background: 'var(--bg-card)' }} 
                                />
                              ) : null}
                              <strong>{t.modelo_nombre || t.color}</strong>
                            </div>
                          </td>
                          <td>{formatDate(t.fecha_creacion)}</td>
                          <td>
                            {t.talla === 'AJUSTE' ? (
                              <span className="badge badge-warning" style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.3)' }}>{isEn ? 'FIXED PAY' : 'PAGO FIJO'}</span>
                            ) : (
                              <span className="badge badge-info">{isEn ? 'S' : 'T'}{t.talla}</span>
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
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.2rem' }}>{isEn ? 'Issued payment receipts' : 'Recibos de pagos entregados'}</h3>
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>{isEn ? 'Receipt ID' : 'ID Recibo'}</th>
                      <th>{isEn ? 'Payment Date' : 'Fecha de Pago'}</th>
                      <th>{isEn ? 'Type' : 'Tipo'}</th>
                      <th>{isEn ? 'Amount' : 'Monto'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!planchadorPagoDetalle || planchadorPagoDetalle.pagos.length === 0 ? (
                      <tr>
                        <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-muted, #94a3b8)' }}>
                          {!pagoPlanchadorId ? (isEn ? 'Select an ironer to view receipts.' : 'Selecciona un planchador para ver sus recibos.') : (isEn ? 'No payments registered today.' : 'No se han registrado pagos aún.')}
                        </td>
                      </tr>
                    ) : (
                      planchadorPagoDetalle.pagos.map((p, index) => (
                        <tr key={p.id}>
                          <td>#{planchadorPagoDetalle.pagos.length - index}</td>
                          <td>{formatDate(p.fecha)}</td>
                          <td><span className="badge badge-info" style={{ textTransform: 'uppercase' }}>{p.tipo_pago === 'completo' ? (isEn ? 'full' : 'completo') : p.tipo_pago}</span></td>
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
              <History color="#0ea5e9" size={24} /> {isEn ? 'General Ironing History' : 'Historial General de Planchado'}
            </h2>
            <button className="btn btn-secondary" onClick={fetchHistorialGeneral}>{isEn ? 'Refresh History' : 'Refrescar Historial'}</button>
          </div>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{isEn ? 'Date & Time' : 'Fecha y Hora'}</th>
                  <th>{isEn ? 'Photo' : 'Foto'}</th>
                  <th>{isEn ? 'Model' : 'Modelo'}</th>
                  <th>{isEn ? 'Color' : 'Color'}</th>
                  <th>{isEn ? 'Size' : 'Talla'}</th>
                  <th>{isEn ? 'Ironer' : 'Planchador'}</th>
                  <th>{isEn ? 'Board' : 'Burro'}</th>
                  <th>{isEn ? 'Ironed Pcs' : 'Pzas Planchadas'}</th>
                  <th>{isEn ? 'Net' : 'Neto'}</th>
                  <th>{isEn ? 'Fixed Pay' : 'Pago Fijo'}</th>
                  <th>{isEn ? 'Total' : 'Total'}</th>
                </tr>
              </thead>
              <tbody>
                {historialGeneral.length === 0 ? (
                  <tr>
                    <td colSpan="11" style={{ textAlign: 'center', color: 'var(--text-muted, #94a3b8)', padding: '3rem' }}>
                      {isEn ? 'No ironing records in general history.' : 'No hay registros de planchado en el historial general.'}
                    </td>
                  </tr>
                ) : (
                  historialGeneral.map(h => (
                    <tr key={h.id}>
                      <td>{new Date(h.fecha_terminado || h.fecha_creacion).toLocaleString(isEn ? 'en-US' : 'es-MX')}</td>
                      <td>
                        {h.modelo_imagen ? (
                          <img 
                            src={`${API_URL}${h.modelo_imagen}`} 
                            alt={h.modelo_nombre} 
                            style={{ width: '40px', height: '40px', borderRadius: '6px', objectFit: 'contain', background: 'var(--bg-card)' }} 
                          />
                        ) : (
                          <div style={{ width: '40px', height: '40px', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Layers size={18} color="#64748b" />
                          </div>
                        )}
                      </td>
                      <td>
                        <strong>{h.modelo_nombre}</strong>
                        <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{isEn ? 'Order' : 'Orden'}: {h.no_orden || 'N/A'}</p>
                      </td>
                      <td>{h.color || 'N/A'}</td>
                      <td><span className="badge badge-info">{isEn ? 'S' : 'T'}{h.talla}</span></td>
                      <td><span style={{ fontWeight: 'bold', color: '#38bdf8' }}>{h.planchador_nombre}</span></td>
                      <td><span style={{ background: 'rgba(255,255,255,0.03)', padding: '2px 8px', borderRadius: '4px' }}>{isEn ? 'Board' : 'Burro'} #{h.burro_numero}</span></td>
                      <td><strong>{h.piezas} {isEn ? 'pcs' : 'pzas'}</strong></td>
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
                <h2 style={{ margin: 0, fontSize: '1.6rem' }}>{isEn ? 'Ironing History' : 'Historial de Planchado'}</h2>
                <p style={{ margin: '0.2rem 0 0 0', color: '#60a5fa', fontWeight: 'bold' }}>👤 {planchadorDetalle.nombre}</p>
              </div>
              <button 
                onClick={() => {
                  setMostrarDetalleModal(false);
                  setPlanchadorDetalle(null);
                }} 
                className="btn-icon" 
                style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--bg-card)', border: 'none', padding: '8px', borderRadius: '50%', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{isEn ? 'Photo' : 'Foto'}</th>
                    <th>{isEn ? 'Model' : 'Modelo'}</th>
                    <th>{isEn ? 'Color' : 'Color'}</th>
                    <th>{isEn ? 'Size' : 'Talla'}</th>
                    <th>{isEn ? 'Ironed-Pcs' : 'Pzas-Planchadas'}</th>
                    <th>{isEn ? 'Net' : 'Neto'}</th>
                    <th>{isEn ? 'Fixed Pay' : 'Pago Fijo'}</th>
                    <th>{isEn ? 'Total' : 'Total'}</th>
                  </tr>
                </thead>
                <tbody>
                  {planchadorDetalle.historial.length === 0 ? (
                    <tr><td colSpan="8" style={{ textAlign: 'center', color: 'var(--text-muted, #94a3b8)' }}>{isEn ? 'This ironer has no registered completed jobs.' : 'Este planchador no tiene trabajos terminados registrados.'}</td></tr>
                  ) : (
                    planchadorDetalle.historial.map(h => (
                      <tr key={h.id}>
                        <td>
                          {h.modelo_imagen ? (
                            <img 
                              src={`${API_URL}${h.modelo_imagen}`} 
                              alt={h.modelo_nombre} 
                              style={{ width: '40px', height: '40px', borderRadius: '6px', objectFit: 'contain', background: 'var(--bg-card)' }} 
                            />
                          ) : (
                            <div style={{ width: '40px', height: '40px', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Layers size={18} color="#64748b" />
                            </div>
                          )}
                        </td>
                        <td>
                          <strong>{h.modelo_nombre}</strong>
                          <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{isEn ? 'Order' : 'Orden'}: {h.no_orden || 'N/A'}</p>
                        </td>
                        <td>{h.color || 'N/A'}</td>
                        <td><span className="badge badge-info">{isEn ? 'S' : 'T'}{h.talla}</span></td>
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
          <div className="glass-card" style={{ width: '95%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck color="#10b981" /> {modeloAVerificar.verificado ? (isEn ? 'Edit Ironing Price' : 'Editar Precio de Planchado') : (isEn ? 'Confirm Arrival' : 'Confirmar Llegada')}
              </h2>
              <button 
                onClick={() => {
                  setMostrarVerificarModal(false);
                  setModeloAVerificar(null);
                }} 
                className="btn-icon" 
                style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--bg-card)', border: 'none', padding: '8px', borderRadius: '50%', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem', background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '12px' }}>
              {modeloAVerificar.imagen ? (
                <img 
                  src={`${API_URL}${modeloAVerificar.imagen}`} 
                  alt={modeloAVerificar.modelo} 
                  style={{ width: '50px', height: '50px', borderRadius: '6px', objectFit: 'contain', background: 'var(--bg-card)' }} 
                />
              ) : null}
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem' }}>{isEn ? 'Model' : 'Modelo'} {modeloAVerificar.modelo}</h3>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{isEn ? 'Order No' : 'No. Orden'}: {modeloAVerificar.no_orden}</p>
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted, #94a3b8)', margin: '0 0 0.8rem 0' }}>{isEn ? 'Confirm that the following quantities of pieces per size arrived completely in Colima:' : 'Confirma que las siguientes cantidades de piezas por talla llegaron completas a Colima:'}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '40vh', overflowY: 'auto', paddingRight: '4px' }}>
                {Object.entries(modeloAVerificar.tallas_cantidades)
                  .sort(([keyA], [keyB]) => {
                    const numA = parseInt(keyA, 10);
                    const numB = parseInt(keyB, 10);
                    if (isNaN(numA) && isNaN(numB)) return keyA.localeCompare(keyB);
                    if (isNaN(numA)) return 1;
                    if (isNaN(numB)) return -1;
                    return numA - numB;
                  })
                  .map(([key, val]) => {
                    if (typeof val === 'object' && val !== null) {
                      const entries = Object.entries(val)
                        .filter(([_, qty]) => qty > 0)
                        .sort(([szA], [szB]) => {
                          const numA = parseInt(szA, 10);
                          const numB = parseInt(szB, 10);
                          if (isNaN(numA) && isNaN(numB)) return szA.localeCompare(szB);
                          if (isNaN(numA)) return 1;
                          if (isNaN(numB)) return -1;
                          return numA - numB;
                        });
                      if (entries.length === 0) return null;
                    return (
                      <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', background: 'rgba(255,255,255,0.01)', padding: '8px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
                        <span style={{ fontSize: '0.85rem', color: '#c084fc', fontWeight: 700 }}>{isEn ? 'Color' : 'Color'}: {key}</span>
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
                              {isEn ? 'Size' : 'Talla'} {sz}: <br /><strong>{qty} {isEn ? 'pcs' : 'pzas'}</strong>
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
                        {isEn ? 'Size' : 'Talla'} {key}: <br /><strong>{val} {isEn ? 'pcs' : 'pzas'}</strong>
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
                  {isEn ? 'Ironing Price per Piece ($)' : 'Precio de Planchado por Pieza'} <AlertCircle size={14} color="#f59e0b" title={isEn ? 'How much will the ironer earn for ironing each piece of this model?' : '¿Cuánto ganará la planchadora por planchar cada pieza de este modelo?'} />
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted, #94a3b8)' }}>$</span>
                  <input 
                    type="number" 
                    step="0.01" 
                    min="0"
                    required
                    className="form-input" 
                    style={{ paddingLeft: '24px' }}
                    placeholder={isEn ? 'e.g., 2.50' : 'Ej: 2.50'} 
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
                  {isEn ? 'Cancel' : 'Cancelar'}
                </button>
                 <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  {modeloAVerificar.verificado ? (isEn ? 'Save Changes' : 'Guardar Cambios') : (isEn ? 'Confirm Arrival' : 'Confirmar Llegada')}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* MODAL DE DEVOLUCIÓN A MAQUILA */}
      {mostrarDevolucionModal && modeloADevolver && (
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
          <div className="glass-card" style={{ width: '95%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ArrowLeftRight color="#ef4444" /> {isEn ? 'Register Return' : 'Registrar Devolución'}
              </h2>
              <button 
                onClick={() => {
                  setMostrarDevolucionModal(false);
                  setModeloADevolver(null);
                  setDevolucionCantidades({});
                }} 
                className="btn-icon" 
                style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--bg-card)', border: 'none', padding: '8px', borderRadius: '50%', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem', background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '12px' }}>
              {modeloADevolver.imagen ? (
                <img 
                  src={`${API_URL}${modeloADevolver.imagen}`} 
                  alt={modeloADevolver.modelo} 
                  style={{ width: '50px', height: '50px', borderRadius: '6px', objectFit: 'contain', background: 'var(--bg-card)' }} 
                />
              ) : null}
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem' }}>{isEn ? 'Model' : 'Modelo'} {modeloADevolver.modelo}</h3>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{isEn ? 'Order No' : 'No. Orden'}: {modeloADevolver.no_orden}</p>
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted, #94a3b8)', margin: '0 0 1rem 0', lineHeight: '1.4' }}>
                {isEn ? 'Select the pieces to return. Click or hold and drag to select/deselect complete sizes. Double click a box to enter a specific number of pieces.' : 'Selecciona las piezas que se van a devolver. Haz clic o mantén presionado y arrastra para seleccionar/deseleccionar tallas completas. Haz doble clic en una casilla para ingresar una cantidad específica de piezas.'}
              </p>
              
              <div 
                style={{ display: 'flex', flexDirection: 'column', gap: '1rem', userSelect: 'none' }}
                onMouseLeave={() => setIsMouseDownDev(false)}
              >
                {(() => {
                  const isNested = Object.values(modeloADevolver.tallas_cantidades).some(v => typeof v === 'object' && v !== null);
                  
                  if (isNested) {
                    return Object.entries(modeloADevolver.tallas_cantidades).map(([color, tallasObj]) => {
                      const entries = Object.entries(tallasObj).filter(([_, qty]) => qty > 0);
                      if (entries.length === 0) return null;
                      return (
                        <div key={color} style={{ background: 'rgba(255,255,255,0.01)', padding: '10px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.04)' }}>
                          <h4 style={{ margin: '0 0 8px 0', fontSize: '0.9rem', color: '#c084fc' }}>{isEn ? 'Color' : 'Color'}: {color}</h4>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                            {entries.map(([talla, maxQty]) => {
                              const currentQty = devolucionCantidades[color]?.[talla] || 0;
                              const isSelected = currentQty > 0;
                              const isEditing = editingBlockDev?.color === color && editingBlockDev?.talla === talla;
                              
                              return (
                                <div
                                  key={talla}
                                  onMouseDown={() => handleBlockMouseDown(color, talla, maxQty)}
                                  onMouseEnter={() => handleBlockMouseEnter(color, talla, maxQty)}
                                  onDoubleClick={(e) => {
                                    e.stopPropagation();
                                    setEditingBlockDev({ color, talla });
                                  }}
                                  style={{
                                    background: isSelected ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255,255,255,0.03)',
                                    border: isSelected ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(255,255,255,0.05)',
                                    padding: '8px',
                                    borderRadius: '8px',
                                    textAlign: 'center',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease'
                                  }}
                                >
                                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)' }}>{isEn ? 'Size' : 'Talla'} {talla}</div>
                                  {isEditing ? (
                                    <input 
                                      type="number"
                                      min="0"
                                      max={maxQty}
                                      className="form-input"
                                      style={{ width: '100%', padding: '2px', textAlign: 'center', fontSize: '0.85rem', marginTop: '4px' }}
                                      defaultValue={currentQty}
                                      autoFocus
                                      onMouseDown={(e) => e.stopPropagation()}
                                      onBlur={(e) => {
                                        let val = parseInt(e.target.value) || 0;
                                        if (val < 0) val = 0;
                                        if (val > maxQty) val = maxQty;
                                        updateDevQty(color, talla, val);
                                        setEditingBlockDev(null);
                                      }}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          let val = parseInt(e.target.value) || 0;
                                          if (val < 0) val = 0;
                                          if (val > maxQty) val = maxQty;
                                          updateDevQty(color, talla, val);
                                          setEditingBlockDev(null);
                                        } else if (e.key === 'Escape') {
                                          setEditingBlockDev(null);
                                        }
                                      }}
                                    />
                                  ) : (
                                    <div style={{ fontWeight: 'bold', fontSize: '0.85rem', color: isSelected ? '#f87171' : 'var(--bg-card)', marginTop: '2px' }}>
                                      {currentQty} / {maxQty}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    });
                  } else {
                    return (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                        {Object.entries(modeloADevolver.tallas_cantidades).filter(([_, qty]) => qty > 0).map(([talla, maxQty]) => {
                          const currentQty = devolucionCantidades[talla] || 0;
                          const isSelected = currentQty > 0;
                          const isEditing = editingBlockDev?.color === null && editingBlockDev?.talla === talla;
                          
                          return (
                            <div
                              key={talla}
                              onMouseDown={() => handleBlockMouseDown(null, talla, maxQty)}
                              onMouseEnter={() => handleBlockMouseEnter(null, talla, maxQty)}
                              onDoubleClick={(e) => {
                                e.stopPropagation();
                                setEditingBlockDev({ color: null, talla });
                              }}
                              style={{
                                background: isSelected ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255,255,255,0.03)',
                                border: isSelected ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(255,255,255,0.05)',
                                padding: '8px',
                                borderRadius: '8px',
                                textAlign: 'center',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)' }}>{isEn ? 'Size' : 'Talla'} {talla}</div>
                              {isEditing ? (
                                <input 
                                  type="number"
                                  min="0"
                                  max={maxQty}
                                  className="form-input"
                                  style={{ width: '100%', padding: '2px', textAlign: 'center', fontSize: '0.85rem', marginTop: '4px' }}
                                  defaultValue={currentQty}
                                  autoFocus
                                  onMouseDown={(e) => e.stopPropagation()}
                                  onBlur={(e) => {
                                    let val = parseInt(e.target.value) || 0;
                                    if (val < 0) val = 0;
                                    if (val > maxQty) val = maxQty;
                                    updateDevQty(null, talla, val);
                                    setEditingBlockDev(null);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      let val = parseInt(e.target.value) || 0;
                                      if (val < 0) val = 0;
                                      if (val > maxQty) val = maxQty;
                                      updateDevQty(null, talla, val);
                                      setEditingBlockDev(null);
                                    } else if (e.key === 'Escape') {
                                      setEditingBlockDev(null);
                                    }
                                  }}
                                />
                              ) : (
                                <div style={{ fontWeight: 'bold', fontSize: '0.85rem', color: isSelected ? '#f87171' : 'var(--bg-card)', marginTop: '2px' }}>
                                  {currentQty} / {maxQty}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  }
                })()}
              </div>
            </div>

            <form onSubmit={handleConfirmarDevolucion} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  style={{ flex: 1 }}
                  onClick={() => {
                    setMostrarDevolucionModal(false);
                    setModeloADevolver(null);
                    setDevolucionCantidades({});
                  }}
                >
                  {isEn ? 'Cancel' : 'Cancelar'}
                </button>
                <button type="submit" className="btn" style={{ flex: 1, background: '#ef4444', color: 'var(--bg-card)' }}>
                  {isEn ? 'Confirm Return' : 'Confirmar Devolución'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* MODAL 3: REGISTRAR PAGO FIJO */}
      {/* MODAL 3: PAGO FIJO */}
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
                <Wallet color="#0ea5e9" /> {isEn ? 'Register Fixed Pay' : 'Registrar Pago Fijo'}
              </h2>
              <button 
                onClick={() => {
                  setShowAjusteModal(false);
                  setAjustePlanchadorId('');
                }} 
                className="btn-icon" 
                style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--bg-card)', border: 'none', padding: '8px', borderRadius: '50%', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>
 
            <form onSubmit={handleRegistrarAjuste} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              
              <div className="form-group">
                <label className="form-label">{isEn ? 'Ironer' : 'Planchador'}</label>
                <select 
                  className="form-input" 
                  value={ajustePlanchadorId} 
                  onChange={e => setAjustePlanchadorId(e.target.value)}
                  required
                >
                  <option value="">{isEn ? '-- Choose an Ironer --' : '-- Elige un Planchador --'}</option>
                  {planchadores.filter(p => !p.nombre.toLowerCase().includes('olga') && !p.nombre.toLowerCase().includes('luis')).map(p => (
                    <option key={p.id} value={p.id}>{p.nombre}</option>
                  ))}
                </select>
              </div>
 
              <div className="form-group">
                <label className="form-label">{isEn ? 'Reason for Fixed Pay' : 'Razón del Pago Fijo'}</label>
                <select 
                  className="form-input" 
                  value={ajusteRazon} 
                  onChange={e => {
                    setAjusteRazon(e.target.value);
                    setAjusteParamDias('1');
                  }}
                >
                  <option value="Dia adelantado">{isEn ? 'Day advanced' : 'Día adelantado'}</option>
                  <option value="Vacaciones">{isEn ? 'Vacation' : 'Vacaciones'}</option>
                  <option value="Festivo">{isEn ? 'Holiday' : 'Festivo'}</option>
                  <option value="Apoyo en calidad">{isEn ? 'Quality support (Cutting, Packing, Cleaning, etc)' : 'Apoyo en calidad (Corte, Empaque, Limpieza, etc)'}</option>
                </select>
              </div>
 
              {/* Selector de Área de Apoyo solo para Apoyo en calidad */}
              {ajusteRazon === 'Apoyo en calidad' && (
                <div className="form-group">
                  <label className="form-label">{isEn ? 'Support Area' : 'Área de Apoyo'}</label>
                  <select 
                    className="form-input" 
                    value={ajusteApoyoDetalle} 
                    onChange={e => setAjusteApoyoDetalle(e.target.value)}
                  >
                    <option value="Corte">{isEn ? 'Cutting' : 'Corte'}</option>
                    <option value="Empaque">{isEn ? 'Packing' : 'Empaque'}</option>
                    <option value="Limpieza">{isEn ? 'Cleaning' : 'Limpieza'}</option>
                    <option value="Avios">{isEn ? 'Supplies' : 'Avios'}</option>
                    <option value="Terminados">{isEn ? 'Finishing' : 'Terminados'}</option>
                    <option value="Almacen de ventas">{isEn ? 'Sales Warehouse' : 'Almacen de ventas'}</option>
                  </select>
                </div>
              )}
 
              {/* Campos comunes para todos los tipos de ajuste */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">
                    {ajusteRazon === 'Festivo' ? (isEn ? 'Holidays' : 'Días Festivos') : (isEn ? 'Days' : 'Días')}
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
                  <label className="form-label">{isEn ? 'Daily Rate ($)' : 'Tarifa por Día ($)'}</label>
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
                  formulaText = isEn ? `${dias} days × $${tarifa}/day` : `${dias} días × $${tarifa}/día`;
                } else if (ajusteRazon === 'Festivo') {
                  formulaText = isEn ? `${dias} holidays × $${tarifa}/day` : `${dias} días festivos × $${tarifa}/día`;
                } else if (ajusteRazon === 'Apoyo en calidad') {
                  formulaText = isEn ? `${dias} days × $${tarifa}/day in Quality Support` : `${dias} días × $${tarifa}/día en Apoyo calidad`;
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
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted, #94a3b8)' }}>{isEn ? 'Formula' : 'Fórmula'}: {formulaText}</span>
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
                  {isEn ? 'Cancel' : 'Cancelar'}
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  {isEn ? 'Register Fixed Pay' : 'Registrar Pago Fijo'}
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
                <Calculator color="#10b981" /> {isEn ? 'Weekly Ironing Adjustment' : 'Cuadre Semanal de Plancha'}
              </h2>
              <button 
                onClick={() => {
                  setShowCuadreModal(false);
                  setCuadrePlanchadorId('');
                  setCuadrePlanchaReal(0);
                }} 
                className="btn-icon" 
                style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--bg-card)', border: 'none', padding: '8px', borderRadius: '50%', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>
 
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              
              <div className="form-group">
                <label className="form-label">{isEn ? 'Ironer' : 'Planchador'}</label>
                <select 
                  className="form-input" 
                  value={cuadrePlanchadorId} 
                  onChange={e => setCuadrePlanchadorId(e.target.value)}
                  required
                >
                  <option value="">{isEn ? '-- Choose an Ironer --' : '-- Elige un Planchador --'}</option>
                  {planchadores.filter(p => !p.nombre.toLowerCase().includes('olga') && !p.nombre.toLowerCase().includes('luis')).map(p => (
                    <option key={p.id} value={p.id}>{p.nombre}</option>
                  ))}
                </select>
              </div>
 
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">{isEn ? 'Day advanced' : 'Día adelantado'}</label>
                  <input 
                    type="date" 
                    required
                    className="form-input" 
                    value={cuadreStart} 
                    onChange={e => setCuadreStart(e.target.value)} 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">{isEn ? 'Apply difference on date' : 'Aplicar diferencia el día'}</label>
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
                {isEn ? 'Reload Real Ironing' : 'Recargar Plancha Real'}
              </button>
 
              <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.08)', margin: '0.5rem 0' }} />
 
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">{isEn ? 'Day advanced ($)' : 'Día adelantado ($)'}</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value="400" 
                    disabled 
                    style={{ background: 'rgba(255,255,255,0.05)', cursor: 'not-allowed', fontWeight: 'bold' }} 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">{isEn ? 'Real ironing ($)' : 'Plancha real ($)'}</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={formatCurrency(cuadrePlanchaReal)} 
                    disabled 
                    style={{ background: 'rgba(255,255,255,0.05)', cursor: 'not-allowed', fontWeight: 'bold', color: '#10b981' }} 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">{isEn ? 'Difference ($)' : 'Diferencia ($)'}</label>
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
                          color: diferencia > 0 ? '#10b981' : diferencia < 0 ? '#ef4444' : 'var(--bg-card)' 
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
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted, #94a3b8)', marginBottom: '0.2rem' }}>{isEn ? 'Difference Result:' : 'Resultado de Diferencia:'}</div>
                    <div style={{ fontSize: '1.6rem', fontWeight: 'bold', color: diferencia > 0 ? '#10b981' : diferencia < 0 ? '#ef4444' : 'var(--bg-card)' }}>
                      {diferencia > 0 ? (isEn ? `Bonus: +${formatCurrency(diferencia)}` : `Bono: +${formatCurrency(diferencia)}`) : diferencia < 0 ? (isEn ? `Discount: ${formatCurrency(diferencia)}` : `Descuento: ${formatCurrency(diferencia)}`) : (isEn ? 'No Difference' : 'Sin Diferencia')}
                    </div>
                    <div style={{ marginTop: '0.4rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      {diferencia > 0 ? (isEn ? 'The difference will be added as a bonus in history.' : 'Se sumará la diferencia como un bono en el historial.') : diferencia < 0 ? (isEn ? 'The difference will be subtracted as a discount in history.' : 'Se restará la diferencia como un descuento en el historial.') : (isEn ? 'No financial adjustment will be registered.' : 'No se registrará ningún ajuste financiero.')}
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
                  {isEn ? 'Cancel' : 'Cancelar'}
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary" 
                  style={{ flex: 1 }}
                  disabled={!cuadrePlanchadorId}
                  onClick={handleAplicarCuadre}
                >
                  {isEn ? 'Apply Adjustment' : 'Aplicar Cuadre'}
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
