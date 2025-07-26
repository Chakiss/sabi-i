/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
   extend: {
      colors: {
        primary: '#B89B85',
        primaryDark: '#A1826F',
        ivory: '#F8F5F2',
        brownText: '#4E3B31',
        mutedText: '#7E7B77',
      }
    },
      fontFamily: {
        body: ['Nunito', 'Kanit', 'sans-serif'],
        heading: ['Nunito', 'Kanit', 'sans-serif'],
      },
    },
  },

  plugins: [],
}
