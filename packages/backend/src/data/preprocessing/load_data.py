"""Preprocessamento e geração de datasets analiticos para o dashboard.

O objetivo deste script e transformar os CSVs brutos em:
- tabelas limpas por origem;
- fact table unificada;
- tabelas agregadas para o dashboard;
- KPIs iniciais para a pagina Home.
"""

from __future__ import annotations

import re
import unicodedata
from pathlib import Path

import pandas as pd


RAW_DIR = Path(__file__).resolve().parent.parent / "raw" / "CSVs"
PROCESSED_DIR = Path(__file__).resolve().parent.parent / "processed"
PROCESSED_DIR.mkdir(parents=True, exist_ok=True)


DATASETS = {
    "crimes_informaticos": {"file_name": "CRIMES_INFORMATICOS_2025.csv", "category": "digital"},
    "estelionatos": {"file_name": "ESTELIONATOS_2025.csv", "category": "patrimonial"},
    "furtos": {"file_name": "FURTOS_2025.csv", "category": "patrimonial"},
    "homicidios": {"file_name": "HOMICIDIOS_DOLOSOS_2025.csv", "category": "violencia_social"},
    "objetos": {"file_name": "OBJETOS_FURTADOS_E_ROUBADOS_2025.csv", "category": "objetos"},
    "roubos": {"file_name": "ROUBOS_2025.csv", "category": "patrimonial"},
    "violencia_domestica": {"file_name": "VIOLENCIA_DOMESTICA_2025.csv", "category": "violencia_social"},
}


COLUMN_ALIASES = {
    "_id": "_id",
    "Nº OCORRÊNCIA": "numero_ocorrencia",
    "Nº OCORRENCIA": "numero_ocorrencia",
    "DATA DO FATO": "data_fato",
    "HORA DO FATO": "hora_fato",
    "GRUPO DE INCIDENTE": "grupo_incidente",
    "TIPO DE INCIDENTE": "tipo_incidente",
    "UF": "uf",
    "MUNICÍPIO": "municipio",
    "MUNICIPIO": "municipio",
    "BAIRRO": "bairro",
    "LOGRADOURO": "logradouro",
    "TIPO DE LOCAL": "tipo_local",
    "TIPO LOCAL": "tipo_local",
    "TIPO OBJETO": "tipo_objeto",
    "AÇÃO OBJETO": "acao_objeto",
    "TIPO DE BOLETIM": "tipo_boletim",
    "TIPO DE ENVOLVIMENTO": "tipo_envolvimento",
    "IDADE": "idade",
    "SEXO": "sexo",
    "GENERO": "genero",
    "GÊNERO": "genero",
    "COR": "cor",
    "CÚTIS": "cutis",
    "COTIS": "cutis",
    "CÓD. INCIDENTE": "cod_incidente",
    "COR VEÍCULO": "cor_veiculo",
    "COR VEICULO": "cor_veiculo",
    "TIPO": "tipo",
    "MARCA": "marca",
    "MODELO": "modelo",
}


DROP_COLUMNS = {"_id", "numero_ocorrencia", "logradouro"}

INVALID_MUNICIPIO_VALUES = {
    "MUNICIPIO_NAO_INFORMADO",
    "UF_NAO_INFORMADA",
    "OUTRO LOCAL",
    "NAO INFORMADO",
    "NAO INFORMADA",
    "IGNORADO",
    "DESCONHECIDO",
    "SEM INFORMACAO",
    "INDETERMINADA",
    "S I",
    "S/I",
}
INVALID_BAIRRO_VALUES = {
    "BAIRRO_NAO_INFORMADO",
    "OUTRO LOCAL",
    "ZONA RURAL",
    "NAO INFORMADO",
    "NAO INFORMADA",
    "IGNORADO",
    "DESCONHECIDO",
    "SEM INFORMACAO",
    "INDETERMINADA",
    "S I",
    "S/I",
}

