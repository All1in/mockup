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

    // Generated test artifacts. These are gitignored, but .gitignore and
    // ESLint ignores are separate mechanisms: on a machine where the suite has
    // been run, ESLint would otherwise lint the generated report bundles and
    // the problem count would jump by orders of magnitude. Keeping them here
    // makes the lint baseline independent of whether tests ran first.
    "playwright-report/**",
    "test-results/**",
    "blob-report/**",
    "playwright/.cache/**",
    "coverage/**",
  ]),

  // Playwright test files are not React. The fixture API passes a callback
  // named `use`, which react-hooks/rules-of-hooks reads as a React Hook call
  // outside a component. Scoping the rule off for tests/ corrects where the
  // rule applies; it stays fully enabled for application code in src/.
  {
    files: ["tests/**/*.ts", "tests/**/*.tsx"],
    rules: {
      "react-hooks/rules-of-hooks": "off",
    },
  },
]);

export default eslintConfig;
