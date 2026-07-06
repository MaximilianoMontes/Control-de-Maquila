import { useState, useEffect, useRef } from 'react';
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
  const { user, logout } = useAuth();
  const userRole = (user?.role || user?.rol || '').toString().toLowerCase().trim();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'plancha';
  const [activeTab, setActiveTab] = useState(initialTab);

  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const toggleSidebar = () => setIsMobileSidebarOpen(prev => !prev);
  const closeSidebar = () => setIsMobileSidebarOpen(false);

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
      is_comodin: (i + 1) >= 11,
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

  const [isLoaded, setIsLoaded] = useState(false);
  const lastLocalChangeTime = useRef(0);
  const burrosStateRef = useRef(burrosState);

  useEffect(() => {
    burrosStateRef.current = burrosState;
  }, [burrosState]);

  const fetchPlanchaBorrador = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/plancha/borrador`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data && res.data.burros && res.data.burros.length === 12) {
        setBurrosState(res.data.burros);
      }
    } catch (e) {
      if (e.response && e.response.status === 401) {
        logout();
      }
      console.error('Error fetching plancha borrador', e);
    } finally {
      setIsLoaded(true);
    }
  };

  const fetchPlanchaBorradorSilent = async () => {
    if (Date.now() - lastLocalChangeTime.current < 2000) return;
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/plancha/borrador`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data && res.data.burros && res.data.burros.length === 12) {
        const currentStr = JSON.stringify(burrosStateRef.current);
        const incomingStr = JSON.stringify(res.data.burros);
        if (currentStr !== incomingStr && Date.now() - lastLocalChangeTime.current >= 2000) {
          setBurrosState(res.data.burros);
        }
      }
    } catch (e) {
      if (e.response && e.response.status === 401) {
        logout();
      }
    }
  };

  const savePlanchaBorrador = async (newBurros) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/api/plancha/borrador`, {
        burros: newBurros
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (e) {
      if (e.response && e.response.status === 401) {
        logout();
      }
      console.error('Error saving plancha borrador', e);
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
    fetchPlanchaBorrador();
  }, []);

  useEffect(() => {
    if (activeTab === 'historial') {
      fetchHistorialGeneral();
    }
  }, [activeTab]);

  useEffect(() => {
    if (!isLoaded) return;
    lastLocalChangeTime.current = Date.now();
    const timer = setTimeout(() => {
      savePlanchaBorrador(burrosState);
    }, 400);
    return () => clearTimeout(timer);
  }, [burrosState, isLoaded]);

  useEffect(() => {
    if (activeTab !== 'plancha') return;

    let intervalId = null;

    const startPolling = (delay) => {
      if (intervalId) clearInterval(intervalId);
      intervalId = setInterval(() => {
        fetchPlanchaBorradorSilent();
      }, delay);
    };

    // Start with 1.5s delay
    startPolling(1500);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // Slow down to 10 seconds if tab is hidden or phone screen is locked
        startPolling(10000);
      } else {
        // Resume 1.5 seconds if tab becomes visible again
        fetchPlanchaBorradorSilent();
        startPolling(1500);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (intervalId) clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [activeTab]);

  return (
    <div className="app-layout">
      {isMobileSidebarOpen && (
        <div className="sidebar-overlay" onClick={closeSidebar}></div>
      )}

      <div className={`sidebar-container ${isMobileSidebarOpen ? 'mobile-open' : ''}`}>
        {/* Sidebar exclusiva de Plancha */}
        <PlanchaSidebar activeTab={activeTab} setActiveTab={setActiveTab} onClose={closeSidebar} />
      </div>
      
      <div className="main-container">
        <Header onToggleSidebar={toggleSidebar} />

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
