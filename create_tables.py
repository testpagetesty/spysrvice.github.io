import requests
import json

# Конфигурация Supabase
SUPABASE_URL = "https://oilwcbfyhutzjzqlqbuk.supabase.co"
SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9pbHdjYmZ5aHV0enlqemxxYnVrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Mjc5NDk0MCwiZXhwIjoyMDc4MzcwOTQwfQ.jamctKxlVdqGZ96MWCsbdzS_oXfF5eq7RewvGkkt97A"

headers = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json",
}

# Создаем таблицы через REST API
def create_table_via_rest():
    # Создаем справочники
    tables_data = {
        "formats": [
            {"code": "teaser", "name": "Teaser"},
            {"code": "video", "name": "Video"},
            {"code": "banner", "name": "Banner"}
        ],
        "types": [
            {"code": "crypt", "name": "Crypt"},
            {"code": "gambling", "name": "Gambling"},
            {"code": "nutra", "name": "Nutra"},
            {"code": "news", "name": "News"},
            {"code": "product", "name": "Product"},
            {"code": "nutra_vsl", "name": "Nutra (VSL)"}
        ],
        "placements": [
            {"code": "demand_gen", "name": "Demand Gen"},
            {"code": "uac", "name": "UAC"},
            {"code": "facebook", "name": "Facebook"},
            {"code": "google", "name": "Google"}
        ],
        "platforms": [
            {"code": "web", "name": "Web"},
            {"code": "google", "name": "Google"},
            {"code": "youtube", "name": "YouTube"},
            {"code": "facebook", "name": "Facebook"}
        ],
        "countries": [
            {"code": "DE", "name": "Germany"},
            {"code": "PL", "name": "Poland"},
            {"code": "IT", "name": "Italy"},
            {"code": "ES", "name": "Spain"},
            {"code": "FR", "name": "France"},
            {"code": "AR", "name": "Argentina"},
            {"code": "US", "name": "United States"},
            {"code": "RU", "name": "Russia"}
        ]
    }
    
    # Заполняем справочники
    for table_name, data in tables_data.items():
        print(f"Заполняем таблицу {table_name}...")
        try:
            response = requests.post(
                f"{SUPABASE_URL}/rest/v1/{table_name}",
                headers=headers,
                json=data
            )
            print(f"Status: {response.status_code}")
            if response.status_code not in [200, 201]:
                print(f"Response: {response.text}")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    print("Заполняем справочники в Supabase...")
    create_table_via_rest()
    print("Готово!")
