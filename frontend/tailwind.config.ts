import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      screens: {
        xs: '360px',
      },
      colors: {
        parchment: '#F5F0E5',
        'parchment-soft': '#EFE9DA',
        bone: '#FFFFFF',
        ink: '#1C1C1C',
        slate: '#6B6B6B',
        oxblood: '#5B1A1A',
        'oxblood-deep': '#3F0F0F',
        verdigris: '#2D5544',
        gilt: '#B8935A',
        hairline: '#D9D2C1',
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
      },
      boxShadow: {
        frame: '0 4px 20px rgba(28, 28, 28, 0.06)',
      },
    },
  },
  plugins: [],
} satisfies Config
