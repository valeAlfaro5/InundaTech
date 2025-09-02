from fastapi import FastAPI
from pydantic import BaseModel
from pathlib import Path
import joblib

app = FastAPI(title="Flood Risk API", version="0.1.0")
PIPE = joblib.load(str(Path("artifacts") / "model.pkl"))
THRESHOLD = 0.20  # puedes ajustar

class WeatherInput(BaseModel):
    payload: dict

@app.get("/health")
def health():
    return {"status": "ok", "threshold": THRESHOLD}

@app.post("/predict")
def predict(inp: WeatherInput):
    X = [inp.payload]
    proba = float(PIPE.predict_proba(X)[0,1])
    label = int(proba >= THRESHOLD)
    return {"risk_probability": proba, "risk_label": label, "threshold": THRESHOLD}
