import { Fragment } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { Wand2, X, Loader2, CalendarDays, AlertTriangle } from 'lucide-react'
import type { BackwardsPlanResult } from '@/types/backwardsPlan'
import type { Goal } from '@/types/goal'

interface BackwardsPlanModalProps {
  isOpen: boolean
  goal?: Goal
  form: {
    preferredDailyHours: number | ''
    totalHours: number | ''
  }
  loading: boolean
  applying?: boolean
  error?: string
  result?: BackwardsPlanResult
  onClose: () => void
  onSubmit: () => void
  onFormChange: (updates: Partial<{ preferredDailyHours: number | ''; totalHours: number | '' }>) => void
  onApply?: () => void
}

export function BackwardsPlanModal({
  isOpen,
  goal,
  form,
  loading,
  applying,
  error,
  result,
  onClose,
  onSubmit,
  onFormChange,
  onApply,
}: BackwardsPlanModalProps) {
  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-3xl transform overflow-hidden rounded-2xl bg-notion-sidebar p-6 text-left shadow-xl transition-all border border-notion-border">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-purple-500 flex items-center justify-center text-white">
                        <Wand2 className="w-5 h-5" />
                      </div>
                      <Dialog.Title className="text-xl font-semibold text-notion-text">
                        데드라인 역계산
                      </Dialog.Title>
                    </div>
                    <p className="text-sm text-notion-muted mt-2">
                      마감일까지 남은 기간을 분석해 하루 단위 작업 블록을 자동으로 나눠드립니다.
                    </p>
                  </div>
                  <button
                    onClick={onClose}
                    className="rounded-full p-2 hover:bg-notion-hover text-notion-muted transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="mt-6 grid gap-6 lg:grid-cols-2">
                  <div className="border border-notion-border rounded-2xl p-4 space-y-4 bg-notion-bg/60">
                    <div>
                      <label className="text-xs font-medium text-notion-muted">선택된 목표</label>
                      <div className="mt-1 rounded-xl border border-notion-border bg-notion-sidebar/50 px-4 py-3">
                        <p className="text-sm font-semibold text-notion-text">{goal?.title ?? '목표를 선택해주세요'}</p>
                        <p className="mt-1 text-xs text-notion-muted">
                          마감일: <span className="text-notion-text">{goal?.deadline ?? '-'}</span>
                        </p>
                        <p className="mt-0.5 text-xs text-notion-muted">
                          총 필요 시간:{' '}
                          <span className="text-notion-text">
                            {form.totalHours === '' ? '미설정(추정)' : `${form.totalHours}시간`}
                          </span>
                        </p>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-notion-muted">일당 투자 시간</label>
                      <select
                        value={form.preferredDailyHours === '' ? '' : String(form.preferredDailyHours)}
                        onChange={(e) => {
                          const v = e.target.value
                          onFormChange({ preferredDailyHours: v === '' ? '' : Number(v) })
                        }}
                        disabled={loading}
                        className="mt-1 input-notion rounded-xl"
                      >
                        <option value="">설정 시간대 기준 (자동)</option>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((h) => (
                          <option key={h} value={h}>
                            하루 {h}시간
                          </option>
                        ))}
                      </select>
                      <p className="mt-0.5 text-[11px] text-notion-muted/80">
                        하루에 배치할 작업 블록의 크기(상한)를 정합니다. 총 필요 시간은 목표의 추정치(또는 수정값)를 사용해 분할합니다.
                      </p>
                    </div>
                    <details className="rounded-xl border border-notion-border bg-notion-sidebar/30 px-4 py-3">
                      <summary className="cursor-pointer text-xs font-medium text-notion-muted select-none">
                        고급 옵션 (총 필요 시간 수정)
                      </summary>
                      <div className="mt-3">
                        <label className="text-xs font-medium text-notion-muted">총 필요 시간(시간)</label>
                        <input
                          type="number"
                          min={1}
                          max={999}
                          value={form.totalHours === '' ? '' : String(form.totalHours)}
                          onChange={(e) => {
                            const v = e.target.value
                            onFormChange({ totalHours: v === '' ? '' : Number(v) })
                          }}
                          disabled={loading}
                          placeholder="예) 16"
                          className="mt-1 input-notion rounded-xl"
                        />
                        <p className="mt-1 text-[11px] text-notion-muted/80">
                          비워두면(미설정) 시스템이 추정치를 사용합니다. 가능하면 입력하면 결과가 더 안정적입니다.
                        </p>
                      </div>
                    </details>
                    <div className="rounded-xl border border-dashed border-notion-border bg-notion-sidebar/60 px-4 py-3 text-xs text-notion-muted leading-relaxed">
                      목표의 <strong className="text-notion-text">마감일</strong>과 <strong className="text-notion-text">총 필요 시간</strong>을 기준으로,
                      하루 단위 작업 블록을 자동으로 나눕니다.
                      <br />
                      쉬는 날과 선호 시간대는 <em>설정 &gt; 시간대 설정</em>에서 변경할 수 있어요.
                    </div>
                    {error && (
                      <div className="flex items-start gap-2 rounded-xl border border-red-900/40 bg-red-950/30 px-3 py-2 text-xs text-red-200">
                        <AlertTriangle className="w-3.5 h-3.5 mt-0.5" />
                        {error}
                      </div>
                    )}
                    <button
                      onClick={onSubmit}
                      disabled={loading || !goal}
                      className="w-full rounded-xl bg-gradient-to-r from-primary-500 to-purple-500 text-white py-2.5 text-sm font-semibold shadow-sm hover:brightness-110 transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          계산 중...
                        </>
                      ) : (
                        <>
                          <Wand2 className="w-4 h-4" />
                          자동 분할 실행
                        </>
                      )}
                    </button>
                  </div>

                  <div className="border border-notion-border rounded-2xl p-4 h-[460px] overflow-y-auto bg-notion-bg/40">
                    {!result ? (
                      <div className="h-full flex flex-col items-center justify-center text-center text-notion-muted text-sm">
                        <Wand2 className="w-8 h-8 mb-3" />
                        자동 분할을 실행하면 여기에서 하루 단위 작업 계획을 확인할 수 있어요.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="rounded-xl border border-primary-500/30 bg-primary-500/10 p-4">
                          <p className="text-sm font-semibold text-notion-text">{result.summary}</p>
                          <p className="text-xs text-notion-muted mt-1">
                            추천 하루 집중 시간: {result.recommendedDailyHours}시간
                          </p>
                        </div>

                        <div className="space-y-3">
                          {result.planDays.map((day) => (
                            <div key={day.date} className="rounded-xl border border-notion-border bg-notion-sidebar/50 p-3">
                              <p className="text-sm font-semibold text-notion-text">
                                {day.date} · {day.plannedHours.toFixed(1)}시간
                              </p>
                              <div className="mt-2 space-y-2">
                                {day.blocks.map((block, idx) => (
                                  <div
                                    key={`${block.title}-${idx}`}
                                    className="rounded-lg bg-notion-sidebar px-3 py-2 text-xs text-notion-muted border border-notion-border"
                                  >
                                    <p className="font-medium text-notion-text">
                                      {block.startTime} - {block.endTime} · {block.title}
                                    </p>
                                    {block.description && (
                                      <p className="mt-0.5 text-[11px] text-notion-muted/80">{block.description}</p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>

                        {result.conflicts.length > 0 && (
                          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-100/90 space-y-1">
                            <p className="font-semibold text-sm text-amber-100">조정된 일정</p>
                            {result.conflicts.map((conflict, idx) => (
                              <p key={`${conflict.date}-${idx}`}>
                                • {conflict.date}: {conflict.reason} → {conflict.resolvedTo}
                              </p>
                            ))}
                          </div>
                        )}

                        <button
                          onClick={onApply}
                          disabled={!onApply || !result || applying}
                          className="w-full rounded-xl bg-notion-sidebar text-notion-text py-2 text-sm font-semibold hover:bg-notion-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 border border-notion-border"
                        >
                          {applying ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              캘린더에 반영 중
                            </>
                          ) : (
                            <>
                              <CalendarDays className="w-4 h-4" />
                              캘린더에 배치
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  )
}
