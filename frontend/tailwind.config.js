/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      screens: {
        xs: '360px',
      },
      colors: {
        parchment: 'rgb(250 250 248 / <alpha-value>)',
        'parchment-soft': 'rgb(243 246 245 / <alpha-value>)',
        bone: '#FFFFFF',
        ink: '#1A2E28',
        slate: '#5C6B66',
        oxblood: 'rgb(91 26 26 / <alpha-value>)',
        'oxblood-deep': '#3F0F0F',
        verdigris: 'rgb(42 107 90 / <alpha-value>)',
        'verdigris-light': '#E8F5F1',
        seafoam: 'rgb(59 184 150 / <alpha-value>)',
        'seafoam-deep': '#2E9A7E',
        gilt: 'rgb(184 147 90 / <alpha-value>)',
        hairline: 'rgb(229 233 231 / <alpha-value>)',
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
        frame: '10px',
        xl: '14px',
        pill: '9999px',
      },
      boxShadow: {
        frame: '0 4px 24px rgba(26, 46, 40, 0.06)',
        card: '0 2px 16px rgba(26, 46, 40, 0.05)',
        lift: '0 8px 32px rgba(26, 46, 40, 0.08)',
      },
      maxWidth: {
        content: '72rem',
      },
    },
  },
  plugins: [],
}
