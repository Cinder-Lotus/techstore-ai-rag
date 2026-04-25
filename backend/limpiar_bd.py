from astrapy import DataAPIClient
import os
from dotenv import load_dotenv

# Conectarnos a la base de datos
load_dotenv()
client = DataAPIClient(os.getenv('ASTRA_DB_TOKEN'))
db = client.get_database(os.getenv('ASTRA_DB_ENDPOINT'))
coleccion = db.get_collection("productos")

print("Iniciando protocolo de limpieza...")

try:
    # Las llaves {} vacías le indican que seleccione absolutamente todos los documentos
    resultado = coleccion.delete_many({})
    
    print("========================================")
    print(f"✅ ¡Limpieza exitosa!")
    print(f"Se han eliminado {resultado.deleted_count} productos de la base de datos.")
    print("========================================")

except Exception as e:
    print("Ocurrió un error al limpiar:", e)