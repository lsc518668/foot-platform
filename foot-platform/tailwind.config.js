/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1a5632',
          light: '#2d8a4e',
          dark: '#0f3d22',
        },
        accent: {
          DEFAULT: '#ffd700',
          light: '#ffe44d',
          dark: '#cc9900',
        },
        field: '#2d8a4e',
        surface: {
          DEFAULT: '#1e293b',
          light: '#334155',
          dark: '#0f172a',
        },
      },
      fontFamily: {
        sans: ['"PingFang SC"', '"Microsoft YaHei"', '"Helvetica Neue"', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
