import { useState, useMemo } from 'react';
import axios from 'axios';
import { Plus, Wand2, Copy, List, X, Search } from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';
import API_URL from '../../config';
import { toast } from '../../utils/themeNotifications';

const authHeaders = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

function CatalogoMini({ title, items, columns, placeholderes, onSubmit, isEn }) {
  const [values, setValues] = useState(columns.map(() => ''));
  const [verLista, setVerLista] = useState(false);
  const [buscar, setBuscar] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (values.some(v => !v.trim())) return;
    const ok = await onSubmit(values);
    if (ok) setValues(columns.map(() => ''));
  };

  const filtrados = useMemo(() => {
    if (!buscar.trim()) return items;
    const q = buscar.toLowerCase();
    return items.filter(it => (it.nombre || '').toLowerCase().includes(q) || (it.abreviatura || it.letra || '').toLowerCase().includes(q));
  }, [items, buscar]);

  return (
    <div className="glass-card" style={{ padding: '1.2rem' }}>
      <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.05rem' }}>{title}</h3>
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '0.6rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {columns.map((col, i) => (
          <input
            key={col}
            className="form-input"
            style={{ flex: i === 0 ? 2 : 1, minWidth: '90px' }}
            placeholder={placeholderes[i]}
            value={values[i]}
            onChange={e => {
              const next = [...values];
              next[i] = i > 0 ? e.target.value.toUpperCase() : e.target.value;
              setValues(next);
            }}
          />
        ))}
        <button type="submit" className="btn btn-primary" style={{ padding: '8px 12px' }}>
          <Plus size={16} />
        </button>
      </form>

      <button type="button" className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setVerLista(true)}>
        <List size={16} style={{ marginRight: '6px' }} />
        {items.length === 0
          ? (isEn ? 'No entries yet' : 'Sin registros todavía')
          : (isEn ? `View list (${items.length})` : `Ver lista (${items.length})`)}
      </button>

      {verLista && (
        <div
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(8px)' }}
          onClick={() => { setVerLista(false); setBuscar(''); }}
        >
          <div className="glass-card" style={{ width: '95%', maxWidth: '480px', maxHeight: '75vh', display: 'flex', flexDirection: 'column', padding: '1.4rem 1.6rem' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{title}</h3>
              <button className="btn-icon" style={{ background: 'rgba(255,255,255,0.05)', border: 'none', padding: '6px', borderRadius: '50%', cursor: 'pointer' }} onClick={() => { setVerLista(false); setBuscar(''); }}>
                <X size={18} />
              </button>
            </div>
            <div style={{ position: 'relative', marginBottom: '0.8rem' }}>
              <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input
                className="form-input"
                style={{ paddingLeft: '30px' }}
                placeholder={isEn ? 'Search...' : 'Buscar...'}
                value={buscar}
                onChange={e => setBuscar(e.target.value)}
                autoFocus
              />
            </div>
            <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {filtrados.length === 0 ? (
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{isEn ? 'No matches.' : 'Sin coincidencias.'}</span>
              ) : (
                filtrados.map(it => (
                  <div key={it.id} style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', padding: '0.4rem 0.6rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                    <span className="badge badge-info" style={{ fontSize: '0.78rem', fontFamily: 'monospace' }}>{it.abreviatura || it.letra}</span>
                    <span style={{ fontSize: '0.88rem' }}>{it.nombre}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TelasCatalogos({ catalogos, refetchCatalogos }) {
  const { settings } = useSettings();
  const isEn = settings.language === 'en';
  const { tipos, proveedores, colores } = catalogos;
  const { fetchTipos, fetchProveedores, fetchColores, fetchCodigos } = refetchCatalogos;

  const [gen, setGen] = useState({ tipo_id: '', proveedor_id: '', referencia_proveedor: '', color_id: '', precio_usd: '', tipo_cambio: '', composicion: '' });
  const [resultado, setResultado] = useState(null);
  const [generando, setGenerando] = useState(false);

  const crearTipo = async ([nombre, abreviatura, composicion]) => {
    try {
      await axios.post(`${API_URL}/api/telas/tipos`, { nombre, abreviatura, composicion_default: composicion }, authHeaders());
      toast.success(isEn ? 'Fabric type added' : 'Tipo de tela agregado');
      fetchTipos();
      return true;
    } catch (e) {
      toast.error(e.response?.data?.error || (isEn ? 'Error adding fabric type' : 'Error al agregar tipo de tela'));
      return false;
    }
  };

  const crearProveedor = async ([nombre, letra]) => {
    try {
      await axios.post(`${API_URL}/api/telas/proveedores`, { nombre, letra }, authHeaders());
      toast.success(isEn ? 'Supplier added' : 'Proveedor agregado');
      fetchProveedores();
      return true;
    } catch (e) {
      toast.error(e.response?.data?.error || (isEn ? 'Error adding supplier' : 'Error al agregar proveedor'));
      return false;
    }
  };

  const crearColor = async ([nombre, abreviatura]) => {
    try {
      await axios.post(`${API_URL}/api/telas/colores`, { nombre, abreviatura }, authHeaders());
      toast.success(isEn ? 'Color added' : 'Color agregado');
      fetchColores();
      return true;
    } catch (e) {
      toast.error(e.response?.data?.error || (isEn ? 'Error adding color' : 'Error al agregar color'));
      return false;
    }
  };

  const handleGenerar = async (e) => {
    e.preventDefault();
    if (!gen.tipo_id || !gen.proveedor_id || !gen.referencia_proveedor || !gen.color_id || gen.precio_usd === '' || gen.tipo_cambio === '') {
      toast.error(isEn ? 'Fill in all fields to generate the code' : 'Completa todos los campos para generar el código');
      return;
    }
    setGenerando(true);
    try {
      const res = await axios.post(`${API_URL}/api/telas/generar-codigo`, gen, authHeaders());
      setResultado(res.data);
      fetchCodigos();
      toast.success(isEn ? `Code ${res.data.codigo} generated` : `Código ${res.data.codigo} generado`);
    } catch (e) {
      toast.error(e.response?.data?.error || (isEn ? 'Error generating code' : 'Error al generar el código'));
    } finally {
      setGenerando(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.2rem' }}>
        <CatalogoMini
          title={isEn ? 'Fabric Types' : 'Tipos de Tela'}
          items={tipos}
          columns={['nombre', 'abreviatura', 'composicion']}
          placeholderes={[isEn ? 'Name (e.g. Satín Zoe)' : 'Nombre (ej. Satín Zoe)', 'AB', isEn ? 'Composition (optional)' : 'Composición (opcional)']}
          onSubmit={crearTipo}
          isEn={isEn}
        />
        <CatalogoMini
          title={isEn ? 'Suppliers' : 'Proveedores'}
          items={proveedores}
          columns={['nombre', 'letra']}
          placeholderes={[isEn ? 'Name (e.g. EKB Textiles)' : 'Nombre (ej. EKB Textiles)', 'E']}
          onSubmit={crearProveedor}
          isEn={isEn}
        />
        <CatalogoMini
          title={isEn ? 'Colors' : 'Colores'}
          items={colores}
          columns={['nombre', 'abreviatura']}
          placeholderes={[isEn ? 'Name (e.g. Negro)' : 'Nombre (ej. Negro)', 'NEG']}
          onSubmit={crearColor}
          isEn={isEn}
        />
      </div>

      <div className="glass-card">
        <h2 style={{ fontSize: '1.3rem', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Wand2 color="#7c3aed" /> {isEn ? 'Generate Fabric Code' : 'Generar Código de Tela'}
        </h2>
        <form onSubmit={handleGenerar} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">{isEn ? 'Fabric Type' : 'Tipo de Tela'}</label>
            <select className="form-input" value={gen.tipo_id} onChange={e => setGen({ ...gen, tipo_id: e.target.value })}>
              <option value="">{isEn ? 'Select...' : 'Seleccionar...'}</option>
              {tipos.map(t => <option key={t.id} value={t.id}>{t.abreviatura} — {t.nombre}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">{isEn ? 'Supplier' : 'Proveedor'}</label>
            <select className="form-input" value={gen.proveedor_id} onChange={e => setGen({ ...gen, proveedor_id: e.target.value })}>
              <option value="">{isEn ? 'Select...' : 'Seleccionar...'}</option>
              {proveedores.map(p => <option key={p.id} value={p.id}>{p.letra} — {p.nombre}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">{isEn ? 'Supplier Reference' : 'Referencia del Proveedor'}</label>
            <input className="form-input" value={gen.referencia_proveedor} onChange={e => setGen({ ...gen, referencia_proveedor: e.target.value })} placeholder="Ej: 101" />
          </div>
          <div className="form-group">
            <label className="form-label">{isEn ? 'Color' : 'Color'}</label>
            <select className="form-input" value={gen.color_id} onChange={e => setGen({ ...gen, color_id: e.target.value })}>
              <option value="">{isEn ? 'Select...' : 'Seleccionar...'}</option>
              {colores.map(c => <option key={c.id} value={c.id}>{c.abreviatura} — {c.nombre}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">{isEn ? 'Price (USD)' : 'Precio (USD)'}</label>
            <input type="number" step="0.01" className="form-input" value={gen.precio_usd} onChange={e => setGen({ ...gen, precio_usd: e.target.value })} placeholder="4.55" />
          </div>
          <div className="form-group">
            <label className="form-label">{isEn ? 'Exchange Rate' : 'Tipo de Cambio'}</label>
            <input type="number" step="0.0001" className="form-input" value={gen.tipo_cambio} onChange={e => setGen({ ...gen, tipo_cambio: e.target.value })} placeholder="21" />
          </div>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">{isEn ? 'Composition (optional, overrides default)' : 'Composición (opcional, sobreescribe la del tipo)'}</label>
            <input className="form-input" value={gen.composicion} onChange={e => setGen({ ...gen, composicion: e.target.value })} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <button type="submit" className="btn btn-primary" disabled={generando}>
              <Wand2 size={16} style={{ marginRight: '4px' }} /> {generando ? (isEn ? 'Generating...' : 'Generando...') : (isEn ? 'Generate Code' : 'Generar Código')}
            </button>
          </div>
        </form>

        {resultado && (
          <div style={{ marginTop: '1.2rem', padding: '1rem', borderRadius: '10px', background: 'rgba(124, 58, 237, 0.08)', border: '1px solid rgba(124, 58, 237, 0.25)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
              <strong style={{ fontSize: '1.2rem', fontFamily: 'monospace' }}>{resultado.codigo}</strong>
              <button
                type="button"
                className="btn"
                style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                onClick={() => { navigator.clipboard.writeText(resultado.codigo); toast.success(isEn ? 'Copied' : 'Copiado'); }}
              >
                <Copy size={12} />
              </button>
            </div>
            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{resultado.descripcion}</p>
            <p style={{ margin: '0.3rem 0 0 0', fontWeight: 'bold' }}>${resultado.precio_mxn} MXN</p>
          </div>
        )}
      </div>
    </div>
  );
}
