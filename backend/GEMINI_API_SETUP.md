# Google Gemini API 설정 가이드

## 🤖 JJA-JO는 Google Gemini AI를 사용합니다

이 프로젝트는 **OpenAI가 아닌 Google Gemini API**를 사용하여 AI 기능을 제공합니다.

---

## 📋 Gemini API vs OpenAPI 명확화

### ⚠️ 용어 구분

| 용어 | 설명 | 역할 |
|------|------|------|
| **Gemini API** | Google의 생성형 AI API | 실제 AI 기능 제공 (대화, 계획 수립) |
| **OpenAPI/Swagger** | API 문서화 표준 | API 문서 자동 생성 (개발자용) |
| **Spring AI** | Spring 프레임워크 AI 통합 | Gemini API를 Spring Boot에 통합 |

### 🎯 우리 프로젝트에서의 사용

```
사용자 메시지
     ↓
Spring Boot (Backend)
     ↓
Spring AI Framework
     ↓
Google Gemini API ← 실제 AI 처리
     ↓
AI 응답 반환
```

---

## 🔑 Gemini API Key 발급

### 1. Google AI Studio 접속

[https://makersuite.google.com/app/apikey](https://makersuite.google.com/app/apikey)

### 2. API Key 생성

1. "Create API Key" 버튼 클릭
2. 프로젝트 선택 또는 새 프로젝트 생성
3. API Key 복사 (한 번만 표시됨!)

### 3. API Key 형식

```
AIzaSyD...your-key-here...xyz
```

---

## ⚙️ 프로젝트 설정

### 방법 1: 환경 변수 설정 (권장)

**Windows (PowerShell)**
```powershell
$env:GEMINI_API_KEY="your-gemini-api-key"
```

**Mac/Linux**
```bash
export GEMINI_API_KEY="your-gemini-api-key"
```

### 방법 2: application.yml 설정

```yaml
spring:
  ai:
    vertex:
      ai:
        gemini:
          api-key: ${GEMINI_API_KEY:your-default-key}
          project-id: jjajo-project
          location: us-central1
          model: gemini-2.0-flash-exp
```

### 방법 3: 실행 시 파라미터

```bash
./mvnw spring-boot:run -Dspring-boot.run.arguments=--gemini.api.key=your-key
```

---

## 🧪 API Key 테스트

### cURL로 테스트

```bash
curl -X POST http://localhost:8080/api/v1/conversations/chat \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-gemini-api-key" \
  -d '{
    "userId": "test-user",
    "message": "안녕하세요"
  }'
```

### Swagger UI로 테스트

1. http://localhost:8080/swagger-ui.html 접속
2. 우측 상단 "Authorize" 버튼 클릭
3. API Key 입력
4. "Try it out" 버튼으로 테스트

---

## 📊 Gemini API 모델 정보

### 사용 중인 모델

**Gemini 2.0 Flash (Experimental)**

| 특성 | 값 |
|------|-----|
| 모델명 | `gemini-2.0-flash-exp` |
| 컨텍스트 윈도우 | 1,048,576 토큰 (약 100만 토큰) |
| 출력 토큰 | 8,192 토큰 |
| 속도 | 매우 빠름 ⚡ |
| 비용 | 무료 (실험 단계) |
| 특징 | 멀티모달, 다국어 지원 |

### 모델 변경 방법

`application.yml` 파일에서 변경:

```yaml
spring:
  ai:
    vertex:
      ai:
        gemini:
          model: gemini-2.0-flash-exp  # 또는 gemini-pro
```

---

## 🔐 보안 모범 사례

### ❌ 하지 말아야 할 것

```java
// BAD: 코드에 하드코딩
String apiKey = "AIzaSyD...";  // 절대 금지!
```

```yaml
# BAD: application.yml에 직접 작성 (Git에 커밋됨)
gemini:
  api-key: AIzaSyD...  # 위험!
```

### ✅ 해야 할 것

```java
// GOOD: 환경 변수 사용
@Value("${GEMINI_API_KEY}")
private String apiKey;
```

```yaml
# GOOD: 환경 변수 참조
gemini:
  api-key: ${GEMINI_API_KEY}
```

### .gitignore 확인

```gitignore
# API Keys
.env
*.key
application-local.yml
```

---

## 🌐 API 엔드포인트

### 백엔드에서 Gemini API 호출

```java
@Service
public class GeminiChatAdapter {
    
    @Value("${GEMINI_API_KEY}")
    private String apiKey;
    
    public String chat(String prompt, String userApiKey) {
        // Spring AI를 통해 Gemini API 호출
        // 실제 엔드포인트: https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash-exp:generateContent
    }
}
```

### 프론트엔드에서 백엔드 호출

```typescript
const response = await fetch('/api/v1/conversations/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': userGeminiApiKey  // 사용자의 Gemini API Key
  },
  body: JSON.stringify({
    userId: 'user-123',
    message: '토익 공부 계획 세우고 싶어요'
  })
});
```

---

## 💰 비용 및 제한

### Gemini API 무료 할당량

| 모델 | 요청/분 | 요청/일 |
|------|---------|---------|
| Gemini 2.0 Flash | 15 | 1,500 |
| Gemini Pro | 60 | 무제한 |

### 비용 (유료 전환 시)

- Gemini 2.0 Flash: 아직 무료 (실험 단계)
- Gemini Pro: $0.00025 / 1,000자

### 할당량 초과 시

```json
{
  "error": {
    "code": 429,
    "message": "Resource exhausted: quota exceeded"
  }
}
```

**해결 방법**:
1. 요청 속도 제한 (Rate Limiting)
2. 캐싱 전략
3. 유료 플랜 전환

---

## 🐛 트러블슈팅

### 1. "API Key not valid"

**원인**: API Key가 잘못되었거나 만료됨

**해결**:
```bash
# API Key 재발급
https://makersuite.google.com/app/apikey

# 환경 변수 재설정
export GEMINI_API_KEY="new-key"
```

### 2. "Quota exceeded"

**원인**: 할당량 초과

**해결**:
- 요청 빈도 줄이기
- 캐싱 활용
- 유료 플랜 고려

### 3. "Model not found"

**원인**: 모델명이 잘못됨

**해결**:
```yaml
# application.yml 확인
spring:
  ai:
    vertex:
      ai:
        gemini:
          model: gemini-2.0-flash-exp  # 정확한 모델명
```

---

## 📚 참고 자료

### 공식 문서

- [Google AI Studio](https://makersuite.google.com/)
- [Gemini API 문서](https://ai.google.dev/docs)
- [Spring AI 문서](https://docs.spring.io/spring-ai/reference/)
- [Vertex AI 가격](https://cloud.google.com/vertex-ai/pricing)

### 프로젝트 문서

- API 명세서: `backend/API_SPECIFICATION.md`
- 구현 보고서: `backend/IMPLEMENTATION_SUMMARY.md`
- Swagger UI: http://localhost:8080/swagger-ui.html

---

## 🎯 요약

| 항목 | 내용 |
|------|------|
| **AI 엔진** | Google Gemini (NOT OpenAI) |
| **API Key 발급** | https://makersuite.google.com/app/apikey |
| **모델** | gemini-2.0-flash-exp |
| **인증 방식** | HTTP 헤더 `X-API-Key` |
| **비용** | 무료 (실험 단계) |
| **제한** | 15 요청/분, 1,500 요청/일 |

---

**💡 중요**: OpenAPI/Swagger는 API 문서화 도구일 뿐이며, 실제 AI 기능은 Google Gemini API로 제공됩니다!

**📧 문의**: support@jjajo.com  
**📅 업데이트**: 2026-01-21