GENERIC_FIELD_VALUES = {
    "BAIRRO_NAO_INFORMADO",
    "MUNICIPIO_NAO_INFORMADO",
    "UF_NAO_INFORMADA",
    "OUTRO LOCAL",
    "ZONA RURAL",
    "NAO INFORMADO",
    "NAO INFORMADA",
    "IGNORADO",
    "DESCONHECIDO",
    "SEM INFORMACAO",
    "INDETERMINADA",
    "S I",
    "S/I",
}

MONTHS_PT = {1: "JAN", 2: "FEV", 3: "MAR", 4: "ABR", 5: "MAI", 6: "JUN", 7: "JUL", 8: "AGO", 9: "SET", 10: "OUT", 11: "NOV", 12: "DEZ"}
WEEKDAYS_PT = {0: "SEG", 1: "TER", 2: "QUA", 3: "QUI", 4: "SEX", 5: "SAB", 6: "DOM"}


def canonicalize(text: str) -> str:
    normalized = unicodedata.normalize("NFKD", str(text))
    without_accents = "".join(char for char in normalized if not unicodedata.combining(char))
    without_accents = without_accents.upper().strip()
    return re.sub(r"[^A-Z0-9]+", "_", without_accents).strip("_")


def read_csv_with_fallback(path: Path) -> pd.DataFrame:
    for encoding in ("utf-8", "utf-8-sig", "latin1", "cp1252"):
        try:
            return pd.read_csv(path, sep=",", encoding=encoding)
        except UnicodeDecodeError:
            continue
    return pd.read_csv(path, sep=",", encoding="latin1")


def resolve_dataset_path(file_name: str) -> Path:
    path = RAW_DIR / file_name

    if path.exists():
        return path

    if file_name.endswith(".csv.csv"):
        alternate = RAW_DIR / file_name.removesuffix(".csv")
        if alternate.exists():
            return alternate

    alternate = RAW_DIR / f"{file_name}.csv"

    if alternate.exists():
        return alternate

    return path


def rename_by_aliases(df: pd.DataFrame) -> pd.DataFrame:
    lookup = {canonicalize(column): column for column in df.columns}
    rename_map = {}

    for source_name, target_name in COLUMN_ALIASES.items():
        matched_column = lookup.get(canonicalize(source_name))

        if matched_column and matched_column not in rename_map:
            rename_map[matched_column] = target_name

    return df.rename(columns=rename_map)


def clean_text_series(series: pd.Series) -> pd.Series:
    def normalize_value(value: str) -> str:
        if pd.isna(value):
            return pd.NA
        text = str(value).strip()
        if text == "":
            return pd.NA
        normalized = unicodedata.normalize("NFKD", text)
        without_accents = "".join(char for char in normalized if not unicodedata.combining(char))
        normalized_text = re.sub(r"[^A-Za-z0-9 ]+", " ", without_accents)
        normalized_text = re.sub(r"\s+", " ", normalized_text).strip().upper()
        return normalized_text or pd.NA

    return series.map(normalize_value, na_action="ignore").astype("string")


def parse_time_to_hour(series: pd.Series) -> pd.Series:
    cleaned = series.astype("string").str.strip()
    parsed = pd.to_datetime(cleaned, format="%H:%M:%S", errors="coerce")
    missing = parsed.isna()
    
    if missing.any():
        parsed.loc[missing] = pd.to_datetime(cleaned.loc[missing], format="%H:%M", errors="coerce")
    return parsed.dt.hour


def get_period_of_day(hour: float | int | pd.NA) -> str | pd.NA:
    if pd.isna(hour):
        return pd.NA
    hour_int = int(hour)
    if 0 <= hour_int <= 5:
        return "MADRUGADA"
    if 6 <= hour_int <= 11:
        return "MANHA"
    if 12 <= hour_int <= 17:
        return "TARDE"
    return "NOITE"


