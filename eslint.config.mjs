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
      // Sprint 25: underscore-prefixed params are intentional placeholders
      // (interface conformance, stub methods). Track real unused vars only.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
  {
    // Editor internals: cover previews use blob:/object URLs (File.preview)
    // and dynamic upload results — next/image can't handle these sources.
    files: ["src/app/editor/**"],
    rules: {
      "@next/next/no-img-element": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Sprint 25: compiled backend output — source is linted, dist is generated.
    "backend/dist/**",
    "backend/coverage/**",
  ]),
]);

export default eslintConfig;
