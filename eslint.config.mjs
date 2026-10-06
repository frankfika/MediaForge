import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

export default [
  { ignores: [".next/**", "node_modules/**", "coverage/**", "playwright-report/**", "test-results/**", "next-env.d.ts", "drizzle/**", "research/**"] },
  ...coreWebVitals,
  ...typescript,
  {
    rules: {
      // Hydration-safe mount flags (settings page, chat drawer) intentionally set state in effects.
      "react-hooks/set-state-in-effect": "off",
      "@typescript-eslint/no-unused-expressions": ["warn", { allowShortCircuit: true, allowTernary: true }],
      "import/no-anonymous-default-export": "off",
    },
  },
  { files: ["**/*.test.ts"], rules: { "@typescript-eslint/no-explicit-any": "off" } },
];