def add_derived_columns(df: pd.DataFrame, source_name: str, category: str) -> pd.DataFrame:
    df = df.copy()
    df["fonte_dados"] = source_name
    df["categoria_macro"] = category

    if "municipio" in df.columns:
        municipio = clean_text_series(df["municipio"])
        municipio = municipio.replace({value: "MUNICIPIO_NAO_INFORMADO" for value in INVALID_MUNICIPIO_VALUES})
        df["municipio"] = municipio.fillna("MUNICIPIO_NAO_INFORMADO")
    if "bairro" in df.columns:
        bairro = clean_text_series(df["bairro"])
        df["bairro"] = bairro.replace({value: "BAIRRO_NAO_INFORMADO" for value in INVALID_BAIRRO_VALUES})
        df["bairro"] = df["bairro"].fillna("BAIRRO_NAO_INFORMADO")
    if "uf" in df.columns:
        df["uf"] = clean_text_series(df["uf"]).fillna("UF_NAO_INFORMADA")

    if "data_fato" in df.columns:
        raw_dates = df["data_fato"].astype("string").str.strip()
        raw_dates = raw_dates.str.replace("t", "T", regex=False)

        parsed = pd.to_datetime(raw_dates, format="%Y-%m-%dT%H:%M:%S", errors="coerce")
        parsed = parsed.fillna(pd.to_datetime(raw_dates, format="%Y-%m-%d %H:%M:%S", errors="coerce"))

        missing = parsed.isna()
        if missing.any():
            parsed.loc[missing] = pd.to_datetime(raw_dates.loc[missing], dayfirst=True, errors="coerce")

        df["data_fato"] = parsed
        df["ano"] = df["data_fato"].dt.year
        df["mes"] = df["data_fato"].dt.month
        df["mes_nome"] = df["mes"].map(MONTHS_PT)
        df["data_mes"] = df["data_fato"].dt.to_period("M").dt.to_timestamp()
        df["dia_da_semana_num"] = df["data_fato"].dt.dayofweek
        df["dia_da_semana"] = df["dia_da_semana_num"].map(WEEKDAYS_PT)
        df["fim_de_semana"] = df["dia_da_semana_num"].isin([5, 6])

    if "hora_fato" in df.columns:
        df["hora_num"] = parse_time_to_hour(df["hora_fato"])
        df["periodo_dia"] = df["hora_num"].apply(get_period_of_day)
        df["periodo_dia"] = df["periodo_dia"].fillna("SEM HORÁRIO")
        df["hora_fato"] = df["hora_fato"].astype("string").str.strip()

    if "idade" in df.columns:
        idade = pd.to_numeric(df["idade"], errors="coerce")
        df["idade"] = idade
        df["faixa_etaria"] = pd.cut(
            idade,
            bins=[-1, 14, 17, 24, 34, 44, 54, 64, 200],
            labels=["0_14", "15_17", "18_24", "25_34", "35_44", "45_54", "55_64", "65_PLUS"],
        )

    for column in ("sexo", "genero", "cor", "cutis", "tipo_incidente", "grupo_incidente", "tipo_local", "tipo_boletim", "tipo_envolvimento", "acao_objeto", "tipo_objeto", "marca", "modelo", "cor_veiculo", "tipo"):
        if column in df.columns:
            df[column] = clean_text_series(df[column])

    if "cor" in df.columns:
        df["cor"] = df["cor"].replace({"S I": "INDETERMINADA", "SI": "INDETERMINADA", "S/I": "INDETERMINADA"})
    if "cutis" in df.columns:
        df["cutis"] = df["cutis"].replace({"S I": "INDETERMINADA", "SI": "INDETERMINADA", "S/I": "INDETERMINADA"})

    return df


def clean_dataset(source_name: str, config: dict) -> pd.DataFrame:
    path = resolve_dataset_path(config["file_name"])
    df = read_csv_with_fallback(path)
    df = rename_by_aliases(df)

    existing_drop_columns = [column for column in DROP_COLUMNS if column in df.columns]
    if existing_drop_columns:
        df = df.drop(columns=existing_drop_columns)

    if "_id" in df.columns:
        subset_columns = [column for column in df.columns if column != "_id"]
        df = df.dropna(how="all", subset=subset_columns)
    else:
        df = df.dropna(how="all")

    df = add_derived_columns(df, source_name, config["category"])

    output_path = PROCESSED_DIR / f"{source_name}_clean.csv"
    df.to_csv(output_path, index=False, encoding="utf-8-sig")
    return df

# criacao das tabelas ja processadas para alimentar o dashboard e a home page, alem de uma tabela de fatos unificada para futuras analises

