import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "functions/lib/**",
    // A separate, independently-built static HTML/CSS/JS project (see
    // app/(dashboard)/adam/page.tsx) embedded via iframe, not part of
    // this app's TypeScript/React source — not written against this
    // project's lint rules.
    "public/adam-garage/**",
  ]),
]);

export default eslintConfig;
