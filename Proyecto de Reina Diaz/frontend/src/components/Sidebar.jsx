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
    { name: 'Dashboard', path: '/', icon: <LayoutDashboard size={20} />, roles: ['admin', 'produccion1', 'produccion2', 'inventario', 'inventario1'] },
    { name: 'Maquileros', path: '/maquileros', icon: <Users size={20} />, roles: ['admin', 'produccion1', 'produccion2', 'inventario', 'inventario1'] },
    { name: 'Inventario', path: '/inventario', icon: <Package size={20} />, roles: ['admin', 'produccion1', 'produccion2', 'inventario', 'inventario1'] },
    { name: 'Producción', path: '/produccion', icon: <Factory size={20} />, roles: ['admin', 'produccion1', 'produccion2', 'inventario', 'inventario1'] },
    { name: 'Reportes', path: '/reportes', icon: <FileText size={20} />, roles: ['admin', 'produccion1', 'produccion2', 'inventario', 'inventario1'] },
    { name: 'Pagos', path: '/pagos', icon: <Wallet size={20} />, roles: ['admin', 'produccion1', 'produccion2'] },
    { name: 'Historial', path: '/historial', icon: <History size={20} />, roles: ['admin', 'produccion1', 'produccion2', 'inventario', 'inventario1'] },
  ];

  // Normalizamos el rol para evitar errores de espacios o mayúsculas
  const userRole = (user?.role || user?.rol || '').toString().toLowerCase().trim();
  
  const allowedNavItems = navItems.filter(item => {
    // El admin siempre ve todo
    if (userRole === 'admin') return true;
    // Para los demás, comparamos contra la lista de roles permitidos
    return item.roles.some(r => r.toLowerCase().trim() === userRole);
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
