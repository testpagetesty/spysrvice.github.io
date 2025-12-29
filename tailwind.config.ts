import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
      },
      fontFamily: {
        sans: ['var(--font-inter)', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
      transitionDuration: {
        '200': '200ms',
        '300': '300ms',
      },
      transitionTimingFunction: {
        'material': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      boxShadow: {
        'button': '0 2px 8px rgba(37, 99, 235, 0.15)',
        'button-hover': '0 4px 12px rgba(37, 99, 235, 0.25)',
      },
      animation: {
        'modal-fade-in': 'modalFadeIn 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        'modal-fade-out': 'modalFadeOut 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        'backdrop-fade-in': 'backdropFadeIn 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
      },
      keyframes: {
        modalFadeIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        modalFadeOut: {
          '0%': { opacity: '1', transform: 'scale(1)' },
          '100%': { opacity: '0', transform: 'scale(0.95)' },
        },
        backdropFadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
export default config
