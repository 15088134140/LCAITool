import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    // Paths are relative to the consuming app's project root (e.g., apps/frontend-user/)
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    // Include UI package components (resolved from the monorepo root by Tailwind/Next.js)
    "../../packages/ui/src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          300: "#93c5fd",
          400: "#60a5fa",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
          800: "#1e40af",
          900: "#1e3a8a",
          950: "#172554",
        },
        secondary: {
          50: "#fdf4ff",
          100: "#fae8ff",
          200: "#f5d0fe",
          300: "#f0abfc",
          400: "#e879f9",
          500: "#d946ef",
          600: "#c026d3",
          700: "#a21caf",
          800: "#86198f",
          900: "#701a75",
          950: "#4a044e",
        },
        // 品牌主色调
        brand: {
          dark: "#1E3A5F", // 主色深蓝
          light: "#2563EB", // 主色浅蓝
        },
        // 成功/强调色
        success: {
          dark: "#059669", // 成功色深绿
          light: "#10B981", // 成功色浅绿
        },
        // 背景与边框
        border: "#E4E7EB",
        "bg-light": "#F8FAFC",
        // 文字颜色
        text: {
          secondary: "#64748B", // 次要文字
          muted: "#94A3B8", // 辅助文字
        },
        // shadcn/ui 基础变量
        background: "hsl(0 0% 100%)",
        foreground: "hsl(222.2 84% 4.9%)",
        card: "hsl(0 0% 100%)",
        "card-foreground": "hsl(222.2 84% 4.9%)",
        popover: "hsl(0 0% 100%)",
        "popover-foreground": "hsl(222.2 84% 4.9%)",
        muted: "hsl(210 40% 96.1%)",
        "muted-foreground": "hsl(215.4 16.3% 46.9%)",
        accent: "hsl(210 40% 96.1%)",
        "accent-foreground": "hsl(222.2 47.4% 11.2%)",
        destructive: "hsl(0 84.2% 60.2%)",
        "destructive-foreground": "hsl(210 40% 98%)",
        input: "hsl(214.3 31.8% 91.4%)",
        ring: "hsl(221.2 83.2% 53.3%)",
      },
      fontFamily: {
        sans: [
          "DM Sans",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        blobFloat1: {
          "0%, 100%": { transform: "translate(0, 0) scale(1)" },
          "25%": { transform: "translate(100px, 50px) scale(1.15)" },
          "50%": { transform: "translate(50px, 100px) scale(0.9)" },
          "75%": { transform: "translate(-30px, 60px) scale(1.05)" },
        },
        blobFloat2: {
          "0%, 100%": { transform: "translate(0, 0) scale(1)" },
          "25%": { transform: "translate(-80px, -40px) scale(1.1)" },
          "50%": { transform: "translate(-40px, -80px) scale(0.95)" },
          "75%": { transform: "translate(60px, -30px) scale(1.08)" },
        },
        blobFloat3: {
          "0%, 100%": { transform: "translate(0, 0) scale(1)" },
          "33%": { transform: "translate(-60px, 80px) scale(1.2)" },
          "66%": { transform: "translate(80px, -40px) scale(0.85)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "blob-float-1": "blobFloat1 12s ease-in-out infinite",
        "blob-float-2": "blobFloat2 15s ease-in-out infinite",
        "blob-float-3": "blobFloat3 20s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
