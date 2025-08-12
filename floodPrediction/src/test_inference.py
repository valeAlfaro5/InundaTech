# src/test_inference.py
from inference import load_model, preprocess_input, predict_flood_risk

def run_tests():
    model = load_model()

    test_cases = [
        {
            'name': 'Baja precipitación, condiciones secas',
            'data': {
                'precipitacion_mm': 2,
                'lluvia_intensidad_mm_h': 0.2,
                'humedad_suelo_porcentaje': 30,
                'nivel_rio_m3s': 100,
                'velocidad_viento_kmh': 10,
                'temperatura_c': 25,
                'humedad_ambiente_porcentaje': 50
            }
        },
        {
            'name': 'Alta precipitación, suelo húmedo',
            'data': {
                'precipitacion_mm': 80,
                'lluvia_intensidad_mm_h': 25,
                'humedad_suelo_porcentaje': 90,
                'nivel_rio_m3s': 270,
                'velocidad_viento_kmh': 5,
                'temperatura_c': 20,
                'humedad_ambiente_porcentaje': 85
            }
        },
        {
            'name': 'Precipitación moderada, nivel de río alto',
            'data': {
                'precipitacion_mm': 30,
                'lluvia_intensidad_mm_h': 8,
                'humedad_suelo_porcentaje': 70,
                'nivel_rio_m3s': 220,
                'velocidad_viento_kmh': 12,
                'temperatura_c': 22,
                'humedad_ambiente_porcentaje': 75
            }
        },
        {
            'name': 'Sin lluvia, condiciones normales',
            'data': {
                'precipitacion_mm': 0,
                'lluvia_intensidad_mm_h': 0,
                'humedad_suelo_porcentaje': 40,
                'nivel_rio_m3s': 110,
                'velocidad_viento_kmh': 15,
                'temperatura_c': 26,
                'humedad_ambiente_porcentaje': 55
            }
        },
        {
            'name': 'Lluvia intensa y viento fuerte',
            'data': {
                'precipitacion_mm': 90,
                'lluvia_intensidad_mm_h': 30,
                'humedad_suelo_porcentaje': 95,
                'nivel_rio_m3s': 300,
                'velocidad_viento_kmh': 40,
                'temperatura_c': 19,
                'humedad_ambiente_porcentaje': 90
            }
        }
    ]

    for case in test_cases:
        input_df = preprocess_input(case['data'])
        prob = predict_flood_risk(model, input_df)
        print(f"Test: {case['name']}")
        print(f"Probabilidad de inundación: {prob*100:.2f}%\n")

if __name__ == "__main__":
    run_tests()
