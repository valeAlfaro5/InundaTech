import argparse, json
from pathlib import Path
import joblib

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", default="artifacts/model.pkl")
    ap.add_argument("--json", required=True, help='Archivo JSON con {"payload": {...}}')
    ap.add_argument("--threshold", type=float, default=0.20)
    args = ap.parse_args()

    pipe = joblib.load(args.model)
    payload = json.loads(Path(args.json).read_text(encoding="utf-8"))
    X = [payload["payload"]]

    proba = float(pipe.predict_proba(X)[0,1])
    label = int(proba >= args.threshold)
    print(json.dumps({"risk_probability": proba, "risk_label": label, "threshold": args.threshold}, indent=2))

if __name__ == "__main__":
    main()
