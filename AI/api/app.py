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

app = FastAPI(title="Flood Risk API", version="0.6.0")

# --- Modelo y features ---
PIPE = joblib.load(str(Path("artifacts") / "model.pkl"))
FEATURES = json.loads((Path("artifacts") / "feature_names.json").read_text(encoding="utf-8"))
THRESHOLD = 0.25  # corte para riesgo

# --- Pesos para el ensamble ---
WEIGHT_WATER = 0.7
WEIGHT_CLIMATE = 0.3

# --- CORS ---
origins = [
    "*"
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Config de servicios externos (para endpoints ya existentes) ---
VC_URL_REALTIME = (
    "https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/"
    "15.5645%2C-88.0286?unitGroup=metric&include=hours%2Ccurrent&key=HHPMJQETSARBF4BUCVZMRPBH8&contentType=json"
)
VC_URL_DAILY = (
    "https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/"
    "15.5645%2C-88.0286?unitGroup=metric&include=days&key=HHPMJQETSARBF4BUCVZMRPBH8&contentType=json"
)

# Firebase RTDB
FIREBASE_DB_URL = "https://inundatech-ecc38-default-rtdb.firebaseio.com"
DEVICE_ID = "esp32-water-01"

# ===================== CLIMA ESTÁTICO: CARGA CSV ETA/IOTA =====================
STATIC_CSV_PATH = Path(__file__).resolve().parent.parent / "" / "eta_iota.csv"
if not STATIC_CSV_PATH.exists():
    # puedes cambiar a una ruta relativa a tu repo si lo prefieres
    raise FileNotFoundError(f"No se encontró el CSV: {STATIC_CSV_PATH}")

STATIC_WEATHER = pd.read_csv(STATIC_CSV_PATH)

# Parseo de fecha si existe 'datetime'
if "datetime" in STATIC_WEATHER.columns:
    STATIC_WEATHER["datetime"] = pd.to_datetime(STATIC_WEATHER["datetime"], errors="coerce")

# Mapeo de alias de columnas para alinear con lo que espera el modelo
# (agrega alias aquí según necesites)
COLUMN_ALIASES = {
    "pressure": "sealevelpressure",  # ejemplo: si el modelo espera 'sealevelpressure'
}
for src, dst in COLUMN_ALIASES.items():
    if src in STATIC_WEATHER.columns and dst not in STATIC_WEATHER.columns:
        STATIC_WEATHER[dst] = STATIC_WEATHER[src]

# ===================== Schemas =====================
class StaticPredictByRow(BaseModel):
    esp32: Dict[str, Any]
    row_index: int  # 0-based (día 01 = 0, día 02 = 1, etc.)

class WeatherInput(BaseModel):
    payload: dict
    use_esp32: Optional[bool] = False
    device_id: Optional[str] = DEVICE_ID

# ---------------------- Helpers ----------------------
def get_current_hour_str() -> str:
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
        "precip_sum_3d": 0,
        "precip_max_3d": 0,
    }

