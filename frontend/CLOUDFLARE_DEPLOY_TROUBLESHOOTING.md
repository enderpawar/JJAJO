# Cloudflare Pages 배포 시 "Failed to publish your Function" 대응

## 상황

- **Assets published!** → 정적 파일(HTML/JS/CSS)은 배포 성공
- **Failed to publish your Function. Unknown internal error** → Function 배포 단계에서만 실패

이 프로젝트는 **Vite + React SPA**이며, 서버/엣지 함수를 사용하지 않습니다. 그럼에도 Cloudflare가 "Function" 단계를 시도하다가 내부 오류로 실패하는 경우가 있습니다.

---

## 1. 먼저 확인할 것

- **사이트가 이미 정상 동작하는지** 확인해 보세요.  
  Assets가 성공했다면 `https://jjajo.pages.dev` 에 최신 빌드가 반영되어 있을 수 있습니다.
- 문제가 **일시적인지** 확인하려면 **배포를 한두 번 다시 시도**해 보세요.

---

## 2. Cursor/IDE 배포 대신 Cloudflare에서 직접 배포

"Function" 단계에서만 실패한다면, Cursor(또는 사용 중인 도구)의 배포 파이프라인 대신 **Cloudflare만 사용**해 배포하는 편이 안정적입니다.

### 방법 A: Cloudflare Dashboard (Git 연결)

1. [Cloudflare Dashboard](https://dash.cloudflare.com) → **Workers & Pages** → 해당 Pages 프로젝트
2. **Settings** → **Builds & deployments** 에서 빌드 설정 확인  
   - **Build output directory**: `dist` (Vite 기본값)  
   - **Build command**: `npm run build` (또는 `pnpm build` 등)
3. **Deployments** 탭에서 **Retry** 또는 새 커밋 푸시로 재배포

### 방법 B: 로컬에서 Wrangler로 배포 (선택)

```bash
cd frontend
npm run build
npx wrangler pages deploy dist --project-name=jjajo
```

(Git 연결 대신 `dist` 폴더만 업로드하는 방식이라 Function 단계가 없을 수 있음)

---

## 3. 그래도 "Function" 오류가 난다면

- Cloudflare 쪽 **일시 장애/버그** 가능성이 있습니다.  
  - [workers-sdk Issue #7538](https://github.com/cloudflare/workers-sdk/issues/7538)  
  - [Cloudflare Community: Failed to publish your Function when not using functions](https://community.cloudflare.com/t/getting-error-failed-to-publish-your-function-when-not-using-functions/548362)
- **잠시 후 다시 배포**하거나, **다른 시간대에 재시도**해 보세요.
- Dashboard에서 **Functions** 가 켜져 있다면, 이 프로젝트는 순수 SPA이므로 **Functions 비활성화**를 고려해 볼 수 있습니다 (설정이 있다면).

---

## 4. 요약

| 조치 | 설명 |
|------|------|
| 사이트 접속 확인 | jjajo.pages.dev 이 최신인지 확인 |
| 재배포 | 같은 설정으로 1~2회 다시 배포 |
| Dashboard/Git 배포 | Cursor 대신 Cloudflare에서 Git 빌드로 배포 |
| Wrangler로 dist 업로드 | `wrangler pages deploy dist` 로 정적 파일만 배포 |
| 시간 두고 재시도 | Cloudflare 내부 오류 시 나중에 다시 시도 |

이 프로젝트는 **Functions 없이 정적 사이트**이므로, Assets 배포만 성공해도 서비스에는 문제가 없습니다.
