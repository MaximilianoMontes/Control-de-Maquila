import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSettings } from '../context/SettingsContext';
import { 
  BookOpen, 
  Users, 
  Package, 
  Scissors, 
  Factory, 
  Wallet, 
  ChevronDown, 
  HelpCircle, 
  Search, 
  Lightbulb, 
  ArrowRight,
  TrendingUp,
  CheckCircle2,
  FileText
} from 'lucide-react';

const guides_es = {
  general: [
    {
      title: '¿Cómo funciona el flujo completo del sistema?',
      content: (
        <div>
          <p>El sistema Maquila ERP está diseñado para llevar el control absoluto de tus procesos de confección, desde que ingresa la materia prima hasta que se paga al maquilero. El flujo se divide en 4 grandes etapas:</p>
          
          <div className="workflow-container" style={{ marginTop: '15px' }}>
            <div className="workflow-title">Flujo de Trabajo del Software</div>
            <div className="workflow-steps-flex">
              <div className="workflow-step-box">
                <span className="workflow-step-num">1</span>
                <div className="workflow-step-name">Inventario</div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Ingreso de Rollos de Tela</span>
              </div>
              <div className="workflow-step-arrow"><ArrowRight size={16} /></div>
              <div className="workflow-step-box">
                <span className="workflow-step-num">2</span>
                <div className="workflow-step-name">Cortes</div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Diseño y Desglose de Rollos</span>
              </div>
              <div className="workflow-step-arrow"><ArrowRight size={16} /></div>
              <div className="workflow-step-box">
                <span className="workflow-step-num">3</span>
                <div className="workflow-step-name">Producción</div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Asignación y Confección</span>
              </div>
              <div className="workflow-step-arrow"><ArrowRight size={16} /></div>
              <div className="workflow-step-box">
                <span className="workflow-step-num">4</span>
                <div className="workflow-step-name">Nómina y Pagos</div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Abonos y Liquidación</span>
              </div>
            </div>
          </div>
          
          <ol>
            <li><strong>Registro de Rollos:</strong> Se introduce la tela disponible en el menú de <strong>Inventario</strong> indicando yardas, tipo de tela, color y costo.</li>
            <li><strong>Generación de Cortes:</strong> En la sección de <strong>Cortes</strong>, se selecciona un rollo del inventario y se desglosa cuántas piezas (ej: Playeras, Pantalones) saldrán del mismo. El rollo descuenta yardas automáticamente.</li>
            <li><strong>Asignación de Producción:</strong> En <strong>Producción</strong> se asignan esas piezas cortadas a un Maquilero específico. El estado se controla desde "Pendiente" hasta "Terminado".</li>
            <li><strong>Nómina y Saldos:</strong> Al terminar un trabajo, el sistema genera automáticamente una deuda a favor del maquilero en la sección de <strong>Pagos</strong>, donde podrás abonarle en efectivo o transferencia.</li>
          </ol>
        </div>
      ),
      keywords: 'flujo completo general etapas software maquila procesos de confeccion'
    },
    {
      title: 'Roles de usuario y accesos permitidos',
      content: (
        <div>
          <p>El sistema cuenta con niveles de seguridad basados en roles para proteger la información financiera:</p>
          <ul>
            <li><strong>Admin (Administrador):</strong> Acceso total sin restricciones a todos los módulos, incluyendo la edición/eliminación de datos, visualización del historial completo de auditoría, reportes financieros y control de nómina/pagos.</li>
            <li><strong>Producción (produccion1, produccion2):</strong> Tienen permitido gestionar maquileros, inventario, cortes y registrar el progreso de producción. Tienen acceso a la pestaña de pagos y nómina para llevar el control de abonos en el taller.</li>
            <li><strong>Operadores generales:</strong> Pueden visualizar inventarios y estatus de producción pero con restricciones de eliminación y edición de flujos monetarios directos para resguardar la seguridad del negocio.</li>
          </ul>
        </div>
      ),
      keywords: 'roles administrador produccion operario permisos seguridad accesos admin'
    }
  ],
  maquileros: [
    {
      title: '¿Cómo agregar un nuevo maquilero al sistema?',
      content: (
        <div>
          <p>Sigue estos pasos sencillos para dar de alta a un trabajador de maquila:</p>
          <ol>
            <li>Dirígete a la sección de <strong>Maquileros</strong> en el menú lateral.</li>
            <li>Haz clic en el botón azul superior <strong>+ Nuevo Maquilero</strong>.</li>
            <li>Completa el formulario con los siguientes campos requeridos:
              <ul>
                <li><strong>Nombre Completo:</strong> Nombre del maquilero o del taller externo.</li>
                <li><strong>Contacto / Teléfono:</strong> Para comunicación directa.</li>
                <li><strong>Tarifa Base por Pieza:</strong> La tarifa por defecto que se le pagará por confeccionar cada pieza (este valor se usará de forma predeterminada, pero se puede personalizar en cada orden de producción).</li>
              </ul>
            </li>
            <li>Presiona <strong>Guardar Maquilero</strong>. ¡Listo! El maquilero estará activo inmediatamente para recibir asignaciones en Producción.</li>
          </ol>
          <div className="step-alert">
            <strong>💡 Consejo:</strong> Asegúrate de ingresar un teléfono de contacto correcto para poder coordinar las entregas y retiros de prendas eficientemente.
          </div>
        </div>
      ),
      keywords: 'agregar nuevo maquilero crear alta registrar tarifa base telefono'
    },
    {
      title: 'Entender el perfil y reporte de desempeño del maquilero',
      content: (
        <div>
          <p>Cada maquilero cuenta con una hoja de perfil dedicada para auditar su efectividad:</p>
          <ul>
            <li>Haz clic en la fila de cualquier maquilero en la tabla principal para abrir su <strong>Perfil de Desempeño</strong>.</li>
            <li><strong>Métricas Clave del Perfil:</strong>
              <ul>
                <li><strong>Eficiencia de Entrega:</strong> Porcentaje de órdenes terminadas a tiempo vs órdenes retrasadas.</li>
                <li><strong>Total de Piezas Confeccionadas:</strong> Acumulado histórico de prendas entregadas con éxito.</li>
                <li><strong>Balance de Deuda:</strong> Saldo pendiente por pagarle. Se actualiza en tiempo real al finalizar órdenes y registrar abonos.</li>
              </ul>
            </li>
            <li><strong>Gráfica de Desempeño:</strong> Muestra de forma visual cuántas prendas ha terminado mes con mes para medir la capacidad productiva del taller.</li>
          </ul>
        </div>
      ),
      keywords: 'perfil desempeño eficiencia entrega piezas confeccionadas balance deuda graficas'
    }
  ],
  inventario: [
    {
      title: 'Registrar un nuevo Rollo de Tela',
      content: (
        <div>
          <p>La tela es el punto de partida de toda la operación. Para ingresar nuevos rollos:</p>
          <ol>
            <li>Ingresa a la sección de <strong>Inventario</strong> en el menú lateral.</li>
            <li>Haz clic en el botón superior <strong>+ Registrar Rollo</strong>.</li>
            <li>Proporciona los datos del rollo:
              <ul>
                <li><strong>Código de Barras/Identificador:</strong> Un código único para el rollo (ej: ROLLO-MEZ-01).</li>
                <li><strong>Tipo de Tela:</strong> Ej: Mezclilla, Algodón, Licra, Chifón.</li>
                <li><strong>Color:</strong> Color específico del textil.</li>
                <li><strong>Yardas Iniciales:</strong> Longitud total del rollo al llegar del proveedor.</li>
                <li><strong>Costo por Yarda:</strong> Precio de compra unitario (ayuda a calcular los costos de fabricación automáticamente).</li>
              </ul>
            </li>
            <li>Haz clic en <strong>Guardar Rollo</strong>.</li>
          </ol>
          <div className="step-alert">
            <strong>💡 Importante:</strong> El sistema descontará yardas de este rollo cada vez que crees un <strong>Corte</strong> asociado. Si el rollo se queda sin yardas disponibles, se marcará automáticamente como agotado.
          </div>
        </div>
      ),
      keywords: 'registrar nuevo rollo tela yardas codigo color costo guardar rollo'
    },
    {
      title: 'Gestionar el consumo de tela y retazos',
      content: (
        <div>
          <p>El sistema lleva un control milimétrico del rendimiento de la tela:</p>
          <ul>
            <li><strong>Consumo en Cortes:</strong> Al crear un corte, especificas cuántas yardas se utilizaron. El sistema resta ese valor del total del rollo.</li>
            <li><strong>Administrar Retazos:</strong> Si de un rollo queda un tramo pequeño que no completa una prenda completa pero es utilizable, el sistema permite registrarlo como retazo.</li>
            <li><strong>Agotado Automático:</strong> Cuando el saldo de yardas disponibles en un rollo llega a 0, el rollo cambia su estatus a <strong>Agotado</strong> y ya no se mostrará como opción seleccionable para nuevos cortes, evitando errores operativos.</li>
          </ul>
        </div>
      ),
      keywords: 'consumo tela retazos yardas sobrantes agotado automatico'
    }
  ],
  cortes: [
    {
      title: '¿Cómo crear y registrar un nuevo Corte?',
      content: (
        <div>
          <p>El módulo de cortes asocia la materia prima con los diseños de prendas a fabricar. Pasos para realizar un corte:</p>
          <ol>
            <li>Dirígete a la sección de <strong>Cortes</strong>.</li>
            <li>Haz clic en <strong>+ Nuevo Corte</strong>.</li>
            <li>Selecciona el <strong>Rollo de Tela</strong> del cual vas a recortar las piezas. El sistema te mostrará cuántas yardas libres tiene ese rollo.</li>
            <li>Introduce los detalles específicos del corte:
              <ul>
                <li><strong>Diseño / Modelo:</strong> Ej: Playera Polo Caballero, Jeans Slim Fit.</li>
                <li><strong>Yardas Utilizadas:</strong> Cantidad exacta de tela consumida en el tendido y corte.</li>
                <li><strong>Total de Piezas Resultantes:</strong> La cantidad de prendas físicas listas para coser que salieron del corte.</li>
              </ul>
            </li>
            <li>Presiona <strong>Registrar Corte</strong>. En este momento, las yardas se descuentan del rollo de tela, y las piezas resultantes quedan en la lista de espera para ser asignadas a un maquilero en Producción.</li>
          </ol>
        </div>
      ),
      keywords: 'crear registrar nuevo corte modelo diseño yardas piezas resultantes'
    },
    {
      title: 'Estados de un Corte y Asignación',
      content: (
        <div>
          <p>Los cortes pasan por dos estados clave:</p>
          <ul>
            <li><span className="badge badge-info">Disponible:</span> El corte ha sido registrado y sus piezas están en el taller listas para ser enviadas a costura. En el menú de asignación de producción, solo verás los cortes que estén en este estado.</li>
            <li><span className="badge badge-success">Asignado:</span> El corte ya fue entregado a un maquilero y está actualmente en proceso de confección. Una vez asignado, se oculta de la lista de selección de nuevos trabajos para evitar doble asignación accidental.</li>
          </ul>
        </div>
      ),
      keywords: 'estados corte disponible asignado produccion piezas costura'
    }
  ],
  produccion: [
    {
      title: 'Asignar una Orden de Producción a un Maquilero',
      content: (
        <div>
          <p>Una vez que tienes piezas cortadas, es hora de enviarlas a confeccionar:</p>
          <ol>
            <li>Ingresa a la sección de <strong>Producción</strong>.</li>
            <li>Haz clic en <strong>+ Nueva Orden de Producción</strong>.</li>
            <li>Selecciona el <strong>Maquilero</strong> que realizará el trabajo.</li>
            <li>Selecciona el <strong>Corte Disponible</strong>. El sistema llenará automáticamente los campos de cantidad de piezas y tarifa base cargados previamente.</li>
            <li>Personaliza si es necesario:
              <ul>
                <li><strong>Tarifa Específica:</strong> Puedes subir o bajar el costo de pago por pieza para esta orden en particular (ej: si es una prenda más compleja de lo normal).</li>
                <li><strong>Fecha de Entrega Prometida:</strong> Para medir la puntualidad del maquilero.</li>
              </ul>
            </li>
            <li>Presiona <strong>Asignar Orden</strong>. El estatus inicial será <span className="badge badge-warning">En Proceso</span>.</li>
          </ol>
        </div>
      ),
      keywords: 'asignar orden produccion maquilero corte disponible tarifa especifica fecha entrega'
    },
    {
      title: 'Control de Estados y Lógica de Archivado Automático',
      content: (
        <div>
          <p>Las órdenes de producción tienen un ciclo de vida controlado. La transición de estados es muy sencilla:</p>
          <ol>
            <li><strong>En Proceso:</strong> El maquilero tiene el material en su taller y lo está trabajando.</li>
            <li><strong>Terminado (Entrega):</strong> Cuando el maquilero regresa las prendas cosidas, buscas la orden en la tabla de producción y haces clic en <strong>Finalizar Orden</strong>.
              <ul>
                <li>Introduce la cantidad de piezas recibidas en buen estado.</li>
                <li>El sistema calcula el <strong>Monto Total a Pagar</strong> (Piezas recibidas × Tarifa de la orden).</li>
                <li>Este monto se suma automáticamente a la deuda a favor del maquilero en la sección de nómina.</li>
              </ul>
            </li>
          </ol>
          <div className="step-alert" style={{ borderLeftColor: 'var(--success-color)', background: 'rgba(16, 185, 129, 0.05)' }}>
            <strong>⚡ Lógica de Archivado Automático:</strong> Para mantener tu pantalla de producción limpia y ágil, el sistema cuenta con un archivado automático inmediato. Tan pronto como una orden es marcada como <strong>Terminado</strong> y su saldo queda <strong>Completamente Pagado</strong>, la orden se mueve inmediatamente al módulo de <strong>Historial</strong> de forma definitiva, liberando espacio en tu panel de control de producción del día a día.
          </div>
        </div>
      ),
      keywords: 'control estados en proceso terminado finalizado orden archivado automatico inmediato'
    }
  ],
  pagos: [
    {
      title: 'Registrar un Pago o Abono a un Maquilero',
      content: (
        <div>
          <p>El control financiero es crucial. Para liquidar las deudas de nómina de tus maquileros:</p>
          <ol>
            <li>Ingresa a la sección de <strong>Pagos</strong> en el menú lateral.</li>
            <li>Verás la lista de maquileros con su deuda acumulada en tiempo real.</li>
            <li>Haz clic en el botón <strong>Registrar Pago / Abono</strong> al lado del nombre del maquilero correspondiente.</li>
            <li>Completa los datos del abono:
              <ul>
                <li><strong>Monto a Pagar:</strong> La cantidad de dinero entregada.</li>
                <li><strong>Método de Pago:</strong> Selecciona entre <strong>Efectivo</strong> (caja del taller) o <strong>Depósito/Transferencia Bancaria</strong>.</li>
                <li><strong>Referencia:</strong> Si es depósito bancario, anota el número de folio o código de rastreo SPEI.</li>
              </ul>
            </li>
            <li>Haz clic en <strong>Confirmar Pago</strong>. El sistema descontará el monto del saldo total del maquilero al instante, actualizará su balance y guardará el comprobante digital en el historial.</li>
          </ol>
        </div>
      ),
      keywords: 'registrar pago abono maquilero metodo efectivo deposito transferencia saldo balance'
    },
    {
      title: 'Cálculo de Nómina y Saldo Acumulado',
      content: (
        <div>
          <p>¿Cómo se calcula el dinero exacto que se le debe a cada maquilero?</p>
          <p>El sistema utiliza una fórmula matemática transparente basada en eventos reales:</p>
          <div style={{ background: '#f1f5f9', padding: '12px 18px', borderRadius: '8px', fontFamily: 'monospace', fontSize: '0.85rem', margin: '10px 0', borderLeft: '3px solid var(--primary-color)' }}>
            Saldo Pendiente = (Suma de Órdenes Terminadas × Tarifa Pactada) - (Suma de Pagos y Abonos Registrados)
          </div>
          <ul>
            <li><strong>Órdenes en proceso:</strong> No generan saldo a pagar hasta que el maquilero entrega las prendas confeccionadas y son aprobadas en el sistema.</li>
            <li><strong>Auditoría de Cuenta:</strong> En la misma sección de pagos, puedes desplegar el estado de cuenta completo del maquilero para mostrarle el desglose transparente de qué órdenes se le están pagando y qué abonos ha recibido a la fecha.</li>
          </ul>
        </div>
      ),
      keywords: 'calculo nomina saldo acumulado formula estado de cuenta auditoria'
    }
  ]
};

