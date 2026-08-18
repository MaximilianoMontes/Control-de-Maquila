import { useState } from 'react';
import axios from 'axios';
import { PackageMinus } from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';
import API_URL from '../../config';
import { toast } from '../../utils/themeNotifications';

const authHeaders = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

export default function TelasSalidas({ codigos, fetchCodigos }) {
  const { settings } = useSettings();
  const isEn = settings.language === 'en';
  const [codigoId, setCodigoId] = useState('');
  const [metros, setMetros] = useState('');
  const [destino, setDestino] = useState('');
  const [guardando, setGuardando] = useState(false);

  const codigoSeleccionado = codigos.find(c => String(c.id) === String(codigoId));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!codigoId || !metros) return;
    setGuardando(true);
    try {
      await axios.post(`${API_URL}/api/telas/salidas`, { codigo_id: codigoId, metros, destino }, authHeaders());
      toast.success(isEn ? 'Outbound movement registered' : 'Salida registrada');
      setMetros('');
      setDestino('');
      fetchCodigos();
    } catch (e) {
      toast.error(e.response?.data?.error || (isEn ? 'Error registering outbound movement' : 'Error al registrar la salida'));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="glass-card" style={{ maxWidth: '520px' }}>
      <h2 style={{ fontSize: '1.3rem', margin: '0 0 1.2rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <PackageMinus color="#ef4444" /> {isEn ? 'Register Outbound Fabric' : 'Registrar Salida de Tela'}
      </h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div className="form-group">
          <label className="form-label">{isEn ? 'Fabric Code' : 'Código de Tela'}</label>
          <select className="form-input" value={codigoId} onChange={e => setCodigoId(e.target.value)} required>
            <option value="">{isEn ? 'Select...' : 'Seleccionar...'}</option>
            {codigos.map(c => (
              <option key={c.id} value={c.id}>{c.codigo} — {isEn ? 'Stock' : 'Existencia'}: {parseFloat(c.stock_metros).toFixed(2)} m</option>
            ))}
          </select>
        </div>
        {codigoSeleccionado && (
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{codigoSeleccionado.descripcion}</p>
        )}
        <div className="form-group">
          <label className="form-label">{isEn ? 'Meters' : 'Metros'}</label>
          <input type="number" step="0.01" className="form-input" value={metros} onChange={e => setMetros(e.target.value)} required />
        </div>
        <div className="form-group">
          <label className="form-label">{isEn ? 'Destination (model / cut)' : 'Destino (modelo / corte)'}</label>
          <input className="form-input" value={destino} onChange={e => setDestino(e.target.value)} placeholder={isEn ? 'Free text, e.g. model 723138' : 'Texto libre, ej. modelo 723138'} />
        </div>
        <button type="submit" className="btn btn-primary" disabled={guardando}>
          {guardando ? (isEn ? 'Saving...' : 'Guardando...') : (isEn ? 'Register Outbound' : 'Registrar Salida')}
        </button>
      </form>
    </div>
  );
}
