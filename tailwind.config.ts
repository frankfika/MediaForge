import type { Config } from "tailwindcss";

// Tailwind v4 is CSS-first: design tokens live in app/globals.css (@theme).
// This file only exists for tooling that still looks for it; loaded via @config.
export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
} satisfies Config;
