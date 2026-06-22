import { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown } from 'lucide-react';

export default function SearchableSelect({
  options = [],
  value = '',
  onChange,
  placeholder = 'Seleccione una opción...',
  labelKey = 'nombre',
  valueKey = 'id',
  disabled = false,
  required = false
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef(null);

  // Cerrar al hacer clic fuera del componente
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  // Limpiar el query de búsqueda al abrir/cerrar
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
    }
  }, [isOpen]);

  const selectedOption = options.find(
    (opt) => String(opt[valueKey]) === String(value)
  );

  const filteredOptions = options.filter((opt) => {
    const label = String(opt[labelKey] || '').toLowerCase();
    return label.includes(searchQuery.toLowerCase());
  });

  const handleSelectOption = (opt) => {
    if (disabled) return;
    onChange(opt[valueKey]);
    setIsOpen(false);
  };

  return (
    <div className="searchable-select-container" ref={containerRef}>
      {/* Selector Trigger Button */}
      <button
        type="button"
        className="searchable-select-trigger"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        style={{
          opacity: disabled ? 0.7 : 1,
          cursor: disabled ? 'not-allowed' : 'pointer',
        }}
      >
        <span style={{ color: selectedOption ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
          {selectedOption ? selectedOption[labelKey] : placeholder}
        </span>
        <ChevronDown size={18} style={{ 
          transform: isOpen ? 'rotate(180deg)' : 'none',
          transition: 'transform 0.2s ease',
          color: 'var(--text-secondary)'
        }} />
      </button>

      {/* Required Hidden Input for form validation */}
      {required && (
        <input
          type="text"
          value={value}
          onChange={() => {}}
          required
          style={{
            position: 'absolute',
            opacity: 0,
            pointerEvents: 'none',
            bottom: 0,
            left: '50%',
            width: '1px'
          }}
        />
      )}

      {/* Dropdown Options */}
      {isOpen && (
        <div className="searchable-select-dropdown">
          {/* Search Input inside Dropdown */}
          <div className="searchable-select-search-container">
            <Search size={16} color="var(--text-secondary)" />
            <input
              type="text"
              className="searchable-select-search-input"
              placeholder="Buscar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {/* Options List */}
          <div className="searchable-select-options-list">
            {filteredOptions.length === 0 ? (
              <div className="searchable-select-no-results">
                No se encontraron opciones
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = String(opt[valueKey]) === String(value);
                return (
                  <button
                    key={opt[valueKey]}
                    type="button"
                    className={`searchable-select-option ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleSelectOption(opt)}
                  >
                    {opt[labelKey]}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
