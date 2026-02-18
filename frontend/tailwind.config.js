/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#FFF7ED',
          100: '#FFEDD5',
          200: '#FED7AA',
          300: '#FDBA74',
          400: '#FB923C',
          500: 'var(--primary-point)',  // 라이트 #FF8C00, 다크 #FF9500 (채도 살짝 상승)
          600: '#EA580C',
          700: '#C2410C',
          800: '#9A3412',
          900: '#7C2D12',
        },
        notion: {
          bg: '#F5F6F8',       // 뉴모피즘 메인 배경 (밝은 흰색 톤)
          sidebar: '#F5F6F8',  // 카드/요소 - 배경과 동일 (그림자로만 구분)
          card: '#F5F6F8',     // 헤더/매직바 영역
          hover: '#EDEEF2',    // 호버 시 미세 변화
          border: 'transparent', // 테두리 제거, 그림자로만 구분
          text: '#2D2D2D',     // 메인 텍스트 (어두운 그레이)
          'text-primary': '#2D2D2D',
          'text-secondary': '#6B7280',
          muted: '#6B7280',    // 보조 텍스트
        },
        // 다크 모드 (CSS 변수와 동일 값 - 남은 dark: 클래스용)
        dark: {
          bg: '#121214',
          card: '#1E1E20',
          hover: '#252528',
          text: '#E9ECEF',
          muted: '#ADB5BD',
          border: 'rgba(255,255,255,0.08)',
        },
        neu: {
          base: '#F5F6F8',
          light: '#FFFFFF',    // 라이트 섀도우용 (상단-좌측 하이라이트)
          dark: '#d1d9e6',     // 다크 섀도우용 (하단-우측)
        }
      },
      fontFamily: {
        sans: [
          'Inter', 
          '-apple-system', 
          'BlinkMacSystemFont', 
          'Segoe UI', 
          'Roboto', 
          'Helvetica Neue', 
          'Arial', 
          'sans-serif'
        ],
      },
      fontSize: {
        'xs': ['11px', '16px'],
        'sm': ['13px', '20px'],
        'base': ['14px', '20px'],
        'lg': ['16px', '24px'],
        'xl': ['20px', '28px'],
        '2xl': ['24px', '32px'],
      },
      borderRadius: {
        'notion': '6px',
        'neu': '16px',
        'neu-lg': '20px',
        'sm': '4px',
        'md': '6px',
        'lg': '8px',
      },
      borderWidth: {
        'notion': '1px',
      },
      boxShadow: {
        'none': 'none',
        'sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'notion': '0 1px 2px rgba(0, 0, 0, 0.1)',
        // 뉴모피즘 Floating (튀어나온 효과): 은은한 그림자 (테두리 느낌 방지 - blur↑, opacity↓)
        'neu-float': '5px 5px 20px rgba(0,0,0,0.025), -4px -4px 12px rgba(255,255,255,0.7)',
        'neu-float-sm': '2px 2px 24px rgba(0,0,0,0.012), -2px -2px 12px rgba(255,255,255,0.65)',
        // 날짜 카드 전용: 검은 테두리 효과 완전 제거 (blur 24px, opacity 0.012)
        'neu-float-date': '2px 2px 24px rgba(0,0,0,0.012), -2px -2px 12px rgba(255,255,255,0.65)',
        // 뉴모피즘 Inset (오목한 효과) - 테두리 느낌 방지 (opacity↓, blur↑)
        'neu-inset': 'inset 4px 4px 12px rgba(0,0,0,0.03), inset -4px -4px 10px rgba(255,255,255,0.55)',
        'neu-inset-sm': 'inset 3px 3px 10px rgba(0,0,0,0.03), inset -3px -3px 8px rgba(255,255,255,0.55)',
        // 호버 전용: 검은 glow 없음 - 라이트 하이라이트만 (눌린 느낌, 테두리 X)
        'neu-inset-hover': 'inset 2px 2px 8px rgba(0,0,0,0.008), inset -3px -3px 8px rgba(255,255,255,0.5)',
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
      backdropBlur: {
        'notion': '20px',
      },
    },
  },
  plugins: [],
}
