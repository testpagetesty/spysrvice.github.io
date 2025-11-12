const https = require('https');

const VERCEL_TOKEN = 'nnvsZ13xBz8jAyUD3o468cML';
const PROJECT_NAME = 'spysrvice-github-io'; // Из URL проекта

// Переменные окружения из supabase-keys.txt
const envVars = [
  {
    key: 'NEXT_PUBLIC_SUPABASE_URL',
    value: 'https://oilwcbfyhutzyjzlqbuk.supabase.co',
    type: 'encrypted',
    target: ['production', 'preview', 'development']
  },
  {
    key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    value: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9pbHdjYmZ5aHV0enlqemxxYnVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3OTQ5NDAsImV4cCI6MjA3ODM3MDk0MH0.pQAq4iav6pO4Oh3D1XqYVAXGc2iBy5hTJuDconcws8I',
    type: 'encrypted',
    target: ['production', 'preview', 'development']
  },
  {
    key: 'SUPABASE_SERVICE_ROLE_KEY',
    value: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9pbHdjYmZ5aHV0enlqemxxYnVrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Mjc5NDk0MCwiZXhwIjoyMDc4MzcwOTQwfQ.jamctKxlVdqGZ96MWCsbdzS_oXfF5eq7RewvGkkt97A',
    type: 'encrypted',
    target: ['production', 'preview', 'development']
  }
];

function makeRequest(options, data) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });
    
    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function addEnvVar(projectId, envVar) {
  const options = {
    hostname: 'api.vercel.com',
    path: `/v10/projects/${projectId}/env`,
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${VERCEL_TOKEN}`,
      'Content-Type': 'application/json'
    }
  };

  const result = await makeRequest(options, envVar);
  return result;
}

async function getProjectId() {
  const options = {
    hostname: 'api.vercel.com',
    path: '/v9/projects',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${VERCEL_TOKEN}`
    }
  };

  const result = await makeRequest(options);
  
  if (result.status === 200 && result.data.projects) {
    const project = result.data.projects.find(p => 
      p.name === PROJECT_NAME || 
      p.name === 'spysrvice.github.io' ||
      p.name.includes('spysrvice')
    );
    
    if (project) {
      return project.id;
    }
  }
  
  throw new Error('Project not found. Response: ' + JSON.stringify(result));
}

async function main() {
  try {
    console.log('Getting project ID...');
    const projectId = await getProjectId();
    console.log(`Found project ID: ${projectId}`);
    
    console.log('\nAdding environment variables...');
    
    for (const envVar of envVars) {
      console.log(`\nAdding ${envVar.key}...`);
      const result = await addEnvVar(projectId, envVar);
      
      if (result.status === 200 || result.status === 201) {
        console.log(`✓ Successfully added ${envVar.key}`);
      } else {
        console.log(`✗ Failed to add ${envVar.key}:`, result.status, result.data);
      }
    }
    
    console.log('\n✓ Done! Please redeploy your project in Vercel.');
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();

