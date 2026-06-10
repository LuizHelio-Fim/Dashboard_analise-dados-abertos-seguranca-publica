from functools import lru_cache
from pathlib import Path

import pandas as pd

from src.config.data_paths import PROCESSED_DATA_DIR, PROCESSED_FILES


def _load_csv(path: Path) -> list[dict]:
    if not path.exists():
        raise FileNotFoundError(f'Arquivo nao encontrado: {path}')

    frame = pd.read_csv(path)
    frame = frame.where(pd.notnull(frame), None)
    return frame.to_dict(orient='records')


@lru_cache(maxsize=1)
def get_kpis_home() -> dict:
    records = _load_csv(PROCESSED_DATA_DIR / PROCESSED_FILES['kpis_home'])
    return records[0] if records else {}


@lru_cache(maxsize=1)
def get_crimes_por_mes() -> list[dict]:
    return _load_csv(PROCESSED_DATA_DIR / PROCESSED_FILES['crimes_por_mes'])


@lru_cache(maxsize=1)
def get_crimes_por_municipio() -> list[dict]:
    return _load_csv(PROCESSED_DATA_DIR / PROCESSED_FILES['crimes_por_municipio'])


@lru_cache(maxsize=1)
def get_crimes_por_periodo() -> list[dict]:
    return _load_csv(PROCESSED_DATA_DIR / PROCESSED_FILES['crimes_por_periodo'])


@lru_cache(maxsize=1)
def get_top_bairros() -> list[dict]:
    return _load_csv(PROCESSED_DATA_DIR / PROCESSED_FILES['top_bairros'])


@lru_cache(maxsize=1)
def get_crimes_por_periodo_por_municipio() -> list[dict]:
    return _load_csv(PROCESSED_DATA_DIR / PROCESSED_FILES['crimes_por_periodo_por_municipio'])


@lru_cache(maxsize=1)
def get_crimes_por_mes_por_municipio() -> list[dict]:
    return _load_csv(PROCESSED_DATA_DIR / PROCESSED_FILES['crimes_por_mes_por_municipio'])


@lru_cache(maxsize=1)
def get_comparativo_furto_roubo() -> list[dict]:
    return _load_csv(PROCESSED_DATA_DIR / PROCESSED_FILES['comparativo_furto_roubo'])


@lru_cache(maxsize=1)
def get_objetos_mais_roubados() -> list[dict]:
    return _load_csv(PROCESSED_DATA_DIR / PROCESSED_FILES['objetos_mais_roubados'])


@lru_cache(maxsize=1)
def get_objetos_mais_roubados_por_municipio() -> list[dict]:
    return _load_csv(PROCESSED_DATA_DIR / PROCESSED_FILES['objetos_mais_roubados_por_municipio'])


@lru_cache(maxsize=1)
def get_perfil_vitimas() -> list[dict]:
    return _load_csv(PROCESSED_DATA_DIR / PROCESSED_FILES['perfil_vitimas'])


@lru_cache(maxsize=1)
def get_crimes_digitais_evolucao() -> list[dict]:
    return _load_csv(PROCESSED_DATA_DIR / PROCESSED_FILES['crimes_digitais_evolucao'])


@lru_cache(maxsize=1)
def get_fact_ocorrencias() -> list[dict]:
    return _load_csv(PROCESSED_DATA_DIR / PROCESSED_FILES['fact_ocorrencias'])


def get_dashboard_bundle() -> dict:
    return {
        'kpisHome': get_kpis_home(),
        'crimesPorMes': get_crimes_por_mes(),
        'crimesPorMesPorMunicipio': get_crimes_por_mes_por_municipio(),
        'crimesPorMunicipio': get_crimes_por_municipio(),
        'crimesPorPeriodo': get_crimes_por_periodo(),
        'crimesPorPeriodoPorMunicipio': get_crimes_por_periodo_por_municipio(),
        'topBairros': get_top_bairros(),
        'comparativoFurtoRoubo': get_comparativo_furto_roubo(),
        'objetosMaisRoubados': get_objetos_mais_roubados(),
        'objetosMaisRoubadosPorMunicipio': get_objetos_mais_roubados_por_municipio(),
        'perfilVitimas': get_perfil_vitimas(),
        'crimesDigitaisEvolucao': get_crimes_digitais_evolucao(),
    }