def build_fact_table(cleaned_frames: dict[str, pd.DataFrame]) -> pd.DataFrame:
    fact_table = pd.concat(cleaned_frames.values(), ignore_index=True, sort=False)
    fact_table.to_csv(PROCESSED_DIR / "fact_ocorrencias.csv", index=False, encoding="utf-8-sig")
    return fact_table


def is_valid_municipio(series: pd.Series) -> pd.Series:
    return series.notna() & ~series.isin(INVALID_MUNICIPIO_VALUES)


def is_valid_bairro(series: pd.Series) -> pd.Series:
    return series.notna() & ~series.isin(INVALID_BAIRRO_VALUES)


def is_generic_value(series: pd.Series) -> pd.Series:
    cleaned = series.astype("string").str.strip().replace({"": pd.NA, "nan": pd.NA})
    return cleaned.notna() & cleaned.str.upper().isin(GENERIC_FIELD_VALUES)


def is_valid_tipo(series: pd.Series) -> pd.Series:
    return series.notna() & ~is_generic_value(series)


def is_valid_profile(series: pd.Series) -> pd.Series:
    return series.notna() & ~is_generic_value(series)


def is_valid_object(series: pd.Series) -> pd.Series:
    return series.notna() & ~is_generic_value(series)


def is_valid_location_row(df: pd.DataFrame) -> pd.Series:
    valid = pd.Series(True, index=df.index)
    if "municipio" in df.columns:
        valid &= is_valid_municipio(df["municipio"])
    if "bairro" in df.columns:
        valid &= is_valid_bairro(df["bairro"])
    if "data_fato" in df.columns:
        valid &= df["data_fato"].notna()
    if "hora_num" in df.columns:
        valid &= df["hora_num"].notna()
    if "tipo_incidente" in df.columns:
        valid &= is_valid_tipo(df["tipo_incidente"])
    return valid


def is_valid_profile_row(df: pd.DataFrame) -> pd.Series:
    valid = is_valid_location_row(df)
    if "sexo" in df.columns:
        valid &= is_valid_profile(df["sexo"])
    if "genero" in df.columns:
        valid &= is_valid_profile(df["genero"])
    if "faixa_etaria" in df.columns:
        valid &= df["faixa_etaria"].notna()
    return valid


def is_valid_object_row(df: pd.DataFrame) -> pd.Series:
    valid = is_valid_location_row(df)
    if "tipo_objeto" in df.columns:
        valid &= is_valid_object(df["tipo_objeto"])
    if "acao_objeto" in df.columns:
        valid &= is_valid_object(df["acao_objeto"])
    return valid


def build_dimension_tables(fact_table: pd.DataFrame) -> None:
    time_columns = [column for column in ["data_fato", "ano", "mes", "mes_nome", "data_mes", "dia_da_semana_num", "dia_da_semana", "periodo_dia", "fim_de_semana"] if column in fact_table.columns]
    if time_columns:
        fact_table[time_columns].drop_duplicates().to_csv(PROCESSED_DIR / "dim_tempo.csv", index=False, encoding="utf-8-sig")

    location_columns = [column for column in ["uf", "municipio", "bairro", "categoria_macro"] if column in fact_table.columns]
    if location_columns:
        fact_table[location_columns].drop_duplicates().to_csv(PROCESSED_DIR / "dim_localidade.csv", index=False, encoding="utf-8-sig")


