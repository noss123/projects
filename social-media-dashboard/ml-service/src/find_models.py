import os
from google import genai
from dotenv import load_dotenv

load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    raise EnvironmentError("GEMINI_API_KEY is not set. Add it to your .env file.")

client = genai.Client(api_key=api_key)

print("Models available on this account:")
for m in client.models.list():
    print(f"  Model ID: {m.name} | Display Name: {m.display_name}")