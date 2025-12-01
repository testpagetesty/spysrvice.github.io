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
            {"code": "telegram", "name": "Telegram"},
            {"code": "discovery", "name": "Discovery"}
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
            {"code": "TR", "name": "Turkey"},
            {"code": "RO", "name": "Romania"},
            {"code": "CZ", "name": "Czech Republic"},
            {"code": "AT", "name": "Austria"},
            {"code": "HU", "name": "Hungary"},
            {"code": "LT", "name": "Lithuania"},
            {"code": "BD", "name": "Bangladesh"},
            {"code": "BG", "name": "Bulgaria"},
            {"code": "UA", "name": "Ukraine"},
            {"code": "PT", "name": "Portugal"},
            {"code": "IE", "name": "Ireland"},
            {"code": "SK", "name": "Slovakia"},
            {"code": "BE", "name": "Belgium"},
            {"code": "GR", "name": "Greece"},
            {"code": "AU", "name": "Australia"},
            {"code": "SI", "name": "Slovenia"},
            {"code": "GB", "name": "United Kingdom"},
            {"code": "CA", "name": "Canada"},
            {"code": "NL", "name": "Netherlands"},
            {"code": "IN", "name": "India"},
            {"code": "HR", "name": "Croatia"},
            {"code": "LV", "name": "Latvia"},
            {"code": "KZ", "name": "Kazakhstan"},
            {"code": "KR", "name": "South Korea"},
            {"code": "MY", "name": "Malaysia"},
            {"code": "EE", "name": "Estonia"},
            {"code": "SE", "name": "Sweden"},
            {"code": "DK", "name": "Denmark"},
            {"code": "CY", "name": "Cyprus"},
            {"code": "PH", "name": "Philippines"},
            {"code": "SG", "name": "Singapore"},
            {"code": "VN", "name": "Vietnam"},
            {"code": "AZ", "name": "Azerbaijan"},
            {"code": "ZA", "name": "South Africa"},
            {"code": "FI", "name": "Finland"},
            {"code": "MX", "name": "Mexico"},
            {"code": "PK", "name": "Pakistan"},
            {"code": "NZ", "name": "New Zealand"},
            {"code": "EG", "name": "Egypt"},
            {"code": "CO", "name": "Colombia"},
            {"code": "IS", "name": "Iceland"},
            {"code": "ID", "name": "Indonesia"},
            {"code": "PE", "name": "Peru"},
            {"code": "NG", "name": "Nigeria"},
            {"code": "AE", "name": "United Arab Emirates"},
            {"code": "JP", "name": "Japan"},
            {"code": "NO", "name": "Norway"},
            {"code": "CL", "name": "Chile"},
            {"code": "LU", "name": "Luxembourg"},
            {"code": "TH", "name": "Thailand"},
            {"code": "SA", "name": "Saudi Arabia"},
            {"code": "HK", "name": "Hong Kong"}
        ]
    }
    
    print("Заполняем справочники...")
    success_count = 0
    
    for table_name, data in reference_data.items():
        print(f"\nЗаполняем {table_name} ({len(data)} записей)...")
        try:
            # Для каждой записи проверяем существование и обновляем/создаем
            inserted_count = 0
            updated_count = 0
            
            for item in data:
                # Проверяем, существует ли запись
                check_response = requests.get(
                    f"{SUPABASE_URL}/rest/v1/{table_name}?code=eq.{item['code']}",
                    headers=headers
                )
                
                if check_response.status_code == 200:
                    existing = check_response.json()
                    
                    if existing and len(existing) > 0:
                        # Запись существует - обновляем
                        if table_name == "countries":
                            # Для стран используем code как primary key
                            update_response = requests.patch(
                                f"{SUPABASE_URL}/rest/v1/{table_name}?code=eq.{item['code']}",
                                headers=headers,
                                json=item
                            )
                        else:
                            # Для остальных таблиц используем id
                            record_id = existing[0]["id"]
                            update_response = requests.patch(
                                f"{SUPABASE_URL}/rest/v1/{table_name}?id=eq.{record_id}",
                                headers=headers,
                                json=item
                            )
                        
                        if update_response.status_code in [200, 204]:
                            updated_count += 1
                        else:
                            print(f"  ⚠ Не удалось обновить {item['code']}: {update_response.status_code}")
                    else:
                        # Запись не существует - создаем
                        create_response = requests.post(
                            f"{SUPABASE_URL}/rest/v1/{table_name}",
                            headers=headers,
                            json=item
                        )
                        
                        if create_response.status_code in [200, 201]:
                            inserted_count += 1
                        else:
                            print(f"  ⚠ Не удалось создать {item['code']}: {create_response.status_code}")
                
                time.sleep(0.1)  # Небольшая задержка между запросами
            
            if inserted_count > 0 or updated_count > 0:
                print(f"✓ {table_name}: создано {inserted_count}, обновлено {updated_count}")
                success_count += 1
            else:
                print(f"⚠ {table_name}: нет изменений")
                success_count += 1
                
        except Exception as e:
            print(f"✗ Ошибка при заполнении {table_name}: {e}")
        
        time.sleep(0.5)
    
    return success_count

