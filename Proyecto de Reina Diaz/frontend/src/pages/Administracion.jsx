import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Shield, UserCog, MessageCircle, Home, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import API_URL from '../config';
import Header from '../components/Header';
import Usuarios from './Usuarios';
import SoporteReportes from './SoporteReportes';

export default function Administracion() {
  const { logout } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const isEn = settings?.language === 'en';

  const [activeTab, setActiveTab] = useState('usuarios'); // 'usuarios' | 'soporte'
  const [reportesNuevos, setReportesNuevos] = useState(0);

  useEffect(() => {
    axios.get(`${API_URL}/api/soporte/reportes?estado=nuevo`)
      .then(res => setReportesNuevos(res.data.length))
      .catch(() => {});
  }, [activeTab]);

  return (
    <div className="app-layout">
      {/* Sidebar personalizado de la zona de Administración */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <Shield size={26} color="#f59e0b" style={{ filter: 'drop-shadow(0 0 8px rgba(245, 158, 11, 0.4))' }} />
          <span className="gradient-text" style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>
            {isEn ? 'Administration' : 'Administración'}
          </span>
        </div>

        <nav className="nav-links" style={{ marginBottom: '1rem' }}>
          <a
            href="#"
            className={`nav-link ${activeTab === 'usuarios' ? 'active' : ''}`}
            onClick={(e) => { e.preventDefault(); setActiveTab('usuarios'); }}
            style={{ cursor: 'pointer' }}
          >
            <UserCog size={20} />
            {isEn ? 'User Management' : 'Gestión de Usuarios'}
          </a>

          <a
            href="#"
            className={`nav-link ${activeTab === 'soporte' ? 'active' : ''}`}
            onClick={(e) => { e.preventDefault(); setActiveTab('soporte'); }}
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <MessageCircle size={20} />
              {isEn ? 'Support Reports' : 'Reportes de Soporte'}
            </span>
            {reportesNuevos > 0 && (
              <span style={{ background: '#ef4444', color: 'white', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 700, padding: '1px 7px' }}>
                {reportesNuevos}
              </span>
            )}
          </a>
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
        <Header />
        <main className="main-content" style={{ padding: '2rem' }}>
          {activeTab === 'usuarios' ? <Usuarios /> : <SoporteReportes />}
        </main>
      </div>
    </div>
  );
}
