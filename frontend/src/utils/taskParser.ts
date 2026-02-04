/**
 * '할일내용 소요시간' 문자열 리스트를 파싱하여 Task 객체 리스트로 변환
 *
 * 입력 예시: "운동 2, 프로젝트 4, 스파이더맨 2 2"
 * - 쉼표(,)로 항목 구분
 * - 각 항목 내 마지막 공백 기준: 앞=title, 뒤=duration
 */

export interface Task {
  title: string
  duration: number // 소요시간 (시간 단위)
}

export interface ParseError {
  index: number
  raw: string
  reason: string
}

export interface ParseTaskListResult {
  tasks: Task[]
  errors: ParseError[]
}

/** duration이 유효한 양수인지 검사 */
function isValidDuration(value: string): boolean {
  const num = Number(value)
  return !Number.isNaN(num) && num > 0 && Number.isFinite(num)
}

/** 단일 항목 파싱: 마지막 공백 기준으로 title과 duration 분리 */
function parseSingleItem(raw: string): { title: string; duration: number } | null {
  const trimmed = raw.trim()
  if (!trimmed) return null

  const lastSpaceIndex = trimmed.lastIndexOf(' ')
  if (lastSpaceIndex === -1) {
    return null // 공백이 없으면 duration 분리 불가
  }

  const title = trimmed.slice(0, lastSpaceIndex).trim()
  const durationStr = trimmed.slice(lastSpaceIndex + 1).trim()

  if (!title) return null
  if (!durationStr) return null

  if (!isValidDuration(durationStr)) {
    return null
  }

  const duration = Number(durationStr)
  return { title, duration }
}

/**
 * 사용자 입력 문자열을 파싱하여 Task 리스트로 변환
 *
 * @param input - "할일1 2, 할일2 4, 스파이더맨 2 2" 형태의 문자열
 * @returns 성공한 Task 목록과 실패한 항목의 에러 목록
 */
export function parseTaskList(input: string): ParseTaskListResult {
  const tasks: Task[] = []
  const errors: ParseError[] = []

  if (typeof input !== 'string') {
    return {
      tasks: [],
      errors: [{ index: 0, raw: String(input), reason: '입력은 문자열이어야 합니다.' }],
    }
  }

  const items = input.split(',').map((s) => s.trim()).filter(Boolean)

  items.forEach((raw, index) => {
    try {
      const parsed = parseSingleItem(raw)
      if (parsed) {
        tasks.push(parsed)
      } else {
        errors.push({
          index,
          raw,
          reason: '형식이 올바르지 않습니다. (예: "할일 제목 2")',
        })
      }
    } catch {
      errors.push({
        index,
        raw,
        reason: '파싱 중 오류가 발생했습니다.',
      })
    }
  })

  return { tasks, errors }
}
