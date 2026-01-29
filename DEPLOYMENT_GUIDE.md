# JJAJO 배포 가이드

새 세션에서 이 문서만 따라 하면 **단일 도메인**으로 데스크톱·휴대폰 모두 사용 가능한 웹앱을 배포할 수 있습니다.

---

## 목표

- **프론트**: React(Vite) SPA → Cloudflare Pages
- **백엔드**: Spring Boot → Railway 또는 Render
- **DB**: PostgreSQL → Neon 또는 Supabase
- **도메인**: 하나(예: `myapp.com` + `api.myapp.com`)로 PC/모바일 동일 접속·데이터 연동

---

## 사전 준비

- [ ] GitHub 등에 프로젝트 저장소 푸시
- [ ] Google Cloud Console에서 OAuth 클라이언트 생성 (로컬용은 이미 있다면, 배포용 리다이렉트 URI 추가)
- [ ] (선택) 도메인 구매 또는 Cloudflare/서비스 제공 무료 서브도메인 사용

---

## 배포 설정 파일 (저장소 내)

| 경로 | 용도 |
|------|------|
| `backend/railway.toml` | Railway 빌드/시작 명령·헬스체크 (Root Directory: `backend` 시 적용) |
| `backend/Dockerfile` | Render·Docker 배포용 이미지 빌드 |
| `backend/.dockerignore` | Docker 빌드 시 제외 파일 |
| `render.yaml` | Render Blueprint — 저장소 루트, **New → Blueprint**로 한 번에 서비스 생성 |
| `frontend/.nvmrc` | Cloudflare Pages 등에서 사용할 Node 버전(20) |
| `frontend/.env.example` | 프론트 환경 변수 예시 (`VITE_BACKEND_ORIGIN`) |
| `scripts/verify-build.ps1` | 배포 전 로컬 빌드 검증 (Windows, 저장소 루트에서 실행) |
| `scripts/verify-build.sh` | 배포 전 로컬 빌드 검증 (Mac/Linux) |
| `.github/workflows/build.yml` | push/PR 시 백엔드·프론트 빌드 검증 (CI) |

---

## 배포 전 로컬 빌드 확인 (권장)

배포 플랫폼에 푸시하기 전에 로컬에서 빌드가 되는지 확인하면 실패를 줄일 수 있습니다.

- **Windows (PowerShell)**: 저장소 루트에서  
  `.\scripts\verify-build.ps1`
- **Mac/Linux**:  
  `./scripts/verify-build.sh`

또는 GitHub에 푸시하면 `.github/workflows/build.yml`이 자동으로 백엔드·프론트 빌드를 실행합니다. 둘 다 성공한 뒤 Railway/Render/Cloudflare에 배포하면 됩니다.

---

## 1단계: PostgreSQL(원격 DB) 준비

