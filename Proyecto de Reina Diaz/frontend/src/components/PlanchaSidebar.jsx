import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Users, 
  Layers, 
  Flame, 
  Wallet, 
  Home, 
  LogOut,
  Shirt,
  History,
  LayoutDashboard
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';

export default function PlanchaSidebar({ activeTab, setActiveTab, onClose }) {
  const { logout } = useAuth();
  const { t, settings } = useSettings();
  const location = useLocation();
  const navigate = useNavigate();
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
    <aside className="sidebar plancha-sidebar" style={{ borderRight: '1px solid rgba(14, 165, 233, 0.15)' }}>
      {/* Logo exclusivo del módulo de plancha */}
      <Link to="/" className="sidebar-logo" style={{ gap: '0.8rem' }}>
        <div 
          style={{ 
            background: 'linear-gradient(135deg, #0ea5e9, #22d3ee)', 
            padding: '8px', 
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(14, 165, 233, 0.25)'
          }}
        >
          <Shirt size={22} color="#fff" />
        </div>
        <span className="gradient-text" style={{ background: 'linear-gradient(135deg, #0ea5e9, #22d3ee)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Plancha ERP
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
            style={{ cursor: 'pointer' }}
          >
            {item.icon}
            <span>{item.name}</span>
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
          <LayoutDashboard size={18} /> {isEn ? 'Maquila ERP (Dashboard)' : 'Maquila ERP (Dashboard)'}
        </Link>

        <Link 
          to="/" 
          className="btn" 
          onClick={onClose}
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
          <Home size={18} /> {isEn ? 'Back to Home' : 'Volver al Inicio'}
        </Link>

        {/* Cerrar Sesión */}
        <button 
          className="btn logout-btn" 
          onClick={() => { logout(); if (onClose) onClose(); }}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
        >
          <LogOut size={18} /> {t('nav.logout')}
        </button>
      </div>
    </aside>
  );
}
