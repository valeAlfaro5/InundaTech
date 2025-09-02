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

def build_features(df: pd.DataFrame):
    df = df.copy()
    df["datetime"] = pd.to_datetime(df["datetime"])
    df = df.sort_values("datetime").reset_index(drop=True)

    # Etiqueta proxy: lluvia intensa al día siguiente (p95, mínimo 20 mm)
    q95 = float(np.nanpercentile(df["precip"].fillna(0), 95))
    threshold_mm = max(q95, 20.0)
    df["precip_next_day"] = df["precip"].shift(-1)
    df["risk_next_day"] = (df["precip_next_day"] >= threshold_mm).astype(int)

    # Features rolling
    for w in [3, 5, 7, 14]:
        df[f"precip_sum_{w}d"] = df["precip"].rolling(window=w, min_periods=1).sum()
        df[f"precip_max_{w}d"] = df["precip"].rolling(window=w, min_periods=1).max()
        if "humidity" in df.columns:
            df[f"humidity_mean_{w}d"] = df["humidity"].rolling(window=w, min_periods=1).mean()
        if "sealevelpressure" in df.columns:
            df[f"slp_mean_{w}d"] = df["sealevelpressure"].rolling(window=w, min_periods=1).mean()

    return df, threshold_mm

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--csv", required=True)
    ap.add_argument("--out", default="artifacts")
    args = ap.parse_args()

    Path(args.out).mkdir(parents=True, exist_ok=True)

    df = pd.read_csv(args.csv)
    df, threshold = build_features(df)

    split_idx = int(len(df)*0.8)
    train_df, test_df = df.iloc[:split_idx], df.iloc[split_idx:]

    exclude = {"name","datetime","description","icon","stations","sunrise","sunset","preciptype","conditions","risk_next_day","precip_next_day"}
    numeric_cols = [c for c in df.columns if c not in exclude and pd.api.types.is_numeric_dtype(df[c])]

    (Path(args.out) / "feature_names.json").write_text(
    json.dumps(numeric_cols, indent=2),
    encoding="utf-8"
)

    X_train, y_train = train_df[numeric_cols], train_df["risk_next_day"]
    X_test, y_test = test_df[numeric_cols], test_df["risk_next_day"]

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

    proba = pipe.predict_proba(X_test)[:,1]
    metrics = {
        "roc_auc": float(roc_auc_score(y_test, proba)),
        "avg_precision": float(average_precision_score(y_test, proba)),
        "confusion_matrix@0.5": confusion_matrix(y_test, (proba>=0.5).astype(int)).tolist(),
        "report@0.5": classification_report(y_test, (proba>=0.5).astype(int), output_dict=True),
        "suggested_threshold_mm": threshold
    }

    joblib.dump(pipe, Path(args.out) / "model.pkl")
    (Path(args.out) / "metrics.json").write_text(json.dumps(metrics, indent=2), encoding="utf-8")

    print(f"[OK] Modelo guardado en {args.out}/model.pkl")
    print(f"[INFO] Métricas guardadas en {args.out}/metrics.json")
    print(f"[INFO] Umbral sugerido: {threshold:.2f} mm/día")

if __name__ == "__main__":
    main()
