/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        base: "#050505",
        card: "#0d0d0d",
        gold: "#cda45e",
        neon: "#ff2340",
      },
    },
  },
  plugins: [],
};
