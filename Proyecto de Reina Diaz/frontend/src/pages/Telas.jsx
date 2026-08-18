import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { useSettings } from '../context/SettingsContext';
import API_URL from '../config';
import TelasSidebar from '../components/TelasSidebar';
import Header from '../components/Header';
import TrainingBanner from '../components/TrainingBanner';
import SupportChatWidget from '../components/SupportChatWidget';

import TelasCatalogos from '../components/telas/TelasCatalogos';
import TelasFacturas from '../components/telas/TelasFacturas';
import TelasCodigos from '../components/telas/TelasCodigos';
import TelasSalidas from '../components/telas/TelasSalidas';
import TelasPendientes from '../components/telas/TelasPendientes';

export default function Telas() {
  const { settings } = useSettings();
  const isEn = settings.language === 'en';
  const [searchParams] = useSearchParams();
  // El tab activo se deriva directamente de la URL o de un click local, sin efecto de
  // sincronización (evita setState síncrono dentro de un efecto).
  const [manualTab, setManualTab] = useState(null);
  const activeTab = manualTab || searchParams.get('tab') || 'catalogos';
  const setActiveTab = (tab) => setManualTab(tab);

  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const toggleSidebar = () => setIsMobileSidebarOpen(prev => !prev);
  const closeSidebar = () => setIsMobileSidebarOpen(false);

  const [tipos, setTipos] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [colores, setColores] = useState([]);
  const [codigos, setCodigos] = useState([]);

  const authHeaders = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

  const fetchTipos = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/telas/tipos`, authHeaders());
      setTipos(res.data);
    } catch (e) { console.error('Error fetching tipos de tela', e); }
  };

  const fetchProveedores = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/telas/proveedores`, authHeaders());
      setProveedores(res.data);
    } catch (e) { console.error('Error fetching proveedores de tela', e); }
  };

  const fetchColores = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/telas/colores`, authHeaders());
      setColores(res.data);
    } catch (e) { console.error('Error fetching colores de tela', e); }
  };

  const fetchCodigos = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/telas/codigos`, authHeaders());
      setCodigos(res.data);
    } catch (e) { console.error('Error fetching codigos de tela', e); }
  };

  useEffect(() => {
    // Carga inicial de catálogos desde la API: fetch-on-mount, el mismo patrón que usa el
    // resto del sistema (Plancha, Cortes, etc.), no un caso de estado derivado de props.
    fetchTipos();
    fetchProveedores();
    fetchColores();
    fetchCodigos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const catalogos = { tipos, proveedores, colores, codigos };
  const refetchCatalogos = { fetchTipos, fetchProveedores, fetchColores, fetchCodigos };

  return (
    <div className="app-layout">
      {isMobileSidebarOpen && (
        <div className="sidebar-overlay" onClick={closeSidebar}></div>
      )}

      <div className={`sidebar-container ${isMobileSidebarOpen ? 'mobile-open' : ''}`}>
        <TelasSidebar activeTab={activeTab} setActiveTab={setActiveTab} onClose={closeSidebar} />
      </div>

      <SupportChatWidget />
      <div className="main-container">
        <TrainingBanner />
        <Header onToggleSidebar={toggleSidebar} />

        <main className="main-content" style={{ padding: '2rem' }}>
          <h1 style={{ fontSize: '1.7rem', margin: '0 0 1.5rem 0' }}>
            {isEn ? 'Fabrics Warehouse' : 'Almacén de Telas'}
          </h1>

          {activeTab === 'catalogos' && (
            <TelasCatalogos catalogos={catalogos} refetchCatalogos={refetchCatalogos} />
          )}

          {activeTab === 'facturas' && (
            <TelasFacturas proveedores={proveedores} codigos={codigos} fetchCodigos={fetchCodigos} />
          )}

          {activeTab === 'codigos' && (
            <TelasCodigos codigos={codigos} fetchCodigos={fetchCodigos} tipos={tipos} proveedores={proveedores} colores={colores} />
          )}

          {activeTab === 'salidas' && (
            <TelasSalidas codigos={codigos} fetchCodigos={fetchCodigos} />
          )}

          {activeTab === 'pendientes' && (
            <TelasPendientes />
          )}
        </main>
      </div>
    </div>
  );
}
