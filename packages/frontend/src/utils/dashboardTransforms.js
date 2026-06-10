const CATEGORY_ORDER = ['patrimonial', 'violencia_social', 'digital', 'objetos']
const PERIOD_ORDER = ['MADRUGADA', 'MANHA', 'TARDE', 'NOITE', 'SEM_HORARIO_INFORMADO']

export function normalizeKey(value) {
  return String(value ?? '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
}

export function toTitleCase(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export function getMonthKey(value) {
  if (!value) return ''

  const asString = String(value)
  const match = asString.match(/^(\d{4})-(\d{2})/)
  if (match) return `${match[1]}-${match[2]}`

  const date = new Date(asString)
  if (Number.isNaN(date.getTime())) return ''

  return date.toISOString().slice(0, 7)
}

export function formatMonthLabel(value) {
  if (!value) return '-'

  const monthKey = getMonthKey(value)
  const date = monthKey ? new Date(`${monthKey}-01T00:00:00`) : new Date(value)
  if (Number.isNaN(date.getTime())) return '-'

  return new Intl.DateTimeFormat('pt-BR', { month: 'short', year: '2-digit' })
    .format(date)
    .replace('.', '')
    .toUpperCase()
}

export function formatCompactNumber(value) {
  return new Intl.NumberFormat('pt-BR').format(Number(value) || 0)
}

export function aggregateMonthlySeries(rows, category) {
  const grouped = new Map()
  const categoryKey = category ? normalizeKey(category) : ''

  rows.forEach((row) => {
    if (categoryKey && normalizeKey(row.categoria_macro) !== categoryKey) return

    const monthKey = getMonthKey(row.data_mes)
    if (!monthKey) return

    const current = grouped.get(monthKey) ?? {
      monthKey,
      mes: formatMonthLabel(monthKey),
      total: 0,
    }

    current.total += Number(row.quantidade) || 0
    grouped.set(monthKey, current)
  })

  return Array.from(grouped.values()).sort((left, right) => left.monthKey.localeCompare(right.monthKey))
}

export function aggregateCategoryMonthlySeries(rows) {
  const grouped = new Map()

  rows.forEach((row) => {
    const monthKey = getMonthKey(row.data_mes)
    if (!monthKey) return

    const current = grouped.get(monthKey) ?? {
      monthKey,
      mes: formatMonthLabel(monthKey),
      patrimonial: 0,
      violencia_social: 0,
      digital: 0,
      objetos: 0,
    }

    const categoryKey = normalizeKey(row.categoria_macro).toLowerCase()
    if (CATEGORY_ORDER.includes(categoryKey)) {
      current[categoryKey] += Number(row.quantidade) || 0
    }

    grouped.set(monthKey, current)
  })

  return Array.from(grouped.values()).sort((left, right) => left.monthKey.localeCompare(right.monthKey))
}

export function aggregateMunicipalitySeries(rows, options = {}) {
  const grouped = new Map()
  const categoryKey = options.category ? normalizeKey(options.category) : ''

  rows.forEach((row) => {
    if (categoryKey && normalizeKey(row.categoria_macro) !== categoryKey) return

    const normalizedName = normalizeKey(row.municipio)
    if (!normalizedName) return

    const current = grouped.get(normalizedName) ?? {
      municipio: toTitleCase(row.municipio),
      quantidade: 0,
    }

    current.quantidade += Number(row.quantidade) || 0
    grouped.set(normalizedName, current)
  })

  return Array.from(grouped.values())
    .sort((left, right) => right.quantidade - left.quantidade)
    .slice(0, options.limit ?? 10)
}

export function aggregateTopNeighborhoods(rows, options = {}) {
  const grouped = new Map()
  const nameCounts = new Map()
  const categoryKey = options.category ? normalizeKey(options.category) : ''

  rows.forEach((row) => {
    if (categoryKey && normalizeKey(row.categoria_macro) !== categoryKey) return

    const bairroKey = normalizeKey(row.bairro)
    const municipioKey = normalizeKey(row.municipio)
    if (!bairroKey || !municipioKey) return

    const uniqueKey = `${municipioKey}::${bairroKey}`
    const current = grouped.get(uniqueKey) ?? {
      municipio: toTitleCase(row.municipio),
      bairro: toTitleCase(row.bairro),
      quantidade: 0,
    }

    current.quantidade += Number(row.quantidade) || 0
    grouped.set(uniqueKey, current)

    nameCounts.set(bairroKey, (nameCounts.get(bairroKey) || 0) + 1)
  })

  const duplicateNames = new Set(
    Array.from(nameCounts.entries())
      .filter(([, count]) => count > 1)
      .map(([name]) => name)
  )

  return Array.from(grouped.values())
    .map((item) => {
      const bairroKey = normalizeKey(item.bairro)
      if (duplicateNames.has(bairroKey)) {
        return {
          ...item,
          bairro: `${item.bairro} de ${item.municipio}`,
        }
      }
      return item
    })
    .sort((left, right) => right.quantidade - left.quantidade)
    .slice(0, options.limit ?? 10)
}

export function aggregatePeriodSeries(rows) {
  const grouped = new Map()

  PERIOD_ORDER.forEach((period) => {
    grouped.set(period, {
      periodo_dia: period,
      patrimonial: 0,
      violencia_social: 0,
      digital: 0,
      objetos: 0,
      total: 0,
    })
  })

  rows.forEach((row) => {
    let period = normalizeKey(row.periodo_dia)
    if (period === 'SEM HORARIO') {
      period = 'SEM_HORARIO_INFORMADO'
    }
    if (!grouped.has(period)) return

    const current = grouped.get(period)
    const categoryKey = normalizeKey(row.categoria_macro).toLowerCase()

    if (CATEGORY_ORDER.includes(categoryKey)) {
      const quantity = Number(row.quantidade) || 0
      current[categoryKey] += quantity
      current.total += quantity
    }
  })

  return PERIOD_ORDER.map((period) => grouped.get(period)).filter((entry) => entry.total > 0)
}

export function aggregateComparisonSeries(rows) {
  const grouped = new Map()

  rows.forEach((row) => {
    const monthKey = getMonthKey(row.data_mes)
    if (!monthKey) return

    const current = grouped.get(monthKey) ?? {
      monthKey,
      mes: formatMonthLabel(monthKey),
      furtos: 0,
      roubos: 0,
    }

    const source = normalizeKey(row.fonte_dados).toLowerCase()
    const quantity = Number(row.quantidade) || 0

    if (source.includes('furt')) current.furtos += quantity
    if (source.includes('roub')) current.roubos += quantity

    grouped.set(monthKey, current)
  })

  return Array.from(grouped.values()).sort((left, right) => left.monthKey.localeCompare(right.monthKey))
}

export function aggregateProfileSeries(rows, field, options = {}) {
  const grouped = new Map();
  const categoryKey = options.category ? normalizeKey(options.category) : '';

  // Mapeamento para o campo 'sexo' (gênero)
  const genderMapping = {
    // Valores que devem ser agrupados em "Outros"
    'S/I': 'OUTROS',
    'INDETERMINADO': 'OUTROS',
    'TRANSEXUAL': 'OUTROS',
    // Se houver outras variantes (com acentos ou espaços), normalizeKey já trata
  };

  rows.forEach((row) => {
    if (categoryKey && normalizeKey(row.categoria_macro) !== categoryKey) return;

    let rawValue = row[field];
    if (!rawValue) return;

    let normalizedValue = normalizeKey(rawValue);

    // Se for o campo 'sexo', aplica o mapeamento
    if (field === 'sexo') {
      // Primeiro tenta o mapeamento exato
      if (genderMapping[normalizedValue]) {
        normalizedValue = genderMapping[normalizedValue];
      }
      // Também pode capturar 'OUTROS' já existente, mas mantemos
    }

    // Valor final para exibição (rótulo amigável)
    let displayLabel;
    if (field === 'sexo' && normalizedValue === 'OUTROS') {
      displayLabel = 'Outros';
    } else {
      displayLabel = toTitleCase(rawValue);
    }

    const current = grouped.get(normalizedValue) ?? {
      label: displayLabel,
      quantidade: 0,
    };

    current.quantidade += 1;
    grouped.set(normalizedValue, current);
  });

  return Array.from(grouped.values())
    .sort((left, right) => right.quantidade - left.quantidade)
    .slice(0, options.limit ?? 8);
}

export function aggregateObjectsSeries(rows, options = {}) {
  const grouped = new Map()

  rows.forEach((row) => {
    const normalizedObject = normalizeKey(row.tipo_objeto)
    if (!normalizedObject) return

    const current = grouped.get(normalizedObject) ?? {
      objeto: toTitleCase(row.tipo_objeto),
      furtado: 0,
      roubado: 0,
      total: 0,
    }

    const action = normalizeKey(row.acao_objeto)
    const quantity = Number(row.quantidade) || 0

    if (action.includes('FURT')) current.furtado += quantity
    if (action.includes('ROUB')) current.roubado += quantity
    current.total += quantity

    grouped.set(normalizedObject, current)
  })

  return Array.from(grouped.values())
    .sort((left, right) => right.total - left.total)
    .slice(0, options.limit ?? 8)
}
