/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(0 0% 20%)",
        input: "hsl(0 0% 20%)",
        ring: "hsl(189 94% 55%)",
        background: "hsl(0 0% 4%)",
        foreground: "hsl(0 0% 98%)",
        primary: {
          DEFAULT: "hsl(189 94% 55%)",
          foreground: "hsl(0 0% 4%)",
        },
        secondary: {
          DEFAULT: "hsl(0 0% 12%)",
          foreground: "hsl(0 0% 98%)",
        },
        destructive: {
          DEFAULT: "hsl(0 84% 60%)",
          foreground: "hsl(0 0% 98%)",
        },
        muted: {
          DEFAULT: "hsl(0 0% 15%)",
          foreground: "hsl(0 0% 65%)",
        },
        accent: {
          DEFAULT: "hsl(189 94% 55%)",
          foreground: "hsl(0 0% 4%)",
        },
        popover: {
          DEFAULT: "hsl(0 0% 8%)",
          foreground: "hsl(0 0% 98%)",
        },
        card: {
          DEFAULT: "hsl(0 0% 8%)",
          foreground: "hsl(0 0% 98%)",
        },
      },
    },
  },
  plugins: [],
}