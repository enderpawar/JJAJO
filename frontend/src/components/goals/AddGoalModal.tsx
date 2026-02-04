import { Fragment, useEffect, useState } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { Target, X } from 'lucide-react'

interface AddGoalModalProps {
  isOpen: boolean
  onClose: () => void
  mode?: 'create' | 'edit'
  initialValues?: { title: string; deadline: string; description?: string }
  onSubmit: (title: string, deadline: string, description?: string) => Promise<void>
}

export function AddGoalModal({
  isOpen,
  onClose,
  onSubmit,
  mode = 'create',
  initialValues,
}: AddGoalModalProps) {
  const [title, setTitle] = useState('')
  const [deadline, setDeadline] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return
    setTitle(initialValues?.title ?? '')
    setDeadline(initialValues?.deadline ?? '')
    setDescription(initialValues?.description ?? '')
    setError(null)
  }, [isOpen, initialValues?.title, initialValues?.deadline, initialValues?.description])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedTitle = title.trim()
    if (!trimmedTitle) {
      setError('목표 제목을 입력해주세요.')
      return
    }
    if (!deadline) {
      setError('마감일을 선택해주세요.')
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      await onSubmit(trimmedTitle, deadline, description.trim() || undefined)
      setTitle('')
      setDeadline('')
      setDescription('')
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : '목표 등록에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!submitting) {
      setError(null)
      onClose()
    }
  }

  const today = new Date().toISOString().slice(0, 10)

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-notion-bg border border-notion-border shadow-xl transition-all">
                <div className="flex items-center justify-between p-4 border-b border-notion-border">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-lg bg-red-500/10 flex items-center justify-center">
                      <Target className="w-4 h-4 text-red-500" />
                    </div>
                    <Dialog.Title className="text-base font-semibold text-notion-text">
                      {mode === 'edit' ? '목표 수정' : '새 목표 추가'}
                    </Dialog.Title>
                  </div>
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={submitting}
                    className="rounded-lg p-2 hover:bg-notion-hover text-notion-text-secondary transition-colors disabled:opacity-50"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-notion-text-secondary mb-1">
                      목표 제목
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="예) 토익 800점 달성"
                      className="w-full rounded-lg border border-notion-border bg-notion-sidebar/50 px-3 py-2 text-sm text-notion-text placeholder:text-notion-muted focus:border-red-500/50 focus:outline-none focus:ring-1 focus:ring-red-500/30"
                      disabled={submitting}
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-notion-text-secondary mb-1">
                      마감일
                    </label>
                    <input
                      type="date"
                      value={deadline}
                      min={today}
                      onChange={(e) => setDeadline(e.target.value)}
                      className="w-full rounded-lg border border-notion-border bg-notion-sidebar/50 px-3 py-2 text-sm text-notion-text focus:border-red-500/50 focus:outline-none focus:ring-1 focus:ring-red-500/30"
                      disabled={submitting}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-notion-text-secondary mb-1">
                      설명 (선택)
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="목표에 대한 간단한 설명"
                      rows={2}
                      className="w-full rounded-lg border border-notion-border bg-notion-sidebar/50 px-3 py-2 text-sm text-notion-text placeholder:text-notion-muted focus:border-red-500/50 focus:outline-none focus:ring-1 focus:ring-red-500/30 resize-none"
                      disabled={submitting}
                    />
                  </div>
                  {error && (
                    <p className="text-xs text-red-400">{error}</p>
                  )}
                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={handleClose}
                      disabled={submitting}
                      className="flex-1 rounded-lg border border-notion-border px-3 py-2 text-sm font-medium text-notion-text-secondary hover:bg-notion-hover transition-colors disabled:opacity-50"
                    >
                      취소
                    </button>
                    <button
                      type="submit"
                      disabled={submitting || !title.trim() || !deadline}
                      className="flex-1 rounded-lg bg-red-500 text-white px-3 py-2 text-sm font-semibold hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {submitting ? (mode === 'edit' ? '저장 중...' : '등록 중...') : mode === 'edit' ? '저장' : '등록'}
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  )
}
