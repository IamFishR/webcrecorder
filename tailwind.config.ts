import type { Config } from 'tailwindcss'

export default {
    content: ['./src/renderer/index.html', './src/renderer/**/*.{js,ts,jsx,tsx}'],
    theme: {
        extend: {
            colors: {
                background: '#09090b',
                foreground: '#fafafa',
                surface: '#18181b',
                primary: '#ef4444',
                accent: '#3b82f6'
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
                mono: ['JetBrains Mono', 'monospace']
            }
        }
    },
    plugins: []
} satisfies Config
