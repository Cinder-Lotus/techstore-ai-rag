from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from astrapy import DataAPIClient
import google.generativeai as genai
import os
from dotenv import load_dotenv

# 1. Cargar configuración y llaves
load_dotenv()

# Configurar Gemini IA
llave_gemini = os.getenv("GEMINI_API_KEY")
if llave_gemini:
    genai.configure(api_key=llave_gemini)

# Conectar Astra DB
client = DataAPIClient(os.getenv('ASTRA_DB_TOKEN'))
db = client.get_database(os.getenv('ASTRA_DB_ENDPOINT'))
coleccion = db.get_collection("productos")

# 2. Inicializar Servidor
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================
# RUTAS DEL INVENTARIO (CRUD con Soft Delete)
# ==========================================

@app.get("/api/productos")
def obtener_productos():
    docs = list(coleccion.find({}))
    for d in docs: d['_id'] = str(d['_id'])
    return docs

@app.post("/api/productos")
async def crear_producto(req: Request):
    data = await req.json()
    data['estado'] = 'activo'
    res = coleccion.insert_one(data)
    return {"id": str(res.inserted_id)}

@app.put("/api/productos/{id}")
async def actualizar_producto(id: str, req: Request):
    datos_nuevos = await req.json()
    coleccion.update_one({"_id": id}, {"$set": datos_nuevos})
    return {"status": "actualizado"}

@app.delete("/api/productos/{id}")
async def eliminar_producto(id: str):
    try:
        coleccion.update_one(
            {"_id": id}, 
            {"$set": {"estado": "inactivo"}}
        )
        return {"status": "producto desactivado correctamente"}
    except Exception as e:
        return {"error": str(e)}

@app.patch("/api/productos/{id}/restaurar")
async def restaurar_producto(id: str):
    try:
        coleccion.update_one(
            {"_id": id}, 
            {"$set": {"estado": "activo"}}
        )
        return {"status": "producto restaurado"}
    except Exception as e:
        return {"error": str(e)}

# ==========================================
# RUTA DEL ASESOR INTELIGENTE (IA)
# ==========================================

@app.post("/api/chat")
async def asesor_inteligente(request: Request):
    data = await request.json()
    historial_cliente = data.get("historial", []) 

    try:
        productos_activos = list(coleccion.find({"estado": {"$ne": "inactivo"}}))
        
        inventario_limpio = str([{
            'marca': p.get('marca'), 
            'modelo': p.get('modelo'), 
            'precio': p.get('precio'), 
            'categoria': p.get('categoria'),
            'specs': p.get('especificaciones', {})
        } for p in productos_activos])
    except:
        inventario_limpio = "Error al leer inventario activo."

    prompt_guia = f"""
    Eres 'TechGuide', el asesor experto de TechStore.
    Inventario disponible: {inventario_limpio}
    
    REGLAS DE COMPORTAMIENTO:
    1. Saluda cordialmente solo en el primer mensaje.
    2. Realiza UNA sola pregunta a la vez para entender al cliente.
    3. Recomienda únicamente 1 o 2 opciones del inventario.
    REGLAS CRÍTICAS DE COMANDOS:
    Si el usuario pide agregar o quitar algo, DEBES usar este formato exacto al final del mensaje:
    
    Para agregar: ||CARRITO:AGREGAR|MODELO:NombreExacto||
    Para quitar: ||CARRITO:ELIMINAR|MODELO:NombreExacto||
    
    IMPORTANTE: 'NombreExacto' debe ser IDÉNTICO al campo 'modelo' del inventario que te pasé. No añadas puntos, ni comas, ni espacios extra dentro de los símbolos ||.
    """

    try:
        modelo = genai.GenerativeModel('gemini-2.5-flash', system_instruction=prompt_guia)
        respuesta_ia = modelo.generate_content(historial_cliente)
        return {"respuesta": respuesta_ia.text}
    except Exception as e:
        print(f"Error IA: {e}")
        return {"respuesta": "Lo siento, tengo una falla técnica. ¿Podrías intentar de nuevo?"}