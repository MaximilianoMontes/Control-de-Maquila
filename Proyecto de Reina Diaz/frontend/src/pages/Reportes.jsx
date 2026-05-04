import { FileText, Download, PackageSearch, CalendarRange } from 'lucide-react';
import { useState } from 'react';

export default function Reportes() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [prodDate, setProdDate] = useState('');
  
  const handleDownloadProduccion = () => {
    let url = 'http://localhost:3001/api/reportes/produccion';
    if (prodDate) url += `?date=${prodDate}`;
    window.open(url, '_blank');
  };

  const [invFilter, setInvFilter] = useState('todos');
  
  const handleDownloadInventario = () => {
    let url = `http://localhost:3001/api/reportes/inventario?filter=${invFilter}`;
    window.open(url, '_blank');
  };

  const handleDownloadRecoleccion = () => {
    let url = 'http://localhost:3001/api/reportes/recoleccion';
    const params = new URLSearchParams();
    if (startDate) params.append('start', startDate);
    if (endDate) params.append('end', endDate);
    
    const query = params.toString();
    if (query) url += `?${query}`;

    window.open(url, '_blank');
  };

  return (
    <div>
      <h1 className="gradient-text" style={{ marginBottom: '2rem' }}>Generación de Reportes PDF</h1>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '3rem 2rem' }}>
          <div style={{ padding: '1.5rem', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '50%', color: '#60a5fa', marginBottom: '1.5rem' }}>
             <FileText size={48} />
          </div>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Producción Terminada</h2>
          <p style={{ color: '#94a3b8', marginBottom: '1.5rem' }}>Genera un reporte en PDF de todas las órdenes de producción que han sido marcadas como terminadas o filtra por una fecha específica.</p>
          
          <div style={{ width: '100%', marginBottom: '1.5rem', textAlign: 'left' }}>
            <label className="form-label">Filtrar por Fecha (Opcional)</label>
            <input type="date" className="form-input" value={prodDate} onChange={e => setProdDate(e.target.value)} />
            {prodDate && (
              <button 
                onClick={() => setProdDate('')}
                style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '0.75rem', marginTop: '0.5rem', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Limpiar fecha
              </button>
            )}
          </div>

          <button className="btn btn-primary" onClick={handleDownloadProduccion} style={{ width: '100%', background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', marginTop: 'auto' }}>
            <Download size={20} /> Descargar PDF
          </button>
        </div>

        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '3rem 2rem' }}>
          <div style={{ padding: '1.5rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '50%', color: '#34d399', marginBottom: '1.5rem' }}>
             <PackageSearch size={48} />
          </div>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Estatus de Inventario</h2>
          <p style={{ color: '#94a3b8', marginBottom: '1.5rem' }}>Obtén el registro general de tu almacén. Selecciona el tipo de productos que deseas incluir en el reporte.</p>
          
          <div style={{ width: '100%', marginBottom: '2rem', textAlign: 'left' }}>
            <label className="form-label">Filtrar por estado</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <button 
                onClick={() => setInvFilter('todos')}
                className={`btn ${invFilter === 'todos' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.85rem', padding: '0.5rem' }}
              >
                Todos los productos
              </button>
              <button 
                onClick={() => setInvFilter('asignados')}
                className={`btn ${invFilter === 'asignados' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.85rem', padding: '0.5rem' }}
              >
                Solo Asignados (En Producción)
              </button>
              <button 
                onClick={() => setInvFilter('pendientes')}
                className={`btn ${invFilter === 'pendientes' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.85rem', padding: '0.5rem' }}
              >
                Solo Disponibles (Sin Asignar)
              </button>
            </div>
          </div>

          <button className="btn btn-primary" onClick={handleDownloadInventario} style={{ width: '100%', background: 'linear-gradient(135deg, #10b981, #059669)', marginTop: 'auto' }}>
            <Download size={20} /> Descargar PDF
          </button>
        </div>

        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '3rem 2rem' }}>
          <div style={{ padding: '1.5rem', background: 'rgba(168, 85, 247, 0.1)', borderRadius: '50%', color: '#a855f7', marginBottom: '1.5rem' }}>
             <CalendarRange size={48} />
          </div>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Recolección de Mercancía</h2>
          <p style={{ color: '#94a3b8', marginBottom: '1.5rem' }}>Genera el reporte de los productos que se deben recoger en una fecha específica.</p>
          
          <div style={{ width: '100%', marginBottom: '1rem', textAlign: 'left' }}>
            <label className="form-label">Fecha de Recolección (Exacta)</label>
            <input type="date" className="form-input" autoComplete="off" value={startDate} onChange={e => setStartDate(e.target.value)} />
            
            <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input type="checkbox" id="showRange" onChange={e => {
                if (!e.target.checked) setEndDate('');
                else setEndDate(startDate || '');
              }} />
              <label htmlFor="showRange" style={{ fontSize: '0.85rem', color: '#64748b', cursor: 'pointer' }}>¿Deseas buscar por un rango de fechas?</label>
            </div>

            {endDate !== '' && (
              <div style={{ marginTop: '1rem' }}>
                <label className="form-label">Hasta el día (Final del rango)</label>
                <input type="date" className="form-input" autoComplete="off" value={endDate} onChange={e => setEndDate(e.target.value)} />
              </div>
            )}
            
            {(startDate || endDate) && (
              <button 
                onClick={() => { setStartDate(''); setEndDate(''); document.getElementById('showRange').checked = false; }}
                style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '0.75rem', marginTop: '1rem', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Limpiar fecha
              </button>
            )}
          </div>

          <button className="btn btn-primary" onClick={handleDownloadRecoleccion} style={{ width: '100%', background: 'linear-gradient(135deg, #a855f7, #7c3aed)', marginTop: 'auto' }}>
            <Download size={20} /> Generar Reporte de Recolección
          </button>
        </div>
      </div>
    </div>
  );
}
