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
    // public/ is served as-is and was never meant to be linted: the studio-home
    // page ships prebuilt/minified JS bundles under public/home/js/ (e.g.
    // main-4GNK7BPP.js), and lint was running over that output as if it were
    // source, failing on @typescript-eslint/no-unused-expressions, a rule
    // minified code trips by construction. Next's own build/out/.next ignores
    // already make the same exception for generated code; public/ was simply
    // missed.
    "public/**",
  ]),
]);

export default eslintConfig;
