# AI/api/app.py
from fastapi import FastAPI
from pydantic import BaseModel
from pathlib import Path
import joblib, json
import pandas as pd
import requests
from datetime import datetime
from fastapi.middleware.cors import CORSMiddleware


app = FastAPI(title="Flood Risk API", version="0.1.1")

# Carga modelo y columnas usadas en entrenamiento
PIPE = joblib.load(str(Path("artifacts") / "model.pkl"))
FEATURES = json.loads((Path("artifacts") / "feature_names.json").read_text(encoding="utf-8"))
THRESHOLD = 0.20  # ajústalo según operación

origins = [
    "http://localhost:5173",  
    "http://127.0.0.1:5173",
    "*"  
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,          # orígenes permitidos
    allow_credentials=True,
    allow_methods=["*"],            # permite todos los métodos (GET, POST, etc.)
    allow_headers=["*"],            # permite todos los headers
)

class WeatherInput(BaseModel):
    payload: dict
    
    
@app.get("/predict_realtime")
def predict_realtime():
    url = "https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/15.5645%2C-88.0286?unitGroup=metric&include=hours%2Ccurrent&key=HHPMJQETSARBF4BUCVZMRPBH8&contentType=json"
    res = requests.get(url)
    res.raise_for_status()
    data = res.json()

    # toma la hora actual
    current_hour = datetime.now().strftime("%H:00:00")
    today = data["days"][0]
    hour_data = next((h for h in today["hours"] if h["datetime"] == current_hour), today["hours"][0])

    # arma el payload esperado
    payload = {
        "temp": hour_data.get("temp"),
        "humidity": hour_data.get("humidity"),
        "precip": hour_data.get("precip"),
        "windspeed": hour_data.get("windspeed"),
        "windgust": hour_data.get("windgust"),
        "cloudcover": hour_data.get("cloudcover"),
        "visibility": hour_data.get("visibility"),
        "sealevelpressure": hour_data.get("sealevelpressure"),
        "solarradiation": hour_data.get("solarradiation"),
        "solarenergy": hour_data.get("solarenergy"),
        "dew": hour_data.get("dew"),
        "uvindex": hour_data.get("uvindex"),
        "precip_sum_3d": 0,  
        "precip_max_3d": 0
    }

    # predicción
    df = pd.DataFrame([payload]).apply(pd.to_numeric, errors="coerce")
    X = df.reindex(columns=FEATURES)
    proba = float(PIPE.predict_proba(X)[0,1])
    label = int(proba >= THRESHOLD)

    return {
        "location": data.get("resolvedAddress"),
        "datetime": today["datetime"] + " " + hour_data["datetime"],
        "features": payload,
        "risk_probability": proba,
        "risk_label": label
    }


@app.get("/predict_daily")
def predict_daily():
    url = "https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/15.5645%2C-88.0286?unitGroup=us&include=days&key=HHPMJQETSARBF4BUCVZMRPBH8&contentType=json"
    res = requests.get(url)
    res.raise_for_status()
    data = res.json()

    results = []
    for day in data.get("days", [])[:15]:  # solo los últimos 15 días
        payload = {
            "temp": day.get("temp"),
            "humidity": day.get("humidity"),
            "precip": day.get("precip"),
            "windspeed": day.get("windspeed"),
            "windgust": day.get("windgust"),
            "cloudcover": day.get("cloudcover"),
            "visibility": day.get("visibility"),
            "sealevelpressure": day.get("sealevelpressure"),
            "solarradiation": day.get("solarradiation"),
            "solarenergy": day.get("solarenergy"),
            "dew": day.get("dew"),
            "uvindex": day.get("uvindex"),
            "precip_sum_3d": 0,  
            "precip_max_3d": 0
        }

        # DataFrame para predicción
        df = pd.DataFrame([payload]).apply(pd.to_numeric, errors="coerce")
        X = df.reindex(columns=FEATURES)
        proba = float(PIPE.predict_proba(X)[0,1])
        label = int(proba >= THRESHOLD)

        results.append({
            "date": day.get("datetime"),
            "location": data.get("resolvedAddress"),
            "features": payload,
            "risk_probability": proba,
            "risk_label": label
        })

    return {"daily_predictions": results}


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

