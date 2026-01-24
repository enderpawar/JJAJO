import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, FileText, AlertCircle, Trash2 } from 'lucide-react';
import { useCalendarStore } from '../../stores/calendarStore';
import type { Todo } from '../../types/calendar';

interface EditTodoPanelProps {
  todo: Todo | null;
  onClose: () => void;
}

export default function EditTodoPanel({ todo, onClose }: EditTodoPanelProps) {
  const { updateTodo, deleteTodo } = useCalendarStore();
  
  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (todo) {
      setTitle(todo.title);
      setStartTime(todo.startTime || '');
      setEndTime(todo.endTime || '');
      setDescription(todo.description || '');
      setPriority(todo.priority);
    }
  }, [todo]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showDeleteConfirm) {
          setShowDeleteConfirm(false);
        } else {
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose, showDeleteConfirm]);

  if (!todo) return null;

  const handleSave = () => {
    updateTodo(todo.id, {
      title,
      startTime,
      endTime,
      description,
      priority,
      updatedAt: new Date().toISOString(),
    });
    onClose();
  };

  const handleDelete = () => {
    deleteTodo(todo.id);
    onClose();
  };

  const getPriorityColor = (p: string) => {
    switch (p) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <AnimatePresence>
      {todo && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 z-[9998]"
            onClick={onClose}
          />

          {/* Slide Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-[400px] bg-notion-sidebar border-l border-notion-border z-[9999] flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-blue-50 to-purple-50">
              <div className="flex items-center gap-3">
                <div className={`w-1 h-8 rounded-full ${getPriorityColor(priority)}`} />
                <h2 className="text-xl font-bold text-gray-800">일정 편집</h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/50 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* 제목 */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <FileText className="w-4 h-4" />
                  제목
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none text-base"
                  placeholder="일정 제목"
                  autoFocus
                />
              </div>

              {/* 시간 */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <Clock className="w-4 h-4" />
                  시간
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">시작</label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">종료</label>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* 설명 */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <FileText className="w-4 h-4" />
                  설명
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none resize-none text-base"
                  rows={4}
                  placeholder="일정에 대한 설명을 입력하세요"
                />
              </div>

              {/* 우선순위 */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <AlertCircle className="w-4 h-4" />
                  우선순위
                </label>
                <div className="flex gap-3">
                  {(['high', 'medium', 'low'] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPriority(p)}
                      className={`flex-1 py-3 rounded-xl font-medium transition-all ${
                        priority === p
                          ? `${getPriorityColor(p)} text-white shadow-lg scale-105`
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {p === 'high' ? '높음' : p === 'medium' ? '보통' : '낮음'}
                    </button>
                  ))}
                </div>
              </div>

              {/* 삭제 확인 */}
              {showDeleteConfirm && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-red-50 border-2 border-red-200 rounded-xl"
                >
                  <p className="text-sm text-red-800 font-medium mb-3">
                    정말로 이 일정을 삭제하시겠습니까?
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleDelete}
                      className="flex-1 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors"
                    >
                      삭제
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="flex-1 py-2 bg-notion-bg text-notion-text rounded-md font-medium hover:bg-notion-hover transition-colors border border-notion-border"
                    >
                      취소
                    </button>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-notion-border bg-notion-bg space-y-3">
              {!showDeleteConfirm && (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full py-3 flex items-center justify-center gap-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium"
                >
                  <Trash2 className="w-4 h-4" />
                  일정 삭제
                </button>
              )}
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={handleSave}
                  className="flex-1 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-purple-600 transition-all shadow-lg hover:shadow-xl"
                >
                  저장
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
