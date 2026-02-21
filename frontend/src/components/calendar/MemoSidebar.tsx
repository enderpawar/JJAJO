import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft } from 'lucide-react'

const MEMO_STORAGE_KEY = 'jjajo-sidebar-memo'

interface MemoSidebarProps {
  /** 사이드바 접기 시 호출 (미전달 시 접기 버튼 비표시) */
  onCollapse?: () => void
}

export default function MemoSidebar({ onCollapse }: MemoSidebarProps = {}) {
  const [text, setText] = useState('')

  useEffect(() => {
    try {
      const saved = localStorage.getItem(MEMO_STORAGE_KEY)
      if (saved != null) setText(saved)
    } catch {
      // ignore
    }
  }, [])

  const saveMemo = useCallback((value: string) => {
    setText(value)
    try {
      localStorage.setItem(MEMO_STORAGE_KEY, value)
    } catch {
      // ignore
    }
  }, [])

  return (
    <aside className="w-72 shrink-0 border-l border-[var(--border-color)] bg-[var(--card-bg)] flex flex-col theme-transition">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-color)]">
        {onCollapse ? (
          <button
            type="button"
            onClick={onCollapse}
            className="p-1 -ml-1 rounded hover:bg-[var(--hover-bg)] text-theme-muted"
            aria-label="사이드바 접기"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        ) : (
          <span aria-hidden />
        )}
        <span className="text-sm font-semibold text-theme">메모</span>
        <span aria-hidden className="w-5" />
      </div>
      <div className="p-4">
        <textarea
          value={text}
          onChange={(e) => saveMemo(e.target.value)}
          placeholder="메모를 입력하세요..."
          className="w-full h-[200px] max-h-[40vh] resize-y rounded-tool px-3 py-2.5 text-sm text-theme placeholder:text-theme-muted bg-[var(--bg-color)] border border-[var(--border-color)] focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500/50 theme-transition"
          aria-label="메모 입력"
        />
      </div>
    </aside>
  )
}
