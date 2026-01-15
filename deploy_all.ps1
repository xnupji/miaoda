# Set encoding to UTF-8 to avoid garbled text
$OutputEncoding = [Console]::InputEncoding = [Console]::OutputEncoding = New-Object System.Text.UTF8Encoding

Write-Host "=========================================="
Write-Host "      Start Full Auto Deploy (Robust)     "
Write-Host "=========================================="
Write-Host ""

# 0. Install Dependencies (Ensure Lockfile Consistency)
Write-Host "0. Installing Dependencies..."
npm.cmd install
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️ Warning: npm install failed. This might cause build issues." -ForegroundColor Yellow
} else {
    Write-Host "✅ Dependencies installed." -ForegroundColor Green
}
Write-Host ""

# 1. Database Deploy (With Fallback)
Write-Host "1. Updating Database (Supabase)..."

# Try to push
Write-Host "   > Attempting 'npm run db:push'..."
cmd /c "echo y | npm run db:push"

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "⚠️  DATABASE UPDATE FAILED" -ForegroundColor Red
    Write-Host "   Possible reasons:"
    Write-Host "   - Supabase CLI not installed (run 'npm install -D supabase')"
    Write-Host "   - Not logged in (run 'npx supabase login')"
    Write-Host "   - Project not linked (run 'npx supabase link --project-ref pwlgtiiiapiahtwtvojz')"
    Write-Host ""
    Write-Host "⚠️  Skipping database update and continuing deploy." -ForegroundColor Yellow
} else {
    Write-Host "✅ Database update successful!" -ForegroundColor Green
}
Write-Host ""

# 2. Git Deploy (Force Push)
Write-Host "2. Uploading Code to GitHub (Triggers Auto-Deploy)..."

# Ensure we are on the right branch/remote
git remote -v

git add .
$commitMsg = "Auto Update: " + (Get-Date -Format "yyyy-MM-dd HH:mm:ss")

try {
    git commit -m "$commitMsg"
    Write-Host "✅ Changes committed." -ForegroundColor Green
} catch {
    Write-Host "ℹ️ No new changes to commit." -ForegroundColor Gray
}

Write-Host "Pushing to server..."
git push

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "=========================================="
    Write-Host "🎉  DEPLOYMENT TRIGGERED SUCCESSFULLY!    "
    Write-Host "=========================================="
    Write-Host "1. Code pushed to GitHub."
    Write-Host "2. GitHub Actions will build and deploy the website (~2-3 mins)."
    Write-Host "3. If 'Customer Service' is missing, check the Database step above."
    Write-Host "=========================================="
} else {
    Write-Host "❌ Error: Git push failed. Check your internet or git credentials." -ForegroundColor Red
}
