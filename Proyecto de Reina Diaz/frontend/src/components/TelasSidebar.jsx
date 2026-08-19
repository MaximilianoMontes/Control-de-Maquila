import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Layers,
  Tags,
  FileText,
  PackageMinus,
  ClipboardList,
  HelpCircle,
  Home,
  LogOut
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';

export default function TelasSidebar({ activeTab, setActiveTab, onClose }) {
  const { logout } = useAuth();
  const { t, settings } = useSettings();
  const location = useLocation();
  const navigate = useNavigate();
  const isTelasPage = location.pathname === '/telas';
  const isEn = settings.language === 'en';

  const handleTabClick = (tabId) => {
    if (isTelasPage) {
      setActiveTab(tabId);
    } else {
      navigate(`/telas?tab=${tabId}`);
    }
    if (onClose) onClose();
  };

  const menuItems = [
    { id: 'catalogos', name: isEn ? 'Catalogs & Codes' : 'Catálogos y Códigos', icon: <Tags size={20} /> },
    { id: 'facturas', name: isEn ? 'Invoices & Receiving' : 'Facturas y Recepción', icon: <FileText size={20} /> },
    { id: 'codigos', name: isEn ? 'Fabric Codes' : 'Códigos de Tela', icon: <Layers size={20} /> },
    { id: 'requisiciones', name: isEn ? 'Requisitions' : 'Requisiciones', icon: <ClipboardList size={20} /> },
    { id: 'salidas', name: isEn ? 'Outbound' : 'Salidas', icon: <PackageMinus size={20} /> },
    { id: 'pendientes', name: isEn ? 'Pending Codes' : 'Códigos Pendientes', icon: <HelpCircle size={20} /> },
  ];

  return (
    <aside className="sidebar plancha-sidebar">
      <Link to="/telas" className="sidebar-logo">
        <img src="/logo.png" alt="Logo Maquila" className="logo-img" />
        <span className="gradient-text">Maquila ERP</span>
        <span
          style={{
            fontSize: '0.7rem',
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--primary-color)',
            opacity: 0.75
          }}
        >
          {isEn ? 'Fabrics Module' : 'Módulo de Telas'}
        </span>
      </Link>

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

      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
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
