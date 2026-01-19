# 짜조 백엔드

Spring Boot 3.4 + Spring AI 기반의 AI 일정 플래너 백엔드

## 🚀 시작하기

### 빌드 및 실행
```bash
./mvnw clean install
./mvnw spring-boot:run
```

서버는 http://localhost:8080 에서 실행됩니다.

## 📁 프로젝트 구조 (Clean Architecture)

```
src/main/java/com/jjajo/
├── domain/                # 도메인 레이어
│   └── model/            # 도메인 모델
│       └── ApiKeyValidation.java
├── application/          # 애플리케이션 레이어
│   ├── port/
│   │   ├── in/          # 인바운드 포트 (유스케이스)
│   │   │   └── ValidateApiKeyUseCase.java
│   │   └── out/         # 아웃바운드 포트
│   │       └── GeminiPort.java
│   └── service/         # 서비스 구현
│       └── ApiKeyValidationService.java
├── infrastructure/       # 인프라 레이어
│   └── gemini/          # Gemini API 연동
│       └── GeminiAdapter.java
└── presentation/         # 프레젠테이션 레이어
    ├── controller/      # REST 컨트롤러
    │   └── ApiKeyController.java
    ├── dto/            # 데이터 전송 객체
    │   ├── ApiKeyValidationRequest.java
    │   └── ApiKeyValidationResponse.java
    └── config/         # 설정
        └── WebConfig.java
```

## 🏗 아키텍처 원칙

### Clean Architecture
- **도메인 레이어**: 비즈니스 로직과 엔티티
- **애플리케이션 레이어**: 유스케이스와 포트
- **인프라 레이어**: 외부 시스템 연동
- **프레젠테이션 레이어**: API 엔드포인트

### Hexagonal Architecture (Ports & Adapters)
- 포트를 통한 느슨한 결합
- 어댑터 패턴으로 외부 의존성 격리

## 📡 API 엔드포인트

### API 키 유효성 검증
```
POST /api/v1/apikey/validate
Content-Type: application/json

{
  "apiKey": "AIza..."
}
```

**응답 (성공)**
```json
{
  "valid": true,
  "message": "API 키가 유효합니다",
  "modelInfo": "Gemini API 연결 성공"
}
```

**응답 (실패)**
```json
{
  "valid": false,
  "message": "API 키가 유효하지 않거나 권한이 없습니다",
  "modelInfo": null
}
```

## 🔐 보안 원칙

### BYOK (Bring Your Own Key)
- 사용자가 자신의 Gemini API 키를 제공
- 서버는 DB에 키를 저장하지 않음
- 요청마다 동적으로 Gemini Client 구성

## 🛠 기술 스택

- **Java 17** - LTS 버전
- **Spring Boot 3.4** - 프레임워크
- **Spring AI** - AI 통합
- **Lombok** - 보일러플레이트 코드 감소
- **Maven** - 빌드 도구
