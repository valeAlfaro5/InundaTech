# src/test_inference.py
from inference import load_model, preprocess_input, predict_flood_risk

def run_tests():
    model = load_model()

    test_cases = [
                {
            'name': 'Sequía prolongada con calor extremo',
            'data': {
                'precipitacion_mm': 0,
                'lluvia_intensidad_mm_h': 0,
                'humedad_suelo_porcentaje': 15,
                'nivel_rio_m3s': 60,
                'velocidad_viento_kmh': 20,
                'temperatura_c': 38,
                'humedad_ambiente_porcentaje': 25
            }
        },
        {
            'name': 'Tormenta tropical moderada',
            'data': {
                'precipitacion_mm': 60,
                'lluvia_intensidad_mm_h': 18,
                'humedad_suelo_porcentaje': 85,
                'nivel_rio_m3s': 240,
                'velocidad_viento_kmh': 70,
                'temperatura_c': 23,
                'humedad_ambiente_porcentaje': 88
            }
        },
        {
            'name': 'Lluvia ligera y viento fuerte',
            'data': {
                'precipitacion_mm': 15,
                'lluvia_intensidad_mm_h': 4,
                'humedad_suelo_porcentaje': 55,
                'nivel_rio_m3s': 150,
                'velocidad_viento_kmh': 60,
                'temperatura_c': 21,
                'humedad_ambiente_porcentaje': 60
            }
        },
        {
            'name': 'Precipitación alta pero río bajo',
            'data': {
                'precipitacion_mm': 70,
                'lluvia_intensidad_mm_h': 20,
                'humedad_suelo_porcentaje': 75,
                'nivel_rio_m3s': 90,
                'velocidad_viento_kmh': 8,
                'temperatura_c': 20,
                'humedad_ambiente_porcentaje': 80
            }
        },
        {
            'name': 'Humedad alta sin lluvia',
            'data': {
                'precipitacion_mm': 0,
                'lluvia_intensidad_mm_h': 0,
                'humedad_suelo_porcentaje': 65,
                'nivel_rio_m3s': 130,
                'velocidad_viento_kmh': 5,
                'temperatura_c': 27,
                'humedad_ambiente_porcentaje': 95
            }
        },
        {
            'name': 'Inundación previa, lluvia leve',
            'data': {
                'precipitacion_mm': 12,
                'lluvia_intensidad_mm_h': 3,
                'humedad_suelo_porcentaje': 98,
                'nivel_rio_m3s': 280,
                'velocidad_viento_kmh': 12,
                'temperatura_c': 18,
                'humedad_ambiente_porcentaje': 92
            }
        },
        {
            'name': 'Tormenta súbita',
            'data': {
                'precipitacion_mm': 100,
                'lluvia_intensidad_mm_h': 45,
                'humedad_suelo_porcentaje': 85,
                'nivel_rio_m3s': 260,
                'velocidad_viento_kmh': 50,
                'temperatura_c': 17,
                'humedad_ambiente_porcentaje': 93
            }
        },
        {
            'name': 'Viento huracanado sin lluvia',
            'data': {
                'precipitacion_mm': 0,
                'lluvia_intensidad_mm_h': 0,
                'humedad_suelo_porcentaje': 40,
                'nivel_rio_m3s': 100,
                'velocidad_viento_kmh': 120,
                'temperatura_c': 28,
                'humedad_ambiente_porcentaje': 45
            }
        },
        {
            'name': 'Río al límite sin lluvia',
            'data': {
                'precipitacion_mm': 0,
                'lluvia_intensidad_mm_h': 0,
                'humedad_suelo_porcentaje': 60,
                'nivel_rio_m3s': 299,
                'velocidad_viento_kmh': 5,
                'temperatura_c': 24,
                'humedad_ambiente_porcentaje': 70
            }
        },
        {
            'name': 'Condiciones invernales extremas',
            'data': {
                'precipitacion_mm': 40,
                'lluvia_intensidad_mm_h': 10,
                'humedad_suelo_porcentaje': 80,
                'nivel_rio_m3s': 200,
                'velocidad_viento_kmh': 15,
                'temperatura_c': -2,
                'humedad_ambiente_porcentaje': 85
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
