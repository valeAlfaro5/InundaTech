# AI/api/app.py
from fastapi import FastAPI
from pydantic import BaseModel
from pathlib import Path
import joblib, json
import pandas as pd

app = FastAPI(title="Flood Risk API", version="0.1.1")

# Carga modelo y columnas usadas en entrenamiento
PIPE = joblib.load(str(Path("artifacts") / "model.pkl"))
FEATURES = json.loads((Path("artifacts") / "feature_names.json").read_text(encoding="utf-8"))
THRESHOLD = 0.20  # ajústalo según operación

class WeatherInput(BaseModel):
    payload: dict

@app.get("/health")
def health():
    return {"status": "ok", "threshold": THRESHOLD, "n_features": len(FEATURES)}

@app.post("/predict")
def predict(inp: WeatherInput):
    df = pd.DataFrame([inp.payload]).apply(pd.to_numeric, errors="coerce")
    X = df.reindex(columns=FEATURES)
    proba = float(PIPE.predict_proba(X)[0,1])
    label = int(proba >= THRESHOLD)
    return {"risk_probability": proba, "risk_label": label, "threshold": THRESHOLD}
