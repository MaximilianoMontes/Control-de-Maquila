import { createContext, useState, useContext, useEffect } from 'react';

const SettingsContext = createContext();

const translations = {
  es: {
    // Sidebar
    'nav.dashboard': 'Dashboard',
    'nav.maquileros': 'Maquileros',
    'nav.inventario': 'Inventario',
    'nav.cortes': 'Cortes',
    'nav.produccion': 'Producción',
    'nav.reportes': 'Reportes',
    'nav.pagos': 'Pagos',
    'nav.historial': 'Historial',
    'nav.logout': 'Cerrar Sesión',

    // Header
    'header.search': 'Buscar comando...',
    'header.notifications': 'Notificaciones',
    'header.readAll': 'Leer todo',
    'header.clear': 'Limpiar',
    'header.noNotifications': 'No tienes notificaciones pendientes.',
    'header.help': 'Ayuda',
    'header.helpCenter': 'Centro de Ayuda',
    'header.userManual': 'Manual de Usuario',
    'header.productionFlow': 'Flujo de Producción',
    'header.inventoryControl': 'Control de Inventario',
    'header.tailorGuide': 'Guía de Maquileros',
    'header.cutsDesign': 'Cortes y Diseño',
    'header.paymentsAcum': 'Pagos y Abonos',
    'header.profileGuide': 'Mi Perfil e Instructivo',
    'header.settings': 'Configuración',
    'header.logout': 'Cerrar Sesión',
    'header.commandPaletteTitle': 'Comandos y Navegación',
    'header.commandPalettePlaceholder': 'Escribe el nombre del módulo para navegar...',
    'header.commandPaletteNoResults': 'No se encontraron comandos para "{query}"',

    // Settings Modal
    'settings.title': 'Configuración del Sistema',
    'settings.densityLabel': 'Densidad de la Interfaz',
    'settings.densityDesc': 'Ajusta el espaciado de las tablas y los componentes para mayor comodidad.',
    'settings.densityNormal': 'Normal',
    'settings.densityCompact': 'Compacta',
    'settings.alertsLabel': 'Alertas de Actividad',
    'settings.alertsDesc': 'Habilita o deshabilita las ventanas emergentes de actividad en tiempo real.',
    'settings.alertsEnabled': 'Habilitadas',
    'settings.alertsDisabled': 'Deshabilitadas',
    'settings.languageLabel': 'Idioma del Sistema',
    'settings.languageDesc': 'Idioma de traducción preferido para los controles del ERP.',
    'settings.save': 'Listo, Guardar Cambios',

    // Dashboard
    'dash.loading': 'Cargando datos del sistema...',
    'dash.activeTailors': 'Maquileros Activos',
    'dash.piecesInventory': 'Piezas en Inventario',
    'dash.ordersProcess': 'Órdenes en Proceso',
    'dash.totalPaid': 'Total Pagado (Acumulado)',
    'dash.productionOrders': 'Órdenes de Producción',
    'dash.folio': 'Folio',
    'dash.tailor': 'Maquilero',
    'dash.startDate': 'Fecha Inicio',
    'dash.status': 'Estado',
    'dash.noOrders': 'No hay órdenes registradas aún.'
  },
  en: {
    // Sidebar
    'nav.dashboard': 'Dashboard',
    'nav.maquileros': 'Tailors',
    'nav.inventario': 'Inventory',
    'nav.cortes': 'Cuts',
    'nav.produccion': 'Production',
    'nav.reportes': 'Reports',
    'nav.pagos': 'Payments',
    'nav.historial': 'History',
    'nav.logout': 'Log Out',

    // Header
    'header.search': 'Search command...',
    'header.notifications': 'Notifications',
    'header.readAll': 'Mark all read',
    'header.clear': 'Clear',
    'header.noNotifications': 'You have no pending notifications.',
    'header.help': 'Help',
    'header.helpCenter': 'Help Center',
    'header.userManual': 'User Manual',
    'header.productionFlow': 'Production Flow',
    'header.inventoryControl': 'Inventory Control',
    'header.tailorGuide': 'Tailor Guide',
    'header.cutsDesign': 'Cuts & Design',
    'header.paymentsAcum': 'Payments & Deposits',
    'header.profileGuide': 'My Profile & Guide',
    'header.settings': 'Settings',
    'header.logout': 'Log Out',
    'header.commandPaletteTitle': 'Commands & Navigation',
    'header.commandPalettePlaceholder': 'Type module name to navigate...',
    'header.commandPaletteNoResults': 'No commands found for "{query}"',

    // Settings Modal
    'settings.title': 'System Settings',
    'settings.densityLabel': 'Interface Density',
    'settings.densityDesc': 'Adjust spacing of tables and components for comfort.',
    'settings.densityNormal': 'Normal',
    'settings.densityCompact': 'Compact',
    'settings.alertsLabel': 'Activity Alerts',
    'settings.alertsDesc': 'Enable or disable real-time activity popups.',
    'settings.alertsEnabled': 'Enabled',
    'settings.alertsDisabled': 'Disabled',
    'settings.languageLabel': 'System Language',
    'settings.languageDesc': 'Preferred translation language for ERP controls.',
    'settings.save': 'Done, Save Changes',

    // Dashboard
    'dash.loading': 'Loading system data...',
    'dash.activeTailors': 'Active Tailors',
    'dash.piecesInventory': 'Items in Inventory',
    'dash.ordersProcess': 'Orders in Process',
    'dash.totalPaid': 'Total Paid (Accumulated)',
    'dash.productionOrders': 'Production Orders',
    'dash.folio': 'Folio',
    'dash.tailor': 'Tailor',
    'dash.startDate': 'Start Date',
    'dash.status': 'Status',
    'dash.noOrders': 'No registered orders yet.'
  }
};

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('system_settings');
    return saved ? JSON.parse(saved) : {
      density: 'normal',
      alerts: 'enabled',
      language: 'es'
    };
  });

  useEffect(() => {
    localStorage.setItem('system_settings', JSON.stringify(settings));
    
    // Apply density class to body
    if (settings.density === 'compact') {
      document.body.classList.add('compact-mode');
    } else {
      document.body.classList.remove('compact-mode');
    }
  }, [settings]);

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const t = (key, replacements = {}) => {
    const lang = settings.language || 'es';
    let text = translations[lang]?.[key] || translations['es']?.[key] || key;
    
    Object.keys(replacements).forEach(placeholder => {
      text = text.replace(`{${placeholder}}`, replacements[placeholder]);
    });
    
    return text;
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSetting, t }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => useContext(SettingsContext);
