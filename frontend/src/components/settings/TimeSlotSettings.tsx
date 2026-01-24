import { useState } from 'react'
import { Clock, Eye, EyeOff } from 'lucide-react'
import { useSettingsStore } from '@/stores/settingsStore'
import { TIME_SLOT_LABELS } from '@/types/settings'

export function TimeSlotSettings() {
  const { settings, updateTimeSlotPreferences } = useSettingsStore()
  const [preferences, setPreferences] = useState(settings.timeSlotPreferences)

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
    alert('✅ 시간대 설정이 저장되었습니다!')
  }

  // 초기화
  const handleReset = () => {
    const { resetToDefaults } = useSettingsStore.getState()
    resetToDefaults()
    setPreferences(useSettingsStore.getState().settings.timeSlotPreferences)
    alert('🔄 기본 설정으로 초기화되었습니다')
  }

  return (
    <div className="space-y-6">
      {/* 설명 */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
          <Clock className="w-5 h-5" />
          시간대 우선순위 설정
        </h3>
        <p className="text-sm text-blue-700">
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
              bg-white border-2 rounded-xl p-4 transition-all
              ${pref.enabled ? 'border-primary-300 shadow-sm' : 'border-gray-200 opacity-60'}
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
                      ? 'bg-gradient-to-br from-primary-500 to-purple-500 text-white'
                      : 'bg-gray-200 text-gray-400'
                  }
                `}
              >
                {index + 1}
              </div>

              {/* 시간대 정보 */}
              <div className="flex-1">
                <div className="font-semibold text-gray-900">
                  {TIME_SLOT_LABELS[pref.period]}
                </div>
                <div className="text-sm text-gray-500">
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
                        ? 'bg-green-100 text-green-600 hover:bg-green-200'
                        : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
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
                    className="p-1 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                    title="위로 이동"
                  >
                    <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handlePriorityChange(index, 'down')}
                    disabled={index === preferences.length - 1}
                    className="p-1 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                    title="아래로 이동"
                  >
                    <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
      <div className="flex gap-3 pt-4 border-t border-gray-200">
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
