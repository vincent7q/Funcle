/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,ts}'],
  theme: {
    extend: {
      // Maps to the CSS custom properties defined in src/assets/main.css (§7.2).
      colors: {
        bg: 'var(--color-bg)',
        card: 'var(--color-card)',
        border: 'var(--color-border)',
        success: 'var(--color-success)',
        'success-hover': 'var(--color-success-hover)',
        directional: 'var(--color-directional)',
        body: 'var(--color-text)',
        muted: 'var(--color-text-muted)',
      },
      fontFamily: {
        sans: ['Segoe UI', 'Tahoma', 'Geneva', 'Verdana', 'sans-serif'],
        mono: ['Courier New', 'Courier', 'monospace'],
      },
    },
  },
  plugins: [],
};
