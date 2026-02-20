/**
 * 날짜 관련 유틸리티 함수
 */

/**
 * 날짜를 YYYY-MM-DD 형식으로 변환
 */
export function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * 날짜를 YYYY년 MM월 형식으로 변환
 */
export function formatYearMonth(date: Date): string {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  return `${year}년 ${month}월`
}

/**
 * 날짜를 MM월 DD일(요일) 형식으로 변환
 */
export function formatDateWithDay(date: Date): string {
  const month = date.getMonth() + 1
  const day = date.getDate()
  const dayNames = ['일', '월', '화', '수', '목', '금', '토']
  const dayName = dayNames[date.getDay()]
  return `${month}월 ${day}일(${dayName})`
}

/**
 * 두 날짜가 같은 날인지 확인
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  )
}

/**
 * 특정 월의 모든 날짜를 가져옴 (이전/다음 월 포함)
 * @param weekStartsMonday true면 월요일 시작 (dew 스타일), false면 일요일 시작
 */
export function getCalendarDays(year: number, month: number, weekStartsMonday = false): Date[] {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)

  if (weekStartsMonday) {
    // 월요일 시작: 그리드 첫 칸 = 해당 주 월요일
    const daysFromMonday = (firstDay.getDay() + 6) % 7
    const startDate = new Date(year, month, 1 - daysFromMonday)
    const totalCells = 42
    const days: Date[] = []
    const current = new Date(startDate)
    for (let i = 0; i < totalCells; i++) {
      days.push(new Date(current))
      current.setDate(current.getDate() + 1)
    }
    return days
  }

  const startDate = new Date(firstDay)
  startDate.setDate(startDate.getDate() - firstDay.getDay())

  const endDate = new Date(lastDay)
  endDate.setDate(endDate.getDate() + (6 - lastDay.getDay()))

  const days: Date[] = []
  const current = new Date(startDate)
  while (current <= endDate) {
    days.push(new Date(current))
    current.setDate(current.getDate() + 1)
  }
  return days
}

/**
 * 시간을 HH:mm 형식으로 변환
 */
export function formatTime(time: string): string {
  return time
}

/**
 * 오늘인지 확인
 */
export function isToday(date: Date): boolean {
  return isSameDay(date, new Date())
}
