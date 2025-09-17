import argparse, json
from pathlib import Path
import pandas as pd
import numpy as np
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import roc_auc_score, average_precision_score, classification_report, confusion_matrix
import joblib
from typing import List, Tuple

# ------------------------------------------------------------
# Utilidad: detectar columnas relacionadas con nivel de agua
# ------------------------------------------------------------
def _detect_water_cols(df: pd.DataFrame) -> List[str]:
    water_keywords = ["water", "nivel", "level", "altura", "ultra", "distance", "dist"]
    cols = [c for c in df.columns if any(k in c.lower() for k in water_keywords)]
    cols = [c for c in cols if pd.api.types.is_numeric_dtype(df[c])]
    return cols

# ------------------------------------------------------------
# Ingeniería de características principal
# ------------------------------------------------------------
def build_features(df: pd.DataFrame) -> Tuple[pd.DataFrame, float, List[str]]:
    if "datetime" not in df.columns:
        raise ValueError("El CSV debe incluir una columna 'datetime'.")
    if "precip" not in df.columns:
        raise ValueError("El CSV debe incluir una columna numérica 'precip' (mm/día).")

    df = df.copy()
    df["datetime"] = pd.to_datetime(df["datetime"])
    df = df.sort_values("datetime").reset_index(drop=True)

    # Etiqueta proxy: lluvia intensa al día siguiente (p95, mínimo 20 mm)
    q95 = float(np.nanpercentile(df["precip"].fillna(0), 95))
    threshold_mm = max(q95, 20.0)
    df["precip_next_day"] = df["precip"].shift(-1)
    df["risk_next_day"] = (df["precip_next_day"] >= threshold_mm).astype(int)

    # Features rolling climáticas
    for w in [3, 5, 7, 14]:
        df[f"precip_sum_{w}d"] = df["precip"].rolling(window=w, min_periods=1).sum()
        df[f"precip_max_{w}d"] = df["precip"].rolling(window=w, min_periods=1).max()
        if "humidity" in df.columns:
            df[f"humidity_mean_{w}d"] = df["humidity"].rolling(window=w, min_periods=1).mean()
        if "sealevelpressure" in df.columns:
            df[f"slp_mean_{w}d"] = df["sealevelpressure"].rolling(window=w, min_periods=1).mean()

    # ---------------------------------------------
    # NUEVO: Features de nivel de agua (ESP32)
    # ---------------------------------------------
    water_cols = _detect_water_cols(df)
    for col in water_cols:
        df[f"{col}_lag1"] = df[col].shift(1)
        df[f"{col}_lag3"] = df[col].shift(3)
        df[f"{col}_diff1"] = df[col].diff(1)
        df[f"{col}_roc3"]  = (df[col] - df[col].shift(3)) / 3.0

        for w in [3, 5, 7, 14]:
            df[f"{col}_mean_{w}d"] = df[col].rolling(w, min_periods=1).mean()
            df[f"{col}_max_{w}d"]  = df[col].rolling(w, min_periods=1).max()
            df[f"{col}_min_{w}d"]  = df[col].rolling(w, min_periods=1).min()

        df[f"{col}_std_7d"] = df[col].rolling(7, min_periods=2).std()

    return df, threshold_mm, water_cols

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--csv", required=True)
    ap.add_argument("--out", default="artifacts")  # siempre apunta a artifacts
    args = ap.parse_args()

    Path(args.out).mkdir(parents=True, exist_ok=True)

    df = pd.read_csv(args.csv)
    df, threshold, water_cols = build_features(df)

    # Split temporal 80/20
    split_idx = int(len(df) * 0.8)
    train_df, test_df = df.iloc[:split_idx], df.iloc[split_idx:]

    # Selección de columnas
    exclude = {
        "name","datetime","description","icon","stations","sunrise","sunset",
        "preciptype","conditions","risk_next_day","precip_next_day"
    }
    numeric_cols = [c for c in df.columns if c not in exclude and pd.api.types.is_numeric_dtype(df[c])]

    # Guardar lista de features
    (Path(args.out) / "feature_names.json").write_text(
        json.dumps(numeric_cols, indent=2, ensure_ascii=False),
        encoding="utf-8"
    )

    X_train, y_train = train_df[numeric_cols], train_df["risk_next_day"]
    X_test,  y_test  = test_df[numeric_cols],  test_df["risk_next_day"]

    # Pipeline
    pre = ColumnTransformer([
        ("num", Pipeline([
            ("imp", SimpleImputer(strategy="median")),
            ("scaler", StandardScaler(with_mean=False))
        ]), numeric_cols)
    ])

    clf = RandomForestClassifier(
        n_estimators=600,
        class_weight="balanced",
        min_samples_split=4,
        random_state=42,
        n_jobs=-1
    )

    pipe = Pipeline([("pre", pre), ("clf", clf)])
    pipe.fit(X_train, y_train)

    # Evaluación
    proba = pipe.predict_proba(X_test)[:, 1]
    y_pred05 = (proba >= 0.5).astype(int)
    metrics = {
        "roc_auc": float(roc_auc_score(y_test, proba)),
        "avg_precision": float(average_precision_score(y_test, proba)),
        "confusion_matrix@0.5": confusion_matrix(y_test, y_pred05).tolist(),
        "report@0.5": classification_report(y_test, y_pred05, output_dict=True),
        "suggested_threshold_mm": float(threshold),
        "water_columns_detected": water_cols
    }

    # Guardado
    joblib.dump(pipe, Path(args.out) / "model.pkl")
    (Path(args.out) / "metrics.json").write_text(json.dumps(metrics, indent=2, ensure_ascii=False), encoding="utf-8")

    print(f"[OK] Modelo guardado en {args.out}/model.pkl")
    print(f"[INFO] Métricas guardadas en {args.out}/metrics.json")
    print(f"[INFO] Umbral sugerido (etiqueta): {threshold:.2f} mm/día")
    if water_cols:
        print(f"[INFO] Columnas de nivel de agua detectadas: {water_cols}")
    else:
        print("[WARN] No se detectaron columnas de nivel de agua.")

if __name__ == "__main__":
    main()
