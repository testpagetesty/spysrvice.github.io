import requests
import json
import time

# Конфигурация Supabase
SUPABASE_URL = "https://oilwcbfyhutzyjzlqbuk.supabase.co"
SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9pbHdjYmZ5aHV0enlqemxxYnVrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Mjc5NDk0MCwiZXhwIjoyMDc4MzcwOTQwfQ.jamctKxlVdqGZ96MWCsbdzS_oXfF5eq7RewvGkkt97A"

headers = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal"
}

def execute_sql_query(query):
    """Выполняет SQL запрос через Supabase Edge Functions или RPC"""
    try:
        # Пробуем через RPC функцию
        response = requests.post(
            f"{SUPABASE_URL}/rest/v1/rpc/exec",
            headers=headers,
            json={"sql": query}
        )
        
        print(f"Status: {response.status_code}")
        if response.status_code >= 400:
            print(f"Error: {response.text}")
            return False
        else:
            print("SQL executed successfully")
            return True
            
    except Exception as e:
        print(f"Error executing SQL: {e}")
        return False

def create_tables():
    """Создает таблицы в Supabase"""
    
    # SQL команды для создания таблиц
    sql_commands = [
        """
        CREATE TABLE IF NOT EXISTS formats (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            code TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
        );
        """,
        """
        CREATE TABLE IF NOT EXISTS types (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            code TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
        );
        """,
        """
        CREATE TABLE IF NOT EXISTS placements (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            code TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
        );
        """,
        """
        CREATE TABLE IF NOT EXISTS platforms (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            code TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
        );
        """,
        """
        CREATE TABLE IF NOT EXISTS countries (
            code CHAR(2) PRIMARY KEY,
            name TEXT NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
        );
        """,
        """
        CREATE TABLE IF NOT EXISTS creatives (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            title TEXT,
            description TEXT,
            captured_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
            format_id UUID REFERENCES formats(id),
            type_id UUID REFERENCES types(id),
            placement_id UUID REFERENCES placements(id),
            country_code CHAR(2) REFERENCES countries(code),
            platform_id UUID REFERENCES platforms(id),
            cloaking BOOLEAN DEFAULT FALSE,
            media_url TEXT,
            thumbnail_url TEXT,
            landing_url TEXT,
            source_link TEXT,
            download_url TEXT,
            source_device TEXT,
            project_id UUID,
            created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
        );
        """
    ]
    
    print("Создаем таблицы...")
    for i, sql in enumerate(sql_commands, 1):
        print(f"\nВыполняем команду {i}/{len(sql_commands)}...")
        if not execute_sql_query(sql.strip()):
            print(f"Ошибка при создании таблицы {i}")
            return False
        time.sleep(1)  # Небольшая пауза между запросами
    
    return True

def create_indexes():
    """Создает индексы"""
    indexes = [
        "CREATE INDEX IF NOT EXISTS creatives_captured_at_idx ON creatives (captured_at DESC);",
        "CREATE INDEX IF NOT EXISTS creatives_country_idx ON creatives (country_code);",
        "CREATE INDEX IF NOT EXISTS creatives_type_idx ON creatives (type_id);",
        "CREATE INDEX IF NOT EXISTS creatives_platform_idx ON creatives (platform_id);",
        "CREATE INDEX IF NOT EXISTS creatives_format_idx ON creatives (format_id);",
        "CREATE INDEX IF NOT EXISTS creatives_placement_idx ON creatives (placement_id);"
    ]
    
    print("\nСоздаем индексы...")
    for i, sql in enumerate(indexes, 1):
        print(f"Создаем индекс {i}/{len(indexes)}...")
        if not execute_sql_query(sql):
            print(f"Ошибка при создании индекса {i}")
            return False
        time.sleep(0.5)
    
    return True

def insert_reference_data():
    """Заполняет справочники данными через REST API"""
    
    # Данные для справочников
    reference_data = {
        "formats": [
            {"code": "teaser", "name": "Teaser"},
            {"code": "video", "name": "Video"},
            {"code": "banner", "name": "Banner"},
            {"code": "image", "name": "Image"}
        ],
        "types": [
            {"code": "crypt", "name": "Crypt"},
            {"code": "gambling", "name": "Gambling"},
            {"code": "nutra", "name": "Nutra"},
            {"code": "news", "name": "News"},
            {"code": "product", "name": "Product"},
            {"code": "nutra_vsl", "name": "Nutra (VSL)"},
            {"code": "finance", "name": "Finance"},
            {"code": "dating", "name": "Dating"}
        ],
        "placements": [
            {"code": "demand_gen", "name": "Demand Gen"},
            {"code": "uac", "name": "UAC"},
            {"code": "facebook_ads", "name": "Facebook Ads"},
            {"code": "google_ads", "name": "Google Ads"},
            {"code": "youtube_ads", "name": "YouTube Ads"},
            {"code": "native", "name": "Native"},
            {"code": "push", "name": "Push"}
        ],
        "platforms": [
            {"code": "web", "name": "Web"},
            {"code": "google", "name": "Google"},
            {"code": "youtube", "name": "YouTube"},
            {"code": "facebook", "name": "Facebook"},
            {"code": "instagram", "name": "Instagram"},
            {"code": "tiktok", "name": "TikTok"},
            {"code": "telegram", "name": "Telegram"}
        ],
        "countries": [
            {"code": "DE", "name": "Germany"},
            {"code": "PL", "name": "Poland"},
            {"code": "IT", "name": "Italy"},
            {"code": "ES", "name": "Spain"},
            {"code": "FR", "name": "France"},
            {"code": "AR", "name": "Argentina"},
            {"code": "US", "name": "United States"},
            {"code": "RU", "name": "Russia"},
            {"code": "BR", "name": "Brazil"},
            {"code": "TR", "name": "Turkey"}
        ]
    }
    
    print("\nЗаполняем справочники...")
    for table_name, data in reference_data.items():
        print(f"Заполняем {table_name}...")
        try:
            response = requests.post(
                f"{SUPABASE_URL}/rest/v1/{table_name}",
                headers=headers,
                json=data
            )
            
            if response.status_code in [200, 201]:
                print(f"✓ {table_name} заполнен успешно")
            else:
                print(f"✗ Ошибка при заполнении {table_name}: {response.status_code}")
                print(f"Response: {response.text}")
                
        except Exception as e:
            print(f"✗ Ошибка при заполнении {table_name}: {e}")
        
        time.sleep(0.5)

def test_connection():
    """Тестирует подключение к Supabase"""
    try:
        response = requests.get(
            f"{SUPABASE_URL}/rest/v1/",
            headers=headers
        )
        
        if response.status_code == 200:
            print("✓ Подключение к Supabase успешно")
            return True
        else:
            print(f"✗ Ошибка подключения: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"✗ Ошибка подключения: {e}")
        return False

if __name__ == "__main__":
    print("=== Настройка Supabase ===\n")
    
    # Тестируем подключение
    if not test_connection():
        print("Не удалось подключиться к Supabase. Проверьте URL и ключи.")
        exit(1)
    
    # Создаем таблицы
    if create_tables():
        print("✓ Таблицы созданы успешно")
    else:
        print("✗ Ошибка при создании таблиц")
        exit(1)
    
    # Создаем индексы
    if create_indexes():
        print("✓ Индексы созданы успешно")
    else:
        print("✗ Ошибка при создании индексов")
    
    # Заполняем справочники
    insert_reference_data()
    
    print("\n=== Настройка завершена ===")
    print("Теперь нужно создать Storage bucket 'creatives-media' через веб-интерфейс Supabase")
