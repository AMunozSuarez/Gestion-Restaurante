/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Paleta profesional y cálida - similar a la imagen
        primary: {
          50: '#fef7f0',
          100: '#fceee1',
          200: '#f7d9c2',
          300: '#f0c098',
          400: '#e69f6d',
          500: '#d4743f',
          600: '#ca5123',
          700: '#a8421d',
          800: '#87371c',
          900: '#6e2f19',
        },
        secondary: {
          50: '#f7f4f1',
          100: '#ede5de',
          200: '#dccabc',
          300: '#c5a894',
          400: '#b08871',
          500: '#9c7558',
          600: '#8b4513',
          700: '#753a11',
          800: '#5f300e',
          900: '#4f280c',
        },
        neutral: {
          50: '#faf8f3',
          100: '#f5f1e8',
          200: '#e8e0d0',
          300: '#d6c7b0',
          400: '#c0a888',
          500: '#a58b68',
          600: '#8b7355',
          700: '#726048',
          800: '#5e503e',
          900: '#504537',
        }
      },
      fontFamily: {
        'sans': ['Inter', 'Nunito', 'system-ui', 'sans-serif'],
        'display': ['Comfortaa', 'Nunito', 'system-ui', 'sans-serif'],
        'body': ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'slide-in-left': 'slideInLeft 0.3s ease-in-out',
        'fade-in': 'fadeIn 0.2s ease-in-out',
      },
      keyframes: {
        slideInLeft: {
          '0%': { transform: 'translateX(-100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}