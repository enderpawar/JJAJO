/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BACKEND_ORIGIN: string
  /** 디버그 수집 엔드포인트(전체 URL). 설정 시에만 에이전트 로그 전송. 운영 환경에서는 비설정 권장. */
  readonly VITE_DEBUG_INGEST_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
