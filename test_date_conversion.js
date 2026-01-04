// Тест конвертации даты без сетевых запросов

console.log('=== Тест конвертации даты ===');

// Симулируем дату из базы данных
const dbDate = '2025-11-11T18:34:10.192+00:00';
console.log('1. Дата из базы:', dbDate);

// Конвертируем для datetime-local поля (как в openEditModal)
const date = new Date(dbDate);
const year = date.getFullYear();
const month = String(date.getMonth() + 1).padStart(2, '0');
const day = String(date.getDate()).padStart(2, '0');
const hours = String(date.getHours()).padStart(2, '0');
const minutes = String(date.getMinutes()).padStart(2, '0');
const datetimeLocalValue = `${year}-${month}-${day}T${hours}:${minutes}`;

console.log('2. Для datetime-local поля:', datetimeLocalValue);
console.log('   Локальное время:', date.toString());

// Конвертируем обратно в ISO (как в saveCreative)
const backToDate = new Date(datetimeLocalValue);
const backToISO = backToDate.toISOString();

console.log('3. Обратно в ISO:', backToISO);
console.log('   UTC время:', backToDate.toUTCString());

// Проверяем разность
const originalTime = new Date(dbDate).getTime();
const convertedTime = new Date(backToISO).getTime();
const timeDiff = Math.abs(originalTime - convertedTime);

console.log('\n=== Результат ===');
console.log('Исходная дата (UTC):', new Date(dbDate).toUTCString());
console.log('Конвертированная (UTC):', new Date(backToISO).toUTCString());
console.log('Разность в миллисекундах:', timeDiff);
console.log('Разность в минутах:', timeDiff / (1000 * 60));

if (timeDiff === 0) {
  console.log('✅ Конвертация точная');
} else if (timeDiff < 60000) { // меньше минуты
  console.log('⚠️ Небольшая разность (секунды обнулились)');
} else {
  console.log('❌ Значительная разность - проблема с часовыми поясами');
}

// Тест разных форматов
console.log('\n=== Тест разных входных форматов ===');

const testFormats = [
  '2025-11-11T18:34:10.192+00:00',  // С часовым поясом
  '2025-11-11T18:34:10.192Z',       // UTC
  '2025-11-11T18:34:10',            // Без миллисекунд и часового пояса
  '2025-11-11T18:34'                // datetime-local формат
];

testFormats.forEach((format, index) => {
  try {
    const testDate = new Date(format);
    console.log(`${index + 1}. "${format}" -> ${testDate.toISOString()}`);
  } catch (e) {
    console.log(`${index + 1}. "${format}" -> ОШИБКА: ${e.message}`);
  }
});

console.log('\n=== Тест завершен ===');
