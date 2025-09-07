import requests

# Coordenadas de ubicación
lat, lon = 15.5645, -88.0286

API_KEY = "HHPMJQETSARBF4BUCVZMRPBH8"

#fechas modificables
start_date = "2020-11-01"
end_date   = "2020-11-16"

url = (
    f"https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/"
    f"{lat},{lon}/{start_date}/{end_date}"
    f"?unitGroup=metric&include=days&key={API_KEY}&contentType=csv"
)

print("⏳ Descargando datos desde Visual Crossing...")
response = requests.get(url)

if response.status_code == 200:
    filename = "eta_iota.csv"
    with open(filename, "wb") as f:
        f.write(response.content)
    print(f"✅ Datos guardados en {filename}")
else:
    print("❌ Error al descargar:")
    print(response.status_code, response.text)
