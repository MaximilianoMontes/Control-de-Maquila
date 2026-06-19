import { useState } from 'react';
import Swal from 'sweetalert2';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, Bell, MessageSquare, AlertTriangle, CheckCircle, 
  Trash2, X, Plus, Info, Zap 
} from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

export default function UxDemo() {
  const { t } = useSettings();
  
  // State for Framer Motion List Demo
  const [list, setList] = useState([
    { id: 1, text: 'Cortar lote de mezclilla' },
    { id: 2, text: 'Asignar producción a Fermín' },
  ]);
  const [nextId, setNextId] = useState(3);

  const handleAddListItem = () => {
    setList([...list, { id: nextId, text: `Nueva tarea de maquila #${nextId}` }]);
    setNextId(nextId + 1);
    toast.success('Elemento agregado a la lista', { theme: 'dark' });
  };

  const handleRemoveListItem = (id) => {
    setList(list.filter(item => item.id !== id));
    toast.error('Elemento eliminado de la lista', { theme: 'dark' });
  };

  // SweetAlert2 Demos
  const showSuccessSwal = () => {
    Swal.fire({
      title: '¡Operación Exitosa!',
      text: 'La orden de producción ha sido creada con folio #125',
      icon: 'success',
      confirmButtonText: 'Entendido',
      confirmButtonColor: '#10b981',
      background: '#1e293b',
      color: '#f8fafc',
      customClass: {
        popup: 'swal-glass-card'
      }
    });
  };

  const showConfirmSwal = () => {
    Swal.fire({
      title: '¿Confirmar liquidación?',
      text: 'Esta acción registrará un pago completo de $4,500.00 MXN para el maquilero.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, liquidar pago',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#8b5cf6',
      cancelButtonColor: '#475569',
      background: '#1e293b',
      color: '#f8fafc'
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.fire({
          title: '¡Pago Completado!',
          text: 'Se ha impreso el recibo de nómina automáticamente.',
          icon: 'success',
          confirmButtonColor: '#10b981',
          background: '#1e293b',
          color: '#f8fafc'
        });
      }
    });
  };

  const showErrorSwal = () => {
    Swal.fire({
      title: 'Error de validación',
      text: 'Las piezas asignadas al camión exceden las piezas disponibles en la orden.',
      icon: 'error',
      confirmButtonText: 'Corregir datos',
      confirmButtonColor: '#ef4444',
      background: '#1e293b',
      color: '#f8fafc'
    });
  };

  // Toast Demos
  const notifySuccess = () => toast.success('👌 Conexión con el servidor establecida correctamente.', { theme: 'dark' });
  const notifyInfo = () => toast.info('ℹ️ El camión cargado ayer a las 18:00 ya llegó a plancha en Colima.', { theme: 'dark' });
  const notifyWarning = () => toast.warn('⚠️ Alerta: El modelo MD-2030 tiene retraso de 3 días en maquila.', { theme: 'dark' });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Encabezado */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="gradient-text" style={{ fontSize: '2.5rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Sparkles size={32} /> Playground UI/UX
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            Prueba de forma interactiva las nuevas herramientas de diseño y experiencia de usuario integradas en el sistema.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        
        {/* Sección SweetAlert2 */}
        <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, fontSize: '1.35rem' }}>
            <MessageSquare size={22} color="#3b82f6" /> SweetAlert2 (Modales)
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
            Reemplaza las alertas del navegador por modales estilizados que no detienen el flujo del sistema.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: 'auto' }}>
            <button className="btn btn-success" onClick={showSuccessSwal} style={{ width: '100%', justifyContent: 'center' }}>
              <CheckCircle size={18} /> Alerta de Éxito
            </button>
            <button className="btn" onClick={showConfirmSwal} style={{ width: '100%', justifyContent: 'center', background: '#8b5cf6', color: 'white' }}>
              <Zap size={18} /> Confirmación de Pago
            </button>
            <button className="btn btn-danger" onClick={showErrorSwal} style={{ width: '100%', justifyContent: 'center' }}>
              <AlertTriangle size={18} /> Alerta de Error
            </button>
          </div>
        </div>

        {/* Sección React Toastify */}
        <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, fontSize: '1.35rem' }}>
            <Bell size={22} color="#eab308" /> React Toastify (Notificaciones)
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
            Mensajes flotantes no invasivos que avisan sobre eventos en tiempo real sin obligar al usuario a hacer clic.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: 'auto' }}>
            <button className="btn" onClick={notifySuccess} style={{ width: '100%', justifyContent: 'center', background: '#10b981', color: 'white' }}>
              Toast Éxito
            </button>
            <button className="btn" onClick={notifyInfo} style={{ width: '100%', justifyContent: 'center', background: '#3b82f6', color: 'white' }}>
              Toast Información
            </button>
            <button className="btn" onClick={notifyWarning} style={{ width: '100%', justifyContent: 'center', background: '#f59e0b', color: 'white' }}>
              Toast Advertencia
            </button>
          </div>
        </div>

        {/* Sección Framer Motion (Micro-interacciones) */}
        <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, fontSize: '1.35rem' }}>
            <Zap size={22} color="#a855f7" /> Framer Motion (Animación)
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
            Tarjetas con efectos hover/tap táctiles y animaciones al insertar o eliminar elementos.
          </p>
          
          {/* Tarjeta animada interactiva */}
          <motion.div 
            whileHover={{ scale: 1.03, boxShadow: '0 10px 25px -5px rgba(139, 92, 246, 0.2)' }}
            whileTap={{ scale: 0.98 }}
            style={{ 
              padding: '1rem', 
              background: 'rgba(255,255,255,0.03)', 
              borderRadius: '8px', 
              border: '1px solid rgba(255,255,255,0.06)',
              cursor: 'pointer',
              textAlign: 'center'
            }}
          >
            <h4 style={{ margin: '0 0 0.25rem 0', color: '#a855f7' }}>Pasa el mouse o presióname</h4>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Efecto táctil / retroalimentación</span>
          </motion.div>
        </div>

      </div>

      {/* Demo de Lista Dinámica Animada */}
      <div className="glass-card" style={{ padding: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.25rem' }}>Lista con Transiciones de Entrada/Salida</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0.25rem 0 0 0' }}>
              Observa cómo los elementos entran y salen deslizándose de manera uniforme.
            </p>
          </div>
          <button className="btn btn-primary" onClick={handleAddListItem}>
            <Plus size={18} /> Agregar Tarea
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <AnimatePresence>
            {list.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 50 }}
                transition={{ duration: 0.25 }}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.75rem 1rem',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.04)',
                  borderRadius: '8px'
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem' }}>
                  <Info size={16} color="#a855f7" /> {item.text}
                </span>
                <button 
                  onClick={() => handleRemoveListItem(item.id)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#ef4444',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '4px'
                  }}
                >
                  <Trash2 size={18} />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

    </div>
  );
}
