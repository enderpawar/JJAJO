/**
 * JWT 토큰 저장 (Safari 크로스 사이트 추적 방지 회피용)
 * localStorage 사용 - 탭 종료 후에도 로그인 유지 (토큰 만료 7일)
 */
const TOKEN_KEY = 'jjajo_auth_token'

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token)
  } catch {
    // quota exceeded 등
  }
}

export function clearToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY)
  } catch {
    // ignore
  }
}
