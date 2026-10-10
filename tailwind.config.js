/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        /* Forest ledger: deep ink for the rail, warm paper for the desk,
           GaadiPe teal for the product, copper for a single accent. */
        brand: { DEFAULT: '#0c6b64', light: '#158078', accent: '#1aa39a', deep: '#083f3b' },
        copper: { DEFAULT: '#c47a3a', 50: '#faf1e6', 700: '#8a4e1c' },
        forest: '#102422',
        cream: '#f7f3ea',
        ink: '#0c1a18',
        body: '#3d4f4c',
        muted: '#6a7f7b',
        line: '#dce6e3',
        shell: '#f2efe6',
        paper: '#faf8f2',
        good: { 50: '#e9f8ef', 500: '#12a150', 700: '#0a6c34' },
        watch: { 50: '#fff6e6', 500: '#e08700', 700: '#8f5600' },
        wrong: { 50: '#fdecec', 500: '#d92d20', 700: '#912018' },
      },
      fontFamily: {
        sans: ['"Source Sans 3"', 'Segoe UI', 'sans-serif'],
        display: ['Fraunces', 'Georgia', 'serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      fontSize: { '2xs': ['11px', '14px'] },
      boxShadow: {
        card: '0 1px 1px rgba(12,26,24,.04), 0 10px 28px rgba(12,26,24,.05)',
        pop: '0 24px 48px rgba(12,26,24,.16)',
        glow: '0 0 0 1px rgba(196,122,58,.22), 0 18px 40px rgba(12,107,100,.12)',
      },
    },
  },
  plugins: [],
};
