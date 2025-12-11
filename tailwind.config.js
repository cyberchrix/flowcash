/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class', // Enable class-based dark mode
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        flowBg: "#F5F7FA",
        flowText: "#1A1A1A",
        flowTextMuted: "#7A7A7A",
        flowCardBorder: "#EAEAEA",
        flowPink: "#FF2D8A",
        flowPurple: "#8A2BFF",
        flowBlue: "#316CFF",
        flowYellow: "#FFC04A",

        // 👇 couleur principale FlowCash
        flowPrimary: "#FF2D8A",
      },
      borderRadius: {
        "3xl": "32px",
        "4xl": "40px",
      },
      boxShadow: {
        flowSoft: "0 10px 30px rgba(0,0,0,0.06)",
        flowNav: "0 8px 20px rgba(0,0,0,0.05)",
      },
      backdropBlur: {
        flow: "30px",
      },
    },
  },
};