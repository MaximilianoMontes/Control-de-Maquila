import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Package, 
  Factory, 
  FileText, 
  Wallet,
  LogOut,
  History
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Sidebar() {
  const location = useLocation();
  const { user, logout } = useAuth();
  
  const navItems = [
    { name: 'Dashboard', path: '/', icon: <LayoutDashboard size={20} />, roles: ['admin', 'produccion1', 'produccion2', 'inventario1'] },
    { name: 'Maquileros', path: '/maquileros', icon: <Users size={20} />, roles: ['admin', 'produccion1', 'produccion2', 'inventario1'] },
    { name: 'Inventario', path: '/inventario', icon: <Package size={20} />, roles: ['admin', 'produccion1', 'produccion2', 'inventario1'] },
    { name: 'Producción', path: '/produccion', icon: <Factory size={20} />, roles: ['admin', 'produccion1', 'produccion2', 'inventario1'] },
    { name: 'Reportes', path: '/reportes', icon: <FileText size={20} />, roles: ['admin', 'produccion1', 'produccion2', 'inventario1'] },
    { name: 'Pagos', path: '/pagos', icon: <Wallet size={20} />, roles: ['admin', 'produccion1', 'produccion2'] },
    { name: 'Historial', path: '/historial', icon: <History size={20} />, roles: ['admin', 'produccion1', 'produccion2', 'inventario1'] },
  ];

  const userRole = user?.role || user?.rol;
  const allowedNavItems = navItems.filter(item => {
    if (userRole === 'admin') return true;
    return item.roles.includes(userRole);
  });

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
