# src/server.py
from flask import Flask, request, jsonify
import joblib
import pandas as pd

app = Flask(__name__)

# Cargar modelo al iniciar el servidor
model = joblib.load('models/flood_rf_model.pkl')

def preprocess_input(data_dict):
    """
    Prepara el DataFrame para la predicción.
    Asume que data_dict contiene las variables necesarias.
    """
    df = pd.DataFrame([data_dict])
    # Aquí puedes añadir creación de lags o normalización si es necesario
    return df

@app.route('/predict', methods=['POST'])
def predict():
    data = request.get_json()

    if not data:
        return jsonify({'error': 'No se recibieron datos'}), 400

    try:
        input_df = preprocess_input(data)
        prob = model.predict_proba(input_df)[:, 1][0]
        return jsonify({
            'flood_risk_probability': prob,
            'message': 'Predicción exitosa'
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
