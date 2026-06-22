import { useState } from 'react';
import { History, Layers, Search } from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';
import API_URL from '../../config';
import ImageZoom from '../ImageZoom';

export default function PlanchaHistorial({ historialGeneral, fetchHistorialGeneral }) {
  const { settings, formatCurrency } = useSettings();
  const isEn = settings.language === 'en';
  const [searchTerm, setSearchTerm] = useState('');

  const filteredHistorial = historialGeneral.filter(h => {
    const term = searchTerm.toLowerCase();
    return (
      (h.modelo_nombre || '').toLowerCase().includes(term) ||
      (h.no_orden || '').toLowerCase().includes(term) ||
      (h.planchador_nombre || '').toLowerCase().includes(term) ||
      (h.color || '').toLowerCase().includes(term) ||
      (h.talla || '').toLowerCase().includes(term) ||
      (h.burro_numero || '').toString().includes(term)
    );
  });

  return (
    <div className="glass-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.5rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <History color="#0ea5e9" size={24} /> {isEn ? 'General Ironing History' : 'Historial General de Planchado'}
        </h2>
        <button className="btn btn-secondary" onClick={fetchHistorialGeneral}>{isEn ? 'Refresh History' : 'Refrescar Historial'}</button>
      </div>

      <div className="glass-card" style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', background: 'rgba(255, 255, 255, 0.02)' }}>
        <Search size={20} color="#64748b" />
        <input 
          type="text" 
          className="form-input" 
          style={{ border: 'none', background: 'transparent', padding: '0.5rem', width: '100%', outline: 'none', fontSize: '0.95rem' }} 
          placeholder={isEn ? 'Search by model, order, color, size, or ironer...' : 'Buscar por modelo, orden, color, talla o planchador...'} 
          value={searchTerm} 
          onChange={e => setSearchTerm(e.target.value)} 
        />
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
            {filteredHistorial.length === 0 ? (
              <tr>
                <td colSpan="11" style={{ textAlign: 'center', color: 'var(--text-muted, #94a3b8)', padding: '3rem' }}>
                  {isEn ? 'No matching ironing records found.' : 'No se encontraron registros de planchado coincidentes.'}
                </td>
              </tr>
            ) : (
              filteredHistorial.map(h => (
                <tr key={h.id}>
                  <td>{new Date(h.fecha_terminado || h.fecha_creacion).toLocaleString(isEn ? 'en-US' : 'es-MX')}</td>
                  <td>
                    <ImageZoom
                      src={h.modelo_imagen ? `${API_URL}${h.modelo_imagen}` : null}
                      alt={h.modelo_nombre}
                      style={{ width: '40px', height: '40px', borderRadius: '6px', objectFit: 'contain', background: 'var(--bg-card)' }}
                      fallback={
                        <div style={{ width: '40px', height: '40px', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Layers size={18} color="#64748b" />
                        </div>
                      }
                    />
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
