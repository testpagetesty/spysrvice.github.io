@echo off
echo Adding files to git...
git add .

echo Creating commit...
git commit -m "Initial commit: Spy Service Dashboard project"

echo Setting main branch...
git branch -M main

echo Creating GitHub repository...
gh repo create spyservicedashnoard --public --source=. --remote=origin --push

if %errorlevel% neq 0 (
    echo GitHub CLI not found or not authenticated.
    echo Please create repository manually at https://github.com/new
    echo Repository name: spyservicedashnoard
    echo Then run:
    echo git remote add origin https://github.com/YOUR_USERNAME/spyservicedashnoard.git
    echo git push -u origin main
)

pause








