import { useState, useEffect } from 'react';
import axios from 'axios';
import { CheckCircle2, HelpCircle } from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';
import API_URL from '../../config';
import { toast } from '../../utils/themeNotifications';

const authHeaders = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

export default function TelasPendientes() {
  const { settings } = useSettings();
  const isEn = settings.language === 'en';
  const [pendientes, setPendientes] = useState([]);

  const fetchPendientes = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/telas/codigos-pendientes`, authHeaders());
      setPendientes(res.data);
    } catch (e) { console.error('Error fetching codigos pendientes', e); }
  };

  useEffect(() => {
    // Fetch-on-mount, mismo patrón que el resto del sistema.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchPendientes();
  }, []);

  const resolver = async (id) => {
    try {
      await axios.patch(`${API_URL}/api/telas/codigos-pendientes/${id}/resolver`, {}, authHeaders());
      toast.success(isEn ? 'Marked as resolved' : 'Marcado como resuelto');
      fetchPendientes();
    } catch {
      toast.error(isEn ? 'Error updating' : 'Error al actualizar');
    }
  };

  return (
    <div className="glass-card">
      <h2 style={{ fontSize: '1.3rem', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <HelpCircle color="#f59e0b" /> {isEn ? 'Pending Code Matches' : 'Cruces de Código Pendientes'}
      </h2>
      <p style={{ marginTop: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
        {isEn
          ? 'Invoice lines that could not be matched to a fabric code by the supplier reference number.'
          : 'Líneas de factura que no se pudieron cruzar con un código de tela por su número de referencia del proveedor.'}
      </p>
      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>{isEn ? 'Supplier Style' : 'Estilo del Proveedor'}</th>
              <th>{isEn ? 'Color (as written)' : 'Color (como aparece)'}</th>
              <th>{isEn ? 'Reason' : 'Motivo'}</th>
              <th style={{ textAlign: 'right' }}>{isEn ? 'Action' : 'Acción'}</th>
            </tr>
          </thead>
          <tbody>
            {pendientes.length === 0 ? (
              <tr><td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '1.5rem' }}>
                {isEn ? 'No pending matches.' : 'No hay cruces pendientes.'}
              </td></tr>
            ) : (
              pendientes.map(p => (
                <tr key={p.id}>
                  <td>{p.estilo_proveedor || '—'}</td>
                  <td>{p.color_texto || '—'}</td>
                  <td>{p.motivo || '—'}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '0.8rem' }} onClick={() => resolver(p.id)}>
                      <CheckCircle2 size={14} style={{ marginRight: '4px' }} /> {isEn ? 'Resolve' : 'Resolver'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
