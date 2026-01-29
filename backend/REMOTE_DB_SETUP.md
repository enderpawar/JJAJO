# 원격 DB(PostgreSQL) 연동 방법

JJAJO 백엔드는 **로컬 개발**에서는 H2 인메모리 DB를, **원격/배포**에서는 PostgreSQL을 사용하도록 설정되어 있습니다.

---

## 1. PostgreSQL 인스턴스 준비

아래 중 하나에서 무료 PostgreSQL을 만들 수 있습니다.

| 서비스 | 무료 티어 | 가입 후 DB 생성 |
|--------|-----------|-----------------|
| [Neon](https://neon.tech) | 0.5GB, 무료 | 프로젝트 → Create project → Connection string 복사 |
| [Supabase](https://supabase.com) | 500MB | Project → Settings → Database → Connection string |
| [Railway](https://railway.app) | $5 크레딧/월 | New → Database → PostgreSQL → Connect |
| [ElephantSQL](https://www.elephantsql.com) | 20MB | Create instance → URL 복사 |

예시: **Neon**에서 프로젝트 생성 후 **Connection string**을 복사하면 다음 형태입니다.

```
postgresql://USER:PASSWORD@HOST/dbname?sslmode=require
```

---

## 2. Spring용 JDBC URL로 변환

위 URL을 Spring Boot JDBC 형식으로 바꿉니다.

- **형식**: `jdbc:postgresql://HOST:PORT/DBNAME`
- **SSL 필요 시**: `jdbc:postgresql://HOST:PORT/DBNAME?sslmode=require`그러러

Neon 예시:

- Connection string: `postgresql://myuser:mypass@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require`
- JDBC URL: `jdbc:postgresql://ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require`  
  (일부 서비스는 포트가 5432가 아닐 수 있으므로 `:5432`를 붙일 수 있음)

---

## 3. 환경 변수 설정

원격 DB를 쓰려면 **prod** 프로파일과 아래 환경 변수를 설정합니다.

| 환경 변수 | 설명 | 예시 |
|-----------|------|------|
| `SPRING_PROFILES_ACTIVE` | 사용할 프로파일 | `prod` |
| `SPRING_DATASOURCE_URL` | JDBC URL | `jdbc:postgresql://host:5432/dbname?sslmode=require` |
| `SPRING_DATASOURCE_USERNAME` | DB 사용자명 | `myuser` |
| `SPRING_DATASOURCE_PASSWORD` | DB 비밀번호 | `mypassword` |

### Windows (PowerShell, 현재 터미널만)

```powershell
$env:SPRING_PROFILES_ACTIVE = "prod"
$env:SPRING_DATASOURCE_URL = "jdbc:postgresql://YOUR_HOST:5432/YOUR_DB?sslmode=require"
$env:SPRING_DATASOURCE_USERNAME = "YOUR_USER"
$env:SPRING_DATASOURCE_PASSWORD = "YOUR_PASSWORD"
```

### Windows (.env 파일 사용 시)

`backend` 폴더에 `.env` 파일을 만들고 (이미 있다면 아래 내용 추가):

```env
SPRING_PROFILES_ACTIVE=prod
SPRING_DATASOURCE_URL=jdbc:postgresql://YOUR_HOST:5432/YOUR_DB?sslmode=require
SPRING_DATASOURCE_USERNAME=YOUR_USER
SPRING_DATASOURCE_PASSWORD=YOUR_PASSWORD
```

IDE에서 `.env`를 로드하는 플러그인을 쓰거나, 실행 설정에서 환경 변수로 위 값을 넣으면 됩니다.

### IntelliJ / Cursor에서 실행 시

1. Run/Debug Configurations 열기
2. Spring Boot 앱 선택
3. **Environment variables**에 위 네 개 변수 입력
4. **Active profiles**에 `prod` 입력

---

## 4. 백엔드 실행

환경 변수를 설정한 뒤 백엔드를 실행하면 **prod**일 때 `application-prod.yml`이 적용되어 PostgreSQL에 연결됩니다.

```powershell
cd backend
mvn spring-boot:run
```

또는 JAR 실행 시:

```powershell
java -Dspring.profiles.active=prod -jar target/jjajo-backend-0.0.1-SNAPSHOT.jar
```

- **prod 미설정**: 기존처럼 H2 인메모리 사용 (로컬 개발)
- **prod + 위 환경 변수 설정**: 원격 PostgreSQL 사용, 테이블은 `ddl-auto: update`로 자동 생성/수정

---

## 5. 동작 확인

1. 백엔드 로그에 `PostgreSQLDialect` 또는 `HikariPool` 관련 로그가 보이면 PostgreSQL 연결된 것입니다.
2. Google 로그인 후 메인 페이지에서 일정을 추가하면 `schedules` 테이블에 회원별로 저장됩니다.
3. DB 클라이언트(DBeaver, pgAdmin, Supabase SQL Editor 등)로 해당 DB에 접속해 `users`, `goals`, `schedules` 테이블이 생겼는지 확인할 수 있습니다.

---

## 6. 정리

| 항목 | 로컬 개발 (기본) | 원격 DB 사용 |
|------|------------------|--------------|
| 프로파일 | (없음 또는 default) | `prod` |
| DB | H2 인메모리 | PostgreSQL (환경 변수로 URL/계정 지정) |
| 스키마 | 앱 재시작 시 `create`로 초기화 | `update`로 기존 DB에 맞춰 변경 |

원격 DB를 쓰고 싶을 때만 `SPRING_PROFILES_ACTIVE=prod`와 위 세 개 데이터소스 환경 변수를 설정하면 됩니다.
