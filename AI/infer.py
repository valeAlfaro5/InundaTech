import argparse, json
from pathlib import Path
import joblib
import pandas as pd

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
