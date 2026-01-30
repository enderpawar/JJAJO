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
          500: '#FF6B00',  // 브랜드 오렌지
          600: '#EA580C',
          700: '#C2410C',
          800: '#9A3412',
          900: '#7C2D12',
        },
        notion: {
          bg: '#191919',       // 메인 배경 (완전 어두운 회색)
          sidebar: '#202020',  // 사이드바/카드 배경
          border: '#373737',   // 얇은 테두리
          text: '#FFFFFF',     // 메인 텍스트
          muted: '#9B9B9B',    // 보조 텍스트
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
        'sm': '4px',
        'md': '6px',
        'lg': '8px',
      },
      borderWidth: {
        'notion': '1px',
      },
      boxShadow: {
        // Notion은 그림자를 거의 사용하지 않음
        'none': 'none',
        'sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'notion': '0 1px 2px rgba(0, 0, 0, 0.1)',
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
