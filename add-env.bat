@echo off
echo Adding environment variables to Vercel...
echo.

curl -X POST "https://api.vercel.com/v10/projects/spysrvice-github-io/env" ^
  -H "Authorization: Bearer nnvsZ13xBz8jAyUD3o468cML" ^
  -H "Content-Type: application/json" ^
  -d "{\"key\":\"NEXT_PUBLIC_SUPABASE_URL\",\"value\":\"https://oilwcbfyhutzyjzlqbuk.supabase.co\",\"type\":\"encrypted\",\"target\":[\"production\",\"preview\",\"development\"]}"

echo.
echo Variable 1 added. Adding next...

curl -X POST "https://api.vercel.com/v10/projects/spysrvice-github-io/env" ^
  -H "Authorization: Bearer nnvsZ13xBz8jAyUD3o468cML" ^
  -H "Content-Type: application/json" ^
  -d "{\"key\":\"NEXT_PUBLIC_SUPABASE_ANON_KEY\",\"value\":\"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9pbHdjYmZ5aHV0enlqemxxYnVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3OTQ5NDAsImV4cCI6MjA3ODM3MDk0MH0.pQAq4iav6pO4Oh3D1XqYVAXGc2iBy5hTJuDconcws8I\",\"type\":\"encrypted\",\"target\":[\"production\",\"preview\",\"development\"]}"

echo.
echo Variable 2 added. Adding next...

curl -X POST "https://api.vercel.com/v10/projects/spysrvice-github-io/env" ^
  -H "Authorization: Bearer nnvsZ13xBz8jAyUD3o468cML" ^
  -H "Content-Type: application/json" ^
  -d "{\"key\":\"SUPABASE_SERVICE_ROLE_KEY\",\"value\":\"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9pbHdjYmZ5aHV0enlqemxxYnVrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Mjc5NDk0MCwiZXhwIjoyMDc4MzcwOTQwfQ.jamctKxlVdqGZ96MWCsbdzS_oXfF5eq7RewvGkkt97A\",\"type\":\"encrypted\",\"target\":[\"production\",\"preview\",\"development\"]}"

echo.
echo All variables added!
echo Please redeploy your project in Vercel dashboard.
pause

