import { useState } from 'react'
import { X, UploadCloud } from 'lucide-react'
import { useApiKeyStore } from '@/stores/apiKeyStore'
import { useCalendarStore } from '@/stores/calendarStore'
import type { FixedScheduleCandidate, TimetableDayOfWeek } from '@/types/timetable'
import type { Todo } from '@/types/calendar'
import { uploadTimetableImage, saveFixedSchedules } from '@/services/timetableService'
import { useToastStore } from '@/stores/toastStore'

interface ImportTimetableModalProps {
  isOpen: boolean
  onClose: () => void
}

interface EditableCandidate extends FixedScheduleCandidate {
  id: string
  selected: boolean
}

const DAY_OPTIONS: { value: TimetableDayOfWeek; label: string }[] = [
  { value: 'MON', label: '월' },
  { value: 'TUE', label: '화' },
  { value: 'WED', label: '수' },
  { value: 'THU', label: '목' },
  { value: 'FRI', label: '금' },
  { value: 'SAT', label: '토' },
  { value: 'SUN', label: '일' },
]

function dayOfWeekToJsIndex(day: TimetableDayOfWeek): number {
  // JS Date.getDay(): 0=Sun,1=Mon,...
  switch (day) {
    case 'MON':
      return 1
    case 'TUE':
      return 2
    case 'WED':
      return 3
    case 'THU':
      return 4
    case 'FRI':
      return 5
    case 'SAT':
      return 6
    case 'SUN':
    default:
      return 0
  }
}

