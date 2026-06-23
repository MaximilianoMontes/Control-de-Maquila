import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import API_URL from '../config';
import { 
  Menu,
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
  ChevronDown,
  Globe,
  ExternalLink,
  Lock,
  Plus,
  Trash2,
  AlertTriangle,
  LayoutGrid,
  Flame,
  Layers,
  Calendar
} from 'lucide-react';

export default function Header({ onToggleSidebar }) {
  const { user, logout } = useAuth();
  const { settings, updateSetting, t, translateLog } = useSettings();
  const navigate = useNavigate();
  const location = useLocation();
  const isPlanchaPage = location.pathname.startsWith('/plancha');
  const isAdmin = user?.role === 'admin' || user?.rol === 'admin';
  
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



  // Dynamic movements notifications state
  const [logs, setLogs] = useState([]);
  const [readIds, setReadIds] = useState(() => {
    try {
      const saved = localStorage.getItem('read_notification_ids');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [clearedUntil, setClearedUntil] = useState(() => {
    try {
      const saved = localStorage.getItem('notifications_cleared_until');
      return saved ? parseInt(saved, 10) : 0;
    } catch {
      return 0;
    }
  });

  // Fetch movements and poll every 10 seconds
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const [histRes, calRes] = await Promise.all([
          axios.get(`${API_URL}/api/historial?limit=15`),
          axios.get(`${API_URL}/api/calendario/upcoming`).catch(() => ({ data: [] }))
        ]);
        
        let mergedLogs = [];
        if (histRes.data && Array.isArray(histRes.data)) {
          mergedLogs = [...histRes.data];
        }
        
        if (calRes.data && Array.isArray(calRes.data)) {
          const calEvents = calRes.data.map(ev => ({
            id: `cal-${ev.id}`,
            action: 'CALENDAR_ALERT',
            target: 'CALENDARIO',
            timestamp: ev.fecha_inicio,
            user_name: ev.usuario,
            description: `${ev.titulo}: ${ev.descripcion || ''}`
          }));
          mergedLogs = [...calEvents, ...mergedLogs];
        }
        
        mergedLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        setLogs(mergedLogs);
      } catch (e) {
        console.error('Error fetching notifications for header:', e);
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, []);

  // Filter active notifications
  const activeNotifications = logs.filter(log => typeof log.id === 'string' || log.id > clearedUntil);
  const unreadCount = activeNotifications.filter(log => !readIds.includes(log.id)).length;

  const getRelativeTime = (timestamp, lang) => {
    const diffMs = new Date() - new Date(timestamp);
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (lang === 'en') {
      if (diffSec < 60) return 'Just now';
      if (diffMin < 60) return `${diffMin} min ago`;
      if (diffHour < 24) return diffHour === 1 ? '1 hour ago' : `${diffHour} hours ago`;
      return diffDay === 1 ? '1 day ago' : `${diffDay} days ago`;
    } else {
      if (diffSec < 60) return 'Justo ahora';
      if (diffMin < 60) return `Hace ${diffMin} min`;
      if (diffHour < 24) return diffHour === 1 ? 'Hace 1 hora' : `Hace ${diffHour} horas`;
      return diffDay === 1 ? 'Hace 1 día' : `Hace ${diffDay} días`;
    }
  };

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
  const commands = isPlanchaPage ? [
    { name: 'Tablero de Burros', desc: 'Interfaz interactiva de planchado y asignación', path: '/plancha?tab=plancha', icon: <Flame size={18} />, badge: 'Burros' },
    { name: 'Modelos en Tránsito', desc: 'Verificación de llegada y precios de plancha', path: '/plancha?tab=modelos', icon: <Layers size={18} />, badge: 'Modelos' },
    { name: 'Planchadores', desc: 'Registro y administración de planchadores', path: '/plancha?tab=planchadores', icon: <Users size={18} />, badge: 'Planchadores' },
    { name: 'Pagos a Planchadores', desc: 'Liquidación de sueldos, apoyos y cuadres', path: '/plancha?tab=pagos', icon: <Wallet size={18} />, badge: 'Pagos' },
    { name: 'Reportes e Historial', desc: 'Trabajos finalizados y exportación de reportes', path: '/plancha?tab=historial', icon: <FileText size={18} />, badge: 'Reportes' },
    { name: t('header.helpCenter'), desc: t('header.cmdHelpDesc'), path: '/ayuda', icon: <HelpCircle size={18} />, badge: t('header.cmdHelpBadge') },
  ] : [
    { name: t('nav.dashboard'), desc: t('header.cmdDashboardDesc'), path: '/', icon: <LayoutDashboard size={18} />, badge: t('header.cmdDashboardBadge') },
    { name: t('nav.maquileros'), desc: t('header.cmdMaquilerosDesc'), path: '/maquileros', icon: <Users size={18} />, badge: t('header.cmdMaquilerosBadge') },
    { name: t('nav.inventario'), desc: t('header.cmdInventarioDesc'), path: '/inventario', icon: <Package size={18} />, badge: t('header.cmdInventarioBadge') },
    { name: t('nav.cortes'), desc: t('header.cmdCortesDesc'), path: '/cortes', icon: <Scissors size={18} />, badge: t('header.cmdCortesBadge') },
    { name: t('nav.produccion'), desc: t('header.cmdProduccionDesc'), path: '/produccion', icon: <Factory size={18} />, badge: t('header.cmdProduccionBadge') },
    { name: t('nav.reportes'), desc: t('header.cmdReportesDesc'), path: '/reportes', icon: <FileText size={18} />, badge: t('header.cmdReportesBadge') },
    { name: t('nav.pagos'), desc: t('header.cmdPagosDesc'), path: '/pagos', icon: <Wallet size={18} />, badge: t('header.cmdPagosBadge') },
    { name: t('nav.historial'), desc: t('header.cmdHistorialDesc'), path: '/historial', icon: <History size={18} />, badge: t('header.cmdHistorialBadge') },
    { name: t('header.helpCenter'), desc: t('header.cmdHelpDesc'), path: '/ayuda', icon: <HelpCircle size={18} />, badge: t('header.cmdHelpBadge') },
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
    const newReadIds = [...new Set([...readIds, ...activeNotifications.map(n => n.id)])];
    setReadIds(newReadIds);
    localStorage.setItem('read_notification_ids', JSON.stringify(newReadIds));
  };

  const handleClearNotifications = () => {
    const numericLogs = activeNotifications.filter(n => typeof n.id === 'number');
    const maxId = numericLogs.length > 0 ? Math.max(...numericLogs.map(n => n.id)) : clearedUntil;
    setClearedUntil(maxId);
    localStorage.setItem('notifications_cleared_until', maxId.toString());
  };

  const handleReadNotification = (id) => {
    if (!readIds.includes(id)) {
      const newReadIds = [...readIds, id];
      setReadIds(newReadIds);
      localStorage.setItem('read_notification_ids', JSON.stringify(newReadIds));
    }
    setShowNotifications(false);
    navigate('/historial');
  };

  const toggleSetting = (key, value) => {
    updateSetting(key, value);
  };



  return (
    <>
      <header className="main-header">
        {/* Hamburger Menu for Mobile */}
        <button 
          className="mobile-menu-toggle"
          onClick={onToggleSidebar}
          aria-label="Toggle Menu"
        >
          <Menu size={22} />
        </button>

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
              title={t('header.sysNotifications')}
            >
              <Bell size={20} />
              {unreadCount > 0 && <span className="header-action-badge" />}
            </button>

            <div className={`header-dropdown notifications-dropdown ${showNotifications ? 'active' : ''}`}>
              <div className="dropdown-header">
                <h4>{t('header.notifications')}</h4>
                {activeNotifications.length > 0 && (
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
                {activeNotifications.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    {t('header.noNotifications')}
                  </div>
                ) : (
                  activeNotifications.map(n => {
                    const isUnread = !readIds.includes(n.id);
                    const actionLower = (n.action || '').toLowerCase();
                    
                    let IconComponent = Info;
                    let iconColor = 'var(--primary-color)';
                    let bgColor = 'rgba(59, 130, 246, 0.1)';
                    
                    if (actionLower === 'alta') {
                      IconComponent = Plus;
                      iconColor = 'var(--success-color)';
                      bgColor = 'rgba(16, 185, 129, 0.1)';
                    } else if (actionLower === 'edit') {
                      IconComponent = AlertTriangle;
                      iconColor = '#fbbf24';
                      bgColor = 'rgba(245, 158, 11, 0.1)';
                    } else if (actionLower === 'baja') {
                      IconComponent = Trash2;
                      iconColor = 'var(--danger-color)';
                      bgColor = 'rgba(239, 68, 68, 0.1)';
                    } else if (actionLower === 'calendar_alert') {
                      IconComponent = Calendar;
                      iconColor = '#c084fc'; // a nice purple
                      bgColor = 'rgba(192, 132, 252, 0.1)';
                    }

                    return (
                      <div 
                        key={n.id} 
                        className={`notification-item ${isUnread ? 'unread' : ''}`} 
                        style={{ cursor: 'pointer', background: isUnread ? 'rgba(59, 130, 246, 0.04)' : 'transparent' }}
                        onClick={() => handleReadNotification(n.id)}
                      >
                        <div className="notification-icon-wrapper" style={{ background: bgColor, color: iconColor }}>
                          <IconComponent size={14} />
                        </div>
                        <div className="notification-item-content">
                          <p className="notification-text" style={isUnread ? { fontWeight: 600 } : {}}>
                            <strong style={{ color: 'var(--text-primary)' }}>{n.username}</strong>: {translateLog(n.description)}
                          </p>
                          <span className="notification-time">{getRelativeTime(n.timestamp, settings.language)}</span>
                        </div>
                      </div>
                    );
                  })
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
                {isPlanchaPage ? (
                  <>
                    <Link to="/ayuda?tab=plancha&from=plancha" className="profile-dropdown-item" onClick={() => setShowHelp(false)}>
                      <Flame size={16} />
                      <span>{settings.language === 'en' ? 'Ironing Module Guide' : 'Guía del Módulo de Plancha'}</span>
                    </Link>
                    <Link to="/ayuda?tab=general&from=plancha" className="profile-dropdown-item" onClick={() => setShowHelp(false)}>
                      <BookOpen size={16} />
                      <span>{settings.language === 'en' ? 'General Help Center' : 'Centro de Ayuda General'}</span>
                    </Link>
                  </>
                ) : (
                  <>
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
                  </>
                )}
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
                  <span className="profile-dropdown-name">{user?.username || t('header.defaultUser')}</span>
                  <span className="profile-dropdown-role">{user?.role || user?.rol || t('header.defaultRole')}</span>
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
        <div className="modal-overlay">
          <div className="modal-content glass-card settings-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
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
            
            <div className="settings-list" style={{ maxHeight: '70vh', overflowY: 'auto', paddingRight: '6px' }}>
              {/* Visual Theme */}
              <div className="settings-item">
                <span className="settings-item-label">{t('settings.themeLabel')}</span>
                <span className="settings-item-desc">{t('settings.themeDesc')}</span>
                <div className="settings-options-row" style={{ flexWrap: 'wrap' }}>
                  <button 
                    className={`settings-option-btn ${settings.theme === 'light' ? 'active' : ''}`}
                    onClick={() => toggleSetting('theme', 'light')}
                  >
                    {settings.theme === 'light' && <Check size={14} />} {t('settings.themeLight')}
                  </button>
                  <button 
                    className={`settings-option-btn ${settings.theme === 'dark' ? 'active' : ''}`}
                    onClick={() => toggleSetting('theme', 'dark')}
                  >
                    {settings.theme === 'dark' && <Check size={14} />} {t('settings.themeDark')}
                  </button>
                  <button 
                    className={`settings-option-btn ${settings.theme === 'ocean' ? 'active' : ''}`}
                    onClick={() => toggleSetting('theme', 'ocean')}
                  >
                    {settings.theme === 'ocean' && <Check size={14} />} {t('settings.themeOcean')}
                  </button>
                  <button 
                    className={`settings-option-btn ${settings.theme === 'nature' ? 'active' : ''}`}
                    onClick={() => toggleSetting('theme', 'nature')}
                  >
                    {settings.theme === 'nature' && <Check size={14} />} {t('settings.themeNature')}
                  </button>
                  <button 
                    className={`settings-option-btn ${settings.theme === 'sunset' ? 'active' : ''}`}
                    onClick={() => toggleSetting('theme', 'sunset')}
                  >
                    {settings.theme === 'sunset' && <Check size={14} />} {t('settings.themeSunset')}
                  </button>
                  <button 
                    className={`settings-option-btn ${settings.theme === 'lavender' ? 'active' : ''}`}
                    onClick={() => toggleSetting('theme', 'lavender')}
                  >
                    {settings.theme === 'lavender' && <Check size={14} />} {t('settings.themeLavender')}
                  </button>
                  <button 
                    className={`settings-option-btn ${settings.theme === 'cherry' ? 'active' : ''}`}
                    onClick={() => toggleSetting('theme', 'cherry')}
                  >
                    {settings.theme === 'cherry' && <Check size={14} />} {t('settings.themeCherry')}
                  </button>
                  <button 
                    className={`settings-option-btn ${settings.theme === 'midnight' ? 'active' : ''}`}
                    onClick={() => toggleSetting('theme', 'midnight')}
                  >
                    {settings.theme === 'midnight' && <Check size={14} />} {t('settings.themeMidnight')}
                  </button>
                  <button 
                    className={`settings-option-btn ${settings.theme === 'dim' ? 'active' : ''}`}
                    onClick={() => toggleSetting('theme', 'dim')}
                  >
                    {settings.theme === 'dim' && <Check size={14} />} {t('settings.themeDim')}
                  </button>
                  <button 
                    className={`settings-option-btn ${settings.theme === 'system' ? 'active' : ''}`}
                    onClick={() => toggleSetting('theme', 'system')}
                    style={{ flexBasis: '100%' }}
                  >
                    {settings.theme === 'system' && <Check size={14} />} {t('settings.themeSystem')}
                  </button>
                </div>
              </div>

              {/* Accent Color */}
              <div className="settings-item">
                <span className="settings-item-label">{t('settings.accentLabel')}</span>
                <span className="settings-item-desc">{t('settings.accentDesc')}</span>
                <div style={{ display: 'flex', gap: '14px', alignItems: 'center', marginTop: '6px', flexWrap: 'wrap' }}>
                  {[
                    { id: 'blue', color: '#2563eb', label: settings.language === 'en' ? 'Royal Blue' : 'Azul Real' },
                    { id: 'green', color: '#10b981', label: settings.language === 'en' ? 'Emerald Green' : 'Verde Esmeralda' },
                    { id: 'purple', color: '#6366f1', label: settings.language === 'en' ? 'Indigo Purple' : 'Púrpura Índigo' },
                    { id: 'red', color: '#ef4444', label: settings.language === 'en' ? 'Ruby Red' : 'Rojo Rubí' },
                    { id: 'orange', color: '#f97316', label: settings.language === 'en' ? 'Coral Orange' : 'Naranja Coral' },
                    { id: 'yellow', color: '#eab308', label: settings.language === 'en' ? 'Sunny Yellow' : 'Amarillo Sol' },
                    { id: 'pink', color: '#ec4899', label: settings.language === 'en' ? 'Hot Pink' : 'Rosa Fuerte' },
                    { id: 'slate', color: '#64748b', label: settings.language === 'en' ? 'Slate Gray' : 'Gris Pizarra' },
                    { id: 'black', color: '#171717', label: settings.language === 'en' ? 'Carbon Black' : 'Negro Carbón' },
                    { id: 'white', color: '#f8fafc', label: settings.language === 'en' ? 'Snow White' : 'Blanco Nieve' },
                    { id: 'brown', color: '#78350f', label: settings.language === 'en' ? 'Coffee Brown' : 'Café Tostado' },
                    { id: 'teal', color: '#14b8a6', label: settings.language === 'en' ? 'Ocean Teal' : 'Cian Océano' },
                    { id: 'cyan', color: '#06b6d4', label: settings.language === 'en' ? 'Sky Cyan' : 'Celeste Cielo' },
                    { id: 'rose', color: '#f43f5e', label: settings.language === 'en' ? 'Soft Rose' : 'Rosa Suave' }
                  ].map(item => (
                    <button
                      key={item.id}
                      onClick={() => toggleSetting('accentColor', item.id)}
                      title={item.label}
                      style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: '50%',
                        background: item.color,
                        border: settings.accentColor === item.id ? '3px solid var(--text-primary)' : '2px solid transparent',
                        boxShadow: settings.accentColor === item.id ? `0 0 12px ${item.color}` : 'none',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        padding: 0
                      }}
                    >
                      {settings.accentColor === item.id && <Check size={14} strokeWidth={3} />}
                    </button>
                  ))}
                </div>
              </div>

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

              {/* Currency Selector */}
              <div className="settings-item">
                <span className="settings-item-label">{t('settings.currencyLabel')}</span>
                <span className="settings-item-desc">{t('settings.currencyDesc')}</span>
                <div className="settings-options-row">
                  <button 
                    className={`settings-option-btn ${settings.currency === 'mxn' ? 'active' : ''}`}
                    onClick={() => toggleSetting('currency', 'mxn')}
                  >
                    {settings.currency === 'mxn' && <Check size={14} />} MXN ($)
                  </button>
                  <button 
                    className={`settings-option-btn ${settings.currency === 'usd' ? 'active' : ''}`}
                    onClick={() => toggleSetting('currency', 'usd')}
                  >
                    {settings.currency === 'usd' && <Check size={14} />} USD ($ USD)
                  </button>
                </div>
              </div>

              {/* Auto Archive */}
              <div className="settings-item">
                <span className="settings-item-label">{t('settings.autoArchiveLabel')}</span>
                <span className="settings-item-desc">{t('settings.autoArchiveDesc')}</span>
                <div className="settings-options-row">
                  <button 
                    className={`settings-option-btn ${settings.autoArchive === 'enabled' ? 'active' : ''}`}
                    onClick={() => toggleSetting('autoArchive', 'enabled')}
                  >
                    {settings.autoArchive === 'enabled' && <Check size={14} />} {t('settings.autoArchiveEnabled')}
                  </button>
                  <button 
                    className={`settings-option-btn ${settings.autoArchive === 'disabled' ? 'active' : ''}`}
                    onClick={() => toggleSetting('autoArchive', 'disabled')}
                  >
                    {settings.autoArchive === 'disabled' && <Check size={14} />} {t('settings.autoArchiveDisabled')}
                  </button>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
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

