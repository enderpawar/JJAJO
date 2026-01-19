/**
 * API 관련 타입 정의
 */

export interface ApiKeyValidationRequest {
  apiKey: string
}

export interface ApiKeyValidationResponse {
  valid: boolean
  message: string
  modelInfo?: string
}

export interface ApiError {
  message: string
  status?: number
}
