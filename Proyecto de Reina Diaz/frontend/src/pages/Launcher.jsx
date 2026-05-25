import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { 
  Calendar, 
  Bell, 
  Settings, 
  LogOut,
  Moon,
  Sun
} from 'lucide-react';


// Custom high-aesthetic SVGs for app icons (Odoo claymorphism-flat style)
const MaquilaIcon = () => (
  <svg width="56" height="56" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="gradMaquila" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#7c3aed" />
        <stop offset="100%" stopColor="#c084fc" />
      </linearGradient>
      <filter id="shadowMaquila" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="4" stdDeviation="4" floodOpacity="0.15" />
      </filter>
    </defs>
    <rect width="64" height="64" rx="20" fill="url(#gradMaquila)" filter="url(#shadowMaquila)" />
    {/* Premium factory/production machinery lines */}
    <path d="M18 44V26L28 32V26L38 32V20L46 24V44H18Z" fill="white" fillOpacity="0.25" />
    <path d="M18 44H46M22 34H26M22 38H26M38 34H42M38 38H42M30 38H34" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M32 20V16" stroke="white" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

const PlanchaIcon = () => (
  <svg width="56" height="56" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="gradPlancha" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#0ea5e9" />
        <stop offset="100%" stopColor="#22d3ee" />
      </linearGradient>
      <filter id="shadowPlancha" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="4" stdDeviation="4" floodOpacity="0.15" />
      </filter>
    </defs>
    <rect width="64" height="64" rx="20" fill="url(#gradPlancha)" filter="url(#shadowPlancha)" />
    {/* High-end Clothes Iron Vector Graphic */}
    <path d="M18 44H46C46 35 42 27 33 27H22" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M24 27V21H38V27" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="30" cy="36" r="2" fill="white" />
    <circle cx="36" cy="36" r="2" fill="white" />
    <line x1="18" y1="44" x2="46" y2="44" stroke="white" strokeWidth="4" strokeLinecap="round" />
  </svg>
);

export default function Launcher() {
  const { user, logout } = useAuth();
  const { settings, updateSetting } = useSettings();
  const isDark = settings.theme === 'dark';

  // Toggle between dark and light mode
  const toggleTheme = () => {
    const nextTheme = isDark ? 'light' : 'dark';
    updateSetting('theme', nextTheme);
  };

  // Safe username formatting for initials
  const username = user?.username || 'Admin';
  const userInitials = username.substring(0, 2).toUpperCase();

  // Multi-language text support
  const text = settings.language === 'en' ? {
    company: "Maquila Reina Diaz (Colima)",
    maquila: "Maquila ERP",
    plancha: "Pressing Module",
    soon: "Coming soon",
    logout: "Log Out",
    theme: "Toggle Theme"
  } : {
    company: "Maquila Reina Diaz (Colima)",
    maquila: "Maquila ERP",
    plancha: "Módulo de Plancha",
    soon: "Próximamente",
    logout: "Cerrar Sesión",
    theme: "Cambiar Tema"
  };

  return (
    <div className="launcher-container">
      {/* Top Status Bar (Odoo Style) */}
      <header className="launcher-header">
        <div className="launcher-header-left">
          {/* Status Indicator pulse */}
          <div className="launcher-status-dot" title="Servicios del ERP Activos"></div>
          
          {/* Action Quick Icons */}
          <button className="launcher-header-btn" title="Calendario / Citas">
            <Calendar size={16} />
            <span className="launcher-header-badge">2</span>
          </button>
          
          <button className="launcher-header-btn" title="Notificaciones">
            <Bell size={16} />
          </button>
        </div>

        <div className="launcher-header-right">
          {/* Theme Toggle Button */}
          <button 
            className="launcher-header-btn" 
            onClick={toggleTheme} 
            title={text.theme}
            style={{ marginRight: '8px' }}
          >
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          {/* Company Title */}
          <span className="launcher-company-name">{text.company}</span>
          
          {/* Profile Circle with LogOut */}
          <button 
            className="launcher-header-btn launcher-user-avatar" 
            onClick={logout}
            title={text.logout}
          >
            {userInitials}
          </button>
        </div>
      </header>

      {/* Main Apps Selection Grid */}
      <main className="launcher-grid-wrapper">
        <div className="launcher-grid">
          {/* App 1: Maquila (Active ERP Dashboard) */}
          <Link to="/dashboard" className="launcher-app-item">
            <div className="launcher-app-icon">
              <MaquilaIcon />
            </div>
            <span className="launcher-app-name">{text.maquila}</span>
          </Link>

          {/* App 2: Plancha (Disabled / Coming Soon) */}
          <div className="launcher-app-item disabled" title={text.soon}>
            <div className="launcher-app-icon" style={{ filter: 'grayscale(0.65) opacity(0.8)' }}>
              <PlanchaIcon />
              <span className="launcher-app-badge">{text.soon}</span>
            </div>
            <span className="launcher-app-name">{text.plancha}</span>
          </div>
        </div>
      </main>
    </div>
  );
}