def build_kpis_home(fact_table: pd.DataFrame) -> pd.DataFrame:
    total_crimes = int(len(fact_table))
    valid_crimes = fact_table.loc[is_valid_location_row(fact_table)]
    total_crimes_valid = int(len(valid_crimes))

    registros_sem_horario = int((fact_table["periodo_dia"] == "SEM HORÁRIO").sum()) if "periodo_dia" in fact_table.columns else 0
    percentual_com_horario = round(((total_crimes - registros_sem_horario) / total_crimes) * 100, 2) if total_crimes else 0
    percentual_crimes_validos = round((total_crimes_valid / total_crimes) * 100, 2) if total_crimes else 0

    cidade_critica = pd.NA
    if "municipio" in valid_crimes.columns and not valid_crimes.empty:
        cidade_critica = valid_crimes["municipio"].value_counts().idxmax()

    horario_critico = pd.NA
    if "periodo_dia" in valid_crimes.columns and not valid_crimes.empty:
        horario_critico = valid_crimes["periodo_dia"].value_counts().idxmax()

    crime_dominante = pd.NA
    if "tipo_incidente" in valid_crimes.columns and not valid_crimes.empty:
        valid_incidentes = valid_crimes.loc[is_valid_tipo(valid_crimes["tipo_incidente"]), "tipo_incidente"]
        if not valid_incidentes.empty:
            crime_dominante = valid_incidentes.value_counts().idxmax()

    kpis = pd.DataFrame([
        {
            "total_crimes": total_crimes,
            "total_crimes_valid": total_crimes_valid,
            "percentual_crimes_validos": percentual_crimes_validos,
            "cidade_critica": cidade_critica,
            "horario_critico": horario_critico,
            "crime_dominante": crime_dominante,
            "registros_sem_horario": registros_sem_horario,
            "percentual_com_horario": percentual_com_horario,
        }
    ])
    kpis.to_csv(PROCESSED_DIR / "kpis_home.csv", index=False, encoding="utf-8-sig")
    return kpis


def export_crimes_por_mes(fact_table: pd.DataFrame) -> pd.DataFrame:
    valid_table = fact_table.loc[is_valid_location_row(fact_table) & fact_table["data_mes"].notna()]
    crimes_por_mes = (
        valid_table.groupby(["data_mes", "categoria_macro"], as_index=False)
        .size()
        .rename(columns={"size": "quantidade"})
        .sort_values(["data_mes", "categoria_macro"])
    )
    crimes_por_mes.to_csv(PROCESSED_DIR / "crimes_por_mes.csv", index=False, encoding="utf-8-sig")
    return crimes_por_mes


def export_crimes_por_mes_por_municipio(fact_table: pd.DataFrame) -> pd.DataFrame:
    valid_table = fact_table.loc[is_valid_location_row(fact_table) & fact_table["data_mes"].notna()]
    crimes_por_mes_por_municipio = (
        valid_table.groupby(["data_mes", "municipio", "categoria_macro"], as_index=False)
        .size()
        .rename(columns={"size": "quantidade"})
        .sort_values(["data_mes", "municipio", "categoria_macro"], ascending=[True, True, True])
    )
    crimes_por_mes_por_municipio.to_csv(PROCESSED_DIR / "crimes_por_mes_por_municipio.csv", index=False, encoding="utf-8-sig")
    return crimes_por_mes_por_municipio


def export_crimes_por_municipio(fact_table: pd.DataFrame) -> pd.DataFrame:
    valid_table = fact_table.loc[is_valid_location_row(fact_table)]
    crimes_por_municipio = (
        valid_table.groupby(["municipio", "categoria_macro"], as_index=False)
        .size()
        .rename(columns={"size": "quantidade"})
        .sort_values(["quantidade", "municipio"], ascending=[False, True])
    )
    crimes_por_municipio.to_csv(PROCESSED_DIR / "crimes_por_municipio.csv", index=False, encoding="utf-8-sig")
    return crimes_por_municipio


def export_crimes_por_periodo(fact_table: pd.DataFrame) -> pd.DataFrame:
    valid_table = fact_table.loc[is_valid_location_row(fact_table)]
    crimes_por_periodo = (
        valid_table
        .groupby(["periodo_dia", "categoria_macro"], as_index=False)
        .size()
        .rename(columns={"size": "quantidade"})
        .sort_values(["quantidade", "periodo_dia"], ascending=[False, True])
    )
    crimes_por_periodo.to_csv(PROCESSED_DIR / "crimes_por_periodo.csv", index=False, encoding="utf-8-sig")
    return crimes_por_periodo


