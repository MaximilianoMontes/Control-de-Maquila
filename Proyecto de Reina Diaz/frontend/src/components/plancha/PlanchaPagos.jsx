
import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Wallet,
  Plus,
  Calculator,
  History,
  Download,
  FileText,
  Search,
  X,
  MinusCircle,
  Clock,
  Layers
} from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';
import API_URL from '../../config';
import { toast, Swal } from '../../utils/themeNotifications';
import ImageZoom from '../ImageZoom';
import SearchableSelect from '../SearchableSelect';

export default function PlanchaPagos({ planchadores, fetchModelosDisponibles }) {
  const { settings, formatCurrency } = useSettings();
  const isEn = settings.language === 'en';

  const isSystemDark = settings.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isAnyDark = [
    'dark', 'ocean', 'nature', 'sunset', 'lavender', 'cherry', 'midnight', 'dim', 'miku', 'teto', 'limbus', 'ruina', 'minecraft', 
    'geometry', 'fallout', 'tf2', 'cyberpunk', 'backrooms', 'terraria', 'castle', 'starwars', 'cod3', 'subnautica', 'cuphead', 
    'undertale', 'lobotomy', 'papers', 'plague', 'pvz'
  ].includes(settings.theme) || isSystemDark;

  const swalBg = isAnyDark ? '#1e293b' : '#ffffff';
  const swalColor = isAnyDark ? '#f8fafc' : '#0f172a';

  const normalizeTalla = (t) => {
    if (!t) return "";
    let str = t.toString().trim().toUpperCase();
    // Strip ALL leading T characters (handles TT07, T07, 07, 7, etc.)
    str = str.replace(/^T+/i, '');
    if (/^\d+$/.test(str)) {
      return str.padStart(2, '0');
    }
    return str;
  };


  const displayTalla = (talla) => {
    if (!talla) return "";
    const norm = normalizeTalla(talla);
    if (/^\d+$/.test(norm)) {
      return 'T' + norm;
    }
    return norm;
  };

  const [pagoPlanchadorId, setPagoPlanchadorId] = useState('');
  const [planchadorPagoDetalle, setPlanchadorPagoDetalle] = useState(null);
  const [montoPago, setMontoPago] = useState('');
  const [tipoPago, setTipoPago] = useState('completo');
  const [pagoSubmitting, setPagoSubmitting] = useState(false);
  const [fechaInicioFiltro, setFechaInicioFiltro] = useState('');
  const [fechaFinFiltro, setFechaFinFiltro] = useState('');

  // Manual Attendance State
  const [fechaManualAsistencia, setFechaManualAsistencia] = useState('');
  const [historialAsistencias, setHistorialAsistencias] = useState([]);

  // PDF Report State
  const [reportStart, setReportStart] = useState('');
  const [reportEnd, setReportEnd] = useState('');
  const [reportPlanchadorId, setReportPlanchadorId] = useState('');

  // Analytics State
  const [analisisSearchCode, setAnalisisSearchCode] = useState('');
  const [analisisData, setAnalisisData] = useState(null);
  const [analisisLoading, setAnalisisLoading] = useState(false);
  const [analisisError, setAnalisisError] = useState('');

  // Fixed Pay Modal State
  const [showAjusteModal, setShowAjusteModal] = useState(false);
  const [ajustePlanchadorId, setAjustePlanchadorId] = useState('');
  const [ajusteRazon, setAjusteRazon] = useState('Dia adelantado');
  const [ajusteApoyoDetalle, setAjusteApoyoDetalle] = useState('Corte');
  const [ajusteFecha, setAjusteFecha] = useState(new Date().toISOString().split('T')[0]);
  const [ajusteParamDias, setAjusteParamDias] = useState('1');

  // Weekly Adjustment Modal State
  const [showCuadreModal, setShowCuadreModal] = useState(false);
  const [cuadrePlanchadorId, setCuadrePlanchadorId] = useState('');
  const [cuadreStart, setCuadreStart] = useState(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    return monday.toISOString().split('T')[0];
  });
  const [cuadreEnd, setCuadreEnd] = useState(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1) + 4;
    const friday = new Date(d.setDate(diff));
    return friday.toISOString().split('T')[0];
  });
  const [cuadreDiaAdelantado, setCuadreDiaAdelantado] = useState('400');
  const [cuadrePlanchaReal, setCuadrePlanchaReal] = useState(0);

  // Auto-recalculate weekly adjustment when modal changes
  useEffect(() => {
    if (showCuadreModal && cuadrePlanchadorId && cuadreStart) {
      handleCalcularCuadre(true);
    }
  }, [showCuadreModal, cuadrePlanchadorId, cuadreStart]);

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const cleanDate = dateStr.split('T')[0];
    const parts = cleanDate.split('-');
    if (parts.length < 3) return dateStr;
    const [year, month, day] = parts;
    return `${parseInt(day, 10)}/${parseInt(month, 10)}/${year}`;
  };

  const handleCargarPagosPlanchador = async (id) => {
    setPagoPlanchadorId(id);
    setFechaInicioFiltro('');
    setFechaFinFiltro('');
    if (!id) {
      setPlanchadorPagoDetalle(null);
      setMontoPago('');
      setHistorialAsistencias([]);
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/planchadores/${id}/pagos`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPlanchadorPagoDetalle(res.data);
      if (res.data && res.data.pendiente !== undefined) {
        setMontoPago(res.data.pendiente.toString());
      }

      const resHist = await axios.get(`${API_URL}/api/planchadores/${id}/asistencias`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setHistorialAsistencias(resHist.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (planchadorPagoDetalle) {
      const trabajos = planchadorPagoDetalle.trabajosPendientes || [];
      const asistenciasList = planchadorPagoDetalle.asistenciasPendientes || [];

      const filteredTrabajos = trabajos.filter(pt => {
        if (!fechaInicioFiltro || !fechaFinFiltro) return true;
        const dateStr = pt.fecha_creacion ? pt.fecha_creacion.split('T')[0] : '';
        return dateStr >= fechaInicioFiltro && dateStr <= fechaFinFiltro;
      });

      const filteredAsistencias = asistenciasList.filter(pa => {
        if (!fechaInicioFiltro || !fechaFinFiltro) return true;
        const dateStr = pa.fecha ? pa.fecha.split('T')[0] : '';
        return dateStr >= fechaInicioFiltro && dateStr <= fechaFinFiltro;
      });

      const pendingWorksSum = filteredTrabajos.reduce((sum, pt) => sum + parseFloat(pt.total || 0), 0);
      const pendingAsistenciasSum = filteredAsistencias.reduce((sum, pa) => sum + parseFloat(pa.monto || 0), 0);
      const bonoBase = planchadorPagoDetalle.bonoBase || 0;
      const totalPendiente = pendingWorksSum + pendingAsistenciasSum + bonoBase;

      setMontoPago(totalPendiente.toFixed(2));
    }
  }, [fechaInicioFiltro, fechaFinFiltro, planchadorPagoDetalle]);

  const handleRegistrarPago = async (e) => {
    e.preventDefault();
    if (!pagoPlanchadorId || !montoPago || parseFloat(montoPago) <= 0 || pagoSubmitting) return;

    const selectedPlanchadorObj = planchadores.find(p => String(p.id) === String(pagoPlanchadorId));
    const nombrePlanchador = selectedPlanchadorObj ? selectedPlanchadorObj.nombre : '';

    Swal.fire({
      title: isEn ? 'Register Payment?' : '¿Registrar Pago?',
      text: isEn
        ? `Are you sure you want to register a payment of ${formatCurrency(montoPago)} for ${nombrePlanchador}?`
        : `¿Estás seguro de registrar un pago de ${formatCurrency(montoPago)} para ${nombrePlanchador}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3b82f6',
      cancelButtonColor: '#64748b',
      confirmButtonText: isEn ? 'Yes, register' : 'Sí, registrar',
      cancelButtonText: isEn ? 'Cancel' : 'Cancelar',
      background: swalBg,
      color: swalColor
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          setPagoSubmitting(true);
          const token = localStorage.getItem('token');
          await axios.post(`${API_URL}/api/plancha/pagos`, {
            planchador_id: pagoPlanchadorId,
            monto: parseFloat(montoPago),
            tipo_pago: 'completo',
            fecha_inicio: fechaInicioFiltro || undefined,
            fecha_fin: fechaFinFiltro || undefined
          }, { headers: { Authorization: `Bearer ${token}` } });

          setMontoPago('');
          handleCargarPagosPlanchador(pagoPlanchadorId);
          toast.success(isEn ? 'Payment registered successfully' : 'Pago registrado correctamente', { theme: 'dark' });
        } catch (e) {
          console.error(e);
          toast.error(e.response?.data?.error || (isEn ? 'Error registering payment' : 'Error al registrar pago'), { theme: 'dark' });
        } finally {
          setPagoSubmitting(false);
        }
      }
    });
  };

  const handleDeleteTrabajo = async (id) => {
    Swal.fire({
      title: isEn ? 'Delete this job?' : '¿Eliminar este trabajo?',
      text: isEn ? 'Pieces will return to pending status.' : 'Las piezas regresarán a estar pendientes.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: isEn ? 'Yes, delete' : 'Sí, eliminar',
      cancelButtonText: isEn ? 'Cancel' : 'Cancelar',
      background: swalBg,
      color: swalColor
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const token = localStorage.getItem('token');
          await axios.delete(`${API_URL}/api/plancha/trabajos/${id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (pagoPlanchadorId) {
            handleCargarPagosPlanchador(pagoPlanchadorId);
          }
          fetchModelosDisponibles();
          toast.success(isEn ? 'Job deleted' : 'Trabajo eliminado', { theme: 'dark' });
        } catch (e) {
          console.error(e);
          toast.error(e.response?.data?.error || (isEn ? 'Error deleting job' : 'Error al eliminar'), { theme: 'dark' });
        }
      }
    });
  };

  const handleEliminarAjuste = async (id) => {
    Swal.fire({
      title: isEn ? 'Delete this fixed pay?' : '¿Eliminar este ajuste/pago fijo?',
      text: isEn ? 'This action cannot be undone.' : 'Esta acción no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: isEn ? 'Yes, delete' : 'Sí, eliminar',
      cancelButtonText: isEn ? 'Cancel' : 'Cancelar',
      background: swalBg,
      color: swalColor
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const token = localStorage.getItem('token');
          await axios.delete(`${API_URL}/api/plancha/trabajos/${id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          toast.success(isEn ? 'Fixed pay deleted successfully' : 'Ajuste eliminado correctamente', { theme: 'dark' });
          handleCargarPagosPlanchador(pagoPlanchadorId);
        } catch (e) {
          console.error(e);
          toast.error(e.response?.data?.error || (isEn ? 'Error deleting fixed pay' : 'Error al eliminar el ajuste'), { theme: 'dark' });
        }
      }
    });
  };

  const handleEliminarAsistencia = async (id) => {
    Swal.fire({
      title: isEn ? 'Delete this absence?' : '¿Eliminar esta asistencia?',
      text: isEn ? 'This action cannot be undone.' : 'Esta acción no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: isEn ? 'Yes, delete' : 'Sí, eliminar',
      cancelButtonText: isEn ? 'Cancel' : 'Cancelar',
      background: swalBg,
      color: swalColor
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const token = localStorage.getItem('token');
          await axios.delete(`${API_URL}/api/plancha/asistencias/${id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          toast.success(isEn ? 'Absence deleted successfully' : 'Asistencia eliminada correctamente', { theme: 'dark' });
          handleCargarPagosPlanchador(pagoPlanchadorId);
        } catch (e) {
          console.error(e);
          toast.error(e.response?.data?.error || (isEn ? 'Error deleting absence' : 'Error al eliminar la asistencia'), { theme: 'dark' });
        }
      }
    });
  };

  const handleAddAsistenciaManual = async (e) => {
    e.preventDefault();
    if (!pagoPlanchadorId || !fechaManualAsistencia) return;
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/api/planchadores/${pagoPlanchadorId}/asistencia`, { fecha: fechaManualAsistencia }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(isEn ? 'Absence registered successfully' : 'Asistencia agregada correctamente', { theme: 'dark' });
      setFechaManualAsistencia('');
      handleCargarPagosPlanchador(pagoPlanchadorId);
    } catch (e) {
      console.error(e);
      toast.error(e.response?.data?.error || (isEn ? 'Error registering absence' : 'Error registrando asistencia'), { theme: 'dark' });
    }
  };

  const handleRegistrarAjuste = async (e) => {
    e.preventDefault();
    if (!ajustePlanchadorId) {
      toast.warning(isEn ? 'Select an ironer' : 'Selecciona un planchador', { theme: 'dark' });
      return;
    }

    const dias = parseFloat(ajusteParamDias) || 1;
    const tarifa = 400;
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
      toast.warning(isEn ? 'Fixed pay amount must be greater than 0' : 'El monto del pago fijo debe ser mayor a 0', { theme: 'dark' });
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
        monto: finalMonto,
        fecha: ajusteFecha || undefined
      }, { headers: { Authorization: `Bearer ${token}` } });

      toast.success(isEn ? 'Fixed pay registered successfully' : 'Pago fijo registrado con éxito', { theme: 'dark' });
      setShowAjusteModal(false);
      setAjustePlanchadorId('');
      setAjusteFecha(new Date().toISOString().split('T')[0]);
      fetchModelosDisponibles();
      if (pagoPlanchadorId === ajustePlanchadorId) {
        handleCargarPagosPlanchador(pagoPlanchadorId);
      }
    } catch (e) {
      console.error(e);
      toast.error(e.response?.data?.error || (isEn ? 'Error registering fixed pay' : 'Error al registrar pago fijo'), { theme: 'dark' });
    }
  };

  const handleCalcularCuadre = async (silente = false) => {
    if (!cuadrePlanchadorId || !cuadreStart) {
      if (!silente) toast.warning(isEn ? 'Missing date details for weekly adjustment' : 'Faltan datos para realizar la consulta del cuadre', { theme: 'dark' });
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
      if (!silente) toast.error(isEn ? 'Error fetching real ironing data' : 'Error al consultar plancha real del planchador', { theme: 'dark' });
    }
  };

  const handleAplicarCuadre = async () => {
    const diaAdelantadoVal = parseFloat(cuadreDiaAdelantado) || 0;
    const planchaRealVal = parseFloat(cuadrePlanchaReal) || 0;
    const finalMonto = planchaRealVal - diaAdelantadoVal;

    if (!cuadreEnd) {
      toast.warning(isEn ? 'Please choose the date to apply the difference' : 'Debe elegir la fecha en la cual se aplicará la diferencia.', { theme: 'dark' });
      return;
    }

    if (finalMonto === 0) {
      toast.info(isEn ? 'Difference is 0, no adjustment needed.' : 'La diferencia es 0, no hay ajuste necesario.', { theme: 'dark' });
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

      toast.success(isEn
        ? `Adjustment applied correctly: Difference of ${formatCurrency(finalMonto)}`
        : `Cuadre aplicado correctamente: Diferencia de ${formatCurrency(finalMonto)}`,
        { theme: 'dark' }
      );
      setShowCuadreModal(false);
      setCuadrePlanchadorId('');
      setCuadrePlanchaReal(0);
      if (pagoPlanchadorId === cuadrePlanchadorId) {
        handleCargarPagosPlanchador(pagoPlanchadorId);
      }
    } catch (e) {
      console.error(e);
      toast.error(e.response?.data?.error || (isEn ? 'Error applying weekly adjustment' : 'Error al aplicar el cuadre'), { theme: 'dark' });
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
              <SearchableSelect
                options={planchadores}
                value={pagoPlanchadorId}
                onChange={handleCargarPagosPlanchador}
                placeholder={isEn ? '-- Choose an Ironer --' : '-- Elige un Planchador --'}
                labelKey="nombre"
                valueKey="id"
                required
              />
            </div>

            {pagoPlanchadorId && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.5rem', marginBottom: '0.5rem' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.8rem' }}>{isEn ? 'From Date' : 'Desde la Fecha'}</label>
                  <input
                    type="date"
                    className="form-input"
                    value={fechaInicioFiltro}
                    onChange={e => setFechaInicioFiltro(e.target.value)}
                    style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.8rem' }}>{isEn ? 'To Date' : 'Hasta la Fecha'}</label>
                  <input
                    type="date"
                    className="form-input"
                    value={fechaFinFiltro}
                    onChange={e => setFechaFinFiltro(e.target.value)}
                    style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
                  />
                </div>
              </div>
            )}

            {planchadorPagoDetalle && (() => {
              const trabajos = (planchadorPagoDetalle.trabajosPendientes || []).filter(pt => {
                if (!fechaInicioFiltro || !fechaFinFiltro) return true;
                const dateStr = pt.fecha_creacion ? pt.fecha_creacion.split('T')[0] : '';
                return dateStr >= fechaInicioFiltro && dateStr <= fechaFinFiltro;
              });

              const asistenciasList = (planchadorPagoDetalle.asistenciasPendientes || []).filter(pa => {
                if (!fechaInicioFiltro || !fechaFinFiltro) return true;
                const dateStr = pa.fecha ? pa.fecha.split('T')[0] : '';
                return dateStr >= fechaInicioFiltro && dateStr <= fechaFinFiltro;
              });

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

              const bonoBase = planchadorPagoDetalle.bonoBase || 0;
              const pendiente = regularWork + cuadreDif + pagoFijoVal + asistenciasVal + bonoBase;
              const ganado = pendiente;

              return (
                <div style={{ background: 'rgba(0,0,0,0.02)', padding: '1rem', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.95rem' }}>
                  <p style={{ margin: 0 }}><strong>{isEn ? 'Total Earned' : 'Total Ganado'}:</strong> {formatCurrency(ganado)}</p>

                  {bonoBase > 0 && (
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted, #94a3b8)', paddingLeft: '1rem' }}>
                      • {isEn ? 'Base Bonus' : 'Base Quincenal'}: <span style={{ color: '#60a5fa', fontWeight: 'bold' }}>+{formatCurrency(bonoBase)}</span>
                    </p>
                  )}

                  {regularWork > 0 && (
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted, #94a3b8)', paddingLeft: '1rem' }}>
                      • {isEn ? 'Regular Ironing' : 'Plancha Regular'}: <span style={{ color: '#34d399', fontWeight: 'bold' }}>+{formatCurrency(regularWork)}</span>
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
                          <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '220px' }} title={item.color}>
                            - {item.fecha_creacion ? `[${formatDate(item.fecha_creacion)}] ` : ''}{item.color || 'Apoyo'}
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

                  {asistenciasVal < 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingLeft: '1rem' }}>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted, #94a3b8)' }}>
                        • {isEn ? 'Absences' : 'Faltas'}: <span style={{ color: '#ef4444' }}>
                          {formatCurrency(asistenciasVal)}
                        </span>
                      </p>
                      {asistenciasList.map(item => (
                        <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)', paddingLeft: '0.5rem', background: 'rgba(255,255,255,0.02)', padding: '4px 8px', borderRadius: '6px' }}>
                          <span>
                            - {isEn ? 'Absence' : 'Falta'} {formatDate(item.fecha)}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontWeight: 600, color: '#ef4444' }}>
                              {formatCurrency(item.monto)}
                            </span>
                            <MinusCircle
                              size={14}
                              color="#ef4444"
                              style={{ cursor: 'pointer' }}
                              title={isEn ? 'Remove absence' : 'Eliminar falta'}
                              onClick={() => handleEliminarAsistencia(item.id)}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <p style={{ margin: 0, color: '#34d399' }}><strong>{isEn ? 'Total Paid' : 'Total Pagado'}:</strong> {formatCurrency(0)}</p>
                  <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.05)', margin: '0.4rem 0' }} />
                  <p style={{ margin: 0, fontSize: '1.1rem', color: pendiente > 0 ? '#ef4444' : '#34d399' }}>
                    <strong>{isEn ? 'Fortnightly Payment' : 'Pago Quincena'}: {formatCurrency(pendiente)}</strong>
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

        {/* Asistencias Manuales */}
        {pagoPlanchadorId && (
          <div className="glass-card" style={{ padding: '1.5rem', marginTop: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1.2rem 0', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              Gestión de Faltas
            </h3>
            <form onSubmit={handleAddAsistenciaManual} style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', alignItems: 'flex-end' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Agregar Falta Manual (Fecha)</label>
                <input type="date" className="form-input" value={fechaManualAsistencia} onChange={e => setFechaManualAsistencia(e.target.value)} required />
              </div>
              <button type="submit" className="btn btn-primary" style={{ padding: '0.6rem 1.2rem', background: '#ef4444', borderColor: '#ef4444' }}>Registrar Falta</button>
            </form>

            {historialAsistencias.length > 0 ? (
              <div className="table-wrapper">
                <table className="data-table" style={{ fontSize: '0.85rem' }}>
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Monto</th>
                      <th>Estatus</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historialAsistencias.map(a => (
                      <tr key={a.id}>
                        <td>{new Date(a.fecha + 'T12:00:00Z').toLocaleDateString()}</td>
                        <td>${Number(a.monto).toFixed(2)}</td>
                        <td>
                          {a.pago_id ? <span className="badge badge-success">Pagado (Recibo #{a.pago_id})</span> : <span className="badge badge-warning">Pendiente</span>}
                        </td>
                        <td>
                          {!a.pago_id && (
                            <button type="button" onClick={() => handleEliminarAsistencia(a.id)} className="btn" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', padding: '4px 8px', fontSize: '0.75rem', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '4px' }}>Eliminar</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No hay asistencias recientes.</p>
            )}
          </div>
        )}

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
              <SearchableSelect
                options={[
                  { id: "", nombre: isEn ? '-- All Ironers --' : '-- Todos los Planchadores --' },
                  ...planchadores
                ]}
                value={reportPlanchadorId}
                onChange={setReportPlanchadorId}
                placeholder={isEn ? '-- All Ironers --' : '-- Todos los Planchadores --'}
                labelKey="nombre"
                valueKey="id"
              />
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

        {/* Buscador Analítico */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Search size={18} color="#0ea5e9" /> {isEn ? 'Model Analytics Search' : 'Buscador Analítico de Modelo'}
          </h3>

          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <input
              type="text"
              className="form-input"
              placeholder={isEn ? "Scan or type code (e.g. 725539 or V725539VER09)" : "Escanea o ingresa código (ej. 725539 o V725539VER09)"}
              value={analisisSearchCode}
              onChange={e => setAnalisisSearchCode(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  const code = analisisSearchCode.trim();
                  if (!code) return;
                  setAnalisisLoading(true);
                  setAnalisisError('');

                  let searchParams = `modelo=${code}`;
                  if (code.length > 6) {
                    const match = code.match(/(\d{6})/);
                    if (match) {
                      const modeloParsed = match[1];
                      const suffix = code.substring(code.indexOf(modeloParsed) + 6);
                      const colorMatch = suffix.match(/[A-Z]+/i);
                      const tallaMatch = suffix.match(/\d+$/);

                      if (colorMatch && tallaMatch) {
                        searchParams = `modelo=${modeloParsed}&color=${colorMatch[0].toUpperCase()}&talla=${tallaMatch[0]}`;
                      } else {
                        searchParams = `modelo=${modeloParsed}`;
                      }
                    }
                  }

                  const token = localStorage.getItem('token');
                  fetch(`${API_URL}/api/plancha/analisis?${searchParams}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                  })
                    .then(res => res.json())
                    .then(data => {
                      setAnalisisLoading(false);
                      if (data.error) setAnalisisError(data.error);
                      else setAnalisisData(data);
                    })
                    .catch(err => {
                      setAnalisisLoading(false);
                      setAnalisisError(err.message);
                    });
                }
              }}
              style={{ flex: 1, fontSize: '1.1rem', padding: '0.8rem' }}
            />
          </div>

          {analisisLoading && <div style={{ color: 'var(--text-secondary)' }}>Cargando análisis...</div>}
          {analisisError && <div style={{ color: '#ef4444' }}>{analisisError}</div>}

          {analisisData && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '0.5rem' }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'stretch' }}>
                {analisisData.modelo_imagen && (
                  <div style={{ width: '100px', flexShrink: 0, borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-color)', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ImageZoom
                      src={`${API_URL}${analisisData.modelo_imagen}`}
                      alt="Modelo"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                )}
                <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                  <div style={{ background: 'var(--bg-input)', padding: '1rem', borderRadius: '8px', textAlign: 'center', border: '1px solid var(--border-color)' }}>
                    <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase' }}>{isEn ? 'Total Pieces' : 'Total de Piezas'}</p>
                    <p style={{ margin: 0, fontSize: '1.8rem', fontWeight: '800', color: '#0ea5e9' }}>{analisisData.total_piezas}</p>
                  </div>
                  <div style={{ background: 'var(--bg-input)', padding: '1rem', borderRadius: '8px', textAlign: 'center', border: '1px solid var(--border-color)' }}>
                    <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase' }}>{isEn ? 'Total Ironed' : 'Total Planchado'}</p>
                    <p style={{ margin: 0, fontSize: '1.8rem', fontWeight: '800', color: '#10b981' }}>{analisisData.total_planchado}</p>
                  </div>
                  <div style={{ background: 'var(--bg-input)', padding: '1rem', borderRadius: '8px', textAlign: 'center', border: '1px solid var(--border-color)' }}>
                    <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase' }}>{isEn ? 'Remaining' : 'Faltantes'}</p>
                    <p style={{ margin: 0, fontSize: '1.8rem', fontWeight: '800', color: analisisData.faltantes > 0 ? '#f59e0b' : '#10b981' }}>{analisisData.faltantes}</p>
                  </div>
                </div>
              </div>

              {analisisData.historial.length > 0 ? (
                <div className="table-wrapper" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  <table className="data-table">
                    <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-card)', zIndex: 1 }}>
                      <tr>
                        <th>{isEn ? 'Ironer' : 'Planchador'}</th>
                        <th>{isEn ? 'Date' : 'Fecha'}</th>
                        <th>{isEn ? 'Color' : 'Color'}</th>
                        <th>{isEn ? 'Size' : 'Talla'}</th>
                        <th>{isEn ? 'Pieces' : 'Piezas'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analisisData.historial.map((h, i) => (
                        <tr key={i}>
                          <td style={{ fontWeight: '600' }}>{h.planchador_nombre}</td>
                          <td>{new Date(h.fecha_creacion).toLocaleString()}</td>
                          <td><span style={{ background: 'var(--bg-input)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: '600' }}>{h.color || 'N/A'}</span></td>
                          <td><span style={{ background: 'rgba(14, 165, 233, 0.1)', color: '#0ea5e9', padding: '2px 6px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: '600' }}>{displayTalla(h.talla)}</span></td>
                          <td style={{ fontWeight: 'bold' }}>{h.piezas}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)' }}>
                  {isEn ? 'No ironing history found for this model' : 'No se encontró historial de planchado para este modelo'}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Trabajos por liquidar */}
        <div className="glass-card">
          <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.2rem' }}>{isEn ? 'Completed jobs pending payment' : 'Trabajos terminados pendientes de pago'}</h3>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{isEn ? 'Model' : 'Modelo'}</th>
                  <th>{isEn ? 'Work Date' : 'Fecha Trabajo'}</th>
                  <th>{isEn ? 'Color' : 'Color'}</th>
                  <th>{isEn ? 'Size' : 'Talla'}</th>
                  <th>{isEn ? 'Pcs' : 'Pzas'}</th>
                  <th>{isEn ? 'Net' : 'Neto'}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {!planchadorPagoDetalle || planchadorPagoDetalle.trabajosPendientes.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-muted, #94a3b8)' }}>
                      {!pagoPlanchadorId ? (isEn ? 'Select an ironer to view pending jobs.' : 'Selecciona un planchador para ver sus pendientes.') : (isEn ? 'No jobs pending payment.' : 'No hay trabajos pendientes de pago.')}
                    </td>
                  </tr>
                ) : (
                  (() => {
                    return planchadorPagoDetalle.trabajosPendientes.map(t => {
                      const dateStr = t.fecha_creacion ? t.fecha_creacion.split('T')[0] : '';
                      const isWithinRange = !fechaInicioFiltro || !fechaFinFiltro || (dateStr >= fechaInicioFiltro && dateStr <= fechaFinFiltro);
                      const isFilterActive = !!(fechaInicioFiltro && fechaFinFiltro);

                      return (
                        <tr 
                          key={t.id} 
                          style={{ 
                            opacity: isWithinRange ? 1 : 0.45,
                            background: isWithinRange && isFilterActive ? 'rgba(52, 211, 153, 0.04)' : 'transparent',
                            transition: 'all 0.2s ease'
                          }}
                          title={!isWithinRange ? (isEn ? 'Excluded from current payment range' : 'Excluido del rango de pago actual') : ''}
                        >
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {t.modelo_imagen ? (
                                <ImageZoom
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
                            {t.talla !== 'AJUSTE' && t.color ? (
                              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                {t.color}
                              </span>
                            ) : '-'}
                          </td>
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
                          <td>
                            <button
                              onClick={() => handleDeleteTrabajo(t.id)}
                              style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                              <MinusCircle size={18} />
                            </button>
                          </td>
                        </tr>
                      );
                    });
                  })()
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
                {!planchadorPagoDetalle || !planchadorPagoDetalle.pagos || planchadorPagoDetalle.pagos.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', color: '#94a3b8' }}>
                      {!pagoPlanchadorId ? (isEn ? 'Select an ironer to view receipts.' : 'Selecciona un planchador para ver sus recibos.') : (isEn ? 'No payments registered yet.' : 'No se han registrado pagos aún.')}
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
                  setAjusteFecha(new Date().toISOString().split('T')[0]);
                }}
                className="btn-icon"
                style={{ background: 'rgba(255,255,255,0.05)', color: '#fff', border: 'none', padding: '8px', borderRadius: '50%', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleRegistrarAjuste} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>

              <div className="form-group">
                <label className="form-label">{isEn ? 'Ironer' : 'Planchador'}</label>
                <SearchableSelect
                  options={planchadores.filter(p => !p.nombre.toLowerCase().includes('olga') && !p.nombre.toLowerCase().includes('luis'))}
                  value={ajustePlanchadorId}
                  onChange={setAjustePlanchadorId}
                  placeholder={isEn ? '-- Choose an Ironer --' : '-- Elige un Planchador --'}
                  labelKey="nombre"
                  valueKey="id"
                  required
                />
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
              <div className="form-group">
                <label className="form-label">{isEn ? 'Date' : 'Fecha'}</label>
                <input
                  type="date"
                  className="form-input"
                  value={ajusteFecha}
                  onChange={e => setAjusteFecha(e.target.value)}
                  required
                />
              </div>

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
                    setAjusteFecha(new Date().toISOString().split('T')[0]);
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
                style={{ background: 'rgba(255,255,255,0.05)', color: '#fff', border: 'none', padding: '8px', borderRadius: '50%', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>

              <div className="form-group">
                <label className="form-label">{isEn ? 'Ironer' : 'Planchador'}</label>
                <SearchableSelect
                  options={planchadores.filter(p => !p.nombre.toLowerCase().includes('olga') && !p.nombre.toLowerCase().includes('luis'))}
                  value={cuadrePlanchadorId}
                  onChange={setCuadrePlanchadorId}
                  placeholder={isEn ? '-- Choose an Ironer --' : '-- Elige un Planchador --'}
                  labelKey="nombre"
                  valueKey="id"
                  required
                />
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
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted, #94a3b8)', marginBottom: '0.2rem' }}>{isEn ? 'Difference Result:' : 'Resultado de Diferencia:'}</div>
                    <div style={{ fontSize: '1.6rem', fontWeight: 'bold', color: diferencia > 0 ? '#10b981' : diferencia < 0 ? '#ef4444' : '#fff' }}>
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

    </div>
  );
}
