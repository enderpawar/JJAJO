import type { 
  Question, 
  PlanResponse, 
  QuestionGenerationRequest, 
  PlanGenerationRequest,
  RoadmapStyle,
  WeekOptions,
  RoadmapOptionsRequest,
  GoalSummary
} from '@/types/goalPlanning'
import { useApiKeyStore } from '@/stores/apiKeyStore'

const API_BASE_URL = '/api/goals'

/**
 * API 키를 헤더에 추가하는 헬퍼 함수
 */
function getHeaders(): HeadersInit {
  const apiKey = useApiKeyStore.getState().apiKey
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  }
  
  if (apiKey) {
    headers['X-API-Key'] = apiKey
  }
  
  return headers
}

/**
 * AI 맞춤 질문 생성
 */
export async function generateQuestions(
  request: QuestionGenerationRequest
): Promise<Question[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/generate-questions`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      throw new Error('질문 생성 실패')
    }

    return await response.json()
  } catch (error) {
    console.error('질문 생성 중 오류:', error)
    throw new Error('질문 생성에 실패했습니다')
  }
}

/**
 * AI 맞춤 계획 생성 (질문 답변 기반)
 */
export async function generatePlan(
  request: PlanGenerationRequest
): Promise<PlanResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/generate-plan`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      throw new Error('계획 생성 실패')
    }

    return await response.json()
  } catch (error) {
    console.error('계획 생성 중 오류:', error)
    throw new Error('계획 생성에 실패했습니다')
  }
}

/**
 * 간소화된 AI 계획 생성 (질문 없이 바로 생성)
 */
export async function generateDirectPlan(
  goalTitle: string,
  goalDescription: string | undefined,
  deadline: string
): Promise<PlanResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/generate-plan-direct`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        goalTitle,
        goalDescription,
        deadline,
      }),
    })

    if (!response.ok) {
      throw new Error('계획 생성 실패')
    }

    return await response.json()
  } catch (error) {
    console.error('간소화 계획 생성 중 오류:', error)
    throw new Error('계획 생성에 실패했습니다')
  }
}

/**
 * 로드맵 스타일 옵션 생성 (속성/탄탄/실전)
 */
export async function generateRoadmapStyles(
  request: RoadmapOptionsRequest
): Promise<RoadmapStyle[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/generate-roadmap-options`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      throw new Error('로드맵 스타일 생성 실패')
    }

    return await response.json()
  } catch (error) {
    console.error('로드맵 스타일 생성 중 오류:', error)
    throw new Error('로드맵 스타일 생성에 실패했습니다')
  }
}

/**
 * 목표 요약 생성
 */
export async function generateGoalSummary(
  request: RoadmapOptionsRequest
): Promise<GoalSummary> {
  try {
    const response = await fetch(`${API_BASE_URL}/generate-goal-summary`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      throw new Error('목표 요약 생성 실패')
    }

    return await response.json()
  } catch (error) {
    console.error('목표 요약 생성 중 오류:', error)
    throw new Error('목표 요약 생성에 실패했습니다')
  }
}

/**
 * 주차별 학습 옵션 생성
 */
export async function generateWeekOptions(
  goalTitle: string,
  roadmapStyle: string,
  weekNumber: number,
  weekTheme: string
): Promise<WeekOptions> {
  try {
    const params = new URLSearchParams({
      goalTitle,
      roadmapStyle,
      weekNumber: weekNumber.toString(),
      weekTheme,
    })

    const response = await fetch(`${API_BASE_URL}/week-options?${params}`, {
      method: 'GET',
      headers: getHeaders(),
    })

    if (!response.ok) {
      throw new Error('주차별 옵션 생성 실패')
    }

    return await response.json()
  } catch (error) {
    console.error('주차별 옵션 생성 중 오류:', error)
    throw new Error('주차별 옵션 생성에 실패했습니다')
  }
}
