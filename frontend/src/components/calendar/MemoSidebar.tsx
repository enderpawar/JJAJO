import { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { ChevronLeft, FileText, Plus, Trash2, Lightbulb, CheckSquare, Star, Calendar, Briefcase } from 'lucide-react'
import { useCalendarStore } from '@/stores/calendarStore'

const MEMO_STORAGE_KEY = 'jjajo-sidebar-memo-list'

export type MemoIconType = 'note' | 'idea' | 'task' | 'star' | 'work'

export interface MemoItem {
  id: string
  content: string
  icon?: MemoIconType
  /** YYYY-MM-DD, 해당 메모의 일자 */
  date?: string
}

function formatMemoDate(dateStr: string): string {
  try {
    const d = new Date(dateStr + 'T12:00:00')
    if (Number.isNaN(d.getTime())) return dateStr
    return format(d, 'M월 d일', { locale: ko })
  } catch {
    return dateStr
  }
}

const MEMO_ICONS: Record<MemoIconType, { Icon: typeof FileText; label: string }> = {
  note: { Icon: FileText, label: '메모' },
  idea: { Icon: Lightbulb, label: '아이디어' },
  task: { Icon: CheckSquare, label: '할 일' },
  star: { Icon: Star, label: '중요' },
  work: { Icon: Briefcase, label: '업무' },
}

const ICON_ORDER: MemoIconType[] = ['note', 'idea', 'task', 'star', 'work']

interface MemoSidebarProps {
  onCollapse?: () => void
}

export default function MemoSidebar({ onCollapse }: MemoSidebarProps = {}) {
  const selectedDate = useCalendarStore((s) => s.selectedDate)
  const [items, setItems] = useState<MemoItem[]>([])
  const [openIconId, setOpenIconId] = useState<string | null>(null)

  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd')
  const itemsForDate = items.filter((it) => (it.date ?? selectedDateStr) === selectedDateStr)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(MEMO_STORAGE_KEY)
      if (saved != null) {
        const parsed = JSON.parse(saved) as MemoItem[]
        if (Array.isArray(parsed) && parsed.length > 0) {
          setItems(
            parsed
              .filter((x) => x && typeof x.id === 'string' && typeof x.content === 'string')
              .map((x) => ({
                ...x,
                icon: ICON_ORDER.includes(x.icon as MemoIconType) ? x.icon : 'note',
                date: typeof x.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x.date) ? x.date : format(new Date(), 'yyyy-MM-dd'),
              }))
          )
        }
      }
    } catch {
      // ignore
    }
  }, [])

  const saveItems = useCallback((next: MemoItem[]) => {
    setItems(next)
    try {
      localStorage.setItem(MEMO_STORAGE_KEY, JSON.stringify(next))
    } catch {
      // ignore
    }
  }, [])

  const addItem = () => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd')
    saveItems([
      ...items,
      { id: `memo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, content: '', icon: 'note', date: dateStr },
    ])
  }

  const updateItem = (id: string, content: string) => {
    saveItems(items.map((it) => (it.id === id ? { ...it, content } : it)))
  }

  const setItemIcon = (id: string, icon: MemoIconType) => {
    saveItems(items.map((it) => (it.id === id ? { ...it, icon } : it)))
    setOpenIconId(null)
  }

  const removeItem = (id: string) => {
    saveItems(items.filter((it) => it.id !== id))
  }

  return (
    <aside className="w-72 shrink-0 border-l border-[var(--border-color)] bg-[var(--card-bg)] flex flex-col theme-transition overflow-hidden">
      <div className="relative flex items-center justify-between px-4 py-3.5 border-b border-[var(--border-color)] bg-[var(--card-bg)]">
        <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-[var(--primary-point)]/50 to-transparent" aria-hidden />
        {onCollapse ? (
          <button
            type="button"
            onClick={onCollapse}
            className="btn-icon-tap p-1.5 -ml-1 rounded-md text-theme-muted hover:text-theme hover:bg-[var(--hover-bg)]"
            aria-label="사이드바 접기"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        ) : (
          <span aria-hidden />
        )}
        <span className="flex items-center gap-2 text-sm font-semibold text-theme">
          <FileText className="w-4 h-4 text-[var(--primary-point)]" aria-hidden />
          메모
        </span>
        <span aria-hidden className="w-5" />
      </div>
      <div className="flex-1 min-h-0 p-4 flex flex-col gap-3 overflow-y-auto">
        <p className="text-[11px] text-theme-muted leading-tight shrink-0">
          {formatMemoDate(selectedDateStr)} 메모
        </p>
        <ul className="flex flex-col gap-2 min-h-0">
          {itemsForDate.length === 0 ? (
            <p className="text-[12px] text-theme-muted py-4 text-center">
              이 날짜의 메모가 없어요.
            </p>
          ) : null}
          {itemsForDate.map((it) => {
            const { Icon, label } = MEMO_ICONS[it.icon ?? 'note']
            const isOpen = openIconId === it.id
            return (
              <li
                key={it.id}
                className="flex flex-col gap-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-color)] p-2.5 shadow-[var(--shadow-inset-sm)] theme-transition min-h-[4.25rem]"
              >
                <div className="flex items-center gap-1.5 text-[11px] text-theme-muted shrink-0">
                  <Calendar className="w-3.5 h-3.5 shrink-0" aria-hidden />
                  <span>{it.date ? formatMemoDate(it.date) : '날짜 없음'}</span>
                </div>
                <div className="flex gap-2 min-h-0 flex-1">
                <div className="relative shrink-0 self-start">
                  <button
                    type="button"
                    onClick={() => setOpenIconId((prev) => (prev === it.id ? null : it.id))}
                    className="btn-icon-tap p-1.5 rounded-md text-[var(--primary-point)] hover:bg-[var(--primary-point)]/10 aria-expanded={isOpen}"
                    title={label}
                    aria-label={`유형: ${label}`}
                    aria-haspopup="true"
                  >
                    <Icon className="w-4 h-4" />
                  </button>
                  {isOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        aria-hidden
                        onClick={() => setOpenIconId(null)}
                      />
                      <div
                        className="absolute left-0 top-full z-20 mt-1 flex items-center justify-center gap-1 rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] px-2 py-2 shadow-lg whitespace-nowrap min-w-max"
                        role="menu"
                      >
                        {ICON_ORDER.map((type) => {
                          const { Icon: OptionIcon, label: optionLabel } = MEMO_ICONS[type]
                          const isSelected = (it.icon ?? 'note') === type
                          return (
                            <button
                              key={type}
                              type="button"
                              role="menuitem"
                              onClick={() => setItemIcon(it.id, type)}
                              title={optionLabel}
                              className={`btn-icon-tap shrink-0 flex items-center justify-center w-9 h-9 rounded-md transition-colors ${
                                isSelected
                                  ? 'text-[var(--primary-point)] bg-[var(--primary-point)]/15'
                                  : 'text-theme-muted hover:text-theme hover:bg-[var(--hover-bg)]'
                              }`}
                            >
                              <OptionIcon className="w-4 h-4" aria-hidden />
                            </button>
                          )
                        })}
                      </div>
                    </>
                  )}
                </div>
                <textarea
                  value={it.content}
                  onChange={(e) => updateItem(it.id, e.target.value)}
                  placeholder="메모..."
                  rows={2}
                  className="flex-1 min-w-0 min-h-[2.5rem] py-1 px-0 text-sm text-theme placeholder:text-theme-muted bg-transparent border-none focus:outline-none focus:ring-0 resize-none leading-relaxed"
                  aria-label="메모 내용"
                />
                <button
                  type="button"
                  onClick={() => removeItem(it.id)}
                  className="btn-icon-tap p-1 rounded-md text-theme-muted hover:text-red-500 hover:bg-red-500/10 shrink-0 self-start"
                  aria-label="삭제"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                </div>
              </li>
            )
          })}
        </ul>
        <button
          type="button"
          onClick={addItem}
          className="btn-ghost-tap flex items-center justify-center gap-2 py-2.5 rounded-lg border border-dashed border-[var(--border-color)] text-theme-muted hover:text-theme hover:border-[var(--primary-point)]/40 hover:bg-[var(--primary-point)]/5 text-sm font-medium shrink-0"
        >
          <Plus className="w-4 h-4" />
          메모 추가
        </button>
      </div>
    </aside>
  )
}
