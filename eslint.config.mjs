import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Existing hydration-on-mount flows predate React 19's aggressive
    // set-state-in-effect rule. They are intentional client restoration
    // paths (locale/theme/session/filter state), not production blockers.
    // Track their migration separately instead of masking new correctness
    // rules across the codebase.
    rules: {
      "react-hooks/set-state-in-effect": "off",
      "@next/next/no-html-link-for-pages": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
