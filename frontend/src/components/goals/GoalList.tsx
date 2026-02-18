import { useState } from 'react'
import { useGoalStore } from '@/stores/goalStore'
import { useToastStore } from '@/stores/toastStore'
import { Menu } from '@headlessui/react'
import { Target, Calendar, TrendingUp, Wand2, MoreVertical, Trash2, Pencil, Loader2 } from 'lucide-react'
import { cn } from '@/utils/cn'
import type { Goal } from '@/types/goal'
import { goalService } from '@/services/goalService'

interface GoalListProps {
  variant?: 'default' | 'notion'
  /** notion variant일 때 각 목표 우측에 역계산(마법봉) 버튼 표시 */
  onBackwardsPlanClick?: (goal: Goal) => void
  /** 목표 수정 버튼 클릭 */
  onEditGoalClick?: (goal: Goal) => void
}

export function GoalList({ variant = 'default', onBackwardsPlanClick, onEditGoalClick }: GoalListProps) {
  const { getActiveGoals, deleteGoal } = useGoalStore()
  const { addToast } = useToastStore()
  const activeGoals = getActiveGoals()
  const isNotion = variant === 'notion'
  const showBackwardsPlanButton = isNotion && onBackwardsPlanClick
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const getProgressColor = (progress: number) => {
    if (progress >= 75) return 'bg-green-500'
    if (progress >= 50) return 'bg-blue-500'
    if (progress >= 25) return 'bg-orange-500'
    return 'bg-red-500'
  }

  const getStatusLabel = (status: Goal['status']) => {
    switch (status) {
      case 'not_started':
        return '시작 전'
      case 'on_track':
        return '진행 중'
      case 'at_risk':
        return '주의 필요'
      case 'delayed':
        return '지연됨'
      default:
        return status
    }
  }

  const getStatusColor = (status: Goal['status']) => {
    if (isNotion) {
      switch (status) {
        case 'on_track':
          return 'bg-green-500/20 text-green-400'
        case 'at_risk':
          return 'bg-orange-500/20 text-orange-400'
        case 'delayed':
          return 'bg-red-500/20 text-red-400'
        default:
          return 'bg-[var(--hover-bg)] text-theme-muted'
      }
    }
    switch (status) {
      case 'on_track':
        return 'bg-green-100 text-green-700'
      case 'at_risk':
        return 'bg-orange-100 text-orange-700'
      case 'delayed':
        return 'bg-red-100 text-red-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  const getDaysUntilDeadline = (deadline: string) => {
    const today = new Date()
    const deadlineDate = new Date(deadline)
    const diffTime = deadlineDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  if (activeGoals.length === 0) {
    return (
      <div
        className={cn(
          'rounded-2xl p-6 text-center theme-transition',
          isNotion
            ? 'bg-theme-card shadow-neu-float-date rounded-neu'
            : 'bg-white shadow-lg p-8'
        )}
      >
        <div className={cn(
          'w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3',
          isNotion ? 'bg-red-500/10' : 'bg-gray-100'
        )}>
          <Target
            className={cn('w-6 h-6', isNotion ? 'text-red-500/90' : 'text-gray-400')}
          />
        </div>
        <p className={cn('text-sm font-medium', isNotion ? 'text-theme' : 'text-gray-600 dark:text-theme')}>
          설정된 목표가 없습니다
        </p>
        <p className={cn('text-xs mt-1', isNotion ? 'text-theme-muted' : 'text-gray-400 dark:text-theme-muted')}>
          새 목표를 만들어 체계적으로 달성해보세요
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {activeGoals.map((goal) => {
        const progress =
          goal.estimatedHours > 0
            ? (goal.completedHours / goal.estimatedHours) * 100
            : 0
        const daysLeft = getDaysUntilDeadline(goal.deadline)

        const isOptimistic = goal.id.startsWith('opt-')

        return (
          <div
            key={goal.id}
            className={cn(
              'rounded-xl p-4 theme-transition transition-shadow duration-200',
              isNotion
                ? 'bg-theme-card border border-theme hover:bg-[var(--hover-bg)]'
                : 'bg-white shadow-md p-5 hover:shadow-lg border border-gray-100',
              isOptimistic && 'opacity-95'
            )}
          >
            {/* 헤더 */}
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h3
                    className={cn(
                      'font-bold text-lg',
                      isNotion ? 'text-theme' : 'text-gray-900 dark:text-theme'
                    )}
                  >
                    {goal.title}
                  </h3>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${getStatusColor(
                      goal.status
                    )}`}
                  >
                    {getStatusLabel(goal.status)}
                  </span>
                  {isOptimistic && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium shrink-0 bg-blue-500/20 text-blue-400 flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      저장 중
                    </span>
                  )}
                </div>
                {goal.description && (
                  <p
                    className={cn(
                      'text-sm',
                      isNotion ? 'text-theme-muted' : 'text-gray-600 dark:text-theme-muted'
                    )}
                  >
                    {goal.description}
                  </p>
                )}
              </div>
              <div className="shrink-0 flex items-center gap-1">
                {showBackwardsPlanButton && !isOptimistic && (
                  <button
                    type="button"
                    onClick={() => onBackwardsPlanClick(goal)}
                    className={cn(
                      'rounded-lg p-2 transition-colors theme-transition',
                      isNotion
                        ? 'hover:bg-[var(--hover-bg)] text-theme-muted hover:text-theme'
                        : 'hover:bg-gray-100 text-gray-500 hover:text-gray-900'
                    )}
                    title="역계산"
                  >
                    <Wand2 className="w-4 h-4" />
                  </button>
                )}

                {!isOptimistic && (
                <Menu as="div" className="relative">
                  <Menu.Button
                    type="button"
                    disabled={deletingId === goal.id}
                    className={cn(
                      'rounded-lg p-2 transition-colors theme-transition',
                      isNotion
                        ? 'hover:bg-[var(--hover-bg)] text-theme-muted hover:text-theme disabled:opacity-50'
                        : 'hover:bg-gray-100 text-gray-500 hover:text-gray-900 disabled:opacity-50'
                    )}
                    title="더보기"
                    aria-label="목표 더보기"
                  >
                    {deletingId === goal.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <MoreVertical className="w-4 h-4" />
                    )}
                  </Menu.Button>

                  <Menu.Items
                    className={cn(
                      'absolute right-0 mt-2 w-36 origin-top-right rounded-lg border p-1 shadow-xl focus:outline-none z-10 theme-transition',
                      isNotion
                        ? 'bg-theme-card border-theme'
                        : 'bg-white border-gray-200 dark:bg-theme-card dark:border-theme'
                    )}
                  >
                    <Menu.Item>
                      {({ active }) => (
                        <button
                          type="button"
                          onClick={() => onEditGoalClick?.(goal)}
                          disabled={!onEditGoalClick}
                          className={cn(
                            'w-full flex items-center gap-2 rounded-md px-2 py-2 text-sm theme-transition',
                            isNotion ? 'text-theme' : 'text-gray-900 dark:text-theme',
                            active
                              ? isNotion
                                ? 'bg-[var(--hover-bg)]'
                                : 'bg-gray-100'
                              : '',
                            !onEditGoalClick ? 'opacity-50 cursor-not-allowed' : ''
                          )}
                        >
                          <Pencil className="w-4 h-4" />
                          수정
                        </button>
                      )}
                    </Menu.Item>
                    <Menu.Item>
                      {({ active }) => (
                        <button
                          type="button"
                          onClick={async () => {
                            if (deletingId) return
                            const ok = window.confirm(`"${goal.title}" 목표를 삭제할까요?`)
                            if (!ok) return

                            setDeletingId(goal.id)
                            // 낙관적 업데이트: UI에서 먼저 제거
                            deleteGoal(goal.id)
                            try {
                              await goalService.deleteGoal(goal.id)
                            } catch (e) {
                              addToast(e instanceof Error ? e.message : '목표 삭제에 실패했습니다.')
                            } finally {
                              setDeletingId(null)
                            }
                          }}
                          className={cn(
                            'w-full flex items-center gap-2 rounded-md px-2 py-2 text-sm',
                            isNotion ? 'text-red-300' : 'text-red-600',
                            active
                              ? isNotion
                                ? 'bg-red-500/10'
                                : 'bg-red-50'
                              : ''
                          )}
                        >
                          <Trash2 className="w-4 h-4" />
                          삭제
                        </button>
                      )}
                    </Menu.Item>
                  </Menu.Items>
                </Menu>
                )}
              </div>
            </div>

            {/* 진행률 바 */}
            <div className="mb-3">
              <div className="flex items-center justify-between mb-2">
                <span
                  className={cn(
                    'text-xs font-medium',
                    isNotion ? 'text-theme-muted' : 'text-gray-600 dark:text-theme-muted'
                  )}
                >
                  진행률
                </span>
                <span
                  className={cn(
                    'text-xs font-bold',
                    isNotion ? 'text-theme' : 'text-gray-900 dark:text-theme'
                  )}
                >
                  {progress.toFixed(0)}%
                </span>
              </div>
              <div
                className={cn(
                  'w-full rounded-full h-2',
                  isNotion ? 'bg-[var(--hover-bg)]' : 'bg-gray-200 dark:bg-[var(--hover-bg)]'
                )}
              >
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(
                    progress
                  )}`}
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              </div>
            </div>

            {/* 통계 */}
            <div className="grid grid-cols-3 gap-2">
              <div className="flex items-center gap-2">
                <Calendar
                  className={cn('w-4 h-4', isNotion ? 'text-theme-muted' : 'text-gray-400 dark:text-theme-muted')}
                />
                <div>
                  <p
                    className={cn(
                      'text-xs',
                      isNotion ? 'text-theme-muted' : 'text-gray-500 dark:text-theme-muted'
                    )}
                  >
                    D-{daysLeft}
                  </p>
                  <p
                    className={cn(
                      'text-xs font-medium',
                      isNotion ? 'text-theme' : 'text-gray-900 dark:text-theme'
                    )}
                  >
                    {new Date(goal.deadline).toLocaleDateString('ko-KR', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp
                  className={cn('w-4 h-4', isNotion ? 'text-theme-muted' : 'text-gray-400 dark:text-theme-muted')}
                />
                <div>
                  <p
                    className={cn(
                      'text-xs',
                      isNotion ? 'text-theme-muted' : 'text-gray-500 dark:text-theme-muted'
                    )}
                  >
                    완료
                  </p>
                  <p
                    className={cn(
                      'text-xs font-medium',
                      isNotion ? 'text-theme' : 'text-gray-900 dark:text-theme'
                    )}
                  >
                    {goal.completedHours}/{goal.estimatedHours}h
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Target
                  className={cn('w-4 h-4', isNotion ? 'text-theme-muted' : 'text-gray-400 dark:text-theme-muted')}
                />
                <div>
                  <p
                    className={cn(
                      'text-xs',
                      isNotion ? 'text-theme-muted' : 'text-gray-500 dark:text-theme-muted'
                    )}
                  >
                    우선순위
                  </p>
                  <p
                    className={cn(
                      'text-xs font-medium',
                      isNotion ? 'text-theme' : 'text-gray-900 dark:text-theme'
                    )}
                  >
                    {goal.priority === 'high'
                      ? '높음'
                      : goal.priority === 'medium'
                      ? '보통'
                      : '낮음'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
