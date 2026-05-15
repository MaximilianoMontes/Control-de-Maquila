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
  Scissors
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Sidebar() {
  const location = useLocation();
  const { user, logout } = useAuth();
  
  // Todos los items del sidebar - cualquier usuario autenticado los ve
  // excepto Pagos que solo es para admin y produccion
  const userRole = (user?.role || user?.rol || '').trim();
  // Solo admin y produccion pueden ver Pagos
  const puedeVerPagos = ['admin', 'produccion1', 'produccion2'].includes(userRole);

  const navItems = [
    { path: '/',           name: 'Dashboard',   icon: <LayoutDashboard size={20} /> },
    { path: '/maquileros', name: 'Maquileros',  icon: <Users size={20} /> },
    { path: '/inventario', name: 'Inventario',  icon: <Package size={20} /> },
    { path: '/cortes',     name: 'Cortes',      icon: <Scissors size={20} /> },
    { path: '/produccion', name: 'Producción',  icon: <Factory size={20} /> },
    { path: '/reportes',   name: 'Reportes',    icon: <FileText size={20} /> },
    ...(puedeVerPagos ? [{ path: '/pagos', name: 'Pagos', icon: <Wallet size={20} /> }] : []),
    { path: '/historial',  name: 'Historial',   icon: <History size={20} /> },
  ];

  const allowedNavItems = navItems;

  return (
    <aside className="sidebar">
      <Link to="/" className="sidebar-logo">
        <img src="/logo.png" alt="Logo Maquila" className="logo-img" />
        <span className="gradient-text">Maquila ERP</span>
      </Link>
      
      <nav className="nav-links">
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

      <button className="btn logout-btn" onClick={logout}>
        <LogOut size={20} /> Cerrar Sesión
      </button>
    </aside>
  );
}
