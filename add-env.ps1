$token = "nnvsZ13xBz8jAyUD3o468cML"
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

Write-Host "Fetching projects..." -ForegroundColor Cyan
$projects = Invoke-RestMethod -Uri "https://api.vercel.com/v9/projects" -Headers $headers -Method Get
$project = $projects.projects | Where-Object { $_.name -like "*spysrvice*" -or $_.name -like "*github*" } | Select-Object -First 1

if (-not $project) {
    Write-Host "Project not found!" -ForegroundColor Red
    Write-Host "Available projects:" -ForegroundColor Yellow
    $projects.projects | ForEach-Object { Write-Host "  - $($_.name)" }
    exit 1
}

Write-Host "Found project: $($project.name) (ID: $($project.id))" -ForegroundColor Green
Write-Host ""

$envVars = @(
    @{
        key = "NEXT_PUBLIC_SUPABASE_URL"
        value = "https://oilwcbfyhutzyjzlqbuk.supabase.co"
    },
    @{
        key = "NEXT_PUBLIC_SUPABASE_ANON_KEY"
        value = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9pbHdjYmZ5aHV0enlqemxxYnVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3OTQ5NDAsImV4cCI6MjA3ODM3MDk0MH0.pQAq4iav6pO4Oh3D1XqYVAXGc2iBy5hTJuDconcws8I"
    },
    @{
        key = "SUPABASE_SERVICE_ROLE_KEY"
        value = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9pbHdjYmZ5aHV0enlqemxxYnVrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Mjc5NDk0MCwiZXhwIjoyMDc4MzcwOTQwfQ.jamctKxlVdqGZ96MWCsbdzS_oXfF5eq7RewvGkkt97A"
    }
)

foreach ($env in $envVars) {
    Write-Host "Adding $($env.key)..." -ForegroundColor Cyan
    
    $body = @{
        key = $env.key
        value = $env.value
        type = "encrypted"
        target = @("production", "preview", "development")
    } | ConvertTo-Json
    
    try {
        $result = Invoke-RestMethod -Uri "https://api.vercel.com/v10/projects/$($project.id)/env" -Headers $headers -Method Post -Body $body
        Write-Host "  ✓ Successfully added $($env.key)" -ForegroundColor Green
    }
    catch {
        if ($_.Exception.Response.StatusCode -eq 409) {
            Write-Host "  ⚠ $($env.key) already exists, updating..." -ForegroundColor Yellow
            try {
                $updateBody = @{
                    value = $env.value
                    target = @("production", "preview", "development")
                } | ConvertTo-Json
                
                $updateResult = Invoke-RestMethod -Uri "https://api.vercel.com/v10/projects/$($project.id)/env/$($env.key)" -Headers $headers -Method Patch -Body $updateBody
                Write-Host "  ✓ Successfully updated $($env.key)" -ForegroundColor Green
            }
            catch {
                Write-Host "  ✗ Failed to update: $($_.Exception.Message)" -ForegroundColor Red
            }
        }
        else {
            Write-Host "  ✗ Failed: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
}

Write-Host ""
Write-Host "Done! Please redeploy your project in Vercel." -ForegroundColor Green