def export_crimes_por_periodo_por_municipio(fact_table: pd.DataFrame) -> pd.DataFrame:
    valid_table = fact_table.loc[is_valid_location_row(fact_table)]
    crimes_por_periodo_por_municipio = (
        valid_table
        .groupby(["periodo_dia", "municipio", "categoria_macro"], as_index=False)
        .size()
        .rename(columns={"size": "quantidade"})
        .sort_values(["municipio", "periodo_dia", "quantidade"], ascending=[True, True, False])
    )
    crimes_por_periodo_por_municipio.to_csv(PROCESSED_DIR / "crimes_por_periodo_por_municipio.csv", index=False, encoding="utf-8-sig")
    return crimes_por_periodo_por_municipio


def export_top_bairros(fact_table: pd.DataFrame) -> pd.DataFrame:
    valid_table = fact_table.loc[is_valid_location_row(fact_table)]
    top_bairros = (
        valid_table
        .groupby(["municipio", "bairro", "categoria_macro"], as_index=False)
        .size()
        .rename(columns={"size": "quantidade"})
        .sort_values(["quantidade", "municipio", "bairro"], ascending=[False, True, True])
    )
    top_bairros.to_csv(PROCESSED_DIR / "top_bairros.csv", index=False, encoding="utf-8-sig")
    return top_bairros


def export_data_quality_metrics(fact_table: pd.DataFrame) -> pd.DataFrame:
    quality_rows = []

    invalid_municipios = fact_table.loc[~is_valid_municipio(fact_table["municipio"]), "municipio"]
    for value, count in invalid_municipios.value_counts().items():
        quality_rows.append(
            {
                "tipo": "municipio_invalido",
                "valor_invalido": value,
                "quantidade": int(count),
            }
        )

    invalid_bairros = fact_table.loc[~is_valid_bairro(fact_table["bairro"]), "bairro"]
    for value, count in invalid_bairros.value_counts().items():
        quality_rows.append(
            {
                "tipo": "bairro_invalido",
                "valor_invalido": value,
                "quantidade": int(count),
            }
        )

    quality_metrics = pd.DataFrame(quality_rows, columns=["tipo", "valor_invalido", "quantidade"])
    quality_metrics.to_csv(PROCESSED_DIR / "qualidade_dados_localidade.csv", index=False, encoding="utf-8-sig")
    return quality_metrics


def export_comparativo_furto_roubo(fact_table: pd.DataFrame) -> pd.DataFrame:
    comparativo_furto_roubo = fact_table[fact_table["fonte_dados"].isin(["furtos", "roubos"])]
    comparativo_furto_roubo = (
        comparativo_furto_roubo.dropna(subset=["data_mes"])
        .groupby(["data_mes", "fonte_dados"], as_index=False)
        .size()
        .rename(columns={"size": "quantidade"})
        .sort_values(["data_mes", "fonte_dados"])
    )
    comparativo_furto_roubo.to_csv(PROCESSED_DIR / "comparativo_furto_roubo.csv", index=False, encoding="utf-8-sig")
    return comparativo_furto_roubo


def export_objetos_mais_roubados(cleaned_frames: dict[str, pd.DataFrame]) -> pd.DataFrame:
    objetos = cleaned_frames.get("objetos")
    if objetos is not None and "tipo_objeto" in objetos.columns:
        valid_objetos = objetos.loc[is_valid_object_row(objetos)]
        objetos_mais_roubados = (
            valid_objetos.groupby(["tipo_objeto", "acao_objeto"], as_index=False)
            .size()
            .rename(columns={"size": "quantidade"})
            .sort_values(["quantidade", "tipo_objeto"], ascending=[False, True])
        )
    else:
        objetos_mais_roubados = pd.DataFrame(columns=["tipo_objeto", "acao_objeto", "quantidade"])

    objetos_mais_roubados.to_csv(PROCESSED_DIR / "objetos_mais_roubados.csv", index=False, encoding="utf-8-sig")
    return objetos_mais_roubados


