import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // TALKAH Brand Colors
        primary: {
          DEFAULT: '#DC2626', // Red primary
          50: '#FEF2F2',
          100: '#FEE2E2', 
          200: '#FECACA',
          300: '#FCA5A5',
          400: '#F87171',
          500: '#EF4444',
          600: '#DC2626', // Main brand red
          700: '#B91C1C',
          800: '#991B1B',
          900: '#7F1D1D',
        },
        background: {
          light: '#FFFFFF',
          dark: '#1A1A1A',
        },
        text: {
          primary: '#000000',
          secondary: '#6B7280',
        },
        accent: '#F59E0B',
        success: '#10B981',
        error: '#EF4444',
      },
      fontFamily: {
        // Graffiti-style font for headers
        graffiti: ['Impact', 'Arial Black', 'sans-serif'],
        // Clean sans-serif for body text
        body: ['Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
export default config; 