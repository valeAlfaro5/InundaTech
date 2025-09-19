# AI/api/app.py
from fastapi import FastAPI, Query
from pydantic import BaseModel
from pathlib import Path
import joblib, json
import pandas as pd
import requests
from datetime import datetime
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional, Dict, Any

app = FastAPI(title="Flood Risk API", version="0.2.0")

# --- Modelo y features ---
PIPE = joblib.load(str(Path("artifacts") / "model.pkl"))
FEATURES = json.loads((Path("artifacts") / "feature_names.json").read_text(encoding="utf-8"))
THRESHOLD = 0.20  # ajústalo según operación

# --- CORS ---
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "*"
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Config de servicios externos ---
# Visual Crossing (coordenadas San Pedro Sula aprox. 15.5645, -88.0286)
VC_URL_REALTIME = (
    "https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/"
    "15.5645%2C-88.0286?unitGroup=metric&include=hours%2Ccurrent&key=HHPMJQETSARBF4BUCVZMRPBH8&contentType=json"
)
VC_URL_DAILY = (
    "https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/"
    "15.5645%2C-88.0286?unitGroup=metric&include=days&key=HHPMJQETSARBF4BUCVZMRPBH8&contentType=json"
)

# Firebase RTDB
FIREBASE_DB_URL = "https://inundatech-ecc38-default-rtdb.firebaseio.com"  # sin '/' final
DEVICE_ID = "esp32-water-01"  # puedes sobreescribirlo vía query param en los endpoints


class WeatherInput(BaseModel):
    payload: dict
    # Si el cliente quiere mezclar automáticamente con los últimos datos del ESP32
    use_esp32: Optional[bool] = False
    device_id: Optional[str] = DEVICE_ID


# ---------------------- Helpers ----------------------

def get_current_hour_str() -> str:
    # Formato 'HH:00:00' para hacer match con VisualCrossing "hours[].datetime"
    return datetime.now().strftime("%H:00:00")


def fetch_visualcrossing_realtime() -> Dict[str, Any]:
    res = requests.get(VC_URL_REALTIME, timeout=15)
    res.raise_for_status()
    return res.json()


def fetch_visualcrossing_daily() -> Dict[str, Any]:
    res = requests.get(VC_URL_DAILY, timeout=20)
    res.raise_for_status()
    return res.json()


def build_weather_payload_from_hour(hour: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "temp": hour.get("temp"),
        "feelslike": hour.get("feelslike"),
        "humidity": hour.get("humidity"),
        "precip": hour.get("precip"),
        "windspeed": hour.get("windspeed"),
        "windgust": hour.get("windgust"),
        "cloudcover": hour.get("cloudcover"),
        "visibility": hour.get("visibility"),
        "sealevelpressure": hour.get("sealevelpressure"),
        "solarradiation": hour.get("solarradiation"),
        "solarenergy": hour.get("solarenergy"),
        "dew": hour.get("dew"),
        "uvindex": hour.get("uvindex"),
        # features agregados a partir de ventanas (si tu pipeline los crea, aquí puedes llenarlos o dejarlos en 0)
        "precip_sum_3d": 0,
        "precip_max_3d": 0,
        # Campos descriptivos (no numéricos) NO deben entrar al modelo, pero podemos devolverlos en la respuesta
        "condition": hour.get("conditions"),
        # "description": hour.get("description"),
    }


def build_weather_payload_from_day(day: Dict[str, Any]) -> Dict[str, Any]:
    return {
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
        "precip_max_3d": 0,
    }


