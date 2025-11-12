const https = require('https');

const VERCEL_TOKEN = 'nnvsZ13xBz8jAyUD3o468cML';

const envVars = [
  {
    key: 'NEXT_PUBLIC_SUPABASE_URL',
    value: 'https://oilwcbfyhutzyjzlqbuk.supabase.co',
    target: ['production', 'preview', 'development']
  },
  {
    key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    value: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9pbHdjYmZ5aHV0enlqemxxYnVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3OTQ5NDAsImV4cCI6MjA3ODM3MDk0MH0.pQAq4iav6pO4Oh3D1XqYVAXGc2iBy5hTJuDconcws8I',
    target: ['production', 'preview', 'development']
  },
  {
    key: 'SUPABASE_SERVICE_ROLE_KEY',
    value: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9pbHdjYmZ5aHV0enlqemxxYnVrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Mjc5NDk0MCwiZXhwIjoyMDc4MzcwOTQwfQ.jamctKxlVdqGZ96MWCsbdzS_oXfF5eq7RewvGkkt97A',
    target: ['production', 'preview', 'development']
  }
];

function apiRequest(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.vercel.com',
      path: path,
      method: method,
      headers: {
        'Authorization': `Bearer ${VERCEL_TOKEN}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const parsed = body ? JSON.parse(body) : {};
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

async function main() {
  try {
    console.log('Fetching projects...');
    const projectsResult = await apiRequest('/v9/projects');
    
    if (projectsResult.status !== 200) {
      console.error('Failed to fetch projects:', projectsResult.status, projectsResult.data);
      process.exit(1);
    }

    const projects = projectsResult.data.projects || [];
    console.log(`Found ${projects.length} projects`);
    
    const project = projects.find(p => 
      p.name === 'spysrvice-github-io' || 
      p.name === 'spysrvice.github.io' ||
      p.name.includes('spysrvice') ||
      p.name.includes('spysrvice')
    );

    if (!project) {
      console.log('Available projects:', projects.map(p => p.name).join(', '));
      console.error('Project not found!');
      process.exit(1);
    }

    console.log(`Found project: ${project.name} (ID: ${project.id})`);
    console.log('\nAdding environment variables...\n');

    for (const envVar of envVars) {
      console.log(`Adding ${envVar.key}...`);
      
      const result = await apiRequest(
        `/v10/projects/${project.id}/env`,
        'POST',
        {
          key: envVar.key,
          value: envVar.value,
          type: 'encrypted',
          target: envVar.target
        }
      );

      if (result.status === 200 || result.status === 201) {
        console.log(`✓ Successfully added ${envVar.key}`);
      } else if (result.status === 409) {
        console.log(`⚠ ${envVar.key} already exists, updating...`);
        const updateResult = await apiRequest(
          `/v10/projects/${project.id}/env/${envVar.key}`,
          'PATCH',
          {
            value: envVar.value,
            target: envVar.target
          }
        );
        if (updateResult.status === 200) {
          console.log(`✓ Successfully updated ${envVar.key}`);
        } else {
          console.log(`✗ Failed to update ${envVar.key}:`, updateResult.status, updateResult.data);
        }
      } else {
        console.log(`✗ Failed to add ${envVar.key}:`, result.status, JSON.stringify(result.data));
      }
    }

    console.log('\n✓ Done! Please redeploy your project in Vercel dashboard.');
    console.log(`Project URL: https://vercel.com/${project.accountId}/${project.name}/settings/environment-variables`);

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();

