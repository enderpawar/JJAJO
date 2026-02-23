/** 배포 시 env 없을 때 사용할 백엔드 오리진 (Cloudflare Pages + Render 기준) */
const FALLBACK_BACKEND_ORIGIN = 'https://jjajo-backend.onrender.com'

/**
 * 백엔드가 200 + HTML 로그인 페이지를 반환할 때 JSON 파싱 에러 방지
 */
export function ensureJsonResponse(response: Response, text: string): void {
  const ct = response.headers.get('content-type') ?? ''
  if (ct.includes('text/html') || text.trimStart().startsWith('<!')) {
    throw new Error('로그인이 필요합니다')
  }
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly responseText?: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export type ApiRequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  body?: unknown
  headers?: Record<string, string>
  /** false면 응답 본문을 파싱하지 않음 (예: 204 No Content) */
  parseJson?: boolean
}

/**
 * 쿠키 인증 + JSON 검증이 적용된 공통 fetch 래퍼
 * - credentials: 'include' 고정
 * - 실패 시 ApiError throw (statusCode로 401/403/404 구분 가능)
 * - HTML 응답(로그인 리다이렉트) 시 파싱 전 에러
 */
export async function apiRequest<T>(url: string, options: ApiRequestOptions = {}): Promise<T> {
  const { method = 'GET', body, headers = {}, parseJson = true } = options
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData
  const init: RequestInit = {
    method,
    credentials: 'include',
    headers: {
      ...(body != null && typeof body === 'object' && !isFormData
        ? { 'Content-Type': 'application/json' }
        : {}),
      ...headers,
    },
    ...(body != null && method !== 'GET'
      ? {
          body: isFormData ? (body as FormData) : typeof body === 'string' ? body : JSON.stringify(body),
        }
      : {}),
  }

  const response = await fetch(url, init)
  if (!response.ok) {
    const text = await response.text().catch(() => response.statusText)
    const message = response.status === 401 ? '로그인이 필요합니다' : (text || `${response.status} ${response.statusText}`)
    throw new ApiError(message, response.status, text)
  }

  if (!parseJson) return undefined as T
  const text = await response.text()
  ensureJsonResponse(response, text)
  return JSON.parse(text) as T
}

/**
 * 백엔드 API 베이스 URL (쿠키 기반 인증 시 같은 오리진으로 요청해야 쿠키 전송됨)
 * - 항상 오리진만 반환(경로 제거). 경로가 포함된 env 시 registrationId 오인으로 404 방지.
 * - 개발: VITE_BACKEND_ORIGIN 없으면 '' → Vite 프록시 사용
 * - 프로덕션: 없으면 FALLBACK_BACKEND_ORIGIN 사용 (배포 환경 로그인 정상화)
 */
export function getApiBase(): string {
  const raw = import.meta.env.VITE_BACKEND_ORIGIN
  if (!raw || typeof raw !== 'string') {
    return import.meta.env.DEV ? '' : FALLBACK_BACKEND_ORIGIN
  }
  try {
    const u = new URL(raw.replace(/\/$/, ''))
    return u.origin
  } catch {
    return import.meta.env.DEV ? '' : FALLBACK_BACKEND_ORIGIN
  }
}
