# Quick Replies 빠른 통합 가이드

## 🚀 3단계 통합

### 1단계: Import 추가
```typescript
// AiChatPanel.tsx 상단에 추가
import QuickReplyButtons from './QuickReplyButtons'
import { generateQuickReplies } from '@/utils/quickReplyGenerator'
```

### 2단계: Quick Replies 생성 (AI 응답 후)
```typescript
// 기존 코드에서 AI 응답 추가하는 부분 찾기
const aiMessage: ChatMessage = {
  id: `msg-${Date.now()}-ai`,
  role: 'assistant',
  content: response.aiMessage,
  timestamp: new Date().toISOString(),
}

// 이 코드 바로 위에 추가:
const quickReplies = generateQuickReplies(response.collectedInfo || {})
if (quickReplies.length > 0) {
  aiMessage.type = 'quick-reply'
  aiMessage.quickReplies = quickReplies
}

addMessage(aiMessage)
```

### 3단계: Quick Reply 선택 핸들러
```typescript
// AiChatPanel 컴포넌트 안에 추가
const handleQuickReplySelect = (value: string) => {
  if (isLoading) return
  
  setInputValue(value)
  handleSendMessage()
}
```

### 4단계: 메시지 렌더링 시 QuickReplyButtons 표시
```typescript
// 메시지 맵핑하는 부분 ({messages.map((message) => ...)에서)
// message.content 렌더링 후, 다음 코드 추가:

{message.type === 'quick-reply' && message.quickReplies && (
  <QuickReplyButtons
    quickReplies={message.quickReplies}
    onSelect={handleQuickReplySelect}
    disabled={isLoading}
  />
)}
```

---

## 📊 완성 후 결과

### Before
```
AI: 언제까지 달성하고 싶으신가요?
[입력창] _____________________ [전송]

사용자: (직접 타이핑) "3개월 안에"
```

### After
```
AI: 언제까지 달성하고 싶으신가요?

┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ ⚡ 1개월 안에 │ │ 📅 3개월 안에 │ │ 🕐 6개월 안에 │
└──────────────┘ └──────────────┘ └──────────────┘

사용자: (클릭 한 번!)
```

---

## 🎯 테스트 시나리오

1. "토익 800점 달성하고 싶어" 입력
2. AI: "언제까지?" + Quick Replies 표시 ✅
3. [3개월 안에] 버튼 클릭
4. AI: "하루에 몇 시간?" + Quick Replies 표시 ✅
5. [하루 3-4시간] 버튼 클릭
6. AI: "충분한 정보가 모였습니다!" ✅

⏱️ 총 시간: 10초 (타이핑 불필요!)

---

## 🔥 추가 개선 아이디어

### "지금 당장" 모드 미리보기
```typescript
// MainPage.tsx에 탭 추가
const [mode, setMode] = useState<'full' | 'morning' | 'now'>('full')

<div className="flex gap-2 mb-4">
  <button onClick={() => setMode('full')}>🌐 전체</button>
  <button onClick={() => setMode('morning')}>🌅 오전</button>
  <button onClick={() => setMode('now')}>⚡ 지금 당장</button>
</div>

{mode === 'now' && (
  <div className="bg-orange-50 p-4 rounded-lg">
    <h3>지금 바로 시작하기</h3>
    <button>📚 공부 30분</button>
    <button>🏃 운동 30분</button>
    <button>💻 코딩 1시간</button>
  </div>
)}
```

---

## ✅ 체크리스트

- [x] QuickReply 타입 정의
- [x] QuickReplyButtons 컴포넌트
- [x] generateQuickReplies 유틸
- [x] 통합 가이드 작성
- [ ] AiChatPanel에 실제 통합 (위 4단계 적용)
- [ ] 브라우저 테스트
- [ ] 스타일 조정

---

## 🚨 주의사항

1. `handleSendMessage` 함수에서 `inputValue`를 사용하는지 확인
2. Quick Reply 클릭 시 `setInputValue(value)` 후 `handleSendMessage()` 호출
3. 이미 로딩 중이면 클릭 무시 (`disabled={isLoading}`)

