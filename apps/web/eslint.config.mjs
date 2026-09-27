import { defineConfig, globalIgnores } from "eslint/config"
import nextVitals from "eslint-config-next/core-web-vitals"
import nextTs from "eslint-config-next/typescript"

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Vendored upstream shadcn/ReUI code (see scripts/vendor-reui.mjs). It predates the
    // React Compiler lint rules; we keep it close to upstream so updates stay diffable.
    // Platform code (components/app, features, app) is linted with the full rule set.
    files: [
      "components/ui/**",
      "components/reui/**",
      "hooks/use-mobile.ts",
      "hooks/use-file-upload.ts",
      "hooks/use-copy-to-clipboard.ts",
    ],
    rules: {
      "react-hooks/refs": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/use-memo": "off",
      "react-hooks/incompatible-library": "off",
      "react-hooks/exhaustive-deps": "off",
      "@typescript-eslint/no-unused-vars": "off",
    },
    linterOptions: { reportUnusedDisableDirectives: "off" },
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "playwright-report/**", "test-results/**"]),
])

export default eslintConfig
