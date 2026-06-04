import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Users, 
  Layers, 
  Flame, 
  Wallet, 
  Home, 
  LogOut,
  Shirt,
  History
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';

export default function PlanchaSidebar({ activeTab, setActiveTab }) {
  const { logout } = useAuth();
  const { t } = useSettings();
  const location = useLocation();
  const navigate = useNavigate();
  const isPlanchaPage = location.pathname === '/plancha';

  const handleTabClick = (tabId) => {
    if (isPlanchaPage) {
      setActiveTab(tabId);
    } else {
      navigate(`/plancha?tab=${tabId}`);
    }
  };

  const menuItems = [
    { id: 'plancha', name: 'Burros de Plancha', icon: <Flame size={20} /> },
    { id: 'modelos', name: 'Modelos Camión', icon: <Layers size={20} /> },
    { id: 'planchadores', name: 'Planchadores', icon: <Users size={20} /> },
    { id: 'pagos', name: 'Pagos Plancha', icon: <Wallet size={20} /> },
    { id: 'historial', name: 'Historial Plancha', icon: <History size={20} /> },
  ];

  return (
    <aside className="sidebar" style={{ borderRight: '1px solid rgba(14, 165, 233, 0.15)' }}>
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
          <button 
            key={item.id} 
            onClick={() => handleTabClick(item.id)}
            className={`nav-link ${activeTab === item.id ? 'active' : ''}`}
            style={{ 
              background: activeTab === item.id ? 'rgba(14, 165, 233, 0.08)' : 'transparent',
              color: activeTab === item.id ? '#0ea5e9' : 'var(--text-secondary)',
              border: 'none',
              width: '100%',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer',
              fontWeight: activeTab === item.id ? 'bold' : 'normal'
            }}
          >
            {item.icon}
            <span style={{ marginLeft: '12px' }}>{item.name}</span>
          </button>
        ))}
      </nav>

      {/* Botón para volver al Launcher de Apps */}
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
            fontSize: '0.95rem'
          }}
        >
          <Home size={18} /> Volver al Inicio
        </Link>

        {/* Cerrar Sesión */}
        <button 
          className="btn logout-btn" 
          onClick={logout}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
        >
          <LogOut size={18} /> {t('nav.logout')}
        </button>
      </div>
    </aside>
  );
}
