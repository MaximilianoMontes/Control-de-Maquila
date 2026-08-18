import { useState, useMemo } from 'react';
import { Search, RefreshCw } from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';

export default function TelasCodigos({ codigos, fetchCodigos }) {
  const { settings } = useSettings();
  const isEn = settings.language === 'en';
  const [texto, setTexto] = useState('');

  const filtrados = useMemo(() => {
    if (!texto.trim()) return codigos;
    const q = texto.toLowerCase();
    return codigos.filter(c =>
      c.codigo.toLowerCase().includes(q) ||
      (c.descripcion || '').toLowerCase().includes(q) ||
      (c.proveedor_nombre || '').toLowerCase().includes(q) ||
      (c.color_nombre || '').toLowerCase().includes(q)
    );
  }, [codigos, texto]);

  return (
    <div className="glass-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', gap: '1rem', flexWrap: 'wrap' }}>
        <h2 style={{ fontSize: '1.3rem', margin: 0 }}>{isEn ? 'Fabric Codes & Stock' : 'Códigos de Tela y Existencias'}</h2>
        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
            <input
              className="form-input"
              style={{ paddingLeft: '32px' }}
              placeholder={isEn ? 'Search code, color, supplier...' : 'Buscar código, color, proveedor...'}
              value={texto}
              onChange={e => setTexto(e.target.value)}
            />
          </div>
          <button className="btn btn-secondary" onClick={fetchCodigos} title={isEn ? 'Refresh' : 'Actualizar'}>
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>{isEn ? 'Code' : 'Código'}</th>
              <th>{isEn ? 'Description' : 'Descripción'}</th>
              <th>{isEn ? 'Supplier' : 'Proveedor'}</th>
              <th>{isEn ? 'Color' : 'Color'}</th>
              <th style={{ textAlign: 'right' }}>{isEn ? 'Price (MXN)' : 'Precio (MXN)'}</th>
              <th style={{ textAlign: 'right' }}>{isEn ? 'Stock (m)' : 'Existencia (m)'}</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '1.5rem' }}>
                {isEn ? 'No fabric codes found.' : 'No se encontraron códigos de tela.'}
              </td></tr>
            ) : (
              filtrados.map(c => (
                <tr key={c.id}>
                  <td style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{c.codigo}</td>
                  <td style={{ fontSize: '0.85rem' }}>{c.descripcion}</td>
                  <td>{c.proveedor_nombre}</td>
                  <td>{c.color_nombre}</td>
                  <td style={{ textAlign: 'right' }}>${parseFloat(c.precio_mxn).toFixed(2)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 'bold', color: parseFloat(c.stock_metros) > 0 ? '#34d399' : '#ef4444' }}>
                    {parseFloat(c.stock_metros).toFixed(2)}
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
