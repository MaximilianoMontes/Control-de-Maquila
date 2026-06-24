import { toast as originalToast } from 'react-toastify';
import originalSwal from 'sweetalert2';

// Función para determinar si el tema oscuro está activo en el DOM
const isDark = () => document.body.classList.contains('dark-mode');

// Wrapper para toast de react-toastify usando un Proxy para conservar todas las funciones
export const toast = new Proxy(originalToast, {
  apply(target, thisArg, argumentsList) {
    const [msg, options = {}] = argumentsList;
    const { theme, ...rest } = options;
    return target(msg, { theme: isDark() ? 'dark' : 'light', ...rest });
  },
  get(target, prop) {
    if (['success', 'error', 'warning', 'info'].includes(prop)) {
      return (msg, options = {}) => {
        const { theme, ...rest } = options;
        return target[prop](msg, { theme: isDark() ? 'dark' : 'light', ...rest });
      };
    }
    return target[prop];
  }
});

// Wrapper para Swal de sweetalert2 usando un Proxy para conservar todos los métodos
export const Swal = new Proxy(originalSwal, {
  get(target, prop) {
    if (prop === 'fire') {
      return (options) => {
        const swalBg = isDark() ? '#1e293b' : '#ffffff';
        const swalColor = isDark() ? '#f8fafc' : '#0f172a';

        if (typeof options === 'string') {
          return originalSwal.fire({
            title: options,
            background: swalBg,
            color: swalColor
          });
        }
        
        const { background, color, ...rest } = options || {};
        return originalSwal.fire({
          background: swalBg,
          color: swalColor,
          ...rest
        });
      };
    }
    return target[prop];
  }
});

export default Swal;
