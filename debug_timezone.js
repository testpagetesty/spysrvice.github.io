// Проверяем проблему с часовыми поясами

console.log('=== Отладка часовых поясов ===');

// Текущая временная зона
console.log('Текущая временная зона:', Intl.DateTimeFormat().resolvedOptions().timeZone);
console.log('Смещение UTC:', new Date().getTimezoneOffset(), 'минут');

// Дата креатива
const creativeDate = new Date('2025-11-11T18:34:10.192+00:00');
console.log('Дата креатива (UTC):', creativeDate.toISOString());
console.log('Дата креатива (локальная):', creativeDate.toString());

// Фильтр "11 ноября"
const filterDate = '2025-11-11';
console.log('\nФильтр по дате:', filterDate);

// Как интерпретируется фильтр
const filterStart = new Date(filterDate + 'T00:00:00');
const filterEnd = new Date(filterDate + 'T23:59:59');

console.log('Начало дня (локальное):', filterStart.toString());
console.log('Начало дня (UTC):', filterStart.toISOString());
console.log('Конец дня (локальное):', filterEnd.toString());
console.log('Конец дня (UTC):', filterEnd.toISOString());

// Проверяем попадание
console.log('\nПроверка попадания:');
console.log('Креатив >= начало дня?', creativeDate >= filterStart);
console.log('Креатив <= конец дня?', creativeDate <= filterEnd);

// Правильный способ - использовать UTC
const filterStartUTC = new Date(filterDate + 'T00:00:00Z');
const filterEndUTC = new Date(filterDate + 'T23:59:59Z');

console.log('\nПравильная проверка (UTC):');
console.log('Начало дня (UTC):', filterStartUTC.toISOString());
console.log('Конец дня (UTC):', filterEndUTC.toISOString());
console.log('Креатив >= начало дня (UTC)?', creativeDate >= filterStartUTC);
console.log('Креатив <= конец дня (UTC)?', creativeDate <= filterEndUTC);
