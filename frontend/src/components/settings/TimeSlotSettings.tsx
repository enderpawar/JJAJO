import { useState } from 'react'
import { Clock, Eye, EyeOff, CalendarDays } from 'lucide-react'
import { useSettingsStore } from '@/stores/settingsStore'
import { useToastStore } from '@/stores/toastStore'
import { TIME_SLOT_LABELS, WEEKDAY_LABELS, DEFAULT_DAYS_OFF, WeekdayCode } from '@/types/settings'

export function TimeSlotSettings() {
  const { settings, updateTimeSlotPreferences, updateDaysOff } = useSettingsStore()
  const { addToast } = useToastStore()
  const [preferences, setPreferences] = useState(settings.timeSlotPreferences)
  const [daysOff, setDaysOff] = useState<WeekdayCode[]>(settings.daysOff ?? DEFAULT_DAYS_OFF)

  const DAY_ORDER: WeekdayCode[] = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']

  // 우선순위 변경 (드래그 앤 드롭 대신 버튼으로)
  const handlePriorityChange = (index: number, direction: 'up' | 'down') => {
    const newPreferences = [...preferences]
    
    if (direction === 'up' && index > 0) {
      // 위로 이동 (우선순위 높아짐)
      const temp = newPreferences[index]
      newPreferences[index] = newPreferences[index - 1]
      newPreferences[index - 1] = temp
      
      // priority 값도 교체
      newPreferences[index].priority = index + 1
      newPreferences[index - 1].priority = index
    } else if (direction === 'down' && index < newPreferences.length - 1) {
      // 아래로 이동 (우선순위 낮아짐)
      const temp = newPreferences[index]
      newPreferences[index] = newPreferences[index + 1]
      newPreferences[index + 1] = temp
      
      // priority 값도 교체
      newPreferences[index].priority = index + 1
      newPreferences[index + 1].priority = index + 2
    }
    
    setPreferences(newPreferences)
  }

  // 활성화/비활성화 토글
  const handleToggleEnabled = (index: number) => {
    const newPreferences = [...preferences]
    newPreferences[index].enabled = !newPreferences[index].enabled
    setPreferences(newPreferences)
  }

  const toggleDayOff = (day: WeekdayCode) => {
    setDaysOff((prev) =>
      prev.includes(day) ? prev.filter((item) => item !== day) : [...prev, day]
    )
  }

  // 저장
  const handleSave = () => {
    updateTimeSlotPreferences(preferences)
    updateDaysOff(daysOff)
    addToast('시간대/쉬는 날 설정이 저장되었습니다.')
  }

  // 초기화
  const handleReset = () => {
    const { resetToDefaults } = useSettingsStore.getState()
    resetToDefaults()
    setPreferences(useSettingsStore.getState().settings.timeSlotPreferences)
    setDaysOff(useSettingsStore.getState().settings.daysOff)
    addToast('기본 설정으로 초기화되었습니다.')
  }

  return (
    <div className="space-y-6">
      {/* 쉬는 날 선택 */}
      <div className="bg-notion-bg border border-notion-border rounded-lg p-4">
        <h3 className="font-semibold text-notion-text mb-2 flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-primary-500" />
          쉬는 날 설정
        </h3>
        <p className="text-sm text-notion-muted mb-4">
          선택된 요일에는 AI가 자동 일정을 배치하지 않아요.
        </p>
        <div className="grid grid-cols-7 gap-2">
          {DAY_ORDER.map((day) => {
            const active = daysOff.includes(day)
            return (
              <button
                key={day}
                type="button"
                onClick={() => toggleDayOff(day)}
                className={`py-2 rounded-notion text-sm font-medium transition-colors border ${
                  active
                    ? 'bg-primary-500 text-white border-primary-500/30'
                    : 'bg-notion-sidebar border-notion-border text-notion-muted hover:bg-notion-hover hover:text-notion-text'
                }`}
              >
                {WEEKDAY_LABELS[day]}
              </button>
            )
          })}
        </div>
      </div>

      {/* 설명 */}
      <div className="bg-notion-bg border border-notion-border rounded-lg p-4">
        <h3 className="font-semibold text-notion-text mb-2 flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary-500" />
          시간대 우선순위 설정
        </h3>
        <p className="text-sm text-notion-muted">
          AI가 일정을 자동 배치할 때, 어느 시간대를 우선적으로 사용할지 순서를 정할 수 있습니다.
          <br />
          위에 있을수록 우선순위가 높습니다.
        </p>
      </div>

      {/* 시간대 리스트 */}
      <div className="space-y-3">
        {preferences.map((pref, index) => (
          <div
            key={pref.period}
            className={`
              bg-notion-bg border rounded-lg p-4 transition-colors
              ${pref.enabled ? 'border-primary-500/40' : 'border-notion-border opacity-60'}
            `}
          >
            <div className="flex items-center gap-4">
              {/* 우선순위 번호 */}
              <div
                className={`
                  w-10 h-10 rounded-full flex items-center justify-center
                  font-bold text-lg
                  ${
                    pref.enabled
                      ? 'bg-primary-500 text-white'
                      : 'bg-notion-hover text-notion-muted'
                  }
                `}
              >
                {index + 1}
              </div>

              {/* 시간대 정보 */}
              <div className="flex-1">
                <div className="font-semibold text-notion-text">
                  {TIME_SLOT_LABELS[pref.period]}
                </div>
                <div className="text-sm text-notion-muted">
                  {pref.enabled ? '활성화됨' : '비활성화됨'}
                </div>
              </div>

              {/* 컨트롤 버튼들 */}
              <div className="flex items-center gap-2">
                {/* 활성화/비활성화 토글 */}
                <button
                  onClick={() => handleToggleEnabled(index)}
                  className={`
                    p-2 rounded-lg transition-colors
                    ${
                      pref.enabled
                        ? 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/20'
                        : 'bg-notion-hover text-notion-muted hover:text-notion-text'
                    }
                  `}
                  title={pref.enabled ? '비활성화' : '활성화'}
                >
                  {pref.enabled ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                </button>

                {/* 우선순위 조정 버튼 */}
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => handlePriorityChange(index, 'up')}
                    disabled={index === 0}
                    className="p-1 hover:bg-notion-hover rounded disabled:opacity-30 disabled:cursor-not-allowed"
                    title="위로 이동"
                  >
                    <svg className="w-4 h-4 text-notion-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handlePriorityChange(index, 'down')}
                    disabled={index === preferences.length - 1}
                    className="p-1 hover:bg-notion-hover rounded disabled:opacity-30 disabled:cursor-not-allowed"
                    title="아래로 이동"
                  >
                    <svg className="w-4 h-4 text-notion-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 액션 버튼 */}
      <div className="flex gap-3 pt-4 border-t border-notion-border">
        <button onClick={handleReset} className="flex-1 btn-secondary">
          기본값으로 초기화
        </button>
        <button onClick={handleSave} className="flex-1 btn-primary">
          설정 저장
        </button>
      </div>
    </div>
  )
}
