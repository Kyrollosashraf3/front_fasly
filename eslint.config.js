import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      // Two patterns in this app need a synchronous setState inside an effect:
      // the fetch-on-mount flag in `useQuery`, and "seed the local draft from
      // the row that just arrived" (attendance / checks / follow-up sheets).
      // Both are intentional; the rule targets accidental render cascades.
      'react-hooks/set-state-in-effect': 'off',
      // Contexts and shared-module files export their consumer hook (useAuth,
      // useToast, ...) next to the provider. Fast refresh handles that.
      'react-refresh/only-export-components': 'warn',
    },
  },
  {
    // Vite/eslint config files run under Node, not the browser.
    files: ['vite.config.js', 'eslint.config.js'],
    languageOptions: { globals: globals.node },
  },
])
