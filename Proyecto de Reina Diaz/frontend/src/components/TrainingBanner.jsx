import { useState } from 'react';
import axios from 'axios';
import { GraduationCap, RotateCcw } from 'lucide-react';
import { TRAINING_MODE } from '../config';
import API_URL from '../config';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { toast, Swal } from '../utils/themeNotifications';

export default function TrainingBanner() {
  const { user } = useAuth();
  const { settings } = useSettings();
  const isEn = settings?.language === 'en';
  const [resetting, setResetting] = useState(false);

  if (!TRAINING_MODE) return null;

  const userRole = (user?.role || user?.rol || '').toString().toLowerCase().trim();
  const isAdmin = userRole === 'admin';

  const handleReset = () => {
    Swal.fire({
      title: isEn ? 'Reset practice data?' : '¿Reiniciar datos de práctica?',
      text: isEn
        ? 'This erases everything entered during practice and loads the demo data again.'
        : 'Esto borra todo lo capturado durante la práctica y vuelve a cargar los datos de ejemplo.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: isEn ? 'Yes, reset' : 'Sí, reiniciar',
      cancelButtonText: isEn ? 'Cancel' : 'Cancelar',
    }).then(async (result) => {
      if (!result.isConfirmed) return;
      setResetting(true);
      try {
        await axios.post(`${API_URL}/api/training/reset`, {}, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        toast.success(isEn ? 'Practice data reset' : 'Datos de práctica reiniciados', { theme: 'dark' });
        setTimeout(() => window.location.reload(), 800);
      } catch (e) {
        toast.error(e.response?.data?.error || (isEn ? 'Error resetting data' : 'Error al reiniciar los datos'), { theme: 'dark' });
      } finally {
        setResetting(false);
      }
    });
  };

  return (
    <div style={{
      background: 'linear-gradient(90deg, #7c3aed, #4f46e5)',
      color: 'white',
      padding: '0.5rem 1rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '0.75rem',
      fontSize: '0.85rem',
      fontWeight: 600,
      flexWrap: 'wrap',
      textAlign: 'center'
    }}>
      <GraduationCap size={18} />
      <span>
        {isEn
          ? 'PRACTICE ENVIRONMENT — the data here is fake and does not affect the real system.'
          : 'AMBIENTE DE PRÁCTICA — los datos aquí son ficticios y no afectan el sistema real.'}
      </span>
      {isAdmin && (
        <button
          type="button"
          onClick={handleReset}
          disabled={resetting}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            background: 'rgba(255,255,255,0.15)',
            border: '1px solid rgba(255,255,255,0.35)',
            color: 'white',
            borderRadius: '6px',
            padding: '3px 10px',
            fontSize: '0.78rem',
            fontWeight: 700,
            cursor: resetting ? 'not-allowed' : 'pointer',
            opacity: resetting ? 0.6 : 1
          }}
        >
          <RotateCcw size={13} />
          {isEn ? 'Reset Data' : 'Reiniciar Datos'}
        </button>
      )}
    </div>
  );
}
