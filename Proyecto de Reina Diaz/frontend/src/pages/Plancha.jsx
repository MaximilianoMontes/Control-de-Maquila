import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import API_URL from '../config';
import PlanchaSidebar from '../components/PlanchaSidebar';
import Header from '../components/Header';

// Subcomponents
import PlanchaPlanchadores from '../components/plancha/PlanchaPlanchadores';
import PlanchaModelos from '../components/plancha/PlanchaModelos';
import PlanchaBurros from '../components/plancha/PlanchaBurros';
import PlanchaPagos from '../components/plancha/PlanchaPagos';
import PlanchaHistorial from '../components/plancha/PlanchaHistorial';

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

export default function Plancha() {
  const { settings } = useSettings();
  const { user } = useAuth();
  const userRole = (user?.role || user?.rol || '').toString().toLowerCase().trim();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'plancha';
  const [activeTab, setActiveTab] = useState(initialTab);

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
  const [asistenciasHoy, setAsistenciasHoy] = useState([]);

  const [burrosState, setBurrosState] = useState(
    Array.from({ length: 12 }, (_, i) => ({
      numero: i + 1,
      talla: BURROS_TALLAS[i + 1],
      is_comodin: true,
      planchador: null, // { id, nombre }
      modelos: [] // [{ id, modelo, imagen, piezas, maxPiezas }]
    }))
  );

  const fetchAsistenciasHoy = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/plancha/asistencias/hoy`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAsistenciasHoy(res.data);
    } catch (e) {
      console.error('Error fetching asistencias hoy', e);
    }
  };

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
    if (activeTab === 'plancha') {
      fetchAsistenciasHoy();
    }
  }, [activeTab]);

  useEffect(() => {
    fetchPlanchadores();
    fetchModelosCamion();
    fetchModelosDisponibles();
  }, []);

  useEffect(() => {
    if (activeTab === 'historial') {
      fetchHistorialGeneral();
    }
  }, [activeTab]);

  return (
    <div className="app-layout">
      {/* Sidebar exclusiva de Plancha */}
      <PlanchaSidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <div className="main-container">
        <Header />

        <main className="main-content" style={{ padding: '2rem' }}>
          {activeTab === 'planchadores' && (
            <PlanchaPlanchadores 
              planchadores={planchadores} 
              fetchPlanchadores={fetchPlanchadores} 
            />
          )}

          {activeTab === 'modelos' && (
            <PlanchaModelos 
              modelosCamion={modelosCamion} 
              fetchModelosCamion={fetchModelosCamion} 
              fetchModelosDisponibles={fetchModelosDisponibles} 
              userRole={userRole} 
            />
          )}

          {activeTab === 'plancha' && (
            <PlanchaBurros 
              burrosState={burrosState} 
              setBurrosState={setBurrosState} 
              planchadores={planchadores} 
              modelosDisponibles={modelosDisponibles} 
              fetchModelosDisponibles={fetchModelosDisponibles} 
              modelosCamion={modelosCamion} 
              asistenciasHoy={asistenciasHoy}
              fetchAsistenciasHoy={fetchAsistenciasHoy}
              fetchPlanchadores={fetchPlanchadores}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
            />
          )}

          {activeTab === 'pagos' && (
            <PlanchaPagos 
              planchadores={planchadores} 
              fetchModelosDisponibles={fetchModelosDisponibles} 
            />
          )}

          {activeTab === 'historial' && (
            <PlanchaHistorial 
              historialGeneral={historialGeneral} 
              fetchHistorialGeneral={fetchHistorialGeneral} 
            />
          )}
        </main>
      </div>
    </div>
  );
}
