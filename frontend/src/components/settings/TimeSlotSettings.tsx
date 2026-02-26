import { useState } from 'react'
import { Clock, Eye, EyeOff, ChevronDown, ChevronUp } from 'lucide-react'
import { useSettingsStore } from '@/stores/settingsStore'
import { useToastStore } from '@/stores/toastStore'
import { TIME_SLOT_LABELS } from '@/types/settings'

interface TimeSlotSettingsProps {
  /** 모바일에서 세부 항목을 기본 접힘으로 표시 (한 화면에 담기 위함) */
  defaultTimeSlotsExpanded?: boolean
  /** 컴팩트 레이아웃 (간격·패딩·요소 크기 축소) */
  compact?: boolean
}

export function TimeSlotSettings({ defaultTimeSlotsExpanded = true, compact = false }: TimeSlotSettingsProps) {
  const { settings, updateTimeSlotPreferences } = useSettingsStore()
  const { addToast } = useToastStore()
  const [preferences, setPreferences] = useState(settings.timeSlotPreferences)
  const [timeSlotsExpanded, setTimeSlotsExpanded] = useState(defaultTimeSlotsExpanded)

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

  // 저장
  const handleSave = () => {
    updateTimeSlotPreferences(preferences)
    addToast('시간대 설정이 저장되었습니다.')
  }

  // 초기화
  const handleReset = () => {
    const { resetToDefaults } = useSettingsStore.getState()
    resetToDefaults()
    setPreferences(useSettingsStore.getState().settings.timeSlotPreferences)
    addToast('기본 설정으로 초기화되었습니다.')
  }

  return (
    <div className={compact ? 'space-y-3' : 'space-y-6'}>
      {/* 시간대 우선순위 설정 (접기/펼치기 가능) */}
      <div className={`neu-float rounded-neu theme-transition bg-theme-card ${compact ? 'p-3' : 'p-4'}`}>
        <h3 className={`font-semibold text-theme flex items-center gap-2 ${compact ? 'mb-1 text-sm' : 'mb-2'}`}>
          <Clock className={compact ? 'w-4 h-4 text-primary-500' : 'w-5 h-5 text-primary-500'} />
          시간대 우선순위 설정
        </h3>
        <p className={`text-theme-muted ${compact ? 'text-xs mb-2' : 'text-sm mb-3'}`}>
          AI가 일정을 자동 배치할 때, 어느 시간대를 우선적으로 사용할지 순서를 정할 수 있습니다.
          {!compact && <><br />위에 있을수록 우선순위가 높습니다.</>}
          {compact && ' 위에 있을수록 우선순위가 높습니다.'}
        </p>

        <button
          type="button"
          onClick={() => setTimeSlotsExpanded((e) => !e)}
          className={`w-full flex items-center justify-between gap-2 rounded-neu text-left theme-transition bg-[var(--hover-bg)] hover:opacity-90 active:scale-[0.99] min-h-[44px] ${compact ? 'py-2 px-2.5' : 'py-2.5 px-3'}`}
          aria-expanded={timeSlotsExpanded}
        >
          <span className={`text-theme-muted ${compact ? 'text-xs' : 'text-sm'}`}>
            {timeSlotsExpanded ? '세부 항목 접기' : `세부 항목 ${preferences.length}개 · 펼치기`}
          </span>
          {timeSlotsExpanded ? (
            <ChevronUp className={`text-theme-muted shrink-0 ${compact ? 'w-4 h-4' : 'w-5 h-5'}`} />
          ) : (
            <ChevronDown className={`text-theme-muted shrink-0 ${compact ? 'w-4 h-4' : 'w-5 h-5'}`} />
          )}
        </button>

        <div
          className="grid transition-[grid-template-rows] duration-200 ease-out"
          style={{ gridTemplateRows: timeSlotsExpanded ? '1fr' : '0fr' }}
        >
          <div className="overflow-hidden min-h-0 min-w-0">
            <div className={`mt-3 min-w-0 ${compact ? 'space-y-2' : 'space-y-3'}`}>
            {preferences.map((pref, index) => (
              <div
                key={pref.period}
                className={`
                  bg-theme-card rounded-neu theme-transition border-0 min-w-0
                  ${compact ? 'p-2.5' : 'p-4'}
                  ${pref.enabled ? 'shadow-neu-float-date' : 'shadow-neu-float-date opacity-60'}
                `}
              >
                <div className={`flex items-center min-w-0 ${compact ? 'gap-2' : 'gap-4'}`}>
                  {/* 우선순위 번호 */}
                  <div
                    className={`
                      shrink-0 rounded-full flex items-center justify-center font-bold theme-transition
                      ${compact ? 'w-8 h-8 text-sm' : 'w-10 h-10 text-lg'}
                      ${
                        pref.enabled
                          ? 'bg-primary-500 text-white shadow-neu-float-date'
                          : 'bg-theme-card shadow-neu-float-date text-theme-muted'
                      }
                    `}
                  >
                    {index + 1}
                  </div>

                  {/* 시간대 정보 */}
                  <div className="flex-1 min-w-0">
                    <div className={`font-semibold text-theme truncate ${compact ? 'text-xs' : ''}`}>
                      {TIME_SLOT_LABELS[pref.period]}
                    </div>
                    <div className={`text-theme-muted ${compact ? 'text-[10px]' : 'text-sm'}`}>
                      {pref.enabled ? '활성화됨' : '비활성화됨'}
                    </div>
                  </div>

                  {/* 컨트롤 버튼들 */}
                  <div className={`flex items-center shrink-0 ${compact ? 'gap-1' : 'gap-2'}`}>
                    <button
                      onClick={() => handleToggleEnabled(index)}
                      className={`
                        rounded-neu theme-transition neu-btn
                        ${compact ? 'p-1.5' : 'p-2'}
                        ${
                          pref.enabled
                            ? 'neu-date-selected text-primary-500'
                            : 'text-theme-muted hover:text-theme'
                        }
                      `}
                      title={pref.enabled ? '비활성화' : '활성화'}
                    >
                      {pref.enabled ? <Eye className={compact ? 'w-4 h-4' : 'w-5 h-5'} /> : <EyeOff className={compact ? 'w-4 h-4' : 'w-5 h-5'} />}
                    </button>

                    <div className={`flex flex-col ${compact ? 'gap-0.5' : 'gap-1'}`}>
                      <button
                        onClick={() => handlePriorityChange(index, 'up')}
                        disabled={index === 0}
                        className="neu-btn rounded-neu disabled:opacity-30 disabled:cursor-not-allowed p-1"
                        title="위로 이동"
                      >
                        <svg className={`text-theme-muted ${compact ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handlePriorityChange(index, 'down')}
                        disabled={index === preferences.length - 1}
                        className="neu-btn rounded-neu disabled:opacity-30 disabled:cursor-not-allowed p-1"
                        title="아래로 이동"
                      >
                        <svg className={`text-theme-muted ${compact ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
              {/* 액션 버튼: 펼침 영역 안에만 표시 */}
              <div className={`flex gap-2 border-t border-theme ${compact ? 'pt-3 mt-3 gap-2' : 'pt-4 mt-4 gap-3'}`}>
                <button onClick={handleReset} className={`flex-1 btn-secondary ${compact ? 'text-xs min-h-[36px] py-1.5' : ''}`}>
                  기본값으로 초기화
                </button>
                <button onClick={handleSave} className={`flex-1 btn-primary ${compact ? 'text-xs min-h-[36px] py-1.5' : ''}`}>
                  설정 저장
                </button>
              </div>
          </div>
          </div>
        </div>
      </div>
    </div>
  )
}
