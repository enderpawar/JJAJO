import type { QuickReply } from '@/types/chat'
import type { ConversationChatResponse } from '@/services/conversationService'

/**
 * 수집된 정보를 바탕으로 Quick Replies 생성
 */
export function generateQuickReplies(
  collectedInfo: ConversationChatResponse['collectedInfo']
): QuickReply[] {
  if (!collectedInfo) return []

  // 1. 목표 없음 → 인기 목표 제안
  if (!collectedInfo.goal_type && !collectedInfo.target_score) {
    return [
      { id: 'goal-1', text: '토익 800점 달성', value: '토익 800점 달성하고 싶어', icon: 'zap' },
      { id: 'goal-2', text: '다이어트 10kg', value: '10kg 다이어트 하고 싶어' },
      { id: 'goal-3', text: '코딩 마스터', value: '프로그래밍 마스터하고 싶어' },
    ]
  }

  // 2. 기한 없음 → 기간 옵션
  if (!collectedInfo.mentioned_deadline) {
    return [
      { id: 'deadline-1', text: '1개월 안에', value: '1개월 안에', icon: 'zap' },
      { id: 'deadline-2', text: '3개월 안에', value: '3개월 안에', icon: 'calendar' },
      { id: 'deadline-3', text: '6개월 안에', value: '6개월 안에', icon: 'clock' },
    ]
  }

  // 3. 시간 없음 → 투자 시간 옵션
  if (!collectedInfo.mentioned_hours && !collectedInfo.mentioned_time_preference) {
    return [
      { id: 'hours-1', text: '하루 1-2시간', value: '하루 1-2시간 투자할 수 있어' },
      { id: 'hours-2', text: '하루 3-4시간', value: '하루 3-4시간 투자할 수 있어' },
      { id: 'hours-3', text: '하루 5시간 이상', value: '하루 5시간 이상 투자할 수 있어' },
    ]
  }

  // 4. 모든 정보 수집 완료 → Quick Replies 불필요
  return []
}
