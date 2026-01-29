# Google OAuth 2.0 설정 (401 invalid_client 해결)

`Error 401: invalid_client` / "The OAuth client was not found." 가 나오면 아래 순서대로 설정하세요.

## 1. Google Cloud Console 접속

1. [Google Cloud Console](https://console.cloud.google.com/) 로그인
2. 프로젝트 선택 또는 새 프로젝트 생성

## 2. OAuth 동의 화면 설정

1. **API 및 서비스** → **OAuth 동의 화면**
2. **외부** 사용자 유형 선택 → **만들기**
3. 앱 이름: `짜조` (또는 원하는 이름)
4. 사용자 지원 이메일 선택
5. **저장 후 계속** → 범위 추가 없이 **저장 후 계속** → **대시보드로 돌아가기**

## 3. OAuth 2.0 클라이언트 ID 생성

1. **API 및 서비스** → **사용자 인증 정보**
2. **+ 사용자 인증 정보 만들기** → **OAuth 클라이언트 ID**
3. 애플리케이션 유형: **웹 애플리케이션**
4. 이름: 예) `짜조 로컬`
5. **승인된 리디렉션 URI** 에 아래 주소 **정확히** 추가:
   - 로컬: `http://localhost:8080/login/oauth2/code/google`
   - 배포 시: `https://(백엔드_도메인)/login/oauth2/code/google`
6. **만들기** 클릭

## 4. 클라이언트 ID/비밀번호 적용

생성 후 표시되는 **클라이언트 ID**와 **클라이언트 보안 비밀**을 사용합니다.

### 방법 A: 환경 변수 (권장)

- Windows PowerShell:
  ```powershell
  $env:GOOGLE_CLIENT_ID="클라이언트_ID.apps.googleusercontent.com"
  $env:GOOGLE_CLIENT_SECRET="클라이언트_보안_비밀"
  ```

  **환경 변수 확인 (같은 터미널에서):**
  ```powershell
  # ID가 설정됐는지 (끝 4자리만 표시)
  if ($env:GOOGLE_CLIENT_ID) { "GOOGLE_CLIENT_ID: ..." + $env:GOOGLE_CLIENT_ID.Substring([Math]::Max(0, $env:GOOGLE_CLIENT_ID.Length - 4)) } else { "GOOGLE_CLIENT_ID: (비어 있음)" }

  # 비밀은 길이만 확인 (값 노출 방지)
  if ($env:GOOGLE_CLIENT_SECRET) { "GOOGLE_CLIENT_SECRET: 설정됨 (길이 " + $env:GOOGLE_CLIENT_SECRET.Length + ")" } else { "GOOGLE_CLIENT_SECRET: (비어 있음)" }
  ```
  둘 다 "설정됨" 또는 끝 4자리가 보이면 정상입니다.

- 그 다음 같은 터미널에서 백엔드 실행:
  ```powershell
  cd backend
  .\mvnw.cmd spring-boot:run
  ```

### 방법 B: IDE 실행 설정

- 실행 설정(Edit Configurations)에서 환경 변수에  
  `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` 추가

### 방법 C: application-local.yml (한 번만 설정, 매번 입력 불필요)

- `backend/src/main/resources/application-local.yml` 파일 생성
- 다음 내용으로 **실제 값** 입력 후 저장:
  ```yaml
  spring:
    security:
      oauth2:
        client:
          registration:
            google:
              client-id: 여기에_클라이언트_ID.apps.googleusercontent.com
              client-secret: 여기에_클라이언트_보안_비밀
  ```
- 이 파일은 `.gitignore`에 있어서 Git에 올라가지 않습니다 (비밀 보호).
- 실행할 때마다 **프로파일**만 지정하면 됩니다:
  ```powershell
  cd backend
  .\mvnw.cmd spring-boot:run -Dspring-boot.run.arguments="--spring.profiles.active=local"
  ```
  또는 IDE 실행 설정에서 **Active profiles**에 `local` 입력 후 실행.

### 방법 D: Windows 사용자 환경 변수 (한 번만 설정)

- **설정** → **시스템** → **정보** → **고급 시스템 설정** → **환경 변수**
- **사용자 변수**에서 **새로 만들기**:
  - 변수 이름: `GOOGLE_CLIENT_ID` / 값: `클라이언트_ID.apps.googleusercontent.com`
  - 변수 이름: `GOOGLE_CLIENT_SECRET` / 값: `클라이언트_보안_비밀`
- 확인 후 **새로 연 터미널**부터 적용됩니다. 백엔드 실행 시 매번 입력할 필요 없음.

---

## 5. 확인

- 프론트엔드에서 **Google 계정으로 시작하기** 클릭
- Google 로그인 화면이 뜨고, 로그인 후 앱으로 돌아오면 설정이 반영된 것입니다.

---

## 401 invalid_client / flowName=GeneralOAuthLite 가 나올 때

아래를 **순서대로** 확인하세요.

### ① 환경 변수가 백엔드에 들어갔는지

- 백엔드를 **환경 변수 설정한 뒤** 같은 터미널에서 실행했는지 확인.
- 백엔드 로그에 `Google OAuth 클라이언트 ID가 설정됨` 이 보이면 설정된 것.
- `Google OAuth 미설정: 401 invalid_client` 가 보이면 **아직 설정 안 된 것** → 4단계 다시 진행.

**PowerShell 예시 (한 번에):**
```powershell
$env:GOOGLE_CLIENT_ID="123456789-xxxx.apps.googleusercontent.com"
$env:GOOGLE_CLIENT_SECRET="GOCSPX-xxxxxxxxxxxx"
cd "c:\Users\jinwoo\OneDrive\바탕 화면\프로젝트\JJAJO\backend"
.\mvnw.cmd spring-boot:run
```

### ② Google Cloud Console – 클라이언트 유형

- **사용자 인증 정보** → 해당 OAuth 클라이언트 클릭
- **애플리케이션 유형**이 **웹 애플리케이션**인지 확인 (Android/iOS/데스크톱이면 401 납니다).

### ③ 리디렉션 URI가 정확한지

- 같은 화면에서 **승인된 리디렉션 URI**에 아래가 **한 글자도 틀리지 않게** 들어가 있는지 확인:
  ```
  http://localhost:8080/login/oauth2/code/google
  ```
- `https` 아님, 끝에 `/` 없음, 포트 `8080`, 경로 `/login/oauth2/code/google` 그대로.

### ④ OAuth 동의 화면 – 테스트 사용자 (게시 상태: 테스트)

- **API 및 서비스** → **OAuth 동의 화면**
- 게시 상태가 **테스트**이면, **테스트 사용자**에 로그인할 Gmail 주소를 추가해야 합니다.
- 테스트 사용자에 없으면 `access_denied` 또는 401이 날 수 있습니다.
