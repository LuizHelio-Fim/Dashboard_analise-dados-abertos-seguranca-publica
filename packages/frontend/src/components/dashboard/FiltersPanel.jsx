import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import ExportPageButton from './ExportPageButton';
import DateRangeSlider from './DateRangeSlider';

function FiltersPanel({ 
  pageRef, 
  pageTitle, 
  pageData, 
  additionalData, 
  dateRange, 
  onDateRangeChange, 
  rawData,
  selectedMunicipio,
  onMunicipioChange,
  selectedCategorias,
  onCategoriasChange,
  availableMunicipios,
  availableCategorias
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('filtros');
  const [portalContainer, setPortalContainer] = useState(null);
  const buttonRef = useRef(null);

  // Criar o container do portal quando o componente montar
  useEffect(() => {
    const div = document.createElement('div');
    div.id = 'filters-portal';
    document.body.appendChild(div);
    setPortalContainer(div);
    return () => {
      document.body.removeChild(div);
    };
  }, []);

  const activeFiltersCount = (selectedMunicipio ? 1 : 0) + (selectedCategorias?.length || 0) + (dateRange?.start ? 1 : 0);

  const handleClearFilters = () => {
    onMunicipioChange('');
    onCategoriasChange([]);
    onDateRangeChange({ start: null, end: null });
  };

  // Calcular posição do botão para posicionar o portal
  const [buttonRect, setButtonRect] = useState(null);
  useEffect(() => {
    if (!isOpen) return;
    const updatePosition = () => {
      if (buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        setButtonRect(rect);
      }
    };
    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition);
    };
  }, [isOpen]);

  const handleClosePanel = () => setIsOpen(false);

  const panelContent = isOpen && portalContainer && buttonRect ? createPortal(
    <div className="filters-panel-portal">
      <div className="filters-panel-overlay" onClick={handleClosePanel} />
      <div
        className="filters-panel"
        style={{
          position: 'fixed',
          top: buttonRect.bottom + 10,
          right: window.innerWidth - buttonRect.right,
          width: '620px',
          maxWidth: '94vw',
          zIndex: 10000,
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="filters-panel-header">
          <div className="filters-tabs">
            <button 
              className={`filters-tab ${activeTab === 'filtros' ? 'active' : ''}`}
              onClick={() => setActiveTab('filtros')}
            >
              🔍 Filtros
            </button>
            <button 
              className={`filters-tab ${activeTab === 'downloads' ? 'active' : ''}`}
              onClick={() => setActiveTab('downloads')}
            >
              📥 Downloads
            </button>
          </div>
          {activeFiltersCount > 0 && (
            <button className="filters-clear" onClick={handleClearFilters}>
              Limpar todos
            </button>
          )}
        </div>
        <div className="filters-panel-content">
          {activeTab === 'filtros' && (
            <div className="filters-section">
              <div className="filter-group full-width">
                <DateRangeSlider 
                  data={rawData?.crimesPorMes || []}
                  onRangeChange={onDateRangeChange}
                  value={dateRange}
                />
              </div>
              <div className="filter-group">
                <label>📍 Município</label>
                <select 
                  value={selectedMunicipio} 
                  onChange={(e) => onMunicipioChange(e.target.value)}
                  className="filter-select"
                >
                  <option value="">Todos os municípios</option>
                  {availableMunicipios?.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div className="filter-group">
                <label>📂 Categorias</label>
                <div className="checkbox-group">
                  {availableCategorias?.map(cat => (
                    <label key={cat} className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={selectedCategorias?.includes(cat)}
                        onChange={() => {
                          if (selectedCategorias.includes(cat)) {
                            onCategoriasChange(selectedCategorias.filter(c => c !== cat));
                          } else {
                            onCategoriasChange([...selectedCategorias, cat]);
                          }
                        }}
                      />
                      {cat === 'patrimonial' && 'Patrimonial'}
                      {cat === 'violencia_social' && 'Violência Social'}
                      {cat === 'digital' && 'Digital'}
                      {cat === 'objetos' && 'Objetos'}
                    </label>
                  ))}
                </div>
              </div>
              {activeFiltersCount > 0 && (
                <div className="filter-summary">
                  <strong>Filtros ativos:</strong> {activeFiltersCount}
                </div>
              )}
            </div>
          )}
          {activeTab === 'downloads' && (
            <div className="downloads-section">
              <ExportPageButton 
                pageRef={pageRef}
                pageTitle={pageTitle}
                pageData={pageData}
                additionalData={additionalData}
                compact={false}
              />
              <p className="downloads-hint">
                PNG: captura a página inteira<br />
                CSV: exporta todos os dados brutos
              </p>
            </div>
          )}
        </div>
      </div>
    </div>,
    portalContainer
  ) : null;

  return (
    <div className="filters-panel-container">
      <button 
        ref={buttonRef}
        className={`filters-toggle-button${isOpen ? ' open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        {isOpen ? 'Filtros ▲' : 'Filtros ▼'}
        {activeFiltersCount > 0 && !isOpen && (
          <span className="filters-badge">{activeFiltersCount}</span>
        )}
      </button>
      {panelContent}
    </div>
  );
}

export default FiltersPanel;