import { useState, useRef } from 'react'
import { Plus, Clock, Edit2, Trash2, GripVertical } from 'lucide-react'
import { useCalendarStore } from '@/stores/calendarStore'
import { formatDate } from '@/utils/dateUtils'
import { cn } from '@/utils/cn'
import type { Todo } from '@/types/calendar'

// Time slot configuration
const HOURS = Array.from({ length: 24 }, (_, i) => i)
const SLOT_HEIGHT = 60 // pixels per hour

export default function DayPlannerView() {
  const { selectedDate, getTodosByDate, addTodo, updateTodo, deleteTodo } = useCalendarStore()
  const dateStr = formatDate(selectedDate)
  const todos = getTodosByDate(dateStr)
  
  // Track pending operations to prevent race conditions
  const [pendingOps, setPendingOps] = useState<Set<string>>(new Set())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  
  // Helper function to mark operation as pending
  const markPending = (id: string) => {
    setPendingOps(prev => new Set(prev).add(id))
  }
  
  // Helper function to mark operation as complete
  const markComplete = (id: string) => {
    setPendingOps(prev => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }
  
  // Check if a todo is pending (being created/updated)
  const isPending = (id: string) => pendingOps.has(id)
  
  // Handle creating new schedule
  const handleAddNewSchedule = () => {
    const now = new Date()
    const currentHour = now.getHours()
    const startTime = `${String(currentHour).padStart(2, '0')}:00`
    const endTime = `${String(currentHour + 1).padStart(2, '0')}:00`
    
    const newId = `todo-${Date.now()}`
    
    // Mark as pending immediately
    markPending(newId)
    
    const newTodo: Todo = {
      id: newId,
      title: '새 일정',
      date: dateStr,
      startTime,
      endTime,
      status: 'pending',
      priority: 'medium',
      createdBy: 'user',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    
    // Add todo with a slight delay to simulate async operation
    addTodo(newTodo)
    
    // Mark as complete after a short delay to prevent immediate editing
    setTimeout(() => {
      markComplete(newId)
    }, 100)
  }
  
  // Handle title edit
  const handleTitleClick = (todo: Todo) => {
    // Don't allow editing if operation is pending
    if (isPending(todo.id)) {
      return
    }
    
    setEditingId(todo.id)
    setEditingTitle(todo.title)
  }
  
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditingTitle(e.target.value)
  }
  
  const handleTitleBlur = () => {
    if (editingId && editingTitle.trim()) {
      markPending(editingId)
      updateTodo(editingId, { title: editingTitle.trim() })
      setTimeout(() => markComplete(editingId), 100)
    }
    setEditingId(null)
    setEditingTitle('')
  }
  
  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTitleBlur()
    } else if (e.key === 'Escape') {
      setEditingId(null)
      setEditingTitle('')
    }
  }
  
  // Handle drag to adjust time
  const handleDragStart = (e: React.DragEvent, todo: Todo) => {
    // Don't allow dragging if operation is pending
    if (isPending(todo.id)) {
      e.preventDefault()
      return
    }
    
    setDraggingId(todo.id)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('todoId', todo.id)
  }
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }
  
  const handleDrop = (e: React.DragEvent, targetHour: number) => {
    e.preventDefault()
    
    const todoId = e.dataTransfer.getData('todoId')
    const todo = todos.find(t => t.id === todoId)
    
    if (!todo || isPending(todoId)) {
      setDraggingId(null)
      return
    }
    
    // Calculate new start and end times
    const startTime = `${String(targetHour).padStart(2, '0')}:00`
    
    // Calculate duration from original times
    let duration = 60 // default 1 hour
    if (todo.startTime && todo.endTime) {
      const [startH, startM] = todo.startTime.split(':').map(Number)
      const [endH, endM] = todo.endTime.split(':').map(Number)
      duration = (endH * 60 + endM) - (startH * 60 + startM)
    }
    
    const endHour = targetHour + Math.floor(duration / 60)
    const endMin = duration % 60
    const endTime = `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`
    
    // Mark as pending before update
    markPending(todoId)
    
    updateTodo(todoId, { startTime, endTime })
    
    // Mark as complete after short delay
    setTimeout(() => {
      markComplete(todoId)
      setDraggingId(null)
    }, 100)
  }
  
  const handleDragEnd = () => {
    setDraggingId(null)
  }
  
  // Calculate position and height for a todo
  const getTodoStyle = (todo: Todo) => {
    if (!todo.startTime) return { top: 0, height: SLOT_HEIGHT }
    
    const [startH, startM] = todo.startTime.split(':').map(Number)
    const top = (startH + startM / 60) * SLOT_HEIGHT
    
    let height = SLOT_HEIGHT
    if (todo.endTime) {
      const [endH, endM] = todo.endTime.split(':').map(Number)
      const duration = (endH * 60 + endM) - (startH * 60 + startM)
      height = (duration / 60) * SLOT_HEIGHT
    }
    
    return { top, height }
  }
  
  const getPriorityColor = (priority: Todo['priority']) => {
    switch (priority) {
      case 'high': return 'border-red-400 bg-red-50'
      case 'medium': return 'border-yellow-400 bg-yellow-50'
      case 'low': return 'border-green-400 bg-green-50'
    }
  }
  
  return (
    <div className="flex-1 bg-white rounded-xl shadow-lg overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary-500" />
          <h3 className="text-lg font-bold text-gray-800">
            {selectedDate.toLocaleDateString('ko-KR', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric',
              weekday: 'short'
            })}
          </h3>
        </div>
        <button
          onClick={handleAddNewSchedule}
          className="btn-primary flex items-center gap-2 text-sm"
        >
          <Plus className="w-4 h-4" />
          <span>새 일정</span>
        </button>
      </div>
      
      {/* Time grid */}
      <div className="flex-1 overflow-y-auto relative" ref={containerRef}>
        <div className="relative" style={{ height: HOURS.length * SLOT_HEIGHT }}>
          {/* Time labels and grid lines */}
          {HOURS.map(hour => (
            <div
              key={hour}
              className="absolute left-0 right-0 border-b border-gray-200"
              style={{ top: hour * SLOT_HEIGHT, height: SLOT_HEIGHT }}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, hour)}
            >
              <div className="flex">
                <div className="w-16 flex-shrink-0 px-2 py-1">
                  <span className="text-xs text-gray-500">
                    {String(hour).padStart(2, '0')}:00
                  </span>
                </div>
                <div className="flex-1" />
              </div>
            </div>
          ))}
          
          {/* Schedule items */}
          <div className="absolute left-16 right-0 top-0 bottom-0">
            {todos.map(todo => {
              const style = getTodoStyle(todo)
              const isEditing = editingId === todo.id
              const pending = isPending(todo.id)
              const dragging = draggingId === todo.id
              
              return (
                <div
                  key={todo.id}
                  draggable={!pending && !isEditing}
                  onDragStart={(e) => handleDragStart(e, todo)}
                  onDragEnd={handleDragEnd}
                  className={cn(
                    'absolute left-2 right-2 rounded-lg border-2 px-3 py-2 transition-all',
                    'flex items-center gap-2',
                    getPriorityColor(todo.priority),
                    pending && 'opacity-50 cursor-not-allowed',
                    dragging && 'opacity-30',
                    !pending && !isEditing && 'hover:shadow-md cursor-move'
                  )}
                  style={{ 
                    top: `${style.top}px`, 
                    height: `${style.height}px`,
                    minHeight: '40px'
                  }}
                >
                  {!pending && !isEditing && (
                    <GripVertical className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  )}
                  
                  {isEditing ? (
                    <input
                      type="text"
                      value={editingTitle}
                      onChange={handleTitleChange}
                      onBlur={handleTitleBlur}
                      onKeyDown={handleTitleKeyDown}
                      className="flex-1 bg-transparent border-none focus:outline-none font-medium"
                      autoFocus
                    />
                  ) : (
                    <div className="flex-1 min-w-0 flex items-center gap-2">
                      <span className="font-medium truncate">
                        {todo.title}
                      </span>
                      {todo.startTime && (
                        <span className="text-xs text-gray-500">
                          {todo.startTime}
                          {todo.endTime && ` - ${todo.endTime}`}
                        </span>
                      )}
                    </div>
                  )}
                  
                  {!pending && (
                    <div className="flex gap-1 flex-shrink-0">
                      <button
                        onClick={() => handleTitleClick(todo)}
                        className="p-1 hover:bg-white/50 rounded transition-colors"
                        disabled={pending}
                      >
                        <Edit2 className="w-3 h-3 text-gray-600" />
                      </button>
                      <button
                        onClick={() => {
                          if (!pending) {
                            deleteTodo(todo.id)
                          }
                        }}
                        className="p-1 hover:bg-red-100 rounded transition-colors"
                        disabled={pending}
                      >
                        <Trash2 className="w-3 h-3 text-red-600" />
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
