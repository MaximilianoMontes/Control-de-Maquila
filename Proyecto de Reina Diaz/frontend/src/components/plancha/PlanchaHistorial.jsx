import { History, Layers } from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';
import API_URL from '../../config';

export default function PlanchaHistorial({ historialGeneral, fetchHistorialGeneral }) {
  const { settings, formatCurrency } = useSettings();
  const isEn = settings.language === 'en';

  return (
    <div className="glass-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.5rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <History color="#0ea5e9" size={24} /> {isEn ? 'General Ironing History' : 'Historial General de Planchado'}
        </h2>
        <button className="btn btn-secondary" onClick={fetchHistorialGeneral}>{isEn ? 'Refresh History' : 'Refrescar Historial'}</button>
      </div>
      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>{isEn ? 'Date & Time' : 'Fecha y Hora'}</th>
              <th>{isEn ? 'Photo' : 'Foto'}</th>
              <th>{isEn ? 'Model' : 'Modelo'}</th>
              <th>{isEn ? 'Color' : 'Color'}</th>
              <th>{isEn ? 'Size' : 'Talla'}</th>
              <th>{isEn ? 'Ironer' : 'Planchador'}</th>
              <th>{isEn ? 'Board' : 'Burro'}</th>
              <th>{isEn ? 'Ironed Pcs' : 'Pzas Planchadas'}</th>
              <th>{isEn ? 'Net' : 'Neto'}</th>
              <th>{isEn ? 'Fixed Pay' : 'Pago Fijo'}</th>
              <th>{isEn ? 'Total' : 'Total'}</th>
            </tr>
          </thead>
          <tbody>
            {historialGeneral.length === 0 ? (
              <tr>
                <td colSpan="11" style={{ textAlign: 'center', color: 'var(--text-muted, #94a3b8)', padding: '3rem' }}>
                  {isEn ? 'No ironing records in general history.' : 'No hay registros de planchado en el historial general.'}
                </td>
              </tr>
            ) : (
              historialGeneral.map(h => (
                <tr key={h.id}>
                  <td>{new Date(h.fecha_terminado || h.fecha_creacion).toLocaleString(isEn ? 'en-US' : 'es-MX')}</td>
                  <td>
                    {h.modelo_imagen ? (
                      <img 
                        src={`${API_URL}${h.modelo_imagen}`} 
                        alt={h.modelo_nombre} 
                        style={{ width: '40px', height: '40px', borderRadius: '6px', objectFit: 'contain', background: 'var(--bg-card)' }} 
                      />
                    ) : (
                      <div style={{ width: '40px', height: '40px', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Layers size={18} color="#64748b" />
                      </div>
                    )}
                  </td>
                  <td>
                    <strong>{h.modelo_nombre}</strong>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{isEn ? 'Order' : 'Orden'}: {h.no_orden || 'N/A'}</p>
                  </td>
                  <td>{h.color || 'N/A'}</td>
                  <td><span className="badge badge-info">{isEn ? 'S' : 'T'}{h.talla}</span></td>
                  <td><span style={{ fontWeight: 'bold', color: '#38bdf8' }}>{h.planchador_nombre}</span></td>
                  <td><span style={{ background: 'rgba(255,255,255,0.03)', padding: '2px 8px', borderRadius: '4px' }}>{isEn ? 'Board' : 'Burro'} #{h.burro_numero}</span></td>
                  <td><strong>{h.piezas} {isEn ? 'pcs' : 'pzas'}</strong></td>
                  <td style={{ color: '#34d399', fontWeight: 'bold' }}>{formatCurrency(h.neto)}</td>
                  <td>{formatCurrency(h.ajuste)}</td>
                  <td style={{ color: '#60a5fa', fontWeight: 'bold' }}>{formatCurrency(h.total)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
