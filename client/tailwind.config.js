/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        'vinho': '#3A0F1E',
        'vinho-light': '#5A1F35',
        'acai': '#7B2C8E',
        'acai-light': '#9B4CAE',
        'folha': '#4E9A3A',
        'folha-light': '#5DB848',
        'ouro': '#F2D9A1',
        'ouro-dark': '#F4B942',
        'creme': '#FFF8ED',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
};
