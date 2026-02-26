import { useCallback, useEffect, useRef } from 'react'
import Joyride, { type CallBackProps, type Step, STATUS, EVENTS, ACTIONS } from 'react-joyride'
import { useTourStore } from '@/stores/tourStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { useCalendarStore } from '@/stores/calendarStore'

const MOBILE_BREAKPOINT = 1025

function useIsMobile() {
  return typeof window !== 'undefined' && window.innerWidth < MOBILE_BREAKPOINT
}

// ─── 스텝 정의 ────────────────────────────────────────────────────────────────
//
// 캘린더(월간) 섹션 → 뷰 전환 → 할일(주간) 섹션 순서로 안내
//
// PC  : header-logo → date-picker → view-toggle → magic-bar → calendar-grid → day-panel
//       ── (week 전환) ──> timeline → settings-btn
//       타임라인 스텝 시작 index = 6
//
// 모바일: header-logo → date-picker → magic-bar → calendar-grid
//         ── (week 전환) ──> timeline → bottom-nav-fab
//         타임라인 스텝 시작 index = 4

const TIMELINE_STEP_INDEX_PC = 6
const TIMELINE_STEP_INDEX_MOBILE = 4

function buildSteps(isMobile: boolean): Step[] {
  // ── 공통 캘린더 섹션 ──────────────────────────────────────────────────────
  const calendarIntro: Step = {
    target: '[data-tour="header-logo"]',
    title: '짜조에 오신 것을 환영해요! 👋',
    content: (
      <p>짜조는 AI가 일정을 자동으로 배치해주는 스마트 플래너예요.<br />
      먼저 <strong>캘린더</strong> 기능부터 살펴볼게요.</p>
    ),
    placement: 'bottom',
    disableBeacon: true,
  }

  const datePicker: Step = {
    target: isMobile ? '[data-tour="date-picker-mobile"]' : '[data-tour="date-picker-pc"]',
    title: '📆 날짜 이동',
    content: '화살표로 이전/다음 달(또는 날)을 이동해요. 모바일에서는 캘린더를 좌우로 스와이프해도 돼요.',
    placement: 'bottom',
    disableBeacon: true,
  }

  const magicBar: Step = {
    target: '[data-tour="magic-bar"]',
    title: '✨ AI 매직바',
    content: (
      <div>
        <p>자연어로 일정을 바로 추가하는 핵심 기능이에요.</p>
        <ul style={{ marginTop: 8, paddingLeft: 0, listStyle: 'none', lineHeight: 1.7 }}>
          <li>• <strong>일반 모드</strong>: "내일 오후 3시 회의"</li>
          <li>• <strong>짜조 모드 🪄</strong>: "알고리즘 3시간, 백엔드 2시간"<br />
            → AI가 시간대를 자동 배치</li>
        </ul>
      </div>
    ),
    placement: 'bottom',
    disableBeacon: true,
  }

  const calendarGrid: Step = {
    target: '[data-tour="calendar-grid"]',
    title: '📅 월간 캘린더',
    content: '날짜를 클릭하면 해당 날의 일정을 확인하거나 새 일정을 추가할 수 있어요. 일정이 있는 날에는 색상 점/블록이 표시돼요.',
    placement: 'top',
    disableBeacon: true,
  }

  // ── PC 전용 캘린더 섹션 ───────────────────────────────────────────────────
  const viewToggle: Step = {
    target: '[data-tour="view-toggle"]',
    title: '🔀 캘린더 ↔ 할일 전환',
    content: (
      <div>
        <p>"캘린더" 버튼은 월간 달력 보기, "할일" 버튼은 하루 단위 타임라인 보기예요.</p>
        <p style={{ marginTop: 8, fontSize: 12, opacity: 0.7 }}>다음을 누르면 할일 탭으로 이동해 타임라인 기능을 보여드릴게요!</p>
      </div>
    ),
    placement: 'bottom',
    disableBeacon: true,
  }

  const dayPanel: Step = {
    target: '[data-tour="day-panel"]',
    title: '📋 날짜별 일정 패널',
    content: (
      <div>
        <p>선택한 날짜의 일정 목록이에요. 일정을 클릭해 완료 처리하거나, 편집·삭제할 수 있어요.</p>
        <p style={{ marginTop: 8, fontSize: 12, opacity: 0.7 }}>다음을 누르면 할일 탭으로 이동할게요 →</p>
      </div>
    ),
    placement: 'left',
    disableBeacon: true,
  }

  // ── 공통 할일 섹션 ─────────────────────────────────────────────────────────
  const timeline: Step = {
    target: '[data-tour="timeline"]',
    title: '⏱️ 24시간 타임라인',
    content: (
      <div>
        <p>이제 <strong>할일 탭</strong>이에요! 24시간 타임라인에서 일정을 시각적으로 관리해요.</p>
        <ul style={{ marginTop: 8, paddingLeft: 0, listStyle: 'none', lineHeight: 1.7 }}>
          <li>• 일정 블록을 <strong>드래그</strong>해 시간대 이동</li>
          <li>• 블록 위·아래 핸들로 <strong>시간 늘리기/줄이기</strong></li>
          <li>• 빈 공간 <strong>더블탭</strong>하면 새 일정 즉시 추가</li>
        </ul>
      </div>
    ),
    placement: 'center',
    disableBeacon: true,
  }

  // ── PC 전용 할일 섹션 ─────────────────────────────────────────────────────
  const settingsBtn: Step = {
    target: '[data-tour="settings-btn"]',
    title: '⚙️ 설정',
    content: 'Gemini API 키 입력, 시간대 설정, 테마 변경 등을 여기서 할 수 있어요. API 키를 넣으면 AI 기능이 더욱 강력해져요!',
    placement: 'bottom-end',
    disableBeacon: true,
  }

  // ── 모바일 전용 할일 섹션 ─────────────────────────────────────────────────
  const fab: Step = {
    target: '[data-tour="bottom-nav-fab"]',
    title: '➕ 일정 추가 버튼',
    content: '하단의 주황색 버튼을 탭하면 새 일정을 추가해요. 꾹 누르면 어제 일정 가져오기, 시간표 불러오기 등 추가 메뉴가 나타나요.',
    placement: 'top',
    disableBeacon: true,
  }

  if (isMobile) {
    // 0~3: 캘린더, 4~5: 할일
    return [calendarIntro, datePicker, magicBar, calendarGrid, timeline, fab]
  }

  // 0~5: 캘린더, 6~7: 할일
  return [calendarIntro, datePicker, viewToggle, magicBar, calendarGrid, dayPanel, timeline, settingsBtn]
}

