import google.generativeai as genai
import os
from dotenv import load_dotenv

# Cargar tu llave secreta
load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

print("Buscando modelos disponibles para tu cuenta...")
print("-" * 40)

# Preguntarle a Google qué modelos tienes permitidos usar
for m in genai.list_models():
    if 'generateContent' in m.supported_generation_methods:
        print(m.name)
        
print("-" * 40)