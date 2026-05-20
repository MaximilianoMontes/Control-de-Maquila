import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { 
  Search, 
  Bell, 
  HelpCircle, 
  User, 
  Settings, 
  LogOut, 
  X, 
  Check, 
  LayoutDashboard, 
  Users, 
  Package, 
  Scissors, 
  Factory, 
  FileText, 
  Wallet, 
  History,
  BookOpen,
  Info,
  ChevronDown
} from 'lucide-react';

export default function Header() {
  const { user, logout } = useAuth();
  const { settings, updateSetting, t } = useSettings();
  const navigate = useNavigate();
  
  // Dropdown states
  const [showNotifications, setShowNotifications] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  
  // Modal states
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  
  // Command search state
  const [commandQuery, setCommandQuery] = useState('');
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0);

  // Notifications state (simulating real system updates)
  const [notifications, setNotifications] = useState([
    { id: 1, text: 'Nueva orden de producción registrada para el maquilero Montes', time: 'Hace 5 min', unread: true, type: 'alta' },
    { id: 2, text: 'El inventario de Rollo Mezclilla #4 ha sido actualizado', time: 'Hace 20 min', unread: true, type: 'edit' },
    { id: 3, text: 'Pago registrado por nómina acumulada de Maquilero Díaz', time: 'Hace 1 hora', unread: false, type: 'alta' },
    { id: 4, text: 'Orden #45 marcada como Terminado y archivada automáticamente', time: 'Hace 3 horas', unread: false, type: 'edit' }
  ]);

  // Refs for closing dropdowns on click outside
  const notificationsRef = useRef(null);
  const helpRef = useRef(null);
  const profileRef = useRef(null);
  const commandPaletteInputRef = useRef(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
      if (helpRef.current && !helpRef.current.contains(event.target)) {
        setShowHelp(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfile(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcut Ctrl + G for Command Palette
  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'g') {
        e.preventDefault();
        setShowCommandPalette(prev => !prev);
      }
      if (e.key === 'Escape') {
        setShowCommandPalette(false);
        setShowSettingsModal(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Focus command palette input when opened
  useEffect(() => {
    if (showCommandPalette && commandPaletteInputRef.current) {
      setTimeout(() => commandPaletteInputRef.current.focus(), 50);
      setCommandQuery('');
      setSelectedCommandIndex(0);
    }
  }, [showCommandPalette]);

  // Available commands in Command Palette
  const commands = [
    { name: t('nav.dashboard'), desc: 'Panel general con estadísticas y órdenes', path: '/', icon: <LayoutDashboard size={18} />, badge: 'Inicio' },
    { name: t('nav.maquileros'), desc: 'Control de maquileros, desempeño y tarifas', path: '/maquileros', icon: <Users size={18} />, badge: 'Contactos' },
    { name: t('nav.inventario'), desc: 'Gestión de rollos de tela y retazos', path: '/inventario', icon: <Package size={18} />, badge: 'Materiales' },
    { name: t('nav.cortes'), desc: 'Registro de cortes a partir de rollos', path: '/cortes', icon: <Scissors size={18} />, badge: 'Producción' },
    { name: t('nav.produccion'), desc: 'Monitoreo de órdenes de maquila', path: '/produccion', icon: <Factory size={18} />, badge: 'Fábrica' },
    { name: t('nav.reportes'), desc: 'Gráficas, estados y reportes generales', path: '/reportes', icon: <FileText size={18} />, badge: 'Análisis' },
    { name: t('nav.pagos'), desc: 'Nómina, depósitos y saldos de maquileros', path: '/pagos', icon: <Wallet size={18} />, badge: 'Finanzas' },
    { name: t('nav.historial'), desc: 'Bitácora de movimientos y auditoría', path: '/historial', icon: <History size={18} />, badge: 'Seguridad' },
    { name: t('header.helpCenter'), desc: 'Manual del usuario e instrucciones paso a paso', path: '/ayuda', icon: <HelpCircle size={18} />, badge: 'Soporte' },
  ];

  // Filter commands based on search query
  const filteredCommands = commands.filter(c => 
    c.name.toLowerCase().includes(commandQuery.toLowerCase()) ||
    c.desc.toLowerCase().includes(commandQuery.toLowerCase()) ||
    c.badge.toLowerCase().includes(commandQuery.toLowerCase())
  );

  // Command palette navigation using arrows & Enter
  const handleCommandKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedCommandIndex(prev => (prev + 1) % filteredCommands.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedCommandIndex(prev => (prev - 1 + filteredCommands.length) % filteredCommands.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCommands[selectedCommandIndex]) {
        handleNavigate(filteredCommands[selectedCommandIndex].path);
      }
    }
  };

  const handleNavigate = (path) => {
    navigate(path);
    setShowCommandPalette(false);
  };

  const handleMarkAllNotificationsAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
  };

  const handleClearNotifications = () => {
    setNotifications([]);
  };

  const toggleSetting = (key, value) => {
    updateSetting(key, value);
  };

  // Get unread notification count
  const unreadCount = notifications.filter(n => n.unread).length;

  return (
    <>
      <header className="main-header">
        {/* Search bar/Command search button */}
        <div className="header-search-container" onClick={() => setShowCommandPalette(true)}>
          <Search size={18} color="var(--text-secondary)" />
          <div className="header-search-input-placeholder">
            {t('header.search')}
          </div>
          <span className="header-search-badge">Ctrl + G</span>
        </div>

        {/* Action Controls */}
        <div className="header-actions">
          {/* Notifications Dropdown */}
          <div className="header-help-container" ref={notificationsRef}>
            <button 
              className="header-action-btn" 
              onClick={() => setShowNotifications(!showNotifications)}
              title="Notificaciones del sistema"
            >
              <Bell size={20} />
              {unreadCount > 0 && <span className="header-action-badge" />}
            </button>

            <div className={`header-dropdown notifications-dropdown ${showNotifications ? 'active' : ''}`}>
              <div className="dropdown-header">
                <h4>{t('header.notifications')}</h4>
                {notifications.length > 0 && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="dropdown-header-btn" onClick={handleMarkAllNotificationsAsRead}>
                      {t('header.readAll')}
                    </button>
                    <button className="dropdown-header-btn" style={{ color: 'var(--danger-color)' }} onClick={handleClearNotifications}>
                      {t('header.clear')}
                    </button>
                  </div>
                )}
              </div>
              <div className="notification-list">
                {notifications.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    {t('header.noNotifications')}
                  </div>
                ) : (
                  notifications.map(n => (
                    <div key={n.id} className={`notification-item ${n.unread ? 'unread' : ''}`} style={n.unread ? { background: 'rgba(59, 130, 246, 0.04)' } : {}}>
                      <div className="notification-icon-wrapper" style={{
                        background: n.type === 'alta' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                        color: n.type === 'alta' ? 'var(--success-color)' : 'var(--primary-color)'
                      }}>
                        <Info size={14} />
                      </div>
                      <div className="notification-item-content">
                        <p className="notification-text" style={n.unread ? { fontWeight: 600 } : {}}>{n.text}</p>
                        <span className="notification-time">{n.time}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Help Menu Dropdown */}
          <div className="header-help-container" ref={helpRef}>
            <button 
              className="header-help-trigger" 
              onClick={() => setShowHelp(!showHelp)}
            >
              <HelpCircle size={18} />
              <span>{t('header.help')}</span>
              <ChevronDown size={14} />
            </button>

            <div className={`header-dropdown help-dropdown ${showHelp ? 'active' : ''}`}>
              <div className="dropdown-header">
                <h4>{t('header.helpCenter')}</h4>
              </div>
              <div style={{ padding: '4px' }}>
                <Link to="/ayuda?tab=general" className="profile-dropdown-item" onClick={() => setShowHelp(false)}>
                  <BookOpen size={16} />
                  <span>{t('header.userManual')}</span>
                </Link>
                <Link to="/ayuda?tab=maquileros" className="profile-dropdown-item" onClick={() => setShowHelp(false)}>
                  <Users size={16} />
                  <span>{t('header.tailorGuide')}</span>
                </Link>
                <Link to="/ayuda?tab=inventario" className="profile-dropdown-item" onClick={() => setShowHelp(false)}>
                  <Package size={16} />
                  <span>{t('header.inventoryControl')}</span>
                </Link>
                <Link to="/ayuda?tab=cortes" className="profile-dropdown-item" onClick={() => setShowHelp(false)}>
                  <Scissors size={16} />
                  <span>{t('header.cutsDesign')}</span>
                </Link>
                <Link to="/ayuda?tab=produccion" className="profile-dropdown-item" onClick={() => setShowHelp(false)}>
                  <Factory size={16} />
                  <span>{t('header.productionFlow')}</span>
                </Link>
                <Link to="/ayuda?tab=pagos" className="profile-dropdown-item" onClick={() => setShowHelp(false)}>
                  <Wallet size={16} />
                  <span>{t('header.paymentsAcum')}</span>
                </Link>
              </div>
            </div>
          </div>

          {/* User Profile dropdown */}
          <div className="header-profile-container" ref={profileRef}>
            <button 
              className="header-profile-trigger"
              onClick={() => setShowProfile(!showProfile)}
            >
              <div className="header-profile-avatar">
                {user?.username ? user.username.charAt(0).toUpperCase() : 'U'}
              </div>
            </button>

            <div className={`header-dropdown ${showProfile ? 'active' : ''}`}>
              <div className="profile-dropdown-user">
                <div className="header-profile-avatar" style={{ width: '42px', height: '42px', fontSize: '1.1rem' }}>
                  {user?.username ? user.username.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="profile-dropdown-info">
                  <span className="profile-dropdown-name">{user?.username || 'Usuario'}</span>
                  <span className="profile-dropdown-role">{user?.role || user?.rol || 'Operador'}</span>
                </div>
              </div>
              <div style={{ padding: '4px' }}>
                <button 
                  className="profile-dropdown-item" 
                  onClick={() => { setShowProfile(false); navigate('/ayuda'); }}
                >
                  <User size={16} />
                  <span>{t('header.profileGuide')}</span>
                </button>
                <button 
                  className="profile-dropdown-item"
                  onClick={() => { setShowProfile(false); setShowSettingsModal(true); }}
                >
                  <Settings size={16} />
                  <span>{t('header.settings')}</span>
                </button>
                <div style={{ borderTop: '1px solid var(--border-color)', margin: '4px 0' }} />
                <button 
                  className="profile-dropdown-item danger" 
                  onClick={() => { setShowProfile(false); logout(); }}
                >
                  <LogOut size={16} />
                  <span>{t('header.logout')}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Command Palette Overlay Modal */}
      {showCommandPalette && (
        <div className="command-palette-overlay" onClick={() => setShowCommandPalette(false)}>
          <div className="command-palette" onClick={(e) => e.stopPropagation()}>
            <div className="command-palette-search-wrapper">
              <Search size={20} color="var(--text-secondary)" />
              <input 
                ref={commandPaletteInputRef}
                type="text" 
                className="command-palette-input" 
                placeholder={t('header.commandPalettePlaceholder')} 
                value={commandQuery}
                onChange={(e) => { setCommandQuery(e.target.value); setSelectedCommandIndex(0); }}
                onKeyDown={handleCommandKeyDown}
              />
              <span className="command-palette-esc">Esc</span>
            </div>
            
            <div className="command-palette-results">
              <div className="command-palette-results-title">{t('header.commandPaletteTitle')}</div>
              
              {filteredCommands.length === 0 ? (
                <div className="command-palette-no-results">
                  {t('header.commandPaletteNoResults', { query: commandQuery })}
                </div>
              ) : (
                filteredCommands.map((cmd, index) => (
                  <div 
                    key={cmd.path} 
                    className={`command-palette-option ${index === selectedCommandIndex ? 'selected' : ''}`}
                    onClick={() => handleNavigate(cmd.path)}
                    onMouseEnter={() => setSelectedCommandIndex(index)}
                  >
                    <div className="command-palette-option-left">
                      <span className="command-palette-option-icon">{cmd.icon}</span>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span className="command-palette-option-name">{cmd.name}</span>
                        <span className="command-palette-option-desc">{cmd.desc}</span>
                      </div>
                    </div>
                    <span className="command-palette-option-badge">{cmd.badge}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="modal-overlay" onClick={() => setShowSettingsModal(false)}>
          <div className="modal-content glass-card settings-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{t('settings.title')}</h2>
              <button 
                className="header-action-btn" 
                onClick={() => setShowSettingsModal(false)}
                style={{ background: 'rgba(0,0,0,0.05)', padding: '6px' }}
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="settings-list">
              {/* Visual Density */}
              <div className="settings-item">
                <span className="settings-item-label">{t('settings.densityLabel')}</span>
                <span className="settings-item-desc">{t('settings.densityDesc')}</span>
                <div className="settings-options-row">
                  <button 
                    className={`settings-option-btn ${settings.density === 'normal' ? 'active' : ''}`}
                    onClick={() => toggleSetting('density', 'normal')}
                  >
                    {settings.density === 'normal' && <Check size={14} />} {t('settings.densityNormal')}
                  </button>
                  <button 
                    className={`settings-option-btn ${settings.density === 'compact' ? 'active' : ''}`}
                    onClick={() => toggleSetting('density', 'compact')}
                  >
                    {settings.density === 'compact' && <Check size={14} />} {t('settings.densityCompact')}
                  </button>
                </div>
              </div>

              {/* System Alerts */}
              <div className="settings-item">
                <span className="settings-item-label">{t('settings.alertsLabel')}</span>
                <span className="settings-item-desc">{t('settings.alertsDesc')}</span>
                <div className="settings-options-row">
                  <button 
                    className={`settings-option-btn ${settings.alerts === 'enabled' ? 'active' : ''}`}
                    onClick={() => toggleSetting('alerts', 'enabled')}
                  >
                    {settings.alerts === 'enabled' && <Check size={14} />} {t('settings.alertsEnabled')}
                  </button>
                  <button 
                    className={`settings-option-btn ${settings.alerts === 'disabled' ? 'active' : ''}`}
                    onClick={() => toggleSetting('alerts', 'disabled')}
                  >
                    {settings.alerts === 'disabled' && <Check size={14} />} {t('settings.alertsDisabled')}
                  </button>
                </div>
              </div>

              {/* Interface Language */}
              <div className="settings-item">
                <span className="settings-item-label">{t('settings.languageLabel')}</span>
                <span className="settings-item-desc">{t('settings.languageDesc')}</span>
                <div className="settings-options-row">
                  <button 
                    className={`settings-option-btn ${settings.language === 'es' ? 'active' : ''}`}
                    onClick={() => toggleSetting('language', 'es')}
                  >
                    {settings.language === 'es' && <Check size={14} />} Español (MX)
                  </button>
                  <button 
                    className={`settings-option-btn ${settings.language === 'en' ? 'active' : ''}`}
                    onClick={() => toggleSetting('language', 'en')}
                  >
                    {settings.language === 'en' && <Check size={14} />} English (US)
                  </button>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-primary" onClick={() => setShowSettingsModal(false)}>
                {t('settings.save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

