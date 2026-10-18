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
    // The studio is built and minified in its own folder; its bundle is not source code.
    "public/home/**",
    // Generated from home-src/index.html by scripts/build-home.mjs.
    "lib/home-html.ts",
  ]),
]);

export default eslintConfig;
