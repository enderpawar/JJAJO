import { CalendarDays, Sparkles, Brain } from 'lucide-react'

export default function IntroPage() {

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-6 theme-transition bg-[#FFF7F0] dark:bg-[#050507] text-theme relative overflow-hidden animate-fadeIn">
      <div
        className="absolute top-1/5 -left-1/4 w-96 h-96 rounded-full opacity-20 blur-3xl bg-[var(--primary-point)] pointer-events-none animate-float-soft"
        style={{ animationDuration: '18s' }}
        aria-hidden
      />
      <div
        className="absolute bottom-1/4 -right-1/4 w-80 h-80 rounded-full opacity-18 blur-3xl bg-[var(--primary-point)] pointer-events-none animate-float-soft"
        style={{ animationDuration: '20s', animationDelay: '0.4s' }}
        aria-hidden
      />

      <div className="relative z-10 w-full max-w-3xl flex flex-col items-center gap-8">
        {/* 로고 + 브랜딩 */}
        <div
          className="flex flex-col items-center gap-3 text-center animate-intro-slide-up"
          style={{ animationDelay: '0.02s' }}
        >
          <div className="flex items-center gap-2">
            <div className="relative flex items-center gap-0.5 shrink-0" aria-hidden>
              <span className="w-10 h-10 sm:w-12 sm:h-12 rounded-tool shadow-md bg-[var(--primary-point)]" />
              <span
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-tool -ml-3 sm:-ml-4 mt-1 sm:mt-1.5 shadow-md opacity-90"
                style={{ background: 'var(--primary-gradient)' }}
              />
            </div>
            <div className="flex flex-col leading-tight text-left">
              <span className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-main)]">
                짜조
              </span>
              <span className="text-xs sm:text-sm font-medium text-[var(--text-muted)]">
                일정을 짜줘
              </span>
            </div>
          </div>

          <h1 className="mt-4 text-2xl sm:text-3xl md:text-[2.1rem] font-semibold tracking-tight text-[var(--text-main)]">
            <span className="animate-intro-heading-jiggle">머릿속 할 일을,</span>{' '}
            <span className="text-primary-500">AI가 대신 시간표로</span>
          </h1>
          <p className="max-w-xl text-sm sm:text-base text-[var(--text-muted)]">
            공부, 업무, 사이드 프로젝트까지.
            <br className="hidden sm:block" />
            짜조에 &quot;오늘 해야 할 일&quot;만 알려주면, 남는 시간에 딱 맞게 일정을 배치해 드릴게요.
          </p>
        </div>

        {/* 특징 카드 */}
        <div
          className="grid w-full gap-3 sm:gap-4 md:grid-cols-3 animate-intro-slide-up"
          style={{ animationDelay: '0.12s' }}
        >
          <div className="card card-flat p-4 sm:p-5 flex flex-col gap-2 transition-transform duration-200 hover:-translate-y-1">
            <div className="w-9 h-9 rounded-full bg-[var(--hover-bg)] flex items-center justify-center text-primary-500 mb-1">
              <Sparkles className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-semibold text-[var(--text-main)]">자연어로 말하면 끝</h2>
            <p className="text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed">
              &quot;내일 알고리즘 3시간이랑 사이드 프로젝트 2시간&quot;처럼 편하게 적으면,
              짜조가 가능한 시간대를 찾아 일정을 채워 넣어요.
            </p>
          </div>

          <div className="card card-flat p-4 sm:p-5 flex flex-col gap-2 transition-transform duration-200 hover:-translate-y-1">
            <div className="w-9 h-9 rounded-full bg-[var(--hover-bg)] flex items-center justify-center text-primary-500 mb-1">
              <CalendarDays className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-semibold text-[var(--text-main)]">더블탭·드래그로 빠른 편집</h2>
            <p className="text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed">
              타임라인 빈 공간을 더블탭해서 바로 일정 추가하고,
              블록을 드래그해서 시간대와 길이를 자연스럽게 조정할 수 있어요.
            </p>
          </div>

          <div className="card card-flat p-4 sm:p-5 flex flex-col gap-2 transition-transform duration-200 hover:-translate-y-1">
            <div className="w-9 h-9 rounded-full bg-[var(--hover-bg)] flex items-center justify-center text-primary-500 mb-1">
              <Brain className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-semibold text-[var(--text-main)]">집중을 위한 정리</h2>
            <p className="text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed">
              시간표 불러오기, 어제 일정 복사, 하루·전체 초기화까지
              정리 기능은 짜조가 대신 챙겨줘요.
            </p>
          </div>
        </div>

        {/* CTA 영역 */}
        {/* README용 소개 화면이라 실제 서비스 CTA 버튼은 제외 */}
      </div>
    </div>
  )
}

