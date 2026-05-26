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
  FileText,
  Sparkles,
  AlertTriangle, 
  AlertCircle, 
  Calendar, 
  X,
  Truck
} from 'lucide-react';


const guides_es = {
  general: [
    {
      title: '¿Cómo funciona el flujo completo del sistema?',
      content: (
        <div>
          <p>El sistema Maquila ERP está diseñado para llevar el control absoluto de tus procesos de confección, desde el registro de un lote de prendas cortadas hasta el stock final de prendas listas y la nómina de tus maquileros. El flujo principal se divide en 4 etapas:</p>
          
          <div className="workflow-container" style={{ marginTop: '15px', marginBottom: '15px' }}>
            <div className="workflow-title">Flujo de Trabajo de Confección</div>
            <div className="workflow-steps-flex">
              <div className="workflow-step-box">
                <span className="workflow-step-num">1</span>
                <div className="workflow-step-name">Cortes</div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Diseño y Variantes</span>
              </div>
              <div className="workflow-step-arrow"><ArrowRight size={16} /></div>
              <div className="workflow-step-box">
                <span className="workflow-step-num">2</span>
                <div className="workflow-step-name">Producción</div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Asignación y Costura</span>
              </div>
              <div className="workflow-step-arrow"><ArrowRight size={16} /></div>
              <div className="workflow-step-box">
                <span className="workflow-step-num">3</span>
                <div className="workflow-step-name">Pagos / Nómina</div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Liquidación de Deuda</span>
              </div>
              <div className="workflow-step-arrow"><ArrowRight size={16} /></div>
              <div className="workflow-step-box">
                <span className="workflow-step-num">4</span>
                <div className="workflow-step-name">Inventario Real</div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Prendas en Stock</span>
              </div>
            </div>
          </div>
          
          <ol>
            <li><strong>Ingreso de Cortes:</strong> En la sección de <strong>Cortes</strong>, se registra el modelo/código de la prenda, especificando sus variantes de color y la cantidad de piezas cortadas listas para costura. También se ingresa el cliente, número de orden y tarifa unitaria de maquila.</li>
            <li><strong>Asignación en Producción:</strong> En la sección de <strong>Producción</strong>, seleccionas un maquilero y le asignas un corte que esté disponible. El sistema carga automáticamente las piezas y el precio unitario. Se definen las fechas límite y el estado inicial es "En proceso".</li>
            <li><strong>Liquidación y Saldos:</strong> Conforme el maquilero avanza, se registran las piezas recibidas en buen estado en la misma sección de Producción. Al marcar la orden como Terminada, el saldo a su favor se refleja en <strong>Pagos</strong>, donde podrás registrar abonos o la liquidación total (efectivo o transferencia), aplicar multas si hubo piezas defectuosas y descargar el comprobante de pago.</li>
            <li><strong>Inventario de Stock Real:</strong> Una vez que una orden de producción ha sido marcada como Terminada y está 100% Pagada, las prendas pasan automáticamente a formar parte del <strong>Inventario Real</strong>, donde se lleva el control exacto de stock disponible y su valor financiero.</li>
          </ol>
        </div>
      ),
      keywords: 'flujo completo general etapas software maquila procesos de confeccion cortes produccion pagos inventario'
    },
    {
      title: 'Roles de usuario y accesos permitidos',
      content: (
        <div>
          <p>El sistema cuenta con niveles de seguridad basados en roles para proteger la información financiera y operacional:</p>
          <ul>
            <li><strong>Admin (Administrador):</strong> Acceso total sin restricciones a todos los módulos, incluyendo la creación, edición y eliminación de datos, visualización del historial de auditoría, generación de reportes globales y control total de nóminas y pagos.</li>
            <li><strong>Producción (produccion1, produccion2):</strong> Tienen permitido gestionar maquileros, cortes, órdenes de producción, registrar piezas recibidas y realizar el control de pagos/abonos. No tienen acceso a la eliminación crítica ni a reportes financieros de auditoría completa.</li>
            <li><strong>Inventario (inventario1):</strong> Encargado de registrar los cortes de prendas y sus variantes de color/cantidad, así como consultar y administrar la salida del stock final en el inventario real. No tienen acceso a nóminas, pagos ni reportes financieros.</li>
            <li><strong>Operadores generales:</strong> Pueden visualizar inventarios y estatus de producción pero con restricciones de eliminación y edición de flujos financieros directos para resguardar la seguridad del negocio.</li>
          </ul>
        </div>
      ),
      keywords: 'roles administrador produccion operario permisos seguridad accesos admin inventario'
    },
    {
      title: 'Configuración Avanzada y Personalización del ERP',
      content: (
        <div>
          <p>El sistema Maquila ERP te permite ajustar la interfaz y la lógica operacional para adaptarse a tus necesidades diarias a través del panel de <strong>Configuración del Sistema</strong> (al que puedes acceder desde tu perfil en la esquina superior derecha):</p>
          <ul>
            <li><strong>Tema del Sistema (Slate Theme):</strong> Elige entre los modos **Claro**, **Oscuro** (diseñado en una gama Slate premium que reduce la fatiga visual) o **Sistema** (sincronizado con la preferencia del navegador).</li>
            <li><strong>Color de Acento:</strong> Personaliza los botones, insignias, y bordes interactivos seleccionando entre 5 colores premium: Azul Real, Verde Esmeralda, Púrpura Índigo, Rojo Rubí y Naranja Coral.</li>
            <li><strong>Densidad de la Interfaz:</strong> Alterna entre la visualización **Normal** y la **Compacta** para optimizar el espaciado en tablas y ver más registros sin hacer scroll.</li>
            <li><strong>Formato de Moneda y Tipo de Cambio:</strong> Puedes cambiar la moneda de visualización de todos los montos financieros del ERP entre pesos mexicanos (<strong>MXN</strong>) y dólares (<strong>USD</strong>). Al seleccionar USD, todos los valores mostrados en el Dashboard, Inventario, Cortes, Pagos y Producción se calcularán en dólares de forma automática utilizando la tasa configurada en <strong>Tipo de Cambio</strong>. Recuerda ajustar esta tasa periódicamente (diaria, semanal o mensualmente) conforme fluctúe el valor del dólar en el mercado para garantizar finanzas precisas.</li>
            <li><strong>Auto-Archivado de Órdenes:</strong> Si está habilitado, el sistema monitorea reactivamente tus órdenes de producción. Tan pronto como una orden cambie al estado **Terminado** y sea liquidada al 100%, el sistema la archivará de manera automática e inmediata, quitándola del panel activo.</li>
          </ul>
        </div>
      ),
      keywords: 'configuracion tema oscuro claro slate acento colores moneda usd tipo de cambio dolar archivar automatico'
    }
  ],
  maquileros: [
    {
      title: '¿Cómo agregar un nuevo maquilero al sistema?',
      content: (
        <div>
          <p>Sigue estos pasos para registrar un nuevo trabajador de maquila o taller externo:</p>
          <ol>
            <li>Dirígete a la sección de <strong>Maquileros</strong> en el menú lateral.</li>
            <li>Haz clic en el botón superior <strong>+ Nuevo Maquilero</strong>.</li>
            <li>Completa el formulario con los datos requeridos:
              <ul>
                <li><strong>Nombre Completo:</strong> Nombre o razón del maquilero (solo letras y espacios).</li>
                <li><strong>Contacto / Teléfono:</strong> Teléfono para la coordinación de entregas.</li>
                <li><strong>Número de Personal:</strong> Cantidad de costureros/ayudantes que trabajan en su taller.</li>
                <li><strong>Maquinaria:</strong> Descripción de las máquinas disponibles (ej. overlock, rectas, ojaladora).</li>
                <li><strong>Domicilio, Colonia y CP:</strong> Dirección física del taller maquilador.</li>
                <li><strong>Foto de Perfil:</strong> Puedes subir una foto local para identificarlo visualmente.</li>
              </ul>
            </li>
            <li>Presiona <strong>Guardar</strong>. El maquilero estará activo inmediatamente para recibir órdenes en Producción.</li>
          </ol>
          <div className="step-alert">
            <strong>💡 Consejo:</strong> Mantener completos los datos de maquinaria y personal te ayudará a distribuir mejor las órdenes según la capacidad de cada taller.
          </div>
        </div>
      ),
      keywords: 'agregar nuevo maquilero crear alta registrar maquinaria personal telefono'
    },
    {
      title: 'Entender el perfil y reporte de desempeño del maquilero',
      content: (
        <div>
          <p>Cada maquilero cuenta con una pantalla de perfil dedicada para auditar su desempeño operativo y su historial:</p>
          <ul>
            <li>Haz clic en la fila de cualquier maquilero en la tabla principal para abrir su <strong>Perfil de Desempeño</strong>.</li>
            <li><strong>Métricas de Desempeño:</strong>
              <ul>
                <li><strong>Calificación General:</strong> Puntuación calculada según su historial de cumplimiento.</li>
                <li><strong>Puntualidad:</strong> Evalúa la cantidad de entregas a tiempo versus las órdenes que presentaron retrasos.</li>
                <li><strong>Cumplimiento:</strong> Evalúa la integridad de las piezas terminadas entregadas.</li>
              </ul>
            </li>
            <li><strong>Historial de Maquila:</strong> Muestra la bitácora completa de trabajos que le han sido asignados, indicando el modelo, piezas enviadas versus piezas recibidas, total de nómina de la orden, multas aplicadas por costuras defectuosas, el neto resultante y la fecha de entrega.</li>
          </ul>
        </div>
      ),
      keywords: 'perfil desempeño eficiencia entrega piezas historial saldo deudor calificacion puntualidad'
    }
  ],
  inventario: [
    {
      title: 'Control de Inventario Real (Prendas en Stock)',
      content: (
        <div>
          <p>El módulo de <strong>Inventario</strong> representa el stock físico final de prendas totalmente confeccionadas que ya han sido terminadas y pagadas al 100% en la sección de producción. Cada fila representa un lote de stock:</p>
          <ul>
            <li><strong>Métricas de Stock:</strong> Visualiza la foto de la prenda, el código del modelo, el desglose de variantes de color con su cantidad exacta de piezas disponibles y el número de orden de procedencia.</li>
            <li><strong>Valor Financiero:</strong> El sistema calcula en tiempo real el valor estimado del lote (Precio unitario × Piezas en stock) y muestra KPIs globales en la parte superior con la cantidad de modelos diferentes, el total acumulado de piezas en stock y el valor total financiero estimado de toda la mercancía.</li>
          </ul>
        </div>
      ),
      keywords: 'inventario real stock prendas terminadas valor piezas total modelo color'
    },
    {
      title: 'Registrar salidas y limpieza de Stock',
      content: (
        <div>
          <p>Para mantener el inventario de stock exacto conforme vendes o despachas la mercancía terminada:</p>
          <ol>
            <li>Identifica el lote del modelo que ha sido vendido o retirado del stock general.</li>
            <li>Haz clic en el botón de <strong>Eliminar</strong> (icono de papelera de color rojo) en la columna de acciones.</li>
            <li>Confirma la eliminación. Las piezas y el valor financiero de ese lote se descontarán al instante de los KPI del inventario.</li>
          </ol>
          <div className="step-alert">
            <strong>💡 Consejo:</strong> Realiza esta eliminación de stock periódicamente al entregar las prendas terminadas a tus clientes finales para que tus reportes financieros siempre coincidan con la realidad.
          </div>
        </div>
      ),
      keywords: 'salidas limpieza eliminar stock venta despacho actualizar piezas'
    }
  ],
  cortes: [
    {
      title: '¿Cómo registrar un nuevo Corte?',
      content: (
        <div>
          <p>El módulo de <strong>Cortes</strong> sirve para dar de alta nuevos lotes de diseño y las piezas que se han cortado y están listas para coser:</p>
          <ol>
            <li>Dirígete a la sección de <strong>Cortes</strong> en el menú lateral.</li>
            <li>Haz clic en el botón superior <strong>+ Nuevo Ingreso</strong>. También puedes hacer clic en <strong>Importar Excel</strong> para cargar lotes masivamente desde un archivo `.xlsx`.</li>
            <li>Introduce los datos del lote en el formulario:
              <ul>
                <li><strong>Código del Producto / Modelo:</strong> El código único de diseño o modelo de la prenda.</li>
                <li><strong>Colores y Cantidades (Variantes):</strong> Haz clic en <strong>+ Agregar Color</strong> para añadir dinámicamente cada color y especificar el número exacto de piezas resultantes del corte listas para confección.</li>
                <li><strong>Cliente y No. Orden:</strong> Información de control comercial para rastrear a quién le pertenece el lote.</li>
                <li><strong>Precio de Maquila:</strong> La tarifa unitaria base que se pagará al maquilero por confeccionar cada prenda.</li>
                <li><strong>Imagen del Producto:</strong> Puedes subir un archivo local de imagen o ingresar una URL directa de internet.</li>
                <li><strong>Observaciones / Notas:</strong> Detalles técnicos para costura, cierres, hilos, etc.</li>
              </ul>
            </li>
            <li>Presiona <strong>Guardar Producto</strong>. El corte se registrará en el sistema y aparecerá con el estatus "Disponible" en color rojo.</li>
          </ol>
        </div>
      ),
      keywords: 'crear registrar nuevo corte modelo variantes color piezas precio maquila'
    },
    {
      title: 'Estados de un Corte, Reprogramación e Inicio de Producción',
      content: (
        <div>
          <p>Los lotes de corte tienen un ciclo de control transparente y acciones rápidas:</p>
          <ul>
            <li><strong>Disponible (Punto Rojo):</strong> El corte ha sido registrado y sus piezas están listas en el taller para costura, en espera de ser asignadas a un maquilero.</li>
            <li><strong>Asignado (Punto Verde):</strong> El lote ya fue asignado a un maquilero y está en proceso de confección. Al asignarse, se oculta automáticamente de la pantalla de cortes libres para evitar dobles asignaciones.</li>
            <li><strong>Iniciar Producción (Icono Verde de +):</strong> En la columna de acciones de un corte disponible, puedes hacer clic en este icono para ir directamente a la pantalla de Producción con el producto preseleccionado de forma automática.</li>
            <li><strong>Reprogramar Producción (Icono Morado de Refrescar):</strong> Si necesitas realizar una nueva corrida de producción del mismo modelo, haz clic en el icono morado. El sistema mantendrá los datos base (modelo, precio de maquila, cliente, observaciones) pero te permitirá ingresar una nueva orden y nuevas variantes de color para un lote nuevo de forma ágil.</li>
          </ul>
        </div>
      ),
      keywords: 'estados corte disponible asignado reprogramacion reprogramar corrida produccion'
    }
  ],
  produccion: [
    {
      title: 'Asignar una Orden de Producción a un Maquilero',
      content: (
        <div>
          <p>Para enviar un lote de corte disponible a confección con un maquilero:</p>
          <ol>
            <li>Ingresa a la sección de <strong>Producción</strong> en el menú lateral.</li>
            <li>Haz clic en el botón superior <strong>+ Nueva Orden</strong>.</li>
            <li>Selecciona el <strong>Maquilero</strong> responsable de la costura.</li>
            <li>Selecciona el <strong>Producto del Inventario</strong> (corte disponible). El sistema cargará de inmediato la cantidad total de piezas y el precio unitario del corte.</li>
            <li>Ingresa la <strong>Fecha Inicio</strong> y la <strong>Fecha Entrega Est.</strong> (fecha de entrega prometida).</li>
            <li><strong>Ajustes del Precio:</strong> Si lo deseas, puedes aplicar un ajuste inicial (Bono o Descuento) que altere la tarifa unitaria en un porcentaje específico.</li>
            <li>Presiona <strong>Crear Orden</strong>. El estatus inicial de la orden será <strong>En proceso</strong>.</li>
          </ol>
        </div>
      ),
      keywords: 'asignar orden produccion maquilero corte disponible fecha inicio fecha entrega'
    },
    {
      title: 'Seguimiento, Ajustes, Recibo de Piezas y Archivado',
      content: (
        <div>
          <p>Las órdenes de producción cuentan con herramientas dinámicas de seguimiento e inline:</p>
          <ul>
            <li><strong>Piezas Recibidas (Recibidas):</strong> Conforme el maquilero entregue prendas terminadas, puedes ingresar de forma directa (inline) la cantidad de piezas aprobadas en la columna "Recibidas" de la tabla. Esto actualizará el balance final de la nómina de la orden.</li>
            <li><strong>Bonos y Descuentos:</strong> Puedes seleccionar ajustes en la columna correspondiente para aplicar un <strong>Bono</strong> (+5%, +10%, +15%, +20%) sobre el costo por costura excelente o entrega anticipada, o bien un <strong>Descuento</strong> (-5%, -10%, -15%, -20%) por costuras defectuosas u otros motivos.</li>
            <li><strong>Agregar Prórrogas (Icono de Calendario):</strong> Si el maquilero solicita más tiempo, puedes hacer clic en el icono de calendario e ingresar la cantidad de días adicionales para extender la fecha de entrega original.</li>
            <li><strong>Terminar Orden (Icono de Check):</strong> Finaliza el trabajo. Esto acumula automáticamente el saldo de la nómina a favor del maquilero (Piezas recibidas × Tarifa con ajustes aplicados) en la sección de Pagos.</li>
            <li><strong>Archivado Automático:</strong> Tan pronto como una orden de producción es marcada como <strong>Terminado</strong> y su saldo queda <strong>Completamente Pagado</strong>, el sistema la mueve de forma automática e inmediata al Historial para mantener la pantalla de producción despejada.</li>
          </ul>
        </div>
      ),
      keywords: 'seguimiento terminado cancelar archivado automatico bonos descuentos prórroga piezas recibidas'
    },
    {
      title: 'El nuevo Flujo de "Terminado Parcial" (Efecto en Pagos y Camión)',
      content: (
        <div>
          <p>Para resolver la necesidad de recibir entregas de piezas de forma escalonada a lo largo del tiempo, se ha implementado el estado <strong>Terminado Parcial</strong>:</p>
          <ul>
            <li><strong>¿Qué es?:</strong> Es un estado intermedio que indica que el maquilero ha entregado una parte del lote, pero el trabajo de costura total aún no ha concluido.</li>
            <li><strong>Acciones siempre Habilitadas:</strong> A diferencia de una orden completamente Terminada (que bloquea sus datos), una orden en "Terminado Parcial" mantiene <strong>completamente habilitados todos los controles operativos</strong>. Podrás seguir editando inline la cantidad de "Recibidas", aplicar bonos o descuentos y prorrogar la fecha de entrega.</li>
            <li><strong>Control de Nómina Parcial:</strong> Puedes dirigirte al módulo de <strong>Pagos</strong> y registrar abonos y pagos sobre el saldo neto de las piezas recibidas hasta el momento. Esto te permite ir pagando al maquilero semanalmente conforme te entrega mercancía sin tener que esperar a que termine el lote completo.</li>
            <li><strong>Cargar al Camión:</strong> Las prendas que has recibido de una orden en estado "Terminado Parcial" ingresan al stock activo de maquila y pueden ser cargadas al <strong>Camión</strong> de envío a Colima al instante, de manera parcial o total.</li>
          </ul>
        </div>
      ),
      keywords: 'terminado parcial flujo pagos abonos entregas parciales camion costura inline recibidas'
    }
  ],
  pagos: [
    {
      title: 'Registrar un Pago o Abono de Nómina',
      content: (
        <div>
          <p>El control financiero de las nóminas de maquila se realiza de forma transparente:</p>
          <ol>
            <li>Ingresa a la sección de <strong>Pagos</strong> en el menú lateral.</li>
            <li>En la sección superior <strong>Generar Pago</strong>, selecciona la <strong>Orden</strong> (orden de producción) correspondiente del maquilero.</li>
            <li>El sistema desplegará de inmediato:
              <ul>
                <li><strong>Costo Total de Orden:</strong> El costo calculado (Piezas recibidas × Tarifa ajustada).</li>
                <li><strong>Ya Pagado:</strong> La suma de los abonos que ya se han registrado para esta orden.</li>
                <li><strong>Multas Pendientes:</strong> Descuentos personales pendientes por prendas defectuosas registradas a este maquilero.</li>
                <li><strong>A Pagar (Neto):</strong> El monto neto a entregar al maquilero en tiempo real (Costo Total - Ya Pagado - Multas Pendientes).</li>
              </ul>
            </li>
            <li>Selecciona el tipo de pago: <strong>Abono</strong> (pago parcial) o <strong>Pago Completo (Liquidación)</strong>.</li>
            <li>Ingresa la cantidad entregada en <strong>Monto a Entregar ($)</strong> y presiona <strong>Registrar Pago</strong>.</li>
            <li><strong>Imprimir Comprobante:</strong> En la tabla inferior "Historial de Pagos de la Orden", haz clic en el icono de la impresora en la fila del pago para descargar e imprimir el comprobante oficial físico o en PDF.</li>
          </ol>
        </div>
      ),
      keywords: 'registrar pago abono maquilero liquidacion neto a pagar imprimir comprobante recibo'
    },
    {
      title: 'Descuentos Personales por Prendas Defectuosas (Multas)',
      content: (
        <div>
          <p>Si un maquilero entrega prendas dañadas, rotas o mal confeccionadas, puedes registrar un cargo en la sección inferior de <strong>Descuento Personal</strong>:</p>
          <ol>
            <li>Selecciona el <strong>Maquilero</strong> afectado.</li>
            <li>Selecciona el <strong>Modelo / Producto</strong> de corte asociado al daño.</li>
            <li>Ingresa el <strong>Motivo del Error / Hallazgo</strong> (ej. costura rota en mangas, tela rota).</li>
            <li>Indica la cantidad de <strong>Piezas Malas</strong> y el <strong>Monto Total ($)</strong> del descuento monetario.</li>
            <li>Presiona <strong>Registrar Descuento</strong>.</li>
          </ol>
          <div className="step-alert" style={{ borderLeftColor: 'var(--danger-color)', background: 'rgba(239, 68, 68, 0.05)' }}>
            <strong>⚠️ Descuento Automático Transparente:</strong> El descuento quedará registrado con el estado "Pendiente" y se restará automáticamente del neto a pagar la próxima vez que registres un abono o liquidación para cualquier orden de ese maquilero. Una vez cobrado en el pago, su estatus cambiará automáticamente a "Cobrado".
          </div>
        </div>
      ),
      keywords: 'descuentos personales prendas defectuosas multas piezas malas motivo cargo saldo'
    }
  ],
  extras: [
    {
      title: '¿Qué son los Trabajos Extras y cuándo usarlos?',
      content: (
        <div>
          <p>La sección de <strong>Extras</strong> está diseñada para registrar y controlar tareas o servicios auxiliares asociados a un corte de prendas, de manera separada de la confección principal. Algunos ejemplos comunes de trabajos extras incluyen:</p>
          <ul>
            <li>Pegado de etiquetas o marquillas especiales.</li>
            <li>Costura de botones, broches o cierres específicos.</li>
            <li>Planchado, deshebrado, empaquetado o control de calidad manual.</li>
            <li>Cualquier labor secundaria cobrada como excedente o tarifa adicional.</li>
          </ul>
          <p><strong>Diferencia clave con Producción estándar:</strong></p>
          <ul>
            <li><strong>Múltiple Asignación:</strong> A diferencia de las órdenes de producción normales (donde se restringe asignar un mismo corte a varios maquileros a la vez para evitar duplicar existencias), los Trabajos Extras permiten registrar múltiples tareas auxiliares asociadas al mismo lote de corte con diferentes maquileros y diferentes tarifas.</li>
            <li><strong>Sin duplicación de Inventario:</strong> Los extras son cargos financieros de mano de obra y servicios adicionales. Por ello, al completarse o terminarse un extra, <strong>no se duplica ni se crea una nueva fila física en el Inventario Real</strong>, evitando alterar el stock físico real y manteniendo limpias tus valoraciones monetarias del almacén.</li>
          </ul>
        </div>
      ),
      keywords: 'extras que son cuando usar trabajo extra tareas auxiliares botones etiquetas planchado empaquetado inventario mano de obra'
    },
    {
      title: 'Crear Trabajos Extras desde Producción (Atajo de Sparkles/Destello)',
      content: (
        <div>
          <p>Para agilizar el flujo de trabajo, puedes iniciar la creación de un extra directamente desde el panel principal de Producción activa:</p>
          <ol>
            <li>Ve al panel de <strong>Producción</strong> y localiza la orden en proceso correspondiente en la tabla.</li>
            <li>En la columna de acciones de esa fila, haz clic en el icono premium de <strong>Destello (Sparkles)</strong> con un degradado rosa-violeta.</li>
            <li>El ERP te redirigirá automáticamente a la pantalla de <strong>Extras</strong> y abrirá el formulario de <strong>+ Nueva Orden Extra</strong> de forma automática.</li>
            <li>Notarás que el <strong>Producto del Inventario</strong>, la <strong>Cantidad de Piezas</strong>, el <strong>Cliente</strong> y las <strong>Fechas de entrega</strong> ya estarán preseleccionados y bloqueados (en modo de solo lectura) para evitar errores manuales, garantizando que el extra se asocie exactamente al lote correcto.</li>
            <li>Solo tendrás que seleccionar al nuevo maquilero encargado del extra y capturar el costo por pieza en el campo de precio.</li>
          </ol>
        </div>
      ),
      keywords: 'atajo sparkles destello crear extra produccion autollenado automatizar preseleccionado bloqueado'
    },
    {
      title: 'Llenado Manual de Precios y Liquidación de Extras en Pagos',
      content: (
        <div>
          <p>El registro económico y la nómina de los trabajos extras funcionan bajo un esquema flexible:</p>
          <ul>
            <li><strong>Precio Extra Manual:</strong> Al crear un extra, debes ingresar manualmente el <strong>Precio Extra ($)</strong> por pieza en el formulario. Esto permite una total flexibilidad operacional para establecer tarifas a la medida (por ejemplo, $3.50 por pegar etiquetas o $5.00 por costura de botones).</li>
            <li><strong>Cálculo Automático de Nómina:</strong> El sistema calculará en tiempo real el costo total de la orden multiplicando las piezas recibidas por el precio unitario del extra configurado, actualizándose al instante.</li>
            <li><strong>Liquidación en Nómina (Pagos):</strong> Cuando marcas el Trabajo Extra como "Terminado", el saldo resultante se envía al módulo de <strong>Pagos</strong>.</li>
            <li>En el dropdown de selección de órdenes para generar un pago al maquilero, identificarás claramente los trabajos extras gracias al sufijo de color de realce **(EXTRA)** que se añade al final del código del producto (ej: <em>MD-2030 (EXTRA)</em>). De esta manera, sabrás exactamente qué pagos corresponden a costura base y cuáles a tareas auxiliares.</li>
          </ul>
        </div>
      ),
      keywords: 'precio extra manual calculo automatico nomina pagos liquidacion dropdown extra sufijo'
    }
  ],
  camion: [
    {
      title: '¿Cómo funciona la sección de Camión (Envíos a Colima)?',
      content: (
        <div>
          <p>La sección <strong>Camión</strong> está diseñada para gestionar de forma inalterable y precisa los envíos de modelos terminados desde la maquila hacia la fábrica en Colima.</p>
          <ol>
            <li><strong>Modelos Disponibles:</strong> En la parte izquierda verás las prendas confeccionadas provenientes estrictamente de órdenes de producción cuyo estado sea <strong>"Terminado"</strong> o <strong>"Terminado Parcial"</strong> y que tengan saldo disponible para enviar.</li>
            <li><strong>Identificación de Maquileros:</strong> Cada tarjeta de modelo cuenta con una insignia púrpura con el nombre del maquilero que la confeccionó, permitiendo identificar el origen de cada lote al instante.</li>
            <li><strong>Cargar el Camión:</strong> Puedes arrastrar un modelo desde la lista izquierda y soltarlo en el área del camión virtual en la derecha, o simplemente hacer clic en el botón <strong>(+) Subir al Camión</strong>.</li>
            <li><strong>Desglose por Tallas Obligatorio:</strong> Al subir un lote, se abrirá una ventana emergente donde debes ingresar las cantidades exactas para cada una de las tallas estándar (<strong>05, 07, 09, 11, 13 y 15</strong>). El sistema tiene un validador en tiempo real: el botón de confirmar solo se activará cuando la suma de las tallas coincida exactamente con la cantidad total cargada. Puedes optar por enviar el total del lote o realizar un <strong>envío parcial</strong> ingresando una cantidad menor.</li>
            <li><strong>Despachar el Camión:</strong> Una vez cargados todos los modelos, selecciona la <strong>Fecha de Envío</strong>, agrega observaciones (ej. chofer, placas, etc.) y haz clic en <strong>Enviar Camión</strong>. Al despachar:
              <ul>
                <li>Las piezas se descuentan del balance de la orden de producción original.</li>
                <li>Se restan automáticamente del stock de <strong>Inventario Físico Real</strong>.</li>
                <li>Queda registrado un registro histórico inalterable en el Historial de Auditoría.</li>
              </ul>
            </li>
          </ol>
        </div>
      ),
      keywords: 'camion envios colima tallas distribucion piezas despachar chofer placas'
    },
    {
      title: 'Historial de Camiones y Auditoría',
      content: (
        <div>
          <p>Todos los camiones despachados quedan registrados de forma inalterable en la sección inferior de <strong>Historial de Camiones Enviados</strong>:</p>
          <ul>
            <li>Cada camión enviado se muestra en una tarjeta tipo acordeón que detalla el número de Camión, la Fecha de Envío y las observaciones registradas.</li>
            <li>Al hacer clic en cualquier camión, se expandirá un panel mostrando la tabla completa con el desglose de modelos, colores, números de orden, piezas totales y la distribución exacta por tallas de cada prenda enviada.</li>
          </ul>
        </div>
      ),
      keywords: 'historial camiones bitacora desglose tallas auditoria consulta'
    }
  ]
};