export function ImportTimetableModal({ isOpen, onClose }: ImportTimetableModalProps) {
  const { addTodos, deleteTodo, setIsBulkSavingTimetable } = useCalendarStore()
  const { addToast } = useToastStore()
  const { apiKey } = useApiKeyStore()

  const [file, setFile] = useState<File | null>(null)
  const [language, setLanguage] = useState<'ko' | 'en' | ''>('ko')
  const [weekStartDay, setWeekStartDay] = useState<TimetableDayOfWeek>('MON')
  const [candidates, setCandidates] = useState<EditableCandidate[]>([])
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [isParsing, setIsParsing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) {
      setFile(f)
      setError(null)
    }
  }

  const handleParse = async () => {
    if (!apiKey?.trim()) {
      setError('설정에서 Gemini API 키를 먼저 입력해주세요.')
      return
    }
    if (!file) {
      setError('시간표 이미지 파일을 선택해주세요.')
      return
    }
    setIsParsing(true)
    setError(null)
    try {
      const raw = await uploadTimetableImage(file, apiKey.trim(), {
        language: language || undefined,
        weekStartDay,
      })
      const editable: EditableCandidate[] = (raw ?? []).map((item, idx) => ({
        id: `${Date.now()}-${idx}`,
        selected: true,
        title: item.title ?? '',
        dayOfWeek: (item.dayOfWeek as TimetableDayOfWeek) ?? 'MON',
        startTime: item.startTime ?? '',
        endTime: item.endTime ?? '',
        location: item.location ?? '',
        notes: item.notes ?? '',
        source: item.source ?? 'ETC',
      }))
      setCandidates(editable)
      if (!startDate || !endDate) {
        const today = new Date()
        const year = today.getFullYear()
        const month = today.getMonth() + 1
        const start = `${year}-${String(month).padStart(2, '0')}-01`
        const end = `${year}-${String(month + 3).padStart(2, '0')}-01`
        setStartDate(start)
        setEndDate(end)
      }
    } catch (e) {
      console.error(e)
      setError(e instanceof Error ? e.message : '시간표 이미지를 파싱하지 못했어요.')
    } finally {
      setIsParsing(false)
    }
  }

  const handleSave = () => {
    const selected = candidates.filter((c) => c.selected)
    if (selected.length === 0) {
      setError('저장할 과목을 최소 1개 이상 선택해주세요.')
      return
    }
    if (!startDate || !endDate) {
      setError('학기 시작일과 종료일을 입력해주세요.')
      return
    }

    const start = new Date(startDate)
    const end = new Date(endDate)
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      setError('학기 시작일과 종료일 형식이 올바르지 않습니다.')
      return
    }
    if (end < start) {
      setError('종료일은 시작일보다 빠를 수 없습니다.')
      return
    }

    // 낙관적 업데이트: 예상 생성 일정을 먼저 캘린더에 반영
    const optimisticTodos: Todo[] = []
    const optimisticIds: string[] = []
    const nowIso = new Date().toISOString()

    selected.forEach((c, idx) => {
      const jsTargetDow = dayOfWeekToJsIndex(c.dayOfWeek as TimetableDayOfWeek)
      const title = c.title || '수업'
      let cursor = new Date(start)
      let counter = 0
      while (cursor <= end) {
        if (cursor.getDay() === jsTargetDow) {
          const dateStr = cursor.toISOString().slice(0, 10)
          const id = `temp-timetable-${Date.now()}-${idx}-${counter}`
          const optimistic: Todo = {
            id,
            clientKey: id,
            title,
            description: c.location || c.notes || '',
            date: dateStr,
            startTime: c.startTime || undefined,
            endTime: c.endTime || undefined,
            status: 'pending',
            priority: 'medium',
            createdBy: 'user',
            createdAt: nowIso,
            updatedAt: nowIso,
          }
          optimisticTodos.push(optimistic)
          optimisticIds.push(id)
          counter += 1
        }
        cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000)
      }
    })

    if (optimisticTodos.length > 0) {
      addTodos(optimisticTodos)
    }

    // 사용자에게는 이미 적용된 것처럼 느껴지게 안내
    if (optimisticTodos.length > 0) {
      addToast(`시간표를 ${optimisticTodos.length}개 일정으로 적용하는 중이에요…`)
    }

    setIsSaving(true)
    setIsBulkSavingTimetable(true)
    setError(null)

    // 실제 저장은 백그라운드에서 수행 (모달은 바로 닫힘)
    ;(async () => {
      try {
        const todos = await saveFixedSchedules({
          startDate,
          endDate,
          items: selected.map(({ id, selected, ...rest }) => rest),
        })
        // 서버 응답 기준으로 교체: 임시 일정 제거 후 실제 일정 추가
        if (optimisticIds.length > 0) {
          optimisticIds.forEach((id) => deleteTodo(id))
        }
        if (todos.length > 0) {
          addTodos(todos)
        }
        addToast(`시간표 적용이 완료됐어요. 총 ${todos.length}개 일정이 생성되었습니다.`)
      } catch (e) {
        console.error(e)
        // 실패 시 낙관적 일정 롤백
        if (optimisticIds.length > 0) {
          optimisticIds.forEach((id) => deleteTodo(id))
        }
        setError(e instanceof Error ? e.message : '고정 일정을 저장하지 못했어요.')
        addToast('시간표 저장에 실패했어요. 네트워크 상태를 확인한 뒤 다시 시도해주세요.')
      } finally {
        setIsSaving(false)
        setIsBulkSavingTimetable(false)
      }
    })()

    // 사용자는 즉시 모달을 빠져나가도록
    onClose()
  }

  const hasCandidates = candidates.length > 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-theme-card rounded-neu-lg border border-theme w-full max-w-4xl max-h-[90vh] flex flex-col theme-transition">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-theme">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-neu bg-primary-500/20 flex items-center justify-center">
              <UploadCloud className="w-5 h-5 text-primary-400" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-theme">시간표 이미지에서 고정 일정 불러오기</h2>
              <p className="text-xs sm:text-sm text-theme-muted">
                에브리타임·학교 포털 등에서 캡처한 시간표 이미지를 올리면, 주간 반복 일정으로 변환해 드려요.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn-icon-tap touch-target p-2 rounded-neu hover:bg-[var(--hover-bg)] text-theme-muted"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 컨텐츠 */}
        <div className="flex-1 overflow-auto p-4 sm:p-5 space-y-4">
          {/* 업로드 섹션 */}
          <div className="bg-theme rounded-neu border border-dashed border-theme p-4 sm:p-5 flex flex-col sm:flex-row gap-4">
            <div className="flex-1 space-y-3">
              <p className="text-sm font-medium text-theme">1. 시간표 이미지 업로드</p>
              <p className="text-xs text-theme-muted">
                에브리타임, 학교 포털, 캘린더 앱 등에서 주간 시간표가 보이도록 캡처한 뒤, PNG/JPG 파일을 올려주세요.
              </p>
              <label className="btn-ghost-tap inline-flex items-center justify-center px-4 py-2 rounded-neu border-2 border-primary-500 text-primary-500 hover:bg-primary-500 hover:text-white text-sm font-medium cursor-pointer w-fit theme-transition">
                <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                {file ? '다른 이미지 선택' : '이미지 선택'}
              </label>
              {file && (
                <p className="text-xs text-theme-muted">
                  선택된 파일: <span className="font-medium text-theme">{file.name}</span>
                </p>
              )}
            </div>
            <div className="w-full sm:w-64 space-y-3">
              <p className="text-sm font-medium text-theme">추가 옵션</p>
              <div className="space-y-2">
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-theme-muted">시간표 언어</span>
                  <select
                    className="bg-theme-card border border-theme rounded-neu px-3 py-2 text-sm text-theme"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value as 'ko' | 'en' | '')}
                  >
                    <option value="ko">한국어 위주</option>
                    <option value="en">영어 위주</option>
                    <option value="">잘 모르겠음</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-theme-muted">주 시작 요일</span>
                  <select
                    className="bg-theme-card border border-theme rounded-neu px-3 py-2 text-sm text-theme"
                    value={weekStartDay}
                    onChange={(e) => setWeekStartDay(e.target.value as TimetableDayOfWeek)}
                  >
                    {DAY_OPTIONS.map((d) => (
                      <option key={d.value} value={d.value}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <button
                type="button"
                onClick={handleParse}
                disabled={isParsing}
                className="btn-action-press w-full mt-2 px-4 py-2 rounded-neu bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isParsing ? '시간표 해석 중...' : '시간표 해석하기'}
              </button>
            </div>
          </div>

          {/* 미리보기 섹션 */}
          {hasCandidates && (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <p className="text-sm font-medium text-theme">
                  2. 인식된 시간표 확인 및 수정
                  <span className="ml-2 text-xs text-theme-muted">(필요하면 요일·시간·강의실을 직접 수정할 수 있어요)</span>
                </p>
                <div className="flex gap-2">
                  <label className="flex items-center gap-1 text-xs text-theme-muted">
                    <span>학기 시작일</span>
                    <input
                      type="date"
                      className="bg-theme-card border border-theme rounded-neu px-2 py-1 text-xs text-theme"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </label>
                  <label className="flex items-center gap-1 text-xs text-theme-muted">
                    <span>종료일</span>
                    <input
                      type="date"
                      className="bg-theme-card border border-theme rounded-neu px-2 py-1 text-xs text-theme"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </label>
                </div>
              </div>

              <div className="border border-theme rounded-neu overflow-auto max-h-80">
                <table className="w-full text-xs">
                  <thead className="bg-theme border-b border-theme sticky top-0 z-10">
                    <tr>
                      <th className="px-3 py-2 text-left text-theme">
                        <input
                          type="checkbox"
                          checked={candidates.every((c) => c.selected)}
                          onChange={(e) =>
                            setCandidates((prev) => prev.map((c) => ({ ...c, selected: e.target.checked })))
                          }
                        />
                      </th>
                      <th className="px-3 py-2 text-left text-theme">과목명</th>
                      <th className="px-3 py-2 text-left text-theme">요일</th>
                      <th className="px-3 py-2 text-left text-theme">시작</th>
                      <th className="px-3 py-2 text-left text-theme">종료</th>
                      <th className="px-3 py-2 text-left text-theme">강의실</th>
                    </tr>
                  </thead>
                  <tbody>
                    {candidates.map((c) => (
                      <tr key={c.id} className="border-b border-theme last:border-b-0">
                        <td className="px-3 py-2 align-middle">
                          <input
                            type="checkbox"
                            checked={c.selected}
                            onChange={(e) =>
                              setCandidates((prev) =>
                                prev.map((x) => (x.id === c.id ? { ...x, selected: e.target.checked } : x))
                              )
                            }
                          />
                        </td>
                        <td className="px-3 py-1">
                          <input
                            type="text"
                            className="w-full bg-transparent border border-theme rounded-neu px-2 py-1 text-xs text-theme"
                            value={c.title}
                            onChange={(e) =>
                              setCandidates((prev) =>
                                prev.map((x) => (x.id === c.id ? { ...x, title: e.target.value } : x))
                              )
                            }
                          />
                        </td>
                        <td className="px-3 py-1">
                          <select
                            className="w-full bg-transparent border border-theme rounded-neu px-2 py-1 text-xs text-theme"
                            value={c.dayOfWeek}
                            onChange={(e) =>
                              setCandidates((prev) =>
                                prev.map((x) => (x.id === c.id ? { ...x, dayOfWeek: e.target.value } : x))
                              )
                            }
                          >
                            {DAY_OPTIONS.map((d) => (
                              <option key={d.value} value={d.value}>
                                {d.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-1">
                          <input
                            type="time"
                            className="w-full bg-transparent border border-theme rounded-neu px-2 py-1 text-xs text-theme"
                            value={c.startTime || ''}
                            onChange={(e) =>
                              setCandidates((prev) =>
                                prev.map((x) => (x.id === c.id ? { ...x, startTime: e.target.value } : x))
                              )
                            }
                          />
                        </td>
                        <td className="px-3 py-1">
                          <input
                            type="time"
                            className="w-full bg-transparent border border-theme rounded-neu px-2 py-1 text-xs text-theme"
                            value={c.endTime || ''}
                            onChange={(e) =>
                              setCandidates((prev) =>
                                prev.map((x) => (x.id === c.id ? { ...x, endTime: e.target.value } : x))
                              )
                            }
                          />
                        </td>
                        <td className="px-3 py-1">
                          <input
                            type="text"
                            className="w-full bg-transparent border border-theme rounded-neu px-2 py-1 text-xs text-theme"
                            value={c.location || ''}
                            onChange={(e) =>
                              setCandidates((prev) =>
                                prev.map((x) => (x.id === c.id ? { ...x, location: e.target.value } : x))
                              )
                            }
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/40 rounded-neu px-3 py-2">
              {error}
            </p>
          )}
        </div>

        {/* 푸터 */}
        <div className="px-5 py-3 border-t border-theme flex items-center justify-end gap-2 bg-theme/80">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-ghost-tap px-3 py-1.5 rounded-neu text-xs font-medium bg-theme-card hover:bg-[var(--hover-bg)] text-theme border border-theme"
            >
              닫기
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!hasCandidates || isSaving}
              className="btn-action-press px-4 py-1.5 rounded-neu text-xs font-medium bg-primary-500 hover:bg-primary-600 text-white disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isSaving ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

