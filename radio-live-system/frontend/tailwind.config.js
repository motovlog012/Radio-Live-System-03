/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0f5ff",
          100: "#dbe6ff",
          400: "#7c93ff",
          500: "#5468ff",
          600: "#3f4ff0",
          700: "#333fc4",
          900: "#1c2266",
        },
      },
      backgroundImage: {
        glass: "linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))",
      },
    },
  },
  plugins: [],
};
