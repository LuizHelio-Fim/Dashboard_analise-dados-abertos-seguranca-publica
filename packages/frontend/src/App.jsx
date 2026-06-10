import { useEffect, useMemo, useState, useRef } from 'react';
import Dashboard from './pages/Dashboard.jsx';
import DigitalPage from './pages/DigitalPage.jsx';
import ObjetosPage from './pages/ObjetosPage.jsx';
import PatrimonialPage from './pages/PatrimonialPage.jsx';
import ViolenciaSocialPage from './pages/ViolenciaSocialPage.jsx';
import FiltersPanel from './components/dashboard/FiltersPanel.jsx';
import { filterByDateRange, filterByMunicipio, filterByCategorias } from './utils/dashboardFilters.js';
import './App.css';

const API_URL = '/api/dashboard';
const NAV_ITEMS = [
  { id: 'home', label: 'Home' },
  { id: 'violencia-social', label: 'Violência Social' },
  { id: 'patrimonial', label: 'Patrimonial' },
  { id: 'digital', label: 'Digital' },
  { id: 'objetos', label: 'Objetos' },
];

function App() {
  const [activePage, setActivePage] = useState('home');
  const [rawData, setRawData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  
  // Estados dos filtros
  const [dateRange, setDateRange] = useState({ start: null, end: null });
  const [selectedMunicipio, setSelectedMunicipio] = useState('');
  const [selectedCategorias, setSelectedCategorias] = useState([]);
  
  const pageRef = useRef(null);

  // Carregar dados
  useEffect(() => {
    const controller = new AbortController();
    async function loadDashboard() {
      try {
        setLoading(true);
        setError(false);
        const response = await fetch(API_URL, { signal: controller.signal });
        if (!response.ok) throw new Error('Falha ao carregar dados');
        const payload = await response.json();
        setRawData(payload);
      } catch (fetchError) {
        if (fetchError.name !== 'AbortError') {
          console.error(fetchError);
          setError(true);
        }
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
    return () => controller.abort();
  }, []);

  // Listas únicas para filtros (extraídas dos dados brutos)
  const availableMunicipios = useMemo(() => {
    if (!rawData?.crimesPorMunicipio) return [];
    const municipios = [...new Set(rawData.crimesPorMunicipio.map(item => item.municipio))];
    return municipios.sort();
  }, [rawData]);

  const availableCategorias = ['patrimonial', 'violencia_social', 'digital', 'objetos'];

  // Função de filtragem combinada
  const filteredData = useMemo(() => {
    if (!rawData) return null;

    // Aplica filtros em cada dataset relevante
    const applyDateFilter = (series) => filterByDateRange(series, dateRange.start, dateRange.end, 'data_mes');
    const applyMunicipioFilter = (series) => filterByMunicipio(series, selectedMunicipio);
    const applyCategoriasFilter = (series) => filterByCategorias(series, selectedCategorias);

    // Datasets que possuem data_mes
    // Quando um município está selecionado, prefira os agregados por município gerados no backend
    const crimesPorMesSource = selectedMunicipio && rawData.crimesPorMesPorMunicipio
      ? rawData.crimesPorMesPorMunicipio
      : rawData.crimesPorMes;
    const crimesPorMesFiltered = applyCategoriasFilter(applyDateFilter(crimesPorMesSource || []));
    const comparativoFurtoRouboFiltered = applyDateFilter(rawData.comparativoFurtoRoubo);
    const crimesDigitaisEvolucaoFiltered = applyDateFilter(rawData.crimesDigitaisEvolucao);

    // Datasets que possuem municipio
    const crimesPorMunicipioFiltered = applyMunicipioFilter(applyCategoriasFilter(rawData.crimesPorMunicipio));
    const topBairrosFiltered = applyMunicipioFilter(applyCategoriasFilter(rawData.topBairros));
    
    // Perfil de vítimas (filtra por categoria e município)
    let perfilVitimasFiltered = rawData.perfilVitimas || [];
    if (selectedCategorias.length) {
      perfilVitimasFiltered = perfilVitimasFiltered.filter(item => selectedCategorias.includes(item.categoria_macro));
    }
    if (selectedMunicipio) {
      perfilVitimasFiltered = perfilVitimasFiltered.filter(item => item.municipio === selectedMunicipio);
    }

    // Distribuição por período: prefer per-municipio pre-aggregate quando disponível
    const crimesPorPeriodoSource = selectedMunicipio && rawData.crimesPorPeriodoPorMunicipio
      ? rawData.crimesPorPeriodoPorMunicipio
      : rawData.crimesPorPeriodo;
    const crimesPorPeriodoFiltered = applyCategoriasFilter(crimesPorPeriodoSource || []);

    // Objetos (suporta filtro por município quando o agregado por município estiver disponível)
    const objetosMaisRoubadosSource = selectedMunicipio && rawData.objetosMaisRoubadosPorMunicipio
      ? rawData.objetosMaisRoubadosPorMunicipio
      : rawData.objetosMaisRoubados || [];
    const objetosMaisRoubadosFiltered = selectedMunicipio && rawData.objetosMaisRoubadosPorMunicipio
      ? filterByMunicipio(objetosMaisRoubadosSource, selectedMunicipio)
      : objetosMaisRoubadosSource;

    return {
      ...rawData,
      kpisHome: rawData.kpisHome, // KPIs não filtrados (opcional)
      crimesPorMes: crimesPorMesFiltered,
      crimesPorMunicipio: crimesPorMunicipioFiltered,
      crimesPorPeriodo: crimesPorPeriodoFiltered,
      topBairros: topBairrosFiltered,
      comparativoFurtoRoubo: comparativoFurtoRouboFiltered,
      objetosMaisRoubados: objetosMaisRoubadosFiltered,
      perfilVitimas: perfilVitimasFiltered,
      crimesDigitaisEvolucao: crimesDigitaisEvolucaoFiltered,
    };
  }, [rawData, dateRange, selectedMunicipio, selectedCategorias]);

  const exportAdditionalData = useMemo(() => {
    if (!rawData) return {};
    return {
      crimesPorMes: rawData.crimesPorMes,
      crimesPorMunicipio: rawData.crimesPorMunicipio,
      topBairros: rawData.topBairros,
      objetosMaisRoubados: rawData.objetosMaisRoubados,
      objetosMaisRoubadosPorMunicipio: rawData.objetosMaisRoubadosPorMunicipio,
      perfilVitimas: rawData.perfilVitimas,
    };
  }, [rawData]);

  const pageTitle = NAV_ITEMS.find(item => item.id === activePage)?.label || 'Dashboard';

  const activeView = useMemo(() => {
    const views = {
      home: <Dashboard data={filteredData} loading={loading} error={error} />,
      'violencia-social': <ViolenciaSocialPage data={filteredData} />,
      patrimonial: <PatrimonialPage data={filteredData} />,
      digital: <DigitalPage data={filteredData} />,
      objetos: <ObjetosPage data={filteredData} />,
    };
    const PageComponent = views[activePage] ?? views.home;
    return <div ref={pageRef} className="page-export-container">{PageComponent}</div>;
  }, [activePage, filteredData, loading, error]);

  return (
    <div className="app-container">
      <header className="app-header">
        <div>
          <p className="app-kicker">Segurança pública ES 2025</p>
          <h1>Dashboard analítico interativo</h1>
          <p className="app-description">
            Navegue entre as páginas e utilize o painel de filtros para refinar a visualização.
          </p>
        </div>
        <div className="header-controls">
          <nav className="app-nav" aria-label="Seções do dashboard">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`app-nav-button${activePage === item.id ? ' active' : ''}`}
                onClick={() => setActivePage(item.id)}
              >
                {item.label}
              </button>
            ))}
          </nav>
          <FiltersPanel 
            pageRef={pageRef}
            pageTitle={pageTitle}
            pageData={filteredData}
            additionalData={exportAdditionalData}
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            rawData={rawData}
            selectedMunicipio={selectedMunicipio}
            onMunicipioChange={setSelectedMunicipio}
            selectedCategorias={selectedCategorias}
            onCategoriasChange={setSelectedCategorias}
            availableMunicipios={availableMunicipios}
            availableCategorias={availableCategorias}
          />
        </div>
      </header>
      <main className="dashboard-section">{activeView}</main>
    </div>
  );
}

export default App;