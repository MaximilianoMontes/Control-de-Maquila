import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
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
  ChevronDown,
  Globe,
  ExternalLink,
  Lock
} from 'lucide-react';

export default function Header() {
  const { user, logout } = useAuth();
  const { settings, updateSetting, t } = useSettings();
  const navigate = useNavigate();
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

  // Dynamic exchange rate sync state
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState(null); // { text: '', type: 'success' | 'error' }

  // Notifications state (simulating real system updates)
  const [notifications, setNotifications] = useState([
    { id: 1, textKey: 'header.notif1', timeKey: 'header.time5m', unread: true, type: 'alta' },
    { id: 2, textKey: 'header.notif2', timeKey: 'header.time20m', unread: true, type: 'edit' },
    { id: 3, textKey: 'header.notif3', timeKey: 'header.time1h', unread: false, type: 'alta' },
    { id: 4, textKey: 'header.notif4', timeKey: 'header.time3h', unread: false, type: 'edit' }
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
    setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
  };

  const handleClearNotifications = () => {
    setNotifications([]);
  };

  const toggleSetting = (key, value) => {
    updateSetting(key, value);
  };

  const handleSyncExchangeRate = async () => {
    setIsSyncing(true);
    setSyncMessage(null);
    try {
      const url = settings.exchangeRateApiUrl || 'https://open.er-api.com/v6/latest/USD';
      const res = await axios.get(url);
      
      let rate = null;
      if (res.data && res.data.rates && typeof res.data.rates.MXN === 'number') {
        rate = res.data.rates.MXN;
      } else if (res.data && res.data.conversion_rates && typeof res.data.conversion_rates.MXN === 'number') {
        rate = res.data.conversion_rates.MXN;
      } else if (res.data && typeof res.data.MXN === 'number') {
        rate = res.data.MXN;
      }
      
      if (rate) {
        const roundedRate = Math.round(rate * 10000) / 10000;
        updateSetting('exchangeRate', roundedRate);
        setSyncMessage({
          text: t('settings.exchangeRateSyncSuccess', { rate: roundedRate.toFixed(2) }),
          type: 'success'
        });
      } else {
        setSyncMessage({
          text: t('settings.exchangeRateSyncError'),
          type: 'error'
        });
      }
    } catch (error) {
      console.error('Error syncing exchange rate:', error);
      setSyncMessage({
        text: t('settings.exchangeRateSyncError'),
        type: 'error'
      });
    } finally {
      setIsSyncing(false);
    }
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
              title={t('header.sysNotifications')}
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
                        <p className="notification-text" style={n.unread ? { fontWeight: 600 } : {}}>{t(n.textKey)}</p>
                        <span className="notification-time">{t(n.timeKey)}</span>
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
        <div className="modal-overlay" onClick={() => setShowSettingsModal(false)}>
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
                <div className="settings-options-row">
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
                    className={`settings-option-btn ${settings.theme === 'system' ? 'active' : ''}`}
                    onClick={() => toggleSetting('theme', 'system')}
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
                    { id: 'orange', color: '#f97316', label: settings.language === 'en' ? 'Coral Orange' : 'Naranja Coral' }
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

              {/* Exchange Rate */}
              <div className="settings-item exchange-rate-settings" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span className="settings-item-label">{t('settings.exchangeRateLabel')}</span>
                  {!isAdmin && (
                    <span style={{ 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      gap: '4px', 
                      fontSize: '0.75rem', 
                      backgroundColor: 'rgba(239, 68, 68, 0.1)', 
                      color: 'var(--danger-color)', 
                      padding: '2px 8px', 
                      borderRadius: '12px',
                      fontWeight: 600
                    }}>
                      <Lock size={12} /> {settings.language === 'en' ? 'Locked' : 'Bloqueado'}
                    </span>
                  )}
                </div>
                <span className="settings-item-desc">{t('settings.exchangeRateDesc')}</span>
                
                {/* Manual input and base badge */}
                <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center', flex: 1, maxWidth: '140px' }}>
                    <span style={{ position: 'absolute', left: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>$</span>
                    <input
                      type="number"
                      step="0.01"
                      className="form-input"
                      style={{ paddingLeft: '24px', width: '100%', opacity: isAdmin ? 1 : 0.7 }}
                      value={settings.exchangeRate || 20}
                      disabled={!isAdmin}
                      onChange={(e) => toggleSetting('exchangeRate', parseFloat(e.target.value) || 20)}
                    />
                  </div>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>MXN</span>
                  
                  {/* Sync button for Admins */}
                  {isAdmin && (
                    <button 
                      className={`btn btn-secondary ${isSyncing ? 'loading' : ''}`}
                      style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: '6px', 
                        fontSize: '0.8rem', 
                        padding: '6px 12px',
                        height: '38px',
                        borderRadius: '6px',
                        cursor: 'pointer'
                      }}
                      onClick={handleSyncExchangeRate}
                      disabled={isSyncing}
                    >
                      <Globe size={14} className={isSyncing ? 'animate-spin' : ''} />
                      {isSyncing ? t('settings.exchangeRateSyncing') : t('settings.exchangeRateSyncBtn')}
                    </button>
                  )}
                </div>

                {/* API Endpoint configuration - only for Admins */}
                {isAdmin && (
                  <div style={{ marginTop: '12px', borderLeft: '3px solid var(--primary-color)', paddingLeft: '10px' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block' }}>
                      {t('settings.exchangeRateApiLabel')}
                    </span>
                    <input
                      type="text"
                      className="form-input"
                      style={{ fontSize: '0.75rem', padding: '6px 10px', marginTop: '4px', width: '100%' }}
                      placeholder="https://..."
                      value={settings.exchangeRateApiUrl || 'https://open.er-api.com/v6/latest/USD'}
                      onChange={(e) => toggleSetting('exchangeRateApiUrl', e.target.value)}
                    />
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', display: 'block', marginTop: '2px' }}>
                      {t('settings.exchangeRateApiDesc')}
                    </span>
                  </div>
                )}

                {/* Only Admin Warning Info Badge for Operator */}
                {!isAdmin && (
                  <div style={{ 
                    marginTop: '10px', 
                    padding: '8px 12px', 
                    borderRadius: '6px', 
                    backgroundColor: 'rgba(249, 115, 22, 0.08)', 
                    borderLeft: '3px solid #f97316',
                    fontSize: '0.75rem',
                    color: 'var(--text-secondary)'
                  }}>
                    {t('settings.exchangeRateOnlyAdmin')}
                  </div>
                )}

                {/* Synchronization Success/Error Alert feedback */}
                {syncMessage && (
                  <div style={{ 
                    marginTop: '8px', 
                    padding: '8px 12px', 
                    borderRadius: '6px', 
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    backgroundColor: syncMessage.type === 'success' ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                    borderLeft: `3px solid ${syncMessage.type === 'success' ? 'var(--primary-color)' : 'var(--danger-color)'}`,
                    color: syncMessage.type === 'success' ? 'var(--primary-color)' : 'var(--danger-color)'
                  }}>
                    {syncMessage.text}
                  </div>
                )}

                {/* Reference Outbound Official Links */}
                <div style={{ marginTop: '12px', fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontWeight: 600 }}>{t('settings.exchangeRateVerify')}</span>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <a 
                      href="https://www.dof.gob.mx/" 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      style={{ color: 'var(--primary-color)', display: 'inline-flex', alignItems: 'center', gap: '2px', textDecoration: 'none' }}
                      className="hover-underline"
                    >
                      DOF <ExternalLink size={10} />
                    </a>
                    <span style={{ color: 'var(--border-color)' }}>|</span>
                    <a 
                      href="https://www.banxico.org.mx/" 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      style={{ color: 'var(--primary-color)', display: 'inline-flex', alignItems: 'center', gap: '2px', textDecoration: 'none' }}
                      className="hover-underline"
                    >
                      Banxico <ExternalLink size={10} />
                    </a>
                    <span style={{ color: 'var(--border-color)' }}>|</span>
                    <a 
                      href="https://www.google.com/finance/quote/USD-MXN" 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      style={{ color: 'var(--primary-color)', display: 'inline-flex', alignItems: 'center', gap: '2px', textDecoration: 'none' }}
                      className="hover-underline"
                    >
                      Google Finance <ExternalLink size={10} />
                    </a>
                  </div>
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

