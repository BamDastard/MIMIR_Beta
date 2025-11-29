import google.generativeai as genai
import os
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env'))
genai.configure(api_key=os.environ.get("GOOGLE_API_KEY"))

try:
    for m in genai.list_models():
        print(f"Model: {m.name}")
        print(f"Supported methods: {m.supported_generation_methods}")
except Exception as e:
    print(f"Error: {e}")
