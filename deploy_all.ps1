# Set encoding to UTF-8 to avoid garbled text
$OutputEncoding = [Console]::InputEncoding = [Console]::OutputEncoding = New-Object System.Text.UTF8Encoding

Write-Host "=========================================="
Write-Host "      Start Full Auto Deploy      "
Write-Host "=========================================="
Write-Host ""

# 1. Database Deploy
Write-Host "1. Updating Database (Supabase)..."

# Check if logged in by trying to link
Write-Host "   > Linking project..."
cmd /c "npm run db:setup"
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "-----------------------------------------------------" -ForegroundColor Red
    Write-Host "ERROR: Supabase Login Required" -ForegroundColor Red
    Write-Host "It seems you are not logged in to Supabase." -ForegroundColor Yellow
    Write-Host "Please run the following command manually:" -ForegroundColor Yellow
    Write-Host "    npx supabase login" -ForegroundColor Cyan
    Write-Host "-----------------------------------------------------" -ForegroundColor Red
    exit $LASTEXITCODE
}

Write-Host "   > Pushing database changes..."
cmd /c "npm run db:push"
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Database push failed. Please check the errors above." -ForegroundColor Red
    exit $LASTEXITCODE
}
Write-Host "✅ Database update successful!" -ForegroundColor Green
Write-Host ""

# 2. Git Deploy
Write-Host "2. Uploading Code to GitHub..."
git add .
$commitMsg = Read-Host "Enter commit message (Press Enter for 'Auto Update')"
if ($commitMsg -eq "") { $commitMsg = "Auto Update" }

try {
    git commit -m "$commitMsg"
} catch {
    Write-Host "No changes to commit."
}

Write-Host "Pushing to server..."
git push

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "=========================================="
    Write-Host "🎉  All Completed Successfully!      "
    Write-Host "1. Database updated."
    Write-Host "2. Code uploaded."
    Write-Host "=========================================="
} else {
    Write-Host "❌ Error: Git push failed." -ForegroundColor Red
}
