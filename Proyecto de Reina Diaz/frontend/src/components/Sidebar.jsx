import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Package, 
  Factory, 
  FileText, 
  Wallet,
  LogOut,
  History,
  Scissors,
  Sparkles,
  Truck,
  Home,
  Calendar
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';

export default function Sidebar() {
  const location = useLocation();
  const { user, logout } = useAuth();
  const { t, settings } = useSettings();
  const isEn = settings?.language === 'en';
  
  // Todos los items del sidebar - cualquier usuario autenticado los ve
  // excepto Pagos que solo es para admin y produccion
  const userRole = (user?.role || user?.rol || '').toString().toLowerCase().trim();
  // Solo admin y produccion pueden ver Pagos
  const puedeVerPagos = ['admin', 'produccion1', 'produccion2', 'produccion'].includes(userRole);
  const puedeVerCamion = ['admin', 'produccion1', 'produccion2', 'produccion'].includes(userRole);

  const navItems = [
    { path: '/dashboard',  name: t('nav.dashboard'),   icon: <LayoutDashboard size={20} /> },
    { path: '/maquileros', name: t('nav.maquileros'),  icon: <Users size={20} /> },
    { path: '/inventario', name: t('nav.inventario'),  icon: <Package size={20} /> },
    { path: '/cortes',     name: t('nav.cortes'),      icon: <Scissors size={20} /> },
    { path: '/produccion', name: t('nav.produccion'),  icon: <Factory size={20} /> },
    { path: '/extras',     name: t('nav.extras'),      icon: <Sparkles size={20} /> },
    ...(puedeVerCamion ? [{ path: '/camion', name: t('nav.camion'), icon: <Truck size={20} /> }] : []),
    { path: '/reportes',   name: t('nav.reportes'),    icon: <FileText size={20} /> },
    ...(puedeVerPagos ? [{ path: '/pagos', name: t('nav.pagos'), icon: <Wallet size={20} /> }] : []),
    { path: '/historial',  name: t('nav.historial'),   icon: <History size={20} /> },
  ];

  const allowedNavItems = navItems;

  return (
    <aside className="sidebar">
      <Link to="/dashboard" className="sidebar-logo">
        <img src="/logo.png" alt="Logo Maquila" className="logo-img" />
        <span className="gradient-text">Maquila ERP</span>
      </Link>
      
      <nav className="nav-links" style={{ marginBottom: '1rem' }}>
        {allowedNavItems.map(item => (
          <Link 
            key={item.path} 
            to={item.path} 
            className={`nav-link ${location.pathname === item.path ? 'active' : ''}`}
          >
            {item.icon}
            {item.name}
          </Link>
        ))}
      </nav>

      {/* Botones de acción al fondo */}
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

        <button className="btn logout-btn" onClick={logout} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          <LogOut size={20} /> {t('nav.logout')}
        </button>
      </div>
    </aside>
  );
}

