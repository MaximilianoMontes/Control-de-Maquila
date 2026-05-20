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
    'dash.noOrders': 'No hay órdenes registradas aún.',

    // Maquileros
    'maq.title': 'Maquileros y Talleres',
    'maq.new': 'Nuevo Maquilero',
    'maq.search': 'Buscar por nombre, teléfono o colonia...',
    'maq.photo': 'Foto',
    'maq.id': 'ID',
    'maq.name': 'Nombre',
    'maq.phone': 'Teléfono',
    'maq.colonia': 'Colonia',
    'maq.actions': 'Acciones',
    'maq.noResults': 'No hay maquileros que coincidan con la búsqueda',

    // Inventario
    'inv.title': 'Inventario General',
    'inv.kpiModels': 'Modelos Diferentes',
    'inv.kpiTotal': 'Total Piezas en Stock',
    'inv.kpiValue': 'Valor Total Estimado',
    'inv.search': 'Buscar por modelo, cliente u orden...',
    'inv.image': 'IMAGEN',
    'inv.code': 'CODIGO / MODELO',
    'inv.colors': 'VARIANTES DE COLOR',
    'inv.client': 'CLIENTE',
    'inv.orderNo': 'NO. ORDEN',
    'inv.price': 'PRECIO UNIT.',
    'inv.stock': 'STOCK TERMINADO',
    'inv.total': 'VALOR TOTAL',
    'inv.date': 'FECHA INGRESO',
    'inv.actions': 'ACCIONES',
    'inv.noResults': 'No hay registros en inventario',
    'inv.emptyDesc': 'Los cortes se pasarán automáticamente aquí una vez que su orden de producción sea marcada como Terminada y esté 100% Pagada.',

    // Cortes
    'cortes.title': 'Cortes Disponibles',
    'cortes.import': 'Importar Excel',
    'cortes.new': 'Nuevo Ingreso',
    'cortes.search': 'Buscar por modelo, cliente u orden...',
    'cortes.image': 'IMAGEN',
    'cortes.code': 'CÓDIGO DEL PRODUCTO',
    'cortes.status': 'ESTADO',
    'cortes.colors': 'COLORES',
    'cortes.client': 'CLIENTE',
    'cortes.orderNo': 'NO. ORDEN',
    'cortes.price': 'PRECIO',
    'cortes.pieces': 'PIEZAS',
    'cortes.total': 'TOTAL',
    'cortes.actions': 'ACCIONES',
    'cortes.noResults': 'No hay cortes registrados',
    'cortes.assigned': 'Asignado',
    'cortes.available': 'Disponible',
    'cortes.reprogrammed': 'REPROGRAMADO',

    // Historial
    'hist.title': 'Historial de Actividad',
    'hist.search': 'Buscar por usuario o acción...',
    'hist.date': 'Fecha y Hora',
    'hist.user': 'Usuario',
    'hist.action': 'Acción',
    'hist.module': 'Módulo',
    'hist.detail': 'Detalle del Cambio',
    'hist.loading': 'Cargando registros...',
    'hist.noResults': 'No se encontraron registros de actividad',

    // Reportes
    'rep.title': 'Generación de Reportes PDF',
    'rep.download': 'Descargar PDF',
    'rep.cleanDates': 'Limpiar fechas',
    'rep.prodTitle': 'Producción Terminada',
    'rep.prodDesc': 'Genera un reporte en PDF de todas las órdenes de producción que han sido marcadas como terminadas o filtra por una fecha específica.',
    'rep.from': 'Desde',
    'rep.to': 'Hasta',
    'rep.invTitle': 'Estatus de Inventario',
    'inv.statusFilter': 'Filtrar por estado',
    'rep.invDesc': 'Obtén el registro general de tu almacén. Selecciona el tipo de productos que deseas incluir en el reporte.',
    'rep.recTitle': 'Pre-Reporte de Recolección',
    'rep.recDesc': 'Obtén la lista consolidada de las piezas a recolectar pendientes de maquileros, agrupadas por modelo y color para facilitar la recolección.',
    'rep.payTitle': 'Reporte de Pagos',
    'rep.payDesc': 'Genera un reporte financiero detallando todos los pagos y abonos realizados a los maquileros durante un período de tiempo.',
    'rep.allProd': 'Todos los productos',
    'rep.onlyAssigned': 'Solo Asignados (En Producción)',
    'rep.onlyAvailable': 'Solo Disponibles (Sin Asignar)',
    'rep.recMerc': 'Recolección de Mercancía',
    'rep.recDesc2': 'Genera el reporte de los productos que se deben recoger en una fecha específica.',
    'rep.recDate': 'Fecha de Recolección (Exacta)',
    'rep.recRange': '¿Deseas buscar por un rango de fechas?',
    'rep.recUntil': 'Hasta el día (Final del rango)',
    'rep.recBtn': 'Generar Reporte de Recolección',
    'rep.payBtn': 'Descargar Reporte de Pagos',

    // Pagos
    'pay.title': 'Generar Pago',
    'pay.selectOrder': 'Seleccionar Orden',
    'pay.chooseOrder': '-- Elige una orden --',
    'pay.order': 'Orden',
    'pay.totalCost': 'Costo Total de Orden:',
    'pay.alreadyPaid': 'Ya Pagado:',
    'pay.pendingFines': 'Multas Pendientes:',
    'pay.netToPay': 'A Pagar (Neto):',
    'pay.paymentType': 'Tipo de Pago',
    'pay.deposit': 'Abono',
    'pay.full': 'Pago Completo (Liquidación)',
    'pay.amount': 'Monto a Entregar ($)',
    'pay.suggested': 'Sugerido:',
    'pay.register': 'Registrar Pago',
    'pay.histTitle': 'Historial de Pagos de la Orden',
    'pay.selectSee': 'Selecciona una orden para ver los pagos.',
    'pay.payId': 'ID Pago',
    'pay.date': 'Fecha',
    'pay.type': 'Tipo',
    'pay.amount2': 'Monto',
    'pay.action': 'Acción',
    'pay.noPays': 'Aún no hay abonos registrados para esta orden.',
    'pay.discountTitle': 'Descuento Personal',
    'pay.chooseTailor': 'Elegir Maquilero',
    'pay.chooseSelect': '-- Seleccionar --',
    'pay.model': 'Modelo / Producto',
    'pay.reason': 'Motivo del Error / Hallazgo',
    'pay.reasonPlaceholder': 'Describe el error encontrado...',
    'pay.badPieces': 'Piezas Malas',
    'pay.totalAmount': 'Monto Total ($)',
    'pay.registerDiscount': 'Registrar Descuento',
    'pay.discountHistory': 'Historial de Descuentos Personales',
    'pay.selectTailorSee': 'Selecciona un maquilero para ver su historial de multas acumuladas.',
    'pay.discModel': 'Modelo',
    'pay.discReason': 'Motivo',
    'pay.discPieces': 'Piezas',
    'pay.discAmount': 'Monto',
    'pay.discStatus': 'Estado',
    'pay.discCharged': 'Cobrado',
    'pay.discPending': 'Pendiente',
    'pay.discNone': 'Este maquilero no tiene descuentos registrados.',

    // Produccion
    'prod.title': 'Control de Producción',
    'prod.new': 'Nueva Orden',
    'prod.search': 'Buscar por modelo, maquilero u orden...',
    'prod.folio': 'FOLIO',
    'prod.model': 'MODELO',
    'prod.tailor': 'MAQUILERO',
    'prod.pieces': 'PIEZAS',
    'prod.startDate': 'FECHA INICIO',
    'prod.endDate': 'FECHA FIN',
    'prod.status': 'ESTADO',
    'prod.paid': 'PAGADO',
    'prod.actions': 'ACCIONES',
    'prod.noResults': 'No hay órdenes de producción',
    'prod.statusInProgress': 'EN PROCESO',
    'prod.statusFinished': 'TERMINADO'
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
    'dash.noOrders': 'No registered orders yet.',

    // Maquileros
    'maq.title': 'Tailors & Workshops',
    'maq.new': 'New Tailor',
    'maq.search': 'Search by name, phone or neighborhood...',
    'maq.photo': 'Photo',
    'maq.id': 'ID',
    'maq.name': 'Name',
    'maq.phone': 'Phone',
    'maq.colonia': 'Neighborhood',
    'maq.actions': 'Actions',
    'maq.noResults': 'No tailors match your search',

    // Inventario
    'inv.title': 'General Inventory',
    'inv.kpiModels': 'Different Models',
    'inv.kpiTotal': 'Total Stock Items',
    'inv.kpiValue': 'Total Estimated Value',
    'inv.search': 'Search by model, client or order...',
    'inv.image': 'IMAGE',
    'inv.code': 'CODE / MODEL',
    'inv.colors': 'COLOR VARIANTS',
    'inv.client': 'CLIENT',
    'inv.orderNo': 'ORDER NO.',
    'inv.price': 'UNIT PRICE',
    'inv.stock': 'FINISHED STOCK',
    'inv.total': 'TOTAL VALUE',
    'inv.date': 'ENTRY DATE',
    'inv.actions': 'ACTIONS',
    'inv.noResults': 'No inventory records found',
    'inv.emptyDesc': 'Cuts will automatically move here once their production order is marked as Finished and is 100% Paid.',

    // Cortes
    'cortes.title': 'Available Cuts',
    'cortes.import': 'Import Excel',
    'cortes.new': 'New Entry',
    'cortes.search': 'Search by model, client or order...',
    'cortes.image': 'IMAGE',
    'cortes.code': 'PRODUCT CODE',
    'cortes.status': 'STATUS',
    'cortes.colors': 'COLORS',
    'cortes.client': 'CLIENT',
    'cortes.orderNo': 'ORDER NO.',
    'cortes.price': 'PRICE',
    'cortes.pieces': 'PIECES',
    'cortes.total': 'TOTAL',
    'cortes.actions': 'ACTIONS',
    'cortes.noResults': 'No cuts registered',
    'cortes.assigned': 'Assigned',
    'cortes.available': 'Available',
    'cortes.reprogrammed': 'REPROGRAMMED',

    // Historial
    'hist.title': 'Activity History',
    'hist.search': 'Search by user or action...',
    'hist.date': 'Date & Time',
    'hist.user': 'User',
    'hist.action': 'Action',
    'hist.module': 'Module',
    'hist.detail': 'Change Detail',
    'hist.loading': 'Loading records...',
    'hist.noResults': 'No activity records found',

    // Reportes
    'rep.title': 'PDF Report Generation',
    'rep.download': 'Download PDF',
    'rep.cleanDates': 'Clear dates',
    'rep.prodTitle': 'Finished Production',
    'rep.prodDesc': 'Generate a PDF report of all production orders marked as finished or filter by a specific date.',
    'rep.from': 'From',
    'rep.to': 'To',
    'rep.invTitle': 'Inventory Status',
    'inv.statusFilter': 'Filter by status',
    'rep.invDesc': 'Get the general register of your warehouse. Select the type of products to include in the report.',
    'rep.recTitle': 'Recollection Pre-Report',
    'rep.recDesc': 'Get the consolidated list of pieces pending recollection from tailors, grouped by model and color for easy collection.',
    'rep.payTitle': 'Payments Report',
    'rep.payDesc': 'Generate a financial report detailing all payments and deposits made to tailors over a period of time.',
    'rep.allProd': 'All products',
    'rep.onlyAssigned': 'Assigned Only (In Production)',
    'rep.onlyAvailable': 'Available Only (Unassigned)',
    'rep.recMerc': 'Goods Recollection',
    'rep.recDesc2': 'Generate report for products to be collected on a specific date.',
    'rep.recDate': 'Recollection Date (Exact)',
    'rep.recRange': 'Do you want to search by date range?',
    'rep.recUntil': 'Until day (End of range)',
    'rep.recBtn': 'Generate Recollection Report',
    'rep.payBtn': 'Download Payments Report',

    // Pagos
    'pay.title': 'Generate Payment',
    'pay.selectOrder': 'Select Order',
    'pay.chooseOrder': '-- Choose an order --',
    'pay.order': 'Order',
    'pay.totalCost': 'Total Order Cost:',
    'pay.alreadyPaid': 'Already Paid:',
    'pay.pendingFines': 'Pending Fines:',
    'pay.netToPay': 'To Pay (Net):',
    'pay.paymentType': 'Payment Type',
    'pay.deposit': 'Partial Payment',
    'pay.full': 'Full Payment (Settlement)',
    'pay.amount': 'Amount to Deliver ($)',
    'pay.suggested': 'Suggested:',
    'pay.register': 'Register Payment',
    'pay.histTitle': 'Order Payment History',
    'pay.selectSee': 'Select an order to view payments.',
    'pay.payId': 'Pay ID',
    'pay.date': 'Date',
    'pay.type': 'Type',
    'pay.amount2': 'Amount',
    'pay.action': 'Action',
    'pay.noPays': 'No payments registered for this order yet.',
    'pay.discountTitle': 'Personal Discount',
    'pay.chooseTailor': 'Choose Tailor',
    'pay.chooseSelect': '-- Select --',
    'pay.model': 'Model / Product',
    'pay.reason': 'Error / Finding Reason',
    'pay.reasonPlaceholder': 'Describe the error found...',
    'pay.badPieces': 'Defective Pieces',
    'pay.totalAmount': 'Total Amount ($)',
    'pay.registerDiscount': 'Register Discount',
    'pay.discountHistory': 'Personal Discounts History',
    'pay.selectTailorSee': 'Select a tailor to view accumulated fines history.',
    'pay.discModel': 'Model',
    'pay.discReason': 'Reason',
    'pay.discPieces': 'Pieces',
    'pay.discAmount': 'Amount',
    'pay.discStatus': 'Status',
    'pay.discCharged': 'Charged',
    'pay.discPending': 'Pending',
    'pay.discNone': 'This tailor has no registered discounts.',

    // Produccion
    'prod.title': 'Production Control',
    'prod.new': 'New Order',
    'prod.search': 'Search by model, tailor or order...',
    'prod.folio': 'FOLIO',
    'prod.model': 'MODEL',
    'prod.tailor': 'TAILOR',
    'prod.pieces': 'PIECES',
    'prod.startDate': 'START DATE',
    'prod.endDate': 'END DATE',
    'prod.status': 'STATUS',
    'prod.paid': 'PAID',
    'prod.actions': 'ACTIONS',
    'prod.noResults': 'No production orders found',
    'prod.statusInProgress': 'IN PROGRESS',
    'prod.statusFinished': 'FINISHED'
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
