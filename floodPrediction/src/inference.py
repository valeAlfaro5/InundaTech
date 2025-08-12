# src/inference.py
import joblib
import numpy as np
import pandas as pd

def load_model(model_path='models/flood_rf_model.pkl'):
    """
    Carga el modelo guardado desde disco.
    """
    model = joblib.load(model_path)
    return model

def preprocess_input(data_dict, lag_days=3):
    """
    Prepara un DataFrame a partir de un diccionario con los datos nuevos,
    crea características con lags (suponiendo que data_dict tiene las columnas necesarias).

    data_dict: dict con columnas como 'precipitacion_mm', 'temperatura_c', etc. 
               y valores actuales y pasados si se tiene (para lag).
               Si no tienes datos pasados, solo el actual, se debe manejar afuera la creación de lags.

    Retorna DataFrame listo para la predicción.
    """
    df = pd.DataFrame([data_dict])

    # Aquí deberías crear las columnas lag si tienes datos históricos recientes,
    # para el ejemplo asumimos que ya vienen en data_dict.

    return df

def predict_flood_risk(model, input_df):
    """
    Recibe modelo y DataFrame con características, retorna probabilidad de inundación.
    """
    prob = model.predict_proba(input_df)[:, 1]  # Probabilidad clase 1 (inundación)
    return prob[0]

if __name__ == "__main__":
    # Ejemplo de datos nuevos
    new_data = {
  "precipitacion_mm": 30,
  "lluvia_intensidad_mm_h": 5,
  "humedad_suelo_porcentaje": 70,
  "nivel_rio_m3s": 180,
  "velocidad_viento_kmh": 12,
  "temperatura_c": 25,
  "humedad_ambiente_porcentaje": 85
}


    model = load_model()
    input_df = preprocess_input(new_data)
    flood_prob = predict_flood_risk(model, input_df)

    print(f"Probabilidad de inundación: {flood_prob*100:.2f}%")