def export_objetos_mais_roubados_por_municipio(cleaned_frames: dict[str, pd.DataFrame]) -> pd.DataFrame:
    objetos = cleaned_frames.get("objetos")
    if objetos is not None and {"tipo_objeto", "acao_objeto", "municipio"}.issubset(objetos.columns):
        valid_objetos = objetos.loc[is_valid_object_row(objetos)]
        objetos_mais_roubados_por_municipio = (
            valid_objetos.groupby(["municipio", "tipo_objeto", "acao_objeto"], as_index=False)
            .size()
            .rename(columns={"size": "quantidade"})
            .sort_values(["municipio", "quantidade", "tipo_objeto"], ascending=[True, False, True])
        )
    else:
        objetos_mais_roubados_por_municipio = pd.DataFrame(columns=["municipio", "tipo_objeto", "acao_objeto", "quantidade"])

    objetos_mais_roubados_por_municipio.to_csv(PROCESSED_DIR / "objetos_mais_roubados_por_municipio.csv", index=False, encoding="utf-8-sig")
    return objetos_mais_roubados_por_municipio


def export_perfil_vitimas(cleaned_frames: dict[str, pd.DataFrame]) -> pd.DataFrame:
    perfil_frames = []

    for dataset_name in ("homicidios", "violencia_domestica"):
        frame = cleaned_frames.get(dataset_name)
        if frame is None:
            continue
        columns = [
            column
            for column in [
                "fonte_dados",
                "categoria_macro",
                "sexo",
                "genero",
                "cutis",
                "cor",
                "idade",
                "faixa_etaria",
                "municipio",
                "bairro",
            ]
            if column in frame.columns
        ]
        if columns:
            valid_frame = frame.loc[is_valid_profile_row(frame)]
            perfil_frames.append(valid_frame[columns])

    perfil_vitimas = pd.concat(perfil_frames, ignore_index=True, sort=False) if perfil_frames else pd.DataFrame()
    perfil_vitimas.to_csv(PROCESSED_DIR / "perfil_vitimas.csv", index=False, encoding="utf-8-sig")
    return perfil_vitimas


def export_crimes_digitais_evolucao(fact_table: pd.DataFrame) -> pd.DataFrame:
    crimes_digitais_evolucao = fact_table[fact_table["categoria_macro"] == "digital"]
    valid_table = crimes_digitais_evolucao.loc[is_valid_location_row(crimes_digitais_evolucao)]
    crimes_digitais_evolucao = (
        valid_table.groupby(["data_mes", "municipio"], as_index=False)
        .size()
        .rename(columns={"size": "quantidade"})
        .sort_values(["data_mes", "quantidade"], ascending=[True, False])
    )
    crimes_digitais_evolucao.to_csv(PROCESSED_DIR / "crimes_digitais_evolucao.csv", index=False, encoding="utf-8-sig")
    return crimes_digitais_evolucao


def build_analytics(fact_table: pd.DataFrame, cleaned_frames: dict[str, pd.DataFrame]) -> dict[str, pd.DataFrame]:
    return {
        "crimes_por_mes": export_crimes_por_mes(fact_table),
        "crimes_por_mes_por_municipio": export_crimes_por_mes_por_municipio(fact_table),
        "crimes_por_municipio": export_crimes_por_municipio(fact_table),
        "crimes_por_periodo": export_crimes_por_periodo(fact_table),
        "crimes_por_periodo_por_municipio": export_crimes_por_periodo_por_municipio(fact_table),
        "top_bairros": export_top_bairros(fact_table),
        "comparativo_furto_roubo": export_comparativo_furto_roubo(fact_table),
        "objetos_mais_roubados": export_objetos_mais_roubados(cleaned_frames),
        "objetos_mais_roubados_por_municipio": export_objetos_mais_roubados_por_municipio(cleaned_frames),
        "perfil_vitimas": export_perfil_vitimas(cleaned_frames),
        "crimes_digitais_evolucao": export_crimes_digitais_evolucao(fact_table),
        "qualidade_dados_localidade": export_data_quality_metrics(fact_table),
    }


def main() -> None:
    cleaned_frames = {}
    for source_name, config in DATASETS.items():
        cleaned_frames[source_name] = clean_dataset(source_name, config)

    fact_table = build_fact_table(cleaned_frames)
    build_dimension_tables(fact_table)
    build_kpis_home(fact_table)
    build_analytics(fact_table, cleaned_frames)

    print(f"Arquivos processados em: {PROCESSED_DIR}")
    print(f"Linhas consolidadas na fact table: {len(fact_table)}")


if __name__ == "__main__":
    main()