def test_tables():
    """Тестирует доступность таблиц"""
    tables = ["formats", "types", "placements", "platforms", "countries"]
    
    print("\nПроверяем доступность таблиц...")
    available_tables = []
    
    for table in tables:
        try:
            response = requests.get(
                f"{SUPABASE_URL}/rest/v1/{table}?limit=1",
                headers=headers
            )
            
            if response.status_code == 200:
                print(f"✓ {table} - доступна")
                available_tables.append(table)
            else:
                print(f"✗ {table} - недоступна ({response.status_code})")
                
        except Exception as e:
            print(f"✗ {table} - ошибка: {e}")
    
    return available_tables

def create_test_creative():
    """Создает тестовый креатив"""
    print("\nСоздаем тестовый креатив...")
    
    # Получаем ID из справочников
    try:
        # Получаем format_id
        formats_resp = requests.get(f"{SUPABASE_URL}/rest/v1/formats?code=eq.teaser", headers=headers)
        format_id = formats_resp.json()[0]["id"] if formats_resp.json() else None
        
        # Получаем type_id
        types_resp = requests.get(f"{SUPABASE_URL}/rest/v1/types?code=eq.gambling", headers=headers)
        type_id = types_resp.json()[0]["id"] if types_resp.json() else None
        
        # Получаем platform_id
        platforms_resp = requests.get(f"{SUPABASE_URL}/rest/v1/platforms?code=eq.youtube", headers=headers)
        platform_id = platforms_resp.json()[0]["id"] if platforms_resp.json() else None
        
        # Получаем placement_id
        placements_resp = requests.get(f"{SUPABASE_URL}/rest/v1/placements?code=eq.youtube_ads", headers=headers)
        placement_id = placements_resp.json()[0]["id"] if placements_resp.json() else None
        
        test_creative = {
            "title": "Test Casino Ad",
            "description": "AHORA OFICIALMENTE EN LÍNEA - BONO DE BIENVENIDA DE 150.000",
            "format_id": format_id,
            "type_id": type_id,
            "placement_id": placement_id,
            "country_code": "AR",
            "platform_id": platform_id,
            "cloaking": True,
            "media_url": "https://example.com/test-image.jpg",
            "landing_url": "https://example.com/casino",
            "source_device": "test-device"
        }
        
        response = requests.post(
            f"{SUPABASE_URL}/rest/v1/creatives",
            headers=headers,
            json=test_creative
        )
        
        if response.status_code in [200, 201]:
            print("✓ Тестовый креатив создан успешно")
            return True
        else:
            print(f"✗ Ошибка создания креатива: {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"✗ Ошибка создания креатива: {e}")
        return False

if __name__ == "__main__":
    print("=== Настройка данных Supabase ===\n")
    
    # Проверяем доступность таблиц
    available_tables = test_tables()
    
    if len(available_tables) == 0:
        print("\n❌ Таблицы не найдены!")
        print("Сначала создайте таблицы через SQL Editor в Supabase:")
        print("1. Откройте SQL Editor в панели Supabase")
        print("2. Выполните содержимое файла database_schema.sql")
        exit(1)
    
    # Заполняем справочники
    success_count = insert_reference_data()
    
    if success_count > 0:
        print(f"\n✓ Заполнено {success_count} справочников")
        
        # Создаем тестовый креатив
        if "creatives" in available_tables or True:  # Пробуем создать даже если таблица не проверялась
            create_test_creative()
    
    print("\n=== Настройка завершена ===")
    print("Теперь можно:")
    print("1. Создать Storage bucket 'creatives-media' через веб-интерфейс")
    print("2. Начать разработку мобильного приложения")
    print("3. Создать фронтенд дашборд")
