// Используем встроенный fetch в Node.js 18+
const VERCEL_TOKEN = 'nnvsZ13xBz8jAyUD3o468cML';

const envVars = [
  { key: 'NEXT_PUBLIC_SUPABASE_URL', value: 'https://oilwcbfyhutzyjzlqbuk.supabase.co' },
  { key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', value: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9pbHdjYmZ5aHV0enlqemxxYnVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3OTQ5NDAsImV4cCI6MjA3ODM3MDk0MH0.pQAq4iav6pO4Oh3D1XqYVAXGc2iBy5hTJuDconcws8I' },
  { key: 'SUPABASE_SERVICE_ROLE_KEY', value: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9pbHdjYmZ5aHV0enlqemxxYnVrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Mjc5NDk0MCwiZXhwIjoyMDc4MzcwOTQwfQ.jamctKxlVdqGZ96MWCsbdzS_oXfF5eq7RewvGkkt97A' }
];

async function main() {
  try {
    const projectsRes = await fetch('https://api.vercel.com/v9/projects', {
      headers: { 'Authorization': `Bearer ${VERCEL_TOKEN}` }
    });
    const projects = await projectsRes.json();
    const project = projects.projects?.find(p => p.name.includes('spysrvice') || p.name.includes('github'));
    
    if (!project) {
      console.error('Project not found');
      console.log('Available:', projects.projects?.map(p => p.name));
      process.exit(1);
    }
    
    console.log(`Found project: ${project.name} (${project.id})`);
    
    for (const env of envVars) {
      const res = await fetch(`https://api.vercel.com/v10/projects/${project.id}/env`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${VERCEL_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          key: env.key,
          value: env.value,
          type: 'encrypted',
          target: ['production', 'preview', 'development']
        })
      });
      
      const result = await res.json();
      if (res.ok) {
        console.log(`✓ Added ${env.key}`);
      } else if (res.status === 409) {
        console.log(`⚠ ${env.key} exists, updating...`);
        const updateRes = await fetch(`https://api.vercel.com/v10/projects/${project.id}/env/${env.key}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${VERCEL_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            value: env.value,
            target: ['production', 'preview', 'development']
          })
        });
        console.log(updateRes.ok ? `✓ Updated ${env.key}` : `✗ Failed: ${await updateRes.text()}`);
      } else {
        console.log(`✗ Failed ${env.key}:`, result);
      }
    }
    
    console.log('\nDone! Redeploy your project.');
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();

