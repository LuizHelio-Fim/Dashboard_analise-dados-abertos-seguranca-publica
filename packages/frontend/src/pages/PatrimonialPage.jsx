import { useRef } from 'react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, BarChart, Bar } from 'recharts';
import ChartCard from '../components/dashboard/ChartCard.jsx';
import KpiCard from '../components/dashboard/KpiCard.jsx';
import SectionTitle from '../components/dashboard/SectionTitle.jsx';
import {
  aggregateComparisonSeries,
  aggregateMonthlySeries,
  aggregateMunicipalitySeries,
  aggregateTopNeighborhoods,
  formatCompactNumber,
} from '../utils/dashboardTransforms.js';

const CATEGORY = 'patrimonial';

function PatrimonialPage({ data, onMunicipioClick }) {
  // Verificação de segurança: se data estiver vazio, retorna loading ou vazio
  if (!data) {
    return <div className="dashboard-placeholder">Carregando dados patrimoniais...</div>;
  }

  const chartRef = useRef();
  const monthlySeries = aggregateMonthlySeries(data?.crimesPorMes ?? [], CATEGORY);
  const municipalitySeries = aggregateMunicipalitySeries(data?.crimesPorMunicipio ?? [], { category: CATEGORY, limit: 10 });
  const neighborhoodSeries = aggregateTopNeighborhoods(data?.topBairros ?? [], { category: CATEGORY, limit: 10 });
  const comparisonSeries = aggregateComparisonSeries(data?.comparativoFurtoRoubo ?? []);

  const total = monthlySeries.reduce((sum, item) => sum + (item.total || 0), 0);
  const topMunicipio = municipalitySeries[0]?.municipio ?? '-';
  const topBairro = neighborhoodSeries[0]?.bairro ?? '-';
  const topMonth = monthlySeries.at(-1)?.mes ?? '-';

  return (
    <div className="page-shell">
      <section className="dashboard-hero">
        <SectionTitle
          eyebrow="Patrimonial"
          title="Leitura de furtos e roubos"
          description="Dinâmica patrimonial com foco em tendência, território e comparação furtos vs roubos."
        />
        <div className="dashboard-hero-meta">
          <span>Base: crimes contra o patrimônio</span>
          <span>Comparativo mensal entre furtos e roubos</span>
        </div>
      </section>

      <section className="kpi-grid">
        <KpiCard label="Total patrimonial" value={formatCompactNumber(total)} note="Ocorrências da categoria no recorte" />
        <KpiCard label="Município crítico" value={topMunicipio} note="Maior volume acumulado" />
        <KpiCard label="Bairro crítico" value={topBairro} note="Maior recorrência no recorte" />
        <KpiCard label="Mês mais recente" value={topMonth} note="Último mês disponível no painel" />
      </section>

      <section className="chart-grid chart-grid-primary">
        {/* Comparativo furto x roubo como gráfico de linhas */}
        <ChartCard 
          title="Furtos x roubos (evolução mensal)" 
          subtitle="Comparativo das duas submodalidades ao longo do tempo"
        >
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={comparisonSeries} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="mes" tick={{ fill: '#475569', fontSize: 12 }} />
              <YAxis tick={{ fill: '#475569', fontSize: 12 }} />
              <Tooltip formatter={(value, name) => [formatCompactNumber(value), name]} />
              <Legend />
              <Line type="monotone" dataKey="furtos" name="Furtos" stroke="#3B82F6" strokeWidth={3} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="roubos" name="Roubos" stroke="#64748B" strokeWidth={3} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Municípios patrimoniais com drill-down */}
        <ChartCard title="Municípios patrimoniais" subtitle="Ranking consolidado da categoria patrimonial.">
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={municipalitySeries} layout="vertical" margin={{ top: 10, right: 20, left: 30, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" tick={{ fill: '#475569', fontSize: 12 }} />
              <YAxis type="category" dataKey="municipio" width={130} tick={{ fill: '#475569', fontSize: 12 }} />
              <Tooltip formatter={(value) => [formatCompactNumber(value), 'Ocorrências']} />
              <Bar
                dataKey="quantidade"
                fill="#0f172a"
                radius={[0, 8, 8, 0]}
                cursor="pointer"
                onClick={(data) => {
                  if (data && data.payload && data.payload.municipio && onMunicipioClick) {
                    onMunicipioClick(data.payload.municipio);
                  }
                }}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </section>

      <section className="chart-grid chart-grid-full">
        <ChartCard title="Bairros patrimoniais mais recorrentes" subtitle="Recorte com maior concentração em bairros">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={neighborhoodSeries} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="bairro" tick={{ fill: '#475569', fontSize: 11 }} />
              <YAxis tick={{ fill: '#475569', fontSize: 12 }} />
              <Tooltip formatter={(value) => [formatCompactNumber(value), 'Ocorrências']} />
              <Bar dataKey="quantidade" fill="#334155" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </section>
    </div>
  );
}

export default PatrimonialPage;