def get_latest_esp32(device_id: str = DEVICE_ID) -> Dict[str, Any]:
    """
    Lee del RTDB el último paquete del dispositivo. Se contemplan dos esquemas comunes:
    1) /devices/{device_id}/latest  -> objeto plano
    2) /devices/{device_id}/telemetry -> colección con timestamps; tomamos el último con orderBy y limitToLast
    Devuelve un dict con claves numéricas esperadas por el modelo, p. ej. distance_cm, level_pct, etc.
    """
    # Caso 1: /latest
    try:
        url_latest = f"{FIREBASE_DB_URL}/devices/{device_id}/latest.json"
        r = requests.get(url_latest, timeout=10)
        r.raise_for_status()
        latest = r.json()
        if isinstance(latest, dict) and latest:
            return {
                "distance_cm": latest.get("distance_cm"),
                "level_pct": latest.get("level_pct"),
                # agrega aquí más campos si tu ESP32 los envía (ej. "temperature_water", etc.)
            }
    except Exception:
        pass

    # Caso 2: /telemetry con query (requiere reglas abiertas o auth)
    # Tomamos el último registro por timestamp (si existe ese campo)
    try:
        # Si tus nodos tienen "timestamp" entero/milisegundos:
        #   ?orderBy="timestamp"&limitToLast=1
        # Si no, ten un campo incremental como "seq".
        url_tele = (
            f'{FIREBASE_DB_URL}/devices/{device_id}/telemetry.json'
            f'?orderBy="timestamp"&limitToLast=1'
        )
        r = requests.get(url_tele, timeout=10)
        r.raise_for_status()
        data = r.json() or {}
        if isinstance(data, dict) and data:
            # obtener el único ítem
            _, last_item = next(iter(sorted(data.items(), key=lambda kv: kv[0])))
            return {
                "distance_cm": last_item.get("distance_cm"),
                "level_pct": last_item.get("level_pct"),
            }
    except Exception:
        pass

    # Si no hay datos, devolvemos vacío (no rompe el merge)
    return {}


def merge_features(base: Dict[str, Any], extra: Dict[str, Any]) -> Dict[str, Any]:
    """
    Une los diccionarios de features dando prioridad a 'extra' (ESP32)
    cuando existan claves en conflicto.
    """
    merged = dict(base or {})
    for k, v in (extra or {}).items():
        if v is not None:
            merged[k] = v
    return merged


def run_model(features: Dict[str, Any]) -> Dict[str, Any]:
    # Asegurar numéricos
    df = pd.DataFrame([features]).apply(pd.to_numeric, errors="coerce")
    # Reindex al orden y set de columnas esperado por el modelo
    X = df.reindex(columns=FEATURES)
    proba = float(PIPE.predict_proba(X)[0, 1])
    label = int(proba >= THRESHOLD)
    return {"risk_probability": proba, "risk_label": label, "threshold": THRESHOLD}


def run_model_weighted_api(features: dict, water_weight=0.6, climate_weight=0.4) -> dict:
    df = pd.DataFrame([features]).apply(pd.to_numeric, errors="coerce")

    # columnas de agua y clima
    water_cols = ["distance_cm", "level_pct"]
    climate_cols = ["precip", "humidity", "sealevelpressure"]

    # Riesgos parciales
    X_water = df.reindex(columns=water_cols)
    risk_water_partial = float(PIPE.predict_proba(X_water)[0, 1]) if not X_water.empty else 0.0

    X_climate = df.reindex(columns=climate_cols)
    risk_climate_partial = float(PIPE.predict_proba(X_climate)[0, 1]) if not X_climate.empty else 0.0

    # Riesgo ponderado
    risk_weighted = water_weight*risk_water_partial + climate_weight*risk_climate_partial
    risk_weighted_label = int(risk_weighted >= THRESHOLD)

    return {
        "risk_water_partial": risk_water_partial,
        "risk_climate_partial": risk_climate_partial,
        "risk_weighted": risk_weighted,
        "risk_weighted_label": risk_weighted_label,
        "threshold": THRESHOLD
    }

# ---------------------- Endpoints ----------------------

