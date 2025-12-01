const { default: fetch } = require('node-fetch');

async function updateCreativeFormat() {
  const supabaseUrl = 'https://oilwcbfyhutzyjzlqbuk.supabase.co';
  const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9pbHdjYmZ5aHV0enlqemxxYnVrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Mjc5NDk0MCwiZXhwIjoyMDc4MzcwOTQwfQ.jamctKxlVdqGZ96MWCsbdzS_oXfF5eq7RewvGkkt97A';

  try {
    // Находим формат "teaser"
    const formatResponse = await fetch(
      `${supabaseUrl}/rest/v1/formats?code=eq.teaser&select=id`,
      {
        headers: {
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const formatData = await formatResponse.json();
    if (!formatData || formatData.length === 0) {
      console.error('❌ Format "teaser" not found');
      return;
    }

    const formatId = formatData[0].id;
    console.log('✅ Format found:', formatId);

    // Находим креатив по названию
    const creativeResponse = await fetch(
      `${supabaseUrl}/rest/v1/creatives?title=eq.Escribí tu consulta&select=id,title,format_id&order=created_at.desc&limit=1`,
      {
        headers: {
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const creativeData = await creativeResponse.json();
    if (!creativeData || creativeData.length === 0) {
      console.error('❌ Creative "Escribí tu consulta" not found');
      return;
    }

    const creativeId = creativeData[0].id;
    console.log('✅ Creative found:', creativeId, creativeData[0].title);

    // Обновляем формат
    const updateResponse = await fetch(
      `${supabaseUrl}/rest/v1/creatives?id=eq.${creativeId}`,
      {
        method: 'PATCH',
        headers: {
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({ format_id: formatId })
      }
    );

    const updateData = await updateResponse.json();
    if (!updateResponse.ok) {
      console.error('❌ Error updating creative:', updateData);
      return;
    }

    console.log('✅ Creative format updated successfully!');
    console.log('Updated creative:', updateData);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

updateCreativeFormat();

