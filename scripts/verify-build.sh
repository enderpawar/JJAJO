#!/usr/bin/env bash
# JJAJO 배포 전 로컬 빌드 검증 (Mac/Linux)
# 사용: ./scripts/verify-build.sh
# 저장소 루트에서 실행하세요.

set -e
cd "$(dirname "$0")/.."

echo "=== JJAJO 배포 전 빌드 검증 ==="

echo ""
echo "[1/2] Backend: Maven package..."
(cd backend && (chmod +x mvnw 2>/dev/null || true) && ./mvnw -q -DskipTests package)
echo "Backend OK."

echo ""
echo "[2/2] Frontend: npm run build..."
(cd frontend && (npm ci 2>/dev/null || npm install) && npm run build)
echo "Frontend OK."

echo ""
echo "=== 모두 성공. 배포 가능 상태입니다. ==="