const guides_en = {
  general: [
    {
      title: 'How does the complete system workflow work?',
      content: (
        <div>
          <p>The Maquila ERP system is designed to give you absolute control of your garment production processes, from the initial cut registration to the final stock of ready garments and tailors\' payroll. The workflow is divided into 4 main stages:</p>
          
          <div className="workflow-container" style={{ marginTop: '15px', marginBottom: '15px' }}>
            <div className="workflow-title">Garment Production Workflow</div>
            <div className="workflow-steps-flex">
              <div className="workflow-step-box">
                <span className="workflow-step-num">1</span>
                <div className="workflow-step-name">Cuts</div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Design & Variants</span>
              </div>
              <div className="workflow-step-arrow"><ArrowRight size={16} /></div>
              <div className="workflow-step-box">
                <span className="workflow-step-num">2</span>
                <div className="workflow-step-name">Production</div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Assignment & Sewing</span>
              </div>
              <div className="workflow-step-arrow"><ArrowRight size={16} /></div>
              <div className="workflow-step-box">
                <span className="workflow-step-num">3</span>
                <div className="workflow-step-name">Payments / Payroll</div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Debt Settlement</span>
              </div>
              <div className="workflow-step-arrow"><ArrowRight size={16} /></div>
              <div className="workflow-step-box">
                <span className="workflow-step-num">4</span>
                <div className="workflow-step-name">Real Inventory</div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Garments in Stock</span>
              </div>
            </div>
          </div>
          
          <ol>
            <li><strong>Register Cuts:</strong> In the <strong>Cuts</strong> section, register the design model/code of the garment, specifying its color variants and the exact number of pieces cut for assembly. You also input the client, order number, and unit maquila piece rate.</li>
            <li><strong>Production Assignment:</strong> In <strong>Production</strong>, select a tailor and assign them an available cut. The system automatically loads the pieces and unit rate. Set deadlines and the initial status is "In Progress".</li>
            <li><strong>Settlement & Balances:</strong> As the tailor works, record the number of pieces received in good condition in the same Production section. Upon marking the order as Finished, their pending wage balance is updated in the <strong>Payments</strong> section, where you can register deposits (Partial or Full Settlement), apply penalties for defective pieces, and download/print the payment receipt.</li>
            <li><strong>Real Stock Inventory:</strong> Once a production order is marked as Finished and is 100% Paid, the finished garments automatically move to <strong>Real Inventory</strong>, where you keep exact track of available stock and its total financial value.</li>
          </ol>
        </div>
      ),
      keywords: 'complete workflow general stages software maquila garment processes cuts production payments inventory'
    },
    {
      title: 'User roles and allowed access',
      content: (
        <div>
          <p>The system has role-based security levels to protect financial and operational information:</p>
          <ul>
            <li><strong>Admin (Administrator):</strong> Total unrestricted access to all modules, including creating, editing, and deleting data, viewing audit logs, global financial reports, and complete control over payroll, payments, and discounts.</li>
            <li><strong>Production (produccion1, produccion2):</strong> Allowed to manage tailors, cuts, production orders, record received pieces, and manage payments/deposits. They do not have access to critical deletions or full financial audit logs.</li>
            <li><strong>Inventory (inventario1):</strong> Responsible for registering garment cuts and color/quantity variants, as well as consulting and managing finished physical stock outputs in the real inventory. No access to payroll, payments, or financial reports.</li>
            <li><strong>General Operators:</strong> Can view inventory and production status but with restrictions on deleting and editing direct financial flows to safeguard the business.</li>
          </ul>
        </div>
      ),
      keywords: 'roles administrator production operator permissions security access admin inventory'
    }
  ],
  maquileros: [
    {
      title: 'How to add a new tailor to the system?',
      content: (
        <div>
          <p>Follow these steps to register a new tailor or external workshop:</p>
          <ol>
            <li>Go to the <strong>Tailors</strong> section in the sidebar menu.</li>
            <li>Click the top button <strong>+ New Tailor</strong>.</li>
            <li>Complete the form with the required fields:
              <ul>
                <li><strong>Full Name:</strong> Name or business name of the tailor (letters and spaces only).</li>
                <li><strong>Contact / Phone:</strong> Phone number for direct logistics and delivery coordination.</li>
                <li><strong>Staff Members:</strong> Number of tailors/assistants working in their workshop.</li>
                <li><strong>Machinery:</strong> Description of available machines (e.g., overlock, straight, buttonhole).</li>
                <li><strong>Address, Colonia, and CP:</strong> Physical address details of the workshop.</li>
                <li><strong>Profile Photo:</strong> Upload a local image file of the tailor for quick visual identification.</li>
              </ul>
            </li>
            <li>Press <strong>Save</strong>. The tailor will be active immediately to receive orders in Production.</li>
          </ol>
          <div className="step-alert">
            <strong>💡 Tip:</strong> Keeping machinery and staff data complete helps you distribute orders better according to the capacity of each workshop.
          </div>
        </div>
      ),
      keywords: 'add new tailor create register machinery staff phone contact'
    },
    {
      title: "Understanding the tailor's profile and performance report",
      content: (
        <div>
          <p>Each tailor has a dedicated profile screen to audit their operational performance and history:</p>
          <ul>
            <li>Click on any tailor's row in the main table to open their <strong>Performance Profile</strong>.</li>
            <li><strong>Performance Metrics:</strong>
              <ul>
                <li><strong>General Rating:</strong> Calculated score based on their history of quality and punctuality.</li>
                <li><strong>Punctuality:</strong> Evaluates on-time deliveries versus delayed orders.</li>
                <li><strong>Fulfillment:</strong> Tracks the integrity of finished pieces delivered.</li>
              </ul>
            </li>
            <li><strong>Maquila History:</strong> Displays a complete log of assigned orders, indicating model, sent vs received pieces, total payroll cost, discounts applied for defective garments, net payout, and delivery date.</li>
          </ul>
        </div>
      ),
      keywords: 'profile performance efficiency delivery pieces history debt balance rating punctuality'
    }
  ],
  inventario: [
    {
      title: 'Real Inventory Control (Garments in Stock)',
      content: (
        <div>
          <p>The **Inventory** module represents the final physical stock of fully assembled garments that have been completed and 100% paid in the production section. Each row represents a stock batch:</p>
          <ul>
            <li><strong>Stock Metrics:</strong> View the garment photo, model code, detailed color variants with their exact available pieces, and the original order number of origin.</li>
            <li><strong>Financial Value:</strong> The system calculates the estimated value of the batch (Unit Price × Pieces in stock) in real time and displays global KPIs at the top with different models, total accumulated stock items, and estimated total financial value of all merchandise.</li>
          </ul>
        </div>
      ),
      keywords: 'real inventory stock garments ready value total pieces model color'
    },
    {
      title: 'Registering outputs and stock cleanup',
      content: (
        <div>
          <p>To keep the stock inventory exact as you sell or dispatch finished merchandise:</p>
          <ol>
            <li>Identify the batch model that has been sold or removed from general stock.</li>
            <li>Click the **Delete** button (red trash icon) in the actions column.</li>
            <li>Confirm deletion. The pieces and total financial value will be immediately deducted from global KPIs.</li>
          </ol>
          <div className="step-alert">
            <strong>💡 Tip:</strong> It is recommended to perform this stock cleanup periodically when delivering finished garments to final customers to keep reports accurate.
          </div>
        </div>
      ),
      keywords: 'outputs cleanup delete stock sales dispatch update pieces'
    }
  ],
  cortes: [
    {
      title: 'How to register a new Cut?',
      content: (
        <div>
          <p>The cuts module is used to register new design batches and the pieces that have been cut and are ready for sewing:</p>
          <ol>
            <li>Go to the <strong>Cuts</strong> section in the sidebar menu.</li>
            <li>Click the top button <strong>+ New Entry</strong>. You can also click <strong>Import Excel</strong> to batch load cuts from a `.xlsx` file.</li>
            <li>Enter the details in the form:
              <ul>
                <li><strong>Product Code / Model:</strong> The unique design or model code of the garment.</li>
                <li><strong>Colors & Quantities (Variants):</strong> Click <strong>+ Add Color</strong> to dynamically add each color and specify the exact number of pieces ready for sewing.</li>
                <li><strong>Client & Order No.:</strong> Commercial tracking information to identify the owner of the batch.</li>
                <li><strong>Maquila Price:</strong> The suggested base unit piece rate to pay the tailor for sewing each garment.</li>
                <li><strong>Product Image:</strong> Upload a local image file or enter a direct internet URL link.</li>
                <li><strong>Notes / Comments:</strong> Technical details for sewing, zippers, threads, etc.</li>
              </ul>
            </li>
            <li>Press <strong>Save Product</strong>. The cut will be registered and marked as "Available" in red.</li>
          </ol>
        </div>
      ),
      keywords: 'create register new cut model variants color pieces maquila rate'
    },
    {
      title: 'States of a Cut, Reprogramming, and Starting Production',
      content: (
        <div>
          <p>Cut batches have a transparent control cycle and quick actions:</p>
          <ul>
            <li><strong>Available (Red Dot):</strong> The cut has been registered and its pieces are in the workshop ready to be assigned to a tailor.</li>
            <li><strong>Assigned (Green Dot):</strong> The batch has already been delivered to a tailor and is in assembly. Once assigned, it is automatically hidden from the open cuts screen to prevent duplicate assignments.</li>
            <li><strong>Start Production (Green + Icon):</strong> In the actions column of an available cut, click this icon to go directly to the Production screen with the product automatically preselected.</li>
            <li><strong>Reprogram Production (Purple Refresh Icon):</strong> If you need to perform a new production run of the same model, click the purple icon. The system will keep base data (model, maquila price, client, notes) but let you enter a new order number and new color variants for a new batch quickly.</li>
          </ul>
        </div>
      ),
      keywords: 'cut states available assigned reprogramming reprogram production run'
    }
  ],
  produccion: [
    {
      title: 'Assign a Production Order to a Tailor',
      content: (
        <div>
          <p>To send an available cut batch to be assembled by a tailor:</p>
          <ol>
            <li>Go to the <strong>Production</strong> section in the sidebar.</li>
            <li>Click the top button <strong>+ New Order</strong>.</li>
            <li>Select the <strong>Tailor</strong> responsible for the work.</li>
            <li>Select the <strong>Inventory Product</strong> (available cut). The system will load the total pieces and unit price automatically.</li>
            <li>Enter the <strong>Start Date</strong> and the <strong>Est. Delivery Date</strong> (promised delivery date).</li>
            <li><strong>Rate Adjustments:</strong> If desired, apply an initial adjustment (Bonus or Discount) to alter the unit piece rate by a specific percentage.</li>
            <li>Press <strong>Create Order</strong>. The initial status will be <strong>In Progress</strong>.</li>
          </ol>
        </div>
      ),
      keywords: 'assign production order tailor available cut start date delivery date'
    },
    {
      title: 'Monitoring, Adjustments, Receiving Pieces, and Archiving',
      content: (
        <div>
          <p>Production orders have a dynamic lifecycle with inline and monitoring tools:</p>
          <ul>
            <li><strong>Received Pieces (Received):</strong> As the tailor delivers finished garments, you can enter the amount of approved pieces directly (inline) in the "Received" input column of the table. This updates the payroll balance.</li>
            <li><strong>Bonuses & Discounts:</strong> You can select adjustments in the corresponding column to apply a <strong>Bonus</strong> (+5%, +10%, +15%, +20%) to the rate for excellent costura or early delivery, or a <strong>Discount</strong> (-5%, -10%, -15%, -20%) for minor flaws or delays.</li>
            <li><strong>Add Extensions (Calendar Icon):</strong> If the tailor requests more time, click the calendar icon and enter the number of additional days to extend the original deadline.</li>
            <li><strong>Finish Order (Check Icon):</strong> Concludes the job. This automatically registers the payroll balance in favor of the tailor (Received pieces × Rate with adjustments) in the Payments screen.</li>
            <li><strong>Automatic Archiving:</strong> As soon as a production order is marked as <strong>Finished</strong> and its balance is <strong>Fully Paid</strong>, the system immediately moves it automatically to the History section to keep the active panel clean.</li>
          </ul>
        </div>
      ),
      keywords: 'monitoring finished cancel automatic archiving bonuses discounts extensions received pieces'
    },
    {
      title: 'The new "Partially Finished" Flow (Effect on Payments and Truck)',
      content: (
        <div>
          <p>To support staggered garment deliveries from tailors over time, we introduced the <strong>Partially Finished</strong> order status:</p>
          <ul>
            <li><strong>What is it?:</strong> An intermediate status indicating that the tailor has delivered a portion of the lot, but the overall sewing task is still ongoing.</li>
            <li><strong>Fully Enabled Actions:</strong> Unlike a fully "Finished" order (which locks all data), a "Partially Finished" order keeps <strong>all operational controls completely active</strong>. You can continue editing received pieces inline, applying bonuses or discounts, and extending delivery dates.</li>
            <li><strong>Partial Payroll Control:</strong> You can head to the <strong>Payments</strong> module and register partial wage payouts based on the pieces received so far. This lets you pay the tailor weekly as they deliver finished items, without waiting for the entire lot to be completed.</li>
            <li><strong>Truck Shipping integration:</strong> Garments received from a "Partially Finished" production order are added to the active maquila stock and can be loaded immediately to the Colima shipping **Truck** (fully or partially).</li>
          </ul>
        </div>
      ),
      keywords: 'partially finished flow payments partial deliveries truck sewing inline received'
    }
  ],
  pagos: [
    {
      title: 'Register a Payroll Payment or Deposit',
      content: (
        <div>
          <p>Financial control of tailor payroll is managed transparently:</p>
          <ol>
            <li>Go to the <strong>Payments</strong> section in the sidebar menu.</li>
            <li>In the top <strong>Generate Payment</strong> section, select the corresponding **Order** (production order) of the tailor.</li>
            <li>The system will display:
              <ul>
                <li><strong>Total Order Cost:</strong> The calculated cost (Received pieces × Adjusted rate).</li>
                <li><strong>Already Paid:</strong> The sum of all deposits/abonos already registered for this order.</li>
                <li><strong>Pending Fines:</strong> Pending personal discounts for defective garments registered for this tailor.</li>
                <li><strong>To Pay (Net):</strong> The real net amount to deliver to the tailor in real time (Total Cost - Already Paid - Pending Fines).</li>
              </ul>
            </li>
            <li>Select the payment type: <strong>Partial Payment (Abono)</strong> or <strong>Full Payment (Settlement)</strong>.</li>
            <li>Enter the delivered sum in <strong>Amount to Deliver ($)</strong> and press <strong>Register Payment</strong>.</li>
            <li><strong>Print Receipt:</strong> In the bottom "Order Payment History" table, click the printer icon in the payment row to download and print the official physical or PDF payment voucher.</li>
          </ol>
        </div>
      ),
      keywords: 'register payment deposit tailor settlement net to pay print receipt voucher'
    },
    {
      title: 'Personal Discounts for Defective Garments (Fines)',
      content: (
        <div>
          <p>If a tailor delivers damaged, broken, or poorly assembled garments, you can register a charge in the lower <strong>Personal Discount</strong> section:</p>
          <ol>
            <li>Select the affected <strong>Tailor</strong>.</li>
            <li>Select the <strong>Model / Product</strong> cut associated with the damage.</li>
            <li>Enter the detailed <strong>Error / Finding Reason</strong> (e.g., broken sleeve seams, torn fabric).</li>
            <li>Indicate the number of <strong>Defective Pieces</strong> and the total <strong>Total Amount ($)</strong> of the discount.</li>
            <li>Press <strong>Register Discount</strong>.</li>
          </ol>
          <div className="step-alert" style={{ borderLeftColor: 'var(--danger-color)', background: 'rgba(239, 68, 68, 0.05)' }}>
            <strong>⚠️ Transparent Automatic Payout Deduction:</strong> The discount will be registered with the status "Pending" and will be automatically subtracted from the net amount the next time you register an abono or full settlement for any order of that tailor. Once charged, its status changes to "Charged".
          </div>
        </div>
      ),
      keywords: 'personal discounts defective garments fines bad pieces reason charge balance'
    }
  ],
  extras: [
    {
      title: 'What are Extras and when should they be used?',
      content: (
        <div>
          <p>The <strong>Extras</strong> section is designed to register and control auxiliary tasks or services associated with a cut of garments, separately from the main assembly line. Common examples of extra jobs include:</p>
          <ul>
            <li>Sewing specialized labels or brand tags.</li>
            <li>Stitching specific buttons, snaps, or zippers.</li>
            <li>Ironing, thread-trimming, packaging, or manual quality control.</li>
            <li>Any secondary labor billed as a surplus or auxiliary piece rate.</li>
          </ul>
          <p><strong>Key difference from standard Production:</strong></p>
          <ul>
            <li><strong>Multiple Assignment:</strong> Unlike regular production orders (which restrict assigning a single cut to multiple tailors simultaneously to avoid physical stock duplication), Extras allow you to register multiple auxiliary tasks for the exact same cut using different tailors and rates.</li>
            <li><strong>No Stock Duplication:</strong> Extras represent financial labor and service charges. Therefore, when an extra is completed, <strong>it does not duplicate or create a new physical row in Real Inventory</strong>, preventing any distortion of your real physical stock values.</li>
          </ul>
        </div>
      ),
      keywords: 'extras what are when to use extra work auxiliary tasks buttons labels ironing packaging inventory labor'
    },
    {
      title: 'Creating Extras from Production (Sparkles Shortcut)',
      content: (
        <div>
          <p>To speed up your workflow, you can launch an extra order directly from the active Production panel:</p>
          <ol>
            <li>Go to the <strong>Production</strong> board and find the in-progress order in the table.</li>
            <li>In the actions column of that row, click the premium <strong>Sparkles</strong> icon with a pink-violet gradient.</li>
            <li>The ERP will automatically redirect you to the <strong>Extras</strong> screen and open the <strong>+ New Extra Order</strong> modal.</li>
            <li>You will notice that the <strong>Inventory Product</strong>, <strong>Piece Count</strong>, <strong>Client</strong>, and <strong>Dates</strong> are already pre-filled and locked (read-only) to prevent manual input errors, ensuring the extra is correctly linked.</li>
            <li>You only need to select the tailor responsible for the extra and enter the unit cost in the price field.</li>
          </ol>
        </div>
      ),
      keywords: 'shortcut sparkles launch create extra production prefilled read only lock'
    },
    {
      title: 'Manual Pricing and Settling Extras in Payments',
      content: (
        <div>
          <p>The financial record and payroll tracking for extra jobs follow a flexible scheme:</p>
          <ul>
            <li><strong>Manual Extra Price:</strong> When creating an extra, you must manually input the <strong>Extra Price ($)</strong> per piece. This offers complete operational freedom to set tailored rates (e.g., $3.50 for label sewing or $5.00 for buttons).</li>
            <li><strong>Automatic Payroll Computation:</strong> The system computes the total order cost in real time by multiplying the received pieces by the unit extra price configured.</li>
            <li><strong>Payroll Settlement (Payments):</strong> When you mark the Extra job as "Finished", the pending wage balance is sent to the <strong>Payments</strong> module.</li>
            <li>In the order selection dropdown to generate a tailor payment, extra tasks are clearly identified by the highlight suffix **(EXTRA)** appended to the end of the product code (e.g., <em>MD-2030 (EXTRA)</em>). This allows you to distinguish basic sewing from auxiliary services instantly.</li>
          </ul>
        </div>
      ),
      keywords: 'manual price extra automatic calculation payroll payments settlement dropdown extra suffix'
    }
  ],
  camion: [
    {
      title: 'How does the Truck Shipping section (Colima shipments) work?',
      content: (
        <div>
          <p>The <strong>Truck</strong> section is designed to manage precise, unalterable shipments of finished garments from the maquila to the factory in Colima.</p>
          <ol>
            <li><strong>Available Models:</strong> On the left side, you will see finished garments coming strictly from production orders with a status of <strong>"Finished"</strong> or <strong>"Partially Finished"</strong> that have a balance available for shipping.</li>
            <li><strong>Tailor Identification:</strong> Each model card features a purple badge displaying the name of the tailor who crafted the garments, instantly showing each lot\'s origin.</li>
            <li><strong>Loading the Truck:</strong> You can drag a model from the left list and drop it onto the virtual truck area on the right, or simply click the <strong>(+) Load to Truck</strong> button.</li>
            <li><strong>Mandatory Size Distribution:</strong> Upon loading a lot, a popup window will open where you must enter the exact quantities for the standard sizes (<strong>05, 07, 09, 11, 13, and 15</strong>). The system validates in real time: the confirm button will only activate when the sum of sizes matches the total cargo quantity exactly. You can send the full lot or make a <strong>partial shipment</strong> by entering a smaller amount.</li>
            <li><strong>Shipping the Truck:</strong> Once all models are loaded, select the <strong>Shipping Date</strong>, add notes (e.g. driver, license plates, etc.), and click <strong>Ship Truck</strong>. When shipped:
              <ul>
                <li>The pieces are deducted from the balance of the original production order.</li>
                <li>They are automatically subtracted from the <strong>Real Physical Inventory</strong>.</li>
                <li>An unalterable record is logged in the Audit History.</li>
              </ul>
            </li>
          </ol>
        </div>
      ),
      keywords: 'truck shipping colima sizes distribution pieces ship driver plates'
    },
    {
      title: 'Truck Shipping History and Audit',
      content: (
        <div>
          <p>All dispatched trucks are recorded in an unalterable log in the <strong>Shipped Trucks History</strong> section below:</p>
          <ul>
            <li>Each shipped truck is displayed in an accordion card showing the Truck ID, Shipped Date, and notes.</li>
            <li>Clicking any truck expands a panel showing the complete table with models, colors, order numbers, total pieces, and the exact size breakdown of each shipped garment.</li>
          </ul>
        </div>
      ),
      keywords: 'trucks history log sizes breakdown audit query'
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
    { id: 'extras', name: t('nav.extras'), icon: <Sparkles size={18} /> },
    { id: 'camion', name: t('nav.camion'), icon: <Truck size={18} /> },
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