1. [Neon](https://neon.tech) 또는 [Supabase](https://supabase.com) 가입 후 PostgreSQL 인스턴스 생성.
2. **Connection string** 복사.  
   예: `postgresql://USER:PASSWORD@HOST/dbname?sslmode=require`
3. Spring Boot용 **JDBC URL**로 변환:  
   `jdbc:postgresql://HOST:5432/DBNAME?sslmode=require`  
   (호스트에 포트가 포함돼 있으면 그대로 사용)
4. 아래 값 보관 (2단계·3단계에서 사용):
   - `SPRING_DATASOURCE_URL`
   - `SPRING_DATASOURCE_USERNAME`
   - `SPRING_DATASOURCE_PASSWORD`

자세한 내용: [backend/REMOTE_DB_SETUP.md](backend/REMOTE_DB_SETUP.md)

---

## 2단계: 백엔드 배포 (Railway 또는 Render)

**사전 확인**: 1단계에서 보관한 `SPRING_DATASOURCE_*` 값, Google OAuth(`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`), 그리고 예정 프론트 URL(`FRONTEND_ORIGIN`)을 준비하세요.  
프론트는 4단계에서 배포하므로, `FRONTEND_ORIGIN`은 `https://jjajo.pages.dev` 등 **예정 URL**을 넣고, 5단계에서 실제 프론트 URL로 갱신하면 됩니다.

### 2-1. Railway 사용 시

1. [Railway](https://railway.app) 로그인 → **New Project**
2. **Deploy from GitHub repo** 선택 → JJAJO 저장소 연결
3. **Root Directory**: `backend` 지정
4. **Build Command**: `./mvnw -q -DskipTests package` (또는 `mvn -q -DskipTests package`)
5. **Start Command**: `java -Dspring.profiles.active=prod -jar target/jjajo-backend-0.0.1-SNAPSHOT.jar`
6. **Variables**에 아래 환경 변수 추가 (로컬에서 `backend/.env` 사용 중이면 동일한 값을 복사해 넣으면 됨):

   | 이름 | 값 |
   |------|-----|
   | `SPRING_PROFILES_ACTIVE` | `prod` |
   | `SPRING_DATASOURCE_URL` | 1단계 JDBC URL |
   | `SPRING_DATASOURCE_USERNAME` | DB 사용자명 |
   | `SPRING_DATASOURCE_PASSWORD` | DB 비밀번호 |
   | `GOOGLE_CLIENT_ID` | Google OAuth 클라이언트 ID |
   | `GOOGLE_CLIENT_SECRET` | Google OAuth 클라이언트 시크릿 |
   | `FRONTEND_ORIGIN` | **프론트 URL** (예: `https://jjajo.pages.dev`. 미배포 시 예정 URL 사용 후 5단계에서 갱신) |

7. 배포 후 **Settings** → **Networking** → **Generate Domain** 으로 공개 URL 확인.  
   예: `https://jjajo-backend-production-xxxx.up.railway.app`  
   → 이 주소를 **백엔드 URL**로 사용.

### 2-2. Render 사용 시

**방법 A: Blueprint (권장)**  
1. [Render](https://render.com) 로그인 → **New** → **Blueprint**
2. JJAJO 저장소 연결. 저장소 루트의 `render.yaml`이 자동 인식됨.
3. 생성 시 비밀 값(`SPRING_DATASOURCE_*`, `GOOGLE_*`, `FRONTEND_ORIGIN`) 입력 프롬프트에 **1단계·OAuth·예정 프론트 URL** 입력. (`backend/.env`에 있으면 동일 값 사용)
4. 배포 후 제공되는 URL을 **백엔드 URL**로 사용.

**방법 B: 수동 Web Service**  
1. **New** → **Web Service** → 저장소 연결, **Root Directory**: `backend`
2. **Runtime**: Docker. **Dockerfile path**: `backend/Dockerfile`, **Docker context**: `backend`
3. **Environment**에 2-1과 동일한 환경 변수 추가.
4. 배포 후 제공되는 URL(예: `https://jjajo-backend.onrender.com`)을 **백엔드 URL**로 사용.

**2단계 완료 후**: 백엔드 URL을 메모해 두세요. → **3단계** OAuth 리다이렉트 URI, **4단계** `VITE_BACKEND_ORIGIN`에 사용합니다.

---

## 3단계: Google OAuth 배포용 URI 등록

1. [Google Cloud Console](https://console.cloud.google.com/) → **API 및 서비스** → **사용자 인증 정보**
2. 사용 중인 OAuth 2.0 클라이언트 ID 선택 → **승인된 리디렉션 URI**에 추가:
   - `https://(백엔드_URL)/login/oauth2/code/google`  
     예: `https://jjajo-backend-production-xxxx.up.railway.app/login/oauth2/code/google`
3. **승인된 JavaScript 원본**에 프론트 URL 추가(필요 시):
   - 예: `https://myapp.pages.dev` 또는 `https://myapp.com`
4. 저장.

자세한 내용: [backend/GOOGLE_OAUTH_SETUP.md](backend/GOOGLE_OAUTH_SETUP.md)

---

## 4단계: 프론트엔드 배포 (Cloudflare Pages)

1. [Cloudflare Dashboard](https://dash.cloudflare.com) → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
2. JJAJO 저장소 선택.
3. **Build settings**:
   - **Framework preset**: Vite
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Root directory**: `frontend`
4. **Environment variables** (프로덕션용):
   - `VITE_BACKEND_ORIGIN` = **2단계에서 확정한 백엔드 URL** (끝 `/` 제외)  
     예: `https://jjajo-backend-production-xxxx.up.railway.app`
5. **Save and Deploy** 후 배포 완료 시 URL 확인.  
   예: `https://jjajo.pages.dev`  
   → 이 주소를 **프론트 URL**로 사용.

---

## 5단계: 백엔드 CORS(FRONTEND_ORIGIN) 재확인

프론트 URL이 4단계에서 확정되면, **백엔드** 환경 변수 `FRONTEND_ORIGIN`을 그 값으로 맞춥니다.

- Railway/Render에서 **Variables** 수정:
  - `FRONTEND_ORIGIN` = `https://jjajo.pages.dev` (또는 커스텀 도메인)
- 수정 후 백엔드 재배포(자동 배포면 저장만 하면 됨).

---

## 6단계: 동작 확인

1. **프론트 URL**로 접속 (PC·휴대폰 브라우저 모두 가능).
2. **Google 로그인** → 리다이렉트 후 메인 화면 진입 확인.
3. **일정 추가** 후 새로고침 → 일정 유지(원격 DB 저장) 확인.
4. 다른 기기에서 같은 계정으로 로그인 → 동일 일정/목표 노출 확인.

---

## 체크리스트 (한 번에 점검)

| 항목 | 확인 |
|------|------|
| Neon/Supabase에서 PostgreSQL 생성·연결 정보 보관 | |
| 백엔드(Railway/Render) 배포, `prod` 프로파일·DB·OAuth·FRONTEND_ORIGIN 설정 | |
| Google OAuth 리다이렉트 URI에 **배포된 백엔드 URL** 추가 | |
| 프론트(Cloudflare Pages) 배포, `VITE_BACKEND_ORIGIN` = 백엔드 URL | |
| `FRONTEND_ORIGIN` = 실제 프론트 URL(도메인 포함) | |
| 로그인·일정 저장·다른 기기 연동 테스트 | |

---

## (선택) 커스텀 도메인 하나로 쓰기

- **도메인** 예: `myapp.com`
- **Cloudflare**에 도메인 추가 후 DNS:
  - `myapp.com` → Cloudflare Pages(프론트) 연결
  - `api.myapp.com` → Railway/Render 백엔드 주소로 **CNAME** 또는 **프록시**
- **프론트** 환경 변수: `VITE_BACKEND_ORIGIN=https://api.myapp.com`
- **백엔드** 환경 변수: `FRONTEND_ORIGIN=https://myapp.com`
- **Google OAuth**: 리다이렉트 URI `https://api.myapp.com/login/oauth2/code/google` 추가

이후 사용자는 `https://myapp.com` 하나로 PC·휴대폰 모두 접속·연동 가능합니다.

---

## 참고 문서

- 원격 DB 연결 상세: [backend/REMOTE_DB_SETUP.md](backend/REMOTE_DB_SETUP.md)
- Google OAuth 설정: [backend/GOOGLE_OAUTH_SETUP.md](backend/GOOGLE_OAUTH_SETUP.md)
