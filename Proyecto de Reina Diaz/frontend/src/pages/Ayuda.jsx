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
  Truck,
  Flame,
  Layers
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
            <li><strong>Producción (produccion1, produccion2):</strong> Tienen permitido gestionar maquileros y órdenes de producción, registrar piezas recibidas y realizar el control de pagos/abonos. En <strong>Cortes</strong> solo pueden ver las observaciones e iniciar producción de un corte disponible — no pueden editar, eliminar ni subir/cambiar la foto de un corte (reservado para Admin e Inventario). Tampoco tienen acceso a la eliminación crítica ni a reportes financieros de auditoría completa.</li>
            <li><strong>Inventario (inventario1):</strong> Encargado de registrar los cortes de prendas y sus variantes de color/cantidad, así como consultar y administrar la salida del stock final en el inventario real. También tiene acceso al módulo de <strong>Telas</strong>. No tienen acceso a nóminas, pagos ni reportes financieros.</li>
            <li><strong>Telas (telas1, telas2):</strong> Acceso exclusivo al módulo de <strong>Telas</strong> (almacén de materia prima textil): catálogos, generación de código, recepción de facturas y salidas de tela. No tienen acceso a ningún otro módulo del sistema (Maquileros, Inventario de prenda terminada, Cortes, Producción, Pagos).</li>
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
          <p> El módulo de <strong>Cortes</strong> sirve para dar de alta nuevos lotes de diseño y las piezas que se han cortado y están listas para coser:</p>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '1.5rem 0', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', overflowX: 'auto', fontSize: '0.8rem' }}>
            <div style={{ minWidth: '100px', padding: '6px', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '6px', textAlign: 'center', color: '#fff' }}>
              <strong>1. Registro</strong><br/><span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Manual o Excel</span>
            </div>
            <ArrowRight size={14} color="#64748b" />
            <div style={{ minWidth: '100px', padding: '6px', background: 'rgba(167, 139, 250, 0.1)', border: '1px solid rgba(167, 139, 250, 0.3)', borderRadius: '6px', textAlign: 'center', color: '#fff' }}>
              <strong>2. Variantes</strong><br/><span style={{ fontSize: '0.7rem', color: '#c4b5fd' }}>Colores/Cantidades</span>
            </div>
            <ArrowRight size={14} color="#64748b" />
            <div style={{ minWidth: '100px', padding: '6px', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '6px', textAlign: 'center', color: '#fff' }}>
              <strong>3. Tarifa</strong><br/><span style={{ fontSize: '0.7rem', color: '#fcd34d' }}>Precio Maquila</span>
            </div>
            <ArrowRight size={14} color="#64748b" />
            <div style={{ minWidth: '100px', padding: '6px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '6px', textAlign: 'center', color: '#fff' }}>
              <strong>4. Estatus</strong><br/><span style={{ fontSize: '0.7rem', color: '#6ee7b7' }}>Disponible (Rojo)🔴</span>
            </div>
          </div>

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
    },
    {
      title: 'Contador de Piezas Totales y Permisos de Edición por Rol',
      content: (
        <div>
          <p>Al entrar a <strong>Cortes</strong> verás, como primer elemento de la pantalla, una tarjeta destacada con el <strong>Total de Piezas en Corte</strong> (la suma de todas las piezas disponibles de los modelos activos) y el número de modelos activos — así puedes ver de un vistazo cuánto material tienes pendiente de asignar, sin sumarlo a mano.</p>
          <div className="step-alert">
            <strong>💡 Permisos según tu rol:</strong> Los usuarios de <strong>Producción (produccion1, produccion2)</strong> solo pueden <strong>ver las Observaciones</strong> de un corte y usar el botón <strong>Iniciar Producción</strong>. No pueden editar los datos del corte, eliminarlo ni subir/cambiar su foto — esas acciones están reservadas para <strong>Admin</strong> e <strong>Inventario</strong>, para evitar cambios accidentales al precio, piezas o colores de un corte ya en uso.
          </div>
        </div>
      ),
      keywords: 'contador total piezas corte permisos roles produccion editar restriccion observaciones iniciar produccion'
    }
  ],
  produccion: [
    {
      title: 'Asignar una Orden de Producción a un Maquilero',
      content: (
        <div>
          <p> Para enviar un lote de corte disponible a confección con un maquilero:</p>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '1.5rem 0', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', overflowX: 'auto', fontSize: '0.8rem' }}>
            <div style={{ minWidth: '100px', padding: '6px', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '6px', textAlign: 'center', color: '#fff' }}>
              <strong>1. Orden</strong><br/><span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Asignar Corte 🟢</span>
            </div>
            <ArrowRight size={14} color="#64748b" />
            <div style={{ minWidth: '100px', padding: '6px', background: 'rgba(167, 139, 250, 0.1)', border: '1px solid rgba(167, 139, 250, 0.3)', borderRadius: '6px', textAlign: 'center', color: '#fff' }}>
              <strong>2. Control Inline</strong><br/><span style={{ fontSize: '0.7rem', color: '#c4b5fd' }}>Recibir Piezas</span>
            </div>
            <ArrowRight size={14} color="#64748b" />
            <div style={{ minWidth: '100px', padding: '6px', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '6px', textAlign: 'center', color: '#fff' }}>
              <strong>3. Ajustes</strong><br/><span style={{ fontSize: '0.7rem', color: '#fcd34d' }}>Bono / Penaliz.</span>
            </div>
            <ArrowRight size={14} color="#64748b" />
            <div style={{ minWidth: '100px', padding: '6px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '6px', textAlign: 'center', color: '#fff' }}>
              <strong>4. Término</strong><br/><span style={{ fontSize: '0.7rem', color: '#6ee7b7' }}>Nómina / Archivo</span>
            </div>
          </div>

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
      title: 'El nuevo Flujo de "Pago Parcial" (Efecto en Pagos y Camión)',
      content: (
        <div>
          <p>Para resolver la necesidad de recibir entregas de piezas de forma escalonada a lo largo del tiempo, se ha implementado el estado <strong>Pago Parcial</strong>:</p>
          <ul>
            <li><strong>¿Qué es?:</strong> Es un estado intermedio que indica que el maquilero ha entregado una parte del lote, pero el trabajo de costura total aún no ha concluido.</li>
            <li><strong>Acciones siempre Habilitadas:</strong> A diferencia de una orden completamente Terminada (que bloquea sus datos), una orden en "Pago Parcial" mantiene <strong>completamente habilitados todos los controles operativos</strong>. Podrás seguir editando inline la cantidad de "Recibidas", aplicar bonos o descuentos y prorrogar la fecha de entrega.</li>
            <li><strong>Control de Nómina Parcial:</strong> Puedes dirigirte al módulo de <strong>Pagos</strong> y registrar abonos y pagos sobre el saldo neto de las piezas recibidas hasta el momento. Esto te permite ir pagando al maquilero semanalmente conforme te entrega mercancía sin tener que esperar a que termine el lote completo.</li>
            <li><strong>Cargar al Camión:</strong> Las prendas que has recibido de una orden en estado "Pago Parcial" ingresan al stock activo de maquila y pueden ser cargadas al <strong>Camión</strong> de envío a Colima al instante, de manera parcial o total.</li>
          </ul>
        </div>
      ),
      keywords: 'pago parcial flujo pagos abonos entregas parciales camion costura inline recibidas'
    },
    {
      title: 'Ordenar por Fecha y Registro de Entregas (Semáforo de Puntualidad)',
      content: (
        <div>
          <p>Las 3 pestañas de Producción (En Proceso, Recepción, Terminadas) se ordenan automáticamente por <strong>fecha de entrega estimada</strong>, mostrando primero las órdenes más atrasadas:</p>
          <ul>
            <li><strong>🔴 Rojo:</strong> 4 días o más de retraso sobre la fecha estimada.</li>
            <li><strong>🟡 Amarillo:</strong> Entre 1 y 3 días de retraso.</li>
            <li><strong>🟢 Verde/Normal:</strong> A tiempo o sin fecha vencida todavía.</li>
          </ul>
          <p>Además, en la columna <strong>Registro de Entregas</strong> puedes llevar un historial manual de cuándo llegaron piezas de esa orden en la realidad:</p>
          <ol>
            <li>Haz clic en el botón de esa columna (muestra "Sin registros" o el número de registros ya guardados).</li>
            <li>En la ventana emergente, agrega una <strong>fecha</strong> (y una nota opcional, ej. "entregó 30 pzs") por cada entrega real que recibas.</li>
            <li>El sistema compara automáticamente esa fecha contra la fecha de entrega estimada y la marca como <strong>"A tiempo"</strong> o <strong>"Tarde (X días)"</strong>.</li>
            <li>Puedes agregar varios registros para la misma orden (entregas parciales en distintas fechas) y eliminar los que te hayas equivocado al capturar.</li>
          </ol>
          <div className="step-alert">
            <strong>💡 ¿Para qué sirve?</strong> A diferencia de la fecha de entrega estimada (que solo compara contra "hoy"), este registro queda guardado permanentemente — incluso después de que la orden se archive — para que puedas evaluar objetivamente qué tan puntual es cada maquilero con el tiempo. Esta misma columna también está disponible en <strong>Extras</strong>.
          </div>
        </div>
      ),
      keywords: 'registro de entregas fecha semaforo puntualidad atrasado retraso a tiempo tarde bitacora orden'
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
    },
    {
      title: 'Campo "Piezas a Pagar" y candado del Monto',
      content: (
        <div>
          <p>Entre el <strong>Tipo de Pago</strong> y el <strong>Monto</strong> encontrarás el campo <strong>Piezas a Pagar</strong>:</p>
          <ul>
            <li>Al escribir un número de piezas, el <strong>Monto</strong> se calcula solo (piezas × precio por pieza) — ya no necesitas sacar la cuenta a mano.</li>
            <li>El campo muestra cuántas piezas <strong>quedan realmente pendientes</strong> de pago en esa orden ("quedan: X pz"), y si intentas poner un número mayor, el sistema lo recorta automáticamente a lo que en verdad se puede pagar — así se evita registrar un pago por más piezas de las que en realidad faltan.</li>
            <li><strong>El campo Monto ya no se puede escribir libremente</strong>, salvo para el rol <strong>Admin</strong>, que sí puede editarlo directamente para casos especiales (ajustes, correcciones).</li>
          </ul>
        </div>
      ),
      keywords: 'piezas a pagar monto candado bloqueo admin calculo automatico'
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
      title: 'Crear un Trabajo Extra',
      content: (
        <div>
          <p>Para registrar un trabajo extra, hazlo directamente desde la sección de <strong>Extras</strong>:</p>
          <ol>
            <li>Ve al panel de <strong>Extras</strong> en el menú lateral.</li>
            <li>Haz clic en <strong>+ Nueva Orden</strong>.</li>
            <li>Selecciona el <strong>Maquilero</strong>, el <strong>Producto del Inventario</strong> asociado, la cantidad de piezas y las fechas.</li>
            <li>Captura el <strong>Precio Extra ($)</strong> por pieza para esta tarea auxiliar.</li>
          </ol>
        </div>
      ),
      keywords: 'crear nuevo trabajo extra orden maquilero producto precio'
    },
    {
      title: 'Registro de Entregas en Extras',
      content: (
        <div>
          <p>Al igual que en <strong>Producción</strong>, cada orden de Extras tiene su propia columna de <strong>Registro de Entregas</strong>: puedes anotar la fecha real (y una nota opcional) de cada entrega, y el sistema la marca automáticamente como "A tiempo" o "Tarde" comparándola contra la fecha estimada.</p>
        </div>
      ),
      keywords: 'registro entregas extras fecha bitacora a tiempo tarde'
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
            <li><strong>Modelos Disponibles:</strong> En la parte izquierda verás las prendas confeccionadas provenientes estrictamente de órdenes de producción cuyo estado sea <strong>"Terminado"</strong> o <strong>"Pago Parcial"</strong> y que tengan saldo disponible para enviar.</li>
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
    },
    {
      title: 'Entrega Adelantada y Buscadores en Camión',
      content: (
        <div>
          <p>Si un maquilero entrega piezas de una orden que <strong>todavía está en proceso</strong> (antes de terminar todo el lote), puedes registrarlo sin esperar a que la orden se marque como Terminada:</p>
          <ol>
            <li>Haz clic en <strong>+ Entrega Adelantada</strong>, junto a la lista de modelos disponibles.</li>
            <li>Busca y selecciona la orden activa correspondiente (puedes usar el buscador dentro de la ventana para encontrarla por modelo, maquilero u orden).</li>
            <li>Distribuye las piezas entregadas por talla, igual que en una carga normal.</li>
          </ol>
          <p>Además, tanto la lista de <strong>modelos disponibles</strong> como el <strong>panel del camión</strong> (una vez que ya cargaste algo) cuentan con su propio buscador, para encontrar rápido un modelo, color u orden específica sin tener que hacer scroll por toda la lista.</p>
        </div>
      ),
      keywords: 'entrega adelantada buscador buscar camion modelos disponibles panel'
    },
    {
      title: 'Generar el Reporte de Camión (PDF)',
      content: (
        <div>
          <p>Desde la sección de <strong>Reportes</strong>, la tarjeta <strong>Reporte de Camión</strong> genera un PDF con la misma lista de "Modelos Terminados en Maquila" que ves en la pantalla de Camión: modelo, maquilero, orden, cliente, colores disponibles con su cantidad exacta, precio y piezas disponibles — además del total de lotes y piezas.</p>
          <div className="step-alert">
            <strong>💡 Filtro de Entregas Adelantadas:</strong> Marca la casilla <strong>"Incluir también modelos con Entrega Adelantada ya aplicada"</strong> para agregar, en una sección aparte y claramente marcada, únicamente los modelos que <strong>ya se subieron al camión</strong> antes de que su orden estuviera Terminada (no una lista de candidatos que podrían aplicarla, solo los que de verdad se usaron).
          </div>
        </div>
      ),
      keywords: 'reporte camion pdf reportes entregas adelantadas lotes piezas disponibles'
    }
  ],
  plancha: [
    {
      title: '¿Cómo funciona el Módulo de Plancha?',
      content: (
        <div>
          <p>El módulo de <strong>Plancha</strong> está diseñado para controlar el trabajo de los planchadores de manera independiente y enlazada con los envíos de Colima:</p>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '1.5rem 0', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', overflowX: 'auto', fontSize: '0.8rem' }}>
            <div style={{ minWidth: '90px', padding: '6px', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '6px', textAlign: 'center', color: '#fff' }}>
              <strong>1. Camión</strong><br/><span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Llegada</span>
            </div>
            <ArrowRight size={14} color="#64748b" />
            <div style={{ minWidth: '90px', padding: '6px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '6px', textAlign: 'center', color: '#fff' }}>
              <strong>2. Tránsito</strong><br/><span style={{ fontSize: '0.7rem', color: '#fca5a5' }}>Bloqueado 🔒</span>
            </div>
            <ArrowRight size={14} color="#64748b" />
            <div style={{ minWidth: '90px', padding: '6px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '6px', textAlign: 'center', color: '#fff' }}>
              <strong>3. Verificar</strong><br/><span style={{ fontSize: '0.7rem', color: '#6ee7b7' }}>Precio / Tallas 🔓</span>
            </div>
            <ArrowRight size={14} color="#64748b" />
            <div style={{ minWidth: '90px', padding: '6px', background: 'rgba(167, 139, 250, 0.1)', border: '1px solid rgba(167, 139, 250, 0.3)', borderRadius: '6px', textAlign: 'center', color: '#fff' }}>
              <strong>4. Burros</strong><br/><span style={{ fontSize: '0.7rem', color: '#c4b5fd' }}>Asignar</span>
            </div>
            <ArrowRight size={14} color="#64748b" />
            <div style={{ minWidth: '90px', padding: '6px', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '6px', textAlign: 'center', color: '#fff' }}>
              <strong>5. Nómina</strong><br/><span style={{ fontSize: '0.7rem', color: '#fcd34d' }}>Pago / Asist.</span>
            </div>
          </div>

          <ul>
            <li><strong>Enlace con Camión:</strong> Los modelos cargados en Puebla y enviados en los camiones aparecen de inmediato en Colima como <em>Modelos en Tránsito</em> de forma automática.</li>
            <li><strong>Estatus Bloqueado (Candado):</strong> Al llegar, el modelo está bloqueado para plancha hasta que el administrador verifique las cantidades por talla y asigne el precio por prenda.</li>
            <li><strong>Burros de Planchado:</strong> Tableros de trabajo independientes donde se distribuyen las piezas y tallas a cada planchador responsable.</li>
            <li><strong>Nómina y Control de Asistencia:</strong> El trabajo terminado se carga directamente a la cuenta del planchador, complementándose con su asistencia diaria para calcular el pago neto de la semana.</li>
          </ul>
        </div>
      ),
      keywords: 'plancha planchadores burros asistencia pagos nómina'
    },
    {
      title: 'Verificación de Modelos y Control de Camión (Modelos Tránsito)',
      content: (
        <div>
          <p>Cuando un camión sale de Puebla, los modelos y sus piezas se cargan automáticamente en el módulo de Plancha como <strong>Modelos en Tránsito / Colima</strong> en estado bloqueado (icono de candado 🔒).</p>
          <ol>
            <li><strong>Recepción Física:</strong> Al llegar el camión a Colima, el administrador debe abrir la ventana de <strong>Verificar</strong> en el modelo correspondiente.</li>
            <li><strong>Verificar Cantidades:</strong> El sistema mostrará el desglose exacto de colores y piezas por talla que se enviaron en el camión. Se debe constatar físicamente que todo haya llegado completo.</li>
            <li><strong>Asignar Precio de Plancha:</strong> Introduzca el precio que se pagará por el planchado de cada pieza de ese modelo (ej. $8.00).</li>
            <li><strong>Desbloqueo Automático:</strong> Al guardar, el modelo cambia a estado <strong>Desbloqueado 🔓</strong>, permitiendo comenzar a asignar piezas a los planchadores.</li>
            <li><strong>Seguridad (Sin Devolución):</strong> Para evitar errores históricos y duplicidades de inventario en modelos específicos (como el <em>723131</em>), el botón de devoluciones se encuentra deshabilitado de forma permanente, mostrando la etiqueta <strong>Sin Devolución</strong> para proteger el flujo del sistema.</li>
          </ol>

          <div style={{ padding: '1rem', background: 'rgba(59, 130, 246, 0.05)', borderLeft: '4px solid #3b82f6', borderRadius: '4px', marginTop: '1rem' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', color: '#60a5fa' }}><strong>Caso Real: Recepción del Modelo 723131</strong></h4>
            <p style={{ margin: 0, fontSize: '0.9rem' }}>El camión histórico llega a Colima con 80 piezas del modelo <strong>723131</strong> (32 estampadas y 48 limón) distribuidas en tallas 05, 07, 09 y 11. El administrador abre la ventana de verificación, constata el desglose físico, ingresa el precio de plancha (ej. $10.00) y da clic en verificar. El candado cambia a verde (abierto) y el modelo queda listo para planchar sin posibilidad de ser devuelto accidentalmente a Puebla.</p>
          </div>
        </div>
      ),
      keywords: 'verificacion verificar camión candado bloqueo desbloqueo precio plancha devolucion seguridad'
    },
    {
      title: 'Asignación por Burros y Proceso de Planchado',
      content: (
        <div>
          <p>La distribución de prendas a los planchadores se realiza a través de mesas de trabajo llamadas <strong>Burros</strong>:</p>
          <ol>
            <li><strong>Distribución de Trabajo:</strong> El administrador arrastra un modelo desbloqueado desde la lista de "Modelos por Planchar" hacia el burro del planchador, o hace clic directo en el botón de asignación.</li>
            <li><strong>Especificar Piezas y Tallas:</strong> En el formulario, seleccione al planchador, ingrese el color/talla de las piezas que se le entregarán físicamente y el número total de prendas a planchar.</li>
            <li><strong>Control de Pendientes:</strong> Las piezas asignadas se restan automáticamente del saldo de "Modelos por Planchar". Cuando todas las piezas de un modelo han sido planchadas (terminadas), el modelo **desaparece automáticamente** de la vista para mantener las listas limpias, pero sus registros históricos se conservan intactos en la base de datos para auditorías y reportes analíticos.</li>
          </ol>

          <div style={{ padding: '1rem', background: 'rgba(16, 185, 129, 0.05)', borderLeft: '4px solid #10b981', borderRadius: '4px', marginTop: '1rem' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', color: '#34d399' }}><strong>Caso Real: Planchado del Modelo 723160</strong></h4>
            <p style={{ margin: 0, fontSize: '0.9rem' }}>El modelo 723160 cuenta con 32 piezas mostaza y 12 piezas negras en tránsito. El administrador asigna 8 piezas mostaza talla 05 al planchador "Felipe" en el Burro 1. Al guardarse, Felipe tiene una tarea activa. Al terminar su turno, el administrador marca las piezas como completadas; el sistema descuenta las 8 piezas del camión, registra $64.00 (8 piezas × $8.00) en la nómina de Felipe y el modelo 723160 muestra ahora solo 24 piezas mostaza pendientes en el camión.</p>
          </div>
        </div>
      ),
      keywords: 'burros asignar planchado arrastrar modelos piezas tallas colores pendientes'
    },
    {
      title: 'Asistencias, Nómina y Pagos de Planchadores',
      content: (
        <div>
          <p>El sistema calcula de forma integrada los ingresos semanales de cada planchador:</p>
          <ul>
            <li><strong>Registro de Asistencias:</strong> El administrador marca diariamente la asistencia de los planchadores. Cada día asistido puede configurarse para sumar un apoyo/bono diario de asistencia en su liquidación.</li>
            <li><strong>Cálculo Automático de Nómina:</strong> El saldo neto a pagar se calcula multiplicando cada pieza planchada por el precio de plancha de su respectivo modelo, más la suma de los apoyos de asistencia registrados.</li>
            <li><strong>Liquidación y Recibo de Nómina:</strong> Al final de la semana, se registra el pago (Abono o Liquidación Completa) y el sistema permite imprimir un comprobante físico en formato PDF detallando las piezas planchadas, tallas, asistencias cobradas y firmas de conformidad.</li>
          </ul>

          <div style={{ padding: '1rem', background: 'rgba(245, 158, 11, 0.05)', borderLeft: '4px solid #f59e0b', borderRadius: '4px', marginTop: '1rem' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', color: '#fbbf24' }}><strong>Ejemplo de Cálculo: Nómina de Juan Pérez</strong></h4>
            <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem' }}>Durante la semana, Juan realizó el siguiente trabajo:</p>
            <ul style={{ fontSize: '0.85rem', margin: '0 0 0.5rem 0', paddingLeft: '20px' }}>
              <li><strong>Modelo 723131:</strong> 50 piezas planchadas a $10.00 c/u = <strong>$500.00</strong></li>
              <li><strong>Modelo 723160:</strong> 80 piezas planchadas a $8.00 c/u = <strong>$640.00</strong></li>
              <li><strong>Asistencias:</strong> 5 días de asistencia registrada con apoyo de $50.00 diarios = <strong>$250.00</strong></li>
              <li><strong style={{ color: '#fbbf24' }}>Total Saldo Acumulado: $500 + $640 + $250 = $1,390.00</strong></li>
            </ul>
            <p style={{ margin: 0, fontSize: '0.9rem' }}>El administrador registra un pago de $1,390.00 de tipo liquidación completa. La cuenta de Juan vuelve a $0.00, se imprime su comprobante PDF y el historial se archiva de forma segura.</p>
          </div>
        </div>
      ),
      keywords: 'asistencia apoyo nomina planchador liquidacion pagos recibo comprobante pdf'
    }
  ],
  telas: [
    {
      title: '¿Qué es el módulo de Telas y para qué sirve?',
      content: (
        <div>
          <p>El módulo de <strong>Telas</strong> lleva el control del almacén de materia prima textil (telas, no de la prenda terminada). Es completamente independiente de Maquileros, Inventario, Cortes y Producción — no afecta ni depende de ningún dato de esos módulos.</p>
          <p>Su propósito es responder al instante preguntas como "¿cuánto llegó del código X?" o "¿cuánto queda en existencia?", sin tener que revisar libretas físicas ni pedir un reporte manual cada vez.</p>
          <div className="workflow-container" style={{ marginTop: '15px', marginBottom: '15px' }}>
            <div className="workflow-title">Flujo de Recepción de Telas</div>
            <div className="workflow-steps-flex">
              <div className="workflow-step-box">
                <span className="workflow-step-num">1</span>
                <div className="workflow-step-name">Generar Código</div>
              </div>
              <div className="workflow-step-arrow"><ArrowRight size={16} /></div>
              <div className="workflow-step-box">
                <span className="workflow-step-num">2</span>
                <div className="workflow-step-name">Dar de Entrada</div>
              </div>
              <div className="workflow-step-arrow"><ArrowRight size={16} /></div>
              <div className="workflow-step-box">
                <span className="workflow-step-num">3</span>
                <div className="workflow-step-name">Revisión de Ancho</div>
              </div>
              <div className="workflow-step-arrow"><ArrowRight size={16} /></div>
              <div className="workflow-step-box">
                <span className="workflow-step-num">4</span>
                <div className="workflow-step-name">Salidas</div>
              </div>
            </div>
          </div>
          <ol>
            <li><strong>Generar Código:</strong> En la pestaña "Catálogos y Códigos", se elige el tipo de tela, el proveedor, la referencia del proveedor y el color, junto con el precio en dólares y el tipo de cambio. El sistema arma el código automáticamente (no requiere escribirlo a mano ni pedirlo a una IA cada vez).</li>
            <li><strong>Dar de Entrada:</strong> En "Facturas y Recepción", se registra la factura del proveedor y se agregan las líneas de recepción (código, rollos y yardas). El sistema convierte yardas a metros automáticamente y muestra el resultado antes de guardar.</li>
            <li><strong>Revisión de Ancho / Devolución:</strong> Cada línea recibida se puede marcar como Aprobada o Devuelta una vez que se revisa físicamente el ancho del rollo. Al <strong>aprobar</strong>, se puede corregir la cantidad de rollos/yardas si lo que llegó físicamente fue distinto de lo capturado al dar de entrada — esa corrección actualiza la existencia real. Una línea marcada como <strong>Devuelta</strong> deja de contar en la existencia disponible.</li>
            <li><strong>Salidas:</strong> Cuando se usa tela de la existencia, se registra la salida en metros y su destino, para mantener actualizada la existencia disponible de cada código.</li>
          </ol>
          <p style={{ marginTop: '10px' }}>La sección de recepción ya no maneja "modelos" como campo — para pedir tela destinada a un modelo específico se usa la <strong>Requisición de Tela</strong> (ver guía siguiente).</p>
          <p>Cada factura muestra un estado de revisión general en su listado: <strong>Sin revisar</strong> (ninguna línea tocada), <strong>Revisado parcial</strong> (algunas líneas aprobadas/devueltas, otras pendientes) o <strong>Revisado total</strong> (todas las líneas ya resueltas).</p>
        </div>
      ),
      keywords: 'telas almacen materia prima algodon proveedor rollos yardas metros codigo generar recepcion revisado'
    },
    {
      title: 'Generar un código de tela y su fórmula de precio',
      content: (
        <div>
          <p>El código se arma automáticamente con la estructura: <strong>F</strong> + 2 letras del tipo de tela + 1 letra del proveedor + 3 dígitos de la referencia del proveedor + 3 letras del color. Ejemplo: <code>FSZE101NEG</code> (Satín Zoe, proveedor EKB, referencia 101, Negro).</p>
          <p>El precio del código es <strong>por metro</strong>, aunque los proveedores casi siempre cotizan por yarda. La fórmula es: <strong>techo((precio en USD por yarda ÷ 0.9144) × tipo de cambio + $5 MXN de paquetería)</strong>. Por ejemplo, $4.55 USD ÷ 0.9144 = $4.98 USD por metro, × 21 = $104.49, + $5 = $109.49, que se redondea hacia arriba a <strong>$110 MXN por metro</strong>.</p>
          <p>Antes de generar un código nuevo, hay que dar de alta el tipo de tela, el proveedor y/o el color en sus catálogos correspondientes (solo se hace una vez por cada uno; después quedan disponibles para todos los códigos futuros). La abreviatura de un tipo de tela sí se puede repetir entre dos telas distintas — solo se bloquea si el nombre, la abreviatura y la composición son exactamente iguales a un tipo ya existente.</p>
          <p>Desde cada factura abierta se pueden imprimir las <strong>tarjetas físicas</strong> (una por código, sumando todos sus rollos/yardas/metros dentro de esa factura, con el número de factura en la esquina superior derecha, para grapar la muestra de tela) y la <strong>nota de remisión</strong> (con IVA del 16% ya calculado) directamente en PDF.</p>
        </div>
      ),
      keywords: 'codigo generar formula precio tipo de cambio tarjetas remision iva proveedor color abreviatura repetida'
    },
    {
      title: 'Requisición de tela: pedir tela para un modelo y surtirla',
      content: (
        <div>
          <p>La <strong>Requisición de Tela</strong> (pestaña "Requisiciones") es cómo se pide tela ya existente en el almacén para un modelo específico:</p>
          <ol>
            <li>Se captura el modelo (funciona como folio) y se agregan una o más líneas (código de tela, cantidad en metros y ancho).</li>
            <li>Se guarda como <strong>borrador</strong> y se le pueden seguir agregando líneas.</li>
            <li>Al presionar <strong>"Finalizar"</strong>, la requisición pasa a la pestaña "Salidas", en la sección "Requisiciones por Surtir", agrupada con todas sus líneas juntas bajo el mismo folio.</li>
            <li>Alguien del almacén presiona <strong>"Surtir"</strong> en la línea que le corresponde: el sistema muestra <strong>todos los rollos con existencia de ese código</strong> (fecha, factura de origen, metros disponibles de cada uno) y ya sugiere de cuáles tomar los metros para cubrir lo más cercano posible a lo pedido — se puede ajustar cuánto tomar de cada rollo, o repartir entre varios. Al confirmar, <strong>solo hasta ese momento se descuenta la existencia real</strong> del código.</li>
          </ol>
          <p>Finalizar la requisición no descuenta nada por sí solo — la confirmación de "Surtir" es la única acción que mueve existencia.</p>
        </div>
      ),
      keywords: 'requisicion tela modelo surtir pendiente almacen pedido ancho folio rollos elegir'
    },
    {
      title: 'Ver el historial de salidas de un código o en general',
      content: (
        <div>
          <p>En "Códigos de Tela y Existencias", al hacer clic sobre cualquier fila se abre el historial de salidas de ese código específico (fecha, metros, destino y usuario).</p>
          <p>En "Salidas" hay además un historial general de todos los movimientos, con filtros de fecha, código de tela y destino/modelo.</p>
        </div>
      ),
      keywords: 'historial salidas filtro fecha codigo modelo consultar'
    },
    {
      title: 'Leer una factura o packing list con IA',
      content: (
        <div>
          <p>Dentro de una factura con un archivo adjunto (imagen o PDF), el botón <strong>"Leer con IA"</strong> envía ese documento a Claude para que detecte automáticamente, por estilo y color, cuántos rollos y cuántas yardas trae — útil cuando el packing list del proveedor lista cada rollo en un renglón suelto en vez de traer el total ya sumado.</p>
          <p>El resultado se muestra en una tabla editable: hay que revisar los números y elegir manualmente a qué <strong>código de tela</strong> corresponde cada línea detectada antes de agregarla — el sistema nunca inventa ni asigna el código por sí solo, eso siempre lo decide una persona.</p>
          <p>Esta función usa la API de pago de Anthropic, así que cada lectura tiene un costo — no es necesario usarla en cada factura si prefieren capturar a mano.</p>
        </div>
      ),
      keywords: 'ia leer factura packing list automatico anthropic claude rollos yardas'
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
            <li><strong>Production (produccion1, produccion2):</strong> Allowed to manage tailors and production orders, record received pieces, and manage payments/deposits. In <strong>Cuts</strong> they can only view notes and start production for an available cut — they cannot edit, delete, or upload/change a cut's photo (reserved for Admin and Inventory). They also do not have access to critical deletions or full financial audit logs.</li>
            <li><strong>Inventory (inventario1):</strong> Responsible for registering garment cuts and color/quantity variants, as well as consulting and managing finished physical stock outputs in the real inventory. Also has access to the <strong>Fabrics</strong> module. No access to payroll, payments, or financial reports.</li>
            <li><strong>Fabrics (telas1, telas2):</strong> Exclusive access to the <strong>Fabrics</strong> module (raw textile material warehouse): catalogs, code generation, invoice receiving, and fabric outbound movements. No access to any other module (Tailors, Finished Goods Inventory, Cuts, Production, Payments).</li>
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
    },
    {
      title: 'Total Pieces Counter and Role-Based Edit Permissions',
      content: (
        <div>
          <p>When you open <strong>Cuts</strong>, the first thing you'll see is a highlighted card showing the <strong>Total Pieces in Cuts</strong> (the sum of all available pieces across active models) and the number of active models — a quick snapshot of how much material is still waiting to be assigned, without adding it up by hand.</p>
          <div className="step-alert">
            <strong>💡 Permissions by role:</strong> <strong>Production users (produccion1, produccion2)</strong> can only <strong>view Notes</strong> on a cut and use the <strong>Start Production</strong> button. They cannot edit a cut's data, delete it, or upload/change its photo — those actions are reserved for <strong>Admin</strong> and <strong>Inventory</strong>, to prevent accidental changes to a cut's price, pieces, or colors while it's already in use.
          </div>
        </div>
      ),
      keywords: 'total pieces counter cut permissions roles production edit restriction notes start production'
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
    },
    {
      title: 'Sorting by Date and the Delivery Log (Punctuality Traffic Light)',
      content: (
        <div>
          <p>The 3 Production tabs (In Process, Received, Finished) automatically sort by <strong>estimated delivery date</strong>, showing the most overdue orders first:</p>
          <ul>
            <li><strong>🔴 Red:</strong> 4 or more days late versus the estimated date.</li>
            <li><strong>🟡 Yellow:</strong> Between 1 and 3 days late.</li>
            <li><strong>🟢 Green/Normal:</strong> On time or not yet due.</li>
          </ul>
          <p>Also, in the <strong>Delivery Log</strong> column you can keep a manual history of when pieces from that order actually arrived:</p>
          <ol>
            <li>Click that column's button (shows "No records" or the number of records already saved).</li>
            <li>In the popup, add a <strong>date</strong> (and an optional note, e.g. "delivered 30 pcs") for each real delivery you receive.</li>
            <li>The system automatically compares that date against the estimated delivery date and marks it as <strong>"On time"</strong> or <strong>"Late (X days)"</strong>.</li>
            <li>You can add several records for the same order (partial deliveries on different dates) and delete any you entered by mistake.</li>
          </ol>
          <div className="step-alert">
            <strong>💡 What is it for?</strong> Unlike the estimated delivery date (which only compares against "today"), this log is permanently saved — even after the order is archived — so you can objectively evaluate how punctual each tailor is over time. This same column is also available in <strong>Extras</strong>.
          </div>
        </div>
      ),
      keywords: 'delivery log date traffic light punctuality overdue delay on time late history order'
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
    },
    {
      title: '"Pieces to Pay" Field and the Amount Lock',
      content: (
        <div>
          <p>Between <strong>Payment Type</strong> and <strong>Amount</strong> you'll find the <strong>Pieces to Pay</strong> field:</p>
          <ul>
            <li>Type in a number of pieces and the <strong>Amount</strong> is calculated for you (pieces × price per piece) — no more manual math.</li>
            <li>The field shows how many pieces are <strong>actually still pending</strong> on that order ("remaining: X pcs"), and if you try to enter a higher number, the system automatically caps it to what can really be paid — preventing a payment for more pieces than are actually owed.</li>
            <li><strong>The Amount field can no longer be typed freely</strong>, except for the <strong>Admin</strong> role, who can still edit it directly for special cases (adjustments, corrections).</li>
          </ul>
        </div>
      ),
      keywords: 'pieces to pay amount lock admin automatic calculation'
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
      title: 'Creating an Extra Job',
      content: (
        <div>
          <p>To register an extra job, do it directly from the <strong>Extras</strong> section:</p>
          <ol>
            <li>Go to the <strong>Extras</strong> panel in the sidebar.</li>
            <li>Click <strong>+ New Order</strong>.</li>
            <li>Select the <strong>Tailor</strong>, the associated <strong>Inventory Product</strong>, the piece count, and the dates.</li>
            <li>Enter the <strong>Extra Price ($)</strong> per piece for this auxiliary task.</li>
          </ol>
        </div>
      ),
      keywords: 'create new extra job order tailor product price'
    },
    {
      title: 'Delivery Log in Extras',
      content: (
        <div>
          <p>Just like in <strong>Production</strong>, every Extras order has its own <strong>Delivery Log</strong> column: you can note the real date (and an optional note) for each delivery, and the system automatically marks it as "On time" or "Late" compared to the estimated date.</p>
        </div>
      ),
      keywords: 'delivery log extras date history on time late'
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
    },
    {
      title: 'Early Delivery and Search Bars in Truck',
      content: (
        <div>
          <p>If a tailor delivers pieces from an order that is <strong>still in process</strong> (before the full lot is finished), you can register it without waiting for the order to be marked Finished:</p>
          <ol>
            <li>Click <strong>+ Early Delivery</strong>, next to the list of available models.</li>
            <li>Search for and select the matching active order (use the search box inside the window to find it by model, tailor, or order).</li>
            <li>Distribute the delivered pieces by size, just like a normal load.</li>
          </ol>
          <p>Also, both the <strong>available models list</strong> and the <strong>truck cargo panel</strong> (once you've loaded something) have their own search box, so you can quickly find a specific model, color, or order without scrolling through the whole list.</p>
        </div>
      ),
      keywords: 'early delivery search bar truck available models cargo panel'
    },
    {
      title: 'Generating the Truck Report (PDF)',
      content: (
        <div>
          <p>From the <strong>Reports</strong> section, the <strong>Truck Report</strong> card generates a PDF with the same "Finished Models in Maquila" list you see on the Truck screen: model, tailor, order, client, available colors with exact quantities, price, and available pieces — plus the total batch and piece counts.</p>
          <div className="step-alert">
            <strong>💡 Early Delivery Filter:</strong> Check <strong>"Also include models with Early Delivery already applied"</strong> to add, in a separate, clearly marked section, only the models that were <strong>already loaded onto the truck</strong> before their order was Finished (not a list of candidates that could use it, only the ones that actually did).
          </div>
        </div>
      ),
      keywords: 'truck report pdf reports early deliveries batches available pieces'
    }
  ],
  plancha: [
    {
      title: 'How does the Ironing (Plancha) Module work?',
      content: (
        <div>
          <p>The <strong>Ironing (Plancha)</strong> module is designed to control the work of ironers independently and linked to the Colima shipments:</p>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '1.5rem 0', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', overflowX: 'auto', fontSize: '0.8rem' }}>
            <div style={{ minWidth: '90px', padding: '6px', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '6px', textAlign: 'center', color: '#fff' }}>
              <strong>1. Truck</strong><br/><span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Arrival</span>
            </div>
            <ArrowRight size={14} color="#64748b" />
            <div style={{ minWidth: '90px', padding: '6px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '6px', textAlign: 'center', color: '#fff' }}>
              <strong>2. Transit</strong><br/><span style={{ fontSize: '0.7rem', color: '#fca5a5' }}>Locked 🔒</span>
            </div>
            <ArrowRight size={14} color="#64748b" />
            <div style={{ minWidth: '90px', padding: '6px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '6px', textAlign: 'center', color: '#fff' }}>
              <strong>3. Verify</strong><br/><span style={{ fontSize: '0.7rem', color: '#6ee7b7' }}>Price / Sizes 🔓</span>
            </div>
            <ArrowRight size={14} color="#64748b" />
            <div style={{ minWidth: '90px', padding: '6px', background: 'rgba(167, 139, 250, 0.1)', border: '1px solid rgba(167, 139, 250, 0.3)', borderRadius: '6px', textAlign: 'center', color: '#fff' }}>
              <strong>4. Boards</strong><br/><span style={{ fontSize: '0.7rem', color: '#c4b5fd' }}>Assign</span>
            </div>
            <ArrowRight size={14} color="#64748b" />
            <div style={{ minWidth: '90px', padding: '6px', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '6px', textAlign: 'center', color: '#fff' }}>
              <strong>5. Payroll</strong><br/><span style={{ fontSize: '0.7rem', color: '#fcd34d' }}>Pay / Attendance</span>
            </div>
          </div>

          <ul>
            <li><strong>Truck Integration:</strong> Models loaded in Puebla and sent in the trucks automatically appear in Colima as <em>Models in Transit</em>.</li>
            <li><strong>Locked Status (Padlock):</strong> Upon arrival, the model is locked for ironing until the administrator verifies the quantities per size and assigns the price per garment.</li>
            <li><strong>Ironing Boards (Burros):</strong> Independent work tables where garments and sizes are distributed to each responsible ironer.</li>
            <li><strong>Payroll and Attendance Control:</strong> Completed work is loaded directly to the ironer's account, complemented by their daily attendance to calculate the net pay of the week.</li>
          </ul>
        </div>
      ),
      keywords: 'ironing ironers boards attendance payments payroll'
    },
    {
      title: 'Model Verification & Truck Control (Models in Transit)',
      content: (
        <div>
          <p>When a truck leaves Puebla, the models and their pieces are automatically loaded in the Ironing module as <strong>Models in Transit / Colima</strong> in a locked state (padlock icon 🔒).</p>
          <ol>
            <li><strong>Physical Reception:</strong> Upon the truck's arrival in Colima, the administrator must open the <strong>Verify</strong> window of the corresponding model.</li>
            <li><strong>Verify Quantities:</strong> The system will display the exact breakdown of colors and pieces per size sent in the truck. Check physically that everything arrived complete.</li>
            <li><strong>Assign Ironing Price:</strong> Enter the price to be paid for ironing each piece of that model (e.g., $8.00).</li>
            <li><strong>Automatic Unlock:</strong> Upon saving, the model changes to <strong>Unlocked 🔓</strong>, allowing you to start assigning pieces to the ironers.</li>
            <li><strong>Safety (No Return):</strong> To prevent historical errors and inventory duplications on specific models (such as <em>723131</em>), the return button is permanently disabled, displaying the <strong>No Return</strong> label to protect the system's flow.</li>
          </ol>

          <div style={{ padding: '1rem', background: 'rgba(59, 130, 246, 0.05)', borderLeft: '4px solid #3b82f6', borderRadius: '4px', marginTop: '1rem' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', color: '#60a5fa' }}><strong>Real Case: Reception of Model 723131</strong></h4>
            <p style={{ margin: 0, fontSize: '0.9rem' }}>The historical truck arrives in Colima with 80 pieces of model <strong>723131</strong> (32 printed and 48 lemon) distributed in sizes 05, 07, 09, and 11. The administrator opens the verification window, checks the physical breakdown, enters the ironing price (e.g., $10.00) and clicks verify. The padlock changes to green (open) and the model is ready to iron with no possibility of being accidentally returned to Puebla.</p>
          </div>
        </div>
      ),
      keywords: 'verification verify truck padlock lock unlock price ironing return safety'
    },
    {
      title: 'Assigning Work to the Ironing Boards',
      content: (
        <div>
          <p>The distribution of garments to the ironers is done through work tables called <strong>Burros</strong> (Ironing Boards):</p>
          <ol>
            <li><strong>Work Distribution:</strong> The administrator drags an unlocked model from the "Models to Iron" list to the ironer's board, or clicks directly on the assignment button.</li>
            <li><strong>Specify Pieces and Sizes:</strong> In the form, select the ironer, enter the color/size of the pieces to be physically delivered, and the total pieces to iron.</li>
            <li><strong>Pending Control:</strong> Assigned pieces are automatically deducted from the "Models to Iron" balance. When all pieces of a model have been ironed (completed), the model **automatically disappears** from the view to keep lists clean, but its historical records remain intact in the database for audits and analytical reports.</li>
          </ol>

          <div style={{ padding: '1rem', background: 'rgba(16, 185, 129, 0.05)', borderLeft: '4px solid #10b981', borderRadius: '4px', marginTop: '1rem' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', color: '#34d399' }}><strong>Real Case: Ironing of Model 723160</strong></h4>
            <p style={{ margin: 0, fontSize: '0.9rem' }}>Model 723160 has 32 mustard pieces and 12 black pieces in transit. The administrator assigns 8 mustard pieces size 05 to the ironer "Felipe" on Board 1. Upon saving, Felipe has an active task. At the end of his shift, the administrator marks the pieces as completed; the system deducts the 8 pieces from the truck, registers $64.00 (8 pieces × $8.00) in Felipe's payroll, and model 723160 now shows only 24 mustard pieces pending in the truck.</p>
          </div>
        </div>
      ),
      keywords: 'boards assign ironing drag models pieces sizes colors pending'
    },
    {
      title: 'Attendance, Payroll & Payments of Ironers',
      content: (
        <div>
          <p>The system calculates each ironer's weekly earnings in an integrated way:</p>
          <ul>
            <li><strong>Attendance Registry:</strong> The administrator marks the ironers' attendance daily. Each day attended can be configured to add a daily attendance allowance/bonus to their payroll.</li>
            <li><strong>Automatic Payroll Calculation:</strong> The net balance to pay is calculated by multiplying each ironed piece by the ironing price of its respective model, plus the sum of the registered attendance allowances.</li>
            <li><strong>Settlement and Payroll Receipt:</strong> At the end of the week, the payment (Deposit or Full Settlement) is registered and the system allows printing a physical receipt in PDF format detailing the ironed pieces, sizes, attendance collected, and conformity signatures.</li>
          </ul>

          <div style={{ padding: '1rem', background: 'rgba(245, 158, 11, 0.05)', borderLeft: '4px solid #f59e0b', borderRadius: '4px', marginTop: '1rem' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', color: '#fbbf24' }}><strong>Calculation Example: Juan Pérez's Payroll</strong></h4>
            <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem' }}>During the week, Juan performed the following work:</p>
            <ul style={{ fontSize: '0.85rem', margin: '0 0 0.5rem 0', paddingLeft: '20px' }}>
              <li><strong>Model 723131:</strong> 50 pieces ironed at $10.00 each = <strong>$500.00</strong></li>
              <li><strong>Model 723160:</strong> 80 pieces ironed at $8.00 each = <strong>$640.00</strong></li>
              <li><strong>Attendance:</strong> 5 days of registered attendance with allowance of $50.00 daily = <strong>$250.00</strong></li>
              <li><strong style={{ color: '#fbbf24' }}>Total Accumulated Balance: $500 + $640 + $250 = $1,390.00</strong></li>
            </ul>
            <p style={{ margin: 0, fontSize: '0.9rem' }}>The administrator registers a payment of $1,390.00 of type full settlement. Juan's account returns to $0.00, his PDF receipt is printed, and the history is archived securely.</p>
          </div>
        </div>
      ),
      keywords: 'attendance allowance payroll ironer settlement payments receipt PDF'
    }
  ],
  telas: [
    {
      title: 'What is the Fabrics module for?',
      content: (
        <div>
          <p>The <strong>Fabrics</strong> module manages the raw textile material warehouse (fabric, not finished garments). It is fully independent from Tailors, Inventory, Cuts, and Production — it does not affect or depend on any data from those modules.</p>
          <p>Its purpose is to instantly answer questions like "how much of code X arrived?" or "how much stock is left?", without checking physical notebooks or requesting a manual report each time.</p>
          <div className="workflow-container" style={{ marginTop: '15px', marginBottom: '15px' }}>
            <div className="workflow-title">Fabric Receiving Workflow</div>
            <div className="workflow-steps-flex">
              <div className="workflow-step-box">
                <span className="workflow-step-num">1</span>
                <div className="workflow-step-name">Generate Code</div>
              </div>
              <div className="workflow-step-arrow"><ArrowRight size={16} /></div>
              <div className="workflow-step-box">
                <span className="workflow-step-num">2</span>
                <div className="workflow-step-name">Receive Stock</div>
              </div>
              <div className="workflow-step-arrow"><ArrowRight size={16} /></div>
              <div className="workflow-step-box">
                <span className="workflow-step-num">3</span>
                <div className="workflow-step-name">Width Review</div>
              </div>
              <div className="workflow-step-arrow"><ArrowRight size={16} /></div>
              <div className="workflow-step-box">
                <span className="workflow-step-num">4</span>
                <div className="workflow-step-name">Outbound</div>
              </div>
            </div>
          </div>
          <ol>
            <li><strong>Generate Code:</strong> In "Catalogs & Codes", select the fabric type, supplier, supplier reference, and color, along with the USD price and exchange rate. The system builds the code automatically (no need to write it by hand or ask an AI each time).</li>
            <li><strong>Receive Stock:</strong> In "Invoices & Receiving", register the supplier's invoice and add receipt lines (code, rolls, and yards). The system converts yards to meters automatically and shows the result before saving.</li>
            <li><strong>Width Review / Return:</strong> Each received line can be marked as Approved or Returned once the roll's width is physically checked. When <strong>approving</strong>, you can correct the rolls/yards if what physically arrived was different from what was captured on receipt — that correction updates the real stock. A line marked <strong>Returned</strong> stops counting toward available stock.</li>
            <li><strong>Outbound:</strong> When fabric is used from stock, the outbound movement is registered in meters with its destination, keeping each code's available stock up to date.</li>
          </ol>
          <p style={{ marginTop: '10px' }}>Receiving no longer has a "models" field — to request fabric for a specific model, use a <strong>Fabric Requisition</strong> instead (see the next guide).</p>
          <p>Each invoice shows an overall review status in its list: <strong>Not reviewed</strong> (no line touched yet), <strong>Partially reviewed</strong> (some lines approved/returned, others still pending), or <strong>Fully reviewed</strong> (every line resolved).</p>
        </div>
      ),
      keywords: 'fabrics warehouse raw material supplier rolls yards meters code generate receiving reviewed'
    },
    {
      title: 'Generating a fabric code and its price formula',
      content: (
        <div>
          <p>The code is built automatically with the structure: <strong>F</strong> + 2 letters for the fabric type + 1 letter for the supplier + 3 digits of the supplier's reference + 3 letters for the color. Example: <code>FSZE101NEG</code> (Satín Zoe, EKB supplier, reference 101, Black).</p>
          <p>The code's price is <strong>per meter</strong>, even though suppliers almost always quote per yard. The formula is: <strong>ceil((USD price per yard ÷ 0.9144) × exchange rate + $5 MXN shipping)</strong>. For example, $4.55 USD ÷ 0.9144 = $4.98 USD per meter, × 21 = $104.49, + $5 = $109.49, rounded up to <strong>$110 MXN per meter</strong>.</p>
          <p>Before generating a new code, the fabric type, supplier, and/or color must be registered in their respective catalogs (only once each; afterwards they remain available for all future codes). A fabric type's abbreviation can be reused across two different fabric types — it's only blocked if the name, abbreviation, and composition are all identical to an existing one.</p>
          <p>From any open invoice you can print the <strong>physical cards</strong> (one per code, summing all its rolls/yards/meters within that invoice, with the invoice number in the top-right corner, to staple the fabric sample) and the <strong>delivery note</strong> (with 16% VAT already calculated) directly as PDF.</p>
        </div>
      ),
      keywords: 'code generate formula price exchange rate cards delivery note vat supplier color repeated abbreviation'
    },
    {
      title: 'Fabric requisitions: requesting fabric for a model and fulfilling it',
      content: (
        <div>
          <p>A <strong>Fabric Requisition</strong> ("Requisitions" tab) is how you request fabric already in stock for a specific model:</p>
          <ol>
            <li>Enter the model (it works as the folio) and add one or more lines (fabric code, quantity in meters, and width).</li>
            <li>It's saved as a <strong>draft</strong> and more lines can still be added.</li>
            <li>Pressing <strong>"Finalize"</strong> moves it to the "Outbound" tab, under "Requisitions Ready to Fulfill", grouped with all its lines together under the same folio.</li>
            <li>Someone in the warehouse presses <strong>"Fulfill"</strong> on the line they're handling: the system shows <strong>every roll with stock for that code</strong> (date, source invoice, meters available on each) and already suggests which ones to draw from to cover as close to the requested amount as possible — how much to take from each roll can be adjusted, or split across several. Confirming is what actually deducts stock.</li>
          </ol>
          <p>Finalizing a requisition alone doesn't touch stock — confirming "Fulfill" is the only action that does.</p>
        </div>
      ),
      keywords: 'requisition fabric model fulfill pending warehouse request width folio rolls choose'
    },
    {
      title: "Viewing a code's outbound history or the general one",
      content: (
        <div>
          <p>In "Fabric Codes & Stock", clicking any row opens that code's outbound history (date, meters, destination, and user).</p>
          <p>"Outbound" also has a general history of every movement, with filters by date, fabric code, and destination/model.</p>
        </div>
      ),
      keywords: 'history outbound filter date code model check'
    },
    {
      title: 'Reading an invoice or packing list with AI',
      content: (
        <div>
          <p>Inside an invoice with an attached file (image or PDF), the <strong>"Read with AI"</strong> button sends that document to Claude so it can automatically detect, by style and color, how many rolls and yards it carries — useful when the supplier's packing list lists each roll on its own line instead of a ready-made total.</p>
          <p>The result shows up as an editable table: review the numbers and manually pick which <strong>fabric code</strong> each detected line matches before adding it — the system never invents or assigns the code on its own, that's always a human decision.</p>
          <p>This feature uses Anthropic's paid API, so each read has a cost — it's not required for every invoice if you'd rather type it in by hand.</p>
        </div>
      ),
      keywords: 'ai read invoice packing list automatic anthropic claude rolls yards'
    }
  ]
};


export default function Ayuda() {
  const { t, settings } = useSettings();
  const [searchParams, setSearchParams] = useSearchParams();
  const fromPlancha = searchParams.get('from') === 'plancha';
  const initialTab = searchParams.get('tab') || (fromPlancha ? 'plancha' : 'general');
  
  const [activeTab, setActiveTab] = useState(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedAccordion, setExpandedAccordion] = useState(null);

  // Sync tab state with URL parameter if it changes
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) {
      setActiveTab(tab);
    } else {
      setActiveTab(fromPlancha ? 'plancha' : 'general');
    }
  }, [searchParams, fromPlancha]);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    const newParams = new URLSearchParams(searchParams);
    newParams.set('tab', tabId);
    setSearchParams(newParams);
    setExpandedAccordion(null); // Reset expanded guide on tab change
  };

  const toggleAccordion = (index) => {
    setExpandedAccordion(expandedAccordion === index ? null : index);
  };

  // Tabs structure
  const tabs = fromPlancha
    ? [
        { id: 'plancha', name: settings.language === 'en' ? 'Ironing Guide' : 'Guías de Plancha', icon: <Flame size={18} /> },
        { id: 'general', name: settings.language === 'en' ? 'General Manual' : 'Manual General', icon: <BookOpen size={18} /> },
      ]
    : [
        { id: 'general', name: t('ayuda.tabGeneral'), icon: <BookOpen size={18} /> },
        { id: 'maquileros', name: t('nav.maquileros'), icon: <Users size={18} /> },
        { id: 'inventario', name: t('nav.inventario'), icon: <Package size={18} /> },
        { id: 'cortes', name: t('header.cutsDesign'), icon: <Scissors size={18} /> },
        { id: 'produccion', name: t('nav.produccion'), icon: <Factory size={18} /> },
        { id: 'extras', name: t('nav.extras'), icon: <Sparkles size={18} /> },
        { id: 'camion', name: t('nav.camion'), icon: <Truck size={18} /> },
        { id: 'plancha', name: t('nav.plancha'), icon: <Flame size={18} /> },
        { id: 'telas', name: settings.language === 'en' ? 'Fabrics' : 'Telas', icon: <Layers size={18} /> },
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
