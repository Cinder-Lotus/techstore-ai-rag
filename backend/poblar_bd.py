from astrapy import DataAPIClient
import os
from dotenv import load_dotenv

load_dotenv()
client = DataAPIClient(os.getenv('ASTRA_DB_TOKEN'))
db = client.get_database(os.getenv('ASTRA_DB_ENDPOINT'))
coleccion = db.get_collection("productos")

# Lista de nuevos productos
productos_nuevos = [
    {"marca": "Apple", "modelo": "MacBook Pro 16", "categoria": "Portátiles", "precio": 2499.00, "imagen_url": "https://www.notebookcheck.org/fileadmin/Notebooks/Apple/MacBook_Pro_16_2024_M4_Pro/IMG_7593.JPG", "especificaciones": {"procesador": "M3 Max", "ram_gb": 36, "almacenamiento": "1TB SSD", "grafica": "Apple GPU"}},
    {"marca": "Dell", "modelo": "Alienware Aurora", "categoria": "Escritorio", "precio": 1899.99, "imagen": "🖥️", "especificaciones": {"procesador": "Intel Core i9", "ram_gb": 32, "almacenamiento": "2TB SSD", "grafica": "RTX 4080"}},
    {"marca": "Lenovo", "modelo": "ThinkPad X1", "categoria": "Portátiles", "precio": 1200.00, "imagen": "💻", "especificaciones": {"procesador": "Intel Core i7", "ram_gb": 16, "almacenamiento": "512GB SSD", "grafica": "Intel Iris Xe"}},
    {"marca": "Razer", "modelo": "BlackWidow V4", "categoria": "Accesorios", "precio": 169.99, "imagen_url": "https://assets2.razerzone.com/images/pnx.assets/f5fb60592ff18a829c3098299b480dff/razer-blackwidow-enhanced-control.webp", "especificaciones": {"tipo": "Teclado Mecánico", "switches": "Green", "iluminacion": "RGB Chroma"}},
    {"marca": "Samsung", "modelo": "Odyssey G9", "categoria": "Monitores", "precio": 1300.00, "imagen_url": "https://img.global.news.samsung.com/latin/wp-content/uploads/2020/06/Odyssey-G9_4.jpg", "especificaciones": {"tamaño": "49 pulgadas", "resolucion": "5120x1440", "tasa_refresco": "240Hz"}}
]

print("Subiendo inventario a la nube...")
resultado = coleccion.insert_many(productos_nuevos)
print(f"✅ ¡{len(resultado.inserted_ids)} productos agregados exitosamente a Astra DB!")