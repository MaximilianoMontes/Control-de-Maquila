import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Users,
  Layers,
  Flame,
  Wallet,
  Home,
  LogOut,
  History,
  LayoutDashboard,
  ChevronLeft
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import useSidebarCollapse from '../hooks/useSidebarCollapse';

export default function PlanchaSidebar({ activeTab, setActiveTab, onClose }) {
  const { logout } = useAuth();
  const { t, settings } = useSettings();
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, toggleCollapsed] = useSidebarCollapse();
  const isPlanchaPage = location.pathname === '/plancha';

  const handleTabClick = (tabId) => {
    if (isPlanchaPage) {
      setActiveTab(tabId);
    } else {
      navigate(`/plancha?tab=${tabId}`);
    }
    if (onClose) onClose();
  };

  const isEn = settings.language === 'en';

  const menuItems = [
    { id: 'plancha', name: isEn ? 'Ironing Boards' : 'Burros de Plancha', icon: <Flame size={20} /> },
    { id: 'modelos', name: isEn ? 'Truck Models' : 'Modelos Camión', icon: <Layers size={20} /> },
    { id: 'planchadores', name: isEn ? 'Ironers' : 'Planchadores', icon: <Users size={20} /> },
    { id: 'pagos', name: isEn ? 'Ironing Payments' : 'Pagos Plancha', icon: <Wallet size={20} /> },
    { id: 'historial', name: isEn ? 'Ironing History' : 'Historial Plancha', icon: <History size={20} /> },
  ];

  return (
    <aside className="sidebar plancha-sidebar">
      <button
        type="button"
        className="sidebar-collapse-btn"
        onClick={toggleCollapsed}
        title={collapsed ? (isEn ? 'Expand menu' : 'Expandir menú') : (isEn ? 'Collapse menu' : 'Colapsar menú')}
      >
        <ChevronLeft size={14} />
      </button>

      {/* Misma marca que el resto de la app: el módulo se identifica con una
          etiqueta secundaria, no con un logo y nombre completamente distintos. */}
      <Link to="/dashboard" className="sidebar-logo">
        <img src="/logo.png" alt="Logo Maquila" className="logo-img" />
        <span className="gradient-text sidebar-label">Maquila ERP</span>
        <span
          className="sidebar-label"
          style={{
            fontSize: '0.7rem',
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--primary-color)',
            opacity: 0.75
          }}
        >
          {isEn ? 'Ironing Module' : 'Módulo de Plancha'}
        </span>
      </Link>

      {/* Botones de navegación de pestañas */}
      <nav className="nav-links">
        {menuItems.map(item => (
          <a
            key={item.id}
            href="#"
            onClick={(e) => { e.preventDefault(); handleTabClick(item.id); }}
            className={`nav-link ${activeTab === item.id ? 'active' : ''}`}
            title={item.name}
            style={{ cursor: 'pointer' }}
          >
            {item.icon}
            <span className="sidebar-label">{item.name}</span>
          </a>
        ))}
      </nav>

      {/* Botón para volver al Launcher de Apps */}
      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {/* Enlace directo a Maquila ERP */}
        <Link
          to="/dashboard"
          className="btn"
          onClick={onClose}
          title={isEn ? 'Maquila ERP (Dashboard)' : 'Maquila ERP (Dashboard)'}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            background: 'linear-gradient(135deg, #7c3aed, #2563eb)',
            border: 'none',
            color: '#ffffff',
            padding: '10px',
            borderRadius: '8px',
            fontSize: '0.95rem',
            fontWeight: '600',
            boxShadow: '0 4px 12px rgba(124, 58, 237, 0.25)'
          }}
        >
          <LayoutDashboard size={18} /> <span className="sidebar-label">{isEn ? 'Maquila ERP (Dashboard)' : 'Maquila ERP (Dashboard)'}</span>
        </Link>

        <Link
          to="/"
          className="btn"
          onClick={onClose}
          title={isEn ? 'Back to Home' : 'Volver al Inicio'}
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
            fontSize: '0.95rem'
          }}
        >
          <Home size={18} /> <span className="sidebar-label">{isEn ? 'Back to Home' : 'Volver al Inicio'}</span>
        </Link>

        {/* Cerrar Sesión */}
        <button
          className="btn logout-btn"
          onClick={() => { logout(); if (onClose) onClose(); }}
          title={t('nav.logout')}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
        >
          <LogOut size={18} /> <span className="sidebar-label">{t('nav.logout')}</span>
        </button>
      </div>
    </aside>
  );
}
