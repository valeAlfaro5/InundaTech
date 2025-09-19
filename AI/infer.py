import argparse, json
from pathlib import Path
import joblib
import pandas as pd

#modelo entrenado con ponderacion: agua 60%, clima 40%
def run_model_weighted(features: dict, water_weight=0.6, climate_weight=0.4) -> dict:
    df = pd.DataFrame([features]).apply(pd.to_numeric, errors="coerce")

    # Separar columnas
    water_cols = [c for c in df.columns if c in ["distance_cm", "level_pct"]]
    climate_cols = [c for c in df.columns if c in ["precip", "humidity", "sealevelpressure"]]

    # Riesgo parcial agua
    X_water = df.reindex(columns=water_cols)
    risk_water_partial = float(PIPE.predict_proba(X_water)[0, 1]) if not X_water.empty else 0.0

    # Riesgo parcial clima
    X_climate = df.reindex(columns=climate_cols)
    risk_climate_partial = float(PIPE.predict_proba(X_climate)[0, 1]) if not X_climate.empty else 0.0

    # Riesgo ponderado
    risk_weighted = water_weight*risk_water_partial + climate_weight*risk_climate_partial
    risk_weighted_label = int(risk_weighted >= args.threshold)

    return {
        "risk_water_partial": risk_water_partial,
        "risk_climate_partial": risk_climate_partial,
        "risk_weighted": risk_weighted,
        "risk_weighted_label": risk_weighted_label,
        "threshold": args.threshold
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", default="artifacts/model.pkl")
    ap.add_argument("--features", default="artifacts/feature_names.json")
    ap.add_argument("--json", required=True, help='Archivo JSON con {"payload": {...}}')
    ap.add_argument("--threshold", type=float, default=0.20)
    args = ap.parse_args()

    # 1) Cargar modelo y lista de columnas
    pipe = joblib.load(args.model)
    feature_names_path = Path(args.features)
    if not feature_names_path.exists():
        raise FileNotFoundError(f"No se encontró {feature_names_path}. Vuelve a entrenar para generarlo.")
    feature_names = json.loads(feature_names_path.read_text(encoding="utf-8"))

    # 2) Cargar payload y convertirlo a DataFrame
    payload = json.loads(Path(args.json).read_text(encoding="utf-8"))
    if "payload" not in payload or not isinstance(payload["payload"], dict):
        raise ValueError('El JSON debe tener la forma: {"payload": { ...campos... }}')

    df = pd.DataFrame([payload["payload"]])

    # Asegurar tipos numéricos donde se pueda (los no numéricos quedarán NaN y se imputan)
    df = df.apply(pd.to_numeric, errors="coerce")

    # 3) Alinear columnas al orden del entrenamiento
    X = df.reindex(columns=feature_names)

    # 4) Predicción
    proba = float(pipe.predict_proba(X)[0, 1])
    label = int(proba >= args.threshold)

    print(json.dumps({
        "risk_probability": proba,
        "risk_label": label,
        "threshold": args.threshold
    }, indent=2))

if __name__ == "__main__":
    main()
