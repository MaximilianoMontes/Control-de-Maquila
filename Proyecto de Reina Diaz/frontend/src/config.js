const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Bandera de build (Vite la resuelve al compilar, distinta por cada servicio de Railway):
// true solo en el frontend del ambiente de práctica, nunca en el de producción.
export const TRAINING_MODE = import.meta.env.VITE_TRAINING_MODE === 'true';

export default API_URL;