const guides_en = {
  general: [
    {
      title: 'How does the complete system workflow work?',
      content: (
        <div>
          <p>The Maquila ERP system is designed to give you absolute control of your garment production processes, from the entry of raw materials to paying the tailors. The workflow is divided into 4 major stages:</p>
          
          <div className="workflow-container" style={{ marginTop: '15px' }}>
            <div className="workflow-title">Software Workflow</div>
            <div className="workflow-steps-flex">
              <div className="workflow-step-box">
                <span className="workflow-step-num">1</span>
                <div className="workflow-step-name">Inventory</div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Fabric Roll Entry</span>
              </div>
              <div className="workflow-step-arrow"><ArrowRight size={16} /></div>
              <div className="workflow-step-box">
                <span className="workflow-step-num">2</span>
                <div className="workflow-step-name">Cuts</div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Design & Roll Breakdown</span>
              </div>
              <div className="workflow-step-arrow"><ArrowRight size={16} /></div>
              <div className="workflow-step-box">
                <span className="workflow-step-num">3</span>
                <div className="workflow-step-name">Production</div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Assignment & Assembly</span>
              </div>
              <div className="workflow-step-arrow"><ArrowRight size={16} /></div>
              <div className="workflow-step-box">
                <span className="workflow-step-num">4</span>
                <div className="workflow-step-name">Payroll & Payments</div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Deposits & Settlement</span>
              </div>
            </div>
          </div>
          
          <ol>
            <li><strong>Register Rolls:</strong> Available fabric is entered in the <strong>Inventory</strong> menu, indicating yards, fabric type, color, and cost.</li>
            <li><strong>Generate Cuts:</strong> In the <strong>Cuts</strong> section, a fabric roll is selected from inventory and broken down into how many pieces (e.g., T-shirts, Pants) will be produced from it. Yards are deducted from the roll automatically.</li>
            <li><strong>Production Assignment:</strong> In <strong>Production</strong>, these cut pieces are assigned to a specific Tailor. The status is managed from "Pending" to "Finished".</li>
            <li><strong>Payroll and Balances:</strong> Upon completing a job, the system automatically generates a debt in favor of the tailor in the <strong>Payments</strong> section, where you can pay them via cash or transfer.</li>
          </ol>
        </div>
      ),
      keywords: 'complete workflow general stages software maquila garment processes'
    },
    {
      title: 'User roles and allowed access',
      content: (
        <div>
          <p>The system has role-based security levels to protect financial information:</p>
          <ul>
            <li><strong>Admin (Administrator):</strong> Total unrestricted access to all modules, including editing/deleting data, viewing the complete audit history, financial reports, and payroll/payment controls.</li>
            <li><strong>Production (produccion1, produccion2):</strong> Allowed to manage tailors, inventory, cuts, and register production progress. They have access to the payments and payroll tab to keep track of deposits in the workshop.</li>
            <li><strong>General Operators:</strong> Can view inventory and production status but with restrictions on deleting and editing direct monetary flows to safeguard the business.</li>
          </ul>
        </div>
      ),
      keywords: 'roles administrator production operator permissions security access admin'
    }
  ],
  maquileros: [
    {
      title: 'How to add a new tailor to the system?',
      content: (
        <div>
          <p>Follow these simple steps to register a new maquila worker:</p>
          <ol>
            <li>Go to the <strong>Tailors</strong> section in the sidebar menu.</li>
            <li>Click the blue top button <strong>+ New Tailor</strong>.</li>
            <li>Complete the form with the following required fields:
              <ul>
                <li><strong>Full Name:</strong> Name of the tailor or external workshop.</li>
                <li><strong>Contact / Phone:</strong> For direct communication.</li>
                <li><strong>Base Rate per Piece:</strong> The default rate to be paid for assembling each piece (this value will be used by default but can be customized in each production order).</li>
              </ul>
            </li>
            <li>Press <strong>Save Tailor</strong>. Done! The tailor will be active immediately to receive production assignments.</li>
          </ol>
          <div className="step-alert">
            <strong>💡 Tip:</strong> Make sure to enter a correct contact phone number to coordinate garment deliveries and pickups efficiently.
          </div>
        </div>
      ),
      keywords: 'add new tailor create register base rate phone number'
    },
    {
      title: "Understanding the tailor's profile and performance report",
      content: (
        <div>
          <p>Each tailor has a dedicated profile page to audit their effectiveness:</p>
          <ul>
            <li>Click on any tailor's row in the main table to open their <strong>Performance Profile</strong>.</li>
            <li><strong>Key Profile Metrics:</strong>
              <ul>
                <li><strong>Delivery Efficiency:</strong> Percentage of orders completed on time vs delayed orders.</li>
                <li><strong>Total Pieces Assembled:</strong> Historical accumulated total of successfully delivered garments.</li>
                <li><strong>Debt Balance:</strong> Pending balance to be paid to them. It updates in real time when completing orders and registering payments.</li>
              </ul>
            </li>
            <li><strong>Performance Graph:</strong> Visually displays how many garments they have completed month-by-month to measure the workshop's productive capacity.</li>
          </ul>
        </div>
      ),
      keywords: 'profile performance delivery efficiency pieces assembled debt balance graphs'
    }
  ],
  inventario: [
    {
      title: 'Register a new Fabric Roll',
      content: (
        <div>
          <p>Fabric is the starting point of the whole operation. To enter new rolls:</p>
          <ol>
            <li>Go to the <strong>Inventory</strong> section in the sidebar menu.</li>
            <li>Click the top button <strong>+ Register Roll</strong>.</li>
            <li>Provide the roll details:
              <ul>
                <li><strong>Barcode/Identifier:</strong> A unique code for the roll (e.g., ROLLO-MEZ-01).</li>
                <li><strong>Fabric Type:</strong> e.g., Denim, Cotton, Lycra, Chiffon.</li>
                <li><strong>Color:</strong> Specific color of the textile.</li>
                <li><strong>Initial Yards:</strong> Total length of the roll upon delivery from the supplier.</li>
                <li><strong>Cost per Yard:</strong> Unit purchase price (helps calculate manufacturing costs automatically).</li>
              </ul>
            </li>
            <li>Click <strong>Save Roll</strong>.</li>
          </ol>
          <div className="step-alert">
            <strong>⚠️ Important:</strong> The system will deduct yards from this roll every time you create an associated <strong>Cut</strong>. If the roll runs out of available yards, it will be automatically marked as out of stock.
          </div>
        </div>
      ),
      keywords: 'register new fabric roll yards barcode color cost save roll'
    },
    {
      title: 'Managing fabric consumption and scraps',
      content: (
        <div>
          <p>The system keeps a precise track of fabric yield:</p>
          <ul>
            <li><strong>Consumption in Cuts:</strong> When creating a cut, you specify how many yards were used. The system subtracts that value from the roll total.</li>
            <li><strong>Manage Scraps:</strong> If a small piece remains from a roll that doesn't make a full garment but is still usable, the system allows you to register it as scrap.</li>
            <li><strong>Automatic Out of Stock:</strong> When the balance of available yards in a roll reaches 0, the roll status changes to <strong>Out of Stock</strong> and will no longer appear as a selectable option for new cuts, preventing operational errors.</li>
          </ul>
        </div>
      ),
      keywords: 'fabric consumption scraps yards remaining automatic out of stock'
    }
  ],
  cortes: [
    {
      title: 'How to create and register a new Cut?',
      content: (
        <div>
          <p>The cuts module associates raw material with the garment designs to be manufactured. Steps to perform a cut:</p>
          <ol>
            <li>Go to the <strong>Cuts</strong> section.</li>
            <li>Click <strong>+ New Cut</strong>.</li>
            <li>Select the <strong>Fabric Roll</strong> from which you will cut the pieces. The system will show you how many free yards that roll has.</li>
            <li>Enter the specific details of the cut:
              <ul>
                <li><strong>Design / Model:</strong> e.g., Men's Polo Shirt, Slim Fit Jeans.</li>
                <li><strong>Yards Used:</strong> Exact amount of fabric consumed during spreading and cutting.</li>
                <li><strong>Total Resulting Pieces:</strong> The quantity of physical ready-to-sew garments that came out of the cut.</li>
              </ul>
            </li>
            <li>Press <strong>Register Cut</strong>. At this point, the yards are deducted from the fabric roll, and the resulting pieces remain on the waiting list to be assigned to a tailor in Production.</li>
          </ol>
        </div>
      ),
      keywords: 'create register new cut model design yards resulting pieces'
    },
    {
      title: 'States of a Cut and Assignment',
      content: (
        <div>
          <p>Cuts go through two key states:</p>
          <ul>
            <li><span className="badge badge-info">Available:</span> The cut has been registered and its pieces are in the workshop ready to be sent to sewing. In the production assignment menu, you will only see cuts that are in this state.</li>
            <li><span className="badge badge-success">Assigned:</span> The cut has already been delivered to a tailor and is currently in the assembly process. Once assigned, it is hidden from the selection list for new jobs to avoid accidental double assignment.</li>
          </ul>
        </div>
      ),
      keywords: 'cut states available assigned production pieces sewing'
    }
  ],
  produccion: [
    {
      title: 'Assign a Production Order to a Tailor',
      content: (
        <div>
          <p>Once you have cut pieces, it's time to send them to be assembled:</p>
          <ol>
            <li>Go to the <strong>Production</strong> section.</li>
            <li>Click <strong>+ New Production Order</strong>.</li>
            <li>Select the <strong>Tailor</strong> who will perform the work.</li>
            <li>Select the <strong>Available Cut</strong>. The system will automatically fill in the number of pieces and the base rate loaded previously.</li>
            <li>Customize if necessary:
              <ul>
                <li><strong>Specific Rate:</strong> You can raise or lower the pay rate per piece for this particular order (e.g., if it's a more complex garment than normal).</li>
                <li><strong>Promised Delivery Date:</strong> To measure the tailor's punctuality.</li>
              </ul>
            </li>
            <li>Press <strong>Assign Order</strong>. The initial status will be <span className="badge badge-warning">In Process</span>.</li>
          </ol>
        </div>
      ),
      keywords: 'assign production order tailor available cut specific rate delivery date'
    },
    {
      title: 'Status Control and Automatic Archiving Logic',
      content: (
        <div>
          <p>Production orders have a controlled lifecycle. The status transition is very simple:</p>
          <ol>
            <li><strong>In Process:</strong> The tailor has the material in their workshop and is working on it.</li>
            <li><strong>Finished (Delivery):</strong> When the tailor returns the sewn garments, you find the order in the production table and click <strong>Finish Order</strong>.
              <ul>
                <li>Enter the number of pieces received in good condition.</li>
                <li>The system calculates the <strong>Total Amount to Pay</strong> (Received pieces × Order rate).</li>
                <li>This amount is automatically added to the debt in favor of the tailor in the payroll section.</li>
              </ul>
            </li>
          </ol>
          <div className="step-alert" style={{ borderLeftColor: 'var(--success-color)', background: 'rgba(16, 185, 129, 0.05)' }}>
            <strong>⚡ Automatic Archiving Logic:</strong> To keep your production screen clean and agile, the system features immediate automatic archiving. As soon as an order is marked as <strong>Finished</strong> and its balance is <strong>Fully Paid</strong>, the order is immediately moved to the <strong>History</strong> module permanently, freeing up space in your day-to-day production control panel.
          </div>
        </div>
      ),
      keywords: 'status control in process finished completed order immediate automatic archiving'
    }
  ],
  pagos: [
    {
      title: 'Register a Payment or Deposit to a Tailor',
      content: (
        <div>
          <p>Financial control is crucial. To settle your tailors' payroll debts:</p>
          <ol>
            <li>Go to the <strong>Payments</strong> section in the sidebar menu.</li>
            <li>You will see the list of tailors with their accumulated debt in real time.</li>
            <li>Click on the <strong>Register Payment / Deposit</strong> button next to the corresponding tailor's name.</li>
            <li>Complete the deposit details:
              <ul>
                <li><strong>Amount to Pay:</strong> The sum of money delivered.</li>
                <li><strong>Payment Method:</strong> Select between <strong>Cash</strong> (workshop cash register) or <strong>Bank Deposit/Transfer</strong>.</li>
                <li><strong>Reference:</strong> If it is a bank deposit, write down the receipt number or SPEI tracking code.</li>
              </ul>
            </li>
            <li>Click <strong>Confirm Payment</strong>. The system will deduct the amount from the tailor's total balance instantly, update their balance, and save the digital receipt in the history.</li>
          </ol>
        </div>
      ),
      keywords: 'register payment deposit tailor method cash bank transfer balance'
    },
    {
      title: 'Payroll Calculation and Accumulated Balance',
      content: (
        <div>
          <p>How is the exact money owed to each tailor calculated?</p>
          <p>The system uses a transparent formula based on real events:</p>
          <div style={{ background: '#f1f5f9', padding: '12px 18px', borderRadius: '8px', fontFamily: 'monospace', fontSize: '0.85rem', margin: '10px 0', borderLeft: '3px solid var(--primary-color)' }}>
            Pending Balance = (Sum of Completed Orders × Agreed Rate) - (Sum of Registered Payments & Deposits)
          </div>
          <ul>
            <li><strong>Orders in progress:</strong> They do not generate a payable balance until the tailor delivers the assembled garments and they are approved in the system.</li>
            <li><strong>Account Audit:</strong> In the same payments section, you can expand the tailor's complete statement of account to show them a transparent breakdown of which orders are being paid and which deposits they have received to date.</li>
          </ul>
        </div>
      ),
      keywords: 'payroll calculation accumulated balance formula account statement audit'
    }
  ]
};

export default function Ayuda() {
  const { t, settings } = useSettings();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'general';
  
  const [activeTab, setActiveTab] = useState(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedAccordion, setExpandedAccordion] = useState(null);

  // Sync tab state with URL parameter if it changes
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setSearchParams({ tab: tabId });
    setExpandedAccordion(null); // Reset expanded guide on tab change
  };

  const toggleAccordion = (index) => {
    setExpandedAccordion(expandedAccordion === index ? null : index);
  };

  // Tabs structure
  const tabs = [
    { id: 'general', name: t('ayuda.tabGeneral'), icon: <BookOpen size={18} /> },
    { id: 'maquileros', name: t('nav.maquileros'), icon: <Users size={18} /> },
    { id: 'inventario', name: t('nav.inventario'), icon: <Package size={18} /> },
    { id: 'cortes', name: t('header.cutsDesign'), icon: <Scissors size={18} /> },
    { id: 'produccion', name: t('nav.produccion'), icon: <Factory size={18} /> },
    { id: 'pagos', name: t('nav.pagos'), icon: <Wallet size={18} /> },
  ];

  // Pick language guides
  const guides = settings.language === 'en' ? guides_en : guides_es;

  // Filter guides based on search query
  const getFilteredGuides = () => {
    const currentGuides = guides[activeTab] || [];
    if (!searchQuery.trim()) return currentGuides;
    
    return currentGuides.filter(g => 
      g.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.keywords.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const filteredList = getFilteredGuides();

  return (
    <div className="help-page-container">
      {/* Hero Banner */}
      <div className="help-hero-banner">
        <h1>{t('ayuda.title')}</h1>
        <p>{t('ayuda.subtitle')}</p>
        
        {/* Search Bar */}
        <div className="help-search-box">
          <Search size={18} className="help-search-input-icon" />
          <input 
            type="text" 
            className="help-search-input" 
            placeholder={t('ayuda.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="help-tabs-wrapper">
        {tabs.map(tab => (
          <button 
            key={tab.id}
            className={`help-tab-button ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => handleTabChange(tab.id)}
          >
            {tab.icon}
            <span>{tab.name}</span>
          </button>
        ))}
      </div>

      {/* Help Content Grid */}
      <div className="help-grid">
        <div className="help-section-card">
          <h2 className="help-section-title">
            {tabs.find(t => t.id === activeTab)?.icon}
            <span>{t('ayuda.guidesOf')}{tabs.find(t => t.id === activeTab)?.name}</span>
            <span className="step-badge" style={{ marginLeft: 'auto' }}>
              {filteredList.length} {filteredList.length === 1 ? t('ayuda.guide') : t('ayuda.guides')}
            </span>
          </h2>

          {filteredList.length === 0 ? (
            <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <HelpCircle size={48} style={{ opacity: 0.3, marginBottom: '1rem', color: 'var(--text-secondary)' }} />
              <p style={{ fontSize: '1rem', fontWeight: 500 }}>{t('ayuda.noResults')}</p>
              <p style={{ fontSize: '0.85rem', marginTop: '4px' }}>{t('ayuda.noResultsSub')}</p>
            </div>
          ) : (
            <div className="accordion-list">
              {filteredList.map((guide, index) => {
                const globalIndex = `${activeTab}-${index}`;
                const isActive = expandedAccordion === globalIndex;
                
                return (
                  <div key={index} className={`accordion-item ${isActive ? 'active' : ''}`}>
                    <button 
                      className="accordion-trigger"
                      onClick={() => toggleAccordion(globalIndex)}
                    >
                      <div className="accordion-trigger-left">
                        <span className="accordion-index">{index + 1}</span>
                        <span className="accordion-title">{guide.title}</span>
                      </div>
                      <ChevronDown size={18} className="accordion-chevron" />
                    </button>
                    
                    {isActive && (
                      <div className="accordion-panel">
                        {guide.content}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Quick Tips and Tricks */}
      <div className="glass-card" style={{ marginTop: '2rem', padding: '1.5rem' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem', margin: 0 }}>
          <Lightbulb size={20} color="#f59e0b" />
          <span>{t('ayuda.tipHeader')}</span>
        </h3>
        
        <div className="tips-grid">
          <div className="tip-card">
            <div className="tip-icon-wrapper">
              <TrendingUp size={20} />
            </div>
            <div>
              <span className="tip-title">{t('ayuda.tip1Title')}</span>
              <p className="tip-text">{t('ayuda.tip1Text')}</p>
            </div>
          </div>
          
          <div className="tip-card">
            <div className="tip-icon-wrapper">
              <CheckCircle2 size={20} style={{ color: 'var(--success-color)' }} />
            </div>
            <div>
              <span className="tip-title">{t('ayuda.tip2Title')}</span>
              <p className="tip-text">{t('ayuda.tip2Text')}</p>
            </div>
          </div>

          <div className="tip-card">
            <div className="tip-icon-wrapper">
              <FileText size={20} style={{ color: 'var(--primary-color)' }} />
            </div>
            <div>
              <span className="tip-title">{t('ayuda.tip3Title')}</span>
              <p className="tip-text">{t('ayuda.tip3Text')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