def build_weather_meta_from_hour(hour: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "condition": hour.get("conditions"),
        "icon": hour.get("icon"),
        "description": hour.get("description"),
        "datetime": hour.get("datetime"),
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
    """Busca el último paquete del ESP32 en RTDB."""
    def pick_fields(d: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "distance_cm": d.get("distance_cm"),
            "level_pct": d.get("level_pct"),
            "fill_pct": d.get("fill_pct"),
            "water_height_cm": d.get("water_height_cm"),
            "max_depth_cm": d.get("max_depth_cm"),
            "headspace_cm": d.get("headspace_cm"),
            "usable_depth_cm": d.get("usable_depth_cm"),
        }

    # Caso 1: /last
    try:
        url_last = f"{FIREBASE_DB_URL}/devices/{device_id}/last.json"
        r = requests.get(url_last, timeout=10); r.raise_for_status()
        last = r.json()
        if isinstance(last, dict) and last:
            return pick_fields(last)
    except Exception:
        pass

    # Caso 2: /latest
    try:
        url_latest = f"{FIREBASE_DB_URL}/devices/{device_id}/latest.json"
        r = requests.get(url_latest, timeout=10); r.raise_for_status()
        latest = r.json()
        if isinstance(latest, dict) and latest:
            return pick_fields(latest)
    except Exception:
        pass

    # Caso 3: /telemetry
    try:
        url_tele = (
            f'{FIREBASE_DB_URL}/devices/{device_id}/telemetry.json'
            f'?orderBy="timestamp"&limitToLast=1'
        )
        r = requests.get(url_tele, timeout=10); r.raise_for_status()
        data = r.json() or {}
        if isinstance(data, dict) and data:
            _, last_item = next(iter(sorted(data.items(), key=lambda kv: kv[0])))
            if isinstance(last_item, dict):
                return pick_fields(last_item)
    except Exception:
        pass

    return {}

def merge_features(base: Dict[str, Any], extra: Dict[str, Any]) -> Dict[str, Any]:
    merged = dict(base or {})
    for k, v in (extra or {}).items():
        if v is not None:
            merged[k] = v
    return merged

def run_model(features: Dict[str, Any]) -> Dict[str, Any]:
    df = pd.DataFrame([features]).apply(pd.to_numeric, errors="coerce")
    X = df.reindex(columns=FEATURES)
    proba = float(PIPE.predict_proba(X)[0, 1])
    label = int(proba >= THRESHOLD)
    result = {"risk_probability": proba, "risk_label": label, "threshold": THRESHOLD}

    print("=== Predicción IA (solo clima) ===")
    print("Features usados:", features)
    print("Probabilidad climática:", proba)
    print("Label asignado:", label)
    print("=====================")

    return result

def _to_float(x, default=None):
    try:
        if x is None: return default
        if isinstance(x, (int, float)): return float(x)
        return float(str(x).strip())
    except Exception:
        return default

def compute_water_score(
    esp32: Dict[str, Any],
    max_depth_cm: float = 10.0,
    headspace_cm: float = 3.0
) -> float:
    """
    Devuelve un score ∈ [0,1] donde 1 = nivel crítico.
    Toma el MÁXIMO entre las señales disponibles:
      - level_pct / 100
      - fill_pct / 100
      - water_height_cm / usable_depth
      - (max_depth - distance_cm) / usable_depth
    """
    if not esp32:
        return 0.0

    candidates = []

    # 1) Porcentajes directos
    lp = _to_float(esp32.get("level_pct"))
    if lp is not None:
        candidates.append(lp / 100.0)

    fp = _to_float(esp32.get("fill_pct"))
    if fp is not None:
        candidates.append(fp / 100.0)

    # 2) Geometría (para normalizar alturas/distancia)
    usable = _to_float(esp32.get("usable_depth_cm"))
    md = _to_float(esp32.get("max_depth_cm"), max_depth_cm)
    hs = _to_float(esp32.get("headspace_cm"), headspace_cm)
    if usable is None and (md is not None and hs is not None):
        usable = max(0.0, md - hs)

    # 3) Altura de agua útil directa
    wh = _to_float(esp32.get("water_height_cm"))
    if wh is not None and usable and usable > 0:
        candidates.append(wh / usable)

    # 4) Distancia al agua -> altura útil
    d = _to_float(esp32.get("distance_cm"))
    if d is not None and usable and usable > 0 and md is not None:
        water_h = max(0.0, min(usable, md - d))
        candidates.append(water_h / usable)

    # Clamp y selección
    cleaned = [max(0.0, min(1.0, c)) for c in candidates if c is not None]
    if cleaned:
        score = max(cleaned)
        print(f"[AGUA] señales={candidates} -> score={round(score,3)}")
        return score

    print("[AGUA] Insuficiente info para calcular score. Payload:", esp32)
    return 0.0

# ===================== Endpoints: CLIMA ESTÁTICO CSV =====================
@app.get("/static/count")
def static_count():
    """Devuelve la cantidad de filas disponibles en el CSV."""
    return {"count": int(len(STATIC_WEATHER))}

@app.get("/static/row")
def static_row(row_index: int = Query(0, ge=0)):
    """Devuelve la fila cruda del CSV (útil para inspección)."""
    if row_index < 0 or row_index >= len(STATIC_WEATHER):
        return {"error": f"row_index fuera de rango (0..{len(STATIC_WEATHER)-1})"}
    row = STATIC_WEATHER.iloc[int(row_index)]
    out = row.to_dict()
    if isinstance(out.get("datetime"), pd.Timestamp):
        out["datetime"] = out["datetime"].isoformat()
    return {"row_index": int(row_index), "row": out}

@app.post("/predict/static")
def predict_static_by_row(body: StaticPredictByRow):
    idx = int(body.row_index)
    if idx < 0 or idx >= len(STATIC_WEATHER):
        return {"error": f"row_index fuera de rango (0..{len(STATIC_WEATHER)-1})"}

    row = STATIC_WEATHER.iloc[idx].to_dict()

    # Alias (por si tu modelo espera 'sealevelpressure')
    if "sealevelpressure" not in row and "pressure" in row:
        row["sealevelpressure"] = row["pressure"]

    # --- 1) Armar features del MODELO (clima + esp32 si el modelo los usa) ---
    model_cols = list(FEATURES)
    feat = {}
    for col in model_cols:
        if col in row:
            feat[col] = row[col]                # clima estático del CSV
        elif col in body.esp32:
            feat[col] = body.esp32[col]         # por si tu modelo incluye llaves del ESP32
        else:
            feat[col] = None

    X = pd.DataFrame([feat], columns=model_cols)

    # --- 2) Prob. climática del modelo (p) ---
    try:
        p = float(PIPE.predict_proba(X)[:, 1][0])
    except Exception:
        p = float(PIPE.predict(X)[0])

    # --- 3) Score de agua (dinámico) y ENSAMBLE ---
    # Si tu frontend manda max_depth_cm / headspace_cm en esp32, se usarán aquí.
    water_score = compute_water_score(body.esp32)
    combined = WEIGHT_WATER * water_score + WEIGHT_CLIMATE * p
    risk_label_bin = int(combined >= THRESHOLD)

    # --- 4) Bucket nominal (para UX) ---
    def bucket(prob):
        if prob < 0.15: return ("Bajo", 0)
        if prob < 0.30: return ("Moderado", 1)
        if prob < 0.50: return ("Alto", 2)
        return ("Muy Alto", 3)
    label_txt, label_code = bucket(combined)

    # --- 5) Paquete compacto de clima para el frontend ---
    weather = {
        "datetime": str(row.get("datetime", "")),
        "temp": row.get("temp"),
        "feelslike": row.get("feelslike"),
        "humidity": row.get("humidity"),
        "dew": row.get("dew"),
        "precip": row.get("precip"),
        "visibility": row.get("visibility"),
        "windspeed": row.get("windspeed"),
        "windgust": row.get("windgust"),
        "cloudcover": row.get("cloudcover"),
        "uvindex": row.get("uvindex"),
        "solarradiation": row.get("solarradiation"),
        "solarenergy": row.get("solarenergy"),
        "condition": row.get("conditions") or row.get("condition") or row.get("icon"),
    }

    # --- 6) Respuesta (incluye componentes para debug) ---
    return {
        "row_index": idx,
        "datetime": weather["datetime"],
        "weather": weather,
        "esp32": body.esp32,

        # componentes
        "climate_probability": p,
        "water_score": water_score,

        # ENSAMBLE (⚠️ ESTE usa el frontend)
        "risk_probability": combined,
        "risk_label": risk_label_bin,
        "risk_bucket": label_txt,
        "risk_code": label_code,
        "threshold": THRESHOLD,
        "weights": {"water": WEIGHT_WATER, "climate": WEIGHT_CLIMATE},
    }


# ===================== Endpoints existentes (realtime / daily / predict) =====================
@app.get("/predict_realtime")
def predict_realtime(
    use_esp32: bool = Query(default=True),
    device_id: str = Query(default=DEVICE_ID),
    max_depth_cm: float = Query(default=10.0),
    headspace_cm: float = Query(default=3.0)
):
    data = fetch_visualcrossing_realtime()

    current_hour = get_current_hour_str()
    today = data["days"][0]
    hour_data = next((h for h in today.get("hours", []) if h.get("datetime") == current_hour),
                     (today.get("hours") or [{}])[0])

    weather_num = build_weather_payload_from_hour(hour_data)
    weather_meta = build_weather_meta_from_hour(hour_data)
    esp32_payload = get_latest_esp32(device_id) if use_esp32 else {}

    features = merge_features(weather_num, esp32_payload)
    out = run_model(features)

    climate_probability = out["risk_probability"]
    water_score = compute_water_score(esp32_payload, max_depth_cm=max_depth_cm, headspace_cm=headspace_cm)
    combined = WEIGHT_WATER * water_score + WEIGHT_CLIMATE * climate_probability
    label = int(combined >= THRESHOLD)

    print("[ENSAMBLE] climate=", round(climate_probability, 3),
          " water=", round(water_score, 3),
          " => combined=", round(combined, 3),
          " esp32=", esp32_payload)

    return {
        "location": data.get("resolvedAddress"),
        "datetime": f'{today.get("datetime", "")} {weather_meta.get("datetime", "")}',
        "weather": {**weather_num, **weather_meta},
        "esp32": esp32_payload or None,
        "features": features,
        "esp32_used": bool(esp32_payload),

        "climate_probability": climate_probability,
        "water_score": water_score,

        "risk_probability": combined,
        "risk_label": label,
        "threshold": THRESHOLD
    }

@app.get("/predict_daily")
def predict_daily(
    use_esp32: bool = Query(default=True),
    device_id: str = Query(default=DEVICE_ID),
    days: int = Query(default=15, ge=1, le=15),
    max_depth_cm: float = Query(default=10.0),
    headspace_cm: float = Query(default=3.0)
):
    data = fetch_visualcrossing_daily()
    esp32_payload = get_latest_esp32(device_id) if use_esp32 else {}
    results = []

    for day in (data.get("days", [])[:days]):
        weather_payload = build_weather_payload_from_day(day)
        features = merge_features(weather_payload, esp32_payload)
        out = run_model(features)

        climate_probability = out["risk_probability"]
        water_score = compute_water_score(esp32_payload, max_depth_cm=max_depth_cm, headspace_cm=headspace_cm)
        combined = WEIGHT_WATER * water_score + WEIGHT_CLIMATE * climate_probability
        label = int(combined >= THRESHOLD)

        results.append({
            "date": day.get("datetime"),
            "location": data.get("resolvedAddress"),
            "weather": {**weather_payload},
            "esp32": esp32_payload or None,
            "features": features,
            "esp32_used": bool(esp32_payload),

            "climate_probability": climate_probability,
            "water_score": water_score,

            "risk_probability": combined,
            "risk_label": label,
            "threshold": THRESHOLD
        })

    return {"daily_predictions": results}

@app.get("/health")
def health():
    return {"status": "ok", "threshold": THRESHOLD, "n_features": len(FEATURES)}

@app.post("/predict")
def predict(inp: WeatherInput):
    base = dict(inp.payload or {})
    esp = get_latest_esp32(inp.device_id) if inp.use_esp32 else {}
    features = merge_features(base, esp)
    out = run_model(features)

    climate_probability = out["risk_probability"]
    water_score = compute_water_score(esp)
    combined = WEIGHT_WATER * water_score + WEIGHT_CLIMATE * climate_probability
    label = int(combined >= THRESHOLD)

    return {
        "features": features,
        "esp32": esp or None,
        "esp32_used": bool(esp),
        "climate_probability": climate_probability,
        "water_score": water_score,
        "risk_probability": combined,
        "risk_label": label,
        "threshold": THRESHOLD
    }