@app.get("/predict_realtime")
def predict_realtime(
    use_esp32: bool = Query(default=True, description="Si True, mezcla con últimos datos del ESP32"),
    device_id: str = Query(default=DEVICE_ID, description="ID del dispositivo ESP32 en RTDB")
):
    data = fetch_visualcrossing_realtime()

    # Selección de la hora actual o fallback a la primera
    current_hour = get_current_hour_str()
    today = data["days"][0]
    hour_data = next((h for h in today.get("hours", []) if h.get("datetime") == current_hour),
                     (today.get("hours") or [{}])[0])

    # Payload meteo numérico para el modelo
    weather_payload = build_weather_payload_from_hour(hour_data)

    # Mezcla con ESP32 si se pide
    esp32_payload = get_latest_esp32(device_id) if use_esp32 else {}
    features = merge_features(weather_payload, esp32_payload)

    # Predicción
    out = run_model(features)
    weighted = run_model_weighted_api(features)

    # Campos descriptivos no numéricos (para UI)
    extras = {
        "condition": hour_data.get("conditions"),
        "description": hour_data.get("description"),
    }

    return {
        "location": data.get("resolvedAddress"),
        "datetime": f'{today.get("datetime", "")} {hour_data.get("datetime", "")}',
        "features": features,           # combinados
        "esp32_used": bool(esp32_payload),
        **extras,
        **out,
        **weighted
    }


@app.get("/predict_daily")
def predict_daily(
    use_esp32: bool = Query(default=True, description="Si True, mezcla cada día con últimos datos del ESP32"),
    device_id: str = Query(default=DEVICE_ID, description="ID del dispositivo ESP32 en RTDB"),
    days: int = Query(default=15, ge=1, le=15, description="Cantidad de días (máx. 15)")
):
    data = fetch_visualcrossing_daily()

    esp32_payload = get_latest_esp32(device_id) if use_esp32 else {}
    results = []

    for day in (data.get("days", [])[:days]):
        weather_payload = build_weather_payload_from_day(day)
        features = merge_features(weather_payload, esp32_payload)
        out = run_model(features)
        weighted = run_model_weighted_api(features)

        results.append({
            "date": day.get("datetime"),
            "location": data.get("resolvedAddress"),
            "features": features,
            "esp32_used": bool(esp32_payload),
            **out, 
            **weighted
        })

    return {"daily_predictions": results}

CSV_PATH = Path("eta_iota.csv") 
df_weather = pd.read_csv(CSV_PATH, parse_dates=["datetime"]) 

@app.get("/simulate_realtime")
def simulate_realtime(
    date: Optional[str] = Query(None, description="Fecha a consultar del CSV (YYYY-MM-DD)"),
    device_id: str = Query(default=DEVICE_ID, description="ID del ESP32 para tomar el nivel de agua")
):
    """
    Simula el riesgo combinando datos meteorológicos históricos con datos
    de agua en tiempo real del ESP32.
    """
    # 1) Seleccionar fila del CSV
    if date:
        row = df_weather[df_weather["datetime"].dt.strftime("%Y-%m-%d") == date]
        if row.empty:
            return {"error": f"No hay datos para {date}"}
        row = row.iloc[0]
    else:
        row = df_weather.iloc[-1]

    # 2) Construir payload de clima
    features = {
        "precip": row.get("precip", 0),
        "humidity": row.get("humidity", 0),
        "sealevelpressure": row.get("sealevelpressure", 0),
    }

    # 3) Obtener datos de agua del ESP32
    esp32_payload = get_latest_esp32(device_id)
    features.update(esp32_payload)

    # 4) Calcular riesgo ponderado
    risk = run_model_weighted_api(features, water_weight=0.6, climate_weight=0.4)

    return {
        "date": str(row["datetime"].date()),
        "features": features,
        **risk
    }

    

@app.get("/health")
def health():
    return {"status": "ok", "threshold": THRESHOLD, "n_features": len(FEATURES)}


@app.post("/predict")
def predict(inp: WeatherInput):
    """
    - Si el cliente manda payload puro (solo weather o ya combinado), se usa tal cual.
    - Si use_esp32=True, se fusiona el payload de entrada con los últimos datos del ESP32
      (los campos del ESP32 tienen prioridad).
    """
    base = dict(inp.payload or {})
    esp = get_latest_esp32(inp.device_id) if inp.use_esp32 else {}
    features = merge_features(base, esp)
    out = run_model(features)
    weighted = run_model_weighted_api(features)
    return {"features": features, "esp32_used": bool(esp), **out, **weighted}


