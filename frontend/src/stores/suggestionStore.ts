import { create } from 'zustand'
import type { Suggestion } from '@/types/suggestion'

interface SuggestionState {
  suggestions: Suggestion[]
  addSuggestion: (suggestion: Suggestion) => void
  dismissSuggestion: (id: string) => void
  getActiveSuggestions: () => Suggestion[]
  getSuggestionsByPriority: (priority: string) => Suggestion[]
}

export const useSuggestionStore = create<SuggestionState>((set, get) => ({
  suggestions: [],

  addSuggestion: (suggestion) =>
    set((state) => ({
      suggestions: [...state.suggestions, suggestion],
    })),

  dismissSuggestion: (id) =>
    set((state) => ({
      suggestions: state.suggestions.map((s) =>
        s.id === id ? { ...s, dismissed: true } : s
      ),
    })),

  getActiveSuggestions: () =>
    get().suggestions.filter((s) => !s.dismissed),

  getSuggestionsByPriority: (priority) =>
    get().suggestions.filter((s) => !s.dismissed && s.priority === priority),
}))
