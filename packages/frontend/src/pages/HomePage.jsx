import { useRef } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import ChartCard from '../components/dashboard/ChartCard.jsx';
import KpiCard from '../components/dashboard/KpiCard.jsx';
import SectionTitle from '../components/dashboard/SectionTitle.jsx';
import {
  aggregateCategoryMonthlySeries,
  aggregateMunicipalitySeries,
  aggregatePeriodSeries,
  aggregateTopNeighborhoods,
  formatCompactNumber,
} from '../utils/dashboardTransforms.js';

const CATEGORY_COLORS = {
  patrimonial: '#3B82F6',
  violencia_social: '#EF4444',
  digital: '#10B981',
  objetos: '#F59E0B',
};

const CATEGORY_LABELS = {
  patrimonial: 'Patrimonial',
  violencia_social: 'Violência social',
  digital: 'Digital',
  objetos: 'Objetos',
};

function HomePage({ data, onMunicipioClick }) {
  const chartRef = useRef();
  const monthlySeries = aggregateCategoryMonthlySeries(data?.crimesPorMes ?? []);
  const municipalitySeries = aggregateMunicipalitySeries(data?.crimesPorMunicipio ?? [], { limit: 10 });
  const periodSeries = aggregatePeriodSeries(data?.crimesPorPeriodo ?? []);
  const topNeighborhoods = aggregateTopNeighborhoods(data?.topBairros ?? [], { limit: 10 });
  const topNeighborhoodsHeight = Math.min(520, Math.max(340, topNeighborhoods.length * 40 + 60));
  const secondaryChartHeight = Math.max(340, topNeighborhoodsHeight);

  // Adiciona campo 'total' para a linha
  const periodSeriesWithTotal = periodSeries.map(item => ({
    ...item,
    total: item.patrimonial + item.violencia_social + item.digital + item.objetos,
  }));

  const kpis = [
    {
      label: 'Total de Ocorrências',
      value: formatCompactNumber(data?.kpisHome?.total_crimes),
      note: 'Base consolidada do período',
    },
    {
      label: 'Município Crítico',
      value: data?.kpisHome?.cidade_critica ?? '-',
      note: 'Maior volume acumulado',
    },
    {
      label: 'Período Crítico',
      value: data?.kpisHome?.horario_critico ?? '-',
      note: `Horário informado em ${data?.kpisHome?.percentual_com_horario ?? 0}% dos registros`,
    },
    {
      label: 'Crime Dominante',
      value: data?.kpisHome?.crime_dominante ?? '-',
      note: 'Modalidade mais frequente',
    },
  ];

  return (
    <div className="page-shell">
      <section className="dashboard-hero">
        <SectionTitle
          eyebrow="Home"
          title="Dashboard analítico de segurança pública"
          description="Visão geral dos dados, consolidada e organizada para leitura executiva do cenário do ES em 2025."
        />
        <div className="dashboard-hero-meta">
          <span>Fonte: dados públicos processados</span>
        </div>
      </section>

      <section className="kpi-grid">
        {kpis.map((item) => (
          <KpiCard key={item.label} {...item} />
        ))}
      </section>

      <section className="chart-grid chart-grid-primary">
        <ChartCard
          ref={chartRef}
          title="Evolução mensal das ocorrências"
          subtitle="Meses aparecem em ordem cronológica"
          exportData={monthlySeries}
          fileName="evolucao_mensal"
        >
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={monthlySeries} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="mes" angle={-35} textAnchor="end" height={58} tickMargin={12} tick={{ fill: '#475569', fontSize: 11 }} />
              <YAxis tick={{ fill: '#475569', fontSize: 12 }} />
              <Tooltip formatter={(value, name) => [formatCompactNumber(value), name]} />
              <Line type="monotone" dataKey="patrimonial" name={CATEGORY_LABELS.patrimonial} stroke={CATEGORY_COLORS.patrimonial} strokeWidth={3} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="violencia_social" name={CATEGORY_LABELS.violencia_social} stroke={CATEGORY_COLORS.violencia_social} strokeWidth={3} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="digital" name={CATEGORY_LABELS.digital} stroke={CATEGORY_COLORS.digital} strokeWidth={3} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="objetos" name={CATEGORY_LABELS.objetos} stroke={CATEGORY_COLORS.objetos} strokeWidth={3} dot={{ r: 3 }} />
              <Legend />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Crimes por município" subtitle="Ranking consolidado por município.">
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={municipalitySeries} layout="vertical" margin={{ top: 10, right: 20, left: 30, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" tick={{ fill: '#475569', fontSize: 12 }} />
              <YAxis type="category" dataKey="municipio" width={130} tick={{ fill: '#475569', fontSize: 12 }} />
              <Tooltip formatter={(value) => [formatCompactNumber(value), 'Ocorrências']} />
              <Bar
                dataKey="quantidade"
                fill="#111827"
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

      <section className="chart-grid chart-grid-secondary">
        <ChartCard title="Distribuição por período do dia" subtitle="Barras empilhadas com linha representando o total de ocorrências">
          <ResponsiveContainer width="100%" height={secondaryChartHeight}>
            <BarChart data={periodSeriesWithTotal} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="periodo_dia"
                tick={{ fill: '#475569', fontSize: 12 }}
                tickFormatter={(value) => (value === 'SEM_HORARIO_INFORMADO' ? 'SEM HORÁRIO' : value)}
              />
              <YAxis yAxisId="left" tick={{ fill: '#475569', fontSize: 12 }} />
              <YAxis yAxisId="right" orientation="right" hide />
              <Tooltip formatter={(value, name) => [formatCompactNumber(value), name]} />
              <Legend />
              <Bar yAxisId="left" dataKey="patrimonial" stackId="a" fill={CATEGORY_COLORS.patrimonial} name={CATEGORY_LABELS.patrimonial} />
              <Bar yAxisId="left" dataKey="violencia_social" stackId="a" fill={CATEGORY_COLORS.violencia_social} name={CATEGORY_LABELS.violencia_social} />
              <Bar yAxisId="left" dataKey="digital" stackId="a" fill={CATEGORY_COLORS.digital} name={CATEGORY_LABELS.digital} />
              <Bar yAxisId="left" dataKey="objetos" stackId="a" fill={CATEGORY_COLORS.objetos} name={CATEGORY_LABELS.objetos} />
              <Line yAxisId="left" type="monotone" dataKey="total" stroke="#0f172a" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} name="Total (linha)" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Top bairros" subtitle="Bairros mais recorrentes no recorte atual">
          <ResponsiveContainer width="100%" height={topNeighborhoodsHeight}>
            <BarChart data={topNeighborhoods} layout="vertical" margin={{ top: 10, right: 20, left: 30, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" tick={{ fill: '#475569', fontSize: 12 }} />
              <YAxis
                type="category"
                dataKey="bairro"
                width={200}
                tick={{ fill: '#475569', fontSize: 12 }}
                tickMargin={12}
                interval={0}
              />
              <Tooltip formatter={(value) => [formatCompactNumber(value), 'Ocorrências']} />
              <Bar dataKey="quantidade" fill="#334155" radius={[0, 8, 8, 0]} barSize={18} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </section>
    </div>
  );
}

export default HomePage;