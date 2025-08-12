# src/gee_client.py
import ee
import os

def init_ee(service_account_json=None):
    """
    Inicializa la API de Google Earth Engine.
    Si se pasa la ruta a un JSON de cuenta de servicio, usa esa para producción.
    Si no, hace autenticación OAuth interactiva (ideal para desarrollo local).
    """
    if service_account_json and os.path.exists(service_account_json):
        from google.oauth2 import service_account
        creds = service_account.Credentials.from_service_account_file(service_account_json)
        ee.Initialize(creds)
        print("Inicializado con cuenta de servicio.")
    else:
        try:
            ee.Initialize()
            print("EE ya inicializado (OAuth).")
        except Exception:
            ee.Authenticate()
            ee.Initialize()
            print("EE autenticado y inicializado.")

def export_sentinel1_median(aoi, start_date, end_date, description, folder, scale=10):
    """
    Exporta la imagen mediana de Sentinel-1 (VV y VH) para el área y periodo indicados.
    La imagen se exporta a Google Drive en la carpeta especificada.
    
    Parámetros:
    - aoi: ee.Geometry (puede ser un ee.Geometry.Rectangle o ee.Geometry.Polygon)
    - start_date, end_date: strings 'YYYY-MM-DD'
    - description: nombre de la tarea y archivo exportado
    - folder: carpeta en Google Drive donde guardar la imagen
    - scale: resolución en metros (10m es típico para Sentinel-1)
    """
    collection = (ee.ImageCollection('COPERNICUS/S1_GRD')
                  .filterBounds(aoi)
                  .filterDate(start_date, end_date)
                  .filter(ee.Filter.eq('instrumentMode', 'IW'))
                  .select(['VV', 'VH']))
    
    median_img = collection.median().clip(aoi)
    
    task = ee.batch.Export.image.toDrive(
        image=median_img,
        description=description,
        folder=folder,
        fileNamePrefix=description,
        scale=scale,
        region=aoi.bounds().getInfo()['coordinates']
    )
    task.start()
    print(f"Tarea de exportación iniciada: {description}")

if __name__ == "__main__":
    # Ejemplo de uso para probar
    init_ee()  # OAuth o cuenta de servicio si configuras JSON
    
    # Definir área de interés (ejemplo: bounding box)
    aoi = ee.Geometry.Rectangle([-87.5, 13.5, -86.5, 15.0])  # Cambia a tu región
    
    # Exportar imagen mediana Sentinel-1 para un rango de fechas
    export_sentinel1_median(
        aoi=aoi,
        start_date='2021-11-01',
        end_date='2021-11-15',
        description='Sentinel1_Median_Example',
        folder='GEE_FloodData'
    )
