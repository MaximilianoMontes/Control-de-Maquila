import { Package, Search } from 'lucide-react';
import { useState } from 'react';

export default function Inventario() {
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 className="gradient-text">Inventario General</h1>
      </div>

      <div className="glass-card" style={{ marginBottom: '2rem', padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <Search size={20} color="#94a3b8" />
        <input 
          type="text" 
          placeholder="Buscar en el historial de altas..."
          style={{ width: '100%', background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none' }}
          value={searchTerm} 
          onChange={(e) => setSearchTerm(e.target.value)} 
        />
      </div>

      <div className="glass-card" style={{ textAlign: 'center', padding: '5rem 2rem' }}>
        <div style={{ display: 'inline-flex', padding: '1.5rem', background: 'rgba(37, 99, 235, 0.1)', borderRadius: '50%', color: '#2563eb', marginBottom: '1.5rem' }}>
          <Package size={48} />
        </div>
        <h2>Historial de Inventario</h2>
        <p style={{ color: '#64748b', maxWidth: '500px', margin: '0 auto' }}>
          Próximamente aquí podrás ver el historial detallado de todas las altas de cortes y materiales subidos al sistema.
        </p>
      </div>
    </div>
  );
}