// ─── 컴포넌트 ─────────────────────────────────────────────────────────────────

export function PlannerTour() {
  const { run, stepIndex, startTour, pauseTour, resumeTour, stopTour, setStepIndex, markSeen, hasSeenTour } = useTourStore()
  const theme = useSettingsStore((s) => s.theme)
  const setViewMode = useCalendarStore((s) => s.setViewMode)
  const isMobile = useIsMobile()

  const steps = buildSteps(isMobile)
  const timelineStepIndex = isMobile ? TIMELINE_STEP_INDEX_MOBILE : TIMELINE_STEP_INDEX_PC

  // 타임라인 단계로 전환 중에 중복 호출을 막는 플래그
  const isTransitioningRef = useRef(false)

  // 첫 방문 시 1초 후 자동 시작 (캘린더 뷰부터 시작)
  useEffect(() => {
    if (!hasSeenTour) {
      const t = setTimeout(() => {
        setViewMode('month')
        startTour()
      }, 1000)
      return () => clearTimeout(t)
    }
  }, [hasSeenTour, startTour, setViewMode])

  // 투어 시작 시 항상 월간 뷰에서 시작
  useEffect(() => {
    if (run && stepIndex === 0) {
      setViewMode('month')
    }
  }, [run, stepIndex, setViewMode])

  const switchView = useCallback(
    (mode: 'month' | 'week', nextStepIndex: number) => {
      if (isTransitioningRef.current) return
      isTransitioningRef.current = true
      pauseTour()
      setViewMode(mode)
      // 슬라이드 애니메이션(350ms) + 여유 시간
      setTimeout(() => {
        setStepIndex(nextStepIndex)
        resumeTour()
        isTransitioningRef.current = false
      }, 500)
    },
    [pauseTour, resumeTour, setStepIndex, setViewMode]
  )

  const handleCallback = useCallback(
    (data: CallBackProps) => {
      const { status, type, action, index } = data

      // 투어 종료 (완료 또는 건너뛰기)
      if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
        stopTour()
        markSeen()
        setViewMode('month')
        return
      }

      // 앞으로 이동: 다음 버튼 또는 오버레이 탭 공통 로직
      const goForward = (fromIndex: number) => {
        // 마지막 스텝 → 투어 종료
        if (fromIndex >= steps.length - 1) {
          stopTour()
          markSeen()
          setViewMode('month')
          return
        }
        // 캘린더 → 할일 뷰 전환 경계
        if (fromIndex === timelineStepIndex - 1) {
          switchView('week', timelineStepIndex)
          return
        }
        setStepIndex(fromIndex + 1)
      }

      if (type === EVENTS.STEP_AFTER || type === EVENTS.TARGET_NOT_FOUND) {
        // ACTIONS.CLOSE = 오버레이 탭 (STATUS.FINISHED는 이미 위에서 처리됨)
        const isForward = action === ACTIONS.NEXT || action === ACTIONS.GO || action === ACTIONS.CLOSE
        const isPrev = action === ACTIONS.PREV

        if (isForward) {
          goForward(index)
          return
        }

        // 할일 → 캘린더 복귀 (이전 버튼)
        if (isPrev && index === timelineStepIndex) {
          switchView('month', timelineStepIndex - 1)
          return
        }

        if (isPrev) {
          setStepIndex(index - 1)
        }
      }
    },
    [steps.length, timelineStepIndex, stopTour, setStepIndex, markSeen, setViewMode, switchView]
  )

  const isDark = theme === 'dark'

  const joyrideStyles = {
    options: {
      arrowColor: isDark ? '#1e1e2e' : '#ffffff',
      backgroundColor: isDark ? '#1e1e2e' : '#ffffff',
      overlayColor: 'rgba(0, 0, 0, 0.52)',
      primaryColor: '#FF6D00',
      textColor: isDark ? '#e2e8f0' : '#1a202c',
      zIndex: 10000,
    },
    tooltip: {
      borderRadius: '14px',
      boxShadow: isDark
        ? '0 8px 40px rgba(0,0,0,0.7)'
        : '0 8px 32px rgba(0,0,0,0.14)',
      border: isDark ? '1px solid rgba(255,255,255,0.09)' : '1px solid rgba(0,0,0,0.07)',
      padding: '20px 24px',
      maxWidth: '340px',
    },
    tooltipTitle: {
      fontSize: '15px',
      fontWeight: '700',
      marginBottom: '8px',
      color: isDark ? '#f1f5f9' : '#0f172a',
    },
    tooltipContent: {
      fontSize: '13.5px',
      lineHeight: '1.65',
      color: isDark ? '#cbd5e1' : '#334155',
      padding: '0',
    },
    tooltipFooter: {
      marginTop: '16px',
    },
    buttonNext: {
      backgroundColor: '#FF6D00',
      borderRadius: '8px',
      fontSize: '13px',
      fontWeight: '600',
      padding: '8px 18px',
    },
    buttonBack: {
      color: isDark ? '#94a3b8' : '#64748b',
      fontSize: '13px',
      fontWeight: '500',
      marginRight: '8px',
    },
    buttonSkip: {
      color: isDark ? '#64748b' : '#94a3b8',
      fontSize: '12px',
    },
    spotlight: {
      borderRadius: '10px',
    },
  }

  return (
    <Joyride
      steps={steps}
      run={run}
      stepIndex={stepIndex}
      continuous
      showSkipButton
      showProgress
      scrollToFirstStep
      disableScrolling={false}
      disableOverlayClose={false}
      callback={handleCallback}
      styles={joyrideStyles}
      locale={{
        back: '이전',
        close: '닫기',
        last: '완료 🎉',
        next: '다음',
        skip: '건너뛰기',
        open: '투어 열기',
        nextLabelWithProgress: '다음 ({step}/{steps})',
      }}
    />
  )
}
