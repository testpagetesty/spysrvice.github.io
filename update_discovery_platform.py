import requests

# Конфигурация Supabase
SUPABASE_URL = "https://oilwcbfyhutzyjzlqbuk.supabase.co"
SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9pbHdjYmZ5aHV0enlqemxxYnVrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Mjc5NDk0MCwiZXhwIjoyMDc4MzcwOTQwfQ.jamctKxlVdqGZ96MWCsbdzS_oXfG5eq7RewvGkkt97A"

headers = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

def update_discovery_platform():
    """Обновляет или создает платформу Discovery"""
    
    print("Проверяем платформу 'discovery'...")
    
    # Проверяем, существует ли платформа
    check_response = requests.get(
        f"{SUPABASE_URL}/rest/v1/platforms?code=eq.discovery",
        headers=headers
    )
    
    if check_response.status_code == 200:
        existing = check_response.json()
        
        if existing and len(existing) > 0:
            # Платформа существует - обновляем название
            platform_id = existing[0]["id"]
            print(f"Платформа 'discovery' найдена (ID: {platform_id}), обновляем название на 'Discovery'...")
            
            update_response = requests.patch(
                f"{SUPABASE_URL}/rest/v1/platforms?id=eq.{platform_id}",
                headers=headers,
                json={"name": "Discovery"}
            )
            
            if update_response.status_code in [200, 204]:
                print("✓ Платформа 'discovery' успешно обновлена на 'Discovery'")
                return True
            else:
                print(f"✗ Ошибка обновления: {update_response.status_code}")
                print(f"Response: {update_response.text}")
                return False
        else:
            # Платформа не существует - создаем новую
            print("Платформа 'discovery' не найдена, создаем новую...")
            
            create_response = requests.post(
                f"{SUPABASE_URL}/rest/v1/platforms",
                headers=headers,
                json={"code": "discovery", "name": "Discovery"}
            )
            
            if create_response.status_code in [200, 201]:
                print("✓ Платформа 'discovery' успешно создана с названием 'Discovery'")
                return True
            else:
                print(f"✗ Ошибка создания: {create_response.status_code}")
                print(f"Response: {create_response.text}")
                return False
    else:
        print(f"✗ Ошибка проверки: {check_response.status_code}")
        print(f"Response: {check_response.text}")
        return False

if __name__ == "__main__":
    print("=== Обновление платформы Discovery ===\n")
    success = update_discovery_platform()
    
    if success:
        print("\n✓ Готово! Платформа 'Discovery' теперь доступна в базе данных.")
        print("Обновите страницу в браузере, чтобы увидеть изменения.")
    else:
        print("\n✗ Не удалось обновить платформу. Проверьте ошибки выше.")

