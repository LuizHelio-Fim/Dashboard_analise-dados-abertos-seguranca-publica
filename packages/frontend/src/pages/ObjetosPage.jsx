import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import ChartCard from '../components/dashboard/ChartCard.jsx'
import KpiCard from '../components/dashboard/KpiCard.jsx'
import SectionTitle from '../components/dashboard/SectionTitle.jsx'
import { COLORS } from '../utils/theme';
import {
  aggregateComparisonSeries,
  aggregateObjectsSeries,
  formatCompactNumber,
} from '../utils/dashboardTransforms.js'

function ObjetosPage({ data }) {
  const objectsSeries = aggregateObjectsSeries(data?.objetosMaisRoubados ?? [], { limit: 8 })
  const comparisonSeries = aggregateComparisonSeries(data?.comparativoFurtoRoubo ?? [])

  const total = objectsSeries.reduce((sum, item) => sum + item.total, 0)
  const topObject = objectsSeries[0]?.objeto ?? '-'
  const furtoTotal = objectsSeries.reduce((sum, item) => sum + item.furtado, 0)
  const rouboTotal = objectsSeries.reduce((sum, item) => sum + item.roubado, 0)

  return (
    <div className="page-shell">
      <section className="dashboard-hero">
        <SectionTitle
          eyebrow="Objetos"
          title="Objetos mais furtados e roubados"
          description="Bens mais subtraídos, com comparação furtado x roubado e volume total por item."
        />
        <div className="dashboard-hero-meta">
          <span>Base: objetos furtados e roubados</span>
          <span>Leitura de itens e submodalidades</span>
        </div>
      </section>

      <section className="kpi-grid">
        <KpiCard label="Total de objetos" value={formatCompactNumber(total)} note="Top itens exibidos no painel" />
        <KpiCard label="Objeto dominante" value={topObject} note="Maior volume acumulado" />
        <KpiCard label="Furtos" value={formatCompactNumber(furtoTotal)} note="Somatório dos itens furtados" />
        <KpiCard label="Roubos" value={formatCompactNumber(rouboTotal)} note="Somatório dos itens roubados" />
      </section>

      <section className="chart-grid chart-grid-primary">
        <ChartCard title="Itens mais subtraídos" subtitle="Comparação entre furtado e roubado por objeto">
          <ResponsiveContainer width="100%" height={340}>
            <BarChart data={objectsSeries} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="objeto" tick={{ fill: '#475569', fontSize: 11 }} />
              <YAxis tick={{ fill: '#475569', fontSize: 12 }} />
              <Tooltip formatter={(value, name) => [formatCompactNumber(value), name]} />
              <Legend />
              <Bar dataKey="furtado" name="Furtado" fill={COLORS.furto} radius={[8, 8, 0, 0]} />
              <Bar dataKey="roubado" name="Roubado" fill={COLORS.roubo} radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Comparativo mensal furtos x roubos" subtitle="Volume mensal das duas submodalidades">
          <ResponsiveContainer width="100%" height={340}>
            <BarChart data={comparisonSeries} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="mes" tick={{ fill: '#475569', fontSize: 12 }} />
              <YAxis tick={{ fill: '#475569', fontSize: 12 }} />
              <Tooltip formatter={(value, name) => [formatCompactNumber(value), name]} />
              <Legend />
              <Bar dataKey="furtos" fill={COLORS.furto} radius={[8, 8, 0, 0]} />
              <Bar dataKey="roubos" fill={COLORS.roubo} radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </section>
    </div>
  )
}

export default ObjetosPage
