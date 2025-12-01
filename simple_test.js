const { default: fetch } = require('node-fetch');

async function simpleTest() {
  try {
    console.log('Тестируем API endpoint...');
    
    // Простой GET запрос к API
    const response = await fetch('http://localhost:3001/api/test');
    const result = await response.text();
    
    console.log('Status:', response.status);
    console.log('Response:', result);
    
    if (response.ok) {
      console.log('✅ API работает');
    } else {
      console.log('❌ API не работает');
    }
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  }
}

simpleTest();
