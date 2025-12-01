const { default: fetch } = require('node-fetch');

async function testDateFilter() {
  const supabaseUrl = 'https://oilwcbfyhutzyjzlqbuk.supabase.co';
  const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9pbHdjYmZ5aHV0enlqemxxYnVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3OTQ5NDAsImV4cCI6MjA3ODM3MDk0MH0.pQAq4iav6pO4Oh3D1XqYVAXGc2iBy5hTJuDconcws8I';

  try {
    // Сначала получим все креативы
    console.log('=== Все креативы ===');
    const allUrl = `${supabaseUrl}/rest/v1/creatives?select=id,title,captured_at&order=captured_at.desc`;
    const allResponse = await fetch(allUrl, {
      headers: { 'apikey': supabaseKey }
    });
    const allCreatives = await allResponse.json();
    console.log('Всего креативов:', allCreatives.length);
    allCreatives.forEach(c => {
      console.log(`- ${c.title}: ${c.captured_at}`);
    });

    // Тест 1: Фильтр с 2025-11-01 по 2025-11-11
    console.log('\n=== Тест 1: с 2025-11-01 по 2025-11-11 ===');
    const test1Url = `${supabaseUrl}/rest/v1/creatives?select=id,title,captured_at&captured_at=gte.2025-11-01T00:00:00&captured_at=lte.2025-11-11T23:59:59&order=captured_at.desc`;
    console.log('URL:', test1Url);
    
    const test1Response = await fetch(test1Url, {
      headers: { 'apikey': supabaseKey }
    });
    const test1Results = await test1Response.json();
    console.log('Результат:', test1Results);

    // Тест 2: Используем and синтаксис
    console.log('\n=== Тест 2: and синтаксис ===');
    const test2Url = `${supabaseUrl}/rest/v1/creatives?select=id,title,captured_at&and=(captured_at.gte.2025-11-01T00:00:00,captured_at.lte.2025-11-11T23:59:59)&order=captured_at.desc`;
    console.log('URL:', test2Url);
    
    const test2Response = await fetch(test2Url, {
      headers: { 'apikey': supabaseKey }
    });
    const test2Results = await test2Response.json();
    console.log('Результат:', test2Results);

    // Тест 3: Только gte
    console.log('\n=== Тест 3: только gte ===');
    const test3Url = `${supabaseUrl}/rest/v1/creatives?select=id,title,captured_at&captured_at=gte.2025-11-11T00:00:00&order=captured_at.desc`;
    console.log('URL:', test3Url);
    
    const test3Response = await fetch(test3Url, {
      headers: { 'apikey': supabaseKey }
    });
    const test3Results = await test3Response.json();
    console.log('Результат:', test3Results);

  } catch (error) {
    console.error('Ошибка:', error.message);
  }
}

testDateFilter();
