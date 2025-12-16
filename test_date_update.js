const { default: fetch } = require('node-fetch');
const FormData = require('form-data');

async function testDateUpdate() {
  console.log('=== Тест обновления даты креатива ===');
  
  const apiUrl = 'http://localhost:3001/api/admin/update-creative';
  
  // Получаем существующий креатив для тестирования
  const supabaseUrl = 'https://oilwcbfyhutzyjzlqbuk.supabase.co';
  const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9pbHdjYmZ5aHV0enlqemxxYnVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3OTQ5NDAsImV4cCI6MjA3ODM3MDk0MH0.pQAq4iav6pO4Oh3D1XqYVAXGc2iBy5hTJuDconcws8I';
  
  try {
    // 1. Получаем существующий креатив
    console.log('1. Получаем существующий креатив...');
    const creativesResponse = await fetch(`${supabaseUrl}/rest/v1/creatives?select=id,title,captured_at&limit=1`, {
      headers: { 'apikey': supabaseKey }
    });
    
    const creatives = await creativesResponse.json();
    if (!creatives || creatives.length === 0) {
      console.log('❌ Нет креативов для тестирования');
      return;
    }
    
    const creative = creatives[0];
    console.log('Найден креатив:', {
      id: creative.id,
      title: creative.title,
      current_captured_at: creative.captured_at
    });
    
    // 2. Тестируем разные форматы даты
    const testDates = [
      {
        name: 'ISO формат (как из базы)',
        value: '2025-11-12T15:30:00.000Z'
      },
      {
        name: 'datetime-local формат',
        value: '2025-11-12T18:30'
      },
      {
        name: 'Текущее время в ISO',
        value: new Date().toISOString()
      }
    ];
    
    for (const testDate of testDates) {
      console.log(`\n2. Тестируем: ${testDate.name}`);
      console.log(`Отправляем дату: ${testDate.value}`);
      
      const formData = new FormData();
      formData.append('creative_id', creative.id);
      formData.append('title', creative.title);
      formData.append('description', 'Test update');
      formData.append('cloaking', 'false');
      formData.append('captured_at', testDate.value);
      
      // Текущие URL (чтобы не потерять файлы)
      formData.append('current_media_url', '');
      formData.append('current_thumbnail_url', '');
      formData.append('current_download_url', '');
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        body: formData,
        headers: formData.getHeaders()
      });
      
      const result = await response.json();
      
      if (response.ok) {
        console.log('✅ Успешно обновлено');
        console.log('Ответ сервера:', {
          message: result.message,
          new_captured_at: result.creative?.captured_at
        });
        
        // Проверяем что сохранилось в базе
        const checkResponse = await fetch(`${supabaseUrl}/rest/v1/creatives?id=eq.${creative.id}&select=captured_at`, {
          headers: { 'apikey': supabaseKey }
        });
        const checkData = await checkResponse.json();
        
        if (checkData && checkData.length > 0) {
          console.log('В базе сохранилось:', checkData[0].captured_at);
        }
      } else {
        console.log('❌ Ошибка обновления:', result.error);
        if (result.details) {
          console.log('Детали:', result.details);
        }
      }
      
      // Пауза между тестами
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('\n=== Тест завершен ===');
    
  } catch (error) {
    console.error('❌ Ошибка теста:', error.message);
  }
}

testDateUpdate();
