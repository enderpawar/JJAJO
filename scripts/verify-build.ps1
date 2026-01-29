# JJAJO 배포 전 로컬 빌드 검증 (Windows PowerShell)
# 사용: .\scripts\verify-build.ps1
# 저장소 루트에서 실행하세요.

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot + "\.."
Set-Location $root

Write-Host "=== JJAJO 배포 전 빌드 검증 ===" -ForegroundColor Cyan

# 1. 백엔드 패키징
Write-Host "`n[1/2] Backend: Maven package..." -ForegroundColor Yellow
Push-Location backend
try {
    if (Test-Path ".\mvnw.cmd") { .\mvnw.cmd -q -DskipTests package }
    else { mvn -q -DskipTests package }
} finally { Pop-Location }
if ($LASTEXITCODE -ne 0) { throw "Backend build failed." }
Write-Host "Backend OK." -ForegroundColor Green

# 2. 프론트엔드 빌드
Write-Host "`n[2/2] Frontend: npm run build..." -ForegroundColor Yellow
Push-Location frontend
try {
    npm ci 2>$null; if ($LASTEXITCODE -ne 0) { npm install }
    npm run build
} finally { Pop-Location }
if ($LASTEXITCODE -ne 0) { throw "Frontend build failed." }
Write-Host "Frontend OK." -ForegroundColor Green

Write-Host "`n=== 모두 성공. 배포 가능 상태입니다. ===" -ForegroundColor Green
