const { default: fetch } = require('node-fetch');

async function testFixedDateFilter() {
  const supabaseUrl = 'https://oilwcbfyhutzyjzlqbuk.supabase.co';
  const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9pbHdjYmZ5aHV0enlqemxxYnVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3OTQ5NDAsImV4cCI6MjA3ODM3MDk0MH0.pQAq4iav6pO4Oh3D1XqYVAXGc2iBy5hTJuDconcws8I';

  try {
    console.log('=== Тест исправленной фильтрации по датам (UTC) ===');
    
    // Тест: фильтр с 2025-11-01 по 2025-11-11 (UTC)
    const testUrl = `${supabaseUrl}/rest/v1/creatives?select=id,title,captured_at&and=(captured_at.gte.2025-11-01T00:00:00Z,captured_at.lte.2025-11-11T23:59:59Z)&order=captured_at.desc`;
    console.log('URL:', testUrl);
    
    const response = await fetch(testUrl, {
      headers: { 'apikey': supabaseKey }
    });
    const results = await response.json();
    
    console.log('Результат фильтрации:');
    results.forEach(c => {
      const date = new Date(c.captured_at);
      console.log(`- ${c.title}: ${c.captured_at} (локальное: ${date.toLocaleString('ru-RU', {timeZone: 'Europe/Moscow'})})`);
    });
    
    // Проверяем конкретно креатив "Escribí tu consulta"
    const targetCreative = results.find(c => c.title === 'Escribí tu consulta');
    if (targetCreative) {
      console.log('\n✅ Креатив "Escribí tu consulta" найден в фильтре "с 1 по 11 ноября"');
    } else {
      console.log('\n❌ Креатив "Escribí tu consulta" НЕ найден в фильтре "с 1 по 11 ноября"');
    }

  } catch (error) {
    console.error('Ошибка:', error.message);
  }
}

testFixedDateFilter();
