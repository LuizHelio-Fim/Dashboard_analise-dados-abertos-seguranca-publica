from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent.parent
PROCESSED_DATA_DIR = BASE_DIR / 'data' / 'processed'


PROCESSED_FILES = {
    'kpis_home': 'kpis_home.csv',
    'crimes_por_mes': 'crimes_por_mes.csv',
    'crimes_por_municipio': 'crimes_por_municipio.csv',
    'crimes_por_periodo': 'crimes_por_periodo.csv',
    'crimes_por_periodo_por_municipio': 'crimes_por_periodo_por_municipio.csv',
    'crimes_por_mes_por_municipio': 'crimes_por_mes_por_municipio.csv',
    'top_bairros': 'top_bairros.csv',
    'comparativo_furto_roubo': 'comparativo_furto_roubo.csv',
    'objetos_mais_roubados': 'objetos_mais_roubados.csv',
    'objetos_mais_roubados_por_municipio': 'objetos_mais_roubados_por_municipio.csv',
    'perfil_vitimas': 'perfil_vitimas.csv',
    'crimes_digitais_evolucao': 'crimes_digitais_evolucao.csv',
    'fact_ocorrencias': 'fact_ocorrencias.csv',
}
