/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef7ff",
          100: "#d9ecff",
          200: "#bcdfff",
          300: "#8cccff",
          400: "#54afff",
          500: "#2e8eff",
          600: "#176ef5",
          700: "#1158de",
          800: "#1449b1",
          900: "#16408b",
        },
      },
      boxShadow: {
        soft: "0 4px 16px rgba(15, 23, 42, 0.08)",
      },
    },
  },
  plugins: [],
};
