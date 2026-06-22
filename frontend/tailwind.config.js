/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      screens: {
        xs: '360px',
      },
      colors: {
        parchment: 'rgb(245 240 229 / <alpha-value>)',
        'parchment-soft': 'rgb(239 233 218 / <alpha-value>)',
        bone: '#FFFFFF',
        ink: '#1C1C1C',
        slate: '#6B6B6B',
        oxblood: 'rgb(91 26 26 / <alpha-value>)',
        'oxblood-deep': '#3F0F0F',
        verdigris: 'rgb(45 85 68 / <alpha-value>)',
        gilt: 'rgb(184 147 90 / <alpha-value>)',
        hairline: 'rgb(217 210 193 / <alpha-value>)',
      },
      fontFamily: {
        display: ['"Fraunces"', 'Georgia', 'serif'],
        sans: ['"Manrope"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      letterSpacing: {
        roman: '0.18em',
        'wider-em': '0.22em',
      },
      borderRadius: {
        frame: '6px',
        pill: '9999px',
        card: '24px',
      },
      boxShadow: {
        frame: '0 2px 12px rgba(28, 28, 28, 0.06)',
        lift: '0 4px 20px rgba(28, 28, 28, 0.08)',
        nav: '0 2px 24px rgba(28, 28, 28, 0.07)',
      },
      keyframes: {
        'bayo-breathe': {
          '0%, 100%': { transform: 'scale(0.92)' },
          '50%': { transform: 'scale(1)' },
        },
      },
      animation: {
        'bayo-breathe': 'bayo-breathe 2.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
